import React, { useEffect, useState } from 'react';
import { ChevronRight, Clock, Moon, RotateCcw, Sun, Trash2 } from 'lucide-react';
import type { Trip, UserProfile } from '../../types';
import { Sheet } from '../Sheet';
import { Segment } from '../ui/Segment';
import { UserProfileAvatar } from '../UserProfileAvatar';
import { applyJourneyOpen, readJourneyOpen, type JourneyOpen } from '../../utils/userPrefs';
import { getStoredBgmDefaultVolume, getStoredSlideshowInterval, saveStoredBgmDefaultVolume, saveStoredSlideshowInterval } from '../../utils/audioHelper';
import { getMyStorageUsage } from '../../utils/storageHelper';
import { cardCoverUrl } from '../../utils/journeyThumbs';
import { confirmDialog } from '../../utils/feedback';
import { FriendsSection } from '../friends/FriendsSection';
import { NotificationSettings } from '../notifications/NotificationSettings';
import type { PersonCard } from '../../utils/friends';

// Settings for every member (v1.3.6 4-d): account, friends (5-a), notifications (6-b), display, storage and trash.
// Journeys are managed from their cards; the operator's tools live in the manage hub.

import { OPEN_PROFILE_EDIT } from '../../app/quickActions';
type NightMode = 'auto' | 'light' | 'dark';
type ReelFit = 'fit' | 'fill';

interface Props {
  onClose: () => void;
  profile: UserProfile | null;
  displayName: string;
  email?: string;
  nightMode: NightMode;
  onNightMode: (v: NightMode) => void;
  trashed: Trip[];
  onRestore: (id: number) => void;
  onPermanentDelete: (id: number) => void;
  me: PersonCard | null;
  canWrite: boolean;
  journeys: Trip[];
  onOpenJourney: (id: number) => void;
  onOpenPocket: () => void;
}

const card = 'rounded-card bg-surface dark:bg-surface-dark p-4 flex flex-col gap-3';
const label = 'font-mono text-micro font-bold uppercase tracking-[0.16em] text-black/55 dark:text-white/55';
const rowLabel = 'text-[14px] font-bold';

