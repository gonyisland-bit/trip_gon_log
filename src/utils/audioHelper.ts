export interface BgmTrack {
  id: string;
  title: string;
  url: string;
  enabled: boolean;
  isDefault?: boolean;
}

export const DEFAULT_BGM_TRACKS: BgmTrack[] = [
  {
    id: 'default-track-acoustic-journey',
    title: 'Acoustic Journey Serenade',
    url: '/audio/default_bgm.mp3',
    enabled: true,
  },
];

const STORAGE_KEY_BGM_TRACKS = 'tripgon_bgm_playlist';
const STORAGE_KEY_BGM_AUTOPLAY = 'tripgon_bgm_autoplay';
const STORAGE_KEY_BGM_DEFAULT_VOLUME = 'tripgon_bgm_default_volume';
const STORAGE_KEY_BGM_SHUFFLE = 'tripgon_bgm_shuffle';
const STORAGE_KEY_SLIDESHOW_INTERVAL = 'tripgon_slideshow_interval';

export function getStoredBgmTracks(): BgmTrack[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BGM_TRACKS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load BGM tracks from localStorage:', e);
  }
  return DEFAULT_BGM_TRACKS;
}

export function saveStoredBgmTracks(tracks: BgmTrack[]) {
  try {
    localStorage.setItem(STORAGE_KEY_BGM_TRACKS, JSON.stringify(tracks));
    window.dispatchEvent(new CustomEvent('bgmTracksChanged', { detail: tracks }));
  } catch (e) {
    console.warn('Failed to save BGM tracks to localStorage:', e);
  }
}

export function getStoredBgmAutoplay(): boolean {
  try {
    const val = localStorage.getItem(STORAGE_KEY_BGM_AUTOPLAY);
    return val !== 'false'; // default to true
  } catch {
    return true;
  }
}

export function saveStoredBgmAutoplay(enabled: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY_BGM_AUTOPLAY, String(enabled));
  } catch {}
}

export function getStoredBgmDefaultVolume(): number {
  try {
    const val = localStorage.getItem(STORAGE_KEY_BGM_DEFAULT_VOLUME);
    if (val !== null) {
      const num = parseInt(val, 10);
      if (!isNaN(num) && num >= 0 && num <= 100) return num;
    }
  } catch {}
  return 50; // default 50%
}

export function saveStoredBgmDefaultVolume(vol: number) {
  try {
    const clamped = Math.max(0, Math.min(100, Math.round(vol)));
    localStorage.setItem(STORAGE_KEY_BGM_DEFAULT_VOLUME, String(clamped));
  } catch {}
}

export function getStoredBgmShuffle(): boolean {
  try {
    const val = localStorage.getItem(STORAGE_KEY_BGM_SHUFFLE);
    return val === 'true'; // default to false
  } catch {
    return false;
  }
}

export function saveStoredBgmShuffle(shuffle: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY_BGM_SHUFFLE, String(shuffle));
  } catch {}
}

export function getStoredSlideshowInterval(): number {
  try {
    const val = localStorage.getItem(STORAGE_KEY_SLIDESHOW_INTERVAL);
    if (val !== null) {
      const num = parseInt(val, 10);
      if (!isNaN(num) && num >= 2000 && num <= 20000) return num;
    }
  } catch {}
  return 4000; // default 4 seconds
}

export function saveStoredSlideshowInterval(ms: number) {
  try {
    localStorage.setItem(STORAGE_KEY_SLIDESHOW_INTERVAL, String(ms));
  } catch {}
}

/**
 * Singleton Audio Player Controller for seamless BGM playback across lightbox slideshows
 */
class BgmPlayerManager {
  private audio: HTMLAudioElement | null = null;
  private currentTrackIndex = 0;
  private currentTrackId: string | null = null;
  private isPlayingState = false;
  private currentVolume: number = 0.5; // 0.0 ~ 1.0 (default 50%)
  private isShuffleState: boolean = false;
  private fadeInterval: ReturnType<typeof setInterval> | null = null;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.currentVolume = getStoredBgmDefaultVolume() / 100;
    this.isShuffleState = getStoredBgmShuffle();

