# Infinite Table — Gate 0 Audit, Architecture and Gate 1 Plan

Status: **§1–§6 = Gate 0 proposal (reviewed 2026-10-31). §7 = Gate 1 implementation report.** Date: 2026-10-31.
Inputs: handoff folder `ai-catering-platform-infinate_table/` (README, docs 01–06, tokens, Prototype v2) and this repo's `docs/`, `frontend/`, `backend/` at branch `feature/customer-ui` (6e51d8e).

Legend: **[VERIFIED]** I read it or ran it · **[CONFIRMED]** decided by the business/owner (per repo or handoff docs) · **[PROPOSED]** my recommendation · **[OPEN]** needs an owner decision.

---

## 1. Repo and requirement audit

### 1.1 Repo state [VERIFIED]

| Item | Finding |
|---|---|
| Git | `ai-catering-platform` on `feature/customer-ui`, clean tree, 1 commit ahead of `main`/`origin/dev` (both d04ac59). No local `dev` branch. Remotes: `origin` (JonathanZouari/…) and `fork` (sharonahovav/…). Nothing pushed by me. |
| Worktree | `ai-catering-platform-green-eggs-and-ham` (`design/green-eggs-and-ham`) has **uncommitted** work: a different visual identity (illustrated mascot, Playpen Sans, decorations). Not touched. |
| Backend | FastAPI scaffold only: `GET /health` + static mount of `frontend/`. `api/ services/ repositories/ models/ schemas/ agents/` are empty packages. One test (`test_health.py`). |
| Frontend | Plain ES modules, no build. `frontend/customer/` is a **Hebrew RTL, 4-step stepper** (event → menu → summary → status) with a mock backend (`js/customer/mock-backend.js`, 273 lines, includes *placeholder* prices/zones/slots) and an assistant chat. `frontend/admin/` is a placeholder. |
| CI | `.github/workflows/ci.yml`: `uv sync`, `ruff check`, `ruff format --check`, `pytest` on push/PR to `dev`/`main`. No frontend job. |
| Tooling here | Node 24, npm 11, Python 3.14, `gh` present. **`uv` is not installed**, so I have *not* run backend tests or Ruff. |
| Original spec | **Not in the repo or handoff.** The repo's `PRD.md` is derived from it ("mandated by the business spec"). I audited against the PRD, not the original. If the original differs from the PRD, the original wins (handoff doc 04 §Source of truth). |
| Remote integrations | Railway/Supabase: templates only; nothing connected, nothing verified. GitHub: not exercised. |

### 1.2 Prototype v2 [VERIFIED by reading the whole file]

Single 37 KB HTML, inline CSS+JS, English, mock catalog of 12 dishes in 4 categories, sample 3-column desktop layout (76 px rail / stage / 302 px summary), bottom-nav under 800 px.

Worth preserving: composition and node positions, warm paper palette, serif display type, node hover lift, zoom-in animation of the category view, dish drawer, persistent "Your table" summary, AI proposal with Approve/"Not now" and snapshot-based staleness check, `history.pushState` per category, Escape unwinding, reduced-motion media query.

**Defects not to carry over** (all confirmed in the source):

1. Drawer is `role="dialog" aria-modal="false"`, with no focus trap and no `inert` behind it. Dish drawer state is *not* in history, so Back skips it.
2. Whole `#focus` section is `aria-live="polite"`, so every card render would be announced.
3. The review/event/guests modal uses `role="dialog" aria-modal="true"` but has no real trap or inert background.
4. Interactive text at 9–11 px (`.node-text` 11 px, rail labels 9 px, chips 11 px). Spec requires ≥13–14 px for metadata, 16 px for controls.
5. `--muted:#817b74` on cream is below 4.5:1 (spec already strengthens it to `#686159`); several hard-coded pinks/greys in the CSS are unvalidated.
6. Zoom uses `filter: blur()` on the full stage (`.orbit`) and on the entering view: expensive; spec says avoid.
7. `confirm()` for "Clear all" (blocks, unstylable, breaks automation).
8. Dish `Add` merges quantity silently and always returns to overview; no idempotency; no unit. Order is matched by dish id only.
9. Filter chips navigate between categories (`setView`) instead of filtering; "Food" rail item hard-wires `salads`.
10. `innerHTML` templating with an `escapeHTML` helper: fine for a prototype, but production should use DOM APIs / `textContent` to avoid injection from catalog text.
11. Page `lang="en"`, no `dir`, physical CSS properties (`left/right`) throughout, so it does not mirror to RTL.
12. Georgia has no Hebrew glyphs: a Hebrew UI would silently fall back to a system serif/sans, not the editorial look.
13. Desktop-only min stage height (`minmax(640px, …)`); short landscape phones unaddressed.

### 1.3 Requirement comparison and conflicts

