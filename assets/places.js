// Turns the messy location text boards give us into plain states and cities.
// "1125 NW 63RD STREET, SUITE A, NICHOLS HILLS OK"  ->  city Nichols Hills, state OK
// "San Francisco, CA, New York, NY"                  ->  two places
// Street addresses, suite numbers and countries are dropped.
const US_STATES = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut",
  DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana",
  NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
  NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
  RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah",
  VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};
const STATE_BY_NAME = Object.fromEntries(Object.entries(US_STATES).map(([ab, name]) => [name.toLowerCase(), ab]));
const NOT_PLACES = new Set(["united states", "united states of america", "usa", "us", "u.s.", "u.s.a.", "remote",
  "hybrid", "canada", "uk", "united kingdom", "india", "poland", "spain", "singapore", "ireland", "mexico", "germany",
  "france", "luxembourg", "slovenia", "netherlands", "portugal", "italy", "australia", "brazil", "argentina",
  "philippines", "japan", "china", "hong kong", "israel", "sweden", "switzerland", "romania", "bulgaria", "serbia"]);
const CITY_ALIAS = { "new york city": "New York", "nyc": "New York" };
// building and office names, not places
const JUNK_WORDS = /\b(park|center|centre|tower|campus|ctr|call|home|hq|headquarters|business|mgmt|field|corp|ecoworld|bld|metro)\b/i;
const STREET_WORDS = /\b(suites?|ste|street|avenue|ave|boulevard|blvd|road|parkway|pkwy|highway|hwy|floor|building|bldg|plaza|drive|way|lane|circle|court|locations?)\b/i;

function titleCase(s) {
  return s.toLowerCase().replace(/(^|[\s'\-.(])([a-z])/g, (m, a, b) => a + b.toUpperCase());
}

// Returns a list of {city, state}; state is a two-letter code or "", city may be "".
function parseLocations(raw) {
  const out = [], seen = new Set();
  const add = (city, state) => {
    city = (city || "").trim();
    if (!city && !state) return;
    const k = city.toLowerCase() + "|" + state;
    if (!seen.has(k)) { seen.add(k); out.push({ city, state }); }
  };
  const segments = String(raw || "").replace(/\([^)]*\)/g, " ").split(/;|\||\s+or\s+|\s+and\s+/i);
  for (let seg of segments) {
    seg = seg.replace(/\b(remote|hybrid|on-?site)\b(\s+within)?(\s*[-–:])?/gi, " ")
      .replace(/\bonly\b/gi, " ").replace(/\s+/g, " ").trim();
    let pending = null;
    for (let token of seg.split(",").map(t => t.trim()).filter(Boolean)) {
      // "Raleigh NC - Field Mgmt", "Betterment HQ - New York City": keep the part that is a place
      if (token.includes(" - ")) {
        const good = token.split(" - ").map(t => t.trim()).filter(t => t && !JUNK_WORDS.test(t) && !STREET_WORDS.test(t));
        token = good.length ? good[0] : "";
      }
      if (!/^\d/.test(token)) token = token.replace(/\s+\d.*$/, "").trim();   // drop trailing zip codes and suite numbers
      token = token.replace(/^([A-Z]{2})\s+\d+$/, "$1");                      // "WA 98201"
      const tail = token.toLowerCase().match(/\s+([a-z ]+)$/);
      if (tail && NOT_PLACES.has(tail[1].trim()) && tail[1].trim() !== "us") token = token.slice(0, token.length - tail[0].length).trim();   // "Bangalore India"
      if (!token) continue;
      const lower = token.toLowerCase().replace(/\.$/, "");
      if (NOT_PLACES.has(lower) || /^\d/.test(token) || STREET_WORDS.test(token) || JUNK_WORDS.test(token)) continue;
      const abbr = token.toUpperCase();
      if (US_STATES[abbr] && token.length === 2) { add(pending, abbr); pending = null; continue; }
      if (STATE_BY_NAME[lower]) { add(pending, STATE_BY_NAME[lower]); pending = null; continue; }
      if (/^[A-Z]{2}$/.test(token)) continue;                   // other regions such as ON or BC
      const m = token.match(/^(.+?)\s+([A-Z]{2})$/);            // "NICHOLS HILLS OK" with no comma
      if (m && US_STATES[m[2]]) {
        if (pending) add(pending, "");
        add(cleanCity(m[1]), m[2]); pending = null; continue;
      }
      if (pending) add(pending, "");
      pending = cleanCity(token);
    }
    if (pending) add(pending, "");
  }
  return out;
}

function cleanCity(s) {
  s = s.replace(/\s+(office|area|metro)$/i, "").trim();
  if (s === s.toUpperCase()) s = titleCase(s);
  return CITY_ALIAS[s.toLowerCase()] || s;
}
