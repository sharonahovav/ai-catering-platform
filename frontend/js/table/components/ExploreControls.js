import { h, fill } from "../../lib/dom.js";

// Opt-in free exploration. The toggle is a real button (aria-pressed); when on, labelled zoom/reset buttons appear.
// Keyboard parity: with focus anywhere in this group, arrows pan, + / - zoom, 0 resets (handled by the caller).
export function mountExploreControls(root, { t, onToggle, onZoomIn, onZoomOut, onReset }) {
  const toggle = h("button", { class: "btn btn-ghost explore-toggle", type: "button", "aria-pressed": "false", onclick: () => onToggle() }, t.explore.toggle);
  const tools = h(
    "div",
    { class: "explore-tools", role: "group", "aria-label": t.explore.groupLabel, hidden: true },
    h("button", { class: "icon-btn", type: "button", "aria-label": t.explore.zoomIn, onclick: () => onZoomIn() }, h("span", { "aria-hidden": "true" }, "+")),
    h("button", { class: "icon-btn", type: "button", "aria-label": t.explore.zoomOut, onclick: () => onZoomOut() }, h("span", { "aria-hidden": "true" }, "−")),
    h("button", { class: "btn btn-ghost", type: "button", onclick: () => onReset() }, t.explore.reset),
  );
  const hint = h("p", { class: "explore-hint", id: "explore-hint", hidden: true }, t.explore.hint);
  toggle.setAttribute("aria-describedby", "explore-hint");
  fill(root, h("div", { class: "explore-row" }, tools, toggle), hint);

  return {
    toggle,
    update({ on, available }) {
      root.hidden = !available;
      toggle.setAttribute("aria-pressed", String(on));
      tools.hidden = !on;
      hint.hidden = !on;
    },
  };
}
