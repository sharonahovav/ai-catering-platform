// MOCK CATALOG: layout and interaction testing only. NOT the business menu.
// Names/captions are sample content. There are no prices, no real serving rules and no dietary facts: dietary
// fields are null = "unknown" (never shown as safe). Images are placeholder art, provenance unverified
// (docs/OPEN_DECISIONS.md #24): some come from the design prototype, some were generated for this demo.
// `alcohol` is a MOCK-ONLY flag: real alcohol rules (age check, licensing, kosher wine) are undecided (#11).
// Shapes follow docs/INFINITE_TABLE_GATE0.md §4.
export const source = "mock";

const UNAVAILABLE_PRICE = Object.freeze({ state: "unavailable" });
const DEMO_RULE = Object.freeze({ state: "configured", min: 1, step: 1, max: 99 }); // demo values, not business rules
const UNKNOWN_DIETARY = Object.freeze({ kashrut: null, vegetarian: null, vegan: null, allergens: null });

export const CATEGORIES = [
  { id: "salads", name: "Salads", sortOrder: 1, image: "../assets/table/beet_citrus_salad.png" },
  { id: "hors_doeuvres", name: "Hors d'oeuvres", sortOrder: 2, image: "../assets/table/stuffed_mushrooms.png" },
  { id: "mains", name: "Main dishes", sortOrder: 3, image: "../assets/table/herb_salmon.png" },
  { id: "sides", name: "Sides", sortOrder: 4, image: "../assets/table/roasted_carrots.png" },
  { id: "sweets", name: "Sweets", sortOrder: 5, image: "../assets/table/pink_macarons.png" },
  { id: "soft_drinks", name: "Soft drinks", sortOrder: 6, image: "../assets/table/lemonade.png" },
  { id: "wine_cocktails", name: "Wine & cocktails", sortOrder: 7, image: "../assets/table/red_wine.png" },
];

const dish = (id, categoryId, name, description, { available = true, alcohol = false } = {}) => ({
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
  alcohol,
  available,
});

export const DISHES = [
  // Order matters: the scripted guide suggests the first available, non-alcohol dish that is not on the table yet.
  dish("beet_citrus_salad", "salads", "Beet & citrus salad", "Bright, jewel-toned, and full of character."),
  dish("heirloom_tomato_salad", "salads", "Heirloom tomato salad", "Colorful shapes, a simple classic."),
  dish("green_bean_salad", "salads", "Green bean & almond", "A crisp little study in green."),
  dish("pomegranate_grain_salad", "salads", "Pomegranate grain salad", "The joy of unexpected textures."),
  dish("caprese_salad", "salads", "Caprese salad", "Tomato, mozzarella and basil, stacked and simple."),

  dish("bruschetta", "hors_doeuvres", "Mini bruschetta", "Crisp toasts piled with tomato and basil."),
  dish("stuffed_mushrooms", "hors_doeuvres", "Stuffed mushrooms", "Golden, herby, and easy to eat standing up."),
  dish("falafel_bites", "hors_doeuvres", "Falafel bites", "Crunchy outside, green inside, with a tahini drizzle."),
  dish("savory_tartlets", "hors_doeuvres", "Savory tartlets", "Small pastry cups with roasted vegetables."),
  dish("squash_soup", "hors_doeuvres", "Roasted squash soup", "A warm, golden spoonful to start."),

  dish("herb_salmon", "mains", "Herb-roasted salmon", "A composed centerpiece."),
  dish("roasted_cauliflower", "mains", "Roasted cauliflower", "A generous, golden centerpiece."),
  dish("sauteed_mushrooms", "mains", "Warm wild mushrooms", "Earthy, sculptural, comforting."),

  dish("roasted_carrots", "sides", "Rainbow roasted carrots", "A vibrant edible color story."),
  dish("hummus", "sides", "Silky hummus", "A familiar favorite, reimagined."),
  dish("fennel_citrus_salad", "sides", "Fennel & citrus", "A bright, sunny side."),
  dish("herb_grain_salad", "sides", "Herb & avocado grain salad", "Green, fresh, and generous."),

  dish("pink_macarons", "sweets", "Pink macarons", "Small, playful, and sweet."),
  dish("lollipops", "sweets", "Fruit lollipops", "Sugar glass in sunny colors."),
  // Deliberately unavailable in the mock so the "unavailable" state is exercised.
  dish("pink_candies", "sweets", "Pink candies", "Sample item used to show the unavailable state.", { available: false }),

  dish("lemonade", "soft_drinks", "Sparkling lemonade", "Lemon, mint and bubbles by the pitcher."),
  dish("iced_tea", "soft_drinks", "Iced tea", "Cold, amber, with lemon and mint."),
  dish("sparkling_water", "soft_drinks", "Sparkling water", "Crisp and plain, with a slice of lime."),

  // MOCK ONLY: alcohol policy is undecided (OPEN_DECISIONS #11). The guide never suggests these.
  dish("red_wine", "wine_cocktails", "Red wine", "A bottle and glasses for the table.", { alcohol: true }),
  dish("sparkling_wine", "wine_cocktails", "Sparkling wine", "For toasts.", { alcohol: true }),
  dish("citrus_spritz", "wine_cocktails", "Citrus spritz", "Orange, ice and bubbles.", { alcohol: true }),
];

export const findDish = (id) => DISHES.find((d) => d.id === id) ?? null;

// PLACEHOLDER event types, taken from the private-event examples in docs/PRD.md. The real list is owner-configured.
export const EVENT_TYPES = [
  { id: "birthday", name: "Birthday" },
  { id: "family", name: "Family celebration" },
  { id: "bar_bat_mitzvah", name: "Bar or bat mitzvah" },
  { id: "shabbat", name: "Shabbat meal" },
  { id: "other", name: "Other private event" },
];
