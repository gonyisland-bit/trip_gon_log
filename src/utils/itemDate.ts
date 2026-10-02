// Dates and times of bookings (flights, stays, transport) and timeline places. They are free text: "2026.10.15",
// "10.15", "2026-10-15 ~ 10.18", "8:44 AM". One place reads them, so the board, the journey cards, the summary, the
// terminal and the settlement all agree. A new booking that has no date yet carries the template text YYYY.MM.DD:
// that is "no date", shown as 날짜 미정 and never as the letters.

export const DATE_PLACEHOLDER = 'YYYY.MM.DD';
export const NO_DATE = '날짜 미정';

/** True for an empty date and for the YYYY.MM.DD template a new booking starts with */
export function isPlaceholderDate(str?: string | null): boolean {
  if (!str || !str.trim()) return true;
  return /Y{2,4}\s*[-./]\s*M{1,2}\s*[-./]\s*D{1,2}/i.test(str) || !/\d/.test(str);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "10.15" from a date */
export const md = (d: Date | null) => (d ? `${pad(d.getMonth() + 1)}.${pad(d.getDate())}` : '');

interface Range { start: Date; end: Date }

/** The year a month-day date belongs to: the one that lands it inside the journey, else the journey's first */
function yearFor(month: number, day: number, year: number, range?: Range | null): number {
  if (!range) return year;
  const first = range.start.getFullYear();
  const last = range.end.getFullYear();
  if (first === last) return first;
  for (let y = first; y <= last; y++) {
    const at = new Date(y, month, day).getTime();
    if (at >= range.start.getTime() && at <= range.end.getTime()) return y;
  }
  return first;
}

/**
 * Booking dates are free text: "2026.10.15", "10.15", "2026-10-15 ~ 10.18"; a missing year borrows the journey's.
 * The first date in the text is read; the YYYY.MM.DD template is no date.
 */
export function parseItemDate(str: string | undefined, year: number, range?: Range | null): Date | null {
  if (isPlaceholderDate(str)) return null;
  const full = str!.match(/(\d{4})\s*[-./]\s*(\d{1,2})\s*[-./]\s*(\d{1,2})/);
  if (full) return new Date(+full[1], +full[2] - 1, +full[3]);
  const short = str!.match(/(\d{1,2})\s*[-./]\s*(\d{1,2})/);
  if (short) return new Date(yearFor(+short[1] - 1, +short[2], year, range), +short[1] - 1, +short[2]);
  return null;
}

/** First and last day of a stay's "2026.10.15 - 2026.10.18 (3 Nights)" (the end is null when only one day is written) */
export function parseItemRange(str: string | undefined, year: number, range?: Range | null): { start: Date | null; end: Date | null } {
  if (isPlaceholderDate(str)) return { start: null, end: null };
  const days: Date[] = [];
  const re = /(?:(\d{4})\s*[-./]\s*)?(\d{1,2})\s*[-./]\s*(\d{1,2})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(str!)) && days.length < 2) {
    days.push(m[1] ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(yearFor(+m[2] - 1, +m[3], year, range), +m[2] - 1, +m[3]));
  }
  return { start: days[0] ?? null, end: days[1] ?? null };
}

/** "10.15" for a real date, 날짜 미정 for the template or an empty date */
export function dateLabel(str: string | undefined, year: number, range?: Range | null): string {
  const d = parseItemDate(str, year, range);
  return d ? md(d) : NO_DATE;
}

/** The date as written ("2026.10.15") for a real date, 날짜 미정 for the template or an empty date */
export function dateText(str?: string): string {
  return isPlaceholderDate(str) ? NO_DATE : str!.trim();
}

/** A stay's span as "10.15 – 10.18 · 3박" */
export function stayLabel(str: string | undefined, year: number, range?: Range | null): string {
  const { start, end } = parseItemRange(str, year, range);
  if (!start) return NO_DATE;
  if (!end) return md(start);
  const nights = Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000));
  return `${md(start)} – ${md(end)}${nights > 0 ? ` · ${nights}박` : ''}`;
}

// ── Times ──

export interface ClockTime {
  /** 오전 · 오후, or empty when the text is not a clock time */
  period: '오전' | '오후' | '';
  /** "8:44" in 12-hour form */
  hm: string;
  /** Minutes from midnight; -1 when the text is not a clock time */
  minutes: number;
}

/** "8:44 AM", "08:44", "13:03" and "오후 1:03" all read the same way */
export function clockTime(time?: string): ClockTime {
  const m = (time || '').trim().match(/^(?:(오전|오후)\s*)?(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!m) return { period: '', hm: (time || '').trim(), minutes: -1 };
  let h = +m[2];
  const min = +m[3];
  const marker = (m[1] || m[4] || '').toUpperCase();
  if (marker === 'PM' || marker === '오후') { if (h < 12) h += 12; }
  else if (marker === 'AM' || marker === '오전') { if (h === 12) h = 0; }
  const shown = h % 12 === 0 ? 12 : h % 12;
  return { period: h < 12 ? '오전' : '오후', hm: `${shown}:${pad(min)}`, minutes: h * 60 + min };
}

/** "오전 8:44" (the text as it is when it is not a clock time, empty for no time) */
export function timeLabel(time?: string): string {
  if (!time || !time.trim()) return '';
  const c = clockTime(time);
  return c.period ? `${c.period} ${c.hm}` : c.hm;
}
