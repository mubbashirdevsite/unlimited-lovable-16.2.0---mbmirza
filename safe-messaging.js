/* ==========================================================
   Safe messaging shim
   Wraps chrome.tabs.sendMessage and chrome.runtime.sendMessage
   so that "Could not establish connection. Receiving end does
   not exist." never surfaces as an Unchecked runtime.lastError
   or Uncaught (in promise) Error. Common when the target tab
   is not lovable.dev, is being reloaded, or has no listener.
   ========================================================== */
(function () {
  if (typeof chrome === "undefined" || !chrome.runtime) return;
  if (chrome.__ql_safe_messaging_patched) return;
  chrome.__ql_safe_messaging_patched = true;

  function isBenign(err) {
    if (!err) return false;
    var m = String(typeof err === "string" ? err : err.message || "").toLowerCase();
    return (
      m.indexOf("receiving end does not exist") !== -1 ||
      m.indexOf("could not establish connection") !== -1 ||
      m.indexOf("message port closed") !== -1 ||
      m.indexOf("the extension context is invalidated") !== -1
    );
  }

  function wrap(target, method) {
    if (!target || typeof target[method] !== "function") return;
    var orig = target[method].bind(target);
    target[method] = function () {
      var args = Array.prototype.slice.call(arguments);
      var lastArg = args.length ? args[args.length - 1] : null;
      var hasCallback = typeof lastArg === "function";

      if (hasCallback) {
        var cb = args.pop();
        args.push(function () {
          var lastErr = chrome.runtime && chrome.runtime.lastError;
          if (lastErr && isBenign(lastErr)) {
            // Read it to mark as handled, then swallow.
            try { cb.apply(null, [undefined]); } catch (_) {}
            return;
          }
          try { cb.apply(null, arguments); } catch (_) {}
        });
        try {
          return orig.apply(null, args);
        } catch (e) {
          if (!isBenign(e)) throw e;
        }
      } else {
        try {
          var ret = orig.apply(null, args);
          if (ret && typeof ret.then === "function") {
            return ret.catch(function (e) {
              if (isBenign(e)) return undefined;
              throw e;
            });
          }
          return ret;
        } catch (e) {
          if (!isBenign(e)) throw e;
        }
      }
    };
  }

  wrap(chrome.tabs, "sendMessage");
  wrap(chrome.runtime, "sendMessage");
})();
