import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCcw, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { useBackToClose } from '../utils/overlayHistory';
import { prefersReducedMotion } from '../motion';
import { PlayerDock, PlayerTopBar, DockButton } from '../components/player/PlayerDock';
import { IntroStage } from './stage';
import { renderSoundtrack } from './soundtrack';
import { BEAT, DURATION, SCENES, sceneAt } from './timeline';

// Intro 2.0 player: the stage renders in real time at any aspect ratio, with the shared player dock.

interface IntroViewProps {
  onClose: () => void;
  /** Final call to action; closes when omitted */
  onStart?: () => void;
  startLabel?: string;
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function IntroView({ onClose, onStart, startLabel = '지금 시작하기' }: IntroViewProps) {
  useBackToClose(true, onClose);
  const hostRef = useRef<HTMLDivElement>(null);
  const glRef = useRef<HTMLCanvasElement>(null);
  const typeRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<IntroStage | null>(null);

  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [time, setTime] = useState(0);
  const [chrome, setChrome] = useState(true);

  // Clock: offset + elapsed since start, in seconds
  const clock = useRef({ offset: 0, start: 0, playing: false });
  const audio = useRef<{ ctx: AudioContext | null; buf: AudioBuffer | null; src: AudioBufferSourceNode | null; gain: GainNode | null }>({ ctx: null, buf: null, src: null, gain: null });
  const mutedRef = useRef(false);
  mutedRef.current = muted;

  const now = () => {
    const c = clock.current;
    return c.playing ? c.offset + (performance.now() - c.start) / 1000 : c.offset;
  };

  const stopAudio = () => {
    const a = audio.current;
    if (a.src) { try { a.src.stop(); } catch { /* already stopped */ } a.src.disconnect(); a.src = null; }
  };
  const startAudio = (at: number) => {
    const a = audio.current;
    stopAudio();
    if (!a.ctx || !a.buf || mutedRef.current || at >= DURATION) return;
    if (a.ctx.state === 'suspended') a.ctx.resume().catch(() => {});
    const src = a.ctx.createBufferSource();
    src.buffer = a.buf;
    src.connect(a.gain!);
    src.start(0, at);
    a.src = src;
  };

  const play = useCallback((from?: number) => {
    const at = from ?? (clock.current.offset >= DURATION - 0.05 ? 0 : now());
    clock.current = { offset: at, start: performance.now(), playing: true };
    setPlaying(true);
    startAudio(at);
  }, []);

  const pause = useCallback(() => {
    clock.current = { offset: Math.min(now(), DURATION), start: 0, playing: false };
    setPlaying(false);
    stopAudio();
  }, []);

  const seek = useCallback((to: number) => {
    const at = Math.max(0, Math.min(DURATION - 0.01, to));
    if (clock.current.playing) play(at);
    else { clock.current.offset = at; setTime(at); stageRef.current?.render(at); }
  }, [play]);

  // Stage and soundtrack
  useEffect(() => {
    let disposed = false;
    const gl = glRef.current!, type = typeRef.current!, host = hostRef.current!;
    let stage: IntroStage;
    try {
      stage = new IntroStage({ glCanvas: gl, typeCanvas: type, calm: prefersReducedMotion(), cta: false });
    } catch {
      setFailed(true);
      return;
    }
    stageRef.current = stage;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    const fit = () => { const r = host.getBoundingClientRect(); stage.resize(Math.max(1, r.width), Math.max(1, r.height), dpr); stage.render(now()); };
    const ro = new ResizeObserver(fit);
    ro.observe(host);

    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = Ctx ? new Ctx() : null;
    if (ctx) { const gain = ctx.createGain(); gain.connect(ctx.destination); audio.current.ctx = ctx; audio.current.gain = gain; }

    Promise.all([stage.load(), renderSoundtrack().catch(() => null)]).then(([, buf]) => {
      if (disposed) return;
      audio.current.buf = buf;
      if (!buf || !ctx) setMuted(true);
      fit();
      setReady(true);
      play(0);
      // Browsers keep audio locked until a tap; show it as muted until then
      if (ctx && ctx.state === 'suspended') setMuted(true);
    });

    // Render loop with a simple quality governor
    let raf = 0, last = performance.now(), slow = 0, lastUi = 0;
    const loop = () => {
      const t = now();
      if (clock.current.playing && t >= DURATION) {
        clock.current = { offset: DURATION, start: 0, playing: false };
        setPlaying(false);
        setChrome(true);
        stopAudio();
      }
      const tt = Math.min(t, DURATION - 0.001);
      stage.render(tt);
      const n = performance.now();
      const dt = n - last; last = n;
      if (clock.current.playing) {
        slow = dt > 26 ? slow + 1 : Math.max(0, slow - 1);
        if (slow > 40 && dpr > 1) { dpr = Math.max(1, dpr - 0.5); slow = 0; fit(); }
      }
      if (n - lastUi > 100) { lastUi = n; setTime(tt); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onHide = () => { if (document.hidden && clock.current.playing) pause(); };
    document.addEventListener('visibilitychange', onHide);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onHide);
      document.body.style.overflow = prevOverflow;
      stopAudio();
      ctx?.close().catch(() => {});
      stage.dispose();
      stageRef.current = null;
    };
  }, [play, pause]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    mutedRef.current = next;
    if (next) stopAudio();
    else if (clock.current.playing) startAudio(now());
  };
  const togglePlay = () => (clock.current.playing ? pause() : play());
  const nextScene = () => {
    const b = now() / BEAT;
    const nxt = SCENES.find(s => s.start > b + 0.01);
    if (nxt) seek(nxt.start * BEAT); else seek(DURATION - 0.01);
  };
  const prevScene = () => {
    const b = now() / BEAT;
    const cur = sceneAt(b);
    const i = SCENES.indexOf(cur);
    seek((b - cur.start < 2 && i > 0 ? SCENES[i - 1].start : cur.start) * BEAT);
  };

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === ' ') { e.preventDefault(); togglePlay(); }
      else if (e.key === 'ArrowRight') nextScene();
      else if (e.key === 'ArrowLeft') prevScene();
      else if (e.key === 'm' || e.key === 'M') toggleMute();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Controls fade while watching
  useEffect(() => {
    if (!chrome || !playing) return;
    const id = setTimeout(() => setChrome(false), 2500);
    return () => clearTimeout(id);
  }, [chrome, playing, time > 0 && Math.floor(time / 3)]);

