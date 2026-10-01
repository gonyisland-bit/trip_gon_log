// Home widgets each member turns on for their own home (v1.3.6): weather, calendar, the next trip's
// D-day and exchange rates. Saved with the viewer prefs (users/{uid}/settings/prefs.homeWidgets);
// the operator's old shared home_widgets doc no longer decides anyone's home.
import { useEffect, useState } from 'react';
import { saveUserPref } from './userPrefs';

export interface HomeWidgetPrefs {
  showLiveWeather: boolean;
  showCalendarArchive: boolean;
  widgetOrder: 'calendar-first' | 'weather-first';
  showUpcomingDDay: boolean;
  showExchangeRates: boolean;
}

export const DEFAULT_HOME_WIDGETS: HomeWidgetPrefs = {
  showLiveWeather: true,
  showCalendarArchive: true,
  widgetOrder: 'calendar-first',
  showUpcomingDDay: true,
  showExchangeRates: false,
};

const KEY = 'tgl_home_widgets';
const EVENT = 'homeWidgetsChanged';

export function readHomeWidgets(): HomeWidgetPrefs {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (v && typeof v === 'object') return { ...DEFAULT_HOME_WIDGETS, ...v };
  } catch { /* defaults */ }
  return DEFAULT_HOME_WIDGETS;
}

/** Applies on this device and, with `save`, on the account */
export function setHomeWidgets(patch: Partial<HomeWidgetPrefs>, save = true) {
  const next = { ...readHomeWidgets(), ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* cache only */ }
  window.dispatchEvent(new Event(EVENT));
  if (save) saveUserPref({ homeWidgets: next });
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
