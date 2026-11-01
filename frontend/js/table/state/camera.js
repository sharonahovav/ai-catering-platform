// Pure camera math for the table scene: no DOM. A camera is { x, y, scale }: the world is drawn with
// `translate(x, y) scale(scale)` (origin top-left). "view" is the visible area, "world" the scene's own size.
export const LIMITS = Object.freeze({ min: 0.75, max: 6 });
export const IDENTITY = Object.freeze({ x: 0, y: 0, scale: 1 });

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Keep the scale within LIMITS and at least 30% of the world on screen on each axis (bounded, not infinite). */
export function clampCamera(cam, view, world = view) {
  const scale = clamp(cam.scale, LIMITS.min, LIMITS.max);
  const keep = 0.3;
  const x = clamp(cam.x, view.width * keep - world.width * scale, view.width * (1 - keep));
  const y = clamp(cam.y, view.height * keep - world.height * scale, view.height * (1 - keep));
  return { x, y, scale };
}

/** Zoom by `factor` keeping the world point under screen position (px, py) fixed (unless clamped). */
export function zoomAt(cam, factor, px, py, view, world = view) {
  const scale = clamp(cam.scale * factor, LIMITS.min, LIMITS.max);
  const f = scale / cam.scale;
  return clampCamera({ x: px - (px - cam.x) * f, y: py - (py - cam.y) * f, scale }, view, world);
}

export const panBy = (cam, dx, dy, view, world = view) => clampCamera({ ...cam, x: cam.x + dx, y: cam.y + dy }, view, world);

/**
 * Camera that frames `rect` (world coords) inside `region` (screen coords), filling `fill` of it, never zooming
 * out below 1 or in beyond `maxScale`. Not clamped: level targets are explicit, only free movement is bounded.
 */
export function focusRect(rect, view, { region, fill = 0.85, maxScale = 3 } = {}) {
  const r = region ?? { x: 0, y: 0, width: view.width, height: view.height };
  const scale = Math.max(1, Math.min((r.width * fill) / rect.width, (r.height * fill) / rect.height, maxScale));
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  return { x: r.x + r.width / 2 - cx * scale, y: r.y + r.height / 2 - cy * scale, scale };
}

export const toTransform = (cam) => `translate(${cam.x.toFixed(2)}px, ${cam.y.toFixed(2)}px) scale(${cam.scale.toFixed(4)})`;

/**
 * Centres of `count` satellites on a ring around a node ({cx, cy, radius}). Even spacing, the first one in the upper half.
 * Returns { items: [{cx, cy}], ringRadius } where ringRadius bounds the whole constellation.
 */
export function satelliteLayout(node, count, size) {
  const distance = node.radius + size * 0.3; // overlap the node's edge so they read as orbiting it, and the ring stays compact
  const items = Array.from({ length: count }, (_, i) => {
    const angle = ((-90 + ((i + 0.5) * 360) / count) * Math.PI) / 180;
    return { cx: node.cx + distance * Math.cos(angle), cy: node.cy + distance * Math.sin(angle) };
  });
  return { items, ringRadius: distance + size / 2 };
}
