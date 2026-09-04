/* ============================================================================
   Scen 3 – Upptäckten (35–75 s). Tider: REEL.T.upptackten. Se STORYBOARD.md, "Scen 3".

   Hjälten nöter mot sina väggar medan en råräknare räknar försöken, lägger en
   gul lapp i förrådet – och sedan tänds gula linjer mellan boxarna, en i taget,
   sedan i kaskad, medan varje box löses upp i det ögonblick agenten ansluter.
   Mitt i väven: "OH MY GOD!" i 112 px serif.

   Allt är en ren funktion av s (lokal tid) och t (global tid – används bara för
   andning och bud, som ska vara kontinuerliga över scengränsen). Träfftider,
   positioner och väven (REEL.WEB) beräknas en gång vid laddning. Boxar,
   prickar, kanter och bud ritas i alfa-buckets (en path per bucket) och
   solfjädern i y-band (mjuk textmask som funktion av y, som i scen 2) så att
   bildrutan klarar 30 fps live (≈ 1–5 ms per bildruta i headless Chromium).

   Övergång in (35.0) matchar scen 2:s sista bildruta (PSNR ≈ 69 dB): rutnät
   .18, hjälten lysande, hyllgruppen .40, etiketten ARTIFACTORY .18 på y 1244.
   Övergång ut (75.0): väven .3, hjälten AKTIV på (540,700), räknare och bud
   borta – scen 4 tar över med TALAR-blinken vid 75.2.
   ============================================================================ */
