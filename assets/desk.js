// Desk items that lie on the wooden desk beside the notepad.
// Drawn at real-life size next to the notepad (about 100 px per inch) with soft shading,
// placed down the whole page so different ones come into view as you scroll.
(function () {
  // small repeatable random numbers, so the items look the same on every load
  function rng(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

  function pencil(u) {
    return '<svg viewBox="0 0 660 40" width="660" height="40">' +
      '<defs>' +
      '<linearGradient id="pb' + u + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe066"/><stop offset=".22" stop-color="#f6c012"/><stop offset=".55" stop-color="#e0a000"/><stop offset=".8" stop-color="#b57d00"/><stop offset="1" stop-color="#8f5f00"/></linearGradient>' +
      '<linearGradient id="pm' + u + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f6f8"/><stop offset=".3" stop-color="#c3c9d1"/><stop offset=".6" stop-color="#8d95a1"/><stop offset="1" stop-color="#5b626d"/></linearGradient>' +
      '<linearGradient id="pe' + u + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f9b8c4"/><stop offset=".5" stop-color="#e98aa0"/><stop offset="1" stop-color="#b9566e"/></linearGradient>' +
      '<linearGradient id="pw' + u + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6dcae"/><stop offset=".5" stop-color="#dcb67a"/><stop offset="1" stop-color="#a97f45"/></linearGradient>' +
      '</defs>' +
      '<rect x="2" y="6" width="38" height="28" rx="8" fill="url(#pe' + u + ')"/>' +
      '<rect x="40" y="5" width="52" height="30" fill="url(#pm' + u + ')"/>' +
      '<path d="M52 5v30M58 5v30M64 5v30M70 5v30M76 5v30" stroke="#4a515b" stroke-opacity=".45" stroke-width="1.6"/>' +
      '<rect x="92" y="5" width="440" height="30" fill="url(#pb' + u + ')"/>' +
      '<path d="M92 14h440M92 26h440" stroke="#7a5200" stroke-opacity=".28" stroke-width="1"/>' +
      '<text x="150" y="25" font-family="Arial, sans-serif" font-size="13" font-weight="700" letter-spacing="2" fill="#6a4600" fill-opacity=".7">HB No. 2 SOFT</text>' +
      '<path d="M532 5L612 16Q618 20 612 24L532 35Z" fill="url(#pw' + u + ')"/>' +
      '<path d="M590 12.5L626 20L590 27.5Z" fill="#4a4d55"/>' +
      '<path d="M590 12.5L626 20L590 27.5Z" fill="#fff" fill-opacity=".12"/>' +
      '<path d="M532 5L590 13M532 35L590 27" stroke="#8a6330" stroke-opacity=".5" stroke-width="1"/></svg>';
  }

  function tack(u) {
    return '<svg viewBox="0 0 70 70" width="70" height="70">' +
      '<defs><radialGradient id="tk' + u + '" cx=".36" cy=".32" r=".75"><stop offset="0" stop-color="#ffb3a8"/><stop offset=".25" stop-color="#ef4a3c"/><stop offset=".7" stop-color="#b3201a"/><stop offset="1" stop-color="#6e0d0a"/></radialGradient>' +
      '<linearGradient id="tn' + u + '" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f1f3f5"/><stop offset="1" stop-color="#7d848d"/></linearGradient></defs>' +
      '<path d="M44 42L66 62" stroke="url(#tn' + u + ')" stroke-width="3.6" stroke-linecap="round"/>' +
      '<ellipse cx="32" cy="38" rx="27" ry="16" fill="#8f1712"/>' +
      '<ellipse cx="31" cy="33" rx="26" ry="19" fill="url(#tk' + u + ')"/>' +
      '<ellipse cx="22" cy="24" rx="9" ry="5" fill="#fff" fill-opacity=".55" transform="rotate(-25 22 24)"/></svg>';
  }

  function eraser(u) {
    return '<svg viewBox="0 0 210 84" width="210" height="84">' +
      '<defs><linearGradient id="ep' + u + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f8b9c6"/><stop offset=".5" stop-color="#ee93a8"/><stop offset="1" stop-color="#c8627c"/></linearGradient>' +
      '<linearGradient id="es' + u + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a7fd0"/><stop offset=".5" stop-color="#2f5fb3"/><stop offset="1" stop-color="#1f3f80"/></linearGradient></defs>' +
      '<rect x="4" y="6" width="202" height="68" rx="12" fill="url(#ep' + u + ')"/>' +
      '<path d="M120 6H16A12 12 0 0 0 4 18V62A12 12 0 0 0 16 74H120Z" fill="url(#es' + u + ')"/>' +
      '<path d="M120 6V74" stroke="#142a57" stroke-opacity=".5" stroke-width="1.5"/>' +
      '<path d="M16 22H112M16 62H112" stroke="#fff" stroke-opacity=".75" stroke-width="3"/>' +
      '<text x="64" y="47" text-anchor="middle" font-family="Arial, sans-serif" font-size="19" font-weight="700" letter-spacing="2" fill="#fff" fill-opacity=".92">ERASER</text>' +
      '<path d="M130 14H190" stroke="#fff" stroke-opacity=".35" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M198 66l8 4M192 74l3 6" stroke="#c8627c" stroke-width="3" stroke-linecap="round"/></svg>';
  }

  function ball(u) {
    var r = rng(41 + u * 7), S = 250, C = 125, R = 119;
    var palette = ["#d8a64e", "#c98a2b", "#e7c26c", "#b9742a", "#a8601e", "#e1b45b", "#8f5a22", "#d8a64e", "#c98a2b", "#c4452f"];
    var loops = "";
    for (var i = 0; i < 52; i++) {
      var rot = (i * 180 / 52 * 3.1 + r() * 25) % 180, ry = 22 + r() * 96;
      var dx = (r() - .5) * 18, dy = (r() - .5) * 18, w = 3.6 + r() * 3;
      var e = '<ellipse cx="' + (C + dx).toFixed(1) + '" cy="' + (C + dy).toFixed(1) + '" rx="' + (R - 2) + '" ry="' + ry.toFixed(1) +
        '" transform="rotate(' + rot.toFixed(1) + ' ' + C + ' ' + C + ')" fill="none"';
      loops += e + ' stroke="#3a1d06" stroke-opacity=".55" stroke-width="' + (w + 2.2).toFixed(1) + '"/>' +
        e + ' stroke="' + palette[Math.floor(r() * palette.length)] + '" stroke-width="' + w.toFixed(1) + '"/>';
    }
    return '<svg viewBox="0 0 ' + S + ' ' + S + '" width="' + S + '" height="' + S + '">' +
      '<defs><clipPath id="bc' + u + '"><circle cx="' + C + '" cy="' + C + '" r="' + R + '"/></clipPath>' +
      '<radialGradient id="bs' + u + '" cx=".36" cy=".3" r=".85"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/>' +
      '<stop offset=".82" stop-color="#2a1203" stop-opacity=".35"/><stop offset="1" stop-color="#1b0b02" stop-opacity=".7"/></radialGradient>' +
      '<filter id="bb' + u + '"><feGaussianBlur stdDeviation="5"/></filter></defs>' +
      '<circle cx="' + C + '" cy="' + C + '" r="' + R + '" fill="#6b3a12"/>' +
      '<g clip-path="url(#bc' + u + ')">' + loops + '</g>' +
      '<circle cx="' + C + '" cy="' + C + '" r="' + R + '" fill="url(#bs' + u + ')"/>' +
      '<ellipse cx="88" cy="70" rx="30" ry="15" fill="#fff" fill-opacity=".38" transform="rotate(-35 88 70)" filter="url(#bb' + u + ')"/></svg>';
  }

  function plane(u) {
    return '<svg viewBox="0 0 400 220" width="400" height="220">' +
      '<defs>' +
      '<linearGradient id="pa' + u + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e9edf3"/></linearGradient>' +
      '<linearGradient id="pc' + u + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d4dbe6"/><stop offset="1" stop-color="#aab4c4"/></linearGradient>' +
      '<linearGradient id="pd' + u + '" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f1f4f8"/><stop offset="1" stop-color="#cfd6e1"/></linearGradient></defs>' +
      '<path d="M150 118L392 106L184 196Z" fill="url(#pc' + u + ')"/>' +
      '<path d="M18 40L392 106L150 118Z" fill="url(#pa' + u + ')"/>' +
      '<path d="M18 40L150 118L184 196" fill="none" stroke="#98a3b5" stroke-width="1.4" stroke-linejoin="round"/>' +
      '<path d="M150 118L392 106" stroke="#a5afbf" stroke-width="1.2"/>' +
      '<path d="M150 118L184 196L160 140Z" fill="url(#pd' + u + ')" fill-opacity=".8"/>' +
      '<path d="M40 56L300 102" stroke="#c3cbd8" stroke-width="1" stroke-opacity=".8"/>' +
      '<path d="M18 40L392 106" stroke="#fff" stroke-opacity=".7" stroke-width="1.2"/></svg>';
  }

  // w, h = drawn size; the item is centred on its position
  var ITEMS = [
    { make: pencil, w: 660, h: 40, angle: -76 },
    { make: ball, w: 250, h: 250, angle: 0 },
    { make: tack, w: 70, h: 70, angle: 12 },
    { make: plane, w: 400, h: 220, angle: -22 },
    { make: eraser, w: 210, h: 84, angle: 24 },
  ];
  var PAPER = 1120;            // width of the notepad, as in style.css
  var layer = document.createElement("div");
  layer.className = "desk-items";
  layer.setAttribute("aria-hidden", "true");

  var slots = [], scale = 1, mounted = {}, queued = false;

  // work out where every item goes down the page (nothing is drawn yet)
  function layout() {
    var vw = document.documentElement.clientWidth;
    var margin = (vw - PAPER) / 2;
    slots = [];
    layer.innerHTML = "";
    mounted = {};
    if (margin < 70) return;                                   // no desk showing on narrow screens
    var height = document.body.offsetHeight + 62;
    layer.style.height = height + "px";
    scale = Math.min(1, (margin + 150) / 450);                 // real size on wide screens, smaller as the desk narrows
    for (var n = 0, y = 360; y < height - 120; y += 560, n++) {
      var it = ITEMS[n % ITEMS.length];
      var cx = n % 2 === 0 ? margin / 2 : vw - margin / 2;
      cx += ((n * 37) % 41 - 20) * (margin / 300);             // small repeatable jitter
      slots.push({ it: it, x: cx - it.w / 2, y: y + ((n * 53) % 110) - it.h / 2, angle: it.angle + ((n * 17) % 9 - 4) });
    }
    show();
  }

  // only the items near the window exist, so a very long list does not slow the page down
  function show() {
    queued = false;
    var top = window.scrollY - 900, bottom = window.scrollY + window.innerHeight + 900;
    slots.forEach(function (s, n) {
      var near = s.y + 700 > top && s.y < bottom;
      if (near && !mounted[n]) {
        var el = document.createElement("div");
        el.className = "desk-item";
        el.style.left = s.x + "px";
        el.style.top = s.y + "px";
        el.style.transform = "rotate(" + s.angle + "deg) scale(" + scale + ")";
        el.innerHTML = s.it.make(n);
        layer.appendChild(el);
        mounted[n] = el;
      } else if (!near && mounted[n]) {
        layer.removeChild(mounted[n]);
        delete mounted[n];
      }
    });
  }
  function onScroll() { if (!queued) { queued = true; requestAnimationFrame(show); } }

  document.addEventListener("DOMContentLoaded", function () {
    document.documentElement.insertBefore(layer, document.body);
    layout();
    var last = 0;
    if (window.ResizeObserver) new ResizeObserver(function () {
      var h = document.body.offsetHeight;
      if (Math.abs(h - last) > 40) { last = h; layout(); }      // the page grew or shrank
    }).observe(document.body);
    window.addEventListener("resize", layout);
    window.addEventListener("scroll", onScroll, { passive: true });
  });
})();
