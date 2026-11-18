// Tiny SVG chart helpers (no libraries, so the site works offline).
const SVGNS = "http://www.w3.org/2000/svg";
const C = { all: "#16384f", role: "#b8860b", teal: "#1f7a6d", grid: "rgba(127,127,127,.25)" };

function niceMax(v) {
  if (v <= 40) return Math.ceil(v / 4) * 4;   // whole-number gridlines
  return Math.ceil(v / 20) * 20;
}

// Vertical grouped bars. series = [{name, color, values}], labels = x labels.
function vbars(target, labels, series, short = l => l.slice(5)) {
  const W = 760, H = 280, L = 40, R = 10, T = 12, B = 44;
  const max = niceMax(Math.max(1, ...series.flatMap(s => s.values)));
  const n = labels.length || 1, slot = (W - L - R) / n;
  const bw = Math.max(2, Math.min(28, (slot * 0.8) / series.length));
  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img">`;
  for (let i = 0; i <= 4; i++) {
    const y = T + (H - T - B) * (1 - i / 4);
    svg += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="${C.grid}"/>` +
      `<text x="${L - 6}" y="${y + 4}" text-anchor="end">${Math.round(max * i / 4)}</text>`;
  }
  const step = Math.ceil(n / 12);
  labels.forEach((lab, i) => {
    const gx = L + slot * i + (slot - bw * series.length) / 2;
    series.forEach((s, k) => {
      const v = s.values[i], h = (H - T - B) * v / max;
      svg += `<rect x="${gx + k * bw}" y="${H - B - h}" width="${bw - 1}" height="${h}" fill="${s.color}"><title>${lab}: ${v} ${s.name}</title></rect>`;
    });
    if (i % step === 0) svg += `<text x="${L + slot * i + slot / 2}" y="${H - B + 14}" text-anchor="middle">${short(lab)}</text>`;
  });
  svg += "</svg>";
  target.innerHTML = svg + (series.length > 1
    ? `<div class="legend">${series.map(s => `<span><i style="background:${s.color}"></i>${s.name}</span>`).join("")}</div>` : "");
}

// Horizontal bars. items = [{label, value}].
function hbars(target, items, color) {
  const rowH = 26, L = 190, W = 760, R = 50, H = Math.max(40, items.length * rowH + 10);
  const max = Math.max(1, ...items.map(i => i.value));
  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img">`;
  items.forEach((it, i) => {
    const y = 5 + i * rowH, w = (W - L - R) * it.value / max;
    const lab = it.label.length > 30 ? it.label.slice(0, 29) + "…" : it.label;
    svg += `<text x="${L - 8}" y="${y + 15}" text-anchor="end">${esc(lab)}</text>` +
      `<rect x="${L}" y="${y + 2}" width="${w}" height="${rowH - 8}" fill="${color || C.all}"><title>${esc(it.label)}: ${it.value}</title></rect>` +
      `<text x="${L + w + 6}" y="${y + 15}">${it.value}</text>`;
  });
  target.innerHTML = svg + "</svg>";
}
