// License guard — server-authoritative.
// Every check hits the License Manager API. Nothing in this file trusts
// chrome.storage.local by itself. If someone strips or edits this file, the
// buttons in content.js call these functions and will not run without a
// real, fresh, valid response from the server.
(function () {
  var VERIFY_PATH = "/api/public/v1/license/verify";
  var CACHE_MS = 15000; // brief cache to avoid hammering the server
  var _cache = null; // { at, ok, data }

  function _apiBase() {
    try {
      if (typeof POWERKITS_API_BASE !== "undefined" && POWERKITS_API_BASE) return POWERKITS_API_BASE;
    } catch (e) {}
    try {
      if (typeof GRINGOW_API_BASE !== "undefined" && GRINGOW_API_BASE) return GRINGOW_API_BASE;
    } catch (e) {}
    return "";
  }

  function _apiHeaders() {
    try {
      if (typeof powerkitsApiHeaders === "function") return powerkitsApiHeaders({ "Content-Type": "application/json" });
    } catch (e) {}
    try {
      if (typeof gringowApiHeaders === "function") return gringowApiHeaders({ "Content-Type": "application/json" });
    } catch (e) {}
    return { "Content-Type": "application/json" };
  }

  function _getStored() {
    return new Promise(function (resolve) {
      try {
        chrome.storage.local.get(
          ["ql_license_key", "ql_session_id", "ql_device_id", "ql_hw_fingerprint", "ql_trial_device_id"],
          async function (r) {
            r = r || {};
            var device = String(r.ql_device_id || r.ql_hw_fingerprint || r.ql_trial_device_id || "").trim();
            if ((!device || device === "undefined" || device === "null") && typeof getHardwareFingerprint === "function") {
              try { device = await getHardwareFingerprint(); } catch (e) { device = ""; }
            }
            if (device && device !== "undefined" && device !== "null") {
              r.ql_device_id = device;
              try { chrome.storage.local.set({ ql_device_id: device, ql_hw_fingerprint: device, ql_trial_device_id: device }); } catch (e) {}
            }
            resolve(r);
          }
        );
      } catch (e) { resolve({}); }
    });
  }

  function _fetchVerify(body) {
    var url = _apiBase() + VERIFY_PATH;
    // Prefer background fetch (CSP-safe); fall back to window.fetch.
    if (typeof bgFetch === "function") {
      return bgFetch(url, { method: "POST", headers: _apiHeaders(), body: JSON.stringify(body) });
    }
    return fetch(url, { method: "POST", headers: _apiHeaders(), body: JSON.stringify(body) })
      .then(function (r) { return r.json(); });
  }

  function _serverVerify(force) {
    if (!force && _cache && (Date.now() - _cache.at) < CACHE_MS) {
      return Promise.resolve(_cache);
    }
    return _getStored().then(function (s) {
      if (!s.ql_license_key) {
        _cache = { at: Date.now(), ok: false, data: { valid: false, reason: "no_key", message: "No license key" } };
        return _cache;
      }
      var payload = {
        license_key: s.ql_license_key,
        session_id: s.ql_session_id || null,
        session_token: s.ql_session_id || null,
        device_id: s.ql_device_id || s.ql_hw_fingerprint || s.ql_trial_device_id || null,
        deviceId: s.ql_device_id || s.ql_hw_fingerprint || s.ql_trial_device_id || null,
        heartbeat: false,
        extension_version: (typeof CURRENT_EXT_VERSION !== "undefined" ? CURRENT_EXT_VERSION : null)
      };
      return _fetchVerify(payload).then(function (data) {
        var ok = !!(data && data.valid === true);
        _cache = { at: Date.now(), ok: ok, data: data || {} };
        return _cache;
      }).catch(function (err) {
        // Network error → treat as NOT allowed. No offline bypass.
        _cache = { at: Date.now(), ok: false, data: { valid: false, reason: "network", message: (err && err.message) || "Network error" } };
        return _cache;
      });
    });
  }

  function _define(name, fn) {
    try {
      Object.defineProperty(window, name, { configurable: false, writable: false, value: fn });
    } catch (e) { window[name] = fn; }
  }

  _define("pkInvalidateAssertCache", function () { _cache = null; });

  // Always server-verified. Returns { allowed, valid, expires_at, ... }.
  _define("pkEnsureActiveLicense", async function (force) {
    var r = await _serverVerify(force === true);
    var d = r.data || {};
    return {
      allowed: r.ok,
      valid: r.ok,
      reason: d.reason || null,
      message: d.message || null,
      expires_at: d.expires_at || null,
      status: d.status || null,
      session_id: d.session_id || null,
      user_name: d.user_name || null
    };
  });

  _define("pkIsStaleLicenseReason", function (reason) {
    var r = String(reason || "").toLowerCase();
    return (
      r === "not_found" ||
      r === "deactivated" ||
      r === "missing" ||
      r === "invalid" ||
      r === "session_not_found" ||
      r === "device_not_found" ||
      r === "license_not_found" ||
      r === "unknown_license" ||
      r === "no_session" ||
      r === "orphan"
    );
  });

  _define("pkRevokeLicenseStorage", function (opts) {
    _cache = null;
    opts = opts || {};
    var keys = [
      "ql_license_valid",
      "ql_license_key",
      "ql_session_id",
      "ql_user_name",
      "ql_expires_at",
      "ql_activated_at",
      "ql_license_status",
      "ql_validity_minutes",
      "ql_auth_session",
      "ql_plan_name",
      "ql_plan_code",
      "ql_is_trial",
      "ql_days_remaining",
      "ql_features",
      "ql_features_map",
      // Legacy keys from older builds. Clearing these stops old devices from
      // retrying deleted sessions/license rows after data cleanup.
      "license_key",
      "session_id",
      "session_token",
      "auth_session",
      "user_session",
      "pk_license_key",
      "pk_session_id",
      "pk_session_token"
    ];
    // Never clear device fingerprint by default — one free trial is bound to the device.
    // Only wipe device ids when explicitly requested (rare admin/debug paths).
    if (opts.clearDevice === true) {
      keys.push("ql_device_id", "ql_hw_fingerprint", "ql_trial_device_id");
    }
    return new Promise(function (resolve) {
      try {
        chrome.storage.local.remove(keys, function () { resolve(); });
      } catch (e) {
        resolve();
      }
    });
  });

  _define("pkShouldLockoutFromValidation", function (data, count) {
    var reason = data && data.reason;
    var stale =
      typeof window.pkIsStaleLicenseReason === "function" &&
      window.pkIsStaleLicenseReason(reason);
    if (
      stale ||
      reason === "expired" ||
      reason === "invalid" ||
      reason === "revoked" ||
      reason === "suspended" ||
      reason === "no_key"
    ) {
      return {
        lock: true,
        conflictCount: count,
        stale: !!stale,
        message:
          (data && data.message) ||
          (stale
            ? "Previous license session is gone. Please sign in or start a new trial."
            : "License invalid"),
      };
    }
    return { lock: false, conflictCount: count, stale: false };
  });

  /**
   * Auto-reset for old devices: verify returned not_found / deactivated / invalid
   * (storage points at deleted DB rows). Wipe local license state so the
   * UI can show login/trial instead of looping on a dead session.
   */
  _define("pkAutoResetStaleLicense", function (data) {
    var reason = data && data.reason;
    var status = data && data.status;
    var stale =
      typeof window.pkIsStaleLicenseReason === "function" &&
      window.pkIsStaleLicenseReason(reason);
    // Some older API responses used status without reason.
    if (!stale && data && data.valid === false) {
      var s = String(status || "").toLowerCase();
      var r2 = String(reason || "").toLowerCase();
      if (
        s === "not_found" ||
        s === "deactivated" ||
        r2 === "invalid" ||
        (s === "error" && (r2 === "invalid" || r2 === "not_found"))
      ) {
        stale = true;
        reason = reason || s || "not_found";
      }
    }
    if (!stale && data && data.valid === false && !reason) {
      stale = true;
      reason = "not_found";
    }
    if (!stale) {
      return Promise.resolve({ reset: false, reason: reason || null });
    }
    _cache = null;
    // Keep device fingerprint so Free Trial stays one-key-per-device after reset.
    return window.pkRevokeLicenseStorage({ clearDevice: false }).then(function () {
      try {
        window.__ql_features_map = null;
      } catch (e) {}
      return {
        reset: true,
        reason: reason || "not_found",
        message:
          (data && data.message) ||
          "Previous session was cleared. Sign in or start a Free Trial.",
      };
    });
  });

  _define("pkLicenseUploadHeaders", async function () {
    // Only issue headers when the server currently accepts the license.
    var r = await _serverVerify(false);
    if (!r.ok) return { "x-license-key": "", "x-session-id": "", "x-device-id": "" };
    var s = await _getStored();
    return {
      "x-license-key": s.ql_license_key || "",
      "x-session-id": s.ql_session_id || "",
      "x-device-id": s.ql_device_id || s.ql_hw_fingerprint || s.ql_trial_device_id || ""
    };
  });

  // Legacy name kept for callers — now means "server confirms the license".
  _define("pkLocalLicenseReady", async function () {
    var r = await _serverVerify(false);
    return r.ok;
  });

  // Public helper for content.js action buttons.
  _define("pkAssertServerLicense", async function (opts) {
    var r = await _serverVerify(!!(opts && opts.force));
    return { ok: r.ok, data: r.data || {} };
  });
})();
