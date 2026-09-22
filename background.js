// Service-worker safety: some bundlers/obfuscators emit `window` references.
if (typeof self !== "undefined" && typeof window === "undefined") { self.window = self; }

console.log("[Background] lovax service worker started");

function ignoreLastError() {
  try { void chrome.runtime.lastError; } catch (_) {}
}

function decodeJwtExpMs(token) {
  try {
    var parts = String(token || "").replace(/^Bearer\s+/i, "").trim().split(".");
    if (parts.length < 2) return 0;
    var b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    var padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    var json = JSON.parse(atob(padded));
    return json.exp ? json.exp * 1000 : 0;
  } catch (e) {
    return 0;
  }
}

function normalizeJwtToken(token) {
  return String(token || "").replace(/^Bearer\s+/i, "").trim();
}

function pickBestJwtToken(candidates) {
  var best = "";
  var bestExp = 0;
  (candidates || []).forEach(function(item) {
    var t = normalizeJwtToken(item);
    if (!t || t.indexOf("eyJ") !== 0 || t.split(".").length !== 3) return;
    var exp = decodeJwtExpMs(t);
    if (!best || exp > bestExp) {
      best = t;
      bestExp = exp;
    }
  });
  return best;
}

function extractJwtTokensFromCookies(cookies) {
  var found = [];
  (cookies || []).forEach(function(cookie) {
    if (!cookie || !cookie.value) return;
    var value = String(cookie.value).replace(/^"|"$/g, "");
    if (value.indexOf("eyJ") === 0 && value.split(".").length === 3) {
      found.push(value);
    }
  });
  return found;
}

function projectIdFromUrl(url) {
  var m = String(url || "").match(/\/projects\/([0-9a-fA-F-]{36})/);
  return m ? m[1] : "";
}

var LOVABLE_TAB_URLS = ["*://lovable.dev/*", "*://*.lovable.dev/*"];
var LICENSE_API_FALLBACK_BASE = "https://project--0fd04b22-8150-43fb-b619-3ef84b2a6ed1.lovable.app";

function parseProxyFetchBody(text) {
  try { return JSON.parse(text); } catch (e) { return { raw: text }; }
}

function isProxyHtmlOrGatewayError(data) {
  if (!data || typeof data.raw !== "string") return false;
  var raw = data.raw.trim();
  return /^error code: 50[234]$/i.test(raw) || /<!DOCTYPE|<html|cloudflare|bad gateway|auth-bridge/i.test(raw);
}

function fallbackApiUrl(url) {
  try {
    var u = new URL(String(url || ""));
    if (u.pathname.indexOf("/api/public/") !== 0) return "";
    if (u.origin === LICENSE_API_FALLBACK_BASE) return "";
    return LICENSE_API_FALLBACK_BASE + u.pathname + u.search;
  } catch (e) {
    return "";
  }
}

function findLovableProjectTab(callback) {
  chrome.storage.local.get(["lovable_projectId"], function (stored) {
    var storedPid = stored.lovable_projectId || "";
    chrome.windows.getCurrent(function (win) {
      chrome.tabs.query({ url: LOVABLE_TAB_URLS }, function (tabs) {
        var list = tabs || [];
        var activeProject = null;
        var storedMatch = null;
        var anyProject = null;
        var anyLovable = null;

        list.forEach(function (tab) {
          if (!tab || !tab.url || tab.url.indexOf("lovable.dev") === -1) return;
          if (!anyLovable) anyLovable = tab;
          var pid = projectIdFromUrl(tab.url);
          if (!pid) return;
          if (!anyProject) anyProject = tab;
          if (storedPid && pid === storedPid) storedMatch = tab;
          if (win && tab.windowId === win.id && tab.active) activeProject = tab;
        });

        callback(activeProject || storedMatch || anyProject || anyLovable || null);
      });
    });
  });
}

function tabPing(tabId) {
  return new Promise(function (resolve) {
    chrome.tabs.sendMessage(tabId, { action: "ping" }, function (resp) {
      if (chrome.runtime.lastError) return resolve(false);
      resolve(!!(resp && resp.ok));
    });
  });
}

var BRIDGE_INJECT_FILES = [
  "security-hardening.js",
  "extension-config.js",
  "hwFingerprint.js",
  "user-messages.js",
  "content-bridge.js"
];

