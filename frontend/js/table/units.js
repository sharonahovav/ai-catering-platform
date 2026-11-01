// Pure display helpers for quantities and units. The unit itself comes from the catalog (per_tray, per_item,
// per_weight); only the wording lives in strings.
export function qtyLabel(t, unit, n) {
  if (unit === "per_weight") return t.units.weight(n);
  const u = t.units[unit];
  return u ? `${n} ${n === 1 ? u.one : u.other}` : String(n);
}

export const perUnit = (t, unit) => t.units[unit]?.per ?? "";
