/* ==========================================================
   Extension i18n (multi-language) — UI-only translator.
   Fetches its dictionary from the admin backend so translations
   can be edited from the admin Languages page. Does NOT touch
   backend logic, licensing, or business flows.
   ========================================================== */
(function () {
  var STORAGE_KEY = "sp_lang";
  var CACHE_KEY = "sp_i18n_cache_v1";
  var DEFAULT_LANG = "en";

  function resolveApiBase() {
    try {
      if (typeof window !== "undefined" && window.POWERKITS_API_BASE) return String(window.POWERKITS_API_BASE);
    } catch (_) {}
    try {
      if (typeof window !== "undefined" && window.LICENSE_API_BASE) return String(window.LICENSE_API_BASE);
    } catch (_) {}
    return "https://lovax.net";
  }

  function translationsUrl() {
    var base = resolveApiBase().replace(/\/$/, "");
    return base + "/api/public/v1/extension/translations";
  }

  // In-memory dictionaries: { [langCode]: { [key]: value } }
  var DICT = {};
  var LANGS = []; // [{ code, direction, is_default }]
  var READY = false;

  function readCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (_) { return null; }
  }
  function writeCache(payload) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(payload)); } catch (_) {}
  }

  function applyPayload(p) {
    if (!p) return;
    if (p.translations && typeof p.translations === "object") DICT = p.translations;
    if (Array.isArray(p.languages)) LANGS = p.languages;
    READY = true;
  }

  // Boot from cache first (so first paint gets translated even offline)
  applyPayload(readCache());

  function fetchDict() {
    try {
      var TR_URL = translationsUrl();
      var u = TR_URL + (TR_URL.indexOf("?") === -1 ? "?" : "&") + "_ts=" + Date.now();
      fetch(u, { method: "GET", credentials: "omit", cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (p) {
          if (!p) return;
          applyPayload(p);
          writeCache(p);
          applyAll();
        })
        .catch(function () { /* ignore, cache still applies */ });
    } catch (_) {}
  }

  function getLang() {
    try { return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG; }
    catch (_) { return DEFAULT_LANG; }
  }
  function setLang(v) {
    try { localStorage.setItem(STORAGE_KEY, v); } catch (_) {}
  }
  function isRTL(code) {
    var l = LANGS.find ? LANGS.find(function (x) { return x.code === code; }) : null;
    if (l && l.direction) return l.direction === "rtl";
    return code === "ar" || code === "he" || code === "fa" || code === "ur";
  }

  // Matches leading status glyphs like "✓ ", "✗ ", "⚠ ", "⏳ ", "✅ ", "❌ ", "🔄 ", "•  " etc.
  var PREFIX_RE = /^([\u2600-\u27BF\u2705\u274C\u26A0\u23F3\u2713\u2717\u2192\u25B6\u25C0\uD83D\uDDD1\uD83D\uDD04\uD83D\uDCAC\uD83D\uDEAB\uD83C\uDF10\u2601\uFE0F\uD83D\uDD11\s]+)(.+)$/u;

  function lookup(d, key) {
    if (!d || !key) return null;
    if (d[key] != null) return d[key];
    var m = key.match(PREFIX_RE);
    if (m && m[2] && d[m[2]] != null) return m[1] + d[m[2]];
    return null;
  }

  function t(text) {
    if (text == null) return text;
    var lang = getLang();
    var d = DICT[lang];
    if (!d) return text;
    var key = String(text).trim();
    var hit = lookup(d, key);
    if (hit != null) return hit;
    // Trailing punctuation / ellipsis variants
    var alt = key.replace(/[.…]+$/u, "");
    if (alt !== key) {
      hit = lookup(d, alt);
      if (hit != null) return hit;
      hit = lookup(d, alt + ".");
      if (hit != null) return hit;
      hit = lookup(d, alt + "...");
      if (hit != null) return hit;
      hit = lookup(d, alt + "…");
      if (hit != null) return hit;
    }
    return text;
  }

  function translateAttr(el, attr) {
    var v = el.getAttribute(attr);
    if (!v) return;
    var tr = t(v);
    if (tr !== v) {
      if (!el.hasAttribute("data-orig-" + attr)) el.setAttribute("data-orig-" + attr, v);
      el.setAttribute(attr, tr);
    }
  }
  function restoreAttr(el, attr) {
    var orig = el.getAttribute("data-orig-" + attr);
    if (orig != null) {
      el.setAttribute(attr, orig);
      el.removeAttribute("data-orig-" + attr);
    }
  }

  function walkAndTranslate(root) {
    if (!root) return;
    var lang = getLang();
    var d = DICT[lang] || {};

    var attrEls = root.querySelectorAll
      ? root.querySelectorAll("[placeholder], [title], [aria-label], [alt]")
      : [];
    attrEls.forEach(function (el) {
      ["placeholder", "title", "aria-label", "alt"].forEach(function (a) {
        if (!el.hasAttribute(a)) return;
        if (lang !== DEFAULT_LANG) translateAttr(el, a);
        else restoreAttr(el, a);
      });
    });

    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        var p = n.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        var tag = p.tagName;
        if (tag === "SCRIPT" || tag === "STYLE" || tag === "TEXTAREA")
          return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    var nodes = [], cur;
    while ((cur = walker.nextNode())) nodes.push(cur);

    nodes.forEach(function (n) {
      var orig = n.__spOrig != null ? n.__spOrig : n.nodeValue;
      var key = String(orig).trim();
      var tr = lang !== DEFAULT_LANG ? lookup(d, key) : null;
      if (tr != null) {
        if (n.__spOrig == null) n.__spOrig = n.nodeValue;
        n.nodeValue = n.nodeValue.replace(key, tr);
      } else if (n.__spOrig != null) {
        n.nodeValue = n.__spOrig;
        n.__spOrig = null;
      }
    });
  }

  function applyDirection() {
    var lang = getLang();
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.setAttribute("dir", isRTL(lang) ? "rtl" : "ltr");
    if (document.body) document.body.setAttribute("dir", isRTL(lang) ? "rtl" : "ltr");
  }

  function applyAll() {
    applyDirection();
    if (document.body) walkAndTranslate(document.body);
  }

  function startObserver() {
    if (!document.body) return;
    var obs = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        m.addedNodes && m.addedNodes.forEach(function (node) {
          if (node.nodeType === 1) walkAndTranslate(node);
          else if (node.nodeType === 3 && node.parentElement)
            walkAndTranslate(node.parentElement);
        });
      });
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  function toggleLang() {
    // Cycle through available languages (fetched from backend)
    var codes = (LANGS.length ? LANGS.map(function (l) { return l.code; }) : ["en", "ar"]);
    if (codes.indexOf(getLang()) === -1) codes.unshift(getLang());
    var idx = codes.indexOf(getLang());
    var next = codes[(idx + 1) % codes.length];
    setLang(next);
    applyAll();
  }

  window.SP_I18N = {
    t: t, getLang: getLang, setLang: function (c) { setLang(c); applyAll(); },
    toggleLang: toggleLang, applyAll: applyAll,
    getLanguages: function () { return LANGS.slice(); },
    isReady: function () { return READY; },
    refresh: fetchDict,
  };

  function boot() {
    applyDirection();
    walkAndTranslate(document.body);
    startObserver();
    fetchDict();
    // Auto-refresh so admin edits propagate to all installed versions
    try { setInterval(fetchDict, 60000); } catch (_) {}
    try {
      document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "visible") fetchDict();
      });
      window.addEventListener("focus", fetchDict);
    } catch (_) {}
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
