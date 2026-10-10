/* Skrivbordet: jonasvonessen.se som ett leksaksaktigt skrivbord en sen kväll.
   Allt modelleras här av enkla former (rundade lådor, svarvade profiler) och
   allt mönster ritas på canvas, så det finns inga modellfiler att ladda.
   ?direkt hoppar över intron, ?utsikt=villa byter utsikt och ?dag börjar på dagen. */
import * as T from './three.js';

const param = new URLSearchParams(location.search);
const reducerad = matchMedia('(prefers-reduced-motion: reduce)').matches;
const direkt = reducerad || param.has('direkt');
const UTSIKT = param.get('utsikt') === 'villa' ? 'villa' : 'stad';
const DAG_FRAN_START = param.has('dag');
const grov = matchMedia('(pointer: coarse)').matches;
const LAG = grov || Math.min(innerWidth, innerHeight) < 600;
const rot = document.documentElement;
const laddar = document.getElementById('laddar');

const duk = document.getElementById('duk');
let renderer;
try {
  renderer = new T.WebGLRenderer({ canvas: duk, antialias: false, powerPreference: 'default' });
  if (!renderer.getContext()) throw new Error('ingen kontext');
} catch (e) {
  rot.classList.add('ingen-webgl');
  laddar.classList.add('borta');
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, LAG ? 1.5 : 2));
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFShadowMap;
renderer.shadowMap.autoUpdate = false;          // skuggan ritas bara om när något som kastar skugga rör sig
renderer.shadowMap.needsUpdate = true;
renderer.transmissionResolutionScale = LAG ? 0.5 : 0.75;
const ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());

const scen = new T.Scene();
scen.background = new T.Color('#06070c');
const kam = new T.PerspectiveCamera(30, innerWidth / innerHeight, 0.1, 220);

const pmrem = new T.PMREMGenerator(renderer);
scen.environment = pmrem.fromScene(new T.RoomEnvironment(), 0.04).texture;
scen.environmentIntensity = 0.14;
duk.addEventListener('webglcontextrestored', () => {      // miljökartan försvinner med en tappad kontext
  const g = new T.PMREMGenerator(renderer);
  const env = g.fromScene(new T.RoomEnvironment(), 0.04).texture;
  scen.environment = env; glasMat.envMap = env; glasMat.needsUpdate = true;
  g.dispose(); renderer.shadowMap.needsUpdate = true;
});

/* ————— små verktyg ————— */
function slump(fro) {
  return function () {
    fro |= 0; fro = fro + 0x6D2B79F5 | 0;
    let t = Math.imul(fro ^ fro >>> 15, 1 | fro);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function yta(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function textur(c, srgb = true) {
  const t = new T.CanvasTexture(c);
  if (srgb) t.colorSpace = T.SRGBColorSpace;
  t.anisotropy = ANISO;
  return t;
}
function std(color, o = {}) { return new T.MeshStandardMaterial(Object.assign({ color, roughness: 0.62, metalness: 0 }, o)); }
function lada(w, h, d, r, seg = 4) { return new T.RoundedBoxGeometry(w, h, d, seg, Math.min(r, Math.min(w, h, d) / 2 - 1e-3)); }
function nat(geo, mat, p = {}) {
  const o = new T.Mesh(geo, mat);
  o.position.set(p.x || 0, p.y || 0, p.z || 0);
  o.rotation.set(p.rx || 0, p.ry || 0, p.rz || 0);
  if (p.s) typeof p.s === 'number' ? o.scale.setScalar(p.s) : o.scale.set(...p.s);
  o.castShadow = p.kasta !== false;
  o.receiveShadow = p.ta !== false;
  return o;
}
function grupp(p = {}) {
  const g = new T.Group();
  g.position.set(p.x || 0, p.y || 0, p.z || 0);
  g.rotation.set(p.rx || 0, p.ry || 0, p.rz || 0);
  return g;
}
function rundRekt(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
}
function oskarpt(c, steg) {           // nedskalning och uppskalning: mjuk oskärpa i alla webbläsare
  const [s, sg] = yta(Math.max(1, c.width / steg | 0), Math.max(1, c.height / steg | 0));
  sg.imageSmoothingEnabled = true; sg.imageSmoothingQuality = 'high';
  sg.drawImage(c, 0, 0, s.width, s.height);
  const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(s, 0, 0, c.width, c.height);
}
function laddaBild(src) {
  return new Promise(res => { const b = new Image(); b.onload = () => res(b); b.onerror = () => res(null); b.src = src; });
}
const HAND = '"Caveat", "Comic Sans MS", cursive';
const MONO = '"JetBrains Mono", ui-monospace, monospace';

/* ————— texturer ritade på canvas ————— */
function traTextur() {
  const [c, g] = yta(1024, 512);
  const bas = g.createLinearGradient(0, 0, 0, 512);
  bas.addColorStop(0, '#7e4f31'); bas.addColorStop(0.5, '#8d5b3a'); bas.addColorStop(1, '#7a4b2e');
  g.fillStyle = bas; g.fillRect(0, 0, 1024, 512);
  const r = slump(7);
  for (let i = 0; i < 190; i++) {
    const y = r() * 512, amp = 2 + r() * 9, frek = 0.003 + r() * 0.009, fas = r() * 6.28;
    g.strokeStyle = r() < 0.55 ? `rgba(58,32,18,${0.07 + r() * 0.16})` : `rgba(176,122,80,${0.06 + r() * 0.14})`;
    g.lineWidth = 0.6 + r() * 2.6;
    g.beginPath();
    for (let x = -8; x <= 1032; x += 8) {
      const yy = y + Math.sin(x * frek + fas) * amp + Math.sin(x * frek * 3.3 + fas * 2) * amp * 0.3;
      x < 0 ? g.moveTo(x, yy) : g.lineTo(x, yy);
    }
    g.stroke();
  }
  for (let k = 0; k < 3; k++) {
    const x = 120 + r() * 780, y = 60 + r() * 390;
    for (let j = 1; j < 10; j++) {
      g.strokeStyle = `rgba(66,36,20,${0.26 - j * 0.022})`; g.lineWidth = 1.3;
      g.beginPath(); g.ellipse(x, y, j * 8, j * 3.1, 0, 0, 6.283); g.stroke();
    }
  }
  return textur(c);
}

function moln(g, r, antal, x0, x1, y0, y1, storlek) {      // mjuka stackmoln av överlappande ellipser
  for (let i = 0; i < antal; i++) {
    const cx = x0 + r() * (x1 - x0), cy = y0 + r() * (y1 - y0), b = storlek * (0.7 + r() * 0.9);
    for (let j = 0; j < 7; j++) {
      g.fillStyle = `rgba(255,255,255,${0.32 + r() * 0.3})`;
      g.beginPath(); g.ellipse(cx + (r() - 0.5) * b * 2.2, cy + (r() - 0.5) * b * 0.35, b * (0.45 + r() * 0.5), b * (0.22 + r() * 0.22), 0, 0, 6.283); g.fill();
    }
  }
}

function stadTextur(dag = false) {
  const W = 2048, H = 512;
  const [c, g] = yta(W, H);
  const himmel = g.createLinearGradient(0, 0, 0, H);
  if (dag) { himmel.addColorStop(0, '#4f8fd6'); himmel.addColorStop(0.45, '#86b8e8'); himmel.addColorStop(0.8, '#c3dbef'); himmel.addColorStop(1, '#e6eef2'); }
  else { himmel.addColorStop(0, '#04060d'); himmel.addColorStop(0.45, '#0b0e1d'); himmel.addColorStop(0.8, '#1d1630'); himmel.addColorStop(1, '#2a1d38'); }
  g.fillStyle = himmel; g.fillRect(0, 0, W, H);
  if (dag) moln(g, slump(404), 9, 0, W, H * 0.06, H * 0.36, 70);
  const r = slump(2026);
  const lager = dag ? [
    { farg: '#a9b6c6', fonster: '#8ea6c2', topp: [0.34, 0.58], bredd: [40, 110], n: 46, tand: 0.055, fs: [5, 7] },
    { farg: '#8693a5', fonster: '#6f87a3', topp: [0.42, 0.7], bredd: [70, 150], n: 30, tand: 0.09, fs: [6, 9] },
    { farg: '#5f6878', fonster: '#566c86', topp: [0.55, 0.82], bredd: [100, 200], n: 20, tand: 0.12, fs: [8, 11] },
  ] : [
    { farg: '#1a1d2f', fonster: '#232742', topp: [0.34, 0.58], bredd: [40, 110], n: 46, tand: 0.055, fs: [5, 7] },
    { farg: '#11141f', fonster: '#181c2c', topp: [0.42, 0.7], bredd: [70, 150], n: 30, tand: 0.09, fs: [6, 9] },
    { farg: '#0a0c14', fonster: '#10131e', topp: [0.55, 0.82], bredd: [100, 200], n: 20, tand: 0.12, fs: [8, 11] },
  ];
  const ljus = ['#ffd08a', '#ffd08a', '#ffc070', '#ffe2b0', '#a9c4ff', '#ff9fbf'];
  for (const L of lager) {
    for (let i = 0; i < L.n; i++) {
      const w = L.bredd[0] + r() * (L.bredd[1] - L.bredd[0]);
      const x = r() * (W + 200) - 100;
      const top = H * (L.topp[0] + r() * (L.topp[1] - L.topp[0]));
      g.fillStyle = L.farg; g.fillRect(x, top, w, H - top);
      if (r() < 0.3) { g.fillRect(x + w * 0.4, top - 18 - r() * 30, 3, 40); }        // antenn
      if (r() < 0.2) { g.fillRect(x + w * 0.15, top - 10, w * 0.25, 10); }           // vattentank
      const fs = L.fs[0] + r() * (L.fs[1] - L.fs[0]);
      for (let yy = top + 8; yy < H - 4; yy += fs * 2.1) {
        for (let xx = x + 6; xx < x + w - fs; xx += fs * 1.8) {
          // samma slumpföljd natt och dag, så att husen står på samma ställen
          const tand = r() < L.tand;
          const lampa = tand ? ljus[(r() * ljus.length) | 0] : null, styrka = tand ? 0.75 + r() * 0.25 : 0.4;
          g.fillStyle = dag ? (tand ? '#dbe9f6' : L.fonster) : (lampa || L.fonster);
          g.globalAlpha = dag ? (tand ? 0.7 : 0.6) : styrka;
          g.fillRect(xx, yy, fs, fs * 1.3);
        }
      }
      g.globalAlpha = 1;
    }
  }
  oskarpt(c, 4);
  if (dag) return textur(c);
  // bokeh: mjuka skivor med ljusare kant, som ur fokus genom en kameralins
  const farger = [[255, 214, 160], [255, 170, 200], [255, 240, 225], [180, 205, 255], [255, 196, 120]];
  for (let i = 0; i < 46; i++) {
    const x = r() * W, y = H * (0.2 + r() * 0.75), rad = 4 + r() * r() * 24;
    const [cr, cg, cb] = farger[(r() * farger.length) | 0];
    const a = 0.25 + r() * 0.55;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, `rgba(${cr},${cg},${cb},${a * 0.6})`);
    gr.addColorStop(0.78, `rgba(${cr},${cg},${cb},${a * 0.7})`);
    gr.addColorStop(0.93, `rgba(${cr},${cg},${cb},${a})`);
    gr.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, 6.283); g.fill();
  }
  return textur(c);
}


/* ————— villaområdet: tre lager på olika avstånd, så att parallaxen ger djup ————— */
function villaLager(bredd, hojd, cy, oskarpa, rita, efter) {
  const W = 2048, H = Math.round(hojd * W / bredd), s = W / bredd;
  const [c, g] = yta(W, H);
  const varld = () => g.setTransform(s, 0, 0, -s, W / 2, (cy + hojd / 2) * s);   // ritar i scenens enheter, y uppåt
  varld(); rita(g);
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (oskarpa) oskarpt(c, oskarpa);
  if (efter) { varld(); efter(g); g.setTransform(1, 0, 0, 1, 0, 0); }
  return textur(c);
}
function bokehPrick(g, x, y, rad, [cr, cg, cb], a) {
  const gr = g.createRadialGradient(x, y, 0, x, y, rad);
  gr.addColorStop(0, `rgba(${cr},${cg},${cb},${a * 0.6})`);
  gr.addColorStop(0.78, `rgba(${cr},${cg},${cb},${a * 0.7})`);
  gr.addColorStop(0.93, `rgba(${cr},${cg},${cb},${a})`);
  gr.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, 6.283); g.fill();
}
const VARM = ['#ffcc78', '#ffd99a', '#ffbf66', '#ffe3b0', '#ffcc78'];

