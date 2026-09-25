import React, { useState, useMemo } from 'react';
import { X, Calendar, Clock, Check, Plane, Utensils, Coffee, Moon, Sparkles } from 'lucide-react';
import { SpotPocketItem, Trip } from '../types';

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

export function PocketScheduleModal({
  isOpen,
  spot,
  trip,
  availableDates,
  onClose,
  onConfirm,
}: PocketScheduleModalProps) {
  // Extract or fallback dates
  const dates = useMemo(() => {
    if (availableDates && availableDates.length > 0) return availableDates;
    if (trip?.date) {
      // e.g. "2025.04.12 - 2025.04.16" or "2025.04.12 ~ 2025.04.16"
      const parts = trip.date.replace(/~/g, '-').split('-').map(s => s.trim().replace(/\//g, '.'));
      if (parts[0] && parts[0].match(/^\d{4}\.\d{1,2}\.\d{1,2}$/)) {
        return [parts[0]];
      }
    }
    return ['2025.04.12'];
  }, [availableDates, trip]);

  const [selectedDate, setSelectedDate] = useState<string>(() => dates[0] || '2025.04.12');
  const [selectedSlotId, setSelectedSlotId] = useState<string>('afternoon');

  if (!isOpen || !spot) return null;

  const currentSlot = QUICK_TIME_SLOTS.find(s => s.id === selectedSlotId) || QUICK_TIME_SLOTS[2];

  // Global ESC key listener to safely close modal
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleApply = () => {
    onConfirm(selectedDate, currentSlot.time);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 pt-16 sm:pt-20 pb-8 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-[#111111] border border-black dark:border-white w-full max-w-md p-5 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 font-sans my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/15 dark:border-white/15 pb-3 mb-4">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono tracking-widest text-red-500 uppercase font-bold">
              <Clock className="w-3 h-3" />
              <span>SCHEDULE SLOT PICKER</span>
            </div>
            <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-black dark:text-white truncate max-w-[280px]">
              {spot.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Date Selection (DAY 1, DAY 2 ...) */}
        <div className="mb-4">
          <label className="block text-[10px] font-mono uppercase tracking-wider text-black/50 dark:text-white/50 mb-1.5 font-bold">
            1. 여행 날짜 선택 (DATE)
          </label>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {dates.map((d, idx) => {
              const isSelected = selectedDate === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDate(d)}
                  className={`px-3 py-1.5 text-xs font-mono border transition-colors whitespace-nowrap flex flex-col items-center cursor-pointer ${
                    isSelected
                      ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white font-bold shadow-xs'
                      : 'border-black/15 dark:border-white/15 text-black/70 dark:text-white/70 hover:border-black dark:hover:border-white'
                  }`}
                >
                  <span className="text-[9px] uppercase tracking-wider opacity-70">DAY {idx + 1}</span>
                  <span className="font-bold">{d.split('.').slice(1).join('/')}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Realistic 6-Time-Slot Selection */}
        <div className="mb-5">
          <label className="block text-[10px] font-mono uppercase tracking-wider text-black/50 dark:text-white/50 mb-1.5 font-bold">
            2. 시간대 선택 (TIME SLOT)
          </label>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_TIME_SLOTS.map((slot) => {
              const isSelected = selectedSlotId === slot.id;
              const Icon = slot.icon;
              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => setSelectedSlotId(slot.id)}
                  className={`p-2.5 text-left border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-xs'
                      : 'border-black/15 dark:border-white/15 text-black/70 dark:text-white/70 hover:border-black/50 dark:hover:border-white/50 bg-black/[0.02] dark:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold font-mono tracking-tight flex items-center gap-1">
                      <Icon className="w-3 h-3 text-red-500" />
                      <span>{slot.label}</span>
                    </span>
                    <span className="text-[10px] font-mono opacity-60">{slot.time}</span>
                  </div>
                  <span className="text-[9.5px] font-mono opacity-50 truncate">{slot.sub}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Summary Info */}
        <div className="p-2.5 bg-black/[0.03] dark:bg-white/[0.03] border-l-2 border-red-500 text-xs font-mono mb-4 flex items-center justify-between">
          <span className="text-black/60 dark:text-white/60">배치 예정:</span>
          <span className="font-bold text-black dark:text-white">
            {selectedDate} · {currentSlot.time} ({currentSlot.label})
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 border-t border-black/10 dark:border-white/10 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-3.5 border border-black/20 dark:border-white/20 text-xs font-mono uppercase tracking-wider hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="h-8 px-5 bg-black text-white dark:bg-white dark:text-black text-xs font-mono font-black uppercase tracking-widest hover:bg-red-600 dark:hover:bg-red-500 dark:hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>ADD TO TIMELINE</span>
          </button>
        </div>
      </div>
    </div>
  );
}
