/**
 * Cities for the city field (product page delivery box and checkout). The 30
 * largest Pakistani cities (2017 census order) are suggestions only: we deliver
 * to every city and town, and any text the shopper types is a valid city.
 * Spellings must match the city names in the WooCommerce shipping zones.
 */
export const CITIES = [
  "Karachi",
  "Lahore",
  "Faisalabad",
  "Rawalpindi",
  "Gujranwala",
  "Peshawar",
  "Multan",
  "Hyderabad",
  "Islamabad",
  "Quetta",
  "Bahawalpur",
  "Sargodha",
  "Sialkot",
  "Sukkur",
  "Larkana",
  "Sheikhupura",
  "Rahim Yar Khan",
  "Jhang",
  "Dera Ghazi Khan",
  "Gujrat",
  "Sahiwal",
  "Wah Cantonment",
  "Mardan",
  "Kasur",
  "Okara",
  "Mingora",
  "Nawabshah",
  "Chiniot",
  "Kotri",
  "Kamoke",
] as const;

/** Other names people type for a city (lower-case, letters only) → our spelling. */
const ALIASES: Readonly<Record<string, string>> = {
  isb: "Islamabad",
  isl: "Islamabad",
  pindi: "Rawalpindi",
  rwp: "Rawalpindi",
  lyallpur: "Faisalabad",
  fsd: "Faisalabad",
  khi: "Karachi",
  lhr: "Lahore",
  dgkhan: "Dera Ghazi Khan",
  dikhan: "Dera Ismail Khan",
  deraismailkhan: "Dera Ismail Khan",
  pesh: "Peshawar",
  hyd: "Hyderabad",
  ryk: "Rahim Yar Khan",
  wah: "Wah Cantonment",
  wahcantt: "Wah Cantonment",
  swat: "Mingora",
};

/** Ignore case, spaces and punctuation ("D.G. Khan" → "dgkhan"). */
export const cityKey = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

/**
 * Our spelling of a known city or alias ("lahore " → "Lahore", "Pindi" →
 * "Rawalpindi"), else the trimmed input as typed. `extra` adds cities that
 * have their own delivery rate in WooCommerce.
 */
export function canonicalCity(
  input: string,
  extra: readonly string[] = [],
): string {
  const t = input.trim().replace(/\s+/g, " ");
  const k = cityKey(t);
  if (!k) return t;
  const known = [...extra, ...CITIES].find((c) => cityKey(c) === k);
  return known ?? ALIASES[k] ?? t;
}

/** Edit distance, capped (only small typos matter). */
function distance(a: string, b: string, cap: number): number {
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(
        prev[j]! + 1,
        cur[j - 1]! + 1,
        prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      cur.push(v);
      best = Math.min(best, v);
    }
    if (best > cap) return cap + 1;
    prev = cur;
  }
  return prev[b.length]!;
}

/**
 * Suggestions for what the shopper typed, best first: whole-name prefix, then
 * any word's prefix ("khan" → Rahim Yar Khan), then aliases, then names one or
 * two typos away ("karchi", "faislabad") when nothing else matched. Empty
 * query → every city.
 */
export function searchCities(
  query: string,
  extra: readonly string[] = [],
): string[] {
  const all = [...new Set([...extra, ...CITIES])];
  const q = cityKey(query);
  if (!q) return all;
  const words = (c: string) => c.split(/[\s-]+/).map(cityKey);
  const out: string[] = [];
  const add = (c: string) => {
    if (!out.includes(c)) out.push(c);
  };
  for (const c of all) if (cityKey(c).startsWith(q)) add(c);
  for (const c of all) if (words(c).some((w) => w.startsWith(q))) add(c);
  for (const [alias, city] of Object.entries(ALIASES))
    if (alias.startsWith(q) && q.length >= 2) add(city);
  // Typos only when nothing matched as typed (else "khan" also finds "Jhang").
  if (q.length >= 4 && out.length === 0) {
    const cap = q.length >= 7 ? 2 : 1;
    for (const c of all) {
      const k = cityKey(c);
      if (distance(q, k, cap) <= cap) add(c);
      else if (k.length > q.length && distance(q, k.slice(0, q.length), 1) <= 1)
        add(c);
    }
  }
  return out;
}
