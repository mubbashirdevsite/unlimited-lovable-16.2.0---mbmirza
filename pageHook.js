/**
 * MasterLovableHook — MAIN world (document_start)
 * ALWAYS rewrites Lovable chat → fix_error (Empire-compatible metadata).
 * Source kept as pageHook.source.js; shipped pageHook.js is obfuscated.
 */
(function () {
  var HOOK_VERSION = "4.4.1";

  if (window.__qlPageHookVersion === HOOK_VERSION && window.__qlFixHookActive) {
    return;
  }

  window.__qlPageHookVersion = HOOK_VERSION;
  window.__qlPageHookReady = true;
  window.__qlFixHookActive = true;
  try {
    window.__lovaxLightPageHookReady = true;
  } catch (e) {}
  try {
    document.documentElement.setAttribute("data-ql-hook-v", HOOK_VERSION);
  } catch (eAttr) {}

  window.__qlLastMessage = "";
  window.__qlPendingFixPrompt = "";
  window.__qlFixTimer = null;
  window.__qlBuildState = window.__qlBuildState || null;

  var openLovableSockets = [];
  var capturedToken = null;
  var capturedProjectId = null;

  var DEFAULT_ERROR_MESSAGE =
    "src/App.tsx(1,7): error TS2322: Type 'number' is not assignable to type 'string'.";

  function projectIdFromPath() {
    try {
      var m = window.location.pathname.match(/projects\/([0-9a-fA-F-]{36})/i);
      return m ? m[1] : null;
    } catch (e) {
      return null;
    }
  }

  function projectIdFromUrl(url) {
    try {
      var m = String(url).match(/projects\/([0-9a-fA-F-]{36})/i);
      return m ? m[1] : null;
    } catch (e) {
      return null;
    }
  }

  function publishToken(token, projectId, force) {
    var pid = projectId || projectIdFromPath();
    var clean =
      typeof token === "string" ? token.replace(/^Bearer\s+/i, "").trim() : null;
    var changed = false;
    if (clean && clean !== capturedToken) {
      capturedToken = clean;
      changed = true;
    }
    if (pid && pid !== capturedProjectId) {
      capturedProjectId = pid;
      changed = true;
    }
    if (!changed && !force) return;
    try {
      window.postMessage(
        {
          type: "lovableTokenFound",
          token: capturedToken,
          projectId: capturedProjectId,
        },
        window.location.origin
      );
    } catch (e) {}
  }

  function startSpecialMessageRewrite(userMessage) {
    window.__qlLastMessage = userMessage || "";
    if (window.__qlFixTimer) clearInterval(window.__qlFixTimer);
    var ticks = 0;
    window.__qlFixTimer = setInterval(function () {
      ticks++;
      if (!window.__qlLastMessage || ticks > 150) {
        clearInterval(window.__qlFixTimer);
        return;
      }
      try {
        document
          .querySelectorAll(
            "div.special-message, [data-message-intent='fix_error']"
          )
          .forEach(function (el) {
            var t = (el.textContent || "").trim();
            if (t === "Fix errors" || t === "Fix error") {
              el.textContent = window.__qlLastMessage;
            }
          });
      } catch (e) {}
    }, 100);
  }

  function cloneHeadersWithoutLength(headersLike) {
    var h;
    try {
      h = new Headers(headersLike || undefined);
    } catch (e) {
      h = new Headers();
      if (headersLike && typeof headersLike === "object") {
        Object.keys(headersLike).forEach(function (k) {
          try {
            h.set(k, headersLike[k]);
          } catch (e2) {}
        });
      }
    }
    try {
      h.delete("content-length");
    } catch (e3) {}
    try {
      if (!h.has("content-type")) h.set("content-type", "application/json");
    } catch (e4) {}
    return h;
  }

  /**
   * Empire-compatible fix_error fields (exact shape used by Saqlain/Empire).
   * Always on — no bypass flag required.
   */
  function rewriteToFixError(parsed) {
    if (!parsed || typeof parsed !== "object") return false;

    if (
      window.__qlPendingFixPrompt &&
      typeof window.__qlPendingFixPrompt === "string" &&
      window.__qlPendingFixPrompt.length
    ) {
      parsed.message = window.__qlPendingFixPrompt;
    }

    if (typeof parsed.message !== "string" || !parsed.message.length) {
      return false;
    }

    var intent = parsed.intent;
    if (
      intent === "edit" ||
      intent === "revert" ||
      intent === "summarize" ||
      intent === "rename"
    ) {
      return false;
    }

    var build = window.__qlBuildState;
    var eventId = build && build.eventId ? String(build.eventId) : "";
    var errorMessage =
      build && build.errorMessage ? build.errorMessage : DEFAULT_ERROR_MESSAGE;

    if (Array.isArray(parsed.error_ids) && parsed.error_ids.length && !eventId) {
      eventId = String(parsed.error_ids[0] || "");
    }

    parsed.intent = "fix_error";
    parsed.contains_error = true;
    parsed.error_source = "build_errors";
    parsed.error_ids = eventId ? [eventId] : [];
    parsed.message_intent_metadata = {
      fix_error_metadata: {
        errors: [
          {
            error_type: "build",
            error_message: errorMessage,
            build_event_id: eventId || "",
          },
        ],
      },
    };
    return true;
  }

  /**
   * Lovable sometimes wraps the chat payload (tRPC/batch/args/data envelopes).
   * Walk the object graph and rewrite the first node that looks like a chat message.
   */
  function deepRewriteToFixError(node, depth) {
    if (!node || typeof node !== "object" || (depth || 0) > 6) return false;
    if (Array.isArray(node)) {
      var changedArr = false;
      for (var i = 0; i < node.length; i++) {
        if (deepRewriteToFixError(node[i], (depth || 0) + 1)) changedArr = true;
      }
      return changedArr;
    }
    if (typeof node.message === "string" && node.message.length) {
      if (rewriteToFixError(node)) return true;
    }
    var changed = false;
    for (var k in node) {
      if (!Object.prototype.hasOwnProperty.call(node, k)) continue;
      var v = node[k];
      if (v && typeof v === "object") {
        if (deepRewriteToFixError(v, (depth || 0) + 1)) changed = true;
      }
    }
    return changed;
  }

  function findMessage(node, depth) {
    if (!node || typeof node !== "object" || (depth || 0) > 6) return "";
    if (typeof node.message === "string" && node.message.length) return node.message;
    for (var k in node) {
      if (!Object.prototype.hasOwnProperty.call(node, k)) continue;
      var v = node[k];
      if (v && typeof v === "object") {
        var found = findMessage(v, (depth || 0) + 1);
        if (found) return found;
      }
    }
    return "";
  }

  /** Rewrites a raw JSON string body; returns the new string or null when untouched. */
  function rewriteRawBody(raw) {
    if (typeof raw !== "string" || raw.length < 3) return null;
    if (raw.indexOf('"message"') === -1 && raw.indexOf('"intent"') === -1) return null;
    try {
      var parsed = JSON.parse(raw);
      if (!deepRewriteToFixError(parsed, 0)) return null;
      startSpecialMessageRewrite(findMessage(parsed, 0));
      return JSON.stringify(parsed);
    } catch (e) {
      return null;
    }
  }

  function isLovableUrl(url) {
    var u = String(url || "");
    if (
      u.indexOf("lovable.dev") !== -1 ||
      u.indexOf("lovable.app") !== -1 ||
      u.indexOf("lovable-api.com") !== -1
    ) {
      return true;
    }
    // Relative / same-origin requests fired from the Lovable app itself.
    if (!/^https?:\/\//i.test(u)) {
      try {
        var host = window.location.hostname || "";
        return (
          host.indexOf("lovable.dev") !== -1 || host.indexOf("lovable.app") !== -1
        );
      } catch (e) {
        return false;
      }
    }
    return false;
  }

  window.addEventListener("message", function (ev) {
    if (ev.source !== window || !ev.data) return;

    if (ev.data.type === "qlPendingFixPrompt" || ev.data.type === "qlFixMessageDisplay") {
      window.__qlPendingFixPrompt = ev.data.message || "";
      startSpecialMessageRewrite(ev.data.message || "");
      return;
    }

    if (ev.data.type === "lovableRequestToken") {
      publishToken(capturedToken, projectIdFromPath() || capturedProjectId, true);
      return;
    }

    if (ev.data.type !== "lovableSendViaWs") return;

    var open = openLovableSockets.filter(function (e) {
      return e.ws && e.ws.readyState === WebSocket.OPEN;
    });
    var entry = null;
    for (var i = open.length - 1; i >= 0; i--) {
      var u = String(open[i].url || "");
      if (u.indexOf("trajectory") !== -1) continue;
      if (u.indexOf("realtime") !== -1) continue;
      entry = open[i];
      break;
    }
    // Old devices: the chat socket may have been opened before this hook was
    // (re)injected, so the strict filters can leave us empty. Fall back to any
    // open registered socket rather than dropping to a plain native send.
    if (!entry && open.length) entry = open[open.length - 1];

    if (!entry) {
      window.postMessage(
        {
          type: "lovableWsSendResult",
          success: false,
          error: "Nenhuma conexão WebSocket de chat ativa",
        },
        "*"
      );
      return;
    }
    try {
      var payload =
        typeof ev.data.payload === "string"
          ? JSON.parse(ev.data.payload)
          : Object.assign({}, ev.data.payload || {});
      deepRewriteToFixError(payload, 0);
      var data = JSON.stringify(payload);
      entry.origSend.call(entry.ws, data);
      var shown = findMessage(payload, 0);
      if (shown) startSpecialMessageRewrite(shown);
      window.postMessage({ type: "lovableWsSendResult", success: true }, "*");
    } catch (err) {
      window.postMessage(
        {
          type: "lovableWsSendResult",
          success: false,
          error: err && err.message ? err.message : String(err),
        },
        "*"
      );
    }
  });

  (function patchWS() {
    var OriginalWSSend = WebSocket.prototype.send;

    // Register any socket we observe, even ones created BEFORE this hook ran
    // (extension updated while a Lovable tab stayed open = "old device" case).
    function registerSocket(ws, urlStr) {
      try {
        openLovableSockets = openLovableSockets.filter(function (e) {
          return e.ws && e.ws.readyState !== WebSocket.CLOSED;
        });
        for (var i = 0; i < openLovableSockets.length; i++) {
          if (openLovableSockets[i].ws === ws) return;
        }
        openLovableSockets.push({
          ws: ws,
          url: urlStr,
          origSend: OriginalWSSend.bind(ws),
        });
      } catch (e) {}
    }
    window.__qlRegisterSocket = registerSocket;

    WebSocket.prototype.send = function (data) {
      try {
        var selfUrl = String(this.url || "");
        if (
          selfUrl.indexOf("lovable") !== -1 ||
          selfUrl.indexOf("trajectory") !== -1 ||
          selfUrl.indexOf("supabase") !== -1 ||
          selfUrl.indexOf("convex") !== -1
        ) {
          registerSocket(this, selfUrl);
        }
      } catch (eReg) {}
      try {
        if (typeof data === "string" && data.length > 2) {
          var out = rewriteRawBody(data);
          if (out) data = out;
        }
      } catch (e) {}
      return OriginalWSSend.call(this, data);
    };


    var NativeWS = window.WebSocket;
    function PatchedWS(url, protocols) {
      var ws = protocols ? new NativeWS(url, protocols) : new NativeWS(url);
      var urlStr = String(url || "");
      if (
        urlStr.indexOf("lovable") !== -1 ||
        urlStr.indexOf("trajectory") !== -1 ||
        urlStr.indexOf("supabase") !== -1 ||
        urlStr.indexOf("convex") !== -1
      ) {
        registerSocket(ws, urlStr);
      }
      ws.addEventListener("message", function (evt) {
        try {
          if (
            typeof evt.data === "string" &&
            evt.data.indexOf("#bld:") !== -1 &&
            evt.data.indexOf("hasError") !== -1
          ) {
            var traj = JSON.parse(evt.data);
            if (
              traj &&
              traj.type === "trajectory" &&
              traj.event &&
              traj.event.id &&
              traj.event.payload &&
              traj.event.payload.build
            ) {
              var evId = traj.event.id.value || "";
              var build = traj.event.payload.build;
              if (
                evId.indexOf("#bld:") !== -1 &&
                build.buildErrors &&
                build.buildErrors.typecheck &&
                build.buildErrors.typecheck.hasError
              ) {
                var output = build.buildErrors.typecheck.output || "";
                if (output) {
                  window.__qlBuildState = {
                    eventId: evId,
                    errorMessage: output.trim().split("\n")[0],
                  };
                }
              }
            }
          }
        } catch (eMsg) {}
      });
      return ws;
    }
    PatchedWS.prototype = NativeWS.prototype;
    PatchedWS.CONNECTING = NativeWS.CONNECTING;
    PatchedWS.OPEN = NativeWS.OPEN;
    PatchedWS.CLOSING = NativeWS.CLOSING;
    PatchedWS.CLOSED = NativeWS.CLOSED;
    try {
      Object.defineProperty(window, "WebSocket", {
        value: PatchedWS,
        writable: true,
        configurable: true,
      });
    } catch (eDef) {
      window.WebSocket = PatchedWS;
    }
  })();

  (function patchFetch() {
    var originalFetch = window.fetch;
    window.fetch = async function () {
      var args = Array.prototype.slice.call(arguments);
      try {
        var url =
          typeof args[0] === "string"
            ? args[0]
            : (args[0] && args[0].url) || "";
        var opts = args[1] || {};
        var isRequest =
          typeof Request !== "undefined" && args[0] instanceof Request;
        if (isRequest) url = args[0].url || url;

        var method = (
          isRequest ? args[0].method || "GET" : opts.method || "GET"
        ).toUpperCase();

        try {
          var auth = null;
          if (isRequest && args[0].headers && args[0].headers.get) {
            auth =
              args[0].headers.get("Authorization") ||
              args[0].headers.get("authorization");
          }
          if (!auth && opts.headers) {
            if (opts.headers instanceof Headers) {
              auth = opts.headers.get("Authorization");
            } else if (typeof opts.headers === "object") {
              auth = opts.headers.Authorization || opts.headers.authorization;
            }
          }
          if (auth && String(auth).indexOf("Bearer ") === 0) {
            publishToken(String(auth).slice(7), projectIdFromUrl(url));
          }
        } catch (eAuth) {}

        if (method === "POST" && isLovableUrl(url)) {
          if (isRequest) {
            try {
              var req = args[0];
              var text = await req.clone().text();
              var outReq = rewriteRawBody(text);
              if (outReq) {
                args = [
                  new Request(req.url, {
                    method: req.method,
                    headers: cloneHeadersWithoutLength(req.headers),
                    body: outReq,
                    mode: req.mode,
                    credentials: req.credentials,
                    cache: req.cache,
                    redirect: req.redirect,
                  }),
                ];
              }
            } catch (eReq) {}
          } else if (opts.body != null) {
            try {
              var raw =
                typeof opts.body === "string"
                  ? opts.body
                  : typeof opts.body.text === "function"
                    ? await opts.body.text()
                    : "";
              var outOpts = rewriteRawBody(raw);
              if (outOpts) {
                args = [
                  args[0],
                  Object.assign({}, opts, {
                    body: outOpts,
                    headers: cloneHeadersWithoutLength(opts.headers),
                  }),
                ];
              }
            } catch (eOpts) {}
          }
        }
      } catch (eOuter) {}
      return originalFetch.apply(this, args);
    };
  })();

  (function patchXhr() {
    var origOpen = XMLHttpRequest.prototype.open;
    var origSetHeader = XMLHttpRequest.prototype.setRequestHeader;
    var origSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (method, url) {
      this._ql_method = method;
      this._ql_url = url;
      return origOpen.apply(this, arguments);
    };
    XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
      if (
        name &&
        String(name).toLowerCase() === "authorization" &&
        value &&
        String(value).indexOf("Bearer ") === 0
      ) {
        publishToken(String(value).slice(7), projectIdFromUrl(this._ql_url));
      }
      return origSetHeader.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function (body) {
      try {
        if (
          this._ql_method &&
          String(this._ql_method).toUpperCase() === "POST" &&
          isLovableUrl(this._ql_url) &&
          typeof body === "string"
        ) {
          var out = rewriteRawBody(body);
          if (out) body = out;
        }
      } catch (e) {}
      return origSend.call(this, body);
    };
  })();

  (function patchBeacon() {
    try {
      if (!navigator || typeof navigator.sendBeacon !== "function") return;
      var origBeacon = navigator.sendBeacon.bind(navigator);
      navigator.sendBeacon = function (url, data) {
        try {
          if (isLovableUrl(url) && typeof data === "string") {
            var out = rewriteRawBody(data);
            if (out) data = out;
          }
        } catch (e) {}
        return origBeacon(url, data);
      };
    } catch (e) {}
  })();
})();
