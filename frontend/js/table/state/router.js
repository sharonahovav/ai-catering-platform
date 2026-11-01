// Pure route helpers: no DOM, no history access. Routes are hash-based (see docs/INFINITE_TABLE_GATE0.md §2.1).
// Only catalog ids ever appear in a route: no order ids, no personal data.
const ID = /^[A-Za-z0-9_-]{1,64}$/;
const FUTURE = ["event", "guests", "review"];

export const OVERVIEW = Object.freeze({ name: "overview" });

export function parseHash(hash = "") {
  const raw = String(hash).replace(/^#/, "").split("?")[0].replace(/\/+$/, "");
  if (raw === "" || raw === "/plan") return OVERVIEW;
  const parts = raw.split("/").filter(Boolean);
  if (parts[0] !== "plan") return { name: "notfound" };
  if (parts.length === 2 && FUTURE.includes(parts[1])) return { name: parts[1] };
  if (parts[1] === "menu" && ID.test(parts[2] ?? "")) {
    const categoryId = parts[2];
    if (parts.length === 3) return { name: "category", categoryId };
    if (parts.length === 5 && parts[3] === "dish" && ID.test(parts[4])) {
      return { name: "dish", categoryId, dishId: parts[4] };
    }
  }
  return { name: "notfound" };
}

export function buildHash(route) {
  switch (route?.name) {
    case "category":
      return `#/plan/menu/${route.categoryId}`;
    case "dish":
      return `#/plan/menu/${route.categoryId}/dish/${route.dishId}`;
    case "event":
    case "guests":
    case "review":
      return `#/plan/${route.name}`;
    default:
      return "#/plan";
  }
}

export function sameRoute(a, b) {
  return a?.name === b?.name && a?.categoryId === b?.categoryId && a?.dishId === b?.dishId;
}

/**
 * How to move "up" to `target` (close a dish, zoom out). If the entry we came from IS the target,
 * pop it so Back/Forward stay coherent; otherwise use `fallback` ("push" | "replace").
 * `historyState` is the object we store with every entry: { i: index, prev: hash of previous entry }.
 */
export function decideUp(historyState, target, fallback = "push") {
  if (historyState && historyState.i > 0 && historyState.prev === buildHash(target)) return "back";
  return fallback;
}
