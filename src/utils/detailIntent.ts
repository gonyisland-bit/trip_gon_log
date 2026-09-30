// How the next journey should open (v1.3.6 4-b). A published journey opens on its magazine;
// the card menu can ask for the record instead, or for a magazine preview before publishing.
export type DetailIntent = 'record' | 'magazine';

let next: DetailIntent | null = null;

export function setDetailIntent(intent: DetailIntent) {
  next = intent;
}

/** The intent for the journey being opened now (read once) */
export function takeDetailIntent(): DetailIntent | null {
  const v = next;
  next = null;
  return v;
}
