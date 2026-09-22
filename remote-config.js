// Remote branding & translations sync for the extension.
// Polls the license platform for site/extension settings and applies them to
// the current page (colors via CSS variables, action title & icon via background
// message, translations by merging into window.__ql_ext_i18n).
(function () {
  var BASE = (typeof LICENSE_API_BASE !== "undefined" && LICENSE_API_BASE) || "";
  if (!BASE) return;

  var CONFIG_URL = BASE + "/api/public/v1/extension/config";
  var TR_URL = BASE + "/api/public/v1/extension/translations";
  var POLL_MS = 30000;
  var configEtag = "";
  var trEtag = "";

  function applyColors(c) {
    try {
      var root = document.documentElement;
      if (!root || !c) return;
      if (c.primary) root.style.setProperty("--ql-accent", c.primary);
      if (c.accent) root.style.setProperty("--ql-link", c.accent);
      if (c.bg) root.style.setProperty("--ql-bg", c.bg);
      if (c.text) root.style.setProperty("--ql-text-primary", c.text);
    } catch (e) {}
  }

  function applyIdentity(cfg) {
    try {
      window.__ql_remote_config = cfg;
      var name = cfg.display_name || cfg.site_name || "";
      if (name) {
        window.EXTENSION_DISPLAY_NAME = name;
      }
      if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
          action: "ext_update_action",
          title: cfg.action_title || name,
          description: cfg.description || "",
          icons: cfg.icons || null,
        });
      }
    } catch (e) {}
  }

  function fetchConfig() {
    var headers = {};
    if (configEtag) headers["If-None-Match"] = configEtag;
    fetch(CONFIG_URL, { headers: headers, credentials: "omit" })
      .then(function (r) {
        if (r.status === 304) return null;
        configEtag = r.headers.get("ETag") || configEtag;
        return r.json();
      })
      .then(function (cfg) {
        if (!cfg) return;
        applyIdentity(cfg);
        applyColors(cfg.colors || {});
        try {
          chrome.storage.local.set({ ql_ext_config: cfg, ql_ext_config_at: Date.now() });
        } catch (e) {}
      })
      .catch(function () {});
  }

  function fetchTranslations() {
    var headers = {};
    if (trEtag) headers["If-None-Match"] = trEtag;
    fetch(TR_URL, { headers: headers, credentials: "omit" })
      .then(function (r) {
        if (r.status === 304) return null;
        trEtag = r.headers.get("ETag") || trEtag;
        return r.json();
      })
      .then(function (data) {
        if (!data || !data.translations) return;
        window.__ql_ext_i18n = data.translations;
        try {
          chrome.storage.local.set({ ql_ext_i18n: data.translations, ql_ext_i18n_at: Date.now() });
        } catch (e) {}
        try {
          window.dispatchEvent(new CustomEvent("ql:remote-i18n-updated", { detail: data }));
        } catch (e) {}
      })
      .catch(function () {});
  }

  function tick() {
    fetchConfig();
    fetchTranslations();
  }

  // Initial + interval
  try {
    tick();
    setInterval(tick, POLL_MS);
  } catch (e) {}
})();
