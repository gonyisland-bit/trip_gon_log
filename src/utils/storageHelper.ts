import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const ACCOUNT_ID = import.meta.env.VITE_R2_ACCOUNT_ID || 'bd0c90c36c628664f396ac294fa0e863';
const ACCESS_KEY_ID = import.meta.env.VITE_R2_ACCESS_KEY_ID || 'bd3036bba21c44bb0a777a530a045598';
const SECRET_ACCESS_KEY = import.meta.env.VITE_R2_SECRET_ACCESS_KEY || 'f95e72f45df1014a6da96dbbb8cdc2e21c1f91532aef789aa079d94d0e2be76a';
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
 * Deletes a file from Cloudflare R2 using its public URL or key.
 */
export async function deleteFileFromR2(url: string | undefined | null): Promise<boolean> {
  if (!url) return false;
  try {
    let key = url;
    if (key.startsWith(R2_PUBLIC_URL)) {
      key = key.slice(R2_PUBLIC_URL.length).replace(/^\/+/, '');
    } else if (key.includes('r2.dev/') || key.includes('.cloudflarestorage.com/')) {
      const parts = key.split(/r2\.dev\/|\.cloudflarestorage\.com\//);
      if (parts[1]) key = parts[1].replace(/^\/+/, '');
    } else {
      return false;
    }
    const cleanKey = decodeURIComponent(key.split('?')[0]);
    if (!cleanKey) return false;

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: cleanKey,
    });
    await s3Client.send(command);
    return true;
  } catch (error) {
    console.warn("R2 file deletion warning (ignoring):", error);
    return false;
  }
}

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