function villaHimmel(dag = false) {
  const r = slump(77);
  return villaLager(120, 34, 6, 5, g => {
    const sky = g.createLinearGradient(0, 23, 0, -11);
    if (dag) {
      sky.addColorStop(0, '#3f82d0'); sky.addColorStop(0.5, '#73aee6'); sky.addColorStop(0.72, '#a9cdee');
      sky.addColorStop(0.84, '#d6e6f0'); sky.addColorStop(1, '#c9d9c2');
    } else {
      sky.addColorStop(0, '#03060e'); sky.addColorStop(0.5, '#08112a'); sky.addColorStop(0.7, '#15203f');
      sky.addColorStop(0.78, '#2d2a42'); sky.addColorStop(0.84, '#3d2e38'); sky.addColorStop(1, '#1c1620');
    }
    g.fillStyle = sky; g.fillRect(-60, -11, 120, 34);
    if (dag) moln(g, slump(505), 14, -60, 60, 3, 17, 2.2);
    g.fillStyle = dag ? '#4a6b45' : '#070a11'; g.beginPath(); g.moveTo(-60, -11);         // skogsbrynet
    for (let x = -60; x <= 60; x += 0.3) {
      const y = -2.4 + Math.sin(x * 0.07) * 1.0 + Math.sin(x * 0.29 + 1) * 0.35 + (r() - 0.5) * 0.45 + (r() < 0.08 ? 0.5 : 0);
      g.lineTo(x, y);
    }
    g.lineTo(60, -11); g.closePath(); g.fill();
    const GARD = ['#9b3a32', '#e8e2d6', '#c9a557', '#9b3a32', '#e8e2d6'];
    for (let i = 0; i < 46; i++) {                                    // avlägsna gårdar i brynet: ljus på natten, hus på dagen
      const f = (r() * VARM.length) | 0;
      g.fillStyle = dag ? GARD[f] : VARM[f]; g.globalAlpha = dag ? 0.85 : 0.45 + r() * 0.45;
      if (dag) r();
      g.fillRect(-58 + r() * 116, -6.5 + r() * 3.4, 0.12 + r() * 0.12, 0.1 + r() * 0.08);
    }
    g.globalAlpha = 1;
  }, g => {
    if (dag) return;
    for (let i = 0; i < 190; i++) {                                   // stjärnor
      g.fillStyle = `rgba(235,240,255,${0.2 + r() * 0.65})`;
      g.beginPath(); g.arc(-60 + r() * 120, 0.5 + r() * 22, 0.025 + r() * 0.05, 0, 6.283); g.fill();
    }
    const mx = 8, my = 2.2;                                           // månen, ovanför klockan
    const glod = g.createRadialGradient(mx, my, 0.6, mx, my, 5.5);
    glod.addColorStop(0, 'rgba(210,222,255,0.28)'); glod.addColorStop(1, 'rgba(210,222,255,0)');
    g.fillStyle = glod; g.beginPath(); g.arc(mx, my, 5.5, 0, 6.283); g.fill();
    const disk = g.createRadialGradient(mx - 0.25, my + 0.25, 0.1, mx, my, 0.95);
    disk.addColorStop(0, '#fbf7ea'); disk.addColorStop(1, '#ddd6c2');
    g.fillStyle = disk; g.beginPath(); g.arc(mx, my, 0.95, 0, 6.283); g.fill();
    g.fillStyle = 'rgba(160,150,130,0.22)';
    for (const [dx, dy, rr] of [[-0.3, 0.2, 0.22], [0.25, -0.15, 0.16], [0.1, 0.42, 0.11], [-0.1, -0.4, 0.13]]) { g.beginPath(); g.arc(mx + dx, my + dy, rr, 0, 6.283); g.fill(); }
  });
}

function villaHus(dag = false) {
  const r = slump(314159);
  const lampor = [];
  // färger: [natt, dag]
  const F = (natt, d) => dag ? d : natt;
  const tex = villaLager(90, 16, -1, 4, g => {
    for (let x = -45; x < 45; x += 1.2 + r() * 2.0) {                 // trädkronor bakom husen
      g.fillStyle = r() < 0.5 ? F('#0a100f', '#3f6b3b') : F('#0c1212', '#4f7d46');
      if (r() < 0.35) {
        const h = 2.6 + r() * 2.2, b = 1.0 + r() * 0.7, y0 = -1.3;
        if (dag) g.fillStyle = '#2f5532';
        g.beginPath(); g.moveTo(x - b, y0); g.lineTo(x, y0 + h); g.lineTo(x + b, y0); g.closePath(); g.fill();
      } else {
        g.beginPath(); g.ellipse(x, 0 + r() * 1.5, 1.2 + r() * 1.1, 1.3 + r() * 1.0, 0, 0, 6.283); g.fill();
      }
    }
    const hus = (x, bas, k, fasader, andelTand) => {                  // k skalar huset, bakre raden är mindre
      const b = (3.4 + r() * 2.6) * k, h = (2.1 + r() * 1.2) * k, tak = (1.1 + r() * 1.0) * k, valm = r() < 0.3;
      if (r() < 0.35) { g.fillStyle = F('#1b1e26', '#8d8f94'); g.fillRect(x + b, bas, 1.9 * k, 1.5 * k); }   // garage
      g.fillStyle = fasader[(r() * fasader.length) | 0]; g.fillRect(x, bas, b, h);
      const takform = () => {
        g.beginPath(); g.moveTo(x - 0.35 * k, bas + h);
        if (valm) { g.lineTo(x + b * 0.3, bas + h + tak * 0.8); g.lineTo(x + b * 0.7, bas + h + tak * 0.8); } else g.lineTo(x + b / 2, bas + h + tak);
        g.lineTo(x + b + 0.35 * k, bas + h);
      };
      g.fillStyle = F('#151924', '#3b3c44'); takform(); g.closePath(); g.fill();
      if (r() < 0.6) g.fillRect(x + b * 0.64, bas + h + tak * 0.3, 0.32 * k, tak * 0.72);   // skorsten
      g.strokeStyle = F('rgba(120,135,175,0.55)', 'rgba(255,255,255,0.4)'); g.lineWidth = 0.09 * k; takform(); g.stroke();   // månsken eller sol på takfoten
      const rader = h > 2.75 * k ? 2 : 1, kol = b > 4.6 * k ? 3 : 2;
      for (let ri = 0; ri < rader; ri++) for (let ki = 0; ki < kol; ki++) {
        const fx = x + (ki + 0.5) * (b / kol) - 0.3 * k, fy = bas + (0.55 + ri * 1.25) * k;
        const tand = r() < andelTand;
        const lampa = tand ? (r() < 0.12 ? '#9fb8ff' : VARM[(r() * VARM.length) | 0]) : null;
        if (dag) {                                                    // vit karm och glas som speglar himlen
          g.fillStyle = '#f2efe8'; g.fillRect(fx - 0.05 * k, fy - 0.05 * k, 0.7 * k, 0.76 * k);
          g.fillStyle = '#5f7f9f'; g.fillRect(fx, fy, 0.6 * k, 0.66 * k);
          g.fillStyle = '#f2efe8'; g.fillRect(fx + 0.28 * k, fy, 0.04 * k, 0.66 * k); g.fillRect(fx, fy + 0.31 * k, 0.6 * k, 0.04 * k);
          continue;
        }
        g.fillStyle = lampa || '#252a3a';
        g.globalAlpha = tand ? 0.95 : 0.55;
        g.fillRect(fx, fy, 0.6 * k, 0.66 * k);
        if (tand) { g.fillStyle = 'rgba(20,16,12,0.55)'; g.fillRect(fx + 0.28 * k, fy, 0.04 * k, 0.66 * k); g.fillRect(fx, fy + 0.31 * k, 0.6 * k, 0.04 * k); }
        g.globalAlpha = 1;
      }
      if (!valm && r() < 0.5) {                                       // runt vindsfönster
        const lyser = r() < 0.5, lampa = lyser ? VARM[(r() * VARM.length) | 0] : '#252a3a';
        g.fillStyle = dag ? '#5f7f9f' : lampa;
        g.beginPath(); g.arc(x + b / 2, bas + h + tak * 0.38, 0.22 * k, 0, 6.283); g.fill();
      }
      const dx = x + b * (0.2 + r() * 0.15);                          // dörr och verandalampa
      g.fillStyle = F('#0e0f14', '#5a3b2a'); g.fillRect(dx, bas, 0.55 * k, 1.05 * k);
      if (r() < 0.75) lampor.push({ x: dx + 0.27 * k, y: bas + 1.25 * k, rad: (0.22 + r() * 0.12) * k, rgb: [255, 205, 140], a: 0.75 });
      return b;
    };
    for (let x = -45 + r() * 2; x < 45;) x += hus(x, -1.75 + r() * 0.2, 0.62, F(['#1d1a20', '#1a1d26', '#201c1c', '#1c2024'], ['#9a6f66', '#b9b08e', '#cfcdc6', '#8f9eaf']), 0.4) + 0.8 + r() * 1.8;
    g.fillStyle = F('#0a0d10', '#3a6136');                            // buskar framför bakre raden
    for (let hx = -45; hx < 45; hx += 0.9 + r() * 1.0) { g.beginPath(); g.ellipse(hx, -1.8, 0.7 + r() * 0.5, 0.3 + r() * 0.18, 0, 0, 6.283); g.fill(); }
    // främre raden: falurött, gult, vitt, blågrått och grönt (nedtonat av natten)
    for (let x = -45 + r() * 2; x < 45;) x += hus(x, -3.3 + r() * 0.3, 1, F(['#3a2224', '#38321f', '#353843', '#272d3b', '#26302b'], ['#a5463c', '#d8b65e', '#e6e1d6', '#7f95ab', '#86a184']), 0.48) + (r() < 0.35 ? 1.9 : 0) + 1.3 + r() * 2.2;
    g.fillStyle = F('#090c10', '#2f5a30');                            // häckar och staket längs tomterna
    for (let hx = -45; hx < 45; hx += 1.1 + r() * 1.2) { g.beginPath(); g.ellipse(hx, -3.35, 0.9 + r() * 0.6, 0.32 + r() * 0.2, 0, 0, 6.283); g.fill(); }
    for (let lx = -40 + r() * 6; lx < 45; lx += 11 + r() * 5) {       // gatlyktor
      g.fillStyle = F('#0b0d12', '#55595f'); g.fillRect(lx, -6, 0.12, 5.2);
      lampor.push({ x: lx + 0.06, y: -0.75, rad: 0.45 + r() * 0.15, rgb: [255, 176, 90], a: 0.8 });
    }
  }, g => { if (!dag) for (const l of lampor) bokehPrick(g, l.x, l.y, l.rad, l.rgb, l.a); });
  return tex;
}

function villaNara(dag = false) {
  const r = slump(2718);
  return villaLager(62, 18, 1, 3, g => {
    g.fillStyle = dag ? '#3b2c22' : '#05080a';                        // stor trädkrona till vänster
    g.fillRect(-17.6, -8, 0.5, 9);
    if (dag) g.fillStyle = '#2e5530';
    for (let i = 0; i < 26; i++) {
      const a = r() * 6.283, d = r() * 3.4;
      if (dag) g.fillStyle = i % 3 ? '#2e5530' : '#3d6a3a';
      g.beginPath(); g.ellipse(-17.2 + Math.cos(a) * d * 1.2, 4.2 + Math.sin(a) * d * 0.9, 1.3 + r() * 1.3, 1.1 + r() * 1.1, 0, 0, 6.283); g.fill();
    }
    g.fillStyle = dag ? '#294d2a' : '#070a0b';                        // häcktoppar precis ovanför fönsterbänken
    for (let hx = -31; hx < 31; hx += 0.9 + r() * 0.9) { g.beginPath(); g.ellipse(hx, -1.5 + r() * 0.35, 0.8 + r() * 0.5, 0.75 + r() * 0.3, 0, 0, 6.283); g.fill(); }
    g.fillStyle = dag ? '#4d5157' : '#0a0c11';                        // gatlykta till höger
    g.fillRect(12.4, -8, 0.22, 11.4);
    g.fillRect(11.3, 3.25, 1.3, 0.14);
    g.fillRect(11.05, 3.0, 0.55, 0.3);
  }, g => {
    if (dag) return;
    const glod = g.createRadialGradient(11.32, 2.9, 0.1, 11.32, 2.9, 2.0);
    glod.addColorStop(0, 'rgba(255,170,80,0.2)'); glod.addColorStop(1, 'rgba(255,170,80,0)');
    g.fillStyle = glod; g.beginPath(); g.arc(11.32, 2.9, 2.0, 0, 6.283); g.fill();
    bokehPrick(g, 11.32, 2.88, 0.42, [255, 178, 96], 0.75);
  });
}

function skivTextur(kant = true) {
  const [c, g] = yta(128, 128);
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 62);
  if (kant) {
    gr.addColorStop(0, 'rgba(255,255,255,0.78)'); gr.addColorStop(0.75, 'rgba(255,255,255,0.84)');
    gr.addColorStop(0.92, 'rgba(255,255,255,0.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  } else {
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  }
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return textur(c);
}

