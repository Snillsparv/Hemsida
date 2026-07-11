/* tabspel — gångertabellen som interaktiv bräda, i samma stil som
   gångertabellen.se-bilden: regnbågsrader av 3D-knappar på mörk platta.
   Klick på en ruta växlar av/på, klick i marginalen skickar en våg genom
   raden/kolumnen, hörnkrysset vågar hela brädan. Utan JS ligger bilden kvar. */
(function () {
  'use strict';
  var wrap = document.getElementById('tabspel');
  if (!wrap) return;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  var FARG = ['#e23b4e', '#f07f28', '#eeb02c', '#a9cc2e', '#4fbf46',
              '#37c489', '#57c4dd', '#3d8fe0', '#3f5bd8', '#8c4fd0'];

  function bygg() {
    var stavla = document.createElement('div');
    stavla.className = 'tstavla';
    stavla.setAttribute('role', 'grid');
    stavla.setAttribute('aria-label', 'Interaktiv gångertabell — klicka på rutorna');

    function cell(kls, txt, attrs) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'tcell ' + kls;
      b.textContent = txt;
      for (var k in attrs) b.setAttribute(k, attrs[k]);
      stavla.appendChild(b);
      return b;
    }

    cell('thorn', '×', { 'aria-label': 'Animera hela tabellen' });
    for (var c = 1; c <= 10; c++) cell('tmarg', c, { 'data-kol': c, 'aria-label': c + ':ans kolumn' });
    for (var r = 1; r <= 10; r++) {
      cell('tmarg', r, { 'data-rad': r, 'aria-label': r + ':ans rad' });
      for (var c2 = 1; c2 <= 10; c2++) {
        var chip = cell('tchip', r * c2, { 'data-r': r, 'data-c': c2, 'aria-pressed': 'true' });
        chip.style.setProperty('--tc', FARG[r - 1]);
      }
    }

    // sifferstorleken följer brädans bredd
    function skala() {
      var w = stavla.getBoundingClientRect().width || wrap.getBoundingClientRect().width;
      stavla.style.fontSize = Math.max(7, w / 11 * 0.34) + 'px';
    }
    addEventListener('resize', skala);

    function vag(chip, forsening) {
      chip.classList.remove('vag');
      void chip.offsetWidth;                 // starta om animationen
      chip.style.animationDelay = forsening + 'ms';
      chip.classList.add('vag');
    }
    stavla.addEventListener('animationend', function (e) {
      if (e.target.classList) { e.target.classList.remove('vag'); e.target.style.animationDelay = ''; }
    });

    stavla.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      sistKlick = Date.now();
      var chips = stavla.querySelectorAll('.tchip');
      if (b.classList.contains('tchip')) {
        var av = b.classList.toggle('av');
        b.setAttribute('aria-pressed', av ? 'false' : 'true');
        vag(b, 0);
      } else if (b.hasAttribute('data-rad')) {
        var r = b.getAttribute('data-rad');
        chips.forEach(function (ch) {
          if (ch.getAttribute('data-r') === r) vag(ch, (ch.getAttribute('data-c') - 1) * 45);
        });
      } else if (b.hasAttribute('data-kol')) {
        var k = b.getAttribute('data-kol');
        chips.forEach(function (ch) {
          if (ch.getAttribute('data-c') === k) vag(ch, (ch.getAttribute('data-r') - 1) * 45);
        });
      } else {                               // hörnet: hela brädan, diagonalt
        chips.forEach(function (ch) {
          vag(ch, (+ch.getAttribute('data-r') + +ch.getAttribute('data-c') - 2) * 40);
        });
      }
    });

    // då och då rullar en våg av sig själv genom en slumpad rad eller kolumn
    var synligBrada = false, sistKlick = 0;
    if ('IntersectionObserver' in window) {
      var vio = new IntersectionObserver(function (en) { synligBrada = en[0].isIntersecting; }, { threshold: .35 });
      vio.observe(stavla);
    }
    (function autovag() {
      setTimeout(function () {
        if (synligBrada && !reduced && !document.hidden && Date.now() - sistKlick > 6000) {
          var chips = stavla.querySelectorAll('.tchip');
          var radled = Math.random() < 0.5;
          var n = String(1 + Math.floor(Math.random() * 10));
          chips.forEach(function (ch) {
            if ((radled ? ch.getAttribute('data-r') : ch.getAttribute('data-c')) === n)
              vag(ch, ((radled ? ch.getAttribute('data-c') : ch.getAttribute('data-r')) - 1) * 45);
          });
        }
        autovag();
      }, 3800 + Math.random() * 5200);
    })();

    var poster = wrap.querySelector('img');
    if (poster) poster.remove();
    wrap.appendChild(stavla);
    wrap.classList.add('tabspel-klar');
    skala();
    requestAnimationFrame(skala);            // om typsnitt/layout hann ändras
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (en) {
      if (en[0].isIntersecting) { bygg(); io.disconnect(); }
    }, { rootMargin: '600px' });
    io.observe(wrap);
  } else bygg();
})();
