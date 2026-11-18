document.addEventListener("DOMContentLoaded", async () => {
  try {
    const { status, rows } = await loadData();
    const date = runDate(status);
    document.getElementById("run-time").textContent = status.run_time.replace("T", " ").replace("Z", " UTC");
    document.getElementById("n-days").textContent = status.days_with_success;
    document.getElementById("n-open").textContent = status.open;
    document.getElementById("n-new").textContent = status.new_today;
    document.getElementById("n-removed").textContent = status.removed_today;

    document.getElementById("sources").innerHTML = [...status.sources].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).map(s =>
      `<tr>${sourceCell(s.name)}<td>${s.count}</td><td><span class="mark ${s.ok ? "yes" : "no"}" role="img" aria-label="${s.ok ? "Loaded" : "Failed"}" title="${s.ok ? "Loaded" : "Failed"}">${s.ok ? "✓" : "✗"}</span></td></tr>`).join("");

    const item = r => `<li><span class="${r.in_role ? "" : "sub"}">${r.in_role ? '<span class="pill">YOUR ROLE</span>' : ""}</span>` +
      `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.title)}</a>` +
      `<div class="sub">${esc(r.employer)}${r.location ? " · " + esc(r.location) : ""}</div></li>`;
    const fill = (id, list) => {
      list.sort((a, b) => (b.in_role - a.in_role) || a.employer.localeCompare(b.employer) || a.title.localeCompare(b.title));
      document.getElementById(id).innerHTML = list.length ? list.map(item).join("") : '<li class="empty">None in the latest run.</li>';
    };
    fill("new-list", rows.filter(r => r.first_seen === date && !r.first_run));
    fill("removed-list", rows.filter(r => r.removed_date === date));
  } catch (err) { showError(err); }
});