    if (typeof window !== 'undefined') {
      window.addEventListener('bgmTracksChanged', () => {
        const tracks = this.getPlayableTracks();
        if (tracks.length === 0) {
          this.stop();
        } else if (this.currentTrackIndex >= tracks.length) {
          this.currentTrackIndex = 0;
        }
        this.notify();
      });
    }
  }

  private initAudioIfNeeded() {
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.volume = this.currentVolume;
      this.audio.addEventListener('ended', () => {
        this.next();
      });
      this.audio.addEventListener('error', (err) => {
        console.warn('Audio playback error:', err);
        setTimeout(() => this.next(), 1000);
      });
    }
  }

  public getPlayableTracks(): BgmTrack[] {
    return getStoredBgmTracks().filter((t) => t.enabled && t.url);
  }

  public getAllTracks(): BgmTrack[] {
    return getStoredBgmTracks();
  }

  public subscribe(cb: () => void) {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  public getCurrentTrack(): BgmTrack | null {
    const tracks = this.getPlayableTracks();
    if (tracks.length === 0) return null;
    return tracks[this.currentTrackIndex % tracks.length] || null;
  }

  public isPlaying(): boolean {
    return this.isPlayingState;
  }

  public getVolume(): number {
    return this.currentVolume;
  }

  public getVolumePercent(): number {
    return Math.round(this.currentVolume * 100);
  }

  public setVolume(vol: number) {
    this.clearFade();
    const clamped = Math.max(0, Math.min(1, vol));
    this.currentVolume = clamped;
    if (this.audio) {
      this.audio.volume = clamped;
    }
    this.notify();
  }

  public setVolumePercent(pct: number) {
    this.setVolume(pct / 100);
  }

  public isShuffle(): boolean {
    return this.isShuffleState;
  }

  public setShuffle(shuffle: boolean) {
    this.isShuffleState = shuffle;
    saveStoredBgmShuffle(shuffle);
    this.notify();
  }

  public toggleShuffle(): boolean {
    const next = !this.isShuffleState;
    this.setShuffle(next);
    return next;
  }

  private clearFade() {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }
  }

  /**
   * Smoothly fades in volume from 0 to targetVol (default: currentVolume or default stored volume)
   */
  public fadeIn(targetVol?: number, durationMs = 600) {
    this.clearFade();
    const target = targetVol !== undefined ? Math.max(0, Math.min(1, targetVol)) : this.currentVolume;
    this.initAudioIfNeeded();
    if (!this.audio) return;

    this.audio.volume = 0;
    this.play();

    const steps = 15;
    const intervalTime = durationMs / steps;
    const stepDelta = target / steps;
    let stepCount = 0;

    this.fadeInterval = setInterval(() => {
      stepCount++;
      if (!this.audio) {
        this.clearFade();
        return;
      }
      const nextVol = Math.min(target, stepCount * stepDelta);
      this.audio.volume = nextVol;
      this.currentVolume = nextVol;
      this.notify();

      if (stepCount >= steps) {
        this.clearFade();
        this.audio.volume = target;
        this.currentVolume = target;
        this.notify();
      }
    }, intervalTime);
  }

  /**
   * Smoothly fades out volume from current volume to 0 and stops playback
   */
  public fadeOut(durationMs = 600): Promise<void> {
    this.clearFade();
    return new Promise((resolve) => {
      if (!this.audio || !this.isPlayingState) {
        this.stop();
        resolve();
        return;
      }

      const initialVol = this.currentVolume;
      const steps = 15;
      const intervalTime = durationMs / steps;
      const stepDelta = initialVol / steps;
      let stepCount = 0;

      this.fadeInterval = setInterval(() => {
        stepCount++;
        if (!this.audio) {
          this.clearFade();
          resolve();
          return;
        }
        const nextVol = Math.max(0, initialVol - stepCount * stepDelta);
        this.audio.volume = nextVol;

        if (stepCount >= steps || nextVol <= 0.01) {
          this.clearFade();
          this.stop();
          // Restore volume setting for next playback
          this.currentVolume = initialVol;
          if (this.audio) {
            this.audio.volume = initialVol;
          }
          this.notify();
          resolve();
        }
      }, intervalTime);
    });
  }

  private isSameSource(audioSrc: string, targetUrl: string): boolean {
    if (!audioSrc || !targetUrl) return false;
    if (audioSrc === targetUrl) return true;
    try {
      const parsedAudio = new URL(audioSrc, window.location.href);
      const parsedTarget = new URL(targetUrl, window.location.href);
      return parsedAudio.href === parsedTarget.href;
    } catch {
      return audioSrc.endsWith(targetUrl) || targetUrl.endsWith(audioSrc);
    }
  }

  public playTrackAtIndex(index: number, forceRestart = false) {
    const tracks = this.getPlayableTracks();
    if (tracks.length === 0) {
      this.stop();
      return;
    }

    this.currentTrackIndex = (index + tracks.length) % tracks.length;
    const track = tracks[this.currentTrackIndex];

    this.initAudioIfNeeded();
    if (!this.audio) return;

    this.audio.volume = this.currentVolume;

    const needNewSource =
      forceRestart ||
      !this.currentTrackId ||
      this.currentTrackId !== track.id ||
      !this.isSameSource(this.audio.src, track.url);

    if (needNewSource) {
      this.currentTrackId = track.id;
      this.audio.src = track.url;
      this.audio.load();
      this.audio.currentTime = 0;
    }

    this.audio
      .play()
      .then(() => {
        this.isPlayingState = true;
        this.notify();
      })
      .catch((err) => {
        console.warn('BGM play blocked or failed:', err);
        this.isPlayingState = false;
        this.notify();
      });
  }

  public playTrackById(id: string) {
    const tracks = this.getPlayableTracks();
    const idx = tracks.findIndex((t) => t.id === id);
    if (idx !== -1) {
      this.playTrackAtIndex(idx, true);
    }
  }

  public play() {
    const tracks = this.getPlayableTracks();
    if (tracks.length === 0) return;

    const track = tracks[this.currentTrackIndex % tracks.length];

    this.initAudioIfNeeded();
    if (!this.audio) return;

    this.audio.volume = this.currentVolume;

    if (this.audio.src && this.currentTrackId === track?.id) {
      this.audio
        .play()
        .then(() => {
          this.isPlayingState = true;
          this.notify();
        })
        .catch(() => {
          this.playTrackAtIndex(this.currentTrackIndex, false);
        });
    } else {
      this.playTrackAtIndex(this.currentTrackIndex, false);
    }
  }

  public pause() {
    this.clearFade();
    if (this.audio) {
      this.audio.pause();
    }
    this.isPlayingState = false;
    this.notify();
  }

  public toggle() {
    if (this.isPlayingState) {
      this.pause();
    } else {
      this.play();
    }
  }

  public next() {
    const tracks = this.getPlayableTracks();
    if (tracks.length === 0) return;

    if (this.isShuffleState && tracks.length > 1) {
      let randIdx = Math.floor(Math.random() * tracks.length);
      if (randIdx === this.currentTrackIndex) {
        randIdx = (randIdx + 1) % tracks.length;
      }
      this.playTrackAtIndex(randIdx, true);
    } else {
      this.playTrackAtIndex((this.currentTrackIndex + 1) % tracks.length, true);
    }
  }

  public prev() {
    const tracks = this.getPlayableTracks();
    if (tracks.length === 0) return;
    this.playTrackAtIndex((this.currentTrackIndex - 1 + tracks.length) % tracks.length, true);
  }

  public stop() {
    this.clearFade();
    if (this.audio) {
      this.audio.pause();
      try {
        this.audio.currentTime = 0;
      } catch (_) {}
    }
    this.isPlayingState = false;
    this.notify();
  }
}

export const bgmPlayer = new BgmPlayerManager();
