import { expect, test } from "@playwright/test";
import { openPlanner, route } from "./helpers.mjs";

const cam = (page) =>
  page.evaluate(() => {
    const m = new DOMMatrix(getComputedStyle(document.getElementById("world")).transform);
    return { scale: m.a, x: m.e, y: m.f };
  });
const settle = (page) => page.waitForTimeout(950); // longer than the 650ms camera move
const toggle = (page) => page.locator(".explore-toggle");

test.describe("A: route-driven camera levels (desktop)", () => {
  test("overview > category > dish dollies in, orbits the dishes, and zooming back out restores the table", async ({ page }) => {
    await openPlanner(page);
    expect((await cam(page)).scale).toBe(1);
    await expect(page.locator(".sat.is-current")).toHaveCount(0);

    await page.locator('.node[data-category-id="sides"]').click();
    await expect(page.locator("#main")).toHaveAttribute("data-level", "category");
    await settle(page);
    const category = await cam(page);
    expect(category.scale).toBeGreaterThan(1.3);

    // Only the focused category's dishes orbit it; the others stay hidden.
    const visibleSats = await page.evaluate(() =>
      [...document.querySelectorAll(".sat")].filter((s) => getComputedStyle(s).visibility === "visible").map((s) => s.closest(".sat-group").dataset.for),
    );
    expect(visibleSats.length).toBeGreaterThanOrEqual(3);
    expect(new Set(visibleSats)).toEqual(new Set(["sides"]));
    // The side panel (the keyboard/AT path) lists the same dishes.
    await expect(page.locator(".hud .dish-card")).toHaveCount(visibleSats.length);

    // Clicking an orbiting dish opens it and the camera dollies in further.
    await page.locator('.sat[data-sat-id="hummus"]').click();
    await expect(page.locator("#dish-dialog")).toHaveAttribute("open", "");
    expect(route(page)).toBe("#/plan/menu/sides/dish/hummus");
    await expect(page.locator("#main")).toHaveAttribute("data-level", "dish");
    await settle(page);
    expect((await cam(page)).scale).toBeGreaterThan(category.scale);
    await expect(page.locator('.sat[data-sat-id="hummus"]')).toHaveClass(/is-current/);

    // The dish is actually on screen, to the left of the sheet.
    const box = await page.locator('.sat[data-sat-id="hummus"]').boundingBox();
    const sheet = await page.locator("#dish-dialog").boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(sheet.x + 1);

    await page.keyboard.press("Escape");
    await settle(page);
    expect(Math.abs((await cam(page)).scale - category.scale)).toBeLessThan(0.05);

    await page.getByRole("link", { name: "Back to your table" }).click();
    await settle(page);
    expect(await cam(page)).toEqual({ scale: 1, x: 0, y: 0 });
  });

  test("deep link straight to a dish frames it immediately (no animation on load)", async ({ page }) => {
    await openPlanner(page, "#/plan/menu/salads/dish/beet_citrus_salad");
    const c = await cam(page);
    expect(c.scale).toBeGreaterThan(2);
    const box = await page.locator('.sat[data-sat-id="beet_citrus_salad"]').boundingBox();
    const sheet = await page.locator("#dish-dialog").boundingBox();
    expect(box.x + box.width).toBeLessThanOrEqual(sheet.x + 1);
  });

  test("clicking another food object while zoomed travels the camera to it", async ({ page }) => {
    await openPlanner(page, "#/plan/menu/salads");
    await settle(page);
    await page.locator('.node[data-category-id="sweets"]').click({ force: true });
    await expect(page.locator("#category-title")).toHaveText("Sweets");
    expect(route(page)).toBe("#/plan/menu/sweets");
  });

  test("the keyboard path is unchanged: side-panel dish buttons open the same dish", async ({ page }) => {
    await openPlanner(page, "#/plan/menu/mains");
    await page.locator('.hud [data-dish-id="herb_salmon"]').focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#dish-title")).toHaveText("Herb-roasted salmon");
    await settle(page);
    await expect(page.locator('.sat[data-sat-id="herb_salmon"]')).toHaveClass(/is-current/);
  });

  test("orbiting dishes are pointer-only: hidden from assistive tech and never in the tab order", async ({ page }) => {
    await openPlanner(page, "#/plan/menu/salads");
    await expect(page.locator(".sats")).toHaveAttribute("aria-hidden", "true");
    for (const s of await page.locator(".sat").all()) await expect(s).toHaveAttribute("tabindex", "-1");
  });
});

