// Runs before other scripts. Applies fullscreen/mobile classes for normal-tab mode.
try {
  var qs = new URLSearchParams(location.search);
  var ua = (navigator.userAgent || '').toLowerCase();
  if (qs.get('fullscreen') === '1') {
    document.body.classList.add('sp-fullscreen');
  }
  if (qs.get('embed') === '1') {
    document.body.classList.add('sp-embed');
  }
  if (/android|mobile|kiwi|crios|edga\//i.test(ua)) {
    document.body.classList.add('sp-mobile');
  }
} catch (e) {}
