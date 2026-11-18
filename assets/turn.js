// Tells the page-turn animation which way to turn: forward (Today > Browse > Market) or back.
(function () {
  var ORDER = ["index.html", "browse.html", "market.html"];
  function rank(url) {
    var name = new URL(url, location.href).pathname.split("/").pop() || "index.html";
    return ORDER.indexOf(name);
  }
  function mark(vt, fromUrl, toUrl) {
    if (!vt || !vt.types) return;
    var a = rank(fromUrl), b = rank(toUrl);
    if (a < 0 || b < 0 || a === b) return;
    vt.types.add(b < a ? "back" : "forward");
  }
  function middle() {
    document.documentElement.style.setProperty("--vy", Math.round(window.scrollY + window.innerHeight * 0.45) + "px");
  }
  window.addEventListener("pageswap", function (e) {
    middle();
    if (e.viewTransition && e.activation && e.activation.entry) mark(e.viewTransition, location.href, e.activation.entry.url);
  });
  window.addEventListener("pagereveal", function (e) {
    middle();
    if (e.viewTransition && navigation.activation && navigation.activation.from) mark(e.viewTransition, navigation.activation.from.url, location.href);
  });
})();
