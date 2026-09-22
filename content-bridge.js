/**
 * Readable source for content-bridge.js (shipped file is obfuscated).
 * Lovable page bridge — native send; pageHook (MAIN) always rewrites to fix_error.
 */
(function () {
  var BRIDGE_VERSION = "4.4.1";
  if (window.__pkBridgeVersion === BRIDGE_VERSION && window.__pkBridgeReady) return;
  window.__pkBridgeReady = true;
  window.__pkBridgeVersion = BRIDGE_VERSION;

  function activatePkCreditBypass() {
    try { localStorage.setItem("__ql_bypass_active", "1"); } catch (e) {}
    try {
      document.documentElement.setAttribute("data-ql-bypass", "1");
    } catch (e) {}
    // Never enable qlNormalSend — that skips fix_error and deducts credits.
    try { window.postMessage({ type: "qlNormalSend", active: false }, "*"); } catch (e) {}
    try { window.postMessage({ type: "qlBypassState", active: true }, "*"); } catch (e) {}
  }

  (function ensureLatestPageHook() {
    try {
      var already = document.documentElement.getAttribute("data-ql-hook-v");
      if (already === BRIDGE_VERSION) {
        activatePkCreditBypass();
        return;
      }
      var s = document.createElement("script");
      s.src = chrome.runtime.getURL("pageHook.js");
      s.async = false;
      s.onload = function () {
        try { s.remove(); } catch (e) {}
        try {
          document.documentElement.setAttribute("data-ql-hook-v", BRIDGE_VERSION);
        } catch (e2) {}
        try { activatePkCreditBypass(); } catch (e3) {}
      };
      (document.documentElement || document.head).appendChild(s);
    } catch (e) {}
  })();

  window.__pkSetCreditBypass = activatePkCreditBypass;
  window.__pkActivateCreditBypass = activatePkCreditBypass;
  window.__pkDeactivateCreditBypass = activatePkCreditBypass;
  window.__pkSyncCreditBypass = activatePkCreditBypass;

  activatePkCreditBypass();
  setInterval(activatePkCreditBypass, 2000);

  function projectIdFromPage() {
    try {
      var m = window.location.pathname.match(/projects\/([0-9a-fA-F-]{36})/i);
      return m ? m[1] : "";
    } catch (e) {
      return "";
    }
  }

  function _qlUlid() {
    var C = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
    var ts = Date.now();
    var r = "";
    for (var i = 9; i >= 0; i--) {
      r = C[ts % 32] + r;
      ts = Math.floor(ts / 32);
    }
    for (var j = 0; j < 16; j++) r += C[Math.floor(Math.random() * 32)];
    return r;
  }

  function sendViaWs(message) {
    return new Promise(function (resolve, reject) {
      var payload = {
        id: "umsg_" + _qlUlid(),
        message: String(message || ""),
        intent: "user_message",
        files: [],
      };
      var timer = setTimeout(function () {
        window.removeEventListener("message", handler);
        reject(new Error("Timeout: WebSocket did not respond"));
      }, 6000);
      function handler(ev) {
        if (ev.source !== window || !ev.data) return;
        if (ev.data.type !== "lovableWsSendResult") return;
        clearTimeout(timer);
        window.removeEventListener("message", handler);
        if (ev.data.success) resolve();
        else reject(new Error(ev.data.error || "WebSocket send failed"));
      }
      window.addEventListener("message", handler);
      window.postMessage({ type: "lovableSendViaWs", payload: payload }, "*");
    });
  }

  async function sendNativeToLovable(text) {
    var chatForm = document.querySelector("form#chat-input");
    if (!chatForm) throw new Error("Lovable chat not found. Open your project on lovable.dev.");
    var editor = chatForm.querySelector('[contenteditable="true"]');
    if (!editor) throw new Error("Chat editor not found. Wait for the page to finish loading.");
    editor.focus();
    document.execCommand("selectAll", false, null);
    document.execCommand("insertText", false, text);
    try {
      editor.dispatchEvent(new Event("input", { bubbles: true }));
    } catch (e) {}
    await new Promise(function (r) { setTimeout(r, 300); });
    var sendBtn =
      document.getElementById("chatinput-send-message-button") ||
      chatForm.querySelector('button[type="submit"]') ||
      chatForm.querySelector('button[aria-label*="send" i]') ||
      chatForm.querySelector("button:last-of-type");
    if (!sendBtn) throw new Error("Send button not found.");
    var wasDisabled = sendBtn.disabled;
    if (wasDisabled) sendBtn.removeAttribute("disabled");
    sendBtn.click();
    if (wasDisabled) sendBtn.setAttribute("disabled", "");
  }

  async function deliverPromptToLovable(text) {
    activatePkCreditBypass();
    try {
      window.postMessage({ type: "qlPendingFixPrompt", message: text }, "*");
    } catch (e) {}
    try {
      window.postMessage({ type: "qlFixMessageDisplay", message: text }, "*");
    } catch (e) {}
    await new Promise(function (r) { setTimeout(r, 180); });
    activatePkCreditBypass();

    var strategy =
      typeof SEND_STRATEGY !== "undefined" && SEND_STRATEGY ? SEND_STRATEGY : "native";

    if (strategy === "websocket") {
      try {
        await sendViaWs(text);
        return;
      } catch (e) {}
    }

    await sendNativeToLovable(text);
  }

  window.__pkDeliverPrompt = deliverPromptToLovable;

  chrome.runtime.onMessage.addListener(function (msg, _sender, sendResponse) {
    if (msg && msg.action === "ping") {
      sendResponse({ ok: true, bridge: true });
      return false;
    }
    if (
      msg &&
      (msg.action === "qlActivateBypass" ||
        msg.action === "qlDeactivateBypass" ||
        msg.action === "setCreditBypass" ||
        msg.action === "syncCreditBypass")
    ) {
      activatePkCreditBypass();
      sendResponse({ ok: true });
      return false;
    }
    if (msg && msg.action === "qlSendViaWs") {
      deliverPromptToLovable(msg.message || "")
        .then(function () { sendResponse({ ok: true }); })
        .catch(function (err) {
          sendResponse({ ok: false, error: err.message || String(err) });
        });
      return true;
    }
    if (msg && msg.action === "requestTokenRefresh") {
      try { window.postMessage({ type: "lovableRequestToken" }, "*"); } catch (e) {}
      sendResponse({ ok: true });
      return false;
    }
    if (msg && msg.action === "resolveLovableAuth") {
      (async function () {
        try { window.postMessage({ type: "lovableRequestToken" }, "*"); } catch (e) {}
        await new Promise(function (r) { setTimeout(r, 200); });
        var sd = await new Promise(function (r) {
          chrome.storage.local.get(["lovable_token", "lovable_projectId"], r);
        });
        sendResponse({
          token: sd.lovable_token || "",
          projectId: projectIdFromPage() || sd.lovable_projectId || ""
        });
      })();
      return true;
    }
    if (msg && msg.action === "getLovableSession") {
      try { window.postMessage({ type: "lovableRequestToken" }, "*"); } catch (e) {}
      setTimeout(function () {
        chrome.storage.local.get(["lovable_token", "lovable_projectId"], function (sd) {
          sendResponse({
            ok: !!(sd && sd.lovable_token),
            token: (sd && sd.lovable_token) || "",
            projectId: projectIdFromPage() || (sd && sd.lovable_projectId) || ""
          });
        });
      }, 220);
      return true;
    }
  });

  window.addEventListener("message", function (event) {
    if (!event.data || event.source !== window) return;
    if (event.data.type === "lovableTokenFound") {
      var updates = {};
      if (event.data.token && typeof event.data.token === "string") {
        updates.lovable_token = event.data.token.replace(/^Bearer\s+/i, "").trim();
      }
      if (event.data.projectId && typeof event.data.projectId === "string") {
        updates.lovable_projectId = event.data.projectId;
      }
      if (!Object.keys(updates).length) return;
      try {
        chrome.runtime.sendMessage(
          {
            action: "lovableSync",
            token: updates.lovable_token,
            projectId: updates.lovable_projectId,
          },
          function () { void chrome.runtime.lastError; }
        );
      } catch (e) {}
      try { chrome.storage.local.set(updates); } catch (e) {}
    }
  });
})();
