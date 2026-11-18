// Shared by all three pages: navigation bar, data loading, small helpers.
const PAGES = [["index.html", "Today"], ["browse.html", "Browse"], ["market.html", "Market"]];

function renderNav() {
  const here = location.pathname.split("/").pop() || "index.html";
  const nav = document.createElement("nav");
  nav.className = "nav";
  nav.innerHTML = '<div class="nav-inner"><a class="brand" href="index.html">Job Watcher<span class="by">by Alex Brown</span></a>' +
    PAGES.map(([href, label]) =>
      `<a class="link${href === here ? " current" : ""}" href="${href}">${label}</a>`).join("") +
    "</div>";
  document.body.prepend(nav);
}

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false; }
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  const head = rows.shift() || [];
  return rows.map(r => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])));
}

let servedFromCache = false;
async function getText(path) {
  const res = await fetch(path, { cache: "no-cache" });
  if (!res.ok) throw new Error(path + ": " + res.status);
  if (res.headers.get("x-from-cache")) servedFromCache = true;
  return res.text();
}

// Loads both data files. history rows get real booleans.
async function loadData() {
  const [statusText, csvText] = await Promise.all([getText("data/status.json"), getText("data/history.csv")]);
  const rows = parseCsv(csvText).map(r => ({ ...r, in_role: r.in_role === "true", first_run: r.first_run === "true" }));
  const status = JSON.parse(statusText);
  if (servedFromCache) {
    const b = document.createElement("div");
    b.className = "banner";
    b.textContent = "You are offline. Showing the last data this device loaded.";
    document.querySelector("main").prepend(b);
  }
  return { status, rows };
}

const utcDay = ms => new Date(ms).toISOString().slice(0, 10);
const dayNum = s => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 86400000;
const daysBetween = (a, b) => dayNum(b) - dayNum(a);
const runDate = status => status.run_time.slice(0, 10);
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function showError(err) {
  const main = document.querySelector("main");
  main.insertAdjacentHTML("beforeend",
    `<div class="banner">Could not load the data (${esc(err.message)}). Try again when you are online.</div>`);
}

document.addEventListener("DOMContentLoaded", () => {
  renderNav();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
});

// Display names, logo domains and (approximate) brand colors for each source.
const BRANDS = {
  betterment:   { label: "Betterment",    domain: "betterment.com",   color: "#0A5BD3" },
  altruist:     { label: "Altruist",      domain: "altruist.com",     color: "#171A2B" },
  sofi:         { label: "SoFi",          domain: "sofi.com",         color: "#00A0DC" },
  robinhood:    { label: "Robinhood",     domain: "robinhood.com",    color: "#00C805" },
  vestwell:     { label: "Vestwell",      domain: "vestwell.com",     color: "#1F3A5F" },
  chime:        { label: "Chime",         domain: "chime.com",        color: "#1EC677" },
  affirm:       { label: "Affirm",        domain: "affirm.com",       color: "#4A4AF4" },
  brex:         { label: "Brex",          domain: "brex.com",         color: "#F15A29" },
  coinbase:     { label: "Coinbase",      domain: "coinbase.com",     color: "#0052FF" },
  upstart:      { label: "Upstart",       domain: "upstart.com",      color: "#00A9E0" },
  mercury:      { label: "Mercury",       domain: "mercury.com",      color: "#5266EB" },
  savvy:        { label: "Savvy Wealth",  domain: "savvywealth.com",  color: "#1D4ED8" },
  plaid:        { label: "Plaid",         domain: "plaid.com",        color: "#111111" },
  nerdwallet:   { label: "NerdWallet",    domain: "nerdwallet.com",   color: "#00A36C" },
  acorns:       { label: "Acorns",        domain: "acorns.com",       color: "#6BBE45" },
  wealthfront:  { label: "Wealthfront",   domain: "wealthfront.com",  color: "#4840BB" },
  raymondjames: { label: "Raymond James", domain: "raymondjames.com", color: "#005B94" },
  merrill:      { label: "Merrill Lynch", domain: "ml.com",           color: "#012169" },
};

// Name as shown to people: "raymondjames" -> "Raymond James".
function sourceLabel(name) {
  const b = BRANDS[name];
  return b ? b.label : name.charAt(0).toUpperCase() + name.slice(1);
}

// Black or white text, whichever reads better on a background color.
function textOn(hex) {
  const n = parseInt(hex.slice(1), 16);
  const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 ? "#111" : "#fff";
}

// The source cell: logo on a white chip, name, on the company's color.
function sourceCell(name) {
  const b = BRANDS[name] || { label: sourceLabel(name), domain: "", color: "#333333" };
  const logo = b.domain
    ? `<img class="logo" alt="" loading="lazy" src="https://www.google.com/s2/favicons?domain=${b.domain}&sz=64" onerror="this.style.visibility='hidden'">`
    : '<span class="logo"></span>';
  return `<td class="src" style="background:${b.color};color:${textOn(b.color)}">${logo}<span>${esc(b.label)}</span></td>`;
}
