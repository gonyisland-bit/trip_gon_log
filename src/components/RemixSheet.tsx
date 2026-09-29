import React, { useEffect, useMemo, useState } from 'react';
import { BedDouble, Bookmark, Check, MapPin, X } from 'lucide-react';
import { Trip, Plan, TimelineItem, StayItem, SpotPocketItem } from '../types';
import { confirmDialog } from '../utils/feedback';
import { Sheet, useSheetClose } from './Sheet';

// Journey Remix (v1.3 P5): pick places, stays and pocket places from a journey
// and start a new plan with them. Times, costs and who-paid are left behind; days
// keep their order and move to the new start date; pocket places join a chosen day.


export interface RemixPayload {
  title: string;
  startDate: string;               // YYYY-MM-DD
  days: TimelineItem[][];          // picked items, one list per source day, in order
  stays: StayItem[];
  pockets: SpotPocketItem[];       // picked pocket places
  pocketDay: number;               // 0-based day of the new plan they join
}

interface RemixSheetProps {
  journey: Trip | Plan;
  timeline: TimelineItem[];
  stays: StayItem[];
  pockets?: SpotPocketItem[];      // the journey's pocket places and ones saved for its city
  onClose: () => void;
  onCreate: (payload: RemixPayload) => Promise<void>;
}

