import React, { useRef, useState } from 'react';
import { Check, ImagePlus, Link2, Loader2, PencilLine, Pin, PinOff, Trash2 } from 'lucide-react';
import { doc } from 'firebase/firestore';
import { db } from '../../firebase';
import type { Trip } from '../../types';
import { Sheet, useSheetClose } from '../Sheet';
import { compressImage } from '../../utils/imageHelper';
import { getEffectiveImageUrl, uploadFileToR2 } from '../../utils/storageHelper';
import { cardCoverUrl } from '../../utils/journeyThumbs';
import { currentUid, setDoc, setLinkShare } from '../../utils/ownership';
import { notify } from '../../utils/feedback';

// One journey's actions from its card (v1.3.6 4-a): cover, edit, share, pin to home, delete.
// Opened from the ⋯ button or a long press on any journey card, so members never need a
// separate management screen for their own journeys.

export const OPEN_JOURNEY_ACTIONS = 'tgl:journey-actions';
export function openJourneyActions(tripId: number) {
  window.dispatchEvent(new CustomEvent(OPEN_JOURNEY_ACTIONS, { detail: tripId }));
}

interface Props {
  trip: Trip;
  isPlan: boolean;
  photos: string[];
  pinned: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
}

export function JourneyActionsSheet(props: Props) {
  return (
    <Sheet label={`${props.trip.title} 메뉴`} onClose={props.onClose} tone="paper" panelClassName="sm:max-w-md max-h-[86dvh]">
      <Actions {...props} />
    </Sheet>
  );
}

const row = 'w-full min-h-12 px-4 flex items-center gap-3 rounded-card bg-surface dark:bg-surface-dark text-left text-[15px] font-bold transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.06] disabled:opacity-40';

