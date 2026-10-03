import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBackToClose } from '../../utils/overlayHistory';
import { Maximize2, Minimize2, SkipForward, SlidersHorizontal, Volume1, Volume2, VolumeX } from 'lucide-react';
import { PlayerDock, PlayerTopBar, DockButton, DockPanel, DockPanelRow } from '../player/PlayerDock';
import { getBgmOff, getStoredBgmAutoplay, getStoredBgmDefaultVolume, getStoredBgmShuffle, getStoredBgmTracks, getStoredSlideshowInterval, saveStoredBgmAutoplay, saveStoredBgmDefaultVolume, saveStoredSlideshowInterval } from '../../utils/audioHelper';
import { saveUserPref } from '../../utils/userPrefs';
import { prefersReducedMotion } from '../../motion';
import { VolumeGauge, VolumeSlider } from './VolumeGauge';
import { lockBodyScroll } from '../../utils/scrollLock';

// Memory Reel (v1.3): a full-screen photo film with music.
//  - Ken Burns drift on every shot, cross-fade between shots
//  - lower-third caption (place, date, a line of text)
//  - cuts land on the music's beats when the track can be analysed (same-origin
//    audio); otherwise shots follow the slideshow interval from settings
//  - ends on a credit card: title, place, dates and counts
//  - v1.3.7: the photo viewer's controls live here too, in one options panel (volume, pace,
//    next track, captions on / off) with keys ← → (shots), ↑ ↓ (volume), Space (play),
//    M (sound), F (fit), I (captions), N (next track)
//  - sound: the speaker button is one tap on / off (the same switch as Settings → Slideshow → music, so the two
//    never disagree); volume is a slider beside it on wider screens and a gauge that rises over it on a phone

export interface ReelShot {
  src: string;
  place?: string;
  location?: string;
  date?: string;
  line?: string;
}

interface MemoryReelProps {
  title: string;
  subtitle?: string;
  location?: string;
  dateLabel?: string;
  shots: ReelShot[];
  onClose: () => void;
  /** Shot to start on (the photo the viewer was looking at) */
  startIndex?: number;
  /** Opened from a tapped photo: starts still, whole photo in view, and plays when asked (the magazine's viewer) */
  startPaused?: boolean;
}

const FADE_MS = 1100;
const FIT_KEY = 'tgl_reel_fit';

// fit: the whole photo over a blurred copy of itself (portrait photos are not cut on a wide
// screen, like the lightbox slideshow); fill: the photo covers the screen
type ShotFit = 'fit' | 'fill';
function readFit(): ShotFit {
  try { return localStorage.getItem(FIT_KEY) === 'fill' ? 'fill' : 'fit'; } catch { return 'fit'; }
}

/** The tracks this member lets play. Whether the sound is on is a separate switch (`muted`) */
function playableTracks(): string[] {
  return getStoredBgmTracks().filter(t => t.enabled && t.url).map(t => t.url);
}

/** The speaker shows the level: off, low, loud */
function SpeakerIcon({ muted, volume }: { muted: boolean; volume: number }) {
  if (muted || volume === 0) return <VolumeX className="w-5 h-5 opacity-60" aria-hidden />;
  return volume < 50 ? <Volume1 className="w-5 h-5" aria-hidden /> : <Volume2 className="w-5 h-5" aria-hidden />;
}

