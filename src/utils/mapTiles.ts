// Journey map style (v1.3.5): normal (Google road map), terrain (Google terrain) or simple
// (the Google road map in greys, so Korean place names and every zoom level stay available).
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

// Simple style: "WY" by Snazzy Maps (snazzymaps.com/style/8097/wy) — white land, grey roads, no
// points of interest or transit, soft teal water, labels kept. Google's raster tiles take a
// Maps style through the `apistyle` query; if Google ever ignores it the plain road map shows.
const WY_STYLE: { featureType?: string; elementType?: string; stylers: Record<string, string | number>[] }[] = [
  { featureType: 'all', elementType: 'geometry.stroke', stylers: [{ color: '#9c9c9c' }] },
  { featureType: 'landscape', elementType: 'all', stylers: [{ color: '#f2f2f2' }] },
  { featureType: 'landscape', elementType: 'geometry.fill', stylers: [{ color: '#ffffff' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry.fill', stylers: [{ color: '#ffffff' }] },
  { featureType: 'poi', elementType: 'all', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'all', stylers: [{ saturation: -100 }, { lightness: 45 }] },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#eeeeee' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#7b7b7b' }] },
  { featureType: 'road', elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.highway', elementType: 'all', stylers: [{ visibility: 'simplified' }] },
  { featureType: 'road.arterial', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'all', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'all', stylers: [{ color: '#46bcec' }, { visibility: 'on' }] },
  { featureType: 'water', elementType: 'geometry.fill', stylers: [{ color: '#c8d7d4' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#070707' }] },
  { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
];

const FEATURE: Record<string, number> = {
  administrative: 1, poi: 2, road: 3, transit: 4, landscape: 5, water: 6,
  'road.highway': 49, 'road.arterial': 50, 'road.local': 51, 'landscape.man_made': 81, 'landscape.natural': 82,
};
const ELEMENT: Record<string, string> = {
  geometry: 'g', 'geometry.fill': 'g.f', 'geometry.stroke': 'g.s', labels: 'l',
  'labels.text': 'l.t', 'labels.text.fill': 'l.t.f', 'labels.text.stroke': 'l.t.s', 'labels.icon': 'l.i',
};

/** A Google Maps style array written as the tile server's `apistyle` value */
function toApiStyle(style: typeof WY_STYLE): string {
  const rules: string[] = [];
  style.forEach(({ featureType, elementType, stylers }) => {
    const scope: string[] = [];
    if (featureType && featureType !== 'all' && FEATURE[featureType] !== undefined) scope.push(`s.t:${FEATURE[featureType]}`);
    if (elementType && elementType !== 'all' && ELEMENT[elementType]) scope.push(`s.e:${ELEMENT[elementType]}`);
    stylers.forEach(s => {
      const [key, value] = Object.entries(s)[0];
      const rule = key === 'color' ? `p.c:#ff${String(value).slice(1)}`
        : key === 'visibility' ? `p.v:${value}`
        : key === 'saturation' ? `p.s:${value}`
        : key === 'lightness' ? `p.l:${value}`
        : key === 'weight' ? `p.w:${value}` : '';
      if (rule) rules.push([...scope, rule].join('|'));
    });
  });
  return encodeURIComponent(rules.join(','));
}

const WY_APISTYLE = toApiStyle(WY_STYLE);

/** Tile URL and Leaflet options for a style; dark mode inverts the tiles */
export function mapTileFor(style: MapStyle, isDark: boolean): { url: string; options: Record<string, unknown> } {
  const className = style === 'simple'
    ? (isDark ? 'map-tile-simple-dark' : 'map-tile-simple')
    : (isDark ? 'map-tile-dark' : 'map-tile-light');
  const layer = style === 'terrain' ? 'p' : 'm';
  const extra = style === 'simple' ? `&apistyle=${WY_APISTYLE}` : '';
  return {
    url: `https://mt1.google.com/vt/lyrs=${layer}&x={x}&y={y}&z={z}&hl=ko${extra}`,
    options: {
      maxNativeZoom: 20,
      maxZoom: 21,
      zIndex: 1,
      className,
    },
  };
}

// World map (map hub) styles (v1.3.7): the light grey world plus the journey map's three.
// Picked on the map itself and saved per account (prefs.hubMapStyle).
export type HubMapStyle = 'gray' | MapStyle;
export const HUB_MAP_STYLES: HubMapStyle[] = ['gray', 'normal', 'terrain', 'simple'];
export const HUB_MAP_STYLE_LABEL: Record<HubMapStyle, string> = { gray: '라이트', ...MAP_STYLE_LABEL };
const HUB_KEY = 'tgl_hub_map_style';

export function isHubMapStyle(v: unknown): v is HubMapStyle {
  return v === 'gray' || isMapStyle(v);
}

export function readHubMapStyle(): HubMapStyle {
  try {
    const v = localStorage.getItem(HUB_KEY);
    if (isHubMapStyle(v)) return v;
    // Before v1.3.7 the operator chose 'esri' (grey) or 'google' (road map) for everyone
    if (localStorage.getItem('mapTileStyle') === 'google') return 'normal';
  } catch { /* cache only */ }
  return 'gray';
}

export function applyHubMapStyle(style: HubMapStyle, save = true) {
  try { localStorage.setItem(HUB_KEY, style); } catch { /* cache only */ }
  window.dispatchEvent(new CustomEvent('mapTileStyleChanged', { detail: style }));
  if (save) saveUserPref({ hubMapStyle: style });
}

/** Tile URL and options for the world map in a style, light or dark */
export function hubTileFor(style: HubMapStyle, isDark: boolean): { url: string; options: Record<string, unknown> } {
  if (style === 'gray') {
    return {
      url: isDark
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
        : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      options: { attribution: '&copy; Esri &mdash; Esri, DeLorme, NAVTEQ', maxZoom: 18, keepBuffer: 16 },
    };
  }
  const t = mapTileFor(style, isDark);
  return { url: t.url, options: { ...t.options, attribution: '&copy; Google Maps', maxZoom: 20, zIndex: undefined } };
}
