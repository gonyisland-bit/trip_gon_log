// Journey map style (v1.3.5): normal (Google road map), terrain (Google terrain) or simple (grey canvas).
// A per-account display preference (users/{uid}/settings/prefs.mapStyle); localStorage is the instant cache.
import { saveUserPref } from './userPrefs';

export type MapStyle = 'normal' | 'terrain' | 'simple';
export const MAP_STYLES: MapStyle[] = ['normal', 'terrain', 'simple'];
export const MAP_STYLE_LABEL: Record<MapStyle, string> = { normal: '일반', terrain: '지형', simple: '심플' };
export const MAP_STYLE_EVENT = 'tgl:map-style';
const KEY = 'tgl_map_style';

export function isMapStyle(v: unknown): v is MapStyle {
  return v === 'normal' || v === 'terrain' || v === 'simple';
}

export function readMapStyle(): MapStyle {
  try {
    const v = localStorage.getItem(KEY);
    if (isMapStyle(v)) return v;
  } catch { /* cache only */ }
  return 'normal';
}

/** Applies a style on this device (cache + open maps); `save` also stores it on the account */
export function applyMapStyle(style: MapStyle, save = true) {
  try { localStorage.setItem(KEY, style); } catch { /* cache only */ }
  window.dispatchEvent(new CustomEvent(MAP_STYLE_EVENT, { detail: style }));
  if (save) saveUserPref({ mapStyle: style });
}

/** Tile URL and Leaflet options for a style; dark mode inverts the Google tiles and swaps the grey canvas */
export function mapTileFor(style: MapStyle, isDark: boolean): { url: string; options: Record<string, unknown> } {
  if (style === 'simple') {
    const cartoKey = import.meta.env.VITE_CARTO_API_KEY;
    if (cartoKey) {
      return {
        url: `https://{s}.basemaps.cartocdn.com/rastertiles/${isDark ? 'dark_all' : 'light_all'}/{z}/{x}/{y}.png?key=${cartoKey}`,
        options: { maxNativeZoom: 20, maxZoom: 21, zIndex: 1 },
      };
    }
    return {
      url: `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_${isDark ? 'Dark' : 'Light'}_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
      options: { maxNativeZoom: 16, maxZoom: 21, zIndex: 1, attribution: '&copy; Esri' },
    };
  }
  const layer = style === 'terrain' ? 'p' : 'm';
  return {
    url: `https://mt1.google.com/vt/lyrs=${layer}&x={x}&y={y}&z={z}&hl=ko`,
    options: {
      maxNativeZoom: 20,
      maxZoom: 21,
      zIndex: 1,
      className: isDark ? 'map-tile-dark' : 'map-tile-light',
    },
  };
}
