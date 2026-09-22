/* ==========================================================
   Floating panel i18n (multi-language) — SCOPED to #ql-floating.
   Fetches its dictionary from the admin backend so translations
   can be edited from the admin Languages page. Does NOT touch
   the host page (lovable.dev) or backend logic.
   ========================================================== */
(function () {
  if (window.QL_I18N) return;

  var STORAGE_KEY = "ql_lang";
  var CACHE_KEY = "ql_i18n_cache_v1";
  var DEFAULT_LANG = "en";

  var API_BASE =
    (typeof window !== "undefined" && window.POWERKITS_API_BASE) ||
    (typeof window !== "undefined" && window.LICENSE_API_BASE) ||
    "https://project--0fd04b22-8150-43fb-b619-3ef84b2a6ed1.lovable.app";
  var TR_URL = API_BASE + "/api/public/v1/extension/translations";

  var DICT = {};
  var LANGS = [];

  function readCache() {
    try { var raw = localStorage.getItem(CACHE_KEY); return raw ? JSON.parse(raw) : null; }
    catch (_) { return null; }
  }
  function writeCache(p) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(p)); } catch (_) {}
  }
  function applyPayload(p) {
    if (!p) return;
    if (p.translations && typeof p.translations === "object") DICT = p.translations;
    if (Array.isArray(p.languages)) LANGS = p.languages;
  }

  applyPayload(readCache());

  function fetchDict() {
    try {
      var u = TR_URL + (TR_URL.indexOf("?") === -1 ? "?" : "&") + "_ts=" + Date.now();
      fetch(u, { method: "GET", credentials: "omit", cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (p) {
          if (!p) return;
          applyPayload(p);
          writeCache(p);
          applyAll();
        })
        .catch(function () {});
    } catch (_) {}
  }

  function getLang() {
    try { return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG; }
    catch (_) { return DEFAULT_LANG; }
  }
  function setLang(v) { try { localStorage.setItem(STORAGE_KEY, v); } catch (_) {} }

  function isRTL(code) {
    var l = LANGS.find ? LANGS.find(function (x) { return x.code === code; }) : null;
    if (l && l.direction) return l.direction === "rtl";
    return code === "ar" || code === "he" || code === "fa" || code === "ur";
  }

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
    var d = DICT[getLang()];
    if (!d) return text;
    var k = String(text).trim();
    var hit = lookup(d, k);
    if (hit != null) return hit;
    var alt = k.replace(/[.…]+$/u, "");
    if (alt !== k) {
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

  function root() { return document.getElementById("ql-floating"); }

  function translateAttr(el, attr) {
    var v = el.getAttribute(attr);
    if (!v) return;
    var tr = t(v);
    if (tr !== v) {
      if (!el.hasAttribute("data-qlorig-" + attr)) el.setAttribute("data-qlorig-" + attr, v);
      el.setAttribute(attr, tr);
    }
  }
  function restoreAttr(el, attr) {
    var orig = el.getAttribute("data-qlorig-" + attr);
    if (orig != null) { el.setAttribute(attr, orig); el.removeAttribute("data-qlorig-" + attr); }
  }

  function walk(node) {
    if (!node) return;
    var lang = getLang();
    var d = DICT[lang] || {};

    var elems = [];
    if (node.nodeType === 1 && node.matches && node.matches("[placeholder],[title],[aria-label],[alt]")) elems.push(node);
    if (node.querySelectorAll) {
      var extra = node.querySelectorAll("[placeholder],[title],[aria-label],[alt]");
      for (var i = 0; i < extra.length; i++) elems.push(extra[i]);
    }
    elems.forEach(function (el) {
      ["placeholder", "title", "aria-label", "alt"].forEach(function (a) {
        if (!el.hasAttribute(a)) return;
        if (lang !== DEFAULT_LANG) translateAttr(el, a);
        else restoreAttr(el, a);
      });
    });

    if (!node.nodeType) return;
    var start = node.nodeType === 3 ? node.parentNode : node;
    if (!start || start.nodeType !== 1) return;
    var walker = document.createTreeWalker(start, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        var p = n.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        var tag = p.tagName;
        if (tag === "SCRIPT" || tag === "STYLE" || tag === "TEXTAREA") return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    var nodes = [], cur;
    while ((cur = walker.nextNode())) nodes.push(cur);
    nodes.forEach(function (n) {
      var orig = n.__qlOrig != null ? n.__qlOrig : n.nodeValue;
      var k = String(orig).trim();
      var tr = lang !== DEFAULT_LANG ? lookup(d, k) : null;
      if (tr != null) {
        if (n.__qlOrig == null) n.__qlOrig = n.nodeValue;
        n.nodeValue = n.nodeValue.replace(k, tr);
      } else if (n.__qlOrig != null) {
        n.nodeValue = n.__qlOrig;
        n.__qlOrig = null;
      }
    });
  }

  function applyDir() {
    var r = root();
    if (!r) return;
    var lang = getLang();
    r.setAttribute("dir", isRTL(lang) ? "rtl" : "ltr");
    r.setAttribute("lang", lang);
    if (isRTL(lang)) r.classList.add("ql-rtl"); else r.classList.remove("ql-rtl");
  }

  function applyAll() {
    applyDir();
    var r = root();
    if (r) walk(r);
    syncLangBtn();
  }

  function syncLangBtn() {
    var r = root();
    if (!r) return;
    var codes = LANGS.length ? LANGS.map(function (l) { return l.code; }) : ["en", "ar"];
    var cur = getLang();
    var idx = codes.indexOf(cur);
    var next = codes[(idx + 1) % codes.length] || (cur === "ar" ? "en" : "ar");
    var label = next.toUpperCase() === "EN" ? "EN" : (next === "ar" ? "ع" : next.toUpperCase());
    r.querySelectorAll(".ql-lang-btn").forEach(function (b) {
      b.textContent = label;
      b.setAttribute("title", "Language: " + next);
    });
  }

  function toggle() {
    var codes = LANGS.length ? LANGS.map(function (l) { return l.code; }) : ["en", "ar"];
    if (codes.indexOf(getLang()) === -1) codes.unshift(getLang());
    var idx = codes.indexOf(getLang());
    setLang(codes[(idx + 1) % codes.length]);
    applyAll();
  }

  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t) return;
    var btn = t.closest ? t.closest(".ql-lang-btn") : null;
    if (!btn) return;
    e.preventDefault(); e.stopPropagation();
    toggle();
  }, true);

  var scopedObs = null;
  function attachScopedObserver() {
    var r = root();
    if (!r || scopedObs) return;
    scopedObs = new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        m.addedNodes && m.addedNodes.forEach(function (n) {
          if (n.nodeType === 1) walk(n);
          else if (n.nodeType === 3 && n.parentElement) walk(n.parentElement);
        });
      });
      syncLangBtn();
    });
    scopedObs.observe(r, { childList: true, subtree: true });
    applyAll();
  }

  var rootObs = new MutationObserver(function () {
    var r = root();
    if (r && (!scopedObs || !r.__qlObserved)) {
      r.__qlObserved = true;
      scopedObs = null;
      attachScopedObserver();
    }
  });
  function startRootObserver() {
    if (!document.body) { setTimeout(startRootObserver, 100); return; }
    rootObs.observe(document.body, { childList: true, subtree: false });
    attachScopedObserver();
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
    document.addEventListener("DOMContentLoaded", startRootObserver);
  } else {
    startRootObserver();
  }

  window.QL_I18N = {
    t: t, getLang: getLang, setLang: function (c) { setLang(c); applyAll(); },
    toggle: toggle, applyAll: applyAll,
    getLanguages: function () { return LANGS.slice(); },
    refresh: fetchDict,
  };
})();
