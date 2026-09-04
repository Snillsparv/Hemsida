/* ============================================================================
   REEL – liten deterministisk canvas-tidslinje för reelen "Det hemliga samhället".

   Allt ritas som en ren funktion av tiden t (sekunder). Ingen scen får spara
   tillstånd mellan bildrutor – då går det inte att scrubba eller rendera.
   Scener registreras med REEL.scene({ id, name, start, end, pre, post, draw }).
   draw(ctx, s, t): s = sekunder sedan scenens start (kan vara < 0 under "pre"
   och > längden under "post"), t = global tid. ctx är redan save():ad och
   i 1080×1920-koordinater. Bakgrunden är redan fylld med C.bg.
   ============================================================================ */
(function () {
  'use strict';

  const W = 1080, H = 1920;
  const C = { bg: '#0c0c0d', ink: '#eae6dc', mist: '#b7b1a4', hair: '#3f3d37', accent: '#ffd166', red: '#e23b4e' };
  const F = { sans: '"Space Grotesk"', mono: '"JetBrains Mono"', serif: 'Fraunces' };
  // Instagram-säker yta: nedre ~400 px täcks av UI, högerkanten av knappar.
  const SAFE = { x: 72, y: 220, w: 936, h: 1300, x2: 1008, y2: 1520, cx: 540, cy: 870 };

  /* ---------------------------------------------------------------- easing */
  const E = {
    linear: p => p,
    inQuad: p => p * p,
    outQuad: p => 1 - (1 - p) * (1 - p),
    inOutQuad: p => (p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2),
    inCubic: p => p * p * p,
    outCubic: p => 1 - Math.pow(1 - p, 3),
    inOutCubic: p => (p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
    outQuart: p => 1 - Math.pow(1 - p, 4),
    outQuint: p => 1 - Math.pow(1 - p, 5),
    inExpo: p => (p <= 0 ? 0 : Math.pow(2, 10 * p - 10)),
    outExpo: p => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p)),   // ≈ sajtens cubic-bezier(.16,1,.3,1)
    inOutExpo: p => (p <= 0 ? 0 : p >= 1 ? 1 : p < .5 ? Math.pow(2, 20 * p - 10) / 2 : (2 - Math.pow(2, -20 * p + 10)) / 2),
    inSine: p => 1 - Math.cos(p * Math.PI / 2),
    outSine: p => Math.sin(p * Math.PI / 2),
    inOutSine: p => -(Math.cos(Math.PI * p) - 1) / 2,
    outBack: p => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); },
    inBack: p => { const c1 = 1.70158, c3 = c1 + 1; return c3 * p * p * p - c1 * p * p; },
  };

  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
  const lerp = (a, b, p) => a + (b - a) * p;

  /** Framsteg 0..1 för t över intervallet [a,b], valfritt easad. */
  function seg(t, a, b, ease) {
    if (b <= a) return t >= a ? 1 : 0;
    const p = clamp01((t - a) / (b - a));
    return ease ? ease(p) : p;
  }
  /** Alfa för något som tonar in under fi s från 0, och ut under fo s före dur. */
  function fade(s, dur, fi = .6, fo = .6) {
    const a = fi > 0 ? clamp01(s / fi) : (s >= 0 ? 1 : 0);
    const b = fo > 0 ? clamp01((dur - s) / fo) : (s < dur ? 1 : 0);
    return Math.min(a, b);
  }
  /** 1 inom [a,b), annars 0. */
  const hold = (t, a, b) => (t >= a && t < b ? 1 : 0);
  /** Mjuk puls lo..hi med period i sekunder (sinus). */
  const pulse = (t, period = 1, lo = 0, hi = 1, phase = 0) => lo + (hi - lo) * (.5 - .5 * Math.cos(2 * Math.PI * (t / period + phase)));
  /** Deterministiskt flimmer 0..1 som byter värde `rate` ggr/s. */
  const flicker = (t, seed = 0, rate = 12) => hash(Math.floor(t * rate), seed);

  /* ---------------------------------------------------------------- slump */
  /** Seedad slumpgenerator (mulberry32). */
  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  /** Deterministiskt 0..1 för heltal i (och seed). Billigt, ingen array behövs. */
  function hash(i, seed = 0) {
    let x = (Math.imul(i | 0, 374761393) + Math.imul(seed | 0, 668265263)) | 0;
    x = Math.imul(x ^ (x >>> 13), 1274126177) | 0;
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
  }
  /** k unika, deterministiskt valda index ur [0,n), sorterade. */
  function pick(n, k, seed = 1) {
    const r = rng(seed), idx = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const tmp = idx[i]; idx[i] = idx[j]; idx[j] = tmp; }
    return idx.slice(0, Math.min(k, n)).sort((a, b) => a - b);
  }

  /* ---------------------------------------------------------------- färg */
  const _rgb = {};
  function hexToRgb(hex) {
    if (_rgb[hex]) return _rgb[hex];
    const n = parseInt(hex.slice(1), 16);
    return (_rgb[hex] = [n >> 16 & 255, n >> 8 & 255, n & 255]);
  }
  const rgba = (hex, a = 1) => { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; };
  /** Blandning av två hexfärger, p = 0..1, som rgba-sträng. */
  function mix(hexA, hexB, p, a = 1) {
    const A = hexToRgb(hexA), B = hexToRgb(hexB); p = clamp01(p);
    return `rgba(${Math.round(lerp(A[0], B[0], p))},${Math.round(lerp(A[1], B[1], p))},${Math.round(lerp(A[2], B[2], p))},${a})`;
  }

  /* ---------------------------------------------------------------- text */
  function setFont(ctx, o = {}) {
    ctx.font = `${o.style || ''} ${o.weight || 400} ${o.size || 40}px ${o.family || F.sans}`.trim();
  }
  /**
   * Ritar en textrad. o: family, size, weight, style, color, align, baseline,
   * spacing (spärrning i em, t.ex. .3), alpha, upper. Returnerar bredden.
   */
  function text(ctx, str, x, y, o = {}) {
    if (str == null || str === '') return 0;
    const size = o.size || 40;
    str = o.upper ? String(str).toUpperCase() : String(str);
    ctx.save();
    setFont(ctx, o);
    ctx.fillStyle = o.color || C.ink;
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.baseline || 'alphabetic';
    if (o.alpha != null) ctx.globalAlpha *= clamp01(o.alpha);
    if (o.spacing) {
      ctx.letterSpacing = (o.spacing * size) + 'px';
      // Chrome lägger spärrning även efter sista tecknet – kompensera så att texten hamnar rätt.
      if (ctx.textAlign === 'center') x += o.spacing * size / 2;
      else if (ctx.textAlign === 'right') x += o.spacing * size;
    }
    ctx.fillText(str, x, y);
    const w = ctx.measureText(str).width;
    ctx.restore();
    return w;
  }
  /** Mäter textbredd med samma o som text(). */
  function measure(ctx, str, o = {}) {
    ctx.save(); setFont(ctx, o);
    if (o.spacing) ctx.letterSpacing = (o.spacing * (o.size || 40)) + 'px';
    const w = ctx.measureText(o.upper ? String(str).toUpperCase() : String(str)).width;
    ctx.restore(); return w;
  }
  /** Sajtens etikettstil: mono, versaler, spärrning .3em, mist. */
  function label(ctx, str, x, y, o = {}) {
    return text(ctx, str, x, y, Object.assign({ family: F.mono, size: 30, spacing: .3, upper: true, color: C.mist, align: 'center' }, o));
  }
  /** Radbryter str till rader som ryms i maxWidth. ctx.font måste vara satt (setFont). */
  function wrap(ctx, str, maxWidth) {
    const out = [];
    for (const para of String(str).split('\n')) {
      const words = para.split(' '); let line = '';
      for (const w of words) {
        const test = line ? line + ' ' + w : w;
        if (ctx.measureText(test).width > maxWidth && line) { out.push(line); line = w; }
        else line = test;
      }
      out.push(line);
    }
    return out;
  }
  /**
   * Ritar ett radbrutet stycke. o som text() plus maxWidth, lineHeight (em, std 1.3),
   * valign ('top'|'middle'|'bottom' – var y hamnar i blocket). Returnerar { lines, height }.
   */
  function paragraph(ctx, str, x, y, o = {}) {
    const size = o.size || 40, lh = (o.lineHeight || 1.3) * size;
    ctx.save(); setFont(ctx, o);
    if (o.spacing) ctx.letterSpacing = (o.spacing * size) + 'px';
    const lines = wrap(ctx, o.upper ? String(str).toUpperCase() : str, o.maxWidth || SAFE.w);
    ctx.restore();
    const height = lh * lines.length;
    let y0 = y;
    if (o.valign === 'middle') y0 = y - height / 2 + lh * .78;
    else if (o.valign === 'bottom') y0 = y - height + lh * .78;
    else y0 = y + lh * .78;
    const oo = Object.assign({}, o, { baseline: 'alphabetic' });
    lines.forEach((ln, i) => text(ctx, ln, x, y0 + i * lh, oo));
    return { lines, height, lineHeight: lh };
  }
  /** Skrivmaskin: så många tecken av str som hunnit visas efter s sekunder (cps tecken/s). */
  function type(str, s, cps = 18, delay = 0) {
    const n = clamp(Math.floor((s - delay) * cps), 0, str.length);
    return str.slice(0, n);
  }
  /** Skrivmaskin med framsteg p = 0..1. */
  const typewriter = (str, p) => str.slice(0, clamp(Math.floor(clamp01(p) * (str.length + 1)), 0, str.length));
  /** Blinkande markör: true/false. */
  const cursorOn = (t, hz = 1.2) => Math.floor(t * hz * 2) % 2 === 0;
  /** Svensk tusentalsavgränsning: 70000 → "70 000". */
  const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  /** Räknare som går snabbt i början och landar mjukt (som sajtens laddskärm). */
  const countTo = (target, p, ease = E.outCubic) => Math.round(target * ease(clamp01(p)));

  /* ---------------------------------------------------------------- former */
  function roundRect(ctx, x, y, w, h, r = 0) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    if (r <= 0) { ctx.rect(x, y, w, h); return; }
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  /** Ruta: o.r radie, o.stroke (std hair), o.fill, o.width (std 1), o.alpha. */
  function box(ctx, x, y, w, h, o = {}) {
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha *= clamp01(o.alpha);
    roundRect(ctx, x, y, w, h, o.r || 0);
    if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
    if (o.stroke !== null) { ctx.strokeStyle = o.stroke || C.hair; ctx.lineWidth = o.width || 1; ctx.stroke(); }
    ctx.restore();
  }
  /**
   * Prick (agent). o.color (std ink), o.alpha, o.glow (0 = ingen; 1 = mjuk gloria
   * ~3× radien – billig, två extra cirklar utan gradient).
   */
  function dot(ctx, x, y, r, o = {}) {
    const col = o.color || C.ink, a = o.alpha == null ? 1 : clamp01(o.alpha);
    if (a <= 0 || r <= 0) return;
    ctx.save();
    if (o.glow) {
      const g = o.glow;
      ctx.fillStyle = col; ctx.globalAlpha = a * .10 * g;
      ctx.beginPath(); ctx.arc(x, y, r * 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = a * .22 * g;
      ctx.beginPath(); ctx.arc(x, y, r * 1.9, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = a; ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  /** Linje. o.color, o.width, o.alpha, o.dash ([a,b]), o.progress (0..1 från start), o.cap. */
  function line(ctx, x1, y1, x2, y2, o = {}) {
    const p = o.progress == null ? 1 : clamp01(o.progress);
    if (p <= 0) return;
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha *= clamp01(o.alpha);
    ctx.strokeStyle = o.color || C.hair; ctx.lineWidth = o.width || 1;
    ctx.lineCap = o.cap || 'round';
    if (o.dash) ctx.setLineDash(o.dash);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(lerp(x1, x2, p), lerp(y1, y2, p)); ctx.stroke();
    ctx.restore();
  }
  /** Pil med spets. o som line() plus o.head (std 14). */
  function arrow(ctx, x1, y1, x2, y2, o = {}) {
    const p = o.progress == null ? 1 : clamp01(o.progress);
    if (p <= 0) return;
    const ex = lerp(x1, x2, p), ey = lerp(y1, y2, p), ang = Math.atan2(y2 - y1, x2 - x1), h = o.head || 14;
    line(ctx, x1, y1, ex, ey, o);
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha *= clamp01(o.alpha);
    ctx.strokeStyle = o.color || C.hair; ctx.lineWidth = o.width || 1; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(ex - h * Math.cos(ang - .5), ey - h * Math.sin(ang - .5));
    ctx.lineTo(ex, ey);
    ctx.lineTo(ex - h * Math.cos(ang + .5), ey - h * Math.sin(ang + .5));
    ctx.stroke(); ctx.restore();
  }
  /** Cirkelbåge. o.from/o.to (0..1 varv, std 0..1), o.rot (startvinkel, std -90°), o.color, o.width, o.alpha, o.fill. */
  function arc(ctx, x, y, r, o = {}) {
    const from = o.from || 0, to = o.to == null ? 1 : o.to;
    if (to <= from && !o.fill) return;
    const rot = o.rot == null ? -Math.PI / 2 : o.rot;
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha *= clamp01(o.alpha);
    ctx.beginPath(); ctx.arc(x, y, r, rot + from * Math.PI * 2, rot + to * Math.PI * 2);
    if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
    if (o.stroke !== null) { ctx.strokeStyle = o.color || o.stroke || C.hair; ctx.lineWidth = o.width || 1; ctx.lineCap = 'round'; ctx.stroke(); }
    ctx.restore();
  }
  /** Polylinje [[x,y],...] med o.progress längs total längd (linjer som "tänds"). */
  function polyline(ctx, pts, o = {}) {
    if (pts.length < 2) return;
    const p = o.progress == null ? 1 : clamp01(o.progress);
    if (p <= 0) return;
    let total = 0; const segs = [];
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push(d); total += d; }
    let left = total * p;
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha *= clamp01(o.alpha);
    ctx.strokeStyle = o.color || C.hair; ctx.lineWidth = o.width || 1; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (o.dash) ctx.setLineDash(o.dash);
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      if (left >= segs[i - 1]) { ctx.lineTo(pts[i][0], pts[i][1]); left -= segs[i - 1]; }
      else { const q = segs[i - 1] ? left / segs[i - 1] : 1; ctx.lineTo(lerp(pts[i - 1][0], pts[i][0], q), lerp(pts[i - 1][1], pts[i][1], q)); break; }
    }
    ctx.stroke(); ctx.restore();
  }
  /** Punkt längs en kvadratisk bézier (för "paket som skickas" längs mjuka banor). */
  function bezierPoint(x1, y1, cx, cy, x2, y2, p) {
    const q = 1 - p;
    return [q * q * x1 + 2 * q * p * cx + p * p * x2, q * q * y1 + 2 * q * p * cy + p * p * y2];
  }

  /* ---------------------------------------------------------------- layout */
  const _fields = new Map();
  /**
   * Agentfältet: n prickar i ett rutnät som fyller o.area (std SAFE). Samma anrop
   * ger alltid samma positioner – det är så scenerna delar "de 1 200 agenterna".
   * o.cols tvingar antal kolumner, o.jitter (0..1) knuffar prickarna ur rutnätet, o.seed.
   * Returnerar { pts:[{i,x,y,col,row,gx,gy}], cols, rows, cell, x, y, w, h }.
   */
  function agents(n, o = {}) {
    const key = n + '|' + JSON.stringify(o);
    if (_fields.has(key)) return _fields.get(key);
    const area = o.area || SAFE;
    const cols = o.cols || Math.max(1, Math.round(Math.sqrt(n * area.w / area.h)));
    const rows = Math.ceil(n / cols);
    const cell = o.cell || Math.min(area.w / cols, area.h / rows);
    const gw = cell * cols, gh = cell * rows;
    const ox = area.x + (area.w - gw) / 2, oy = area.y + (area.h - gh) / 2;
    const j = (o.jitter || 0) * cell * .5, seed = o.seed || 1;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const col = i % cols, row = Math.floor(i / cols);
      const gx = ox + col * cell + cell / 2, gy = oy + row * cell + cell / 2;
      pts.push({ i, col, row, gx, gy, x: gx + (hash(i, seed) * 2 - 1) * j, y: gy + (hash(i, seed + 7) * 2 - 1) * j });
    }
    const f = { pts, cols, rows, cell, x: ox, y: oy, w: gw, h: gh };
    _fields.set(key, f);
    return f;
  }

  /* ---------------------------------------------------------------- scener */
  const scenes = [];
  function scene(def) {
    if (!def || !def.id || typeof def.draw !== 'function') throw new Error('REEL.scene: id och draw krävs');
    def.pre = def.pre || 0; def.post = def.post || 0; def.name = def.name || def.id;
    const i = scenes.findIndex(s => s.id === def.id);
    if (i >= 0) scenes[i] = def; else scenes.push(def);
    scenes.sort((a, b) => a.start - b.start);
    return def;
  }
  const sceneAt = t => scenes.find(s => t >= s.start && t < s.end) || null;

  /* ---------------------------------------------------------------- klocka */
  let canvas = null, ctx = null, dpr = 1, time = 0, playing = false, rafId = 0, lastTs = 0;
  let rate = 1, loop = null;
  const flags = { guides: false, stamp: false };
  const listeners = {};
  const on = (ev, fn) => ((listeners[ev] = listeners[ev] || []).push(fn), fn);
  const emit = (ev, ...a) => (listeners[ev] || []).forEach(fn => fn(...a));
  const errors = [];

  function mount(el, o = {}) {
    canvas = el; dpr = o.dpr || (window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx = canvas.getContext('2d', { alpha: false });
    return ctx;
  }

  function render(t) {
    if (!ctx) return;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    for (const sc of scenes) {
      if (t >= sc.start - sc.pre && t < sc.end + sc.post) {
        ctx.save(); ctx.beginPath();
        try { sc.draw(ctx, t - sc.start, t); }
        catch (e) {
          ctx.restore(); ctx.save();
          const msg = sc.id + ': ' + (e && e.message || e);
          if (!errors.includes(msg)) { errors.push(msg); console.error('[REEL] scen', sc.id, e); }
          paragraph(ctx, 'FEL i scen ' + sc.id + '\n' + (e && e.message || e), SAFE.x, 1560, { family: F.mono, size: 26, color: C.red, maxWidth: SAFE.w });
        }
        ctx.restore();
      }
    }
    if (flags.guides) drawGuides(ctx);
    if (flags.stamp) drawStamp(ctx, t);
    ctx.restore();
    emit('frame', t);
  }
  function drawGuides(ctx) {
    ctx.save(); ctx.globalAlpha = .5;
    ctx.strokeStyle = C.red; ctx.setLineDash([12, 10]); ctx.lineWidth = 2;
    ctx.strokeRect(SAFE.x, SAFE.y, SAFE.w, SAFE.h);
    ctx.setLineDash([]); ctx.strokeStyle = C.hair;
    ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();
    ctx.restore();
    label(ctx, 'säker yta', SAFE.x + 8, SAFE.y - 12, { align: 'left', color: C.red, size: 22 });
  }
  function drawStamp(ctx, t) {
    const sc = sceneAt(t);
    const s = Math.floor(t), str = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}.${String(Math.floor((t - s) * 10))}` + (sc ? '  ' + sc.id : '');
    ctx.save(); ctx.globalAlpha = .9;
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, 0, 40 + str.length * 15, 46);
    text(ctx, str, 20, 32, { family: F.mono, size: 24, color: C.accent });
    ctx.restore();
  }

  function seek(t, o) {
    time = clamp(+t || 0, 0, REEL.DURATION);
    if (o && o.stamp != null) flags.stamp = !!o.stamp;
    if (o && o.guides != null) flags.guides = !!o.guides;
    render(time); emit('time', time);
  }
  function tick(ts) {
    if (!playing) return;
    const dt = Math.min(.1, (ts - lastTs) / 1000); lastTs = ts;
    let t = time + dt * rate;
    if (loop && t >= loop.end) t = loop.start;
    if (t >= REEL.DURATION) { t = REEL.DURATION; time = t; render(t); emit('time', t); pause(); emit('ended'); return; }
    time = t; render(t); emit('time', t);
    rafId = requestAnimationFrame(tick);
  }
  function play() {
    if (playing) return;
    if (time >= REEL.DURATION) time = loop ? loop.start : 0;
    playing = true; lastTs = performance.now(); emit('play');
    rafId = requestAnimationFrame(tick);
  }
  function pause() { if (!playing) return; playing = false; cancelAnimationFrame(rafId); emit('pause'); }
  const toggle = () => (playing ? pause() : play());

  /* ---------------------------------------------------------------- typsnitt */
  const FACES = [
    '400 40px "Space Grotesk"', '500 40px "Space Grotesk"', '700 40px "Space Grotesk"',
    '400 40px "JetBrains Mono"', '500 40px "JetBrains Mono"', '700 40px "JetBrains Mono"', 'italic 400 40px "JetBrains Mono"',
    '400 40px Fraunces', '600 40px Fraunces', 'italic 400 40px Fraunces',
  ];
  const ready = new Promise(resolve => {
    const done = () => resolve(true);
    setTimeout(done, 5000);
    if (!document.fonts || !document.fonts.load) return done();
    Promise.all(FACES.map(f => document.fonts.load(f).catch(() => null))).then(() => document.fonts.ready).then(done, done);
  });

  window.REEL = {
    W, H, C, F, SAFE, E,
    clamp, clamp01, lerp, seg, fade, hold, pulse, flicker,
    rng, hash, pick, hexToRgb, rgba, mix,
    setFont, text, measure, label, wrap, paragraph, type, typewriter, cursorOn, fmt, countTo,
    roundRect, box, dot, line, arrow, arc, polyline, bezierPoint, agents,
    scene, scenes, sceneAt, mount, render, seek, play, pause, toggle, on, ready, flags, errors,
    get time() { return time; }, get playing() { return playing; },
    get rate() { return rate; }, set rate(v) { rate = v; },
    get loop() { return loop; }, set loop(v) { loop = v; },
    DURATION: 190, FPS: 30, T: {}, VO: [],
  };
})();
