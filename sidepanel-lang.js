// Language toggle wiring (UI only — does not touch backend logic)
(function () {
  function syncBtn() {
    var btn = document.getElementById('sp-lang-btn');
    if (!btn || !window.SP_I18N) return;
    var lang = window.SP_I18N.getLang();
    btn.innerHTML =
      '<span style="font-size:11px;font-weight:800;letter-spacing:0.02em">' +
      (lang === 'ar' ? 'EN' : 'ع') + '</span>';
    btn.setAttribute('title', lang === 'ar' ? 'English' : 'العربية');
  }
  function wire() {
    var btn = document.getElementById('sp-lang-btn');
    if (!btn || !window.SP_I18N) { setTimeout(wire, 120); return; }
    syncBtn();
    btn.addEventListener('click', function () {
      window.SP_I18N.toggleLang();
      syncBtn();
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else { wire(); }
})();
