# Open Business Decisions

These must be answered by the business before the dependent features are built. Engineering will not invent answers. Unrelated infrastructure work continues meanwhile.

Format: **Question** · *Why it matters* · **Blocks**

| # | Topic | Question | Why it matters | Blocks |
|---|---|---|---|---|
| 4 | Overlapping guest dietary categories | Are vegetarian/vegan/restricted guests counted *within* adults/children (subsets) or separately? Is vegan a subset of vegetarian? | Prevents double-counting | Phase 3 guest composition validation |
| 10 | Disposable serving equipment | Are utensils/disposables orderable? Priced how? | Could be catalog items or separate | Out of MVP until decided |
| 16 | LLM provider | Which model provider (e.g., Anthropic Claude) and budget? | API keys, tool-calling format, cost | Phase 4 |

### Added by the Infinite Table handoff review (2026-10-31, proposed; see `INFINITE_TABLE_GATE0.md`)

| # | Topic | Question | Why it matters | Blocks |
|---|---|---|---|---|
| 22 | Fate of the stepper UI (`/customer/`) | Is the Infinite Table the only customer UI (stepper retired), or do both ship? | Avoids maintaining two customer flows | Not blocking Gate 1 (both coexist) |
| 23 | Hebrew display typeface | Georgia (handoff display font) has no Hebrew glyphs. Which Hebrew display/editorial face, and is its licence cleared? Heebo (self-hosted) is the placeholder | Editorial look in RTL; font licensing | Brand (#20); Gate 1 uses Heebo |
| 24 | Imagery provenance and licence | Prototype v2 PNGs are described as AI-generated placeholders. May any be reused? Real dish photography plan? | Legal/brand risk; factual mismatch with real dishes | Any deployment beyond local review |
| 25 | Category set and overview composition | Final category names/count (prototype has 4, repo mock has 6) and whether the overview is curated per category or generic slots | Spatial layout, imagery per category | Gate 3 catalog; Gate 1 supports up to 6 slots |
| 26 | Money representation on the wire | Integer minor units + currency + explicit `unavailable` state (handoff) vs decimal strings (current `API_CONTRACTS.md`) | Contract and pricing tests | Gate 4 pricing; currency itself is #17 |
| 27 | Voice AI | Handoff B19 / PRD "unresolved": any voice interaction? | Scope and accessibility | Out of scope until decided |

### Follow-ups raised by the owner's questionnaire answers (2026-11-01)

The answers settle most of the register (see the decision log). These are the gaps and conflicts they leave. **#29, #30 and #31 are conflicts and should be confirmed with the owner before anything is built on them.**

| # | Topic | Question | Why it matters | Blocks |
|---|---|---|---|---|
| 29 | **Conflict:** dietary and allergen data vs the PRD | The owner chose a business-wide kashrut certificate only (no per-dish meat/dairy/pareve label) and a general allergen notice only (no per-dish allergen data), and allows mixing meat and dairy with no warning. `docs/PRD.md` decision 9 (marked confirmed) says dishes carry meat/dairy/pareve, vegetarian, vegan and known allergens. Is the per-dish data still wanted, at least vegetarian/vegan and meat/dairy/pareve? A certificate for the whole business combined with unlabelled meat and dairy in one request is also worth confirming. | Dish data model; the planner's dietary filters; the AI's ability to flag a known dietary conflict (it can only use data that exists) | Gate 3 catalog schema |
| 30 | **Conflict:** the customer's email | Customers come back through a private link sent by email (#21 answer) but the owner asked for name and mobile number only, not email. Either collect email, or send the link by SMS instead. | Whether a customer can return to a request at all | Gate 4 customer access |
| 31 | **Conflict:** rejecting a request | For "what do you want to be able to do after a request is sent" the owner ticked only "Approve it". `docs/PRD.md` decision 2 says the owner approves **or rejects** every quotation. Assume reject-with-a-note stays, unless told otherwise. | Quote status model and admin screen | Gate 4 |
| 32 | Portion sizes | The owner wants quantity suggestions from portion sizes. We need, per dish, how much per adult and per child (and which unit: trays, pieces or grams). | The quantity engine has no values yet | Gate 4 |
| 33 | Delivery and time details | List of delivery cities and the fixed fee for each; the minimum order value for delivery; the two-hour windows (start times, per weekday, pickup vs delivery). | Zones, fees, minimums and slots in the admin | Gate 3 admin |
| 34 | Shabbat and holiday blocking | Blocking is automatic. Block what exactly: the event date, or only pickup and delivery? A "Shabbat meal" is delivered before Shabbat, so blocking the event date would make that event type unusable. Also the Friday and pre-holiday cut-off time, and which calendar source to use. | Date validation | Gate 3/4 |
| 35 | Alcohol rules | Owner says yes with an age check but gave no description. How is age checked, is there a licence, how does kosher wine work, and is it delivered only to an adult? Until answered the demo's alcohol stays mock-only. | Legal; whether alcohol can go live at all | Alcohol in production |
| 36 | VAT details | Prices include VAT. Which rate, and do we show a VAT line? Rounding of totals (to the agora, or nearest shekel)? | Pricing engine | Gate 4 |
| 37 | Menu onboarding | The owner wants help putting the menu together. We need a spreadsheet template (name, description, category, unit, price, photo) and a plan for photography. | The real catalog | Gate 3 |
| 38 | Brand: logo and typeface | Name is **yumm.ai** and the look is the warm editorial table. No logo or Hebrew typeface yet (#23). Confirm the spelling and capitalisation (all lowercase?). | Final visual identity | Phase 3 polish |
| 39 | Owner notification address | Owner wants an email when a request arrives. Which address (or addresses)? | Notifications | Gate 4 |

### Handoff ID mapping (Infinite Table `06_OPEN_DECISIONS.md` → this register)

| Handoff | Maps to | Note |
|---|---|---|
| B01 name/logo, B03 colors/typefaces | #20, #21, #23 | |
| B02 languages/RTL | **Decided #12** (Hebrew only, RTL) | **Conflict:** the handoff lists it as open and ships English/LTR samples. Assumed the repo decision is binding; pending owner confirmation (Gate 0 Q1). |
| B04 customer auth | #1 | |
| B05 catalog and photos | #24, #25 | |
| B06 serving formulas/increments | #3 | |
| B07 dietary overlap | #4 | |
| B08 minimum quantities | #15 | |
| B09 VAT/currency/rounding | #14, #17 | |
| B10 delivery zones/fees/slots | #19, #5 | |
| B11 availability/capacity | #5 | |
| B12 allergen verification | #8 | |
| B13 kashrut | #9 | |
| B14 notifications | #13 | |
| B15 quote revisions, B17 owner-proposed edits | #6, #7 | |
| B16 cancellation/refunds/payments | #2, #7 | |
| B18 disposables/alcohol | #10, #11 | |
| B19 voice AI | #27 | |
| B20 spatial composition/timing | #25 (composition); timing tuned in Gate 1 | |

## Decision log

When a decision is made, record it here and move the row out of the table above.

| Date | # | Decision | Decided by |
|---|---|---|---|
| 2026-10-29 | 12 | Interface language is **Hebrew only, RTL**. AI responses must also be in Hebrew. | Project owner (chat) |
| 2026-10-31 | 12 (scope note) | Gate 1 of the Infinite Table (`/table/`) is built in **English** for design review. Production language stays Hebrew-only RTL; all copy lives in `frontend/js/table/strings.en.js` and layout uses logical properties so Hebrew is a data change, not a rewrite. | Project owner (chat) |
| 2026-10-31 | 23 (placeholder only) | Heebo (already self-hosted) is the provisional Hebrew display font until the brand typeface is chosen. Not yet applied: Gate 1 is English. | Project owner (chat) |
| 2026-11-01 | handoff doc 01/03 scope note | Owner approved adding an **opt-in "Explore freely" mode** (drag/wheel/pinch pan and zoom, bounded canvas) and a route-driven camera zoom with dishes orbiting the focused category. Relaxes the handoff's "no wheel/drag zoom" rule **only** while the mode is on: it is off by default, every action keeps a click/tap/keyboard path, and reduced-motion removes the camera animation. Desktop/tablet only; phones keep the stacked layout. | Project owner (chat) |
| 2026-11-01 | 11 (mock only) | Owner asked for alcoholic drinks in the demo. Included as a clearly labelled **mock-only** "Wine & cocktails" category (`alcohol` flag on the dish, labels on the card, the sheet and the review page, and a note that age verification and licensing are not set up). The scripted guide never proposes alcohol. The real rules (age verification, licensing, kosher wine, whether it is sold at all) remain undecided. | Project owner (chat) |
| 2026-11-01 | 24 (extended) | Owner approved generating placeholder images for hors d'oeuvres and drinks. Ten images were generated on 2026-11-01 with Google Nano Banana 2.1 through the Magnific tool (about 530 credits), background-removed, and cropped. Their licence/terms of use for production are **unchecked**. They are placeholders for layout only. | Project owner (chat) |
| 2026-11-01 | 1 | Customers do **not** create accounts. They return to a request through a **private link sent by email**. (Needs the customer's email: see #30.) | Business owner (questionnaire answers, relayed by the project owner) |
| 2026-11-01 | 2 | **No payment or deposit** is taken through the planner; payment is handled outside it. | Business owner (questionnaire answers, relayed by the project owner) |
| 2026-11-01 | 3 | The planner **suggests quantities from portion sizes the owner provides**; suggestions **round up to whole trays**. Portion sizes still to come (#32). | Business owner (questionnaire answers, relayed by the project owner) |
| 2026-11-01 | 5 | Notice needed: **at least 1 day**. **No daily limit** on events or guests. Customers pick **fixed time windows** set by the owner (for example two hours). Windows still to come (#33). | Business owner (questionnaire answers, relayed by the project owner) |
| 2026-11-01 | 5 (closed days) | **Shabbat and Jewish holidays are blocked automatically.** What exactly is blocked: see #34. | Business owner (questionnaire answers, relayed by the project owner) |
| 2026-11-01 | 6, 7 | After a request is sent the owner can **approve** (reject: see #31). The owner does not edit or counter-propose in the first release. **Customers cannot change or cancel**; they contact the owner. | Business owner (questionnaire answers, relayed by the project owner) |
| 2026-11-01 | 8 | Allergens: the owner prefers a **general notice only**, no per-dish allergen data. **Conflicts with the PRD (#29).** | Business owner (questionnaire answers, relayed by the project owner) |
| 2026-11-01 | 9 | Kashrut: a **certificate for the whole business**, not a label per dish. A request **may mix meat and dairy with no warning**. See #29. | Business owner (questionnaire answers, relayed by the project owner) |
| 2026-11-01 | 11 | Alcohol: **yes, with an age check** (method not described: #35). The demo's alcohol stays mock-only until the rules are known. | Business owner (questionnaire answers, relayed by the project owner) |
| 2026-11-01 | 13 | Notifications: **email to the owner when a request arrives**. No SMS or WhatsApp. No email to the customer on a decision (see #30). | Business owner (questionnaire answers, relayed by the project owner) |
| 2026-11-01 | 14 | **Prices include VAT.** Customers see an **estimate clearly marked as an estimate** before the owner approves. VAT rate and rounding: #36. | Business owner (questionnaire answers, relayed by the project owner) |
| 2026-11-01 | 15 | The only minimum is a **minimum for delivery** (amount: #33). No per-dish, per-guest or per-order minimums. | Business owner (questionnaire answers, relayed by the project owner) |
| 2026-11-01 | 17 | **Shekels (ILS) only.** | Business owner (questionnaire answers, relayed by the project owner) |
| 2026-11-01 | 18 | Weight prices are **per 100 grams**. | Business owner (questionnaire answers, relayed by the project owner) |
| 2026-11-01 | 19 | Delivery areas are a **list of cities or towns**; the fee is a **fixed fee per area**. The list and the fees: #33. | Business owner (questionnaire answers, relayed by the project owner) |
| 2026-11-01 | 20, 21 | Name: **yumm.ai**. Look: the **warm editorial table** direction already built (replaces the illustrated mascot and forest-green options). Logo and Hebrew typeface still open (#23, #38). | Business owner (questionnaire answers, relayed by the project owner) |
| 2026-11-01 | 28 | A request needs: at least one dish, event type, date, pickup or delivery (plus an address for delivery), and the number of guests, **plus the customer's full name and mobile number**. Not required: email (but see #30). | Business owner (questionnaire answers, relayed by the project owner) |
| 2026-11-01 | new | Menu: the owner **needs help putting the real menu together** (#37). Pricing units in use: **per tray, per piece and by weight** (per guest is not used). Languages: **Hebrew only**, as already decided (#12). | Business owner (questionnaire answers, relayed by the project owner) |
