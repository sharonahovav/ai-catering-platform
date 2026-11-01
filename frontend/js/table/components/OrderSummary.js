import { h, fill } from "../../lib/dom.js";
import { formatMoney } from "../money.js";

// The itemized summary is a real list and is always the source of truth for "what is on the table".
// It shows what the service last returned (order + version), never a client-side guess. Once the request is sent
// the list is read-only and says "pending business approval".
export function mountSummary(root, { t, onRemove, onClose }) {
  const title = h("h2", { id: "summary-title", tabindex: "-1" }, t.summary.title);
  const list = h("ul", { class: "order-list", "aria-label": t.summary.itemsLabel });
  const empty = h("p", { class: "empty" }, t.summary.empty);
  const version = h("p", { class: "summary-note num" });
  const statusTag = h("span", { class: "tag tag-warn" });
  const price = h("strong", null);
  const assistantSlot = h("div", { class: "assistant", id: "assistant" });
  const reviewLink = h("a", { class: "btn btn-primary", href: "#/plan/review" }, t.review.button);
  const reviewHint = h("p", { class: "summary-note" }, t.review.hint);

  fill(
    root,
    h("button", { class: "icon-btn sheet-close", type: "button", "aria-label": t.summary.close, onclick: () => onClose() }, h("span", { "aria-hidden": "true" }, "×")),
    h("div", null, h("p", { class: "eyebrow" }, t.summary.eyebrow), title),
    h("div", null, statusTag, version),
    list,
    empty,
    h("div", { class: "price-row" }, h("span", null, t.summary.price), price),
    reviewLink,
    reviewHint,
    assistantSlot,
  );

  return {
    title,
    assistantSlot,
    update({ order, dishesById, justAdded }) {
      const editable = order.status === "draft";
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
            editable ? h("button", { class: "remove", type: "button", "aria-label": t.summary.remove(name), onclick: () => onRemove(item.dishId) }, h("span", { "aria-hidden": "true" }, "×")) : h("span"),
          );
        }),
      );
      list.hidden = order.items.length === 0;
      empty.hidden = order.items.length > 0;
      statusTag.textContent = editable ? t.summary.status : t.summary.statusPending; // never "confirmed"
      version.textContent = t.summary.version(order.version);
      reviewLink.textContent = editable ? t.review.button : t.review.view;
      reviewHint.textContent = editable ? t.review.hint : t.review.sentHint;
      price.textContent = formatMoney(order.pricing?.total, t.summary.priceValue);
    },
  };
}
