import { expect, test } from "@playwright/test";
import { openPlanner } from "./helpers.mjs";

const CATEGORY_IDS = ["salads", "hors_doeuvres", "mains", "sides", "sweets", "soft_drinks", "wine_cocktails"];
const settle = (page) => page.waitForTimeout(950);
const sceneColor = (page) => page.evaluate(() => getComputedStyle(document.getElementById("main")).getPropertyValue("--scene-b").trim());
const propTransform = (page, layer) =>
  page.evaluate((sel) => new DOMMatrix(getComputedStyle(document.querySelector(sel)).transform), `.${layer} .prop`).then((m) => ({ x: m.e, y: m.f, k: m.a }));

test.describe("a bigger, richer menu", () => {
  test("seven categories, each with its own food object and a text path", async ({ page }) => {
    await openPlanner(page);
    await expect(page.locator("#pane-overview .node")).toHaveCount(7);
    const chips = page.locator(".category-list a");
    await expect(chips).toHaveText(["Salads", "Hors d'oeuvres", "Main dishes", "Sides", "Sweets", "Soft drinks", "Wine & cocktails"]);
    for (const id of CATEGORY_IDS) await expect(page.locator(`.node[data-category-id="${id}"]`)).toBeVisible();
  });

  test("the seven food objects never overlap each other at common desktop sizes", async ({ page }) => {
    for (const [w, h] of [[1280, 720], [1440, 900], [1920, 1080], [1024, 768]]) {
      await page.setViewportSize({ width: w, height: h });
      await openPlanner(page);
      await page.waitForTimeout(1500); // entrance animation
      const boxes = await page.locator("#pane-overview .node").evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { id: e.dataset.categoryId, l: r.left, t: r.top, r: r.right, b: r.bottom }; }));
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        const overlap = Math.min(a.r, b.r) - Math.max(a.l, b.l) > 6 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 6;
        expect(overlap, `${a.id} overlaps ${b.id} at ${w}x${h}`).toBe(false);
      }
    }
  });

  test("layout guards: the strip stops before Explore, the hero text is clear, labels fit, props stay behind panels", async ({ page }) => {
    for (const [w, h] of [[900, 700], [1024, 768], [1100, 700], [1280, 720], [1330, 740], [1440, 900], [1920, 1080]]) {
      await page.setViewportSize({ width: w, height: h });
      await openPlanner(page, "#/plan", `?g=${w}`);
      await page.waitForTimeout(1600);
      const r = await page.evaluate(() => {
        const box = (el) => { const b = el.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom }; };
        const hit = (a, b, pad = 0) => Math.min(a.r, b.r) - Math.max(a.l, b.l) > pad && Math.min(a.b, b.b) - Math.max(a.t, b.t) > pad;
        const explore = box(document.querySelector(".explore-toggle"));
        const chips = [...document.querySelectorAll(".category-list a")].map(box);
        const text = [...document.querySelectorAll(".intro .eyebrow, .intro .display, .intro .lead")].map((e) => { const rg = document.createRange(); rg.selectNodeContents(e); return box(rg); });
        const nodes = [...document.querySelectorAll(".node")].map((e) => ({ id: e.dataset.categoryId, ...box(e) }));
        const props = [...document.querySelectorAll(".prop")].map(box);
        const stage = box(document.getElementById("main"));
        const labels = [...document.querySelectorAll(".node-label")].map(box);
        return {
          chipUnderExplore: chips.some((c) => hit(c, explore)),
          textHitNode: nodes.filter((n) => text.some((t) => hit(t, n, 4))).map((n) => n.id),
          textHitProp: props.some((p) => text.some((t) => hit(t, p, 8))),
          labelOutside: labels.filter((l) => l.b > stage.b || l.l < stage.l || l.r > stage.r).length,
          zOrder: [getComputedStyle(document.getElementById("pane-overview")).zIndex, getComputedStyle(document.getElementById("pane-category")).zIndex, getComputedStyle(document.getElementById("pane-page")).zIndex].map(Number),
        };
      });
      const where = `${w}x${h}`;
      expect(r.chipUnderExplore, `strip under Explore at ${where}`).toBe(false);
      expect(r.textHitNode, `hero text overlaps a food object at ${where}`).toEqual([]);
      expect(r.textHitProp, `a prop sits on the hero text at ${where}`).toBe(false);
      expect(r.labelOutside, `labels cut off at ${where}`).toBe(0);
      expect(r.zOrder[0] < r.zOrder[1] && r.zOrder[1] < r.zOrder[2], "panes stack overview < category < page").toBe(true);
    }
  });

  test("every category lists its dishes and each dish opens", async ({ page }) => {
    await openPlanner(page);
    for (const id of CATEGORY_IDS) {
      await page.locator(`[data-chip-id="${id}"]`).click();
      await expect(page.locator("#main")).toHaveAttribute("data-cat", id);
      expect(await page.locator(".hud .dish-card").count()).toBeGreaterThanOrEqual(3);
      await page.getByRole("link", { name: "Back to your table" }).click();
      await expect(page.locator("#main")).toHaveAttribute("data-view", "overview");
    }
  });
});

