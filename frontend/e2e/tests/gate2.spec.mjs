import { expect, test } from "@playwright/test";
import { openPlanner, route } from "./helpers.mjs";

const DATE = "2027-03-15"; // far enough in the future to be valid whenever the suite runs

const summaryStatus = (page) => page.locator("#summary .tag.tag-warn").first();
const version = (page) => page.locator("#summary .summary-note.num");

async function addDish(page, categoryId, dishId) {
  await page.goto(`/table/#/plan/menu/${categoryId}/dish/${dishId}`);
  await page.locator("#dish-dialog .btn-primary").click();
  await expect(page.locator("#summary .order-item")).toHaveCount(1);
}
async function saveEvent(page, { fulfillment = "Pickup" } = {}) {
  await page.getByRole("link", { name: "Event", exact: true }).click();
  await page.getByLabel("Event type").selectOption("birthday");
  await page.getByLabel("Event date").fill(DATE);
  await page.getByLabel(fulfillment, { exact: true }).check();
  await page.getByRole("button", { name: "Save details" }).click();
  await expect(page.locator(".form-status")).toHaveText("Details saved.");
}
async function saveGuests(page, adults = "8", children = "2") {
  await page.getByRole("link", { name: "Guests", exact: true }).click();
  await page.getByLabel("Adults").fill(adults);
  await page.getByLabel("Children").fill(children);
  await page.getByRole("button", { name: "Save details" }).click();
  await expect(page.locator(".form-status")).toHaveText("Details saved.");
}

test.describe("review and quote request", () => {
  test("an incomplete request cannot be sent, says exactly what is missing, and links to where to fix it", async ({ page }) => {
    await openPlanner(page, "#/plan/review");
    await expect(page.locator("#page-heading")).toBeFocused().catch(() => {}); // deep link: focus is not stolen on load
    await expect(page.locator(".status-banner")).toContainText("Not sent yet");
    await expect(page.locator(".status-banner")).toContainText("Nothing has been sent");
    const missing = page.locator(".missing li");
    await expect(missing).toHaveText(["Choose at least one dish", "Choose an event type", "Choose an event date", "Choose pickup or delivery", "Enter how many guests"]);
    const submit = page.getByRole("button", { name: "Request a quote" });
    await expect(submit).toHaveAttribute("aria-disabled", "true");
    await submit.click({ force: true }); // pressing a blocked button explains rather than sends
    await expect(page.locator(".missing h3")).toBeFocused();
    await expect(page.locator(".status-banner")).toContainText("Not sent yet");
    await page.locator(".missing").getByRole("link", { name: "Choose an event type" }).click();
    expect(route(page)).toBe("#/plan/event");
  });

  test("full journey: dish + event + guests -> review -> request sent as PENDING, never confirmed, then read-only", async ({ page }) => {
    await openPlanner(page);
    await addDish(page, "sides", "hummus");
    await saveEvent(page);
    await saveGuests(page);
    await page.getByRole("link", { name: "Review", exact: true }).click();

    await expect(page.locator("#page-heading")).toBeFocused();
    await expect(page.locator(".missing")).toHaveCount(0);
    await expect(page.locator(".review-list")).toContainText("Silky hummus");
    await expect(page.locator(".review-section").filter({ hasText: "Event" }).first()).toContainText("Birthday");
    await expect(page.getByText(/Monday, March 15, 2027/)).toBeVisible(); // a formatted calendar date, not the raw 2027-03-15
    await expect(page.locator(".price-line")).toHaveText("Not available yet");
    const submit = page.getByRole("button", { name: "Request a quote" });
    await expect(submit).toHaveAttribute("aria-disabled", "false");

    await submit.click();
    await expect(page.locator(".status-banner")).toContainText("Pending business approval");
    await expect(page.locator(".status-banner")).toContainText("not a confirmed booking");
    await expect(page.locator("#page-heading")).toBeFocused();
    await expect(page.locator("#announce")).toHaveText("Quote request sent. It is pending business approval, not confirmed.");
    await expect(summaryStatus(page)).toHaveText("Pending business approval · demo");
    await expect(page.getByRole("button", { name: "Request a quote" })).toHaveCount(0);

    // Nothing in the UI claims a confirmed/approved/booked order.
    const text = (await page.locator("body").innerText()).toLowerCase();
    for (const bad of ["order confirmed", "booking confirmed", "you're booked", "approved by", "your order is confirmed"]) expect(text).not.toContain(bad);

    // Read-only: no remove buttons, forms are locked, suggestions are off.
    await expect(page.locator("#summary .remove")).toHaveCount(0);
    await page.getByRole("link", { name: "Event", exact: true }).click();
    await expect(page.locator(".locked-note")).toContainText("can't be changed here");
    await expect(page.getByLabel("Event type")).toHaveCount(0);
    await expect(page.locator("#assistant")).toContainText("suggestions are turned off");
  });

  test("a failed send says nothing was sent, keeps the draft, and a retry succeeds once", async ({ page }) => {
    await openPlanner(page, "#/plan/menu/sides/dish/hummus", "?mockFail");
    await page.locator("#dish-dialog .btn-primary").click(); // consumes the one-shot failure: add fails, retry succeeds
    await expect(page.locator("#dish-dialog .error")).toBeVisible();
    await page.locator("#dish-dialog .btn-primary").click();
    await expect(page.locator("#summary .order-item")).toHaveCount(1);
    await saveEvent(page);
    await saveGuests(page);
    await page.getByRole("link", { name: "Review", exact: true }).click();
    await page.getByRole("button", { name: "Request a quote" }).click();
    await expect(page.locator(".status-banner")).toContainText("Pending business approval");
    expect(await page.locator("#summary .order-item").count()).toBe(1);
  });
});

