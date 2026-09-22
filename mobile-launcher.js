// Mobile Launcher v2 — floating FAB: drag · minimize · hide · open panel
// Chromium mobile browsers (Kiwi, Yandex, etc.) where chrome.sidePanel is unavailable.
(function () {
  try {
    if (window.__qlMobileLauncherInstalled) return;
    window.__qlMobileLauncherInstalled = true;

    var ua = (navigator.userAgent || "").toLowerCase();
    var uaMobile = (navigator.userAgentData && navigator.userAgentData.mobile === true);
    var isMobile = uaMobile || /android|mobile|kiwi|yabrowser|crios|edga\//i.test(ua);
    if (!isMobile) return;
    if (window.top !== window.self) return;
    try {
      var h = (location && location.hostname || "").toLowerCase();
      var isLovable = h === "lovable.dev" || h.endsWith(".lovable.dev")
        || h === "lovable.app" || h.endsWith(".lovable.app");
      if (!isLovable) return;
    } catch (_) { return; }

    var HOST_ID = "ql-mobile-launcher-host";
    function removeLegacyFloatingWidget() {
      try {
        var floating = document.getElementById("ql-floating");
        if (floating && floating.parentNode) floating.parentNode.removeChild(floating);
      } catch (_) {}
    }
    removeLegacyFloatingWidget();
    if (document.getElementById(HOST_ID)) return;

    var host = document.createElement("div");
    host.id = HOST_ID;
    host.style.cssText = "all: initial; position: fixed; inset: auto; z-index: 2147483646;";
    (document.documentElement || document.body).appendChild(host);

    var shadow = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;

    var style = document.createElement("style");
    style.textContent = [
      ":host,*{box-sizing:border-box;font-family:'Cairo','Manrope','Sora',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}",
      ":host{--bg:#07090e;--surface:rgba(12,16,24,.92);--border:rgba(255,255,255,.1);--accent:#f7931a;--glow:rgba(247,147,26,.42);--text:#f4f7fb;--muted:#a8b3c5;}",
      ".fab-wrap{position:fixed;display:flex;flex-direction:column;align-items:flex-end;gap:8px;touch-action:none;}",
      ".fab{position:relative;width:58px;height:58px;border-radius:50%;",
      "background:linear-gradient(145deg,#f7931a,#ffb347);color:#0b0e14;",
      "box-shadow:0 12px 32px var(--glow),0 0 0 1px rgba(255,255,255,.35) inset;",
      "display:flex;align-items:center;justify-content:center;cursor:pointer;",
      "border:0;user-select:none;transition:transform .2s cubic-bezier(.22,1,.36,1),opacity .2s ease,width .2s ease,height .2s ease,border-radius .2s ease;}",
      ".fab:active{transform:scale(.92);}",
      ".fab.mini{width:42px;height:42px;border-radius:16px;}",
      ".fab.hidden,.fab-wrap.gone{opacity:0;pointer-events:none;transform:scale(.8);}",
      ".fab img,.fab svg{width:32px;height:32px;border-radius:50%;pointer-events:none;object-fit:cover;}",
      ".fab.mini img,.fab.mini svg{width:22px;height:22px;}",
      ".fab .dot{position:absolute;top:2px;right:2px;width:11px;height:11px;border-radius:50%;background:#22c55e;border:2px solid #fff;box-shadow:0 0 10px rgba(34,197,94,.55);}",
      ".rail{display:flex;gap:6px;opacity:0;pointer-events:none;transform:translateY(6px);transition:opacity .2s ease,transform .2s ease;}",
      ".rail.open{opacity:1;pointer-events:auto;transform:none;}",
      ".rail button{all:unset;cursor:pointer;min-width:34px;height:34px;padding:0 10px;border-radius:12px;font-size:11px;font-weight:800;",
      "color:var(--text);background:var(--surface);border:1px solid var(--border);backdrop-filter:blur(14px);",
      "box-shadow:0 8px 20px rgba(0,0,0,.35);display:inline-flex;align-items:center;justify-content:center;}",
      ".rail button:active{transform:scale(.95);}",
      ".peek{position:fixed;width:18px;height:48px;border-radius:12px 0 0 12px;background:linear-gradient(180deg,#f7931a,#ffb347);",
      "box-shadow:0 8px 24px var(--glow);border:0;cursor:pointer;opacity:0;pointer-events:none;transition:opacity .2s ease,transform .2s ease;}",
      ".peek.show{opacity:1;pointer-events:auto;}",
      ".backdrop{position:fixed;inset:0;background:rgba(4,6,10,.72);opacity:0;pointer-events:none;transition:opacity .22s ease;backdrop-filter:blur(6px);}",
      ".backdrop.open{opacity:1;pointer-events:auto;}",
      ".sheet{position:fixed;inset:0;background:var(--bg);transform:translateY(100%);transition:transform .32s cubic-bezier(.22,1,.36,1);",
      "display:flex;flex-direction:column;overflow:hidden;box-shadow:0 -24px 60px rgba(0,0,0,.45);}",
      ".sheet.open{transform:translateY(0);}",
      ".sheet .grabber{width:42px;height:4px;border-radius:2px;background:rgba(255,255,255,.28);margin:calc(10px + env(safe-area-inset-top,0px)) auto 6px;flex:none;}",
      ".sheet .bar{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 12px 12px;color:var(--text);",
      "background:var(--surface);border-bottom:1px solid var(--border);flex:none;backdrop-filter:blur(16px);}",
      ".sheet .brand{display:flex;align-items:center;gap:9px;min-width:0;}",
      ".sheet .brand img{width:28px;height:28px;border-radius:10px;object-fit:cover;box-shadow:0 0 18px var(--glow);}",
      ".sheet .brand-copy{display:flex;flex-direction:column;line-height:1.05;min-width:0;}",
      ".sheet .bar .title{font-size:13px;font-weight:800;color:var(--accent);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:46vw;}",
      ".sheet .bar .sub{margin-top:3px;font-size:9px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);}",
      ".sheet .bar .actions{display:flex;gap:6px;}",
      ".sheet .bar button{all:unset;cursor:pointer;min-width:40px;text-align:center;padding:9px 11px;border-radius:12px;color:var(--text);font-size:12px;font-weight:800;",
      "background:rgba(255,255,255,.06);border:1px solid var(--border);}",
      ".sheet iframe{flex:1;width:100%;border:0;background:var(--bg);}"
    ].join("");
    shadow.appendChild(style);

    var fabWrap = document.createElement("div");
    fabWrap.className = "fab-wrap";
    shadow.appendChild(fabWrap);

    var rail = document.createElement("div");
    rail.className = "rail";
    rail.innerHTML =
      '<button type="button" data-a="mini" title="Minimize">Mini</button>' +
      '<button type="button" data-a="hide" title="Hide">Hide</button>';
    fabWrap.appendChild(rail);

    var fab = document.createElement("button");
    fab.className = "fab";
    fab.setAttribute("aria-label", "Open extension");
    var iconUrl = "";
    try { iconUrl = chrome.runtime.getURL("assets/icon128.png"); } catch (_) {}
    fab.innerHTML = (iconUrl
      ? '<img alt="" src="' + iconUrl + '"/>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/></svg>')
      + '<span class="dot"></span>';
    fabWrap.appendChild(fab);

    var peek = document.createElement("button");
    peek.className = "peek";
    peek.setAttribute("aria-label", "Show extension");
    peek.title = "Show";
    shadow.appendChild(peek);

    var backdrop = document.createElement("div");
    backdrop.className = "backdrop";
    shadow.appendChild(backdrop);

    var sheet = document.createElement("div");
    sheet.className = "sheet";
    sheet.innerHTML = [
      '<div class="grabber"></div>',
      '<div class="bar">',
      '  <span class="brand"><img alt="" src="' + iconUrl + '"><span class="brand-copy"><span class="title">Mirza-Lovable</span><span class="sub">AI Studio V2.0</span></span></span>',
      '  <div class="actions">',
      '    <button data-a="reload" title="Reload">↻</button>',
      '    <button data-a="minimize" title="Minimize">Minimize</button>',
      '  </div>',
      '</div>',
      '<iframe title="Extension panel" allow="clipboard-read; clipboard-write"></iframe>'
    ].join("");
    shadow.appendChild(sheet);

    var iframe = sheet.querySelector("iframe");
    var railOpen = false;
    var mini = false;
    var hidden = false;

    var pos = { right: 16, bottom: 90 };
    try {
      var saved = JSON.parse(localStorage.getItem("ql_fab_pos") || "null");
      if (saved && typeof saved.right === "number" && typeof saved.bottom === "number") pos = saved;
      mini = localStorage.getItem("ql_fab_mini") === "1";
    } catch (_) {}
    if (mini) fab.classList.add("mini");

    function applyPos() {
      fabWrap.style.right = pos.right + "px";
      fabWrap.style.bottom = "calc(" + pos.bottom + "px + env(safe-area-inset-bottom,0px))";
      fabWrap.style.left = "auto";
      fabWrap.style.top = "auto";
      peek.style.right = "0";
      peek.style.bottom = "calc(" + Math.max(24, pos.bottom) + "px + env(safe-area-inset-bottom,0px))";
    }
    applyPos();

    function setRail(open) {
      railOpen = !!open;
      rail.classList.toggle("open", railOpen);
    }

    function setHidden(on) {
      hidden = !!on;
      fabWrap.classList.toggle("gone", hidden);
      peek.classList.toggle("show", hidden);
      setRail(false);
    }

    function setMini(on) {
      mini = !!on;
      fab.classList.toggle("mini", mini);
      try { localStorage.setItem("ql_fab_mini", mini ? "1" : "0"); } catch (_) {}
      setRail(false);
    }

    var dragging = false, moved = false, startX = 0, startY = 0, startRight = 0, startBottom = 0, longPressTimer = null;
    fab.addEventListener("pointerdown", function (e) {
      dragging = true; moved = false;
      startX = e.clientX; startY = e.clientY;
      startRight = pos.right; startBottom = pos.bottom;
      try { fab.setPointerCapture(e.pointerId); } catch (_) {}
      longPressTimer = setTimeout(function () {
        if (dragging && !moved) setRail(!railOpen);
      }, 420);
    });
    fab.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        moved = true;
        if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
        setRail(false);
      }
      pos.right = Math.max(6, Math.min(window.innerWidth - 60, startRight - dx));
      pos.bottom = Math.max(6, Math.min(window.innerHeight - 60, startBottom - dy));
      applyPos();
    });
    fab.addEventListener("pointerup", function () {
      if (!dragging) return;
      dragging = false;
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
      var fabRect = fab.getBoundingClientRect();
      var centerX = fabRect.left + fabRect.width / 2;
      if (centerX < window.innerWidth / 2) {
        pos.right = window.innerWidth - fabRect.width - 12;
      } else {
        pos.right = 12;
      }
      applyPos();
      try { localStorage.setItem("ql_fab_pos", JSON.stringify(pos)); } catch (_) {}
      if (!moved && !railOpen) openSheet();
    });

    rail.addEventListener("click", function (e) {
      var btn = e.target && e.target.closest ? e.target.closest("button[data-a]") : null;
      if (!btn) return;
      var a = btn.getAttribute("data-a");
      if (a === "mini") setMini(!mini);
      if (a === "hide") setHidden(true);
    });
    peek.addEventListener("click", function () { setHidden(false); });

    function openSheet() {
      try {
        removeLegacyFloatingWidget();
        if (!iframe.src || iframe.src === "about:blank") {
          iframe.src = chrome.runtime.getURL("sidepanel.html?fullscreen=1&embed=1");
        }
      } catch (_) {}
      setRail(false);
      backdrop.classList.add("open");
      sheet.classList.add("open");
      fabWrap.classList.add("gone");
      document.documentElement.style.overflow = "hidden";
    }
    function closeSheet() {
      backdrop.classList.remove("open");
      sheet.classList.remove("open");
      if (!hidden) fabWrap.classList.remove("gone");
      document.documentElement.style.overflow = "";
      setTimeout(function () {
        if (!sheet.classList.contains("open")) {
          try { iframe.src = "about:blank"; } catch (_) {}
        }
      }, 340);
    }

    backdrop.addEventListener("click", closeSheet);
    sheet.querySelector('[data-a="minimize"]').addEventListener("click", closeSheet);
    sheet.querySelector('[data-a="reload"]').addEventListener("click", function () {
      try { iframe.src = chrome.runtime.getURL("sidepanel.html?fullscreen=1&embed=1"); } catch (_) {}
    });

    var swipeStartY = null;
    var bar = sheet.querySelector(".bar");
    var grabber = sheet.querySelector(".grabber");
    [grabber, bar].forEach(function (el) {
      el.addEventListener("touchstart", function (e) { swipeStartY = e.touches[0].clientY; }, { passive: true });
      el.addEventListener("touchmove", function (e) {
        if (swipeStartY == null) return;
        var dy = e.touches[0].clientY - swipeStartY;
        if (dy > 0) sheet.style.transform = "translateY(" + dy + "px)";
      }, { passive: true });
      el.addEventListener("touchend", function (e) {
        if (swipeStartY == null) return;
        var dy = (e.changedTouches[0].clientY - swipeStartY);
        sheet.style.transform = "";
        if (dy > 120) closeSheet();
        swipeStartY = null;
      });
    });

    window.addEventListener("message", function (e) {
      if (!e || !e.data) return;
      if (e.data === "ql-close-sheet" || (e.data && e.data.type === "ql-close-sheet")) closeSheet();
    });

    try {
      chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
        if (!msg || msg.action !== "qlMobileOpenPanel") return false;
        setHidden(false);
        openSheet();
        if (typeof sendResponse === "function") sendResponse({ ok: true, inline: true });
        return false;
      });
    } catch (_) {}
  } catch (err) {
    try { console.warn("[MobileLauncher] init failed:", err && err.message); } catch (_) {}
  }
})();
