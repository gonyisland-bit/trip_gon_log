// Web Share Target (v1.3 P5): the installed app appears in the Android share
// sheet (manifest share_target, GET to /pocket). The shared link is captured
// once at boot, before any navigation rewrites the URL, and the pocket picks
// it up to open the scrap sheet with it.

export const SHARED_LINK_KEY = 'pocket_shared_link';

// The first web link in whatever the sharing app sent: url, text or title
export function extractSharedLink(params: URLSearchParams): string | null {
  const direct = params.get('share_url');
  if (direct && /^https?:\/\//i.test(direct.trim())) return direct.trim();
  for (const key of ['share_text', 'share_title']) {
    const m = (params.get(key) || '').match(/https?:\/\/[^\s<>"']+/i);
    if (m) return m[0].replace(/[).,]+$/, '');
  }
  return null;
}

export function captureSharedLink(): void {
  try {
    const params = new URLSearchParams(window.location.search);
    if (!['share_url', 'share_text', 'share_title'].some(k => params.has(k))) return;
    const link = extractSharedLink(params);
    if (link) sessionStorage.setItem(SHARED_LINK_KEY, link);
    // Drop the share parameters so a reload does not scrap the same link again
    ['share_url', 'share_text', 'share_title'].forEach(k => params.delete(k));
    const rest = params.toString();
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${rest ? `?${rest}` : ''}${window.location.hash}`);
  } catch (_) {}
}

export function takeSharedLink(): string | null {
  try {
    const link = sessionStorage.getItem(SHARED_LINK_KEY);
    if (link) sessionStorage.removeItem(SHARED_LINK_KEY);
    return link;
  } catch (_) {
    return null;
  }
}
