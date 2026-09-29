// Intro 2.0 stage: a Three.js scene plus a 2D type layer, both drawn from time alone.
// render(t) is pure in t, so the player can seek and the exporter can render frame by frame.
import * as THREE from 'three';
import { BRAND_LOGO_PATHS, BRAND_LOGO_VIEWBOX } from '../components/brandLogoData';
import { decodeWorldDots } from '../data/worldDots';
import {
  BEAT, LINES, SCENES, TOTAL_BEATS, clamp, ease, hash, kickPulse, lerp, sceneAt, seg,
} from './timeline';
import {
  COL, FONT_MONO, FONT_SANS, dayCard, dayFace, dotSprite, flapLetter, photoTexture, stopCard, ticketTexture, weatherFace,
  type WeatherKind,
} from './textures';

const DEG = Math.PI / 180;
const FOV = 32;
const PAPER = new THREE.Color(COL.paper);
const INK = new THREE.Color(COL.ink);
const RED = new THREE.Color(COL.red);

interface Layout { w: number; h: number; portrait: boolean; dist: number; offY: number; u: number }

function std(color: string | THREE.Color, rough = 0.55) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.05, flatShading: true });
}
function basic(map: THREE.Texture, opts: THREE.MeshBasicMaterialParameters = {}) {
  return new THREE.MeshBasicMaterial({ map, transparent: true, ...opts });
}

export interface StageOptions {
  glCanvas: HTMLCanvasElement;
  typeCanvas: HTMLCanvasElement;
  /** Keep the WebGL buffer readable after a frame (exporter) */
  preserve?: boolean;
  /** Reduced motion: no camera drift or punch */
  calm?: boolean;
  /** Draw the closing call-to-action pill (the in-app player shows a real button instead) */
  cta?: boolean;
}

export class IntroStage {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(FOV, 16 / 9, 0.1, 200);
  private g: CanvasRenderingContext2D;
  private L: Layout = { w: 1, h: 1, portrait: false, dist: 10, offY: 0, u: 1 };
  private dpr = 1;
  private calm: boolean;
  private cta: boolean;
  private logoImg: HTMLImageElement | null = null;
  private photoCanvases: HTMLCanvasElement[] = [];
  private disposables: { dispose: () => void }[] = [];

  // objects
  private dots!: THREE.Points;
  private dotPos!: Float32Array;
  private layouts!: { sphere: Float32Array; flat: Float32Array; logo: Float32Array; h: Float32Array; lat: Float32Array; lng: Float32Array };
  private logoW = 7;
  private shapes: THREE.Mesh[] = [];
  private pins: THREE.Group[] = [];
  private arcs: THREE.Mesh[] = [];
  private arcIndexCounts: number[] = [];
  private cards: THREE.Mesh[] = [];
  private flaps: THREE.Mesh[] = [];
  private flapTex: Record<string, THREE.Texture> = {};
  private ticket!: THREE.Mesh;
  private stampRing!: THREE.Mesh;
  private rail!: THREE.Group;
  private stops: THREE.Mesh[] = [];
  private stations: THREE.Mesh[] = [];
  private nowLine!: THREE.Mesh;
  private photos: THREE.Mesh[] = [];
  private pages!: THREE.Group;
  private flipSheet!: THREE.Group;
  private cubes: THREE.Mesh[] = [];
  private wall!: THREE.Group;
  private outroShapes: THREE.Mesh[] = [];