test.describe("dramatic, but driven by the camera and never by the pointer", () => {
  test("each category gets its own backdrop, and the table returns to neutral", async ({ page }) => {
    await openPlanner(page);
    const neutral = await sceneColor(page);
    const seen = new Set();
    for (const id of CATEGORY_IDS) {
      await page.locator(`[data-chip-id="${id}"]`).click();
      await settle(page);
      const c = await sceneColor(page);
      expect(c).not.toBe(neutral);
      seen.add(c);
      await page.getByRole("link", { name: "Back to your table" }).click();
      await settle(page);
    }
    expect(seen.size).toBe(7); // seven distinct backdrops
    expect(await sceneColor(page)).toBe(neutral);
  });

  test("props sit at different depths and move at different rates when the camera moves (parallax)", async ({ page }) => {
    await openPlanner(page);
    await page.waitForTimeout(1200);
    const backBefore = await propTransform(page, "backdrop");
    const frontBefore = await propTransform(page, "frontdrop");
    await page.locator('[data-chip-id="wine_cocktails"]').click();
    await settle(page);
    const back = await propTransform(page, "backdrop");
    const front = await propTransform(page, "frontdrop");
    const backMoved = Math.hypot(back.x - backBefore.x, back.y - backBefore.y);
    const frontMoved = Math.hypot(front.x - frontBefore.x, front.y - frontBefore.y);
    expect(backMoved).toBeGreaterThan(5);
    expect(frontMoved).toBeGreaterThan(backMoved * 1.5); // nearer layers travel further
    expect(front.k).toBeLessThanOrEqual(2.4); // bounded: a prop can never swallow the screen
  });

  test("moving the pointer around does nothing to the scene (no pointer-driven parallax or hijack)", async ({ page }) => {
    await openPlanner(page);
    await page.waitForTimeout(1200);
    const before = await propTransform(page, "frontdrop");
    for (const [x, y] of [[300, 300], [900, 200], [600, 600], [1000, 500]]) await page.mouse.move(x, y, { steps: 5 });
    const after = await propTransform(page, "frontdrop");
    expect(after).toEqual(before);
  });

  test("the nodes arrive in a staggered entrance and then rest", async ({ page }) => {
    await page.goto("/table/");
    await page.locator("#pane-overview .node").first().waitFor({ state: "attached" });
    const delays = await page.locator("#pane-overview .node").evaluateAll((els) => els.map((e) => parseFloat(getComputedStyle(e).animationDelay)));
    expect(new Set(delays).size).toBe(7); // each one starts at its own moment
    expect(delays[6]).toBeGreaterThan(delays[0]);
    await page.waitForTimeout(2200);
    const opacities = await page.locator("#pane-overview .node").evaluateAll((els) => els.map((e) => getComputedStyle(e).opacity));
    expect(opacities.every((o) => o === "1")).toBe(true);
  });

  test("adding a dish flies it to the summary, and nothing is left on screen afterwards", async ({ page }) => {
    await openPlanner(page, "#/plan/menu/hors_doeuvres/dish/bruschetta");
    await page.locator("#dish-dialog .btn-primary").click();
    await expect(page.locator("#summary .order-item")).toHaveCount(1); // the order changed first
    await expect.poll(() => page.locator(".fly-clone").count(), { timeout: 3000 }).toBe(0);
    await expect(page.locator("#summary .order-item")).toContainText("Mini bruschetta");
  });
});

