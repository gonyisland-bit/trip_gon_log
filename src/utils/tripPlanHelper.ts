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
