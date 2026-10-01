/**
 * Utility functions for detecting upcoming trips and plans
 */

export interface UpcomingPlanInfo {
  isUpcoming: boolean;
  daysLeft: number;
  dDayLabel: string; // e.g. "D-14", "D-DAY"
  isPlanOrFuture: boolean;
}

/**
 * Parse start date from trip date string (e.g. "2026.10.15 - 10.19", "2026.10.15 ~ 2026.10.19", "2026.10.15")
 */
export function parseTripStartDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const match = dateStr.match(/(\d{4})[.-](\d{1,2})[.-](\d{1,2})/);
  if (!match) return null;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);

  const d = new Date(year, month, day);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Determine if a trip is an upcoming trip or plan, and calculate countdown
 */
export function getUpcomingPlanInfo(trip: {
  date?: string;
  isPlan?: boolean;
  tags?: string[];
  title?: string;
  statusBadge?: string;
}): UpcomingPlanInfo {
  const isExplicitPlan = Boolean(
    trip.isPlan || 
    trip.statusBadge === 'PLAN' ||
    trip.tags?.includes('Plan') || 
    trip.tags?.includes('plan') ||
    trip.title?.includes('(Plan)') ||
    trip.title?.includes('(plan)')
  );

  const startDate = parseTripStartDate(trip.date || '');
  if (!startDate) {
    return {
      isUpcoming: false,
      daysLeft: 0,
      dDayLabel: 'PLAN',
      isPlanOrFuture: isExplicitPlan,
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  startDate.setHours(0, 0, 0, 0);

  const diffTime = startDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const isFuture = diffDays > 0;
  const isToday = diffDays === 0;

  let dDayLabel = 'PLAN';
  if (isFuture) {
    dDayLabel = `D-${diffDays}`;
  } else if (isToday) {
    dDayLabel = 'D-DAY';
  }

  return {
    isUpcoming: isFuture || isToday,
    daysLeft: diffDays,
    dDayLabel,
    isPlanOrFuture: isExplicitPlan || isFuture,
  };
}

/**
 * Parse a trip date range ("2026.10.15 - 10.19", "2026.10.15 ~ 2026.10.19", "2026.10.15") into
 * local midnight start and end dates; a single date gives the same start and end.
 */
export function parseTripDateRange(dateRangeStr?: string): { start: Date; end: Date } | null {
  if (!dateRangeStr) return null;
  // A plain hyphen separates the range only when spaced or between dotted dates, so ISO dates stay whole
  const parts = dateRangeStr.split(/\s*[—–~]\s*|\s+-\s+|(?<=\.\d{1,2})-(?=\d)/).map(p => p.trim());
  const yearMatch = dateRangeStr.match(/(\d{4})/);
  const commonYear = yearMatch ? yearMatch[1] : String(new Date().getFullYear());
  const parsePart = (str: string, fallbackYear: string) => {
    const ymd = str.match(/(\d{4})\s*[-./]\s*(\d{1,2})\s*[-./]\s*(\d{1,2})/);
    if (ymd) return new Date(+ymd[1], +ymd[2] - 1, +ymd[3]);
    const md = str.match(/(\d{1,2})\s*[-./]\s*(\d{1,2})/);
    if (md) return new Date(+fallbackYear, +md[1] - 1, +md[2]);
    return null;
  };
  const start = parts[0] ? parsePart(parts[0], commonYear) : null;
  if (!start) return null;
  const end = (parts[1] && parsePart(parts[1], String(start.getFullYear()))) || start;
  return { start, end: end < start ? start : end };
}

/** A journey whose last day is behind us (plans and upcoming journeys are never over) */
export function isJourneyOver(trip: { date?: string; isPlan?: boolean; tags?: string[]; title?: string; statusBadge?: string }): boolean {
  if (getUpcomingPlanInfo(trip).isPlanOrFuture) return false;
  const range = parseTripDateRange(trip.date);
  if (!range) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return range.end.getTime() < today.getTime();
}

// Helper to detect if today is within the trip date range
export function getLiveTripStatus(dateRangeStr?: string): { isLive: boolean; currentDay: number; totalDays: number } {
  if (!dateRangeStr) return { isLive: false, currentDay: 0, totalDays: 0 };
  const parts = dateRangeStr.split(/\s*[-—–~]\s*/).map(p => p.trim());
  const yearMatch = dateRangeStr.match(/(\d{4})/);
  const commonYear = yearMatch ? yearMatch[1] : String(new Date().getFullYear());

  const parsePart = (str: string, fallbackYear: string) => {
    if (!str) return null;
    const ymdMatch = str.match(/(\d{4})\s*[-./]\s*(\d{1,2})\s*[-./]\s*(\d{1,2})/);
    if (ymdMatch) {
      return new Date(parseInt(ymdMatch[1], 10), parseInt(ymdMatch[2], 10) - 1, parseInt(ymdMatch[3], 10));
    }
    const mdMatch = str.match(/(\d{1,2})\s*[-./]\s*(\d{1,2})/);
    if (mdMatch) {
      return new Date(parseInt(fallbackYear, 10), parseInt(mdMatch[1], 10) - 1, parseInt(mdMatch[2], 10));
    }
    return null;
  };

  const startDate = parts[0] ? parsePart(parts[0], commonYear) : null;
  const endDate = parts[1] ? parsePart(parts[1], startDate ? String(startDate.getFullYear()) : commonYear) : startDate;

  if (!startDate) return { isLive: false, currentDay: 0, totalDays: 0 };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const startOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const endOnly = endDate ? new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()) : startOnly;

  if (today >= startOnly && today <= endOnly) {
    const diffTime = today.getTime() - startOnly.getTime();
    const currentDay = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    const totalTime = endOnly.getTime() - startOnly.getTime();
    const totalDays = Math.max(1, Math.floor(totalTime / (1000 * 60 * 60 * 24)) + 1);
    return { isLive: true, currentDay, totalDays };
  }

  return { isLive: false, currentDay: 0, totalDays: 0 };
}