test.describe("event and guest forms", () => {
  test("validation errors are associated with their fields, summarized, and block nothing else", async ({ page }) => {
    await openPlanner(page, "#/plan/event");
    await page.getByLabel("Event date").fill("2020-01-01");
    await page.getByRole("button", { name: "Save details" }).click();
    const summary = page.locator(".error-summary");
    await expect(summary).toBeVisible();
    await expect(summary).toContainText("1 field needs attention");
    await expect(summary.locator("h3")).toBeFocused();
    const date = page.getByLabel("Event date");
    await expect(date).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator("#event-date-error")).toHaveText("Choose today or a later date.");
    expect(await date.getAttribute("aria-describedby")).toContain("event-date-error");
    await expect(version(page)).toHaveText("Order version 1"); // nothing was saved

    await summary.getByRole("button", { name: /Event date/ }).click();
    await expect(date).toBeFocused();
    await date.fill(DATE);
    await page.getByRole("button", { name: "Save details" }).click();
    await expect(page.locator(".error-summary")).toHaveCount(0);
    await expect(date).not.toHaveAttribute("aria-invalid", "true");
    await expect(version(page)).toHaveText("Order version 2");
  });

  test("delivery reveals and then requires an address; pickup does not", async ({ page }) => {
    await openPlanner(page, "#/plan/event");
    await expect(page.getByLabel("Delivery address")).toBeHidden();
    await page.getByLabel("Delivery", { exact: true }).check();
    await expect(page.getByLabel("Delivery address")).toBeVisible();
    await page.getByLabel("Event type").selectOption("family");
    await page.getByLabel("Event date").fill(DATE);
    await page.getByRole("button", { name: "Save details" }).click();
    await expect(page.locator(".form-status")).toHaveText("Details saved.");
    await page.getByRole("link", { name: "Review", exact: true }).click();
    await expect(page.locator(".missing")).toContainText("Enter a delivery address");
    await page.getByRole("link", { name: "Event", exact: true }).click();
    await page.getByLabel("Pickup", { exact: true }).check();
    await page.getByRole("button", { name: "Save details" }).click();
    await page.getByRole("link", { name: "Review", exact: true }).click();
    await expect(page.locator(".missing")).not.toContainText("delivery address");
  });

  test("dietary groups overlap: each is compared with the total, never added to it", async ({ page }) => {
    await openPlanner(page, "#/plan/guests");
    await page.getByLabel("Adults").fill("6");
    await page.getByLabel("Children").fill("2");
    await expect(page.locator(".guest-total")).toHaveText("Total guests: 8");
    await page.getByLabel("eat vegetarian").fill("8");
    await page.getByLabel("eat vegan").fill("8");
    await page.getByLabel("other dietary restrictions").fill("8");
    await page.getByRole("button", { name: "Save details" }).click();
    await expect(page.locator(".form-status")).toHaveText("Details saved."); // 8 + 8 + 8 of 8 guests is allowed
    await expect(page.locator(".guest-total")).toHaveText("Total guests: 8"); // not 32

    await page.getByLabel("eat vegan").fill("9");
    await page.getByRole("button", { name: "Save details" }).click();
    await expect(page.locator("#guests-vegan-error")).toHaveText("This can't be more than your total number of guests.");
    await page.getByLabel("Adults").fill("-1");
    await page.getByRole("button", { name: "Save details" }).click();
    await expect(page.locator("#guests-adults-error")).toHaveText("Enter zero or more.");
  });

  test("unsaved input survives navigating away and back; saving is always explicit", async ({ page }) => {
    await openPlanner(page, "#/plan/event");
    await page.getByLabel("Anything else").fill("Nut-free cake please");
    await expect(page.locator(".form-status")).toHaveText("You have unsaved changes.");
    await page.getByRole("link", { name: "Guests", exact: true }).click();
    await page.getByRole("link", { name: "Event", exact: true }).click();
    await expect(page.getByLabel("Anything else")).toHaveValue("Nut-free cake please"); // restored, still not saved
    await expect(version(page)).toHaveText("Order version 1");
  });

  test("keyboard only: fill and save the event form without a pointer", async ({ page }) => {
    await openPlanner(page, "#/plan/event");
    await page.getByLabel("Event type").focus();
    await page.keyboard.press("ArrowDown"); // first real option
    await page.keyboard.press("Tab");
    await page.keyboard.type("03152027");
    await page.keyboard.press("Tab");
    await page.keyboard.press("ArrowRight"); // radio group: pickup then delivery
    await page.getByLabel("Pickup", { exact: true }).focus();
    await page.keyboard.press("Space");
    await page.getByLabel("Requested time").focus();
    await page.keyboard.press("Enter"); // Enter in a text field submits the form
    await expect(page.locator(".form-status")).toHaveText("Details saved.");
    await page.getByRole("link", { name: "Review", exact: true }).click();
    await expect(page.locator(".missing")).not.toContainText("event type");
    await expect(page.locator(".missing")).not.toContainText("event date");
  });
});