function skuggTextur() {
  const [c, g] = yta(128, 128);
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(0,0,0,0.62)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return textur(c, false);
}
const SKUGGA = skuggTextur();
function skugga(g, bredd, djup, x, z, styrka = 1) {
  const h = new T.Group();
  h.position.set(g.position.x, 0, g.position.z); h.rotation.y = g.rotation.y;
  h.add(kontaktskugga(bredd, djup, x, z, styrka)); scen.add(h);
}
function kontaktskugga(bredd, djup, x, z, styrka = 1) {
  const m = new T.Mesh(new T.PlaneGeometry(bredd, djup),
    new T.MeshBasicMaterial({ map: SKUGGA, transparent: true, depthWrite: false, opacity: styrka, toneMapped: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, 0.006, z); m.renderOrder = 1;
  return m;
}

function lappTextur(farg, rader, storlek = 64, vinkel = 0) {
  const [c, g] = yta(256, 256);
  g.fillStyle = farg; g.fillRect(0, 0, 256, 256);
  const sk = g.createLinearGradient(0, 0, 0, 256);
  sk.addColorStop(0, 'rgba(0,0,0,0.12)'); sk.addColorStop(0.18, 'rgba(0,0,0,0)'); sk.addColorStop(1, 'rgba(0,0,0,0.06)');
  g.fillStyle = sk; g.fillRect(0, 0, 256, 256);
  g.save(); g.translate(128, 132); g.rotate(vinkel);
  g.fillStyle = '#2a2433'; g.font = `700 ${storlek}px ${HAND}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  const lh = storlek * 0.95, y0 = -((rader.length - 1) * lh) / 2;
  rader.forEach((t, i) => g.fillText(t, 0, y0 + i * lh));
  g.restore();
  return textur(c);
}

function tangentTextur() {
  const [c, g] = yta(1024, 384);
  g.fillStyle = '#2b2f39'; g.fillRect(0, 0, 1024, 384);
  const rader = [14, 14, 13, 12];
  rader.forEach((n, ri) => {
    const w = (1024 - 40) / n;
    for (let i = 0; i < n; i++) {
      g.fillStyle = '#1b1e26'; rundRekt(g, 20 + i * w + 4, 22 + ri * 80, w - 8, 66, 9); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.05)'; rundRekt(g, 20 + i * w + 6, 24 + ri * 80, w - 12, 30, 7); g.fill();
    }
  });
  g.fillStyle = '#1b1e26'; rundRekt(g, 300, 22 + 4 * 80 - 12, 424, 50, 9); g.fill();
  return textur(c);
}

function kodSkarm() {
  const W = 1024, H = 640;
  const [c, g] = yta(W, H);
  const t = textur(c);
  t.generateMipmaps = false; t.minFilter = T.LinearFilter;
  const r = slump(314);
  const farger = ['#f2a65a', '#f6d36f', '#ef7a94', '#8cc4ff', '#93d69a', '#c5a8ff', '#e8e2d4'];
  const rader = [];
  let indrag = 0;
  for (let i = 0; i < 25; i++) {
    if (r() < 0.22 && indrag < 3) indrag++; else if (r() < 0.24 && indrag > 0) indrag--;
    const delar = [];
    const n = 1 + Math.floor(r() * 4);
    for (let j = 0; j < n; j++) delar.push({ w: 26 + r() * 130, f: farger[(r() * farger.length) | 0] });
    rader.push({ indrag, delar, tom: r() < 0.1 });
  }
  let synliga = 19, vanta = 0, forraMarkor = -1, forraSynliga = -1;
  function rita(markor) {
    g.fillStyle = '#1a1e2b'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#121521'; g.fillRect(0, 0, W, 46);
    g.fillStyle = '#242a3b'; g.fillRect(14, 8, 196, 38);
    g.font = `500 19px ${MONO}`; g.textBaseline = 'middle';
    g.fillStyle = '#e8e2d4'; g.fillText('geografi.js', 30, 28);
    g.fillStyle = '#596079'; g.fillText('hpakuten.js', 238, 28);
    g.fillStyle = '#ef7a94'; g.beginPath(); g.arc(W - 70, 27, 7, 0, 6.283); g.fill();
    g.fillStyle = '#f6d36f'; g.beginPath(); g.arc(W - 48, 27, 7, 0, 6.283); g.fill();
    g.fillStyle = '#93d69a'; g.beginPath(); g.arc(W - 26, 27, 7, 0, 6.283); g.fill();
    const lh = 23, top = 70;
    let mx = 70, my = top;
    for (let i = 0; i < synliga; i++) {
      const y = top + i * lh;
      g.fillStyle = '#454c63'; g.font = `15px ${MONO}`; g.fillText(String(i + 1).padStart(2, ' '), 16, y + 6);
      const rad = rader[i];
      let x = 70 + rad.indrag * 36;
      if (!rad.tom) for (const d of rad.delar) { g.fillStyle = d.f; rundRekt(g, x, y, d.w, 12, 6); g.fill(); x += d.w + 12; }
      mx = x; my = y;
    }
    if (markor) { g.fillStyle = '#e8e2d4'; g.fillRect(mx + 2, my - 3, 3, 19); }
    t.needsUpdate = true;
  }
  rita(true);
  return {
    t,
    steg(tid, dt) {
      vanta -= dt;
      if (vanta <= 0) {
        if (synliga < rader.length) { synliga++; vanta = 0.28 + Math.random() * 0.4; }
        else { synliga = 6; vanta = 3.5; }
      }
      const m = Math.floor(tid * 2) % 2 === 0;
      if (m !== forraMarkor || synliga !== forraSynliga) { forraMarkor = m; forraSynliga = synliga; rita(m); }
    }
  };
}

function tvSkarm(bilder) {
  const W = 512, H = 384;
  const [c, g] = yta(W, H);
  const t = textur(c);
  t.generateMipmaps = false; t.minFilter = T.LinearFilter;
  const [brusC, brusG] = yta(256, 192);
  const bd = brusG.createImageData(256, 192);
  for (let i = 0; i < bd.data.length; i += 4) { const v = Math.random() * 255; bd.data[i] = bd.data[i + 1] = bd.data[i + 2] = v; bd.data[i + 3] = 255; }
  brusG.putImageData(bd, 0, 0);
  let index = 0, byt = 4, brus = 0, forraBrus = -1;
  function rita(brusNiva) {
    const b = bilder[index % bilder.length];
    g.fillStyle = '#20232c'; g.fillRect(0, 0, W, H);
    if (b) {
      const s = Math.max(W / b.width, H / b.height);
      g.drawImage(b, (W - b.width * s) / 2, (H - b.height * s) / 2, b.width * s, b.height * s);
      g.fillStyle = 'rgba(255,190,120,0.10)'; g.fillRect(0, 0, W, H);
    }
    if (brusNiva > 0) {
      g.globalAlpha = brusNiva;
      g.drawImage(brusC, (Math.random() * 40) | 0, (Math.random() * 30) | 0, 216, 162, 0, 0, W, H);
      g.globalAlpha = 1;
    }
    g.fillStyle = 'rgba(0,0,0,0.18)';
    for (let y = 0; y < H; y += 4) g.fillRect(0, y, W, 2);
    const v = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.8);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.6)');
    g.fillStyle = v; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,0.88)'; g.beginPath(); g.arc(W / 2, H / 2, 46, 0, 6.283); g.fill();
    g.fillStyle = '#d64545'; g.beginPath(); g.moveTo(W / 2 - 14, H / 2 - 22); g.lineTo(W / 2 + 24, H / 2); g.lineTo(W / 2 - 14, H / 2 + 22); g.closePath(); g.fill();
    t.needsUpdate = true;
  }
  rita(0);
  return {
    t,
    steg(dt) {
      byt -= dt;
      if (byt <= 0) { brus = reducerad ? 0 : 0.35; index++; byt = 4.5; }
      if (brus > 0) { brus = Math.max(0, brus - dt); rita(Math.min(1, brus * 3)); forraBrus = brus; }
      else if (forraBrus !== 0) { forraBrus = 0; rita(0); }
    }
  };
}

function urTextur() {
  const S = 512;
  const [c, g] = yta(S, S);
  const gr = g.createRadialGradient(S / 2, S / 2 - 40, 30, S / 2, S / 2, S / 2);
  gr.addColorStop(0, '#fbf5e6'); gr.addColorStop(1, '#e6dcc6');
  g.fillStyle = gr; g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, 6.283); g.fill();
  g.translate(S / 2, S / 2);
  for (let i = 0; i < 60; i++) {
    const a = i / 60 * 6.283, stor = i % 5 === 0;
    g.strokeStyle = stor ? '#2a2530' : '#7d766e'; g.lineWidth = stor ? 6 : 2.5;
    g.beginPath(); g.moveTo(Math.sin(a) * (stor ? 196 : 206), -Math.cos(a) * (stor ? 196 : 206)); g.lineTo(Math.sin(a) * 226, -Math.cos(a) * 226); g.stroke();
  }
  g.fillStyle = '#2a2530'; g.font = `500 40px ${MONO}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let h = 1; h <= 12; h++) { const a = h / 12 * 6.283; g.fillText(String(h), Math.sin(a) * 160, -Math.cos(a) * 160); }
  g.fillStyle = '#9b2f2f'; g.font = `600 22px ${MONO}`; g.fillText('MINNE', 0, 78);
  g.fillStyle = '#7d766e'; g.font = `500 17px ${MONO}`; g.fillText('JvE', 0, -76);
  return textur(c);
}

function flaggMonster() {                    // Union Jack två varv runt pennburken, en hel flagga mitt fram
  const W = 1024, H = 416, B = W / 2;
  const [c, g] = yta(W, H);
  for (const x0 of [-B / 2, B / 2, B * 1.5]) {
    g.save(); g.beginPath(); g.rect(x0, 0, B, H); g.clip();
    g.fillStyle = '#012169'; g.fillRect(x0, 0, B, H);
    g.lineCap = 'butt';
    g.strokeStyle = '#fff'; g.lineWidth = H * 0.2; g.beginPath(); g.moveTo(x0, 0); g.lineTo(x0 + B, H); g.moveTo(x0 + B, 0); g.lineTo(x0, H); g.stroke();
    g.strokeStyle = '#C8102E'; g.lineWidth = H * 0.07; g.beginPath(); g.moveTo(x0, 0); g.lineTo(x0 + B, H); g.moveTo(x0 + B, 0); g.lineTo(x0, H); g.stroke();
    g.fillStyle = '#fff'; g.fillRect(x0 + B / 2 - H * 0.17, 0, H * 0.34, H); g.fillRect(x0, H / 2 - H * 0.17, B, H * 0.34);
    g.fillStyle = '#C8102E'; g.fillRect(x0 + B / 2 - H * 0.1, 0, H * 0.2, H); g.fillRect(x0, H / 2 - H * 0.1, B, H * 0.2);
    g.restore();
  }
  return textur(c);
}

function strumpTextur(sort) {                // två olika strumpor: randig och prickig
  const [c, g] = yta(128, 64);
  if (sort === 'rand') {
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#2f8f8a' : '#f2c14e'; g.fillRect(0, i * 8, 128, 8); }
  } else {
    g.fillStyle = '#e8649a'; g.fillRect(0, 0, 128, 64);
    g.fillStyle = '#fff4c2';
    for (let y = 0; y < 4; y++) for (let x = 0; x < 8; x++) { g.beginPath(); g.arc(x * 16 + (y % 2) * 8 + 4, y * 16 + 8, 3.6, 0, 6.283); g.fill(); }
  }
  const t = textur(c); t.wrapS = t.wrapT = T.RepeatWrapping;
  return t;
}

function globTextur(bild) {                  // jonasgeografis Mercator-karta omräknad rad för rad till en klotkarta
  const W = LAG ? 1024 : 2048, H = W / 2;
  const [c, g] = yta(W, H);
  g.fillStyle = '#14304f'; g.fillRect(0, 0, W, H);
  if (bild) {
    for (let y = 0; y < H; y++) {
      const lat = Math.max(-1.4835, Math.min(1.4835, (0.5 - (y + 0.5) / H) * Math.PI));
      const v = 0.5 - Math.log(Math.tan(Math.PI / 4 + lat / 2)) / (2 * Math.PI);
      g.drawImage(bild, 0, Math.min(bild.height - 1, Math.max(0, v * bild.height)), bild.width, 1, 0, y, W, 1);
    }
  }
  return textur(c);
}

function hpTextur(sida) {                    // ett A4-ark ur ett övningsprov; sida 0 överst, 1 och 2 under
  const W = 1024, H = 1448;
  const [c, g] = yta(W, H);
  g.fillStyle = '#f6f3ea'; g.fillRect(0, 0, W, H);
  const r = slump(77 + sida * 13);
  const SERIF = 'Georgia, "Times New Roman", serif';
  g.fillStyle = '#1d1c22';
  g.font = `700 46px ${MONO}`; g.textBaseline = 'alphabetic';
  g.fillText('HÖGSKOLEPROVET', 80, 120);
  g.font = `500 30px ${MONO}`; g.textAlign = 'right';
  g.fillText('ÖVNINGSPROV', W - 80, 120);
  g.textAlign = 'left';
  g.fillStyle = '#55514a'; g.font = `500 28px ${MONO}`;
  g.fillText(sida === 0 ? 'Provpass 2 · Kvantitativ del' : 'Provpass 1 · Verbal del', 80, 172);
  g.fillStyle = '#1d1c22'; g.fillRect(80, 196, W - 160, 4);
  let y = 270;
  if (sida === 0) {
    const uppgifter = [
      ['1.', 'Vad är x om 3x + 7 = 22?', ['A  3', 'B  4', 'C  5', 'D  6'], 2, '3x = 15, x = 5'],
      ['2.', 'Hur många procent är 18 av 72?', ['A  18 %', 'B  25 %', 'C  30 %', 'D  36 %'], 1, '18/72 = 1/4'],
      ['3.', 'Medelvärdet av fem tal är 8. Vad är deras summa?', ['A  13', 'B  32', 'C  40', 'D  48'], 2, null],
    ];
    for (const [nr, fraga, svar, ratt, anteckning] of uppgifter) {
      g.fillStyle = '#1d1c22'; g.font = `700 34px ${SERIF}`; g.fillText(nr, 80, y);
      g.font = `400 34px ${SERIF}`; g.fillText(fraga, 130, y);
      if (anteckning) {                                           // blyertsanteckning i marginalen
        g.save(); g.fillStyle = 'rgba(60,60,70,0.78)'; g.font = `700 42px ${HAND}`;
        g.translate(130 + g.measureText(fraga).width + 50, y + 4); g.rotate(-0.05); g.fillText(anteckning, 0, 0); g.restore();
        g.font = `400 34px ${SERIF}`;
      }
      y += 58;
      svar.forEach((t, i) => {
        const x = 150 + i * 200; g.fillStyle = '#1d1c22'; g.fillText(t, x, y);
        if (i === ratt) {                                         // rätt svar inringat med blyerts
          const w = g.measureText(t).width;
          g.strokeStyle = 'rgba(60,60,70,0.75)'; g.lineWidth = 4;
          g.beginPath(); g.ellipse(x + w / 2, y - 11, w / 2 + 22, 30, -0.05, 0, 6.283); g.stroke();
        }
      });
      y += 96;
    }
  }
  // fler uppgifter som gråa textrader
  g.fillStyle = 'rgba(29,28,34,0.28)';
  while (y < 1010) {
    g.fillRect(80, y - 24, 30, 26);
    const rader = 2 + ((r() * 2) | 0);
    for (let i = 0; i < rader; i++) { g.fillRect(130, y - 24 + i * 46, (W - 230) * (i === rader - 1 ? 0.35 + r() * 0.4 : 0.85 + r() * 0.15), 22); }
    y += rader * 46 + 70;
  }
  // svarsblanketten längst ned: rutor att fylla i, några ifyllda med blyerts
  g.fillStyle = '#1d1c22'; g.fillRect(80, 1050, W - 160, 3);
  g.font = `600 26px ${MONO}`; g.fillText('SVAR', 80, 1100);
  for (let rad = 0; rad < 2; rad++) for (let k = 0; k < 6; k++) {
    const nr = rad * 6 + k + 1, x0 = 80 + k * 145, y0 = 1160 + rad * 120;
    g.fillStyle = '#55514a'; g.font = `500 22px ${MONO}`; g.fillText(String(nr), x0, y0 + 8);
    const ratt = sida === 0 && nr <= 3 ? [2, 1, 2][nr - 1] : (r() < 0.55 ? (r() * 4) | 0 : -1);
    for (let a = 0; a < 4; a++) {
      const cx = x0 + 42 + a * 24, cy = y0;
      g.strokeStyle = '#55514a'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, 9, 0, 6.283); g.stroke();
      if (a === ratt) { g.fillStyle = 'rgba(55,55,65,0.85)'; g.beginPath(); g.arc(cx, cy, 8, 0, 6.283); g.fill(); }
    }
  }
  g.fillStyle = '#8a857a'; g.font = `500 22px ${MONO}`; g.textAlign = 'right';
  g.fillText('hpakuten.se', W - 80, H - 60);
  g.textAlign = 'left';
  return textur(c);
}

