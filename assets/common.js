// Shared by all three pages: navigation bar, data loading, small helpers.
const PAGES = [["index.html", "Today"], ["browse.html", "Browse"], ["market.html", "Market"]];

function renderNav() {
  const here = location.pathname.split("/").pop() || "index.html";
  const nav = document.createElement("nav");
  nav.className = "nav";
  nav.innerHTML = '<div class="nav-inner"><a class="brand" href="index.html">Job Watcher</a>' +
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
