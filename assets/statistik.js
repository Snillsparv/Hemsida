/* Besöksstatistik med PostHog i kakfritt läge.
   Inga kakor, ingen lagring i webbläsaren, ingen inspelning och inga
   personprofiler: besökare räknas med en hash som PostHog gör på sina
   servrar och som byts varje dygn. Kräver att "Cookieless server hash
   mode" är påslaget i PostHog-projektet, annars kastas händelserna. */
(function () {
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;

  var s = document.createElement('script');
  s.src = 'https://eu-assets.i.posthog.com/static/array.js';
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.onload = function () {
    if (!window.posthog || !window.posthog.init) return;
    window.posthog.init('phc_ADbD7ENhThE54GinNPoTv5XAWDkTSUPu2MmWkyAHJo4x', {
      api_host: 'https://eu.i.posthog.com',
      defaults: '2026-05-30',
      cookieless_mode: 'always',
      person_profiles: 'never',
      autocapture: false,
      capture_dead_clicks: false,
      rageclick: false,
      capture_exceptions: false,
      capture_performance: false,
      capture_heatmaps: false,
      disable_session_recording: true,
      disable_surveys: true,
      disable_external_dependency_loading: true
    });
  };
  document.head.appendChild(s);

  function redo() { return window.posthog && window.posthog.__loaded; }

  /* Sidorna kan rapportera egna händelser (t.ex. anmälan till nyhetsbrevet). */
  window.statistik = {
    handelse: function (namn, egenskaper) { if (redo()) window.posthog.capture(namn, egenskaper || {}); }
  };

  /* Klick på mejllänkar och länkar till andra sajter. Bara vart länken går,
     aldrig vem som klickade. */
  document.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
    if (!a || !redo()) return;
    var href = a.getAttribute('href') || '';
    if (href.indexOf('mailto:') === 0) {
      window.posthog.capture('mejl_klick', {
        till: a.getAttribute('data-adress') || href.slice(7).split('?')[0],
        lista: (a.parentNode && a.parentNode.id) || ''
      });
    } else if (/^https?:\/\//i.test(href) && a.host !== location.host) {
      window.posthog.capture('lank_klick', { url: href, text: (a.textContent || '').trim().slice(0, 80) });
    }
  }, true);
})();
