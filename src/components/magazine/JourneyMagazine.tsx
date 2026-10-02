import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { lazyWithRetry } from '../../app/appUtils';
import { createPortal } from 'react-dom';
import { ArrowUpRight, BookCheck, Clock, ImagePlus, Loader2, Play, Trash2, X } from 'lucide-react';
import type { Trip } from '../../types';
import { getEffectiveImageUrl } from '../../utils/storageHelper';
import { cardCoverUrl } from '../../utils/journeyThumbs';
import { ProgressiveImage } from '../ProgressiveImage';
import { EmptyScene } from '../scenes/EmptyScene';
import { useBackToClose } from '../../utils/overlayHistory';
import { lockBodyScroll } from '../../utils/scrollLock';
import { confirmDialog } from '../../utils/feedback';
import { prefersReducedMotion } from '../../motion';
import { IconButton } from '../ui/IconButton';

// Retries, then reloads once, when a deploy has replaced the chunk this page was built with
const MemoryReel = lazyWithRetry(() => import('../reel/MemoryReel').then(m => ({ default: m.MemoryReel })));

// A journey's magazine (v1.3.6 4-b): the journey itself, read as an issue. It covers the map and
// the record, starts on the cover (no title animation) and is built from the journey's own photos,
// times, places and notes, so there is nothing to lay out or keep in sync by hand.

export interface MagazinePhoto {
  url: string;
  date?: string;
  time?: string;
  /** The timeline entry's title, set large */
  title?: string;
  /** Where it was: the entry's place name, or the nearest earlier one (same rule as the old magazine) */
  place?: string;
  /** The timeline entry the photo belongs to, so the record can open at it */
  itemId?: number;
  /** Added straight to the journey (not on a timeline entry), so it can be removed here */
  removable?: boolean;
}

interface Props {
  trip: Trip;
  photos: MagazinePhoto[];
  /** Days of the journey in order (YYYY.MM.DD) */
  days: string[];
  canPublish: boolean;
  published: boolean;
  onPublish: () => void;
  onUnpublish: () => void;
  onClose: () => void;
  onShowRecord: () => void;
  /** Photos are added here, now that the record has no photo tab */
  canAddPhotos?: boolean;
  uploading?: boolean;
  fileInputRef?: React.RefObject<HTMLInputElement | null>;
  onAddPhotos?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto?: (url: string, e: React.MouseEvent) => void;
  /** Opens the record at the entry a photo belongs to */
  onJumpToItem?: (itemId: number, date?: string) => void;
  /** The page under it changes as soon as it is closed (it was opened on its own): close first, then slide away over the new page */
  closeFirst?: boolean;
}

const WEEK = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function dayLabel(d: string): string {
  const [y, m, day] = d.split(/[.-]/).map(Number);
  if (!y || !m || !day) return d;
  const w = new Date(y, m - 1, day).getDay();
  return `${String(day).padStart(2, '0')} ${MON[m - 1]} · ${WEEK[w]}`;
}

