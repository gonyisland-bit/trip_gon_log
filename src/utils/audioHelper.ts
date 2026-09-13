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

/**
 * Singleton Audio Player Controller for seamless BGM playback across lightbox slideshows
 */
class BgmPlayerManager {
  private audio: HTMLAudioElement | null = null;
  private currentTrackIndex = 0;
  private currentTrackId: string | null = null;
  private isPlayingState = false;
  private listeners: Set<() => void> = new Set();

  constructor() {
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

    if (!this.audio) {
      this.audio = new Audio();
      this.audio.addEventListener('ended', () => {
        this.next();
      });
      this.audio.addEventListener('error', (err) => {
        console.warn('Audio playback error:', err);
        setTimeout(() => this.next(), 1000);
      });
    }

    const needNewSource = forceRestart || !this.currentTrackId || this.currentTrackId !== track.id || !this.isSameSource(this.audio.src, track.url);

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

    if (this.audio && this.audio.src && this.currentTrackId === track?.id) {
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
    this.playTrackAtIndex((this.currentTrackIndex + 1) % tracks.length, true);
  }

  public prev() {
    const tracks = this.getPlayableTracks();
    if (tracks.length === 0) return;
    this.playTrackAtIndex((this.currentTrackIndex - 1 + tracks.length) % tracks.length, true);
  }

  public stop() {
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
