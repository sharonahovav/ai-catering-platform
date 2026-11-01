// Pure display helpers.
/** "2026-11-20" -> "Friday, 20 November 2026" (local calendar date; no timezone shifting). */
export function formatDate(iso, locale = "en") {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso ?? "")) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export function formatDateTime(isoTimestamp, locale = "en") {
  const d = new Date(isoTimestamp);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
}