function injectContentBridge(tabId) {
  return chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: BRIDGE_INJECT_FILES
  });
}

function sendPromptOnTab(tabId, message) {
  return new Promise(function (resolve, reject) {
    chrome.tabs.sendMessage(tabId, { action: "qlSendViaWs", message: message }, function (resp) {
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message));
      }
      if (resp && resp.ok) return resolve(resp);
      reject(new Error((resp && resp.error) || "Send failed"));
    });
  });
}

async function deliverPromptViaTab(message) {
  var tab = await new Promise(function (resolve) {
    findLovableProjectTab(resolve);
  });
  if (!tab || !tab.id) {
    throw new Error("Open your Lovable project on lovable.dev (project URL), then try again.");
  }
  if (!projectIdFromUrl(tab.url) && tab.url.indexOf("lovable.dev") === -1) {
    throw new Error("Open a lovable.dev project tab and refresh it after updating the extension.");
  }

  var tabId = tab.id;
  try {
    await chrome.tabs.update(tabId, { active: true });
    if (tab.windowId != null) {
      await chrome.windows.update(tab.windowId, { focused: true });
    }
    await new Promise(function (r) { setTimeout(r, 150); });
  } catch (e) {}

  var alive = await tabPing(tabId);
  if (!alive) {
    try {
      await injectContentBridge(tabId);
      await new Promise(function (r) { setTimeout(r, 150); });
    } catch (e) {
      throw new Error("Could not attach to the Lovable tab. Refresh the project page and try again.");
    }
  }
  // Force credit-bypass on the tab before delivering the prompt (pageHook rewrites requests as try-to-fix).
  try {
    await new Promise(function (r) {
      chrome.tabs.sendMessage(tabId, { action: "qlActivateBypass" }, function () { ignoreLastError(); r(); });
    });
    await new Promise(function (r) { setTimeout(r, 50); });
  } catch (e) {}


  try {
    return await sendPromptOnTab(tabId, message);
  } catch (firstErr) {
    var errMsg = (firstErr && firstErr.message) || "";
    if (errMsg.indexOf("Receiving end") === -1 && errMsg.indexOf("Could not establish connection") === -1) {
      throw firstErr;
    }
    await injectContentBridge(tabId);
    await new Promise(function (r) { setTimeout(r, 200); });
    return await sendPromptOnTab(tabId, message);
  }
}

function collectLovableCookies(callback) {
  var domains = ["lovable.dev", ".lovable.dev"];
  var all = [];
  var pending = domains.length;
  if (!pending) return callback(all);
  domains.forEach(function(domain) {
    chrome.cookies.getAll({ domain: domain }, function(cookies) {
      if (cookies && cookies.length) all = all.concat(cookies);
      pending -= 1;
      if (pending === 0) callback(all);
    });
  });
}

function syncLovableAuth(tabUrl, hintProjectId, done) {
  collectLovableCookies(function(cookies) {
    var cookieToken = pickBestJwtToken(extractJwtTokensFromCookies(cookies));
    var projectId = projectIdFromUrl(tabUrl) || hintProjectId || "";
    chrome.storage.local.get(["lovable_token", "lovable_projectId"], function(stored) {
      var storedToken = normalizeJwtToken(stored.lovable_token || "");
      var token = storedToken;
      if (cookieToken && decodeJwtExpMs(cookieToken) >= decodeJwtExpMs(storedToken)) {
        token = cookieToken;
      }
      var updates = {};
      if (token) updates.lovable_token = token;
      if (projectId) updates.lovable_projectId = projectId;
      else if (stored.lovable_projectId) updates.lovable_projectId = stored.lovable_projectId;

      var finish = function(result) {
        if (typeof done === "function") done(result);
      };

      if (!Object.keys(updates).length) {
        finish({ ok: false, token: storedToken, projectId: stored.lovable_projectId || "" });
        return;
      }

      chrome.storage.local.set(updates, function() {
        finish({
          ok: !!token,
          token: updates.lovable_token || storedToken,
          projectId: updates.lovable_projectId || stored.lovable_projectId || "",
          fresh: decodeJwtExpMs(updates.lovable_token || storedToken) > Date.now() + 30000
        });
      });
    });
  });
}

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status !== "complete" || !tab || !tab.url) return;
  if (tab.url.indexOf("lovable.dev") === -1) return;
  syncLovableAuth(tab.url, "", function() {
    try {
      chrome.tabs.sendMessage(tabId, { action: "requestTokenRefresh" }, ignoreLastError);
    } catch (e) {}
  });
});

