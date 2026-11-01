import assert from "node:assert/strict";
import { test } from "node:test";
import { IDENTITY, LIMITS, clampCamera, focusRect, panBy, satelliteLayout, toTransform, zoomAt } from "../state/camera.js";

const VIEW = { width: 1000, height: 700 };
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} !~ ${b}`);
const worldPoint = (cam, px, py) => ({ x: (px - cam.x) / cam.scale, y: (py - cam.y) / cam.scale });

test("zoomAt keeps the world point under the pointer fixed", () => {
  const cam = { x: -100, y: -50, scale: 1.5 };
  const before = worldPoint(cam, 400, 300);
  const next = zoomAt(cam, 1.4, 400, 300, VIEW);
  const after = worldPoint(next, 400, 300);
  near(after.x, before.x);
  near(after.y, before.y);
  near(next.scale, 2.1);
});

test("scale is bounded in both directions", () => {
  let cam = IDENTITY;
  for (let i = 0; i < 60; i++) cam = zoomAt(cam, 1.3, 500, 350, VIEW);
  assert.equal(cam.scale, LIMITS.max);
  for (let i = 0; i < 120; i++) cam = zoomAt(cam, 0.7, 500, 350, VIEW);
  assert.equal(cam.scale, LIMITS.min);
});

test("panning is bounded: at least 30% of the world stays on screen", () => {
  const far = panBy(IDENTITY, -99999, 99999, VIEW);
  assert.equal(far.x, VIEW.width * 0.3 - VIEW.width); // world's right 30% still visible
  assert.equal(far.y, VIEW.height * 0.7);              // world's top 30% still visible
  const other = panBy(IDENTITY, 99999, -99999, VIEW);
  assert.equal(other.x, VIEW.width * 0.7);
  assert.equal(other.y, VIEW.height * 0.3 - VIEW.height);
});

test("clamping the identity camera changes nothing", () => {
  assert.deepEqual(clampCamera(IDENTITY, VIEW), { x: 0, y: 0, scale: 1 });
});

test("panBy moves by the requested amount when inside bounds", () => {
  assert.deepEqual(panBy(IDENTITY, 40, -25, VIEW), { x: 40, y: -25, scale: 1 });
});

test("focusRect centres the rect in the region and respects fill and maxScale", () => {
  const rect = { x: 600, y: 200, width: 200, height: 200 };
  const region = { x: 300, y: 50, width: 650, height: 600 };
  const cam = focusRect(rect, VIEW, { region, fill: 0.8, maxScale: 3 });
  near(cam.scale, Math.min((650 * 0.8) / 200, (600 * 0.8) / 200, 3)); // 2.4
  const screen = { x: cam.x + 700 * cam.scale, y: cam.y + 300 * cam.scale }; // rect centre on screen
  near(screen.x, region.x + region.width / 2);
  near(screen.y, region.y + region.height / 2);
  assert.equal(focusRect({ x: 0, y: 0, width: 10, height: 10 }, VIEW, { maxScale: 2.5 }).scale, 2.5);
});

test("focusRect never zooms out below 1", () => {
  assert.equal(focusRect({ x: 0, y: 0, width: 5000, height: 5000 }, VIEW).scale, 1);
});

test("toTransform renders a CSS transform", () => {
  assert.equal(toTransform({ x: 10, y: -5.5, scale: 2 }), "translate(10.00px, -5.50px) scale(2.0000)");
});

test("satellite layout: even ring, first at the top, none overlap each other or collapse into the node", () => {
  const node = { cx: 500, cy: 400, radius: 100 };
  const size = 60;
  for (const n of [1, 2, 3, 4, 5, 6]) {
    const { items, ringRadius } = satelliteLayout(node, n, size);
    assert.equal(items.length, n);
    for (const s of items) {
      const d = Math.hypot(s.cx - node.cx, s.cy - node.cy);
      near(d, node.radius + size * 0.3, 1e-6);
      assert.ok(d + size / 2 <= ringRadius + 1e-6);
    }
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      assert.ok(Math.hypot(items[i].cx - items[j].cx, items[i].cy - items[j].cy) >= size, `n=${n} sats ${i},${j} overlap`);
    }
  }
  const { items } = satelliteLayout(node, 4, size);
  assert.ok(items[0].cy < node.cy, "the first satellite sits in the upper half");
});
