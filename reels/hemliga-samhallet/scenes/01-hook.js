/* ============================================================================
   Scen 1 – Hook (0–7 s). Tider: REEL.T.hook. Se STORYBOARD.md, "Scen 1 · HOOK".

   Ur en enda prick sprider sig en tändningsvåg utåt tills skärmen är ett tyst
   rutnät av inlåsta prickar; meningen skrivs fram över dem; sedan expanderar
   hela fältet kring den enda som blir kvar – ett dyk utan kamera.

   Allt är en ren funktion av s (lokal tid). Tändtider och maskvärden ligger i
   typed arrays som beräknas en gång vid laddning. Prickar och boxar ritas i
   alfa-buckets (en path per bucket) så att 1 395 agenter klarar 30 fps live.
   ============================================================================ */
(function () {
  'use strict';
  const R = REEL, C = R.C, E = R.E, S = R.S, T = R.T.hook;
  const DUR = T.end - T.start;
  const L = g => g - T.sb;                       // storyboardtid → lokal tid
  const TAU = Math.PI * 2;

  /* ------------------------------------------------------------ konstanter */
  // Fältet: 31 × 45 celler à 32 px, cellcentrum x = 60 + 32c, y = 166 + 32r.
  const COLS = 31, ROWS = 45, CELL = 32, X0 = 60, Y0 = 166;
  const N = COLS * ROWS;                         // 1 395 prickar
  const HERO = { col: 15, row: 22, x: 540, y: 870 };
  const HERO_GID = HERO.row * COLS + HERO.col;   // 697 → agentindex 0
  const D_MAX = 852;                             // avstånd hjälte → hörn
  const R_FALT = S.R.falt, R_HJALTE = S.R.hjalte;              // 3 / 7
  const RING = S.HJALTE.ring, RING_A = S.HJALTE.ringAlpha;      // 13 / .35
  // Storyboard scen 1: box 22 px i 32-cell (22·2.09 = 46 → exakt scen 2:s första bild).
  // OBS: den allmänna regeln "cell − 14" (S.BOX.inset) ger 18 här – scenens egna siffror (22/46/2.09) gäller.
  const SIDE = 22;
  const A_SEED = .55;                            // hjältens alfa i loopfröet (= filmens sista frame)
  const A_ISO = S.ISOLERAD.alpha;                // .70 – isolerade prickar
  const A_BOX = S.BOX.alpha;                     // .85 – boxar
  const NB = 40;                                 // alfa-buckets (0.70·40 och 0.85·40 är heltal → exakta vilovärden)

  // Beat 1.2 · tändningsvågen: t_i = 0.3 + 2.2·(d_i/852)^0.8 + 0.15·hash(i,1)
  const WAVE = { t0: L(0.3), spread: 2.2, pow: .8, jitter: .15, dotFade: .3, boxDelay: .25, boxFade: .4 };
  const HERO_BOX_T = L(0.55);                    // hjältens box tänds här (0.4 s smooth)

  // Beat 1.3 · meningen
  const TXT = {
    line1: 'De skulle aldrig få', line2: 'prata med varandra.',
    y1: 700, y2: 784, size: 68,
    t1: L(1.2), t2: L(2.0), cursorUntil: L(5.2), out0: L(5.8), out1: L(6.5),
  };
  // Textmask R = (72,640)–(1008,840) = textblocket (540,740, 856×120) + 40 px; 60 px mjuk kant.
  const MASK = { t0: L(1.0), dur: .6, rect: R.textRect(540, 740, 856, 120, 1) };
  const MASK_RECTS = [MASK.rect];                // R i skärmkoordinater – skalas INTE med dyket
  const OPT1 = { size: TXT.size, cursorUntil: TXT.t2, alpha: 1 };           // rad 1: markören lämnar över vid 2.0
  const OPT2 = { size: TXT.size, cursorUntil: TXT.cursorUntil, alpha: 1 };  // rad 2: markören blinkar till 5.2

  // Beat 1.4 · dyket: s = 1 + 1.09·expoOut(fade(t, 6.0, 1.2)); fältet tonar bort 5.9–6.8.
  const DIVE = { fadeT0: L(5.9), fadeDur: .9, t0: L(6.0), dur: 1.2, grow: 1.09 };
  // expoOut når aldrig exakt 1 inom 1.2 s – normalisera så att u = 1 precis vid scenens slut
  // (box 46, r 7, ring 13 – bilden scen 2 väntar sig). Skillnaden mot rå expoOut är 0.3 %.
  const U_END = E.outExpo(R.clamp01((DUR - DIVE.t0) / DIVE.dur)) || 1;
  const CULL = { x0: -100, x1: 1180, y0: -100, y1: 2020 };

  /* ------------------------------------------------------------ tabeller (init) */
  const X = new Float32Array(N), Y = new Float32Array(N);   // cellcentrum
  const TI = new Float32Array(N);                           // tändtid per prick (lokal)
  const MV = new Float32Array(N);                           // maskens råvärde 0..1 (före styrka/alfa)
  let heroIdx = -1;
  for (let gid = 0; gid < N; gid++) {
    const col = gid % COLS, row = (gid - col) / COLS;
    const x = X0 + CELL * col, y = Y0 + CELL * row;
    // agentindex: hjälten = 0, övriga i läsordning (samma princip som REEL.GRID.agent)
    const i = gid === HERO_GID ? 0 : (gid < HERO_GID ? gid + 1 : gid);
    if (i === 0) heroIdx = gid;
    X[gid] = x; Y[gid] = y;
    const d = Math.hypot(x - HERO.x, y - HERO.y);
    TI[gid] = WAVE.t0 + WAVE.spread * Math.pow(d / D_MAX, WAVE.pow) + WAVE.jitter * R.hash(i, 1);
    // maskFactor = 1 − .75·a·v  ⇒  v = (1 − maskFactor(a=1)) / .75
    MV[gid] = (1 - R.maskFactor(x, y, [MASK.rect])) / S.MASK.strength;
  }

  // Arbetsminne per bildruta (inga allokeringar i draw)
  const PX = new Float32Array(N), PY = new Float32Array(N);
  const BK_DOT = new Uint8Array(N), BK_BOX = new Uint8Array(N);
  const CNT_DOT = new Int32Array(NB + 2), CNT_BOX = new Int32Array(NB + 2);
  const ORD_DOT = new Uint16Array(N), ORD_BOX = new Uint16Array(N);

  /** Räknesortering: bucket k ligger i ord[cnt[k+1] … cnt[k+2]). */
  function bucketSort(bk, cnt, ord) {
    cnt.fill(0);
    for (let i = 0; i < N; i++) cnt[bk[i] + 1]++;
    for (let k = 1; k < NB + 2; k++) cnt[k] += cnt[k - 1];
    for (let i = N - 1; i >= 0; i--) ord[--cnt[bk[i] + 1]] = i;
  }

  R.scene({
    id: 'hook', name: 'Hook', start: T.start, end: T.end, pre: 0, post: 0,
    draw(ctx, s, t) {
      /* ---- Beat 1.4 · dykets parametrar (0 före 6.0) ---- */
      const u = E.outExpo(R.seg(s, DIVE.t0, DIVE.t0 + DIVE.dur)) / U_END;
      const sc = 1 + DIVE.grow * u;
      const fieldA = 1 - E.smooth(R.seg(s, DIVE.fadeT0, DIVE.fadeT0 + DIVE.fadeDur));

      /* ---- Beat 1.3 · textens och maskens alfa ---- */
      const aText = 1 - E.smooth(R.seg(s, TXT.out0, TXT.out1));
      const aMask = E.smooth(R.seg(s, MASK.t0, MASK.t0 + MASK.dur)) * aText;
      const maskK = S.MASK.strength * aMask;

      /* ---- Beat 1.2 · tändningsvågen: alfa per prick/box → buckets ---- */
      const side = Math.round(SIDE * sc);          // heltal ⇒ skarpa 1 px-kanter även under dyket
      const hs = side / 2;
      // Under dyket (6.0–6.5) syns texten ännu medan fältet expanderar: masken måste då räknas på de
      // skalade positionerna så att bandet sitter fast kring R på skärmen i stället för att följa prickarna ut.
      const maskLive = u > 0 && maskK > 0;
      if (fieldA > 0) {
        for (let g = 0; g < N; g++) {
          if (g === heroIdx) { BK_DOT[g] = 0; BK_BOX[g] = 0; continue; }
          const px = HERO.x + (X[g] - HERO.x) * sc, py = HERO.y + (Y[g] - HERO.y) * sc;
          PX[g] = px; PY[g] = py;
          if (px < CULL.x0 || px > CULL.x1 || py < CULL.y0 || py > CULL.y1) { BK_DOT[g] = 0; BK_BOX[g] = 0; continue; }
          const ti = TI[g];
          const mv = maskLive ? (1 - R.maskFactor(px, py, MASK_RECTS)) / S.MASK.strength : MV[g];
          const m = (1 - maskK * mv) * fieldA;
          const a = A_ISO * E.smooth(R.seg(s, ti, ti + WAVE.dotFade)) * m;
          const b = A_BOX * E.smooth(R.seg(s, ti + WAVE.boxDelay, ti + WAVE.boxDelay + WAVE.boxFade)) * m;
          BK_DOT[g] = Math.round(a * NB);
          BK_BOX[g] = Math.round(b * NB);
        }
        bucketSort(BK_DOT, CNT_DOT, ORD_DOT);
        bucketSort(BK_BOX, CNT_BOX, ORD_BOX);
      }

      ctx.save();
      ctx.lineWidth = 1; ctx.strokeStyle = C.hair; ctx.fillStyle = C.ink;

      /* ---- lager 4 · boxar (1 px hair, en path per alfa-bucket) ---- */
      if (fieldA > 0) {
        for (let k = 1; k <= NB; k++) {
          const st = CNT_BOX[k + 1], en = CNT_BOX[k + 2];
          if (st === en) continue;
          ctx.globalAlpha = k / NB;
          ctx.beginPath();
          for (let q = st; q < en; q++) {
            const g = ORD_BOX[q];
            ctx.rect(Math.round(PX[g] - hs) + .5, Math.round(PY[g] - hs) + .5, side, side);
          }
          ctx.stroke();
        }
      }
      // Hjältens box: tänds 0.55 (0.4 s smooth), växer 22 → 46 px med dyket. Ingen mask – hjälten är ljuset.
      const heroBoxA = A_BOX * E.smooth(R.seg(s, HERO_BOX_T, HERO_BOX_T + WAVE.boxFade));
      if (heroBoxA > 0) R.agentBox(ctx, HERO.x, HERO.y, side, heroBoxA);

      /* ---- lager 6 · prickfyllningar (r 3, ink, ISOLERAD – ingen halo, ingen andning) ---- */
      if (fieldA > 0) {
        const r = R_FALT;
        for (let k = 1; k <= NB; k++) {
          const st = CNT_DOT[k + 1], en = CNT_DOT[k + 2];
          if (st === en) continue;
          ctx.globalAlpha = k / NB;
          ctx.beginPath();
          for (let q = st; q < en; q++) {
            const g = ORD_DOT[q], x = PX[g], y = PY[g];
            ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU);
          }
          ctx.fill();
        }
      }
      ctx.restore();

      /* ---- Beat 1.1/1.4 · hjälten: loopfröet (r 3, ink .55) → HJÄLTE (r 7, .70, ring 13) ---- */
      R.drawAgent(ctx, {
        x: HERO.x, y: HERO.y,
        r: R.lerp(R_FALT, R_HJALTE, u),
        alpha: R.lerp(A_SEED, A_ISO, u),
        ring: u > 0 ? RING : 0, ringAlpha: RING_A * u,
      });

      /* ---- lager 8 · Beat 1.3 · meningen (skrivmaskin 28 tecken/s, markör 3×68) ---- */
      if (aText > 0 && s >= TXT.t1) {
        OPT1.alpha = aText; OPT2.alpha = aText;
        R.typeLine(ctx, TXT.line1, 540, TXT.y1, s, TXT.t1, OPT1);
        R.typeLine(ctx, TXT.line2, 540, TXT.y2, s, TXT.t2, OPT2);
      }
    },
  });
})();
