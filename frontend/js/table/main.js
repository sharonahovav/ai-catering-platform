// Infinite Table, Gate 1 composition root. View state (ui-state) and domain state (order-store) stay separate:
// history/URL -> NAVIGATE -> reducer -> render(); the order changes only through the orders service.
import { h, fill } from "../lib/dom.js";
import { announce } from "../lib/announce.js";
import { t } from "./strings.en.js";
import { catalogService } from "./services/catalog-service.js";
import { createOrdersService } from "./services/orders-service.js";
import { createOrderStore } from "./state/order-store.js";
import { OVERVIEW, buildHash, decideUp, parseHash, sameRoute } from "./state/router.js";
import { initialState, reduce } from "./state/ui-state.js";
import { mountMockBanner } from "./components/MockBanner.js";
import { mountTopBar } from "./components/TopBar.js";
import { mountRail } from "./components/NavigationRail.js";
import { mountOverview } from "./components/SpatialOverview.js";
import { renderCategory } from "./components/CategoryFocus.js";
import { mountDishDialog } from "./components/DishDialog.js";
import { mountSummary } from "./components/OrderSummary.js";
import { mountScene } from "./components/Scene.js";
import { mountExploreControls } from "./components/ExploreControls.js";

const $ = (id) => document.getElementById(id);
const els = {
  topbar: $("topbar"), banner: $("mock-banner"), rail: $("rail"), main: $("main"),
  paneOverview: $("pane-overview"), explore: $("explore"), paneCategory: $("pane-category"), summary: $("summary"), dialog: $("dish-dialog"),
};
const mobile = window.matchMedia("(max-width: 899px)");

// Dev affordance for exercising the error path: /table/?mockFail makes the first add fail once.
const store = createOrderStore(createOrdersService({ failNextCall: new URLSearchParams(location.search).has("mockFail") }));

let state = initialState();
let categories = [];
const dishes = new Map();
let renderedCategoryId = null;
let categoryHeading = null;
let focusOverride = null;
let justAdded = null;
let booted = false;
let sceneSynced = false;
let ui = {}; // mounted components

/* ---------------- state + render ---------------- */

function dispatch(event) {
  const prev = state;
  state = reduce(state, event);
  if (state !== prev) render(prev);
}

function crumbsFor(route) {
  const crumbs = [{ label: t.breadcrumb.root, hash: "#/plan" }];
  const category = categories.find((c) => c.id === route.categoryId);
  if (category) crumbs.push({ label: category.name, hash: buildHash({ name: "category", categoryId: category.id }) });
  if (route.name === "dish") crumbs.push({ label: dishes.get(route.dishId)?.name ?? "" });
  return crumbs;
}

function renderOrderViews() {
  const order = store.getOrder();
  if (!order) return;
  ui.summary.update({ order, dishesById: dishes, justAdded });
  ui.topbar.update({ crumbs: crumbsFor(state.route), count: order.items.length, summaryOpen: state.summaryOpen });
}

