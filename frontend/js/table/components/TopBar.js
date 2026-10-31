import { h, fill } from "../../lib/dom.js";

export function mountTopBar(root, { t, onToggleSummary }) {
  const crumbs = h("ol");
  const count = h("span", { class: "num" });
  const toggle = h(
    "button",
    { class: "btn btn-ghost table-toggle", type: "button", "aria-controls": "summary", "aria-expanded": "false", onclick: () => onToggleSummary() },
    count,
  );
  // Review/quote arrives in Gate 2; the control is present but honestly disabled.
  const review = h("button", { class: "btn btn-primary review-btn", type: "button", "aria-disabled": "true", "aria-label": `${t.review.button} (coming soon)` }, t.review.button);

  fill(
    root,
    h("a", { class: "brand", href: "#/plan" }, t.brand),
    h("nav", { class: "crumbs", "aria-label": t.breadcrumb.label }, crumbs),
    h("div", { class: "actions" }, toggle, review),
  );

  return {
    toggle,
    update({ crumbs: items, count: n, summaryOpen }) {
      fill(
        crumbs,
        items.map((c, i) => {
          const last = i === items.length - 1;
          return h("li", null, last ? h("span", { "aria-current": "page" }, c.label) : h("a", { href: c.hash }, c.label));
        }),
      );
      count.textContent = t.tableToggle(n);
      toggle.setAttribute("aria-expanded", String(summaryOpen));
    },
  };
}