test.describe("B: opt-in Explore mode (desktop)", () => {
  test("off by default: wheel and drag do nothing to the scene and the page still scrolls normally", async ({ page }) => {
    await openPlanner(page);
    await expect(toggle(page)).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator(".explore-tools")).toBeHidden();
    await page.mouse.move(640, 400);
    await page.mouse.wheel(0, -600);
    await page.mouse.down();
    await page.mouse.move(400, 300, { steps: 6 });
    await page.mouse.up();
    expect(await cam(page)).toEqual({ scale: 1, x: 0, y: 0 });
    expect(route(page)).toBe("#/plan");
  });

  test("turning it on announces itself and shows labelled controls", async ({ page }) => {
    await openPlanner(page);
    await toggle(page).click();
    await expect(toggle(page)).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "Zoom in" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Zoom out" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Reset view" })).toBeVisible();
    await expect(page.locator("#announce")).toHaveText(/Free exploration is on/);
    await expect(page.locator("#explore-hint")).toBeVisible();
  });

  test("wheel zooms toward the pointer and is bounded", async ({ page }) => {
    await openPlanner(page);
    await toggle(page).click();
    await page.mouse.move(640, 400);
    await page.mouse.wheel(0, -400);
    const zoomed = await cam(page);
    expect(zoomed.scale).toBeGreaterThan(1.2);
    for (let i = 0; i < 12; i++) await page.mouse.wheel(0, -500);
    expect((await cam(page)).scale).toBeLessThanOrEqual(6);
    for (let i = 0; i < 24; i++) await page.mouse.wheel(0, 500);
    expect((await cam(page)).scale).toBeGreaterThanOrEqual(0.75);
    expect(await page.evaluate(() => window.scrollY)).toBe(0); // the page itself never scrolled
  });

  test("dragging pans without clicking whatever it ends on; a plain click still navigates", async ({ page }) => {
    await openPlanner(page);
    await toggle(page).click();
    const node = page.locator('.node[data-category-id="salads"]');
    const b = await node.boundingBox();
    const start = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x - 120, start.y - 60, { steps: 8 });
    await page.mouse.up();
    const panned = await cam(page);
    expect(panned.x).toBeLessThan(-100);
    expect(panned.y).toBeLessThan(-40);
    expect(route(page)).toBe("#/plan"); // the drag ended on/near a node but did not open it

    await page.getByRole("button", { name: "Reset view" }).click();
    await settle(page);
    expect(await cam(page)).toEqual({ scale: 1, x: 0, y: 0 });
    await page.locator('.node[data-category-id="salads"]').click();
    await expect(page.locator("#main")).toHaveAttribute("data-level", "category");
  });

  test("keyboard parity: buttons, arrows, plus/minus and 0 all work without a pointer", async ({ page }) => {
    await openPlanner(page);
    await toggle(page).click();
    const zoomIn = page.getByRole("button", { name: "Zoom in" });
    await zoomIn.focus();
    await page.keyboard.press("Enter");
    const a = await cam(page);
    expect(a.scale).toBeGreaterThan(1.2);

    await page.keyboard.press("ArrowLeft"); // view moves left = scene moves right
    const b = await cam(page);
    expect(b.x).toBeGreaterThan(a.x);
    await page.keyboard.press("ArrowDown");
    expect((await cam(page)).y).toBeLessThan(b.y);

    await page.keyboard.press("+");
    expect((await cam(page)).scale).toBeGreaterThan(b.scale);
    await page.keyboard.press("-");
    await page.keyboard.press("-");
    expect((await cam(page)).scale).toBeLessThan(b.scale);

    await page.keyboard.press("0");
    await settle(page);
    expect(await cam(page)).toEqual({ scale: 1, x: 0, y: 0 });
    await expect(page.locator("#announce")).toHaveText("View reset.");
    await expect(zoomIn).toBeFocused(); // focus stays on the control
  });

  test("a synthetic two-finger pinch zooms (pointer events; real touch hardware not verified)", async ({ page }) => {
    await openPlanner(page);
    await toggle(page).click();
    await page.evaluate(() => {
      const main = document.getElementById("main");
      const r = main.getBoundingClientRect();
      const ev = (type, id, x, y) => main.dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: x, clientY: y, bubbles: true, cancelable: true, isPrimary: id === 1, pointerType: "touch", button: 0 }));
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      ev("pointerdown", 1, cx - 40, cy);
      ev("pointerdown", 2, cx + 40, cy);
      for (let i = 1; i <= 8; i++) {
        ev("pointermove", 1, cx - 40 - i * 15, cy);
        ev("pointermove", 2, cx + 40 + i * 15, cy);
      }
      ev("pointerup", 1, cx - 160, cy);
      ev("pointerup", 2, cx + 160, cy);
    });
    expect((await cam(page)).scale).toBeGreaterThan(2);
  });

  test("changing level re-targets the camera and drops the free adjustment", async ({ page }) => {
    await openPlanner(page);
    await toggle(page).click();
    await page.getByRole("button", { name: "Zoom in" }).click();
    await page.getByRole("button", { name: "Zoom in" }).click();
    await page.locator('[data-chip-id="mains"]').click();
    await settle(page);
    const level = await cam(page);
    await page.getByRole("button", { name: "Zoom in" }).click();
    expect((await cam(page)).scale).toBeGreaterThan(level.scale);
    await page.getByRole("button", { name: "Reset view" }).click(); // back to this level, not to the overview
    await settle(page);
    const back = await cam(page);
    expect(Math.abs(back.scale - level.scale)).toBeLessThan(0.02);
  });

  test("turning Explore off returns to the level view and removes the controls", async ({ page }) => {
    await openPlanner(page);
    await toggle(page).click();
    await page.getByRole("button", { name: "Zoom in" }).click();
    await toggle(page).click();
    await settle(page);
    expect(await cam(page)).toEqual({ scale: 1, x: 0, y: 0 });
    await expect(page.locator(".explore-tools")).toBeHidden();
    await expect(page.locator("#announce")).toHaveText("Free exploration is off.");
  });
});

test.describe("phones keep the stacked layout", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("no camera, no orbiting dishes, no Explore controls", async ({ page }) => {
    await openPlanner(page, "#/plan");
    await expect(page.locator("#explore")).toBeHidden();
    await expect(page.locator(".sats")).toBeHidden();
    expect((await cam(page)).scale).toBe(1);
    await page.getByRole("button", { name: "Explore salads" }).click();
    await expect(page.locator("#category-title")).toBeFocused();
    expect((await cam(page)).scale).toBe(1);
    await expect(page.locator(".hud .dish-card").first()).toBeVisible();
  });
});
