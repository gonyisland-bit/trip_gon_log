import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createRemoteJWKSet, jwtVerify } from 'jose';

/**
 * Server-only R2 core shared by the Vercel function (api/r2.ts) and the Vite dev middleware.
 * R2 credentials never reach the browser: clients receive a short-lived presigned PUT URL.
 */

export interface R2Env {
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET_NAME?: string;
  FIREBASE_PROJECT_ID?: string;
}

export interface R2Result {
  status: number;
  body: Record<string, unknown>;
}

const MAX_UPLOAD_BYTES = 500 * 1024 * 1024;
const PRESIGN_TTL_SECONDS = 300;

const FIREBASE_JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

let cachedClient: { key: string; client: S3Client } | null = null;

function getClient(env: R2Env): S3Client {
  const key = `${env.R2_ACCOUNT_ID}:${env.R2_ACCESS_KEY_ID}`;
  if (cachedClient?.key === key) return cachedClient.client;
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    // Presigned PUTs are signed before the body exists; default CRC32 would embed an empty-body checksum
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID!,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
    },
  });
  cachedClient = { key, client };
  return client;
}

async function verifyFirebaseToken(authHeader: string | undefined, projectId: string): Promise<string | null> {
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, FIREBASE_JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });
    const provider = (payload.firebase as { sign_in_provider?: string } | undefined)?.sign_in_provider;
    if (!payload.sub || provider === 'anonymous') return null;
    return payload.sub;
  } catch {
    return null;
  }
}

function sanitizeKey(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const key = raw.replace(/^\/+/, '');
  if (!key || key.length > 512) return null;
  if (key.split('/').some(seg => seg === '' || seg === '.' || seg === '..')) return null;
  if ([...key].some(ch => ch.charCodeAt(0) < 0x20 || ch === '\\')) return null;
  return key;
}

export async function handleR2Request(
  body: unknown,
  authHeader: string | undefined,
  env: R2Env
): Promise<R2Result> {
  if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
    return { status: 500, body: { error: 'R2 server credentials are not configured' } };
  }
  const projectId = env.FIREBASE_PROJECT_ID || 'trip-gon-log';
  const uid = await verifyFirebaseToken(authHeader, projectId);
  if (!uid) return { status: 401, body: { error: 'Unauthorized' } };

  const req = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const key = sanitizeKey(req.key);
  if (!key) return { status: 400, body: { error: 'Invalid key' } };

  const bucket = env.R2_BUCKET_NAME || 'tripgon';
  const client = getClient(env);

  if (req.action === 'upload') {
    const size = Number(req.size);
    if (!Number.isFinite(size) || size <= 0 || size > MAX_UPLOAD_BYTES) {
      return { status: 400, body: { error: 'Invalid file size' } };
    }
    const contentType = typeof req.contentType === 'string' && req.contentType ? req.contentType : 'application/octet-stream';
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      ContentLength: size,
    });
    const url = await getSignedUrl(client, command, { expiresIn: PRESIGN_TTL_SECONDS });
    return { status: 200, body: { url } };
  }

  if (req.action === 'delete') {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    return { status: 200, body: { ok: true } };
  }

  return { status: 400, body: { error: 'Unknown action' } };
}
