// Pure: how a proposal should be PRESENTED right now. The server is the only authority on whether it can apply
// (it re-checks everything on approve); this just stops the UI offering a button that is certain to be refused.
// Statuses: pending | approved | rejected | expired | invalid.
export function proposalStatus(proposal, order, nowMs = Date.now()) {
  if (!proposal) return null;
  if (proposal.status !== "pending") return proposal.status;
  if (order.status !== "draft") return "invalid";
  if (nowMs > Date.parse(proposal.expiresAt)) return "expired";
  if (proposal.sourceOrderVersion !== order.version) return "expired"; // the table changed since it was proposed
  return "pending";
}

/** Only a currently-pending proposal may show an Approve control. */
export const canApprove = (proposal, order, nowMs) => proposalStatus(proposal, order, nowMs) === "pending";