function kuvertTextur() {
  const [c, g] = yta(512, 332);
  g.fillStyle = '#efe4cd'; g.fillRect(0, 0, 512, 332);
  g.strokeStyle = 'rgba(120,96,70,0.35)'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(0, 0); g.lineTo(256, 190); g.lineTo(512, 0); g.stroke();
  g.fillStyle = '#d9cfbb'; g.fillRect(410, 22, 78, 92);
  g.strokeStyle = '#b7343a'; g.setLineDash([4, 4]); g.strokeRect(414, 26, 70, 84); g.setLineDash([]);
  g.fillStyle = '#b7343a'; g.font = `700 52px ${HAND}`; g.textAlign = 'center'; g.fillText('π', 449, 80);
  g.fillStyle = '#2a2433'; g.font = `700 40px ${HAND}`; g.textAlign = 'left';
  g.fillText('Till Jonas', 70, 262);
  return textur(c);
}

function etikettTextur() {
  const [c, g] = yta(512, 200);
  g.fillStyle = '#d8c39a'; g.fillRect(0, 0, 512, 200);
  g.strokeStyle = 'rgba(90,60,30,0.4)'; g.lineWidth = 4; g.strokeRect(14, 14, 484, 172);
  g.fillStyle = '#3a2a1e'; g.font = `700 96px ${HAND}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('minnen', 256, 104);
  return textur(c);
}

function piTextur() {
  const [c, g] = yta(256, 256);
  g.fillStyle = '#f2ead8'; g.font = '700 170px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('π', 128, 136);
  return textur(c);
}

function zTextur() {
  const [c, g] = yta(128, 128);
  g.fillStyle = '#eae6dc'; g.font = `700 96px ${HAND}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('z', 64, 60);
  return textur(c);
}

/* ————— vänta in typsnitten innan något ritas med dem ————— */
const bilderLaddas = Promise.all(['/assets/img/foto-siffervagg-md.webp', '/assets/img/jonas_pkm-md.webp', '/assets/img/foto-scen-md.webp'].map(laddaBild));
const globBildLaddas = laddaBild('/assets/img/glob-textur.webp');
await Promise.race([
  Promise.all(['700 64px Caveat', '500 20px "JetBrains Mono"', '600 20px "JetBrains Mono"'].map(f => document.fonts.load(f))),
  new Promise(r => setTimeout(r, 2500)),
]);
const bilder = await Promise.race([bilderLaddas, new Promise(r => setTimeout(() => r([]), 3000))]);
const globBild = await Promise.race([globBildLaddas, new Promise(r => setTimeout(() => r(null), 1500))]);

/* ————— rummet ————— */
const BORD_Y = 0;
const tra = traTextur();
const bord = nat(lada(21, 0.8, 11.6, 0.12, 3),
  LAG ? std('#ffffff', { map: tra, roughness: 0.42 })
      : new T.MeshPhysicalMaterial({ map: tra, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.28 }),
  { x: 0.3, y: -0.4, z: 1.5, kasta: false });
scen.add(bord);

const vagg = nat(new T.BoxGeometry(34, 3.2, 0.4), std('#16151b', { roughness: 0.95 }), { x: 0, y: -0.2, z: -4.8, kasta: false });
scen.add(vagg);
const karmMat = std('#a7a7ae', { roughness: 0.55 });
const fonsterbank = nat(lada(34, 0.2, 1.0, 0.05), std('#b9b1a6', { roughness: 0.7 }), { x: 0, y: 1.4, z: -4.15 });
scen.add(fonsterbank);
scen.add(nat(new T.BoxGeometry(34, 0.24, 0.32), karmMat, { x: 0, y: 1.62, z: -4.5 }));
for (const x of [-2.75, 5.0, -9.6, 10.4]) scen.add(nat(new T.BoxGeometry(0.3, 18, 0.36), karmMat, { x, y: 10.6, z: -4.5 }));

// utsikten byggs i natt- och dagversion; dagen ritas först när någon vrider på klockan
function byggUtsikt(dag) {
  const ut = [];
  const lagg = (tex, w, h, y, z, ljus, genom) => {
    const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: !genom }));
    m.material.color.setScalar(ljus);
    m.position.set(0.5, y, z);
    scen.add(m); ut.push(m);
  };
  if (UTSIKT === 'villa') {
    lagg(villaHimmel(dag), 120, 34, 6, -62, dag ? 1.0 : 1.15, false);
    lagg(villaHus(dag), 90, 16, -1, -34, dag ? 1.02 : 1.35, true);
    lagg(villaNara(dag), 62, 18, 1, -17, dag ? 1.0 : 1.3, true);
  } else lagg(stadTextur(dag), 130, 32.5, 4.2, -42, dag ? 1.0 : 1.3, false);
  return ut;
}
const utsikt = { natt: byggUtsikt(false), dag: null };
document.querySelectorAll('[data-utsikt]').forEach(a => { if (a.dataset.utsikt === UTSIKT) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });

const SKIVA = skivTextur(true), PRICK = skivTextur(false);
const bokeh = [];
{
  const r = slump(99);
  const villa = UTSIKT === 'villa';
  const farger = villa ? ['#ffcf8a', '#ffb35a', '#fff0dc', '#ffd9a0'] : ['#ffd6a0', '#ffaacb', '#fff0e2', '#b4cdff', '#ffc478'];
  for (let i = 0; i < (villa ? 7 : 14); i++) {
    const sm = new T.SpriteMaterial({ map: SKIVA, color: farger[(r() * farger.length) | 0], transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0.5 });
    const s = new T.Sprite(sm);
    const z = -9 - r() * 16;
    s.position.set(-15 + r() * 32, villa ? 0.4 + r() * 3.2 : 2.6 + r() * 7.5, z);
    s.scale.setScalar(0.14 + r() * 0.34);
    s.userData = { fas: r() * 6.28, fart: 0.3 + r() * 0.7, bas: 0.3 + r() * 0.35, x0: s.position.x };
    scen.add(s); bokeh.push(s);
  }
}

/* lampan: en stor lysande glob som hänger i överkant, som på referensbilden */
const LAMPA = new T.Vector3(1.0, 5.9, -2.2);
const lampMat = new T.MeshStandardMaterial({ color: '#fff4e2', emissive: '#ffd59a', emissiveIntensity: 0, roughness: 0.4 });
const lampa = grupp({ x: LAMPA.x, y: LAMPA.y, z: LAMPA.z });
lampa.add(nat(new T.SphereGeometry(1.2, 48, 32), lampMat, { kasta: false, ta: false }));
lampa.add(nat(new T.CylinderGeometry(0.22, 0.3, 0.3, 24), std('#2a2a30', { metalness: 0.6, roughness: 0.4 }), { y: 1.24, kasta: false }));
lampa.add(nat(new T.CylinderGeometry(0.025, 0.025, 12, 8), std('#1d1d22'), { y: 7.3, kasta: false }));
scen.add(lampa);

/* ————— ljus ————— */
const spot = new T.SpotLight('#ffcf96', 0, 0, 1.0, 0.95, 2);
spot.position.set(LAMPA.x, LAMPA.y - 0.6, LAMPA.z);
spot.target.position.set(0.2, 0, -0.2);
spot.castShadow = true;
spot.shadow.mapSize.setScalar(LAG ? 1024 : 2048);
spot.shadow.camera.near = 1; spot.shadow.camera.far = 22;
spot.shadow.radius = LAG ? 3 : 5;
spot.shadow.bias = -0.0004; spot.shadow.normalBias = 0.025;
scen.add(spot, spot.target);
const lampFyll = new T.PointLight('#ffd7a8', 0, 0, 2);
lampFyll.position.copy(LAMPA);
scen.add(lampFyll);
const fonsterljus = new T.DirectionalLight(UTSIKT === 'villa' ? '#a4b8ff' : '#8ea3ff', 0.9);
fonsterljus.position.set(-2, 1.2, -16);
scen.add(fonsterljus);
const himmelLjus = new T.HemisphereLight('#2c3656', '#2b1b10', 0.16);
scen.add(himmelLjus);
const dagsljus = new T.DirectionalLight('#fff4e6', 0);          // dagsljus från rummet bakom kameran, utan skugga
dagsljus.position.set(3, 9, 12);
scen.add(dagsljus);
const LAMP_SPOT = 140, LAMP_FYLL = 10, LAMP_GLOB = 1.5;
let lampNiva = direkt ? 1 : 0;
function satLampa(n) {
  spot.intensity = LAMP_SPOT * n; lampFyll.intensity = LAMP_FYLL * n; lampMat.emissiveIntensity = LAMP_GLOB * n;
}
satLampa(lampNiva);

/* dammkorn som svävar i lampans sken */
const damm = (() => {
  const n = LAG ? 70 : 140, pos = new Float32Array(n * 3), fas = [];
  const r = slump(5);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = -4 + r() * 10; pos[i * 3 + 1] = 0.6 + r() * 5.6; pos[i * 3 + 2] = -3 + r() * 6;
    fas.push([r() * 6.28, r() * 6.28, 0.05 + r() * 0.12]);
  }
  const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3));
  const p = new T.Points(geo, new T.PointsMaterial({ map: PRICK, size: 0.07, color: '#ffe2b8', transparent: true, opacity: 0.55, depthWrite: false, blending: T.AdditiveBlending }));
  p.userData.fas = fas; scen.add(p);
  return p;
})();

/* ————— sakerna på bordet ————— */
const saker = new Map();
const traffytor = [];
const OSYNLIG = new T.MeshBasicMaterial({ visible: false });
function sak(id, g, o) {
  const s = Object.assign({ id, g, basY: g.position.y, lyft: 0, mal: 0, hover: null, klick: null }, o);
  const proxy = new T.Mesh(o.yta, OSYNLIG);
  proxy.position.copy(o.ytaPos || new T.Vector3(0, 0, 0));
  proxy.userData.sak = id;
  g.add(proxy); traffytor.push(proxy);
  saker.set(id, s);
  return s;
}

