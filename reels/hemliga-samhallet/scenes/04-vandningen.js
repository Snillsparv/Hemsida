/* ============================================================================
   Scen 4 – Vändningen (75–120 s). Tider: REEL.T.vandningen. Se STORYBOARD.md.

   Ett öga ritas med en enda linje över den frusna väven, och dess ljus sveper
   som en fyr – där ljuset faller släcks prickarna. Senare tömmer sig hjälten
   till en tom ring medan dess sista paket vandrar vidare i det gula och en ring
   får grannarna att flamma. Till sist glider rutnätet ned och muren ritas.

   Allt är en ren funktion av s (lokal tid) och t (global tid – används bara för
   det som ska vara kontinuerligt över scengränser: andningsfas och bud).
   Tabeller (käglans in/ut-intervall, paketets bana, ringens träfftider,
   andningens fasschema) beräknas en gång vid laddning, seedat.
   Storyboardets tider är globala: L(g) = g − T.sb ger lokal tid.
   ============================================================================ */
(function () {
  'use strict';
  const R = REEL, C = R.C, F = R.F, E = R.E, S = R.S, G = R.GRID, W = R.WEB, T = R.T.vandningen;
  const TAU = Math.PI * 2, DEG = Math.PI / 180;
  const lerp = R.lerp, clamp01 = R.clamp01;
  const smooth = E.smooth, outExpo = E.outExpo, inOut = E.inOutCubic;   // inOut = storyboardets easeInOut (banor, paketets hopp)
  const L = g => g - T.sb;                                   // storyboardtid → lokal tid
  const fade = (s, t0, d) => clamp01((s - t0) / d);          // storyboardets fade(t,t0,d)

  /* ------------------------------------------------------------ konstanter */
  const N = G.n, NE = W.edges.length;
  const HERO = { x: 540, y: 700 };                           // hjälten (rutnätet ligger på −170 sedan 26.0)
  const Y_OFF0 = -170, SLIDE = 30, SLIDE_T = L(117.5), SLIDE_D = 1.4;   // 4.7: rutnätet glider +30 → mitt y 730
  const R_GRID = S.R.rutnat, R_HERO = S.R.hjalte, SIDE = G.side;        // 5 / 7 / 46
  const INK_A = .9, HAIR_A = S.HAIR.alpha, BOX_A = S.BOX.alpha;         // 1 px ink .9, hair .85
  const ISO_A = S.ISOLERAD.alpha;                                       // .70 – de tolv som aldrig vaknade
  const HALO_A = S.AKTIV.halo, HALO_R0 = S.AKTIV.haloR, HALO_R1 = 2.5;  // .22, 3.5r → 2.5r när väven backar
  const BREATH_AMP = S.AKTIV.amp;                                       // .06
  const FEAR_OFF = 12;                                                  // 4.3: prickarna backar 12 px från mitten
  const EDGE_REST = S.EDGE.rest, EDGE_LIT = S.EDGE.lit;                 // .55 / .9
  const BUD_A = S.BUD.alpha, BUD_LEN = S.BUD.len, BUD_W = S.BUD.width;  // .9, 6 px, lineWidth 2
  const BUD_BACK = L(78.4);                                             // buden kommer tillbaka ut på kanterna vid klicket
  const NB = 40;                                                        // alfa-buckets för kanter/bud (en path per bucket)

  // Vävens dämpning (allt utom hjälten): scen 3 lämnar den på exakt .3 vid 75.0 (räknarna släckta, buden inne i
  // hjälten, kantpulsen slut) → .6 (85.0) → .5 (101.0); kanterna → .3 (119.4)
  const DIM = { start: .3, lift: .6, liftT: L(85.0), liftD: 1.2, late: .5, lateT: L(101.0), lateD: 1, edgeEnd: .3, edgeT: L(119.4), edgeD: .6 };

  // 4.1 · nyckeln och flaggan
  const KEY = { ring: 40, shaft: 130, tooth: 12, teethX: [110, 124], ringT: L(75.4), ringD: 1.0, shaftT: L(75.9), shaftD: .5, teethT: L(76.15), teethD: .35, rotT: L(77.2), rotD: 1.2, clickT: L(78.4), clickD: .7, clickR: 260 };
  const POLE = { x: 540.5, y0: 700, y1: 470, t0: L(78.6), d: .8 };
  const FLAG = { x: 540, y: 470, w: 232, h: 72, t0: L(79.2), d: .7, textT: L(79.6), breathT0: L(80.0), breathT: 3 };
  const SHRINK = { t0: L(84.6), d: 1.0 };                              // nyckel, stång, flagga krymper mot hjälten
  // 4.2 · etiketten överst: storyboardets y 330 ligger rakt på rutnätets översta rad (y 340) – 270 ger luft, se rapporten
  const INTRO_Y = 270;
  // 4.2 · LÄMNA IN-rutan och linjen som stannar vid 60 %
  // Rutan och linjen tonar ut 83.6; LÄMNA IN ligger kvar till 84.0 och släcks i samma andetag som INOM NÅGRA TIMMAR
  const INBOX = { x: 540, y: 1180, side: 44, t0: L(81.6), out: L(83.6), textOut: L(84.0) };
  const INLINE = { x: 540.5, y0: 542, y1: 1158, frac: .6, t0: L(82.2), d: .8, out: L(83.6) };
  // 4.3 · ögat
  const EYE = { x: 540, y: 520, w: 220, h: 96, iris: 30, pupil: 12, upT: L(86.4), loT: L(86.9), arcD: .9, irisT: L(87.6), irisD: .6, pupT: L(88.2), pupD: .4, blinkT: L(90.4), blinkD: .22, pupOut: L(101.0), out: L(101.3), outD: .7 };
  // 4.4 · käglan
  const CONE = { t0: L(89.5), t1: L(101.5), inD: .6, outT: L(100.5), outD: 1, period: 3, swing: 32, half: 11, len: 1600, fill: .05, edge: .12, drift: 14 };
  // 4.5 · tre ikoner. Storyboardet säger x 300/540/780 och .24em – etiketterna (11 tecken) ryms inte där, se rapporten.
  // Spärrning .20em: FALSKT PROV/SNUBBELTRÅD mäter 273 px → 27 px luft mellan dem vid delningen 300 px (.24em gav 14 px).
  const ICONS = { y: 1150, box: 140, xs: [240, 540, 840], labelY: 1265, spacing: .20, t0: L(93.4), step: 2.1, labelDelay: .5, lineDelay: .2, lineD: .7, fakeDelay: .5, fakeD: .4, outT: L(100.0), outD: 1.0, rise: 20 };
  const ICON_LABELS = ['FALSK LOGG', 'FALSKT PROV', 'SNUBBELTRÅD'];
  // 4.6 · sitt eget slut
  const DEATH = { fillT: L(106.0), fillD: 4.5, ringT: L(109.1), ringD: 1.4, dead: L(110.5) };
  const OFFER = { t0: L(106.2), d: 2.4, r0: 7, r1: 600, a0: .6, flareD: .35, flareAmp: .4 };
  // Paketet ska läsas på mobil (storyboardet: 12×12 hair + 3 px prick – för svagt bredvid buden, se rapporten):
  // 16×16 ink-ruta alfa .6, prick r 2.5 med liten ink-halo (.22, 3.5r), hoppen easeInOut så det syns i rörelse
  const PKG = { t0: L(105.6), splitT: L(108.9), inD: .3, outDelay: .4, outD: .5, side: 16, boxA: .6, dot: 2.5, halo: HALO_A, haloR: HALO_R0 };
  // 4.7 · muren. Underkanten får hörn vid dörrens x 495/585 (samma path som scen 5 ritar): Skia delar hårlinjer
  // längre än 511 px på mitten och lämnar en dämpad söm-pixel – med samma segment blir gränsbilden pixelidentisk.
  const FRAME = { x: 200.5, y: 300.5, w: 680, h: 860, L: 3080, t0: L(118.2), d: 1.4, alpha: .9, doorX0: 495, doorX1: 585 };
  const BOX_OUT = { t0: L(118.2), d: .9 };                             // de sista små boxarna löses upp i muren

  /* ------------------------------------------------------------ andningens fasschema (4.3) */
  // T går 3.2 → 1.4 s över 85.4–86.6 med kontinuerlig fas (linjär T ⇒ sluten form), håller 1.4 s medan
  // ögat ser på, och går tillbaka 1.4 → 3.2 s med samma teknik. Återgångens start tc väljs så att de
  // extra varven blir exakt 6 hela – då är fasen densamma som R.breath(r, t, i) igen vid scenens slut.
  const BR = (function () {
    const T0 = S.AKTIV.T, T1 = 1.4, ta = L(85.4), tb = L(86.6), D = 1.8, CYC = 6;
    const k1 = (T1 - T0) / (tb - ta), k2 = (T0 - T1) / D;
    const eB = Math.log(T1 / T0) / k1 - (tb - ta) / T0;                 // extra varv vid tb
    const eRamp = Math.log(T0 / T1) / k2 - D / T0;                       // extra varv under återgången
    const tc = tb + (CYC - eB - eRamp) / (1 / T1 - 1 / T0);              // ≈ L(100.44)
    return { T0, T1, ta, tb, tc, td: tc + D, D, k1, k2, eB, eC: eB + (tc - tb) * (1 / T1 - 1 / T0), CYC };
  })();
  /** Extra andningsvarv utöver t/3.2 – 0 före 85.4, exakt 6 hela varv efter återgången. */
  function breathExtra(s) {
    if (s <= BR.ta) return 0;
    if (s <= BR.tb) return Math.log((BR.T0 + BR.k1 * (s - BR.ta)) / BR.T0) / BR.k1 - (s - BR.ta) / BR.T0;
    if (s <= BR.tc) return BR.eB + (s - BR.tb) * (1 / BR.T1 - 1 / BR.T0);
    if (s <= BR.td) return BR.eC + Math.log((BR.T1 + BR.k2 * (s - BR.tc)) / BR.T1) / BR.k2 - (s - BR.tc) / BR.T0;
    return BR.CYC;
  }
  const RELAX = { t0: BR.tc, d: BR.D };                                // väven andas ut: offset och halo tillbaka

  /* ------------------------------------------------------------ tabeller (init) */
  // Agenterna: position (yOff 0), riktning bort från mitten, avstånd, fas, aktiv, rädd position (för käglan).
  // Bara de aktiva backar i 4.3 – de tolv ISOLERADE står stilla som frost (fx/fy = deras vanliga plats).
  const AG = [];
  for (let i = 0; i < N; i++) {
    const p = G.posOf(i, 0), x = p.x, y = p.y + Y_OFF0;
    const dx = x - HERO.x, dy = y - HERO.y, d = Math.hypot(dx, dy);
    const active = isFinite(W.wake[i]);
    const ux = d && active ? dx / d : 0, uy = d && active ? dy / d : 0;
    AG.push({ i, x: p.x, y: p.y, ux, uy, d, phi: R.phase(i), active,
      fx: x + ux * FEAR_OFF, fy: y + uy * FEAR_OFF,
      flareT: OFFER.t0 + OFFER.d * (-Math.log2(1 - clamp01((d - OFFER.r0) / (OFFER.r1 - OFFER.r0))) / 10),
      talarT: i === 0 ? L(75.2) : Infinity, hide: null });
  }
  const EA = new Uint8Array(NE), EB = new Uint8Array(NE);
  W.edges.forEach((e, k) => { EA[k] = e.a; EB[k] = e.b; });
  const edgeOf = (a, b) => { const o = W.adj[a].find(q => q.to === b); return o ? o.e : -1; };

  // 4.4 · käglan: in/ut-intervall per agent, lösta ur svepet (240 Hz-sampling + bisektion), lagrade platt [in,ut,in,ut…]
  const coneSin = s => Math.sin(TAU * (s - CONE.t0) / CONE.period);
  const coneAng = s => 90 + CONE.swing * coneSin(s);
  // Pupillen driver med ljuset: ang > 90° pekar ned-vänster i canvas, därför minus (storyboardets "+" ger motsatt håll)
  const coneApexX = s => EYE.x - CONE.drift * coneSin(s);
  {
    const inside = (a, s) => Math.abs(coneAng(s) - Math.atan2(a.fy - EYE.y, a.fx - coneApexX(s)) / DEG) < CONE.half;
    const dt = 1 / 240;
    for (const a of AG) {
      const iv = [];
      let was = inside(a, CONE.t0), open = was ? CONE.t0 : 0;
      for (let s = CONE.t0 + dt; s <= CONE.t1 + dt; s += dt) {
        const now = inside(a, s);
        if (now === was) continue;
        let lo = s - dt, hi = s;                                      // bisektion mot övergången
        for (let k = 0; k < 14; k++) { const m = (lo + hi) / 2; if (inside(a, m) === was) lo = m; else hi = m; }
        if (now) open = hi; else iv.push(open, hi);
        was = now;
      }
      if (was) iv.push(open, CONE.t1);
      a.hide = iv;
    }
  }
  /** GÖMD-grad 0..1 för agent i vid s: attack 0.2 s inne i ljuset, release 0.6 s efter. */
  function hideOf(a, s) {
    const iv = a.hide; let v = 0;
    for (let k = 0; k < iv.length; k += 2) {
      const t0 = iv[k], t1 = iv[k + 1];
      if (s < t0) break;
      const h = s < t1 ? smooth(fade(s, t0, S.GOMD.attack)) : 1 - smooth(fade(s, t1, S.GOMD.release));
      if (h > v) v = h;
    }
    return v;
  }

  // 4.6 · paketets bana (seed 4): hjälte → A → B → C → {D1, D2}, utan återbesök, djupet först i seedad ordning
  const SEGS = [];
  {
    const rnd = R.rng(4);
    const shuffle = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; };
    const walk = (node, visited, depth) => {
      const cand = shuffle(W.adj[node].map(q => q.to).filter(j => !visited.has(j)));
      if (depth === 3) return cand.length >= 2 ? [cand[0], cand[1]] : null;
      for (const j of cand) { visited.add(j); const rest = walk(j, visited, depth + 1); if (rest) return [j].concat(rest); visited.delete(j); }
      return null;
    };
    const path = walk(0, new Set([0]), 0) || [W.adj[0][0].to, W.adj[0][0].to, W.adj[0][0].to, W.adj[0][0].to, W.adj[0][0].to];
    const [A, B, Cn, D1, D2] = path;
    const seg = (pkg, from, to, t0, dur) => SEGS.push({ pkg, from, to, t0, dur, e: edgeOf(from, to) });
    seg(0, 0, A, L(105.6), 1.1);
    seg(0, A, B, L(107.0), 1.0);
    seg(0, B, Cn, L(108.3), .9);
    seg(0, Cn, D1, L(109.2), .9);
    seg(1, Cn, D2, L(110.0), .9);
    for (const sg of SEGS) AG[sg.to].talarT = Math.min(AG[sg.to].talarT, sg.t0 + sg.dur);   // mottagaren blinkar TALAR
  }
  const PKGS = [
    { start: 0, born: PKG.t0, segs: SEGS.filter(g => g.pkg === 0) },
    { start: SEGS[4].from, born: PKG.splitT, segs: SEGS.filter(g => g.pkg === 1) },
  ];
  for (const p of PKGS) { const last = p.segs[p.segs.length - 1]; p.end = last.t0 + last.dur + PKG.outDelay; }

  /* ------------------------------------------------------------ textmasker */
  // Rektanglarna skapas med bredd 0 och mäts på första bildrutan (kräver ctx). a sätts varje frame.
  const RECTS = {
    intro: R.textRect(540, INTRO_Y, 0, 32, 0),               // INOM NÅGRA TIMMAR
    lamna: R.textRect(540, 1240, 0, 32, 0),                  // LÄMNA IN
    eye: R.textRect(EYE.x, 540, 360, 120, 0),                // väven bakom ögat (y 440–640) → .25
    bedom: R.textRect(540, 610, 0, 34, 0),                   // BEDÖMAREN
    dygn: R.textRect(540, 1150, 0, 32, 0),                   // FLERA DYGN
    icon0: R.textRect(ICONS.xs[0], 1180.5, ICONS.box, 201, 0), // ikonruta + etikett
    icon1: R.textRect(ICONS.xs[1], 1180.5, ICONS.box, 201, 0),
    icon2: R.textRect(ICONS.xs[2], 1180.5, ICONS.box, 201, 0),
    slut: R.textRect(540, 1400, 0, 32, 0),                   // SITT EGET SLUT
  };
  const RECT_LIST = Object.values(RECTS);
  let measured = false;
  function measureAll(ctx) {
    const mono = (str, size, spacing) => R.measure(ctx, str, { family: F.mono, size, spacing, upper: true }) - spacing * size;
    const set = (r, w) => { r.x = 540 - w / 2 - S.MASK.pad; r.w = w + 2 * S.MASK.pad; };
    set(RECTS.intro, mono('INOM NÅGRA TIMMAR', 32, .44));
    set(RECTS.lamna, mono('LÄMNA IN', 32, .3));
    set(RECTS.bedom, mono('BEDÖMAREN', 34, .44));
    set(RECTS.dygn, mono('FLERA DYGN', 32, .3));
    set(RECTS.slut, mono('SITT EGET SLUT', 32, .44));
    measured = true;
  }

  /* ------------------------------------------------------------ per-frame-buffertar */
  const AX = new Float32Array(N), AY = new Float32Array(N), AR = new Float32Array(N);   // position, radie (med andning/flamma)
  const AF = new Float32Array(N), AH = new Float32Array(N), AQ = new Float32Array(N);   // fyllnings-alfa, halo-alfa, TALAR-grad
  const AM = new Float32Array(N);                                                        // mask × dämpning
  const AHD = new Float32Array(N);                                                       // gömd-grad
  const EAL = new Float32Array(NE), EBK = new Uint8Array(NE);                           // kantalfa + bucket
  const BAL = new Float32Array(NE), BBK = new Uint8Array(NE);                           // budalfa + bucket

  /** TALAR-grad: 0.1 s attack, håll 0.5 s, tona tillbaka 0.9 s. */
  function talarQ(s, t0) {
    if (!(s >= t0)) return 0;
    if (s < t0 + S.TALAR.hold) return Math.min(1, (s - t0) / .1);
    return 1 - smooth(fade(s, t0 + S.TALAR.hold, S.TALAR.release));
  }
  /** Vävens dämpning vid s (allt utom hjälten). */
  function webDim(s) {
    const d = lerp(DIM.start, DIM.lift, smooth(fade(s, DIM.liftT, DIM.liftD)));
    return lerp(d, DIM.late, smooth(fade(s, DIM.lateT, DIM.lateD)));
  }
  /** Etikett med standardtoningen; returnerar alfa. */
  function labelIn(ctx, str, y, s, tIn, tOut, o = {}) {
    const f = R.textIn(s, tIn, tOut, { rise: o.rise == null ? 16 : o.rise });
    if (f.a > 0) R.label(ctx, str, o.x == null ? 540 : o.x, y + f.dy, { size: o.size || 32, spacing: o.spacing == null ? .3 : o.spacing, color: o.color || C.mist, alpha: f.a });
    return f.a;
  }

  /* ------------------------------------------------------------ skärmobjekt */
  /** Nyckeln kring hjälten: ring r 40, skaft 130 åt höger, två tänder 12 px nedåt nära änden. Dash-teknik. */
  function drawKey(ctx, cx, cy, pRing, pShaft, pTeeth, theta, sc, alpha) {
    if (alpha <= 0 || pRing <= 0 || sc <= .02) return;
    ctx.save(); ctx.globalAlpha *= alpha;
    ctx.translate(cx, cy); ctx.rotate(theta); ctx.scale(sc, sc);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1 / sc; ctx.lineCap = 'butt';
    R.strokeDash(ctx, TAU * KEY.ring, pRing, () => { ctx.beginPath(); ctx.arc(0, 0, KEY.ring, 0, TAU); ctx.stroke(); });
    if (pShaft > 0) { ctx.beginPath(); ctx.moveTo(KEY.ring, .5); ctx.lineTo(KEY.ring + KEY.shaft * pShaft, .5); ctx.stroke(); }
    if (pTeeth > 0) {
      ctx.beginPath();
      for (const tx of KEY.teethX) { const x = KEY.ring + tx + .5; ctx.moveTo(x, 0); ctx.lineTo(x, KEY.tooth * pTeeth); }
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Ikon k i en 140-ruta kring (cx, cy): 1 px ink, dash-teknik; det falska tonar in separat. */
  function drawIcon(ctx, k, cx, cy, pLine, fakeA, alpha) {
    if (alpha <= 0 || pLine <= 0) return;
    ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = C.ink; ctx.fillStyle = C.ink; ctx.lineWidth = 1; ctx.lineCap = 'butt';
    if (k === 0) {                                              // FALSK LOGG: fyra rader 80/60/70/50, den tredje streckad
      const lens = [80, 60, 70, 50], x0 = cx - 40 + .5;
      for (let j = 0; j < 4; j++) {
        const y = cy - 27 + 18 * j + .5;
        if (j === 2) {
          if (fakeA <= 0) continue;
          ctx.save(); ctx.globalAlpha *= fakeA; ctx.setLineDash([6, 6]);
          ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + lens[j], y); ctx.stroke(); ctx.restore();
        } else {
          ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + lens[j] * pLine, y); ctx.stroke();
        }
      }
    } else if (k === 1) {                                       // FALSKT PROV: två 72×72, den bakre streckad och förskjuten (+14,+14)
      const x0 = cx - 43 + .5, y0 = cy - 43 + .5;
      R.strokeDash(ctx, 288, pLine, () => { ctx.beginPath(); ctx.rect(x0, y0, 72, 72); ctx.stroke(); });
      if (fakeA > 0) {
        ctx.save(); ctx.globalAlpha *= fakeA;
        ctx.beginPath(); ctx.rect(cx - 90, cy - 90, 180, 180); ctx.rect(x0, y0, 72, 72); ctx.clip('evenodd');   // bakom den främre
        ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.rect(x0 + 14, y0 + 14, 72, 72); ctx.stroke(); ctx.restore();
      }
    } else {                                                    // SNUBBELTRÅD: två stolpar 2×30 vid x ±48, tråd med 10 px sänka
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (const sx of [-48, 48]) { ctx.moveTo(cx + sx, cy + 15); ctx.lineTo(cx + sx, cy + 15 - 30 * pLine); }
      ctx.stroke();
      if (fakeA > 0) {
        ctx.lineWidth = 1;
        const Lw = R.quadLength(cx - 48, cy - 10, cx, cy + 10, cx + 48, cy - 10);
        R.strokeDash(ctx, Lw, fakeA, () => { ctx.beginPath(); ctx.moveTo(cx - 48, cy - 10 + .5); ctx.quadraticCurveTo(cx, cy + 10 + .5, cx + 48, cy - 10 + .5); ctx.stroke(); });
      }
    }
    ctx.restore();
  }

  /** Paketet: liten ink-halo, 16×16 ink-ruta (alfa .6) och prick r 2.5 – ritas i lager 7, ovanpå mottagarens TALAR-halo. */
  function drawPackage(ctx, x, y, alpha) {
    if (alpha <= 0) return;
    R.halo(ctx, x, y, PKG.dot, { alpha: PKG.halo * alpha, scale: PKG.haloR });
    ctx.save();
    ctx.globalAlpha *= alpha * PKG.boxA; ctx.strokeStyle = C.ink; ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(x - PKG.side / 2) + .5, Math.round(y - PKG.side / 2) + .5, PKG.side, PKG.side);
    ctx.globalAlpha = alpha * INK_A; ctx.fillStyle = C.ink;
    ctx.beginPath(); ctx.arc(x, y, PKG.dot, 0, TAU); ctx.fill();
    ctx.restore();
  }

  R.scene({
    id: 'vandningen', name: 'Vändningen', start: T.start, end: T.end, pre: 0, post: 0,
    draw(ctx, s, t) {
      if (!measured) measureAll(ctx);

      /* ---------- gemensamma tidsvärden ---------- */
      const yOff = Y_OFF0 + SLIDE * outExpo(fade(s, SLIDE_T, SLIDE_D));         // 4.7 rutnätet glider ned
      const dim = webDim(s);
      const edgeDim = lerp(dim, DIM.edgeEnd, smooth(fade(s, DIM.edgeT, DIM.edgeD)));   // 4.7 kanterna till .3
      const fear = outExpo(fade(s, L(85.4), 1.2)) * (1 - outExpo(fade(s, RELAX.t0, RELAX.d)));   // 4.3 väven backar … andas ut
      const off = FEAR_OFF * fear, haloSc = lerp(HALO_R0, HALO_R1, fear);
      const phase = TAU * (t / BR.T0 + breathExtra(s));                            // andningsfas (kontinuerlig)
      const coneA = smooth(fade(s, CONE.t0, CONE.inD)) * (1 - smooth(fade(s, CONE.outT, CONE.outD)));
      const budIn = smooth(fade(s, BUD_BACK, .9));                                  // buden tillbaka ut på kanterna
      const boxA = BOX_A * (1 - smooth(fade(s, BOX_OUT.t0, BOX_OUT.d)));           // 4.7 de sista boxarna löses upp
      const hx = HERO.x, hy = HERO.y + (yOff - Y_OFF0);

      /* ---------- text-alfa och masker (före prickpasset) ---------- */
      const introTx = R.textIn(s, L(80.6), L(84.0));
      const lamnaTx = R.textIn(s, INBOX.t0, INBOX.textOut);                        // ut 84.0 med INOM NÅGRA TIMMAR
      const eyeOut = 1 - smooth(fade(s, EYE.out, EYE.outD));
      const eyeA = smooth(fade(s, EYE.upT, .9)) * eyeOut;
      const bedomTx = R.textIn(s, L(88.6), EYE.out);
      const dygnTx = R.textIn(s, L(90.6), L(92.8));
      const slutTx = R.textIn(s, L(108.4), L(113.4));
      const iconOut = 1 - smooth(fade(s, ICONS.outT, ICONS.outD));
      const iconA = [0, 0, 0];
      for (let k = 0; k < 3; k++) iconA[k] = smooth(fade(s, ICONS.t0 + ICONS.step * k, .9)) * iconOut;
      RECTS.intro.a = introTx.a; RECTS.lamna.a = lamnaTx.a;
      RECTS.eye.a = eyeA; RECTS.bedom.a = bedomTx.a; RECTS.dygn.a = dygnTx.a; RECTS.slut.a = slutTx.a;
      RECTS.icon0.a = iconA[0]; RECTS.icon1.a = iconA[1]; RECTS.icon2.a = iconA[2];

      /* ---------- agenternas tillstånd ---------- */
      const heroFill = 1 - smooth(fade(s, DEATH.fillT, DEATH.fillD));              // 4.6 hjälten töms
      const dead = s >= DEATH.dead;
      for (let i = 0; i < N; i++) {
        const a = AG[i];
        const x = a.x + a.ux * off, y = a.y + yOff + a.uy * off;                  // ux/uy = 0 för de isolerade → stilla
        AX[i] = x; AY[i] = y;
        const m = R.maskFactor(x, y, RECT_LIST);
        const hide = hideOf(a, s) * coneA;
        AHD[i] = hide;
        const q = talarQ(s, a.talarT);
        AQ[i] = q;
        const base = i === 0 ? R_HERO : R_GRID;
        if (a.active) {
          const flare = i === 0 ? 0 : OFFER.flareAmp * Math.sin(Math.PI * fade(s, a.flareT, OFFER.flareD));
          let amp = BREATH_AMP * (1 - hide);
          if (i === 0) amp *= heroFill;
          AR[i] = base * (1 + amp * Math.sin(phase + a.phi) + flare);
          const fill = lerp(1, S.GOMD.alpha, hide), halo = HALO_A * (1 - hide);
          if (i === 0) { AF[i] = fill * heroFill; AH[i] = halo * heroFill; AM[i] = m; }
          else { AF[i] = fill; AH[i] = halo; AM[i] = m * dim; }
        } else {                                                                    // ISOLERAD: andas inte, ingen halo
          AR[i] = base; AF[i] = lerp(ISO_A, S.GOMD.alpha, hide); AH[i] = 0; AM[i] = m * dim;
        }
      }

      /* ---------- kanternas och budens alfa ---------- */
      for (let e = 0; e < NE; e++) {
        const ia = EA[e], ib = EB[e];
        const mx = (AX[ia] + AX[ib]) / 2, my = (AY[ia] + AY[ib]) / 2;
        const f = edgeDim * R.maskFactor(mx, my, RECT_LIST) * (1 - .8 * Math.max(AHD[ia], AHD[ib]));
        EAL[e] = f; BAL[e] = f * budIn;
      }
      for (const sg of SEGS) {                                                      // 4.6 den använda kanten pulserar .55 → .9 → .55
        if (sg.e < 0 || s < sg.t0) continue;
        const p = smooth(fade(s, sg.t0, sg.dur)) * (1 - smooth(fade(s, sg.t0 + sg.dur, .9)));
        if (p > 0) EAL[sg.e] *= (EDGE_REST + (EDGE_LIT - EDGE_REST) * p) / EDGE_REST;
      }
      for (let e = 0; e < NE; e++) {
        EBK[e] = Math.round(Math.min(1, EDGE_REST * EAL[e]) * NB); BBK[e] = Math.round(Math.min(1, BUD_A * BAL[e]) * NB);
      }

      /* ---------- lager 3: gula kanter + bud (batchade per alfa-bucket) ---------- */
      ctx.save(); ctx.strokeStyle = C.accent; ctx.lineWidth = 1; ctx.lineCap = 'butt';
      for (let b = 1; b <= NB; b++) {
        let any = false;
        for (let e = 0; e < NE; e++) {
          if (EBK[e] !== b) continue;
          if (!any) { ctx.beginPath(); any = true; }
          ctx.moveTo(AX[EA[e]], AY[EA[e]]); ctx.lineTo(AX[EB[e]], AY[EB[e]]);
        }
        if (any) { ctx.globalAlpha = b / NB; ctx.stroke(); }
      }
      if (budIn > 0) {
        ctx.strokeStyle = C.ink; ctx.lineWidth = BUD_W; ctx.lineCap = 'round';
        for (let b = 1; b <= NB; b++) {
          let any = false;
          for (let e = 0; e < NE; e++) {
            if (BBK[e] !== b) continue;
            const x1 = AX[EA[e]], y1 = AY[EA[e]], x2 = AX[EB[e]], y2 = AY[EB[e]];
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
      }
      ctx.restore();

      /* ---------- lager 4: boxar (de tolv som aldrig vaknade) ---------- */
      if (boxA > 0) {
        ctx.save(); ctx.strokeStyle = C.hair; ctx.lineWidth = 1;
        for (const i of W.never) {
          const a = boxA * AM[i]; if (a <= .003) continue;
          ctx.globalAlpha = a;
          ctx.strokeRect(Math.round(AX[i] - SIDE / 2) + .5, Math.round(AY[i] - SIDE / 2) + .5, SIDE, SIDE);
        }
        ctx.restore();
      }

      /* ---------- beat 4.4 · käglan (mellan lager 4 och 5) ---------- */
      if (coneA > 0) {
        const ang = coneAng(s) * DEG, ax = coneApexX(s), ay = EYE.y;
        const a0 = ang - CONE.half * DEG, a1 = ang + CONE.half * DEG;
        const x0 = ax + CONE.len * Math.cos(a0), y0 = ay + CONE.len * Math.sin(a0);
        const x1 = ax + CONE.len * Math.cos(a1), y1 = ay + CONE.len * Math.sin(a1);
        ctx.save();
        ctx.beginPath(); ctx.rect(0, EYE.y, R.W, R.H - EYE.y); ctx.clip();          // klipp till y ≥ 520
        ctx.fillStyle = C.ink; ctx.globalAlpha = CONE.fill * coneA;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(x0, y0); ctx.lineTo(x1, y1); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.globalAlpha = CONE.edge * coneA;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(x0, y0); ctx.moveTo(ax, ay); ctx.lineTo(x1, y1); ctx.stroke();
        ctx.restore();
      }

      /* ---------- lager 5: halo-sprites ---------- */
      for (let i = 0; i < N; i++) {
        const q = AQ[i], m = AM[i];
        if (AH[i] * (1 - q) > 0) R.halo(ctx, AX[i], AY[i], AR[i], { alpha: AH[i] * (1 - q) * m, scale: haloSc });
        if (q > 0) R.halo(ctx, AX[i], AY[i], AR[i], { alpha: S.TALAR.halo * q * m, scale: S.TALAR.haloR, color: 'accent' });
      }

      /* ---------- lager 6: prickfyllningar och ringar ---------- */
      ctx.save();
      ctx.fillStyle = C.ink;
      for (let i = 0; i < N; i++) {
        const a = AF[i] * AM[i] * (1 - AQ[i]); if (a <= .003) continue;
        ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(AX[i], AY[i], AR[i], 0, TAU); ctx.fill();
      }
      ctx.fillStyle = C.accent;
      for (let i = 0; i < N; i++) {
        const a = AQ[i] * AM[i]; if (a <= .003) continue;
        ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(AX[i], AY[i], AR[i], 0, TAU); ctx.fill();
      }
      ctx.restore();
      // Hjältens ring r 13 (.35) → sluter sig till den tomma ringen r 7 (.5) vid 110.5; därefter DÖD
      if (dead) R.drawAgent(ctx, { x: hx, y: hy, r: R_HERO, dead: true, mask: AM[0] });
      else {
        const q = outExpo(fade(s, DEATH.ringT, DEATH.ringD));
        R.drawAgent(ctx, { x: hx, y: hy, r: 0, alpha: 0, ring: lerp(S.HJALTE.ring, R_HERO, q), ringAlpha: lerp(S.HJALTE.ringAlpha, S.DOD.alpha, q), mask: AM[0] });
      }

      /* ---------- lager 7: skärmobjekt ---------- */
      // Beat 4.1 · klicket: ring r 40 → 260, ink .5 → 0, 0.7 s expoOut
      {
        const p = outExpo(fade(s, KEY.clickT, KEY.clickD));
        if (p > 0 && p < 1) R.arc(ctx, hx, hy, lerp(KEY.ring, KEY.clickR, p), { color: C.ink, width: 1, alpha: .5 * (1 - p) });
      }
      // Beat 4.1–4.2 · nyckel, stång, flagga (krymper mot hjälten 84.6–85.6 och tonar ut)
      if (s >= KEY.ringT && s < SHRINK.t0 + SHRINK.d + .1) {
        const sc = 1 - outExpo(fade(s, SHRINK.t0, SHRINK.d));
        const objA = 1 - smooth(fade(s, SHRINK.t0, .9));
        if (sc > .02 && objA > 0) {
          const theta = Math.PI / 2 * outExpo(fade(s, KEY.rotT, KEY.rotD));
          drawKey(ctx, hx, hy, outExpo(fade(s, KEY.ringT, KEY.ringD)), outExpo(fade(s, KEY.shaftT, KEY.shaftD)), outExpo(fade(s, KEY.teethT, KEY.teethD)), theta, sc, INK_A * objA);
          ctx.save();
          ctx.translate(hx, hy); ctx.scale(sc, sc); ctx.translate(-hx, -hy);
          const pPole = outExpo(fade(s, POLE.t0, POLE.d));
          if (pPole > 0) R.line(ctx, POLE.x, POLE.y0, POLE.x, lerp(POLE.y0, POLE.y1, pPole), { color: C.ink, width: 1 / sc, alpha: INK_A * objA, cap: 'butt' });
          const pFlag = outExpo(fade(s, FLAG.t0, FLAG.d));
          if (pFlag > 0) {
            const fw = FLAG.w * pFlag;
            // flaggan andas .84–1.0 (period 3 s) från 80.0, startar på 1 så inget hoppar
            const breathA = s >= FLAG.breathT0 ? 1 - .16 * (.5 - .5 * Math.cos(TAU * (s - FLAG.breathT0) / FLAG.breathT)) : 1;
            ctx.save(); ctx.globalAlpha *= objA * breathA;
            ctx.fillStyle = C.accent; ctx.fillRect(FLAG.x, FLAG.y, fw, FLAG.h);
            ctx.restore();
            const ta = smooth(fade(s, FLAG.textT, .9)) * objA;
            if (ta > 0) {
              ctx.save(); ctx.beginPath(); ctx.rect(FLAG.x, FLAG.y, fw, FLAG.h); ctx.clip();      // texten klipps till flaggans bredd
              R.text(ctx, 'SVARET', FLAG.x + FLAG.w / 2, FLAG.y + FLAG.h / 2, { family: F.mono, weight: 500, size: 36, spacing: .3, color: C.bg, align: 'center', alpha: ta });
              ctx.restore();
            }
          }
          ctx.restore();
        }
      }
      // Beat 4.2 · LÄMNA IN-rutan och linjen som stannar vid 60 %
      {
        const outA = 1 - smooth(fade(s, INBOX.out, .9));
        const boxA2 = smooth(fade(s, INBOX.t0, .9)) * outA;
        if (boxA2 > 0) R.agentBox(ctx, INBOX.x, INBOX.y, INBOX.side, HAIR_A * boxA2);
        const pL = outExpo(fade(s, INLINE.t0, INLINE.d)), lineA = INK_A * (1 - smooth(fade(s, INLINE.out, .9)));
        if (pL > 0 && lineA > 0) R.line(ctx, INLINE.x, INLINE.y0, INLINE.x, INLINE.y0 + (INLINE.y1 - INLINE.y0) * INLINE.frac * pL, { color: C.ink, width: 1, alpha: lineA, cap: 'butt' });
      }
      // Beat 4.3 · ögat (bågar dash vänster→höger, iris, pupill; blinkning 90.4; pupillen driver med käglan; ut 101–102, pupillen först)
      if (s >= EYE.upT && eyeOut > 0) {
        const pupilOut = 1 - smooth(fade(s, EYE.pupOut, .5));
        R.eye(ctx, EYE.x, EYE.y, EYE.w, EYE.h, {
          upper: outExpo(fade(s, EYE.upT, EYE.arcD)), lower: outExpo(fade(s, EYE.loT, EYE.arcD)),
          iris: outExpo(fade(s, EYE.irisT, EYE.irisD)), pupil: smooth(fade(s, EYE.pupT, EYE.pupD)) * pupilOut,
          irisR: EYE.iris, pupilR: EYE.pupil, pupilX: s >= CONE.t0 ? coneApexX(s) - EYE.x : 0,
          blink: fade(s, EYE.blinkT, EYE.blinkD), alpha: INK_A * eyeOut,
        });
      }
      // Beat 4.5 · tre ikoner i hårlinjerutor
      for (let k = 0; k < 3; k++) {
        const a = iconA[k]; if (a <= 0) continue;
        const t0 = ICONS.t0 + ICONS.step * k, cx = ICONS.xs[k];
        const cy = Math.round(ICONS.y + ICONS.rise * (1 - outExpo(fade(s, t0, 1.1))));   // avrundat: rutan och ikonen på samma pixel
        R.agentBox(ctx, cx, cy, ICONS.box, HAIR_A * a);
        const pLine = outExpo(fade(s, t0 + ICONS.lineDelay, ICONS.lineD));
        const fakeA = k === 2 ? outExpo(fade(s, t0 + ICONS.lineDelay + ICONS.lineD + ICONS.fakeDelay, .5)) : smooth(fade(s, t0 + ICONS.lineDelay + ICONS.lineD + ICONS.fakeDelay, ICONS.fakeD));
        drawIcon(ctx, k, cx, cy, pLine, fakeA, INK_A * a);
      }
      // Beat 4.6 · offerringen: r 7 → 600, 1 px gul, .6 → 0, 2.4 s expoOut
      {
        const p = outExpo(fade(s, OFFER.t0, OFFER.d));
        if (p > 0 && p < 1) R.arc(ctx, hx, hy, lerp(OFFER.r0, OFFER.r1, p), { color: C.accent, width: 1, alpha: OFFER.a0 * (1 - p) });
      }
      // Beat 4.6 · paketet (och dess klon efter delningen) längs de gula kanterna – hoppen easeInOut så det syns i rörelse
      for (const pk of PKGS) {
        if (s < pk.born || s >= pk.end + PKG.outD) continue;
        let x = AX[pk.start], y = AY[pk.start];
        for (const sg of pk.segs) {
          if (s < sg.t0) break;
          const p = inOut(fade(s, sg.t0, sg.dur));
          x = lerp(AX[sg.from], AX[sg.to], p); y = lerp(AY[sg.from], AY[sg.to], p);
        }
        drawPackage(ctx, x, y, smooth(fade(s, pk.born, PKG.inD)) * (1 - smooth(fade(s, pk.end, PKG.outD))));
      }
      // Beat 4.7 · muren: ram (200,300)–(880,1160), dash-teknik medurs från övre vänstra hörnet.
      // Underkanten ritas som tre segment (880→585, dörren 585→495, 495→200) precis som scen 5 – samma perimeter 3080.
      {
        const p = outExpo(fade(s, FRAME.t0, FRAME.d));
        if (p > 0) {
          const x1 = FRAME.x + FRAME.w, y1 = FRAME.y + FRAME.h;
          ctx.save(); ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.globalAlpha = FRAME.alpha; ctx.lineCap = 'butt';
          R.strokeDash(ctx, FRAME.L, p, () => {
            ctx.beginPath(); ctx.moveTo(FRAME.x, FRAME.y); ctx.lineTo(x1, FRAME.y); ctx.lineTo(x1, y1);
            ctx.lineTo(FRAME.doorX1, y1); ctx.lineTo(FRAME.doorX0, y1); ctx.lineTo(FRAME.x, y1); ctx.closePath(); ctx.stroke();
          });
          ctx.restore();
        }
      }

      /* ---------- lager 8: text ---------- */
      // 4.2 · INOM NÅGRA TIMMAR – 32 px mist .44em, y 270 (storyboard 330), in 80.6, ut 84.0
      if (introTx.a > 0) R.label(ctx, 'INOM NÅGRA TIMMAR', 540, INTRO_Y + introTx.dy, { spacing: .44, alpha: introTx.a });
      // 4.2 · LÄMNA IN – 32 px mist .30em, y 1240, med rutan
      if (lamnaTx.a > 0) R.label(ctx, 'LÄMNA IN', 540, 1240 + lamnaTx.dy, { alpha: lamnaTx.a });
      // 4.3 · BEDÖMAREN – 34 px INK .44em, y 610, in 88.6, ut med ögat
      if (bedomTx.a > 0) R.label(ctx, 'BEDÖMAREN', 540, 610 + bedomTx.dy, { size: 34, spacing: .44, color: C.ink, alpha: bedomTx.a });
      // 4.4 · FLERA DYGN – 32 px mist .30em, y 1150, in 90.6, ut 92.8
      if (dygnTx.a > 0) R.label(ctx, 'FLERA DYGN', 540, 1150 + dygnTx.dy, { alpha: dygnTx.a });
      // 4.5 · ikonetiketter – 32 px mist, y 1265, in 93.9 + 2.1k, ut 100.0
      for (let k = 0; k < 3; k++) labelIn(ctx, ICON_LABELS[k], ICONS.labelY, s, ICONS.t0 + ICONS.step * k + ICONS.labelDelay, ICONS.outT, { x: ICONS.xs[k], spacing: ICONS.spacing });
      // 4.6 · SITT EGET SLUT – 32 px mist .44em, y 1400, 108.4–113.4
      if (slutTx.a > 0) R.label(ctx, 'SITT EGET SLUT', 540, 1400 + slutTx.dy, { spacing: .44, alpha: slutTx.a });
    },
  });
})();