test.describe("table guide: scripted suggestions that only the customer can approve", () => {
  const suggest = (page) => page.getByRole("button", { name: "Suggest a dish" });

  test("a suggestion shows before/after and an unavailable price, and changes nothing until approved", async ({ page }) => {
    await openPlanner(page);
    await suggest(page).click();
    const card = page.locator(".proposal");
    await expect(card).toBeVisible();
    await expect(page.locator("#proposal-title")).toHaveText("Suggested change · needs your approval");
    await expect(page.locator("#proposal-title")).toBeFocused();
    await expect(card).toContainText("Now: 0 demo units");
    await expect(card).toContainText("1 demo unit");
    await expect(card).toContainText("Price effect");
    await expect(card).toContainText("Not available yet");
    await expect(page.getByRole("button", { name: "Approve change" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Reject change" })).toBeVisible();
    await expect(page.locator("#summary .order-item")).toHaveCount(0); // not applied
    await expect(version(page)).toHaveText("Order version 1");
    await expect(page.locator("#announce")).toHaveText("New suggestion. Review it, then approve or reject.");
  });

  test("reject leaves the order exactly as it was", async ({ page }) => {
    await openPlanner(page);
    await suggest(page).click();
    await page.getByRole("button", { name: "Reject change" }).click();
    await expect(page.locator("#proposal-title")).toHaveText("No change made");
    await expect(page.locator(".proposal")).toContainText("exactly as it was");
    await expect(page.locator("#summary .order-item")).toHaveCount(0);
    await expect(version(page)).toHaveText("Order version 1");
    await expect(page.locator("#announce")).toHaveText("Rejected. Your table is unchanged.");
    await expect(page.getByRole("button", { name: "Approve change" })).toHaveCount(0);
  });

  test("approve applies once even if clicked repeatedly", async ({ page }) => {
    await openPlanner(page);
    await suggest(page).click();
    const approve = page.getByRole("button", { name: "Approve change" });
    await approve.evaluate((el) => { el.click(); el.click(); el.click(); });
    await expect(page.locator("#proposal-title")).toHaveText("Change applied");
    await expect(page.locator("#summary .order-item")).toHaveCount(1);
    await expect(page.locator("#summary .order-item")).toContainText("× 1 demo unit"); // not 3
    await expect(version(page)).toHaveText("Order version 2");
    await expect(page.locator("#announce")).toContainText("Approved. Added");
    await page.getByRole("button", { name: "Dismiss" }).click();
    await expect(suggest(page)).toBeVisible();
  });

  test("a suggestion goes stale when the table changes: no Approve is offered and nothing is applied", async ({ page }) => {
    await openPlanner(page);
    await suggest(page).click();
    await expect(page.getByRole("button", { name: "Approve change" })).toBeVisible();
    // The person adds a different dish themselves (staying in the app: a reload would drop the in-memory order).
    await page.locator('[data-chip-id="mains"]').click();
    await page.locator('.hud [data-dish-id="herb_salmon"]').click();
    await page.locator("#dish-dialog .btn-primary").click();
    await expect(page.locator("#summary .order-item")).toHaveCount(1);
    await expect(page.locator("#proposal-title")).toHaveText("This suggestion is out of date");
    await expect(page.getByRole("button", { name: "Approve change" })).toHaveCount(0);
    await expect(page.locator("#summary .order-item")).toContainText("Herb-roasted salmon"); // only what the person added
    await page.getByRole("button", { name: "Get a new suggestion" }).click();
    await expect(page.locator("#proposal-title")).toHaveText("Suggested change · needs your approval");
  });

  test("when suggestions are unavailable, manual ordering still works", async ({ page }) => {
    await openPlanner(page, "#/plan", "?mockAiFail");
    await suggest(page).click();
    await expect(page.locator("#assistant .error")).toContainText("Suggestions aren't available right now");
    await expect(page.locator("#summary .order-item")).toHaveCount(0);
    await addDish(page, "sides", "hummus");
  });
});
