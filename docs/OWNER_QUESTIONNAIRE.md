# Owner questionnaire

Questions the business owner needs to answer before the real catalog, pricing and admin can be built (Gate 3 onward). Engineering will not guess any of these. Answers belong in `docs/OPEN_DECISIONS.md` with a date and who decided, not only in a message.

**15 of the 29 questions are marked ★: those are needed first.** The rest can wait. Options marked *(our suggestion)* are what we would pick if you have no preference. "Not sure yet, let's decide together" is always a fine answer. Related open decisions are in brackets.

An interactive version exists as a private page that produces a copyable summary of the answers.

## Your menu

The demo uses placeholder dishes and pictures. These answers decide how the real catalog works.

**1. ★ How will you give us your real menu (dish names, descriptions, photos, categories)?** _[#5, #24]_

_Why we ask: Everything customers see now is a stand-in. Real photos and descriptions come from you._

- [ ] I'll send a spreadsheet and photos *(our suggestion)*
- [ ] I'd like help putting it together
- [ ] Not ready yet
- [ ] Not sure yet, let's decide together

Notes: ______________________

**2. ★ How do you price your dishes? Tick every way you use.** _[#14, B06]_

_Why we ask: Each way of selling needs its own quantity control and price math._

- [ ] Per guest (a price per person)
- [ ] Per tray
- [ ] By weight
- [ ] Per piece
- [ ] Something else (add a note)
- [ ] Not sure yet, let's decide together

Notes: ______________________

**3. If you sell by weight, which unit?** _[#18]_

_Why we ask: Needed for price math._

- [ ] Per kilogram *(our suggestion)*
- [ ] Per 100 grams
- [ ] It depends on the dish
- [ ] We don't sell by weight
- [ ] Not sure yet, let's decide together

Notes: ______________________

**4. ★ Do you have minimums?** _[#15]_

_Why we ask: We show these to customers and check them before a request is sent._

- [ ] A minimum per dish (for example a number of trays)
- [ ] A minimum number of guests
- [ ] A minimum total order value
- [ ] A minimum for delivery
- [ ] No minimums
- [ ] Not sure yet, let's decide together

Notes: ______________________

## Quantities and prices

Today the demo shows 'Not available yet' for every price, on purpose.

**5. ★ Should the planner suggest how much to order?** _[#3]_

_Why we ask: It can work out amounts from portion sizes you give us (per adult, per child). We never guess these._

- [ ] Yes, using portion sizes I give you *(our suggestion)*
- [ ] Only for some dishes
- [ ] No, the customer chooses everything
- [ ] Not sure yet, let's decide together

Notes: ______________________

**6. If a suggestion lands between sizes (say 2.3 trays), what should happen?** _[#3]_

_Why we ask: Only matters if you want suggestions._

- [ ] Round up to whole trays *(our suggestion)*
- [ ] Round to the nearest whole tray
- [ ] Show the exact amount
- [ ] Not sure yet, let's decide together

Notes: ______________________

**7. ★ Do your prices include VAT?** _[#14]_

_Why we ask: Decides how totals are calculated and shown._

- [ ] Yes, VAT is included
- [ ] No, VAT is added on top
- [ ] Not sure (we'll check with your accountant)
- [ ] Not sure yet, let's decide together

Notes: ______________________

**8. ★ What should a customer see before you approve their request?** _[#14]_

_Why we ask: A request is never a confirmed order until you approve it, so the price shown is an estimate._

- [ ] An estimate, clearly marked as an estimate *(our suggestion)*
- [ ] No prices until you approve
- [ ] Exact prices straight away
- [ ] Not sure yet, let's decide together

Notes: ______________________

**9. Do you price only in shekels?** _[#17]_

_Why we ask: Sets currency formatting._

- [ ] Yes, shekels (ILS) only *(our suggestion)*
- [ ] Another currency too (add a note)
- [ ] Not sure yet, let's decide together

Notes: ______________________

## Delivery, pickup and dates

Today the demo accepts any address and any date from today. Real rules come from you.

**10. ★ How do you define where you deliver?** _[#19]_

_Why we ask: Decides how we check an address._

- [ ] A list of cities or towns *(our suggestion)*
- [ ] Postcodes
- [ ] A distance from your kitchen
- [ ] Something else (add a note)
- [ ] Not sure yet, let's decide together

Notes: ______________________

**11. ★ How is the delivery fee set?** _[#19]_

_Why we ask: The fee is shown separately from the food total._

- [ ] A fixed fee per area *(our suggestion)*
- [ ] Based on distance
- [ ] Free above an order value
- [ ] Free for some areas
- [ ] Not sure yet, let's decide together

Notes: ______________________

**12. ★ How does a customer choose a pickup or delivery time?** _[#5]_

_Why we ask: Decides whether we build time windows._

- [ ] From fixed time windows you set (for example 2-hour windows) *(our suggestion)*
- [ ] Any time they like, and you confirm
- [ ] Just a day, and you arrange the time
- [ ] Not sure yet, let's decide together

Notes: ______________________

**13. ★ How much notice do you need before an event?** _[#5]_

_Why we ask: Customers can't pick dates sooner than this._

- [ ] At least 1 day
- [ ] At least 2 days
- [ ] At least 3 days
- [ ] At least a week
- [ ] It depends on the size (add a note)
- [ ] Not sure yet, let's decide together

Notes: ______________________

**14. Is there a limit per day?** _[#5]_

_Why we ask: Prevents impossible dates._

- [ ] A maximum number of events per day
- [ ] A maximum number of guests per day
- [ ] No limit
- [ ] Not sure
- [ ] Not sure yet, let's decide together

Notes: ______________________

**15. How should closed days (Shabbat, holidays) be handled?** _[#5]_

_Why we ask: Customers can't choose blocked dates._

- [ ] We'll mark them ourselves in the admin screen *(our suggestion)*
- [ ] Block Shabbat and Jewish holidays automatically
- [ ] Something else (add a note)
- [ ] Not sure yet, let's decide together

Notes: ______________________

## Food rules and safety

These affect what we are allowed to say about each dish.

**16. ★ What should customers see about kashrut?** _[#9]_

_Why we ask: We never show a certificate or label you haven't confirmed._

- [ ] A certificate for the whole business
- [ ] A label on each dish (meat, dairy or pareve) *(our suggestion)*
- [ ] Nothing shown
- [ ] Not sure yet, let's decide together

Notes: ______________________

**17. May one request mix meat and dairy dishes?** _[#9]_

_Why we ask: We can warn or block._

- [ ] Yes, no warning
- [ ] Yes, with a warning *(our suggestion)*
- [ ] No, block it
- [ ] Not sure yet, let's decide together

Notes: ______________________

**18. Who confirms allergen information for each dish?** _[#8]_

_Why we ask: Missing allergen information is always shown as 'not provided', never as 'safe'. Add the wording you want customers to see in a note._

- [ ] I (the owner) enter it dish by dish
- [ ] A kitchen manager does
- [ ] We'd rather show only a general notice
- [ ] Not sure yet, let's decide together

Notes: ______________________

**19. ★ Will you sell alcohol through the planner?** _[#11]_

_Why we ask: The demo shows wine and cocktails as a mock only. Real alcohol sales need an age check and a licence._

- [ ] No, not in the first release *(our suggestion)*
- [ ] Yes, with an age check (describe it in a note)
- [ ] Only as a request that you handle by phone
- [ ] Not sure yet, let's decide together

Notes: ______________________

## Customers and requests

What a customer gives you, and what happens after they send a request.

**20. ★ Which contact details do you need from a customer?** _[new]_

_Why we ask: The demo does not ask for any yet, and a real request needs a way to reach them._

- [ ] Full name *(our suggestion)*
- [ ] Mobile number *(our suggestion)*
- [ ] Email
- [ ] WhatsApp number
- [ ] Not sure yet, let's decide together

Notes: ______________________

**21. ★ How should a customer come back to their request?** _[#1]_

_Why we ask: Decides whether we build accounts._

- [ ] A private link sent by email (no account) *(our suggestion)*
- [ ] A code sent by SMS
- [ ] A full account with a password
- [ ] They don't come back, you contact them
- [ ] Not sure yet, let's decide together

Notes: ______________________

**22. ★ What must be filled in before a request can be sent? The demo currently requires: at least one dish, an event type, a date, pickup or delivery (plus an address for delivery), and the number of guests.** _[#28]_

_Why we ask: This is our placeholder rule. Tell us what to change._

- [ ] That is right *(our suggestion)*
- [ ] Remove something (add a note)
- [ ] Add something (add a note)
- [ ] Not sure yet, let's decide together

Notes: ______________________

**23. How should you and the customer be told about requests and decisions?** _[#13]_

_Why we ask: Each channel is extra setup and cost._

- [ ] Email to you when a request arrives
- [ ] Email to the customer when you decide
- [ ] SMS
- [ ] WhatsApp
- [ ] Nothing: we check the admin screen
- [ ] Not sure yet, let's decide together

Notes: ______________________

**24. After a request is sent, what do you want to be able to do?** _[#6]_

_Why we ask: Anything beyond approve or reject adds screens and rules._

- [ ] Approve it
- [ ] Reject it, with a note *(our suggestion)*
- [ ] Change quantities and send it back
- [ ] Suggest a different date or dish
- [ ] Not sure yet, let's decide together

Notes: ______________________

**25. Can a customer change or cancel a request after sending it?** _[#7]_

_Why we ask: Today the demo says no, so nothing can go wrong._

- [ ] No, they contact you *(our suggestion)*
- [ ] Yes, until you approve it
- [ ] Yes, any time
- [ ] Not sure yet, let's decide together

Notes: ______________________

**26. Do you take any payment or deposit through the planner?** _[#2]_

_Why we ask: Payments are out of scope unless you want them._

- [ ] No, payment is handled outside the planner *(our suggestion)*
- [ ] A deposit
- [ ] Full payment
- [ ] Not sure yet, let's decide together

Notes: ______________________

## Language and look

**27. Which languages should the planner launch in?** _[#12]_

_Why we ask: Hebrew was decided earlier. Adding English is extra work._

- [ ] Hebrew only *(our suggestion)*
- [ ] Hebrew and English
- [ ] More than that (add a note)
- [ ] Not sure yet, let's decide together

Notes: ______________________

**28. Which look feels closest to your business?** _[#20 to #23]_

_Why we ask: Colors, fonts and pictures follow this._

- [ ] A warm, editorial table (the one you have seen)
- [ ] Playful and illustrated (a mascot and hand-drawn icons)
- [ ] Calm, green and simple
- [ ] We have our own brand guidelines (add a note)
- [ ] Not sure yet, let's decide together

Notes: ______________________

**29. Your business name, and how you'd like it to appear.** _[#20]_

_Why we ask: The demo shows 'Catering Co.' as a placeholder._

Answer: ______________________

---

When answered: record each decision in `docs/OPEN_DECISIONS.md` (decision log) and move the matching row out of the open table.
