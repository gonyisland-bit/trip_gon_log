import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, Volume2, VolumeX, X } from 'lucide-react';
import { getStoredBgmDefaultVolume, getStoredBgmShuffle, getStoredBgmTracks, getStoredSlideshowInterval } from '../../utils/audioHelper';
import { prefersReducedMotion } from '../../motion';

// Memory Reel (v1.3): a full-screen photo film with music.
//  - Ken Burns drift on every shot, cross-fade between shots
//  - lower-third caption (place, date, a line of text)
//  - cuts land on the music's beats when the track can be analysed (same-origin
//    audio); otherwise shots follow the slideshow interval from settings
//  - ends on a credit card: title, place, dates and counts

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
}

const FADE_MS = 1100;

function pickTrack(): string | null {
  const tracks = getStoredBgmTracks().filter(t => t.enabled && t.url);
  if (!tracks.length) return null;
  return (getStoredBgmShuffle() ? tracks[Math.floor(Math.random() * tracks.length)] : tracks[0]).url;
}

function isSameOrigin(url: string): boolean {
  try {
    return new URL(url, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}

export function MemoryReel({ title, subtitle, location, dateLabel, shots, onClose }: MemoryReelProps) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [ended, setEnded] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);
  const reduced = useMemo(() => prefersReducedMotion(), []);
  const interval = useMemo(() => Math.max(3200, getStoredSlideshowInterval()), []);
  const minShot = Math.max(2600, interval * 0.7);
  const maxShot = interval * 1.5;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
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

  // Music
  useEffect(() => {
    const url = pickTrack();
    if (!url) return;
    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = getStoredBgmDefaultVolume() / 100;
    audioRef.current = audio;

    if (isSameOrigin(url) && !reduced) {
      try {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        const ac: AudioContext = new Ctx();
        const src = ac.createMediaElementSource(audio);
        const analyser = ac.createAnalyser();
        analyser.fftSize = 1024;
        src.connect(analyser);
        analyser.connect(ac.destination);
        analyserRef.current = analyser;
        audio.addEventListener('play', () => { ac.resume().catch(() => {}); });
      } catch {
        analyserRef.current = null;
      }
    }
    audio.play().catch(() => setPlaying(false));
    return () => {
      audio.pause();
      audio.src = '';
      audioRef.current = null;
      analyserRef.current = null;
    };
  }, [reduced]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = muted;
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
      const analyser = analyserRef.current;
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

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === ' ') { e.preventDefault(); setPlaying(p => !p); }
      else if (e.key === 'ArrowRight') advance();
      else if (e.key === 'ArrowLeft') { shotStartRef.current = performance.now(); setIndex(i => Math.max(0, i - 1)); setEnded(false); }
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [advance, onClose]);

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
  const shotDuration = analyserRef.current ? maxShot : interval;
  const places = new Set(shots.map(s => s.location || s.place).filter(Boolean)).size;

  return (
    <div
      role="dialog"
      aria-label={`${title} Memory Reel`}
      className="fixed inset-0 z-[200] bg-black text-white select-none overflow-hidden"
      onPointerMove={() => setChromeVisible(true)}
      onClick={() => setChromeVisible(true)}
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
            <img
              src={s.src}
              alt={s.place || title}
              className="absolute inset-0 w-full h-full object-cover"
              style={reduced ? undefined : {
                transformOrigin: origin,
                animation: `tglKenBurns ${shotDuration + FADE_MS}ms linear both`,
                ['--kb-shift' as any]: shift,
              }}
            />
          </div>
        );
      })}

      {/* Legibility */}
      <div className="absolute inset-0 z-[3] pointer-events-none bg-gradient-to-t from-black/75 via-black/5 to-black/40" />

      {/* Progress segments */}
      <div className="absolute top-0 inset-x-0 z-[5] flex gap-1 px-4 sm:px-8 pt-4">
        {shots.map((_, i) => (
          <div key={i} className="h-[2px] flex-1 bg-white/25 overflow-hidden">
            <div
              key={`${i}-${index}-${playing}`}
              className="h-full bg-white origin-left"
              style={{
                transform: i < index || ended ? 'scaleX(1)' : 'scaleX(0)',
                animation: i === index && !ended && playing && !reduced ? `tglReelProgress ${shotDuration}ms linear forwards` : undefined,
              }}
            />
          </div>
        ))}
      </div>

      {/* Masthead */}
      <div className="absolute top-8 left-4 right-4 sm:left-8 sm:right-8 z-[5] flex items-center justify-between font-mono text-micro sm:text-meta tracking-[0.18em] uppercase text-white/85">
        <span>Memory Reel · {title}</span>
        <span className="tabular-nums">{String(Math.min(index + 1, shots.length)).padStart(2, '0')} / {String(shots.length).padStart(2, '0')}</span>
      </div>

      {/* Lower third */}
      {shot && !ended && (
        <div key={index} className="absolute left-4 right-4 sm:left-10 sm:right-10 bottom-20 sm:bottom-16 z-[5] max-w-3xl tgl-reel-caption">
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

      {/* Controls */}
      <div className={`absolute bottom-5 right-4 sm:right-8 z-[7] flex items-center gap-2 transition-opacity duration-base ${chromeVisible || !playing || ended ? 'opacity-100' : 'opacity-0'}`}>
        {!ended && (
          <button type="button" onClick={(e) => { e.stopPropagation(); setPlaying(p => !p); }} className="tgl-press tap-target w-10 h-10 rounded-full bg-white/15 hover:bg-white hover:text-black backdrop-blur-md flex items-center justify-center transition-colors" aria-label={playing ? '일시정지' : '재생'}>
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        )}
        <button type="button" onClick={(e) => { e.stopPropagation(); setMuted(m => !m); }} className="tgl-press tap-target w-10 h-10 rounded-full bg-white/15 hover:bg-white hover:text-black backdrop-blur-md flex items-center justify-center transition-colors" aria-label={muted ? '소리 켜기' : '소리 끄기'}>
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
        <button type="button" onClick={(e) => { e.stopPropagation(); onClose(); }} className="tgl-press tap-target w-10 h-10 rounded-full bg-white/15 hover:bg-white hover:text-black backdrop-blur-md flex items-center justify-center transition-colors" aria-label="닫기">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