function formatBytes(n: number): string {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`;
  return `${Math.round(n / 1024 ** 2)} MB`;
}

export function SettingsSheet({ onClose, profile, displayName, email, nightMode, onNightMode, trashed, onRestore, onPermanentDelete, me, canWrite, journeys, onOpenJourney, onOpenPocket }: Props){
  const [journeyOpen, setJourneyOpen] = useState<JourneyOpen>(readJourneyOpen);
  const [fit, setFit] = useState<ReelFit>(() => { try { return localStorage.getItem('tgl_reel_fit') === 'fill' ? 'fill' : 'fit'; } catch { return 'fit'; } });
  const [interval, setIntervalMs] = useState(() => getStoredSlideshowInterval());
  const [volume, setVolume] = useState(() => getStoredBgmDefaultVolume());
  const [usage, setUsage] = useState<{ used: number; quota: number | null } | null>(null);
  const [usageError, setUsageError] = useState(false);

  useEffect(() => {
    getMyStorageUsage().then(setUsage).catch(() => setUsageError(true));
  }, []);

  const pct = usage?.quota ? Math.min(100, (usage.used / usage.quota) * 100) : 0;

  return (
    <Sheet label="설정" onClose={onClose} tone="paper" panelClassName="sm:max-w-lg max-h-[90dvh]">
      <div className="flex flex-col gap-3 p-4 pt-2 min-h-0 overflow-y-auto overscroll-contain">
        <h2 className="text-[20px] font-extrabold tracking-tight px-1">설정</h2>

        {/* Account */}
        <section className={card}>
          <span className={label}>Account</span>
          <button
            type="button"
            onClick={() => { onClose(); window.dispatchEvent(new CustomEvent(OPEN_PROFILE_EDIT)); }}
            className="flex items-center gap-3 text-left min-h-12 -mx-1 px-1 rounded-thumb hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
          >
            <UserProfileAvatar profile={profile} size="lg" fallbackName={displayName} />
            <span className="flex-1 min-w-0 flex flex-col">
              <span className="font-extrabold truncate">{displayName}</span>
              <span className="text-meta text-black/55 dark:text-white/55 truncate">{email}</span>
            </span>
            <span className="text-meta font-bold text-black/60 dark:text-white/60 shrink-0">프로필 · 비밀번호 · 탈퇴</span>
            <ChevronRight className="w-4 h-4 shrink-0 text-black/40 dark:text-white/40" aria-hidden />
          </button>
        </section>

        {me && (
          <FriendsSection
            me={me}
            canWrite={canWrite}
            cardClass={card}
            labelClass={label}
            journeys={journeys}
            onOpenJourney={(id) => { onClose(); onOpenJourney(id); }}
            onOpenPocket={() => { onClose(); onOpenPocket(); }}
          />
        )}

        {me && <NotificationSettings cardClass={card} labelClass={label} />}

        {/* Display */}
        <section className={card}>
          <span className={label}>Display</span>
          <div className="flex flex-col gap-2">
            <span className={rowLabel}>화면 모드</span>
            <Segment<NightMode>
              block
              ariaLabel="화면 모드"
              value={nightMode}
              onChange={onNightMode}
              options={[
                { value: 'auto', label: '자동', icon: Clock },
                { value: 'light', label: '라이트', icon: Sun },
                { value: 'dark', label: '다크', icon: Moon },
              ]}
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className={rowLabel}>발행한 여정을 열 때</span>
            <Segment<JourneyOpen>
              block
              ariaLabel="발행한 여정을 열 때"
              value={journeyOpen}
              onChange={(v) => { setJourneyOpen(v); applyJourneyOpen(v); }}
              options={[{ value: 'magazine', label: '매거진 먼저' }, { value: 'record', label: '항상 기록' }]}
            />
          </div>
        </section>

        {/* Slideshow */}
        <section className={card}>
          <span className={label}>Slideshow</span>
          <div className="flex flex-col gap-2">
            <span className={rowLabel}>사진 보기</span>
            <Segment<ReelFit>
              block
              ariaLabel="슬라이드쇼 사진 보기"
              value={fit}
              onChange={(v) => { setFit(v); try { localStorage.setItem('tgl_reel_fit', v); } catch { /* per device */ } }}
              options={[{ value: 'fit', label: '사진 전체' }, { value: 'fill', label: '화면 채우기' }]}
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className={rowLabel}>넘기는 간격</span>
            <Segment<string>
              block
              ariaLabel="넘기는 간격"
              value={String(interval)}
              onChange={(v) => { const ms = Number(v); setIntervalMs(ms); saveStoredSlideshowInterval(ms); }}
              options={[3000, 4000, 6000, 8000].map(ms => ({ value: String(ms), label: `${ms / 1000}초` }))}
            />
          </div>
          <label className="flex items-center gap-3">
            <span className={`${rowLabel} shrink-0`}>음량</span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={volume}
              onChange={(e) => { const v = Number(e.target.value); setVolume(v); saveStoredBgmDefaultVolume(v); }}
              className="flex-1 accent-red-600"
              aria-label="슬라이드쇼 음량"
            />
            <span className="w-10 text-right font-mono text-meta tabular-nums">{volume}%</span>
          </label>
        </section>

        {/* Storage */}
        <section className={card}>
          <span className={label}>Storage</span>
          {usage ? (
            <>
              <div className="flex items-baseline justify-between gap-2">
                <span className={rowLabel}>사진 · 영상</span>
                <span className="font-mono text-meta tabular-nums">
                  {formatBytes(usage.used)}{usage.quota ? ` / ${formatBytes(usage.quota)}` : ''}
                </span>
              </div>
              {usage.quota && (
                <div className="h-2 rounded-full bg-black/[0.07] dark:bg-white/10 overflow-hidden" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
                  <div className={`h-full rounded-full ${pct > 90 ? 'bg-red-600' : pct > 70 ? 'bg-amber-500' : 'bg-ink dark:bg-ink-dark'}`} style={{ width: `${pct}%` }} />
                </div>
              )}
            </>
          ) : (
            <span className="text-meta text-black/55 dark:text-white/55">{usageError ? '사용량을 불러오지 못했습니다.' : '사용량을 확인하는 중'}</span>
          )}
        </section>

        {/* Trash */}
        <section className={card}>
          <div className="flex items-baseline justify-between">
            <span className={label}>Trash</span>
            <span className="font-mono text-meta text-black/50 dark:text-white/50 tabular-nums">{trashed.length}</span>
          </div>
          {trashed.length === 0 ? (
            <span className="text-meta text-black/55 dark:text-white/55">휴지통이 비어 있습니다.</span>
          ) : (
            <ul className="flex flex-col gap-2">
              {trashed.map(t => (
                <li key={t.id} className="flex items-center gap-3">
                  <img src={cardCoverUrl(t)} alt="" className="w-11 h-11 rounded-thumb object-cover bg-black/5 dark:bg-white/10 shrink-0" />
                  <span className="flex-1 min-w-0 flex flex-col">
                    <span className="text-[14px] font-bold truncate">{t.title}</span>
                    <span className="font-mono text-micro text-black/50 dark:text-white/50 truncate">{t.date}</span>
                  </span>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => onRestore(t.id)}>
                    <RotateCcw className="w-3.5 h-3.5" aria-hidden />복구
                  </button>
                  <button
                    type="button"
                    className="w-8 h-8 rounded-full grid place-items-center text-red-600 dark:text-red-400 hover:bg-red-500/10"
                    aria-label={`${t.title} 영구 삭제`}
                    onClick={async () => {
                      if (await confirmDialog(`'${t.title}'을(를) 영구 삭제할까요? 되돌릴 수 없습니다.`, { title: 'DELETE FOREVER', confirmLabel: '영구 삭제', danger: true })) onPermanentDelete(t.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Sheet>
  );
}
