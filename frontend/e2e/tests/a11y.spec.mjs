import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { openPlanner } from "./helpers.mjs";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

async function scan(page, label) {
  // The sticky phone nav can cover a control at whatever scroll position axe happens to measure (it differs by font/platform).
  // Real use is covered by scroll-padding (focus never lands under it), so measure the content itself.
  await page.addStyleTag({ content: ".rail { position: static !important; }" });
  // Entrance fades are transient (colour contrast is meaningless mid-fade), so scan once finite animations are done.
  await page.waitForFunction(() => document.getAnimations().every((a) => a.effect?.getTiming().iterations === Infinity || a.playState !== "running"));
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

// ---- Gate 2: forms, review, and the table guide ----
async function completeOrder(page) {
  await page.goto("/table/#/plan/menu/sides/dish/hummus");
  await page.locator("#pane-overview .node").first().waitFor({ state: "attached" });
  await page.locator("#dish-dialog .btn-primary").click();
  await expect(page.locator("#summary-title")).toBeAttached();
  await page.getByRole("link", { name: "Event", exact: true }).click();
  await page.getByLabel("Full name").fill("Dana Levi");
  await page.getByLabel("Mobile number").fill("050-123-4567");
  await page.getByLabel("Event type").selectOption("birthday");
  await page.getByLabel("Event date").fill("2027-03-15");
  await page.getByLabel("Pickup", { exact: true }).check();
  await page.getByLabel("Time window").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Save details" }).click();
  await expect(page.locator(".form-status")).toHaveText("Details saved.");
  await page.getByRole("link", { name: "Guests", exact: true }).click();
  await page.getByLabel("Adults").fill("8");
  await page.getByRole("button", { name: "Save details" }).click();
  await expect(page.locator(".form-status")).toHaveText("Details saved.");
}

for (const [name, size] of [
  ["desktop", { width: 1280, height: 720 }],
  ["phone", { width: 390, height: 844 }],
]) {
  test.describe(`axe gate 2: ${name}`, () => {
    test.use({ viewport: size });

    test("event form", async ({ page }) => {
      await openPlanner(page, "#/plan/event");
      // axe measures the current scroll position; a sticky bottom bar can cover a field at the fold, so scroll first.
      await page.getByLabel("Anything else").scrollIntoViewIfNeeded();
      await scan(page, "event form");
    });
    test("guests form", async ({ page }) => { await openPlanner(page, "#/plan/guests"); await scan(page, "guests form"); });
    test("event form with validation errors", async ({ page }) => {
      await openPlanner(page, "#/plan/event");
      await page.getByLabel("Event date").fill("2020-01-01");
      await page.getByRole("button", { name: "Save details" }).click();
      await expect(page.locator(".error-summary")).toBeVisible();
      await scan(page, "event form errors");
    });
    test("review: incomplete", async ({ page }) => { await openPlanner(page, "#/plan/review"); await scan(page, "review incomplete"); });
    test("review: ready to send", async ({ page }) => {
      await openPlanner(page);
      await completeOrder(page);
      await page.getByRole("link", { name: "Review", exact: true }).click();
      await expect(page.getByRole("button", { name: "Request a quote" })).toHaveAttribute("aria-disabled", "false");
      await scan(page, "review ready");
    });
    test("review: pending business approval, and locked forms", async ({ page }) => {
      await openPlanner(page);
      await completeOrder(page);
      await page.getByRole("link", { name: "Review", exact: true }).click();
      await page.getByRole("button", { name: "Request a quote" }).click();
      await expect(page.locator(".status-banner")).toContainText("Pending business approval");
      await scan(page, "review pending");
      await page.getByRole("link", { name: "Event", exact: true }).click();
      await scan(page, "locked form");
    });
    test("table guide: proposal, then applied", async ({ page }) => {
      await openPlanner(page);
      if (size.width < 900) await page.locator(".table-toggle").click();
      await page.getByRole("button", { name: "Suggest a dish" }).click();
      await expect(page.locator(".proposal")).toBeVisible();
      await scan(page, "proposal");
      await page.getByRole("button", { name: "Approve change" }).click();
      await expect(page.locator("#proposal-title")).toHaveText("Change applied");
      await scan(page, "proposal applied");
    });
  });
}
