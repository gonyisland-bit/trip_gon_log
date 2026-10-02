import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, Check, Clapperboard, ClipboardPaste, ImagePlus, LayoutGrid, Loader2, Share2, PencilLine, Pin, PinOff, Trash2 } from 'lucide-react';
import { openJourneyBoard } from '../board/boardData';
import { getJourneyOpenMode, setJourneyOpenMode, type JourneyOpenMode } from '../../utils/journeyOpen';
import { doc } from 'firebase/firestore';
import { db } from '../../firebase';
import type { Trip } from '../../types';
import { Sheet, useSheetClose } from '../Sheet';
import { Segment } from '../ui/Segment';
import { Art } from '../../art/Art';
import { compressImage } from '../../utils/imageHelper';
import { inspectAndPrepareVideo } from '../../utils/videoHelper';
import { getEffectiveImageUrl, uploadFileToR2 } from '../../utils/storageHelper';
import { cardCoverUrl, galleryThumbMap } from '../../utils/journeyThumbs';
import { currentUid, setDoc } from '../../utils/ownership';
import { openJourneyShare } from '../share/ShareJourneySheet';
import { notify } from '../../utils/feedback';

// One journey's actions from its card (v1.3.6 4-a): cover, edit, share (5-b sheet), pin to home, delete.
// Opened from the ⋯ button or a long press on any journey card, so members never need a
// separate management screen for their own journeys. Four short rows: how to open (board or
// magazine), the two covers, edit and share, and a small delete behind its own confirmation.
// The covers are set only here (the edit sheet no longer has them): pick from the journey's own photos, upload,
// paste (button or Ctrl+V) or drop a picture. A change is saved at once and the sheet stays open, so the card cover
// and the hero can be set one after the other.

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

// Two-up buttons: a pill that inks when its panel is open
const pick = (on: boolean) => `h-12 px-3 inline-flex items-center justify-center gap-2 rounded-full text-[14px] font-bold transition-colors ${
  on ? 'bg-ink dark:bg-ink-dark text-surface dark:text-paper-dark' : 'bg-surface dark:bg-surface-dark hover:bg-black/[0.03] dark:hover:bg-white/[0.06]'
}`;

const isVideoUrl = (v: string) => /\.(mp4|webm|mov)(\?.*)?$/i.test(v);
const isWebUrl = (v: string) => /^https?:\/\/\S+$/i.test(v);
const MAX_VIDEO_MB = 30;

