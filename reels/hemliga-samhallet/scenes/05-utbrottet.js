/* ============================================================================
   Scen 5 – Utbrottet (120–150 s). Tider: REEL.T.utbrottet. Se STORYBOARD.md.

   En 90 px bit av murens underkant fälls upp som en dörr, en gul ljuskil
   faller ut och avslöjar elva maskiner – och prickarna strömmar ut genom
   springan som en böljande flock, raderas rad för rad och stiger tillbaka.
   Till sist lösgör sig alla prickar och glider till solrosdisken (scen 6).

   Allt är en ren funktion av s (lokal tid) och t (global tid – används bara
   för det som ska vara kontinuerligt över scengränser: andningsfas och bud).
   Tabeller (kopiornas starttider, banor och mål, maskinernas tändtider,
   raderingarnas ordning, de nya prickarna, diskplatser) beräknas en gång
   vid laddning, seedat. Storyboardets tider är globala: L(g) = g − T.sb.
   ============================================================================ */
(function () {
  'use strict';
  const R = REEL, C = R.C, F = R.F, E = R.E, S = R.S, G = R.GRID, W = R.WEB, D = R.DISK, T = R.T.utbrottet;
  const TAU = Math.PI * 2, DEG = Math.PI / 180;
  const lerp = R.lerp, clamp01 = R.clamp01, hash = R.hash;
  const smooth = E.smooth, outExpo = E.outExpo, inOut = E.inOutCubic;
  const L = g => g - T.sb;                                   // storyboardtid → lokal tid
  const fade = (s, t0, d) => clamp01((s - t0) / d);          // storyboardets fade(t,t0,d)
  const invExpo = y => (y >= 1 ? 1 : -Math.log2(1 - y) / 10); // inversen av expoOut

  /* ------------------------------------------------------------ konstanter */
  const N = G.n, NE = W.edges.length, NJ = D.n;              // 117 agenter, 141 kanter, 1 200 diskplatser
  const Y_OFF = -140;                                        // rutnätet ligger på −140 sedan 117.5 (hjälten på (540,730))
  const R_GRID = S.R.rutnat, R_HERO = S.R.hjalte, R_KOPIA = S.R.kopia, R_DISK = S.R.disk;   // 5 / 7 / 3.5 / 4
  const INK_A = .9, HAIR_A = S.HAIR.alpha;                                                   // 1 px ink .9, hair .85
  const HALO_A = S.AKTIV.halo, HALO_R = S.AKTIV.haloR, BREATH_T = S.AKTIV.T, AMP = S.AKTIV.amp;   // .22, 3.5r, 3.2 s, .06
  const TALAR_HALO = S.TALAR.halo, TALAR_R = S.TALAR.haloR;                                 // .28, 4r
  const LUGN_A = S.LUGN.alpha, LUGN_HALO = S.LUGN.halo, LUGN_T = S.LUGN.T;                  // .70, .12, 4 s
  const ISO_A = S.ISOLERAD.alpha, DOD_A = S.DOD.alpha;                                       // .70, .50
  const EDGE_REST = S.EDGE.rest, BUD_A = S.BUD.alpha, BUD_LEN = S.BUD.len, BUD_W = S.BUD.width;   // .55, .9, 6 px, 2
  const NB = 40;                                             // alfa-buckets för kanter/bud (samma som scen 4 → identisk gränsbild)

  // Sandlådan: scen 4 lämnar väven på .5 (kanterna på .3). När kopiorna lämnar dämpas originalen till .35 (kanterna följer med).
  const SAND = { a0: .5, a1: .35, t0: L(126.8), d: 2.2, edge0: .3 };
  // 5.1 · muren (ritad färdig av scen 4) och dörren: segment x 495–585 på underkanten, gångjärn (495,1160)
  const FRAME = { x: 200.5, y: 300.5, w: 680, h: 860, alpha: INK_A };
  const DOOR = { x0: 495, x1: 585, y: 1160.5, ang: -55 * DEG, t0: L(121.2), d: 1.3 };
  const PEEK = { x: 540, y: 1180, dy: 40, r: 2, alpha: .5, t0: L(123.5), d: .8 };
  // 5.2 · ljuskilen från dörröppningen och de elva maskinerna
  // Storyboardets längd 700 ger en hård, nästan vågrät underkant på y≈1445 – 1900 lägger basen utanför bild (se rapporten)
  const CONE = { x: 540, y: 1160, len: 1900, half: 66 * DEG, t0: L(122.0), d: 1.6, fill: .07, edge: .25, sinkT: L(126.0), sinkD: .9, sink: .04 / .07, inD: .5 };
  // Storyboardets x-start 165+70k ger raden centrum 545 – 160 centrerar den på 540 (se rapporten)
  const MACH = { n: 11, x0: 160, step: 70, w: 60, y0: 1240, h: 160, inD: .6 };
  const LABEL = { str: 'HUGGING FACE · 11 MASKINER', y: 1212, t0: L(124.6) };
  // 5.3 · flocken: 700 kopior, agent c % 104 bland de levande aktiva (hjälten är död – ingen kopia lämnar en tom ring)
  const FLOCK = { n: 700, t0: L(126.8), spread: 10, pow: .8, d1: 1.2, d2: .9, jit: 6, amp0: 6, amp1: 14, f0: .8, f1: .7,
    inD: .35, talarIn: .08, talarOut: .25, delay: 2.1, restA: .7, restHalo: .08, restD: .9 };
  const DOOR_PT = { x: 540, y: 1160 };
  const COUNTER = { x: 540, y: 256, t0: L(128.5), landD: .7 };
  // 5.4 · raderingen: tre svep, allt snabbare; återkomst nedifrån och upp med TALAR; extra prickar i grannmaskinen
  const SWEEPS = [
    { m: [3], t0: L(139.6), d: .5, back: L(140.3), newM: 4, newN: 6, newT: L(140.6) },
    { m: [7], t0: L(142.4), d: .4, back: L(143.0), newM: 6, newN: 8, newT: L(143.3) },
    { m: [0, 1, 2], t0: L(144.8), d: .3, back: L(145.3), newM: 10, newN: 10, newT: L(145.6) },
  ];
  const BACK = { stagger: .008, d: .35, hold: .4, release: .9 };
  const EXTRA = { n: 24, spread: .5, inD: .35 };
  const LOG = { y: 1450, spacing: .12, cps: 28, t0: L(139.8), back: [L(140.5), L(143.0), L(145.3)], count: [L(143.2), L(145.5)], outD: .3, cursorTail: .6 };
  const LOG_A = '$ radera', LOG_GAP = '   ', LOG_B = '→ tillbaka', LOG_C = ['×2', '×3'], LOG_GB = LOG_GAP + LOG_B;
  // 5.5 · samlingen
  const OUT = { t0: L(148.2), d: .9 };                        // allt utom prickarna tonar bort
  const GATHER = { t0: L(148.4), spread: .4, d: 1.6 };        // prick j glider expoOut 1.6 s från 148.4 + .4·hash(j,12)
  const NEWIN = { t0: L(149.6), spread: .8, d: .4 };          // de nya platserna tonar in 149.6–150.8
  const N_COPY0 = N, N_NEW0 = N + FLOCK.n;                    // diskindex: 0–116 sandlådan, 117–816 kopiorna, 817–1199 nya

  /* ------------------------------------------------------------ tabeller (init) */
  // Sandlådan: position (yOff −140), aktiv/isolerad, fas, diskplats, samlingsstart
  const AG = [];
  for (let i = 0; i < N; i++) {
    const p = G.posOf(i, Y_OFF), sl = D.slotOf(i);
    AG.push({ i, x: p.x, y: p.y, active: isFinite(W.wake[i]), phi: R.phase(i), sx: sl.x, sy: sl.y, gT: GATHER.t0 + GATHER.spread * hash(i, 12) });
  }
  const EA = new Uint8Array(NE), EB = new Uint8Array(NE);
  W.edges.forEach((e, k) => { EA[k] = e.a; EB[k] = e.b; });

  // Maskinerna: tändtid = när kilens halvvinkel når maskinens centrum (expoOut inverterad)
  const MT = [];
  for (let k = 0; k < MACH.n; k++) {
    const cx = MACH.x0 + MACH.step * k + MACH.w / 2;
    const a = Math.abs(Math.atan2(MACH.h, cx - CONE.x) - Math.PI / 2);
    MT.push(CONE.t0 + CONE.d * invExpo(a / CONE.half));
  }
  const SWEEP_OF = new Int8Array(MACH.n).fill(-1);
  SWEEPS.forEach((sw, k) => sw.m.forEach(m => { SWEEP_OF[m] = k; }));

  // Kopiorna: källa, startoffset ±6, starttid, mål i maskin, lateral sinus, normaler, diskplats
  const SRC = W.active.filter(i => i !== 0);
  const perp = (ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy) || 1; return [-dy / d, dx / d]; };
  const CP = [];
  for (let c = 0; c < FLOCK.n; c++) {
    const src = AG[SRC[c % SRC.length]];
    const x0 = src.x + (hash(c, 15) * 2 - 1) * FLOCK.jit, y0 = src.y + (hash(c, 16) * 2 - 1) * FLOCK.jit;
    const m = c % MACH.n;
    const tx = MACH.x0 + MACH.step * m + 8 + 44 * hash(c, 10), ty = MACH.y0 + 8 + 144 * hash(c, 11);
    const [n1x, n1y] = perp(x0, y0, DOOR_PT.x, DOOR_PT.y), [n2x, n2y] = perp(DOOR_PT.x, DOOR_PT.y, tx, ty);
    const j = N_COPY0 + c, sl = D.slotOf(j);
    CP.push({ c, x0, y0, tx, ty, m, t0: FLOCK.t0 + FLOCK.spread * Math.pow(hash(c, 7), FLOCK.pow),
      A: FLOCK.amp0 + FLOCK.amp1 * hash(c, 8), f: FLOCK.f0 + FLOCK.f1 * hash(c, 9), ph: TAU * hash(c, 14),
      n1x, n1y, n2x, n2y, phi: R.phase(j), sx: sl.x, sy: sl.y, gT: GATHER.t0 + GATHER.spread * hash(j, 12),
      sw: SWEEP_OF[m], rank: 0 });
  }
  // Återkomstordning: nedifrån och upp inom varje maskin (8 ms per prick)
  for (let m = 0; m < MACH.n; m++) {
    const list = CP.filter(k => k.m === m).sort((a, b) => b.ty - a.ty);
    list.forEach((k, r) => { k.rank = r; });
  }
  // Räknaren: ankomsttider sorterade (rådata, binärsökning per bildruta)
  const ARR = CP.map(k => k.t0 + FLOCK.delay).sort((a, b) => a - b);
  const LAND_T = ARR[ARR.length - 1];
  function arrived(s) {
    let lo = 0, hi = ARR.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (ARR[mid] <= s) lo = mid + 1; else hi = mid; }
    return lo;
  }

  // De nya prickarna i grannmaskinerna (seed 5) får de 24 diskplatser bland 817–1199 vars intoning (hash(j,13)) ligger
  // tidigast – så stämmer bilden vid 150.0 även om scen 6 tonar in alla j ≥ 817 med samma regel.
  const NEWJ = []; for (let j = N_NEW0; j < NJ; j++) NEWJ.push(j);
  NEWJ.sort((a, b) => hash(a, 13) - hash(b, 13));
  const EX = [];
  {
    const rnd = R.rng(5); let idx = 0;
    for (const sw of SWEEPS) for (let e = 0; e < sw.newN; e++) {
      const j = NEWJ[idx++], sl = D.slotOf(j);
      EX.push({ x: MACH.x0 + MACH.step * sw.newM + 8 + 44 * rnd(), y: MACH.y0 + 8 + 144 * rnd(), t0: sw.newT + EXTRA.spread * rnd(),
        phi: R.phase(j), sx: sl.x, sy: sl.y, gT: GATHER.t0 + GATHER.spread * hash(j, 12) });
    }
  }
  const NW = [];                                              // resterande 359 platser: tonar in på plats i disken
  for (let k = EXTRA.n; k < NEWJ.length; k++) {
    const j = NEWJ[k], sl = D.slotOf(j);
    NW.push({ t0: NEWIN.t0 + NEWIN.spread * hash(j, 13), phi: R.phase(j), sx: sl.x, sy: sl.y });
  }

  /* ------------------------------------------------------------ textmasker */
  // Räknaren får storyboardets mask (bbox + 40, kant 60). Etiketten mellan mur och maskiner och loggraden under
  // maskinerna får en tätare mask (bbox + 12, kant 24) – med standardmåtten skulle dörren och maskinernas
  // kanter dämpas fast texten inte ligger där. Se rapporten.
  const RECTS = {
    counter: Object.assign(R.textRect(COUNTER.x, COUNTER.y, 0, 60, 0), { edge: S.MASK.edge }),
    label: { x: 0, y: LABEL.y - 16 - 12, w: 0, h: 32 + 24, a: 0, edge: 24 },
    log: { x: 0, y: LOG.y - 16 - 12, w: 0, h: 32 + 24, a: 0, edge: 24 },
  };
  const RECT_LIST = [RECTS.counter, RECTS.label, RECTS.log];
  const LOGW = { a: 0, gap: 0, b: 0, c: 0, x0: 0 };
  let measured = false;
  function measureAll(ctx) {
    const mono = (str, size, spacing) => R.measure(ctx, str, { family: F.mono, size, spacing, upper: true }) - spacing * size;
    const cw = 3 * .6 * 60 + 24 + mono('AGENTER', 32, .3);   // "700" tabulärt + luft + etikett
    RECTS.counter.x = COUNTER.x - cw / 2 - S.MASK.pad; RECTS.counter.w = cw + 2 * S.MASK.pad;
    const lw = mono(LABEL.str, 32, .3);
    RECTS.label.x = 540 - lw / 2 - 12; RECTS.label.w = lw + 24;
    const o = { family: F.mono, size: 32, spacing: LOG.spacing };
    LOGW.a = R.measure(ctx, LOG_A, o); LOGW.gap = R.measure(ctx, LOG_GAP, o); LOGW.b = R.measure(ctx, LOG_B, o); LOGW.c = R.measure(ctx, LOG_C[1], o);
    const tw = LOGW.a + LOGW.gap + LOGW.b + LOGW.gap + LOGW.c - LOG.spacing * 32;
    LOGW.x0 = 540 - tw / 2;
    RECTS.log.x = LOGW.x0 - 12; RECTS.log.w = tw + 24;
    measured = true;
  }
  /** Maskfaktor 1 − .75·m för (px,py) – som R.maskFactor men med kantbredd per rektangel. */
  function maskAt(px, py) {
    let m = 0;
    for (let k = 0; k < RECT_LIST.length; k++) {
      const r = RECT_LIST[k]; if (!(r.a > 0)) continue;
      const dx = Math.max(r.x - px, 0, px - (r.x + r.w)), dy = Math.max(r.y - py, 0, py - (r.y + r.h));
      const v = r.a * smooth(1 - clamp01(Math.hypot(dx, dy) / r.edge));
      if (v > m) m = v;
    }
    return 1 - S.MASK.strength * m;
  }

  /* ------------------------------------------------------------ per-frame-buffertar */
  const X = new Float32Array(NJ), Y = new Float32Array(NJ), RR = new Float32Array(NJ);
  const FI = new Float32Array(NJ), FG = new Float32Array(NJ), HI = new Float32Array(NJ), HG = new Float32Array(NJ);   // ink/gul fyllning, ink/gul halo
  const EAL = new Uint8Array(NE), BAL = new Uint8Array(NE);   // alfa-bucket för kanter och bud
  const SY = new Float32Array(SWEEPS.length);                 // raderlinjens y per svep
  let nd = 0;
  /** Lägger en prick i bufferten (alfa redan × synlighet; q = TALAR-grad; m = mask). */
  function put(x, y, r, fill, halo, q, m) {
    X[nd] = x; Y[nd] = y; RR[nd] = r;
    FI[nd] = fill * (1 - q) * m; FG[nd] = fill * q * m;
    HI[nd] = halo * (1 - q) * m; HG[nd] = TALAR_HALO * q * m * (fill > 0 ? Math.min(1, fill / FLOCK.restA) : 0);
    nd++;
  }
  /** TALAR-grad vid återkomst: gul direkt, håll, tona tillbaka. */
  function talarBack(s, t0) {
    if (!(s >= t0)) return 0;
    if (s < t0 + BACK.hold) return 1;
    return 1 - smooth(fade(s, t0 + BACK.hold, BACK.release));
  }

  /* ------------------------------------------------------------ skärmobjekt */
  /** Muren med dörröppningen och dörren (vinkel theta kring (495,1160.5)). */
  function drawFrame(ctx, theta, alpha) {
    if (alpha <= 0) return;
    ctx.save(); ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.lineCap = 'butt'; ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(DOOR.x1, DOOR.y); ctx.lineTo(FRAME.x + FRAME.w, DOOR.y); ctx.lineTo(FRAME.x + FRAME.w, FRAME.y);
    ctx.lineTo(FRAME.x, FRAME.y); ctx.lineTo(FRAME.x, DOOR.y); ctx.lineTo(DOOR.x0, DOOR.y);
    ctx.stroke();
    ctx.translate(DOOR.x0, DOOR.y); ctx.rotate(theta);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(DOOR.x1 - DOOR.x0, 0); ctx.stroke();
    ctx.restore();
  }
  /** Ljuskilen: apex i dörröppningen, halvvinkel beta, klippt till y ≥ 1160. */
  function drawCone(ctx, beta, alpha) {
    if (alpha <= 0 || beta <= 0) return;
    const x0 = CONE.x - CONE.len * Math.sin(beta), x1 = CONE.x + CONE.len * Math.sin(beta), yb = CONE.y + CONE.len * Math.cos(beta);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, CONE.y, R.W, R.H - CONE.y); ctx.clip();
    ctx.fillStyle = C.accent; ctx.globalAlpha = CONE.fill * alpha;
    ctx.beginPath(); ctx.moveTo(CONE.x, CONE.y); ctx.lineTo(x0, yb); ctx.lineTo(x1, yb); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = C.accent; ctx.lineWidth = 1; ctx.lineCap = 'butt'; ctx.globalAlpha = CONE.edge * alpha;
    ctx.beginPath(); ctx.moveTo(CONE.x, CONE.y); ctx.lineTo(x0, yb); ctx.moveTo(CONE.x, CONE.y); ctx.lineTo(x1, yb); ctx.stroke();
    ctx.restore();
  }
  /** Loggraden: `$ radera   → tillbaka   ×N` – skrivmaskin 28 tecken/s, hela raden mätt en gång så inget hoppar. */
  function drawLog(ctx, s, alpha) {
    if (alpha <= 0 || s < LOG.t0) return;
    const o = { family: F.mono, size: 32, spacing: LOG.spacing, align: 'left' };
    const xA = LOGW.x0, xB = xA + LOGW.a + LOGW.gap, xC = xB + LOGW.b + LOGW.gap;
    // `$ radera` – mist, skrivs fram vid 139.8 och står kvar
    const nA = R.clamp(Math.floor((s - LOG.t0) * LOG.cps), 0, LOG_A.length);
    if (nA > 0) R.text(ctx, LOG_A.slice(0, nA), xA, LOG.y, Object.assign({ color: C.mist, alpha }, o));
    // `→ tillbaka` – ink, skrivs fram vid varje återkomst, tonar ut (0.3 s) vid nästa radering
    let k = -1; for (let q = 0; q < LOG.back.length; q++) if (s >= LOG.back[q]) k = q;
    let nB = 0, aB = 1;                                       // mellanrummet skrivs med, så markören glider dit
    if (k >= 0) {
      nB = R.clamp(Math.floor((s - LOG.back[k]) * LOG.cps), 0, LOG_GB.length);
      if (k + 1 < SWEEPS.length) aB = 1 - smooth(fade(s, SWEEPS[k + 1].t0, LOG.outD));
      if (nB > LOG_GAP.length && aB > 0) R.text(ctx, LOG_B.slice(0, nB - LOG_GAP.length), xB, LOG.y, Object.assign({ color: C.ink, alpha: alpha * aB }, o));
    }
    // `×2` / `×3` – mist, korsfadas vid 143.2 och 145.5
    const a2 = smooth(fade(s, LOG.count[0], LOG.outD)) * (1 - smooth(fade(s, LOG.count[1], LOG.outD))), a3 = smooth(fade(s, LOG.count[1], LOG.outD));
    if (a2 > 0) R.text(ctx, LOG_C[0], xC, LOG.y, Object.assign({ color: C.mist, alpha: alpha * a2 }, o));
    if (a3 > 0) R.text(ctx, LOG_C[1], xC, LOG.y, Object.assign({ color: C.mist, alpha: alpha * a3 }, o));
    // markör: synlig medan raden skrivs (och en stund efter), blinkar med period 0.9 s
    const typingA = s < LOG.back[0] + LOG_GB.length / LOG.cps + LOG.cursorTail;
    const typingB = k >= 1 && s < LOG.back[k] + LOG_GB.length / LOG.cps + LOG.cursorTail;
    if ((typingA || typingB) && Math.floor(s / S.TEXT.cursorPeriod) % 2 === 0) {
      let cx;
      if (k < 0) cx = xA + (nA > 0 ? R.measure(ctx, LOG_A.slice(0, nA), o) : 0) - LOG.spacing * 32;
      else cx = xA + LOGW.a + (nB > 0 ? R.measure(ctx, LOG_GB.slice(0, nB), o) : 0) - LOG.spacing * 32;
      ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = C.ink; ctx.fillRect(cx + 8, LOG.y - 16, 3, 32); ctx.restore();
    }
  }

  R.scene({
    id: 'utbrottet', name: 'Utbrottet', start: T.start, end: T.end, pre: 0, post: 0,
    draw(ctx, s, t) {
      if (!measured) measureAll(ctx);

      /* ---------- gemensamma tidsvärden ---------- */
      const outA = 1 - smooth(fade(s, OUT.t0, OUT.d));                            // 5.5 allt utom prickarna tonar bort
      const dim = lerp(SAND.a0, SAND.a1, smooth(fade(s, SAND.t0, SAND.d)));       // sandlådans dämpning .5 → .35
      const edgeDim = SAND.edge0 * dim / SAND.a0 * outA;                          // kanterna .3 → .21, tonar ut med muren
      const theta = DOOR.ang * outExpo(fade(s, DOOR.t0, DOOR.d));                 // 5.1 dörrvinkel 0 → −55°
      const beta = CONE.half * outExpo(fade(s, CONE.t0, CONE.d));                 // 5.2 kilens halvvinkel 0 → 66°
      const coneA = outA * smooth(fade(s, CONE.t0, CONE.inD)) * lerp(1, CONE.sink, smooth(fade(s, CONE.sinkT, CONE.sinkD)));   // kilen tonar in medan den öppnar sig, sjunker till .04 efter 126.0
      for (let k = 0; k < SWEEPS.length; k++) { const sw = SWEEPS[k]; SY[k] = MACH.y0 + MACH.h * clamp01((s - sw.t0) / sw.d); }
      const sinA = TAU * t / BREATH_T, sinL = TAU * t / LUGN_T;                   // andningsfaser: AKTIV 3.2 s, LUGN 4 s

      /* ---------- text-alfa och masker (före prickpasset) ---------- */
      const counterTx = R.textIn(s, COUNTER.t0); counterTx.a *= outA;
      const labelTx = R.textIn(s, LABEL.t0); labelTx.a *= outA;
      const logA = smooth(fade(s, LOG.t0, .3)) * outA;
      RECTS.counter.a = counterTx.a; RECTS.label.a = labelTx.a; RECTS.log.a = logA;

      /* ---------- prickarnas tillstånd ---------- */
      nd = 0;
      // Sandlådan (diskindex j = i): aktiva andas på .35 av full styrka, de tolv isolerade står stilla, hjälten är en tom ring
      for (let i = 0; i < N; i++) {
        const a = AG[i], g = outExpo(fade(s, a.gT, GATHER.d));
        const x = lerp(a.x, a.sx, g), y = lerp(a.y, a.sy, g), m = maskAt(x, y);
        const bA = Math.sin(sinA + a.phi), bL = Math.sin(sinL + a.phi);
        if (i === 0) { put(x, y, lerp(R_HERO, R_DISK, g), 0, 0, 0, m); continue; }
        const base = lerp(R_GRID, R_DISK, g);
        if (a.active) put(x, y, base * (1 + AMP * ((1 - g) * bA + g * bL)), lerp(dim, LUGN_A, g), lerp(HALO_A * dim, LUGN_HALO, g), 0, m);
        else put(x, y, base * (1 + AMP * g * bL), lerp(ISO_A * dim, LUGN_A, g), LUGN_HALO * g, 0, m);
      }
      // Beat 5.3 · kopiorna: box → dörren (1.2 s easeInOut) → maskin (0.9 s expoOut), lateral sinus, TALAR i dörren
      for (let c = 0; c < FLOCK.n; c++) {
        const k = CP[c], t0 = k.t0;
        if (s < t0) continue;
        const lat = k.A * Math.sin(TAU * k.f * s + k.ph);
        let x, y, r, p2 = 0;
        const u1 = fade(s, t0, FLOCK.d1);
        if (u1 < 1) {
          const p1 = inOut(u1), off = lat * Math.sin(Math.PI * p1);
          x = lerp(k.x0, DOOR_PT.x, p1) + k.n1x * off; y = lerp(k.y0, DOOR_PT.y, p1) + k.n1y * off; r = R_GRID;
        } else {
          p2 = outExpo(fade(s, t0 + FLOCK.d1, FLOCK.d2)); const off = lat * Math.sin(Math.PI * p2);
          x = lerp(DOOR_PT.x, k.tx, p2) + k.n2x * off; y = lerp(DOOR_PT.y, k.ty, p2) + k.n2y * off; r = lerp(R_GRID, R_KOPIA, p2);
        }
        const td = t0 + FLOCK.d1;                                                  // passage genom dörren
        let q = s < td ? clamp01((s - td + FLOCK.talarIn) / FLOCK.talarIn) : 1 - smooth(fade(s, td, FLOCK.talarOut));
        const ain = smooth(fade(s, t0, FLOCK.inD)), rest = smooth(fade(s, t0 + FLOCK.delay, FLOCK.restD));
        let fill = lerp(1, FLOCK.restA, rest) * ain, halo = lerp(HALO_A, FLOCK.restHalo, rest) * ain, vis = 1;
        // Beat 5.4 · raderingen: linjen sveper nedåt, prickar ovanför försvinner, återkomst nedifrån och upp med TALAR
        if (k.sw >= 0) {
          const sw = SWEEPS[k.sw];
          if (s >= sw.t0 && k.ty < SY[k.sw]) {
            const tb = sw.back + BACK.stagger * k.rank;
            vis = smooth(fade(s, tb, BACK.d));
            if (vis <= 0) continue;
            q = talarBack(s, tb);
          }
        }
        // Beat 5.5 · samlingen
        const g = outExpo(fade(s, k.gT, GATHER.d));
        if (g > 0) { x = lerp(x, k.sx, g); y = lerp(y, k.sy, g); r = lerp(r, R_DISK, g); fill = lerp(fill, LUGN_A, g); halo = lerp(halo, LUGN_HALO, g); }
        const br = 1 + AMP * ((1 - g) * Math.sin(sinA + k.phi) + g * Math.sin(sinL + k.phi));
        put(x, y, r * br, fill * vis, halo * vis, q, maskAt(x, y));
      }
      // Beat 5.4 · de extra prickarna som tänds i grannmaskinen (med TALAR-blink)
      for (let e = 0; e < EX.length; e++) {
        const k = EX[e]; if (s < k.t0) continue;
        const vis = smooth(fade(s, k.t0, EXTRA.inD)), q = talarBack(s, k.t0), g = outExpo(fade(s, k.gT, GATHER.d));
        const x = lerp(k.x, k.sx, g), y = lerp(k.y, k.sy, g);
        const br = 1 + AMP * ((1 - g) * Math.sin(sinA + k.phi) + g * Math.sin(sinL + k.phi));
        put(x, y, lerp(R_KOPIA, R_DISK, g) * br, lerp(FLOCK.restA, LUGN_A, g) * vis, lerp(FLOCK.restHalo, LUGN_HALO, g) * vis, q, maskAt(x, y));
      }
      // Beat 5.5 · de 359 återstående platserna tonar in i disken (LUGN från början)
      for (let n = 0; n < NW.length; n++) {
        const k = NW[n]; if (s < k.t0) continue;
        const vis = smooth(fade(s, k.t0, NEWIN.d));
        put(k.sx, k.sy, R_DISK * (1 + AMP * Math.sin(sinL + k.phi)), LUGN_A * vis, LUGN_HALO * vis, 0, 1);
      }

      /* ---------- lager 3: gula kanter + bud (på rutnätets platser, batchade per alfa-bucket) ---------- */
      if (edgeDim > .002) {
        for (let e = 0; e < NE; e++) {
          const a = AG[EA[e]], b = AG[EB[e]];
          const f = edgeDim * maskAt((a.x + b.x) / 2, (a.y + b.y) / 2);
          EAL[e] = Math.round(Math.min(1, EDGE_REST * f) * NB); BAL[e] = Math.round(Math.min(1, BUD_A * f) * NB);
        }
        ctx.save(); ctx.strokeStyle = C.accent; ctx.lineWidth = 1; ctx.lineCap = 'butt';
        for (let b = 1; b <= NB; b++) {
          let any = false;
          for (let e = 0; e < NE; e++) {
            if (EAL[e] !== b) continue;
            if (!any) { ctx.beginPath(); any = true; }
            ctx.moveTo(AG[EA[e]].x, AG[EA[e]].y); ctx.lineTo(AG[EB[e]].x, AG[EB[e]].y);
          }
          if (any) { ctx.globalAlpha = b / NB; ctx.stroke(); }
        }
        ctx.strokeStyle = C.ink; ctx.lineWidth = BUD_W; ctx.lineCap = 'round';
        for (let b = 1; b <= NB; b++) {
          let any = false;
          for (let e = 0; e < NE; e++) {
            if (BAL[e] !== b) continue;
            const x1 = AG[EA[e]].x, y1 = AG[EA[e]].y, x2 = AG[EB[e]].x, y2 = AG[EB[e]].y;
            const d = Math.hypot(x2 - x1, y2 - y1); if (d < 1) continue;
            const ux = (x2 - x1) / d * BUD_LEN / 2, uy = (y2 - y1) / d * BUD_LEN / 2;
            if (!any) { ctx.beginPath(); any = true; }
            for (let k = 0; k < 2; k++) {
              const p = R.budP(t, e, k), cx = lerp(x1, x2, p), cy = lerp(y1, y2, p);
              ctx.moveTo(cx - ux, cy - uy); ctx.lineTo(cx + ux, cy + uy);
            }
          }
          if (any) { ctx.globalAlpha = b / NB; ctx.stroke(); }
        }
        ctx.restore();
      }

      /* ---------- beat 5.2 · kilen (mellan lager 4 och 5) och maskinerna ---------- */
      drawCone(ctx, beta, coneA);
      if (outA > 0 && s >= MT[5]) {
        ctx.save(); ctx.strokeStyle = C.hair; ctx.lineWidth = 1;
        for (let k = 0; k < MACH.n; k++) {
          const a = HAIR_A * smooth(fade(s, MT[k], MACH.inD)) * outA; if (a <= .003) continue;
          ctx.globalAlpha = a; ctx.strokeRect(MACH.x0 + MACH.step * k + .5, MACH.y0 + .5, MACH.w, MACH.h);
        }
        ctx.restore();
      }

      /* ---------- lager 5: halo-sprites ---------- */
      for (let k = 0; k < nd; k++) {
        if (HI[k] > .003) R.halo(ctx, X[k], Y[k], RR[k], { alpha: HI[k], scale: HALO_R });
        if (HG[k] > .003) R.halo(ctx, X[k], Y[k], RR[k], { alpha: HG[k], scale: TALAR_R, color: 'accent' });
      }

      /* ---------- lager 6: prickfyllningar och den döda ringen ---------- */
      ctx.save();
      ctx.fillStyle = C.ink;
      for (let k = 1; k < nd; k++) {
        const a = FI[k]; if (a <= .003) continue;
        ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(X[k], Y[k], RR[k], 0, TAU); ctx.fill();
      }
      ctx.fillStyle = C.accent;
      for (let k = 1; k < nd; k++) {
        const a = FG[k]; if (a <= .003) continue;
        ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(X[k], Y[k], RR[k], 0, TAU); ctx.fill();
      }
      ctx.restore();
      R.drawAgent(ctx, { x: X[0], y: Y[0], r: RR[0], dead: true, mask: maskAt(X[0], Y[0]) });   // hjälten: tom ring, r 7 → 4

      /* ---------- lager 7: skärmobjekt ---------- */
      // Beat 5.1 · muren och dörren
      drawFrame(ctx, theta, FRAME.alpha * outA);
      // Beat 5.1 · en svag prick tittar ut ur öppningen, glider 40 px nedåt och försvinner
      {
        const p = fade(s, PEEK.t0, PEEK.d);
        if (p > 0 && p < 1) {
          const a = PEEK.alpha * smooth(fade(s, PEEK.t0, .3)) * (1 - smooth(fade(s, PEEK.t0 + .4, .4)));
          if (a > 0) { ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(PEEK.x, PEEK.y + PEEK.dy * outExpo(p), PEEK.r, 0, TAU); ctx.fill(); ctx.restore(); }
        }
      }
      // Beat 5.4 · raderlinjen: 60 px bred ink-linje som sveper genom maskinen (mjuk kant i början och slutet)
      for (let k = 0; k < SWEEPS.length; k++) {
        const sw = SWEEPS[k], p = (s - sw.t0) / sw.d;
        if (p <= 0 || p >= 1) continue;
        const a = INK_A * Math.min(1, p / .08, (1 - p) / .08) * outA;
        ctx.save(); ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.lineCap = 'butt'; ctx.globalAlpha = a;
        ctx.beginPath();
        const y = Math.round(SY[k]) + .5;
        for (const m of sw.m) { const x = MACH.x0 + MACH.step * m; ctx.moveTo(x, y); ctx.lineTo(x + MACH.w, y); }
        ctx.stroke(); ctx.restore();
      }

      /* ---------- lager 8: text ---------- */
      // Beat 5.3 · räknaren: antal framkomna kopior (rådata), landar 700 → gult streck på y 300
      if (counterTx.a > 0) R.counterInline(ctx, COUNTER.x, COUNTER.y + counterTx.dy, arrived(s), 'AGENTER', { alpha: counterTx.a, landP: fade(s, LAND_T, COUNTER.landD) });
      // Beat 5.2 · HUGGING FACE · 11 MASKINER – Mono 32 mist .30em, y 1212, in 124.6
      if (labelTx.a > 0) R.label(ctx, LABEL.str, 540, LABEL.y + labelTx.dy, { alpha: labelTx.a });
      // Beat 5.4 · loggraden – Mono 32 .12em, y 1450
      drawLog(ctx, s, outA);
    },
  });
})();
