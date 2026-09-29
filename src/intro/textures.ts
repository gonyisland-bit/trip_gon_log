// Canvas-drawn textures for the Intro stage: cards, flap letters, photos, calendar faces.
import * as THREE from 'three';

export const COL = {
  ink: '#0b0b0c',
  paper: '#f3f2ee',
  red: '#e0312b',
  amber: '#d97706',
  grey: '#8a8a86',
  cool: '#3b82f6',
};

export const FONT_SANS = '"Noto Sans KR", Inter, -apple-system, sans-serif';
export const FONT_MONO = '"SF Mono", Consolas, "Noto Sans KR", monospace';

function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d')!;
  draw(g);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function dotSprite() {
  return canvasTexture(64, 64, g => {
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(32, 32, 28, 0, Math.PI * 2); g.fill();
  });
}

/** Trip Guide day card */
export function dayCard(day: number, city: string, rows: [string, string][]) {
  return canvasTexture(512, 320, g => {
    g.fillStyle = COL.paper; g.fillRect(0, 0, 512, 320);
    g.strokeStyle = 'rgba(11,11,12,.25)'; g.lineWidth = 2; g.strokeRect(1, 1, 510, 318);
    g.fillStyle = COL.red; g.font = `700 22px ${FONT_MONO}`; g.fillText(`DAY ${String(day).padStart(2, '0')}`, 28, 46);
    g.fillStyle = COL.ink; g.font = `800 44px ${FONT_SANS}`; g.fillText(city, 28, 100);
    g.fillStyle = 'rgba(11,11,12,.15)'; g.fillRect(28, 124, 456, 2);
    rows.forEach(([time, place], i) => {
      const y = 170 + i * 46;
      g.fillStyle = 'rgba(11,11,12,.6)'; g.font = `600 22px ${FONT_MONO}`; g.fillText(time, 28, y);
      g.fillStyle = COL.ink; g.font = `700 26px ${FONT_SANS}`; g.fillText(place, 130, y);
    });
  });
}

