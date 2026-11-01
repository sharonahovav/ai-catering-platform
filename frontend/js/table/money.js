// A number is only ever shown for a Money whose state is "calculated" (i.e. came from the backend).
// Anything else renders the supplied "unavailable" text: never 0, never an estimate made up in the page.
export function isCalculated(money) {
  return money?.state === "calculated" && Number.isInteger(money.amountMinor) && typeof money.currency === "string";
}

/** `compact` drops ".00" on whole amounts; `signed` adds + for increases (used for "price effect"). */
export function formatMoney(money, unavailableText, locale = "en-US", { compact = false, signed = false } = {}) {
  if (!isCalculated(money)) return unavailableText;
  const probe = new Intl.NumberFormat(locale, { style: "currency", currency: money.currency });
  const digits = probe.resolvedOptions().maximumFractionDigits;
  const amount = money.amountMinor / 10 ** digits;
  const fmt = new Intl.NumberFormat(locale, {
    style: "currency", currency: money.currency,
    minimumFractionDigits: compact && Number.isInteger(amount) ? 0 : digits, maximumFractionDigits: digits,
    signDisplay: signed ? "exceptZero" : "auto",
  });
  return fmt.format(amount);
}
