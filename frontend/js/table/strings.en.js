// All user-visible copy for /table/. Gate 1 is English for design review (decision 2026-10-31).
// Production language is Hebrew/RTL (OPEN_DECISIONS #12): a strings.he.js with the same keys replaces this file.
// Microcopy is *suggested*, not locked brand language.
export const t = {
  brand: "Catering Co.", // replaceable placeholder (OPEN #20)
  pageTitle: "Plan your gathering",
  skip: "Skip to main content",
  demoBanner: "Demo data. Dishes, images and quantities are placeholders. No prices, serving advice or dietary information here is real, and your table is not saved.",
  noscript: "This planner needs JavaScript to run.",

  nav: {
    label: "Event workspace",
    table: "Table",
    menu: "Menu",
    event: "Event",
    guests: "Guests",
    review: "Review",
    soon: "Soon",
    comingSoon: (name) => `${name} (coming soon)`,
  },
  breadcrumb: { label: "You are here", root: "Your table" },
  review: { button: "Review your table", pendingHint: "Review and quote request arrive in the next phase of this demo." },
  tableToggle: (count) => `Your table (${count})`,

  overview: {
    eyebrow: "Your gathering, your way",
    title: "Make room for good food.",
    body: "Pick a category, choose a dish, and bring it back to your table.",
    listLabel: "Browse categories by name",
    nodeLabel: (name) => `Explore ${name.toLowerCase()}`,
  },

  category: {
    eyebrow: "Zoomed in · The menu",
    back: "Back to your table",
    intro: "Choose a dish and bring it back to your table.",
    count: (i, n) => `${String(i).padStart(2, "0")} / ${String(n).padStart(2, "0")}`,
    otherLabel: "Other categories",
    listLabel: (name) => `${name} dishes`,
    explore: (dish) => `Explore dish: ${dish}`, // must contain the visible label (WCAG 2.5.3)
    exploreVisible: "Explore dish",
    unavailable: "Not available",
    demoTag: "Demo dish · details unverified",
    empty: "There are no dishes in this category yet.",
  },

  dish: {
    eyebrow: "Look closer",
    close: "Close dish details",
    demoTag: "Demo dish · details unverified",
    price: "Price",
    priceValue: "Not available yet",
    dietary: "Dietary information",
    dietaryValue: "Not provided",
    availability: "Availability",
    availableDemo: "Available (demo)",
    unavailable: "Not available",
    unavailableNote: "This dish can't be added right now.",
    qtyLabel: "Quantity (demo units)",
    qtyHint: "Demo quantity. Real units, minimums and serving advice will come from the business.",
    decrease: "Decrease quantity",
    increase: "Increase quantity",
    qtyValue: (n) => `${n} demo ${n === 1 ? "unit" : "units"}`,
    add: "Add to my table",
    adding: "Adding…",
    retry: "Try again",
  },

  explore: {
    toggle: "Explore freely",
    groupLabel: "View controls",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    reset: "Reset view",
    hint: "Drag to pan. Scroll or pinch to zoom. With a control focused: arrow keys pan, + and − zoom, 0 resets.",
    on: "Free exploration is on. Drag to pan, scroll or pinch to zoom.",
    off: "Free exploration is off.",
    resetDone: "View reset.",
  },

  summary: {
    title: "Your table",
    eyebrow: "At a glance",
    status: "Draft · demo order · not saved",
    empty: "Your table is waiting. Explore a category and choose something delicious.",
    itemsLabel: "Dishes on your table",
    line: (n) => `× ${n} demo ${n === 1 ? "unit" : "units"}`,
    remove: (name) => `Remove ${name} from your table`,
    price: "Estimated price",
    priceValue: "Not available yet",
    close: "Close your table",
    version: (v) => `Order version ${v}`,
  },

  announce: {
    added: (qty, name, total) => `Added ${qty} × ${name}. Your table now has ${total} ${total === 1 ? "dish" : "dishes"}.`,
    removed: (name, total) => `Removed ${name}. Your table now has ${total} ${total === 1 ? "dish" : "dishes"}.`,
    notFound: "We couldn't find that page, so we've taken you back to your table.",
    comingSoon: "That part of the planner isn't in this demo yet.",
  },

  errors: {
    network: "We couldn't reach the server, so nothing was added. Please try again.",
    busy: "Still saving the previous change. Please wait a moment.",
    unavailable: "This dish can't be added right now.",
    conflict: "Your table changed in the meantime. Please check it and try again.",
    generic: "Something went wrong and nothing was added. Please try again.",
    removeFailed: "We couldn't remove that dish. Please try again.",
    load: "We couldn't load the menu. Please reload the page to try again.",
  },
};
