import { h, fill } from "../../lib/dom.js";
import { formatMoney } from "../money.js";

// The itemized summary is a real list and is always the source of truth for "what is on the table".
// It shows what the service last returned (order + version), never a client-side guess.
export function mountSummary(root, { t, onRemove, onClose }) {
  const title = h("h2", { id: "summary-title", tabindex: "-1" }, t.summary.title);
  const list = h("ul", { class: "order-list", "aria-label": t.summary.itemsLabel });
  const empty = h("p", { class: "empty" }, t.summary.empty);
  const version = h("p", { class: "summary-note num" });
  const price = h("strong", null);

  fill(
    root,
    h("button", { class: "icon-btn sheet-close", type: "button", "aria-label": t.summary.close, onclick: () => onClose() }, h("span", { "aria-hidden": "true" }, "×")),
    h("div", null, h("p", { class: "eyebrow" }, t.summary.eyebrow), title),
    h("div", null, h("span", { class: "tag tag-warn" }, t.summary.status), version),
    list,
    empty,
    h("div", { class: "price-row" }, h("span", null, t.summary.price), price),
    h("button", { class: "btn btn-primary", type: "button", "aria-disabled": "true", "aria-label": `${t.review.button} (coming soon)` }, t.review.button),
    h("p", { class: "summary-note" }, t.review.pendingHint),
  );

  return {
    title,
    update({ order, dishesById, justAdded }) {
      fill(
        list,
        order.items.map((item) => {
          const dish = dishesById.get(item.dishId);
          const name = dish?.name ?? item.dishId;
          return h(
            "li",
            { class: `order-item${item.dishId === justAdded ? " just-added" : ""}`, "data-dish-id": item.dishId, tabindex: "-1" },
            dish ? h("img", { src: dish.image, alt: "", width: 52, height: 52 }) : h("span"),
            h("div", null, h("strong", null, name), h("span", { class: "num" }, t.summary.line(item.quantity))),
            h("button", { class: "remove", type: "button", "aria-label": t.summary.remove(name), onclick: () => onRemove(item.dishId) }, h("span", { "aria-hidden": "true" }, "×")),
          );
        }),
      );
      list.hidden = order.items.length === 0;
      empty.hidden = order.items.length > 0;
      version.textContent = t.summary.version(order.version);
      price.textContent = formatMoney(order.pricing?.total, t.summary.priceValue);
    },
  };
}
