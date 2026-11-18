// Cartoon desk items that lie on the wooden desk beside the notepad.
// They are placed down the whole page, so you see different ones as you scroll.
(function () {
  var OUT = 'stroke="#2a1f1a" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';
  var ITEMS = {
    pencil: { w: 210, h: 42, svg:
      '<svg viewBox="0 0 210 42" width="210" height="42">' +
      '<rect x="3" y="8" width="26" height="26" rx="6" fill="#f29db0" ' + OUT + '/>' +
      '<rect x="29" y="8" width="20" height="26" fill="#c9ced6" ' + OUT + '/>' +
      '<path d="M36 8v26M42 8v26" stroke="#8d95a3" stroke-width="2"/>' +
      '<rect x="49" y="8" width="115" height="26" fill="#ffd23f" ' + OUT + '/>' +
      '<path d="M49 21h115" stroke="#e0a800" stroke-width="3"/>' +
      '<path d="M164 8v26l38-13z" fill="#f1cf9b" ' + OUT + '/>' +
      '<path d="M190 16v10l12-5z" fill="#3a3a44" ' + OUT + '/></svg>' },
    tack: { w: 74, h: 84, svg:
      '<svg viewBox="0 0 74 84" width="74" height="84">' +
      '<path d="M37 48v30" stroke="#2a1f1a" stroke-width="3" stroke-linecap="round"/>' +
      '<ellipse cx="37" cy="46" rx="26" ry="14" fill="#b92d2d" ' + OUT + '/>' +
      '<rect x="27" y="22" width="20" height="24" fill="#d63a3a" ' + OUT + '/>' +
      '<ellipse cx="37" cy="22" rx="24" ry="14" fill="#ef4444" ' + OUT + '/>' +
      '<ellipse cx="29" cy="18" rx="7" ry="4" fill="#fff" opacity=".65"/></svg>' },
    eraser: { w: 124, h: 70, svg:
      '<svg viewBox="0 0 124 70" width="124" height="70">' +
      '<rect x="5" y="12" width="114" height="46" rx="9" fill="#f4a7b9" ' + OUT + '/>' +
      '<path d="M70 12h-56a9 9 0 0 0-9 9v28a9 9 0 0 0 9 9h56z" fill="#3b82f6" ' + OUT + '/>' +
      '<path d="M22 28h34M22 42h34" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".8"/>' +
      '<rect x="92" y="62" width="9" height="5" rx="2" fill="#f4a7b9" ' + OUT + '/></svg>' },
    ball: { w: 124, h: 124, svg:
      '<svg viewBox="0 0 124 124" width="124" height="124">' +
      '<defs><clipPath id="rbc"><circle cx="62" cy="62" r="54"/></clipPath></defs>' +
      '<circle cx="62" cy="62" r="54" fill="#e8a33d"/>' +
      '<g clip-path="url(#rbc)" fill="none" stroke-width="7" stroke-linecap="round">' +
      '<path d="M4 50Q62 14 120 58" stroke="#c0392b"/><path d="M2 76Q62 120 122 66" stroke="#f4c95d"/>' +
      '<path d="M32 4Q76 62 36 120" stroke="#d98324"/><path d="M92 4Q46 62 92 120" stroke="#c0392b"/>' +
      '<path d="M8 32Q62 78 116 26" stroke="#f4c95d"/><path d="M12 100Q62 60 112 104" stroke="#d98324"/></g>' +
      '<circle cx="62" cy="62" r="54" fill="none" ' + OUT + '/>' +
      '<path d="M30 34Q40 20 56 16" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".6"/></svg>' },
    plane: { w: 160, h: 100, svg:
      '<svg viewBox="0 0 160 100" width="160" height="100">' +
      '<path d="M60 52L152 50L74 88Z" fill="#cfdcf7" ' + OUT + '/>' +
      '<path d="M8 18L152 50L60 52Z" fill="#fff" ' + OUT + '/>' +
      '<path d="M8 18L60 52L74 88" fill="none" stroke="#2a1f1a" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M40 30L96 46" stroke="#9fb2dc" stroke-width="2" stroke-linecap="round"/></svg>' },
  };
  var ORDER = ["pencil", "ball", "tack", "plane", "eraser"];
  var ANGLES = [-62, 14, -18, 24, -9, 58, -34, 8, 40, -75];
  var PAPER = 1120;            // width of the notepad, as in style.css
  var layer = document.createElement("div");
  layer.className = "desk-items";
  layer.setAttribute("aria-hidden", "true");

  function place() {
    var vw = document.documentElement.clientWidth;
    var margin = (vw - PAPER) / 2;
    layer.innerHTML = "";
    if (margin < 70) return;                                   // no desk showing on narrow screens
    var height = document.body.offsetHeight + 62;
    layer.style.height = height + "px";
    var scale = Math.min(1, (margin - 28) / 150);
    var n = 0;
    for (var y = 150; y < height - 80; y += 430, n++) {
      var kind = ITEMS[ORDER[n % ORDER.length]];
      var left = n % 2 === 0;
      var cx = left ? margin / 2 : vw - margin / 2;
      cx += ((n * 37) % 41 - 20) * (margin / 400);             // small repeatable jitter
      var el = document.createElement("div");
      el.className = "desk-item";
      el.style.left = (cx - kind.w / 2) + "px";
      el.style.top = (y + ((n * 53) % 90)) + "px";
      el.style.transform = "rotate(" + ANGLES[n % ANGLES.length] + "deg) scale(" + scale + ")";
      el.innerHTML = kind.svg;
      layer.appendChild(el);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.documentElement.insertBefore(layer, document.body);
    place();
    if (window.ResizeObserver) new ResizeObserver(place).observe(document.body);
    window.addEventListener("resize", place);
  });
})();
