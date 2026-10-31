// A number is only ever shown for a Money whose state is "calculated" (i.e. came from the backend).
// Anything else renders the supplied "unavailable" text: never 0, never an estimate.
export function isCalculated(money) {
  return money?.state === "calculated" && Number.isInteger(money.amountMinor) && typeof money.currency === "string";
}

export function formatMoney(money, unavailableText, locale = "en") {
  if (!isCalculated(money)) return unavailableText;
  const fmt = new Intl.NumberFormat(locale, { style: "currency", currency: money.currency });
  return fmt.format(money.amountMinor / 10 ** fmt.resolvedOptions().maximumFractionDigits);
}
