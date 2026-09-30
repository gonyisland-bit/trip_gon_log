// Where the server functions live (v1.3.6 6-d). The website calls them on its own origin; the
// store app (Capacitor) runs from capacitor://localhost, so its build sets VITE_API_ORIGIN to the
// deployed site, e.g. https://example.vercel.app.
const ORIGIN = ((import.meta.env.VITE_API_ORIGIN as string | undefined) || '').replace(/\/+$/, '');

export function apiUrl(path: string): string {
  return `${ORIGIN}${path}`;
}
