// Tiny decorative SVG icons. The markup is a static literal (never data), always aria-hidden: the visible
// text label next to each icon carries the meaning.
const PATHS = {
  table: '<ellipse cx="12" cy="12" rx="9" ry="5.5"/><path d="M6 15.5V20M18 15.5V20"/>',
  menu: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/>',
  event: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8 3v4M16 3v4"/>',
  guests: '<circle cx="9" cy="9" r="3"/><circle cx="17" cy="10" r="2.5"/><path d="M3.5 19c.5-3.5 3-5 5.5-5s5 1.500 5.500 5M15 15c3 0 5 1.500 5.500 4"/>',
  review: '<rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M8.500 8.500h7M8.500 12h7M8.500 15.500h4"/>',
};

export function icon(name) {
  const el = document.createElement("span");
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${PATHS[name] ?? ""}</svg>`;
  return el;
}