// laptopen med kod på skärmen → gratisappar
const kod = kodSkarm();
const laptop = grupp({ x: -3.7, y: 0, z: -1.9, ry: 0.3 });
{
  const metall = std('#3a3f4b', { roughness: 0.38, metalness: 0.55 });
  laptop.add(nat(lada(3.4, 0.13, 2.3, 0.06), metall, { y: 0.065 }));
  laptop.add(nat(new T.PlaneGeometry(3.0, 1.12), std('#ffffff', { map: tangentTextur(), roughness: 0.7 }), { y: 0.132, z: -0.32, rx: -Math.PI / 2, kasta: false }));
  laptop.add(nat(new T.PlaneGeometry(0.95, 0.6), std('#454b58', { roughness: 0.35 }), { y: 0.133, z: 0.66, rx: -Math.PI / 2, kasta: false }));
  const lock = grupp({ y: 0.12, z: -1.12, rx: -0.26 });
  lock.add(nat(lada(3.4, 2.25, 0.09, 0.06), metall, { y: 1.125, z: 0.045 }));
  lock.add(nat(new T.PlaneGeometry(3.14, 1.98), new T.MeshStandardMaterial({ color: '#000000', emissive: '#ffffff', emissiveMap: kod.t, emissiveIntensity: 1.25, roughness: 0.3 }), { y: 1.15, z: 0.093, kasta: false }));
  lock.add(nat(new T.PlaneGeometry(0.78, 0.78), std('#ffffff', { map: lappTextur('#f6dc6a', ['Klicka på', 'sakerna :)'], 50, -0.04), roughness: 0.85, side: T.DoubleSide }), { x: -1.24, y: 1.86, z: 0.12, rz: 0.11 }));
  laptop.add(lock);
  const skarmljus = new T.PointLight('#b8ccff', 0.45, 3, 2);
  skarmljus.position.set(0, 1.0, -0.3);
  if (!LAG) laptop.add(skarmljus);
  skugga(laptop, 4.4, 3.2, 0, 0, 0.7)
}
scen.add(laptop);
sak('appar', laptop, { etikett: 'Gratisappar', under: 'Saker jag byggt', panel: 'appar', yta: new T.BoxGeometry(3.6, 2.6, 2.6), ytaPos: new T.Vector3(0, 1.2, -0.2) });

const glasMat = new T.MeshPhysicalMaterial({ color: '#ffffff', transmission: 1, roughness: 0.05, thickness: 0.3, ior: 1.45, metalness: 0, side: T.FrontSide, attenuationColor: '#e8fff8', attenuationDistance: 3, specularIntensity: 1, envMap: scen.environment, envMapIntensity: 0.6 });
// glasburken med lysande minnen → kurs
const burk = grupp({ x: 0.55, y: 0, z: -0.55 });
const minnen = [], rymlingar = [];
{
  const profil = [[0, 0], [0.62, 0], [0.73, 0.06], [0.76, 0.22], [0.76, 1.7], [0.71, 1.84], [0.63, 1.9], [0.63, 2.06], [0.67, 2.09], [0.67, 2.16], [0.61, 2.16]].map(([x, y]) => new T.Vector2(x, y));
  const kropp = nat(new T.LatheGeometry(profil, 64), glasMat, { kasta: false });
  burk.add(kropp);
  burk.add(nat(new T.CylinderGeometry(0.77, 0.77, 0.52, 48, 1, true, -0.62, 1.24), std('#ffffff', { map: etikettTextur(), roughness: 0.9, side: T.DoubleSide }), { y: 0.95, kasta: false }));
  const r = slump(11);
  const farger = ['#ffd27a', '#ffd27a', '#ffe7a8', '#ffb3cf', '#a8e6ff'];
  for (let i = 0; i < 16; i++) {
    const m = new T.MeshBasicMaterial({ color: farger[(r() * farger.length) | 0] });
    m.color.multiplyScalar(1.3 + r() * 1.5);
    const o = new T.Mesh(new T.SphereGeometry(0.035 + r() * 0.05, 16, 12), m);
    o.userData = { a: r() * 6.28, rad: 0.12 + r() * 0.42, y: 0.35 + r() * 1.3, fart: 0.2 + r() * 0.5, fas: r() * 6.28 };
    burk.add(o); minnen.push(o);
  }
  for (let i = 0; i < 3; i++) {
    const m = new T.MeshBasicMaterial({ color: '#ffd98a', transparent: true, opacity: 0 });
    m.color.multiplyScalar(2.6);
    const o = new T.Mesh(new T.SphereGeometry(0.05, 16, 12), m);
    o.userData = { t: i * 2.2, x: (r() - 0.5) * 0.4, z: (r() - 0.5) * 0.4 };
    burk.add(o); rymlingar.push(o);
  }
  const glod = new T.PointLight('#ffcf7a', 2.0, 5, 2);
  glod.position.set(0, 1.0, 0);
  burk.add(glod);
  skugga(burk, 2.2, 2.2, 0, 0, 0.55)
}
scen.add(burk);
sak('kurs', burk, { etikett: 'Kurs', under: 'Skaffa ett superminne!', panel: 'kurs', yta: new T.CylinderGeometry(0.85, 0.85, 2.3, 16), ytaPos: new T.Vector3(0, 1.1, 0) });

// en liten jordglob med jonasgeografis handritade länder → geografi
const glob = grupp({ x: -2.9, y: 0, z: 3.0, ry: 0.4 });
glob.scale.setScalar(1.4);                                        // större och närmare kameran
let jordklot;
{
  const tra = std('#4a3020', { roughness: 0.5 });
  const massing = std('#c9a24a', { metalness: 0.85, roughness: 0.3 });
  glob.add(nat(new T.CylinderGeometry(0.3, 0.36, 0.08, 40), tra, { y: 0.04 }));
  glob.add(nat(new T.CylinderGeometry(0.035, 0.05, 0.28, 16), tra, { y: 0.22 }));
  const axel = grupp({ y: 0.82, rz: 0.41 });                      // jordaxelns lutning
  jordklot = nat(new T.SphereGeometry(0.42, 48, 32), std('#ffffff', { map: globTextur(globBild), roughness: 0.5 }));
  jordklot.rotation.y = -1.2;                                     // Europa och Afrika mot kameran
  axel.add(jordklot);
  axel.add(nat(new T.TorusGeometry(0.5, 0.018, 8, 64, Math.PI), massing, { rz: Math.PI / 2 }));   // meridianbåge
  for (const sy of [-1, 1]) axel.add(nat(new T.SphereGeometry(0.03, 12, 8), massing, { y: sy * 0.5, kasta: false }));
  glob.add(axel);
  skugga(glob, 1.3, 1.3, 0, 0, 0.5)
}
scen.add(glob);
sak('geografi', glob, { etikett: 'Geografi', under: 'Hela världen i dina händer', panel: 'geografi', yta: new T.SphereGeometry(0.62, 12, 8), ytaPos: new T.Vector3(0, 0.75, 0) });

// figuren av Jonas → om Jonas
const jonas = grupp({ x: -1.45, y: 0, z: 0.35, ry: 0.55 });
const jonasDelar = {};
{
  const hud = std('#f1c39b', { roughness: 0.6 });
  const rod = std('#d8394a', { roughness: 0.72 });
  const marin = std('#2f3a5c', { roughness: 0.75 });
  const har = std('#6a4024', { roughness: 0.85 });
  const strumpor = [strumpTextur('rand'), strumpTextur('prick')];
  for (const sx of [-1, 1]) {
    jonas.add(nat(lada(0.22, 0.13, 0.34, 0.05), std('#3b2a20'), { x: sx * 0.13, y: 0.065, z: 0.04 }));
    jonas.add(nat(new T.CylinderGeometry(0.09, 0.092, 0.2, 18), std('#ffffff', { map: strumpor[sx < 0 ? 0 : 1], roughness: 0.85 }), { x: sx * 0.13, y: 0.2 }));   // olika strumpor
    jonas.add(nat(new T.CapsuleGeometry(0.095, 0.3, 6, 12), marin, { x: sx * 0.13, y: 0.5 }));
  }
  const kroppProfil = [[0, 0], [0.33, 0], [0.38, 0.09], [0.38, 0.7], [0.31, 0.86], [0.16, 0.93], [0, 0.94]].map(([x, y]) => new T.Vector2(x, y));
  jonas.add(nat(new T.LatheGeometry(kroppProfil, 40), rod, { y: 0.66 }));
  const armar = [];
  for (const sx of [-1, 1]) {
    const axel = grupp({ x: sx * 0.39, y: 1.46, rz: sx * 0.14 });
    axel.add(nat(new T.CapsuleGeometry(0.095, 0.12, 6, 12), rod, { y: -0.1 }));     // kort t-shirtärm
    axel.add(nat(new T.CapsuleGeometry(0.07, 0.38, 6, 12), hud, { y: -0.36 }));     // bar arm
    axel.add(nat(new T.SphereGeometry(0.095, 16, 12), hud, { y: -0.62 }));
    jonas.add(axel); armar.push(axel);
  }
  jonasDelar.hogerArm = armar[1];
  jonas.add(nat(new T.CylinderGeometry(0.1, 0.11, 0.12, 16), hud, { y: 1.64 }));
  const huvud = grupp({ y: 2.04 });
  huvud.add(nat(new T.SphereGeometry(0.42, 40, 28), hud, { s: [1, 1.02, 0.96] }));
  const kalott = nat(new T.SphereGeometry(0.448, 40, 20, 0, Math.PI * 2, 0, 1.3), har, { rx: -0.32 });
  huvud.add(kalott);
  const r = slump(3);
  {                                                                // vilt, rufsigt hår åt alla håll, men inte i ansiktet
    const upp = new T.Vector3(0, 1, 0), n = new T.Vector3(), d = new T.Vector3();
    const riktning = (az, pol) => n.set(Math.sin(pol) * Math.sin(az), Math.cos(pol), Math.sin(pol) * Math.cos(az));
    const iAnsiktet = (az, pol) => Math.abs(az) < 0.85 && pol > 0.72;
    for (let i = 0; i < 26; i++) {
      const az = (r() * 2 - 1) * Math.PI, pol = 0.08 + r() * 1.12;
      if (iAnsiktet(az, pol)) continue;
      riktning(az, pol);
      const t = nat(new T.SphereGeometry(0.085 + r() * 0.075, 14, 10), har);
      t.position.copy(n).multiplyScalar(0.4 + r() * 0.05).add(d.set(0, 0.02, -0.02));
      huvud.add(t);
    }
    for (let i = 0; i < 16; i++) {                                 // tofsar som spretar
      const az = (r() * 2 - 1) * Math.PI, pol = 0.05 + r() * 1.0;
      if (iAnsiktet(az, pol - 0.12)) continue;
      riktning(az, pol);
      d.set(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(0.7).add(n).normalize();
      const l = 0.18 + r() * 0.17;
      const t = nat(new T.ConeGeometry(0.05 + r() * 0.035, l, 8), har);
      t.quaternion.setFromUnitVectors(upp, d);
      t.position.copy(n).multiplyScalar(0.42).addScaledVector(d, l * 0.35).add(new T.Vector3(0, 0.02, -0.02));
      huvud.add(t);
    }
  }
  const vitt = std('#fbf8f2', { roughness: 0.35 }), pupill = std('#2b211c', { roughness: 0.25 });
  const glans = new T.MeshBasicMaterial({ color: '#ffffff' });
  for (const sx of [-1, 1]) {
    huvud.add(nat(new T.SphereGeometry(0.075, 14, 10), hud, { x: sx * 0.41, y: -0.02, s: [0.6, 1, 0.9] }));
    const oga = grupp({ x: sx * 0.14, y: 0.03, z: 0.37 });           // stora, mjuka ögon med glans
    oga.add(nat(new T.SphereGeometry(0.068, 18, 12), vitt, { s: [1, 1.12, 0.55], kasta: false }));
    oga.add(nat(new T.SphereGeometry(0.044, 16, 12), pupill, { y: -0.006, z: 0.024, s: [1, 1.08, 0.6], kasta: false }));
    oga.add(nat(new T.SphereGeometry(0.012, 8, 6), glans, { x: sx * 0.012 + 0.006, y: 0.016, z: 0.05, kasta: false }));
    huvud.add(oga); (jonasDelar.ogon ||= []).push(oga);
    huvud.add(nat(new T.CapsuleGeometry(0.017, 0.09, 4, 8), har, { x: sx * 0.15, y: 0.165, z: 0.375, rz: Math.PI / 2 - sx * 0.16, kasta: false }));   // vänliga ögonbryn, höjda inåt
    huvud.add(nat(new T.SphereGeometry(0.06, 12, 8), new T.MeshStandardMaterial({ color: '#f29a8c', transparent: true, opacity: 0.45, roughness: 0.8 }), { x: sx * 0.25, y: -0.1, z: 0.32, s: [1, 0.6, 0.4], kasta: false }));   // rosiga kinder
  }
  huvud.add(nat(new T.SphereGeometry(0.055, 14, 10), std('#e8b28a'), { y: -0.05, z: 0.42, kasta: false }));
  {                                                                // brett leende som följer ansiktets rundning
    const punkter = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 6 - 1, x = 0.155 * t, y = -0.13 - 0.065 * (1 - t * t);
      const z = Math.sqrt(Math.max(0, 1 - (x / 0.42) ** 2 - (y / 0.428) ** 2)) * 0.403 + 0.01;
      punkter.push(new T.Vector3(x, y, z));
    }
    huvud.add(nat(new T.TubeGeometry(new T.CatmullRomCurve3(punkter), 32, 0.019, 8), std('#7a2e2a'), { kasta: false }));
  }
  jonas.add(huvud);
  jonasDelar.huvud = huvud;
  skugga(jonas, 1.1, 1.1, 0, 0.02, 0.7)
}
scen.add(jonas);
sak('om', jonas, { etikett: 'Om Jonas', under: 'Världsmästare i att komma ihåg', panel: 'om', yta: new T.CylinderGeometry(0.55, 0.55, 2.6, 12), ytaPos: new T.Vector3(0, 1.25, 0) });

