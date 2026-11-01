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
  await page.getByLabel("Full name").fill("Dana Levi");
  await page.getByLabel("Mobile number").fill("050-123-4567");
  await page.getByLabel("Event type").selectOption("birthday");
  await page.getByLabel("Event date").fill(DATE);
  await page.getByLabel(fulfillment, { exact: true }).check();
  await page.getByLabel("Time window").selectOption({ index: 1 });
  if (fulfillment === "Delivery") {
    await page.getByLabel("Delivery area").selectOption("tel_aviv");
    await page.getByLabel("Street and house number").fill("12 Example Street");
  }
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
    await expect(missing).toHaveText(["Choose at least one dish", "Enter your full name", "Enter your mobile number", "Choose an event type", "Choose an event date", "Choose pickup or delivery", "Choose a time window", "Enter how many guests"]);
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
    await expect(page.locator("#event-date-error")).toHaveText("That date has passed.");
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

  test("delivery reveals the area and street fields and then requires them; pickup does not", async ({ page }) => {
    await openPlanner(page, "#/plan/event");
    await expect(page.getByLabel("Delivery area")).toBeHidden();
    await expect(page.getByLabel("Street and house number")).toBeHidden();
    await page.getByLabel("Delivery", { exact: true }).check();
    await expect(page.getByLabel("Delivery area")).toBeVisible();
    await expect(page.getByLabel("Street and house number")).toBeVisible();
    await page.getByLabel("Event type").selectOption("family");
    await page.getByLabel("Event date").fill(DATE);
    await page.getByRole("button", { name: "Save details" }).click();
    await expect(page.locator(".form-status")).toHaveText("Details saved.");
    await page.getByRole("link", { name: "Review", exact: true }).click();
    await expect(page.locator(".missing")).toContainText("Choose your delivery area");
    await expect(page.locator(".missing")).toContainText("Enter a street and house number");
    await page.getByRole("link", { name: "Event", exact: true }).click();
    await page.getByLabel("Pickup", { exact: true }).check();
    await page.getByRole("button", { name: "Save details" }).click();
    await page.getByRole("link", { name: "Review", exact: true }).click();
    await expect(page.locator(".missing")).not.toContainText("delivery area");
    await expect(page.locator(".missing")).not.toContainText("street");
  });

  test("time windows follow pickup or delivery, and choosing the other one clears the old window", async ({ page }) => {
    await openPlanner(page, "#/plan/event");
    const win = page.getByLabel("Time window");
    await expect(win).toContainText("Choose pickup or delivery first");
    await page.getByLabel("Pickup", { exact: true }).check();
    await expect(win.locator("option")).toHaveText(["Choose a time window", "10:00 to 12:00", "12:00 to 14:00", "15:00 to 17:00"]);
    await win.selectOption("12-14");
    await page.getByLabel("Delivery", { exact: true }).check();
    await expect(win.locator("option")).toHaveText(["Choose a time window", "09:00 to 11:00", "11:00 to 13:00", "14:00 to 16:00"]);
    await expect(win).toHaveValue(""); // the pickup window does not carry over
  });

  test("the date rules: not today, not Shabbat, and a normal day is fine", async ({ page }) => {
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const now = new Date();
    const saturday = new Date(now.getFullYear() + 1, 0, 1); // find a Saturday next year
    while (saturday.getDay() !== 6) saturday.setDate(saturday.getDate() + 1);
    await openPlanner(page, "#/plan/event");
    const date = page.getByLabel("Event date");
    const save = page.getByRole("button", { name: "Save details" });

    await date.fill(iso(now));
    await save.click();
    await expect(page.locator("#event-date-error")).toHaveText("We need at least one day's notice. Choose a later date.");
    await date.fill(iso(saturday));
    await save.click();
    await expect(page.locator("#event-date-error")).toHaveText("Pickup and delivery are closed on Shabbat and holidays. Choose another day.");
    await date.fill(DATE);
    await save.click();
    await expect(page.locator(".form-status")).toHaveText("Details saved.");
  });

  test("a mobile number must look like one", async ({ page }) => {
    await openPlanner(page, "#/plan/event");
    await page.getByLabel("Mobile number").fill("12345");
    await page.getByRole("button", { name: "Save details" }).click();
    await expect(page.locator("#contact-phone-error")).toContainText("Enter an Israeli mobile number");
    await page.getByLabel("Mobile number").fill("052 765 4321");
    await page.getByRole("button", { name: "Save details" }).click();
    await expect(page.locator(".form-status")).toHaveText("Details saved.");
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
    await page.getByLabel("Full name").focus();
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
