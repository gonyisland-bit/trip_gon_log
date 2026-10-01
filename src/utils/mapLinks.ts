// Opening a place in Google Maps (v1.3.8): always by its name, with the address to pin it down;
// coordinates are only the last resort for a place with neither, so the map shows a named place
// and not a bare pin.
export function mapSearchUrl(name?: string | null, address?: string | null, lat?: number | null, lng?: number | null): string | null {
  const n = (name || '').trim();
  const a = (address || '').trim();
  const q = [n, a && a !== n ? a : ''].filter(Boolean).join(' ');
  const query = q || (typeof lat === 'number' && typeof lng === 'number' ? `${lat},${lng}` : '');
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : null;
}