// roboten → agera
const robot = grupp({ x: 2.85, y: 0, z: -0.35, ry: -0.35 });
const robotDelar = {};
{
  const plat = std('#cbcfd6', { roughness: 0.58, metalness: 0.08 });
  const mork = std('#2a2e38', { roughness: 0.5 });
  for (const sx of [-1, 1]) {
    robot.add(nat(new T.CylinderGeometry(0.12, 0.14, 0.32, 16), std('#8d929c', { metalness: 0.4, roughness: 0.4 }), { x: sx * 0.32, y: 0.16 }));
    robot.add(nat(new T.CapsuleGeometry(0.09, 0.36, 6, 12), plat, { x: sx * 0.72, y: 0.8, rz: sx * 0.28 }));
  }
  const kropp = grupp({ y: 0.32 });
  kropp.add(nat(lada(1.25, 0.95, 0.95, 0.2), plat, { y: 0.475 }));
  kropp.add(nat(lada(0.62, 0.36, 0.05, 0.06), mork, { y: 0.5, z: 0.475 }));
  const lampor = ['#5bd67a', '#f6d36f', '#ff5a4a'].map((f, i) => {
    const m = new T.MeshBasicMaterial({ color: f }); m.color.multiplyScalar(2.2);
    const o = new T.Mesh(new T.SphereGeometry(0.038, 12, 8), m); o.position.set(-0.16 + i * 0.16, 0.5, 0.505);
    kropp.add(o); return o;
  });
  robotDelar.lampor = lampor;
  robot.add(kropp);
  robot.add(nat(new T.CylinderGeometry(0.12, 0.12, 0.12, 16), std('#8d929c', { metalness: 0.4 }), { y: 1.33 }));
  const huvud = grupp({ y: 1.38 });
  huvud.add(nat(lada(1.0, 0.72, 0.82, 0.2), plat, { y: 0.36 }));
  huvud.add(nat(lada(0.8, 0.4, 0.06, 0.13), std('#14161d', { roughness: 0.25 }), { y: 0.38, z: 0.41 }));
  const ogonMat = new T.MeshStandardMaterial({ color: '#000000', emissive: '#ff4632', emissiveIntensity: 0.8 });
  robotDelar.ogon = [-1, 1].map(sx => {
    const o = nat(new T.SphereGeometry(0.085, 16, 12), ogonMat, { x: sx * 0.19, y: 0.39, z: 0.44, s: [1, 0.22, 0.45], kasta: false });
    huvud.add(o); return o;
  });
  robotDelar.ogonMat = ogonMat;
  for (const sx of [-1, 1]) huvud.add(nat(new T.CylinderGeometry(0.08, 0.08, 0.08, 16), mork, { x: sx * 0.52, y: 0.36, rz: Math.PI / 2 }));
  huvud.add(nat(new T.CylinderGeometry(0.025, 0.025, 0.36, 8), mork, { y: 0.88 }));
  const antMat = new T.MeshStandardMaterial({ color: '#000000', emissive: '#ff6a3a', emissiveIntensity: 1.5 });
  const kula = nat(new T.SphereGeometry(0.075, 16, 12), antMat, { y: 1.08 });
  huvud.add(kula);
  robotDelar.antMat = antMat;
  robot.add(huvud);
  robotDelar.huvud = huvud;
  skugga(robot, 1.9, 1.6, 0, 0, 0.7)
}
scen.add(robot);
sak('agera', robot, { etikett: 'Agera', under: 'Vad kan jag göra åt AI?', panel: 'agera', yta: new T.BoxGeometry(1.7, 2.6, 1.3), ytaPos: new T.Vector3(0, 1.2, 0) });

const Z = zTextur();
const zz = [0, 1, 2].map(i => {
  const s = new T.Sprite(new T.SpriteMaterial({ map: Z, transparent: true, depthWrite: false, opacity: 0 }));
  s.userData.t = i * 1.1; scen.add(s); return s;
});

// tv:n → videor
const tv = tvSkarm(bilder);
const tvGrupp = grupp({ x: 5.15, y: 0, z: -2.45, ry: -0.42 });
{
  const gradde = std('#e7d7b9', { roughness: 0.55 });
  const valnot = std('#5a3a26', { roughness: 0.6 });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) tvGrupp.add(nat(new T.CylinderGeometry(0.045, 0.03, 0.24, 8), valnot, { x: sx * 0.75, y: 0.12, z: sz * 0.45, rz: -sx * 0.12, rx: sz * 0.12 }));
  tvGrupp.add(nat(lada(1.95, 1.48, 1.28, 0.24), gradde, { y: 0.22 + 0.74 }));
  tvGrupp.add(nat(lada(1.4, 1.1, 0.1, 0.13), std('#2a2620', { roughness: 0.5 }), { x: -0.2, y: 0.97, z: 0.62 }));
  tvGrupp.add(nat(new T.PlaneGeometry(1.24, 0.94), new T.MeshStandardMaterial({ color: '#000000', emissive: '#ffffff', emissiveMap: tv.t, emissiveIntensity: 1.35, roughness: 0.2 }), { x: -0.2, y: 0.97, z: 0.676, kasta: false }));
  const ratt = std('#d9783f', { roughness: 0.5 });
  tvGrupp.add(nat(new T.CylinderGeometry(0.1, 0.1, 0.08, 20), ratt, { x: 0.71, y: 1.24, z: 0.66, rx: Math.PI / 2 }));
  tvGrupp.add(nat(new T.CylinderGeometry(0.1, 0.1, 0.08, 20), ratt, { x: 0.71, y: 0.94, z: 0.66, rx: Math.PI / 2 }));
  for (let i = 0; i < 4; i++) tvGrupp.add(nat(new T.BoxGeometry(0.28, 0.025, 0.02), std('#8a7a62'), { x: 0.71, y: 0.6 + i * 0.06, z: 0.645, kasta: false }));
  const ant = std('#2a2a30', { metalness: 0.7, roughness: 0.35 });
  for (const sx of [-1, 1]) {
    const a = grupp({ x: 0.1, y: 1.69, rz: -sx * 0.5 });
    a.add(nat(new T.CylinderGeometry(0.016, 0.016, 1.0, 8), ant, { y: 0.5 }));
    a.add(nat(new T.SphereGeometry(0.045, 12, 8), ant, { y: 1.0 }));
    tvGrupp.add(a);
  }
  const tvLjus = new T.PointLight('#c8d4ff', 1.4, 3.5, 2);
  tvLjus.position.set(-0.2, 1.0, 1.0);
  if (!LAG) tvGrupp.add(tvLjus);
  skugga(tvGrupp, 2.6, 2.0, 0, 0, 0.6)
}
scen.add(tvGrupp);
sak('videor', tvGrupp, { etikett: 'Videor', under: 'Tro dina ögon!', panel: 'videor', yta: new T.BoxGeometry(2.1, 2.4, 1.5), ytaPos: new T.Vector3(0, 1.1, 0) });

// pappersplanet → nyhetsbrev
const plan = grupp({ x: -5.3, y: 0, z: 1.2, ry: 0.75 });
const planKropp = new T.Group();
{
  const N = [0, 0, -1.0], VL = [-0.78, 0.13, 0.72], VR = [0.78, 0.13, 0.72], C = [0, 0, 0.72], K = [0, -0.22, 0.62];
  const tri = [N, C, VL, N, VR, C, N, K, C].flat();
  const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(tri, 3)); geo.computeVertexNormals();
  planKropp.add(nat(geo, std('#f4f1ea', { roughness: 0.9, side: T.DoubleSide, flatShading: true })));
  planKropp.position.y = 0.23;
  plan.add(planKropp);
  skugga(plan, 1.9, 2.1, 0, 0, 0.45)
}
scen.add(plan);
sak('nyhetsbrev', plan, { etikett: 'Nyhetsbrev', under: 'Ett ovanligt minnesvärt nyhetsbrev', panel: 'nyhetsbrev', yta: new T.BoxGeometry(1.8, 0.8, 2.0), ytaPos: new T.Vector3(0, 0.3, 0) });

// kuvertet → kontakt
const kuvert = grupp({ x: 4.25, y: 0, z: 1.95, ry: -0.3 });
{
  const papper = std('#efe4cd', { roughness: 0.85 });
  kuvert.add(nat(new T.BoxGeometry(1.7, 0.014, 1.1), [papper, papper, std('#ffffff', { map: kuvertTextur(), roughness: 0.85 }), papper, papper, papper], { y: 0.007 }));
  kuvert.add(nat(new T.CylinderGeometry(0.13, 0.135, 0.016, 28), std('#a8262c', { roughness: 0.45 }), { y: 0.022, z: 0.05 }));
  skugga(kuvert, 2.2, 1.6, 0, 0, 0.4)
}
scen.add(kuvert);
sak('kontakt', kuvert, { etikett: 'Kontakt', under: 'Boka föreläsning eller säg hej', panel: 'kontakt', yta: new T.BoxGeometry(1.9, 0.4, 1.3), ytaPos: new T.Vector3(0, 0.1, 0) });

// träningspapper för högskoleprovet i A4 (1 enhet ≈ 8 cm) med en blyertspenna ovanpå → hpakuten.se
const hp = grupp({ x: 1.55, y: 0, z: 2.8, ry: 0.14 });
{
  const kant = std('#efebe1', { roughness: 0.92 });
  const ark = [[0, 0.004, 0, 0.0], [0.12, 0.011, -0.06, -0.05], [-0.06, 0.018, 0.04, 0.035]];   // [x, y, z, vridning]; överst sist
  ark.forEach(([x, y, z, v], i) => {
    const sida = ark.length - 1 - i;
    hp.add(nat(new T.BoxGeometry(2.6, 0.006, 3.68), [kant, kant, std('#ffffff', { map: hpTextur(sida), roughness: 0.9 }), kant, kant, kant], { x, y, z, ry: v, kasta: i === 0 }));
  });
  const penna = grupp({ x: 0.55, y: 0.075, z: -0.25, ry: -0.55, rz: Math.PI / 2 });
  penna.add(nat(new T.CylinderGeometry(0.052, 0.052, 1.75, 6), std('#f2c14e', { roughness: 0.5 }), {}));
  penna.add(nat(new T.ConeGeometry(0.052, 0.18, 6), std('#e7c79a'), { y: -0.965, rx: Math.PI }));
  penna.add(nat(new T.ConeGeometry(0.02, 0.06, 6), std('#2b2b30'), { y: -1.06, rx: Math.PI }));
  penna.add(nat(new T.CylinderGeometry(0.055, 0.055, 0.1, 12), std('#b9bcc4', { metalness: 0.7, roughness: 0.35 }), { y: 0.925 }));
  penna.add(nat(new T.CylinderGeometry(0.05, 0.05, 0.12, 12), std('#e8838f', { roughness: 0.8 }), { y: 1.035 }));
  hp.add(penna);
  skugga(hp, 3.2, 4.3, 0, 0, 0.32)
}
scen.add(hp);
sak('hp', hp, { etikett: 'Högskoleprovet', under: 'Plugga smartare med HPakuten', panel: 'hp', yta: new T.BoxGeometry(2.8, 0.3, 3.8), ytaPos: new T.Vector3(0, 0.1, 0) });

// muggen med π, ånga och allt
const mugg = grupp({ x: 6.35, y: 0, z: 0.85, ry: -0.5 });
const anga = [];
{
  const farg = std('#3f6f86', { roughness: 0.45 });
  mugg.add(nat(new T.CylinderGeometry(0.56, 0.52, 1.25, 40, 1, true), farg, { y: 0.625 }));
  mugg.add(nat(new T.CylinderGeometry(0.5, 0.47, 1.2, 40, 1, true), std('#e9e2d4', { side: T.BackSide, roughness: 0.4 }), { y: 0.63, kasta: false }));
  mugg.add(nat(new T.CylinderGeometry(0.52, 0.52, 0.04, 40), farg, { y: 0.02 }));
  mugg.add(nat(new T.CircleGeometry(0.49, 40), std('#3b2416', { roughness: 0.2 }), { y: 1.08, rx: -Math.PI / 2, kasta: false }));
  mugg.add(nat(new T.TorusGeometry(0.53, 0.03, 8, 40), farg, { y: 1.25, rx: Math.PI / 2 }));
  mugg.add(nat(new T.TorusGeometry(0.3, 0.075, 12, 24, Math.PI), farg, { x: 0.56, y: 0.64, rz: -Math.PI / 2 }));
  mugg.add(nat(new T.CylinderGeometry(0.565, 0.565, 0.6, 24, 1, true, -0.55, 1.1), std('#ffffff', { map: piTextur(), transparent: true, roughness: 0.5 }), { y: 0.65, kasta: false }));
  for (let i = 0; i < 6; i++) {
    const s = new T.Sprite(new T.SpriteMaterial({ map: PRICK, color: '#ffffff', transparent: true, opacity: 0, depthWrite: false }));
    s.userData.t = i / 6; mugg.add(s); anga.push(s);
  }
  skugga(mugg, 1.7, 1.7, 0, 0, 0.6)
}
scen.add(mugg);
sak('piafton', mugg, { etikett: 'Piafton', under: 'Kvällen före pidagen', panel: 'piafton', yta: new T.CylinderGeometry(0.75, 0.75, 1.5, 12), ytaPos: new T.Vector3(0.15, 0.7, 0) });

