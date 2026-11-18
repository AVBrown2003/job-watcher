const STAR_KEY = "job-watcher-shortlist";

function loadStars() {
  try { return new Set(JSON.parse(localStorage.getItem(STAR_KEY) || "[]")); } catch (e) { return new Set(); }
}
function saveStars(set) {
  try { localStorage.setItem(STAR_KEY, JSON.stringify([...set])); } catch (e) { /* storage blocked */ }
}

document.addEventListener("DOMContentLoaded", async () => {
  let data;
  try { data = await loadData(); } catch (err) { showError(err); return; }
  const { status, rows } = data;
  const today = runDate(status);
  const stars = loadStars();
  const state = { scope: "role" };
  const daysOpen = r => daysBetween(r.posted_date || r.first_seen, today);
  const el = id => document.getElementById(id);
  const open = rows.filter(r => r.status === "open");

  // Plain states and cities for every posting (street addresses and countries are dropped).
  rows.forEach(r => { r.locs = parseLocations(r.location); });
  const cityStates = new Map();                       // city -> the one state it is in, if known
  rows.forEach(r => r.locs.forEach(l => {
    if (l.city && l.state) {
      const k = l.city.toLowerCase();
      cityStates.set(k, cityStates.has(k) && cityStates.get(k) !== l.state ? "" : l.state);
    }
  }));
  rows.forEach(r => r.locs.forEach(l => {
    if (l.city && !l.state) l.state = cityStates.get(l.city.toLowerCase()) || "";
    l.stateName = l.state ? US_STATES[l.state] : "";
    l.label = l.city ? (l.state ? `${l.city}, ${l.state}` : l.city) : "";
  }));
  const uniqueSorted = list => [...new Set(list.filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const stateNames = uniqueSorted(open.flatMap(r => r.locs.map(l => l.stateName)));
  const cityLabels = uniqueSorted(open.flatMap(r => r.locs.map(l => l.label)));
  const employers = uniqueSorted(open.map(r => r.employer));
  const DAY_CHOICES = ["7 or fewer", "30 or fewer", "More than 30"];

  // A text box with a drop-down of suggestions; optional tabs inside the drop-down.
  function makeCombo(root, cfg) {
    const input = root.querySelector("input"), drop = root.querySelector(".drop");
    let tab = cfg.tabs ? cfg.tabs[0].id : "", active = -1, shown = [];
    const txt = () => input.value.trim().toLowerCase();
    const isExact = () => cfg.items(tab).some(i => i.toLowerCase() === txt());
    function paint() {
      const t = txt(), all = cfg.items(tab);
      shown = (t && !isExact() ? all.filter(i => i.toLowerCase().includes(t)) : all).slice(0, 200);
      active = Math.min(active, shown.length - 1);
      drop.innerHTML =
        (cfg.tabs ? `<div class="tabs">${cfg.tabs.map(x =>
          `<button type="button" data-tab="${x.id}" aria-pressed="${x.id === tab}">${x.label}</button>`).join("")}</div>` : "") +
        `<div class="opts"><div class="opt clear" data-i="-1">${cfg.all}</div>` +
        (shown.length ? shown.map((v, i) => `<div class="opt${i === active ? " on" : ""}" data-i="${i}">${esc(v)}</div>`).join("")
          : `<div class="none">${cfg.none || "No match"}</div>`) + "</div>";
    }
    const show = () => { paint(); drop.hidden = false; };
    const hide = () => { drop.hidden = true; active = -1; };
    const pick = i => { input.value = i < 0 ? "" : shown[i]; hide(); cfg.onChange(); };
    input.addEventListener("focus", show);
    input.addEventListener("click", show);
    input.addEventListener("input", () => { active = -1; show(); cfg.onChange(); });
    input.addEventListener("keydown", e => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault(); if (drop.hidden) show();
        active = Math.max(0, Math.min(shown.length - 1, active + (e.key === "ArrowDown" ? 1 : -1))); paint();
        const on = drop.querySelector(".opt.on"); if (on) on.scrollIntoView({ block: "nearest" });
      } else if (e.key === "Enter") { e.preventDefault(); if (active >= 0) pick(active); else hide(); }
      else if (e.key === "Escape") hide();
    });
    drop.addEventListener("mousedown", e => {
      e.preventDefault();                                   // keep the cursor in the text box
      const t = e.target.closest("[data-tab]"), o = e.target.closest(".opt");
      if (t) { tab = t.dataset.tab; active = -1; paint(); cfg.onChange(); }
      else if (o) pick(+o.dataset.i);
    });
    document.addEventListener("mousedown", e => { if (!root.contains(e.target)) hide(); });
    return { text: txt, tab: () => tab, exact: isExact };
  }

  const employerBox = makeCombo(el("c-employer"), { all: "All employers", items: () => employers, onChange: () => render() });
  const locationBox = makeCombo(el("c-location"), {
    all: "All locations", none: "No state or city matches",
    tabs: [{ id: "state", label: "States" }, { id: "city", label: "Cities" }],
    items: tab => tab === "state" ? stateNames : cityLabels, onChange: () => render() });
  const daysBox = makeCombo(el("c-days"), { all: "Any number of days", items: () => DAY_CHOICES, onChange: () => render() });

  function matchLocation(r) {
    const t = locationBox.text();
    if (!t) return true;
    const exact = locationBox.exact();
    if (locationBox.tab() === "state")
      return r.locs.some(l => l.state && (exact ? l.stateName.toLowerCase() === t || l.state.toLowerCase() === t
        : l.stateName.toLowerCase().includes(t) || l.state.toLowerCase() === t));
    return r.locs.some(l => l.city && (exact ? l.label.toLowerCase() === t || l.city.toLowerCase() === t
      : l.label.toLowerCase().includes(t)));
  }
  // "30" or "30 or fewer" = at most 30 days open; "more than 30" or "over 30" = beyond 30; anything else = no filter
  function matchDays(d) {
    const t = daysBox.text();
    let m;
    if ((m = t.match(/^(\d+)(\s*(days?|or fewer|or less))?$/))) return d <= +m[1];
    if ((m = t.match(/^(more than|over|>)\s*(\d+)/))) return d > +m[2];
    return true;
  }

  function render() {
    const emp = employerBox.text();
    const q = el("q").value.trim().toLowerCase();
    let pool = state.scope === "star" ? rows.filter(r => stars.has(r.posting_id)) : open;
    if (state.scope === "role") pool = pool.filter(r => r.in_role);
    let list = pool.filter(r => {
      if (emp && (employerBox.exact() ? r.employer.toLowerCase() !== emp : !r.employer.toLowerCase().includes(emp))) return false;
      if (!matchLocation(r)) return false;
      if (q && !r.title.toLowerCase().includes(q)) return false;
      return matchDays(daysOpen(r));
    });
    const dir = el("sort").value === "new" ? -1 : 1;
    list.sort((a, b) => dir * a.first_seen.localeCompare(b.first_seen) || a.title.localeCompare(b.title));

    el("count").textContent = `${list.length} posting${list.length === 1 ? "" : "s"}` +
      (state.scope === "role" ? " in your role" : "");
    el("results").innerHTML = list.length ? list.map(r => {
      const starred = stars.has(r.posting_id);
      return `<li class="row">
        <button class="star" type="button" data-id="${esc(r.posting_id)}" aria-pressed="${starred}"
          aria-label="${starred ? "Remove from" : "Add to"} shortlist" title="Shortlist">${starred ? "★" : "☆"}</button>
        <div class="grow">
          ${r.in_role ? '<span class="pill">YOUR ROLE</span>' : ""}<strong>${esc(r.title)}</strong>
          ${r.status === "removed" ? '<span class="fail"> (no longer listed)</span>' : ""}
          <div class="sub">${esc(r.employer)}${r.location ? " · " + esc(r.location) : ""}${r.department ? " · " + esc(r.department) : ""}
            · first seen ${esc(r.first_seen)}${r.first_run ? " (already open when watching began)" : ""} · ${daysOpen(r)} days open</div>
        </div>
        <a class="apply" href="${esc(r.url)}" target="_blank" rel="noopener">Apply</a>
      </li>`;
    }).join("") : `<li class="empty">${state.scope === "star" ? "Nothing starred yet. Star a posting to save it here." :
      "No postings match. Try switching to All postings or clearing a filter."}</li>`;
  }

  el("results").addEventListener("click", e => {
    const btn = e.target.closest(".star");
    if (!btn) return;
    const id = btn.dataset.id;
    stars.has(id) ? stars.delete(id) : stars.add(id);
    saveStars(stars);
    render();
  });
  el("scope").addEventListener("click", e => {
    const b = e.target.closest("button");
    if (!b) return;
    state.scope = b.dataset.v;
    el("scope").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b));
    render();
  });
  ["q", "sort"].forEach(id => el(id).addEventListener("input", render));
  render();
});
