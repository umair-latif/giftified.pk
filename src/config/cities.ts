/**
 * The 30 largest Pakistani cities (2017 census order), shown first in the
 * checkout city picker. Customers elsewhere type their own city ("Other").
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

const key = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

/** Known city with our spelling ("lahore " → "Lahore"), else the trimmed input. */
export function canonicalCity(input: string): string {
  const t = input.trim().replace(/\s+/g, " ");
  return CITIES.find((c) => key(c) === key(t)) ?? t;
}

/** Cities whose name starts with (then contains) the query. Empty query → all. */
export function searchCities(query: string): string[] {
  const q = key(query);
  if (!q) return [...CITIES];
  const starts = CITIES.filter((c) => key(c).startsWith(q));
  const contains = CITIES.filter(
    (c) => !key(c).startsWith(q) && key(c).includes(q),
  );
  return [...starts, ...contains];
}