// pennburken
const pennor = grupp({ x: -6.5, y: 0, z: -2.95 });
{
  pennor.add(nat(new T.CylinderGeometry(0.44, 0.4, 1.05, 48, 1, true), std('#ffffff', { map: flaggMonster(), roughness: 0.45 }), { y: 0.525 }));
  pennor.add(nat(new T.CylinderGeometry(0.43, 0.39, 1.04, 48, 1, true), std('#132a5c', { side: T.BackSide, roughness: 0.6 }), { y: 0.525, kasta: false }));
  pennor.add(nat(new T.TorusGeometry(0.435, 0.014, 8, 48), std('#f4f1ea', { roughness: 0.5 }), { y: 1.05, rx: Math.PI / 2, kasta: false }));
  pennor.add(nat(new T.CylinderGeometry(0.4, 0.4, 0.04, 32), std('#132a5c'), { y: 0.02 }));
  const r = slump(21);
  const farger = ['#f2c14e', '#e8833a', '#d64545', '#3f8f8a', '#4466aa', '#f2c14e', '#93d69a'];
  farger.forEach((f, i) => {
    const a = i / farger.length * 6.283, rr = 0.17 + r() * 0.1;
    const p = grupp({ x: Math.cos(a) * rr, y: 0.08, z: Math.sin(a) * rr, rx: (r() - 0.5) * 0.45, rz: (r() - 0.5) * 0.45 });
    const l = 1.35 + r() * 0.35;
    p.add(nat(new T.CylinderGeometry(0.052, 0.052, l, 6), std(f, { roughness: 0.55 }), { y: l / 2 }));
    p.add(nat(new T.ConeGeometry(0.052, 0.15, 6), std('#e7c79a'), { y: l + 0.075, kasta: false }));
    p.add(nat(new T.ConeGeometry(0.018, 0.05, 6), std('#2b2b30'), { y: l + 0.14, kasta: false }));
    pennor.add(p);
  });
  skugga(pennor, 1.4, 1.4, 0, 0, 0.6)
}
scen.add(pennor);
sak('en', pennor, { etikett: 'In English', under: 'jonasvonessen.se/en', panel: null, yta: new T.CylinderGeometry(0.55, 0.55, 2.2, 12), ytaPos: new T.Vector3(0, 1.0, 0) });

// klockan på fönsterbänken visar riktig tid
const klocka = grupp({ x: 3.15, y: 1.5, z: -4.05, ry: -0.18 });
const visare = {};
{
  klocka.add(nat(new T.CylinderGeometry(0.95, 0.95, 0.34, 48), std('#4a2e1f', { roughness: 0.5 }), { y: 1.0, rx: Math.PI / 2 }));
  klocka.add(nat(new T.TorusGeometry(0.93, 0.075, 16, 48), std('#c9a24a', { metalness: 0.85, roughness: 0.3 }), { y: 1.0, z: 0.17 }));
  klocka.add(nat(new T.CircleGeometry(0.88, 48), std('#ffffff', { map: urTextur(), roughness: 0.55 }), { y: 1.0, z: 0.172, kasta: false }));
  const mk = (b, l, f, z) => {
    const p = grupp({ y: 1.0, z });
    p.add(nat(new T.BoxGeometry(b, l, 0.015), std(f, { roughness: 0.4 }), { y: l / 2 - 0.08, kasta: false }));
    klocka.add(p); return p;
  };
  visare.tim = mk(0.06, 0.48, '#221f27', 0.185);
  visare.min = mk(0.04, 0.7, '#221f27', 0.195);
  visare.sek = mk(0.016, 0.76, '#b3262e', 0.205);
  klocka.add(nat(new T.SphereGeometry(0.04, 12, 8), std('#c9a24a', { metalness: 0.8 }), { y: 1.0, z: 0.21, kasta: false }));
  for (const sx of [-1, 1]) klocka.add(nat(new T.SphereGeometry(0.11, 12, 8), std('#c9a24a', { metalness: 0.8, roughness: 0.35 }), { x: sx * 0.5, y: 0.07 }));
}
scen.add(klocka);
sak('klocka', klocka, { etikett: 'Klockan', under: () => dagMal ? 'Klicka så blir det natt' : 'Klicka så blir det dag', panel: null, yta: new T.BoxGeometry(2.1, 2.1, 0.5), ytaPos: new T.Vector3(0, 1.0, 0) });

// lapp med pi på fönsterrutan
scen.add(nat(new T.PlaneGeometry(1.05, 1.05), std('#ffffff', { map: lappTextur('#f4a7c0', ['π = 3,14159', '26535 89793', '23846 26433…'], 34, 0.02), roughness: 0.85 }), { x: -1.55, y: 3.7, z: -4.66, rz: 0.06, kasta: false }));

/* ————— natt och dag: klockan vrider på dygnet ————— */
let dagMal = DAG_FRAN_START ? 1 : 0, dagNiva = dagMal;
const NATT = { fonster: new T.Color(UTSIKT === 'villa' ? '#a4b8ff' : '#8ea3ff'), himmel: new T.Color('#2c3656'), mark: new T.Color('#2b1b10'), bak: new T.Color('#06070c') };
const DAG = { fonster: new T.Color('#fff1dc'), himmel: new T.Color('#d8e8ff'), mark: new T.Color('#7a5638'), bak: new T.Color('#9cc6ec') };
function byggDag() { if (!utsikt.dag) { utsikt.dag = byggUtsikt(true); satDag(dagNiva); } }
function vaxlaDag() {
  byggDag();
  dagMal = dagMal ? 0 : 1;
  if (reducerad) dagNiva = dagMal;
  if (hovrad === 'klocka') lapp.innerHTML = 'Klockan<small>' + saker.get('klocka').under() + '</small>';
}