function isMobileChromiumRuntime() {
  try {
    var ua = (navigator && navigator.userAgent || "").toLowerCase();
    return /android|mobile|kiwi|yabrowser|crios|edga\//i.test(ua);
  } catch (_) {
    return false;
  }
}

function supportsNativeSidePanel() {
  try {
    return !isMobileChromiumRuntime()
      && !!chrome.sidePanel
      && typeof chrome.sidePanel.open === "function"
      && typeof chrome.sidePanel.setOptions === "function";
  } catch (_) {
    return false;
  }
}

function openExtensionPanelTab(cb) {
  var url = chrome.runtime.getURL("sidepanel.html?fullscreen=1");
  try {
    chrome.tabs.query({ url: chrome.runtime.getURL("sidepanel.html*") }, function (tabs) {
      var existing = (tabs || [])[0];
      if (existing && existing.id) {
        chrome.tabs.update(existing.id, { active: true }, function () {
          if (existing.windowId && chrome.windows && chrome.windows.update) {
            try { chrome.windows.update(existing.windowId, { focused: true }); } catch (_) {}
          }
          cb && cb({ ok: true, fallback: true, reused: true });
        });
        return;
      }
      chrome.tabs.create({ url: url, active: true }, function () {
        cb && cb({ ok: true, fallback: true });
      });
    });
  } catch (_) {
    try { chrome.tabs.create({ url: url, active: true }); } catch (e) {}
    cb && cb({ ok: true, fallback: true });
  }
}

function openMobileInlinePanel(tab, cb) {
  if (!tab || !tab.id) {
    cb && cb({ ok: false, inline: true, error: "No active tab" });
    return;
  }

  var didInject = false;
  function sendOpen() {
    try {
      chrome.tabs.sendMessage(tab.id, { action: "qlMobileOpenPanel" }, function (resp) {
        if (!chrome.runtime.lastError && resp && resp.ok) {
          cb && cb(Object.assign({ ok: true, inline: true }, resp));
          return;
        }

        if (didInject) {
          cb && cb({ ok: false, inline: true, error: (chrome.runtime.lastError && chrome.runtime.lastError.message) || "Mobile launcher is not available on this page" });
          return;
        }

        didInject = true;
        try {
          chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["mobile-launcher.js"] }, function () {
            if (chrome.runtime.lastError) {
              cb && cb({ ok: false, inline: true, error: chrome.runtime.lastError.message });
              return;
            }
            setTimeout(sendOpen, 80);
          });
        } catch (err) {
          cb && cb({ ok: false, inline: true, error: err && err.message });
        }
      });
    } catch (err) {
      cb && cb({ ok: false, inline: true, error: err && err.message });
    }
  }

  sendOpen();
}

async function enableActionSidePanel() {
  if (!supportsNativeSidePanel()) return;
  try {
    await chrome.sidePanel.setOptions({ path: "sidepanel.html", enabled: true });
  } catch (err) {
    console.warn("[Background] sidePanel.setOptions:", err && err.message ? err.message : err);
  }
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } catch (err) {
    console.warn("[Background] sidePanel.setPanelBehavior:", err && err.message ? err.message : err);
  }
}

function openSidePanelSync(tab, cb) {
  try {
    if (!tab || !tab.id) {
      if (isMobileChromiumRuntime()) cb && cb({ ok: false, error: "Open any page first, then tap the extension icon." });
      else openExtensionPanelTab(cb);
      return;
    }
    // Mobile Chromium/Kiwi must never open a new tab. It opens the in-page
    // floating launcher instead; desktop Chrome keeps the native side panel.
    if (!supportsNativeSidePanel()) {
      openMobileInlinePanel(tab, function (res) {
        if (res && res.ok) {
          cb && cb(res);
          return;
        }
        if (isMobileChromiumRuntime()) cb && cb(res || { ok: false, inline: true });
        else openExtensionPanelTab(cb);
      });
      return;
    }
    // MUST be synchronous inside the user gesture — no await before this call.
    chrome.sidePanel.open({ tabId: tab.id }, function () {
      if (chrome.runtime.lastError) {
        var message = chrome.runtime.lastError.message;
        if (isMobileChromiumRuntime()) {
          openMobileInlinePanel(tab, function (res) {
            cb && cb(Object.assign({}, res || {}, { message: message }));
          });
        } else {
          openExtensionPanelTab(function (res) {
            cb && cb(Object.assign({}, res || {}, { message: message }));
          });
        }
        return;
      }
      chrome.storage.local.set({ ql_sidebar_mode: true });
      enableActionSidePanel();
      cb && cb({ ok: true });
    });
  } catch (err) {
    if (isMobileChromiumRuntime() && tab && tab.id) {
      openMobileInlinePanel(tab, function (res) {
        cb && cb(Object.assign({}, res || {}, { message: err && err.message }));
      });
    } else {
      openExtensionPanelTab(function (res) {
        cb && cb(Object.assign({}, res || {}, { message: err && err.message }));
      });
    }
  }
}

