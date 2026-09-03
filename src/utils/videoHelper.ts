/**
 * Video Helper utilities for mobile compatibility (iOS Safari / WebKit)
 * and automatic first-frame poster generation.
 */

export interface VideoInspectionResult {
  isCompatible: boolean;
  duration: number;
  width: number;
  height: number;
  posterBlob?: Blob;
  error?: string;
}

/**
 * Extracts the first frame of a video file as a high-quality JPEG Blob for use as a poster.
 */
export async function extractVideoPoster(file: File | Blob, seekTime = 0.1): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    // @ts-ignore
    video.setAttribute('playsinline', '');
    // @ts-ignore
    video.setAttribute('webkit-playsinline', '');

    const url = URL.createObjectURL(file);
    video.src = url;

    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.remove();
    };

    video.onloadedmetadata = () => {
      video.currentTime = Math.min(seekTime, video.duration > 0 ? video.duration / 2 : seekTime);
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        const maxDim = 1920;
        let width = video.videoWidth || 1280;
        let height = video.videoHeight || 720;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              cleanup();
              resolve(blob);
            },
            'image/jpeg',
            0.85
          );
        } else {
          cleanup();
          resolve(null);
        }
      } catch (err) {
        console.warn("Poster extraction failed:", err);
        cleanup();
        resolve(null);
      }
    };

    video.onerror = () => {
      cleanup();
      resolve(null);
    };

    // Fallback timeout
    setTimeout(() => {
      cleanup();
      resolve(null);
    }, 4000);
  });
}

/**
 * Inspects a video file for basic dimensions, duration, and extracts a poster.
 */
export async function inspectAndPrepareVideo(file: File): Promise<VideoInspectionResult> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const url = URL.createObjectURL(file);
    video.src = url;

    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.remove();
    };

    video.onloadedmetadata = async () => {
      const duration = video.duration;
      const width = video.videoWidth;
      const height = video.videoHeight;

      // Extract poster
      const posterBlob = await extractVideoPoster(file, 0.1);
      cleanup();

      resolve({
        isCompatible: true,
        duration,
        width,
        height,
        posterBlob: posterBlob || undefined
      });
    };

    video.onerror = () => {
      cleanup();
      resolve({
        isCompatible: false,
        duration: 0,
        width: 0,
        height: 0,
        error: "이 동영상 포맷은 브라우저에서 직접 디코딩할 수 없는 코덱(예: VP9/ProRes 등)을 포함하고 있습니다."
      });
    };

    setTimeout(() => {
      cleanup();
      resolve({
        isCompatible: true,
        duration: 0,
        width: 0,
        height: 0
      });
    }, 5000);
  });
}