/* ————— efterbehandling: glöd, vinjett och lite filmkorn ————— */
const rt = new T.WebGLRenderTarget(1, 1, { type: T.HalfFloatType, samples: (LAG || renderer.getPixelRatio() >= 1.5) ? 0 : 4 });
const komp = new T.EffectComposer(renderer, rt);
komp.addPass(new T.RenderPass(scen, kam));
const glod = new T.UnrealBloomPass(new T.Vector2(512, 512), 0.5, 0.5, 0.9);
komp.addPass(glod);
function satDag(n) {                                              // 0 = natt, 1 = dag
  fonsterljus.color.copy(NATT.fonster).lerp(DAG.fonster, n); fonsterljus.intensity = 0.9 - n * 0.35;               // fönsterljuset speglas i bordet; på dagen lyser himlen i stället
  himmelLjus.color.copy(NATT.himmel).lerp(DAG.himmel, n); himmelLjus.groundColor.copy(NATT.mark).lerp(DAG.mark, n);
  himmelLjus.intensity = 0.16 + n * 0.75;
  dagsljus.intensity = n * 0.85;
  scen.environmentIntensity = 0.14;                              // mer miljöljus ger ett vitt sken i den blanka bordsskivan
  renderer.toneMappingExposure = 1 - n * 0.08;
  scen.background.copy(NATT.bak).lerp(DAG.bak, n);
  glod.strength = 0.5 - n * 0.3;
  for (const m of utsikt.natt) { m.material.opacity = 1 - n; m.visible = n < 1; }
  if (utsikt.dag) for (const m of utsikt.dag) { m.material.opacity = n; m.visible = n > 0; }
}
satDag(dagNiva);
if (DAG_FRAN_START) byggDag();                                     // annars ritas dagen i lugn och ro efter starten
else if ('requestIdleCallback' in window) requestIdleCallback(() => setTimeout(byggDag, 4000), { timeout: 8000 });
const vinjett = new T.ShaderPass({
  uniforms: { tDiffuse: { value: null }, tid: { value: 0 }, fokusY: { value: 0.42 }, oskarpa: { value: LAG ? 0 : 1 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float tid; uniform float fokusY; uniform float oskarpa; varying vec2 vUv;
    float brus(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float o = oskarpa * smoothstep(0.2, 0.5, abs(vUv.y - fokusY));   // kort skärpedjup, som en miniatyr
      if (o > 0.001) {
        vec4 s = vec4(0.0);
        for (int i = 0; i < 8; i++) { float a = float(i) * 0.7854; s += texture2D(tDiffuse, vUv + vec2(cos(a) * 0.62, sin(a)) * o * 0.006); }
        c = mix(c, s / 8.0, o);
      }
      vec2 d = vUv - 0.5; d.x *= 1.2;
      c.rgb *= mix(1.0, 0.42, smoothstep(0.38, 0.95, length(d)));
      c.rgb += (brus(vUv * 1000.0 + tid) - 0.5) * 0.016;
      gl_FragColor = c;
    }`,
});
komp.addPass(vinjett);
komp.addPass(new T.OutputPass());

/* ————— kameran: följer pekaren lite, glider fram mot det man klickar på ————— */
const VILA_MAL = new T.Vector3(0.45, 1.3, -0.5);
const RIKTNING = new T.Vector3(0, 0.235, 1).normalize();
let avstand = 16.7, malY = VILA_MAL.y;
const kamPos = new T.Vector3(), kamMal = VILA_MAL.clone();
const mus = { x: 0, y: 0, mx: 0, my: 0 };
let panorering = 0, panMal = 0, fokus = null;
const PORTRATT = () => innerWidth / innerHeight < 0.85;

function anpassa() {
  const w = innerWidth, h = innerHeight;
  kam.aspect = w / h;
  kam.fov = PORTRATT() ? 38 : 30;
  kam.updateProjectionMatrix();
  const hfov = 2 * Math.atan(Math.tan(T.MathUtils.degToRad(kam.fov / 2)) * kam.aspect);
  const bredd = PORTRATT() ? 6.2 : 14.6;
  avstand = T.MathUtils.clamp((bredd / 2) / Math.tan(hfov / 2), 9, 26);
  malY = PORTRATT() ? 1.75 : VILA_MAL.y;
  const lampY = LAMPA.y + (PORTRATT() ? 1.6 : 0);          // i stående läge hänger lampan högre, annars tar den över
  lampa.position.y = lampY; lampFyll.position.y = lampY; spot.position.y = lampY - 0.6;
  renderer.setSize(w, h, false);
  komp.setSize(w, h);
  komp.setPixelRatio(renderer.getPixelRatio());
  document.getElementById('vink').innerHTML = grov
    ? 'Tryck på <b>sakerna</b>' + (PORTRATT() ? ' · svep för att se mer' : '')
    : 'Klicka på <b>sakerna</b> på skrivbordet';
}
anpassa();
addEventListener('resize', anpassa);

const intro = { t: direkt ? 9 : 0 };
function uppdateraKamera(dt) {
  mus.x += (mus.mx - mus.x) * Math.min(1, dt * 3);
  mus.y += (mus.my - mus.y) * Math.min(1, dt * 3);
  panorering += (panMal - panorering) * Math.min(1, dt * 6);
  const mal = new T.Vector3(VILA_MAL.x + panorering, malY, VILA_MAL.z);
  let d = avstand;
  if (fokus && !reducerad) {
    mal.lerp(fokus, 0.6);
    d *= PORTRATT() ? 0.8 : 0.66;
    if (!PORTRATT() && innerWidth > 640) mal.x += d * 0.12;   // lämna plats åt panelen till höger
    if (innerWidth <= 640) mal.y -= 1.1;                       // och åt panelen nedtill på mobil
  }
  const pos = mal.clone().addScaledVector(RIKTNING, d);
  if (!reducerad) { pos.x += mus.x * 0.75; pos.y += mus.y * 0.4; }
  const k = intro.t < 2.6 ? T.MathUtils.smootherstep(intro.t / 2.6, 0, 1) : 1;
  if (k < 1) pos.add(new T.Vector3(0, 2.2, 7.5).multiplyScalar(1 - k));
  const f = reducerad ? 1 : 1 - Math.exp(-dt * (k < 1 ? 20 : 3.2));
  kamPos.lerp(pos, f); kamMal.lerp(mal, f);
  kam.position.copy(kamPos); kam.lookAt(kamMal);
}
kamPos.copy(VILA_MAL).setY(malY).addScaledVector(RIKTNING, avstand);
if (!direkt) kamPos.add(new T.Vector3(0, 2.2, 7.5));
kamMal.setY(malY);

/* ————— pekare, lappen och klick ————— */
const ray = new T.Raycaster();
const pek = new T.Vector2(9, 9);
const lapp = document.getElementById('lapp');
const bubbla = document.getElementById('bubbla');
let hovrad = null, pekareRord = false, nav = null;
function setHover(id, fran) {
  if (hovrad === id && fran !== 'nav') return;
  hovrad = id;
  document.querySelectorAll('.topp button[data-sak]').forEach(b => b.classList.toggle('lyst', b.dataset.sak === id));
  if (id) {
    const s = saker.get(id);
    const under = typeof s.under === 'function' ? s.under() : s.under;
    lapp.innerHTML = s.etikett + (under ? `<small>${under}</small>` : '');
  }
  duk.classList.toggle('pekar', !!id && fran !== 'nav');
  lapp.classList.toggle('syns', !!id && fran === 'mus');
}
function traff(x, y) {
  pek.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
  ray.setFromCamera(pek, kam);
  const t = ray.intersectObjects(traffytor, false)[0];
  return t ? t.object.userData.sak : null;
}
let ned = null;
duk.addEventListener('pointermove', e => {
  if (e.pointerType === 'mouse') {
    mus.mx = (e.clientX / innerWidth) * 2 - 1;
    mus.my = -((e.clientY / innerHeight) * 2 - 1);
    lapp.style.left = e.clientX + 'px'; lapp.style.top = e.clientY + 'px';
    setHover(traff(e.clientX, e.clientY), 'mus');
  }
  if (ned && e.pointerId === ned.id && e.pointerType !== 'mouse') {
    const dx = e.clientX - ned.x;
    if (Math.abs(dx) > 6) ned.drog = true;
    panMal = T.MathUtils.clamp(ned.pan - dx / innerWidth * 7, -4.2, 4.6);
  }
});
duk.addEventListener('pointerdown', e => {
  if (!e.isPrimary) { if (ned) ned.drog = true; return; }
  ned = { id: e.pointerId, x: e.clientX, y: e.clientY, pan: panMal, drog: false };
});
duk.addEventListener('pointercancel', () => { ned = null; });
duk.addEventListener('pointerup', e => {
  if (e.pointerType === 'mouse' && e.button !== 0) { ned = null; return; }
  if (!ned || e.pointerId !== ned.id) return;
  const drog = ned.drog || Math.hypot(e.clientX - ned.x, e.clientY - ned.y) > 8;
  ned = null;
  if (drog) return;
  const id = traff(e.clientX, e.clientY);
  if (id) klicka(id); else if (oppenId) stang();
});
duk.addEventListener('pointerleave', () => { if (!nav) setHover(null); mus.mx = 0; mus.my = 0; });
document.querySelectorAll('.topp button[data-sak]').forEach(b => {
  b.addEventListener('mouseenter', () => { nav = b.dataset.sak; setHover(nav, 'nav'); });
  b.addEventListener('focus', () => { nav = b.dataset.sak; setHover(nav, 'nav'); });
  b.addEventListener('mouseleave', () => { nav = null; setHover(null); });
  b.addEventListener('blur', () => { nav = null; setHover(null); });
  b.addEventListener('click', () => klicka(b.dataset.sak));
});

/* ————— panelen ————— */
const panel = document.getElementById('panel');
const innehall = document.getElementById('panelinnehall');
let oppenId = null, senastFokus = null;
function klicka(id) {
  const s = saker.get(id);
  if (!s) return;
  if (id === 'en') { location.href = '/en/'; return; }
  if (id === 'klocka') { vaxlaDag(); return; }
  if (id === 'om') vinka();
  if (id === 'nyhetsbrev' && !reducerad && planFlyg.t === 0) planFlyg.t = 0.001;
  oppna(id);
}
function oppna(id) {
  const s = saker.get(id);
  const mall = document.getElementById('t-' + s.panel);
  if (!mall || oppenId === id) return;
  if (!oppenId) senastFokus = document.activeElement;
  innehall.replaceChildren(mall.content.cloneNode(true));
  panel.scrollTop = 0;
  panel.classList.add('oppen');
  oppenId = id;
  fokus = s.g.getWorldPosition(new T.Vector3()).add(new T.Vector3(0, 0.9, 0));
  const form = innehall.querySelector('#nbrev');
  if (form) kopplaNyhetsbrev(form);
  lapp.classList.remove('syns');
  setTimeout(() => panel.querySelector('.stang').focus({ preventScroll: true }), 60);
}
function stang() {
  panel.classList.remove('oppen');
  oppenId = null; fokus = null;
  if (senastFokus && senastFokus.focus) senastFokus.focus({ preventScroll: true });
}
panel.querySelector('.stang').addEventListener('click', stang);
addEventListener('keydown', e => { if (e.key === 'Escape' && oppenId) stang(); });

function kopplaNyhetsbrev(form) {
  form.addEventListener('submit', ev => {
    ev.preventDefault();
    const knapp = form.querySelector('button[type=submit]'), svar = form.querySelector('.svar');
    if (knapp.disabled || form.querySelector('input[name^="b_"]').value) return;
    knapp.disabled = true; svar.textContent = 'Skickar …';
    const d = new FormData(form), q = [];
    d.forEach((v, k) => q.push(encodeURIComponent(k) + '=' + encodeURIComponent(v)));
    const cb = 'mc' + Date.now(), s = document.createElement('script');
    const klar = text => { clearTimeout(vakt); knapp.disabled = false; svar.textContent = text; s.remove(); window[cb] = () => {}; };
    const vakt = setTimeout(() => klar('Det tog för lång tid. Försök igen om en stund.'), 10000);
    window[cb] = res => {
      if (res && res.result === 'success') return klar(/confirm|almost|bekr|nästan/i.test(res.msg || '') ? 'Tack! Kolla din inkorg och klicka på länken i mejlet för att bekräfta.' : 'Tack.');
      const msg = new DOMParser().parseFromString((res && res.msg) || '', 'text/html').body.textContent.replace(/^\d+\s*-\s*/, '');
      if (/captcha|robot/i.test(msg)) { clearTimeout(vakt); return HTMLFormElement.prototype.submit.call(form); }   // Mailchimps egen sida visar captchan
      klar(/already subscribed/i.test(msg) ? 'Du prenumererar redan. Tack!' : (msg || 'Något gick fel. Kontrollera adressen och försök igen.'));
    };
    s.onerror = () => klar('Något gick fel. Kontrollera adressen och försök igen.');
    s.src = form.action.replace('/post', '/post-json') + '?' + q.join('&') + '&c=' + cb;
    document.body.appendChild(s);
  });
}

/* ————— små händelser ————— */
let vinkT = 0, bubblaT = 0;
function vinka() { vinkT = 2.4; bubblaT = 2.8; }
const planFlyg = { t: 0 };

/* ————— animationen ————— */
let tid = 0, forra = performance.now(), forstaBild = true, senastRitad = 0, skuggBild = 0;
const tmp = new T.Vector3();
function bild(nu) {
  const aktiv = hovrad || oppenId || vinkT > 0 || planFlyg.t > 0 || intro.t < 3 || Math.abs(dagMal - dagNiva) > 0.001 ||
    Math.abs(panMal - panorering) > 0.01 || Math.abs(mus.mx - mus.x) > 0.002 || Math.abs(mus.my - mus.y) > 0.002;
  const grans = 1000 / (aktiv ? (LAG ? 40 : 60) : (LAG ? 24 : 30));
  if (nu - senastRitad < grans - 2) return;
  senastRitad = nu;
  const dt = Math.min(0.05, (nu - forra) / 1000); forra = nu;
  tid += dt; intro.t += dt;

  if (!direkt && intro.t < 2.2) {
    const t = intro.t;
    const flimmer = t < 0.35 ? 0 : t < 0.55 ? 0.6 : t < 0.85 ? 0.12 : t < 1.05 ? 0.7 : t < 1.3 ? 0.3 : Math.min(1, 0.6 + (t - 1.3) * 0.45);  // högst tre ryck per sekund
    lampNiva = flimmer;
  } else lampNiva = 1;
  if (dagNiva !== dagMal) {
    dagNiva += Math.sign(dagMal - dagNiva) * Math.min(Math.abs(dagMal - dagNiva), dt / 1.4);
    satDag(dagNiva);
  }
  satLampa(lampNiva * (1 - 0.88 * dagNiva));                      // på dagen är lampan nästan släckt

  // svävar och lyft för sakerna man pekar på
  for (const s of saker.values()) {
    const mal = (s.id === hovrad || s.id === oppenId) ? 1 : 0;
    s.lyft += (mal - s.lyft) * Math.min(1, dt * 9);
    s.g.position.y = s.basY + s.lyft * 0.16;
  }

  kod.steg(tid, dt);
  tv.steg(dt);

  for (const o of minnen) {
    const u = o.userData;
    const a = u.a + tid * u.fart;
    o.position.set(Math.cos(a) * u.rad, u.y + Math.sin(tid * 1.3 + u.fas) * 0.12, Math.sin(a) * u.rad);
  }
  for (const o of rymlingar) {
    const u = o.userData;
    const t = ((tid + u.t) % 6.6) / 6.6;
    o.position.set(u.x + Math.sin(t * 9) * 0.12, 1.9 + t * 2.4, u.z);
    o.material.opacity = Math.sin(Math.min(1, t * 1.15) * Math.PI) * 0.9;
  }

  // roboten sover tills någon kommer nära
  const vaken = saker.get('agera').lyft;
  robotDelar.ogon.forEach(o => { o.scale.y = 0.22 + vaken * 0.78; });
  robotDelar.ogonMat.emissiveIntensity = 0.7 + vaken * 3.6;
  robotDelar.huvud.rotation.x = -0.08 - vaken * 0.12 + Math.sin(tid * 0.9) * 0.02 * (1 - vaken);
  robotDelar.huvud.rotation.y = vaken * 0.35;
  robotDelar.antMat.emissiveIntensity = 1.2 + Math.sin(tid * (2 + vaken * 6)) * 0.8;
  robotDelar.lampor.forEach((l, i) => { l.visible = Math.sin(tid * 2.2 + i * 1.7) > -0.4; });
  robot.getWorldPosition(tmp);
  zz.forEach(s => {
    s.userData.t += dt;
    const t = (s.userData.t % 3.3) / 3.3;
    s.position.set(tmp.x + 0.55 + t * 0.6, 2.4 + t * 1.4, tmp.z + 0.2);
    s.scale.setScalar(0.22 + t * 0.25);
    s.material.opacity = Math.sin(t * Math.PI) * 0.75 * (1 - vaken);
  });

  // Jonas: andas, tittar upp när man pekar på honom och vinkar när man klickar
  const jl = saker.get('om').lyft;
  jonasDelar.huvud.rotation.y = -jl * 0.5 + Math.sin(tid * 0.6) * 0.06;
  jonasDelar.huvud.rotation.x = -jl * 0.1;
  const blink = ((tid + 2.5) % 4.1) < 0.12 ? 0.15 : 1;
  jonasDelar.ogon.forEach(o => { o.scale.y = blink; });
  if (vinkT > 0) {
    vinkT -= dt;
    const m = 2.5 + Math.sin(tid * 14) * 0.35;
    jonasDelar.hogerArm.rotation.z += (m - jonasDelar.hogerArm.rotation.z) * Math.min(1, dt * 14);
  } else jonasDelar.hogerArm.rotation.z += (0.14 - jonasDelar.hogerArm.rotation.z) * Math.min(1, dt * 8);
  if (bubblaT > 0) {
    bubblaT -= dt;
    jonasDelar.huvud.getWorldPosition(tmp); tmp.y += 0.75; tmp.project(kam);
    bubbla.style.left = ((tmp.x + 1) / 2 * innerWidth) + 'px';
    bubbla.style.top = ((1 - tmp.y) / 2 * innerHeight) + 'px';
  }
  bubbla.classList.toggle('syns', bubblaT > 0);

  // pappersplanet: lyfter lite när man pekar, flyger en lov när man klickar
  const pl = saker.get('nyhetsbrev').lyft;
  if (planFlyg.t > 0) {
    planFlyg.t += dt / 2.6;
    const t = planFlyg.t, a = t * Math.PI * 2;
    planKropp.position.set(Math.sin(a) * 1.6, 0.23 + Math.sin(t * Math.PI) * 2.2, -Math.sin(a * 0.5) * 2.0);
    planKropp.rotation.set(Math.sin(a) * 0.3, -a, Math.sin(a) * 0.5);
    if (t >= 1) { planFlyg.t = 0; planKropp.position.set(0, 0.23, 0); planKropp.rotation.set(0, 0, 0); }
  } else {
    planKropp.rotation.x = -pl * 0.25; planKropp.rotation.z = Math.sin(tid * 3) * 0.04 * pl;
  }

  // kuvertet öppnar sig inte, men sigillet blänker till
  // klockan visar riktig tid
  const d = new Date();
  const sek = d.getSeconds() + d.getMilliseconds() / 1000, min = d.getMinutes() + sek / 60, tim = (d.getHours() % 12) + min / 60;
  visare.sek.rotation.z = -sek / 60 * Math.PI * 2;
  visare.min.rotation.z = -min / 60 * Math.PI * 2;
  visare.tim.rotation.z = -tim / 12 * Math.PI * 2;

  // jordgloben snurrar sakta, fortare när man pekar på den
  if (!reducerad || saker.get('geografi').lyft > 0.01) jordklot.rotation.y += dt * (0.12 + saker.get('geografi').lyft * 1.4);

  // ånga, damm och bokeh
  anga.forEach(s => {
    const t = (s.userData.t + tid * 0.18) % 1;
    s.position.set(Math.sin(t * 8 + s.userData.t * 9) * 0.12, 1.3 + t * 1.5, 0);
    s.scale.setScalar(0.25 + t * 0.6);
    s.material.opacity = Math.sin(t * Math.PI) * 0.16;
  });
  {
    const p = damm.geometry.attributes.position, f = damm.userData.fas;
    for (let i = 0; i < p.count; i++) {
      const [a, b, v] = f[i];
      p.array[i * 3] += Math.sin(tid * 0.3 + a) * v * dt;
      p.array[i * 3 + 1] += Math.cos(tid * 0.25 + b) * v * dt * 0.6;
      p.array[i * 3 + 2] += Math.sin(tid * 0.2 + b) * v * dt;
    }
    p.needsUpdate = true;
    damm.material.opacity = 0.55 * lampNiva * (1 - 0.6 * dagNiva);
  }
  bokeh.forEach(s => {
    const u = s.userData;
    s.material.opacity = u.bas * (0.7 + Math.sin(tid * u.fart + u.fas) * 0.3) * (1 - dagNiva);
    s.visible = dagNiva < 1;
    s.position.x = u.x0 + Math.sin(tid * 0.05 + u.fas) * 0.4;
  });

  const rorelse = vinkT > 0 || planFlyg.t > 0 ||
    [...saker.values()].some(s => Math.abs(((s.id === hovrad || s.id === oppenId) ? 1 : 0) - s.lyft) > 0.002);
  if (rorelse || ++skuggBild % 8 === 0) renderer.shadowMap.needsUpdate = true;

  uppdateraKamera(dt);
  vinjett.uniforms.tid.value = tid % 100;
  komp.render(dt);

  if (forstaBild) { forstaBild = false; laddar.classList.add('borta'); window.__skrivbordKlart = true; }
}
renderer.setAnimationLoop(bild);
