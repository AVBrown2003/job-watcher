// Every number here comes from the history file, computed in the browser.

function median(nums) {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function countBy(list, keyFn) {
  const m = new Map();
  list.forEach(r => { const k = keyFn(r); m.set(k, (m.get(k) || 0) + 1); });
  return m;
}

// Pure function: history rows + last run date -> all the numbers on the page.
function computeMarket(rows, lastDate) {
  const known = rows.filter(r => !r.first_run);           // start date is known
  const dates = rows.flatMap(r => [r.first_seen, r.last_seen, r.removed_date]).filter(Boolean);
  const firstDate = dates.length ? dates.reduce((a, b) => (a < b ? a : b)) : lastDate;
  const days = [];
  for (let d = dayNum(firstDate); d <= dayNum(lastDate); d++) days.push(utcDay(d * 86400000));

  const newAll = countBy(known, r => r.first_seen), newRole = countBy(known.filter(r => r.in_role), r => r.first_seen);
  const removed = countBy(rows.filter(r => r.removed_date), r => r.removed_date);

  const open = rows.filter(r => r.status === "open");
  const perEmployer = [...countBy(open, r => r.employer)].map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  const perLocation = [...countBy(open.filter(r => r.location), r => r.location)].map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));

  const gone = known.filter(r => r.removed_date);
  const daysOpen = gone.map(r => daysBetween(r.first_seen, r.removed_date));

  const eligible = known.filter(r => daysBetween(r.first_seen, lastDate) >= 7);
  const quick = eligible.filter(r => r.removed_date && daysBetween(r.first_seen, r.removed_date) <= 7);

  return {
    days,
    newAll: days.map(d => newAll.get(d) || 0),
    newRole: days.map(d => newRole.get(d) || 0),
    removedPerDay: days.map(d => removed.get(d) || 0),
    perEmployer, perLocation,
    daysOpen, medianDaysOpen: median(daysOpen),
    eligible: eligible.length, quick: quick.length,
    shareQuick: eligible.length ? quick.length / eligible.length : null,
    totalNew: known.length, totalRemoved: rows.filter(r => r.removed_date).length,
    openNow: open.length,
  };
}

const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
const pct = x => (100 * x).toFixed(0) + "%";
const waiting = "Not enough history yet. This fills in as the tool keeps watching.";

function renderMarket(m, lastDate) {
  const $ = id => document.getElementById(id);
  const set = (n, h, p) => { $("h" + n).textContent = h; $("p" + n).textContent = p; };
  const nDays = m.days.length;

  $("intro").textContent = `The tool has watched ${plural(nDays, "day")} (through ${lastDate}) and tracks ${plural(m.openNow, "open posting")}.`;

  // 1. new per day
  const sumNew = m.newAll.reduce((a, b) => a + b, 0), sumRole = m.newRole.reduce((a, b) => a + b, 0);
  set(1, sumNew ? `${plural(sumNew, "new posting")} appeared since watching began` : "No new postings yet",
    sumNew ? `${plural(sumRole, "posting")} of those ${sumNew} fit your role (financial advisor). The busiest day brought ${Math.max(...m.newAll)} new postings. Postings that were already open on each board's first day are not counted.`
      : waiting + " On the first day every posting was already open, so nothing counts as new.");
  vbars($("c1"), m.days, [{ name: "All postings", color: C.all, values: m.newAll }, { name: "Your role", color: C.role, values: m.newRole }]);

  // 2. removed per day
  const sumRem = m.removedPerDay.reduce((a, b) => a + b, 0);
  set(2, sumRem ? `${plural(sumRem, "posting")} came down since watching began` : "No postings have come down yet",
    sumRem ? `A posting counts as removed on the day its employer's board stops listing it. The busiest day removed ${Math.max(...m.removedPerDay)}.`
      : waiting);
  vbars($("c2"), m.days, [{ name: "Removed", color: C.teal, values: m.removedPerDay }]);

  // 3. open per employer
  const top = m.perEmployer[0];
  set(3, top ? `${top.label} has the most open postings (${top.value})` : "No open postings",
    `As of the last run there are ${plural(m.openNow, "open posting")} across ${plural(m.perEmployer.length, "employer")}.`);
  hbars($("c3"), m.perEmployer, C.all);

  // 4. days open
  const med = m.medianDaysOpen;
  set(4, med === null ? "Too early to say how long postings stay open" : `The median posting stays open ${plural(med, "day")}`,
    med === null ? waiting + " Only postings that appeared after watching began and have since been removed can be measured."
      : `Measured on ${plural(m.daysOpen.length, "removed posting")} that were first seen after watching began: removed date minus first-seen date.`);
  const maxD = Math.max(0, ...m.daysOpen), buckets = Math.min(maxD, 30) + 1;
  const hist = Array(buckets).fill(0);
  m.daysOpen.forEach(d => hist[Math.min(d, buckets - 1)]++);
  vbars($("c4"), hist.map((_, i) => String(i)), [{ name: "Postings", color: C.all, values: hist }], l => l);
  $("c4").insertAdjacentHTML("beforeend", '<p class="note">Horizontal axis: days open (last bar groups longer stays).</p>');

  // 5. share removed within 7 days
  if (m.shareQuick === null) {
    set(5, "Too early to measure the seven-day share", waiting + " It needs postings first seen at least seven days before the last run.");
    $("c5").innerHTML = "";
  } else {
    set(5, `${pct(m.shareQuick)} of postings are removed within seven days`,
      `Among ${plural(m.eligible, "posting")} first seen at least seven days before the last run (and not open on a board's first day), ${m.quick} had a removed date seven days or less after their first-seen date.`);
    hbars($("c5"), [{ label: "Removed within 7 days", value: m.quick }, { label: "Still open or longer", value: m.eligible - m.quick }], C.teal);
  }

  // 6. locations
  const loc = m.perLocation[0];
  set(6, loc ? `${loc.label} has the most open postings (${loc.value})` : "No locations yet",
    `Top ${Math.min(10, m.perLocation.length)} locations among open postings as of the last run.`);
  hbars($("c6"), m.perLocation.slice(0, 10), C.teal);
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const { status, rows } = await loadData();
    const lastDate = runDate(status);
    renderMarket(computeMarket(rows, lastDate), lastDate);
  } catch (err) { showError(err); }
});