function Actions({ trip, isPlan, photos, pinned, onEdit, onDelete, onTogglePin }: Props) {
  const close = useSheetClose();
  const isOwner = !trip.ownerId || trip.ownerId === currentUid();
  const canEdit = isOwner || Boolean(trip.editors?.includes(currentUid() || ''));
  const [coverOpen, setCoverOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const ref = doc(db, 'users', 'public', isPlan ? 'plans' : 'trips', String(trip.id));

  const setCover = async (patch: Partial<Trip>, key: string) => {
    setBusy(key);
    try {
      await setDoc(ref, patch, { merge: true });
      notify('커버를 바꿨습니다.', 'success');
      close();
    } catch (err) {
      console.error('Cover change failed:', err);
      notify('커버를 바꾸지 못했습니다. 잠시 후 다시 시도해 주세요.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const upload = async (file: File) => {
    setBusy('upload');
    try {
      const isVideo = file.type.startsWith('video/');
      const ext = (file.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg')).toLowerCase();
      const body = isVideo ? file : await compressImage(file, 2560, 2560, 0.82);
      const url = await uploadFileToR2(body, `covers/${trip.id}_${Date.now()}.${isVideo ? ext : 'jpg'}`);
      await setCover(isVideo ? { videoUrl: url } : { img: url, videoUrl: '' }, 'upload');
    } catch (err) {
      console.error('Cover upload failed:', err);
      notify('올리지 못했습니다. 잠시 후 다시 시도해 주세요.', 'error');
      setBusy(null);
    }
  };

  const copyLink = () => {
    const url = `${window.location.origin}?id=${trip.id}&share=true`;
    navigator.clipboard.writeText(url)
      .then(async () => {
        if (isOwner && trip.ownerId && !trip.publicShare) await setLinkShare(trip.id, true);
        notify('공유 링크를 복사했습니다. 링크가 있는 사람은 이 여정을 볼 수 있습니다.', 'success');
        close();
      })
      .catch(() => notify('링크를 복사하지 못했습니다.', 'error'));
  };

  const cover = getEffectiveImageUrl(trip.img);
  return (
    <div className="flex flex-col gap-3 p-4 pt-2 min-h-0 overflow-y-auto overscroll-contain">
      <div className="flex items-center gap-3">
        <img src={cardCoverUrl(trip)} alt="" className="w-14 h-14 rounded-thumb object-cover bg-black/5 dark:bg-white/10 shrink-0" />
        <div className="min-w-0 flex flex-col">
          <span className="text-[17px] font-extrabold tracking-tight truncate">{trip.title}</span>
          <span className="font-mono text-meta text-black/55 dark:text-white/55 truncate">{trip.date}</span>
        </div>
      </div>

      {!canEdit && (
        <p className="text-meta text-black/55 dark:text-white/55">함께 보는 여정이라 보기만 할 수 있습니다.</p>
      )}

      <div className="flex flex-col gap-1.5">
        {canEdit && (
          <button type="button" className={row} onClick={() => setCoverOpen(v => !v)} aria-expanded={coverOpen}>
            <ImagePlus className="w-[18px] h-[18px] shrink-0" aria-hidden />커버 바꾸기
          </button>
        )}
        {coverOpen && (
          <div className="rounded-card bg-surface dark:bg-surface-dark p-3 flex flex-col gap-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/mp4,video/quicktime,video/webm"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) upload(f); }}
            />
            <button type="button" className="btn btn-secondary w-full" onClick={() => fileRef.current?.click()} disabled={!!busy}>
              {busy === 'upload' ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <ImagePlus className="w-4 h-4" aria-hidden />}
              사진 · 영상 올리기
            </button>
            {photos.length > 0 ? (
              <>
                <span className="font-mono text-micro font-bold uppercase tracking-wider text-black/55 dark:text-white/55">이 여정의 사진</span>
                <ul className="grid grid-cols-4 gap-1.5 max-h-56 overflow-y-auto overscroll-contain">
                  {photos.map(url => {
                    const on = getEffectiveImageUrl(url) === cover;
                    return (
                      <li key={url}>
                        <button
                          type="button"
                          onClick={() => setCover({ img: url, videoUrl: '' }, url)}
                          disabled={!!busy || on}
                          aria-pressed={on}
                          className={`relative w-full aspect-square rounded-thumb overflow-hidden ${on ? 'ring-2 ring-red-600 ring-offset-2 ring-offset-surface dark:ring-offset-surface-dark' : ''}`}
                        >
                          <img src={getEffectiveImageUrl(url)} alt="" loading="lazy" className="w-full h-full object-cover" />
                          {busy === url && <span className="absolute inset-0 grid place-items-center bg-black/40"><Loader2 className="w-4 h-4 text-white animate-spin" /></span>}
                          {on && <span className="absolute right-1 top-1 w-5 h-5 rounded-full bg-red-600 text-white grid place-items-center"><Check className="w-3 h-3" /></span>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <p className="text-meta text-black/55 dark:text-white/55">여정에 사진을 넣으면 여기서 골라 커버로 쓸 수 있습니다.</p>
            )}
          </div>
        )}
        {canEdit && (
          <button type="button" className={row} onClick={() => { close(); onEdit(); }}>
            <PencilLine className="w-[18px] h-[18px] shrink-0" aria-hidden />편집
          </button>
        )}
        {isOwner && (
          <button type="button" className={row} onClick={copyLink}>
            <Link2 className="w-[18px] h-[18px] shrink-0" aria-hidden />공유 링크 복사
          </button>
        )}
        <button type="button" className={row} onClick={() => { onTogglePin(); close(); }}>
          {pinned ? <PinOff className="w-[18px] h-[18px] shrink-0" aria-hidden /> : <Pin className="w-[18px] h-[18px] shrink-0" aria-hidden />}
          {pinned ? '홈 고정 해제' : '홈에 고정'}
        </button>
        {isOwner && (
          <button type="button" className={`${row} text-red-600 dark:text-red-400`} onClick={() => { close(); onDelete(); }}>
            <Trash2 className="w-[18px] h-[18px] shrink-0" aria-hidden />삭제
          </button>
        )}
      </div>
    </div>
  );
}