  const b = time / BEAT;
  const sc = sceneAt(b);
  const idx = SCENES.indexOf(sc);
  const ended = !playing && time >= DURATION - 0.05;

  return (
    <div
      role="dialog"
      aria-label="Tripgon log 소개 영상"
      className="fixed inset-0 z-player bg-black text-white select-none overflow-hidden"
      onPointerMove={(e) => { if (e.pointerType === 'mouse') setChrome(true); }}
    >
      <div ref={hostRef} className="absolute inset-0" onClick={() => { if (!chrome) setChrome(true); else if (ready) togglePlay(); }}>
        <canvas ref={glRef} className="absolute inset-0 w-full h-full block" aria-hidden />
        <canvas ref={typeRef} className="absolute inset-0 w-full h-full block pointer-events-none" aria-hidden />
      </div>

      {!ready && !failed && (
        <div className="absolute inset-0 grid place-items-center bg-[#f3f2ee] text-black pointer-events-none">
          <div className="flex flex-col items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            <span className="font-mono text-micro uppercase tracking-[0.2em] text-black/60">Loading intro</span>
          </div>
        </div>
      )}
      {failed && (
        <div className="absolute inset-0 grid place-items-center px-6 text-center">
          <p className="text-sm text-white/80 max-w-xs">이 기기에서는 3D 영상을 재생할 수 없습니다. 브라우저의 하드웨어 가속을 켠 뒤 다시 열어 주세요.</p>
        </div>
      )}

      <PlayerTopBar
        visible={chrome || !playing}
        count={SCENES.length}
        index={idx}
        progress={(b - sc.start) / (sc.end - sc.start)}
        countLabel={`${fmt(time)} / ${fmt(DURATION)}`}
        label={`Intro · ${sc.label}`}
        onClose={onClose}
      />

      {ended && (
        <div className="absolute inset-x-0 z-[46] flex justify-center gap-2 px-4" style={{ bottom: 'calc(max(1rem, env(safe-area-inset-bottom, 0px)) + 4.5rem)' }}>
          <button type="button" onClick={() => play(0)} className="tgl-press h-10 px-5 inline-flex items-center gap-2 border border-current bg-transparent text-black hover:bg-black hover:text-white transition-colors font-mono text-meta uppercase tracking-widest">
            <RotateCcw className="w-4 h-4" /> 다시 보기
          </button>
          <button type="button" onClick={onStart ?? onClose} className="tgl-press h-10 px-5 inline-flex items-center gap-2 bg-black text-white hover:bg-red-600 transition-colors text-sm font-bold">
            {startLabel}
          </button>
        </div>
      )}

      <PlayerDock
        className="absolute left-1/2 -translate-x-1/2 z-[46]"
        style={{ bottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
        visible={ready && (chrome || !playing)}
        playing={playing}
        onTogglePlay={togglePlay}
        onPrev={prevScene}
        onNext={nextScene}
        prevLabel="이전 장면 (←)"
        nextLabel="다음 장면 (→)"
        nextIcon={<SkipForward className="w-5 h-5" />}
        leading={
          <DockButton label={muted ? '소리 켜기 (M)' : '소리 끄기 (M)'} onClick={toggleMute} active={!muted}>
            {muted ? <VolumeX className="w-5 h-5 opacity-60" /> : <Volume2 className="w-5 h-5" />}
          </DockButton>
        }
        trailing={
          <DockButton label="처음부터" onClick={() => play(0)}>
            <RotateCcw className="w-5 h-5" />
          </DockButton>
        }
      />
    </div>
  );
}

export default IntroView;
