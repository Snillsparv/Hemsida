/* ============================================================================
   Delad "värld" – data som flera scener måste dela EXAKT:
   · REEL.GRID  – 9×13-rutnätet (cell 60) med agentindex ↔ cell (hjälten = index 0)
   · REEL.WEB   – väven: när varje agent vaknar och vilka gula kanter som finns
                  (tider LOKALA för scen 3, dvs. storyboardtid − 35)
   · REEL.DISK  – solrosdisken med 1 200 platser (scen 5–7)
   Allt är deterministiskt och beräknas en gång vid laddning.
   ============================================================================ */
(function () {
  const R = REEL, hash = R.hash;

  /* --------------------------------------------------------------- rutnätet */
  const GRID = {
    cols: 9, rows: 13, cell: 60, x0: 270, y0: 480, side: 46, n: 117,
    hero: { col: 4, row: 6 },
    /** Cellcentrum. yOff = scenens glid (scen 3–4: −170, scen 5: −140). */
    pos(col, row, yOff = 0) { return { x: 270 + 60 * col + 30, y: 480 + 60 * row + 30 + yOff }; },
    /** Agentindex för cellen (hjälten = 0 i mitten). */
    agent(col, row) { const gid = row * 9 + col; return gid === 58 ? 0 : (gid < 58 ? gid + 1 : gid); },
    /** Cellen för agentindex i. */
    cellOf(i) { const gid = i === 0 ? 58 : (i <= 58 ? i - 1 : i); return { col: gid % 9, row: Math.floor(gid / 9) }; },
    posOf(i, yOff = 0) { const c = this.cellOf(i); return this.pos(c.col, c.row, yOff); },
    /** Chebyshev-avstånd i celler från hjälten (ring k i scen 2). */
    ring(col, row) { return Math.max(Math.abs(col - 4), Math.abs(row - 6)); },
    dist(i, j) { const a = this.posOf(i), b = this.posOf(j); return Math.hypot(a.x - b.x, a.y - b.y); },
  };
  R.GRID = GRID;

  /* --------------------------------------------------------------- väven */
  const WEB = (function () {
    const N = 117, L = g => g - 35;                        // storyboardtid → lokal tid för scen 3
    const wake = new Array(N).fill(Infinity);
    const first = [[17, 50.8], [44, 51.5], [61, 52.1], [88, 52.6], [103, 53.0]];
    first.forEach(([i, g]) => { wake[i] = L(g); });
    wake[0] = L(53.6);                                     // hjälten går med när den första gula linjen tänds
    const edges = [
      { a: 0, b: 61, t0: L(53.6) }, { a: 61, b: 44, t0: L(54.5) }, { a: 17, b: 88, t0: L(54.9) },
      { a: 88, b: 103, t0: L(55.2) }, { a: 44, b: 17, t0: L(55.5) },
    ];
    // Kaskaden: wake_i = 56 + 8·hash(i,6)^0.6 – de 12 med högst hash vaknar aldrig (≈105 aktiva)
    const rest = [];
    for (let i = 1; i < N; i++) if (!isFinite(wake[i])) rest.push({ i, h: hash(i, 6) });
    rest.sort((a, b) => a.h - b.h);
    const never = rest.slice(rest.length - 12).map(o => o.i).sort((a, b) => a - b);
    rest.slice(0, rest.length - 12).forEach(o => { wake[o.i] = L(56 + 8 * Math.pow(o.h, .6)); });
    // Kanter vid väckning: 1–2 närmaste redan väckta grannar (≤ 130 px), seedat (seed 3)
    const rnd = R.rng(3);
    const order = rest.slice(0, rest.length - 12).map(o => o.i).sort((a, b) => wake[a] - wake[b]);
    const firstSet = new Set([17, 44, 61, 88, 103, 0]);
    for (const i of order) {
      const cand = [];
      for (let j = 0; j < N; j++) if (j !== i && wake[j] < wake[i]) cand.push({ j, d: GRID.dist(i, j) });
      cand.sort((a, b) => a.d - b.d || a.j - b.j);
      const near = cand.filter(c => c.d <= 130);          // ingen granne nära? då kopplas den när en granne vaknar
      const count = Math.min(near.length, rnd() < .5 ? 1 : 2);
      // seedat val bland de (upp till) fyra närmaste
      const pool = near.slice(0, 4);
      for (let k = 0; k < count; k++) {
        const idx = Math.floor(rnd() * pool.length);
        const c = pool.splice(idx, 1)[0];
        edges.push({ a: c.j, b: i, t0: wake[i] });
      }
    }
    const active = []; for (let i = 0; i < N; i++) if (isFinite(wake[i])) active.push(i);
    const lonely = active.filter(i => !edges.some(e => e.a === i || e.b === i));
    const adj = Array.from({ length: N }, () => []);
    edges.forEach((e, k) => { adj[e.a].push({ to: e.b, e: k }); adj[e.b].push({ to: e.a, e: k }); });
    return {
      n: N, wake, edges, active, never, lonely, adj, firstSet,
      /** Vaken vid lokal (scen 3-)tid s? */
      awake: (i, s) => s >= wake[i],
      /** Antal vakna vid s. */
      count: s => { let n = 0; for (let i = 0; i < N; i++) if (s >= wake[i]) n++; return n; },
    };
  })();
  R.WEB = WEB;

  /* --------------------------------------------------------------- solrosdisken */
  const DISK = (function () {
    const n = 1200, cx = 540, cy = 870, Rmax = 420, GA = 137.508 * Math.PI / 180;
    const slots = [];
    for (let k = 0; k < n; k++) { const r = Rmax * Math.sqrt(k / n), th = k * GA; slots.push({ k, x: cx + r * Math.cos(th), y: cy + r * Math.sin(th) }); }
    const hero = 640, red = [97, 311, 488, 702, 903, 1150];
    // assign(j): j = 0 (hjälten) → 640; j = 1…116 sandlådans agenter, 117…816 kopiorna, 817…1199 nya → seedad permutation (seed 6)
    const free = []; for (let k = 0; k < n; k++) if (k !== hero) free.push(k);
    const rnd = R.rng(6);
    for (let i = free.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = free[i]; free[i] = free[j]; free[j] = t; }
    const assign = j => (j === 0 ? hero : free[j - 1]);
    return { n, cx, cy, R: Rmax, r: 4, ring: 460, slots, hero, red, assign, slotOf: j => slots[assign(j)] };
  })();
  R.DISK = DISK;
})();
