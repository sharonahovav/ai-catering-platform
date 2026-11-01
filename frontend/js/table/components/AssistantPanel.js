import { h, fill } from "../../lib/dom.js";

// The table guide. It only ever shows a SERVER-made proposal and only a distinct "Approve change" button can apply it.
// Reject, dismiss, an expired or stale suggestion, or an outage all leave the order exactly as it is.
// status: pending | approved | rejected | expired | invalid (already derived by state/proposal.js).
export function mountAssistant(root, { t, onSuggest, onApprove, onReject, onDismiss }) {
  root.setAttribute("aria-labelledby", "assistant-title");
  root.setAttribute("role", "region");
  let lastKey = null;

  const btn = (key, label, cls, handler, { disabled = false } = {}) =>
    h("button", { class: `btn ${cls}`, type: "button", "data-key": key, "aria-disabled": String(disabled), onclick: () => { if (!disabled) handler(); } }, label);

  return {
    update({ order, proposal, status, busy, notice }) {
      lastKey = document.activeElement?.dataset?.key ?? null;
      const locked = order.status !== "draft";
      const head = [
        h("h3", { id: "assistant-title" }, t.assistant.title),
        h("span", { class: "tag tag-warn" }, t.assistant.tag),
      ];
      const asking = busy === "asking";
      const suggest = (key = "suggest", label = t.assistant.suggest) => btn(key, asking ? t.assistant.asking : label, "btn-ghost", onSuggest, { disabled: asking || locked });
      let body;

      if (locked) {
        body = h("p", { class: "muted" }, t.assistant.locked);
      } else if (!proposal) {
        body = [h("p", { class: "muted" }, t.assistant.intro), notice ? h("p", { class: "error", role: "alert" }, notice) : null, suggest()];
      } else if (status === "pending") {
        const applying = busy === "applying";
        body = h(
          "section",
          { class: "proposal", "aria-labelledby": "proposal-title" },
          h("h4", { id: "proposal-title", tabindex: "-1" }, t.assistant.proposalTitle),
          h("dl", null,
            h("dt", null, proposal.dishName), h("dd", null, t.assistant.now + ": " + t.assistant.qty(proposal.before.quantity)),
            h("dt", null, t.assistant.after), h("dd", { class: "after" }, t.assistant.qty(proposal.after.quantity)),
            h("dt", null, t.assistant.price), h("dd", null, t.assistant.priceValue)),
          h("div", { class: "decision" },
            btn("reject", t.assistant.reject, "btn-ghost", onReject, { disabled: applying }),
            btn("approve", applying ? t.assistant.applying : t.assistant.approve, "btn-primary", onApprove, { disabled: applying })),
        );
      } else {
        const copy = {
          approved: [t.assistant.approvedTitle, t.assistant.approvedText(proposal.dishName, proposal.after.quantity)],
          rejected: [t.assistant.rejectedTitle, t.assistant.rejectedText],
          expired: [t.assistant.expiredTitle, t.assistant.expiredText],
          invalid: [t.assistant.invalidTitle, t.assistant.invalidText],
        }[status];
        body = h(
          "section",
          { class: "proposal done", "aria-labelledby": "proposal-title" },
          h("h4", { id: "proposal-title", tabindex: "-1" }, copy[0]),
          h("p", null, copy[1]),
          h("div", { class: "decision" }, btn("dismiss", t.assistant.dismiss, "btn-ghost", onDismiss), status === "approved" ? null : suggest("again", t.assistant.askAgain)),
        );
      }

      fill(root, h("div", { class: "assistant-head" }, head), body);
      if (lastKey) root.querySelector(`[data-key="${CSS.escape(lastKey)}"]`)?.focus({ preventScroll: true }); // keep focus through re-render
    },
  };
}
