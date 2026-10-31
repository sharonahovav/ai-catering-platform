// Holds the *domain* order as last returned by the orders service (mock now, FastAPI later).
// The UI never edits `order` itself: it asks the service and renders what comes back.
export function createOrderStore(service) {
  let order = null;
  let busy = false;
  const listeners = new Set();
  const completed = new Map(); // requestId -> first successful result (client-side replay guard)

  const emit = () => listeners.forEach((fn) => fn(order));

  async function load() {
    order = await service.getOrder();
    emit();
    return order;
  }

  async function addItem({ dishId, quantity, requestId }) {
    if (completed.has(requestId)) return { ...completed.get(requestId), replayed: true };
    if (busy) return { ok: false, code: "busy" };
    busy = true;
    try {
      const existing = order.items.find((i) => i.dishId === dishId)?.quantity ?? 0;
      const res = await service.putItem(order.id, dishId, {
        quantity: existing + quantity,
        version: order.version,
        idempotencyKey: requestId,
      });
      if (res.ok) {
        order = res.order;
        const result = { ok: true, order, added: quantity };
        completed.set(requestId, result);
        emit();
        return result;
      }
      if (res.order) {
        order = res.order; // e.g. version conflict: show the authoritative order again
        emit();
      }
      return { ok: false, code: res.code, message: res.message };
    } catch {
      return { ok: false, code: "network_error" }; // order left untouched; nothing claimed as saved
    } finally {
      busy = false;
    }
  }

  async function removeItem(dishId) {
    if (busy) return { ok: false, code: "busy" };
    busy = true;
    try {
      const res = await service.deleteItem(order.id, dishId, { version: order.version });
      if (res.ok || res.order) {
        order = res.order;
        emit();
      }
      return res.ok ? { ok: true, order } : { ok: false, code: res.code, message: res.message };
    } catch {
      return { ok: false, code: "network_error" };
    } finally {
      busy = false;
    }
  }

  return {
    load,
    addItem,
    removeItem,
    getOrder: () => order,
    isBusy: () => busy,
    source: service.source,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