function isSameOrigin(url: string): boolean {
  try {
    return new URL(url, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}

export function MemoryReel({ title, subtitle, location, dateLabel, shots, onClose: onCloseNow, startIndex = 0, startPaused = false }: MemoryReelProps) {
  useBackToClose(true, onCloseNow);
  // Closing from the reel's own controls fades out first; the back gesture closes at once
  const [leaving, setLeaving] = useState(false);
  const onClose = useCallback(() => {
    if (prefersReducedMotion()) { onCloseNow(); return; }
    setLeaving(true);
    window.setTimeout(onCloseNow, 220);
  }, [onCloseNow]);
  const [index, setIndex] = useState(() => Math.max(0, Math.min(shots.length - 1, startIndex)));
  const [playing, setPlaying] = useState(!startPaused);
  // Sound is the member's own on / off (Settings → Slideshow). Off at the start loads no music until it is switched on.
  const [muted, setMuted] = useState(() => !getStoredBgmAutoplay());
  const [armed, setArmed] = useState(() => getStoredBgmAutoplay());
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const [ended, setEnded] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [fit, setFit] = useState<ShotFit>(() => (startPaused ? 'fit' : readFit()));
  const [volume, setVolume] = useState(() => getStoredBgmDefaultVolume());
  const [volumePanel, setVolumePanel] = useState(false);
  const [captions, setCaptions] = useState(true);
  const tracks = useMemo(playableTracks, []);
  const [trackIdx, setTrackIdx] = useState(() => (tracks.length && getStoredBgmShuffle() ? Math.floor(Math.random() * tracks.length) : 0));
  const trackUrl = tracks[trackIdx] || null;
  const nextTrack = useCallback(() => {
    if (tracks.length < 2) return;
    setTrackIdx(i => (i + 1) % tracks.length);
  }, [tracks.length]);
  const [hud, setHud] = useState<string | null>(null);
  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  const hudTimer = useRef<number | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const flash = useCallback((text: string) => {
    setHud(text);
    if (hudTimer.current) window.clearTimeout(hudTimer.current);
    hudTimer.current = window.setTimeout(() => setHud(null), 1200);
  }, []);

  // The volume gauge rises over the speaker button; it stays while it is being used and goes after a pause
  const [gaugeOpen, setGaugeOpen] = useState(false);
  const gaugeTimer = useRef<number | null>(null);
  const keepGauge = useCallback(() => {
    setGaugeOpen(true);
    if (gaugeTimer.current) window.clearTimeout(gaugeTimer.current);
    gaugeTimer.current = window.setTimeout(() => setGaugeOpen(false), 2600);
  }, []);
  const hideGauge = useCallback(() => {
    if (gaugeTimer.current) window.clearTimeout(gaugeTimer.current);
    setGaugeOpen(false);
  }, []);
  useEffect(() => () => { if (gaugeTimer.current) window.clearTimeout(gaugeTimer.current); }, []);

  // Sound on / off: remembered on this device and in the account, the same switch Settings shows
  const setSound = useCallback((on: boolean) => {
    // iOS starts an audio context only inside a tap
    ctxRef.current?.resume().catch(() => {});
    setMuted(!on);
    if (on) setArmed(true);
    saveStoredBgmAutoplay(on);
    saveUserPref({ bgm: { autoplay: on, shuffle: getStoredBgmShuffle(), volume: getStoredBgmDefaultVolume(), off: getBgmOff() } });
  }, []);
  const toggleSound = useCallback(() => {
    const on = mutedRef.current;
    setSound(on);
    flash(on ? '소리 켬' : '소리 끔');
    keepGauge();
  }, [setSound, flash, keepGauge]);

  const volumeSaveTimer = useRef<number | null>(null);
  useEffect(() => () => { if (volumeSaveTimer.current) window.clearTimeout(volumeSaveTimer.current); }, []);
  const changeVolume = useCallback((next: number) => {
    const v = Math.max(0, Math.min(100, Math.round(next)));
    setVolume(v);
    if (mutedRef.current && v > 0) setSound(true);
    saveStoredBgmDefaultVolume(v);
    // The account copy follows once the hand stops moving
    if (volumeSaveTimer.current) window.clearTimeout(volumeSaveTimer.current);
    volumeSaveTimer.current = window.setTimeout(() => {
      saveUserPref({ bgm: { autoplay: !mutedRef.current, shuffle: getStoredBgmShuffle(), volume: v, off: getBgmOff() } });
    }, 500);
    keepGauge();
  }, [keepGauge, setSound]);

  const toggleFit = useCallback(() => {
    setFit(f => {
      const next: ShotFit = f === 'fit' ? 'fill' : 'fit';
      try { localStorage.setItem(FIT_KEY, next); } catch { /* per device */ }
      flash(next === 'fit' ? '사진 전체 보기' : '화면 채우기');
      return next;
    });
  }, [flash]);
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const [interval, setIntervalMs] = useState(() => Math.max(3000, getStoredSlideshowInterval()));
  const changePace = useCallback((ms: number) => {
    setIntervalMs(ms);
    saveStoredSlideshowInterval(ms);
    flash(`${ms / 1000}초마다 넘기기`);
  }, [flash]);
  const minShot = Math.max(2600, interval * 0.7);
  const maxShot = interval * 1.5;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const playingRef = useRef(playing);
  playingRef.current = playing;
  // True where the music cannot be made quieter (an iOS element without the gain node): sound on / off only
  const [volumeFixed, setVolumeFixed] = useState(false);
  const shotStartRef = useRef(performance.now());
  const indexRef = useRef(0);
  indexRef.current = index;

  // Each shot gets its own drift direction
  const drifts = useMemo(() => shots.map((_, i) => {
    const dirs = [['center', '3% 2%'], ['center', '-3% 2%'], ['center', '0% -3%'], ['center', '3% -2%']];
    return dirs[i % dirs.length];
  }), [shots]);

  const advance = useCallback(() => {
    shotStartRef.current = performance.now();
    setIndex(i => {
      if (i + 1 >= shots.length) {
        setEnded(true);
        return i;
      }
      return i + 1;
    });
  }, [shots.length]);

  const goBack = useCallback(() => {
    shotStartRef.current = performance.now();
    setIndex(i => Math.max(0, i - 1));
    setEnded(false);
  }, []);

  // Music. The sound goes through a Web Audio gain node, the only volume iOS Safari obeys (it ignores the element's
  // `volume`). A track on another origin (R2) is fetched with CORS for that; if it cannot be, it plays as a plain
  // element, and where that element's volume is fixed (iOS) the reel offers sound on / off only.
  useEffect(() => {
    const url = trackUrl;
    if (!url || !armed) return;
    let disposed = false;
    let ac: AudioContext | null = null;
    const start = (withGraph: boolean) => {
      const audio = new Audio();
      audio.loop = true;
      audio.preload = 'auto';
      if (withGraph && !isSameOrigin(url)) audio.crossOrigin = 'anonymous';
      audio.src = url;
      audioRef.current = audio;
      gainRef.current = null;
      analyserRef.current = null;
      if (withGraph) {
        try {
          const Ctx = window.AudioContext || (window as any).webkitAudioContext;
          ac = new Ctx();
          const src = ac.createMediaElementSource(audio);
          const gain = ac.createGain();
          gain.gain.value = mutedRef.current ? 0 : volumeRef.current / 100;
          src.connect(gain);
          if (!reduced) {
            const analyser = ac.createAnalyser();
            analyser.fftSize = 1024;
            gain.connect(analyser);
            analyser.connect(ac.destination);
            analyserRef.current = analyser;
          } else {
            gain.connect(ac.destination);
          }
          gainRef.current = gain;
          ctxRef.current = ac;
          audio.addEventListener('play', () => { ac?.resume().catch(() => {}); });
          // CORS refused: the graph would stay silent, so the track starts again as a plain element
          audio.addEventListener('error', () => {
            if (disposed || audioRef.current !== audio) return;
            audio.src = '';
            ac?.close().catch(() => {});
            ac = null;
            ctxRef.current = null;
            start(false);
          }, { once: true });
        } catch {
          gainRef.current = null;
          analyserRef.current = null;
        }
      }
      if (!gainRef.current) {
        audio.volume = volumeRef.current / 100;
        audio.muted = mutedRef.current;
        // iOS keeps an element at full volume whatever it is told; then only on / off is offered
        setVolumeFixed(Math.abs(audio.volume - volumeRef.current / 100) > 0.01);
      } else {
        setVolumeFixed(false);
      }
      if (playingRef.current) audio.play().catch(() => setPlaying(false));
    };
    start(true);
    return () => {
      disposed = true;
      const audio = audioRef.current;
      if (audio) { audio.pause(); audio.src = ''; }
      audioRef.current = null;
      analyserRef.current = null;
      gainRef.current = null;
      ctxRef.current = null;
      ac?.close().catch(() => {});
    };
  }, [reduced, trackUrl, armed]);

  // Volume and mute go to the gain node when there is one, glided so a change never clicks
  useEffect(() => {
    const target = muted ? 0 : volume / 100;
    const gain = gainRef.current;
    const ac = ctxRef.current;
    if (gain && ac) {
      gain.gain.cancelScheduledValues(ac.currentTime);
      gain.gain.setTargetAtTime(target, ac.currentTime, 0.04);
    } else if (audioRef.current) {
      audioRef.current.volume = volume / 100;
      audioRef.current.muted = muted;
    }
  }, [volume, muted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing && !ended) audio.play().catch(() => {});
    else audio.pause();
  }, [playing, muted, ended]);

  // Shot clock: cut on a beat inside [minShot, maxShot], or at the interval without analysis
  useEffect(() => {
    if (!playing || ended) return;
    let raf = 0;
    const bins = new Uint8Array(512);
    let avg = 0;
    const tick = () => {
      const elapsed = performance.now() - shotStartRef.current;
      const analyser = mutedRef.current ? null : analyserRef.current;
      if (analyser) {
        analyser.getByteFrequencyData(bins);
        let low = 0;
        for (let i = 1; i < 12; i++) low += bins[i];
        low /= 11;
        const isBeat = avg > 20 && low > avg * 1.35;
        avg = avg * 0.94 + low * 0.06;
        if ((elapsed > minShot && isBeat) || elapsed > maxShot) { advance(); }
      } else if (elapsed > interval) {
        advance();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, ended, advance, interval, minShot, maxShot]);

  // A paused shot starts over when playback resumes
  useEffect(() => {
    if (playing) shotStartRef.current = performance.now();
  }, [playing]);

  // Keyboard: the reel takes its keys first (capture) so the page under it, such as the journey
  // map's play log on Space, never reacts too
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Escape', 'm', 'M', 'f', 'F', 'i', 'I', 'n', 'N', 'p', 'P', 'k', 'K'].includes(e.key)) e.stopImmediatePropagation();
      setChromeVisible(true);
      if (e.key === 'Escape') onClose();
      else if (e.key === ' ') { e.preventDefault(); setPlaying(p => !p); }
      else if (e.key === 'ArrowRight') advance();
      else if (e.key === 'ArrowLeft') goBack();
      else if (e.key === 'ArrowUp') { e.preventDefault(); changeVolume(volumeRef.current + 10); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); changeVolume(volumeRef.current - 10); }
      else if (e.key === 'm' || e.key === 'M') toggleSound();
      else if (e.key === 'f' || e.key === 'F') toggleFit();
      else if (e.key === 'i' || e.key === 'I') setCaptions(c => { flash(c ? '사진 정보 숨김' : '사진 정보 표시'); return !c; });
      else if (e.key === 'n' || e.key === 'N') { nextTrack(); flash('다음 곡'); }
    };
    window.addEventListener('keydown', onKey, true);
    const unlock = lockBodyScroll();
    return () => {
      window.removeEventListener('keydown', onKey, true);
      unlock();
    };
  }, [advance, goBack, onClose, changeVolume, flash, toggleFit, nextTrack, toggleSound]);

  // Controls fade out while watching
  useEffect(() => {
    if (!chromeVisible || !playing) return;
    const t = setTimeout(() => setChromeVisible(false), 2600);
    return () => clearTimeout(t);
  }, [chromeVisible, playing, index]);

  const restart = () => {
    shotStartRef.current = performance.now();
    setIndex(0);
    setEnded(false);
    setPlaying(true);
    if (audioRef.current) audioRef.current.currentTime = 0;
  };

  const shot = shots[index];
  const shotDuration = analyserRef.current && !muted ? maxShot : interval;
  const places = new Set(shots.map(s => s.location || s.place).filter(Boolean)).size;

  return (
    <div
      role="dialog"
      aria-label={`${title} Memory Reel`}
      data-bg-cover
      className={`fixed inset-0 z-[200] bg-black text-white select-none overflow-hidden ${leaving ? 'tgl-reel-out' : 'tgl-reel-in'}`}
      onPointerMove={() => setChromeVisible(true)}
      onClick={() => setChromeVisible(true)}
      // Swipe left / right on a phone moves between shots
      onTouchStart={(e) => { const t = e.touches[0]; touchStart.current = { x: t.clientX, y: t.clientY }; }}
      onTouchEnd={(e) => {
        const s = touchStart.current;
        touchStart.current = null;
        if (!s) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - s.x;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(t.clientY - s.y) * 1.5) (dx < 0 ? advance : goBack)();
      }}
    >
      {/* Shots: the current one on top, the previous one fading underneath */}
      {shots.map((s, i) => {
        const active = i === index && !ended;
        const wasActive = i === index - 1 && !ended;
        if (!active && !wasActive) return null;
        const [origin, shift] = drifts[i];
        return (
          <div
            key={i}
            className="absolute inset-0"
            style={{ opacity: active ? 1 : 0, transition: `opacity ${FADE_MS}ms cubic-bezier(.2,0,0,1)`, zIndex: active ? 2 : 1 }}
          >
            {/* Ambient: the same photo blurred behind, so its colour fills the frame */}
            {fit === 'fit' && (
              <img src={s.src} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover scale-110 blur-3xl opacity-90 saturate-150" />
            )}
            <img
              src={s.src}
              alt={s.place || title}
              className={`absolute inset-0 w-full h-full ${fit === 'fit' ? 'object-contain' : 'object-cover'}`}
              style={reduced ? undefined : {
                transformOrigin: origin,
                animation: `tglKenBurns ${shotDuration + FADE_MS}ms linear both`,
                ['--kb-shift' as any]: fit === 'fit' ? '0% 0%' : shift,
              }}
            />
          </div>
        );
      })}

      {/* Legibility */}
      <div className="absolute inset-0 z-[3] pointer-events-none bg-gradient-to-t from-black/75 via-black/5 to-black/40" />

      <PlayerTopBar
        visible={chromeVisible || !playing || ended}
        count={shots.length}
        index={ended ? shots.length : index}
        segmentMs={!reduced && !ended ? shotDuration : undefined}
        progress={reduced ? 0 : undefined}
        running={playing}
        segmentKey={`${index}-${playing}`}
        countLabel={<>{String(Math.min(index + 1, shots.length)).padStart(2, '0')} / {String(shots.length).padStart(2, '0')}</>}
        label={`Memory Reel · ${title}`}
        onClose={onClose}
      />

      {/* Lower third */}
      {shot && !ended && captions && (
        <div key={index} className="absolute left-4 right-4 sm:left-10 sm:right-10 bottom-28 sm:bottom-24 z-[5] max-w-3xl tgl-reel-caption">
          <div className="flex items-center gap-2 font-mono text-micro sm:text-meta tracking-[0.16em] uppercase text-white/85">
            <span className="w-6 h-px bg-red-500" />
            {[shot.location || shot.place, shot.date].filter(Boolean).join(' · ')}
          </div>
          {shot.place && <h2 className="mt-2 text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-[-0.03em] leading-[1.05] break-keep">{shot.place}</h2>}
          {shot.line && <p className="mt-2 text-sm sm:text-base text-white/85 leading-relaxed line-clamp-2 break-keep">{shot.line}</p>}
        </div>
      )}

      {/* Credits */}
      {ended && (
        <div className="absolute inset-0 z-[6] flex flex-col items-center justify-center text-center px-6 bg-black tgl-reel-caption">
          <span className="font-mono text-micro sm:text-meta tracking-[0.2em] uppercase text-white/60">Tripgon Magazine</span>
          <h2 className="mt-4 text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-[-0.04em] leading-none break-keep">{title}</h2>
          {subtitle && <p className="mt-4 max-w-xl text-sm sm:text-base text-white/75 break-keep">{subtitle}</p>}
          <div className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-2 font-mono text-meta uppercase tracking-widest text-white/80">
            {location && <span>{location}</span>}
            {dateLabel && <span>{dateLabel}</span>}
            <span>{shots.length} {shots.length === 1 ? 'Shot' : 'Shots'}</span>
            {places > 0 && <span>{places} {places === 1 ? 'Place' : 'Places'}</span>}
          </div>
          <div className="mt-10 flex gap-3">
            <button type="button" onClick={restart} className="tgl-press h-10 px-5 inline-flex items-center gap-2 border border-white/60 hover:bg-white hover:text-black transition-colors font-mono text-meta uppercase tracking-widest">
              Replay
            </button>
            <button type="button" onClick={onClose} className="tgl-press h-10 px-5 inline-flex items-center gap-2 bg-white text-black hover:bg-red-600 hover:text-white transition-colors font-mono text-meta uppercase tracking-widest">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Controls: the shared player dock */}
      {!ended && (
        <PlayerDock
          className="absolute left-1/2 -translate-x-1/2 z-[7]"
          style={{ bottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
          visible={chromeVisible || !playing}
          playing={playing}
          onTogglePlay={() => setPlaying(p => !p)}
          onPrev={goBack}
          onNext={advance}
          prevLabel="이전 (←)"
          nextLabel="다음 (→)"
          hud={hud ? (
            <span className="px-3 h-8 inline-flex items-center rounded-full bg-black/70 font-mono text-meta tracking-wider text-white tabular-nums">{hud}</span>
          ) : undefined}
          panel={volumePanel ? (
            <DockPanel>
              <DockPanelRow label="Pace">
                <div className="flex gap-1" role="radiogroup" aria-label="넘기는 간격">
                  {[3000, 4000, 6000, 8000].map(ms => (
                    <button key={ms} type="button" role="radio" aria-checked={interval === ms} onClick={() => changePace(ms)} className={`h-8 px-3 rounded-full font-mono text-meta tabular-nums ${interval === ms ? 'bg-white text-black font-bold' : 'bg-white/10 hover:bg-white/20'}`}>{ms / 1000}s</button>
                  ))}
                </div>
              </DockPanelRow>
              <DockPanelRow label="Info">
                <button type="button" role="switch" aria-checked={captions} onClick={() => setCaptions(c => !c)} className={`h-8 px-3 rounded-full text-meta font-bold ${captions ? 'bg-white text-black' : 'bg-white/10 hover:bg-white/20'}`}>{captions ? '사진 정보 켬' : '사진 정보 끔'}</button>
                {tracks.length > 1 && (
                  <button type="button" onClick={() => { nextTrack(); flash('다음 곡'); }} className="h-8 px-3 rounded-full bg-white/10 hover:bg-white/20 text-meta font-bold inline-flex items-center gap-1.5"><SkipForward className="w-3.5 h-3.5" aria-hidden />다음 곡</button>
                )}
              </DockPanelRow>
            </DockPanel>
          ) : undefined}
          leading={
            <>
              {tracks.length > 0 && (
                <div
                  className="relative flex items-center"
                  onWheel={(e) => changeVolume(volumeRef.current + (e.deltaY < 0 ? 5 : -5))}
                >
                  {gaugeOpen && !volumeFixed && (
                    <VolumeGauge
                      className="sm:hidden absolute bottom-full left-1/2 -translate-x-1/2 mb-3"
                      value={volume}
                      muted={muted}
                      onChange={changeVolume}
                      onToggleMute={toggleSound}
                      onActivity={keepGauge}
                    />
                  )}
                  {/* Phone: the speaker opens the gauge (its own button switches the sound); wider screens and a fixed
                      volume: the speaker switches the sound and the slider beside it sets the level */}
                  <DockButton
                    label={volumeFixed ? (muted ? '소리 켜기 (M)' : '소리 끄기 (M)') : `음량 ${muted ? '꺼짐' : `${volume}%`}`}
                    aria-pressed={!muted}
                    onClick={() => {
                      if (volumeFixed || window.matchMedia('(min-width: 640px)').matches) { toggleSound(); return; }
                      if (gaugeOpen) hideGauge(); else keepGauge();
                    }}
                  >
                    <SpeakerIcon muted={muted} volume={volume} />
                  </DockButton>
                  {!volumeFixed && <VolumeSlider className="hidden sm:flex" value={volume} muted={muted} onChange={changeVolume} />}
                </div>
              )}
              <DockButton label="옵션" onClick={() => { hideGauge(); setVolumePanel(v => !v); }}>
                <SlidersHorizontal className={`w-5 h-5 ${volumePanel ? 'text-red-400' : ''}`} />
              </DockButton>
            </>
          }
          trailing={
            <DockButton label={fit === 'fit' ? '화면 채우기 (F)' : '사진 전체 보기 (F)'} onClick={toggleFit}>
              {fit === 'fit' ? <Maximize2 className="w-5 h-5" /> : <Minimize2 className="w-5 h-5" />}
            </DockButton>
          }
        />
      )}
    </div>
  );
}
