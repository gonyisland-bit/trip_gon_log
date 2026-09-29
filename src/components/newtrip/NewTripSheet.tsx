import { useEffect, useState } from 'react';
import { ChevronLeft, Plane, Ticket, X } from 'lucide-react';
import { Sheet, useSheetClose } from '../Sheet';
import { IconButton } from '../ui/IconButton';
import { confirmDialog } from '../../utils/feedback';
import { NewTripCreatePayload, NewTripDraft, NewTripPrefill, NewTripStep, useNewTripDraft } from './useNewTripDraft';
import { StepPreview, StepWhen, StepWhere, StepWho } from './NewTripSteps';
import { SavedNewTripDraft, clearNewTripDraft, loadNewTripDraft } from './newTripDraftStore';
import { DestinationCity, findCityByNameOrAlias, findCountryByNameOrAlias } from '../../data/worldDestinations';
import { prefersReducedMotion } from '../../motion';

// New trip (spec 3.2): the one way to start a trip, from anywhere (menus, map, calendar, pocket).
// Four steps in one sheet — where, when, who & style, preview — then the ticket is issued and the
// airport terminal opens on it; boarding there creates the journey.
// Phones: a full-height bottom sheet. Desktop: a centred dialog.

/** What the ticket shows on the terminal board */
export interface NewTripTicketInfo {
  cities: DestinationCity[];
  startDate: string;
  endDate: string;
  nights: number;
  members: string[];
}

interface NewTripSheetProps {
  prefill: NewTripPrefill;
  defaultMember: string;
  /** Cities of past trips, for quick picks */
  recentCities: string[];
  onClose: () => void;
  /** Saves the ticket and opens the terminal on it */
  onIssue: (payload: NewTripCreatePayload, info: NewTripTicketInfo) => Promise<void> | void;
}

const STEP_LABELS = ['어디로', '언제', '누구와', '미리보기'];

export function NewTripSheet(props: NewTripSheetProps) {
  const d = useNewTripDraft(props.prefill, props.defaultMember);
  const [busy, setBusy] = useState(false);
  return (
    <Sheet
      onClose={props.onClose}
      label="새 여행"
      tone="paper"
      locked={busy}
      confirmClose={() => (d.dirty ? confirmDialog('작성 중인 내용은 저장해 두었다가 다음에 이어서 만들 수 있습니다. 닫을까요?', { title: 'CLOSE', confirmLabel: '닫기' }) : true)}
      panelClassName="sm:max-w-xl h-[94dvh] sm:h-[min(780px,90dvh)]"
    >
      <SheetBody d={d} busy={busy} setBusy={setBusy} {...props} />
    </Sheet>
  );
}