| # | Topic | Repo (PRD/docs) | Handoff | Resolution [PROPOSED] |
|---|---|---|---|---|
| C1 | **Language/direction** | Hebrew-only, RTL, decided 2026-10-29 [CONFIRMED] | B02 "supported languages, RTL" listed as open; prototype/tokens are English/LTR | Treat repo decision as binding. Build RTL-ready with logical properties and a string table; Gate 1 UI copy in Hebrew. Prototype English copy is design reference only. **Flag for confirmation** (see Q1). |
| C2 | **Existing stepper UI vs Infinite Table** | Stepper built on `feature/customer-ui` | Concept C approved as *the* customer UX | Build Infinite Table as a **new entry point** (`/table/`), do not modify or delete `/customer/` in Gate 1. Replace/retire later by owner decision (#22). |
| C3 | **API paths** | `/api/catalog/*`, `PUT/DELETE /api/orders/{id}/items/{dish_id}`, `/api/orders/{id}/proposals/{pid}/approve` | `/api/menu/*`, `PATCH /api/orders/{id}/items`, `/api/ai/proposals/{id}/approve` | Keep **repo paths** (documented first, ADR-0003). Adopt handoff's *additions*: idempotency key, explicit unavailable-price state, proposal `sourceOrderVersion`. See §4. |
| C4 | **Money on the wire** | DB `numeric(10,2)`, API shows `"1200.00"` strings | `{state, currency, amountMinor}` | Adopt handoff shape on the wire (explicit `unavailable` state, integer minor units). Currency itself stays open (#17). New #26. |
| C5 | **Proposal approval sets order `status = approved`** | AI_AGENT_DESIGN §3 step 8 | `approved` must mean *owner* approved the quote | **Doc defect.** Proposal approval must only apply changes and bump `version`; it must never touch `order.status`. Fix in `AI_AGENT_DESIGN.md` when Gate 5 docs are updated (listed, not edited now). |
| C6 | **Visual identity** | `PRODUCT.md` says glassmorphism requested; green-eggs worktree explores a mascot/illustrated identity; `base.css` uses a forest-green placeholder | Warm editorial paper + blush/sage tokens, "provisional" | Three directions exist. Handoff tokens are used for `/table/` only, scoped in their own stylesheet. Which identity wins is owner's call (#20 + #21). |
| C7 | **Decision numbering** | #1–#20 | B01–B20 | Mapping table in `OPEN_DECISIONS.md`. |
| C8 | **Category set** | 6 mock categories (Hebrew) | 4 sample categories, 4 hard-coded node positions | Overview renders categories **from data**; layout slots support up to 6, extra categories fall back to the text list (see §3.3). |

### 1.4 Confirmed vs proposed vs unresolved

**Confirmed (repo PRD + handoff agree):** single business; private events only; owner approves every quote and a pending quote is never "confirmed"; backend authoritative for price/quantity/availability; AI proposes, customer approves, no AI tool mutates orders; mixed pricing units (guest/tray/weight/item) + separate delivery fee; unknown allergen ≠ free; vanilla HTML/CSS/JS, FastAPI, Supabase, Railway; `dev`/`main` with PR review, no prod deploy without approval; Concept C + Prototype v2 as the visual/interaction foundation (handoff-approved); order summary always accessible; reduced-motion + keyboard + browser Back required.

**Proposed by me (need your OK):** everything in §2–§5, notably: `/table/` alongside `/customer/`; hash routes; native `<dialog>` for the dish sheet; in-memory mock order in Gate 1; Hebrew-first strings; `node:test` for unit tests; ES-module layering below.

**Unresolved (added to `OPEN_DECISIONS.md`):** #21–#27 plus the existing #1, #3, #4, #5, #8, #9, #14, #15, #17–#20.

### 1.5 Assumptions (explicit)

- A1. Branch `feature/infinite-table-gate0` (docs only) is based on `feature/customer-ui` because the plan reuses its `js/lib/*` helpers. Per ADR-0004, work should eventually PR into `dev`; `dev` exists only on `origin`. I have not fetched, pushed or opened a PR.
- A2. The Prototype's PNGs are placeholder art of **unknown provenance and licence** (handoff says they are AI-generated). They are used only as labelled mock imagery and must not ship to production unverified (#24).
- A3. Gate 1 shows **no prices**, in line with acceptance criterion "no actual price is invented". The stepper's placeholder prices are *not* reused.
- A4. Mock order lives in memory only in Gate 1, so a refresh clears it and the UI says so ("Demo order — not saved"). View state (route) *does* survive refresh via the URL.
- A5. Browser support target: current Chromium, Firefox, Safari (per doc 03). `<dialog>`, `inert`, CSS logical properties and `:focus-visible` are all in that baseline; the View Transitions API is **not relied on**.

---

## 2. UI navigation state machine

View state and domain state are separate modules. Navigation is a pure function of the URL hash; the DOM follows the state, never the reverse.

### 2.1 Routes (hash-based, deep-linkable) [PROPOSED]

Hash routing because FastAPI's static mount has no SPA catch-all and the handoff allows it initially. The route *shape* matches the handoff so it can move to path routes later.

| State | Hash |
|---|---|
| `overview` | `#/plan` (also empty hash) |
| `category` | `#/plan/menu/:categoryId` |
| `dish` | `#/plan/menu/:categoryId/dish/:dishId` |
| `event`, `guests`, `review` | `#/plan/event`, `#/plan/guests`, `#/plan/review` (Gate 2; routes reserved, rendered as "coming in Gate 2" stubs or hidden) |

Unknown category/dish id in the URL → show a "not found" notice with a link back to the overview; never throw. IDs in the URL are catalog ids only: no order id, no personal data.

### 2.2 State shape

```text
UI state (ephemeral, derived from URL + a few flags)
  route:        { name: overview|category|dish|event|guests|review, categoryId?, dishId? }
  overlay:      none | dishSheet | mobileSummary          // dishSheet is derived from route=dish
  draft:        { dishId, quantity, status: idle|adding|error, error? }   // sheet-local
  motion:       full | reduced                            // from matchMedia, live
  notice:       null | { kind: added|error|info, text }   // drives the polite live region

Domain state (via order-store; mock now, server-authoritative later)
  order:        { id, version, status: draft, items: [{dishId, quantity, unit}], pricing: {state:"unavailable"} }
  source:       "mock" | "server"                         // always shown in UI while "mock"
```

### 2.3 Transition table

| From | Event | Guard | To | Side effects | Focus / announce |
|---|---|---|---|---|---|
| overview | `OPEN_CATEGORY(id)` (node click, rail, text list, deep link) | category exists | category | `history.pushState`; zoom-in animation (skipped if reduced) | focus category `<h2>` (tabindex -1); no extra live message |
| category | `OPEN_DISH(id)` | dish in category | dish | push; `dialog.showModal()` | browser focuses dialog heading/first control; remember opener |
| dish | `CLOSE_DISH` (Close, Escape, Back) | — | category | pop; `dialog.close()`; draft discarded | focus returns to opener card button |
| dish | `SET_QUANTITY(n)` | `n` valid per mock rule | dish | draft only; **no domain change** | `<output>` announced politely |
| dish | `ADD` | draft.status≠adding, dish available | overview | call order service with `clientRequestId`; on success: replace the dish history entry with overview, close dialog, zoom-out, update summary, set notice | focus overview heading? **No**: focus the order-summary item just added (or summary heading), announce "Added N × Name. Table now has M items." once |
| dish | `ADD` fails | — | dish (stays) | show inline error with Retry; order unchanged | focus error message |
| category | `ZOOM_OUT` / Back / Escape | — | overview | pop (or replace if no prior entry); zoom-out | focus the node that opened it (fallback: overview heading) |
| any | `OPEN_SUMMARY` (<900 px) | — | mobileSummary overlay | `dialog.showModal()` or sheet | focus summary heading; Escape/Back closes |
| any | `popstate` / `hashchange` | — | route parsed from hash | re-render, restore overlay | per target state above |
| any | `REMOVE_ITEM(dishId)` | item exists | same | order service; announce | focus next/previous item or summary heading |

**History decisions [PROPOSED, flag for review]:**
- `ADD` *replaces* the `dish` entry with `overview` instead of pushing. The stack becomes `[overview, category, overview]` (the click path was `[overview, category, dish]`). Back then goes to the category, never re-opens a stale sheet that could be re-submitted. If you prefer Back-to-sheet, it's a one-line change.
- The dish sheet **is** a history entry, so hardware/browser Back closes it.
- Escape on the dialog fires `cancel`/`close`; the handler must call `history.back()` only if the route is still `dish`, to avoid double-popping.

**Invariants (testable):** no event other than `ADD`/`REMOVE_ITEM` changes the order; `ADD` with an already-used `clientRequestId` is a no-op; `ADD` while `adding` is ignored; every state is reachable by keyboard and by plain click/tap with no drag/wheel/pinch; motion never gates a state change (state commits first, animation is cosmetic and cancellable).

### 2.4 Zoom implementation approach [PROPOSED]

Class toggles + CSS transitions on `transform`/`opacity` only (WAAPI optional). Origin of the zoom is the clicked node's bounding rect so the user can recognise where they came from; no blur filter; inactive pane gets `inert` + `aria-hidden` as soon as the transition starts. Under `prefers-reduced-motion: reduce` (checked live via `matchMedia`) the state swaps instantly with at most a 120 ms opacity fade.

---

## 3. Architecture and file changes

### 3.1 Principles for this slice

- Infinite Table is an additional static entry point; shared infra is reused, existing screens are not edited.
- Layers (frontend): `views/components` → `state` → `services` (mock now, `fetch` later). Components never import `mock-*` directly; they go through `services/` so Gate 3/4 swaps the implementation, not the UI.
- Pure logic (router, state machine, order reducer, formatting) has **no DOM access** so it is unit-testable under plain `node:test`.
- No framework, no bundler, no new runtime dependency.
- Catalog text is rendered with `textContent`/DOM APIs, never `innerHTML` with data.

### 3.2 Backend boundaries (no backend code in Gate 1)

| Layer | Future responsibility (Gates 3–5) | Gate 1 |
|---|---|---|
| `api/catalog.py` | `GET /api/catalog/categories`, `…/dishes`, `…/dishes/{id}` | none |
| `api/orders.py` | create/get draft, `PUT/DELETE …/items/{dish_id}` with `version` + `Idempotency-Key`, `GET …/pricing`, `POST …/submit` | none |
| `api/proposals.py` | approve/reject | none |
| `services/pricing.py`, `quantities.py`, `orders.py`, `proposals.py` | deterministic money/quantity math, version checks, transactions | none |
| `schemas/` | Pydantic models mirroring §4 (`Money`, `Dish`, `Order`, `Proposal`) | none |

Gate 1 adds **no backend files**; FastAPI already serves `frontend/` so `http://127.0.0.1:8000/table/` works once files exist. The §4 contracts are written first so the mock service in the frontend is a faithful stand-in.

### 3.3 Files to create or modify

**Create (frontend, Gate 1):**

| File | Why |
|---|---|
| `frontend/table/index.html` | Entry point: `lang="he" dir="rtl"`, skip link, landmarks (`header`, `nav`, `main`, `aside`), live region, `<dialog>` for dish sheet. No inline script/style. |
| `frontend/css/table/tokens.css` | Handoff tokens (colors, type, radii, motion) as custom properties, with the Hebrew display-font decision isolated in one variable. Own file so the stepper's `base.css` is untouched. |
| `frontend/css/table/base.css`, `layout.css`, `components.css`, `motion.css`, `responsive.css` | As proposed in handoff doc 04; logical properties only; `motion.css` holds every animation so reduced-motion is one block. |
| `frontend/js/table/main.js` | Boot: wire router → state → views. |
| `frontend/js/table/state/router.js` | Pure `parseHash`, `buildHash`, route equality. |
| `frontend/js/table/state/ui-state.js` | Pure reducer implementing §2.3. |
| `frontend/js/table/state/order-store.js` | Holds domain order; applies `ADD`/`REMOVE` through the service; idempotency + version; emits change. |
| `frontend/js/table/services/catalog-service.js` | `getCategories()`, `getDishes(categoryId)`, `getDish(id)`; mock-backed now. |
| `frontend/js/table/services/orders-service.js` | `addItem({dishId, quantity, unit, clientRequestId, version})` → full order; mock now. |
| `frontend/js/table/services/mock/catalog.mock.js`, `orders.mock.js` | Clearly labelled mock data/behaviour (`source: "mock"`); **no prices** (`price: {state:"unavailable"}`), dietary fields `null` (unknown). |
| `frontend/js/table/strings.en.js` | All user-visible strings (English for Gate 1 per owner decision); a `strings.he.js` with the same keys makes Hebrew a data change (#B02). |
| `frontend/js/table/components/` `TopBar.js`, `NavigationRail.js`, `SpatialOverview.js`, `CategoryFocus.js`, `DishCard.js`, `DishDialog.js`, `OrderSummary.js`, `MockBanner.js` | Small DOM-building modules; each exports `mount(root, deps)` → `unmount`. |
| `frontend/assets/table/*.png` | Only the ~14 prototype PNGs actually used (copied, not hot-linked) with `frontend/assets/table/README.md` stating "placeholder, provenance unverified (#24)". Roughly 1.5–2 MB of the 7.0 MB set; convert to WebP later. |
| `frontend/js/table/__tests__/*.test.mjs` | `node:test` unit tests (§5). |
| `docs/INFINITE_TABLE_GATE0.md` | This document. |

**Reuse unchanged:** `frontend/js/lib/dom.js`, `announce.js`, `format.js` (`dom.js` read: a generic `h()` hyperscript helper using `textContent` only, so it is safe to reuse; `announce.js` and `format.js` not yet read and will be checked before reuse).

**Modify:**

| File | Change | Why |
|---|---|---|
| `docs/OPEN_DECISIONS.md` | Add handoff ID mapping, new rows #21–#27, decision-conflict note | Required by the instruction (done in this Gate 0 pass). |
| `.github/workflows/ci.yml` | Add `frontend` job: `node --test` | So unit tests actually gate PRs. Needs your OK; small, no dependencies. |
| `README.md` | Add `/table/` URL and test command | Discoverability. |
| `docs/API_CONTRACTS.md`, `docs/AI_AGENT_DESIGN.md`, `docs/UX_UI_SPEC.md`, `docs/DATABASE_SCHEMA.md` | **Not edited now.** Proposed changes are in §4/§1.3 (C3–C5). I'll apply them after you approve the contract direction, so the repo's documented contract isn't rewritten on an unreviewed proposal. | |

**Do not touch:** `frontend/customer/**`, `frontend/css/base.css`, `frontend/css/customer.css`, `frontend/js/customer/**`, `backend/**`, the green-eggs worktree.

### 3.4 Overview layout from data [PROPOSED]

`SpatialOverview` takes the category list and assigns each to a pre-composed layout slot (position/size/blob colour) by index; slots use `inset-inline-start/end`, `inset-block-start` and percentages so the composition mirrors in RTL. Max 6 slots designed for Gate 1 (4 for the prototype set, 2 spare). Categories beyond the slots (or any viewport below the "composed" breakpoint) appear in the always-present **text category list**, which is also the keyboard/AT-first path. DOM order = list order, not visual position; positioning is CSS only, so Tab order is predictable.

---

## 4. Candidate API contracts (reconciled with `docs/API_CONTRACTS.md`)

Candidate only; repo paths kept. Everything below is **mocked** in Gate 1.

```text
Money      { "state": "calculated"|"unavailable", "currency": "ILS"?, "amountMinor": 8400? }
             // unavailable => no amount fields; UI shows "price not available", never 0
Dish       { id, categoryId, name, description|null, image|null,
             pricingUnit: "per_guest"|"per_tray"|"per_weight"|"per_item",
             unitLabel|null,
             price: Money,                              // per unit
             quantityRule: { state:"configured", min, step, max|null } | { state:"unavailable" },
             dietary: { kashrut: "meat"|"dairy"|"pareve"|null,
                        vegetarian: bool|null, vegan: bool|null,
                        allergens: [{name, status:"contains"|"free"}] | null },   // null = unknown
             available: bool }
Order      { id, version, status: "draft"|"pending_approval"|"approved"|"rejected",
             items: [{ dishId, quantity, pricingUnit }],
             pricing: { state, subtotal: Money, deliveryFee: Money, total: Money } }
```

| Method | Path | Notes |
|---|---|---|
| GET | `/api/catalog/categories` | `[ {id, name, sortOrder, image|null} ]` |
| GET | `/api/catalog/dishes?category_id=` | `[Dish]` |
| GET | `/api/catalog/dishes/{id}` | `Dish` |
| POST | `/api/orders` | create draft → `Order` (auth model open, #1) |
| GET | `/api/orders/{id}` | `Order` |
| PUT | `/api/orders/{id}/items/{dish_id}` | Headers: `Idempotency-Key`. Body `{ quantity, version }`. 200 → full `Order` (version+1). Replays of the same key return the original response. 409 `order_version_conflict`; 422 `validation_error` (bad quantity/unit); 409 `dish_unavailable`. |
| DELETE | `/api/orders/{id}/items/{dish_id}?version=` | → full `Order` |
| GET | `/api/orders/{id}/pricing` | Server-computed; `unavailable` until rules exist |
| POST | `/api/orders/{id}/submit` | `draft → pending_approval`, price snapshot; **never** returns `approved`/`confirmed` |
| POST | `/api/orders/{id}/proposals` *(Gate 5; replaces `…/chat` for structured creation)* | Server-generated, validated proposal |
| POST | `/api/orders/{id}/proposals/{pid}/approve` · `/reject` | Approve = transaction: lock order, check pending + `sourceOrderVersion`, apply, `version+1`, return `Order`. **Does not change `order.status`.** |

Proposal body (Gate 5): `{ id, orderId, sourceOrderVersion, changes:[…typed ops…], diff:[{label, before, after}], priceDelta: Money, status: pending|approved|rejected|expired|failed, expiresAt }`. Client never supplies prices or diffs; those are server output only.

Frontend contract rule: UI components read `Money.state`; if not `calculated`, they render the "unavailable" copy. There is no code path that formats a number from anything but a `calculated` Money.

Error shape stays as in the repo: `{ "error": { code, message, details } }`.

---

## 5. Gate 1 implementation and test plan

### 5.1 Scope (minimal vertical slice)

Overview → category → dish sheet → quantity → Add → back on overview with the dish visible in an itemized summary, using labelled mock data. Plus: text navigation alternative, browser Back/forward, deep link refresh, reduced-motion path, desktop + mobile layouts, "Back to table".

**Explicitly out:** event/guest forms, review/quote, AI panel and proposals, admin, real backend/Supabase, prices, auth, localStorage persistence, dietary assertions, filters.
(Event/Guests/Review rail items render disabled or "Gate 2" labelled; they are not hidden, to keep the navigation anatomy honest.)

### 5.2 Build order (each step leaves the app working)

1. Tokens + base CSS + `index.html` skeleton (landmarks, skip link, live region) with text category list.
2. `router.js` + `ui-state.js` with tests first.
3. Catalog + order services/mocks; `order-store.js` with idempotency + version tests.
4. `OrderSummary` (desktop rail ≥1200, compact 900–1199, sheet <900) and `MockBanner` (always visible: "Demo data · prices, ingredients and dietary info are placeholders · order not saved").
5. `SpatialOverview` + `CategoryFocus` + `DishCard`.
6. `DishDialog` (native `<dialog>`): quantity stepper, Add, inline error/retry.
7. Zoom/sheet transitions in `motion.css` + reduced-motion branch.
8. Responsive pass (320→1920, landscape) and focus/announcement pass.
9. Screenshots vs Prototype v2 and a written difference list.
10. **Stop for design review.**

### 5.3 Mock-data labelling rules

- Every mock module exports `source: "mock"`; `MockBanner` renders whenever the active service reports it.
- Quantity unit/step in the mock: single "demo unit", step 1, min 1, max 99, displayed as "Demo quantity". No tray/kg/guest semantics yet and no serving advice.
- Summary shows `Estimated price: unavailable` (from `Money.state`), never `₪0`.
- Dish dietary row shows "Dietary information not provided" because the mock has `null`s.
- Mock dish names/captions are Hebrew placeholders written for layout testing; images use `alt` = dish name for informative card images, `alt=""` for decorative floaters.

### 5.4 Accessibility plan (Gate 1 specifics, against doc 03/05)

- Landmarks: `header`, `nav` (labelled), `main`, `aside` (order summary, labelled "הזמנה שלך"/equivalent), skip link to `main`.
- Headings: one `h1` (page), `h2` category/summary, `h3` cards.
- Category nodes are `<button>` (or `<a href="#/plan/menu/…">`: prefer anchors for route navigation per doc 03, with `role` untouched); visible text label, ≥14 px; image `alt=""` because the label carries the name.
- Dish sheet: native `<dialog>.showModal()` → trapped focus + inert background; Escape closes; focus returns to opener; heading is `aria-labelledby`.
- Order summary is a real list (`<ul>`), each row: name · quantity + unit label · Remove button with name in the accessible label. Quantity stepper uses `<button>`s + `<output aria-live="polite">` (single live region owner; avoid double announcements).
- One restrained global live region for "added" and error notices. Heading focus handles view changes; no duplicate announcement.
- Inactive panes `inert` during/after transition.
- Targets ≥44×44 px; focus ring from `--color-focus` plus a 2 px light inner ring for contrast on blush/sage/photo areas.
- Text sizes per doc 01 ramp; no text <13 px; contrast verified by script (below), not by eye.
- Reduced motion: `@media (prefers-reduced-motion: reduce)` zeroes transform/blur motion; JS also reads `matchMedia` so Web Animations are not started.
- RTL: `dir="rtl"`; logical properties; icons that imply direction (arrows, "back") mirrored; numerals/units in `<bdi>` where mixed with Latin.

### 5.5 Test plan

**Automated (Gate 1, zero new dependencies):**

| Layer | Tool | What |
|---|---|---|
| Unit | `node --test` (built-in, Node ≥18) | `parseHash/buildHash` round-trips + bad ids; `ui-state` transition table (every row in §2.3, plus illegal events ignored); `order-store`: add once, repeat `clientRequestId` no-op, concurrent `ADD` ignored, version increments, failed add leaves order unchanged, remove; `Money` formatting refuses non-`calculated`. |
| Contrast | small Node script computing WCAG ratios for token pairs | Fails on <4.5:1 text / <3:1 UI |
| CI | `ci.yml` frontend job (needs your OK) | runs the above |
| Backend | `ruff` + `pytest` | unchanged; **cannot run here until `uv` is installed** (not claimed as passing) |

**Browser verification (I can drive Chrome with the browser tools I have access to):** scripted pass through the slice at 320, 390, 768, 1280, 1920 px, keyboard-only pass, Back/Forward pass, deep-link refresh, reduced-motion emulation, screenshots of overview / category / dish sheet / summary on desktop and mobile for comparison with Prototype v2.

**Proposed but needs approval (new dev dependencies):** Playwright (E2E + visual snapshots across Chromium/Firefox/WebKit) and `@axe-core/playwright` (automated a11y). I recommend adding them at Gate 2, once more flows exist, rather than for a 6-step slice.

**Manual (cannot be automated or verified by me):** VoiceOver/Safari, NVDA, real iOS/Android touch, 200% zoom on real devices. I will list these as **not verified** in the Gate 1 report unless you run them.

### 5.6 Gate 1 Definition of Done (from doc 05, restated)

A person can start at the overview, open a category, inspect a dish, adjust and add a demo quantity, land back on the table with an itemized summary, and use Back/Forward, with mouse, keyboard and touch, without unexpected mutations or inaccessible controls; code is modular; unit tests pass; no price, quote or dietary claim is displayed. The report will list what was *verified*, what was *not*, and screenshot differences from Prototype v2.

---

## 6. Risks and review questions

Blocking or near-blocking (answers change what I build):

- **Q1 Language.** Repo says Hebrew-only RTL; the prototype and tokens are English/LTR. I propose Hebrew RTL for `/table/` (consistent with the confirmed decision). Is that right, or should Gate 1 be English for design review with strings externalised?
- **Q2 Coexistence.** OK to ship `/table/` beside `/customer/` and leave the stepper untouched until you decide its fate?
- **Q3 Display font.** Georgia has no Hebrew. Provisional plan: use the already-self-hosted Heebo for Hebrew display text. Acceptable as a placeholder until brand (#20, #23)?

Non-blocking (defaults chosen, tell me if you disagree): in-memory demo order (A4); `ADD` replaces the dish history entry; hash routes; `node:test` and a CI frontend job; Playwright/axe deferred to Gate 2.

Risks:

- Asset provenance/licence unknown (#24); keep placeholder-only, do not deploy to production.
- Spatial composition under RTL and 6+ categories needs real visual iteration; budget one review loop.
- `<dialog>` + History API interaction (Escape/Back double-pop) is the most likely source of bugs; covered by the state-machine tests.
- I could not read the original spec or run backend tests/Ruff here; both gaps limit confidence in "no conflicts".
- The `green-eggs-and-ham` identity work could be discarded or adopted; token layer is isolated to avoid rework either way.

---

## 7. Gate 1 implementation report (2026-10-31)

Owner answers: Q1 English for Gate 1; Q2 deferred to me (kept: `/table/` beside `/customer/`, stepper untouched; fate is #22); Q3 Heebo approved as Hebrew placeholder. Branch: `feature/infinite-table` (local, **uncommitted**, nothing pushed).

### Built
`frontend/table/index.html`, `frontend/css/table/{tokens,base,layout,components,motion,responsive}.css`, `frontend/js/table/` (`main.js`, `strings.en.js`, `money.js`, `state/{router,ui-state,order-store}.js`, `services/*` incl. labelled mocks, `components/*`), `frontend/assets/table/` (14 placeholder PNGs + README), `__tests__/` (unit + contrast). `README.md` and `OPEN_DECISIONS.md` updated. No backend, `/customer/` or `base.css` changes.

### Verified (run here)
- `npm test` in `frontend/js/table`: **49/49 pass**: router, reducer transition table, order store (idempotency, busy guard, stale version, failure leaves order untouched), money (non-calculated never renders a number), WCAG contrast of every token pair in use.
- In Chrome (driven by script, desktop 1326×734): overview → category → dish sheet → quantity → Add → overview with the item in the summary; URL/history updated at each step; Back returns to the category, Forward to the overview; **three rapid Add clicks produce exactly one mutation** (qty 3, order version 1→2); Escape closes the sheet and focus returns to the dish card; focus goes to the category heading, to the new summary row after Add; the unavailable dish cannot be added; a bad deep link falls back to the overview with an announcement; `?mockFail` shows an inline error, leaves the order at version 1, and Retry succeeds once; the live region announces add/remove/not-found.
- Phone widths 320 and 390 (iframe at those viewport widths): no horizontal overflow, bottom nav, full-width dish sheet, summary sheet opens from the top bar with focus on its heading.
- No console errors were observed during the runs (console tracking began after first load, so load-time errors are not covered).

### Not verified
- Screen readers (VoiceOver, NVDA), real touch devices, Firefox and Safari, 200% browser zoom, landscape phones.
- Backend `pytest`/Ruff were not run (`uv` not installed). The new `frontend` CI job has **not been run on GitHub** (nothing is pushed); it is the same commands that pass locally.
- Pixel comparison with Prototype v2: only a visual check; see differences below.

### Differences from Prototype v2 (intentional)
Text >= 14 px and 44 px targets; real focus management and a native modal `<dialog>`; dish sheet is a history entry; category text list moved to a strip above the hero so nothing overlaps; one-sentence demo banner; Event/Guests/Review are real pages since Gate 2 (see 7.3); the category switcher links to other categories (no fake filters); no blur on the stage; no `confirm()`; English copy trimmed (e.g. "wander, zoom in" claims removed).

### Known gaps for review
- On phones (< 900 px) switching overview/category is an instant swap, not a zoom (the desktop zoom is a transform transition). Decide if a mobile transition is wanted.
- The demo order is in memory (lost on refresh, and the UI says so); deep links restore the view.
- Overview composition is tuned for ~1300×730 and up to 6 categories; very short or very wide desktop viewports need a design pass.

### 7.1 Follow-up: automated e2e + accessibility, single keyboard path (2026-11-01)

**Single path per category.** On wide screens the text strip is the only keyboard/AT path; the composed nodes are pointer-only (`aria-hidden`, `tabindex=-1`). Hovering or focusing a chip lifts its node so keyboard users still see where they are, and the zoom starts from the node even when the chip was used. On phones the strip is hidden and the nodes are the labelled controls. Focus after zooming out returns to whichever control is in the tab order.

**Automated suite** (`frontend/e2e`, Playwright + @axe-core/playwright, Chromium only, own dependency-free static server): 59 e2e tests plus the 49 unit tests, all passing locally (3 consecutive full runs). Covers: the full slice and history, idempotent Add, Escape/Back, deep links, failure/retry, unknown routes, removal; keyboard-only journey with real Tab presses and modal focus containment; one-tab-stop-per-category; skip link; 10 viewports x 3 states for horizontal overflow, text >= 14 px and 44 px targets; 320 px with 200% text; phone summary sheet; reduced-motion emulation; axe (WCAG 2.0-2.2 A/AA + best practice) on overview, category, dish sheet, unavailable, error and summary states at desktop and phone widths.

**Real defects the suite found and I fixed:** demo banner outside any landmark; accessible names missing the visible text (rail "Soon" buttons, "Explore this dish" cards; WCAG 2.5.3); bottom nav and top bar not reflowing at enlarged text (now a sticky, wrapping bar that unpins itself when it grows tall); focus could scroll under sticky bars (added `scroll-padding`); the page behind the phone summary sheet stayed focusable (now inert).

**Still not verified:** real screen readers, real touch devices, Firefox/Safari (config is Chromium-only), the GitHub CI job, and the true OS-level "larger text" setting (the suite emulates it with `html{font-size:200%}`). One run of the full suite early on showed a single unexplained failure in "failed save, retry adds once" under parallel load; it passed 8/8 in isolation and in the 7 full runs after, so I treat it as a possible timing flake to watch in CI.

### 7.2 Camera zoom and opt-in Explore mode (2026-11-01)

Owner approved options A and B together (decision logged in `OPEN_DECISIONS.md`). Desktop/tablet (>= 900 px) only; phones keep the stacked layout, sheets and instant pane swap.

**A. Route-driven camera.** One scene (`#world`) moved by a camera (`state/camera.js`, pure and unit-tested). Overview = identity; category = camera frames the food object with its dishes orbiting it ("satellites", pointer-only); dish = camera dollies onto that dish beside the sheet. Other food objects, the hero and the text strip recede while zoomed. The category list becomes a side panel (still the keyboard/AT path, same buttons as before) and fades out for the dish close-up so the camera has the whole left area. URL, Back/Forward, deep links and focus behaviour are unchanged; a deep link frames its level instantly (no animation on load). Reduced motion: the camera jumps to the same end state with no transition.

**B. Explore freely (off by default).** A toggle (`aria-pressed`) enables drag-to-pan, wheel zoom toward the pointer and two-finger pinch; the canvas is bounded (scale 0.75-4, at least 30% of the world stays on screen). Keyboard parity: Zoom in / Zoom out / Reset view buttons, plus arrows to pan, + / - to zoom and 0 to reset when focus is in the control group. While it is off nothing intercepts wheel, drag or touch. A drag never also "clicks" the object it ends on. Changing level re-targets the camera and drops the free adjustment; turning Explore off returns to the level view. Not persisted across reloads.

**Verified (automated, Chromium):** 59 unit tests (incl. camera math: zoom-toward-pointer invariance, bounds, focus framing, non-overlapping satellite ring) and 75 e2e tests, three consecutive green runs. New e2e coverage: level transitions and that the dish is on screen left of the sheet; only the active category's dishes visible; deep link frames a dish on load; travel between categories; satellites hidden from AT and out of the tab order; Explore off = inert, on = wheel/drag/keys/buttons/pinch, bounds, no navigation after a drag, re-target and reset, off returns to level; phones have no camera/Explore; reduced motion; axe with Explore on. Also checked by eye in Chrome with real mouse wheel and drag.

**Real defect found by the tests:** dragging from a food image started the browser's native image drag, which cancelled the pan (fixed with `draggable="false"`).

**Not verified:** real touch/trackpad pinch (the pinch test dispatches synthetic pointer events), Firefox/Safari, screen readers, and how the 0.75-4 scale limits and 80 px key step feel on real devices. Zoom strength: after owner feedback the camera now reaches about 2.0x (Salads, the largest object) and 2.4-2.7x (the others) at category level on a ~1330x730 viewport, up to 3.2x cap (dish close-up cap 4.5x, Explore cap 6x). It is limited by the dishes having to fit beside the side panel, so a larger effect needs a bigger base scene or fewer/smaller orbiting dishes. Orbiting-dish labels counter-scale so they stay one size on screen at any zoom and hide while the camera moves.

**Known limits / follow-ups:** tablets between 900 and ~1100 px get a cramped scene next to the side panel and summary; satellite labels can still touch at 6 dishes; Explore state and camera are not in the URL.

**Persistence recommendation (owner asked, 2026-11-01):** keep the camera and the Explore toggle out of the URL (the URL is the shareable, semantic location; a camera offset would bloat history and break deep links) and do not remember the toggle across visits (it captures wheel/drag, so a stale "on" would surprise people). Revisit only if testers keep re-enabling it; a per-tab `sessionStorage` flag would be a small change.

**Test stability note:** two intermittent e2e failures were seen across ~20 full runs (one in 'failed save, retry', one in 'deep link then reload'); neither reproduced in isolation or in 40 repeats at 6 workers. The reload test now waits for the app to boot before asserting. Watch for flakes when CI first runs.

**Status:** everything is local and uncommitted on `feature/infinite-table` until the owner is satisfied (nothing pushed, no PR).

### 7.3 Gate 2: quote review, table guide, event and guest forms (2026-11-01)

All mock-only. The rules live in the mock orders service, which returns **codes** (not copy) so the UI owns wording and Hebrew stays a strings change.

**Quote review** (`#/plan/review`): shows dishes, event, guests and "Price: Not available yet". While a draft, it lists exactly what is missing (server-computed `readiness`), each item linking to where to fix it; a blocked "Request a quote" explains instead of sending. Submitting freezes a snapshot and sets `pending_approval`; the page and the summary then say **"Pending business approval"** and "not a confirmed booking". Nothing says approved, booked or confirmed. After sending, dishes and details are read-only (revisions are out of scope, B15) and the guide is switched off. Submit is idempotent per request id; a stale version is refused.

**Table guide** (scripted AI, in the summary panel): proposals are server-made, carry `sourceOrderVersion`, before/after and an *unavailable* price effect, and never touch the order. Only the separate "Approve change" button applies one, in one step, and only if it is pending, unexpired (10 min), for the current version, on a draft, with an available dish. Reject, dismiss, an out-of-date suggestion or an outage leave the order exactly as it was; a second approve does nothing; submitting invalidates any pending proposal. The UI stops offering Approve as soon as a proposal is stale. If suggestions fail, manual ordering is unaffected (`?mockAiFail` to see it).

**Event and guest forms** (`#/plan/event`, `#/plan/guests`): explicit Save (never autosave), partial saves allowed, visible labels and help, errors tied to fields (`aria-invalid`, `aria-describedby`) plus a focusable summary with jump buttons and a text "Problem:" cue. Unsaved input survives navigating away until saved. Delivery reveals an address field. Dietary groups may overlap: each is only compared with the total guests, never summed.

**Placeholders to decide (OPEN_DECISIONS #28):** required fields for a quote, "today or later" for the date, a 10,000-guest sanity bound, 10-minute proposal expiry, and the mock event-type list (taken from PRD examples).

**Verified (automated, Chromium):** 82 unit tests (server rules, validation, submit/snapshot, the full proposal lifecycle incl. stale, expired with a fake clock, replay, overlap, outage) and 132 e2e tests, three consecutive green runs: complete journey to *pending*, blocked incomplete submit, validation and errors, overlap rules, draft preservation, keyboard-only form fill, every proposal path, axe on all new states at desktop and phone, and the overflow/text-size/44px checks on the new pages at 10 viewports. Checked by eye in Chromium screenshots (desktop and phone).

**Real defects found by the work:** dietary "exceeds total" was also flagged when the adult count itself was invalid (fixed); the summary kept the pre-send hint after sending (fixed); my own test waited on a shared live region that could still hold the previous "saved" message (now waits on the form's own status).

**Not verified:** real screen readers, real touch devices, Firefox/Safari, and the GitHub CI job. The interactive Chrome tab used for earlier manual checks stopped producing frames during this session (zero animation frames on every page, including pages that had rendered fine), so screenshots for this slice came from Playwright's headless Chromium instead.

**Known limits:** the order and drafts live in memory (lost on refresh); the guide's suggestion logic is a fixed script ("first available dish not on the table"), not an AI; proposal expiry is only exercised in unit tests; the published artifact still shows the Gate 1/camera version until republished.

### 7.4 A richer menu and a more dramatic table (2026-11-01)

Owner feedback: the table needed to be much more dramatic and dynamic, with more dishes and options (alcohol, entrees split into salads and hors d'oeuvres), and a question about whether the visuals improve later.

**Menu:** seven categories (Salads, Hors d'oeuvres, Main dishes, Sides, Sweets, Soft drinks, Wine & cocktails) and 26 mock dishes, up from 4 and 12. Alcohol is mock-only (OPEN_DECISIONS #11 log entry): a flag on the dish, labels on the card, the sheet and the review page, and the guide never proposes it. Ten new images were generated and cropped to match; extra prototype images were added by what they actually show (the prototype's filenames are unreliable and several files have messy edges, so they were vetted by eye).

**Composition and motion:** seven pre-composed slots; a staggered entrance; a slow ambient drift on each food object (compositor-only, off under reduced motion); two prop layers at different depths that move at different rates when the camera moves (parallax driven by the camera, never the pointer, with a bounded scale so a prop cannot swallow the screen); a distinct backdrop per category that cross-fades; neighbours recede and orbiting dishes stagger in; the dish image flies from the sheet to its row in the summary after Add (cosmetic, removed when it lands, skipped under reduced motion and on phones). The hero is sized from the stage's own width so it never meets a food object at any desktop width.

**Verified (automated, Chromium):** 84 unit tests and 146 e2e tests, three consecutive green runs after the last change. New coverage: seven categories and chips, no overlapping food objects at 4 sizes, layout guards at 7 sizes (strip clear of Explore, hero text clear of objects and props, labels inside the stage, pane stacking), a distinct backdrop per category, parallax at different rates, no pointer-driven movement, staggered entrance, the fly-to-table leaves nothing behind, alcohol labelling on all three surfaces, the guide never proposes alcohol over a full run, phones without depth props, reduced motion. Checked by eye in Playwright screenshots (desktop, wine and salad categories, dish close-up, phone).

**Real defects found along the way:** orbiting dishes were stacked beneath their own food object so a wide object swallowed clicks (fixed); the category strip ran under "Explore freely" (fixed); a depth prop painted over the side panel (fixed with explicit pane stacking); the hero text reached a food object at 900, 1024 and 1920 px (fixed by sizing from the stage); the intro paragraph collapsed to a narrow column on phones (fixed); the node drop-shadow was on a parent of the drifting image, forcing re-rasterisation every frame and making wheel input very slow (moved onto the image). One intermittent test failure under heavy parallel load turned out to be a 5-second assertion patience limit, not an app bug (default wait raised to 10 s).

**Not verified:** real devices and GPUs (performance was measured only in headless software rendering; the drift and parallax use compositor-friendly properties, but weak phones and old tablets are untested), Firefox/Safari (`@property` backdrop cross-fades degrade to an instant change where unsupported), screen readers, and the GitHub CI job.

**Honest limits:** the new pictures are generated placeholders and look like it in places (clipped bowl rims on some prototype cutouts, a plastic sheen on some drinks); production quality needs real photography. Two images (`pierced_orange` ring, `pearl_tin`) are decorative curiosities. Assets are now about 8 MB.

**Will the visuals improve later?** Yes, in three separate ways: composition and motion (done here, tunable now); the pictures themselves (real photography once the menu exists, Gate 3); and brand identity (#20-#23), which restyles everything through the tokens.

### 7.5 The owner's rules in the demo, with sample prices (2026-11-01)

The owner answered the questionnaire and the project owner allowed sample values for anything still missing, so the demo now follows the real rules with made-up numbers (logged as "demo values" in OPEN_DECISIONS).

**Real rules (from the owner):** contact name and mobile number are part of a request; at least one day's notice; Shabbat and holidays are closed for pickup and delivery (a Friday delivery for a Shabbat meal stays possible); fixed time windows; delivery needs an area from a list, each with a fixed fee; a minimum order for delivery only; prices include VAT and are shown as an estimate; units are per tray, per piece and by weight priced per 100 g; the guide's suggestions round up to whole trays.

**Sample values (replace with the owner's):** the six delivery areas and their fees, the 500 delivery minimum, the window times, three holiday dates, all 26 dish prices, quantity steps (pieces in sixes, weight in 500 g steps, trays singly), and the sample menu.

**Pricing is calculated only by the server (mock):** line totals, subtotal, delivery fee (none for pickup; the area's fee for delivery; "choose area" until one is picked, never a guessed zero), total, and the delivery-minimum check. The page only formats what it is given. An empty order shows no price at all. A proposal's price effect is the server's number, and approving it changes the total by exactly that amount (tested). A sent request freezes its price snapshot.

**Verified (automated, Chromium):** 99 unit tests and 156 e2e tests, two consecutive green runs. New coverage: totals and line prices, units and quantity steps for all three units, delivery fee by area, no guessed fee, the delivery minimum, notice, Shabbat and phone rules, the frozen price, price effect equals total change, unit wording, money formatting. Also looked at in screenshots.

**Not verified / limits:** all prices, fees and dates are samples and some are guesses (the holiday dates especially are not a real calendar); no rounding rule beyond whole agorot (#36); portion-size based quantity suggestions are not built yet (#32); the Hebrew number and currency formatting is untested; real devices, Safari/Firefox and screen readers as before.

