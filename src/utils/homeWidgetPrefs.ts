// Home tiles each member turns on for their own home (v1.3.6, grown into the bento in v1.3.8). Saved with the viewer
// prefs (users/{uid}/settings/prefs.homeWidgets); the operator's old shared home_widgets doc no longer decides anyone's home.
import { useEffect, useState } from 'react';
import { saveUserPref } from './userPrefs';

/** The tiles of the home bento, in the order they sit */
export const BENTO_TILES = [
  { id: 'dday', label: '예정 여정' },
  { id: 'term', label: '공항 터미널' },
  { id: 'map', label: '지도' },
  { id: 'cal', label: '이달의 달력' },
  { id: 'sum', label: '다녀온 여정' },
  { id: 'trips', label: '최근 여정' },
  { id: 'mem', label: '추억' },
  { id: 'fri', label: '친구' },
  { id: 'mag', label: '매거진' },
  { id: 'pocket', label: '포켓' },
  { id: 'wx', label: '내 도시 날씨' },
  { id: 'fx', label: '환율' },
  { id: 'time', label: '세계시간' },
] as const;
export type BentoTileId = typeof BENTO_TILES[number]['id'];

export type ClockStyle = 'analog' | 'digital' | 'dial';

export interface HomeWidgetPrefs {
  /** Tiles the member turned off (the hero is always there) */
  hiddenTiles: string[];
  // Before the bento these four switches decided the home widgets; an old account that turned one off keeps it off
  showLiveWeather: boolean;
  showCalendarArchive: boolean;
  showUpcomingDDay: boolean;
  showExchangeRates: boolean;
  widgetOrder?: 'calendar-first' | 'weather-first';
  /** The ticket the member picked as the trip the home shows; empty = the nearest one */
  focusTicketId?: string;
  /** World-time cube: the cities it shows (English names; empty = the main city), all together or one, and the face */
  clockCities: string[];
  clockMulti: boolean;
  clockStyle: ClockStyle;
}

export const DEFAULT_HOME_WIDGETS: HomeWidgetPrefs = {
  hiddenTiles: [],
  showLiveWeather: true,
  showCalendarArchive: true,
  showUpcomingDDay: true,
  showExchangeRates: true,
  clockCities: [],
  clockMulti: false,
  clockStyle: 'analog',
};

const LEGACY: Partial<Record<BentoTileId, 'showLiveWeather' | 'showCalendarArchive' | 'showUpcomingDDay' | 'showExchangeRates'>> = {
  wx: 'showLiveWeather', cal: 'showCalendarArchive', dday: 'showUpcomingDDay', fx: 'showExchangeRates',
};

const KEY = 'tgl_home_widgets';
const EVENT = 'homeWidgetsChanged';

export function readHomeWidgets(): HomeWidgetPrefs {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (v && typeof v === 'object') return { ...DEFAULT_HOME_WIDGETS, ...v, hiddenTiles: Array.isArray(v.hiddenTiles) ? v.hiddenTiles : [], clockCities: Array.isArray(v.clockCities) ? v.clockCities : [] };
  } catch { /* defaults */ }
  return DEFAULT_HOME_WIDGETS;
}

/** Whether a tile shows on this member's home */
export function isTileOn(prefs: HomeWidgetPrefs, id: BentoTileId): boolean {
  if (prefs.hiddenTiles.includes(id)) return false;
  const legacy = LEGACY[id];
  return legacy ? prefs[legacy] !== false : true;
}

/** Applies on this device and, with `save`, on the account */
export function setHomeWidgets(patch: Partial<HomeWidgetPrefs>, save = true) {
  const next = { ...readHomeWidgets(), ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* cache only */ }
  window.dispatchEvent(new Event(EVENT));
  if (save) saveUserPref({ homeWidgets: next });
}

/** Turns one tile on or off (an old switch for it is set to match, so it cannot keep the tile hidden) */
export function setTileOn(id: BentoTileId, on: boolean) {
  const cur = readHomeWidgets();
  const hidden = new Set(cur.hiddenTiles);
  if (on) hidden.delete(id); else hidden.add(id);
  const legacy = LEGACY[id];
  setHomeWidgets({ hiddenTiles: [...hidden], ...(legacy ? { [legacy]: true } : {}) } as Partial<HomeWidgetPrefs>);
}

export function useHomeWidgets(): HomeWidgetPrefs {
  const [v, setV] = useState<HomeWidgetPrefs>(readHomeWidgets);
  useEffect(() => {
    const on = () => setV(readHomeWidgets());
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  return v;
}