function SheetBody({ d, busy, setBusy, recentCities, onIssue, onClose }: NewTripSheetProps & {
  d: NewTripDraft; busy: boolean; setBusy: (b: boolean) => void;
}) {
  const close = useSheetClose();
  const last = d.step === 3;
  const [passing, setPassing] = useState<{ title: string; city: string; dates: string } | null>(null);

  // A draft left on this or another device: offered on the first step when the sheet opens empty
  const [saved, setSaved] = useState<SavedNewTripDraft | null>(null);
  const [prefillEmpty] = useState(() => !d.city && !d.country && !d.startDate);
  useEffect(() => {
    if (!prefillEmpty) return;
    let alive = true;
    loadNewTripDraft(c => alive && setSaved(c)).then(x => { if (alive) setSaved(x); });
    return () => { alive = false; };
  }, [prefillEmpty]);
  const savedLabel = saved ? (findCityByNameOrAlias(saved.city || '')?.nameKo || findCountryByNameOrAlias(saved.country || '')?.nameKo || '') : '';

  const go = (s: NewTripStep) => {
    d.setStep(s);
    document.querySelector('[data-newtrip-scroll]')?.scrollTo({ top: 0 });
  };

  const issue = async () => {
    const payload = d.buildPayload();
    const p = d.selected;
    if (!payload || !p) return;
    const ok = await confirmDialog(`'${payload.title}' 티켓을 발권할까요? 공항 터미널에서 탑승하면 여정이 만들어집니다.`, { title: 'ISSUE TICKET', confirmLabel: '발권' });
    if (!ok) return;
    setBusy(true);
    const cities = d.allCities.length ? d.allCities : [p.cityObj];
    // Boarding pass while the ticket is saved; at least a beat so it reads, skipped for reduced motion
    const reduced = prefersReducedMotion();
    if (!reduced) setPassing({ title: payload.title, city: cities.map(c => c.nameKo).join(' · '), dates: payload.dateRange });
    try {
      await Promise.all([
        onIssue(payload, { cities, startDate: p.startDate, endDate: p.endDate, nights: p.durationDays, members: payload.members }),
        new Promise(r => setTimeout(r, reduced ? 0 : 1200)),
      ]);
      clearNewTripDraft();
      onClose();
    } catch {
      // Not saved (the caller has said why): the sheet stays open to try again
    } finally {
      setBusy(false);
      setPassing(null);
    }
  };

  return (
    <div className="relative flex flex-col flex-1 min-h-0">
      {/* Top: back · step · close, then the four step bars */}
      <div className="shrink-0 px-4 sm:px-6 pt-1 sm:pt-5 pb-3 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <IconButton icon={ChevronLeft} label="이전 단계" onClick={() => go((d.step - 1) as NewTripStep)} disabled={d.step === 0 || busy} className={d.step === 0 ? 'invisible' : ''} />
          <span className="font-mono text-micro font-bold uppercase tracking-wider text-black/60 dark:text-white/60">
            New trip · {d.step + 1}/4
          </span>
          <IconButton icon={X} label="닫기" onClick={close} disabled={busy} />
        </div>
        <div className="grid grid-cols-4 gap-1" role="progressbar" aria-valuemin={1} aria-valuemax={4} aria-valuenow={d.step + 1} aria-label={`${STEP_LABELS[d.step]} 단계`}>
          {STEP_LABELS.map((l, i) => (
            <button
              key={l}
              type="button"
              onClick={() => i < d.step && go(i as NewTripStep)}
              disabled={i >= d.step}
              aria-label={`${l} 단계로`}
              className={`h-1 rounded-full transition-colors duration-base ${i === d.step ? 'bg-red-600 dark:bg-red-500' : i < d.step ? 'bg-ink dark:bg-ink-dark cursor-pointer' : 'bg-black/10 dark:bg-white/15'}`}
            />
          ))}
        </div>
      </div>

      <div data-newtrip-scroll className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 pb-6">
        {d.step === 0 && (
          <StepWhere
            d={d}
            recentCities={recentCities}
            saved={saved && savedLabel && !d.city && !d.country ? { label: savedLabel, step: saved.step } : null}
            onResume={() => { if (saved) d.resume(saved); setSaved(null); }}
            onDiscard={() => { clearNewTripDraft(); setSaved(null); }}
          />
        )}
        {d.step === 1 && <StepWhen d={d} />}
        {d.step === 2 && <StepWho d={d} />}
        {d.step === 3 && <StepPreview d={d} />}
      </div>

      {passing && <BoardingPass {...passing} />}

      {/* Bottom: always in reach */}
      <div className="shrink-0 px-4 sm:px-6 py-3 border-t border-black/[0.06] dark:border-white/10 flex gap-2">
        {last ? (
          <button type="button" className="btn btn-accent btn-lg w-full" onClick={issue} disabled={!d.canNext || busy}>
            <Ticket className="w-4 h-4 shrink-0" aria-hidden />
            티켓 발권
          </button>
        ) : (
          <>
            {d.step > 0 && (
              <button type="button" className="btn btn-secondary btn-lg" onClick={() => go((d.step + 1) as NewTripStep)} disabled={busy}>
                건너뛰기
              </button>
            )}
            <button type="button" className="btn btn-primary btn-lg flex-1" onClick={() => go((d.step + 1) as NewTripStep)} disabled={!d.canNext || busy}>
              다음 · {STEP_LABELS[d.step + 1]}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Shown while the new trip is saved, then the app moves to its page
function BoardingPass({ title, city, dates }: { title: string; city: string; dates: string }) {
  return (
    <div className="absolute inset-0 z-10 grid place-items-center bg-paper/95 dark:bg-paper-dark/95 px-6" role="status" aria-live="polite">
      <div className="tgl-pass w-full max-w-sm rounded-card bg-surface dark:bg-surface-dark shadow-[0_18px_48px_rgba(0,0,0,0.18)] overflow-hidden">
        <div className="p-5 flex flex-col gap-3">
          <div className="flex justify-between font-mono text-micro font-bold uppercase tracking-wider text-black/60 dark:text-white/60">
            <span>Boarding pass</span><span>Tripgon</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[26px] font-extrabold tracking-tight">서울</span>
            <span className="flex-1 border-t-[1.5px] border-dashed border-black/25 dark:border-white/25" aria-hidden />
            <Plane className="tgl-pass-plane w-5 h-5 rotate-45 text-red-600 dark:text-red-500 shrink-0" aria-hidden />
            <span className="flex-1 border-t-[1.5px] border-dashed border-black/25 dark:border-white/25" aria-hidden />
            <span className="text-[26px] font-extrabold tracking-tight truncate max-w-[45%]">{city}</span>
          </div>
        </div>
        <div className="mx-4 border-t-[1.5px] border-dashed border-black/15 dark:border-white/15" aria-hidden />
        <div className="p-5 flex flex-col gap-1">
          <span className="text-[15px] font-bold leading-snug">{title}</span>
          <span className="font-mono text-micro uppercase tracking-wider text-black/60 dark:text-white/60">{dates}</span>
        </div>
      </div>
      <span className="sr-only">티켓을 발권하는 중</span>
    </div>
  );
}
