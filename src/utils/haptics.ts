// A short touch of the phone's vibration (v1.3.8 (4)), only in the store app (Capacitor Haptics); the web does nothing.
// `tick` for a switch or a pick, `thud` for a heavier action, `done` for a finished one (boarding, issuing a ticket).
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

const native = () => {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
};

export function tick() {
  if (native()) Haptics.selectionChanged().catch(() => {});
}

export function thud() {
  if (native()) Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
}

export function done() {
  if (native()) Haptics.notification({ type: NotificationType.Success }).catch(() => {});
}