async function openPowerkitsSidePanel(tab) {
  return new Promise((resolve) => openSidePanelSync(tab, resolve));
}


enableActionSidePanel();
chrome.storage.local.set({ ql_sidebar_mode: true });

chrome.runtime.onInstalled.addListener(function (details) {
  chrome.storage.local.set({ ql_sidebar_mode: true });
  enableActionSidePanel();

  // Existing browsers keep old Lovable tabs alive with a STALE MAIN-world
  // pageHook (no fix_error rewrite). New devices work because they load fresh.
  // Force-reload every lovable.dev tab after install/update so the new hook runs.
  function reloadLovableTabs() {
    try {
      chrome.tabs.query({ url: LOVABLE_TAB_URLS }, function (tabs) {
        (tabs || []).forEach(function (tab) {
          if (!tab || tab.id == null) return;
          try {
            chrome.tabs.reload(tab.id, { bypassCache: true }, function () {
              ignoreLastError();
            });
          } catch (e) {}
        });
      });
    } catch (e) {}
  }

  if (!details || details.reason === "install" || details.reason === "update") {
    // Slight delay so the new service worker + content scripts are registered.
    setTimeout(reloadLovableTabs, 500);
  }
});

chrome.runtime.onStartup.addListener(() => {
  enableActionSidePanel();
  // Old devices often leave Lovable tabs open overnight with a stale hook.
  // Soft-rearm: inject bridge + activate bypass without full reload when possible.
  try {
    chrome.tabs.query({ url: LOVABLE_TAB_URLS }, function (tabs) {
      (tabs || []).forEach(function (tab) {
        if (!tab || tab.id == null) return;
        try {
          chrome.tabs.sendMessage(tab.id, { action: "qlActivateBypass" }, ignoreLastError);
          chrome.tabs.sendMessage(tab.id, { action: "setCreditBypass", active: true }, ignoreLastError);
        } catch (e) {}
        try {
          injectContentBridge(tab.id).catch(function () {});
        } catch (e2) {}
      });
    });
  } catch (e) {}
});

chrome.storage.local.get(["ql_sidebar_mode"], (res) => {
  if (res.ql_sidebar_mode !== true) {
    chrome.storage.local.set({ ql_sidebar_mode: true });
  }
  enableActionSidePanel();
});

chrome.action.onClicked.addListener((tab) => {
  openSidePanelSync(tab);
});

