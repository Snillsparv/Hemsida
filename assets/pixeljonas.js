/* pixeljonas — en liten pixelfigur (Jonas i röd tröja) som springer fram
   och tillbaka, hoppar, vinkar, står och blinkar, rabblar ibland några
   pi-decimaler i en pratbubbla (och fortsätter där han slutade) — och gör
   någon enstaka gång en volt. Helt ritad i kod. Pausar när scenen inte syns. */
(function () {
  'use strict';
  var scen = document.querySelector('.pixelscen');
  if (!scen || !window.HTMLCanvasElement) return;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* spriten: 14x20 pixlar, åtta frames — "." är genomskinlig */
  var SPRITE = {
    width: 14, height: 20,
    palette: {"H":"#7a4a24","S":"#f6c99f","E":"#22242e","M":"#803024","R":"#e23b4e","P":"#3a4468","K":"#8a5a2b"},
    frames: {
      idle: [
        '..............',
        '..............',
        '....H.HH.H....',
        '....HHHHHH....',
        '...HHHHHHHH...',
        '...HHHHHHHH...',
        '...HHSSSSSS...',
        '...HSSESSES...',
        '.....SSMMMS...',
        '......SSSS....',
        '....RRRRRR....',
        '...RRRRRRRR...',
        '...SRRRRRRS...',
        '...SRRRRRRS...',
        '...SPPPPPPS...',
        '....PPPPPP....',
        '....PP..PP....',
        '....PP..PP....',
        '....PP..PP....',
        '....KKK.KKK...',
      ],
      blink: [
        '..............',
        '..............',
        '....H.HH.H....',
        '....HHHHHH....',
        '...HHHHHHHH...',
        '...HHHHHHHH...',
        '...HHSSSSSS...',
        '...HSSSSSSS...',
        '.....SSMMMS...',
        '......SSSS....',
        '....RRRRRR....',
        '...RRRRRRRR...',
        '...SRRRRRRS...',
        '...SRRRRRRS...',
        '...SPPPPPPS...',
        '....PPPPPP....',
        '....PP..PP....',
        '....PP..PP....',
        '....PP..PP....',
        '....KKK.KKK...',
      ],
      prat: [
        '..............',
        '..............',
        '....H.HH.H....',
        '....HHHHHH....',
        '...HHHHHHHH...',
        '...HHHHHHHH...',
        '...HHSSSSSS...',
        '...HSSESSES...',
        '.....SSMEMS...',
        '......SEES....',
        '....RRRRRR....',
        '...RRRRRRRR...',
        '...SRRRRRRS...',
        '...SRRRRRRS...',
        '...SPPPPPPS...',
        '....PPPPPP....',
        '....PP..PP....',
        '....PP..PP....',
        '....PP..PP....',
        '....KKK.KKK...',
      ],
      run1: [
        '..............',
        '..............',
        '.....H.HH.H...',
        '.....HHHHHH...',
        '....HHHHHHHH..',
        '....HHHHHHHH..',
        '....HHSSSSSS..',
        '....HSSESSES..',
        '......SSMMMS..',
        '.......SSSS...',
        '....RRRRRR....',
        '...RRRRRRRR...',
        '..SSRRRRRRSS..',
        '....RRRRRR....',
        '....PPPPPP....',
        '...PPP..PPP...',
        '..KKP....PP...',
        '.........PP...',
        '.........PP...',
        '.........KKK..',
      ],
      run2: [
        '..............',
        '..............',
        '.....H.HH.H...',
        '.....HHHHHH...',
        '....HHHHHHHH..',
        '....HHHHHHHH..',
        '....HHSSSSSS..',
        '....HSSESSES..',
        '......SSMMMS..',
        '.......SSSS...',
        '....RRRRRR....',
        '...RRRRRRRR...',
        '...SRRRRRRS...',
        '....RRRRRR....',
        '....PPPPPP....',
        '....PPP.PPP...',
        '....PP...KKK..',
        '....PP........',
        '....PP........',
        '....KKK.......',
      ],
      jump: [
        '..............',
        '..............',
        '..............',
        '....H.HH.H....',
        '....HHHHHH....',
        '...HHHHHHHH...',
        '...HHHHHHHH...',
        '...HHSSSSSS...',
        '...HSSESSES...',
        '..S..SSMMMS.S.',
        '..R...SSSS..R.',
        '..RRRRRRRRRR..',
        '....RRRRRR....',
        '....RRRRRR....',
        '....PPPPPP....',
        '...PPP..PPP...',
        '..KKK....KKK..',
        '..............',
        '..............',
        '..............',
      ],
      vinka1: [
        '...........SS.',
        '...........S..',
        '....H.HH.H.S..',
        '....HHHHHH.S..',
        '...HHHHHHHHS..',
        '...HHHHHHHHR..',
        '...HHSSSSSSR..',
        '...HSSESSESR..',
        '.....SSMMMSR..',
        '......SSSS.R..',
        '....RRRRRRRR..',
        '...RRRRRRRR...',
        '...SRRRRRR....',
        '...SRRRRRR....',
        '...SPPPPPP....',
        '....PPPPPP....',
        '....PP..PP....',
        '....PP..PP....',
        '....PP..PP....',
        '....KKK.KKK...',
      ],
      vinka2: [
        '..............',
        '..............',
        '....H.HH.H....',
        '....HHHHHH....',
        '...HHHHHHHH.SS',
        '...HHHHHHHH.S.',
        '...HHSSSSSSR..',
        '...HSSESSESR..',
        '.....SSMMMSR..',
        '......SSSS.R..',
        '....RRRRRRRR..',
        '...RRRRRRRR...',
        '...SRRRRRR....',
        '...SRRRRRR....',
        '...SPPPPPP....',
        '....PPPPPP....',
        '....PP..PP....',
        '....PP..PP....',
        '....PP..PP....',
        '....KKK.KKK...',
      ],
    }
  };

  var SKALA = 3;
  var W = SPRITE.width * SKALA, H = SPRITE.height * SKALA;
  var cv = document.createElement('canvas');
  cv.className = 'pixfig';
  cv.width = SPRITE.width;
  cv.height = SPRITE.height;
  cv.style.width = W + 'px';
  cv.style.height = H + 'px';
  scen.appendChild(cv);
  var g = cv.getContext('2d');
  if (!g) return;

  var ritad = '';
  function rita(namn) {
    if (namn === ritad) return;
    ritad = namn;
    var f = SPRITE.frames[namn];
    g.clearRect(0, 0, cv.width, cv.height);
    for (var y = 0; y < f.length; y++) {
      for (var x = 0; x < f[y].length; x++) {
        var farg = SPRITE.palette[f[y].charAt(x)];
        if (farg) { g.fillStyle = farg; g.fillRect(x, y, 1, 1); }
      }
    }
  }

  function spann() { return Math.max(20, scen.clientWidth - W); }

  /* stillsam variant: står och vinkar i mitten */
  if (reduced) {
    rita('vinka1');
    cv.style.transform = 'translateX(' + Math.round(spann() / 2) + 'px)';
    return;
  }

  var x = 6, dir = 1, mal = 0;
  var FART = 46;                     // px/s
  var lage = 'spring';               // spring | vinka | sta | rabbla
  var lageT = 0, lageSlut = 0;
  var stegT = 0, steg = 0;           // springsteg / vinkväxling
  var hoppT = -1;                    // 0..1 medan hopp pågår
  var voltT = -1, senasteVolt = 0;   // 0..1 medan volt pågår (sällsynt)
  var blinkOm = 1.5, blinkT = 0;     // blinkning i stillastående
  var synlig = false, rafId = 0, senast = 0;

  /* pi-rabblet: han fortsätter där han slutade, decimal för decimal */
  var RABBEL = '14159265358979323846264338327950288419716939937510582097494459230781640628620899862803482534211706798214808651328230664709384460955058223172535940812848111745028410270193852110555964462294895493038196';
  var rabbelPos = 0, rabbelKvar = 0, senasteRabbel = 0;
  var bubbla = document.createElement('div');
  bubbla.className = 'pratbubbla';
  scen.appendChild(bubbla);

  function placeraBubbla() {
    var s = scen.clientWidth;
    var mitt = x + W / 2;
    var bw = bubbla.offsetWidth || 40;
    var c = Math.max(bw / 2 + 2, Math.min(s - bw / 2 - 2, mitt));
    bubbla.style.left = Math.round(c) + 'px';
    var pil = Math.max(8 - bw / 2, Math.min(bw / 2 - 8, mitt - c));
    bubbla.style.setProperty('--pil', Math.round(pil) + 'px');
  }

  function nyttMal() {
    var s = spann();
    mal = 6 + Math.random() * (s - 12);
    if (Math.abs(mal - x) < 40) mal = x < s / 2 ? s - 8 : 8;
    dir = mal > x ? 1 : -1;
    lage = 'spring';
  }
  nyttMal();

  function tick(ts) {
    rafId = 0;
    if (!synlig || document.hidden) { senast = 0; return; }
    var dt = senast ? Math.min(0.05, (ts - senast) / 1000) : 0.016;
    senast = ts;
    var hoppY = 0;

    if (voltT >= 0) {                                  // volt: högre luftfärd + helsnurr
      voltT += dt / 0.8;
      if (voltT >= 1) { voltT = -1; cv.style.transformOrigin = ''; }
      else { hoppY = Math.round(24 * Math.sin(Math.PI * voltT)); }
    } else if (hoppT >= 0) {                           // hopp ovanpå pågående läge
      hoppT += dt / 0.55;
      if (hoppT >= 1) { hoppT = -1; }
      else { hoppY = Math.round(15 * Math.sin(Math.PI * hoppT)); }
    }

    if (lage === 'spring') {
      x += dir * FART * dt;
      stegT += dt;
      if (stegT > 0.13) { stegT = 0; steg = 1 - steg; }
      rita(hoppT >= 0 || voltT >= 0 ? 'jump' : (steg ? 'run2' : 'run1'));
      if (hoppT < 0 && voltT < 0 && Math.random() < dt * 0.35) {
        if (ts - senasteVolt > 20000 && Math.random() < 0.14 &&
            Math.abs(mal - x) > 60) {                             // sällsynt: volt!
          voltT = 0; senasteVolt = ts;
          cv.style.transformOrigin = '50% 50%';
        } else { hoppT = 0; }
      }
      if ((dir > 0 && x >= mal) || (dir < 0 && x <= mal)) {
        x = mal;
        if (ts - senasteRabbel > 9000 && Math.random() < 0.28) { // ibland: rabbla pi
          lage = 'rabbla'; senasteRabbel = ts;
          rabbelKvar = 6 + Math.floor(Math.random() * 8);
          lageSlut = rabbelKvar * 0.22 + 1.4;
          bubbla.textContent = rabbelPos ? '…' : '3,';
          bubbla.classList.add('syns');
          placeraBubbla();
        } else {
          lage = Math.random() < 0.55 ? 'vinka' : 'sta';
          lageSlut = lage === 'vinka' ? 1.6 + Math.random() * 1.4 : 1.2 + Math.random() * 2.6;
        }
        lageT = 0;
        stegT = 0; steg = 0;
        blinkOm = 0.9 + Math.random() * 1.8; blinkT = 0;
      }
    } else {
      lageT += dt;
      if (lage === 'vinka') {
        stegT += dt;
        if (stegT > 0.24) { stegT = 0; steg = 1 - steg; }
        rita(hoppT >= 0 ? 'jump' : (steg ? 'vinka2' : 'vinka1'));
        if (hoppT < 0 && Math.random() < dt * 0.25) hoppT = 0; // glädjeskutt mitt i vinket
      } else if (lage === 'rabbla') {                   // står och rabblar pi-decimaler
        stegT += dt;
        if (rabbelKvar > 0 && stegT > 0.22) {
          stegT = 0; steg = 1 - steg;
          bubbla.textContent += RABBEL.charAt(rabbelPos % RABBEL.length);
          rabbelPos++; rabbelKvar--;
          if (!rabbelKvar) bubbla.textContent += '…';
          placeraBubbla();
        }
        rita(hoppT >= 0 ? 'jump' : (rabbelKvar > 0 && steg ? 'prat' : 'idle'));
      } else {                                          // står stilla, tittar och blinkar
        blinkOm -= dt;
        if (blinkOm <= 0) { blinkOm = 1.2 + Math.random() * 2.4; blinkT = 0.13; }
        if (blinkT > 0) blinkT -= dt;
        rita(hoppT >= 0 ? 'jump' : (blinkT > 0 ? 'blink' : 'idle'));
        if (Math.random() < dt * 0.45) dir = -dir;      // kikar åt andra hållet
      }
      if (lageT >= lageSlut) {
        if (lage === 'rabbla') { bubbla.classList.remove('syns'); nyttMal(); }
        else if (lage === 'vinka' && Math.random() < 0.45) { // efter vinket: stå kvar en stund
          lage = 'sta'; lageT = 0; lageSlut = 1 + Math.random() * 2.2;
          blinkOm = 0.7 + Math.random() * 1.5;
        } else { nyttMal(); }
      }
    }

    var rot = voltT >= 0 ? Math.round(voltT * 360) : 0;
    cv.style.transform = 'translate(' + Math.round(x) + 'px,' + (-hoppY) + 'px) rotate(' + rot + 'deg) scaleX(' + dir + ')';
    scen.dataset.lage = voltT >= 0 ? 'volt' : lage;
    rafId = requestAnimationFrame(tick);
  }

  function start() { if (!rafId && synlig && !document.hidden) rafId = requestAnimationFrame(tick); }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) {
      synlig = en[0].isIntersecting;
      if (synlig) start();
    }, { rootMargin: '60px' }).observe(scen);
  } else { synlig = true; start(); }
  document.addEventListener('visibilitychange', start);
  addEventListener('resize', function () { x = Math.min(x, spann()); mal = Math.min(mal, spann()); });
})();
