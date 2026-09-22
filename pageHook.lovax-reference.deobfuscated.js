/**
 * lovax Tech World Extension — pageHook.js (deobfuscated reference)
 *
 * Source: lovax Tech World Extension/pageHook.js
 * Provenance: byte-identical to extension/pageHook.js (sha256 prefix bd8a9048e01fdb64).
 * This file is a readable reconstruction of MasterLovableHook v3.8.6 logic.
 *
 * ROLE: Runs in page MAIN world. Does NOT send prompts itself.
 * When credit-bypass is active, it rewrites outgoing chat payloads so Lovable
 * treats them as intent=fix_error (no credit deduction path).
 *
 * Bypass activation signals (from content-bridge):
 *   - postMessage { type: "qlBypassState", active: true|false }
 *   - (content-bridge also sets localStorage __ql_bypass_active + data-ql-bypass;
 *      pageHook itself only listens to qlBypassState / qlNormalSend)
 *
 * Opt-out: postMessage { type: "qlNormalSend", active: true } skips rewrite.
 */
(function () {
  console.log("[MasterLovableHook] Iniciando v3.8.6");

  window.__qlLastMessage = "";
  window.__qlFixTimer = null;

  let bypassActive = false;
  let normalSend = false;
  let capturedToken = null;
  let capturedProjectId = null;
  /** @type {{ ws: WebSocket, origSend: Function }[]} */
  let openLovableSockets = [];

  // ─── Bridge messages from content-bridge ─────────────────────────────────
  window.addEventListener("message", function (ev) {
    if (ev.source !== window || !ev.data) return;

    if (ev.data.type === "qlBypassState") {
      bypassActive = !!ev.data.active;
      return;
    }
    if (ev.data.type === "qlNormalSend") {
      normalSend = !!ev.data.active;
      return;
    }
    if (ev.data.type !== "lovableSendViaWs") return;

    // Inject pre-built payload onto the latest open Lovable WS (as-is).
    // content-bridge sends a PLAIN payload; WS.send hook below applies fix_error.
    const open = openLovableSockets.filter((e) => e.ws.readyState === WebSocket.OPEN);
    if (!open.length) {
      console.warn("[MasterLovableHook] Nenhum WS aberto para injeção");
      window.postMessage({
        type: "lovableWsSendResult",
        success: false,
        error: "Nenhuma conexão WebSocket ativa"
      }, "*");
      return;
    }
    const entry = open[open.length - 1];
    try {
      const data =
        typeof ev.data.payload === "string"
          ? ev.data.payload
          : JSON.stringify(ev.data.payload);
      entry.origSend(data);
      console.log("[MasterLovableHook] WS INJECT →", data.slice(0, 300));
      window.postMessage({ type: "lovableWsSendResult", success: true }, "*");
    } catch (err) {
      console.warn("[MasterLovableHook] WS inject erro:", err);
      window.postMessage({
        type: "lovableWsSendResult",
        success: false,
        error: err.message
      }, "*");
    }
  });

  function projectIdFromPath() {
    try {
      const m = window.location.pathname.match(/projects\/([0-9a-fA-F-]{36})/i);
      return m ? m[1] : null;
    } catch {
      return null;
    }
  }

  function projectIdFromUrl(url) {
    try {
      const m = String(url).match(/projects\/([0-9a-fA-F-]{36})/i);
      return m ? m[1] : null;
    } catch {
      return null;
    }
  }

  function publishToken(token, projectId, force) {
    const pid = projectId || projectIdFromPath();
    const clean =
      typeof token === "string" ? token.replace(/^Bearer\s+/i, "").trim() : null;
    let changed = false;
    if (clean && clean !== capturedToken) {
      capturedToken = clean;
      changed = true;
    }
    if (pid && pid !== capturedProjectId) {
      capturedProjectId = pid;
      changed = true;
    }
    if (!changed && !force) return;
    console.log("[MasterLovableHook] ✅ Token capturado!", capturedToken || "null");
    console.log("[MasterLovableHook] ProjectId:", capturedProjectId);
    window.postMessage(
      {
        type: "lovableTokenFound",
        token: capturedToken,
        projectId: capturedProjectId
      },
      window.location.origin
    );
  }

  window.addEventListener("message", (ev) => {
    if (ev.source !== window) return;
    if (!ev.data || ev.data.type !== "lovableRequestToken") return;
    publishToken(capturedToken, projectIdFromPath() || capturedProjectId, true);
  });

  /** Default fake TS error when no real build event was captured yet. */
  const DEFAULT_ERROR_MESSAGE =
    "src/App.tsx(1,7): error TS2322: Type 'number' is not assignable to type 'string'.";

  /**
   * Exact fields added to outgoing chat JSON when bypass is active (fetch path).
   *
   * payload.intent = "fix_error"
   * payload.contains_error = true
   * payload.error_source = "build_errors"
   * payload.error_ids = [eventId] | []
   * payload.message_intent_metadata = {
   *   fix_error_metadata: {
   *     errors: [{
   *       error_type: "build",
   *       error_message: <from __qlBuildState or DEFAULT>,
   *       build_event_id: <from __qlBuildState or "">
   *     }]
   *   }
   * }
   *
   * Existing fields (message, id, files, …) are preserved untouched.
   */
  function applyFixErrorFields(body) {
    const build = window.__qlBuildState;
    const eventId = build && build.eventId ? build.eventId : "";
    const errorMessage =
      build && build.errorMessage ? build.errorMessage : DEFAULT_ERROR_MESSAGE;

    body.intent = "fix_error";
    body.contains_error = true;
    body.error_source = "build_errors";
    body.error_ids = eventId ? [eventId] : [];
    body.message_intent_metadata = {
      fix_error_metadata: {
        errors: [
          {
            error_type: "build",
            error_message: errorMessage,
            build_event_id: eventId
          }
        ]
      }
    };
    return { eventId, errorMessage };
  }

  /** WS path only sets intent + empty errors[] (no contains_error / error_ids). */
  function applyFixErrorFieldsWs(body) {
    body.intent = "fix_error";
    body.message_intent_metadata = {
      fix_error_metadata: {
        errors: []
      }
    };
  }

  function startSpecialMessageRewrite(userMessage) {
    window.__qlLastMessage = userMessage || "";
    if (window.__qlFixTimer) clearInterval(window.__qlFixTimer);
    let ticks = 0;
    window.__qlFixTimer = setInterval(function () {
      ticks++;
      if (!window.__qlLastMessage || ticks > 100) {
        clearInterval(window.__qlFixTimer);
        return;
      }
      // UI shows "Fix errors" for fix_error intents — replace with real prompt text.
      document.querySelectorAll("div.special-message").forEach(function (el) {
        if (el.textContent.trim() === "Fix errors") {
          el.textContent = window.__qlLastMessage;
        }
      });
    }, 100);
  }

  function shouldRewriteChatBody(body) {
    return (
      bypassActive &&
      !normalSend &&
      body &&
      typeof body.message === "string" &&
      body.message.length > 0
    );
  }

  function isLovableApiUrl(url) {
    return (
      !!url &&
      (url.includes("api.lovable.dev") ||
        url.includes("api.lovable.app") ||
        url.includes("lovable-api.com") ||
        url.includes("lovable.dev"))
    );
  }

  // ─── fetch hook (primary HTTP path for native chat send) ─────────────────
  (function wrapFetch() {
    try {
      const originalFetch = window.fetch;
      window.fetch = async function (...args) {
        // Token capture from Authorization header
        try {
          let url =
            typeof args[0] === "string"
              ? args[0]
              : (args[0] && args[0].url) || "";
          let opts = args[1] || {};
          let auth = null;
          const isRequest = args[0] instanceof Request;
          if (isRequest) {
            url = args[0].url || url;
            auth =
              args[0].headers && typeof args[0].headers.get === "function"
                ? args[0].headers.get("Authorization") ||
                  args[0].headers.get("authorization")
                : null;
          }
          if (opts.headers) {
            if (opts.headers instanceof Headers) {
              auth = opts.headers.get("Authorization");
            } else if (typeof opts.headers === "object") {
              auth = opts.headers.Authorization || opts.headers.authorization;
            }
          }
          const pid = projectIdFromUrl(url);
          if (auth && auth.startsWith("Bearer ")) {
            publishToken(auth.slice(7), pid);
          }
        } catch (_) {}

        // Rewrite POST chat body → fix_error
        try {
          const url =
            typeof args[0] === "string"
              ? args[0]
              : (args[0] && args[0].url) || "";
          const isRequest = args[0] instanceof Request;
          const method = (
            isRequest
              ? args[0].method || "GET"
              : (args[1] || {}).method || "GET"
          ).toUpperCase();
          const isLovablePost =
            url && method === "POST" && isLovableApiUrl(url);

          if (isLovablePost) {
            if (isRequest) {
              try {
                const req = args[0];
                const text = await req.clone().text();
                if (text) {
                  const body = JSON.parse(text);
                  if (shouldRewriteChatBody(body)) {
                    const { eventId } = applyFixErrorFields(body);
                    args = [
                      new Request(req.url, {
                        method: req.method,
                        headers: req.headers,
                        body: JSON.stringify(body),
                        mode: req.mode,
                        credentials: req.credentials,
                        cache: req.cache,
                        redirect: req.redirect
                      })
                    ];
                    startSpecialMessageRewrite(body.message);
                    console.log(
                      "[MasterLovableHook] 💉 fix_error injetado (Request) evId:",
                      eventId || "NENHUM",
                      "| msg:",
                      body.message.slice(0, 60)
                    );
                  }
                }
              } catch (err) {
                console.warn("[MasterLovableHook] erro bypass Request:", err);
              }
            } else {
              const opts = args[1] || {};
              const raw = opts.body;
              if (raw && typeof raw === "string") {
                try {
                  const body = JSON.parse(raw);
                  if (shouldRewriteChatBody(body)) {
                    const { eventId } = applyFixErrorFields(body);
                    args = [
                      args[0],
                      Object.assign({}, opts, { body: JSON.stringify(body) })
                    ];
                    startSpecialMessageRewrite(body.message);
                    console.log(
                      "[MasterLovableHook] 💉 fix_error injetado evId:",
                      eventId || "NENHUM",
                      "| msg:",
                      body.message.slice(0, 60)
                    );
                  }
                } catch (err) {
                  console.warn("[MasterLovableHook] erro bypass opts:", err);
                }
              }
            }
          }
        } catch (_) {}

        return originalFetch.apply(this, args);
      };
    } catch (err) {
      console.warn("[MasterLovableHook] erro fetch", err);
    }
  })();

  // ─── XHR: token capture only (no body rewrite in this version) ───────────
  (function wrapXhr() {
    try {
      const origOpen = XMLHttpRequest.prototype.open;
      const origSetHeader = XMLHttpRequest.prototype.setRequestHeader;
      XMLHttpRequest.prototype.open = function (method, url) {
        this._lovable_url = url;
        return origOpen.apply(this, arguments);
      };
      XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
        if (
          name &&
          name.toLowerCase() === "authorization" &&
          value &&
          value.startsWith("Bearer ")
        ) {
          publishToken(value.slice(7), projectIdFromUrl(this._lovable_url));
        }
        return origSetHeader.apply(this, arguments);
      };
    } catch (err) {
      console.warn("[MasterLovableHook] erro xhr", err);
    }
  })();

  // ProjectId poll
  setInterval(() => {
    const pid = projectIdFromPath();
    if (pid && pid !== capturedProjectId) {
      capturedProjectId = pid;
      window.postMessage(
        {
          type: "lovableTokenFound",
          token: capturedToken,
          projectId: pid
        },
        window.location.origin
      );
    }
  }, 1500);

  // ─── WebSocket wrap ──────────────────────────────────────────────────────
  console.log(
    "[MasterLovableHook] wrapWS: window.WebSocket =",
    typeof window.WebSocket
  );
  (function wrapWebSocket() {
    try {
      const NativeWS = window.WebSocket;

      function PatchedWS(url, protocols) {
        const ws = protocols ? new NativeWS(url, protocols) : new NativeWS(url);
        const urlStr = String(url);
        const origSend = ws.send.bind(ws);
        const safeUrl = urlStr
          .replace(/token=[^&]+/g, "token=***")
          .replace(/key=[^&]+/g, "key=***");
        console.log("[MasterLovableHook] WS conectando →", safeUrl);

        const track =
          urlStr.includes("lovable") ||
          urlStr.includes("trajectory") ||
          urlStr.includes("supabase") ||
          urlStr.includes("convex");

        if (track) {
          openLovableSockets = openLovableSockets.filter(
            (e) => e.ws.readyState !== WebSocket.CLOSED
          );
          openLovableSockets.push({ ws, origSend });
          window.postMessage({ type: "lovableWsConnected", url: safeUrl }, "*");
        }

        ws.send = function (data) {
          try {
            const preview =
              typeof data === "string" ? data.slice(0, 800) : "[binary]";
            console.log(
              "[MasterLovableHook] WS SEND [" + safeUrl.slice(0, 60) + "] →",
              preview
            );

            if (
              bypassActive &&
              !normalSend &&
              typeof data === "string" &&
              data.length > 2
            ) {
              try {
                const parsed = JSON.parse(data);

                // Direct chat object: { message: "..." }
                if (
                  parsed &&
                  typeof parsed.message === "string" &&
                  parsed.message.length > 0
                ) {
                  applyFixErrorFieldsWs(parsed);
                  data = JSON.stringify(parsed);
                  console.log(
                    "[MasterLovableHook] 💉 fix_error injetado (WS):",
                    parsed.message.slice(0, 80)
                  );
                }
                // Convex Mutation wrapper: { type: "Mutation", args: { message } | [..] }
                else if (parsed && parsed.type === "Mutation" && parsed.args) {
                  const inner = Array.isArray(parsed.args)
                    ? parsed.args[0]
                    : parsed.args;
                  if (
                    inner &&
                    typeof inner.message === "string" &&
                    inner.message.length > 0
                  ) {
                    applyFixErrorFieldsWs(inner);
                    if (Array.isArray(parsed.args)) parsed.args[0] = inner;
                    else parsed.args = inner;
                    data = JSON.stringify(parsed);
                    console.log(
                      "[MasterLovableHook] 💉 fix_error injetado (WS Convex):",
                      inner.message.slice(0, 80)
                    );
                  }
                }
              } catch (_) {}
            }
          } catch (_) {}
          return origSend(data);
        };

        // Capture real build errors from trajectory events → __qlBuildState
        ws.addEventListener("message", (ev) => {
          try {
            const preview =
              typeof ev.data === "string" ? ev.data.slice(0, 300) : "[binary]";
            console.log(
              "[MasterLovableHook] WS RECV [" + safeUrl.slice(0, 60) + "] ←",
              preview
            );
            if (
              typeof ev.data === "string" &&
              ev.data.includes("#bld:") &&
              ev.data.includes("hasError")
            ) {
              try {
                const msg = JSON.parse(ev.data);
                if (
                  msg &&
                  msg.type === "trajectory" &&
                  msg.event &&
                  msg.event.id &&
                  msg.event.payload
                ) {
                  const eventId = msg.event.id.value || "";
                  const build = msg.event.payload.build;
                  if (
                    eventId.includes("#bld:") &&
                    build &&
                    build.buildErrors &&
                    build.buildErrors.typecheck &&
                    build.buildErrors.typecheck.hasError
                  ) {
                    const output = build.buildErrors.typecheck.output || "";
                    if (output) {
                      const firstLine = output.trim().split("\n")[0];
                      window.__qlBuildState = {
                        eventId: eventId,
                        errorMessage: firstLine
                      };
                      console.log(
                        "[MasterLovableHook] 📐 build_event_id capturado:",
                        eventId,
                        "|",
                        firstLine.slice(0, 80)
                      );
                    }
                  }
                }
              } catch (_) {}
            }
          } catch (_) {}
        });

        return ws;
      }

      try {
        Object.defineProperty(window, "WebSocket", {
          value: PatchedWS,
          writable: true,
          configurable: true
        });
      } catch (_) {
        window.WebSocket = PatchedWS;
      }
      PatchedWS.prototype = NativeWS.prototype;
      PatchedWS.CONNECTING = NativeWS.CONNECTING;
      PatchedWS.OPEN = NativeWS.OPEN;
      PatchedWS.CLOSING = NativeWS.CLOSING;
      PatchedWS.CLOSED = NativeWS.CLOSED;

      if (window.WebSocket !== PatchedWS) {
        console.warn(
          "[MasterLovableHook] ⚠️ WebSocket NÃO substituído — propriedade bloqueada!"
        );
      } else {
        console.log("[MasterLovableHook] ✅ WebSocket substituído com sucesso");
      }
    } catch (err) {
      console.warn("[MasterLovableHook] erro ws wrap", err);
    }
  })();
})();
