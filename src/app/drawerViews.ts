import { useEffect, useState } from 'react';

// Phone drawers (v1.3.8): on phones the hubs the tab bar reaches slide up over the home page instead of
// replacing it. The page stays under the drawer, so closing one (the tab again, the grip, back) lands on
// home exactly as it was.

export const DRAWER_VIEWS = ['archive', 'map', 'calendar', 'pocket'] as const;
export type DrawerView = typeof DRAWER_VIEWS[number];
export const isDrawerView = (v: string): v is DrawerView => (DRAWER_VIEWS as readonly string[]).includes(v);

const PHONE_QUERY = '(max-width: 767px)';

/** True on phone-width screens (below Tailwind's md), the same line the tab bar uses */
export function isPhoneViewport(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.(PHONE_QUERY).matches;
}

/** Live version of isPhoneViewport */
export function useIsPhone(): boolean {
  const [phone, setPhone] = useState(isPhoneViewport);
  useEffect(() => {
    const mq = window.matchMedia?.(PHONE_QUERY);
    if (!mq) return;
    const onChange = () => setPhone(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return phone;
}
