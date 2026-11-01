import { expect } from "@playwright/test";

/** Open the planner and wait until it has booted (overview nodes exist). */
export async function openPlanner(page, hash = "#/plan", query = "") {
  await page.goto(`/table/${query}${hash}`);
  await page.locator("#pane-overview .node").first().waitFor({ state: "attached" });
  await expect(page.locator("#main")).toHaveAttribute("data-view", /overview|category|page/);
}

/** Rapid clicks on a control, bypassing actionability waits (the control is aria-disabled while saving). */
export const rapidClick = (locator, times = 3) =>
  locator.evaluate((el, n) => {
    for (let i = 0; i < n; i++) el.click();
  }, times);

export const route = (page) => new URL(page.url()).hash;
