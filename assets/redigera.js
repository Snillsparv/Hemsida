/* Redigeringsläge för sidans ägare. Laddas bara när adressen slutar på
   ?redigera och gör allt lokalt i webbläsaren: texten blir redigerbar och
   knapparna längst ned laddar ner den färdiga filen eller kopierar den och
   öppnar GitHubs redigerare (som kräver skrivrättigheter till repot). */
(function () {
  var fil = location.pathname.replace(/^\//, '').replace(/[^/]*$/, '') + 'index.html';

  var stil = document.createElement('style');
  stil.id = 'redigeringsstil';
  stil.textContent =
    'body.redigerar [contenteditable]:hover{outline:1px dashed var(--hair);outline-offset:6px}' +
    'body.redigerar [contenteditable]:focus{outline:1px dashed var(--accent);outline-offset:6px}' +
    '#redigeringsverktyg{position:fixed;left:0;right:0;bottom:0;z-index:50;background:rgba(18,18,19,.97);' +
    'border-top:1px solid var(--hair);padding:.9rem 1.2rem;display:flex;gap:1rem;align-items:center;' +
    'justify-content:center;flex-wrap:wrap;font-family:var(--mono);font-size:calc(.62rem * var(--mini));' +
    'letter-spacing:.14em;color:var(--mist)}' +
    '#redigeringsverktyg .knapp{margin:0}' +
    'body.redigerar{padding-bottom:6rem}';
  document.head.appendChild(stil);

  document.body.classList.add('redigerar');
  ['.topp', '.hero', 'main', 'footer', '#brevdialog .dinre'].forEach(function (sel) {
    var e = document.querySelector(sel);
    if (e) e.contentEditable = 'true';
  });
  [].forEach.call(document.querySelectorAll('[data-reveal]'), function (e) { e.classList.add('syns'); });

  var tb = document.createElement('div');
  tb.id = 'redigeringsverktyg';
  tb.innerHTML = '<span>Redigeringsläge: klicka i texten och ändra direkt.</span>' +
    '<button class="knapp knapp--fylld" type="button" id="rladda">Ladda ner ny fil</button>' +
    '<button class="knapp" type="button" id="rgithub">Kopiera &amp; öppna GitHub</button>';
  document.body.appendChild(tb);

  function serialisera() {
    var doc = document.documentElement.cloneNode(true);
    var t = doc.querySelector('#redigeringsverktyg'); if (t) t.remove();
    var s = doc.querySelector('#redigeringsstil'); if (s) s.remove();
    var b = doc.querySelector('body'); if (b) b.classList.remove('redigerar');
    [].forEach.call(doc.querySelectorAll('[contenteditable]'), function (e) { e.removeAttribute('contenteditable'); });
    [].forEach.call(doc.querySelectorAll('.syns'), function (e) {
      e.classList.remove('syns');
      if (e.getAttribute('class') === '') e.removeAttribute('class');
    });
    var dg = doc.querySelector('#brevdialog'); if (dg) dg.removeAttribute('open');
    [].forEach.call(doc.querySelectorAll('.partier a[data-adress]'), function (e) { e.removeAttribute('href'); });
    [].forEach.call(doc.querySelectorAll('script[src*="list-manage"], script[src*="posthog"], script[src*="redigera"]'), function (e) { e.remove(); });
    /* sådant som webbläsartillägg (mörkt läge, markeringsverktyg m.m.) stoppar in vid körning */
    [].forEach.call(doc.querySelectorAll('[id^="dark-mode-"], [id^="highlighter--"], link[href*="fonts.googleapis.com"]'), function (e) { e.remove(); });
    [].forEach.call(doc.children, function (e) { if (e.tagName !== 'HEAD' && e.tagName !== 'BODY') e.remove(); });
    doc.classList.remove('js'); if (!doc.getAttribute('class')) doc.removeAttribute('class');
    if (b && !b.getAttribute('class')) b.removeAttribute('class');
    var falt = doc.querySelector('#aibrev .falt'); if (falt) falt.removeAttribute('style');
    var knp = doc.querySelector('#aibrev button'); if (knp) knp.removeAttribute('style');
    var tack = doc.querySelector('#aibrev .brevtack'); if (tack) tack.removeAttribute('style');
    var bm = doc.querySelector('#aibrev .brevmeta');
    if (bm) bm.textContent = 'Bara AI‑frågor. Avsluta när du vill.';
    return '<!doctype html>\n' + doc.outerHTML;
  }

  document.getElementById('rladda').addEventListener('click', function () {
    var blob = new Blob([serialisera()], { type: 'text/html' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'index.html';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  });
  document.getElementById('rgithub').addEventListener('click', function () {
    var text = serialisera();
    function oppna() { window.open('https://github.com/Snillsparv/Hemsida/edit/claude/jonasvonessen-website-redesign-gop094/' + fil, '_blank'); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(oppna, oppna);
    } else { oppna(); }
  });
})();
