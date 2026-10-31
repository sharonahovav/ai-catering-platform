import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { openPlanner } from "./helpers.mjs";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

async function scan(page, label) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
  expect(summary, `axe violations: ${label}`).toEqual([]);
}

for (const [name, size] of [
  ["desktop", { width: 1280, height: 720 }],
  ["phone", { width: 390, height: 844 }],
]) {
  test.describe(`axe: ${name}`, () => {
    test.use({ viewport: size });

    test("overview", async ({ page }) => {
      await openPlanner(page);
      await scan(page, "overview");
    });
    test("category", async ({ page }) => {
      await openPlanner(page, "#/plan/menu/salads");
      // axe measures the current scroll position; a sticky bottom bar can cover a card at the fold, so scroll first.
      await page.locator('[data-dish-id="beet_citrus_salad"]').scrollIntoViewIfNeeded();
      await scan(page, "category");
    });
    test("dish sheet", async ({ page }) => {
      await openPlanner(page, "#/plan/menu/salads/dish/beet_citrus_salad");
      await expect(page.locator("#dish-dialog")).toHaveAttribute("open", "");
      await scan(page, "dish sheet");
    });
    test("dish sheet: unavailable", async ({ page }) => {
      await openPlanner(page, "#/plan/menu/sweets/dish/pink_candies");
      await scan(page, "unavailable dish");
    });
    test("dish sheet: error state", async ({ page }) => {
      await openPlanner(page, "#/plan/menu/sides/dish/hummus", "?mockFail");
      await page.locator("#dish-dialog .btn-primary").click();
      await expect(page.locator("#dish-dialog .error")).toBeVisible();
      await scan(page, "error state");
    });
    test("order summary with items", async ({ page }) => {
      await openPlanner(page, "#/plan/menu/sides/dish/hummus");
      await page.locator("#dish-dialog .btn-primary").click();
      await expect(page.locator("#summary .order-item")).toHaveCount(1);
      if (size.width < 900) await page.locator(".table-toggle").click();
      await scan(page, "summary with items");
    });
  });
}

test.describe("axe: desktop camera states", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test("explore mode on (overview)", async ({ page }) => {
    await openPlanner(page);
    await page.locator(".explore-toggle").click();
    await expect(page.locator(".explore-tools")).toBeVisible();
    await scan(page, "explore on, overview");
  });
  test("explore mode on, zoomed category", async ({ page }) => {
    await openPlanner(page, "#/plan/menu/sides");
    await page.locator(".explore-toggle").click();
    await page.getByRole("button", { name: "Zoom in" }).click();
    await page.waitForTimeout(300);
    await scan(page, "explore on, category");
  });
});