// External messages from the lovax.net /extension-auth page. The page runs
// Google sign-in in a normal browser tab (managed Lovable Cloud broker uses a
// popup with web_message that can't run inside chrome.identity), then posts
// the resulting session back here so the side panel can consume it.
try {
  if (chrome.runtime && chrome.runtime.onMessageExternal) {
    chrome.runtime.onMessageExternal.addListener(function (msg, sender, sendResponse) {
      try {
        if (!msg || msg.type !== "gauth_session" || !msg.session || !msg.session.access_token) {
          sendResponse && sendResponse({ ok: false, reason: "invalid" });
          return true;
        }
        // Relay to any open side panel / popup.
        try { chrome.runtime.sendMessage({ type: "ext_gauth_session", session: msg.session }); } catch (e) {}
        // Close the sender tab so the user is returned to their previous context.
        try {
          if (sender && sender.tab && typeof sender.tab.id === "number") {
            setTimeout(function () { try { chrome.tabs.remove(sender.tab.id); } catch (e) {} }, 400);
          }
        } catch (e) {}
        sendResponse && sendResponse({ ok: true });
      } catch (e) {
        try { sendResponse && sendResponse({ ok: false, error: String(e && e.message || e) }); } catch (e2) {}
      }
      return true;
    });
  }
} catch (e) {}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.action === "lovableSync") {
    chrome.storage.local.get(["lovable_token", "lovable_projectId"], function(stored) {
      const updates = {};
      if (msg.token) {
        var incoming = normalizeJwtToken(msg.token);
        var current = normalizeJwtToken(stored.lovable_token || "");
        if (incoming && (!current || decodeJwtExpMs(incoming) >= decodeJwtExpMs(current) - 5000)) {
          updates.lovable_token = incoming;
        }
      }
      if (msg.projectId) updates.lovable_projectId = msg.projectId;
      if (msg.browserSessionId) updates.lovable_browserSessionId = String(msg.browserSessionId).trim();
      if (Object.keys(updates).length) {

        chrome.storage.local.set(updates, function() {});
      }
    });
    return false;
  }

  if (msg && msg.action === "activateSidebar") {
    if (sender.tab && sender.tab.id) {
      openSidePanelSync(sender.tab, (res) => sendResponse(res || { ok: true }));
    } else {
      sendResponse({ ok: false, deferred: true, message: "Click the extension icon to open the side panel." });
    }
    return true;
  }

  if (msg && msg.action === "deactivateSidebar") {
    sendResponse({ ok: true });
    return false;
  }

  if (msg && msg.action === "openSidePanel") {
    if (sender.tab && sender.tab.id) {
      openSidePanelSync(sender.tab, (res) => sendResponse(res || { ok: true }));
    } else {
      sendResponse({ ok: false, error: "No tab context" });
    }
    return true;
  }


  if (msg && msg.action === "proxyFetch") {
    (async () => {
      try {
        if (typeof POWERKITS_DEBUG !== "undefined" && POWERKITS_DEBUG) {
          console.log("[Background] proxyFetch ->", msg.url);
        }
        var opts = {
          method: msg.method || "POST",
          headers: msg.headers || {},
        };
        if (msg.body) opts.body = msg.body;
        var resp = await fetch(msg.url, opts);
        var text = await resp.text();
        var data = parseProxyFetchBody(text);
        var fallbackUrl = (!resp.ok && isProxyHtmlOrGatewayError(data)) ? fallbackApiUrl(msg.url) : "";
        if (fallbackUrl) {
          try {
            var retryResp = await fetch(fallbackUrl, opts);
            var retryText = await retryResp.text();
            var retryData = parseProxyFetchBody(retryText);
            if (retryResp.ok || !isProxyHtmlOrGatewayError(retryData)) {
              resp = retryResp;
              data = retryData;
            }
          } catch (retryErr) {
            if (typeof POWERKITS_DEBUG !== "undefined" && POWERKITS_DEBUG) {
              console.warn("[Background] proxyFetch fallback failed:", retryErr);
            }
          }
        }
        if (!resp.ok && data && data.raw && typeof data.raw === "string") {
          var raw = data.raw.trim();
          if (/^error code: 502$/i.test(raw) || /^error code: 503$/i.test(raw)) {
            data.error_display = "Service is temporarily unavailable (gateway timeout). Try again in a few minutes.";
          } else if (raw.length > 120 && /<!DOCTYPE|<html|cloudflare|bad gateway/i.test(raw)) {
            data.error_display = "The license login server returned a temporary web page instead of JSON. Reload the extension and try again.";
          }
        }
        sendResponse({ ok: resp.ok, status: resp.status, data: data });
      } catch (err) {
        console.error("[Background] proxyFetch error:", err);
        sendResponse({ ok: false, status: 0, data: { error: err.message || "Fetch failed in background" } });
      }
    })();
    return true;
  }

  if (msg && msg.action === "readCookies") {
    collectLovableCookies(function(cookies) {
      var tokens = extractJwtTokensFromCookies(cookies);
      var foundTokens = tokens.map(function(token, index) {
        return { token: token, cookieName: "scan-" + index, httpOnly: false };
      });
      sendResponse({ success: foundTokens.length > 0, tokens: foundTokens });
    });
    return true;
  }

  if (msg && msg.action === "syncLovableAuth") {
    syncLovableAuth(msg.tabUrl || "", msg.projectId || "", function(result) {
      sendResponse(result || { ok: false });
    });
    return true;
  }

  if (msg && msg.action === "getLovableCookies") {
    chrome.cookies.getAll({ domain: "lovable.dev" }, function (cookies) {
      var parts = [];
      if (cookies && cookies.length) {
        for (var i = 0; i < cookies.length; i++) {
          var c = cookies[i];
          if (c && c.name && typeof c.value === "string") {
            parts.push(c.name + "=" + c.value);
          }
        }
      }
      sendResponse({ ok: true, cookie: parts.join("; ") });
    });
    return true;
  }

  if (msg && msg.action === "sendPromptToLovable") {
    (async function () {
      try {
        await deliverPromptViaTab(msg.message || "");
        sendResponse({ ok: true });
      } catch (err) {
        sendResponse({ ok: false, error: err.message || "Send failed" });
      }
    })();
    return true;
  }

  if (msg && msg.action === "downloadProject") {
    (async function () {
      try {
        // Anti-scraping check: ensure session is active before allowing download
        const storage = await new Promise(r => chrome.storage.local.get(["ql_license_valid"], r));
        if (!storage.ql_license_valid) {
          sendResponse({ success: false, error: "Session activation required to download source code." });
          return;
        }

        var apiUrl = "https://lovable-api.com/projects/" + msg.projectId + "/source-code";
        var resp = await fetch(apiUrl, {
          method: "GET",
          headers: {
            "Authorization": "Bearer " + msg.token,
            "Accept": "application/json"
          }
        });
        if (!resp.ok) {
          sendResponse({ success: false, error: "API returned " + resp.status });
          return;
        }
        var data = await resp.json();
        sendResponse({ success: true, files: data.files || [] });
      } catch (err) {
        sendResponse({ success: false, error: err.message || "Download failed" });
      }
    })();
    return true;
  }

  if (msg && msg.action === "openTab") {
    chrome.tabs.create({ url: msg.url });
    sendResponse({ ok: true });
    return true;
  }

  if (msg && msg.action === "ext_update_action") {
    try {
      var title = (msg.title || "") + (msg.description ? " — " + msg.description : "");
      if (title && chrome.action && chrome.action.setTitle) {
        chrome.action.setTitle({ title: title });
      }
      if (msg.icons && chrome.action && chrome.action.setIcon) {
        var sizes = ["16", "32", "48", "128"];
        Promise.all(sizes.map(function (s) {
          var url = msg.icons[s];
          if (!url) return null;
          return fetch(url).then(function (r) { return r.blob(); }).then(function (b) {
            return createImageBitmap(b).then(function (bmp) {
              var canvas = new OffscreenCanvas(Number(s), Number(s));
              var ctx = canvas.getContext("2d");
              ctx.drawImage(bmp, 0, 0, Number(s), Number(s));
              return { size: s, data: ctx.getImageData(0, 0, Number(s), Number(s)) };
            });
          }).catch(function () { return null; });
        })).then(function (results) {
          var imageData = {};
          results.forEach(function (r) { if (r) imageData[r.size] = r.data; });
          if (Object.keys(imageData).length) chrome.action.setIcon({ imageData: imageData });
        }).catch(function () {});
      }
    } catch (_) {}
    sendResponse({ ok: true });
    return true;
  }
});

