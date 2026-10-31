import { expect, test } from "@playwright/test";
import { openPlanner, route } from "./helpers.mjs";

test.describe("keyboard and one-path-per-category", () => {
  test("wide screens: nodes are pointer-only; the text strip is the single keyboard/AT path", async ({ page }) => {
    await openPlanner(page);
    const nodes = page.locator("#pane-overview .node");
    await expect(nodes).toHaveCount(4);
    for (const n of await nodes.all()) {
      await expect(n).toHaveAttribute("aria-hidden", "true");
      await expect(n).toHaveAttribute("tabindex", "-1");
    }
    await expect(page.getByRole("link", { name: "Salads" }).first()).toBeVisible();

    // Real Tab presses: no category node is ever a tab stop, and each category is reached exactly once.
    await page.locator("#skip-link").focus();
    const seen = [];
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press("Tab");
      seen.push(
        await page.evaluate(() => {
          const a = document.activeElement;
          return { node: a.classList.contains("node"), chip: a.dataset.chipId ?? null };
        }),
      );
    }
    expect(seen.some((s) => s.node)).toBe(false);
    const chips = seen.filter((s) => s.chip).map((s) => s.chip);
    expect(chips.slice(0, 4)).toEqual(["salads", "mains", "sides", "sweets"]);
    expect(chips.filter((c) => c === "salads").length).toBeLessThanOrEqual(2); // tab loop may wrap once at most
  });

  test("focusing a chip lifts its node so keyboard users can see where they are", async ({ page }) => {
    await openPlanner(page);
    await page.locator('[data-chip-id="mains"]').focus();
    await expect(page.locator('.node[data-category-id="mains"]')).toHaveClass(/is-linked/);
    await page.locator('[data-chip-id="sides"]').focus();
    await expect(page.locator('.node[data-category-id="mains"]')).not.toHaveClass(/is-linked/);
  });

  test("keyboard-only journey: chip > category > dish sheet > Escape > Escape > focus returns to the chip", async ({ page }) => {
    await openPlanner(page);
    await page.locator('[data-chip-id="salads"]').focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#category-title")).toBeFocused();

    await page.locator('[data-dish-id="heirloom_tomato_salad"]').focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#dish-dialog")).toHaveAttribute("open", "");
    // Focus is trapped in the modal: Tab never reaches the page behind it.
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      // Tab may briefly leave the page (browser UI), but must never land on the page behind the modal.
      expect(await page.evaluate(() => !!document.activeElement.closest("#main, #summary, #topbar, #rail"))).toBe(false);
    }
    await page.keyboard.press("Escape");
    await expect(page.locator('[data-dish-id="heirloom_tomato_salad"]')).toBeFocused();

    await page.keyboard.press("Escape"); // Escape also zooms out when no sheet is open
    await expect(page.locator("#main")).toHaveAttribute("data-view", "overview");
    expect(route(page)).toBe("#/plan");
    await expect(page.locator('[data-chip-id="salads"]')).toBeFocused();
  });

  test("phones: the strip is hidden and the nodes become the labelled, focusable controls", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openPlanner(page);
    await expect(page.locator(".category-nav")).toBeHidden();
    const node = page.getByRole("button", { name: "Explore salads" });
    await expect(node).toBeVisible();
    await expect(node).not.toHaveAttribute("aria-hidden", "true");
    await node.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#category-title")).toBeFocused();
  });

  test("skip link moves focus to main without triggering a route change", async ({ page }) => {
    await openPlanner(page);
    await page.keyboard.press("Tab");
    await expect(page.locator("#skip-link")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main")).toBeFocused();
    expect(route(page)).toBe("#/plan");
  });
});