function render(prev) {
  const { route } = state;
  const inMenu = route.name === "category" || route.name === "dish";

  // Zoom state is a data attribute; CSS does the (optional) motion. Inactive pane is inert immediately.
  els.main.dataset.view = inMenu ? "category" : "overview";
  els.main.dataset.level = route.name; // overview | category | dish: lets CSS clear the side panel for the dish close-up
  // Desktop: the scene stays live (pointer) behind the category panel; only the hero and text strip go inert.
  // Phones: the panes swap, so the inactive one is inert.
  const compact = mobile.matches;
  els.paneOverview.inert = inMenu && compact;
  ui.overview.intro.inert = inMenu;
  ui.overview.strip.inert = inMenu;
  els.paneCategory.inert = !inMenu;
  if (inMenu && renderedCategoryId !== route.categoryId) {
    const category = categories.find((c) => c.id === route.categoryId);
    categoryHeading = renderCategory(els.paneCategory, { t, category, categories, dishes: [...dishes.values()].filter((d) => d.categoryId === category.id) });
    renderedCategoryId = category.id;
  }

  // Camera: levels follow the route (first sync is instant, later ones animate unless reduced motion).
  if (!sceneSynced) ui.scene.relayout();
  if (!sceneSynced || !sameRoute(prev.route, route)) ui.scene.setLevel(route, { animate: booted && sceneSynced });
  sceneSynced = true;
  const exploreOn = state.explore && !compact;
  ui.scene.setExplore(exploreOn);
  ui.explore.update({ on: exploreOn, available: !compact });

  ui.rail.update(route);
  renderOrderViews();
  document.title = `${crumbsFor(route).at(-1).label} · ${t.pageTitle} · Demo`;

  // Dish sheet follows the route, so browser Back closes it.
  if (route.name === "dish" && state.draft) ui.dialog.open(dishes.get(route.dishId), state.draft);
  else ui.dialog.close();

  // Summary sheet (phones). On desktop the summary is always visible.
  els.summary.dataset.open = String(state.summaryOpen);
  els.summary.inert = mobile.matches && !state.summaryOpen;
  // While the phone summary sheet is open it is the only active region (the top-bar toggle still closes it).
  els.main.inert = els.rail.inert = mobile.matches && state.summaryOpen;

  if (state.notice && state.notice !== prev.notice) announce(state.notice.text);
  if (!booted) return;

  if (!prev.summaryOpen && state.summaryOpen) ui.summary.title.focus();
  else if (prev.summaryOpen && !state.summaryOpen && mobile.matches && sameRoute(prev.route, route)) ui.topbar.toggle.focus();

  if (!sameRoute(prev.route, route)) moveFocus(prev.route, route);
}

function moveFocus(from, to) {
  if (focusOverride) {
    const run = focusOverride;
    focusOverride = null;
    run();
  } else if (to.name === "category") {
    const card = from.name === "dish" && from.categoryId === to.categoryId ? els.paneCategory.querySelector(`[data-dish-id="${CSS.escape(from.dishId)}"]`) : null;
    (card ?? categoryHeading).focus({ preventScroll: true });
  } else if (to.name === "overview") {
    // Return focus to the control that is actually in the tab order: the chip on wide screens, the node on phones.
    const id = from.categoryId ? CSS.escape(from.categoryId) : null;
    const node = id ? els.paneOverview.querySelector(`.node[data-category-id="${id}"]`) : null;
    const chip = id && !mobile.matches ? els.paneOverview.querySelector(`[data-chip-id="${id}"]`) : null;
    (chip ?? node ?? els.main).focus({ preventScroll: true });
  }
  // to "dish": the native dialog moves focus into itself.
}

/* ---------------- history ---------------- */

function resolve(route) {
  const category = categories.find((c) => c.id === route.categoryId);
  switch (route.name) {
    case "overview":
      return { route };
    case "category":
      return category ? { route } : { route: OVERVIEW, notice: t.announce.notFound };
    case "dish": {
      const dish = dishes.get(route.dishId);
      return category && dish?.categoryId === category.id ? { route } : { route: OVERVIEW, notice: t.announce.notFound };
    }
    case "event":
    case "guests":
    case "review":
      return { route: OVERVIEW, notice: t.announce.comingSoon };
    default:
      return { route: OVERVIEW, notice: t.announce.notFound };
  }
}

function applyRoute(route) {
  dispatch({ type: "NAVIGATE", route, minQuantity: dishes.get(route.dishId)?.quantityRule?.min });
}

function commitRoute(route, mode) {
  const cur = history.state ?? { i: 0, prev: null };
  const hash = buildHash(route);
  const next = mode === "push" ? { i: cur.i + 1, prev: buildHash(state.route) } : { i: cur.i, prev: cur.prev };
  try {
    if (mode === "push") history.pushState(next, "", hash);
    else history.replaceState(next, "", hash);
  } catch {
    location.hash = hash; // sandboxed frames: the hashchange listener picks it up
    return;
  }
  applyRoute(route);
}

/** Move "up" (close a dish, zoom out): pop if the previous entry is the target, otherwise navigate. */
function up(target, fallback) {
  if (decideUp(history.state, target, fallback) === "back") history.back();
  else commitRoute(target, fallback);
}

function navigateTo(route) {
  if (sameRoute(route, state.route)) return;
  if (route.name === "overview" && state.route.name === "category") return up(OVERVIEW, "push");
  commitRoute(route, "push");
}