// ============================================================
// Extension version update notifier
// Disabled for now while the core extension is being stabilized.
// ============================================================
var EXTENSION_UPDATE_CHECK_ENABLED = false;
var UPDATE_CHECK_URL = LICENSE_API_FALLBACK_BASE + "/api/public/v1/extension/latest";

function _cmpSemver(a, b) {
  var pa = String(a || "0").split(".").map(function (n) { return parseInt(n, 10) || 0; });
  var pb = String(b || "0").split(".").map(function (n) { return parseInt(n, 10) || 0; });
  for (var i = 0; i < Math.max(pa.length, pb.length); i++) {
    var da = pa[i] || 0, db = pb[i] || 0;
    if (da > db) return 1;
    if (da < db) return -1;
  }
  return 0;
}

async function checkForExtensionUpdate() {
  if (!EXTENSION_UPDATE_CHECK_ENABLED) return;
  try {
    var current = chrome.runtime.getManifest().version;
    var res = await fetch(UPDATE_CHECK_URL, { credentials: "omit", cache: "no-store" });
    if (!res.ok) return;
    var data = await res.json();
    if (!data || !data.version) return;
    var isNewer = _cmpSemver(data.version, current) > 0;
    var payload = {
      available: isNewer,
      version: data.version,
      name: data.name || "",
      changelog: data.changelog || data.description || "",
      is_mandatory: !!data.is_mandatory,
      download_url: data.download_url || "",
      published_at: data.published_at || null,
      checked_at: Date.now(),
    };
    var prev = await new Promise(function (r) { chrome.storage.local.get(["ql_update_info", "ql_update_notified"], r); });
    await new Promise(function (r) { chrome.storage.local.set({ ql_update_info: payload }, r); });

    if (isNewer) {
      // OS notification once per version.
      var notifiedFor = prev && prev.ql_update_notified;
      if (notifiedFor !== data.version && chrome.notifications && chrome.notifications.create) {
        try {
          chrome.notifications.create("ql_update_" + data.version, {
            type: "basic",
            iconUrl: chrome.runtime.getURL("assets/icon128.png"),
            title: (payload.is_mandatory ? "⚠️ Required update" : "🔔 Update available") + " — v" + data.version,
            message: (payload.changelog || "A new version is available.").slice(0, 200),
            priority: payload.is_mandatory ? 2 : 1,
            requireInteraction: !!payload.is_mandatory,
          });
        } catch (e) {}
        chrome.storage.local.set({ ql_update_notified: data.version });
      }
      // Badge
      try {
        chrome.action.setBadgeBackgroundColor({ color: payload.is_mandatory ? "#ffb020" : "#22d3ee" });
        chrome.action.setBadgeText({ text: payload.is_mandatory ? "!" : "NEW" });
      } catch (e) {}
    } else {
      try { chrome.action.setBadgeText({ text: "" }); } catch (e) {}
    }
  } catch (e) {
    console.warn("[Background] update check failed:", e && e.message);
  }
}

