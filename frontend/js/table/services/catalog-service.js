// The only module the UI uses to read the catalog. Gate 3 swaps the mock import for fetch() calls to
// GET /api/catalog/* without touching components.
import { CATEGORIES, DISHES, source } from "./mock/catalog.mock.js";

const clone = (v) => structuredClone(v);
const tick = () => Promise.resolve();

export const catalogService = {
  source,
  async getCategories() {
    await tick();
    return clone([...CATEGORIES].sort((a, b) => a.sortOrder - b.sortOrder));
  },
  async getDishes(categoryId) {
    await tick();
    return clone(DISHES.filter((d) => d.categoryId === categoryId));
  },
  async getDish(id) {
    await tick();
    const found = DISHES.find((d) => d.id === id);
    return found ? clone(found) : null;
  },
};