const pad = (n: number) => String(n).padStart(2, '0');
const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function RemixSheet({ journey, timeline, stays, pockets = [], onClose, onCreate }: RemixSheetProps) {
  // Source days in order, keeping only real places
  const days = useMemo(() => {
    const byDate = new Map<string, TimelineItem[]>();
    timeline
      .filter(i => (i.place || '').trim())
      .forEach(i => { const d = i.date || ''; byDate.set(d, [...(byDate.get(d) || []), i]); });
    return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, items]) => ({ date, items }));
  }, [timeline]);

  const [picked, setPicked] = useState<Set<string>>(() => new Set([
    ...timeline.map(i => `t-${i.id}`),
    ...stays.map(s => `s-${s.id}`),
  ]));
  const [title, setTitle] = useState(`${journey.title} Remix`);
  const [startDate, setStartDate] = useState(() => isoDay(new Date(Date.now() + 30 * 86400000)));
  const [busy, setBusy] = useState(false);
  const [pocketDay, setPocketDay] = useState(0);

  const allKeys = useMemo(() => [...days.flatMap(d => d.items.map(i => `t-${i.id}`)), ...stays.map(s => `s-${s.id}`), ...pockets.map(p => `p-${p.id}`)], [days, stays, pockets]);
  const count = allKeys.filter(k => picked.has(k)).length;
  const toggle = (keys: string[], on: boolean) => setPicked(prev => {
    const next = new Set(prev);
    keys.forEach(k => (on ? next.add(k) : next.delete(k)));
    return next;
  });

  const pickedDays = days.map(d => d.items.filter(i => picked.has(`t-${i.id}`))).filter(list => list.length > 0);
  const pickedPockets = pockets.filter(p => picked.has(`p-${p.id}`));
  // Pocket places alone still make a one-day plan
  const planDays = Math.max(pickedDays.length, pickedPockets.length ? 1 : 0);
  const safePocketDay = Math.min(pocketDay, Math.max(0, planDays - 1));
  const endDate = (() => {
    const d = new Date(`${startDate}T00:00:00`);
    d.setDate(d.getDate() + Math.max(0, planDays - 1));
    return isNaN(d.getTime()) ? '' : isoDay(d);
  })();

  const create = async () => {
    if (!count || !title.trim() || !startDate) return;
    const placeCount = pickedDays.reduce((n, d) => n + d.length, 0) + pickedPockets.length;
    const ok = await confirmDialog(`"${title.trim()}" 계획을 만들까요? 장소 ${placeCount}곳, 숙소 ${stays.filter(s => picked.has(`s-${s.id}`)).length}곳을 담습니다.`);
    if (!ok) return;
    setBusy(true);
    try {
      await onCreate({ title: title.trim(), startDate, days: pickedDays, stays: stays.filter(s => picked.has(`s-${s.id}`)), pockets: pickedPockets, pocketDay: safePocketDay });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const Box = ({ on }: { on: boolean }) => (
    <span className={`w-4 h-4 shrink-0 grid place-items-center border ${on ? 'bg-black border-black text-white dark:bg-white dark:border-white dark:text-black' : 'border-black/30 dark:border-white/30'}`}>
      {on && <Check className="w-3 h-3" />}
    </span>
  );

  return (
    <Sheet onClose={onClose} label="여정 Remix" locked={busy} panelClassName="sm:max-w-xl max-sm:h-[88dvh] max-h-[88dvh]">
        <div className="flex items-start justify-between gap-3 px-5 pt-1 sm:pt-4 pb-3 border-b border-black/15 dark:border-white/15">
          <div className="min-w-0">
            <span className="font-mono text-micro font-bold uppercase tracking-widest text-red-600 dark:text-red-500">Remix</span>
            <h2 className="text-lg font-extrabold tracking-tight truncate">{journey.title}</h2>
          </div>
          <SheetCloseButton disabled={busy} />
        </div>

        {/* New plan: name and start date */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 px-5 py-3 border-b border-black/10 dark:border-white/10">
          <label className="flex flex-col gap-1 min-w-0">
            <span className="font-mono text-micro font-bold uppercase tracking-widest text-black/60 dark:text-white/60">새 계획 이름</span>
            <input id="remix-title" value={title} onChange={e => setTitle(e.target.value)} className="h-10 px-3 bg-transparent border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none text-sm font-semibold" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-mono text-micro font-bold uppercase tracking-widest text-black/60 dark:text-white/60">출발일</span>
            <input id="remix-start" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-10 px-3 bg-transparent border border-black/20 dark:border-white/20 focus:border-black dark:focus:border-white outline-none text-sm font-mono" />
          </label>
        </div>

        <div className="flex items-center justify-between px-5 py-2 border-b border-black/10 dark:border-white/10">
          <span className="font-mono text-meta tabular-nums text-black/60 dark:text-white/60">
            {count}/{allKeys.length} 선택 · {planDays}일{endDate && ` · ${startDate.replace(/-/g, '.')} - ${endDate.slice(5).replace('-', '.')}`}
          </span>
          <button type="button" onClick={() => toggle(allKeys, count !== allKeys.length)} className="font-mono text-meta font-bold uppercase tracking-widest hover:text-red-600 dark:hover:text-red-500 cursor-pointer">
            {count === allKeys.length ? '전체 해제' : '전체 선택'}
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {days.length === 0 && stays.length === 0 && pockets.length === 0 && (
            <p className="px-5 py-10 text-sm text-center text-black/60 dark:text-white/60">가져올 장소가 없습니다.</p>
          )}
          {days.map((d, di) => {
            const keys = d.items.map(i => `t-${i.id}`);
            const allOn = keys.every(k => picked.has(k));
            return (
              <section key={d.date} className="border-b border-black/10 dark:border-white/10">
                <button type="button" onClick={() => toggle(keys, !allOn)} className="w-full flex items-center gap-3 px-5 py-2.5 bg-black/[0.03] dark:bg-white/[0.04] text-left cursor-pointer">
                  <Box on={allOn} />
                  <span className="font-extrabold text-sm">DAY {di + 1}</span>
                  <span className="font-mono text-micro text-black/55 dark:text-white/55">{d.date}</span>
                </button>
                {d.items.map(i => {
                  const on = picked.has(`t-${i.id}`);
                  return (
                    <button key={i.id} type="button" onClick={() => toggle([`t-${i.id}`], !on)} className={`w-full flex items-center gap-3 px-5 py-2 text-left cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.04] ${on ? '' : 'opacity-50'}`}>
                      <Box on={on} />
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-black/50 dark:text-white/50" />
                      <span className="text-sm truncate">{i.place}</span>
                      {i.memo && <span className="ml-auto pl-2 max-w-[40%] text-meta text-black/50 dark:text-white/50 truncate">{i.memo}</span>}
                    </button>
                  );
                })}
              </section>
            );
          })}
          {stays.length > 0 && (
            <section>
              <div className="px-5 py-2.5 bg-black/[0.03] dark:bg-white/[0.04] font-extrabold text-sm">숙소</div>
              {stays.map(st => {
                const on = picked.has(`s-${st.id}`);
                return (
                  <button key={st.id} type="button" onClick={() => toggle([`s-${st.id}`], !on)} className={`w-full flex items-center gap-3 px-5 py-2 text-left cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.04] ${on ? '' : 'opacity-50'}`}>
                    <Box on={on} />
                    <BedDouble className="w-3.5 h-3.5 shrink-0 text-black/50 dark:text-white/50" />
                    <span className="text-sm truncate">{st.title}</span>
                    {st.address && <span className="ml-auto pl-2 max-w-[40%] text-meta text-black/50 dark:text-white/50 truncate">{st.address}</span>}
                  </button>
                );
              })}
            </section>
          )}
          {pockets.length > 0 && (
            <section className="border-t border-black/10 dark:border-white/10">
              <div className="flex items-center justify-between gap-3 px-5 py-2.5 bg-black/[0.03] dark:bg-white/[0.04]">
                <span className="font-extrabold text-sm">포켓</span>
                {pickedPockets.length > 0 && planDays > 1 && (
                  <label className="flex items-center gap-2 font-mono text-micro text-black/60 dark:text-white/60">
                    담을 날
                    <select
                      id="remix-pocket-day"
                      value={safePocketDay}
                      onChange={e => setPocketDay(Number(e.target.value))}
                      className="h-7 px-1.5 bg-transparent border border-black/20 dark:border-white/20 text-black dark:text-white text-meta"
                    >
                      {Array.from({ length: planDays }, (_, i) => <option key={i} value={i}>DAY {i + 1}</option>)}
                    </select>
                  </label>
                )}
              </div>
              {pockets.map(p => {
                const on = picked.has(`p-${p.id}`);
                return (
                  <button key={p.id} type="button" onClick={() => toggle([`p-${p.id}`], !on)} className={`w-full flex items-center gap-3 px-5 py-2 text-left cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.04] ${on ? '' : 'opacity-50'}`}>
                    <Box on={on} />
                    <Bookmark className="w-3.5 h-3.5 shrink-0 text-black/50 dark:text-white/50" />
                    <span className="text-sm truncate">{p.title}</span>
                    {(p.city || p.address) && <span className="ml-auto pl-2 max-w-[40%] text-meta text-black/50 dark:text-white/50 truncate">{p.city || p.address}</span>}
                  </button>
                );
              })}
            </section>
          )}
        </div>

        <div className="px-5 py-3 border-t border-black/15 dark:border-white/15 flex justify-end">
          <button type="button" onClick={create} disabled={busy || !count || !title.trim() || !startDate} className="btn btn-primary btn-lg tgl-press">
            {busy ? '만드는 중…' : `계획 만들기 (${count})`}
          </button>
        </div>
    </Sheet>
  );
}

// Closes through the sheet so the exit motion plays
function SheetCloseButton({ disabled }: { disabled?: boolean }) {
  const close = useSheetClose();
  return (
    <button type="button" onClick={close} disabled={disabled} className="tgl-press tap-target w-9 h-9 grid place-items-center border border-black/20 dark:border-white/20 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black cursor-pointer" aria-label="닫기">
      <X className="w-4 h-4" />
    </button>
  );
}
