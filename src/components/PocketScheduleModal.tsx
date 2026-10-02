import React, { useState, useMemo } from 'react';
import { Check, Plane, Utensils, Coffee, Moon } from 'lucide-react';
import { SpotPocketItem, Trip } from '../types';
import { Sheet, useSheetClose } from './Sheet';
import { Chip } from './ui/Chip';

export interface TimeSlotOption {
  id: string;
  label: string;
  time: string;
  sub: string;
  icon: React.ElementType;
}

export const QUICK_TIME_SLOTS: TimeSlotOption[] = [
  { id: 'arrival', label: '입국 직후 / 오전', time: '10:30 AM', sub: '공항 도착 후 첫 스팟', icon: Plane },
  { id: 'lunch', label: '점심 식사', time: '12:30 PM', sub: '런치 & 웨이팅 맛집', icon: Utensils },
  { id: 'afternoon', label: '오후 티타임', time: '03:30 PM', sub: '카페, 쇼핑, 관광', icon: Coffee },
  { id: 'dinner', label: '저녁 만찬', time: '07:00 PM', sub: '디너 & 야경 명소', icon: Utensils },
  { id: 'night', label: '나이트 / 바', time: '09:30 PM', sub: '이자카야, 펍, 루프탑', icon: Moon },
  { id: 'departure', label: '출국 전 / 오전', time: '11:00 AM', sub: '마지막 쇼핑 & 공항행', icon: Plane },
];

interface PocketScheduleModalProps {
  isOpen: boolean;
  spot: SpotPocketItem | null;
  trip: Trip | null;
  availableDates: string[]; // ['2025.04.12', '2025.04.13', ...]
  onClose: () => void;
  onConfirm: (date: string, time: string) => void;
}

// Which day and time a saved place goes to on a journey (v1.3.8: the shared Sheet, day and time as pills)
export function PocketScheduleModal(props: PocketScheduleModalProps) {
  if (!props.isOpen || !props.spot) return null;
  return (
    <Sheet label="일정에 넣기" onClose={props.onClose} tone="paper" zIndex={196} panelClassName="sm:max-w-md max-h-[88dvh]">
      <Picker {...props} spot={props.spot} />
    </Sheet>
  );
}

function Picker({ spot, trip, availableDates, onConfirm }: PocketScheduleModalProps & { spot: SpotPocketItem }) {
  const close = useSheetClose();
  const dates = useMemo(() => {
    if (availableDates && availableDates.length > 0) return availableDates;
    if (trip?.date) {
      // e.g. "2025.04.12 - 2025.04.16" or "2025.04.12 ~ 2025.04.16"
      const parts = trip.date.replace(/~/g, '-').split('-').map(s => s.trim().replace(/\//g, '.'));
      if (parts[0] && parts[0].match(/^\d{4}\.\d{1,2}\.\d{1,2}$/)) return [parts[0]];
    }
    return ['2025.04.12'];
  }, [availableDates, trip]);

  const [selectedDate, setSelectedDate] = useState<string>(() => dates[0] || '2025.04.12');
  const [selectedSlotId, setSelectedSlotId] = useState<string>('afternoon');
  const currentSlot = QUICK_TIME_SLOTS.find(s => s.id === selectedSlotId) || QUICK_TIME_SLOTS[2];

  return (
    <div className="flex flex-col gap-4 p-4 pt-2 min-h-0 overflow-y-auto overscroll-contain">
      <div className="flex flex-col gap-0.5 px-1">
        <span className="font-mono text-micro font-bold uppercase tracking-[0.14em] text-black/55 dark:text-white/55">일정에 넣기</span>
        <h2 className="text-[20px] font-extrabold tracking-tight leading-tight break-keep truncate">{spot.title}</h2>
      </div>

      <div className="flex flex-col gap-2">
        <span className="px-1 font-mono text-micro font-bold uppercase tracking-[0.14em] text-black/55 dark:text-white/55">날짜</span>
        <div className="flex gap-1.5 overflow-x-auto hide-scrollbar -mx-4 px-4">
          {dates.map((d, idx) => (
            <Chip key={d} selected={selectedDate === d} onClick={() => setSelectedDate(d)}>
              <span className="font-mono text-micro opacity-70">D{idx + 1}</span>
              <span className="font-mono tabular-nums">{d.split('.').slice(1).join('/')}</span>
            </Chip>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="px-1 font-mono text-micro font-bold uppercase tracking-[0.14em] text-black/55 dark:text-white/55">시간대</span>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_TIME_SLOTS.map((slot) => {
            const on = selectedSlotId === slot.id;
            const Icon = slot.icon;
            return (
              <button
                key={slot.id}
                type="button"
                onClick={() => setSelectedSlotId(slot.id)}
                aria-pressed={on}
                className={`p-3 text-left rounded-thumb flex flex-col gap-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 ${
                  on ? 'bg-ink dark:bg-ink-dark text-surface dark:text-paper-dark' : 'bg-surface dark:bg-surface-dark hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                }`}
              >
                <span className="flex items-center justify-between gap-2 text-[13px] font-bold">
                  <span className="flex items-center gap-1.5 min-w-0"><Icon className="w-3.5 h-3.5 shrink-0" aria-hidden /><span className="truncate">{slot.label}</span></span>
                </span>
                <span className="font-mono text-meta tabular-nums opacity-70">{slot.time}</span>
                <span className="text-meta opacity-55 truncate">{slot.sub}</span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="px-1 font-mono text-meta tabular-nums text-black/65 dark:text-white/65">{selectedDate} · {currentSlot.time}</p>

      <div className="flex items-center gap-2">
        <button type="button" onClick={close} className="btn btn-secondary flex-1">취소</button>
        <button type="button" onClick={() => { onConfirm(selectedDate, currentSlot.time); close(); }} className="btn btn-primary flex-1">
          <Check className="w-4 h-4" aria-hidden />일정에 넣기
        </button>
      </div>
    </div>
  );
}
