// Always-visible reminder that what the person sees is demo data. Hidden only if no service is a mock.
export function mountMockBanner(el, t, sources) {
  const isMock = sources.some((s) => s === "mock");
  el.hidden = !isMock;
  if (isMock) el.textContent = t.demoBanner;
}
