// MOCK CATALOG: layout and interaction testing only. NOT the business menu.
// Names/captions are Prototype v2 sample content. There are no prices, no real serving rules and no dietary
// facts: dietary fields are null = "unknown" (never shown as safe). Images are placeholder art, provenance
// unverified (docs/OPEN_DECISIONS.md #24). Shapes follow docs/INFINITE_TABLE_GATE0.md §4.
export const source = "mock";

const UNAVAILABLE_PRICE = Object.freeze({ state: "unavailable" });
const DEMO_RULE = Object.freeze({ state: "configured", min: 1, step: 1, max: 99 }); // demo values, not business rules
const UNKNOWN_DIETARY = Object.freeze({ kashrut: null, vegetarian: null, vegan: null, allergens: null });

export const CATEGORIES = [
  { id: "salads", name: "Salads", sortOrder: 1, image: "../assets/table/beet_citrus_salad.png" },
  { id: "mains", name: "Main dishes", sortOrder: 2, image: "../assets/table/herb_salmon.png" },
  { id: "sides", name: "Sides", sortOrder: 3, image: "../assets/table/roasted_carrots.png" },
  { id: "sweets", name: "Sweets", sortOrder: 4, image: "../assets/table/pink_macarons.png" },
];

const dish = (id, categoryId, name, description, available = true) => ({
  id,
  categoryId,
  name,
  description,
  image: `../assets/table/${id}.png`,
  imageAlt: name,
  pricingUnit: null,
  unitLabel: "demo unit",
  price: UNAVAILABLE_PRICE,
  quantityRule: DEMO_RULE,
  dietary: UNKNOWN_DIETARY,
  available,
});

export const DISHES = [
  dish("beet_citrus_salad", "salads", "Beet & citrus salad", "Bright, jewel-toned, and full of character."),
  dish("heirloom_tomato_salad", "salads", "Heirloom tomato salad", "Colorful shapes, a simple classic."),
  dish("green_bean_salad", "salads", "Green bean & almond", "A crisp little study in green."),
  dish("pomegranate_grain_salad", "salads", "Pomegranate grain salad", "The joy of unexpected textures."),
  dish("herb_salmon", "mains", "Herb-roasted salmon", "A composed centerpiece."),
  dish("roasted_cauliflower", "mains", "Roasted cauliflower", "A generous, golden centerpiece."),
  dish("sauteed_mushrooms", "mains", "Warm wild mushrooms", "Earthy, sculptural, comforting."),
  dish("roasted_carrots", "sides", "Rainbow roasted carrots", "A vibrant edible color story."),
  dish("hummus", "sides", "Silky hummus", "A familiar favorite, reimagined."),
  dish("fennel_citrus_salad", "sides", "Fennel & citrus", "A bright, sunny side."),
  dish("pink_macarons", "sweets", "Pink macarons", "Small, playful, and sweet."),
  // Deliberately unavailable in the mock so the "unavailable" state is exercised.
  dish("pink_candies", "sweets", "Pink candies", "Sample item used to show the unavailable state.", false),
];

export const findDish = (id) => DISHES.find((d) => d.id === id) ?? null;
