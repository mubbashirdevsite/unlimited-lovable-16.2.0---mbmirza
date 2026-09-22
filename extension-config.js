// Extension configuration — points to your independent License Manager platform.
// Rewritten to remove all previous external license/API dependencies.
(function () {
  function _f(n, v) {
    try {
      Object.defineProperty(window, n, { configurable: false, writable: false, value: v });
    } catch (e) {
      window[n] = v;
    }
  }

  // License Manager platform base URL (published custom domain — must be publicly
  // reachable without any preview/auth wall so chrome.identity.launchWebAuthFlow
  // can actually load /extension-auth. The Lovable preview URL returns 403.)
  var LICENSE_PLATFORM_BASE = "https://lovax.net";
  var PUBLIC_SITE_BASE = "https://lovax.net";

  _f("EXTENSION_NAME", "Mirza-Lovable");
  _f("EXTENSION_VERSION", "2.0");
  _f("EXTENSION_RELEASE", "2.0");
  _f("EXTENSION_BUILD_LABEL", "stable");
  _f("EXTENSION_UPDATE_CHECK_ENABLED", false);
  _f("EXTENSION_UPGRADE_OVERLAY_DISABLED", true);
  _f("DEFAULT_LICENSE_USER_NAME", "Mirza-Lovable User");

  // Legacy globals kept for compatibility with existing code paths.
  _f("POWERKITS_API_BASE", LICENSE_PLATFORM_BASE);
  _f("POWERKITS_API_KEY", ""); // no external key required anymore
  _f("GRINGOW_API_BASE", LICENSE_PLATFORM_BASE);
  _f("GRINGOW_API_KEY", "");
  _f("LICENSE_API_BASE", LICENSE_PLATFORM_BASE);
  _f("PUBLIC_SITE_BASE", PUBLIC_SITE_BASE);

  _f("DISCORD_SUPPORT_URL", "");
  _f("PROXY_COMMAND_URL", ""); // proxy is not used by the new license flow
  // native = type into Lovable chat + click Send; full Empire pageHook rewrites to fix_error.
  _f("SEND_STRATEGY", "native");
  _f("POWERKITS_DEBUG", false);
  // Keep credit-bypass armed like Empire (pageHook rewrite stays ON).
  // License UI still uses ql_license_valid; this only keeps Fix Error rewrite active.
  _f("INTERNAL_LICENSE_MODE", true);
  _f("EXTENSION_TEST_MODE", true);
  _f("EXTENSION_STORE_LOCK_DISABLED", true);
  _f("SIDE_PANEL_ONLY", true);
})();

function extensionVersionShort() {
  return typeof EXTENSION_VERSION !== "undefined" ? String(EXTENSION_VERSION) : "0.0.0";
}
function extensionDisplayName() {
  try {
    if (typeof window !== "undefined" && window.EXTENSION_DISPLAY_NAME) return String(window.EXTENSION_DISPLAY_NAME);
  } catch (e) {}
  return typeof EXTENSION_NAME !== "undefined" ? String(EXTENSION_NAME) : "Mirza-Lovable";
}
function extensionFooterBadge() {
  return extensionDisplayName() + " • v" + extensionVersionShort();
}
function powerkitsApiHeaders(extra) {
  return Object.assign({ "Content-Type": "application/json" }, extra || {});
}
function gringowApiHeaders(extra) { return powerkitsApiHeaders(extra); }

function pkResolveLicenseStatus(data) {
  if (!data) return null;
  if (data.license_status) return data.license_status;
  if (data.status_code) return data.status_code;
  if (data.valid === true && data.status === "ok") return "active";
  return data.status || null;
}

function pkLicenseStoragePatch(data) {
  data = data || {};
  var features = Array.isArray(data.features) ? data.features : [];
  var featuresMap = (data.plan && data.plan.features_map) || null;
  if (!featuresMap) {
    featuresMap = {};
    for (var i = 0; i < features.length; i++) featuresMap[features[i]] = true;
  }
  return {
    ql_session_id: data.session_id || data.session_token || null,
    ql_expires_at: data.expires_at || null,
    ql_activated_at: data.activated_at || null,
    ql_license_status: pkResolveLicenseStatus(data),
    ql_plan_name: (data.plan && data.plan.name) || data.plan_name || null,
    ql_plan_code: (data.plan && data.plan.code) || data.plan_code || null,
    ql_is_trial: !!(data.is_trial || (data.plan && data.plan.is_trial)),
    ql_days_remaining: data.days_remaining != null ? data.days_remaining : null,
    ql_validity_minutes: data.validity_minutes != null ? data.validity_minutes : (data.minutes_remaining != null ? data.minutes_remaining : null),
    ql_features: features,
    ql_features_map: featuresMap
  };
}

// Global feature gate. Returns true if the plan enables the given feature key.
// Safe default: if we don't yet have plan info, allow (server still enforces).
function pkHasFeature(key) {
  try {
    if (!key) return true;
    var map = (typeof window !== "undefined" && window.__ql_features_map) || null;
    if (map && typeof map === "object") return !!map[key];
  } catch (e) {}
  return true;
}
try {
  // Keep an in-memory mirror of features_map for synchronous checks.
  chrome.storage.local.get(["ql_features_map"], function (r) {
    try { window.__ql_features_map = (r && r.ql_features_map) || null; } catch (e) {}
  });
  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area !== "local" || !changes.ql_features_map) return;
    try { window.__ql_features_map = changes.ql_features_map.newValue || null; } catch (e) {}
  });
} catch (e) {}

function normalizeLicenseUserName(name) {
  var n = String(name || "").trim();
  return n || (typeof DEFAULT_LICENSE_USER_NAME !== "undefined" ? DEFAULT_LICENSE_USER_NAME : "User");
}
