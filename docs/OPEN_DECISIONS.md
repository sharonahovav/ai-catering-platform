# Open Business Decisions

These must be answered by the business before the dependent features are built. Engineering will not invent answers. Unrelated infrastructure work continues meanwhile.

Format: **Question** · *Why it matters* · **Blocks**

| # | Topic | Question | Why it matters | Blocks |
|---|---|---|---|---|
| 1 | Customer authentication / guest checkout | Must customers create an account? Email magic link, OTP by phone, password, or guest checkout with a tokenized link? | Determines ownership model, RLS policies, and how a customer returns to a draft/quote | Phase 3 order ownership, Phase 4 chat history |
| 2 | Payment & deposit | Is any deposit or payment collected in-app? | Payments are out of scope unless approved | Nothing in MVP unless approved |
| 3 | Serving & quantity formulas | Per category/dish, how much per adult / child? Rounding (e.g., whole trays)? Different for vegetarian/vegan guests? | Quantity recommendation must use business rules, not AI guesses | Phase 3 quantity engine (schema can hold rules; values unknown) |
| 4 | Overlapping guest dietary categories | Are vegetarian/vegan/restricted guests counted *within* adults/children (subsets) or separately? Is vegan a subset of vegetarian? | Prevents double-counting | Phase 3 guest composition validation |
| 5 | Availability & capacity | Max orders/guests per day or per slot? Lead time? Same-day orders? | Defines date/slot validation | Phase 2 availability rules, Phase 3 date picker |
| 6 | Quote modification & negotiation | Can the owner edit or counter-propose a quote, or only approve/reject? | Adds states and UI | Out of MVP until decided |
| 7 | Cancellation & revision | Can a customer cancel or edit after submission or approval? Deadlines? | Adds states and rules | Out of MVP until decided |
| 8 | Allergen verification & cross-contamination | What disclaimer text is shown? Is there a "may contain" level? Who verifies allergen data? | Safety and liability wording | Phase 2 allergen fields' semantics, Phase 4 agent wording |
| 9 | Kashrut certification | Which certification(s)? Shown per dish or business-wide? Mixing meat & dairy dishes in one order allowed? | Affects data model and validation | Phase 2 dish fields, Phase 3 conflict checks |
| 10 | Disposable serving equipment | Are utensils/disposables orderable? Priced how? | Could be catalog items or separate | Out of MVP until decided |
| 11 | Alcohol | Offered at all? Age verification? | Legal implications | Out of MVP until decided |
| 13 | Notification channels | Email, SMS, WhatsApp, none? For which events (submitted, approved, rejected)? | Third-party providers and cost | Out of MVP until decided |
| 14 | VAT & rounding | Are catalog prices VAT-inclusive? VAT rate handling? Rounding rules for totals and weight-based prices? | Deterministic pricing correctness | Phase 3 pricing engine final rules |
| 15 | Minimum order quantities | Minimum per dish, per order, or minimum guests? Minimum for delivery? | Validation rules | Phase 2/3 validation |
| 16 | LLM provider | Which model provider (e.g., Anthropic Claude) and budget? | API keys, tool-calling format, cost | Phase 4 |
| 17 | Currency | Single currency (e.g., ILS)? Display format? | Money formatting and storage | Phase 2 pricing fields (stored as numeric + currency code until decided) |
| 18 | Weight unit | kg, 100 g, or configurable per dish? | Per-weight pricing math | Phase 2 pricing units |
| 19 | Delivery zone definition | Zones by city list, postal code, or radius/polygon? | Address → zone lookup method | Phase 2 delivery zones |
| 20 | Brand | Business name, logo, colors, fonts | Visual identity | Phase 3 UI polish (neutral tokens until then) |

### Added by the Infinite Table handoff review (2026-10-31, proposed; see `INFINITE_TABLE_GATE0.md`)

| # | Topic | Question | Why it matters | Blocks |
|---|---|---|---|---|
| 21 | Final visual identity | Three directions exist: Infinite Table tokens (warm editorial paper, handoff), the `design/green-eggs-and-ham` illustrated/mascot identity, and the current forest-green placeholder in `base.css`. Which one is the brand? | Determines tokens, fonts, imagery for every screen | Phase 3 UI polish; `/table/` uses handoff tokens in an isolated stylesheet meanwhile |
| 22 | Fate of the stepper UI (`/customer/`) | Is the Infinite Table the only customer UI (stepper retired), or do both ship? | Avoids maintaining two customer flows | Not blocking Gate 1 (both coexist) |
| 23 | Hebrew display typeface | Georgia (handoff display font) has no Hebrew glyphs. Which Hebrew display/editorial face, and is its licence cleared? Heebo (self-hosted) is the placeholder | Editorial look in RTL; font licensing | Brand (#20); Gate 1 uses Heebo |
| 24 | Imagery provenance and licence | Prototype v2 PNGs are described as AI-generated placeholders. May any be reused? Real dish photography plan? | Legal/brand risk; factual mismatch with real dishes | Any deployment beyond local review |
| 25 | Category set and overview composition | Final category names/count (prototype has 4, repo mock has 6) and whether the overview is curated per category or generic slots | Spatial layout, imagery per category | Gate 3 catalog; Gate 1 supports up to 6 slots |
| 26 | Money representation on the wire | Integer minor units + currency + explicit `unavailable` state (handoff) vs decimal strings (current `API_CONTRACTS.md`) | Contract and pricing tests | Gate 4 pricing; currency itself is #17 |
| 27 | Voice AI | Handoff B19 / PRD "unresolved": any voice interaction? | Scope and accessibility | Out of scope until decided |

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
