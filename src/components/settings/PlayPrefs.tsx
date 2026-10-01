import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { Segment } from '../ui/Segment';
import { saveUserPref } from '../../utils/userPrefs';
import { BACKDROPS, applyBackdrop, useBackdrop } from '../../utils/backdrop';
import {
  getBgmOff, getStoredBgmAutoplay, getStoredBgmDefaultVolume, getStoredBgmShuffle, getStoredBgmTracks, getStoredSlideshowInterval,
  saveStoredBgmAutoplay, saveStoredBgmDefaultVolume, saveStoredBgmShuffle, saveStoredSlideshowInterval, setBgmOff,
} from '../../utils/audioHelper';

// Settings → 화면 (v1.3.7): the page backdrop and the slideshow with its music, all this member's own.

function Switch({ on, label, onChange }: { on: boolean; label: string; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 min-h-8">
      <span className="text-[14px] font-bold">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onChange(!on)}
        className={`relative w-10 h-6 rounded-full transition-colors duration-fast cursor-pointer shrink-0 ${on ? 'bg-ink dark:bg-ink-dark' : 'bg-black/15 dark:bg-white/20'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-surface dark:bg-paper-dark shadow-sm transition-transform duration-fast ${on ? 'translate-x-4' : ''}`} />
      </button>
    </div>
  );
}

/** Page backdrop: plain paper or one of the soft gradient templates */
export function BackdropPicker({ cardClass, labelClass }: { cardClass: string; labelClass: string }) {
  const current = useBackdrop();
  return (
    <section className={cardClass}>
      <span className={labelClass}>Backdrop</span>
      <span className="text-meta text-black/55 dark:text-white/55 -mt-1">홈과 허브 바탕에 깔리는 색입니다. 다크 모드에서는 쓰지 않습니다.</span>
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2" role="radiogroup" aria-label="바탕 색">
        {BACKDROPS.map(b => {
          const on = b.id === current.id;
          return (
            <button
              key={b.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => applyBackdrop(b.id)}
              className="flex flex-col items-center gap-1.5"
            >
              <span
                className={`w-full aspect-square rounded-thumb grid place-items-center border ${on ? 'border-ink dark:border-ink-dark border-2' : 'border-black/10 dark:border-white/10'}`}
                style={{ background: b.from ? `linear-gradient(135deg, ${b.from}, ${b.to})` : '#F6F4EF' }}
              >
                {on && <Check className="w-4 h-4 text-ink" aria-hidden />}
              </span>
              <span className={`text-micro ${on ? 'font-bold' : 'text-black/60 dark:text-white/60'}`}>{b.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/** Slideshow pacing and photo fit, and its music: on / off, shuffle, volume, which tracks play */
export function SlideshowPrefs({ cardClass, labelClass }: { cardClass: string; labelClass: string }) {
  const [fit, setFit] = useState<'fit' | 'fill'>(() => { try { return localStorage.getItem('tgl_reel_fit') === 'fill' ? 'fill' : 'fit'; } catch { return 'fit'; } });
  const [interval, setIntervalMs] = useState(getStoredSlideshowInterval);
  const [autoplay, setAutoplay] = useState(getStoredBgmAutoplay);
  const [shuffle, setShuffle] = useState(getStoredBgmShuffle);
  const [volume, setVolume] = useState(getStoredBgmDefaultVolume);
  const [off, setOff] = useState<string[]>(getBgmOff);
  const tracks = getStoredBgmTracks();
  const saveBgm = (patch: { autoplay?: boolean; shuffle?: boolean; volume?: number; off?: string[] }) =>
    saveUserPref({ bgm: { autoplay, shuffle, volume, off, ...patch } });

  return (
    <section className={cardClass}>
      <span className={labelClass}>Slideshow</span>
      <div className="flex flex-col gap-2">
        <span className="text-[14px] font-bold">사진 보기</span>
        <Segment<'fit' | 'fill'>
          block
          ariaLabel="슬라이드쇼 사진 보기"
          value={fit}
          onChange={(v) => { setFit(v); try { localStorage.setItem('tgl_reel_fit', v); } catch { /* cache */ } saveUserPref({ slideshow: { interval, fit: v } }); }}
          options={[{ value: 'fit', label: '사진 전체' }, { value: 'fill', label: '화면 채우기' }]}
        />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-[14px] font-bold">넘기는 간격</span>
        <Segment<string>
          block
          ariaLabel="넘기는 간격"
          value={String(interval)}
          onChange={(v) => { const ms = Number(v); setIntervalMs(ms); saveStoredSlideshowInterval(ms); saveUserPref({ slideshow: { interval: ms, fit } }); }}
          options={[3000, 4000, 6000, 8000].map(ms => ({ value: String(ms), label: `${ms / 1000}초` }))}
        />
      </div>

      <div className="h-px bg-black/[0.06] dark:bg-white/[0.08] my-1" />
      <Switch on={autoplay} label="배경음악" onChange={(v) => { setAutoplay(v); saveStoredBgmAutoplay(v); saveBgm({ autoplay: v }); }} />
      {autoplay && (
        <>
          <Switch on={shuffle} label="섞어 듣기" onChange={(v) => { setShuffle(v); saveStoredBgmShuffle(v); saveBgm({ shuffle: v }); }} />
          <label className="flex items-center gap-3">
            <span className="text-[14px] font-bold shrink-0">음량</span>
            <input
              id="bgm-volume"
              type="range"
              min={0}
              max={100}
              step={5}
              value={volume}
              onChange={(e) => { const v = Number(e.target.value); setVolume(v); saveStoredBgmDefaultVolume(v); }}
              onPointerUp={() => saveBgm({ volume })}
              onKeyUp={() => saveBgm({ volume })}
              className="flex-1 accent-red-600"
              aria-label="배경음악 음량"
            />
            <span className="w-10 text-right font-mono text-meta tabular-nums">{volume}%</span>
          </label>
          {tracks.length > 1 && (
            <div className="flex flex-col gap-1">
              <span className="text-meta text-black/55 dark:text-white/55">들을 곡</span>
              <ul className="flex flex-col">
                {tracks.map(t => {
                  const playing = !off.includes(t.id);
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={playing}
                        onClick={() => {
                          const next = playing ? [...off, t.id] : off.filter(x => x !== t.id);
                          // Keep at least one track playing
                          if (tracks.every(x => next.includes(x.id))) return;
                          setOff(next); setBgmOff(next); saveBgm({ off: next });
                        }}
                        className="w-full min-h-10 px-2 -mx-2 flex items-center gap-3 text-left rounded-thumb hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
                      >
                        <span className={`w-5 h-5 rounded-full grid place-items-center shrink-0 ${playing ? 'bg-ink dark:bg-ink-dark text-surface dark:text-paper-dark' : 'border border-black/20 dark:border-white/25'}`}>
                          {playing && <Check className="w-3 h-3" aria-hidden />}
                        </span>
                        <span className={`text-[14px] truncate ${playing ? 'font-bold' : 'text-black/55 dark:text-white/55'}`}>{t.title}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}
