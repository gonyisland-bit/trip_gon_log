import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const ACCOUNT_ID = import.meta.env.VITE_R2_ACCOUNT_ID || '';
const ACCESS_KEY_ID = import.meta.env.VITE_R2_ACCESS_KEY_ID || '';
const SECRET_ACCESS_KEY = import.meta.env.VITE_R2_SECRET_ACCESS_KEY || '';
const BUCKET_NAME = import.meta.env.VITE_R2_BUCKET_NAME || 'tripgon';
export const R2_PUBLIC_URL = (import.meta.env.VITE_R2_PUBLIC_URL || 'https://pub-73f603986a164324a3a48f1c03847cf3.r2.dev').replace(/\/+$/, '');

// Initialize S3 Client for Cloudflare R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});

/**
 * Uploads a File or Blob directly to Cloudflare R2.
 * Returns the public accessible HTTPS URL.
 */
export async function uploadFileToR2(file: File | Blob, path: string): Promise<string> {
  const cleanPath = path.replace(/^\/+/, '');
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  const contentType = file.type || 'application/octet-stream';

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: cleanPath,
    Body: uint8Array,
    ContentType: contentType,
  });

  await s3Client.send(command);

  return `${R2_PUBLIC_URL}/${cleanPath}`;
}

/**
 * Automatically converts legacy Firebase Storage URLs to Cloudflare R2 Public URLs.
 * e.g. https://firebasestorage.googleapis.com/v0/b/.../o/gallery%2Fphoto.jpg?alt=media
 *   -> https://pub-73f603986a164324a3a48f1c03847cf3.r2.dev/gallery/photo.jpg
 */
export function convertFirebaseStorageUrlToR2(url: string): string {
  if (!url) return '';
  if (url.includes('firebasestorage.googleapis.com') || url.includes('firebasestorage.app')) {
    const match = url.match(/\/o\/([^?#]+)/);
    if (match && match[1]) {
      const decodedKey = decodeURIComponent(match[1]);
      return `${R2_PUBLIC_URL}/${decodedKey}`;
    }
  }
  return url;
}

/**
 * Returns the effective image or media URL.
 * Automatically translates legacy Firebase Storage links to Cloudflare R2.
 */
export function getEffectiveImageUrl(url: string | undefined | null): string {
  if (!url) return '';
  return convertFirebaseStorageUrlToR2(url);
}