export function JourneyMagazine({ trip, photos, days, canPublish, published, onPublish, onUnpublish, onClose, onShowRecord, canAddPhotos, uploading, fileInputRef, onAddPhotos, onRemovePhoto, onJumpToItem, closeFirst }: Props) {
  useBackToClose(true, onClose);
  // Its own close controls slide it away; the back gesture closes at once
  const [leaving, setLeaving] = useState(false);
  const slideAway = () => {
    if (leaving) return;
    if (prefersReducedMotion()) { onClose(); return; }
    setLeaving(true);
    if (closeFirst) onClose();
    else window.setTimeout(onClose, 280);
  };
  // The one slideshow: the play button runs it from the first photo; a tapped photo opens it still, on that photo
  const [reel, setReel] = useState<{ at: number; paused: boolean } | null>(null);

  useEffect(() => {
    const unlock = lockBodyScroll();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !reel) slideAway(); };
    window.addEventListener('keydown', onKey);
    return () => { unlock(); window.removeEventListener('keydown', onKey); };
  }, [onClose, reel]);

  // Photos by day, in the journey's order; photos without a day close the issue
  const byDay = useMemo(() => {
    const map = new Map<string, MagazinePhoto[]>();
    days.forEach(d => map.set(d, []));
    const loose: MagazinePhoto[] = [];
    photos.forEach(p => {
      const list = p.date ? map.get(p.date) : undefined;
      if (list) list.push(p); else loose.push(p);
    });
    return { days: [...map.entries()].filter(([, list]) => list.length > 0), loose };
  }, [photos, days]);

  const places = useMemo(() => new Set(photos.map(p => p.place).filter(Boolean)).size, [photos]);
  const cover = getEffectiveImageUrl(trip.img);
  const [y, m] = (days[0] || '').split('.').map(Number);
  const kicker = [y, m ? MON[m - 1] : '', (trip.locationStr || '').split(',')[0]].filter(Boolean).join(' · ');

  const addable = Boolean(canAddPhotos && onAddPhotos);
  const pickPhotos = () => fileInputRef?.current?.click();
  const removePhoto = async (url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (await confirmDialog('이 사진을 여정에서 지울까요?', { title: 'DELETE', confirmLabel: '삭제' })) onRemovePhoto?.(url, e);
  };
  const openPhoto = (url: string) => setReel({ at: Math.max(0, photos.findIndex(p => p.url === url)), paused: true });
  const photoProps = { onOpen: openPhoto, onRemove: canAddPhotos ? removePhoto : undefined, onJump: onJumpToItem };

  const unpublish = async () => {
    if (await confirmDialog('매거진 발행을 취소할까요? 카드는 다시 기록으로 열립니다.', { title: 'UNPUBLISH', confirmLabel: '발행 취소' })) onUnpublish();
  };

  // Portaled to <body> so it covers the site header and the map, not just the record panel
  return createPortal(
    <div role="dialog" aria-label={`${trip.title} 매거진`} data-bg-cover className={`fixed inset-0 z-[185] bg-paper dark:bg-paper-dark text-ink dark:text-ink-dark overflow-y-auto overscroll-contain ${leaving ? 'tgl-reader-out pointer-events-none' : 'tgl-reader-in'}`}>
      {/* Top bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-3 sm:px-5 h-14 bg-paper/85 dark:bg-paper-dark/85 backdrop-blur-md" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <IconButton icon={X} label="매거진 닫기" size="sm" onClick={slideAway} />
        <span className="font-mono text-micro font-bold uppercase tracking-[0.16em] text-black/55 dark:text-white/55 truncate">Magazine · {photos.length} photos</span>
        <div className="flex items-center gap-1.5">
          {addable && (
            <IconButton icon={uploading ? Loader2 : ImagePlus} label="사진 추가" size="sm" onClick={pickPhotos} disabled={uploading} />
          )}
          {photos.length > 0 && <IconButton icon={Play} label="음악과 함께 넘겨 보기" size="sm" onClick={() => setReel({ at: 0, paused: false })} />}
          <button type="button" className="btn btn-secondary btn-sm" onClick={onShowRecord}>
            <Clock className="w-3.5 h-3.5" aria-hidden />기록
          </button>
          {canPublish && (published ? (
            <button type="button" className="btn btn-ghost btn-sm text-emerald-700 dark:text-emerald-400" onClick={unpublish} title="발행 취소">
              <BookCheck className="w-3.5 h-3.5" aria-hidden />발행됨
            </button>
          ) : (
            <button type="button" className="btn btn-accent btn-sm" onClick={onPublish}>발행</button>
          ))}
        </div>
      </div>

      {/* Cover */}
      <header className="relative -mt-14 min-h-[78dvh] flex flex-col justify-end overflow-hidden bg-black">
        {trip.videoUrl ? (
          <video src={getEffectiveImageUrl(trip.videoUrl)} poster={cover} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" />
        ) : cover ? (
          <ProgressiveImage low={cardCoverUrl(trip)} src={cover} className="absolute inset-0 w-full h-full object-cover" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-black/30" />
        <div className="relative w-full max-w-5xl mx-auto px-5 sm:px-8 pb-10 sm:pb-14 flex flex-col gap-3 text-white">
          {kicker && <span className="font-mono text-meta font-bold uppercase tracking-[0.2em] text-white/75">{kicker}</span>}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-[-0.03em] leading-[1.02] text-balance break-keep">{trip.title}</h1>
          {(trip.description || trip.subtitle) && (
            <p className="max-w-2xl text-[15px] sm:text-lg text-white/85 leading-relaxed break-keep">{trip.description || trip.subtitle}</p>
          )}
          <div className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-meta tabular-nums text-white/75">
            <span>{trip.date}</span>
            <span>{days.length} days</span>
            {places > 0 && <span>{places} places</span>}
            <span>{photos.length} photos</span>
          </div>
        </div>
      </header>

      {/* Days */}
      <main className="w-full max-w-5xl mx-auto px-4 sm:px-8 py-10 sm:py-16 flex flex-col gap-16 sm:gap-24">
        {byDay.days.length === 0 && byDay.loose.length === 0 && (
          <EmptyScene
            kind="photos"
            title="아직 사진이 없어요"
            copy="일정에 사진을 넣으면 날짜와 장소에 맞춰 이 매거진이 채워집니다."
            action={addable ? { label: uploading ? '올리는 중' : '사진 올리기', onClick: pickPhotos } : { label: '기록 보기', onClick: onShowRecord }}
          />
        )}
        {byDay.days.map(([day, list]) => (
          <section key={day} className="flex flex-col gap-6 sm:gap-8">
            <div className="flex items-baseline gap-4 border-b border-black/10 dark:border-white/10 pb-3">
              <span className="text-5xl sm:text-7xl font-extrabold tracking-[-0.05em] leading-none tabular-nums">{String(days.indexOf(day) + 1).padStart(2, '0')}</span>
              <div className="flex flex-col min-w-0">
                <span className="font-mono text-meta font-bold uppercase tracking-[0.16em]">Day {days.indexOf(day) + 1}</span>
                <span className="font-mono text-micro uppercase tracking-wider text-black/55 dark:text-white/55">{dayLabel(day)}</span>
              </div>
            </div>
            <Spread photos={list} {...photoProps} />
          </section>
        ))}
        {byDay.loose.length > 0 && (
          <section className="flex flex-col gap-6">
            <span className="font-mono text-meta font-bold uppercase tracking-[0.16em] border-b border-black/10 dark:border-white/10 pb-3">More moments</span>
            <Spread photos={byDay.loose} {...photoProps} />
          </section>
        )}

        {/* Closing */}
        <footer className="py-10 flex flex-col items-center text-center gap-3 border-t border-black/10 dark:border-white/10">
          <span className="font-mono text-micro font-bold uppercase tracking-[0.2em] text-red-600 dark:text-red-400">The end</span>
          <span className="text-2xl sm:text-3xl font-extrabold tracking-tight break-keep">{trip.title}</span>
          <span className="font-mono text-meta text-black/55 dark:text-white/55 tabular-nums">{trip.date} · {days.length} days · {photos.length} photos</span>
          <button type="button" className="btn btn-secondary mt-2" onClick={onShowRecord}>
            <Clock className="w-4 h-4" aria-hidden />여정 기록 보기
          </button>
        </footer>
      </main>

      {addable && (
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={onAddPhotos} />
      )}

      {reel && (
        <Suspense fallback={null}>
          <MemoryReel
            title={trip.title}
            subtitle={trip.description || trip.subtitle}
            location={trip.locationStr}
            dateLabel={trip.date}
            shots={photos.map(p => ({ src: getEffectiveImageUrl(p.url), place: p.title, location: p.place, date: p.date }))}
            startIndex={reel.at}
            startPaused={reel.paused}
            onClose={() => setReel(null)}
          />
        </Suspense>
      )}
    </div>,
    document.body,
  );
}

/** A day's photos: a wide lead, then pairs, a rhythm that repeats every three */
function Spread({ photos, onOpen, onRemove, onJump }: { photos: MagazinePhoto[]; onOpen?: (url: string) => void; onRemove?: (url: string, e: React.MouseEvent) => void; onJump?: (itemId: number, date?: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 sm:gap-x-5 gap-y-8 sm:gap-y-10">
      {photos.map((p, i) => {
        const lead = i % 3 === 0;
        return (
          <figure key={`${p.url}-${i}`} className={`${lead ? 'col-span-2' : 'col-span-1'} flex flex-col gap-2.5 min-w-0`}>
            <div className={`relative w-full overflow-hidden rounded-card bg-black/5 dark:bg-white/5 ${lead ? 'aspect-[3/2]' : 'aspect-[4/5]'}`}>
              <button
                type="button"
                onClick={() => onOpen?.(p.url)}
                disabled={!onOpen}
                aria-label={`${p.title || p.place || '사진'} 크게 보기`}
                className="block w-full h-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
              >
                <img src={getEffectiveImageUrl(p.url)} alt={p.place || ''} loading="lazy" className="w-full h-full object-cover" />
              </button>
              {p.removable && onRemove && (
                <button
                  type="button"
                  onClick={(e) => onRemove(p.url, e)}
                  aria-label="사진 삭제"
                  className="absolute right-2 top-2 w-8 h-8 rounded-full bg-black/45 text-white grid place-items-center backdrop-blur-sm hover:bg-black/65 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden />
                </button>
              )}
            </div>
            {(p.title || p.place || p.time) && (
              <figcaption className="flex flex-col gap-1 min-w-0">
                {p.title && (
                  <span className={`${lead ? 'text-lg sm:text-2xl' : 'text-[15px] sm:text-lg'} font-extrabold tracking-tight leading-snug break-keep`}>{p.title}</span>
                )}
                {(p.place || p.time) && (
                  <span className="font-mono text-micro sm:text-meta uppercase tracking-wider text-black/55 dark:text-white/55 break-keep [overflow-wrap:anywhere]">
                    {[p.place, p.time].filter(Boolean).join(' · ')}
                  </span>
                )}
                {p.itemId !== undefined && onJump && (
                  <button type="button" onClick={() => onJump(p.itemId as number, p.date)} className="self-start mt-1 inline-flex items-center gap-1 h-7 px-2.5 rounded-full bg-black/[0.06] dark:bg-white/10 text-meta font-bold hover:bg-black/10 dark:hover:bg-white/15 transition-colors">
                    <ArrowUpRight className="w-3.5 h-3.5" aria-hidden />일정에서 보기
                  </button>
                )}
              </figcaption>
            )}
          </figure>
        );
      })}
    </div>
  );
}
