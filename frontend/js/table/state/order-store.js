// Holds the *domain* state as last returned by the orders service (mock now, FastAPI later): the order and the
// current AI proposal. The UI never edits either itself: it asks the service and renders what comes back.
// Every mutating call goes through `mutate`: one in flight at a time, idempotent per requestId, and a failure never
// claims anything was saved.
export function createOrderStore(service) {
  let order = null;
  let proposal = null;
  let busy = false;
  const listeners = new Set();
  const completed = new Map(); // requestId -> first successful result (client-side replay guard)

  const emit = () => listeners.forEach((fn) => fn(order));

  async function load() {
    order = await service.getOrder();
    emit();
    return order;
  }

  /** `call` returns the service response; `after(res)` may add fields to a successful result. */
  async function mutate(requestId, call, after) {
    if (requestId && completed.has(requestId)) return { ...completed.get(requestId), replayed: true };
    if (busy) return { ok: false, code: "busy" };
    busy = true;
    try {
      const res = await call();
      let changed = false;
      if (res.order) { order = res.order; changed = true; } // adopt the authoritative order on success AND on conflict
      if (res.proposal !== undefined) { proposal = res.proposal; changed = true; }
      const out = res.ok ? { ok: true, order, proposal, ...after?.(res) } : { ok: false, code: res.code, message: res.message, details: res.details };
      if (res.ok && requestId) completed.set(requestId, out);
      if (changed) emit();
      return out;
    } catch {
      return { ok: false, code: "network_error" }; // nothing was changed or claimed as saved
    } finally {
      busy = false;
    }
  }

  const addItem = ({ dishId, quantity, requestId }) =>
    mutate(requestId, () => {
      const existing = order.items.find((i) => i.dishId === dishId)?.quantity ?? 0;
      return service.putItem(order.id, dishId, { quantity: existing + quantity, version: order.version, idempotencyKey: requestId });
    }, () => ({ added: quantity }));

  const removeItem = (dishId) => mutate(null, () => service.deleteItem(order.id, dishId, { version: order.version }));
  const updateDetails = (patch, requestId) => mutate(requestId, () => service.updateDetails(order.id, patch, { version: order.version, idempotencyKey: requestId }));
  const submit = (requestId) => mutate(requestId, () => service.submit(order.id, { version: order.version, idempotencyKey: requestId }));

  const requestProposal = () => mutate(null, () => service.createProposal(order.id));
  const approveProposal = (id) => mutate(null, () => service.approveProposal(id));
  const rejectProposal = (id) => mutate(null, () => service.rejectProposal(id));
  const dismissProposal = () => { proposal = null; emit(); }; // local only: hides a finished card

  return {
    load, addItem, removeItem, updateDetails, submit, requestProposal, approveProposal, rejectProposal, dismissProposal,
    getOrder: () => order,
    getProposal: () => proposal,
    isBusy: () => busy,
    source: service.source,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
