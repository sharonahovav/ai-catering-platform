import { h, fill } from "../../lib/dom.js";
import { formatMoney } from "../money.js";
import { qtyLabel } from "../units.js";

// The itemized summary is a real list and is always the source of truth for "what is on the table".
// It shows what the service last returned (order, version and the server-calculated price), never a client-side
// guess. Once the request is sent the list is read-only and says "pending business approval".
export function mountSummary(root, { t, onRemove, onClose }) {
  const title = h("h2", { id: "summary-title", tabindex: "-1" }, t.summary.title);
  const list = h("ul", { class: "order-list", "aria-label": t.summary.itemsLabel });
  const empty = h("p", { class: "empty" }, t.summary.empty);
  const version = h("p", { class: "summary-note num" });
  const statusTag = h("span", { class: "tag tag-warn" });
  const assistantSlot = h("div", { class: "assistant", id: "assistant" });
  const reviewLink = h("a", { class: "btn btn-primary", href: "#/plan/review" }, t.review.button);
  const reviewHint = h("p", { class: "summary-note" }, t.review.hint);

  // price breakdown: food, delivery, estimated total
  const food = h("dd", { class: "num" });
  const delivery = h("dd", { class: "num" });
  const total = h("dd", { class: "total num" });
  const estimate = h("p", { class: "summary-note" });
  const prices = h(
    "div",
    { class: "price-box" },
    h("dl", { class: "price-rows" }, h("dt", null, t.price.food), food, h("dt", null, t.price.delivery), delivery, h("dt", { class: "total-label" }, t.price.total), total),
    estimate,
  );

  fill(
    root,
    h("button", { class: "icon-btn sheet-close", type: "button", "aria-label": t.summary.close, onclick: () => onClose() }, h("span", { "aria-hidden": "true" }, "×")),
    h("div", null, h("p", { class: "eyebrow" }, t.summary.eyebrow), title),
    h("div", null, statusTag, version),
    list,
    empty,
    prices,
    reviewLink,
    reviewHint,
    assistantSlot,
  );

  return {
    title,
    assistantSlot,
    update({ order, dishesById, justAdded }) {
      const editable = order.status === "draft";
      const p = order.pricing;
      const lineOf = (id) => p.lines?.find((l) => l.dishId === id)?.lineTotal;
      fill(
        list,
        order.items.map((item) => {
          const dish = dishesById.get(item.dishId);
          const name = dish?.name ?? item.dishId;
          return h(
            "li",
            { class: `order-item${item.dishId === justAdded ? " just-added" : ""}`, "data-dish-id": item.dishId, tabindex: "-1" },
            dish ? h("img", { src: dish.image, alt: "", width: 52, height: 52 }) : h("span"),
            h("div", null, h("strong", null, name), h("span", { class: "num" }, `${t.summary.line(qtyLabel(t, dish?.pricingUnit, item.quantity))} · ${formatMoney(lineOf(item.dishId), "", undefined, { compact: true })}`)),
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

      const has = p.state === "calculated";
      prices.hidden = !has;
      if (has) {
        food.textContent = formatMoney(p.subtotal, "", undefined, { compact: true });
        const fee = p.deliveryFee;
        delivery.textContent = fee.state !== "calculated" ? t.price.deliveryPending : fee.amountMinor === 0 ? t.price.pickupFree : formatMoney(fee, "", undefined, { compact: true });
        total.textContent = formatMoney(p.total, "", undefined, { compact: true });
        estimate.textContent = `${t.price.estimate} · ${t.price.vatIncluded}${p.totalIncludesDelivery ? "" : ` · ${t.price.deliveryExcluded}`}`;
      }
    },
  };
}
