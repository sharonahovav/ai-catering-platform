import { expect, test } from "@playwright/test";
import { openPlanner, rapidClick, route } from "./helpers.mjs";

test.describe("Gate 1 slice: overview > category > dish > quantity > add > overview", () => {
  test("happy path, history, focus and live region", async ({ page }) => {
    await openPlanner(page);
    await expect(page.locator("#summary .empty")).toBeVisible();

    await page.locator('.node[data-category-id="salads"]').click(); // pointer path on the composed scene
    await expect(page.locator("#main")).toHaveAttribute("data-view", "category");
    expect(route(page)).toBe("#/plan/menu/salads");
    await expect(page.locator("#category-title")).toBeFocused();

    await page.locator('[data-dish-id="beet_citrus_salad"]').click();
    await expect(page.locator("#dish-dialog")).toHaveAttribute("open", "");
    expect(route(page)).toBe("#/plan/menu/salads/dish/beet_citrus_salad");

    const plus = page.getByRole("button", { name: "Increase quantity" });
    await plus.click();
    await plus.click();
    await expect(page.locator("#dish-dialog output")).toHaveText("3 trays");
    // Quantity changes are view state: the order is untouched until Add.
    await expect(page.locator("#summary .order-item")).toHaveCount(0);
    await expect(page.locator("#summary .summary-note.num")).toHaveText("Order version 1");

    await rapidClick(page.locator("#dish-dialog .btn-primary"), 3);

    await expect(page.locator("#main")).toHaveAttribute("data-view", "overview");
    await expect(page.locator("#dish-dialog")).not.toHaveAttribute("open", "");
    expect(route(page)).toBe("#/plan");
    await expect(page.locator("#summary .order-item")).toHaveCount(1);
    await expect(page.locator("#summary .order-item")).toContainText("Beet & citrus salad");
    await expect(page.locator("#summary .order-item")).toContainText("× 3 trays"); // not 9: repeat clicks are one mutation
    await expect(page.locator("#summary .summary-note.num")).toHaveText("Order version 2");
    await expect(page.locator("#summary .order-item")).toBeFocused();
    await expect(page.locator("#announce")).toHaveText("Added 3 × Beet & citrus salad. Your table now has 1 dish.");
    await expect(page.locator("#summary .price-rows")).toContainText("₪330"); // 3 trays at the sample 110, calculated by the server
    await expect(page.locator("#summary")).toContainText("Estimate · VAT included");

    // History: the dish entry was replaced, so Back goes to the category (never to a stale sheet), then Forward.
    await page.goBack();
    await expect(page.locator("#main")).toHaveAttribute("data-view", "category");
    await expect(page.locator("#dish-dialog")).not.toHaveAttribute("open", "");
    expect(route(page)).toBe("#/plan/menu/salads");
    await page.goForward();
    await expect(page.locator("#main")).toHaveAttribute("data-view", "overview");
    await expect(page.locator("#summary .order-item")).toHaveCount(1);
  });

  test("browser Back closes the dish sheet; Escape closes it and returns focus to the card", async ({ page }) => {
    await openPlanner(page, "#/plan/menu/mains");
    const card = page.locator('[data-dish-id="herb_salmon"]');
    await card.click();
    await expect(page.locator("#dish-dialog")).toHaveAttribute("open", "");
    await page.goBack();
    await expect(page.locator("#dish-dialog")).not.toHaveAttribute("open", "");
    expect(route(page)).toBe("#/plan/menu/mains");

    await card.click();
    await page.keyboard.press("Escape");
    await expect(page.locator("#dish-dialog")).not.toHaveAttribute("open", "");
    expect(route(page)).toBe("#/plan/menu/mains");
    await expect(card).toBeFocused();
  });

  test("a deep link to a dish opens the sheet; Escape on a deep link stays in the app", async ({ page }) => {
    await openPlanner(page, "#/plan/menu/sides/dish/hummus");
    await expect(page.locator("#dish-dialog")).toHaveAttribute("open", "");
    await expect(page.locator("#dish-title")).toHaveText("Silky hummus");
    await page.keyboard.press("Escape");
    await expect(page.locator("#dish-dialog")).not.toHaveAttribute("open", "");
    expect(route(page)).toBe("#/plan/menu/sides"); // replaced, not popped out of the app
    await page.reload();
    await page.locator("#pane-overview .node").first().waitFor({ state: "attached" }); // wait for the app to boot
    await expect(page.locator("#main")).toHaveAttribute("data-view", "category");
  });

  test("an unavailable dish explains itself and cannot be added", async ({ page }) => {
    await openPlanner(page, "#/plan/menu/sweets/dish/pink_candies");
    const add = page.locator("#dish-dialog .btn-primary");
    await expect(add).toHaveAttribute("aria-disabled", "true");
    await expect(page.locator("#dish-dialog")).toContainText("can't be added right now");
    await add.evaluate((el) => el.click());
    await expect(page.locator("#dish-dialog")).toHaveAttribute("open", "");
    await expect(page.locator("#summary .order-item")).toHaveCount(0);
  });

  test("a failed save keeps the sheet open, leaves the order unchanged, and retry adds once", async ({ page }) => {
    await openPlanner(page, "#/plan/menu/sides/dish/hummus", "?mockFail");
    await page.locator("#dish-dialog .btn-primary").click();
    await expect(page.locator("#dish-dialog .error")).toContainText("nothing was added");
    await expect(page.locator("#dish-dialog")).toHaveAttribute("open", "");
    await expect(page.locator("#summary .order-item")).toHaveCount(0);
    await expect(page.locator("#summary .summary-note.num")).toHaveText("Order version 1");
    await page.locator("#dish-dialog .btn-primary").click(); // label is now "Try again"
    await expect(page.locator("#summary .order-item")).toHaveCount(1);
    await expect(page.locator("#summary .order-item")).toContainText("× 1 tray");
  });

  test("unknown routes fall back to the overview and say so", async ({ page }) => {
    await openPlanner(page, "#/plan/menu/nope");
    await expect(page.locator("#main")).toHaveAttribute("data-view", "overview");
    await expect(page.locator("#announce")).toContainText("couldn't find that page");
    expect(route(page)).toBe("#/plan");
  });

  test("removing an item updates the order and announces it", async ({ page }) => {
    await openPlanner(page, "#/plan/menu/sides/dish/hummus");
    await page.locator("#dish-dialog .btn-primary").click();
    await expect(page.locator("#summary .order-item")).toHaveCount(1);
    await page.getByRole("button", { name: "Remove Silky hummus from your table" }).click();
    await expect(page.locator("#summary .order-item")).toHaveCount(0);
    await expect(page.locator("#announce")).toContainText("Removed Silky hummus");
    await expect(page.locator("#summary-title")).toBeFocused(); // nothing left to focus, so the heading
  });
});