  constructor(opts: StageOptions) {
    this.calm = !!opts.calm;
    this.cta = opts.cta !== false;
    this.renderer = new THREE.WebGLRenderer({ canvas: opts.glCanvas, antialias: true, preserveDrawingBuffer: !!opts.preserve, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.g = opts.typeCanvas.getContext('2d')!;
    this.scene.background = PAPER.clone();

    const hemi = new THREE.HemisphereLight(0xffffff, 0x3a3a3a, 1.25);
    const key = new THREE.DirectionalLight(0xffffff, 1.9);
    key.position.set(4, 6, 5);
    this.scene.add(hemi, key);
    this.build();
  }

  /** Fonts and the logo image; call once before the first render */
  async load() {
    try {
      await Promise.all([
        document.fonts.load(`800 80px ${FONT_SANS}`, '여행은 흩어지기 쉽다'),
        document.fonts.load(`700 30px ${FONT_SANS}`, '계획 기록 회상'),
      ]);
    } catch { /* fall back to system fonts */ }
    this.logoImg = await new Promise(res => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => res(null as unknown as HTMLImageElement);
      img.src = '/tripgon-logotype.svg';
    });
  }

  resize(w: number, h: number, dpr = 1) {
    this.dpr = dpr;
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    const c = this.g.canvas;
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    const aspect = w / h;
    const portrait = aspect < 0.9;
    const tan = Math.tan((FOV / 2) * DEG);
    const boxW = portrait ? 6.3 : 10.4, boxH = portrait ? 7.2 : 6.4;
    const dist = Math.max(boxH / (2 * tan), boxW / (2 * tan * aspect));
    const visH = 2 * dist * tan;
    this.L = { w, h, portrait, dist, offY: portrait ? -visH * 0.035 : -0.55, u: Math.min(w, h) / 1080 };
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    // Logo width follows the frame
    const lw = portrait ? 5.6 : 7;
    if (lw !== this.logoW) { this.logoW = lw; this.buildLogoLayout(); }
  }

  dispose() {
    this.disposables.forEach(d => d.dispose());
    this.renderer.dispose();
  }

  private keep<T extends { dispose: () => void }>(x: T): T { this.disposables.push(x); return x; }

  // ---------- build ----------
  private build() {
    const all = decodeWorldDots().filter(d => d.keep);
    const n = all.length;
    const sphere = new Float32Array(n * 3), flat = new Float32Array(n * 3);
    const h = new Float32Array(n), lat = new Float32Array(n), lng = new Float32Array(n);
    all.forEach((d, i) => {
      h[i] = d.h; lat[i] = d.lat; lng[i] = d.lng;
      flat[i * 3] = (d.lng / 180) * 4.6; flat[i * 3 + 1] = 0; flat[i * 3 + 2] = (-d.lat / 90) * 2.6 + 0.35;
    });
    this.layouts = { sphere, flat, logo: new Float32Array(n * 3), h, lat, lng };
    this.buildLogoLayout();
    this.dotPos = new Float32Array(n * 3);
    const geo = this.keep(new THREE.BufferGeometry());
    geo.setAttribute('position', new THREE.BufferAttribute(this.dotPos, 3));
    const mat = this.keep(new THREE.PointsMaterial({ size: 0.075, map: this.keep(dotSprite()), transparent: true, alphaTest: 0.05, depthWrite: false, color: INK }));
    this.dots = new THREE.Points(geo, mat);
    this.dots.frustumCulled = false;
    this.scene.add(this.dots);

    // Hook shapes: sphere, cube, cylinder, ring, cone
    const geos = [
      new THREE.IcosahedronGeometry(0.55, 2),
      new THREE.BoxGeometry(0.8, 0.8, 0.8),
      new THREE.CylinderGeometry(0.32, 0.32, 1.2, 24),
      new THREE.TorusGeometry(0.5, 0.12, 12, 40),
      new THREE.ConeGeometry(0.42, 0.9, 4),
      new THREE.IcosahedronGeometry(0.26, 1),
    ].map(g => this.keep(g));
    const mats = [std(COL.red), std(COL.ink), std(COL.ink), std(COL.red), std(COL.ink), std(COL.red)];
    geos.forEach((g, i) => { const m = new THREE.Mesh(g, this.keep(mats[i])); this.shapes.push(m); this.scene.add(m); });

    // Pins and arcs over the flat map
    const pinCities: [number, number][] = [[37.5, 127], [35.7, 139.7], [48.8, 2.3], [40.7, -74], [13.7, 100.5]];
    const headGeo = this.keep(new THREE.IcosahedronGeometry(0.14, 1));
    const stemGeo = this.keep(new THREE.CylinderGeometry(0.02, 0.02, 0.55, 8));
    const redMat = this.keep(std(COL.red)), paperMat = this.keep(std(COL.paper));
    const flatPos = (la: number, ln: number) => new THREE.Vector3((ln / 180) * 4.6, 0, (-la / 90) * 2.6 + 0.35);
    pinCities.forEach(([la, ln]) => {
      const g = new THREE.Group();
      const head = new THREE.Mesh(headGeo, redMat); head.position.y = 0.6;
      const stem = new THREE.Mesh(stemGeo, paperMat); stem.position.y = 0.28;
      g.add(head, stem); g.position.copy(flatPos(la, ln));
      this.pins.push(g); this.scene.add(g);
    });
    [[0, 1], [0, 2], [1, 3], [0, 4]].forEach(([a, b]) => {
      const p0 = this.pins[a].position.clone(), p2 = this.pins[b].position.clone();
      const mid = p0.clone().add(p2).multiplyScalar(0.5); mid.y = 0.6 + p0.distanceTo(p2) * 0.28;
      const curve = new THREE.QuadraticBezierCurve3(p0.clone().setY(0.02), mid, p2.clone().setY(0.02));
      const tube = this.keep(new THREE.TubeGeometry(curve, 64, 0.022, 6, false));
      const m = new THREE.Mesh(tube, redMat);
      this.arcIndexCounts.push(tube.index ? tube.index.count : 0);
      this.arcs.push(m); this.scene.add(m);
    });
    const cardData: [number, string, [string, string][]][] = [
      [1, '도쿄', [['09:00', '츠키지 장외시장'], ['13:30', '센소지'], ['18:00', '시부야 스카이']]],
      [2, '가마쿠라', [['10:00', '고토쿠인'], ['14:00', '에노시마'], ['17:30', '유이가하마']]],
      [3, '하코네', [['11:00', '오와쿠다니'], ['15:00', '아시노코'], ['19:00', '료칸 체크인']]],
    ];
    const cardGeo = this.keep(new THREE.BoxGeometry(2.4, 1.5, 0.03));
    cardData.forEach(([d, city, rows]) => {
      const tex = this.keep(dayCard(d, city, rows));
      const side = this.keep(new THREE.MeshBasicMaterial({ color: COL.paper }));
      const m = new THREE.Mesh(cardGeo, [side, side, side, side, this.keep(basic(tex)), side]);
      this.cards.push(m); this.scene.add(m);
    });

    // Split-flap board and ticket
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    chars.split('').forEach(c => { this.flapTex[c] = this.keep(flapLetter(c)); });
    this.flapTex['→'] = this.keep(flapLetter('→', true));
    const flapGeo = this.keep(new THREE.PlaneGeometry(1, 1.25));
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(flapGeo, this.keep(new THREE.MeshBasicMaterial({ map: this.flapTex.A })));
      this.flaps.push(m); this.scene.add(m);
    }
    this.ticket = new THREE.Mesh(this.keep(new THREE.PlaneGeometry(3.6, 1.575)), this.keep(basic(this.keep(ticketTexture()))));
    this.scene.add(this.ticket);
    this.stampRing = new THREE.Mesh(this.keep(new THREE.TorusGeometry(0.42, 0.06, 8, 48)), this.keep(new THREE.MeshBasicMaterial({ color: COL.red, transparent: true })));
    this.scene.add(this.stampRing);

    // Timeline rail
    this.rail = new THREE.Group();
    const railBar = new THREE.Mesh(this.keep(new THREE.CylinderGeometry(0.05, 0.05, 24, 12)), this.keep(std(COL.paper)));
    railBar.rotation.z = Math.PI / 2; railBar.position.x = 8;
    this.rail.add(railBar);
    const stopsData: [string, string][] = [['08:30', '호텔 조식'], ['10:00', '메이지 신궁'], ['12:30', '오모테산도'], ['15:00', '시부야 스카이'], ['18:30', '이자카야'], ['21:00', '야경 산책']];
    const stGeo = this.keep(new THREE.IcosahedronGeometry(0.16, 1));
    const cardG = this.keep(new THREE.PlaneGeometry(2.1, 0.75));
    stopsData.forEach(([time, place], i) => {
      const x = i * 3;
      const st = new THREE.Mesh(stGeo, i === 3 ? redMat : paperMat); st.position.x = x;
      const card = new THREE.Mesh(cardG, this.keep(basic(this.keep(stopCard(time, place, i === 3)), { side: THREE.DoubleSide })));
      card.position.set(x + 0.2, i % 2 ? -0.8 : 0.8, 0);
      this.stations.push(st); this.stops.push(card); this.rail.add(st, card);
    });
    this.nowLine = new THREE.Mesh(this.keep(new THREE.BoxGeometry(0.03, 3.4, 0.03)), this.keep(new THREE.MeshBasicMaterial({ color: COL.red })));
    this.rail.add(this.nowLine);
    this.scene.add(this.rail);

    // Photos, pages and the flip sheet
    const phGeo = this.keep(new THREE.PlaneGeometry(0.9, 1.125));
    for (let i = 0; i < 12; i++) {
      const tex = this.keep(photoTexture(i));
      this.photoCanvases.push(tex.image as HTMLCanvasElement);
      const m = new THREE.Mesh(phGeo, this.keep(basic(tex, { side: THREE.DoubleSide })));
      this.photos.push(m); this.scene.add(m);
    }
    this.pages = new THREE.Group();
    const pageMat = this.keep(new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide }));
    const pageGeo = this.keep(new THREE.PlaneGeometry(2.3, 3.9));
    const lp = new THREE.Mesh(pageGeo, pageMat); lp.position.set(-1.18, 0, -0.02);
    const rp = new THREE.Mesh(pageGeo, pageMat); rp.position.set(1.18, 0, -0.02);
    const spine = new THREE.Mesh(this.keep(new THREE.BoxGeometry(0.02, 3.9, 0.02)), this.keep(new THREE.MeshBasicMaterial({ color: COL.ink })));
    this.pages.add(lp, rp, spine);
    this.scene.add(this.pages);
    this.flipSheet = new THREE.Group();
    const sheet = new THREE.Mesh(pageGeo, this.keep(basic(this.keep(photoTexture(4)), { side: THREE.DoubleSide, transparent: false })));
    sheet.position.x = 1.15;
    this.flipSheet.add(sheet);
    this.scene.add(this.flipSheet);

    // Calendar wall: 7 x 5 cubes; the front shows the day, the back the weather
    this.wall = new THREE.Group();
    const cubeGeo = this.keep(new THREE.BoxGeometry(0.62, 0.62, 0.62));
    const side = this.keep(std('#1c1c1f'));
    const kinds: WeatherKind[] = ['sun', 'sun', 'cloud', 'rain', 'sun', 'cloud', 'snow'];
    const wTex: Record<string, THREE.Texture> = {};
    for (let i = 0; i < 35; i++) {
      const day = i - 2;
      const trip = day >= 12 && day <= 16;
      const kind = kinds[Math.floor(hash(i) * kinds.length)];
      const temp = Math.round(12 + hash(i + 50) * 12);
      const key = `${kind}${temp}`;
      if (!wTex[key]) {
        const t = this.keep(weatherFace(kind, temp));
        t.center.set(0.5, 0.5); t.rotation = Math.PI;
        wTex[key] = t;
      }
      const front = this.keep(basic(this.keep(dayFace(day > 0 && day <= 31 ? day : ((day + 30) % 30) + 1, trip)), { transparent: false }));
      const back = this.keep(basic(wTex[key], { transparent: false }));
      const m = new THREE.Mesh(cubeGeo, [side, side, side, side, front, back]);
      const col = i % 7, row = Math.floor(i / 7);
      m.position.set((col - 3) * 0.7, (2 - row) * 0.7, 0);
      this.cubes.push(m); this.wall.add(m);
    }
    this.scene.add(this.wall);

    // Outro: plan, log, relive
    [this.keep(new THREE.IcosahedronGeometry(0.6, 2)), this.keep(new THREE.CylinderGeometry(0.42, 0.42, 1.2, 28)), this.keep(new THREE.BoxGeometry(1, 1, 1))]
      .forEach((g, i) => { const m = new THREE.Mesh(g, i === 0 ? redMat : this.keep(std(i === 1 ? COL.log : COL.relive))); this.outroShapes.push(m); this.scene.add(m); });
  }

  private buildLogoLayout() {
    const out = this.layouts.logo;
    const n = out.length / 3;
    const vbW = parseFloat(BRAND_LOGO_VIEWBOX.split(' ')[2]);
    const vbH = parseFloat(BRAND_LOGO_VIEWBOX.split(' ')[3]);
    const px = 700, scale = px / vbW, ph = Math.ceil(vbH * scale);
    const oc = document.createElement('canvas');
    oc.width = px; oc.height = ph;
    const o = oc.getContext('2d');
    if (!o) return;
    o.scale(scale, scale);
    BRAND_LOGO_PATHS.forEach(d => o.fill(new Path2D(d)));
    const data = o.getImageData(0, 0, px, ph).data;
    const pts: [number, number][] = [];
    const step = 5;
    for (let y = step / 2; y < ph; y += step) for (let x = step / 2; x < px; x += step) {
      if (data[(Math.floor(y) * px + Math.floor(x)) * 4 + 3] > 128) pts.push([x, y]);
    }
    const w = this.logoW, k = w / px, cy = this.logoCenterY();
    for (let i = 0; i < n; i++) {
      const [x, y] = pts[Math.floor(hash(i) * pts.length)] || [px / 2, ph / 2];
      out[i * 3] = x * k - w / 2;
      out[i * 3 + 1] = cy - (y - ph / 2) * k;
      out[i * 3 + 2] = 0;
    }
  }

  private logoCenterY() { return this.L.portrait ? 0.9 : 0.4; }

  // ---------- helpers ----------
  private project(v: THREE.Vector3) {
    const p = v.clone().project(this.camera);
    return { x: (p.x * 0.5 + 0.5) * this.L.w, y: (-p.y * 0.5 + 0.5) * this.L.h };
  }

  /** Camera around a target: az/el in radians, zoom relative to the fit distance */
  private aim(target: THREE.Vector3, az: number, el: number, zoom: number, b: number) {
    let z = zoom;
    const drums = b >= 8 && !(b >= 92 && b < 96) && b < 100;
    if (!this.calm && drums) z *= 1 - 0.022 * kickPulse(b);
    const d = this.L.dist * z;
    const t = target.clone(); t.y += this.L.offY;
    this.camera.position.set(t.x + d * Math.cos(el) * Math.sin(az), t.y + d * Math.sin(el), t.z + d * Math.cos(el) * Math.cos(az));
    this.camera.lookAt(t);
  }

  private setDots(b: number) {
    const { sphere, flat, logo, h, lat, lng } = this.layouts;
    const n = h.length;
    const p = this.dotPos;
    const mat = this.dots.material as THREE.PointsMaterial;
    this.dots.visible = b >= 5.5 && b < 36;
    if (!this.dots.visible) return;
    const rot = b * 0.06;
    const tilt = 0.32;
    const ct = Math.cos(tilt), st = Math.sin(tilt);
    for (let i = 0; i < n; i++) {
      const la = lat[i] * DEG, ln = lng[i] * DEG + rot;
      const R = 2.05;
      const x = R * Math.cos(la) * Math.sin(ln), y0 = R * Math.sin(la), z0 = R * Math.cos(la) * Math.cos(ln);
      sphere[i * 3] = x; sphere[i * 3 + 1] = y0 * ct - z0 * st + 0.45; sphere[i * 3 + 2] = y0 * st + z0 * ct;
    }
    const mix = (a: Float32Array | null, bb: Float32Array, prog: number) => {
      for (let i = 0; i < n; i++) {
        const q = ease.io3(seg(prog * 1.35 - h[i] * 0.35, 0, 1));
        for (let k = 0; k < 3; k++) {
          const from = a ? a[i * 3 + k] : 0;
          p[i * 3 + k] = lerp(from, bb[i * 3 + k], q);
        }
      }
    };
    if (b < 8) { mix(null, sphere, ease.out3(seg(b, 5.8, 8))); mat.size = 0.075; }
    else if (b < 12) { p.set(sphere); mat.size = 0.075; }
    else if (b < 20) { mix(sphere, logo, seg(b, 12, 16)); mat.size = lerp(0.075, 0.06, seg(b, 12, 16)); }
    else { mix(logo, flat, seg(b, 20, 22.5)); mat.size = lerp(0.06, 0.05, seg(b, 20, 22)); }
    (this.dots.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    const dark = b >= 20;
    mat.color.copy(dark ? PAPER : INK);
    mat.opacity = b >= 20 ? 0.7 : 1 - seg(b, 16.8, 17.8);
  }

  // ---------- frame ----------
  render(t: number) {
    const b = clamp(t / BEAT, 0, TOTAL_BEATS - 0.001);
    const sc = sceneAt(b);
    this.scene.background = (sc.dark ? INK : PAPER).clone();
    [this.shapes, this.pins, this.arcs, this.cards, this.flaps, this.stops, this.photos, this.outroShapes].forEach(list => list.forEach(o => { o.visible = false; }));
    this.ticket.visible = this.stampRing.visible = this.rail.visible = this.pages.visible = this.flipSheet.visible = this.wall.visible = false;

    this.setDots(b);
    const T0 = new THREE.Vector3(0, 0, 0);
    switch (sc.id) {
      case 'hook': this.hook(b); break;
      case 'logo': this.aim(new THREE.Vector3(0, 0.45, 0), lerp(0.5, 0, ease.io3(seg(b, 8, 17))), lerp(0.25, 0, ease.io3(seg(b, 9, 17))), lerp(0.95, 1.05, seg(b, 8, 20)), b); break;
      case 'plan': this.plan(b - sc.start, b); break;
      case 'pick': this.pick(b - sc.start, b); break;
      case 'go': this.go(b - sc.start, b); break;
      case 'log': this.log(b - sc.start, b); break;
      case 'relive': this.relive(b - sc.start, b); break;
      case 'outro': this.outro(b - sc.start, b); break;
    }
    this.renderer.render(this.scene, this.camera);
    this.drawType(t, b);
  }

  private hook(b: number) {
    const out = [[0, 0, 0], [-2.2, 1.1, 0.4], [2.3, 0.9, -0.3], [-1.6, -1.2, 0.6], [1.8, -1.3, 0.2], [0.2, 1.8, -0.8]];
    this.shapes.forEach((m, i) => {
      const a = seg(b, i, i + 0.6);
      if (a <= 0) return;
      m.visible = true;
      const gather = ease.snap(seg(b, 5.6, 6.6));
      const orbit = b * 0.18 + i;
      const [x, y, z] = out[i];
      const r = Math.hypot(x, y);
      const ox = i ? Math.cos(orbit) * r : 0, oy = i ? Math.sin(orbit) * r * 0.55 + y * 0.3 : 0;
      const s = ease.back(a) * (1 + (this.calm ? 0 : 0.12 * kickPulse(b))) * (1 - gather);
      m.position.set(lerp(ox, 0, gather), lerp(oy, 0.3, gather), lerp(z, 0, gather));
      m.scale.setScalar(Math.max(0.0001, s));
      m.rotation.set(b * 0.7 + i, b * 0.9 + i * 2, 0);
    });
    this.aim(new THREE.Vector3(0, 0.45, 0), lerp(0.4, -0.2, seg(b, 0, 8)), 0.22, lerp(0.85, 1.05, seg(b, 0, 8)), b);
  }

  private plan(lb: number, b: number) {
    this.pins.forEach((g, i) => {
      const a = seg(lb, 2 + i, 2.8 + i);
      if (a <= 0) return;
      g.visible = true;
      g.position.y = (1 - ease.back(a)) * 2.4;
      const s = 1 + (a >= 1 ? 0.25 * Math.exp(-(lb - 2.8 - i) * 5) : 0);
      g.scale.set(1, s, 1);
    });
    this.arcs.forEach((m, i) => {
      const a = ease.out3(seg(lb, 7 + i, 9 + i));
      if (a <= 0) return;
      m.visible = true;
      m.geometry.setDrawRange(0, Math.floor(this.arcIndexCounts[i] * a / 6) * 6);
    });
    const portrait = this.L.portrait;
    this.cards.forEach((m, i) => {
      const a = ease.snap(seg(lb, 7 + i, 8.2 + i));
      if (a <= 0) return;
      m.visible = true;
      const base = portrait ? new THREE.Vector3(-0.4, 2.3, 0.6) : new THREE.Vector3(2.3, 0.9, 1.3);
      const tgt = base.clone().add(new THREE.Vector3(i * 0.22, -i * 0.2, i * 0.12));
      m.position.set(tgt.x + (1 - a) * 6, tgt.y + (1 - a) * 1.5, tgt.z);
      m.rotation.set(-0.25, -0.35 + (1 - a) * 1.2, 0.02);
      m.scale.setScalar(portrait ? 0.9 : 0.82);
    });
    const push = ease.io3(seg(lb, 0, 16));
    this.aim(new THREE.Vector3(portrait ? 0 : 0.4, 0, 0), lerp(-0.25, 0.22, push), lerp(0.72, 0.52, push), lerp(0.98, 0.84, push), b);
  }

  private pick(lb: number, b: number) {
    const word = ['T', 'O', 'K', 'Y', 'O', '→'];
    const w = this.L.portrait ? 0.92 : 1.1;
    this.flaps.forEach((m, i) => {
      const inA = ease.back(seg(lb, 0.2 + i * 0.1, 0.9 + i * 0.1));
      if (inA <= 0) return;
      m.visible = true;
      const settle = 2 + i * 0.45;
      const spinning = lb < settle;
      const phase = spinning ? lb * 5 + i * 0.37 : 0;
      const frac = phase % 1;
      const letterIdx = Math.floor(phase + hash(i) * 26) % 26;
      const tex = spinning ? this.flapTex['ABCDEFGHIJKLMNOPQRSTUVWXYZ'[letterIdx]] : this.flapTex[word[i]];
      const mat = m.material as THREE.MeshBasicMaterial;
      if (mat.map !== tex) { mat.map = tex; mat.needsUpdate = true; }
      const squash = spinning ? Math.abs(Math.cos(frac * Math.PI)) : 1;
      const land = spinning ? 0 : Math.exp(-(lb - settle) * 6);
      m.scale.set(inA * w, Math.max(0.05, squash) * inA * (1 + land * 0.12), 1);
      m.rotation.x = spinning ? Math.sin(frac * Math.PI) * 0.5 : 0;
      m.position.set((i - 2.5) * (w + 0.1), 1.2 + (this.L.portrait ? 0.6 : 0), 0);
    });
    const tk = ease.snap(seg(lb, 6.3, 7.6));
    if (tk > 0) {
      this.ticket.visible = true;
      const s = this.L.portrait ? 0.9 : 0.85;
      const tx = this.L.portrait ? 0 : 1.3;
      this.ticket.scale.setScalar(s);
      this.ticket.position.set(tx, lerp(-5, -0.6 + (this.L.portrait ? 0.4 : 0), tk), 0.3);
      this.ticket.rotation.set(-0.12, 0, lerp(0.3, -0.03, tk));
      const st = seg(lb, 8.3, 8.8);
      if (st > 0) {
        this.stampRing.visible = true;
        const m = this.stampRing.material as THREE.MeshBasicMaterial;
        m.opacity = st;
        this.stampRing.scale.setScalar(lerp(3.5, 1, ease.out5(st)) * s);
        this.stampRing.position.set(tx + 1.28 * s, this.ticket.position.y - 0.05, 0.36);
      }
    }
    const shake = !this.calm && lb > 8.5 && lb < 9.3 ? Math.sin(lb * 90) * 0.02 * (9.3 - lb) : 0;
    this.aim(new THREE.Vector3(shake, 0.4, 0), lerp(0.35, -0.12, ease.io3(seg(lb, 0, 12))), 0.12, 1, b);
  }

  private go(lb: number, b: number) {
    this.rail.visible = true;
    this.stops.forEach(m => { m.visible = true; });
    const travel = ease.io3(seg(lb, 0.5, 15));
    const x = lerp(-0.5, 15.5, travel);
    const nowX = lerp(-1, 16, seg(lb, 0.5, 15.5));
    this.aim(new THREE.Vector3(x, 0, 0), -0.55 + Math.sin(lb * 0.2) * 0.08, 0.18, this.L.portrait ? 0.55 : 0.62, b);
    this.nowLine.position.x = nowX;
    this.stops.forEach((m, i) => {
      const passed = nowX > i * 3 + 0.3 && i !== 3;
      (m.material as THREE.MeshBasicMaterial).opacity = passed ? 0.35 : 1;
      const pop = ease.back(seg(lb, i * 2 - 0.5, i * 2 + 0.3));
      m.scale.setScalar(Math.max(0.001, pop) * (i === 3 ? 1.12 : 1));
      m.lookAt(this.camera.position.clone().setY(m.position.y));
    });
    this.stations.forEach((m, i) => { m.scale.setScalar(i === 3 ? 1.4 + (this.calm ? 0 : 0.3 * kickPulse(b)) : 1); });
  }

  private log(lb: number, b: number) {
    const snap = ease.snap(seg(lb, 7, 8.6));
    const cellW = 0.98, cellH = 1.22;
    this.photos.forEach((m, i) => {
      const a = ease.back(seg(lb, 0.5 + i * 0.5, 1 + i * 0.5));
      if (a <= 0) return;
      m.visible = true;
      const sx = (hash(i) - 0.5) * 8, sy = (hash(i + 20) - 0.5) * 4.4, sz = -2 + hash(i + 40) * 3;
      const page = i < 6 ? -1 : 1;
      const k = i % 6;
      const gy = (1 - Math.floor(k / 2)) * cellH;
      const tx = page < 0 ? -0.66 - (1 - (k % 2)) * cellW : 0.66 + (k % 2) * cellW;
      m.position.set(lerp(sx, tx, snap), lerp(sy, gy, snap), lerp(sz, 0.02, snap));
      m.rotation.set(lerp((hash(i + 60) - 0.5) * 1.2, 0, snap), lerp((hash(i + 80) - 0.5) * 1.6 + lb * 0.1, 0, snap), lerp((hash(i + 90) - 0.5) * 0.6, 0, snap));
      m.scale.setScalar(a * 0.94);
    });
    if (snap > 0) {
      this.pages.visible = true;
      this.pages.scale.setScalar(snap);
    }
    [8, 10, 12].forEach(p => {
      const f = seg(lb, p, p + 1.1);
      if (f > 0 && f < 1) {
        this.flipSheet.visible = true;
        this.flipSheet.rotation.y = -Math.PI * ease.io3(f);
        this.flipSheet.position.z = 0.05;
      }
    });
    const s = this.L.portrait ? 0.84 : 1;
    this.aim(new THREE.Vector3(0, 0, 0), lerp(0.45, 0, snap), lerp(0.3, 0.12, snap), lerp(1.05, 0.82 / s, snap), b);
  }

  private relive(lb: number, b: number) {
    this.wall.visible = true;
    this.wall.rotation.set(-0.22, 0.34 - lb * 0.012, 0);
    const zoomCube = 17; // day 15, a trip day
    this.cubes.forEach((m, i) => {
      const col = i % 7, row = Math.floor(i / 7);
      const wave = (col + row) * 0.12;
      const pop = ease.back(seg(lb, 0.2 + wave, 0.9 + wave));
      const flip = ease.snap(seg(lb, 3.6 + wave, 4.6 + wave));
      m.scale.setScalar(Math.max(0.001, pop));
      m.rotation.x = flip * Math.PI;
      m.position.z = i === zoomCube ? ease.io3(seg(lb, 8, 10)) * 2.2 : 0;
      if (i === zoomCube) m.scale.multiplyScalar(1 + ease.io3(seg(lb, 8, 10)) * 3);
    });
    this.wall.updateMatrixWorld(true);
    const dive = ease.io3(seg(lb, 7.5, 10));
    const tgt = this.cubes[zoomCube].getWorldPosition(new THREE.Vector3());
    const center = new THREE.Vector3(0, this.L.portrait ? 0.5 : 0.2, 0).lerp(tgt, dive);
    this.aim(center, lerp(0.2, 0, dive), lerp(0.1, 0, dive), lerp(0.9, 0.28, dive), b);
  }

  private outro(lb: number, b: number) {
    const gap = this.L.portrait ? 2 : 2.8;
    const collapse = ease.snap(seg(lb, 6, 7.2));
    this.outroShapes.forEach((m, i) => {
      const a = seg(lb, 1 + i * 1.5, 1.6 + i * 1.5);
      if (a <= 0) return;
      m.visible = collapse < 1;
      const land = lb - (1.6 + i * 1.5);
      const squash = land > 0 ? 1 - 0.18 * Math.exp(-land * 6) * Math.cos(land * 20) : 1;
      m.position.set(lerp((i - 1) * gap, 0, collapse), lerp(lerp(3, 0.5, ease.out3(a)), 0.5, collapse), 0);
      m.scale.set(1 / squash, squash, 1 / squash).multiplyScalar(ease.back(a) * (1 - collapse) + 0.0001);
      m.rotation.set(0.35, lb * 0.5 + i, 0);
    });
    this.aim(new THREE.Vector3(0, 0.4, 0), lerp(0.18, 0, seg(lb, 0, 8)), 0.14, 1, b);
  }

  // ---------- type layer ----------
  private drawType(t: number, b: number) {
    const g = this.g;
    const { w, h, portrait, u } = this.L;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const sc = sceneAt(b);
    const fg = sc.dark ? COL.paper : COL.ink;
    const mx = (portrait ? 64 : 96) * u;
    const baseY = h - (portrait ? 330 : 190) * u;

    // Reel: the cube opens onto a playing Memory Reel with the shared dock
    if (sc.id === 'relive' && b >= 87.4) this.drawReel(b);
    if (sc.id === 'outro') this.drawOutro(b);

    // Scene label above the line
    const idx = SCENES.indexOf(sc);
    const line = LINES.find(([a, z]) => b >= a && b < z);
    if (line && sc.id !== 'logo') {
      const la = seg(b, line[0], line[0] + 0.5) * (1 - seg(b, line[1] - 0.4, line[1]));
      g.globalAlpha = la;
      g.fillStyle = COL.red;
      g.fillRect(mx, baseY - (line[3] === 'xl' ? 118 : 84) * u, 28 * u, 3 * u);
      g.font = `700 ${22 * u}px ${FONT_MONO}`;
      g.fillStyle = fg;
      g.textBaseline = 'alphabetic';
      g.fillText(`${String(idx + 1).padStart(2, '0')}  ${sc.label.toUpperCase()}`, mx + 40 * u, baseY - (line[3] === 'xl' ? 110 : 76) * u);
      g.globalAlpha = 1;
    }
    if (line) {
      const size = (line[3] === 'xl' ? (portrait ? 86 : 96) : (portrait ? 58 : 62)) * u;
      const center = sc.id === 'logo';
      const y = center ? this.project(new THREE.Vector3(0, this.logoCenterY() - (this.logoW / 5.59) / 2, 0)).y + 110 * u : baseY;
      this.kinetic(line[2], center ? w / 2 : mx, y, size, (b - line[0]) * BEAT, (line[1] - b) * BEAT, fg, center, w - mx * 2);
    }

    // Logo: the vector logotype takes over from the dots
    if (this.logoImg && b >= 16.5 && b < 20) {
      const a = seg(b, 16.5, 17.8) * (1 - seg(b, 19.4, 20));
      this.drawLogo(this.logoCenterY(), a, this.logoW);
    }


    // Scene cuts: a red hairline sweeps across
    for (const s of SCENES) {
      if (!s.start) continue;
      const d = (b - s.start) / 0.5;
      if (d > -1 && d < 1) {
        const p = (d + 1) / 2;
        g.fillStyle = COL.red;
        const bh = 10 * u;
        g.fillRect(-w * 0.3 + p * w * 1.6 - w * 0.3, h * 0.5 - bh / 2, w * 0.3, bh);
      }
    }
  }

  private drawLogo(cy: number, alpha: number, worldW: number) {
    if (!this.logoImg || alpha <= 0) return;
    const a = this.project(new THREE.Vector3(-worldW / 2, cy + worldW / 5.59 / 2, 0));
    const z = this.project(new THREE.Vector3(worldW / 2, cy - worldW / 5.59 / 2, 0));
    this.drawLogoRect(a.x, a.y, z.x - a.x, z.y - a.y, alpha, false);
  }

  private drawLogoRect(x: number, y: number, w: number, h: number, alpha: number, light: boolean) {
    if (!this.logoImg) return;
    const g = this.g;
    g.save();
    g.globalAlpha = alpha;
    if (light) g.filter = 'invert(1)';
    g.drawImage(this.logoImg, x, y, w, h);
    g.restore();
  }

  private kinetic(text: string, x: number, y: number, size: number, sIn: number, sOut: number, color: string, center: boolean, maxW: number) {
    const g = this.g;
    g.font = `800 ${size}px ${FONT_SANS}`;
    let total = g.measureText(text).width;
    let fs = size;
    if (total > maxW) { fs = size * (maxW / total); g.font = `800 ${fs}px ${FONT_SANS}`; total = maxW; }
    let cx = center ? x - total / 2 : x;
    g.save();
    g.beginPath();
    g.rect(0, y - fs * 1.05, this.L.w, fs * 1.4);
    g.clip();
    g.fillStyle = color;
    g.textBaseline = 'alphabetic';
    const chars = Array.from(text);
    chars.forEach((ch, i) => {
      const inP = ease.expo(seg(sIn - i * 0.028, 0, 0.5));
      const outP = ease.io3(seg(0.45 - sOut + i * 0.012, 0, 0.4));
      const dy = (1 - inP) * fs * 1.1 - outP * fs * 1.2;
      g.fillText(ch, cx, y + dy);
      cx += g.measureText(ch).width;
    });
    g.restore();
  }

  private drawReel(b: number) {
    const g = this.g;
    const { w, h, u } = this.L;
    const a = seg(b, 87.4, 88.2);
    const img = this.photoCanvases[b < 89.8 ? 1 : 4];
    const k = 1.04 + ((b - 87.4) % 2.4) / 2.4 * 0.08;
    g.save();
    g.globalAlpha = a;
    g.fillStyle = COL.ink; g.fillRect(0, 0, w, h);
    // Portrait fills the frame; landscape shows the shot as a 4:5 card
    const fw = this.L.portrait ? w : h * 0.8 * 0.8, fh = this.L.portrait ? h : h * 0.8;
    const fx = (w - fw) / 2, fy = this.L.portrait ? 0 : h * 0.07;
    const scale = Math.max(fw / img.width, fh / img.height) * k;
    g.save(); g.beginPath(); g.rect(fx, fy, fw, fh); g.clip();
    g.drawImage(img, fx + (fw - img.width * scale) / 2, fy + (fh - img.height * scale) / 2, img.width * scale, img.height * scale);
    g.restore();
    const grd = g.createLinearGradient(0, h * 0.45, 0, h);
    grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(0,0,0,.72)');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    // Top segments
    const n = 6, gap = 6 * u, m = 48 * u, sw = (w - m * 2 - gap * (n - 1)) / n;
    for (let i = 0; i < n; i++) {
      g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(m + i * (sw + gap), 40 * u, sw, 3 * u);
      const f = i < 1 ? 1 : i === 1 ? seg(b, 88, 92) : 0;
      g.fillStyle = i === 1 ? COL.red : '#fff'; g.fillRect(m + i * (sw + gap), 40 * u, sw * f, 3 * u);
    }
    // Dock pill
    const pw = 300 * u, ph = 76 * u, px = (w - pw) / 2, py = h - ph - 48 * u;
    g.fillStyle = 'rgba(0,0,0,.6)'; g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 1.5 * u;
    g.beginPath(); g.roundRect(px, py, pw, ph, ph / 2); g.fill(); g.stroke();
    const cy = py + ph / 2;
    g.fillStyle = '#fff'; g.beginPath(); g.arc(w / 2, cy, 30 * u, 0, Math.PI * 2); g.fill();
    g.fillStyle = COL.ink; g.fillRect(w / 2 - 9 * u, cy - 11 * u, 6 * u, 22 * u); g.fillRect(w / 2 + 3 * u, cy - 11 * u, 6 * u, 22 * u);
    g.strokeStyle = '#fff'; g.lineWidth = 4 * u; g.lineCap = 'round';
    [[-1, w / 2 - 80 * u], [1, w / 2 + 80 * u]].forEach(([dir, x]) => { g.beginPath(); g.moveTo(x - dir * 5 * u, cy - 10 * u); g.lineTo(x + dir * 5 * u, cy); g.lineTo(x - dir * 5 * u, cy + 10 * u); g.stroke(); });
    g.restore();
  }

  private drawOutro(b: number) {
    const g = this.g;
    const { w, h, u, portrait } = this.L;
    // Labels under the three shapes
    const words: [string, string][] = [['PLAN', '계획'], ['LOG', '기록'], ['RELIVE', '회상']];
    const gap = portrait ? 2 : 2.8;
    const fade = 1 - seg(b, 97.5, 98.4);
    words.forEach(([en, ko], i) => {
      const a = seg(b, 93.4 + i * 1.5, 94 + i * 1.5) * fade;
      if (a <= 0) return;
      const p = this.project(new THREE.Vector3((i - 1) * gap, -0.55, 0));
      g.globalAlpha = a;
      g.textAlign = 'center';
      g.fillStyle = [COL.red, COL.log, COL.relive][i]; g.font = `700 ${22 * u}px ${FONT_MONO}`; g.fillText(en, p.x, p.y + 34 * u);
      g.fillStyle = COL.ink; g.font = `800 ${(portrait ? 64 : 72) * u}px ${FONT_SANS}`; g.fillText(ko, p.x, p.y + (portrait ? 104 : 112) * u);
      g.textAlign = 'start';
      g.globalAlpha = 1;
    });
    // Logo, hairline and call to action
    const la = seg(b, 98.4, 99.4);
    if (la > 0 && this.logoImg) {
      const lw = (portrait ? 720 : 760) * u, lh = lw / 5.586;
      const lx = (w - lw) / 2, ly = h * (portrait ? 0.4 : 0.36) - lh / 2 + (1 - ease.out3(la)) * 30 * u;
      this.drawLogoRect(lx, ly, lw, lh, la, false);
      const line = ease.out3(seg(b, 99, 100.2));
      g.fillStyle = COL.red; g.fillRect(w / 2 - (lw / 2) * line, ly + lh + 40 * u, lw * line, 3 * u);
      const ca = ease.back(seg(b, 100, 100.8));
      if (ca > 0 && this.cta) {
        const bw = 360 * u * ca, bh = 88 * u, bx = w / 2 - bw / 2, by = ly + lh + 90 * u;
        g.fillStyle = COL.ink; g.beginPath(); g.roundRect(bx, by, bw, bh, bh / 2); g.fill();
        if (ca > 0.6) {
          g.fillStyle = COL.paper; g.font = `800 ${34 * u}px ${FONT_SANS}`; g.textAlign = 'center';
          g.fillText('지금 시작하기', w / 2, by + bh / 2 + 12 * u);
          g.textAlign = 'start';
        }
        g.fillStyle = 'rgba(11,11,12,.6)'; g.font = `600 ${22 * u}px ${FONT_MONO}`; g.textAlign = 'center';
        g.fillText('PLAN · LOG · RELIVE', w / 2, by + bh + 70 * u);
        g.textAlign = 'start';
      }
    }
  }
}