test.describe("alcohol is mock-only and clearly labelled", () => {
  test("wine and cocktails carry an alcohol label on the card, in the sheet, and on the review page", async ({ page }) => {
    await openPlanner(page, "#/plan/menu/wine_cocktails");
    await expect(page.locator(".hud .dish-card").first()).toContainText("Contains alcohol · demo");
    await page.locator('.hud [data-dish-id="red_wine"]').click();
    await expect(page.locator("#dish-dialog")).toContainText("Contains alcohol (demo)");
    await expect(page.locator("#dish-dialog")).toContainText("Age verification, licensing and kosher-wine rules aren't set up");
    await page.locator("#dish-dialog .btn-primary").click();
    await expect(page.locator("#summary .order-item")).toHaveCount(1);
    await page.getByRole("link", { name: "Review", exact: true }).click();
    await expect(page.locator(".review-section").first()).toContainText("Your request includes alcohol");
  });

  test("soft drinks are not labelled as alcohol", async ({ page }) => {
    await openPlanner(page, "#/plan/menu/soft_drinks");
    await expect(page.locator(".hud .dish-card")).toHaveCount(3);
    await expect(page.locator(".hud")).not.toContainText("alcohol");
  });

  test("the guide never proposes alcohol, even after every other dish is on the table", async ({ page }) => {
    test.setTimeout(120_000); // ~22 propose/approve cycles at the mock's simulated latency
    await openPlanner(page);
    const suggest = page.getByRole("button", { name: "Suggest a dish" });
    for (let i = 0; i < 40; i++) {
      await suggest.click();
      // either a proposal appears or the guide says there is nothing left to suggest
      await expect(page.locator(".proposal, #assistant .error")).toBeVisible();
      if (await page.locator("#assistant .error").isVisible()) break;
      const name = await page.locator(".proposal dt").first().textContent();
      expect(name).not.toMatch(/wine|spritz/i);
      await page.getByRole("button", { name: "Approve change" }).click();
      await expect(page.locator("#proposal-title")).toHaveText("Change applied");
      await page.getByRole("button", { name: "Dismiss" }).click();
    }
    await expect(page.locator("#assistant")).toContainText("no more dishes to suggest");
    await expect(page.locator("#summary .order-item", { hasText: /wine|spritz/i })).toHaveCount(0);
  });
});

test.describe("phones and reduced motion", () => {
  test("phones: no depth props, all seven categories reachable as labelled buttons", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openPlanner(page);
    await expect(page.locator(".backdrop")).toBeHidden();
    await expect(page.locator(".frontdrop")).toBeHidden();
    for (const name of ["salads", "hors d'oeuvres", "main dishes", "sides", "sweets", "soft drinks", "wine & cocktails"]) {
      await expect(page.getByRole("button", { name: `Explore ${name}` })).toBeVisible();
    }
  });

  test.describe("prefers-reduced-motion: reduce", () => {
    test.use({ reducedMotion: "reduce" });
    test("no entrance, drift or flying image; everything is still there", async ({ page }) => {
      await openPlanner(page);
      const anim = await page.evaluate(() => ({
        node: getComputedStyle(document.querySelector(".node")).animationName,
        img: getComputedStyle(document.querySelector(".node img")).animationName,
        stage: getComputedStyle(document.getElementById("main")).transitionDuration,
      }));
      expect(anim.node).toBe("none");
      expect(anim.img).toBe("none");
      expect(parseFloat(anim.stage)).toBe(0);
      await page.goto("/table/#/plan/menu/sides/dish/hummus");
      await page.locator("#dish-dialog .btn-primary").click();
      await expect(page.locator("#summary .order-item")).toHaveCount(1);
      await expect(page.locator(".fly-clone")).toHaveCount(0);
    });
  });
});
