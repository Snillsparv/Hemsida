/* ============================================================================
   Scen 6 – Tystnaden (150–170 s). Tider: REEL.T.tystnaden. Se STORYBOARD.md.

   Tolvhundra stilla prickar i en solrosdisk andas i takt. En hair-cirkel
   sluter sig runt dem. Sex prickar blir röda, en i taget, pulserar långsamt
   och slocknar till mörka hål medan siffran 6 byts mot ordet INGEN. Sedan
   sjunker allt till .14 – fältet som scen 7 tar över.

   Allt är en ren funktion av s (lokal tid) och t (global tid – används bara
   för det som ska vara kontinuerligt över scengränser: andningsfas, de 383
   nya prickarnas tändning från scen 5 och fieldDim som scen 7 läser).
   Tabeller (plats per agent, fas, tändtider, de sex) beräknas en gång vid
   laddning, seedat. Storyboardets tider är globala: L(g) = g − T.sb.
   ============================================================================ */
(function () {
  'use strict';
  const R = REEL, C = R.C, F = R.F, E = R.E, S = R.S, D = R.DISK, T = R.T.tystnaden;
  const TAU = Math.PI * 2;
  const lerp = R.lerp, clamp01 = R.clamp01;
  const smooth = E.smooth, outCubic = E.outCubic;
  const L = g => g - T.sb;                                   // storyboardtid → lokal tid
  const fade = (s, t0, d) => clamp01((s - t0) / d);          // storyboardets fade(t,t0,d)

  /* ------------------------------------------------------------ konstanter */
  const N = D.n, CX = D.cx, CY = D.cy;                       // 1 200 platser kring (540,870)
  const R_DISK = S.R.disk;                                   // 4
  const LUGN = S.LUGN;                                       // ink .70, halo .12 (3.5r), andas T 4 s, amp .06
  const ROD = S.ROD;                                         // röd halo .20 (3r), r×1.3, period 1.25 s
  const DEAD_A = S.DOD.alpha, HAIR_A = S.HAIR.alpha;         // tom ring .50 · 1 px hair .85
  const NB = 40;                                             // alfa-buckets (en path per bucket)

  // Övergång in · de 383 nya (j ≥ 817) tänds 149.6–150.8 (0.4 s var, seedat spridda) – GLOBALA tider, delade med scen 5
  const NEW0 = 817;
  const ARRIVE = { t0: 149.6, spread: .8, d: .4, seed: 13 };
  // 6.1 · hair-cirkeln r 460 sluter sig från klockan 12 (cubicOut 1.2 s), → .3 i övergången ut
  const RING = { r: D.ring, t0: L(151.0), d: 1.2, endA: .3, segs: 72 };
  // 6.1 · etiketten överst
  const LABEL = { str: R.fmt(1200) + ' AGENTER', y: 330, size: 34, t0: L(151.2), out: L(168.5), rise: 12 };
  // 6.2 · de sex: ink→röd 0.6 s vid 154.5 + 0.55·m, puls 0.8 Hz med fas ψ = 0.7·m; fryser 162.4; röd→hair 162.6–164.1
  const RED = { t0: L(154.5), step: .55, d: .6, r: R_DISK * ROD.rScale, period: ROD.period, psi: .7, freeze: L(162.4), outT: L(162.6), outD: 1.5 };
  // 6.2–6.3 · räknaren under disken (inget landningsstreck) och ordet som ersätter siffran
  const CNT = { x: 540, y: 1420, size: 96, t0: L(158.0), label: 'ÖVERVÄGDE ATT VARNA', swapT: L(163.4), swapD: .9 };
  const INGEN = { str: 'INGEN.', size: 80, spacing: .05, out: L(168.5) };
  // 6.4 · fältet sjunker till .14 – GLOBAL tid, scen 7 läser R.fieldDim(t)
  const DIM = { t0: 168.5, d: 1.5, to: .14 };
  R.fieldDim = t => lerp(1, DIM.to, smooth(clamp01((t - DIM.t0) / DIM.d)));

  /* ------------------------------------------------------------ tabeller (en gång) */
  const SX = new Float64Array(N), SY = new Float64Array(N), PHI = new Float64Array(N), ARR = new Float64Array(N);
  for (let j = 0; j < N; j++) {
    const sl = D.slotOf(j);
    SX[j] = sl.x; SY[j] = sl.y; PHI[j] = R.phase(j);
    ARR[j] = j >= NEW0 ? ARRIVE.t0 + ARRIVE.spread * R.hash(j, ARRIVE.seed) : -Infinity;
  }
  // De sex röda platserna k → agent j (och omvänt); hjälten j = 0 ligger på plats 640 som tom ring
  const REDJ = D.red.map(k => { for (let j = 0; j < N; j++) if (D.assign(j) === k) return j; return -1; });
  const REDM = new Int8Array(N).fill(-1);
  REDJ.forEach((j, m) => { REDM[j] = m; });

  // Per bildruta (återanvänds – inga nya arrayer)
  const AR = new Float64Array(N), AF = new Float64Array(N), AH = new Float64Array(N);
  const ABK = new Int16Array(N);

  // Textmasker: rektanglar (bbox + 40) vars alfa och y sätts per bildruta. Bredder mäts en gång (konstanter).
  const RECTS = {
    top: R.textRect(540, LABEL.y, 0, LABEL.size, 0),
    lab: R.textRect(540, CNT.y - 70, 0, 32, 0),
    num: R.textRect(540, CNT.y, 0, CNT.size, 0),
  };
  const RECT_LIST = [RECTS.top, RECTS.lab, RECTS.num];
  let measured = false;
  function measureOnce(ctx) {
    if (measured) return; measured = true;
    const wTop = R.measure(ctx, LABEL.str, { family: F.mono, size: LABEL.size, spacing: .3, upper: true }) - LABEL.size * .3;
    const wLab = R.measure(ctx, CNT.label, { family: F.mono, size: 32, spacing: .3, upper: true }) - 32 * .3;
    const wIngen = R.measure(ctx, INGEN.str, { family: F.sans, weight: 500, size: INGEN.size, spacing: INGEN.spacing }) - INGEN.size * INGEN.spacing;
    const wNum = Math.max(.6 * CNT.size, wIngen);
    setRect(RECTS.top, 540, LABEL.y, wTop, LABEL.size);
    setRect(RECTS.lab, 540, CNT.y - 70, wLab, 32);
    setRect(RECTS.num, 540, CNT.y, wNum, CNT.size);
  }
  function setRect(rc, cx, cy, w, h) {
    const p = S.MASK.pad;
    rc.x = cx - w / 2 - p; rc.y = cy - h / 2 - p; rc.w = w + 2 * p; rc.h = h + 2 * p;
  }

  /* ------------------------------------------------------------ hjälpare */
  // Den delade ink-halospriten, kopierad pixel-exakt en gång (R.halo ritad 64→64 px) så att 1 200 halos
  // kan ritas med ren drawImage utan save/restore per prick. Samma sprite som i alla andra scener.
  let inkSprite = null;
  function haloSprite() {
    if (inkSprite) return inkSprite;
    const c = document.createElement('canvas'); c.width = c.height = 64;
    R.halo(c.getContext('2d'), 32, 32, 32 / LUGN.haloR, { alpha: 1, scale: LUGN.haloR, color: 'ink' });
    return (inkSprite = c);
  }
  /** Hair-cirkeln ritad fram från klockan 12, i segment så textmasken kan multipliceras in (batchat per alfa). */
  function ringMasked(ctx, p, alpha, rects) {
    if (p <= 0 || alpha <= 0) return;
    const n = RING.segs, total = p * n, base = ctx.globalAlpha;
    ctx.save(); ctx.strokeStyle = C.hair; ctx.lineWidth = 1; ctx.lineCap = 'butt';
    let cur = -1, open = false;
    for (let i = 0; i < n && i < total; i++) {
      const f = Math.min(1, total - i);
      const a0 = -Math.PI / 2 + TAU * i / n, a1 = a0 + TAU * f / n, am = (a0 + a1) / 2;
      const a = Math.round(alpha * R.maskFactor(CX + RING.r * Math.cos(am), CY + RING.r * Math.sin(am), rects) * NB) / NB;
      if (a !== cur) {
        if (open) ctx.stroke();
        ctx.beginPath(); ctx.globalAlpha = base * a; cur = a; open = a > 0;
      }
      if (open) ctx.arc(CX, CY, RING.r, a0, a1);
    }
    if (open) ctx.stroke();
    ctx.restore();
  }

  R.scene({
    id: 'tystnaden', name: 'Tystnaden', start: T.start, end: T.end, pre: 0, post: 0,
    draw(ctx, s, t) {
      measureOnce(ctx);

      /* ---------- globala kurvor ---------- */
      const dimP = smooth(fade(t, DIM.t0, DIM.d));                  // 6.4 · 168.5–170.0
      const dim = lerp(1, DIM.to, dimP);
      const haloA = LUGN.halo * (1 - dimP);
      const breathPh = TAU * t / LUGN.T;                             // andning T = 4 s, global fas

      /* ---------- text-alfa och masker (före prickpasset) ---------- */
      const top = R.textIn(s, LABEL.t0, LABEL.out, { rise: LABEL.rise });          // 6.1 · 1 200 AGENTER
      const cnt = R.textIn(s, CNT.t0, null);                                        // 6.2 · räknarblocket stiger 16 px
      const swap = smooth(fade(s, CNT.swapT, CNT.swapD));                           // 6.3 · 6 → INGEN., etiketten ut
      const sixA = cnt.a * (1 - swap);
      const ingenA = swap * (1 - smooth(fade(s, INGEN.out, S.TEXT.fo)));            // 6.4 · INGEN. ut 168.5–169.4
      RECTS.top.a = top.a; RECTS.top.y = LABEL.y + top.dy - LABEL.size / 2 - S.MASK.pad;
      RECTS.lab.a = sixA; RECTS.lab.y = CNT.y - 70 + cnt.dy - 16 - S.MASK.pad;
      RECTS.num.a = Math.max(sixA, ingenA); RECTS.num.y = CNT.y + cnt.dy - CNT.size / 2 - S.MASK.pad;

      /* ---------- prickarnas tillstånd (LUGN) ---------- */
      for (let j = 1; j < N; j++) {
        if (REDM[j] >= 0) continue;                                                 // de sex ritas sist
        const arr = ARR[j] > -Infinity ? smooth(fade(t, ARR[j], ARRIVE.d)) : 1;     // övergång in: de 383 nya tänds
        const m = R.maskFactor(SX[j], SY[j], RECT_LIST);
        AR[j] = R_DISK * (1 + LUGN.amp * Math.sin(breathPh + PHI[j]));
        AF[j] = LUGN.alpha * dim * arr * m;
        AH[j] = haloA * arr * m;
        ABK[j] = Math.round(Math.min(1, AF[j]) * NB);
      }

      /* ---------- lager 2: hair-cirkeln (6.1 · 151.0–152.2, → .3 i övergången ut) ---------- */
      ringMasked(ctx, outCubic(fade(s, RING.t0, RING.d)), lerp(HAIR_A, RING.endA, dimP), RECT_LIST);

      /* ---------- lager 5: halo-sprites (ink .12, radie 3.5r) ---------- */
      if (haloA > 0) {
        const spr = haloSprite();
        ctx.save();
        for (let j = 1; j < N; j++) {
          if (REDM[j] >= 0 || AH[j] <= .002) continue;
          const w = 2 * LUGN.haloR * AR[j];
          ctx.globalAlpha = AH[j];
          ctx.drawImage(spr, SX[j] - w / 2, SY[j] - w / 2, w, w);
        }
        ctx.restore();
      }

      /* ---------- lager 6: prickfyllningar (batchade per alfa-bucket) och den tomma ringen ---------- */
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
      ctx.restore();
      // Hjälten (j = 0) på plats 640: DÖD = tom ring, 1 px ink .50, r 4 – ingen andning
      R.drawAgent(ctx, { x: SX[0], y: SY[0], r: R_DISK, dead: true, deadAlpha: DEAD_A * dim, mask: R.maskFactor(SX[0], SY[0], RECT_LIST) });

      /* ---------- de sex, sist så halon ligger överst (6.2–6.3) ---------- */
      for (let m = 0; m < 6; m++) {
        const j = REDJ[m], x = SX[j], y = SY[j];
        const arr = ARR[j] > -Infinity ? smooth(fade(t, ARR[j], ARRIVE.d)) : 1;
        const mk = arr * dim;                                                       // ingen textmask: de sex är motivet (plats 1150 ligger under räknaren)
        const t0 = RED.t0 + RED.step * m;
        const p = smooth(fade(s, t0, RED.d));                                       // ink → röd
        const q = smooth(fade(s, RED.outT, RED.outD));                              // röd → hair (TYSTNAD)
        const tt = Math.min(s, RED.freeze);                                         // pulsen fryser vid 162.4
        const pulse = .35 + .65 * (.5 + .5 * Math.sin(TAU * (tt - t0) / RED.period + RED.psi * m));
        const rInk = R_DISK * (1 + LUGN.amp * Math.sin(breathPh + PHI[j]));
        const r = lerp(lerp(rInk, RED.r, p), R_DISK, q);
        const aInk = LUGN.alpha * (1 - p) * mk, hInk = haloA * (1 - p) * mk;
        const aRed = p * pulse * (1 - q) * mk, hRed = ROD.halo * pulse * p * (1 - q) * mk;
        const aHair = q * mk;
        if (hInk > .002) R.halo(ctx, x, y, r, { alpha: hInk, scale: LUGN.haloR });
        if (hRed > .002) R.halo(ctx, x, y, r, { alpha: hRed, scale: ROD.haloR, color: 'red' });
        ctx.save();
        if (aInk > .002) { ctx.globalAlpha = aInk; ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
        if (aRed > .002) { ctx.globalAlpha = aRed; ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
        if (aHair > .002) { ctx.globalAlpha = aHair; ctx.fillStyle = C.hair; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
        ctx.restore();
      }

      /* ---------- lager 8: text ---------- */
      // Beat 6.1 · etiketten överst: Mono 34 mist .30em, in 151.2 (0.9 s + 12 px), ut 168.5
      if (top.a > 0) R.label(ctx, LABEL.str, 540, LABEL.y + top.dy, { size: LABEL.size, alpha: top.a });
      // Beat 6.2 · räknaren: etikett y 1350, tal 96 px y 1420, inget landningsstreck; in 158.0 (0.9 s + 16 px)
      if (sixA > 0) R.counter(ctx, CNT.x, CNT.y + cnt.dy, 6, CNT.label, 0, { size: CNT.size, alpha: sixA });
      // Beat 6.3 · INGEN. korsfadas in på samma mittlinje 163.4–164.3, ut 168.5–169.4
      if (ingenA > 0) R.text(ctx, INGEN.str, CNT.x, CNT.y, { family: F.sans, weight: 500, size: INGEN.size, spacing: INGEN.spacing, color: C.ink, align: 'center', alpha: ingenA });
    },
  });
})();
