/* ============================================================================
   Scen 7 – Reflektion (170–190 s). Tider: REEL.T.reflektion. Se STORYBOARD.md.

   Över det nästan släckta fältet (solrosdisken på .14, andas T = 4 s) ritas en
   enda ring. Ögat återkommer inne i den – utan pupill – blir streckat och löses
   upp. Ringen skiftar från ink till gul, filmens enda stora ljus, står över
   frågan och CTA:n och växer till slut ut ur bild tills bara en prick är kvar:
   filmens första bild (540,870), r 3, ink .55.

   Allt är en ren funktion av s (lokal tid) och t (global tid – bara för det som
   ska vara kontinuerligt över scengränsen: andningsfasen och den gula ringens
   andning). Tabeller (plats och fas per agent, de sex) beräknas en gång vid
   laddning. Storyboardets tider är globala: L(g) = g − T.sb.
   ============================================================================ */
(function () {
  'use strict';
  const R = REEL, C = R.C, F = R.F, E = R.E, S = R.S, D = R.DISK, T = R.T.reflektion;
  const TAU = Math.PI * 2;
  const lerp = R.lerp, clamp01 = R.clamp01;
  const smooth = E.smooth, outExpo = E.outExpo, outCubic = E.outCubic;
  const L = g => g - T.sb;                                   // storyboardtid → lokal tid
  const fade = (s, t0, d) => clamp01((s - t0) / d);          // storyboardets fade(t,t0,d)

  /* ------------------------------------------------------------ konstanter */
  const N = D.n, CX = D.cx, CY = D.cy;                       // 1 200 platser kring (540,870)
  const R_DISK = S.R.disk;                                   // 4
  const LUGN = S.LUGN;                                       // ink .70, andas T 4 s, amp .06 (halo 0 sedan 170.0)
  const DEAD_A = S.DOD.alpha;                                // tom ring .50
  const NB = 40;                                             // alfa-buckets (en path per bucket)
  const INK_A = .9;                                          // 1 px ink-linjer (ringen i vila)

  // Övergång in · fältet ligger på .14 sedan scen 6 (fieldDim), hair-cirkeln r 460 på .3 tonar ut 170.0–170.8
  const FIELD = { dim: .14 };
  const CIRC = { r: D.ring, a0: .3, out: L(170.0), outD: .8 };
  // 7.1 · ringen r 160 ritas fram från klockan 12 medurs 170.6–172.2 expoOut
  const RING = { r: 160, t0: L(170.6), d: 1.6 };
  const T1 = { str: 'Ingen bad dem.', y: 1120, size: 64, t0: L(172.4), out: L(175.2), fo: .8 };
  // 7.2 · ögat inne i ringen, mindre, utan pupill: bågar 176.0–176.9 (dash), iris 176.8–177.3;
  //       178.2 klipp till [4,8] och ut 1.4 s smooth (irisringen först, 0.5 s)
  const EYE = { x: CX, y: CY, w: 180, h: 78, iris: 24, upT: L(176.0), loT: L(176.0), arcD: .9, irisT: L(176.8), irisD: .5,
                cut: L(178.2), outD: 1.4, irisOutD: .5, dash: [4, 8] };
  const T2 = { str: 'Fanns inte ens.', y: 1120, size: 56, t0: L(176.8), out: L(180.4), fo: .9 };
  // 7.3 · ringen ink → gul över 1.2 s från 181.0; sedan gul alpha .85 + .15·sin(2π t/3) (global t)
  const GUL = { t0: L(181.0), d: 1.2, base: .85, amp: .15, period: 3 };
  const T3 = { a: 'När de blir smartare.', b: 'När det inte längre är ett prov', q: '?', ya: 1100, yb: 1180, size: 56, sizeB: 56,
               tA: L(182.0), tB: L(182.9), out: L(186.0), fo: .8, maxW: 900, small: 50 };
  // 7.4 · CTA: fråga 72 px + Mono-rad i gult + gul linje som växer från mitten till 420 px bredd
  const T4 = { a: 'Vad tänker du?', b: 'SKRIV I KOMMENTARERNA', ya: 1100, yb: 1210, sizeA: 72, sizeB: 32,
               tA: L(186.6), tB: L(187.4), lineT: L(187.9), lineD: .7, lineY: 1244 + .5, half: 210 };
  // 7.5 · cirkeln öppnar sig: ring 160 → 1500 och ut, CTA + fält bort, en prick tänds (= frame 0)
  const END = { t0: L(189.2), ringD: .8, ringR: 1500, ctaD: .6, fieldD: .6, dot: { r: S.R.falt, a: .55, d: .6 } };

  /* ------------------------------------------------------------ tabeller (en gång) */
  const SX = new Float64Array(N), SY = new Float64Array(N), PHI = new Float64Array(N);
  for (let j = 0; j < N; j++) { const sl = D.slotOf(j); SX[j] = sl.x; SY[j] = sl.y; PHI[j] = R.phase(j); }
  // De sex som tystnade (hair-fyllning) → agent j; hjälten j = 0 ligger på plats 640 som tom ring
  const REDM = new Int8Array(N).fill(-1);
  D.red.forEach((k, m) => { for (let j = 0; j < N; j++) if (D.assign(j) === k) { REDM[j] = m; break; } });
  const REDJ = []; for (let j = 0; j < N; j++) if (REDM[j] >= 0) REDJ.push(j);

  // Per bildruta (återanvänds – inga nya arrayer)
  const AR = new Float64Array(N), ABK = new Int16Array(N);

  // Textmasker: rektanglar (bbox + 40) vars alfa och y sätts per bildruta. Bredder mäts en gång.
  const RECTS = {
    t1: R.textRect(540, T1.y, 0, T1.size, 0),
    t2: R.textRect(540, T2.y, 0, T2.size, 0),
    t3a: R.textRect(540, T3.ya, 0, T3.size, 0),
    t3b: R.textRect(540, T3.yb, 0, T3.size, 0),
    t4a: R.textRect(540, T4.ya, 0, T4.sizeA, 0),
    t4b: R.textRect(540, T4.yb, 0, T4.sizeB, 0),
  };
  const RECT_LIST = [RECTS.t1, RECTS.t2, RECTS.t3a, RECTS.t3b, RECTS.t4a, RECTS.t4b];
  const OPT = {
    t1: { family: F.sans, weight: 400, size: T1.size, spacing: .05, color: C.ink, align: 'center' },
    t2: { family: F.serif, weight: 400, style: 'italic', size: T2.size, spacing: 0, color: C.mist, align: 'center' },
    t3a: { family: F.sans, weight: 500, size: T3.size, spacing: .05, color: C.ink, align: 'left' },
    t3b: { family: F.sans, weight: 500, size: T3.sizeB, spacing: .05, color: C.ink, align: 'left' },
    t3q: { family: F.sans, weight: 500, size: T3.sizeB, spacing: .05, color: C.accent, align: 'left' },
    t4a: { family: F.sans, weight: 500, size: T4.sizeA, spacing: .05, color: C.ink, align: 'center' },
    t4b: { family: F.mono, weight: 500, size: T4.sizeB, spacing: .3, color: C.accent, align: 'center', upper: true },
  };
  const M = { w3a: 0, w3b: 0, w3full: 0, x3: 0 };            // mätta bredder (rad 3b ritas vänsterställt så ? kan bli gult)
  let measured = false;
  function measureOnce(ctx) {
    if (measured) return; measured = true;
    const trail = o => o.spacing * o.size;                   // Chrome lägger spärrning även efter sista tecknet
    const w1 = R.measure(ctx, T1.str, OPT.t1) - trail(OPT.t1);
    const w2 = R.measure(ctx, T2.str, OPT.t2);
    // Rad 2 i frågan: > 900 px ⇒ 50 px (storyboardet)
    let wb = R.measure(ctx, T3.b + T3.q, OPT.t3b) - trail(OPT.t3b);
    if (wb > T3.maxW) {
      T3.sizeB = T3.small; OPT.t3b.size = T3.small; OPT.t3q.size = T3.small;
      wb = R.measure(ctx, T3.b + T3.q, OPT.t3b) - trail(OPT.t3b);
    }
    M.w3a = R.measure(ctx, T3.a, OPT.t3a) - trail(OPT.t3a);
    M.w3b = R.measure(ctx, T3.b, OPT.t3b);                   // inkl. spärrning före ?
    M.w3full = wb; M.x3 = 540 - wb / 2;
    const w4a = R.measure(ctx, T4.a, OPT.t4a) - trail(OPT.t4a);
    const w4b = R.measure(ctx, T4.b, OPT.t4b) - trail(OPT.t4b);
    setRect(RECTS.t1, 540, T1.y, w1, T1.size);
    setRect(RECTS.t2, 540, T2.y, w2, T2.size);
    setRect(RECTS.t3a, 540, T3.ya, M.w3a, T3.size);
    setRect(RECTS.t3b, 540, T3.yb, wb, T3.sizeB);
    setRect(RECTS.t4a, 540, T4.ya, w4a, T4.sizeA);
    setRect(RECTS.t4b, 540, T4.yb, Math.max(w4b, 2 * T4.half), T4.lineY - T4.yb + T4.sizeB);   // täcker även linjen
  }
  function setRect(rc, cx, cy, w, h) {
    const p = S.MASK.pad;
    rc.x = cx - w / 2 - p; rc.y = cy - h / 2 - p; rc.w = w + 2 * p; rc.h = h + 2 * p;
  }

  /* ------------------------------------------------------------ hjälpare */
  /** Ring kring (CX,CY): ritas fram från klockan 12 medurs (p), 1 px, valfri färg/alfa. */
  function ring(ctx, r, p, color, alpha) {
    if (p <= 0 || alpha <= 0) return;
    ctx.save(); ctx.globalAlpha *= clamp01(alpha); ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.arc(CX, CY, r, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, p)); ctx.stroke();
    ctx.restore();
  }

  R.scene({
    id: 'reflektion', name: 'Reflektion', start: T.start, end: T.end, pre: 0, post: .5,
    draw(ctx, s, t) {
      measureOnce(ctx);

      /* ---------- globala kurvor ---------- */
      const endP = smooth(fade(s, END.t0, END.fieldD));                             // 7.5 · fältet .14 → 0
      const dim = FIELD.dim * (1 - endP);
      const breathPh = TAU * t / LUGN.T;                                            // andning T = 4 s, global fas (fortsätter från scen 6)

      /* ---------- text-alfa och masker (före prickpasset) ---------- */
      const a1 = R.textIn(s, T1.t0, T1.out, { fo: T1.fo });                         // 7.1 · Ingen bad dem.
      const a2 = R.textIn(s, T2.t0, T2.out, { fo: T2.fo });                         // 7.2 · Fanns inte ens.
      const a3a = R.textIn(s, T3.tA, T3.out, { fo: T3.fo });                        // 7.3 · När de blir smartare.
      const a3b = R.textIn(s, T3.tB, T3.out, { fo: T3.fo });                        // 7.3 · När det inte längre är ett prov?
      const ctaOut = 1 - smooth(fade(s, END.t0, END.ctaD));                         // 7.5 · CTA + linje ut 0.6 s
      const a4a = R.textIn(s, T4.tA, null);                                         // 7.4 · Vad tänker du?
      const a4b = R.textIn(s, T4.tB, null);                                         // 7.4 · SKRIV I KOMMENTARERNA
      const lineP = outExpo(fade(s, T4.lineT, T4.lineD));                           // 7.4 · gul linje från mitten
      RECTS.t1.a = a1.a;   RECTS.t1.y = T1.y + a1.dy - T1.size / 2 - S.MASK.pad;
      RECTS.t2.a = a2.a;   RECTS.t2.y = T2.y + a2.dy - T2.size / 2 - S.MASK.pad;
      RECTS.t3a.a = a3a.a; RECTS.t3a.y = T3.ya + a3a.dy - T3.size / 2 - S.MASK.pad;
      RECTS.t3b.a = a3b.a; RECTS.t3b.y = T3.yb + a3b.dy - T3.sizeB / 2 - S.MASK.pad;
      RECTS.t4a.a = a4a.a * ctaOut; RECTS.t4a.y = T4.ya + a4a.dy - T4.sizeA / 2 - S.MASK.pad;
      RECTS.t4b.a = a4b.a * ctaOut; RECTS.t4b.y = T4.yb + a4b.dy - T4.sizeB / 2 - S.MASK.pad;

      /* ---------- lager 2: hair-cirkeln r 460 tonar ut (övergång in · 170.0–170.8) ---------- */
      const circA = CIRC.a0 * (1 - smooth(fade(s, CIRC.out, CIRC.outD)));
      if (circA > .002) ring(ctx, CIRC.r, 1, C.hair, circA);

      /* ---------- lager 6: fältet (LUGN på .14, ingen halo, andas T 4 s), batchat per alfa-bucket ---------- */
      if (dim > .001) {
        for (let j = 1; j < N; j++) {
          if (REDM[j] >= 0) continue;
          const m = R.maskFactor(SX[j], SY[j], RECT_LIST);
          AR[j] = R_DISK * (1 + LUGN.amp * Math.sin(breathPh + PHI[j]));
          ABK[j] = Math.round(Math.min(1, LUGN.alpha * dim * m) * NB);
        }
        ctx.save(); ctx.fillStyle = C.ink;
        for (let b = NB; b >= 1; b--) {
          let open = false;
          for (let j = 1; j < N; j++) {
            if (ABK[j] !== b || REDM[j] >= 0) continue;
            if (!open) { ctx.beginPath(); ctx.globalAlpha = b / NB; open = true; }
            ctx.moveTo(SX[j] + AR[j], SY[j]); ctx.arc(SX[j], SY[j], AR[j], 0, TAU);
          }
          if (open) ctx.fill();
        }
        // De sex som tystnade: TYSTNAD = hair-fyllning alpha 1 (× dim), r 4, ingen andning – mörka hål
        ctx.fillStyle = C.hair; ctx.globalAlpha = dim; ctx.beginPath();
        for (let m = 0; m < REDJ.length; m++) { const j = REDJ[m]; ctx.moveTo(SX[j] + R_DISK, SY[j]); ctx.arc(SX[j], SY[j], R_DISK, 0, TAU); }
        ctx.fill();
        ctx.restore();
        // Hjälten (j = 0) på plats 640: DÖD = tom ring, 1 px ink .50 (× dim), r 4
        R.drawAgent(ctx, { x: SX[0], y: SY[0], r: R_DISK, dead: true, deadAlpha: DEAD_A * dim, mask: R.maskFactor(SX[0], SY[0], RECT_LIST) });
      }

      /* ---------- lager 7: ringen (7.1 → 7.3 → 7.5) ---------- */
      const endRing = smooth(fade(s, END.t0, END.ringD));                           // 7.5 · 160 → 1500 och ut
      // (cubicOut i stället för expoOut: med expoOut är ringen utanför skärmens hörn (r ≈ 1100) efter 0.14 s – en popp)
      const ringR = RING.r + (END.ringR - RING.r) * outCubic(fade(s, END.t0, END.ringD));
      const gulP = smooth(fade(s, GUL.t0, GUL.d));                                  // 7.3 · ink → gul 1.2 s
      const gulBreath = GUL.base + GUL.amp * Math.sin(TAU * t / GUL.period);
      // Beat 7.1 · ring r 160, 1 px ink, från klockan 12 medurs 170.6–172.2 (expoOut)
      ring(ctx, ringR, outExpo(fade(s, RING.t0, RING.d)), C.ink, INK_A * (1 - gulP) * (1 - endRing));
      // Beat 7.3 · den gula ringen – filmens enda stora ljus – andas .85 ± .15 (T 3 s); 7.5 · växer ut ur bild och tonar ut
      if (gulP > 0) ring(ctx, ringR, 1, C.accent, gulBreath * gulP * (1 - endRing));

      // Beat 7.2 · ögat inne i ringen: mandel 180×78, iris r 24, utan pupill. Bågar dash 176.0–176.9, iris 176.8–177.3.
      //            178.2: klipp till setLineDash([4,8]) (inget marscherande) och ut 1.4 s smooth, irisringen först (0.5 s)
      if (s >= EYE.upT) {
        const cut = s >= EYE.cut;
        const arcA = INK_A * (1 - smooth(fade(s, EYE.cut, EYE.outD)));
        const irisA = INK_A * (1 - smooth(fade(s, EYE.cut, EYE.irisOutD)));
        if (arcA > .002) R.eye(ctx, EYE.x, EYE.y, EYE.w, EYE.h, {
          upper: outExpo(fade(s, EYE.upT, EYE.arcD)), lower: outExpo(fade(s, EYE.loT, EYE.arcD)),
          iris: 0, pupil: 0, alpha: arcA, dash: cut ? EYE.dash : null,
        });
        if (irisA > .002 && s >= EYE.irisT) R.eye(ctx, EYE.x, EYE.y, EYE.w, EYE.h, {
          upper: 0, lower: 0, iris: outExpo(fade(s, EYE.irisT, EYE.irisD)), irisR: EYE.iris, pupil: 0,
          alpha: irisA, dash: cut ? EYE.dash : null,
        });
      }

      // Beat 7.5 · en prick tänds i mitten (540,870), r 3, ink 0 → .55 189.2–189.8 – filmens första bild
      const dotA = END.dot.a * smooth(fade(s, END.t0, END.dot.d));
      if (dotA > 0) R.drawAgent(ctx, { x: CX, y: CY, r: END.dot.r, alpha: dotA });

      /* ---------- lager 8: text ---------- */
      // Beat 7.1 · Space Grotesk 400, 64 px, .05em, ink, y 1120 – in 172.4 (0.9 s + 16 px), ut 175.2–176.0
      if (a1.a > 0) { OPT.t1.alpha = a1.a; R.text(ctx, T1.str, 540, T1.y + a1.dy, OPT.t1); }
      // Beat 7.2 · Fraunces 400 italic, 56 px, mist, y 1120 – in 176.8, ut 180.4
      if (a2.a > 0) { OPT.t2.alpha = a2.a; R.text(ctx, T2.str, 540, T2.y + a2.dy, OPT.t2); }
      // Beat 7.3 · Space Grotesk 500, 56 px, .05em, ink; rad 1 y 1100 (in 182.0), rad 2 y 1180 (in 182.9) med gult ? – ut 186.0–186.8
      if (a3a.a > 0) { OPT.t3a.alpha = a3a.a; R.text(ctx, T3.a, 540 - M.w3a / 2, T3.ya + a3a.dy, OPT.t3a); }
      if (a3b.a > 0) {
        OPT.t3b.alpha = a3b.a; OPT.t3q.alpha = a3b.a;
        R.text(ctx, T3.b, M.x3, T3.yb + a3b.dy, OPT.t3b);                            // raden utan ?
        R.text(ctx, T3.q, M.x3 + M.w3b, T3.yb + a3b.dy, OPT.t3q);                    // ? i gult direkt efter
      }
      // Beat 7.4 · CTA: Space Grotesk 500 72 px ink y 1100 (in 186.6); Mono 500 32 px gul .30em y 1210 (in 187.4);
      //            gul 1 px linje y 1244 från mitten till ±210 (187.9–188.6 expoOut). 7.5 · allt ut 0.6 s från 189.2
      const c4a = a4a.a * ctaOut, c4b = a4b.a * ctaOut;
      if (c4a > 0) { OPT.t4a.alpha = c4a; R.text(ctx, T4.a, 540, T4.ya + a4a.dy, OPT.t4a); }
      if (c4b > 0) { OPT.t4b.alpha = c4b; R.text(ctx, T4.b, 540, T4.yb + a4b.dy, OPT.t4b); }
      if (lineP > 0 && ctaOut > 0) R.line(ctx, 540 - T4.half * lineP, T4.lineY, 540 + T4.half * lineP, T4.lineY, { color: C.accent, width: 1, alpha: ctaOut, cap: 'butt' });
    },
  });
})();
