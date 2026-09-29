import { useState } from 'react';
import { ChevronLeft, X } from 'lucide-react';
import { Sheet, useSheetClose } from '../Sheet';
import { IconButton } from '../ui/IconButton';
import { NewTripButton } from '../NewTripButton';
import { confirmDialog } from '../../utils/feedback';
import { NewTripCreatePayload, NewTripDraft, NewTripPrefill, NewTripStep, useNewTripDraft } from './useNewTripDraft';
import { StepPreview, StepWhen, StepWhere, StepWho } from './NewTripSteps';

// New trip (v1.3.5 P3, spec 3.2): the one way to start a trip, from anywhere.
// Four steps in one sheet — where, when, who & style, preview — then Create trip.
// Phones: a full-height bottom sheet. Desktop: a centred dialog.

interface NewTripSheetProps {
  prefill: NewTripPrefill;
  defaultMember: string;
  /** Cities of past trips, for quick picks */
  recentCities: string[];
  onClose: () => void;
  onCreate: (payload: NewTripCreatePayload) => Promise<void> | void;
  /** Surprise: pick a destination in the airport terminal (its result reopens this sheet) */
  onSurprise: () => void;
  /** The map's Trip Guide, for multi-city and template trips */
  onOpenMapBuilder: (country: string, city: string, date: string) => void;
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
      confirmClose={() => (d.dirty ? confirmDialog('작성 중인 새 여행을 닫을까요?', { title: 'CLOSE', confirmLabel: '닫기' }) : true)}
      panelClassName="sm:max-w-xl h-[94dvh] sm:h-[min(780px,90dvh)]"
    >
      <SheetBody d={d} busy={busy} setBusy={setBusy} {...props} />
    </Sheet>
  );
}

function SheetBody({ d, busy, setBusy, recentCities, onCreate, onSurprise, onOpenMapBuilder, onClose }: NewTripSheetProps & {
  d: NewTripDraft; busy: boolean; setBusy: (b: boolean) => void;
}) {
  const close = useSheetClose();
  const last = d.step === 3;

  const go = (s: NewTripStep) => {
    d.setStep(s);
    document.querySelector('[data-newtrip-scroll]')?.scrollTo({ top: 0 });
  };

  const create = async () => {
    const payload = d.buildPayload();
    if (!payload) return;
    const ok = await confirmDialog(`'${payload.title}' 여정을 만들까요?`, { title: 'CREATE TRIP', confirmLabel: 'Create trip' });
    if (!ok) return;
    setBusy(true);
    try {
      await onCreate(payload);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  // Leaving for another screen: skip the close confirmation, nothing is lost that the target does not carry
  const surprise = () => { onClose(); onSurprise(); };
  const mapBuilder = () => {
    onClose();
    onOpenMapBuilder(d.country?.nameEn || d.city?.countryEn || '', d.city?.nameKo || '', d.startDate);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
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
        {d.step === 0 && <StepWhere d={d} recentCities={recentCities} onSurprise={surprise} />}
        {d.step === 1 && <StepWhen d={d} />}
        {d.step === 2 && <StepWho d={d} />}
        {d.step === 3 && <StepPreview d={d} onOpenMapBuilder={mapBuilder} />}
      </div>

      {/* Bottom: always in reach */}
      <div className="shrink-0 px-4 sm:px-6 py-3 border-t border-black/[0.06] dark:border-white/10 flex gap-2">
        {last ? (
          <NewTripButton kind="create" size="lg" block onClick={create} disabled={!d.canNext || busy} />
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
