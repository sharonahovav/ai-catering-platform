import { expect, test } from "@playwright/test";
import { openPlanner, route } from "./helpers.mjs";

const DATE = "2027-03-15"; // a Monday

async function addFromSheet(page, hash, clicksOnPlus = 0) {
  await page.goto(`/table/${hash}`);
  await page.locator("#dish-dialog .stepper").waitFor();
  for (let i = 0; i < clicksOnPlus; i++) await page.getByRole("button", { name: "Increase quantity" }).click();
  await page.locator("#dish-dialog .btn-primary").click();
  await expect(page.locator("#summary .order-item").last()).toBeVisible();
}

test.describe("prices, units and totals (sample numbers, calculated by the server)", () => {
  test("cards and the sheet show the unit price in the dish's own unit, VAT included", async ({ page }) => {
    await openPlanner(page, "#/plan/menu/hors_doeuvres");
    await expect(page.locator('.hud [data-dish-id="bruschetta"]').locator("xpath=ancestor::article")).toContainText("₪9 per piece");
    await page.locator('.hud [data-dish-id="bruschetta"]').click();
    await expect(page.locator("#dish-dialog .facts")).toContainText("₪9 per piece · VAT included");
    await page.keyboard.press("Escape");
    await page.getByRole("link", { name: "Back to your table" }).click();
    await page.locator('[data-chip-id="mains"]').click();
    await expect(page.locator(".hud")).toContainText("₪16 per 100 g");
    await expect(page.locator(".hud")).toContainText("₪200 per tray");
  });

  test("quantity steps follow the unit: pieces in sixes, weight in 500 g steps, trays singly", async ({ page }) => {
    await openPlanner(page, "#/plan/menu/hors_doeuvres/dish/bruschetta");
    const out = page.locator("#dish-dialog output");
    await expect(out).toHaveText("6 pieces"); // the minimum
    await page.getByRole("button", { name: "Increase quantity" }).click();
    await expect(out).toHaveText("12 pieces");
    await page.getByRole("button", { name: "Decrease quantity" }).click();
    await expect(out).toHaveText("6 pieces");
    await expect(page.getByRole("button", { name: "Decrease quantity" })).toHaveAttribute("aria-disabled", "true");
    await page.getByRole("button", { name: "Decrease quantity" }).click({ force: true }); // pressing a disabled control does nothing
    await expect(out).toHaveText("6 pieces"); // cannot go under the minimum

    await page.goto("/table/#/plan/menu/mains/dish/sauteed_mushrooms");
    await expect(out).toHaveText("500 g");
    await page.getByRole("button", { name: "Increase quantity" }).click();
    await page.getByRole("button", { name: "Increase quantity" }).click();
    await expect(out).toHaveText("1.5 kg");

    await page.goto("/table/#/plan/menu/sides/dish/hummus");
    await expect(out).toHaveText("1 tray");
    await page.getByRole("button", { name: "Increase quantity" }).click();
    await expect(out).toHaveText("2 trays");
  });

  test("the summary prices each line and the whole order, and re-prices on removal", async ({ page }) => {
    await openPlanner(page, "#/plan/menu/sides/dish/hummus");
    await page.getByRole("button", { name: "Increase quantity" }).click();
    await page.locator("#dish-dialog .btn-primary").click();
    const rows = page.locator("#summary .order-item");
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("× 2 trays · ₪170");
    await expect(page.locator("#summary .price-rows")).toContainText("₪170");
    await expect(page.locator("#summary .price-box")).toContainText("Estimate · VAT included · delivery fee not included yet");
    await page.getByRole("button", { name: "Remove Silky hummus from your table" }).click();
    await expect(page.locator("#summary .price-box")).toBeHidden(); // an empty order shows no price at all, never a zero
  });

  test("delivery adds the chosen area's fixed fee; pickup adds none", async ({ page }) => {
    await openPlanner(page, "#/plan/menu/mains/dish/herb_salmon"); // 1 tray at 200
    await page.locator("#dish-dialog .btn-primary").click();
    await expect(page.locator("#summary .order-item")).toHaveCount(1);
    await page.getByRole("link", { name: "Event", exact: true }).click();
    await page.getByLabel("Pickup", { exact: true }).check();
    await page.getByRole("button", { name: "Save details" }).click();
    await expect(page.locator(".form-status")).toHaveText("Details saved.");
    await expect(page.locator("#summary .price-rows")).toContainText("None (pickup)");
    await expect(page.locator("#summary .price-rows .total")).toHaveText("₪200");

    await page.getByLabel("Delivery", { exact: true }).check();
    await page.getByRole("button", { name: "Save details" }).click();
    await expect(page.locator("#summary .price-rows")).toContainText("Choose delivery area"); // no fee is guessed
    await page.getByLabel("Delivery area").selectOption("herzliya");
    await page.getByRole("button", { name: "Save details" }).click();
    await expect(page.locator("#summary .price-rows .total")).toHaveText("₪290"); // 200 + the sample 90 fee
    await page.getByLabel("Delivery area").selectOption("tel_aviv");
    await page.getByRole("button", { name: "Save details" }).click();
    await expect(page.locator("#summary .price-rows .total")).toHaveText("₪260"); // a different fixed fee per area
  });

  test("the delivery minimum blocks sending until the order is big enough, and names the amount", async ({ page }) => {
    await openPlanner(page, "#/plan/menu/sides/dish/hummus"); // 85: far under the sample 500 minimum
    await page.locator("#dish-dialog .btn-primary").click();
    await page.getByRole("link", { name: "Event", exact: true }).click();
    await page.getByLabel("Delivery", { exact: true }).check();
    await page.getByRole("button", { name: "Save details" }).click();
    await page.getByRole("link", { name: "Review", exact: true }).click();
    await expect(page.locator(".missing")).toContainText("Add dishes worth at least ₪500 for delivery");
    await expect(page.getByRole("button", { name: "Request a quote" })).toHaveAttribute("aria-disabled", "true");
    // pickup has no minimum
    await page.getByRole("link", { name: "Event", exact: true }).click();
    await page.getByLabel("Pickup", { exact: true }).check();
    await page.getByRole("button", { name: "Save details" }).click();
    await page.getByRole("link", { name: "Review", exact: true }).click();
    await expect(page.locator(".missing")).not.toContainText("worth at least");
  });

  test("a sent request keeps its price: the review shows the frozen estimate", async ({ page }) => {
    await openPlanner(page, "#/plan/menu/sides/dish/hummus");
    await page.locator("#dish-dialog .btn-primary").click();
    await page.getByRole("link", { name: "Event", exact: true }).click();
    await page.getByLabel("Full name").fill("Dana Levi");
    await page.getByLabel("Mobile number").fill("0501234567");
    await page.getByLabel("Event type").selectOption("family");
    await page.getByLabel("Event date").fill(DATE);
    await page.getByLabel("Pickup", { exact: true }).check();
    await page.getByLabel("Time window").selectOption({ index: 2 });
    await page.getByRole("button", { name: "Save details" }).click();
    await expect(page.locator(".form-status")).toHaveText("Details saved.");
    await page.getByRole("link", { name: "Guests", exact: true }).click();
    await page.getByLabel("Adults").fill("6");
    await page.getByRole("button", { name: "Save details" }).click();
    await expect(page.locator(".form-status")).toHaveText("Details saved.");
    await page.getByRole("link", { name: "Review", exact: true }).click();
    await page.getByRole("button", { name: "Request a quote" }).click();
    await expect(page.locator(".status-banner")).toContainText("Pending business approval");
    await expect(page.locator(".price-line")).toContainText("₪85 · Estimate · VAT included");
    await expect(page.locator(".review-list")).toContainText("× 1 tray · ₪85");
    await expect(page.locator("#summary .price-rows .total")).toHaveText("₪85");
    expect(route(page)).toBe("#/plan/review");
  });

  test("an approved suggestion changes the total by exactly the price effect shown", async ({ page }) => {
    await openPlanner(page);
    await page.getByRole("button", { name: "Suggest a dish" }).click();
    await expect(page.locator(".proposal")).toContainText("+₪110");
    await page.getByRole("button", { name: "Approve change" }).click();
    await expect(page.locator("#proposal-title")).toHaveText("Change applied");
    await expect(page.locator("#summary .price-rows .total")).toHaveText("₪110");
    await page.getByRole("button", { name: "Dismiss" }).click();
    await page.getByRole("button", { name: "Suggest a dish" }).click();
    await expect(page.locator(".proposal")).toContainText("+₪95"); // next dish: heirloom tomato salad, 1 tray at 95
    await page.getByRole("button", { name: "Approve change" }).click();
    await expect(page.locator("#summary .price-rows .total")).toHaveText("₪205");
  });
});