function onLocationChange() {
  const hash = location.hash;
  if (hash && !hash.startsWith("#/plan")) return; // in-page anchors such as the skip link
  const { route, notice } = resolve(parseHash(hash));
  if (notice) {
    try { history.replaceState(history.state ?? { i: 0, prev: null }, "", buildHash(route)); } catch { /* ignore */ }
    dispatch({ type: "SET_NOTICE", kind: "info", text: notice });
  }
  applyRoute(route);
}

/* ---------------- actions ---------------- */

const newRequestId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);
const errorText = (res) =>
  ({ network_error: t.errors.network, busy: t.errors.busy, dish_unavailable: t.errors.unavailable, order_version_conflict: t.errors.conflict })[res.code] ?? res.message ?? t.errors.generic;

function closeDish() {
  const r = state.route;
  if (r.name === "dish") up({ name: "category", categoryId: r.categoryId }, "replace");
}

function resetView() {
  ui.scene.reset();
  dispatch({ type: "SET_NOTICE", kind: "info", text: t.explore.resetDone });
}

function onStep(direction) {
  const d = state.draft;
  const rule = dishes.get(d?.dishId)?.quantityRule;
  if (!d || rule?.state !== "configured") return;
  dispatch({ type: "SET_QUANTITY", quantity: d.quantity + direction * rule.step, rule });
}

function focusSummaryRow(dishId) {
  if (mobile.matches) return ui.topbar.toggle.focus();
  const row = els.summary.querySelector(`[data-dish-id="${CSS.escape(dishId)}"]`);
  (row ?? ui.summary.title).focus();
}

async function onAdd() {
  const d = state.draft;
  const dish = d && dishes.get(d.dishId);
  if (!d || !dish?.available || (d.status !== "idle" && d.status !== "error")) return;

  dispatch({ type: "ADD_START", requestId: newRequestId() });
  const draft = state.draft;
  justAdded = dish.id;
  const res = await store.addItem({ dishId: dish.id, quantity: draft.quantity, requestId: draft.requestId });
  const stillHere = state.draft?.dishId === dish.id && state.draft.requestId === draft.requestId;

  if (!res.ok) {
    justAdded = null;
    const message = errorText(res);
    if (stillHere) dispatch({ type: "ADD_FAILURE", message });
    else dispatch({ type: "SET_NOTICE", kind: "error", text: message });
    return;
  }

  const text = t.announce.added(draft.quantity, dish.name, res.order.items.length);
  setTimeout(() => {
    justAdded = null;
    els.summary.querySelectorAll(".just-added").forEach((li) => li.classList.remove("just-added"));
  }, 1000);

  if (!stillHere) return void dispatch({ type: "SET_NOTICE", kind: "added", text }); // person navigated away mid-save
  focusOverride = () => focusSummaryRow(dish.id);
  dispatch({ type: "ADD_SUCCESS", text });
  commitRoute(OVERVIEW, "replace"); // replace the dish entry so Back goes to the category, never to a stale sheet
}

async function onRemove(dishId) {
  const name = dishes.get(dishId)?.name ?? "";
  const index = [...els.summary.querySelectorAll(".order-item")].findIndex((li) => li.dataset.dishId === dishId);
  const res = await store.removeItem(dishId);
  if (!res.ok) return dispatch({ type: "SET_NOTICE", kind: "error", text: t.errors.removeFailed });
  const buttons = [...els.summary.querySelectorAll(".order-item .remove")];
  (buttons[index] ?? buttons[index - 1] ?? ui.summary.title).focus();
  dispatch({ type: "SET_NOTICE", kind: "info", text: t.announce.removed(name, res.order.items.length) });
}

/* ---------------- boot ---------------- */

