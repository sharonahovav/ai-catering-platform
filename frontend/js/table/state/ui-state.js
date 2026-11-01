// Pure UI-state reducer (docs/INFINITE_TABLE_GATE0.md §2.3). View state only: it never touches the order.
// The order changes only through order-store; this reducer just reflects the outcome.
import { OVERVIEW, sameRoute } from "./router.js";

export function initialState() {
  return { route: OVERVIEW, draft: null, notice: null, noticeSeq: 0, summaryOpen: false, explore: false };
}

const newDraft = (dishId, quantity) => ({ dishId, quantity, status: "idle", error: null, requestId: null });
const notice = (state, kind, text) => ({ notice: { id: state.noticeSeq + 1, kind, text }, noticeSeq: state.noticeSeq + 1 });

export function reduce(state, event) {
  switch (event.type) {
    case "NAVIGATE": {
      if (sameRoute(state.route, event.route)) return state;
      const draft = event.route.name === "dish" ? newDraft(event.route.dishId, event.minQuantity ?? 1) : null;
      return { ...state, route: event.route, draft, summaryOpen: false };
    }

    case "SET_QUANTITY": {
      const d = state.draft;
      if (!d || d.status === "adding") return state;
      const { min = 1, step = 1, max = Infinity } = event.rule ?? {};
      const q = Number(event.quantity);
      if (!Number.isInteger(q) || q < min || q > max || (q - min) % step !== 0) return state;
      if (q === d.quantity) return state;
      // A different quantity is a different intent: it gets a fresh idempotency key.
      return { ...state, draft: { ...d, quantity: q, status: "idle", error: null, requestId: null } };
    }

    case "ADD_START": {
      const d = state.draft;
      if (!d || (d.status !== "idle" && d.status !== "error")) return state;
      // Retrying the same intent after a failure reuses the key so the server can de-duplicate.
      return { ...state, draft: { ...d, status: "adding", error: null, requestId: d.requestId ?? event.requestId } };
    }

    case "ADD_SUCCESS": {
      if (state.draft?.status !== "adding") return state;
      return { ...state, draft: null, ...notice(state, "added", event.text) };
    }

    case "ADD_FAILURE": {
      if (state.draft?.status !== "adding") return state;
      return { ...state, draft: { ...state.draft, status: "error", error: event.message } };
    }

    case "SET_NOTICE":
      return { ...state, ...notice(state, event.kind ?? "info", event.text) };
    case "DISMISS_NOTICE":
      return state.notice ? { ...state, notice: null } : state;

    // Opt-in free pan/zoom. View state only; the camera itself lives in the scene component.
    case "SET_EXPLORE":
      return state.explore === !!event.on ? state : { ...state, explore: !!event.on };

    case "OPEN_SUMMARY":
      return state.summaryOpen ? state : { ...state, summaryOpen: true };
    case "CLOSE_SUMMARY":
      return state.summaryOpen ? { ...state, summaryOpen: false } : state;

    default:
      return state;
  }
}
