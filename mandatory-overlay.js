// Global mandatory-update overlay. Injected on every page so the user cannot
// bypass a required extension update by navigating away from Lovable.
(function () {
  if (window.__ql_mandatory_overlay_loaded) return;
  if (typeof EXTENSION_UPGRADE_OVERLAY_DISABLED !== "undefined" && EXTENSION_UPGRADE_OVERLAY_DISABLED) return;
  window.__ql_mandatory_overlay_loaded = true;

  // Only show the full-screen mandatory update overlay on Lovable's own
  // domains (and the extension surface). On our marketing/dashboard domain
  // (lovax.net and friends) the update is surfaced as a bar instead, so we
  // must NOT render the blocking overlay there.
  try {
    var h = (location && location.hostname || "").toLowerCase();
    var isLovable =
      h === "lovable.dev" || h.endsWith(".lovable.dev") ||
      h === "lovable.app" || h.endsWith(".lovable.app");
    if (!isLovable) return;
  } catch (e) { return; }

  var OVERLAY_ID = "ql-mandatory-update-global";

  function css() {
    return (
      "#" + OVERLAY_ID + "{position:fixed;inset:0;z-index:2147483647;background:rgba(6,8,15,0.9);" +
      "display:flex;align-items:center;" +
      "justify-content:center;padding:24px;font-family:Cairo,Manrope,Sora,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;" +
      "backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);}" +
      "#" + OVERLAY_ID + " .ql-mu-card{max-width:520px;width:100%;background:rgba(12,16,24,0.94);border:1px solid rgba(247,147,26,0.35);" +
      "border-radius:22px;padding:32px;text-align:center;box-shadow:0 25px 60px rgba(0,0,0,.55),0 0 40px rgba(247,147,26,.18);color:#fff;}" +
      "#" + OVERLAY_ID + " .ql-mu-icon{font-size:48px;line-height:1;margin-bottom:12px;}" +
      "#" + OVERLAY_ID + " .ql-mu-title{font-size:22px;font-weight:800;margin:0 0 10px;color:#f7931a;letter-spacing:-0.02em;}" +
      "#" + OVERLAY_ID + " .ql-mu-text{font-size:14px;line-height:1.6;color:#cbd5e1;margin:0 0 20px;white-space:pre-wrap;}" +
      "#" + OVERLAY_ID + " .ql-mu-btn{display:inline-block;background:linear-gradient(135deg,#f7931a,#ffb347);color:#0b1220;font-weight:800;" +
      "padding:12px 24px;border-radius:12px;text-decoration:none;font-size:15px;box-shadow:0 8px 24px rgba(247,147,26,.35);}" +
      "#" + OVERLAY_ID + " .ql-mu-btn:hover{filter:brightness(1.05);}" +
      "#" + OVERLAY_ID + " .ql-mu-hint{font-size:12px;color:#94a3b8;margin-top:16px;}" +
      "#" + OVERLAY_ID + " code{background:#1e293b;padding:2px 6px;border-radius:4px;color:#f7931a;}"
    );
  }

  function ensureStyle() {
    if (document.getElementById(OVERLAY_ID + "-style")) return;
    var s = document.createElement("style");
    s.id = OVERLAY_ID + "-style";
    s.textContent = css();
    (document.head || document.documentElement).appendChild(s);
  }

  function escapeHtml(str) {
    return String(str || "").replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function render(upd) {
    ensureStyle();
    var existing = document.getElementById(OVERLAY_ID);
    if (existing) existing.remove();
    var host = document.body || document.documentElement;
    if (!host) return;
    var wrap = document.createElement("div");
    wrap.id = OVERLAY_ID;
    var dlBtn = upd.download_url
      ? '<a class="ql-mu-btn" href="' + escapeHtml(upd.download_url) + '" target="_blank" rel="noopener noreferrer">⬇ Download v' + escapeHtml(upd.version) + '</a>'
      : "";
    wrap.innerHTML =
      '<div class="ql-mu-card" role="dialog" aria-modal="true">' +
      '<div class="ql-mu-icon">⚠️</div>' +
      '<h2 class="ql-mu-title">Update required — v' + escapeHtml(upd.version) + '</h2>' +
      '<p class="ql-mu-text">' + escapeHtml(upd.changelog || "A new mandatory version is available. Please install it to continue using the extension.") + '</p>' +
      dlBtn +
      '<p class="ql-mu-hint">Open <code>chrome://extensions</code>, remove the old version and load the new one.</p>' +
      "</div>";
    host.appendChild(wrap);
  }

  function remove() {
    var el = document.getElementById(OVERLAY_ID);
    if (el) el.remove();
  }

  function check() {
    try {
      chrome.storage.local.get(["ql_update_info"], function (r) {
        var upd = r && r.ql_update_info;
        if (upd && upd.available && upd.is_mandatory) render(upd);
        else remove();
      });
    } catch (e) {}
  }

  try {
    chrome.storage.onChanged.addListener(function (ch, area) {
      if (area === "local" && ch.ql_update_info) check();
    });
  } catch (e) {}

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", check, { once: true });
  } else {
    check();
  }
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) check();
  });
})();
