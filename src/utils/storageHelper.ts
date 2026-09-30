import { auth } from '../firebase';

export const R2_PUBLIC_URL = (import.meta.env.VITE_R2_PUBLIC_URL || 'https://pub-73f603986a164324a3a48f1c03847cf3.r2.dev').replace(/\/+$/, '');

/**
 * Calls the server-side R2 endpoint (api/r2.ts). R2 credentials live only on the server;
 * the request is authorized with the signed-in user's Firebase ID token.
 */
async function callR2Api<T>(payload: Record<string, unknown>): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error('R2 request requires a signed-in user');
  const idToken = await user.getIdToken();
  const response = await fetch('/api/r2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 413) {
    // Per-member storage cap (v1.3.6)
    const { notify } = await import('./feedback');
    notify('사진 · 영상 저장 공간이 가득 찼습니다. 쓰지 않는 사진을 정리한 뒤 다시 올려 주세요.', 'error');
  }
  if (!response.ok) {
    throw new Error(`R2 API ${response.status}: ${(data as { error?: string }).error || 'request failed'}`);
  }
  return data as T;
}

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

    await callR2Api({ action: 'delete', key: cleanKey });
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
  // Sanitize path segments to prevent iOS Safari/WebKit URL parsing errors with spaces/special characters
  // Every member uploads into their own folder u/{uid}/ (v1.3.6), so the server can check ownership and size
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('R2 upload requires a signed-in user');
  const segments = `u/${uid}/${path.replace(/^\/+/, '').replace(/^u\/[^/]+\//, '')}`.split('/');
  const rawFileName = segments.pop() || 'file';
  const safeFileName = rawFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const cleanPath = [...segments, safeFileName].join('/');

  // Enforce proper MIME Content-Type header so iOS Safari and browsers can stream videos & display images
  let contentType = file.type;
  if (!contentType || contentType === 'application/octet-stream') {
    const ext = cleanPath.split('.').pop()?.toLowerCase();
    if (ext === 'mov') contentType = 'video/quicktime';
    else if (ext === 'mp4') contentType = 'video/mp4';
    else if (ext === 'webm') contentType = 'video/webm';
    else if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
    else if (ext === 'png') contentType = 'image/png';
    else if (ext === 'webp') contentType = 'image/webp';
    else if (ext === 'gif') contentType = 'image/gif';
    else contentType = 'application/octet-stream';
  }

  const { url } = await callR2Api<{ url: string }>({
    action: 'upload',
    key: cleanPath,
    contentType,
    size: file.size,
  });

  const uploadResponse = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  });
  if (!uploadResponse.ok) {
    throw new Error(`R2 upload failed: ${uploadResponse.status}`);
  }

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
 * Automatically translates legacy Firebase Storage links to Cloudflare R2
 * and safely encodes spaces/special characters for iOS Safari.
 */
export function getEffectiveImageUrl(url: string | undefined | null): string {
  if (!url) return '';
  const converted = convertFirebaseStorageUrlToR2(url);
  try {
    return encodeURI(decodeURI(converted));
  } catch (_) {
    return converted;
  }
}

/** Bytes in this member's own folder and their cap (null: no cap, the operator account) */
export async function getMyStorageUsage(): Promise<{ used: number; quota: number | null }> {
  return callR2Api<{ used: number; quota: number | null }>({ action: 'usage' });
}

/** Account deletion: removes every file in this member's own R2 folder (u/{uid}/) */
export async function purgeMyFiles(): Promise<number> {
  const { removed } = await callR2Api<{ removed: number }>({ action: 'purge' });
  return removed;
}
