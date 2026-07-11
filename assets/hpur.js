/* hpur — timern i HPAkuten-bilden räknar ner från 55:00.
   En canvas läggs exakt över displayens sifferrad: bakgrunden klonas från
   en ren remsa av samma display i bilden (perfekt färgmatchning) och
   7-segmentsiffror ritas ovanpå i displayens lila glöd. */
(function () {
  'use strict';
  var wrap = document.querySelector('.globpromo--hp');
  if (!wrap) return;
  var img = wrap.querySelector('img');
  if (!img) return;

  // patchens läge i procent av bilden (uppmätt)
  var P = { x: 45.3, y: 50.8, w: 29.3, h: 6.5 };
  var bg = null;                   // färger samplade ur displayens egna sifferfria ytor
  function sampla() {
    try {
      var off = document.createElement('canvas');
      off.width = img.naturalWidth; off.height = img.naturalHeight;
      var og = off.getContext('2d');
      og.drawImage(img, 0, 0);
      function px(fx, fy) {
        var d = og.getImageData(Math.round(off.width * fx / 100), Math.round(off.height * fy / 100), 1, 1).data;
        return 'rgb(' + d[0] + ',' + d[1] + ',' + d[2] + ')';
      }
      bg = { L: px(45.0, 54.2), G: px(52.5, 50.7), R: px(74.7, 53.2) };
    } catch (e) { bg = { L: '#181320', G: '#221b30', R: '#151020' }; }
  }

  var SEG = {                      //  a  b  c  d  e  f  g
    '0': [1, 1, 1, 1, 1, 1, 0], '1': [0, 1, 1, 0, 0, 0, 0],
    '2': [1, 1, 0, 1, 1, 0, 1], '3': [1, 1, 1, 1, 0, 0, 1],
    '4': [0, 1, 1, 0, 0, 1, 1], '5': [1, 0, 1, 1, 0, 1, 1],
    '6': [1, 0, 1, 1, 1, 1, 1], '7': [1, 1, 1, 0, 0, 0, 0],
    '8': [1, 1, 1, 1, 1, 1, 1], '9': [1, 1, 1, 1, 0, 1, 1]
  };

  var cv, g, killa, kvar = 55 * 60, synlig = false, startad = false;

  function segment(x, y, w, h, dig) {
    // segmentens ändpunkter i en låda (x,y,w,h)
    var t = h * 0.13;                              // segmenttjocklek
    var s = SEG[dig];
    var L = [
      [x + t, y + t * .5, x + w - t, y + t * .5],                  // a
      [x + w - t * .5, y + t, x + w - t * .5, y + h * .5 - t * .5],// b
      [x + w - t * .5, y + h * .5 + t * .5, x + w - t * .5, y + h - t], // c
      [x + t, y + h - t * .5, x + w - t, y + h - t * .5],          // d
      [x + t * .5, y + h * .5 + t * .5, x + t * .5, y + h - t],    // e
      [x + t * .5, y + t, x + t * .5, y + h * .5 - t * .5],        // f
      [x + t, y + h * .5, x + w - t, y + h * .5]                   // g
    ];
    g.lineWidth = t;
    g.lineCap = 'round';
    for (var i = 0; i < 7; i++) {
      if (!s[i]) continue;
      g.beginPath();
      g.moveTo(L[i][0], L[i][1]);
      g.lineTo(L[i][2], L[i][3]);
      g.stroke();
    }
  }

  function rita() {
    if (!cv) return;
    var b = cv.getBoundingClientRect();
    if (!b.width) return;
    var dpr = Math.min(devicePixelRatio || 1, 2);
    var W = Math.max(2, Math.round(b.width * dpr)), H = Math.max(2, Math.round(b.height * dpr));
    if (cv.width !== W) { cv.width = W; cv.height = H; }
    // bakgrund: mjuk gradient av displayens egna färger (vänster/glans/höger)
    if (!bg) sampla();
    g.clearRect(0, 0, W, H);
    var grad = g.createLinearGradient(0, H, W, 0);
    grad.addColorStop(0, bg.L);
    grad.addColorStop(0.32, bg.G);
    grad.addColorStop(1, bg.R);
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    // fjädra patchens kanter så ingen skarv syns mot displayen
    g.globalCompositeOperation = 'destination-out';
    function fjader(x0, y0, x1, y1, rx, ry, rw, rh) {
      var f = g.createLinearGradient(x0, y0, x1, y1);
      f.addColorStop(0, 'rgba(0,0,0,1)');
      f.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = f;
      g.fillRect(rx, ry, rw, rh);
    }
    var fy = H * 0.14, fx = W * 0.03;
    fjader(0, 0, 0, fy,          0, 0, W, fy);
    fjader(0, H, 0, H - fy,      0, H - fy, W, fy);
    fjader(0, 0, fx, 0,          0, 0, fx, H);
    fjader(W, 0, W - fx, 0,      W - fx, 0, fx, H);
    g.globalCompositeOperation = 'source-over';

    // tid → "00:MM:SS"
    var m = Math.floor(kvar / 60), sk = kvar % 60;
    var txt = '00:' + (m < 10 ? '0' : '') + m + ':' + (sk < 10 ? '0' : '') + sk;

    // layout: 8 glyfer (siffra=1u, kolon=0.42u, mellanrum=0.16u)
    var padX = W * 0.035, innerW = W - padX * 2;
    var u = innerW / (6 + 2 * 0.42 + 7 * 0.16);
    var dh = Math.min(H * 0.86, u / 0.52);
    var y0 = (H - dh) / 2;
    g.save();
    g.transform(1, 0, -0.045, 1, dh * 0.045, 0);   // svag 7-segmentslutning
    g.strokeStyle = '#7f64f2';
    g.fillStyle = '#7f64f2';
    g.shadowColor = 'rgba(126,90,255,.9)';
    g.shadowBlur = dh * 0.22;
    var x = padX;
    for (var i = 0; i < txt.length; i++) {
      var ch = txt.charAt(i);
      if (ch === ':') {
        var rr = u * 0.09;
        g.beginPath(); g.arc(x + u * 0.21, y0 + dh * 0.30, rr, 0, 7); g.fill();
        g.beginPath(); g.arc(x + u * 0.21, y0 + dh * 0.70, rr, 0, 7); g.fill();
        x += u * 0.42 + u * 0.16;
      } else {
        segment(x, y0, u, dh, ch);
        x += u + u * 0.16;
      }
    }
    g.restore();
  }

  function tick() {
    if (synlig && !document.hidden) {
      kvar = kvar > 0 ? kvar - 1 : 55 * 60;        // vid noll börjar provet om
      rita();
    }
  }

  function starta() {
    if (startad) return;
    startad = true;
    cv = document.createElement('canvas');
    cv.className = 'hpur';
    cv.setAttribute('aria-hidden', 'true');
    g = cv.getContext('2d');
    if (!g) return;
    wrap.appendChild(cv);
    if (img.complete && img.naturalWidth) rita();
    else img.addEventListener('load', rita);
    setInterval(tick, 1000);
    addEventListener('resize', rita);
    var io2 = new IntersectionObserver(function (en) {
      synlig = en[0].isIntersecting;
      if (synlig) rita();
    }, { rootMargin: '80px' });
    io2.observe(cv);
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (en) {
      if (en[0].isIntersecting) { starta(); io.disconnect(); }
    }, { rootMargin: '600px' });
    io.observe(wrap);
  } else starta();
})();
