/* pixeljonas — en liten pixelfigur (Jonas i röd tröja och olikfärgade
   strumpor, en gul och en turkos) som springer fram
   och tillbaka, hoppar, vinkar, står och blinkar, rabblar ibland några
   pi-decimaler i en pratbubbla (och fortsätter där han slutade), tar en
   tupplur och drömmer om pokaler, klappar en hund som kommer på besök,
   gör någon enstaka gång en volt, besegrar efter en minuts tittande en
   AI-robot med sitt gröna lasersvärd — och den som klickar på honom får
   mata honom med chokladkakor. Helt ritad i kod. */
(function () {
  'use strict';
  var scen = document.querySelector('.pixelscen');
  if (!scen || !window.HTMLCanvasElement) return;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* spriten: 14x20 pixlar, tolv frames — "." är genomskinlig */
  var SPRITE = {
    width: 14, height: 20,
    palette: {"H":"#7a4a24","S":"#f6c99f","E":"#22242e","M":"#803024","R":"#e23b4e","P":"#3a4468","K":"#8a5a2b","G":"#45ff70","g":"#b9ffc9","D":"#9aa3ae","C":"#6b4226","Y":"#ffd166","T":"#4ecdc4"},
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
        '....YY..TT....',
        '....YY..TT....',
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
        '....YY..TT....',
        '....YY..TT....',
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
        '....YY..TT....',
        '....YY..TT....',
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
        '..KKY....PP...',
        '.........TT...',
        '.........TT...',
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
        '....PP..TKKK..',
        '....YY........',
        '....YY........',
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
        '...YPP..PPT...',
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
        '....YY..TT....',
        '....YY..TT....',
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
        '....YY..TT....',
        '....YY..TT....',
        '....KKK.KKK...',
      ],
      klappa1: [
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
        '...SRRRRRRRR..',
        '...SRRRRRR.SS.',
        '...SPPPPPP....',
        '....PPPPPP....',
        '....PP..PP....',
        '....YY..TT....',
        '....YY..TT....',
        '....KKK.KKK...',
      ],
      klappa2: [
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
        '...SRRRRRR....',
        '...SRRRRRRRR..',
        '...SPPPPPP.SS.',
        '....PPPPPP....',
        '....PP..PP....',
        '....YY..TT....',
        '....YY..TT....',
        '....KKK.KKK...',
      ],
      sov1: [
        '..............',
        '..............',
        '..............',
        '..............',
        '..............',
        '..............',
        '..............',
        '..............',
        '..............',
        '..............',
        '..............',
        '..............',
        '..............',
        '..............',
        '..............',
        '..............',
        '..............',
        '.HHHH.........',
        '.HHHHRRRRRPPT.',
        '.HSSHRRRRRYKKK',
      ],
      sov2: [
        '..............',
        '..............',
        '..............',
        '..............',
        '..............',
        '..............',
        '..............',
        '..............',
        '..............',
        '..............',
        '..............',
        '..............',
        '..............',
        '..............',
        '..............',
        '..............',
        '.....RRR......',
        '.HHHH.........',
        '.HHHHRRRRRPPT.',
        '.HSSHRRRRRYKKK',
      ],
      svarddra: [
        '..............',
        '..............',
        '....H.HH.H....',
        '....HHHHHH....',
        '...HHHHHHHH...',
        '...HHHHHHHHD..',
        '...HHSSSSSSD..',
        '...HSSESSESS..',
        '.....SSMMMSR..',
        '......SSSS.R..',
        '....RRRRRRRR..',
        '...RRRRRRRR...',
        '...SRRRRRR....',
        '...SRRRRRR....',
        '...SPPPPPP....',
        '....PPPPPP....',
        '....PP..PP....',
        '....YY..TT....',
        '....YY..TT....',
        '....KKK.KKK...',
      ],
      svardupp: [
        '...........g..',
        '...........G..',
        '....H.HH.H.G..',
        '....HHHHHH.G..',
        '...HHHHHHHHG..',
        '...HHHHHHHHD..',
        '...HHSSSSSSD..',
        '...HSSESSESS..',
        '.....SSMMMSR..',
        '......SSSS.R..',
        '....RRRRRRRR..',
        '...RRRRRRRR...',
        '...SRRRRRR....',
        '...SRRRRRR....',
        '...SPPPPPP....',
        '....PPPPPP....',
        '....PP..PP....',
        '....YY..TT....',
        '....YY..TT....',
        '....KKK.KKK...',
      ],
      svardhugg: [
        '..............',
        '..............',
        '....H.HH.H....',
        '....HHHHHH....',
        '...HHHHHHHH..g',
        '...HHHHHHHH..G',
        '...HHSSSSSS..G',
        '...HSSESSES..G',
        '.....SSMMMS.G.',
        '......SSSS..G.',
        '....RRRRRR..G.',
        '...RRRRRRRRSS.',
        '...SRRRRRR....',
        '...SRRRRRR....',
        '...SPPPPPP....',
        '....PPPPPP....',
        '....PP..PP....',
        '....YY..TT....',
        '....YY..TT....',
        '....KKK.KKK...',
      ],
      ata1: [
        '..............',
        '..............',
        '....H.HH.H....',
        '....HHHHHH....',
        '...HHHHHHHH...',
        '...HHHHHHHH...',
        '...HHSSSSSS...',
        '...HSSESSES...',
        '...SCCCCCCS...',
        '...R..SSSS.R..',
        '....RRRRRR....',
        '...RRRRRRRR...',
        '....RRRRRR....',
        '....RRRRRR....',
        '....PPPPPP....',
        '....PPPPPP....',
        '....PP..PP....',
        '....YY..TT....',
        '....YY..TT....',
        '....KKK.KKK...',
      ],
      ata2: [
        '..............',
        '..............',
        '....H.HH.H....',
        '....HHHHHH....',
        '...HHHHHHHH...',
        '...HHHHHHHH...',
        '...HHSSSSSS...',
        '...HSSESSES...',
        '.....SSMEMS...',
        '...SCCCCCCS...',
        '....RRRRRR....',
        '...RRRRRRRR...',
        '....RRRRRR....',
        '....RRRRRR....',
        '....PPPPPP....',
        '....PPPPPP....',
        '....PP..PP....',
        '....YY..TT....',
        '....YY..TT....',
        '....KKK.KKK...',
      ],
    }
  };

  /* hunden: 14x10 pixlar, springer in, sätter sig och viftar på svansen */
  var HUND = {
    width: 14, height: 10,
    palette: {"K":"#8a5a2b","E":"#22242e"},
    frames: {
      spring1: [
        '..............',
        '..........KK..',
        '..........KKK.',
        '.K........KEKE',
        '.KK.......KKKK',
        '..KKKKKKKKKKK.',
        '..KKKKKKKKKK..',
        '...KKKKKKKK...',
        '...KK....KK...',
        '..KK......KK..',
      ],
      spring2: [
        '..............',
        '..........KK..',
        '..........KKK.',
        '.K........KEKE',
        '.KK.......KKKK',
        '..KKKKKKKKKKK.',
        '..KKKKKKKKKK..',
        '...KKKKKKKK...',
        '....KK..KK....',
        '....KK..KK....',
      ],
      sitt1: [
        '..............',
        '..........KK..',
        '..........KKK.',
        '..........KEKE',
        '..........KKKK',
        '........KKKK..',
        '.......KKKKK..',
        '......KKKKKK..',
        'KK...KKKKK.KK.',
        '.....KKKK..KK.',
      ],
      sitt2: [
        '..............',
        '..........KK..',
        '..........KKK.',
        '..........KEKE',
        '..........KKKK',
        'K.......KKKK..',
        '.K.....KKKKK..',
        '..K...KKKKKK..',
        '.....KKKKK.KK.',
        '.....KKKK..KK.',
      ],
    }
  };

  /* AI-roboten: 14x20 pixlar, marscherar in efter en minuts tittande */
  var ROBOT = {
    width: 14, height: 20,
    palette: {"L":"#9aa3ae","D":"#4d545e","E":"#ff4b4b","A":"#6ec1ff","G":"#2a2e35"},
    frames: {
      sta: [
        '.......A......',
        '.......D......',
        '....DDDDDD....',
        '...DLLLLLLD...',
        '...DLEEEELD...',
        '...DLLLLLLD...',
        '....DDDDDD....',
        '......DD......',
        '..DDDDDDDDDD..',
        '..DDLLLLLLDD..',
        '..DDLLAALLDD..',
        '..DDLLAALLDD..',
        '..DDLLLLLLDD..',
        '...DLLLLLLD...',
        '....DDDDDD....',
        '....DD..DD....',
        '....DD..DD....',
        '....DD..DD....',
        '....DD..DD....',
        '...DDD..DDD...',
      ],
      ga1: [
        '.......A......',
        '.......D......',
        '....DDDDDD....',
        '...DLLLLLLD...',
        '...DLEEEELD...',
        '...DLLLLLLD...',
        '....DDDDDD....',
        '......DD......',
        '..DDDDDDDDDD..',
        '..DDLLLLLLDD..',
        '..DDLLAALLDD..',
        '..DDLLAALLDD..',
        '..DDLLLLLLDD..',
        '...DLLLLLLD...',
        '....DDDDDD....',
        '...DD....DD...',
        '...DD....DD...',
        '..DD......DD..',
        '..DD......DD..',
        '.DDD......DDD.',
      ],
      ga2: [
        '.......A......',
        '.......D......',
        '....DDDDDD....',
        '...DLLLLLLD...',
        '...DLEEEELD...',
        '...DLLLLLLD...',
        '....DDDDDD....',
        '......DD......',
        '..DDDDDDDDDD..',
        '..DDLLLLLLDD..',
        '..DDLLAALLDD..',
        '..DDLLAALLDD..',
        '..DDLLLLLLDD..',
        '...DLLLLLLD...',
        '....DDDDDD....',
        '....DD..DD....',
        '....DD..DD....',
        '....DD..DD....',
        '....DD..DD....',
        '...DDD..DDD...',
      ],
      trasig: [
        '......A.......',
        '.......D......',
        '....DDDDDD....',
        '...DLLLLLLD...',
        '...DLGGGGLD...',
        '...DLLGLLLD...',
        '....DDDDDD....',
        '......DD......',
        '..DDDDDDDDDD..',
        '..DDLGLLLLDD..',
        '..DDLLGGLLDD..',
        '..DDLLGGLLDD..',
        '..DDLGLLGLDD..',
        '...DLLLLLLD...',
        '....DDDDDD....',
        '....DD..DD....',
        '....DD..DD....',
        '....DD..DD....',
        '....DD..DD....',
        '...DDD..DDD...',
      ],
    }
  };

  /* chokladkakan (foliekant + brytrutor) och tackhjärtat */
  var CHOK = {
    width: 10, height: 6,
    palette: {"C":"#6b4226","D":"#4a2c17","W":"#c9ced6"},
    frames: {
      hel: [
        'WWDDDDDDDD',
        'WWCCDCCDCC',
        'WWCCDCCDCC',
        'WWCCDCCDCC',
        'WWCCDCCDCC',
        'WWDDDDDDDD',
      ],
    }
  };
  var HJARTA = {
    width: 7, height: 6,
    palette: {"V":"#ff6b8a"},
    frames: {
      hjarta: [
        '.VV.VV.',
        'VVVVVVV',
        'VVVVVVV',
        '.VVVVV.',
        '..VVV..',
        '...V...',
      ],
    }
  };

  var SKALA = 3;
  function nyCanvas(sprite, klass) {
    var c = document.createElement('canvas');
    c.className = klass;
    c.width = sprite.width;
    c.height = sprite.height;
    c.style.width = sprite.width * SKALA + 'px';
    c.style.height = sprite.height * SKALA + 'px';
    c.style.pointerEvents = 'none';               // bara Jonas själv är klickbar
    scen.appendChild(c);
    return c;
  }
  function nyRitare(c, sprite) {
    var k = c.getContext('2d'), visad = '';
    return function (namn) {
      if (!k || namn === visad) return;
      visad = namn;
      var f = sprite.frames[namn];
      k.clearRect(0, 0, c.width, c.height);
      for (var y = 0; y < f.length; y++) {
        for (var i = 0; i < f[y].length; i++) {
          var farg = sprite.palette[f[y].charAt(i)];
          if (farg) { k.fillStyle = farg; k.fillRect(i, y, 1, 1); }
        }
      }
    };
  }
  var W = SPRITE.width * SKALA, H = SPRITE.height * SKALA;
  var cv = nyCanvas(SPRITE, 'pixfig');
  var rita = nyRitare(cv, SPRITE);

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

  function placeraBubbla(offs) {
    var s = scen.clientWidth;
    var mitt = x + W / 2 + (offs || 0);
    var bw = bubbla.offsetWidth || 40;
    var c = Math.max(bw / 2 + 2, Math.min(s - bw / 2 - 2, mitt));
    bubbla.style.left = Math.round(c) + 'px';
    var pil = Math.max(8 - bw / 2, Math.min(bw / 2 - 8, mitt - c));
    bubbla.style.setProperty('--pil', Math.round(pil) + 'px');
  }

  /* tuppluren: han drömmer om VM-pokalen */
  var senasteSomn = 0, dromPa = false;
  var trofe = (function () {
    var c = document.createElement('canvas');
    c.width = 9; c.height = 8;
    c.style.cssText = 'width:18px;height:16px;image-rendering:pixelated;vertical-align:-3px;margin-right:.35rem';
    var k = c.getContext('2d');
    var f = ['.GGGGGGG.', 'G.GGGGG.G', 'G.GGGGG.G', '..GGGGG..',
             '...GGG...', '....G....', '...GGG...', '..GGGGG..'];
    if (k) {
      k.fillStyle = '#ffd166';
      for (var y = 0; y < 8; y++)
        for (var i = 0; i < 9; i++)
          if (f[y].charAt(i) === 'G') k.fillRect(i, y, 1, 1);
    }
    return c;
  })();
  function visaDrom() {
    bubbla.classList.add('drom');
    bubbla.textContent = '';
    bubbla.appendChild(trofe);
    var z = document.createElement('span');
    z.className = 'zz';
    z.textContent = 'zzz';
    bubbla.appendChild(z);
    bubbla.classList.add('syns');
  }

  /* hunden: kommer in från sidan, blir klappad, springer hem igen */
  var HUNDW = HUND.width * SKALA;
  var hundCv = nyCanvas(HUND, 'pixfig pixhund');
  hundCv.style.opacity = '0';
  var ritaHund = nyRitare(hundCv, HUND);
  var hund = { fas: '', x: -60, dir: 1, hem: -60, mal: 0, t: 0, steg: 0, stegT: 0 };
  var senasteHund = 0;

  function uppdateraHund(dt) {
    if (!hund.fas) return;
    hund.stegT += dt;
    if (hund.stegT > (hund.fas === 'klapp' ? 0.3 : 0.11)) { hund.stegT = 0; hund.steg = 1 - hund.steg; }
    if (hund.fas === 'in') {
      hund.x += hund.dir * 88 * dt;
      ritaHund(hund.steg ? 'spring2' : 'spring1');
      if ((hund.dir > 0 && hund.x >= hund.mal) || (hund.dir < 0 && hund.x <= hund.mal)) {
        hund.x = hund.mal; hund.fas = 'klapp'; hund.t = 0; hund.stegT = 0; hund.steg = 0;
      }
    } else if (hund.fas === 'klapp') {
      hund.t += dt;
      ritaHund(hund.steg ? 'sitt2' : 'sitt1');
      if (hund.t > 2.6) {
        hund.fas = 'ut'; hund.dir = -hund.dir;
        lage = 'vinka'; lageT = 0;                      // Jonas vinkar hejdå
        lageSlut = 1.4 + Math.random() * 0.9;
        stegT = 0; steg = 0;
      }
    } else {                                            // ut: springer hem
      hund.x += hund.dir * 88 * dt;
      ritaHund(hund.steg ? 'spring2' : 'spring1');
      if (hund.x < -HUNDW - 30 || hund.x > spann() + HUNDW + 30) {
        hund.fas = ''; hundCv.style.opacity = '0';
      }
    }
    hundCv.style.transform = 'translate(' + Math.round(hund.x) + 'px,0) scaleX(' + hund.dir + ')';
    scen.dataset.hund = hund.fas;
  }

  /* roboten: belöning för den som tittar länge — marsch, standoff, duell */
  var ROBW = ROBOT.width * SKALA;
  var robotCv = nyCanvas(ROBOT, 'pixfig pixrobot');
  robotCv.style.opacity = '0';
  var ritaRobot = nyRitare(robotCv, ROBOT);
  var robot = { fas: '', x: -60, dir: 1, mal: 0, t: 0, steg: 0, stegT: 0 };
  var aktivT = 0, senasteRobot = -100;

  function uppdateraRobot(dt) {
    if (!robot.fas) return;
    robot.stegT += dt;
    if (robot.stegT > 0.16) { robot.stegT = 0; robot.steg = 1 - robot.steg; }
    if (robot.fas === 'in') {                            // olycksbådande marsch
      robot.x += robot.dir * 62 * dt;
      ritaRobot(robot.steg ? 'ga2' : 'ga1');
      if ((robot.dir > 0 && robot.x >= robot.mal) || (robot.dir < 0 && robot.x <= robot.mal)) {
        robot.x = robot.mal; robot.fas = 'standoff'; robot.t = 0;
      }
    } else if (robot.fas === 'standoff') {               // de mäter varandra med blicken
      robot.t += dt;
      ritaRobot('sta');
      if (robot.t > 0.75) { robot.fas = 'anfall'; robot.t = 0; }
    } else if (robot.fas === 'anfall') {                 // Jonas rusar fram
      x += dir * 150 * dt;
      ritaRobot('sta');
      if (Math.abs(robot.x - x) < 32) { robot.fas = 'fall'; robot.t = 0; }
    } else if (robot.fas === 'fall') {                   // träffad: välter och slocknar
      robot.t += dt / 0.7;
      ritaRobot('trasig');
      if (robot.t >= 1) {
        robot.fas = 'seger'; robot.t = 0;
        robotCv.style.opacity = '0';
        hoppT = 0;                                       // segerskutt!
      }
    } else if (robot.fas === 'seger') {                  // svärdet i vädret en stund
      robot.t += dt;
      if (robot.t > 1.5) {
        robot.fas = '';
        lage = 'sta'; lageT = 0; lageSlut = 0.9;
        blinkOm = 0.5; blinkT = 0;
      }
    }
    if (robot.fas && robot.fas !== 'seger') {
      var vinkel = robot.fas === 'fall' ? Math.round(-88 * Math.min(1, robot.t) * robot.dir) : 0;
      robotCv.style.opacity = robot.fas === 'fall'
        ? String(Math.max(0, 1 - Math.max(0, robot.t - 0.55) / 0.45).toFixed(2)) : '1';
      robotCv.style.transform = 'translate(' + Math.round(robot.x) + 'px,0) rotate(' + vinkel + 'deg) scaleX(' + robot.dir + ')';
    }
    scen.dataset.robot = robot.fas;
  }

  /* chokladmatningen: klicka på Jonas — han hoppar till, fångar och mumsar */
  var CHOKW = CHOK.width * SKALA;
  var chokCv = nyCanvas(CHOK, 'pixfig pixchok');
  chokCv.style.opacity = '0';
  nyRitare(chokCv, CHOK)('hel');
  var hjartaCv = nyCanvas(HJARTA, 'pixfig pixhjarta');
  hjartaCv.style.opacity = '0';
  nyRitare(hjartaCv, HJARTA)('hjarta');
  var chokX = 0, chokY = 0, hjartaT = -1;

  cv.style.pointerEvents = 'auto';
  cv.style.cursor = 'pointer';
  cv.addEventListener('pointerdown', function () {
    if (lage === 'fanga' || lage === 'ata' || lage === 'strid' ||
        lage === 'klappa' || voltT >= 0) return;
    bubbla.classList.remove('syns');              // ev. rabbel/dröm avbryts
    lage = 'fanga'; lageT = 0; lageSlut = 6;      // nödutgång
    hoppT = 0;                                    // hoppar till av klicket!
    chokX = x + (W - CHOKW) / 2;
    chokY = -84;
    chokCv.style.opacity = '1';
  });

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
      if (robot.fas === '' && hoppT < 0 && voltT < 0 &&
          aktivT > 60 && aktivT - senasteRobot > 100) {   // den tålmodige belönas
        senasteRobot = aktivT;
        lage = 'strid'; lageT = 0; lageSlut = 30;         // nödutgång om något hakar
        var vr = x > spann() / 2;                         // roboten tar sidan med plats
        robot.fas = 'in';
        robot.dir = vr ? 1 : -1;
        robot.x = vr ? -ROBW - 20 : spann() + ROBW + 20;
        robot.mal = vr ? x - 72 : x + 72;
        robot.t = 0; robot.stegT = 0; robot.steg = 0;
        robotCv.style.opacity = '1';
        dir = vr ? -1 : 1;                                // Jonas vänder sig mot hotet
        stegT = 0; steg = 0;
      }
      if (lage === 'spring' && ((dir > 0 && x >= mal) || (dir < 0 && x <= mal))) {
        x = mal;
        var br = spann();
        if (ts - senasteHund > 35000 && Math.random() < 0.14) {  // ibland: hundbesök!
          lage = 'klappa'; senasteHund = ts;
          lageSlut = 14;                                 // nödutgång om något hakar upp sig
          var vanster = x > br / 2;                      // hunden kommer där det finns plats
          hund.fas = 'in';
          hund.dir = vanster ? 1 : -1;
          hund.hem = vanster ? -HUNDW - 20 : br + HUNDW + 20;
          hund.x = hund.hem;
          hund.mal = vanster ? x - 32 : x + 32;
          hund.stegT = 0; hund.steg = 0;
          hundCv.style.opacity = '1';
          dir = vanster ? -1 : 1;                        // Jonas vänder sig mot hunden
        } else if (ts - senasteSomn > 28000 && Math.random() < 0.14) { // ibland: tupplur
          lage = 'sov'; senasteSomn = ts;
          lageSlut = 4.5 + Math.random() * 3;
          dromPa = false;
        } else if (ts - senasteRabbel > 9000 && Math.random() < 0.28) { // ibland: rabbla pi
          lage = 'rabbla'; senasteRabbel = ts;
          rabbelKvar = 6 + Math.floor(Math.random() * 8);
          lageSlut = rabbelKvar * 0.22 + 1.4;
          bubbla.classList.remove('drom');
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
      } else if (lage === 'sov') {                      // tupplur med långsam andning
        stegT += dt;
        if (stegT > 0.7) { stegT = 0; steg = 1 - steg; }
        rita(hoppT >= 0 ? 'jump' : (steg ? 'sov2' : 'sov1'));
        if (!dromPa && lageT > 1) {
          dromPa = true;
          visaDrom();
          placeraBubbla(-10 * dir);                     // bubblan över huvudet, inte fötterna
        }
      } else if (lage === 'klappa') {                   // hunden är på besök
        stegT += dt;
        if (stegT > 0.32) { stegT = 0; steg = 1 - steg; }
        rita(hoppT >= 0 ? 'jump' :
             (hund.fas === 'klapp' ? (steg ? 'klappa2' : 'klappa1') : 'idle'));
      } else if (lage === 'strid') {                    // AI-roboten: fram med lasersvärdet
        var avst = Math.abs(robot.x - x);
        if (robot.fas === 'in') rita(avst < 130 ? (avst < 88 ? 'svardupp' : 'svarddra') : 'idle');
        else if (robot.fas === 'fall') rita(robot.t < 0.45 ? 'svardhugg' : 'svardupp');
        else rita('svardupp');                          // standoff, anfall, segerskutt
      } else if (lage === 'fanga') {                    // chokladkakan är på väg ner
        rita(hoppT >= 0 ? 'jump' : 'idle');
        chokY += 115 * dt;
        chokCv.style.transform = 'translate(' + Math.round(chokX) + 'px,' + Math.round(chokY) +
          'px) rotate(' + Math.round(Math.sin(chokY * 0.08) * 10) + 'deg)';
        if (chokY >= -30) {                             // fångad i höjd med munnen!
          chokCv.style.opacity = '0';
          lage = 'ata'; lageT = 0; lageSlut = 1.7;
          stegT = 0; steg = 0;
        }
      } else if (lage === 'ata') {                      // mums, mums
        stegT += dt;
        if (stegT > 0.24) { stegT = 0; steg = 1 - steg; }
        rita(steg ? 'ata2' : 'ata1');
      } else {                                          // står stilla, tittar och blinkar
        blinkOm -= dt;
        if (blinkOm <= 0) { blinkOm = 1.2 + Math.random() * 2.4; blinkT = 0.13; }
        if (blinkT > 0) blinkT -= dt;
        rita(hoppT >= 0 ? 'jump' : (blinkT > 0 ? 'blink' : 'idle'));
        if (Math.random() < dt * 0.45) dir = -dir;      // kikar åt andra hållet
      }
      if (lageT >= lageSlut) {
        if (lage === 'rabbla') { bubbla.classList.remove('syns'); nyttMal(); }
        else if (lage === 'sov') {                      // vaknar och står yrvaken en stund
          bubbla.classList.remove('syns');
          lage = 'sta'; lageT = 0; lageSlut = 1 + Math.random() * 1.2;
          blinkOm = 0.4; blinkT = 0;
        }
        else if (lage === 'klappa') {                   // nödutgång: hunden får gå hem
          hund.fas = 'ut'; hund.dir = -hund.dir;
          lage = 'vinka'; lageT = 0; lageSlut = 1.4;
          stegT = 0; steg = 0;
        }
        else if (lage === 'strid') {                    // nödutgång: roboten släcks
          robot.fas = ''; robotCv.style.opacity = '0';
          nyttMal();
        }
        else if (lage === 'fanga') {                    // nödutgång: kakan togs bort
          chokCv.style.opacity = '0';
          nyttMal();
        }
        else if (lage === 'ata') {                      // tack för kakan! ett hjärta
          hjartaT = 0;
          lage = 'sta'; lageT = 0; lageSlut = 0.9 + Math.random() * 0.8;
          blinkOm = 0.5; blinkT = 0;
        }
        else if (lage === 'vinka' && Math.random() < 0.45) { // efter vinket: stå kvar en stund
          lage = 'sta'; lageT = 0; lageSlut = 1 + Math.random() * 2.2;
          blinkOm = 0.7 + Math.random() * 1.5;
        } else { nyttMal(); }
      }
    }

    aktivT += dt;
    uppdateraHund(dt);
    uppdateraRobot(dt);

    if (hjartaT >= 0) {                                // tackhjärtat svävar uppåt
      hjartaT += dt / 1.1;
      if (hjartaT >= 1) { hjartaT = -1; hjartaCv.style.opacity = '0'; }
      else {
        hjartaCv.style.opacity = (hjartaT < 0.55 ? 1 : (1 - hjartaT) / 0.45).toFixed(2);
        hjartaCv.style.transform = 'translate(' + Math.round(x + W / 2 - 10) + 'px,' +
          Math.round(-H + 4 - 22 * hjartaT) + 'px)';
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
