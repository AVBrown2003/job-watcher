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

  const fillSelect = (id, label, values) => {
    const el = document.getElementById(id);
    el.innerHTML = `<option value="">${label}</option>` +
      [...new Set(values.filter(Boolean))].sort().map(v => `<option>${esc(v)}</option>`).join("");
  };
  const open = rows.filter(r => r.status === "open");
  fillSelect("f-employer", "All employers", open.map(r => r.employer));
  fillSelect("f-location", "All locations", open.map(r => r.location));

  const el = id => document.getElementById(id);
  function render() {
    const emp = el("f-employer").value, loc = el("f-location").value, days = el("f-days").value;
    const q = el("q").value.trim().toLowerCase();
    let pool = state.scope === "star" ? rows.filter(r => stars.has(r.posting_id)) : open;
    if (state.scope === "role") pool = pool.filter(r => r.in_role);
    let list = pool.filter(r => {
      if (emp && r.employer !== emp) return false;
      if (loc && r.location !== loc) return false;
      if (q && !r.title.toLowerCase().includes(q)) return false;
      if (days) {
        const d = daysOpen(r);
        if (days === "31+" ? d <= 30 : d > +days) return false;
      }
      return true;
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
  ["f-employer", "f-location", "f-days", "q", "sort"].forEach(id => el(id).addEventListener("input", render));
  render();
});
