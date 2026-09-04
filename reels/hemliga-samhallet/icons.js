/* ============================================================================
   Delat ikonbibliotek – enkla streckikoner i sajtens stil (1 färg, runda ändar).
   REEL.icon(ctx, namn, x, y, { size: 100, color, alpha, width: 3, rotate })
   Ikonen ritas centrerad kring (x,y) och fyller ungefär size×size px.
   Alla ikoner är ritade i en 100×100-ruta med origo i mitten (-50..50).
   ============================================================================ */
(function () {
  const R = REEL, C = R.C;
  const P = Math.PI;

  const circle = (ctx, x, y, r, fill) => { ctx.beginPath(); ctx.arc(x, y, r, 0, P * 2); fill ? ctx.fill() : ctx.stroke(); };
  const poly = (ctx, pts, close) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); if (close) ctx.closePath(); ctx.stroke(); };
  const rr = (ctx, x, y, w, h, r) => { R.roundRect(ctx, x, y, w, h, r); ctx.stroke(); };

  const ICONS = {
    terminal(ctx) { rr(ctx, -48, -34, 96, 68, 6); poly(ctx, [[-32, -9], [-20, 0], [-32, 9]]); poly(ctx, [[-12, 12], [8, 12]]); },
    browser(ctx) { rr(ctx, -48, -34, 96, 68, 6); poly(ctx, [[-48, -17], [48, -17]]); [-38, -28, -18].forEach(x => circle(ctx, x, -26, 2.6, true)); },
    package(ctx) {
      poly(ctx, [[0, -44], [40, -22], [0, 0], [-40, -22]], true);
      poly(ctx, [[-40, -22], [-40, 24], [0, 46], [40, 24], [40, -22]]);
      poly(ctx, [[0, 0], [0, 46]]);
      poly(ctx, [[-20, -33], [20, -11]]);
    },
    globe(ctx) {
      circle(ctx, 0, 0, 42);
      ctx.beginPath(); ctx.ellipse(0, 0, 17, 42, 0, 0, P * 2); ctx.stroke();
      poly(ctx, [[-42, 0], [42, 0]]);
      poly(ctx, [[-36, -21], [36, -21]]); poly(ctx, [[-36, 21], [36, 21]]);
    },
    cross(ctx) { ctx.lineWidth *= 1.35; poly(ctx, [[-40, -40], [40, 40]]); poly(ctx, [[40, -40], [-40, 40]]); },
    note(ctx) {
      poly(ctx, [[-34, -44], [16, -44], [34, -26], [34, 44], [-34, 44]], true);
      poly(ctx, [[16, -44], [16, -26], [34, -26]]);
      poly(ctx, [[-20, -8], [20, -8]]); poly(ctx, [[-20, 8], [20, 8]]); poly(ctx, [[-20, 24], [4, 24]]);
    },
    doc(ctx) { rr(ctx, -30, -44, 60, 88, 4); [[-24, 36], [-8, 26], [8, 36], [24, 18]].forEach(([y, w]) => poly(ctx, [[-18, y], [-18 + w, y]])); },
    key(ctx) { circle(ctx, -24, 0, 14); poly(ctx, [[-10, 0], [44, 0]]); poly(ctx, [[30, 0], [30, 12]]); poly(ctx, [[40, 0], [40, 9]]); },
    flag(ctx) { poly(ctx, [[-32, -46], [-32, 46]]); poly(ctx, [[-32, -42], [34, -42], [34, -6], [-32, -6]]); },
    pennant(ctx) { poly(ctx, [[-32, -46], [-32, 46]]); poly(ctx, [[-32, -42], [38, -24], [-32, -6]], true); },
    eye(ctx) {
      ctx.beginPath(); ctx.moveTo(-46, 0); ctx.bezierCurveTo(-22, -34, 22, -34, 46, 0); ctx.bezierCurveTo(22, 34, -22, 34, -46, 0); ctx.closePath(); ctx.stroke();
      circle(ctx, 0, 0, 14); circle(ctx, 0, 0, 5, true);
    },
    target(ctx) { circle(ctx, 0, 0, 40); circle(ctx, 0, 0, 25); circle(ctx, 0, 0, 10); poly(ctx, [[-48, 0], [-32, 0]]); poly(ctx, [[32, 0], [48, 0]]); poly(ctx, [[0, -48], [0, -32]]); poly(ctx, [[0, 32], [0, 48]]); },
    tripwire(ctx) { poly(ctx, [[-40, -14], [-40, 30]]); poly(ctx, [[40, -14], [40, 30]]); ctx.lineWidth *= .5; poly(ctx, [[-40, -6], [40, -6]]); ctx.lineWidth *= 2; circle(ctx, 0, -6, 4, true); },
    door(ctx) { rr(ctx, -30, -46, 60, 92, 2); poly(ctx, [[-30, -46], [14, -36], [14, 36], [-30, 46]], true); circle(ctx, 6, 2, 2.6, true); },
    wall(ctx) {
      rr(ctx, -48, -48, 96, 96, 0);
      for (let y = -32; y < 48; y += 16) poly(ctx, [[-48, y], [48, y]]);
      for (let row = 0; row < 6; row++) { const y0 = -48 + row * 16, off = row % 2 ? 12 : -12; for (let x = -24 + off; x < 48; x += 24) if (x > -48 && x < 48) poly(ctx, [[x, y0], [x, y0 + 16]]); }
    },
    building(ctx) {
      rr(ctx, -40, -46, 80, 92, 2);
      for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) rr(ctx, -30 + c * 22, -36 + r * 18, 12, 10, 0);
      rr(ctx, -8, 30, 16, 16, 0);
    },
    lock(ctx) { ctx.beginPath(); ctx.arc(0, -16, 18, P, 0); ctx.stroke(); poly(ctx, [[-18, -16], [-18, -2]]); poly(ctx, [[18, -16], [18, -2]]); rr(ctx, -30, -2, 60, 46, 5); circle(ctx, 0, 16, 4, true); poly(ctx, [[0, 18], [0, 30]]); },
    person(ctx) { circle(ctx, 0, -22, 13); ctx.beginPath(); ctx.arc(0, 40, 32, P, P * 2); ctx.stroke(); },
    signal(ctx) { circle(ctx, 0, 30, 5, true); [22, 40, 58].forEach(r => { ctx.beginPath(); ctx.arc(0, 30, r, P * 1.25, P * 1.75); ctx.stroke(); }); },
    message(ctx) { R.roundRect(ctx, -42, -34, 84, 54, 10); ctx.stroke(); poly(ctx, [[-22, 20], [-30, 38], [-6, 20]]); poly(ctx, [[-22, -14], [22, -14]]); poly(ctx, [[-22, 2], [8, 2]]); },
    shelf(ctx) { poly(ctx, [[-48, -46], [-48, 46]]); poly(ctx, [[48, -46], [48, 46]]); [-16, 16, 46].forEach(y => poly(ctx, [[-48, y], [48, y]])); rr(ctx, -34, -36, 20, 20, 2); rr(ctx, -6, -36, 20, 20, 2); rr(ctx, 14, -4, 20, 20, 2); },
    check(ctx) { poly(ctx, [[-32, 2], [-10, 24], [34, -22]]); },
    server(ctx) { [-40, -8, 24].forEach(y => { rr(ctx, -44, y, 88, 24, 4); circle(ctx, -32, y + 12, 3, true); poly(ctx, [[-16, y + 12], [30, y + 12]]); }); },
    chip(ctx) { rr(ctx, -30, -30, 60, 60, 4); rr(ctx, -14, -14, 28, 28, 0); for (let i = -20; i <= 20; i += 10) { poly(ctx, [[i, -30], [i, -46]]); poly(ctx, [[i, 30], [i, 46]]); poly(ctx, [[-30, i], [-46, i]]); poly(ctx, [[30, i], [46, i]]); } },
  };

  R.icon = function (ctx, name, x, y, o = {}) {
    const fn = ICONS[name];
    if (!fn) { R.text(ctx, '?' + name, x, y, { size: 24, color: C.red, align: 'center' }); return; }
    const size = o.size || 100;
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha *= R.clamp01(o.alpha);
    ctx.translate(x, y);
    if (o.rotate) ctx.rotate(o.rotate);
    ctx.scale(size / 100, size / 100);
    ctx.strokeStyle = o.color || C.ink; ctx.fillStyle = o.color || C.ink;
    ctx.lineWidth = (o.width || 3) * 100 / size;   // strecket hålls i px oavsett skalning
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    fn(ctx);
    ctx.restore();
  };
  R.iconNames = Object.keys(ICONS);
})();
