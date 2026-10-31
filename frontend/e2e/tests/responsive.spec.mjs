import { expect, test } from "@playwright/test";
import { openPlanner } from "./helpers.mjs";

const VIEWPORTS = [
  [320, 640], [360, 740], [390, 844], [430, 932], [768, 1024], [1024, 768], [1280, 720], [1440, 900], [1920, 1080],
  [844, 390], // short landscape phone
];
const STATES = [
  ["overview", "#/plan"],
  ["category", "#/plan/menu/salads"],
  ["dish sheet", "#/plan/menu/salads/dish/beet_citrus_salad"],
];

for (const [w, h] of VIEWPORTS) {
  for (const [name, hash] of STATES) {
    test(`${name} at ${w}x${h}: no horizontal scroll, readable text, 44px targets`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await openPlanner(page, hash);
      await page.waitForTimeout(150);

      const report = await page.evaluate(() => {
        const visible = (el) => {
          const r = el.getBoundingClientRect();
          const s = getComputedStyle(el);
          return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
        };
        const overflow = document.documentElement.scrollWidth - window.innerWidth;
        const small = [];
        for (const el of document.querySelectorAll("body *")) {
          if (!visible(el) || el.closest("[aria-hidden='true']") || el.closest("svg") || el.closest("[inert]")) continue;
          const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
          if (hasText && parseFloat(getComputedStyle(el).fontSize) < 13.5) small.push(el.className || el.tagName);
        }
        const tiny = [];
        for (const el of document.querySelectorAll(".btn, .chip, .rail-btn, .icon-btn, .stepper button, .remove, .category-list a")) {
          if (!visible(el) || el.closest("[inert]")) continue;
          const r = el.getBoundingClientRect();
          if (r.width < 43.5 || r.height < 43.5) tiny.push(`${el.className || el.tagName} ${Math.round(r.width)}x${Math.round(r.height)}`);
        }
        return { overflow, small, tiny };
      });
      expect(report.overflow, "horizontal overflow (px)").toBeLessThanOrEqual(0);
      expect(report.small, "text below 14px").toEqual([]);
      expect(report.tiny, "targets under 44px").toEqual([]);
    });
  }
}

test("200% text zoom equivalent (320px wide, 2x root font) keeps everything reachable", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await openPlanner(page, "#/plan/menu/salads");
  await page.addStyleTag({ content: "html{font-size:200%}" });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await page.locator('[data-dish-id="beet_citrus_salad"]').scrollIntoViewIfNeeded();
  await page.locator('[data-dish-id="beet_citrus_salad"]').click();
  await expect(page.locator("#dish-dialog .btn-primary")).toBeVisible();
});

test("phones: summary sheet is inert until opened, then focus goes to its heading and Escape closes it", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPlanner(page, "#/plan/menu/sides/dish/hummus");
  await page.locator("#dish-dialog .btn-primary").click();
  await expect(page.locator("#summary")).toHaveJSProperty("inert", true);
  const toggle = page.locator(".table-toggle");
  await expect(toggle).toHaveText("Your table (1)");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#summary-title")).toBeFocused();
  await expect(page.locator("#summary .order-item")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toBeFocused();
});
