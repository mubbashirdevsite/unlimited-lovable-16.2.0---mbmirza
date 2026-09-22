(function () {
  console.log("[MasterLovableHook] Iniciando v3.8.6");
  window.__qlLastMessage = "";
  window.__qlFixTimer = null;
  let _0x3ba751 = false;
  let _0xNormalSend = false;
  let _0x53976c = null;
  let _0x49c66b = null;
  let _0x23c8e6 = [];
  window.addEventListener("message", function (_0x5bf74f) {
    if (_0x5bf74f.source !== window || !_0x5bf74f.data) {
      return;
    }
    if (_0x5bf74f.data.type === "qlBypassState") {
      _0x3ba751 = !!_0x5bf74f.data.active;
      return;
    }
    if (_0x5bf74f.data.type === "qlNormalSend") {
      _0xNormalSend = !!_0x5bf74f.data.active;
      return;
    }
    if (_0x5bf74f.data.type !== "lovableSendViaWs") {
      return;
    }
    const _0x12d072 = _0x23c8e6.filter(_0x238022 => _0x238022.ws.readyState === WebSocket.OPEN);
    if (!_0x12d072.length) {
      console.warn("[MasterLovableHook] Nenhum WS aberto para injeção");
      window.postMessage({
        type: "lovableWsSendResult",
        success: false,
        error: "Nenhuma conexão WebSocket ativa"
      }, "*");
      return;
    }
    const _0x17a1e8 = _0x12d072[_0x12d072.length - 1];
    try {
      const _0x5ccfc6 = typeof _0x5bf74f.data.payload === "string" ? _0x5bf74f.data.payload : JSON.stringify(_0x5bf74f.data.payload);
      _0x17a1e8.origSend(_0x5ccfc6);
      console.log("[MasterLovableHook] WS INJECT →", _0x5ccfc6.slice(0, 300));
      window.postMessage({
        type: "lovableWsSendResult",
        success: true
      }, "*");
    } catch (_0x3e3563) {
      console.warn("[MasterLovableHook] WS inject erro:", _0x3e3563);
      window.postMessage({
        type: "lovableWsSendResult",
        success: false,
        error: _0x3e3563.message
      }, "*");
    }
  });
  function _0x43f077() {
    try {
      const _0x1413ef = window.location.pathname.match(/projects\/([0-9a-fA-F-]{36})/i);
      if (_0x1413ef) {
        return _0x1413ef[1];
      } else {
        return null;
      }
    } catch {
      return null;
    }
  }
  function _0x302f37(_0x4baa35) {
    try {
      const _0x10ef34 = String(_0x4baa35).match(/projects\/([0-9a-fA-F-]{36})/i);
      if (_0x10ef34) {
        return _0x10ef34[1];
      } else {
        return null;
      }
    } catch {
      return null;
    }
  }
  function _0xb98b8d(_0xd21d5, _0x5dd786, _0x20cbee = false) {
    const _0x261669 = _0x5dd786 || _0x43f077();
    const _0x3aef42 = typeof _0xd21d5 === "string" ? _0xd21d5.replace(/^Bearer\s+/i, "").trim() : null;
    let _0x416f9c = false;
    if (_0x3aef42 && _0x3aef42 !== _0x53976c) {
      _0x53976c = _0x3aef42;
      _0x416f9c = true;
    }
    if (_0x261669 && _0x261669 !== _0x49c66b) {
      _0x49c66b = _0x261669;
      _0x416f9c = true;
    }
    if (!_0x416f9c && !_0x20cbee) {
      return;
    }
    console.log("[MasterLovableHook] ✅ Token capturado!", _0x53976c || "null");
    console.log("[MasterLovableHook] ProjectId:", _0x49c66b);
    window.postMessage({
      type: "lovableTokenFound",
      token: _0x53976c,
      projectId: _0x49c66b
    }, window.location.origin);
  }
  window.addEventListener("message", _0xa93509 => {
    if (_0xa93509.source !== window) {
      return;
    }
    if (!_0xa93509.data || _0xa93509.data.type !== "lovableRequestToken") {
      return;
    }
    _0xb98b8d(_0x53976c, _0x43f077() || _0x49c66b, true);
  });
  (function _0x4a8710() {
    try {
      const _0x292db6 = window.fetch;
      window.fetch = async function (..._0x4e65c9) {
        try {
          let _0x5d917e = typeof _0x4e65c9[0] === "string" ? _0x4e65c9[0] : _0x4e65c9[0] && _0x4e65c9[0].url || "";
          let _0x54c9f1 = _0x4e65c9[1] || {};
          let _0x1eaf0f = null;
          const _0x55e300 = _0x4e65c9[0] instanceof Request;
          if (_0x55e300) {
            _0x5d917e = _0x4e65c9[0].url || _0x5d917e;
            _0x1eaf0f = _0x4e65c9[0].headers && typeof _0x4e65c9[0].headers.get === "function" ? _0x4e65c9[0].headers.get("Authorization") || _0x4e65c9[0].headers.get("authorization") : null;
          }
          if (_0x54c9f1.headers) {
            if (_0x54c9f1.headers instanceof Headers) {
              _0x1eaf0f = _0x54c9f1.headers.get("Authorization");
            } else if (typeof _0x54c9f1.headers === "object") {
              _0x1eaf0f = _0x54c9f1.headers.Authorization || _0x54c9f1.headers.authorization;
            }
          }
          const _0x528e63 = _0x302f37(_0x5d917e);
          if (_0x1eaf0f && _0x1eaf0f.startsWith("Bearer ")) {
            const _0x21379f = _0x1eaf0f.slice(7);
            _0xb98b8d(_0x21379f, _0x528e63);
          }
        } catch (_0x5ed3d2) {}
        try {
          const _0x4e58b4 = typeof _0x4e65c9[0] === "string" ? _0x4e65c9[0] : _0x4e65c9[0] && _0x4e65c9[0].url || "";
          const _0x24c73d = _0x4e65c9[0] instanceof Request;
          const _0x383057 = (_0x24c73d ? _0x4e65c9[0].method || "GET" : (_0x4e65c9[1] || {}).method || "GET").toUpperCase();
          const _0x2c59f3 = _0x4e58b4 && _0x383057 === "POST" && (_0x4e58b4.includes("api.lovable.dev") || _0x4e58b4.includes("api.lovable.app") || _0x4e58b4.includes("lovable-api.com") || _0x4e58b4.includes("lovable.dev"));
          if (_0x2c59f3) {
            if (_0x24c73d) {
              try {
                const _0x57976e = _0x4e65c9[0];
                const _0x24af9c = _0x57976e.clone();
                const _0x475991 = await _0x24af9c.text();
                if (_0x475991) {
                  const _0x49cf48 = JSON.parse(_0x475991);
                  if (_0x3ba751 && !_0xNormalSend && _0x49cf48 && typeof _0x49cf48.message === "string" && _0x49cf48.message.length > 0) {
                    const _0x5016e4 = window.__qlBuildState;
                    const _0x5eaeaa = _0x5016e4 && _0x5016e4.eventId ? _0x5016e4.eventId : "";
                    const _0x4543dc = _0x5016e4 && _0x5016e4.errorMessage ? _0x5016e4.errorMessage : "src/App.tsx(1,7): error TS2322: Type 'number' is not assignable to type 'string'.";
                    _0x49cf48.intent = "fix_error";
                    _0x49cf48.contains_error = true;
                    _0x49cf48.error_source = "build_errors";
                    _0x49cf48.error_ids = _0x5eaeaa ? [_0x5eaeaa] : [];
                    _0x49cf48.message_intent_metadata = {
                      fix_error_metadata: {
                        errors: [{
                          error_type: "build",
                          error_message: _0x4543dc,
                          build_event_id: _0x5eaeaa
                        }]
                      }
                    };
                    const _0x3b4a74 = new Request(_0x57976e.url, {
                      method: _0x57976e.method,
                      headers: _0x57976e.headers,
                      body: JSON.stringify(_0x49cf48),
                      mode: _0x57976e.mode,
                      credentials: _0x57976e.credentials,
                      cache: _0x57976e.cache,
                      redirect: _0x57976e.redirect
                    });
                    _0x4e65c9 = [_0x3b4a74];
                    window.__qlLastMessage = _0x49cf48.message || "";
                    if (window.__qlFixTimer) {
                      clearInterval(window.__qlFixTimer);
                    }
                    var _0x537d6e = 0;
                    window.__qlFixTimer = setInterval(function () {
                      _0x537d6e++;
                      if (!window.__qlLastMessage || _0x537d6e > 100) {
                        clearInterval(window.__qlFixTimer);
                        return;
                      }
                      document.querySelectorAll("div.special-message").forEach(function (_0x223f77) {
                        if (_0x223f77.textContent.trim() === "Fix errors") {
                          _0x223f77.textContent = window.__qlLastMessage;
                        }
                      });
                    }, 100);
                    console.log("[MasterLovableHook] 💉 fix_error injetado (Request) evId:", _0x5eaeaa || "NENHUM", "| msg:", _0x49cf48.message.slice(0, 60));
                  }
                }
              } catch (_0x569203) {
                console.warn("[MasterLovableHook] erro bypass Request:", _0x569203);
              }
            } else {
              const _0x3ba300 = _0x4e65c9[1] || {};
              const _0x1e7392 = _0x3ba300.body;
              if (_0x1e7392 && typeof _0x1e7392 === "string") {
                try {
                  const _0x4d6c08 = JSON.parse(_0x1e7392);
                  if (_0x3ba751 && !_0xNormalSend && _0x4d6c08 && typeof _0x4d6c08.message === "string" && _0x4d6c08.message.length > 0) {
                    const _0x5882c3 = window.__qlBuildState;
                    const _0x58b628 = _0x5882c3 && _0x5882c3.eventId ? _0x5882c3.eventId : "";
                    const _0x4d2596 = _0x5882c3 && _0x5882c3.errorMessage ? _0x5882c3.errorMessage : "src/App.tsx(1,7): error TS2322: Type 'number' is not assignable to type 'string'.";
                    _0x4d6c08.intent = "fix_error";
                    _0x4d6c08.contains_error = true;
                    _0x4d6c08.error_source = "build_errors";
                    _0x4d6c08.error_ids = _0x58b628 ? [_0x58b628] : [];
                    _0x4d6c08.message_intent_metadata = {
                      fix_error_metadata: {
                        errors: [{
                          error_type: "build",
                          error_message: _0x4d2596,
                          build_event_id: _0x58b628
                        }]
                      }
                    };
                    _0x4e65c9 = [_0x4e65c9[0], Object.assign({}, _0x3ba300, {
                      body: JSON.stringify(_0x4d6c08)
                    })];
                    window.__qlLastMessage = _0x4d6c08.message || "";
                    if (window.__qlFixTimer) {
                      clearInterval(window.__qlFixTimer);
                    }
                    var _0x110215 = 0;
                    window.__qlFixTimer = setInterval(function () {
                      _0x110215++;
                      if (!window.__qlLastMessage || _0x110215 > 100) {
                        clearInterval(window.__qlFixTimer);
                        return;
                      }
                      document.querySelectorAll("div.special-message").forEach(function (_0x39676b) {
                        if (_0x39676b.textContent.trim() === "Fix errors") {
                          _0x39676b.textContent = window.__qlLastMessage;
                        }
                      });
                    }, 100);
                    console.log("[MasterLovableHook] 💉 fix_error injetado evId:", _0x58b628 || "NENHUM", "| msg:", _0x4d6c08.message.slice(0, 60));
                  }
                } catch (_0x36bfed) {
                  console.warn("[MasterLovableHook] erro bypass opts:", _0x36bfed);
                }
              }
            }
          }
        } catch (_0xe44461) {}
        return _0x292db6.apply(this, _0x4e65c9);
      };
    } catch (_0x2f9089) {
      console.warn("[MasterLovableHook] erro fetch", _0x2f9089);
    }
  })();
  (function _0x136eea() {
    try {
      const _0x2e2aa8 = XMLHttpRequest.prototype.open;
      const _0x93dc6e = XMLHttpRequest.prototype.setRequestHeader;
      XMLHttpRequest.prototype.open = function (_0x4e67b9, _0x59c9d3) {
        this._lovable_url = _0x59c9d3;
        return _0x2e2aa8.apply(this, arguments);
      };
      XMLHttpRequest.prototype.setRequestHeader = function (_0x430804, _0x1ef527) {
        if (_0x430804 && _0x430804.toLowerCase() === "authorization" && _0x1ef527 && _0x1ef527.startsWith("Bearer ")) {
          const _0x2e53ba = _0x1ef527.slice(7);
          _0xb98b8d(_0x2e53ba, _0x302f37(this._lovable_url));
        }
        return _0x93dc6e.apply(this, arguments);
      };
    } catch (_0x380b31) {
      console.warn("[MasterLovableHook] erro xhr", _0x380b31);
    }
  })();
  setInterval(() => {
    const _0x5c87dd = _0x43f077();
    const _0x1282b = _0x5c87dd && _0x5c87dd !== _0x49c66b;
    if (_0x1282b) {
      _0x49c66b = _0x5c87dd;
      window.postMessage({
        type: "lovableTokenFound",
        token: _0x53976c,
        projectId: _0x5c87dd
      }, window.location.origin);
    }
  }, 1500);
  console.log("[MasterLovableHook] wrapWS: window.WebSocket =", typeof window.WebSocket);
  (function _0x49ce68() {
    try {
      const _0x185c49 = window.WebSocket;
      function _0x218513(_0x48ba54, _0x10b508) {
        const _0x283605 = _0x10b508 ? new _0x185c49(_0x48ba54, _0x10b508) : new _0x185c49(_0x48ba54);
        const _0x3eb467 = String(_0x48ba54);
        const _0x131605 = _0x283605.send.bind(_0x283605);
        const _0x2ddf2e = _0x3eb467.replace(/token=[^&]+/g, "token=***").replace(/key=[^&]+/g, "key=***");
        console.log("[MasterLovableHook] WS conectando →", _0x2ddf2e);
        const _0x5dbadf = _0x3eb467.includes("lovable") || _0x3eb467.includes("trajectory") || _0x3eb467.includes("supabase") || _0x3eb467.includes("convex");
        if (_0x5dbadf) {
          _0x23c8e6 = _0x23c8e6.filter(_0x232ea4 => _0x232ea4.ws.readyState !== WebSocket.CLOSED);
          _0x23c8e6.push({
            ws: _0x283605,
            origSend: _0x131605
          });
          window.postMessage({
            type: "lovableWsConnected",
            url: _0x2ddf2e
          }, "*");
        }
        _0x283605.send = function (_0x187ac6) {
          try {
            const _0x453534 = typeof _0x187ac6 === "string" ? _0x187ac6.slice(0, 800) : "[binary]";
            console.log("[MasterLovableHook] WS SEND [" + _0x2ddf2e.slice(0, 60) + "] →", _0x453534);
            if (_0x3ba751 && !_0xNormalSend && typeof _0x187ac6 === "string" && _0x187ac6.length > 2) {
              try {
                const _0x57be32 = JSON.parse(_0x187ac6);
                if (_0x57be32 && typeof _0x57be32.message === "string" && _0x57be32.message.length > 0) {
                  _0x57be32.intent = "fix_error";
                  _0x57be32.message_intent_metadata = {
                    fix_error_metadata: {
                      errors: []
                    }
                  };
                  _0x187ac6 = JSON.stringify(_0x57be32);
                  console.log("[MasterLovableHook] 💉 fix_error injetado (WS):", _0x57be32.message.slice(0, 80));
                } else if (_0x57be32 && _0x57be32.type === "Mutation" && _0x57be32.args) {
                  const _0x104add = Array.isArray(_0x57be32.args) ? _0x57be32.args[0] : _0x57be32.args;
                  if (_0x104add && typeof _0x104add.message === "string" && _0x104add.message.length > 0) {
                    _0x104add.intent = "fix_error";
                    _0x104add.message_intent_metadata = {
                      fix_error_metadata: {
                        errors: []
                      }
                    };
                    if (Array.isArray(_0x57be32.args)) {
                      _0x57be32.args[0] = _0x104add;
                    } else {
                      _0x57be32.args = _0x104add;
                    }
                    _0x187ac6 = JSON.stringify(_0x57be32);
                    console.log("[MasterLovableHook] 💉 fix_error injetado (WS Convex):", _0x104add.message.slice(0, 80));
                  }
                }
              } catch (_0x203df1) {}
            }
          } catch (_0x268b84) {}
          return _0x131605(_0x187ac6);
        };
        _0x283605.addEventListener("message", _0x49ba45 => {
          try {
            const _0x4bd89d = typeof _0x49ba45.data === "string" ? _0x49ba45.data.slice(0, 300) : "[binary]";
            console.log("[MasterLovableHook] WS RECV [" + _0x2ddf2e.slice(0, 60) + "] ←", _0x4bd89d);
            if (typeof _0x49ba45.data === "string" && _0x49ba45.data.includes("#bld:") && _0x49ba45.data.includes("hasError")) {
              try {
                const _0x394ef6 = JSON.parse(_0x49ba45.data);
                if (_0x394ef6 && _0x394ef6.type === "trajectory" && _0x394ef6.event && _0x394ef6.event.id && _0x394ef6.event.payload) {
                  const _0x236dd4 = _0x394ef6.event.id.value || "";
                  const _0x431476 = _0x394ef6.event.payload.build;
                  if (_0x236dd4.includes("#bld:") && _0x431476 && _0x431476.buildErrors && _0x431476.buildErrors.typecheck && _0x431476.buildErrors.typecheck.hasError) {
                    const _0x367da7 = _0x431476.buildErrors.typecheck.output || "";
                    if (_0x367da7) {
                      const _0x3309ee = _0x367da7.trim().split("\n")[0];
                      window.__qlBuildState = {
                        eventId: _0x236dd4,
                        errorMessage: _0x3309ee
                      };
                      console.log("[MasterLovableHook] 📐 build_event_id capturado:", _0x236dd4, "|", _0x3309ee.slice(0, 80));
                    }
                  }
                }
              } catch (_0x2c73fc) {}
            }
          } catch (_0x5d9655) {}
        });
        return _0x283605;
      }
      try {
        Object.defineProperty(window, "WebSocket", {
          value: _0x218513,
          writable: true,
          configurable: true
        });
      } catch (_0x4834e1) {
        window.WebSocket = _0x218513;
      }
      _0x218513.prototype = _0x185c49.prototype;
      _0x218513.CONNECTING = _0x185c49.CONNECTING;
      _0x218513.OPEN = _0x185c49.OPEN;
      _0x218513.CLOSING = _0x185c49.CLOSING;
      _0x218513.CLOSED = _0x185c49.CLOSED;
      if (window.WebSocket !== _0x218513) {
        console.warn("[MasterLovableHook] ⚠️ WebSocket NÃO substituído — propriedade bloqueada!");
      } else {
        console.log("[MasterLovableHook] ✅ WebSocket substituído com sucesso");
      }
    } catch (_0x2da16e) {
      console.warn("[MasterLovableHook] erro ws wrap", _0x2da16e);
    }
  })();
})();