function Actions({ trip, isPlan, photos, pinned, onEdit, onDelete, onTogglePin }: Props) {
  const close = useSheetClose();
  const [openMode, setOpenMode] = useState<JourneyOpenMode>(() => getJourneyOpenMode(trip));
  const isOwner = !trip.ownerId || trip.ownerId === currentUid();
  const canEdit = isOwner || Boolean(trip.editors?.includes(currentUid() || ''));
  // Which cover panel is open: the card's, or the home hero's own photo or video
  const [coverOpen, setCoverOpen] = useState<null | 'card' | 'hero'>(null);
  // Which cover: the card's (img / videoUrl) or the home hero's own (heroImg / heroVideoUrl).
  // A journey without hero media shows its card cover in the hero.
  const target = coverOpen || 'card';
  const [busy, setBusy] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const ref = doc(db, 'users', 'public', isPlan ? 'plans' : 'trips', String(trip.id));

  const setCover = async (patch: Partial<Trip>, key: string) => {
    setBusy(key);
    try {
      await setDoc(ref, patch, { merge: true });
      notify('커버를 바꿨습니다.', 'success');
    } catch (err) {
      console.error('Cover change failed:', err);
      notify('커버를 바꾸지 못했습니다. 잠시 후 다시 시도해 주세요.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const patchFor = (url: string, isVideo: boolean): Partial<Trip> => target === 'hero'
    ? (isVideo ? { heroVideoUrl: url } : { heroImg: url, heroVideoUrl: '' })
    : (isVideo ? { videoUrl: url } : { img: url, videoUrl: '' });

  // One way in for every source (file picker, drop, paste): checked, uploaded, then saved as the open cover
  const upload = async (file: File) => {
    const isVideo = file.type.startsWith('video/');
    if (!isVideo && !file.type.startsWith('image/')) { notify('사진이나 동영상 파일만 올릴 수 있습니다.'); return; }
    if (isVideo && file.size > MAX_VIDEO_MB * 1024 * 1024) { notify(`모바일에서 끊기지 않도록 ${MAX_VIDEO_MB}MB 이하의 동영상만 올릴 수 있습니다.`); return; }
    setBusy('upload');
    try {
      if (isVideo) {
        const inspection = await inspectAndPrepareVideo(file);
        if (!inspection.isCompatible) notify('이 동영상은 아이폰에서 재생되지 않는 형식일 수 있습니다. H.264 MP4를 권장합니다.');
      }
      const ext = (file.name.split('.').pop() || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp4';
      const body = isVideo ? file : await compressImage(file, 2560, 2560, 0.82);
      const url = await uploadFileToR2(body, `covers/${trip.id}_${target}_${Date.now()}.${isVideo ? ext : 'jpg'}`);
      await setCover(patchFor(url, isVideo), 'upload');
    } catch (err) {
      console.error('Cover upload failed:', err);
      notify('올리지 못했습니다. 잠시 후 다시 시도해 주세요.', 'error');
      setBusy(null);
    }
  };

  const applyUrl = (text: string) => setCover(patchFor(text, isVideoUrl(text)), 'paste');

  // The paste button: a picture on the clipboard is uploaded, a web address is used as it is
  const pasteFromClipboard = async () => {
    try {
      if (navigator.clipboard?.read) {
        for (const item of await navigator.clipboard.read()) {
          const type = item.types.find(t => t.startsWith('image/'));
          if (type) {
            const blob = await item.getType(type);
            await upload(new File([blob], `pasted_${Date.now()}.${type.split('/')[1] || 'png'}`, { type }));
            return;
          }
        }
      }
      const text = (await navigator.clipboard?.readText?.())?.trim();
      if (text && isWebUrl(text)) { await applyUrl(text); return; }
      notify('클립보드에 사진이나 사진 주소가 없습니다.');
    } catch {
      notify('붙여넣기를 쓸 수 없습니다. 키보드의 Ctrl+V를 눌러 주세요.');
    }
  };

  // Ctrl+V while a cover panel is open does the same without the button
  useEffect(() => {
    if (!coverOpen || !canEdit) return;
    const onPaste = (e: ClipboardEvent) => {
      const file = Array.from(e.clipboardData?.files || []).find(f => f.type.startsWith('image/'));
      if (file) { e.preventDefault(); void upload(file); return; }
      const text = e.clipboardData?.getData('text')?.trim();
      if (text && isWebUrl(text)) { e.preventDefault(); void applyUrl(text); }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coverOpen, canEdit, trip.id]);

  const hasHeroMedia = Boolean(trip.heroImg || trip.heroVideoUrl);
  const video = target === 'hero' ? trip.heroVideoUrl : trip.videoUrl;
  const shown = target === 'hero' ? (trip.heroImg || trip.img) : trip.img;
  const cover = getEffectiveImageUrl(target === 'hero' ? trip.heroImg : trip.img);
  // A journey can hold hundreds of photos: the picker draws small copies, a page at a time
  const thumbs = React.useMemo(() => galleryThumbMap(trip), [trip]);
  const [shownCount, setShownCount] = useState(24);
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

      <div className="flex flex-col gap-2">
        {/* How the card opens: the choice is kept for this journey, and tapping the card shows it */}
        {isPlan ? (
          <button type="button" className={row} onClick={() => { close(); openJourneyBoard(trip.id); }}>
            <LayoutGrid className="w-[18px] h-[18px] shrink-0" aria-hidden />보드로 보기
          </button>
        ) : (
          <Segment<JourneyOpenMode>
            block
            ariaLabel="열기 방식"
            value={openMode}
            onChange={(v) => { setOpenMode(v); setJourneyOpenMode(trip.id, v); }}
            options={[
              { value: 'board', label: '보드', icon: LayoutGrid },
              { value: 'magazine', label: '매거진', icon: BookOpen },
            ]}
          />
        )}
        {canEdit && (
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className={pick(coverOpen === 'card')} onClick={() => setCoverOpen(v => v === 'card' ? null : 'card')} aria-expanded={coverOpen === 'card'}>
              <ImagePlus className="w-4 h-4 shrink-0" aria-hidden />카드 커버
            </button>
            <button type="button" className={pick(coverOpen === 'hero')} onClick={() => setCoverOpen(v => v === 'hero' ? null : 'hero')} aria-expanded={coverOpen === 'hero'}>
              <Clapperboard className="w-4 h-4 shrink-0" aria-hidden />히어로 커버
            </button>
          </div>
        )}
        {coverOpen && (
          <div
            className={`rounded-card bg-surface dark:bg-surface-dark p-3 flex flex-col gap-3 transition-shadow ${dragOver ? 'ring-2 ring-red-600' : ''}`}
            onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false); }}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) void upload(f); }}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/mp4,video/quicktime,video/webm"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void upload(f); }}
            />
            {/* What this cover shows now */}
            <div className="relative w-full aspect-[16/9] rounded-thumb overflow-hidden bg-black/5 dark:bg-white/10">
              {video
                ? <video src={getEffectiveImageUrl(video)} muted loop playsInline autoPlay className="w-full h-full object-cover" />
                : <img src={getEffectiveImageUrl(shown)} alt="" className="w-full h-full object-cover" />}
              <span className="absolute left-2 top-2 px-2 py-0.5 rounded-full bg-black/45 text-white font-mono text-micro font-bold tracking-wider">
                {video ? 'VIDEO' : target === 'hero' ? (hasHeroMedia ? 'HERO' : 'CARD COVER') : 'CARD'}
              </span>
              {busy === 'upload' && (
                <span role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-paper/90 dark:bg-paper-dark/90">
                  <Art id="uploading-photo" className="h-20 w-auto" />
                  <span className="text-meta font-bold text-black/60 dark:text-white/60">올리는 중</span>
                </span>
              )}
            </div>
            {target === 'hero' && (
              <p className="text-meta text-black/55 dark:text-white/55 break-keep">
                {hasHeroMedia ? '홈 히어로에는 이 여정만의 사진 · 영상이 쓰입니다.' : '따로 정하지 않으면 홈 히어로에도 카드 커버가 쓰입니다.'}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => fileRef.current?.click()} disabled={!!busy}>
                <ImagePlus className="w-4 h-4 shrink-0" aria-hidden />올리기
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => { void pasteFromClipboard(); }} disabled={!!busy}>
                {busy === 'paste' ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <ClipboardPaste className="w-4 h-4 shrink-0" aria-hidden />}붙여넣기
              </button>
            </div>
            {target === 'hero' && (
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className={pinned ? 'btn btn-ghost btn-sm' : 'btn btn-primary btn-sm'} onClick={onTogglePin}>
                  {pinned ? <PinOff className="w-3.5 h-3.5" aria-hidden /> : <Pin className="w-3.5 h-3.5" aria-hidden />}
                  {pinned ? '홈 히어로에서 빼기' : '홈 히어로에 띄우기'}
                </button>
                {hasHeroMedia && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCover({ heroImg: '', heroVideoUrl: '' }, 'reset')} disabled={!!busy}>
                    카드 커버로 되돌리기
                  </button>
                )}
              </div>
            )}
            {photos.length > 0 ? (
              <>
                <span className="font-mono text-micro font-bold uppercase tracking-wider text-black/55 dark:text-white/55">이 여정의 사진</span>
                <ul className="grid grid-cols-4 gap-1.5 max-h-56 overflow-y-auto overscroll-contain">
                  {photos.slice(0, shownCount).map(url => {
                    const on = getEffectiveImageUrl(url) === cover && !video;
                    return (
                      <li key={url}>
                        <button
                          type="button"
                          onClick={() => setCover(patchFor(url, false), url)}
                          disabled={!!busy || on}
                          aria-pressed={on}
                          className={`relative w-full aspect-square rounded-thumb overflow-hidden ${on ? 'ring-2 ring-red-600 ring-offset-2 ring-offset-surface dark:ring-offset-surface-dark' : ''}`}
                        >
                          <img src={thumbs.get(getEffectiveImageUrl(url)) || getEffectiveImageUrl(url)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                          {busy === url && <span className="absolute inset-0 grid place-items-center bg-black/40"><Loader2 className="w-4 h-4 text-white animate-spin" /></span>}
                          {on && <span className="absolute right-1 top-1 w-5 h-5 rounded-full bg-red-600 text-white grid place-items-center"><Check className="w-3 h-3" /></span>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {photos.length > shownCount && (
                  <button type="button" className="btn btn-ghost btn-sm self-center" onClick={() => setShownCount(n => n + 24)}>
                    더 보기 · {photos.length - shownCount}
                  </button>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-1.5 py-1 text-center">
                <Art id="photo-add" className="h-20 w-auto" />
                <p className="text-meta text-black/55 dark:text-white/55 break-keep">여정에 사진이 없어요. 올리거나 붙여넣어 커버로 쓰세요.</p>
              </div>
            )}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          {canEdit && (
            <button type="button" className={pick(false)} onClick={() => { close(); onEdit(); }}>
              <PencilLine className="w-4 h-4 shrink-0" aria-hidden />편집
            </button>
          )}
          <button type="button" className={`${pick(false)} ${canEdit ? '' : 'col-span-2'}`} onClick={() => { close(); openJourneyShare(trip.id); }}>
            <Share2 className="w-4 h-4 shrink-0" aria-hidden />공유
          </button>
        </div>
        {isOwner && (
          <button
            type="button"
            className="self-center mt-1 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-meta font-bold text-red-600 dark:text-red-400 hover:bg-red-600/10 transition-colors"
            onClick={() => { close(); onDelete(); }}
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden />삭제
          </button>
        )}
      </div>
    </div>
  );
}
