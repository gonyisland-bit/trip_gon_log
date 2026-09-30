import { S3Client, PutObjectCommand, DeleteObjectCommand, DeleteObjectsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
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
  /** Comma-separated emails of the operator account(s): no storage cap, may delete files from before per-member folders */
  R2_OWNER_EMAILS?: string;
  /** Storage cap per member in MB (default 2048) */
  R2_USER_QUOTA_MB?: string;
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

export interface Caller { uid: string; email: string }

export async function verifyFirebaseToken(authHeader: string | undefined, projectId: string): Promise<Caller | null> {
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, FIREBASE_JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });
    const provider = (payload.firebase as { sign_in_provider?: string } | undefined)?.sign_in_provider;
    if (!payload.sub || provider === 'anonymous') return null;
    return { uid: payload.sub, email: String(payload.email || '').toLowerCase() };
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

/** Bytes stored under a member's folder */
async function folderBytes(client: S3Client, bucket: string, prefix: string): Promise<number> {
  let total = 0;
  let token: string | undefined;
  do {
    const page = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token }));
    (page.Contents || []).forEach(o => { total += o.Size || 0; });
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return total;
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
  const caller = await verifyFirebaseToken(authHeader, projectId);
  if (!caller) return { status: 401, body: { error: 'Unauthorized' } };
  // Each member's files live under u/{uid}/ (v1.3.6); only the operator may touch older keys
  const ownerEmails = (env.R2_OWNER_EMAILS || 'gonyisland@naver.com').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  const isOperator = Boolean(caller.email) && ownerEmails.includes(caller.email);
  const ownPrefix = `u/${caller.uid}/`;

  const req = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;

  // Storage used by the member's own folder, and the cap (Settings → 저장 공간)
  if (req.action === 'usage') {
    const quotaMb = Math.max(1, Number(env.R2_USER_QUOTA_MB) || 2048);
    const used = await folderBytes(getClient(env), env.R2_BUCKET_NAME || 'tripgon', ownPrefix);
    return { status: 200, body: { used, quota: isOperator ? null : quotaMb * 1024 * 1024 } };
  }

  // Account deletion: remove every file in the member's own folder
  if (req.action === 'purge') {
    const client = getClient(env);
    const bucket = env.R2_BUCKET_NAME || 'tripgon';
    let removed = 0;
    let token: string | undefined;
    do {
      const page = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: ownPrefix, ContinuationToken: token }));
      const keys = (page.Contents || []).map(o => o.Key).filter((k): k is string => Boolean(k));
      if (keys.length) {
        await client.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: keys.map(Key => ({ Key })), Quiet: true } }));
        removed += keys.length;
      }
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);
    return { status: 200, body: { ok: true, removed } };
  }

  const key = sanitizeKey(req.key);
  if (!key) return { status: 400, body: { error: 'Invalid key' } };

  const bucket = env.R2_BUCKET_NAME || 'tripgon';
  const client = getClient(env);

  if (req.action === 'upload') {
    const size = Number(req.size);
    if (!Number.isFinite(size) || size <= 0 || size > MAX_UPLOAD_BYTES) {
      return { status: 400, body: { error: 'Invalid file size' } };
    }
    if (!key.startsWith(ownPrefix)) return { status: 403, body: { error: 'Uploads go to your own folder' } };
    if (!isOperator) {
      const quota = Math.max(1, Number(env.R2_USER_QUOTA_MB) || 2048) * 1024 * 1024;
      const used = await folderBytes(client, bucket, ownPrefix);
      if (used + size > quota) {
        return { status: 413, body: { error: 'Storage limit reached', used, quota } };
      }
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
    const legacyKey = !key.startsWith('u/');
    if (!key.startsWith(ownPrefix) && !(legacyKey && isOperator)) {
      return { status: 403, body: { error: 'Not your file' } };
    }
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    return { status: 200, body: { ok: true } };
  }

  return { status: 400, body: { error: 'Unknown action' } };
}
