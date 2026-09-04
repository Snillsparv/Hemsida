/* ============================================================================
   Scen 2 – Vad som testades (7–35 s). Tider: REEL.T.testet. Se STORYBOARD.md.

   Från en ensam box växer 117 identiska boxar ut i ringar; en väggvåg rullar
   ut från hjälten; sedan faller en hårlinje från varje box ned till en enda
   punkt – förrådet – och små paket vandrar dit.

   Allt är en ren funktion av s (lokal tid) – tabellerna nedan beräknas en gång.
   Storyboardets tider är globala: L(g) = g − T.sb ger lokal tid.
   ============================================================================ */
(function () {
  const R = REEL, C = R.C, E = R.E, S = R.S, G = R.GRID, T = R.T.testet;
  const TAU = Math.PI * 2, hash = R.hash, lerp = R.lerp, clamp01 = R.clamp01;
  const smooth = E.smooth, outExpo = E.outExpo, outCubic = E.outCubic;
  const L = g => g - T.sb;                                   // storyboardtid → lokal tid
  const fade = (s, t0, d) => clamp01((s - t0) / d);          // storyboardets fade(t,t0,d)

  /* ------------------------------------------------------------ konstanter */
  const HERO = { x: 540, y: 870 };                           // hjälten före glidet (26.0 → y 700)
  const HERO_R = S.R.hjalte, GRID_R = S.R.rutnat, SIDE = G.side;
  const INK_A = .9;                                          // 1 px ink-linjer (ikoner, glob, hylla-ikoner)
  const HAIR_A = S.HAIR.alpha;                               // .85
  const SLIDE = -170;                                        // rutnätets glid (mitt y 870 → 700)
  const ICON_R = 300, ICON_R0 = 324;                         // ikonernas cirkel kring hjälten
  const ICONS = [                                            // beat 2.2 – tre verktyg (viloposition + vinkel)
    { kind: 'terminal', x: 540, y: 570, ang: -90 },
    { kind: 'browser', x: 800, y: 1020, ang: 30 },
    { kind: 'stack', x: 280, y: 1020, ang: 150 },
  ];
  const GLOB = { x: 540, y: 1290, r: 44, rx: 15 };           // beat 2.3 – globen
  const SHELF = { x: 540, y: 1300, half: 360, mid: 6 };      // beat 2.6 – hyllan
  const SHELF_ICON_X = [470, 540, 610];                      // paketikoner på hyllan (y 1272–1291)
  const SHELF_LABEL_Y = 1244;                                // storyboard 1250 – 6 px upp för luft mot ikonerna
  // Beat 2.5 – väggvågen: R(t) = 530·cubicOut(fade(t,21.0,3.0)); glöd 40 px före fronten
  // och en 90 px mjuk svans bakom, så väggarna släcks bakåt i stället för att blinka till.
  const WAVE = { r: 530, dur: 3.0, lead: 40, tail: 90 };
  // Beat 2.3/2.4 – glob + OFFLINE ligger kvar till 17.2 och tonar ut 17.2–18.1 (≥ 2.5 s läsbart).
  // Ring 6 – den enda som når globens y 1246–1334 – tänds först 18.3, så inget överlappar.
  const OFFLINE_OUT = L(17.2);
  const N_PACK = 15;                                         // beat 2.7 – paket
  const DIM_ALL = .82, DIM_SHELF = .60;                      // övergång ut: → .18 resp. .40

  /* ------------------------------------------------------------ tabeller */
  // Cellerna: position (utan glid), ring k (Chebyshev), riktning från mitten, avstånd.
  const CELLS = [];
  for (let i = 0; i < G.n; i++) {
    const c = G.cellOf(i), p = G.pos(c.col, c.row, 0);
    const dx = p.x - HERO.x, dy = p.y - HERO.y, d = Math.hypot(dx, dy);
    CELLS.push({ i, x: p.x, y: p.y, k: G.ring(c.col, c.row), ux: d ? dx / d : 0, uy: d ? dy / d : 0, d });
  }
  const RINGS = [];                                          // cellindex per ring 0…6
  for (let k = 0; k <= 6; k++) RINGS.push(CELLS.filter(c => c.k === k).map(c => c.i));
  const RING_T = k => L(16.2 + .35 * k);                     // ring k tänds

  // Solfjädern: starttid per linje (seed 4).
  const FAN_T = CELLS.map(c => L(28.2 + 1.1 * hash(c.i, 4)));
  const FAN_D = .8;

  // Solfjäderns nedre del ritas i y-band (15 px) med två dämpningar som båda är
  // funktioner av y (linjerna löper alla genom x ≈ 540 där):
  //  · textmasken för etiketten ARTIFACTORY (mjuk kant från 1128, hård zon från 1188),
  //  · navtoningen: alfa faller smooth från 1 vid y 960 till .3 vid hyllan, så att
  //    konvergenskilen ovanför etiketten inte blir bildens ljusaste yta. Den släpps
  //    under övergången ut (34.0–34.9) så att sista bildrutan är identisk med scen 3:s första.
  //  Banden ligger på 1128 − 15k / 1128 + 15k; angränsande band med samma alfa ritas som
  //  en sammanhängande linje (ingen söm) – när navtoningen är släppt är det exakt scen 3:s indelning.
  const MASK_Y0 = SHELF_LABEL_Y - 16 - S.MASK.pad - S.MASK.edge; // 1128: där den mjuka kanten börjar
  const HUB_Y0 = 960, HUB_MIN = .3;
  const BAND_Y0 = MASK_Y0 - 15 * Math.ceil((MASK_Y0 - HUB_Y0) / 15); // 948
  const BANDS = [[-1e9, BAND_Y0]];
  for (let y = BAND_Y0; y < SHELF.y; y += 15) BANDS.push([y, Math.min(y + 15, SHELF.y + 1)]);
  const hubFade = y => lerp(1, HUB_MIN, smooth(clamp01((y - HUB_Y0) / (SHELF.y - HUB_Y0))));

  // Paketen: start, vilken linje (bara linjer som hunnit ritas klart, aldrig hjältens),
  // och var på hyllan de läggs (från mitten utåt, växelvis höger/vänster).
  const PACKS = [];
  {
    const used = new Set();
    for (let m = 0; m < N_PACK; m++) {
      const t0 = L(29.2 + .28 * m);
      let elig = CELLS.filter(c => c.i !== 0 && FAN_T[c.i] + FAN_D <= t0 - .05 && !used.has(c.i));
      if (!elig.length) elig = CELLS.filter(c => c.i !== 0 && FAN_T[c.i] + FAN_D <= t0 - .05);
      const c = elig[Math.floor(hash(m, 5) * elig.length)];
      used.add(c.i);
      let k = Math.floor(m / 2) + 1; if (k >= 3) k++;          // plats 3 ligger rakt under en ikon – hoppa över
      const sign = m % 2 ? -1 : 1, x = SHELF.x + sign * 22 * k;
      PACKS.push({ m, t0, i: c.i, x });
    }
  }

  /* ------------------------------------------------------------ ikoner (1 px ink, 96×72) */
  // Alla ritas med dash-tekniken; ramen först, detaljerna (pDet) strax efter.
  function drawIcon(ctx, kind, cx, cy, pRect, pDet, alpha) {
    if (alpha <= 0 || pRect <= 0) return;
    ctx.save(); ctx.globalAlpha *= clamp01(alpha);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
    if (kind === 'stack') {                                   // tre staplade rekt 72×14, 6 px mellanrum
      const xs = Math.round(cx - 36) + .5;
      for (let j = 0; j < 3; j++) {
        const p = j === 0 ? pRect : pDet[j - 1], ys = Math.round(cy - 27 + 20 * j) + .5;
        R.strokeDash(ctx, 172, p, () => { ctx.beginPath(); ctx.rect(xs, ys, 72, 14); ctx.stroke(); });
      }
    } else {
      const x0 = Math.round(cx - 48) + .5, y0 = Math.round(cy - 36) + .5;
      R.strokeDash(ctx, 336, pRect, () => { ctx.beginPath(); ctx.rect(x0, y0, 96, 72); ctx.stroke(); });
      if (kind === 'terminal') {                              // > och _
        R.strokeDash(ctx, 28.3, pDet, () => { ctx.beginPath(); ctx.moveTo(x0 + 18, y0 + 24); ctx.lineTo(x0 + 28, y0 + 34); ctx.lineTo(x0 + 18, y0 + 44); ctx.stroke(); });
        R.strokeDash(ctx, 18, pDet, () => { ctx.beginPath(); ctx.moveTo(x0 + 36, y0 + 48); ctx.lineTo(x0 + 54, y0 + 48); ctx.stroke(); });
      } else {                                                // list 16 px från toppen + cirkel r 5 till vänster i listen
        R.strokeDash(ctx, 96, pDet, () => { ctx.beginPath(); ctx.moveTo(x0, y0 + 16); ctx.lineTo(x0 + 96, y0 + 16); ctx.stroke(); });
        R.strokeDash(ctx, TAU * 5, pDet, () => { ctx.beginPath(); ctx.arc(x0 + 14, y0 + 8, 5, -Math.PI / 2, TAU - Math.PI / 2); ctx.stroke(); });
      }
    }
    ctx.restore();
  }

  /** Globen (cirkel, meridian, ekvator) med stroke-progress, i en färg. */
  function drawGlobe(ctx, pC, pM, color, alpha) {
    if (alpha <= 0 || pC <= 0) return;
    ctx.save(); ctx.globalAlpha *= clamp01(alpha); ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.arc(GLOB.x, GLOB.y, GLOB.r, -Math.PI / 2, -Math.PI / 2 + TAU * pC); ctx.stroke();
    if (pM > 0) {
      ctx.beginPath(); ctx.ellipse(GLOB.x, GLOB.y, GLOB.rx, GLOB.r, 0, -Math.PI / 2, -Math.PI / 2 + TAU * pM); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(GLOB.x - GLOB.r, GLOB.y + .5); ctx.lineTo(lerp(GLOB.x - GLOB.r, GLOB.x + GLOB.r, pM), GLOB.y + .5); ctx.stroke();
    }
    ctx.restore();
  }

  /** Etikett med storyboardets standardtoning. Returnerar alfa (för masker). */
  function labelIn(ctx, str, y, s, tIn, tOut, o = {}, mul = 1) {
    const f = R.textIn(s, tIn, tOut, { rise: o.rise == null ? 16 : o.rise });
    const a = f.a * mul;
    if (a > 0) R.label(ctx, str, 540, y + f.dy, { size: o.size || 32, spacing: o.spacing == null ? .3 : o.spacing, color: o.color || C.mist, alpha: a });
    return f.a;
  }

  let W_SHELF_LABEL = 0;                                     // mäts en gång (konstant)

  R.scene({
    id: "testet", name: "Vad som testades", start: T.start, end: T.end, pre: 0, post: 0,
    draw(ctx, s, t) {
      /* ---------- gemensamma tidsvärden ---------- */
      const yOff = SLIDE * outExpo(fade(s, L(26.0), 1.4));                  // 2.6 rutnätet glider upp
      const dimP = smooth(fade(s, L(34.0), 1));                             // övergång ut
      const dimAll = 1 - DIM_ALL * dimP, dimShelf = 1 - DIM_SHELF * dimP;
      const hx = HERO.x, hy = HERO.y + yOff;
      const shelfP = outExpo(fade(s, L(27.2), .8));                         // hyllan från mitten utåt
      const midA = smooth(fade(s, L(27.8), .5));                            // mittpunkten

      // Ring k: tändning (0.5 s smooth) och 10 px glid inåt (expoOut 0.9 s)
      const ringA = [1], ringOff = [0];
      for (let k = 1; k <= 6; k++) {
        ringA[k] = smooth(fade(s, RING_T(k), .5));
        ringOff[k] = 10 * (1 - outExpo(fade(s, RING_T(k), .9)));
      }
      const gridOn = s >= RING_T(1);

      // Textmask: etiketten ARTIFACTORY (y 1250) ligger ovanpå solfjäderns nedre del.
      if (!W_SHELF_LABEL) W_SHELF_LABEL = R.measure(ctx, 'ARTIFACTORY', { family: R.F.mono, size: 32, spacing: .44 });
      const shelfLab = R.textIn(s, L(27.6), null, { rise: 12 });
      const maskRects = shelfLab.a > 0 ? [R.textRect(540, SHELF_LABEL_Y, W_SHELF_LABEL, 32, shelfLab.a)] : null;

      /* ---------- lager 2: solfjädern (beat 2.6) ---------- */
      if (s >= L(28.2)) {
        // Linjernas ändpunkter (stroke-progress 0.8 s expoOut från pricken mot hyllpunkten)
        ctx.save(); ctx.strokeStyle = C.hair; ctx.lineWidth = 1; ctx.lineCap = 'butt';
        const hubRel = Math.pow(smooth(fade(s, L(34.0), .9)), 3);   // navtoningen släpps inför klippet (monotont med dimAll)
        // Alfa per band; band i följd med samma alfa slås ihop till ett (sömlöst) intervall.
        const runs = [];
        for (const [y0, y1] of BANDS) {
          const yc = (Math.max(y0, BAND_Y0) + y1) / 2;
          const mf = maskRects ? R.maskFactor(540, yc, maskRects) : 1;
          const a = HAIR_A * dimAll * mf * (hubRel >= 1 ? 1 : lerp(hubFade(yc), 1, hubRel));
          const last = runs[runs.length - 1];
          if (last && Math.abs(last.a - a) < 1e-9 && last.y1 === y0) last.y1 = y1; else runs.push({ y0, y1, a });
        }
        for (const { y0, y1, a } of runs) {
          if (a <= .003) continue;
          ctx.globalAlpha = a; ctx.beginPath();
          let any = false;
          for (let n = 0; n < CELLS.length; n++) {
            const p = outExpo(fade(s, FAN_T[n], FAN_D));
            if (p <= 0) continue;
            const c = CELLS[n], px = c.x, py = c.y + yOff;
            const ex = lerp(px, SHELF.x, p), ey = lerp(py, SHELF.y, p);
            if (ey - py < .01) continue;
            const ya = Math.max(py, y0), yb = Math.min(ey, y1);
            if (yb <= ya) continue;
            const kx = (ex - px) / (ey - py);
            ctx.moveTo(px + kx * (ya - py), ya); ctx.lineTo(px + kx * (yb - py), yb); any = true;
          }
          if (any) ctx.stroke();
        }
        ctx.restore();
      }

      /* ---------- lager 4: boxar (beat 2.4 + 2.5 väggvågen) ---------- */
      // 2.5 · väggvågen: fronten når ring 1 ≈ 21.1 och hörnen (d ≈ 433) ≈ 22.3; svansen har släckt
      // hörnen ≈ 22.9 – ISOLERADE tänds 23.8, ett andetag senare. Vid R = 530 är allt släckt.
      const waveR = WAVE.r * outCubic(fade(s, L(21.0), WAVE.dur));
      const waveOn = waveR > 0 && waveR < WAVE.r;
      ctx.save(); ctx.strokeStyle = C.hair; ctx.lineWidth = 1;
      for (let k = 0; k <= 6; k++) {
        const a = HAIR_A * ringA[k] * (k === 0 ? 1 : dimAll);
        if (a <= 0) continue;
        ctx.globalAlpha = a; ctx.beginPath();
        for (const i of RINGS[k]) {
          const c = CELLS[i], x = c.x + c.ux * ringOff[k], y = c.y + yOff + c.uy * ringOff[k];
          ctx.rect(Math.round(x - SIDE / 2) + .5, Math.round(y - SIDE / 2) + .5, SIDE, SIDE);
        }
        ctx.stroke();
      }
      if (waveOn) {                                           // 2.5: väggar vid fronten lyser ink, släcks mjukt bakåt
        ctx.strokeStyle = C.ink;
        for (const c of CELLS) {
          const e = c.d - waveR;                              // > 0 framför fronten, < 0 i svansen
          const w = smooth(clamp01(1 - (e > 0 ? e / WAVE.lead : -e / WAVE.tail)));
          if (w <= 0 || ringA[c.k] <= 0) continue;
          ctx.globalAlpha = .6 * w * ringA[c.k];
          ctx.strokeRect(Math.round(c.x - SIDE / 2) + .5, Math.round(c.y + yOff - SIDE / 2) + .5, SIDE, SIDE);
        }
      }
      ctx.restore();

      /* ---------- lager 6: prickar (ISOLERADE – andas inte, ingen halo) ---------- */
      if (gridOn) {
        ctx.save(); ctx.fillStyle = C.ink;
        for (let k = 1; k <= 6; k++) {
          const a = S.ISOLERAD.alpha * ringA[k] * dimAll;
          if (a <= 0) continue;
          ctx.globalAlpha = a; ctx.beginPath();
          for (const i of RINGS[k]) {
            const c = CELLS[i], x = c.x + c.ux * ringOff[k], y = c.y + yOff + c.uy * ringOff[k];
            ctx.moveTo(x + GRID_R, y); ctx.arc(x, y, GRID_R, 0, TAU);
          }
          ctx.fill();
        }
        ctx.restore();
      }
      // Hjälten: r 7, ink .70, ring r 13 – exakt hookens sista bild, dämpas aldrig
      R.drawAgent(ctx, { x: hx, y: hy, r: HERO_R, alpha: S.ISOLERAD.alpha, ring: S.HJALTE.ring });

      /* ---------- lager 7: skärmobjekt ---------- */
      // Beat 2.2 · Verktygen: tre ikoner på cirkeln r 300, glider in från r 324
      const iconOut = 1 - smooth(fade(s, L(15.2), .8));
      if (s >= L(9.8) && iconOut > 0) {
        for (let k = 0; k < ICONS.length; k++) {
          const ic = ICONS[k], t0 = L(9.8 + .5 * k);
          const rr = lerp(ICON_R0, ICON_R, outExpo(fade(s, t0, .9)));
          const a = ic.ang * Math.PI / 180;
          const cx = ic.x + (rr - ICON_R) * Math.cos(a), cy = ic.y + (rr - ICON_R) * Math.sin(a);
          const pRect = outExpo(fade(s, t0, .7));
          const pDet = ic.kind === 'stack'
            ? [outExpo(fade(s, t0 + .12, .7)), outExpo(fade(s, t0 + .24, .7))]
            : outExpo(fade(s, t0 + .35, .5));
          drawIcon(ctx, ic.kind, cx, cy, pRect, pDet, INK_A * iconOut);
        }
      }

      // Beat 2.3 · Offline: globen ritas fram, kryssas, sjunker till hair; ligger kvar med OFFLINE till 17.2
      const globOut = 1 - smooth(fade(s, OFFLINE_OUT, .9));
      if (s >= L(12.5) && globOut > 0) {
        const pC = outExpo(fade(s, L(12.5), .8)), pM = outExpo(fade(s, L(13.0), .6));
        const q = smooth(fade(s, L(14.5), .6));               // korsfade ink → hair
        drawGlobe(ctx, pC, pM, C.ink, INK_A * (1 - q) * globOut);
        drawGlobe(ctx, pC, pM, C.hair, HAIR_A * q * globOut);
        const p1 = outExpo(fade(s, L(13.8), .4)), p2 = outExpo(fade(s, L(14.1), .4));
        if (p1 > 0) R.line(ctx, 496, 1246, 584, 1334, { color: C.ink, width: 1.5, alpha: INK_A * globOut, progress: p1, cap: 'butt' });
        if (p2 > 0) R.line(ctx, 584, 1246, 496, 1334, { color: C.ink, width: 1.5, alpha: INK_A * globOut, progress: p2, cap: 'butt' });
      }

      // Beat 2.6 · Förrådet: hyllan, paketikoner, mittpunkt
      if (shelfP > 0) {
        R.line(ctx, SHELF.x - SHELF.half * shelfP, SHELF.y + .5, SHELF.x + SHELF.half * shelfP, SHELF.y + .5,
          { color: C.hair, width: 1, alpha: HAIR_A * dimShelf, cap: 'butt' });
        ctx.save(); ctx.strokeStyle = C.ink; ctx.lineWidth = 1;
        for (let k = 0; k < 3; k++) {                         // staplade rekt 24×5, tre per ikon
          const a = INK_A * dimShelf * smooth(fade(s, L(27.3) + .1 * Math.abs(k - 1), .5));
          if (a <= 0) continue;
          ctx.globalAlpha = a; ctx.beginPath();
          const x = SHELF_ICON_X[k] - 12 + .5;
          for (let j = 0; j < 3; j++) ctx.rect(x, 1272 + 7 * j + .5, 24, 5);
          ctx.stroke();
        }
        ctx.restore();
        if (midA > 0) R.dot(ctx, SHELF.x, SHELF.y, SHELF.mid, { color: C.ink, alpha: midA * dimShelf });
      }

      // Beat 2.7 · Paketen: 3 px ink längs solfjädern, sedan ut längs hyllan, läggs som 6×10-rekt
      if (s >= PACKS[0].t0) {
        ctx.save(); ctx.fillStyle = C.ink;
        for (const pk of PACKS) {
          if (s < pk.t0) break;
          const c = CELLS[pk.i];
          const p1 = outCubic(fade(s, pk.t0, .9));           // längs linjen till hyllpunkten
          const p2 = outExpo(fade(s, pk.t0 + .9, .4));        // längs hyllan utåt
          const rectA = smooth(fade(s, pk.t0 + 1.15, .3));    // blir en rektangel
          const inA = smooth(fade(s, pk.t0, .25));
          let x, y;
          if (p1 < 1) { x = lerp(c.x, SHELF.x, p1); y = lerp(c.y + yOff, SHELF.y, p1); }
          else { x = lerp(SHELF.x, pk.x, p2); y = SHELF.y - 5 * p2; }
          // Textmasken (ARTIFACTORY) gäller även paketet: det sjunker till .25 genom ordet och
          // dyker upp igen när det glider ut längs hyllan (masken släpps med p2).
          const mf = maskRects ? R.maskFactor(x, y, maskRects) : 1;
          const dotA = S.BUD.alpha * inA * (1 - rectA) * (p1 < 1 ? dimAll * mf : dimShelf * lerp(mf, 1, p2));
          if (dotA > 0) { ctx.globalAlpha = dotA; ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.fill(); }
          if (rectA > 0) { ctx.globalAlpha = .85 * rectA * dimShelf; ctx.fillRect(pk.x - 3, SHELF.y - 10, 6, 10); }
        }
        ctx.restore();
      }

      /* ---------- lager 8: text ---------- */
      // 2.1 · SANDLÅDA – 34 px mist .44em, y 790, in 8.0 (12 px stigning), ut med verktygen
      labelIn(ctx, 'SANDLÅDA', 790, s, L(8.0), L(15.2), { size: 34, spacing: .44, rise: 12 });
      // 2.2 · ARTIFACTORY under paketikonen – 32 px mist .30em, y 1084
      {
        const f = R.textIn(s, L(11.4), L(15.2), { rise: 12 });
        if (f.a > 0) R.label(ctx, 'ARTIFACTORY', ICONS[2].x, 1084 + f.dy, { alpha: f.a });
      }
      // 2.3 · OFFLINE – 34 px mist .44em, y 1380, in 14.6, ut 17.2 (läsbar ≥ 2.5 s; storyboardets 15.2–16.0 gav 0.6 s)
      labelIn(ctx, 'OFFLINE', 1380, s, L(14.6), OFFLINE_OUT, { size: 34, spacing: .44, rise: 12 });
      // 2.4 · TIOTUSENTALS KOPIOR – 32 px mist .30em, y 330, in 17.5, ut 20.4
      labelIn(ctx, 'TIOTUSENTALS KOPIOR', 330, s, L(17.5), L(20.4));
      // 2.5 · ISOLERADE – 40 px INK .44em, y 1420, in 23.8, ut 26.6
      labelIn(ctx, 'ISOLERADE', 1420, s, L(23.8), L(26.6), { size: 40, spacing: .44, color: C.ink });
      // 2.6 · ARTIFACTORY ovanför hyllan – 32 px mist .44em, y 1244, in 27.6, ligger kvar (dämpas till .18)
      if (shelfLab.a > 0) R.label(ctx, 'ARTIFACTORY', 540, SHELF_LABEL_Y + shelfLab.dy, { spacing: .44, alpha: shelfLab.a * dimAll });
      // 2.7 · ETT GEMENSAMT FÖRRÅD – 32 px mist .30em, y 1400, in 31.2, ut 34.0
      labelIn(ctx, 'ETT GEMENSAMT FÖRRÅD', 1400, s, L(31.2), L(34.0));
    },
  });
})();
