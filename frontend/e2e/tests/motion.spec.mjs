import { expect, test } from "@playwright/test";
import { openPlanner } from "./helpers.mjs";

// The camera is the transform on #world. Read its scale from the computed matrix.
const worldScale = (page) =>
  page.evaluate(() => new DOMMatrix(getComputedStyle(document.getElementById("world")).transform).a);

test("full motion: entering a category animates the camera in (transition set, scale settles above 1)", async ({ page }) => {
  await openPlanner(page);
  expect(await worldScale(page)).toBe(1);
  await page.locator('.node[data-category-id="salads"]').click();
  await expect(page.locator("#main")).toHaveAttribute("data-view", "category");
  const transition = await page.evaluate(() => getComputedStyle(document.getElementById("world")).transitionDuration);
  expect(parseFloat(transition)).toBeGreaterThan(0.3); // animated, not a jump cut
  await page.waitForTimeout(900);
  expect(await worldScale(page)).toBeGreaterThan(1.15);
});

test.describe("prefers-reduced-motion: reduce", () => {
  test.use({ reducedMotion: "reduce" });

  test("the camera jumps (no animated movement) and nothing is lost", async ({ page }) => {
    await openPlanner(page);
    await page.locator('.node[data-category-id="salads"]').click();
    await expect(page.locator("#main")).toHaveAttribute("data-view", "category");
    await expect(page.locator("#category-title")).toBeFocused();
    await page.waitForTimeout(250); // longer than the 120ms fade
    expect(await worldScale(page)).toBeGreaterThan(1.15); // same end state as full motion
    const durations = await page.evaluate(() => ({
      world: getComputedStyle(document.getElementById("world")).transitionDuration,
      ui: getComputedStyle(document.documentElement).getPropertyValue("--motion-ui").trim(),
      sat: getComputedStyle(document.querySelector(".sat")).transitionDuration,
    }));
    expect(durations.ui).toBe("0ms");
    expect(parseFloat(durations.world)).toBe(0);
    for (const d of durations.sat.split(",")) expect(parseFloat(d)).toBe(0);
  });

  test("dish sheet opens without a slide animation and the add flow works", async ({ page }) => {
    await openPlanner(page, "#/plan/menu/sides");
    await page.locator('[data-dish-id="hummus"]').click();
    const animation = await page.evaluate(() => getComputedStyle(document.getElementById("dish-dialog")).animationName);
    expect(animation).toBe("none");
    await page.locator("#dish-dialog .btn-primary").click();
    await expect(page.locator("#summary .order-item")).toHaveCount(1);
  });
});
