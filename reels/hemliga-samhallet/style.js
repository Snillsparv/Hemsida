/* ============================================================================
   Delade visuella konventioner enligt STORYBOARD.md – bygg ALLTID på dessa så
   att prickar, boxar, räknare, öga och text ser exakt likadana ut i alla scener.
   ============================================================================ */
(function () {
  const R = REEL, C = R.C, F = R.F, E = R.E;
  const TAU = Math.PI * 2;

  /* ------------------------------------------------------------ konstanter */
  const S = {
    R: { falt: 3, rutnat: 5, hjalte: 7, kopia: 3.5, disk: 4 },   // radie per läge
    ISOLERAD: { alpha: .70 },                                    // ink, ingen halo, andas inte
    AKTIV:    { alpha: 1, halo: .22, haloR: 3.5, T: 3.2, amp: .06 },
    TALAR:    { halo: .28, haloR: 4, hold: .5, release: .9 },    // gul
    HJALTE:   { ring: 13, ringAlpha: .35 },
    GOMD:     { alpha: .25, attack: .2, release: .6 },
    DOD:      { alpha: .50 },                                    // tom ring, 1 px stroke ink
    TYSTNAD:  { color: C.hair },
    ROD:      { halo: .20, haloR: 3, rScale: 1.3, period: 1.25 },
    LUGN:     { alpha: .70, halo: .12, haloR: 3.5, T: 4, amp: .06 },
    BOX:      { alpha: .85, inset: 14 },                         // sida = cell − 14
    HAIR:     { alpha: .85 },
    EDGE:     { rest: .55, lit: .9, litDur: .5, settle: .9 },    // gul kantlinje
    BUD:      { len: 6, width: 2, speed: .35, alpha: .9 },       // bud längs kanterna
    TEXT:     { fi: .9, fo: .9, rise: 16, riseDur: 1.1, cps: 28, cursorPeriod: .9 },
    MASK:     { pad: 40, edge: 60, strength: .75 },
  };
  R.S = S;

  /* ------------------------------------------------------------ halo-sprites */
  const sprites = {};
  function sprite(hex) {
    if (sprites[hex]) return sprites[hex];
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 6, 32, 32, 32);
    grad.addColorStop(0, R.rgba(hex, 1)); grad.addColorStop(1, R.rgba(hex, 0));
    g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
    return (sprites[hex] = c);
  }
  const colorOf = c => (c === 'ink' || !c) ? C.ink : c === 'accent' || c === 'gul' ? C.accent : c === 'red' || c === 'rod' ? C.red : c;
  /** Halo: förrenderad radialgradient, ritad som 2·scale·r bred (std 3.5r). */
  R.halo = function (ctx, x, y, r, o = {}) {
    const a = o.alpha == null ? S.AKTIV.halo : o.alpha;
    if (a <= 0 || r <= 0) return;
    const sc = o.scale || S.AKTIV.haloR, w = 2 * sc * r;
    ctx.save(); ctx.globalAlpha *= R.clamp01(a);
    ctx.drawImage(sprite(colorOf(o.color)), x - w / 2, y - w / 2, w, w);
    ctx.restore();
  };

  /* ------------------------------------------------------------ agenter */
  /** Fas och jitter per agent-index (samma i alla scener). */
  R.phase = i => TAU * R.hash(i, 2);
  R.jit = i => R.hash(i, 3);
  /** Andningsradie: r·(1 + amp·sin(2π t/T + φ_i)). */
  R.breath = (r, t, i, T = S.AKTIV.T, amp = S.AKTIV.amp) => (T > 0 ? r * (1 + amp * Math.sin(TAU * t / T + R.phase(i))) : r);

  /**
   * Ritar en agent enligt storyboardets tillståndstabell. o:
   *   x, y, r, i (index, för fas), t (tid för andning)
   *   color (hex/'ink'/'accent'/'red', std ink), alpha (fyllning, std 1)
   *   halo (alfa, 0 = ingen), haloR (std 3.5), haloColor (std = color)
   *   breath (period s, 0 = andas inte), amp (std .06)
   *   ring (radie för hjältens ring, 0 = ingen), ringAlpha (std .35)
   *   dead (true → bara en tom ring: 1 px stroke ink, alpha .5)
   *   mask (extra multiplikator, t.ex. textmask)
   */
  R.drawAgent = function (ctx, o) {
    const m = o.mask == null ? 1 : o.mask;
    const alpha = (o.alpha == null ? 1 : o.alpha) * m;
    const col = colorOf(o.color);
    const r = o.breath ? R.breath(o.r, o.t || 0, o.i || 0, o.breath, o.amp) : o.r;
    if (o.dead) {
      ctx.save(); ctx.globalAlpha *= R.clamp01((o.deadAlpha == null ? S.DOD.alpha : o.deadAlpha) * m);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, TAU); ctx.stroke(); ctx.restore();
      return;
    }
    if (o.halo > 0) R.halo(ctx, o.x, o.y, r, { alpha: o.halo * m, scale: o.haloR || S.AKTIV.haloR, color: o.haloColor || col });
    if (alpha > 0) {
      ctx.save(); ctx.globalAlpha *= R.clamp01(alpha); ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(o.x, o.y, r, 0, TAU); ctx.fill(); ctx.restore();
    }
    if (o.ring > 0) {
      ctx.save(); ctx.globalAlpha *= R.clamp01((o.ringAlpha == null ? S.HJALTE.ringAlpha : o.ringAlpha) * m);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(o.x, o.y, o.ring, 0, TAU); ctx.stroke(); ctx.restore();
    }
  };

  /** Box (isolering): 1 px hair, alpha .85, kvadrat centrerad på (x,y), på halvpixel. */
  R.agentBox = function (ctx, x, y, side, alpha = S.BOX.alpha, color = C.hair) {
    if (alpha <= 0) return;
    ctx.save(); ctx.globalAlpha *= R.clamp01(alpha); ctx.strokeStyle = color; ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(x - side / 2) + .5, Math.round(y - side / 2) + .5, side, side); ctx.restore();
  };
  /** Boxens fyra väggar var för sig (för väggglöd): sides = {top,right,bottom,left} alpha 0..1, färg ink. */
  R.agentBoxWalls = function (ctx, x, y, side, sides, color = C.ink) {
    const x0 = Math.round(x - side / 2) + .5, y0 = Math.round(y - side / 2) + .5, x1 = x0 + side, y1 = y0 + side;
    const segs = { top: [x0, y0, x1, y0], right: [x1, y0, x1, y1], bottom: [x0, y1, x1, y1], left: [x0, y0, x0, y1] };
    for (const k in segs) if (sides[k] > 0) R.line(ctx, ...segs[k], { color, width: 1, alpha: sides[k], cap: 'butt' });
  };

  /* ------------------------------------------------------------ text */
  /**
   * Textens standardtoning: in 0.9 s smooth + 16 px stigning (expoOut 1.1 s),
   * ut 0.9 s smooth utan rörelse. Returnerar { a, dy }. tOut kan utelämnas.
   */
  R.textIn = function (s, tIn, tOut, o = {}) {
    const fi = o.fi == null ? S.TEXT.fi : o.fi, fo = o.fo == null ? S.TEXT.fo : o.fo;
    const rise = o.rise == null ? S.TEXT.rise : o.rise;
    let a = E.smooth(R.seg(s, tIn, tIn + fi));
    if (tOut != null) a *= 1 - E.smooth(R.seg(s, tOut, tOut + fo));
    const dy = rise * (1 - E.outExpo(R.seg(s, tIn, tIn + (o.riseDur || S.TEXT.riseDur))));
    return { a, dy };
  };
  /**
   * Skrivmaskin som inte hoppar: hela strängen mäts, ritas vänsterställt från cx − W/2.
   * o: size, family, weight, color, spacing, alpha, cps (28), cursor (true), cursorUntil (lokal tid).
   * Returnerar true när hela raden är skriven.
   */
  R.typeLine = function (ctx, str, cx, y, s, t0, o = {}) {
    const size = o.size || 68, cps = o.cps || S.TEXT.cps;
    const n = R.clamp(Math.floor((s - t0) * cps), 0, str.length);
    const opts = Object.assign({ size, family: F.sans, weight: 400, spacing: .05, color: C.ink }, o, { align: 'left' });
    const W = R.measure(ctx, str, opts), x0 = cx - W / 2;
    const sub = str.slice(0, n);
    if (n > 0) R.text(ctx, sub, x0, y, opts);
    const showCursor = o.cursor !== false && s >= t0 && (o.cursorUntil == null || s < o.cursorUntil) && Math.floor(s / S.TEXT.cursorPeriod) % 2 === 0;
    if (showCursor) {
      const cx2 = x0 + (n > 0 ? R.measure(ctx, sub, opts) : 0) + 8;
      ctx.save(); ctx.globalAlpha *= (o.alpha == null ? 1 : R.clamp01(o.alpha)); ctx.fillStyle = opts.color;
      ctx.fillRect(cx2, y - size / 2, 3, size); ctx.restore();
    }
    return n >= str.length;
  };
  /** Tabulära siffror: varje tecken på fast bredd (.6·size, mellanslag .35·size), centrerat på cx. */
  R.tabular = function (ctx, str, cx, y, o = {}) {
    str = String(str); const size = o.size || 88;
    const opts = Object.assign({ size, family: F.sans, weight: 500, color: C.ink }, o, { align: 'center', spacing: 0 });
    const w = ch => (ch === ' ' || ch === ' ' ? .35 : .6) * size;
    let total = 0; for (const ch of str) total += w(ch);
    let x = cx - total / 2;
    for (const ch of str) { const cw = w(ch); if (ch !== ' ' && ch !== ' ') R.text(ctx, ch, x + cw / 2, y, opts); x += cw; }
    return total;
  };
  /**
   * Räknarblock: etikett (Mono 32 mist .3em) på cy−70, tal (Space Grotesk 500 88 px, tabulärt)
   * på cy, landningsstreck (1 px gul, från mitten till ±160) på cy+56 med expoOut(landP).
   * value: tal (formateras) eller sträng. o.alpha, o.size (88), o.labelAlpha.
   */
  R.counter = function (ctx, cx, cy, value, labelStr, landP = 0, o = {}) {
    const a = o.alpha == null ? 1 : o.alpha;
    if (a <= 0) return;
    R.label(ctx, labelStr, cx, cy - 70, { alpha: a * (o.labelAlpha == null ? 1 : o.labelAlpha) });
    R.tabular(ctx, typeof value === 'number' ? R.fmt(value) : value, cx, cy, { size: o.size || 88, alpha: a });
    const p = E.outExpo(R.clamp01(landP));
    if (p > 0) R.line(ctx, cx - 160 * p, cy + 56 + .5, cx + 160 * p, cy + 56 + .5, { color: C.accent, width: 1, alpha: a, cap: 'butt' });
  };
  /** Liten räknare på en rad: tal 60 px + 24 px luft + etikett (eller etikett först med o.labelFirst). Landningsstreck på cy+44. */
  R.counterInline = function (ctx, cx, cy, value, labelStr, o = {}) {
    const a = o.alpha == null ? 1 : o.alpha;
    if (a <= 0) return;
    const str = typeof value === 'number' ? R.fmt(value) : String(value), size = o.size || 60;
    let nw = 0; for (const ch of str) nw += (ch === ' ' || ch === ' ' ? .35 : .6) * size;
    const lw = R.measure(ctx, labelStr, { family: F.mono, size: 32, spacing: .3, upper: true }) - 32 * .3;
    const gap = 24, total = nw + gap + lw;
    let x = cx - total / 2;
    if (o.labelFirst) {
      R.label(ctx, labelStr, x, cy + 2, { align: 'left', alpha: a }); x += lw + gap;
      R.tabular(ctx, str, x + nw / 2, cy, { size, alpha: a });
    } else {
      R.tabular(ctx, str, x + nw / 2, cy, { size, alpha: a }); x += nw + gap;
      R.label(ctx, labelStr, x, cy + 2, { align: 'left', alpha: a });
    }
    const p = E.outExpo(R.clamp01(o.landP || 0));
    if (p > 0) R.line(ctx, cx - 160 * p, cy + 44 + .5, cx + 160 * p, cy + 44 + .5, { color: C.accent, width: 1, alpha: a, cap: 'butt' });
  };

  /* ------------------------------------------------------------ textmask */
  /** Rektangel för en textmask: textens box + 40 px, a = maskens styrka (= textens alfa). */
  R.textRect = (cx, cy, w, h, a = 1) => ({ x: cx - w / 2 - S.MASK.pad, y: cy - h / 2 - S.MASK.pad, w: w + 2 * S.MASK.pad, h: h + 2 * S.MASK.pad, a });
  /** Maskfaktor 1 − .75·m för punkten (px,py) givet rects [{x,y,w,h,a}] – multiplicera in i alfa. */
  R.maskFactor = function (px, py, rects) {
    if (!rects || !rects.length) return 1;
    let m = 0;
    for (const r of rects) {
      if (!r || !(r.a > 0)) continue;
      const dx = Math.max(r.x - px, 0, px - (r.x + r.w)), dy = Math.max(r.y - py, 0, py - (r.y + r.h));
      const d = Math.hypot(dx, dy);
      const v = r.a * E.smooth(1 - R.clamp01(d / S.MASK.edge));
      if (v > m) m = v;
    }
    return 1 - S.MASK.strength * m;
  };

  /* ------------------------------------------------------------ dash-tekniken */
  /** Stroke:a en path som "ritas fram": L = pathens längd, p = 0..1. fn() bygger och strokar pathen. */
  R.strokeDash = function (ctx, L, p, fn) {
    ctx.save();
    if (p < 1) { ctx.setLineDash([L, L]); ctx.lineDashOffset = L * (1 - R.clamp01(p)); }
    if (p > 0) fn();
    ctx.restore();
  };
  /** Längd av en kvadratisk bézier (samplad). */
  R.quadLength = function (x0, y0, cx, cy, x1, y1, n = 40) {
    let L = 0, px = x0, py = y0;
    for (let k = 1; k <= n; k++) { const [x, y] = R.bezierPoint(x0, y0, cx, cy, x1, y1, k / n); L += Math.hypot(x - px, y - py); px = x; py = y; }
    return L;
  };

  /* ------------------------------------------------------------ ögat */
  /**
   * Ögat (scen 4 och 7). o: upper/lower (0..1, bågarna ritas fram med dash), iris (0..1),
   * pupil (alfa 0..1), irisR (30), pupilR (12), pupilX (drift), blink (0..1), alpha,
   * dash (t.ex. [4,8] → fast streckning, inget marscherande), color (ink), width (1).
   */
  R.eye = function (ctx, cx, cy, w, h, o = {}) {
    const a = o.alpha == null ? 1 : o.alpha;
    if (a <= 0) return;
    const hh = h * (o.blink ? (1 - Math.sin(Math.PI * R.clamp01(o.blink))) : 1);
    const col = o.color || C.ink, lw = o.width || 1;
    const L = R.quadLength(cx - w / 2, cy, cx, cy - hh, cx + w / 2, cy);
    ctx.save(); ctx.globalAlpha *= R.clamp01(a); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round';
    const arcs = [[o.upper == null ? 1 : o.upper, -1], [o.lower == null ? 1 : o.lower, 1]];
    for (const [p, sgn] of arcs) {
      if (p <= 0) continue;
      const draw = () => { ctx.beginPath(); ctx.moveTo(cx - w / 2, cy); ctx.quadraticCurveTo(cx, cy + sgn * hh, cx + w / 2, cy); ctx.stroke(); };
      if (o.dash) { ctx.save(); ctx.setLineDash(o.dash); ctx.lineDashOffset = 0; draw(); ctx.restore(); }
      else R.strokeDash(ctx, L, p, draw);
    }
    const iris = o.iris == null ? 1 : o.iris, ir = o.irisR || 30, px = cx + (o.pupilX || 0);
    if (iris > 0 && hh > 2) {
      const Li = TAU * ir;
      const draw = () => { ctx.beginPath(); ctx.arc(px, cy, ir, -Math.PI / 2, -Math.PI / 2 + TAU); ctx.stroke(); };
      if (o.dash) { ctx.save(); ctx.setLineDash(o.dash); ctx.lineDashOffset = 0; draw(); ctx.restore(); }
      else R.strokeDash(ctx, Li, iris, draw);
    }
    if (o.pupil > 0 && hh > 2) { ctx.globalAlpha *= R.clamp01(o.pupil); ctx.beginPath(); ctx.arc(px, cy, o.pupilR || 12, 0, TAU); ctx.fill(); }
    ctx.restore();
  };

  /* ------------------------------------------------------------ bud längs kanter */
  /** Position (0..1) för bud k på kant e vid tiden t: frac(t·0.35 + hash(e,k)). */
  R.budP = (t, e, k) => { const v = t * S.BUD.speed + R.hash(e, k + 11); return v - Math.floor(v); };
  /** Ritar ett bud (6 px ink-streck, lineWidth 2) på position p längs (x1,y1)→(x2,y2). */
  R.bud = function (ctx, x1, y1, x2, y2, p, o = {}) {
    const d = Math.hypot(x2 - x1, y2 - y1); if (d < 1) return;
    const ux = (x2 - x1) / d, uy = (y2 - y1) / d, cx = R.lerp(x1, x2, p), cy = R.lerp(y1, y2, p), hl = S.BUD.len / 2;
    R.line(ctx, cx - ux * hl, cy - uy * hl, cx + ux * hl, cy + uy * hl, { color: o.color || C.ink, width: S.BUD.width, alpha: o.alpha == null ? S.BUD.alpha : o.alpha });
  };
})();
