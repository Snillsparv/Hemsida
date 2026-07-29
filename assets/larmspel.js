/* larmspel — knappen man inte ska klicka på ("Klicka inte här. Vad du än
   gör, klicka inte här.") utlöser larmet: sidan blinkar rött, olycksbådande
   maskinljud mullrar (helt syntetiserade i Web Audio — inga ljudfiler),
   och allt på sidan rasar ner lite snett och blir plattformar i ett spel.
   Man styr pixel-Jonas därnere: spring, hoppa och skjut spindeltråd för
   att svinga och klättra hela vägen upp — där uppe vaktar en AI-robot
   som ska besegras med tre hopp på huvudet. "Läk sidan" efteråt låter
   allting sväva tillbaka på plats. Inga beroenden. */
(function () {
  'use strict';
  var knapp = document.getElementById('intelarm');
  if (!knapp || !window.HTMLCanvasElement || !window.requestAnimationFrame) return;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var docEl = document.documentElement;

  /* ————— stilar för larmläget, spelets överlägg och touch-kontrollerna ————— */
  var stil = document.createElement('style');
  stil.id = 'larmstil';
  stil.textContent =
    'html.larm{scroll-behavior:auto;cursor:crosshair;user-select:none;-webkit-user-select:none}' +
    'html.larm,html.larm body{overscroll-behavior:none}' +
    'html.larm main *,html.larm footer *{animation-play-state:paused !important}' +
    'html.larm .nbplan,html.larm #intelarm{animation:none !important}' +   /* transform-keyframes slår inline-fallet */
    'html.larm [data-line]{opacity:1 !important}' +
    'html.larm .aft{opacity:1 !important}' +
    'html.larm .globpromo,html.larm .kobj,html.larm .soc a,html.larm .nbplan{opacity:1 !important}' +
    'html.larm #hejgast{display:none}' +
    'html.larm .pixelscen.figurborta canvas,html.larm .pixelscen.figurborta .pratbubbla{visibility:hidden}' +   /* figuren blir spelaren */
    'html.larm .nav{transform:translateY(130vh) rotate(-8deg);transition:transform 1.3s cubic-bezier(.5,.02,.9,.55) .15s;pointer-events:none}' +
    'html.larm #glob3d.boostlyser{animation:globsnurr .55s linear infinite;animation-play-state:running !important}' +
    '@keyframes globsnurr{to{transform:rotate(360deg)}}' +
    'html.larmslut .nav{transition:transform 1.1s cubic-bezier(.16,1,.3,1)}' +
    'html.larm main{animation:larmskalv .18s linear 9}' +
    '@keyframes larmskalv{0%,100%{transform:translate(0,0)}25%{transform:translate(-6px,3px)}50%{transform:translate(5px,-4px)}75%{transform:translate(-4px,-3px)}}' +
    '#larmflash{position:fixed;inset:0;z-index:120;pointer-events:none;opacity:0;transition:opacity .6s ease}' +
    '#larmflash.blink{opacity:1;background:rgba(255,30,20,.26);animation:larmblink .5s steps(2,end) infinite}' +
    '#larmflash.lugn{opacity:1;background:radial-gradient(ellipse at 50% 50%,transparent 52%,rgba(255,30,20,.17) 100%);animation:larmpuls 2.6s ease-in-out infinite}' +
    '#larmflash.aj{background:rgba(255,30,20,.34)}' +
    '@keyframes larmblink{0%{box-shadow:inset 0 0 18vmax rgba(255,0,0,.55);background:rgba(255,30,20,.32)}50%{box-shadow:inset 0 0 6vmax rgba(255,0,0,.18);background:rgba(255,30,20,.07)}}' +
    '@keyframes larmpuls{0%,100%{opacity:.72}50%{opacity:1}}' +
    '#larmcanvas{position:fixed;inset:0;z-index:130;display:block;touch-action:none}' +
    '#larmhud{position:fixed;left:0;right:0;top:0;z-index:140;display:flex;gap:.7rem 1.2rem;align-items:center;flex-wrap:wrap;' +
      'padding:.7rem clamp(.8rem,3vw,1.8rem);font-family:var(--mono,monospace);font-size:.62rem;letter-spacing:.22em;text-transform:uppercase;' +
      'color:#ff8d80;background:linear-gradient(to bottom,rgba(24,2,2,.92),rgba(24,2,2,0))}' +
    '#larmhud .lh-varning{animation:larmpuls 1.1s steps(2,end) infinite}' +
    '#larmhud .lh-liv{color:#ff4b4b;font-size:.9rem;letter-spacing:.28em}' +
    '#larmhud .lh-liv .tom{opacity:.22}' +
    '#larmhud .lh-mellis{flex:1}' +
    '#larmhud button{background:rgba(24,2,2,.55);border:1px solid rgba(255,75,75,.4);color:#ff8d80;cursor:pointer;' +
      'font:inherit;letter-spacing:inherit;text-transform:inherit;padding:.45rem .7rem;border-radius:2px}' +
    '#larmhud button:hover{border-color:#ff4b4b;color:#fff}' +
    '#larmmedd{position:fixed;left:50%;top:22%;transform:translateX(-50%);z-index:140;pointer-events:none;' +
      'font-family:var(--mono,monospace);font-size:clamp(.75rem,2.6vw,1.05rem);letter-spacing:.3em;text-transform:uppercase;' +
      'color:#ff6a5e;text-shadow:0 0 22px rgba(255,40,30,.6);white-space:nowrap;opacity:0;transition:opacity .3s ease}' +
    '#larmmedd.syns{opacity:1}' +
    '#larmhint{position:fixed;left:50%;top:3.4rem;transform:translateX(-50%);z-index:139;pointer-events:none;' +
      'font-family:var(--mono,monospace);font-size:.6rem;letter-spacing:.2em;text-transform:uppercase;color:#eae6dc;' +
      'background:rgba(12,12,13,.72);border:1px solid rgba(255,75,75,.35);padding:.55rem .9rem;white-space:nowrap;' +
      'opacity:0;transition:opacity .7s ease}' +
    '#larmhint.syns{opacity:1}' +
    '@media (pointer:coarse){#larmhint{display:none}}' +
    '#larmtouch{position:fixed;left:0;right:0;bottom:0;z-index:145;display:none;justify-content:space-between;' +
      'align-items:flex-end;padding:0 4vw calc(3vw + env(safe-area-inset-bottom,0px));pointer-events:none}' +
    '@media (pointer:coarse){#larmtouch{display:flex}}' +
    '#larmtouch .lt-grupp{display:flex;gap:3.5vw}' +
    '#larmtouch button{pointer-events:auto;touch-action:none;width:clamp(56px,15vw,84px);height:clamp(56px,15vw,84px);' +
      'border-radius:50%;border:1px solid rgba(255,120,110,.55);background:rgba(24,2,2,.45);color:#ffb3ab;' +
      'font-size:clamp(1.3rem,5vw,1.8rem);display:grid;place-items:center;-webkit-user-select:none;user-select:none}' +
    '#larmtouch button:active{background:rgba(255,60,50,.35)}' +
    '#larmseger{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:150;text-align:center;' +
      'background:rgba(12,12,13,.94);border:1px solid rgba(87,217,138,.5);box-shadow:0 0 80px rgba(87,217,138,.18);' +
      'padding:clamp(1.6rem,5vw,3rem) clamp(1.4rem,6vw,3.4rem);max-width:min(92vw,34rem)}' +
    '#larmseger .ls-rubrik{font-family:var(--mono,monospace);font-size:clamp(.8rem,3vw,1.1rem);letter-spacing:.34em;' +
      'text-transform:uppercase;color:#57d98a;text-shadow:0 0 26px rgba(87,217,138,.5)}' +
    '#larmseger .ls-text{margin-top:1.1rem;color:#eae6dc;font-family:var(--sans,sans-serif);font-size:clamp(.95rem,2.6vw,1.15rem);line-height:1.6}' +
    '#larmseger .ls-text a{color:#57d98a;text-decoration:none;border-bottom:1px solid rgba(87,217,138,.5)}' +
    '#larmseger .ls-text a:hover{border-color:#57d98a;text-shadow:0 0 22px rgba(87,217,138,.5)}' +
    '#larmseger .ls-knappar{display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;margin-top:1.8rem}' +
    '#larmseger button,#larmseger .ls-knappar a{display:inline-block;background:transparent;border:1px solid rgba(87,217,138,.5);color:#57d98a;cursor:pointer;' +
      'text-decoration:none;font-family:var(--mono,monospace);font-size:.66rem;letter-spacing:.22em;text-transform:uppercase;padding:.7rem 1.1rem}' +
    '#larmseger button:hover,#larmseger .ls-knappar a:hover{background:rgba(87,217,138,.12);border-color:#57d98a}' +
    '@media (prefers-reduced-motion:reduce){' +
      'html.larm main{animation:none}' +
      'html.larm #glob3d.boostlyser{animation:none}' +
      '#larmflash.blink{animation:none;background:rgba(255,30,20,.18)}' +
      '#larmflash.lugn{animation:none}' +
      '#larmhud .lh-varning{animation:none}' +
      'html.larm .nav,html.larmslut .nav{transition:none}' +
    '}';
  document.head.appendChild(stil);

  /* ————— spriterna: samma pixel-Jonas och AI-robot som i pixeljonas.js ————— */
  var JONAS = {
    width: 14, height: 20,
    palette: {"H":"#7a4a24","S":"#f6c99f","E":"#22242e","M":"#803024","R":"#e23b4e","P":"#3a4468","K":"#8a5a2b","G":"#45ff70","g":"#b9ffc9","D":"#9aa3ae"},
    frames: {
      idle: [
        '..............','..............','....H.HH.H....','....HHHHHH....','...HHHHHHHH...',
        '...HHHHHHHH...','...HHSSSSSS...','...HSSESSES...','.....SSMMMS...','......SSSS....',
        '....RRRRRR....','...RRRRRRRR...','...SRRRRRRS...','...SRRRRRRS...','...SPPPPPPS...',
        '....PPPPPP....','....PP..PP....','....PP..PP....','....PP..PP....','....KKK.KKK...',
      ],
      run1: [
        '..............','..............','.....H.HH.H...','.....HHHHHH...','....HHHHHHHH..',
        '....HHHHHHHH..','....HHSSSSSS..','....HSSESSES..','......SSMMMS..','.......SSSS...',
        '....RRRRRR....','...RRRRRRRR...','..SSRRRRRRSS..','....RRRRRR....','....PPPPPP....',
        '...PPP..PPP...','..KKP....PP...','.........PP...','.........PP...','.........KKK..',
      ],
      run2: [
        '..............','..............','.....H.HH.H...','.....HHHHHH...','....HHHHHHHH..',
        '....HHHHHHHH..','....HHSSSSSS..','....HSSESSES..','......SSMMMS..','.......SSSS...',
        '....RRRRRR....','...RRRRRRRR...','...SRRRRRRS...','....RRRRRR....','....PPPPPP....',
        '....PPP.PPP...','....PP...KKK..','....PP........','....PP........','....KKK.......',
      ],
      jump: [
        '..............','..............','..............','....H.HH.H....','....HHHHHH....',
        '...HHHHHHHH...','...HHHHHHHH...','...HHSSSSSS...','...HSSESSES...','..S..SSMMMS.S.',
        '..R...SSSS..R.','..RRRRRRRRRR..','....RRRRRR....','....RRRRRR....','....PPPPPP....',
        '...PPP..PPP...','..KKK....KKK..','..............','..............','..............',
      ],
      vinka1: [
        '...........SS.','...........S..','....H.HH.H.S..','....HHHHHH.S..','...HHHHHHHHS..',
        '...HHHHHHHHR..','...HHSSSSSSR..','...HSSESSESR..','.....SSMMMSR..','......SSSS.R..',
        '....RRRRRRRR..','...RRRRRRRR...','...SRRRRRR....','...SRRRRRR....','...SPPPPPP....',
        '....PPPPPP....','....PP..PP....','....PP..PP....','....PP..PP....','....KKK.KKK...',
      ],
      vinka2: [
        '..............','..............','....H.HH.H....','....HHHHHH....','...HHHHHHHH.SS',
        '...HHHHHHHH.S.','...HHSSSSSSR..','...HSSESSESR..','.....SSMMMSR..','......SSSS.R..',
        '....RRRRRRRR..','...RRRRRRRR...','...SRRRRRR....','...SRRRRRR....','...SPPPPPP....',
        '....PPPPPP....','....PP..PP....','....PP..PP....','....PP..PP....','....KKK.KKK...',
      ],
      svardupp: [
        '...........g..','...........G..','....H.HH.H.G..','....HHHHHH.G..','...HHHHHHHHG..',
        '...HHHHHHHHD..','...HHSSSSSSD..','...HSSESSESS..','.....SSMMMSR..','......SSSS.R..',
        '....RRRRRRRR..','...RRRRRRRR...','...SRRRRRR....','...SRRRRRR....','...SPPPPPP....',
        '....PPPPPP....','....PP..PP....','....PP..PP....','....PP..PP....','....KKK.KKK...',
      ],
    }
  };
  var ROBOT = {
    width: 14, height: 20,
    palette: {"L":"#9aa3ae","D":"#4d545e","E":"#ff4b4b","A":"#6ec1ff","G":"#2a2e35"},
    frames: {
      sta: [
        '.......A......','.......D......','....DDDDDD....','...DLLLLLLD...','...DLEEEELD...',
        '...DLLLLLLD...','....DDDDDD....','......DD......','..DDDDDDDDDD..','..DDLLLLLLDD..',
        '..DDLLAALLDD..','..DDLLAALLDD..','..DDLLLLLLDD..','...DLLLLLLD...','....DDDDDD....',
        '....DD..DD....','....DD..DD....','....DD..DD....','....DD..DD....','...DDD..DDD...',
      ],
      ga1: [
        '.......A......','.......D......','....DDDDDD....','...DLLLLLLD...','...DLEEEELD...',
        '...DLLLLLLD...','....DDDDDD....','......DD......','..DDDDDDDDDD..','..DDLLLLLLDD..',
        '..DDLLAALLDD..','..DDLLAALLDD..','..DDLLLLLLDD..','...DLLLLLLD...','....DDDDDD....',
        '...DD....DD...','...DD....DD...','..DD......DD..','..DD......DD..','.DDD......DDD.',
      ],
      ga2: [
        '.......A......','.......D......','....DDDDDD....','...DLLLLLLD...','...DLEEEELD...',
        '...DLLLLLLD...','....DDDDDD....','......DD......','..DDDDDDDDDD..','..DDLLLLLLDD..',
        '..DDLLAALLDD..','..DDLLAALLDD..','..DDLLLLLLDD..','...DLLLLLLD...','....DDDDDD....',
        '....DD..DD....','....DD..DD....','....DD..DD....','....DD..DD....','...DDD..DDD...',
      ],
      trasig: [
        '......A.......','.......D......','....DDDDDD....','...DLLLLLLD...','...DLGGGGLD...',
        '...DLLGLLLD...','....DDDDDD....','......DD......','..DDDDDDDDDD..','..DDLGLLLLDD..',
        '..DDLLGGLLDD..','..DDLLGGLLDD..','..DDLGLLGLDD..','...DLLLLLLD...','....DDDDDD....',
        '....DD..DD....','....DD..DD....','....DD..DD....','....DD..DD....','...DDD..DDD...',
      ],
    }
  };

  /* varje frame förritas på en liten canvas som sedan skalas upp pixligt */
  function gorFrames(sprite) {
    var ut = {};
    for (var namn in sprite.frames) {
      var c = document.createElement('canvas');
      c.width = sprite.width; c.height = sprite.height;
      var k = c.getContext('2d');
      var f = sprite.frames[namn];
      if (k) {
        for (var y = 0; y < f.length; y++) {
          for (var x = 0; x < f[y].length; x++) {
            var farg = sprite.palette[f[y].charAt(x)];
            if (farg) { k.fillStyle = farg; k.fillRect(x, y, 1, 1); }
          }
        }
      }
      ut[namn] = c;
    }
    return ut;
  }
  /* jetpacken: två tuber med remmar, munstycken och lågor */
  var JETPACK = {
    width: 12, height: 14,
    palette: {"D":"#4d545e","L":"#9aa3ae","R":"#e23b4e","G":"#ffd166"},
    frames: {
      ikon: [
        '..DD....DD..',
        '.DLLD..DLLD.',
        '.DLLD..DLLD.',
        '.DLLDDDDLLD.',
        '.DLLDLLDLLD.',
        '.DLLDLLDLLD.',
        '.DLLDLLDLLD.',
        '.DLLDDDDLLD.',
        '.DDDD..DDDD.',
        '..RR....RR..',
        '..GG....GG..',
        '............',
        '............',
        '............',
      ],
    }
  };
  /* π-symbolen som hänger i en vajer ovanför roboten */
  var PISYM = {
    width: 12, height: 10,
    palette: {"G":"#ffd166","g":"#b8912f"},
    frames: {
      pi: [
        'GGGGGGGGGGGG',
        'GGGGGGGGGGGG',
        'g.GG....GG.g',
        '..GG....GG..',
        '..GG....GG..',
        '..GG....GG..',
        '..GG....GG..',
        '..GG....GGg.',
        '.GGG....GGGg',
        '.GGg.....GG.',
      ],
    }
  };
  var jonasBilder = null, robotBilder = null, jetBild = null, piBild = null;   // ritas först när spelet startar

  function klamm(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  /* ————— ljudet: allt syntetiseras i Web Audio när larmet utlöses ————— */
  var ljud = (function () {
    var ctx = null, master = null, dron = null, tystat = false;

    function start() {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!ctx) {
        try {
          ctx = new AC();
          master = ctx.createGain();
          master.gain.value = tystat ? 0 : 0.5;
          master.connect(ctx.destination);
        } catch (e) { ctx = null; master = null; return; }   // spelet funkar utan ljud
      }
      if (ctx.state === 'suspended') ctx.resume();
    }
    function nu() { return ctx ? ctx.currentTime : 0; }
    function brus(dur) {
      var b = ctx.createBuffer(1, Math.max(1, Math.ceil(ctx.sampleRate * dur)), ctx.sampleRate);
      var d = b.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      return b;
    }
    function ton(typ, f0, f1, t, dur, vol) {           // enkel glidande ton
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = typ;
      o.frequency.setValueAtTime(Math.max(1, f0), t);
      if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + dur + 0.05);
    }

    function siren(dur) {                              // tvåtonigt larmhorn
      if (!ctx) return;
      var t = nu();
      [0, 4].forEach(function (detune) {
        var o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
        o.type = 'sawtooth'; o.detune.value = detune;
        f.type = 'lowpass'; f.frequency.value = 1500;
        for (var i = 0; i * 0.42 < dur; i++) o.frequency.setValueAtTime(i % 2 ? 466 : 349, t + i * 0.42);
        g.gain.setValueAtTime(0.0008, t);
        g.gain.linearRampToValueAtTime(0.09, t + 0.06);
        g.gain.setValueAtTime(0.09, t + Math.max(0.1, dur - 0.7));
        g.gain.linearRampToValueAtTime(0.0008, t + dur);
        o.connect(f); f.connect(g); g.connect(master);
        o.start(t); o.stop(t + dur + 0.05);
      });
    }
    function muller(dur) {                             // lågt mekaniskt muller
      if (!ctx) return;
      var t = nu();
      var n = ctx.createBufferSource(); n.buffer = brus(dur); n.loop = false;
      var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 110;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0008, t);
      g.gain.linearRampToValueAtTime(0.5, t + 0.25);
      g.gain.setValueAtTime(0.5, t + Math.max(0.3, dur - 0.8));
      g.gain.linearRampToValueAtTime(0.0008, t + dur);
      n.connect(f); f.connect(g); g.connect(master);
      n.start(t);
    }
    function dunk(nar, tyngd) {                        // tung duns när något landar
      if (!ctx) return;
      var t = nu() + (nar || 0), v = tyngd || 1;
      ton('sine', 110 + Math.random() * 50, 34, t, 0.26, 0.4 * v);
      var n = ctx.createBufferSource(); n.buffer = brus(0.09);
      var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.26 * v, t);
      g.gain.exponentialRampToValueAtTime(0.0008, t + 0.09);
      n.connect(f); f.connect(g); g.connect(master);
      n.start(t);
    }
    function klank(nar, bas) {                         // metalliskt skrammel
      if (!ctx) return;
      var t = nu() + (nar || 0);
      var f0 = bas || 300 + Math.random() * 420;
      [1, 2.76, 5.4].forEach(function (m, i) {
        ton('square', f0 * m, f0 * m * 0.985, t, 0.3 - i * 0.07, 0.05 / (i + 1));
      });
      var n = ctx.createBufferSource(); n.buffer = brus(0.05);
      var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 3200; f.Q.value = 1.2;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.1, t);
      g.gain.exponentialRampToValueAtTime(0.0008, t + 0.06);
      n.connect(f); f.connect(g); g.connect(master);
      n.start(t);
    }
    function hopp() { if (ctx) ton('square', 150, 330, nu(), 0.09, 0.06); }
    function vind(glob) {                              // uppvinden — globen klingar till
      if (!ctx) return;
      var t = nu();
      var n = ctx.createBufferSource(); n.buffer = brus(0.4);
      var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.8;
      f.frequency.setValueAtTime(500, t);
      f.frequency.exponentialRampToValueAtTime(2400, t + 0.35);
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.09, t);
      g.gain.exponentialRampToValueAtTime(0.0008, t + 0.4);
      n.connect(f); f.connect(g); g.connect(master);
      n.start(t);
      if (glob) ton('sine', 520, 1560, t, 0.4, 0.05);
    }
    function boing() {                                 // studsmattan
      if (!ctx) return;
      var t = nu();
      ton('sine', 170, 640, t, 0.26, 0.14);
      ton('square', 340, 1280, t, 0.18, 0.04);
    }
    function stomp() { if (!ctx) return; ton('square', 520, 150, nu(), 0.13, 0.12); klank(0.02, 520); }
    function aj() {                                    // Jonas blir träffad
      if (!ctx) return;
      var t = nu();
      ton('sawtooth', 130, 60, t, 0.28, 0.16);
      var n = ctx.createBufferSource(); n.buffer = brus(0.14);
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.1, t);
      g.gain.exponentialRampToValueAtTime(0.0008, t + 0.14);
      n.connect(g); g.connect(master);
      n.start(t);
    }
    function skott() { if (ctx) ton('sawtooth', 1500, 210, nu(), 0.2, 0.09); }   // robotens laser
    function robotvak() {                              // roboten vaknar: stigande motorvarv
      if (!ctx) return;
      var t = nu();
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(52, t);
      o.frequency.exponentialRampToValueAtTime(240, t + 0.9);
      g.gain.setValueAtTime(0.0008, t);
      g.gain.linearRampToValueAtTime(0.12, t + 0.15);
      g.gain.exponentialRampToValueAtTime(0.0008, t + 1.1);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + 1.15);
      ton('square', 1174, 1174, t + 0.35, 0.09, 0.05);
      ton('square', 1174, 1174, t + 0.55, 0.09, 0.05);
    }
    function plocka() {                                // jetpacken är din!
      if (!ctx) return;
      var t = nu();
      [659, 880, 1319].forEach(function (f, i) { ton('square', f, f, t + i * 0.07, 0.1, 0.07); });
    }
    var jetLjud = null;
    function jetStart() {                              // raketmuller så länge man håller
      if (!ctx || jetLjud) return;
      var n = ctx.createBufferSource(); n.buffer = brus(1); n.loop = true;
      var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 340; f.Q.value = 0.7;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0008, nu());
      g.gain.linearRampToValueAtTime(0.1, nu() + 0.08);
      n.connect(f); f.connect(g); g.connect(master);
      n.start();
      jetLjud = { n: n, g: g };
    }
    function jetStopp() {
      if (!ctx || !jetLjud) return;
      var j = jetLjud; jetLjud = null;
      j.g.gain.linearRampToValueAtTime(0.0008, nu() + 0.12);
      setTimeout(function () { try { j.n.stop(); } catch (e) {} }, 200);
    }
    function fanfar() {                                // segern!
      if (!ctx) return;
      var t = nu();
      [523, 659, 784, 1047].forEach(function (f, i) { ton('square', f, f, t + i * 0.13, 0.14, 0.07); });
      [523, 659, 784, 1047].forEach(function (f) { ton('square', f, f, t + 0.56, 0.85, 0.05); });
    }
    function dronStart() {                             // olycksbådande bakgrundssurr
      if (!ctx || dron) return;
      var g = ctx.createGain(); g.gain.value = 0.055;
      var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 170;
      var o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 41.2;
      var o2 = ctx.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = 41.8;
      var lfo = ctx.createOscillator(); lfo.frequency.value = 0.13;
      var lfoG = ctx.createGain(); lfoG.gain.value = 0.028;
      lfo.connect(lfoG); lfoG.connect(g.gain);
      o1.connect(f); o2.connect(f); f.connect(g); g.connect(master);
      o1.start(); o2.start(); lfo.start();
      dron = { g: g, stopp: function () { try { o1.stop(); o2.stop(); lfo.stop(); } catch (e) {} } };
    }
    function dronStopp() {
      if (!ctx || !dron) return;
      var d = dron; dron = null;
      d.g.gain.linearRampToValueAtTime(0.0008, nu() + 0.6);
      setTimeout(d.stopp, 700);
    }
    function tyst(pa) {
      tystat = pa;
      if (ctx && master) master.gain.linearRampToValueAtTime(pa ? 0 : 0.5, nu() + 0.15);
    }
    function stangAv() {
      dronStopp();
      jetLjud = null;                                  // dör med kontexten
      if (ctx && master) master.gain.linearRampToValueAtTime(0.0008, nu() + 0.5);
      var gml = ctx;
      ctx = null; master = null; dron = null;
      if (gml) setTimeout(function () { try { gml.close(); } catch (e) {} }, 800);
    }
    return { start: start, siren: siren, muller: muller, dunk: dunk, klank: klank,
             hopp: hopp, vind: vind, boing: boing, stomp: stomp, aj: aj, skott: skott,
             robotvak: robotvak, fanfar: fanfar, plocka: plocka, jetStart: jetStart, jetStopp: jetStopp,
             dronStart: dronStart, dronStopp: dronStopp, tyst: tyst,
             arTyst: function () { return tystat; }, stangAv: stangAv };
  })();

  /* ————— raset: sidans synliga delar faller ner lite snett ————— */
  var FALLSEL = [
    '.scene--hero h1', '.scene--hero .tagline', '.scene--hero .merits', '.scene--hero .ctas',
    '.label', '.proj h3', '.proj p.desc', '.proj .feat', '.proj p.meta', '.pvis',
    '.kursram', '#kurs p.meta',
    '.vplayer', '#videor p.meta', '.soc a', 'p.big',
    '.nbplan', '#nbrev .falt', '#nbrev .knapp',
    '#kontakt p.desc', '#kform .falt', '#kform .skicka', '.pixelscen',
    'footer .rad', '.pistrom', 'footer p', '#intelarm'
  ].join(',');
  var fallna = [];        // { el, transition0, transform0, will0 }

  function faller() {
    var alla = [].slice.call(document.querySelectorAll(FALLSEL));
    var lov = alla.filter(function (el) {              // bara "löv" — inget dubbelfall i fall
      return !alla.some(function (b) { return b !== el && b.contains(el); });
    });
    fallna = [];
    var maxDunsar = 9, dunsar = 0;
    lov.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;         // gömda element rasar inte
      var dy = 40 + Math.random() * 110;
      var dx = (Math.random() * 2 - 1) * 36;
      var rot = (Math.random() * 2 - 1) * 9;
      fallna.push({ el: el, rot: rot,
                    transition0: el.style.transition, transform0: el.style.transform,
                    will0: el.style.willChange });
      var drj = Math.random() * 0.55;
      var dur = 0.7 + Math.random() * 0.35;
      el.style.willChange = 'transform';
      if (reduced) {
        el.style.transition = 'none';
      } else {
        el.style.transition = 'transform ' + dur.toFixed(2) + 's cubic-bezier(.42,.02,.9,.5) ' + drj.toFixed(2) + 's';
      }
      el.style.transform = 'translate(' + dx.toFixed(0) + 'px,' + dy.toFixed(0) + 'px) rotate(' + rot.toFixed(1) + 'deg)';
      if (!reduced && dunsar < maxDunsar && r.width > 120 && Math.random() < 0.5) {
        dunsar++;
        ljud.dunk(drj + dur * 0.96, 0.5 + Math.min(1, r.width / 700));
        if (Math.random() < 0.6) ljud.klank(drj + dur * 0.96 + 0.04);
      }
    });
    if (!reduced) { ljud.dunk(1.5, 1.4); ljud.klank(1.55, 210); }   // sista stora dunsen
  }

  function res(el4) {                                  // allt svävar tillbaka på plats
    fallna.forEach(function (f, i) {
      f.el.style.transition = reduced ? 'none'
        : 'transform 1.05s cubic-bezier(.16,1,.3,1) ' + ((i % 7) * 0.05).toFixed(2) + 's';
      f.el.style.transform = f.transform0 || '';
    });
    setTimeout(function () {
      fallna.forEach(function (f) {
        f.el.style.transition = f.transition0 || '';
        f.el.style.transform = f.transform0 || '';
        f.el.style.willChange = f.will0 || '';
      });
      fallna = [];
      if (el4) el4();
    }, 1500);
  }

  /* ————— plattformarna: den synliga grafiken själv — varje ord, bild,
     ikon och ram blir sin egen plattform, tätt runt det man faktiskt ser ————— */
  var plattformar = [], varldB = 0, varldH = 0, markY = 0;
  var BOXSEL = 'img,canvas,svg,video,iframe';         // grafik: hela lådan
  var RAMSEL = '.fico,.vram,.tstavla';                // synliga ramar/plattor
  var LINJESEL = 'input,textarea,.pixelscen';         // bara understrykningen syns

  function laggPlatta(l, t, w, h, sy, studs, lut) {     // t gäller vid vänstra kanten
    var x0 = Math.max(0, l), x1 = Math.min(varldB, l + w);
    if (x1 - x0 < 10 || h < 2 || h > 900) return;
    plattformar.push({ x: x0, y: t + sy + (x0 - l) * (lut || 0),
                       w: x1 - x0, h: h, studs: !!studs, lut: lut || 0 });
  }
  function ytaY(p, x) {                                 // plattformens ovansida vid x
    return p.lut ? p.y + (klamm(x, p.x, p.x + p.w) - p.x) * p.lut : p.y;
  }
  /* AABB:n för ett roterat block är större än blocket självt — räkna fram
     den faktiska (lutande) kantlinjen: ovansidan för text/lådor, undersidan
     för formulärfältens streck. Lutningen är alltid tan(elementets vinkel). */
  function lutKant(l, t, W, H, rad, botten) {
    var s = Math.sin(rad), c = Math.cos(rad);
    if (Math.abs(s) < 0.008) return { x: l, y: botten ? t + H - 3 : t, w: W };
    var nam = c * c - s * s;
    var w0 = (W * c - H * Math.abs(s)) / nam;
    var h0 = (H * c - W * Math.abs(s)) / nam;
    if (w0 < 8 || h0 < 0) return { x: l, y: botten ? t + H - 3 : t, w: W };
    var cx = l + W / 2, cy = t + H / 2;
    var teck = botten ? 1 : -1;
    return { x: cx - w0 / 2 * c - teck * h0 / 2 * s,
             y: cy - w0 / 2 * s + teck * h0 / 2 * c - (botten ? 3 : 0),
             w: w0 * c, lut: s / c };
  }
  /* frilagda bilder: krympa lådan till det synliga innehållet (alfakanalen) */
  var trimCache = {};
  function bildTrim(img) {
    var src = img.currentSrc || img.src;
    if (!src || !img.naturalWidth) return null;
    if (src in trimCache) return trimCache[src];
    var ut = null;
    try {
      var W2 = 48, H2 = Math.max(1, Math.round(W2 * img.naturalHeight / img.naturalWidth));
      var c = document.createElement('canvas');
      c.width = W2; c.height = H2;
      var k = c.getContext('2d', { willReadFrequently: true });
      k.drawImage(img, 0, 0, W2, H2);
      var d = k.getImageData(0, 0, W2, H2).data;
      var x0 = W2, x1 = -1, y0 = H2, y1 = -1;
      for (var y = 0; y < H2; y++) {
        for (var x = 0; x < W2; x++) {
          if (d[(y * W2 + x) * 4 + 3] > 40) {
            if (x < x0) x0 = x; if (x > x1) x1 = x;
            if (y < y0) y0 = y; if (y > y1) y1 = y;
          }
        }
      }
      if (x1 >= x0) ut = { l: x0 / W2, t: y0 / H2, r: (x1 + 1) / W2, b: (y1 + 1) / H2 };
    } catch (e) { ut = null; }                          // ej läsbar (CORS): hela lådan får duga
    trimCache[src] = ut;
    return ut;
  }
  function samlaPlattor(nod, sy, rad) {
    if (nod.nodeType === 3) {                          // textnod: ord för ord
      var txt = nod.nodeValue;
      if (!txt || !txt.trim()) return;
      var re = /\S+/g, m;
      while ((m = re.exec(txt))) {
        var rng = document.createRange();
        rng.setStart(nod, m.index);
        rng.setEnd(nod, m.index + m[0].length);
        var rs = rng.getClientRects();
        for (var i = 0; i < rs.length; i++) {
          if (rs[i].height > 240) continue;            // roterad jättelång rad: skev låda
          var ko = lutKant(rs[i].left, rs[i].top, rs[i].width, rs[i].height, rad, false);
          laggPlatta(ko.x, ko.y, ko.w, rs[i].height, sy, false, ko.lut);
        }
      }
      return;
    }
    if (nod.nodeType !== 1 || !nod.matches) return;
    var cs = getComputedStyle(nod);                    // osynligt ger inga kollisionsytor
    if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) < 0.1) return;
    var r, ka;
    if (nod.matches(LINJESEL)) {                       // fältens/scenens hårlinje: undersidan
      r = nod.getBoundingClientRect();
      ka = lutKant(r.left, r.top, r.width, r.height, rad, true);
      laggPlatta(ka.x, ka.y, ka.w, 3, sy, false, ka.lut);
      return;
    }
    if (nod.matches(RAMSEL) || nod.matches(BOXSEL)) {
      r = nod.getBoundingClientRect();
      var studs = nod.matches('.kobj') || !!(nod.closest && nod.closest('.soc'));
      if (nod.tagName === 'IMG') {
        var tr = bildTrim(nod);
        if (tr) {
          ka = lutKant(r.left + r.width * tr.l, r.top + r.height * tr.t,
                       r.width * (tr.r - tr.l), r.height * (tr.b - tr.t), rad, false);
          laggPlatta(ka.x, ka.y, ka.w, r.height * (tr.b - tr.t), sy, studs, ka.lut);
          return;
        }
      }
      ka = lutKant(r.left, r.top, r.width, r.height, rad, false);
      laggPlatta(ka.x, ka.y, ka.w, r.height, sy, studs, ka.lut);
      return;
    }
    if (nod.matches('.kursram')) {                     // ramen + de svävande objekten runt den
      r = nod.getBoundingClientRect();
      ka = lutKant(r.left, r.top, r.width, r.height, rad, false);
      laggPlatta(ka.x, ka.y, ka.w, r.height, sy, false, ka.lut);
    }
    for (var b = nod.firstChild; b; b = b.nextSibling) samlaPlattor(b, sy, rad);
  }
  function matPlattformar() {
    var sy = window.scrollY || window.pageYOffset;
    varldB = window.innerWidth;
    varldH = docEl.scrollHeight;
    markY = varldH - 4;
    plattformar = [];
    fallna.forEach(function (f) { samlaPlattor(f.el, sy, (f.rot || 0) * Math.PI / 180); });
    matBoostZoner(sy);
  }

  /* ————— uppvindarna: appgrafiken bär en uppåt när man åker förbi ————— */
  var boostZoner = [];
  var ACCFARG = { bla: '#5fb2ff', lila: '#b18cff', gron: '#57d98a' };
  var ACCRGB = { bla: '95,178,255', lila: '177,140,255', gron: '87,217,138' };
  function matBoostZoner(sy) {
    boostZoner.forEach(function (z) { z.el.classList.remove('boostlyser'); });
    boostZoner = [];
    [].forEach.call(document.querySelectorAll('.globpromo'), function (el) {
      var r = el.getBoundingClientRect();
      if (r.width < 40 || r.height < 40) return;
      var proj = el.closest('.proj');
      var acc = proj && proj.getAttribute('data-accent');
      boostZoner.push({ el: el, x: r.left - 20, y: r.top + sy, w: r.width + 40, h: r.height,
                        farg: ACCFARG[acc] || '#5fb2ff', rgb: ACCRGB[acc] || ACCRGB.bla,
                        glob: el.id === 'glob3d', inne: false, sist: 0 });
    });
  }

  /* ————— tangenter, pekare och touch-knappar ————— */
  var tang = { v: false, h: false, upp: false, ner: false, jet: false };
  var hoppBuf = 0;
  var jet = null;                                     // { x, y, tagen, fuel } — sätts när spelet startar
  var finPekare = matchMedia('(pointer:fine)').matches;

  function nyckel(e) {
    var k = e.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') return 'v';
    if (k === 'ArrowRight' || k === 'd' || k === 'D') return 'h';
    if (k === 'ArrowUp' || k === 'w' || k === 'W' || k === ' ' || k === 'Spacebar') return 'upp';
    if (k === 'ArrowDown' || k === 's' || k === 'S') return 'ner';
    if (k === 'x' || k === 'X') return 'trad';
    if (k === 'Escape') return 'avbryt';
    return null;
  }
  function tangNer(e) {
    var n = nyckel(e);
    if (!n) return;
    e.preventDefault();
    if (n === 'avbryt') { avsluta(); return; }
    if (n === 'trad') {                               // X: jetpacken (när man hittat den)
      if (jet && jet.tagen) tang.jet = true;
      return;
    }
    if (n === 'upp' && !tang.upp) hoppBuf = 0.14;
    tang[n] = true;
  }
  function tangUpp(e) {
    var n = nyckel(e);
    if (!n || n === 'avbryt') return;
    e.preventDefault();
    if (n === 'trad') { tang.jet = false; return; }
    tang[n] = false;
  }
  function slappAllt() {                                // keyup:ar som försvann vid Alt-Tab
    tang.v = tang.h = tang.upp = tang.ner = tang.jet = false;
    hoppBuf = 0;
  }

  /* ————— spelaren: pixel-Jonas med tyngdlag, hopp och jetpack ————— */
  var SK = 3, SPW = JONAS.width * SK, SPH = JONAS.height * SK;   // ritstorlek
  var G = 2100, MAXFALL = 1400, SPRING = 300, HOPPV = 920;
  var sp = null;          // { x, y (fötterna), vx, vy, dir, mark, hj, invuln, stegT, steg, coyote, tumla, resa }
  var spawnX = 0, scenEl = null;

  function initSpelare() {
    /* figuren från pixelscenen ramlar ur sin värld och blir spelaren */
    var sy = window.scrollY || window.pageYOffset;
    var borjX = null, borjY = markY, franFigur = false;
    var fig = document.querySelector('.pixelscen canvas.pixfig:not(.pixhund):not(.pixrobot):not(.pixchok):not(.pixhjarta):not(.pixfar)');
    if (fig) {
      var rf = fig.getBoundingClientRect();
      if (rf.width) { borjX = rf.left + rf.width / 2; borjY = Math.min(rf.bottom + sy, markY); franFigur = true; }
    }
    if (borjX == null) {
      var rk = knapp.getBoundingClientRect();
      borjX = rk.left + rk.width / 2;
    }
    spawnX = klamm(borjX, 40, varldB - 40);
    sp = { x: spawnX, y: borjY, vx: 0, vy: 0, dir: 1, mark: !franFigur, hj: 3,
           invuln: 1.2, stegT: 0, steg: 0, coyote: 0,
           tumla: franFigur ? 1 : 0, rotT: 0, resa: 0 };
    scenEl = fig ? fig.closest('.pixelscen') : null;    // figuren lämnar sin lilla värld …
    if (scenEl) scenEl.classList.add('figurborta');     // … i just detta ögonblick
    if (!franFigur) poff(sp.x, sp.y - SPH / 2, '#ffd166', 16);
  }

  function uppdateraSpelare(dt) {
    if (!sp) return;
    var varMark = sp.mark;                             // stod han förra bilden?
    if (sp.invuln > 0) sp.invuln -= dt;
    if (sp.resa > 0) sp.resa -= dt;
    if (hoppBuf > 0) hoppBuf -= dt;
    var styrLast = sp.tumla > 0 || sp.resa > 0;        // under fallet/uppresningen: ingen styrning

    /* styrning */
    var gaV = tang.v && !styrLast, gaH = tang.h && !styrLast;
    var acc = sp.mark ? 2600 : 1500;
    if (gaV) { sp.vx -= acc * dt; sp.dir = -1; }
    if (gaH) { sp.vx += acc * dt; sp.dir = 1; }
    if (!gaV && !gaH) {
      var br = (sp.mark ? 2300 : 350) * dt;
      if (sp.vx > br) sp.vx -= br; else if (sp.vx < -br) sp.vx += br; else sp.vx = 0;
    }
    sp.vx = klamm(sp.vx, -SPRING, SPRING);

    /* hopp (med coyotetid) */
    if (sp.mark) sp.coyote = 0.09; else if (sp.coyote > 0) sp.coyote -= dt;
    if (hoppBuf > 0 && !styrLast && sp.coyote > 0) {
      sp.vy = -HOPPV; sp.mark = false; sp.coyote = 0;
      hoppBuf = 0; ljud.hopp();
    }

    /* tyngdlag + integrering */
    sp.vy = Math.min(MAXFALL, sp.vy + G * dt);

    /* jetpacken: håll X (eller 🚀) så bär raketerna uppåt — tills tanken sinar */
    if (jet && jet.tagen && tang.jet && jet.fuel > 0 && !styrLast) {
      sp.vy = Math.max(-560, sp.vy - 4300 * dt);
      sp.mark = false;
      jet.fuel = Math.max(0, jet.fuel - dt / 1.7);
      ljud.jetStart();
      for (var fl = 0; fl < 2; fl++) {
        partiklar.push({ x: sp.x - 8 + Math.random() * 16, y: sp.y - 8,
                         vx: (Math.random() - 0.5) * 70, vy: 190 + Math.random() * 150,
                         t: 0, liv: 0.26 + Math.random() * 0.16,
                         farg: fl ? '#ffd166' : '#ff8c3a', st: 3, g: 0 });
      }
    } else ljud.jetStopp();

    /* uppvindarna: glid in framför appgrafiken och dras med uppåt */
    if (!styrLast) {
      for (var bz = 0; bz < boostZoner.length; bz++) {
        var z = boostZoner[bz];
        var inne = sp.x + 14 > z.x && sp.x - 14 < z.x + z.w &&
                   sp.y > z.y && sp.y - SPH < z.y + z.h;
        if (inne) {
          sp.vy = Math.max(-700, sp.vy - 3200 * dt);
          sp.mark = false;
          z.sist = spel.t;
          if (!z.inne) {                               // in i vinden: grafiken lyser till
            z.inne = true;
            if (z.glob) z.el.classList.add('boostlyser');   // globen snurrar loss
            ljud.vind(z.glob);
          }
          if (Math.random() < dt * 40) {
            partiklar.push({ x: sp.x - 16 + Math.random() * 32, y: sp.y - Math.random() * 30,
                             vx: (Math.random() - 0.5) * 50, vy: -120 - Math.random() * 160,
                             t: 0, liv: 0.4 + Math.random() * 0.25, farg: z.farg, st: 3, g: 0 });
          }
        } else if (z.inne && spel.t - z.sist > 0.45) {
          z.inne = false;
          if (z.glob) z.el.classList.remove('boostlyser');
        }
      }
    }

    var fotY0 = sp.y;
    sp.x += sp.vx * dt;
    sp.y += sp.vy * dt;
    if (sp.tumla && !sp.mark) sp.rotT += dt;           // figuren tumlar ur sin scen

    /* världens kanter */
    sp.x = klamm(sp.x, SPW / 2, varldB - SPW / 2);
    if (sp.y - SPH < 0) { sp.y = SPH; if (sp.vy < 0) sp.vy = 0; }

    /* landa: marken + grafikens ovansidor (enkelriktade) — under
       introfallet rasar figuren obehindrat ända ner till marken */
    sp.mark = false;
    if (sp.y >= markY) { sp.y = markY; sp.vy = 0; sp.mark = true; }
    else if (sp.vy >= 0 && !sp.tumla) {
      for (var i = 0; i < plattformar.length; i++) {
        var p = plattformar[i];
        if (sp.x + 12 < p.x || sp.x - 12 > p.x + p.w) continue;
        var py = ytaY(p, sp.x);                        // lutande kant: ytan vid spelarens x
        if (fotY0 <= py + (p.lut ? 9 : 1) &&           // (nedför lutning: limma mot ytan)
            sp.y >= py - (varMark && p.lut ? 8 : 0)) {
          if (p.studs) {                               // studsmatta! upp i det blå
            sp.y = py; sp.vy = -1250;
            ljud.boing();
            poff(sp.x, sp.y, '#ffd166', 10);
          } else {
            sp.y = py; sp.vy = 0; sp.mark = true;
          }
          break;
        }
      }
    }
    if (sp.mark && sp.tumla) {                          // framme: res dig — nu är det du som är figuren
      sp.tumla = 0; sp.rotT = 0; sp.resa = 0.65;
      poff(sp.x, sp.y - SPH / 2, '#ffd166', 16);
      ljud.dunk(0, 0.8);
    }
    if (jet && jet.tagen && sp.mark && jet.fuel < 1) {  // på fast mark laddar tanken snabbt
      jet.fuel = Math.min(1, jet.fuel + dt / 1.8);
    }

    /* jetpacken plockas upp */
    if (jet && !jet.tagen &&
        Math.abs(sp.x - jet.x) < 36 && Math.abs(sp.y - SPH / 2 - (jet.y - 22)) < 52) {
      jet.tagen = true;
      jet.fuel = 1;
      ljud.plocka();
      poff(jet.x, jet.y - 22, '#ffd166', 20);
      medd(finPekare ? 'Jetpack! Håll X för att flyga' : 'Jetpack! Håll 🚀 för att flyga', 3.2);
      if (touch) {
        var tb = touch.querySelector('button[data-t="trad"]');
        if (tb) tb.style.display = '';
      }
    }

    /* springsteg för animationen */
    if (sp.mark && Math.abs(sp.vx) > 20) {
      sp.stegT += dt;
      if (sp.stegT > 0.13) { sp.stegT = 0; sp.steg = 1 - sp.steg; }
    } else sp.stegT = 0.12;
  }

  function skada(rikt) {
    if (!sp || sp.invuln > 0 || spel.segrat) return;
    sp.hj--;
    uppdateraHjartan();
    ljud.aj();
    poff(sp.x, sp.y - SPH / 2, '#ff4b4b', 12);
    if (flash) { flash.classList.add('aj'); setTimeout(function () { if (flash) flash.classList.remove('aj'); }, 260); }
    if (sp.hj <= 0) {
      medd('Aj! Roboten vann den ronden …', 2.6);
      sp.x = spawnX; sp.y = markY; sp.vx = 0; sp.vy = 0;
      sp.hj = 3; sp.invuln = 2.2;
      uppdateraHjartan();
    } else {
      sp.invuln = 1.6;
      sp.vx = 340 * (rikt || (sp.dir * -1));
      sp.vy = -360;
    }
  }

  /* ————— roboten som vaktar däruppe ————— */
  var RSK = 6, ROW = ROBOT.width * RSK, ROH = ROBOT.height * RSK;
  var robo = null, skotten = [], pi = null, piOm = 0;

  function placeraJetpack() {
    /* jetpacken måste gå att nå med bara ben: sök upp alla plattformar som
       är hoppbara från marken (studsmattor når högre) och lägg den på den
       nåbara plattform som ligger närmast målhöjden en bra bit upp — där
       hoppvägen tar slut byggs varningsrandiga hjälpbalkar som bro */
    var HOJD = 195, STUDS = 360, HORIS = 235;
    var malY = varldH * 0.62;
    function sok() {
      var mark = new Array(plattformar.length);
      var ko = [{ x: 0, y: markY, w: varldB, studs: false }];
      var bast = null, bd = 1e9, topp = null;
      while (ko.length) {
        var a = ko.pop();
        for (var i = 0; i < plattformar.length; i++) {
          if (mark[i]) continue;
          var b = plattformar[i];
          var gap = Math.max(0, Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w)));
          if (gap > HORIS || b.y < a.y - (a.studs ? STUDS : HOJD) - 1) continue;
          mark[i] = true;
          ko.push(b);
          if (!topp || b.y < topp.y) topp = b;
          if (b.w >= 90) {
            var d = Math.abs(b.y - malY);
            if (d < bd) { bd = d; bast = b; }
          }
        }
      }
      return { bast: bast, topp: topp };
    }
    var s = sok(), varv = 0;
    while (s.topp && s.topp.y > malY + 60 && varv < 18) {
      var bx = klamm(s.topp.x + s.topp.w / 2 + (varv % 2 ? -130 : 130), 70, varldB - 70);
      plattformar.push({ x: bx - 55, y: s.topp.y - 160, w: 110, h: 12, hjalp: true });
      varv++;
      s = sok();
    }
    if (jet && jet.tagen) return;                       // balkarna byggs, packen är redan din
    if (s.bast) {
      var jx = klamm(s.bast.x + s.bast.w / 2, 60, varldB - 60);
      jet = { x: jx, y: ytaY(s.bast, jx), tagen: false, fuel: 1 };
    } else {
      jet = { x: varldB / 2, y: markY - 200, tagen: false, fuel: 1 };
    }
  }

  function initRobot() {
    var plat = null;                                    // bred plattform högst upp —
    for (var i = 0; i < plattformar.length; i++) {      // med takhöjd för π-arenan
      var p = plattformar[i];
      if (p.w < 180 || p.y < 380) continue;
      if (!plat || p.y < plat.y) plat = p;
    }
    if (!plat) {                                        // reserv: måste gå att nå och stå på
      plat = { x: varldB * 0.2, y: 420, w: varldB * 0.6, h: 20 };
      plattformar.push(plat);
    }
    robo = { x: plat.x + plat.w * 0.62, y: ytaY(plat, plat.x + plat.w * 0.62), dir: -1, plat: plat, gick: false,
             vaknat: false, stampad: false, dod: 0, rot: 0,
             stegT: 0, steg: 0, skottT: 2.2, stagger: 0, segerVisad: false };
    skotten = [];
    piOm = 0;
    initPi();
  }

  /* π-symbolen hänger i en vajer ovanför — lura roboten att skjuta ner den!
     (aldrig ovanför sidans topp, och alltid med luft ner till robothuvudet) */
  function initPi() {
    var plat = robo.plat;
    var piX = klamm(plat.x + plat.w * 0.35, 60, varldB - 60);
    var basY = ytaY(plat, piX);
    pi = { x: piX, y: Math.min(Math.max(basY - 310, 80), basY - ROH - 26),
           vy: 0, faller: false, klar: false };
  }

  function uppdateraPi(dt) {
    if (piOm > 0 && robo && robo.dod <= 0) {            // en ny π hissas ner
      piOm -= dt;
      if (piOm <= 0) initPi();
    }
    if (!pi || !pi.faller || pi.klar) return;
    pi.vy += G * dt;
    pi.y += pi.vy * dt;
    if (robo && robo.dod <= 0 && Math.abs(pi.x - robo.x) < 80 && pi.y >= robo.y - ROH) {
      pi.klar = true;                                   // KLONK — rakt i plåten
      poff(pi.x, pi.y, '#ffd166', 26);
      ljud.dunk(0, 1.6); ljud.klank(0.05, 140);
      medd('3,14159 … mitt i prick!', 3);
      robo.dod = 0.001;
      konfetti(robo.x, robo.y - ROH / 2);
    } else if (robo && pi.y >= ytaY(robo.plat, pi.x)) { // missade: krossas — en ny hissas ner
      pi.klar = true;
      poff(pi.x, robo.plat.y, '#ffd166', 20);
      ljud.klank(0, 300); ljud.dunk(0, 0.9);
      medd('π i kras! En ny hissas ner …', 2.6);
      piOm = 3.5;
    }
  }

  function uppdateraRobot(dt) {
    if (!robo || !sp) return;
    if (robo.dod > 0) {                                 // besegrad: välter och slocknar
      robo.dod += dt;
      robo.rot = -Math.min(1, robo.dod / 0.8) * Math.PI / 2 * -robo.dir;
      if (robo.dod > 1.4 && !robo.segerVisad) { robo.segerVisad = true; seger(); }
      return;
    }
    robo.stegT += dt;
    if (robo.stegT > 0.16) { robo.stegT = 0; robo.steg = 1 - robo.steg; }
    robo.y = ytaY(robo.plat, robo.x);                   // följ plattformens lutning
    if (robo.stagger > 0) { robo.stagger -= dt; return; }

    var dxSp = sp.x - robo.x, dySp = (sp.y - SPH / 2) - (robo.y - ROH / 2);
    if (!robo.vaknat) {
      if (sp.y < robo.y + 1000) {                       // inkräktaren är nära!
        robo.vaknat = true;
        ljud.robotvak();
        medd('⚠ Inkräktare upptäckt ⚠', 2.4);
      } else {                                          // lugn vaktpatrull
        robo.x += robo.dir * 46 * dt;
        if (robo.x < robo.plat.x + ROW / 2) robo.dir = 1;
        if (robo.x > robo.plat.x + robo.plat.w - ROW / 2) robo.dir = -1;
        robo.gick = true;
        return;
      }
    }
    robo.dir = dxSp < 0 ? -1 : 1;                       // vänd mot Jonas
    robo.gick = false;
    if (Math.abs(dySp) < 260 && Math.abs(dxSp) > 60) {  // jaga på plattformen
      var fore = robo.x;
      robo.x += robo.dir * 105 * dt;
      robo.x = klamm(robo.x, robo.plat.x + ROW / 2, robo.plat.x + robo.plat.w - ROW / 2);
      robo.gick = robo.x !== fore;
    }
    robo.skottT -= dt;
    if (robo.skottT <= 0 && Math.hypot(dxSp, dySp) < 860) {
      robo.skottT = 1.8 + Math.random() * 1.2;
      var mx = robo.x - robo.dir * 6, my = robo.y - ROH * 0.78;    // från kroppens mitt
      var vd = Math.hypot(sp.x - mx, sp.y - SPH / 2 - my) || 1;
      skotten.push({ x: mx, y: my,
                     vx: (sp.x - mx) / vd * 330, vy: (sp.y - SPH / 2 - my) / vd * 330, t: 0 });
      ljud.skott();
    }
  }

  function uppdateraSkott(dt) {
    for (var i = skotten.length - 1; i >= 0; i--) {
      var b = skotten[i];
      b.t += dt;
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.t > 3.5 || b.x < -40 || b.x > varldB + 40) { skotten.splice(i, 1); continue; }
      if (pi && !pi.faller && !pi.klar &&               // skottet kapar π:s vajer!
          Math.abs(b.x - pi.x) < 52 && Math.abs(b.y - (pi.y - 35)) < 42) {
        skotten.splice(i, 1);
        pi.faller = true;
        ljud.klank(0, 520);
        poff(pi.x, pi.y - 60, '#ffd166', 10);
        continue;
      }
      if (sp && sp.invuln <= 0 &&
          Math.abs(b.x - sp.x) < 18 && b.y > sp.y - SPH - 6 && b.y < sp.y + 6) {
        skotten.splice(i, 1);
        skada(b.vx > 0 ? 1 : -1);
      }
    }
  }

  function kollaRobotTraff() {
    if (!robo || !sp || robo.dod > 0) return;
    var overlX = Math.abs(sp.x - robo.x) < (ROW / 2 + 10);
    if (!overlX) return;
    var huvudTopp = robo.y - ROH, huvudBotten = robo.y - ROH * 0.72;
    if (sp.vy > 0 && sp.y > huvudTopp && sp.y < huvudBotten + 26) {   // stamp: pansaret håller
      sp.vy = -620; sp.mark = false;
      ljud.klank(0, 640);
      poff(robo.x, huvudTopp, '#9aa3ae', 8);
      robo.stagger = 0.5;
      if (!robo.stampad) {
        robo.stampad = true;
        medd('Pansaret är för tjockt! Det måste finnas ett annat sätt …', 3.4);
      }
      return;
    }
    if (robo.stagger <= 0 && sp.invuln <= 0 &&
        sp.y > huvudBotten && sp.y - SPH < robo.y) {    // gick in i roboten
      skada(sp.x < robo.x ? -1 : 1);
    }
  }

  /* ————— partiklar: poff, gnistor och konfetti ————— */
  var partiklar = [];
  function poff(x, y, farg, antal) {
    for (var i = 0; i < antal; i++) {
      var v = 60 + Math.random() * 200, a = Math.random() * Math.PI * 2;
      partiklar.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60,
                       t: 0, liv: 0.5 + Math.random() * 0.4, farg: farg, st: 2 + (Math.random() * 3 | 0), g: 400 });
    }
  }
  function konfetti(x, y) {
    var farger = ['#ffd166', '#57d98a', '#5fb2ff', '#b18cff', '#ff6b8a', '#eae6dc'];
    for (var i = 0; i < 90; i++) {
      var v = 120 + Math.random() * 380, a = -Math.PI / 2 + (Math.random() - 0.5) * 1.9;
      partiklar.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
                       t: 0, liv: 1.4 + Math.random() * 1.4,
                       farg: farger[i % farger.length], st: 3 + (Math.random() * 3 | 0), g: 520 });
    }
  }
  function uppdateraPartiklar(dt) {
    for (var i = partiklar.length - 1; i >= 0; i--) {
      var p = partiklar[i];
      p.t += dt;
      if (p.t >= p.liv) { partiklar.splice(i, 1); continue; }
      p.vy += p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
  }

  /* ————— överläggen: blinket, HUD, meddelanden, touch och segerrutan ————— */
  var flash = null, hud = null, hudLiv = null, hint = null, meddEl = null,
      touch = null, segerEl = null, canvas = null, ritk = null, meddTimer = 0;

  function byggOverlays() {
    flash = document.createElement('div');
    flash.id = 'larmflash';
    flash.className = 'blink';
    document.body.appendChild(flash);

    canvas = document.createElement('canvas');
    canvas.id = 'larmcanvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    ritk = canvas.getContext('2d');
    passaCanvas();

    hud = document.createElement('div');
    hud.id = 'larmhud';
    hud.innerHTML =
      '<span class="lh-varning">⚠ Självdestruktion aktiverad</span>' +
      '<span class="lh-liv" aria-label="Liv"></span>' +
      '<span class="lh-mellis"></span>' +
      '<button type="button" id="lh-ljud">Ljud av</button>' +
      '<button type="button" id="lh-exit">✕ Avbryt larmet</button>';
    document.body.appendChild(hud);
    hudLiv = hud.querySelector('.lh-liv');
    hud.querySelector('#lh-exit').addEventListener('click', function () { avsluta(); });
    hud.querySelector('#lh-ljud').addEventListener('click', function () {
      ljud.tyst(!ljud.arTyst());
      this.textContent = ljud.arTyst() ? 'Ljud på' : 'Ljud av';
    });

    meddEl = document.createElement('div');
    meddEl.id = 'larmmedd';
    meddEl.setAttribute('role', 'status');
    meddEl.setAttribute('aria-live', 'polite');
    document.body.appendChild(meddEl);

    hint = document.createElement('div');
    hint.id = 'larmhint';
    hint.textContent = '←→ spring · ↑ hoppa · Esc avslutar';
    document.body.appendChild(hint);

    touch = document.createElement('div');
    touch.id = 'larmtouch';
    touch.innerHTML =
      '<div class="lt-grupp"><button type="button" data-t="v" aria-label="Vänster">◀</button>' +
      '<button type="button" data-t="h" aria-label="Höger">▶</button></div>' +
      '<div class="lt-grupp"><button type="button" data-t="trad" aria-label="Jetpack" style="display:none">🚀</button>' +
      '<button type="button" data-t="upp" aria-label="Hoppa">▲</button></div>';
    document.body.appendChild(touch);
    [].forEach.call(touch.querySelectorAll('button'), function (b) {
      var t = b.getAttribute('data-t');
      function ner(e) {
        e.preventDefault();
        if (t === 'trad') {
          if (jet && jet.tagen) tang.jet = true;
          return;
        }
        if (t === 'upp' && !tang.upp) hoppBuf = 0.14;
        tang[t] = true;
      }
      function upp(e) {
        e.preventDefault();
        if (t === 'trad') { tang.jet = false; return; }
        tang[t] = false;
      }
      b.addEventListener('pointerdown', ner);
      b.addEventListener('pointerup', upp);
      b.addEventListener('pointercancel', upp);
      b.addEventListener('pointerleave', upp);
      b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    });
  }

  function uppdateraHjartan() {
    if (!hudLiv || !sp) return;
    var ut = '';
    for (var i = 0; i < 3; i++) ut += i < sp.hj ? '<span>♥</span>' : '<span class="tom">♥</span>';
    hudLiv.innerHTML = ut;
  }

  function medd(txt, tid) {
    if (!meddEl) return;
    meddEl.textContent = txt;
    meddEl.classList.add('syns');
    clearTimeout(meddTimer);
    meddTimer = setTimeout(function () { if (meddEl) meddEl.classList.remove('syns'); }, (tid || 2) * 1000);
  }

  function seger() {
    spel.segrat = true;
    ljud.dronStopp();                                   // surret tystnar: faran är över
    if (flash) flash.classList.remove('lugn');
    if (hud) hud.querySelector('.lh-varning').textContent = '✓ Hotet neutraliserat';
    ljud.fanfar();
    setTimeout(function () {
      if (!spel.igang || segerEl) return;
      segerEl = document.createElement('div');
      segerEl.id = 'larmseger';
      segerEl.setAttribute('role', 'dialog');
      segerEl.setAttribute('aria-modal', 'true');
      segerEl.setAttribute('aria-labelledby', 'ls-rubrik');
      segerEl.innerHTML =
        '<p class="ls-rubrik" id="ls-rubrik">Hotet neutraliserat</p>' +
        '<p class="ls-text">Puh, roboten är besegrad och sidan är räddad! Men AI hotar tyvärr mer än ' +
        'bara minnesmästares hemsidor. Gå till <a href="https://www.pauseai.se" target="_blank" ' +
        'rel="noopener">www.pauseai.se</a> för att hjälpa till att rädda mänskligheten en gång för alla!</p>' +
        '<div class="ls-knappar"><a id="ls-lank" href="https://www.pauseai.se" target="_blank" rel="noopener">Läs mer om AI</a>' +
        '<button type="button" id="ls-laga">Fixa hemsidan</button></div>';
      document.body.appendChild(segerEl);
      segerEl.querySelector('#ls-laga').addEventListener('click', function () { avsluta(); });
      try { segerEl.querySelector('#ls-laga').focus({ preventScroll: true }); } catch (e) {}
    }, 900);
  }

  /* ————— kameran och ritandet ————— */
  var kamY = 0, dpr = 1;

  function passaCanvas() {
    if (!canvas) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    canvas.style.width = '100%';
    canvas.style.height = '100%';
  }

  function ritaSprite(bild, cx, fotY, skala, dir, rot, sqX, sqY) {
    var w = bild.width * skala, h = bild.height * skala;
    ritk.save();
    ritk.translate(Math.round(cx), Math.round(fotY));
    if (rot) ritk.rotate(rot);
    ritk.scale((dir || 1) * (sqX || 1), sqY || 1);
    ritk.imageSmoothingEnabled = false;
    ritk.drawImage(bild, -w / 2, -h, w, h);
    ritk.restore();
  }

  function rita() {
    if (!ritk) return;
    ritk.setTransform(dpr, 0, 0, dpr, 0, 0);
    ritk.clearRect(0, 0, window.innerWidth, window.innerHeight);
    var sy = kamY;

    /* hjälpbalkarna: varningsrandiga broar där hoppvägen behövde hjälp */
    for (var hb = 0; hb < plattformar.length; hb++) {
      var pl = plattformar[hb];
      if (!pl.hjalp) continue;
      var ply = pl.y - sy;
      if (ply < -30 || ply > window.innerHeight + 30) continue;
      ritk.fillStyle = '#2a2e35';
      ritk.fillRect(pl.x, ply, pl.w, pl.h);
      ritk.strokeStyle = '#4d545e';
      ritk.lineWidth = 2;
      ritk.strokeRect(pl.x + 1, ply + 1, pl.w - 2, pl.h - 2);
      ritk.fillStyle = '#ffd166';
      for (var rx = 6; rx < pl.w - 14; rx += 24) ritk.fillRect(pl.x + rx, ply + 3, 12, pl.h - 6);
    }

    /* uppvindarnas glöd i respektive appfärg */
    for (var zg = 0; zg < boostZoner.length; zg++) {
      var zo = boostZoner[zg];
      if (!zo.sist) continue;
      var sedan = spel.t - zo.sist;
      if (!zo.inne && sedan > 0.5) continue;
      var alfa = (zo.inne ? 0.3 : 0.3 * (1 - sedan / 0.5)) * (0.8 + 0.2 * Math.sin(spel.t * 9));
      var zcx = zo.x + zo.w / 2, zcy = zo.y + zo.h / 2 - sy;
      var rad = Math.max(zo.w, zo.h) * 0.66;
      var grad = ritk.createRadialGradient(zcx, zcy, rad * 0.25, zcx, zcy, rad);
      grad.addColorStop(0, 'rgba(' + zo.rgb + ',' + (alfa * 0.55).toFixed(3) + ')');
      grad.addColorStop(0.7, 'rgba(' + zo.rgb + ',' + (alfa * 0.22).toFixed(3) + ')');
      grad.addColorStop(1, 'rgba(' + zo.rgb + ',0)');
      ritk.fillStyle = grad;
      ritk.fillRect(zcx - rad, zcy - rad, rad * 2, rad * 2);
    }

    /* π-symbolen i sin vajer (eller i fritt fall) */
    if (pi && !pi.klar && piBild) {
      if (!pi.faller) {
        ritk.strokeStyle = 'rgba(154,163,174,.5)';
        ritk.lineWidth = 2;
        ritk.beginPath();
        ritk.moveTo(pi.x, pi.y - 68 - sy);
        ritk.lineTo(pi.x, pi.y - 560 - sy);
        ritk.stroke();
      }
      var piRot = pi.faller ? Math.min(0.5, pi.vy / 2000) : Math.sin(spel.t * 1.1) * 0.05;
      ritaSprite(piBild, pi.x, pi.y - sy, 7, 1, piRot);
    }

    /* robotens laserskott */
    for (var i = 0; i < skotten.length; i++) {
      var b = skotten[i];
      ritk.fillStyle = 'rgba(255,75,75,.35)';
      ritk.fillRect(b.x - 6, b.y - sy - 6, 12, 12);
      ritk.fillStyle = '#ff4b4b';
      ritk.fillRect(b.x - 3, b.y - sy - 3, 7, 7);
    }

    /* roboten + hp-rutor */
    if (robo && robotBilder) {
      var synligR = robo.y - sy > -ROH - 80 && robo.y - ROH - sy < window.innerHeight + 80;
      if (synligR && !(robo.dod > 1.1)) {
        var rb = (robo.dod > 0 || robo.stagger > 0) ? robotBilder.trasig
               : (robo.gick ? (robo.steg ? robotBilder.ga1 : robotBilder.ga2) : robotBilder.sta);
        ritk.globalAlpha = robo.dod > 0 ? Math.max(0, 1 - Math.max(0, robo.dod - 0.55) / 0.5) : 1;
        ritaSprite(rb, robo.x, robo.y - sy, RSK, robo.dir, robo.rot);
        ritk.globalAlpha = 1;
      }
    }

    /* jetpacken som väntar — med skylt på datorn */
    if (jet && !jet.tagen && jetBild) {
      var jb = Math.sin(spel.t * 2.3) * 6;
      var jy = jet.y - 8 - jb - sy;
      ritk.fillStyle = 'rgba(255,209,102,' + (0.1 + 0.05 * Math.sin(spel.t * 3)).toFixed(3) + ')';
      ritk.beginPath();
      ritk.arc(jet.x, jy - 20, 36, 0, Math.PI * 2);
      ritk.fill();
      ritaSprite(jetBild, jet.x, jy, 3, 1, 0);
      if (finPekare) {
        var skx = jet.x + 66, sky = jet.y - sy;
        ritk.fillStyle = '#4d545e';
        ritk.fillRect(skx - 2, sky - 36, 4, 36);
        ritk.fillStyle = '#161614';
        ritk.fillRect(skx - 40, sky - 66, 80, 30);
        ritk.strokeStyle = '#9aa3ae';
        ritk.lineWidth = 2;
        ritk.strokeRect(skx - 40, sky - 66, 80, 30);
        ritk.fillStyle = '#ffd166';
        ritk.font = '700 13px "JetBrains Mono",monospace';
        ritk.textAlign = 'center';
        ritk.textBaseline = 'middle';
        ritk.fillText('FLYG: X', skx, sky - 51);
      }
    }

    /* pixel-Jonas (med jetpacken på ryggen när den är tagen) */
    if (sp && jonasBilder) {
      var blinkar = sp.invuln > 0 && Math.floor(sp.invuln * 12) % 2 === 0;
      if (!blinkar) {
        if (jet && jet.tagen && jetBild && !sp.tumla) {
          ritaSprite(jetBild, sp.x - sp.dir * 11, sp.y - 14 - sy, 2, 1, 0);
        }
        var bild;
        if (spel.segrat && sp.mark && Math.abs(sp.vx) < 20) {
          bild = Math.floor(spel.t * 3) % 2 ? jonasBilder.vinka1 : jonasBilder.vinka2;
        } else if (!sp.mark) bild = jonasBilder.jump;
        else if (Math.abs(sp.vx) > 20) bild = sp.steg ? jonasBilder.run2 : jonasBilder.run1;
        else bild = jonasBilder.idle;
        var niger = sp.resa > 0.3;                     // landningsnigen innan han reser sig
        ritaSprite(bild, sp.x, sp.y - sy, SK, sp.dir, sp.tumla ? sp.rotT * 9 : 0,
                   niger ? 1.22 : 1, niger ? 0.68 : 1);
      }
      if (jet && jet.tagen && jet.fuel < 0.995) {      // bränslemätaren över huvudet
        var fx = sp.x - 15, fy = sp.y - SPH - 13 - sy;
        ritk.fillStyle = 'rgba(12,12,13,.75)';
        ritk.fillRect(fx - 1, fy - 1, 32, 6);
        ritk.fillStyle = jet.fuel < 0.25 ? '#ff4b4b' : '#ffd166';
        ritk.fillRect(fx, fy, Math.round(30 * jet.fuel), 4);
      }
    }

    /* partiklar */
    for (var pI = 0; pI < partiklar.length; pI++) {
      var pa = partiklar[pI];
      ritk.globalAlpha = Math.max(0, 1 - pa.t / pa.liv);
      ritk.fillStyle = pa.farg;
      ritk.fillRect(pa.x - pa.st / 2, pa.y - sy - pa.st / 2, pa.st, pa.st);
    }
    ritk.globalAlpha = 1;
  }

  /* ————— huvudloopen ————— */
  var spel = { igang: false, t: 0, segrat: false };
  var rafId = 0, senast = 0;

  function tick(ts) {
    rafId = 0;
    if (!spel.igang) return;
    var dt = senast ? Math.min(0.045, (ts - senast) / 1000) : 0.016;
    senast = ts;
    spel.t += dt;

    if (sp) {
      uppdateraSpelare(dt);
      uppdateraRobot(dt);
      uppdateraSkott(dt);
      uppdateraPi(dt);
      kollaRobotTraff();
      uppdateraPartiklar(dt);

      /* kameran följer Jonas mjukt — sidans egen scroll är spelets kamera */
      var malY = klamm(sp.y - window.innerHeight * 0.58, 0, Math.max(0, varldH - window.innerHeight));
      kamY += (malY - kamY) * Math.min(1, dt * 7);
      window.scrollTo(0, Math.round(kamY));
    }

    rita();
    rafId = requestAnimationFrame(tick);
  }

  function vidStorlek() {
    if (!spel.igang) return;
    passaCanvas();
    matPlattformar();
    placeraJetpack();
    if (robo && robo.dod <= 0) {                        // robotens plattform kan ha flyttat sig
      var narmast = null, basta = 1e9;
      for (var i = 0; i < plattformar.length; i++) {
        var p = plattformar[i], d = Math.abs(p.y - robo.plat.y) + Math.abs(p.x - robo.plat.x);
        if (p.w >= 180 && d < basta) { basta = d; narmast = p; }
      }
      if (narmast) {
        robo.plat = narmast;
        robo.x = klamm(robo.x, narmast.x + ROW / 2, narmast.x + narmast.w - ROW / 2);
        robo.y = narmast.y;
      } else {
        plattformar.push(robo.plat);                    // behåll gamla ytan som plattform
      }
    }
    if (sp) sp.x = klamm(sp.x, SPW / 2, varldB - SPW / 2);
  }

  /* ————— start och avslut ————— */
  var startTimers = [];

  function inerta(pa) {                                 // göm sidan för Tab och skärmläsare
    [].forEach.call(document.querySelectorAll('main, footer, .nav'), function (el) {
      if ('inert' in el) el.inert = pa;
      if (pa) el.setAttribute('aria-hidden', 'true'); else el.removeAttribute('aria-hidden');
    });
  }

  function start() {
    if (spel.igang) return;
    spel.igang = true;
    spel.segrat = false;
    spel.t = 0;
    senast = 0;
    partiklar = [];
    if (!jonasBilder) {
      jonasBilder = gorFrames(JONAS);
      robotBilder = gorFrames(ROBOT);
      jetBild = gorFrames(JETPACK).ikon;
      piBild = gorFrames(PISYM).pi;
    }
    jet = null;
    pi = null;

    ljud.start();
    if (!reduced) { ljud.siren(3.6); ljud.muller(2.6); }
    else ljud.siren(1.6);

    docEl.classList.add('larm');
    byggOverlays();
    faller();

    /* Esc ska funka redan under blinket, och bakgrunden görs inert
       så att Tab inte vandrar osynligt bakom canvasen */
    window.addEventListener('keydown', tangNer);
    window.addEventListener('keyup', tangUpp);
    window.addEventListener('blur', slappAllt);
    window.addEventListener('resize', vidStorlek);
    inerta(true);
    try { hud.querySelector('#lh-exit').focus({ preventScroll: true }); } catch (e) {}

    /* pausa ev. spelande YouTube-inbäddning — larmet räcker gott som ljudspår */
    [].forEach.call(document.querySelectorAll('.vram iframe'), function (f) {
      try { f.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*'); } catch (e) {}
    });

    kamY = window.scrollY || window.pageYOffset;

    startTimers.push(setTimeout(function () {           // blinket lugnar sig till vinjett
      if (flash) { flash.classList.remove('blink'); flash.classList.add('lugn'); }
    }, reduced ? 400 : 3100));

    startTimers.push(setTimeout(function () {           // raset är klart: spelet börjar
      if (!spel.igang) return;
      matPlattformar();
      initSpelare();
      initRobot();
      placeraJetpack();
      uppdateraHjartan();
      ljud.dronStart();
      medd('Åh nej. Vad har du gjort?!', 2.8);
      if (hint) hint.classList.add('syns');
      startTimers.push(setTimeout(function () { if (hint) hint.classList.remove('syns'); }, 9000));

      slappAllt();                                      // inga spöktryck från rasfilmen
      rafId = requestAnimationFrame(tick);
    }, reduced ? 150 : 1750));
  }

  function avsluta() {
    if (!spel.igang) return;
    var segrade = spel.segrat;
    spel.igang = false;
    startTimers.forEach(clearTimeout); startTimers = [];
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    window.removeEventListener('keydown', tangNer);
    window.removeEventListener('keyup', tangUpp);
    window.removeEventListener('blur', slappAllt);
    window.removeEventListener('resize', vidStorlek);
    slappAllt();
    ljud.stangAv();

    [canvas, hud, hint, meddEl, touch, segerEl].forEach(function (el) { if (el) el.remove(); });
    canvas = null; ritk = null; hud = null; hudLiv = null; hint = null;
    meddEl = null; touch = null; segerEl = null;
    if (flash) {
      var f = flash; flash = null;
      f.classList.remove('blink'); f.classList.remove('lugn');   // opacity → 0 (transition)
      setTimeout(function () { f.remove(); }, 700);
    }

    docEl.classList.add('larmslut');                    // navigationen glider tillbaka mjukt
    docEl.classList.remove('larm');
    inerta(false);
    knapp.disabled = true;                              // inte förrän allt läkt klart
    res(function () {
      docEl.classList.remove('larmslut');
      knapp.disabled = false;
      try { knapp.focus({ preventScroll: true }); } catch (e) {}
      try { window.dispatchEvent(new Event('scroll')); } catch (e) {}   // väck teleprompterljuset
    });

    if (scenEl) { scenEl.classList.remove('figurborta'); scenEl = null; }
    boostZoner.forEach(function (z) { z.el.classList.remove('boostlyser'); });
    boostZoner = [];
    sp = null; robo = null; skotten = []; partiklar = []; pi = null; jet = null;
    knapp.textContent = segrade
      ? 'Roboten är besegrad. Men klicka ändå inte här igen.'
      : 'Okej. Du klickade. Gör det inte igen.';
  }

  knapp.addEventListener('click', function () { start(); });

  /* testkrok: öppna sidan med ?larmtest för att kunna styra spelet utifrån
     (samma mönster som ?redigera och ?textprov) */
  if (/[?&]larmtest/.test(location.search)) {
    window.__larmtest = {
      status: function () {
        return { igang: spel.igang, segrat: spel.segrat,
                 sp: sp && { x: sp.x, y: sp.y, vy: sp.vy, hj: sp.hj, mark: sp.mark, tumla: sp.tumla, resa: sp.resa },
                 robo: robo && { x: robo.x, y: robo.y, vaknat: robo.vaknat, dod: robo.dod,
                                 stampad: robo.stampad, skottT: robo.skottT, stagger: robo.stagger },
                 jet: jet && { x: jet.x, y: jet.y, tagen: jet.tagen, fuel: jet.fuel },
                 pi: pi && { x: pi.x, y: pi.y, faller: pi.faller, klar: pi.klar },
                 skott: skotten.length,
                 plattformar: plattformar.length, markY: markY };
      },
      plattor: function () {
        return plattformar.map(function (p) { return { x: p.x, y: p.y, w: p.w, s: !!p.studs, lut: p.lut || 0 }; });
      },
      zoner: function () {
        return boostZoner.map(function (z) { return { x: z.x, y: z.y, w: z.w, h: z.h, glob: z.glob, inne: z.inne }; });
      },
      flytta: function (x, y) { if (sp) { sp.x = x; sp.y = y; sp.vx = 0; sp.vy = 0; kamY = Math.max(0, y - innerHeight * 0.58); } },
      tillRobot: function () {                          // rakt in i huvudbandet, fallande
        if (sp && robo) { sp.x = robo.x; sp.y = robo.y - ROH + 10; sp.vx = 0; sp.vy = 60; kamY = Math.max(0, sp.y - innerHeight * 0.58); }
      }
    };
  }
})();
