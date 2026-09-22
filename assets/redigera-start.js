/* Redigeringsläge för sidans ägare på start- och engelska sidan. Laddas
   bara med ?redigera i adressen. Allt sker lokalt i webbläsaren: texterna
   blir redigerbara, ändringarna sparas i localStorage och "Kopiera
   ändringar" lägger en lista med före/efter i urklipp. */
(function () {
  var docEl = document.documentElement;
  docEl.classList.add('redig');

  var stil = document.createElement('style');
  stil.id = 'redigstil';
  stil.textContent =
    'html.redig [data-line]{opacity:1 !important}' +
    'html.redig .aft{opacity:1 !important}' +
    'html.redig .globpromo,html.redig .kobj,html.redig .soc a{opacity:1 !important;transform:none !important}' +
    'html.redig .nbplan{opacity:1 !important}' +
    'html.redig .tack{display:block;outline:1px dotted var(--hair);outline-offset:8px}' +
    'html.redig body{padding-bottom:5.5rem}' +
    '[data-redig]{outline:1px dashed rgba(255,209,102,.3);outline-offset:3px}' +
    '[data-redig]:hover{outline-color:rgba(255,209,102,.6)}' +
    '[data-redig]:focus{outline:1px solid var(--accent);outline-offset:3px}' +
    '#redigbar{position:fixed;left:0;right:0;bottom:0;z-index:200;display:flex;gap:.9rem 1.2rem;align-items:center;' +
    'justify-content:center;flex-wrap:wrap;padding:.85rem 1rem;background:rgba(12,12,13,.97);border-top:1px solid var(--hair);' +
    'font-family:var(--mono);font-size:.58rem;letter-spacing:.16em;text-transform:uppercase;color:var(--mist)}' +
    '#redigbar button{background:transparent;border:1px solid var(--hair);color:var(--ink);cursor:pointer;' +
    'font:inherit;letter-spacing:inherit;text-transform:inherit;padding:.55rem .9rem}' +
    '#redigbar button:hover{border-color:var(--accent);color:var(--accent)}';
  document.head.appendChild(stil);

  // blockera navigering, uppspelning och formulärskick medan man redigerar
  document.addEventListener('submit', function (e) { e.preventDefault(); e.stopPropagation(); }, true);
  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('#redigbar')) return;
    var mal = e.target.closest ? e.target.closest('a,button') : null;
    if (mal) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  var SEL = 'h1, .tagline, .merits .mer, .knapp, .label, h3 a, p.desc, .feat b, .feat i, ' +
            'p.meta, p.big, .vtitel, .vmeta, .soc a, label, footer p, footer a, .nav a';
  var alla = [].slice.call(document.querySelectorAll(SEL));
  var els = alla.filter(function (el) {           // bara "löv": inga redigerbara i redigerbara
    return !alla.some(function (b) { return b !== el && el.contains(b); });
  });

  var LS = 'jve-redig';
  var sparat = {};
  try { sparat = JSON.parse(localStorage.getItem(LS) || '{}'); } catch (e) {}
  var orig = [];
  els.forEach(function (el, i) {
    var id = 't' + i;
    el.setAttribute('data-redig', id);
    try { el.contentEditable = 'plaintext-only'; } catch (err) {}
    if (el.contentEditable !== 'plaintext-only') el.contentEditable = 'true';
    orig[i] = el.innerText;
    if (sparat[id] != null && sparat[id] !== el.innerText) el.innerText = sparat[id];
  });

  function sparaAlla() {
    var ut = {};
    els.forEach(function (el, i) {
      if (el.innerText !== orig[i]) ut['t' + i] = el.innerText;
    });
    try { localStorage.setItem(LS, JSON.stringify(ut)); } catch (e) {}
    return ut;
  }
  var rt;
  document.addEventListener('input', function () { clearTimeout(rt); rt = setTimeout(sparaAlla, 400); });

  var bar = document.createElement('div');
  bar.id = 'redigbar';
  bar.innerHTML =
    '<span id="rediginfo">Redigeringsläge · klicka på en text och skriv</span>' +
    '<button type="button" id="redigkopiera">Kopiera ändringar</button>' +
    '<button type="button" id="redigrensa">Börja om</button>' +
    '<button type="button" id="redigstang">Stäng</button>';
  document.body.appendChild(bar);
  var info = document.getElementById('rediginfo');

  document.getElementById('redigkopiera').addEventListener('click', function () {
    var d = sparaAlla();
    var lista = Object.keys(d).map(function (id) {
      return { id: id, fran: orig[parseInt(id.slice(1), 10)], till: d[id] };
    });
    if (!lista.length) { info.textContent = 'Inga ändringar ännu'; return; }
    var text = JSON.stringify(lista, null, 2);
    function ok() { info.textContent = lista.length + (lista.length > 1 ? ' ändringar kopierade' : ' ändring kopierad'); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok, function () { window.prompt('Kopiera texten:', text); ok(); });
    } else { window.prompt('Kopiera texten:', text); ok(); }
  });
  document.getElementById('redigrensa').addEventListener('click', function () {
    try { localStorage.removeItem(LS); } catch (e) {}
    location.reload();
  });
  document.getElementById('redigstang').addEventListener('click', function () {
    location.href = location.pathname;
  });
})();
