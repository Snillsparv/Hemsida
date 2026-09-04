/* Scen 5 – Utbrottet. Tider: REEL.T.utbrottet. Se STORYBOARD.md. */
(function () {
  const R = REEL, C = R.C, F = R.F, E = R.E, SAFE = R.SAFE, T = R.T.utbrottet;
  const DUR = T.end - T.start;

  R.scene({
    id: "utbrottet", name: "Utbrottet", start: T.start, end: T.end, pre: 0, post: 0,
    draw(ctx, s, t) {
      // PLATSHÅLLARE – ersätts av scenens riktiga kod
      const a = R.fade(s, DUR, .5, .5);
      R.label(ctx, "scen 5 · Utbrottet", SAFE.cx, SAFE.cy - 60, { alpha: a });
      R.text(ctx, "platshållare", SAFE.cx, SAFE.cy + 30, { align: "center", size: 64, color: C.mist, alpha: a });
      R.arc(ctx, SAFE.cx, SAFE.cy + 220, 70, { to: R.seg(s, 0, DUR), color: C.accent, width: 2, alpha: a });
    },
  });
})();