/** One split-flap character tile */
export function flapLetter(ch: string, red = false) {
  return canvasTexture(128, 160, g => {
    g.fillStyle = red ? COL.red : '#16161a'; g.fillRect(0, 0, 128, 160);
    g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(0, 0, 128, 80);
    g.fillStyle = '#fff'; g.font = `800 104px ${FONT_SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(ch, 64, 86);
    g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, 79, 128, 3);
  });
}

export function ticketTexture() {
  return canvasTexture(640, 280, g => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 640, 280);
    g.strokeStyle = COL.ink; g.lineWidth = 4; g.strokeRect(2, 2, 636, 276);
    g.setLineDash([8, 8]); g.beginPath(); g.moveTo(453, 0); g.lineTo(453, 280); g.stroke(); g.setLineDash([]);
    g.font = `700 20px ${FONT_MONO}`; g.fillStyle = 'rgba(11,11,12,.6)';
    g.fillText('BOARDING PASS · TGL 417', 32, 48);
    g.fillStyle = COL.ink; g.font = `800 92px ${FONT_SANS}`;
    g.fillText('ICN', 32, 160);
    g.fillStyle = COL.red; g.fillRect(212, 118, 64, 6);
    g.beginPath(); g.moveTo(276, 108); g.lineTo(296, 121); g.lineTo(276, 134); g.fill();
    g.fillStyle = COL.ink; g.fillText('NRT', 306, 160);
    g.font = `600 20px ${FONT_MONO}`; g.fillStyle = 'rgba(11,11,12,.6)';
    g.fillText('GATE 24   SEAT 31A   OCT 2026', 32, 230);
    g.font = `700 22px ${FONT_MONO}`; g.fillStyle = COL.ink;
    g.fillText('TOKYO', 480, 70); g.fillText('D-14', 480, 110);
  });
}

/** Timeline stop card */
export function stopCard(time: string, place: string, now = false) {
  return canvasTexture(420, 150, g => {
    g.fillStyle = now ? COL.red : COL.paper; g.fillRect(0, 0, 420, 150);
    g.fillStyle = now ? 'rgba(255,255,255,.8)' : 'rgba(11,11,12,.6)'; g.font = `700 24px ${FONT_MONO}`;
    g.fillText(now ? `NOW · ${time}` : time, 24, 48);
    g.fillStyle = now ? '#fff' : COL.ink; g.font = `800 40px ${FONT_SANS}`; g.fillText(place, 24, 110);
  });
}

/** Generated photograph: a flat landscape in muted tones */
export function photoTexture(seed: number) {
  const palettes = [
    ['#c9d4d9', '#7c8f99', '#2f3b42', COL.red],
    ['#e8dcc8', '#b58a5c', '#4d3b2a', COL.amber],
    ['#d7e0d3', '#7f9a7a', '#2f4030', '#f3f2ee'],
    ['#dcd6e4', '#8b7fa0', '#393047', COL.red],
    ['#f0e2d6', '#d08a63', '#5a3526', '#f3f2ee'],
    ['#cfd9e6', '#5f7ea3', '#1f2c3d', COL.amber],
  ];
  const [sky, mid, ground, sun] = palettes[seed % palettes.length];
  return canvasTexture(384, 480, g => {
    g.fillStyle = sky; g.fillRect(0, 0, 384, 480);
    g.fillStyle = sun; g.beginPath(); g.arc(90 + (seed * 53) % 200, 150, 44, 0, Math.PI * 2); g.fill();
    g.fillStyle = mid; g.beginPath(); g.moveTo(0, 330);
    for (let x = 0; x <= 384; x += 64) g.lineTo(x, 250 + ((x * (seed + 3)) % 90));
    g.lineTo(384, 480); g.lineTo(0, 480); g.fill();
    g.fillStyle = ground; g.fillRect(0, 380, 384, 100);
    g.fillStyle = 'rgba(255,255,255,.85)'; g.font = `700 20px ${FONT_MONO}`;
    g.fillText(`2026.10.${String(10 + seed).padStart(2, '0')}`, 20, 452);
  });
}

/** Calendar cube faces */
export function dayFace(n: number, trip: boolean) {
  return canvasTexture(128, 128, g => {
    g.fillStyle = trip ? COL.red : COL.paper; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = 'rgba(11,11,12,.2)'; g.lineWidth = 2; g.strokeRect(1, 1, 126, 126);
    g.fillStyle = trip ? '#fff' : COL.ink; g.font = `800 52px ${FONT_SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(n), 64, 68);
  });
}

export type WeatherKind = 'sun' | 'cloud' | 'rain' | 'snow';
export function weatherFace(kind: WeatherKind, temp: number) {
  return canvasTexture(128, 128, g => {
    g.fillStyle = COL.ink; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = 'rgba(255,255,255,.2)'; g.lineWidth = 2; g.strokeRect(1, 1, 126, 126);
    g.lineCap = 'round'; g.lineWidth = 6;
    if (kind === 'sun') {
      g.fillStyle = '#f59e0b'; g.beginPath(); g.arc(64, 54, 18, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#f59e0b';
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.beginPath(); g.moveTo(64 + Math.cos(a) * 27, 54 + Math.sin(a) * 27); g.lineTo(64 + Math.cos(a) * 34, 54 + Math.sin(a) * 34); g.stroke(); }
    } else {
      g.fillStyle = kind === 'cloud' ? '#a3a3a0' : '#e5e5e2';
      g.beginPath(); g.arc(50, 56, 16, 0, Math.PI * 2); g.arc(72, 50, 20, 0, Math.PI * 2); g.arc(88, 60, 13, 0, Math.PI * 2); g.rect(48, 56, 42, 17); g.fill();
      if (kind === 'rain') { g.strokeStyle = COL.cool; [48, 64, 80].forEach(x => { g.beginPath(); g.moveTo(x, 82); g.lineTo(x - 5, 94); g.stroke(); }); }
      if (kind === 'snow') { g.fillStyle = '#bfdbfe'; [48, 64, 80].forEach(x => { g.beginPath(); g.arc(x, 88, 4, 0, Math.PI * 2); g.fill(); }); }
    }
    g.fillStyle = '#fff'; g.font = `700 22px ${FONT_MONO}`; g.textAlign = 'center'; g.fillText(`${temp}°`, 64, 118);
  });
}