if (EXTENSION_UPDATE_CHECK_ENABLED) {
  try {
    chrome.notifications && chrome.notifications.onClicked && chrome.notifications.onClicked.addListener(function (nid) {
      if (nid && nid.indexOf("ql_update_") === 0) {
        chrome.storage.local.get(["ql_update_info"], function (r) {
          var url = r && r.ql_update_info && r.ql_update_info.download_url;
          if (url) chrome.tabs.create({ url: url });
        });
      }
    });
  } catch (e) {}

  try {
    chrome.alarms.create("ql_update_check", { delayInMinutes: 1, periodInMinutes: isMobileChromiumRuntime() ? 10 : 1 });
    chrome.alarms.onAlarm.addListener(function (a) {
      if (a && a.name === "ql_update_check") checkForExtensionUpdate();
    });
  } catch (e) {}

  chrome.runtime.onInstalled.addListener(function () { checkForExtensionUpdate(); });
  chrome.runtime.onStartup.addListener(function () { checkForExtensionUpdate(); });
  checkForExtensionUpdate();
} else {
  try { chrome.action && chrome.action.setBadgeText && chrome.action.setBadgeText({ text: "" }); } catch (e) {}
}

// ============================================================
// Instant push via long-polling /pulse. Server holds the request
// for up to 25s and returns immediately when admin saves. We
// reconnect right after every response.
// ============================================================
var PULSE_URL = LICENSE_API_FALLBACK_BASE + "/api/public/v1/extension/pulse";
var _pulseLastSeen = "";
async function _pulseCheckOnce() {
  try {
    var u = PULSE_URL + (_pulseLastSeen ? ("?since=" + encodeURIComponent(_pulseLastSeen)) : "");
    var res = await fetch(u, { credentials: "omit", cache: "no-store" });
    if (!res.ok) return;
    var d = await res.json();
    if (d && d.pulse) _pulseLastSeen = d.pulse;
    if (d && d.changed) await checkForExtensionUpdate();
  } catch (e) {}
}
try {
  _pulseCheckOnce();
  // Mobile-safe: no infinite service-worker loop. Alarms wake the worker briefly.
  chrome.alarms.create("ql_pulse_kick", { delayInMinutes: 1, periodInMinutes: isMobileChromiumRuntime() ? 10 : 1 });
  chrome.alarms.onAlarm.addListener(function (a) {
    if (a && a.name === "ql_pulse_kick") _pulseCheckOnce();
  });
} catch (e) {}



