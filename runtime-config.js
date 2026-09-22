/* ==========================================================
   Runtime config loader — fetches the extension links
   (WhatsApp, YouTube, Official channel, Telegram, Discord,
   Support, + custom social links) from the admin backend so
   they can be edited from Admin → Settings without shipping
   a new extension build.
   ========================================================== */
(function () {
  if (window.EXT_LINKS_LOADER) return;
  window.EXT_LINKS_LOADER = true;

  var CACHE_KEY = "ext_links_cache_v2";

  // Defaults are intentionally empty. All social/communication links are
  // controlled from Admin → Settings → Branding.
  var DEFAULTS = {
    whatsapp: "https://wa.me/923097241920",
    youtube: "",
    official_channel: "",
    telegram: "",
    discord: "",
    support: "",
  };

  var API_BASE =
    (typeof window !== "undefined" && window.POWERKITS_API_BASE) ||
    (typeof window !== "undefined" && window.LICENSE_API_BASE) ||
    "https://project--0fd04b22-8150-43fb-b619-3ef84b2a6ed1.lovable.app";
  var URL = API_BASE + "/api/public/v1/extension/config";

  function normalizeCustom(list) {
    if (!Array.isArray(list)) return [];
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var row = list[i];
      if (!row || typeof row !== "object") continue;
      var id = String(row.id || "").trim().slice(0, 40);
      var label = String(row.label || "").trim().slice(0, 60);
      var icon = String(row.icon || "🔗").trim().slice(0, 16) || "🔗";
      var url = String(row.url || "").trim().slice(0, 500);
      if (!id || !label || !url) continue;
      if (!/^https?:\/\//i.test(url)) continue;
      out.push({ id: id, label: label, icon: icon, url: url });
      if (out.length >= 20) break;
    }
    return out;
  }

  function stripLinksPayload(raw) {
    var links = Object.assign({}, DEFAULTS);
    var custom = [];
    if (raw && typeof raw === "object") {
      Object.keys(DEFAULTS).forEach(function (k) {
        if (typeof raw[k] === "string") links[k] = raw[k];
      });
      custom = normalizeCustom(raw.custom);
    }
    return { links: links, custom: custom };
  }

  function readCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (_) { return null; }
  }
  function writeCache(v) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(v)); } catch (_) {}
  }

  function currentPayload() {
    var cached = readCache() || {};
    var normalized = stripLinksPayload(cached.links || {});
    return {
      links: normalized.links,
      custom: normalized.custom,
      site_name: cached.site_name || "",
      site_tagline: cached.site_tagline || "",
      description: cached.description || "",
    };
  }

  var _p = currentPayload();
  window.EXT_LINKS = _p.links;
  window.EXT_CUSTOM_LINKS = _p.custom;
  window.EXT_META = { site_name: _p.site_name, site_tagline: _p.site_tagline, description: _p.description };
  window.EXT_LINK = function (name) {
    var l = window.EXT_LINKS || DEFAULTS;
    return l[name] || DEFAULTS[name] || "";
  };
  window.EXT_DESCRIPTION = function () {
    return (window.EXT_META && window.EXT_META.description) || "";
  };
  window.EXT_SOCIAL_ITEMS = function () {
    var known = [
      { key: "whatsapp", label: "WhatsApp", icon: "💬", i18n: "extension.join_whatsapp" },
      { key: "youtube", label: "YouTube", icon: "▶", i18n: "extension.join_youtube_unlock" },
      { key: "official_channel", label: "Official Channel", icon: "📢", i18n: "extension.join_official" },
      { key: "telegram", label: "Telegram", icon: "✈️", i18n: "extension.join_telegram" },
      { key: "discord", label: "Discord", icon: "🎮", i18n: "extension.join_discord" },
      { key: "support", label: "Support", icon: "🛟", i18n: "extension.join_support" },
    ];
    var links = window.EXT_LINKS || DEFAULTS;
    var items = [];
    for (var i = 0; i < known.length; i++) {
      var it = known[i];
      var url = String(links[it.key] || "").trim();
      if (!url) continue;
      items.push({
        key: it.key,
        label: it.label,
        icon: it.icon,
        url: url,
        i18n: it.i18n,
        custom: false,
      });
    }
    var custom = window.EXT_CUSTOM_LINKS || [];
    for (var c = 0; c < custom.length; c++) {
      var row = custom[c];
      if (!row || !row.url) continue;
      items.push({
        key: "custom:" + row.id,
        label: row.label || "Link",
        icon: row.icon || "🔗",
        url: row.url,
        i18n: "",
        custom: true,
      });
    }
    return items;
  };

  function applyLinksTo(root) {
    if (!root || !root.querySelectorAll) return;
    var els = root.querySelectorAll("[data-ext-link]");
    var links = window.EXT_LINKS || DEFAULTS;
    var custom = window.EXT_CUSTOM_LINKS || [];
    els.forEach(function (el) {
      var name = el.getAttribute("data-ext-link");
      if (!name) return;
      var url = "";
      if (name.indexOf("custom:") === 0) {
        var cid = name.slice(7);
        for (var i = 0; i < custom.length; i++) {
          if (custom[i] && custom[i].id === cid) {
            url = custom[i].url || "";
            break;
          }
        }
      } else {
        url = links[name] || DEFAULTS[name] || "";
      }
      if (el.tagName === "A") {
        if (!url) {
          el.style.display = "none";
        } else {
          el.style.display = "";
          el.setAttribute("href", url);
        }
      } else {
        el.setAttribute("data-ext-link-href", url);
      }
    });
    // Description slots
    var descEls = root.querySelectorAll("[data-ext-desc]");
    var desc = window.EXT_DESCRIPTION();
    descEls.forEach(function (el) {
      if (desc) {
        el.style.display = "";
        el.textContent = desc;
      } else {
        el.style.display = "none";
      }
    });
    // Name / tagline slots
    var nameEls = root.querySelectorAll("[data-ext-name]");
    nameEls.forEach(function (el) {
      var n = (window.EXT_META && window.EXT_META.site_name) || "";
      if (n) el.textContent = n;
    });
  }

  function applyLinks() {
    applyLinksTo(document.body || document.documentElement);
  }

  window.applyRuntimeLinks = applyLinks;

  function updateActionTooltip() {
    try {
      if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
          action: "ext_update_action",
          title: (window.EXT_META && window.EXT_META.site_name) || "",
          description: window.EXT_DESCRIPTION() || "",
        }, function () { void chrome.runtime.lastError; });
      }
    } catch (_) {}
  }

  function startObserver() {
    if (!document.body || window.__EXT_LINKS_OBS) return;
    window.__EXT_LINKS_OBS = true;
    var obs = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        m.addedNodes && m.addedNodes.forEach(function (node) {
          if (node.nodeType === 1) applyLinksTo(node);
        });
      });
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  function fetchFresh() {
    try {
      var u = URL + (URL.indexOf("?") === -1 ? "?" : "&") + "_ts=" + Date.now();
      fetch(u, { method: "GET", credentials: "omit", cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (p) {
          if (!p) return;
          writeCache(p);
          var normalized = stripLinksPayload(p.links || {});
          window.EXT_LINKS = normalized.links;
          window.EXT_CUSTOM_LINKS = normalized.custom;
          window.EXT_META = {
            site_name: p.site_name || "",
            site_tagline: p.site_tagline || "",
            description: p.description || "",
          };
          applyLinks();
          updateActionTooltip();
          try {
            window.dispatchEvent(new CustomEvent("ext-config-updated"));
          } catch (_) {}
        })
        .catch(function () {});
    } catch (_) {}
  }

  function boot() {
    applyLinks();
    startObserver();
    fetchFresh();
    // Auto-refresh so admin edits propagate to all installed versions
    try { setInterval(fetchFresh, 60000); } catch (_) {}
    try {
      document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "visible") fetchFresh();
      });
      window.addEventListener("focus", fetchFresh);
    } catch (_) {}
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