async function boot() {
  document.body.classList.add("no-anim");
  $("skip-link").textContent = t.skip;
  $("page-title").textContent = t.pageTitle;
  $("skip-link").addEventListener("click", (e) => {
    e.preventDefault();
    els.main.focus();
  });

  try {
    categories = await catalogService.getCategories();
    for (const c of categories) for (const d of await catalogService.getDishes(c.id)) dishes.set(d.id, d);
    await store.load();
  } catch {
    fill(els.main, h("p", { class: "error", role: "alert", style: "padding:2rem" }, t.errors.load));
    document.body.classList.remove("no-anim");
    return;
  }

  mountMockBanner(els.banner, t, [catalogService.source, store.source]);
  ui.topbar = mountTopBar(els.topbar, { t, onToggleSummary: () => dispatch({ type: state.summaryOpen ? "CLOSE_SUMMARY" : "OPEN_SUMMARY" }) });
  ui.rail = mountRail(els.rail, { t, firstCategoryId: categories[0].id });
  ui.overview = mountOverview(els.paneOverview, { t, categories, compactQuery: mobile });
  const dishesByCategory = new Map(categories.map((c) => [c.id, [...dishes.values()].filter((d) => d.categoryId === c.id)]));
  ui.scene = mountScene({ stage: els.main, world: ui.overview.world, nodesEl: ui.overview.nodesEl, categories, dishesByCategory, compactQuery: mobile });
  ui.explore = mountExploreControls(els.explore, {
    t,
    onToggle: () => {
      const on = !state.explore;
      dispatch({ type: "SET_EXPLORE", on });
      dispatch({ type: "SET_NOTICE", kind: "info", text: on ? t.explore.on : t.explore.off });
    },
    onZoomIn: () => ui.scene.zoomBy(1.25),
    onZoomOut: () => ui.scene.zoomBy(0.8),
    onReset: resetView,
  });
  els.explore.addEventListener("keydown", (e) => {
    if (!state.explore || e.ctrlKey || e.metaKey || e.altKey) return;
    const step = ui.scene.KEY_PAN;
    const pan = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key];
    if (pan) ui.scene.pan(...pan);
    else if (e.key === "+" || e.key === "=") ui.scene.zoomBy(1.25);
    else if (e.key === "-" || e.key === "_") ui.scene.zoomBy(0.8);
    else if (e.key === "0") resetView();
    else return;
    e.preventDefault();
  });
  // Re-measure when the stage changes size (resize, rotation, crossing the phone breakpoint).
  let measureFrame;
  new ResizeObserver(() => {
    cancelAnimationFrame(measureFrame);
    measureFrame = requestAnimationFrame(() => {
      ui.scene.relayout();
      ui.scene.setLevel(state.route, { animate: false });
    });
  }).observe(els.main);
  ui.summary = mountSummary(els.summary, { t, onRemove, onClose: () => dispatch({ type: "CLOSE_SUMMARY" }) });
  ui.dialog = mountDishDialog(els.dialog, { t, onClose: closeDish, onStep, onAdd });
  store.subscribe(renderOrderViews);

  // A pinned bottom bar is helpful until large text makes it eat the screen; then let it scroll with the page.
  const pinRail = () => els.rail.classList.toggle("is-tall", mobile.matches && els.rail.offsetHeight > window.innerHeight * 0.22);
  new ResizeObserver(pinRail).observe(els.rail);
  window.addEventListener("resize", pinRail);
  pinRail();
  mobile.addEventListener("change", () => render(state));

  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const link = e.target.closest('a[href^="#/plan"]');
    const control = e.target.closest("[data-route]");
    const target = link ?? control;
    if (!target) return;
    e.preventDefault();
    navigateTo(resolve(parseHash(link ? link.getAttribute("href") : control.dataset.route)).route);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || els.dialog.open) return; // an open dialog handles its own Escape
    if (state.summaryOpen) dispatch({ type: "CLOSE_SUMMARY" });
    else if (state.route.name === "category") up(OVERVIEW, "push");
  });
  window.addEventListener("popstate", onLocationChange);
  window.addEventListener("hashchange", onLocationChange);

  // Deep link / refresh: restore the view from the URL. The order is not persisted in Gate 1 (the UI says so).
  const { route, notice } = resolve(parseHash(location.hash));
  try { history.replaceState(history.state ?? { i: 0, prev: null }, "", buildHash(route)); } catch { /* ignore */ }
  applyRoute(route);
  if (notice) dispatch({ type: "SET_NOTICE", kind: "info", text: notice });
  render(state); // first paint, even when the initial route equals the default (NAVIGATE was then a no-op)

  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.body.classList.remove("no-anim");
    booted = true;
  }));
}

boot();