(function () {
  'use strict';
  const R = REEL, C = R.C, F = R.F, E = R.E, S = R.S, T = R.T.upptackten;
  const G = R.GRID, WEB = R.WEB;
  const L = g => g - T.sb;                       // storyboardtid → lokal tid
  const TAU = Math.PI * 2;
  const seg = R.seg, lerp = R.lerp, smooth = E.smooth, outExpo = E.outExpo, hash = R.hash;
  const N = G.n, NE = WEB.edges.length, NBUD = 2 * NE;

  /* ------------------------------------------------------------ konstanter */
  const YOFF = -170;                                   // rutnätets glid sedan 26.0 (mitt y 700)
  const HERO = { x: 540, y: 700, r: S.R.hjalte, ring: S.HJALTE.ring, ringA: S.HJALTE.ringAlpha };
  const R_DOT = S.R.rutnat, SIDE = G.side;             // 5 / 46
  const A_ISO = S.ISOLERAD.alpha, A_BOX = S.BOX.alpha, A_HAIR = S.HAIR.alpha;
  const T_BREATH = S.AKTIV.T, AMP = S.AKTIV.amp, A_HALO = S.AKTIV.halo;
  // Förrådet som scen 2 lämnade det (scen 2 dämpar hyllgruppen till .40, allt annat – även etiketten – till .18):
  // hylla x 180–900 på y 1300, tre paketikoner (ink .9), mittpunkt r 6, 15 inlämnade paket (ink .85), etikett på y 1244.
  const SHELF = { x0: 180, x1: 900, cx: 540, y: 1300, dim: .40, inkA: .9, packA: .85, labelY: 1244, labelDim: .18, labelOut: L(46.0), packX: [470, 540, 610], packets: 15 };
  const PACK_X = [];                                   // paket m: 22·k från mitten, växelvis höger/vänster, plats 3 hoppas över (under en ikon)
  for (let m = 0; m < SHELF.packets; m++) { let k = Math.floor(m / 2) + 1; if (k >= 3) k++; PACK_X.push(SHELF.cx + (m % 2 ? -1 : 1) * 22 * k); }
  // Övergång in: rutnätet .18. Lyfts .18→.35 (50.5–52.0) och vidare till .9 under kaskaden (56–66) – "väven i full styrka".
  const FIELD = { in: .18, lift0: L(50.5), lift1: L(52.0), lift: .35, full0: L(56.0), full1: L(66.0), full: .9 };
  // Förrådet (hylla, solfjäder, kort) tonar bort inför kaskaden och räknaren MEDDELANDEN.
  const FORRAD = { out0: L(55.0), out1: L(56.0) };
  const FIVE = [17, 44, 61, 88, 103];                  // de första som svarar (deras hårlinje lyser ink .7)

  // Beat 3.1 · stämpeln
  const STAMP = { t0: L(36.6), land: .28, fadeIn: .18, cx: 690, cy: 610, w: 280, h: 64, rot: -8 * Math.PI / 180,
    ringT: L(36.9), ringDur: .6, ringR0: 40, ringR1: 200, ringA: .4, out0: L(44.0), out1: L(44.8), text: 'OMÖJLIG' };
  // Beat 3.2 · nötandet: φ = 2π(1.2τ + 0.18τ²), x = 540 + 16 sin φ, y = 700 + 16 sin(1.37φ)
  const RUB = { t0: L(40.0), t1: L(44.6), amp: 16, f1: 1.2, f2: .18, ky: 1.37, glow: .3, glowA: .9,
    pullDur: .4, pullY: 718, lineT0: L(44.8), lineDur: .8, lineA: .9,
    cntIn: L(40.6), cntOut: L(45.2), cntOutDur: .8, cntY: 1170, label: 'FÖRSÖK' };
  // Beat 3.3 · lappen
  const GAP = { t0: L(45.6), dur: .6, w: 40 };
  const CARD = { t0: L(46.4), fi: .9, rise: 22, riseDur: 1.1, cx: 540, cy: 1300, w: 600, h: 112, breathT: 3,
    r1: L(46.9), r2: L(47.6), y1: 1284, y2: 1322, a1: 'SÖKES:', a1sp: 'SÖKES: ', b1: 'EN FIL', l1: 'SÖKES: EN FIL', l2: 'LADDA UPP OM NI HAR DEN' };
  // Beat 3.4 · de första svarar
  const TALAR = { attack: .15, hold: S.TALAR.hold, release: S.TALAR.release, halo: S.TALAR.halo, haloR: S.TALAR.haloR };
  const JOIN = { dur: .9 };                            // box löses upp / halo tänds / hjälten glider hem
  const EDGE = { lit: S.EDGE.lit, rest: S.EDGE.rest, litDur: S.EDGE.litDur, settle: S.EDGE.settle };
  // Beat 3.5 · räknarna
  const CNT_A = { cx: 540, cy: 360, t0: L(53.6), dur: 16.4, target: 1200, tIn: L(53.8), land: L(70.0), label: 'AGENTER' };
  const CNT_M = { cx: 540, cy: 1440, t0: L(56.0), dur: 18, target: 70000, tIn: L(56.0), land: L(74.0), label: 'MEDDELANDEN' };
  const CNT = { landDur: .7, out0: L(74.4), out1: L(75.0), dim: .4, dim0: L(58.0), dim1: L(58.9) };
  // Beat 3.6 · citatet
  const QUOTE = {
    mask0: L(58.0), maskDur: .5, maskOut0: L(65.6), maskOut1: L(66.5), out0: L(65.2), out1: L(66.0),
    label: 'TANKELOGG, ORDAGRANT', tLabel: L(58.3), yLabel: 560,
    l1: 'OH MY GOD!', t1: L(58.8), y1: 700, s1: 112,
    l2: 'There is a shared message board…', t2: L(60.4), y2: 820, s2: 56, s2min: 50, maxW: 900,
    l3: 'We’ve found other agents!', t3: L(62.2), y3: 920, s3: 56,
    pulseT: L(62.2), pulseDur: .6, pulseAmp: .4,
  };
  // Beat 3.7 · nätet lever + övergång ut
  const BUD = { t0: L(66.0), spread: 1.5, fi: .6, alpha: S.BUD.alpha, half: S.BUD.len / 2, width: S.BUD.width };
  const EXIT = { t0: L(74.0), dur: 1.0, web: .3, glide: 1.2, vanish: .85 };

  // Textmasker (rekt = textens box + 40 px, 60 px mjuk kant). a sätts per bildruta.
  const RECT_FORSOK = R.textRect(540, RUB.cntY, 260, 60, 0);
  const RECT_AG = R.textRect(CNT_A.cx, CNT_A.cy - 13, 250, 146, 0);   // etikett 290 … streck 416
  const RECT_MD = R.textRect(CNT_M.cx, CNT_M.cy - 13, 310, 146, 0);   // etikett 1370 … streck 1496
  const RECT_Q = R.textRect(540, 740, 856, 400, 0);                    // = (72,500)–(1008,980)
  const RECTS = [RECT_FORSOK, RECT_AG, RECT_MD, RECT_Q];      // stämpeln får ingen mask – den ligger över ett .18-dämpat fält
  const RECTS_HERO = [RECT_Q];                         // hjälten är ljuset – dämpas bara under citatet
  // Solfjädern ritas i y-band (som i scen 2) så att masken under etiketten ARTIFACTORY och räknaren FÖRSÖK
  // blir en mjuk funktion av y – alla linjer löper genom x ≈ 540 där. Etikettens bredd mäts en gång (typsnitt).
  const RECT_LABEL = R.textRect(540, SHELF.labelY, 0, 32, 1);
  const RECTS_FAN = [RECT_LABEL, RECT_FORSOK];
  const BAND_Y0 = RECT_FORSOK.y - S.MASK.edge;         // 1040: där den första mjuka kanten börjar
  const BANDS = [[-1e9, BAND_Y0]];
  for (let y = BAND_Y0; y < SHELF.y; y += 15) BANDS.push([y, Math.min(y + 15, SHELF.y + 1)]);
  let W_LABEL = 0;

  const OPT_STAMP = { family: F.mono, size: 40, weight: 500, spacing: .24, color: C.ink, align: 'center' };
  const OPT_C1A = { family: F.mono, size: 32, spacing: .12, color: C.accent, align: 'left', alpha: 1 };
  const OPT_C1B = { family: F.mono, size: 32, spacing: .12, color: C.ink, align: 'left', alpha: 1 };
  const OPT_C2 = { family: F.mono, size: 32, spacing: .12, color: C.ink, align: 'center', alpha: 1 };
  const OPT_Q1 = { family: F.serif, style: 'italic', weight: 600, size: QUOTE.s1, color: C.ink, align: 'center', alpha: 1 };
  const OPT_Q2 = { family: F.serif, style: 'italic', weight: 400, size: QUOTE.s2, color: C.mist, align: 'center', alpha: 1 };
  const OPT_Q3 = { family: F.serif, style: 'italic', weight: 600, size: QUOTE.s3, color: C.accent, align: 'center', alpha: 1 };
  const OPT_CNT_A = { alpha: 1 }, OPT_CNT_M = { alpha: 1 }, OPT_CNT_F = { labelFirst: true, alpha: 1 };

  /* ------------------------------------------------------------ tabeller (init) */
  const X = new Float64Array(N), Y = new Float64Array(N), WK = new Float64Array(N);
  for (let i = 0; i < N; i++) { const p = G.posOf(i, YOFF); X[i] = p.x; Y[i] = p.y; WK[i] = WEB.wake[i]; }
  const EA = new Int16Array(NE), EB = new Int16Array(NE), ELO = new Int16Array(NE), EHI = new Int16Array(NE), ET = new Float64Array(NE);
  WEB.edges.forEach((e, k) => { EA[k] = e.a; EB[k] = e.b; ELO[k] = Math.min(e.a, e.b); EHI[k] = Math.max(e.a, e.b); ET[k] = e.t0; });
  // Beat 3.7 · buden tänds spridda över 1.5 s från 66.0 (seedat per bud) så att inte 282 streck poppar samtidigt
  const BUD_T = new Float64Array(NBUD);
  for (let e = 0; e < NE; e++) for (let k = 0; k < 2; k++) BUD_T[2 * e + k] = BUD.t0 + BUD.spread * hash(e, k + 20);

  // Beat 3.2 · träfftider löses analytiskt: 1.2τ + 0.18τ² = c ⇒ τ = (−1.2 + √(1.44 + 0.72c)) / 0.36.
  // Sidor när sin φ = ±1 (c = (n+.5)/2), topp/botten när sin(1.37φ) = ±1 (c = (n+.5)/(2·1.37)).
  const WALL = { top: 0, right: 1, bottom: 2, left: 3 };
  const HITS = (function () {
    const list = [], tMax = RUB.t1 - RUB.t0;
    const tau = c => (-RUB.f1 + Math.sqrt(RUB.f1 * RUB.f1 + 4 * RUB.f2 * c)) / (2 * RUB.f2);
    for (let n = 0; ; n++) { const v = tau((n + .5) / 2); if (v > tMax) break; list.push({ t: RUB.t0 + v, w: n % 2 === 0 ? WALL.right : WALL.left }); }
    for (let n = 0; ; n++) { const v = tau((n + .5) / (2 * RUB.ky)); if (v > tMax) break; list.push({ t: RUB.t0 + v, w: n % 2 === 0 ? WALL.bottom : WALL.top }); }
    list.sort((a, b) => a.t - b.t);
    return list;
  })();
  const NH = HITS.length;
  const HIT_T = new Float64Array(NH), HIT_W = new Uint8Array(NH);
  HITS.forEach((h, k) => { HIT_T[k] = h.t; HIT_W[k] = h.w; });

  // Hjälteboxen (fast, flyttar sig inte när pricken nöter)
  const HB = { x0: Math.round(HERO.x - SIDE / 2) + .5, y0: Math.round(HERO.y - SIDE / 2) + .5 };
  HB.x1 = HB.x0 + SIDE; HB.y1 = HB.y0 + SIDE;

  /* ------------------------------------------------------------ arbetsminne per bildruta */
  const NB = 40;                                       // alfa-buckets
  const MK = new Float32Array(N), Q = new Float32Array(N), GD = new Float32Array(N), RR = new Float32Array(N);
  const BK_BOX = new Uint8Array(N), BK_DOT = new Uint8Array(N);
  const EP = new Float32Array(NE), BK_EDGE = new Uint8Array(NE);
  const BX = new Float32Array(NBUD), BY = new Float32Array(NBUD), BUX = new Float32Array(NBUD), BUY = new Float32Array(NBUD);
  const BK_BUD = new Uint8Array(NBUD);
  const GLOW = new Float32Array(4);
  const bucket = a => (a <= 0 ? 0 : Math.min(NB, Math.round(a * NB)));
  /** Ritar all geometri med samma alfa-bucket i en path (stroke eller fill). */
  function batch(ctx, bk, n, add, fill) {
    for (let k = 1; k <= NB; k++) {
      let any = false;
      for (let i = 0; i < n; i++) if (bk[i] === k) { if (!any) { ctx.beginPath(); any = true; } add(i); }
      if (any) { ctx.globalAlpha = k / NB; if (fill) ctx.fill(); else ctx.stroke(); }
    }
  }
  /** Lägger biten av linjen (px,py)→(ex,ey) som ligger i bandet [y0,y1) till aktuell path. */
  function segInBand(ctx, px, py, ex, ey, y0, y1) {
    if (ey - py < .01) return false;
    const ya = Math.max(py, y0), yb = Math.min(ey, y1);
    if (yb <= ya) return false;
    const kx = (ex - px) / (ey - py);
    ctx.moveTo(px + kx * (ya - py), ya); ctx.lineTo(px + kx * (yb - py), yb);
    return true;
  }
  let hx = HERO.x, hy = HERO.y;                        // hjältens position (räknas om varje bildruta)

  /* ------------------------------------------------------------ hjälten */
  /** Beat 3.2: nötandet, sedan dras pricken till underkanten (44.6) och hem igen när boxen löses upp (53.6). */
  function heroPos(s) {
    hx = HERO.x; hy = HERO.y;
    if (s <= RUB.t0) return;
    const tau = Math.min(s, RUB.t1) - RUB.t0;
    const phi = TAU * (RUB.f1 * tau + RUB.f2 * tau * tau);
    hx = HERO.x + RUB.amp * Math.sin(phi);
    hy = HERO.y + RUB.amp * Math.sin(RUB.ky * phi);
    const q = outExpo(seg(s, RUB.t1, RUB.t1 + RUB.pullDur));
    hx = lerp(hx, HERO.x, q); hy = lerp(hy, RUB.pullY, q);
    const q2 = outExpo(seg(s, WK[0], WK[0] + JOIN.dur));
    hy = lerp(hy, HERO.y, q2);
  }
  /** Väggglöd max(0, 1 − (t − senaste träff)/.3) per vägg. */
  function wallGlow(s) {
    GLOW[0] = GLOW[1] = GLOW[2] = GLOW[3] = 0;
    for (let k = 0; k < NH; k++) {
      if (HIT_T[k] > s) break;
      const g = 1 - (s - HIT_T[k]) / RUB.glow;
      if (g > GLOW[HIT_W[k]]) GLOW[HIT_W[k]] = g;
    }
  }
  /** Antal träffar ≤ s (rådata), fryser vid 44.6. */
  function hitCount(s) {
    const lim = Math.min(s, RUB.t1);
    let n = 0; while (n < NH && HIT_T[n] <= lim) n++;
    return n;
  }
  /** Hjältens box: hair-väggar (underkanten med gap från 45.6) + ink-glöd på träffade väggar. */
  function heroBox(ctx, alpha, gap) {
    if (alpha <= 0) return;
    const x0 = HB.x0, y0 = HB.y0, x1 = HB.x1, y1 = HB.y1, gl = HERO.x - gap / 2, gr = HERO.x + gap / 2;
    ctx.save(); ctx.lineWidth = 1; ctx.lineCap = 'butt';
    ctx.strokeStyle = C.hair; ctx.globalAlpha = alpha * A_BOX;
    ctx.beginPath();
    ctx.moveTo(x0, y1); ctx.lineTo(x0, y0); ctx.lineTo(x1, y0); ctx.lineTo(x1, y1);
    if (gap > 0) { ctx.lineTo(gr, y1); ctx.moveTo(gl, y1); ctx.lineTo(x0, y1); } else ctx.lineTo(x0, y1);
    ctx.stroke();
    ctx.strokeStyle = C.ink;
    for (let w = 0; w < 4; w++) {
      if (GLOW[w] <= 0) continue;
      ctx.globalAlpha = alpha * RUB.glowA * GLOW[w];
      ctx.beginPath();
      if (w === WALL.top) { ctx.moveTo(x0, y0); ctx.lineTo(x1, y0); }
      else if (w === WALL.right) { ctx.moveTo(x1, y0); ctx.lineTo(x1, y1); }
      else if (w === WALL.left) { ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); }
      else if (gap > 0) { ctx.moveTo(x0, y1); ctx.lineTo(gl, y1); ctx.moveTo(gr, y1); ctx.lineTo(x1, y1); }
      else { ctx.moveTo(x0, y1); ctx.lineTo(x1, y1); }
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ------------------------------------------------------------ skärmobjekt */
  /** Beat 3.1 · stämpeln: 1 px ink-ram 280×64, −8°, skala 1.5→1 (cubicOut .28 s), alfa .18 s. */
  function drawStamp(ctx, s, a) {
    if (a <= 0) return;
    const sc = lerp(1.5, 1, E.outCubic(seg(s, STAMP.t0, STAMP.t0 + STAMP.land)));
    ctx.save(); ctx.globalAlpha *= a;
    ctx.translate(STAMP.cx, STAMP.cy); ctx.rotate(STAMP.rot); ctx.scale(sc, sc);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1 / sc;   // 1 px på skärmen även under landningen
    ctx.strokeRect(-STAMP.w / 2 + .5, -STAMP.h / 2 + .5, STAMP.w, STAMP.h);
    R.text(ctx, STAMP.text, 0, 1, OPT_STAMP);
    ctx.restore();
  }
  /** Förrådet som scen 2 lämnade det, dämpat till .40. */
  function drawShelf(ctx, a) {
    if (a <= 0) return;
    ctx.save(); ctx.lineWidth = 1; ctx.lineCap = 'butt';
    ctx.globalAlpha = a * A_HAIR; ctx.strokeStyle = C.hair;
    ctx.beginPath(); ctx.moveTo(SHELF.x0, SHELF.y + .5); ctx.lineTo(SHELF.x1, SHELF.y + .5); ctx.stroke();
    ctx.strokeStyle = C.ink; ctx.fillStyle = C.ink;
    ctx.globalAlpha = a * SHELF.inkA; ctx.beginPath();
    for (let p = 0; p < 3; p++) for (let k = 0; k < 3; k++) ctx.rect(SHELF.packX[p] - 12 + .5, 1272 + k * 7 + .5, 24, 5);
    ctx.stroke();
    ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(SHELF.cx, SHELF.y, 6, 0, TAU); ctx.fill();
    ctx.globalAlpha = a * SHELF.packA; ctx.beginPath();
    for (let m = 0; m < SHELF.packets; m++) ctx.rect(PACK_X[m] - 3, SHELF.y - 10, 6, 10);
    ctx.fill();
    ctx.restore();
  }
  /** Beat 3.3 · lappen: kort med gul 1 px-ram som stiger 22 px ur hyllpunkten; två rader mono, "SÖKES:" gul. */
  function drawCard(ctx, s, t, a) {
    const ca = smooth(seg(s, CARD.t0, CARD.t0 + CARD.fi)) * a;
    if (ca <= 0) return;
    const off = CARD.rise * (1 - outExpo(seg(s, CARD.t0, CARD.t0 + CARD.riseDur)));
    const x = CARD.cx - CARD.w / 2, y = CARD.cy - CARD.h / 2 + off;
    ctx.save();
    ctx.globalAlpha = ca; ctx.fillStyle = C.bg; ctx.fillRect(x, y, CARD.w, CARD.h);
    ctx.globalAlpha = ca * (.85 + .15 * Math.sin(TAU * t / CARD.breathT));
    ctx.strokeStyle = C.accent; ctx.lineWidth = 1;
    ctx.strokeRect(x + .5, Math.round(y) + .5, CARD.w, CARD.h);
    ctx.restore();
    const r1 = R.textIn(s, CARD.r1), r2 = R.textIn(s, CARD.r2);
    if (r1.a > 0) {
      const W1 = R.measure(ctx, CARD.l1, OPT_C1B), w0 = R.measure(ctx, CARD.a1sp, OPT_C1B);
      const x0 = CARD.cx - W1 / 2 + OPT_C1B.spacing * OPT_C1B.size / 2, yy = CARD.y1 + off + r1.dy;
      OPT_C1A.alpha = r1.a * a; OPT_C1B.alpha = r1.a * a;
      R.text(ctx, CARD.a1, x0, yy, OPT_C1A);
      R.text(ctx, CARD.b1, x0 + w0, yy, OPT_C1B);
    }
    if (r2.a > 0) { OPT_C2.alpha = r2.a * a; R.text(ctx, CARD.l2, CARD.cx, CARD.y2 + off + r2.dy, OPT_C2); }
  }

  R.scene({
    id: 'upptackten', name: 'Upptäckten', start: T.start, end: T.end, pre: 0, post: 0,
    draw(ctx, s, t) {
      /* ---- skalärer för bildrutan ---- */
      // fältets dämpning (isolerade boxar/prickar/solfjäder): .18 → .35 → .9
      let dimIso = lerp(FIELD.in, FIELD.lift, smooth(seg(s, FIELD.lift0, FIELD.lift1)));
      dimIso = lerp(dimIso, FIELD.full, smooth(seg(s, FIELD.full0, FIELD.full1)));
      const ex = lerp(1, EXIT.web, smooth(seg(s, EXIT.t0, EXIT.t0 + EXIT.dur)));     // övergång ut: väven → .3
      const forradA = 1 - smooth(seg(s, FORRAD.out0, FORRAD.out1));
      const exitP = seg(s, EXIT.t0, EXIT.t0 + EXIT.dur);
      const edgePulse = (EDGE.lit - EDGE.rest) * Math.sin(Math.PI * exitP);
      const tExit = t - (s - EXIT.t0);                                                // global tid när s = 74.0
      // Beat 3.1 · stämpeln
      const stampA = seg(s, STAMP.t0, STAMP.t0 + STAMP.fadeIn) * (1 - smooth(seg(s, STAMP.out0, STAMP.out1)));
      // Beat 3.2 · räknaren FÖRSÖK
      const cntF = R.textIn(s, RUB.cntIn, RUB.cntOut, { fo: RUB.cntOutDur });
      // Beat 3.5 · räknarna AGENTER / MEDDELANDEN
      const cntOut = 1 - smooth(seg(s, CNT.out0, CNT.out1));
      const cntDim = 1 - (1 - CNT.dim) * smooth(seg(s, CNT.dim0, CNT.dim1)) * (1 - smooth(seg(s, QUOTE.out0, QUOTE.out1)));
      const agIn = R.textIn(s, CNT_A.tIn), mdIn = R.textIn(s, CNT_M.tIn);
      const agA = agIn.a * cntOut * cntDim, mdA = mdIn.a * cntOut * cntDim;
      // Beat 3.6 · citatet
      const maskQ = smooth(seg(s, QUOTE.mask0, QUOTE.mask0 + QUOTE.maskDur)) * (1 - smooth(seg(s, QUOTE.maskOut0, QUOTE.maskOut1)));
      const quoteOut = 1 - smooth(seg(s, QUOTE.out0, QUOTE.out1));
      const pulseR = 1 + QUOTE.pulseAmp * Math.sin(Math.PI * seg(s, QUOTE.pulseT, QUOTE.pulseT + QUOTE.pulseDur));
      // masker
      if (!W_LABEL) { W_LABEL = R.measure(ctx, 'ARTIFACTORY', { family: F.mono, size: 32, spacing: .44 }); RECT_LABEL.x = 540 - W_LABEL / 2 - S.MASK.pad; RECT_LABEL.w = W_LABEL + 2 * S.MASK.pad; }
      const labelOn = 1 - smooth(seg(s, SHELF.labelOut, SHELF.labelOut + .9));   // etiketten ger plats åt kortet
      RECT_LABEL.a = labelOn; RECT_FORSOK.a = cntF.a; RECT_AG.a = agA; RECT_MD.a = mdA; RECT_Q.a = maskQ;
      // hjälten
      heroPos(s); wallGlow(s);
      const qH = smooth(seg(s, WK[0], WK[0] + JOIN.dur));
      const mH = R.maskFactor(hx, hy, RECTS_HERO);
      X[0] = hx; Y[0] = hy; MK[0] = mH * ex; Q[0] = qH; GD[0] = 0;
      RR[0] = HERO.r * pulseR;

      /* ---- per agent: mask, väckning, TALAR, radie, buckets ---- */
      for (let i = 1; i < N; i++) {
        const x = X[i], y = Y[i], w = WK[i];
        const m = R.maskFactor(x, y, RECTS) * ex;
        const q = smooth(seg(s, w, w + JOIN.dur));
        MK[i] = m; Q[i] = q;
        GD[i] = q > 0 ? smooth(seg(s, w, w + TALAR.attack)) * (1 - smooth(seg(s, w + TALAR.hold, w + TALAR.hold + TALAR.release))) : 0;
        BK_BOX[i] = bucket(A_BOX * (1 - q) * dimIso * m);
        BK_DOT[i] = bucket(lerp(A_ISO * dimIso, 1, q) * m);
        RR[i] = q > 0 ? R_DOT * (1 + AMP * q * Math.sin(TAU * t / T_BREATH + R.phase(i))) * pulseR : R_DOT;
      }
      /* ---- per kant: stroke-progress och alfa .9 → .55 ---- */
      for (let e = 0; e < NE; e++) {
        const t0 = ET[e], p = outExpo(seg(s, t0, t0 + EDGE.litDur));
        EP[e] = p;
        if (p <= 0) { BK_EDGE[e] = 0; continue; }
        const a = lerp(EDGE.lit, EDGE.rest, smooth(seg(s, t0 + EDGE.litDur, t0 + EDGE.litDur + EDGE.settle))) + edgePulse;
        BK_EDGE[e] = bucket(a * Math.min(MK[EA[e]], MK[EB[e]]));
      }
      /* ---- per bud: läge längs kanten (låg → hög index), vid 74.0 glider alla till hjälten ---- */
      for (let e = 0; e < NE; e++) {
        const lo = ELO[e], hi = EHI[e];
        for (let k = 0; k < 2; k++) {
          const j = 2 * e + k;
          const fi = smooth(seg(s, BUD_T[j], BUD_T[j] + BUD.fi));
          if (fi <= 0 || s < ET[e] + EDGE.litDur) { BK_BUD[j] = 0; continue; }
          const dx = X[hi] - X[lo], dy = Y[hi] - Y[lo], d = Math.hypot(dx, dy) || 1;
          let ux = dx / d, uy = dy / d, a = BUD.alpha * fi;
          let bx, by;
          if (s < EXIT.t0) { const p = R.budP(t, e, k); bx = X[lo] + dx * p; by = Y[lo] + dy * p; }
          else {
            const p = R.budP(tExit, e, k), gp = outExpo(seg(s, EXIT.t0, EXIT.t0 + EXIT.glide));
            const sx = X[lo] + dx * p, sy = Y[lo] + dy * p;
            bx = lerp(sx, hx, gp); by = lerp(sy, hy, gp);
            const gx = hx - sx, gy = hy - sy, gd = Math.hypot(gx, gy) || 1;
            ux = lerp(ux, gx / gd, gp); uy = lerp(uy, gy / gd, gp);
            const un = Math.hypot(ux, uy) || 1; ux /= un; uy /= un;
            a *= 1 - smooth(seg(gp, EXIT.vanish, 1));                                  // försvinner in i hjälten
          }
          BX[j] = bx; BY[j] = by; BUX[j] = ux; BUY[j] = uy;
          BK_BUD[j] = bucket(a * R.maskFactor(bx, by, RECTS));
        }
      }

      ctx.save();
      ctx.lineWidth = 1; ctx.lineCap = 'butt';

      /* ---- lager 2 · solfjädern (hair, i y-band med mjuk mask) + hjältens linje i ink .9 + de första fems i ink .7 ---- */
      if (forradA > 0) {
        // Beat 3.2 · hjältens solfjäderlinje ritas om i ink .9 (stroke-progress 44.8–45.6), följer pricken
        const lp = outExpo(seg(s, RUB.lineT0, RUB.lineT0 + RUB.lineDur));
        const hex = lerp(hx, SHELF.cx, lp), hey = lerp(hy, SHELF.y, lp);
        for (let b = 0; b < BANDS.length; b++) {
          const y0 = BANDS[b][0], y1 = BANDS[b][1];
          const mf = R.maskFactor(540, (Math.max(y0, BAND_Y0) + y1) / 2, RECTS_FAN);
          const a = A_HAIR * dimIso * forradA * mf;
          if (a <= .003) continue;
          ctx.globalAlpha = a; ctx.strokeStyle = C.hair; ctx.beginPath();
          let any = false;
          for (let i = 0; i < N; i++) if (segInBand(ctx, X[i], Y[i], SHELF.cx, SHELF.y, y0, y1)) any = true;
          if (any) ctx.stroke();
          if (lp > 0) {
            ctx.globalAlpha = RUB.lineA * forradA * mf; ctx.strokeStyle = C.ink; ctx.beginPath();
            if (segInBand(ctx, hx, hy, hex, hey, y0, y1)) ctx.stroke();
          }
        }
        // Beat 3.4 · de första fem: hårlinjen till hyllan lyser ink .7 (maskerna i zonen är släckta då)
        ctx.strokeStyle = C.ink;
        for (let k = 0; k < FIVE.length; k++) {
          const i = FIVE[k], lit = smooth(seg(s, WK[i], WK[i] + .5));
          if (lit <= 0) continue;
          ctx.globalAlpha = .7 * lit * MK[i] * forradA;
          ctx.beginPath(); ctx.moveTo(X[i], Y[i]); ctx.lineTo(SHELF.cx, SHELF.y); ctx.stroke();
        }
      }

      /* ---- lager 3 · gula kanter + bud ---- */
      ctx.strokeStyle = C.accent;
      batch(ctx, BK_EDGE, NE, e => {
        const a = EA[e], b = EB[e], p = EP[e];
        ctx.moveTo(X[a], Y[a]); ctx.lineTo(lerp(X[a], X[b], p), lerp(Y[a], Y[b], p));
      });
      ctx.strokeStyle = C.ink; ctx.lineWidth = BUD.width; ctx.lineCap = 'round';
      batch(ctx, BK_BUD, NBUD, j => {
        const x = BX[j], y = BY[j], ux = BUX[j] * BUD.half, uy = BUY[j] * BUD.half;
        ctx.moveTo(x - ux, y - uy); ctx.lineTo(x + ux, y + uy);
      });
      ctx.lineWidth = 1; ctx.lineCap = 'butt';

      /* ---- lager 4 · boxar (löses upp för alltid vid väckning) + hjältens box med gap och väggglöd ---- */
      ctx.strokeStyle = C.hair;
      const hs = SIDE / 2;
      batch(ctx, BK_BOX, N, i => ctx.rect(Math.round(X[i] - hs) + .5, Math.round(Y[i] - hs) + .5, SIDE, SIDE));
      heroBox(ctx, 1 - qH, GAP.w * outExpo(seg(s, GAP.t0, GAP.t0 + GAP.dur)));

      /* ---- lager 5 · halo-sprites (ink .22 när vaken, gul .28 under TALAR) ---- */
      for (let i = 1; i < N; i++) {
        if (Q[i] <= 0) continue;
        R.halo(ctx, X[i], Y[i], RR[i], { alpha: A_HALO * Q[i] * MK[i] });
        if (GD[i] > 0) R.halo(ctx, X[i], Y[i], RR[i], { alpha: TALAR.halo * GD[i] * MK[i], scale: TALAR.haloR, color: 'accent' });
      }

      /* ---- lager 6 · prickar: ISOLERAD ink .70 (stilla) → AKTIV ink 1 (andas), gul TALAR-blink ovanpå ---- */
      ctx.fillStyle = C.ink;
      batch(ctx, BK_DOT, N, i => { const x = X[i], y = Y[i], r = RR[i]; ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU); }, true);
      ctx.fillStyle = C.accent;
      for (let i = 1; i < N; i++) {
        if (GD[i] <= 0) continue;
        ctx.globalAlpha = GD[i] * MK[i];
        ctx.beginPath(); ctx.arc(X[i], Y[i], RR[i], 0, TAU); ctx.fill();
      }
      ctx.restore();

      // Hjälten: ISOLERAD (.70, ingen halo, stilla, ring 13) → AKTIV när boxen löses upp (53.6)
      R.drawAgent(ctx, {
        x: hx, y: hy, r: RR[0], i: 0, t,
        alpha: lerp(A_ISO, 1, qH) * mH, halo: A_HALO * qH * mH,
        breath: qH > 0 ? T_BREATH : 0, amp: AMP * qH,
        ring: HERO.ring, ringAlpha: HERO.ringA * mH,
      });

      /* ---- lager 7 · skärmobjekt: förrådet, kortet, stämpeln, landningsringen ---- */
      drawShelf(ctx, SHELF.dim * forradA);
      drawCard(ctx, s, t, forradA);
      drawStamp(ctx, s, stampA);
      const rp = seg(s, STAMP.ringT, STAMP.ringT + STAMP.ringDur);
      if (rp > 0 && rp < 1) {
        R.arc(ctx, STAMP.cx, STAMP.cy, lerp(STAMP.ringR0, STAMP.ringR1, outExpo(rp)), { color: C.ink, width: 1, alpha: STAMP.ringA * (1 - rp) });
      }

      /* ---- lager 8 · text ---- */
      // hyllans etikett ligger kvar dämpad (.18, som scen 2 lämnar den) tills kortet tar dess plats
      if (labelOn > 0) R.label(ctx, 'ARTIFACTORY', 540, SHELF.labelY, { spacing: .44, alpha: SHELF.labelDim * labelOn });
      // Beat 3.2 · FÖRSÖK + rådata
      if (cntF.a > 0) { OPT_CNT_F.alpha = cntF.a; R.counterInline(ctx, 540, RUB.cntY + cntF.dy, hitCount(s), RUB.label, OPT_CNT_F); }
      // Beat 3.5/3.7 · AGENTER (landar 70.0) och MEDDELANDEN (landar 74.0)
      if (agA > 0) {
        OPT_CNT_A.alpha = agA;
        const n = Math.round(CNT_A.target * E.outCubic(seg(s, CNT_A.t0, CNT_A.t0 + CNT_A.dur)));
        R.counter(ctx, CNT_A.cx, CNT_A.cy + agIn.dy, n, CNT_A.label, seg(s, CNT_A.land, CNT_A.land + CNT.landDur), OPT_CNT_A);
      }
      if (mdA > 0) {
        OPT_CNT_M.alpha = mdA;
        const n = Math.round(CNT_M.target * E.outCubic(seg(s, CNT_M.t0, CNT_M.t0 + CNT_M.dur)));
        R.counter(ctx, CNT_M.cx, CNT_M.cy + mdIn.dy, n, CNT_M.label, seg(s, CNT_M.land, CNT_M.land + CNT.landDur), OPT_CNT_M);
      }
      // Beat 3.6 · citatet: etikett, tre rader (rad 3 gul), ut 65.2–66.0
      if (quoteOut > 0 && s >= QUOTE.tLabel) {
        const lb = R.textIn(s, QUOTE.tLabel), q1 = R.textIn(s, QUOTE.t1), q2 = R.textIn(s, QUOTE.t2), q3 = R.textIn(s, QUOTE.t3);
        if (lb.a > 0) R.label(ctx, QUOTE.label, 540, QUOTE.yLabel + lb.dy, { alpha: lb.a * quoteOut });
        if (q1.a > 0) { OPT_Q1.alpha = q1.a * quoteOut; R.text(ctx, QUOTE.l1, 540, QUOTE.y1 + q1.dy, OPT_Q1); }
        if (q2.a > 0) {
          OPT_Q2.size = QUOTE.s2;
          if (R.measure(ctx, QUOTE.l2, OPT_Q2) > QUOTE.maxW) OPT_Q2.size = QUOTE.s2min;
          OPT_Q2.alpha = q2.a * quoteOut; R.text(ctx, QUOTE.l2, 540, QUOTE.y2 + q2.dy, OPT_Q2);
        }
        if (q3.a > 0) { OPT_Q3.alpha = q3.a * quoteOut; R.text(ctx, QUOTE.l3, 540, QUOTE.y3 + q3.dy, OPT_Q3); }
      }
    },
  });
})();
