// Security hardening — hardened against false-positives.
// Previous version aggressively wiped chrome.storage.local and destroyed the
// DOM on any anti-debug trigger, which fired on slow devices / mobile and
// caused the extension to appear "deleted" after launch. This build keeps the
// non-destructive UX guards (context menu / copy / devtools shortcut blocks)
// and removes every path that clears storage or nukes the page.
(function () {
  var _d = document;

  function _isExtUI(el) {
    if (!el) return false;
    if (el.nodeType === 3) el = el.parentElement;
    if (!el || typeof el.closest !== 'function') return false;
    return !!(
      el.closest('#ql-floating') ||
      el.closest('#sp-body') ||
      el.closest('#ql-whatsapp-overlay') ||
      el.closest('#ql-custom-alert') ||
      el.closest('#ql-notif-panel') ||
      el.closest('.ql-sweetalert-overlay')
    );
  }

  // Kept as a no-op so any legacy caller (window._pkS.destroy / lock / check)
  // still resolves without side effects.
  function _noop() {}
  function _hash(s) {
    var h = 0, i, c;
    for (i = 0; i < String(s).length; i++) {
      c = s.charCodeAt(i);
      h = ((h << 5) - h) + c;
      h |= 0;
    }
    return 'h' + Math.abs(h).toString(16);
  }

  try {
    window._pkS = {
      lock: _noop,
      check: _noop,
      hash: _hash,
      destroy: _noop,
      integrityToken: _hash('pk_' + Date.now() + '_' + Math.random()),
      integrityCheck: _noop
    };
  } catch (e) {}

  // UX-level guards only. Never touch storage, never remove DOM, never throw.
  try {
    _d.addEventListener('contextmenu', function (e) {
      if (_isExtUI(e.target)) return;
      e.preventDefault();
    });
    _d.addEventListener('keydown', function (e) {
      if (_isExtUI(e.target)) return;
      if (e.key === 'F12') { e.preventDefault(); }
    });
  } catch (e) {}
})();
