// The table scene: one `.world` element moved by a camera. Two ways to move it, both driven by pure math in
// state/camera.js:
//  1. Route levels (always on): overview -> category (dishes orbit the focused food object) -> dish (dolly in).
//  2. Explore mode (opt-in): drag / wheel / pinch / keyboard, bounded. Off by default, so the page never hijacks
//     scroll or pointer input unless the person turns it on.
// The scene is a visual/pointer layer: every action it offers also exists as a real button or link elsewhere.
import { h } from "../../lib/dom.js";
import { IDENTITY, focusRect, panBy, satelliteLayout, toTransform, zoomAt } from "../state/camera.js";

const DRAG_THRESHOLD = 6; // px before a press becomes a pan (so plain clicks still click)
const KEY_PAN = 80;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function mountScene({ stage, world, nodesEl, categories, dishesByCategory, compactQuery }) {
  let cam = { ...IDENTITY };
  let route = { name: "overview" };
  let exploring = false;
  let manual = false; // the person moved the camera themselves
  let settleTimer;
  const model = new Map(); // categoryId -> { ring: rect, sats: Map(dishId -> {cx, cy, size}) }
  const satEls = new Map(); // `${categoryId}/${dishId}` -> element

  /* ---------- satellites (dishes orbiting their category) ---------- */
  const satLayer = h("div", { class: "sats", "aria-hidden": "true" });
  for (const c of categories) {
    const group = h("div", { class: "sat-group", "data-for": c.id });
    for (const d of dishesByCategory.get(c.id) ?? []) {
      const el = h(
        "button",
        { class: `sat${d.available ? "" : " is-unavailable"}`, type: "button", tabindex: "-1", "data-route": `#/plan/menu/${c.id}/dish/${d.id}`, "data-sat-id": d.id },
        h("img", { src: d.image, alt: "", width: 128, height: 128, loading: "lazy", decoding: "async", draggable: "false" }),
        h("span", { class: "sat-label" }, d.name),
      );
      satEls.set(`${c.id}/${d.id}`, el);
      group.append(el);
    }
    satLayer.append(group);
  }
  nodesEl.append(satLayer);

  const view = () => ({ width: stage.clientWidth, height: stage.clientHeight });

  function relayout() {
    model.clear();
    if (compactQuery.matches) return;
    for (const c of categories) {
      const node = nodesEl.querySelector(`.node[data-category-id="${CSS.escape(c.id)}"]`);
      const dishes = dishesByCategory.get(c.id) ?? [];
      if (!node || !node.offsetWidth || !dishes.length) continue;
      const w = node.offsetWidth;
      const hgt = node.offsetHeight;
      const center = { cx: node.offsetLeft + w / 2, cy: node.offsetTop + hgt / 2, radius: Math.min(w, hgt) / 2 };
      const size = clamp(Math.min(w, hgt) * 0.36, 44, 90);
      const { items, ringRadius } = satelliteLayout(center, dishes.length, size);
      const sats = new Map();
      dishes.forEach((d, i) => {
        sats.set(d.id, { ...items[i], size });
        const el = satEls.get(`${c.id}/${d.id}`);
        el.style.cssText = `--i:${i};left:${items[i].cx - size / 2}px;top:${items[i].cy - size / 2}px;width:${size}px;height:${size}px`;
      });
      model.set(c.id, { ring: { x: center.cx - ringRadius, y: center.cy - ringRadius, width: ringRadius * 2, height: ringRadius * 2 }, sats });
    }
  }

  /* ---------- camera ---------- */
  function apply(next, animate) {
    cam = next;
    world.classList.toggle("is-animated", animate);
    world.style.transform = compactQuery.matches ? "" : toTransform(next);
    world.style.setProperty("--cam-scale", next.scale.toFixed(4)); // lets labels cancel the zoom (see .sat-label)
    // The same camera drives the prop layers at their own depth (see .prop): parallax comes from the camera, never from the pointer.
    stage.style.setProperty("--cam-x", `${next.x.toFixed(1)}px`);
    stage.style.setProperty("--cam-y", `${next.y.toFixed(1)}px`);
    stage.style.setProperty("--cam-k", next.scale.toFixed(4));
    stage.classList.toggle("is-cam-animated", animate);
    clearTimeout(settleTimer);
    // Drop will-change after the move so text re-rasterises crisply at the final scale.
    if (animate) settleTimer = setTimeout(() => { world.classList.remove("is-animated"); stage.classList.remove("is-cam-animated"); }, 900);
  }

  function regionFor(kind) {
    const v = view();
    const sr = stage.getBoundingClientRect();
    if (kind === "dish") {
      const sheet = Math.min(26 * parseFloat(getComputedStyle(document.documentElement).fontSize), v.width);
      return { x: 16, y: 56, width: Math.max(160, v.width - sheet - 32), height: v.height - 72 };
    }
    const hud = stage.querySelector(".hud");
    const left = hud ? Math.max(0, hud.getBoundingClientRect().right - sr.left) + 16 : 0;
    return { x: left, y: 56, width: Math.max(200, v.width - left - 16), height: v.height - 72 - 36 }; // the last 36px is for the labels under the dishes
  }

  function levelTarget() {
    if (compactQuery.matches || (route.name !== "category" && route.name !== "dish")) return { ...IDENTITY };
    const m = model.get(route.categoryId);
    if (!m) return { ...IDENTITY };
    const sat = route.name === "dish" ? m.sats.get(route.dishId) : null;
    if (sat) {
      const rect = { x: sat.cx - sat.size / 2, y: sat.cy - sat.size / 2, width: sat.size, height: sat.size };
      return focusRect(rect, view(), { region: regionFor("dish"), fill: 0.5, maxScale: 4.5 });
    }
    return focusRect(m.ring, view(), { region: regionFor("category"), fill: 0.95, maxScale: 3.2 });
  }

  function markActive() {
    const cat = route.categoryId ?? null;
    nodesEl.querySelectorAll(".node").forEach((n) => n.classList.toggle("is-focused", n.dataset.categoryId === cat));
    satLayer.querySelectorAll(".sat-group").forEach((g) => g.classList.toggle("is-active", g.dataset.for === cat));
    satEls.forEach((el, key) => el.classList.toggle("is-current", route.name === "dish" && key === `${route.categoryId}/${route.dishId}`));
  }

  /** Move the camera to the level for `next`. Discards any free-camera adjustment. */
  function setLevel(next, { animate = true } = {}) {
    route = next;
    manual = false;
    markActive();
    apply(levelTarget(), animate);
  }

  /* ---------- explore mode (opt-in) ---------- */
  const move = (next) => {
    manual = true;
    apply(next, false);
  };
  const zoomBy = (factor, px, py) => {
    const v = view();
    move(zoomAt(cam, factor, px ?? v.width / 2, py ?? v.height / 2, v));
  };
  const pan = (dx, dy) => move(panBy(cam, dx, dy, view()));
  const reset = () => {
    manual = false;
    apply(levelTarget(), true);
  };

  const pointers = new Map(); // pointerId -> {x, y} in stage coords
  let drag = null;            // { id, startX, startY, camX, camY, active }
  let pinch = null;           // { dist, cx, cy }
  let swallowClick = false;

  const local = (e) => {
    const r = stage.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const ignorable = (target) => !!target.closest?.(".hud, .explore, .back-link, dialog");

  stage.addEventListener("pointerdown", (e) => {
    if (!exploring || e.button > 0 || ignorable(e.target)) return;
    pointers.set(e.pointerId, local(e));
    if (pointers.size === 1) {
      const p = local(e);
      drag = { id: e.pointerId, startX: p.x, startY: p.y, camX: cam.x, camY: cam.y, active: false };
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
      drag = null;
    }
  });

  stage.addEventListener("pointermove", (e) => {
    if (!exploring || !pointers.has(e.pointerId)) return;
    const p = local(e);
    pointers.set(e.pointerId, p);
    if (pinch && pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch.dist > 0 && dist > 0) zoomBy(dist / pinch.dist, (a.x + b.x) / 2, (a.y + b.y) / 2);
      pinch.dist = dist;
      swallowClick = true;
    } else if (drag && drag.id === e.pointerId) {
      const dx = p.x - drag.startX;
      const dy = p.y - drag.startY;
      if (!drag.active && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
        drag.active = true;
        stage.setPointerCapture?.(e.pointerId);
        stage.classList.add("is-dragging");
      }
      if (drag.active) {
        swallowClick = true;
        move(panBy({ x: drag.camX, y: drag.camY, scale: cam.scale }, dx, dy, view()));
      }
    }
  });

  const release = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (drag && drag.id === e.pointerId) drag = null;
    if (pointers.size === 0) {
      stage.classList.remove("is-dragging");
      if (swallowClick) setTimeout(() => (swallowClick = false), 0); // after the click that ends a drag
    }
  };
  stage.addEventListener("pointerup", release);
  stage.addEventListener("pointercancel", release);

  // A drag that ends over a node must not also "click" it.
  stage.addEventListener("click", (e) => {
    if (swallowClick) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);

  stage.addEventListener("wheel", (e) => {
    if (!exploring || ignorable(e.target)) return; // wheel is only captured while Explore is on
    e.preventDefault();
    const p = local(e);
    zoomBy(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), p.x, p.y);
  }, { passive: false });

  return {
    setLevel,
    relayout() {
      relayout();
      manual ? apply(cam, false) : apply(levelTarget(), false);
    },
    setExplore(on) {
      on = !!on && !compactQuery.matches;
      if (on === exploring) return;
      exploring = on;
      stage.classList.toggle("is-exploring", on);
      if (!on) {
        pointers.clear();
        drag = pinch = null;
        stage.classList.remove("is-dragging");
        if (manual) reset(); // leaving Explore returns to the level view
      }
    },
    zoomBy: (f) => zoomBy(f),
    pan,
    reset,
    isManual: () => manual,
    getCamera: () => cam,
    KEY_PAN,
  };
}
