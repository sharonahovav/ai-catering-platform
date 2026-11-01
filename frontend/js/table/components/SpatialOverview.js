import { h, fill } from "../../lib/dom.js";

const MAX_SLOTS = 7; // pre-composed positions in layout.css; categories beyond this appear only in the text list

// Decorative props for the table. Two depth layers move with the camera at different rates (parallax), so zooming
// feels like travelling through a space instead of scaling a flat picture. `d` < 1 is behind the food, `d` > 1 is in
// front of it. Position is where the prop sits on a 100% x 100% table; they are all aria-hidden and non-interactive.
const BACK = [
  { src: "blood_oranges", d: 0.28, size: "7rem", style: "inset-inline-end: 24%; inset-block-start: 5%; --r: -14deg" },
  { src: "fennel", d: 0.38, size: "8.5rem", style: "inset-inline-start: 40%; inset-block-end: 1%; --r: 16deg" },
  { src: "pea_pod", d: 0.3, size: "7.5rem", style: "inset-inline-start: 72%; inset-block-start: 56%; --r: -28deg" },
  { src: "pierced_orange", d: 0.45, size: "5.5rem", style: "inset-inline-start: 38%; inset-block-start: 60%; --r: 8deg" },
];
const FRONT = [
  { src: "purple_bean_pods", d: 1.5, size: "11rem", style: "inset-inline-start: -4%; inset-block-end: -6%; --r: 14deg" },
  { src: "pierced_orange", d: 1.7, size: "8rem", style: "inset-inline-end: -2%; inset-block-start: -4%; --r: 24deg" },
  { src: "pearl_tin", d: 1.4, size: "7rem", style: "inset-inline-start: 56%; inset-block-end: -5%; --r: -10deg" },
];
const prop = (p, layer) =>
  h("img", { class: `prop ${layer}`, src: `../assets/table/${p.src}.png`, alt: "", width: 512, height: 512, draggable: "false", decoding: "async", style: `--d: ${p.d}; inline-size: ${p.size}; ${p.style}` });

// Renders the composed scene. DOM order = reading order (intro, text list, then nodes); position is CSS only,
// so Tab order never depends on where things sit on the canvas.
export function mountOverview(root, { t, categories, compactQuery }) {
  const chips = categories.map((c) => h("a", { href: `#/plan/menu/${c.id}`, "data-chip-id": c.id }, c.name));
  const list = h(
    "nav",
    { class: "category-nav", "aria-label": t.overview.listLabel },
    h("ul", { class: "category-list" }, chips.map((a) => h("li", null, a))),
  );

  const nodes = categories.slice(0, MAX_SLOTS).map((c, i) =>
    h(
      "button",
      { class: `node slot-${i}`, type: "button", style: `--i: ${i}`, "data-route": `#/plan/menu/${c.id}`, "data-category-id": c.id, "aria-label": t.overview.nodeLabel(c.name) },
      h("span", { class: "blob", "aria-hidden": "true" }),
      h("img", { src: c.image, alt: "", width: 512, height: 512, decoding: "async", draggable: "false" }),
      h("span", { class: "node-label", "aria-hidden": "true" }, c.name),
    ),
  );

  // One keyboard/AT path per category. On wide screens that is the text strip (nodes are pointer-only and hidden
  // from AT, so nobody tabs through every category twice); on phones the strip is hidden and the nodes are the list.
  const syncNodes = () => {
    for (const n of nodes) {
      if (compactQuery.matches) { n.removeAttribute("aria-hidden"); n.removeAttribute("tabindex"); }
      else { n.setAttribute("aria-hidden", "true"); n.setAttribute("tabindex", "-1"); }
    }
  };
  syncNodes();
  compactQuery.addEventListener("change", syncNodes);

  // Hovering/focusing a chip lifts its node so keyboard users still see where they are on the canvas.
  const link = (chip, on) => root.querySelector(`.node[data-category-id="${CSS.escape(chip.dataset.chipId)}"]`)?.classList.toggle("is-linked", on);
  for (const chip of chips) {
    for (const [ev, on] of [["focus", true], ["blur", false], ["mouseenter", true], ["mouseleave", false]]) chip.addEventListener(ev, () => link(chip, on));
  }

  // Everything that is part of the picture lives in .world, which the scene camera moves. The text strip stays
  // outside it (screen-fixed) so the keyboard path never moves or scales.
  const intro = h("div", { class: "intro" }, h("p", { class: "eyebrow" }, t.overview.eyebrow), h("p", { class: "display", id: "overview-title" }, t.overview.title), h("p", { class: "lead" }, t.overview.body));
  const nodesEl = h("div", { class: "nodes" }, nodes);
  const world = h("div", { class: "world", id: "world" }, intro, nodesEl);
  const backdrop = h("div", { class: "backdrop", "aria-hidden": "true" }, BACK.map((p) => prop(p, "layer")));
  const frontdrop = h("div", { class: "frontdrop", "aria-hidden": "true" }, FRONT.map((p) => prop(p, "layer")));
  fill(root, backdrop, world, frontdrop, list);
  return { world, nodesEl, intro, strip: list };
}
