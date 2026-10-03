import { useCalendarHubState } from './calendar/useCalendarHubState';
import { CalendarHeader } from './calendar/CalendarHeader';
import { CalendarBoard } from './calendar/CalendarBoard';
import { CalendarEventModals } from './calendar/CalendarEventModals';
import { CalendarTripPreview, CalendarYearTrips } from './calendar/CalendarTripModals';
import { CalendarDayPeek } from './calendar/CalendarDayPeek';
import type { CalendarHubPageProps } from './calendar/calendarData';

export type { CalendarWeatherCity } from './calendar/calendarData';

// Calendar hub: a thin shell. State lives in calendar/useCalendarHubState, each part of the screen in calendar/*.
export function CalendarHubPage(props: CalendarHubPageProps) {
  const s = useCalendarHubState(props);
  const {
    quickViewDate,
    selectedRange,
    setSelectedRange,
    selectedScheduleId,
    setSelectedScheduleId,
    setDragAnchorDate,
    isDragging,
    isDraggingRef,
    justDraggedRef,
  } = s;

  return (
    <div 
      onClick={() => {
        if (justDraggedRef.current || isDragging || isDraggingRef.current) return;
        if (selectedRange || selectedScheduleId) {
          setSelectedRange(null);
          setSelectedScheduleId(null);
          setDragAnchorDate(null);
        }
      }}
      className={`relative w-full min-h-screen bg-transparent text-black dark:text-white transition-colors duration-300 select-none ${quickViewDate ? 'pb-56' : 'pb-24'} overflow-hidden transition-[padding] duration-300`}
    >

      <CalendarHeader s={s} />
      <CalendarBoard s={s} />
      <CalendarEventModals s={s} />
      <CalendarTripPreview s={s} />
      <CalendarDayPeek s={s} />
      <CalendarYearTrips s={s} />
    </div>
  );
}
