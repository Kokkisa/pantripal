import { describe, it, expect } from "vitest";
import { stockLevel, isExpiringSoon, getSmartUnit, matchBillItem, genId } from "../lib/pantriUtils.js";

// ── stockLevel ─────────────────────────────────────────────
describe("stockLevel", () => {
  it("returns 'out' when qty is 0", () => {
    expect(stockLevel(0, 5)).toBe("out");
  });
  it("returns 'out' when qty is negative", () => {
    expect(stockLevel(-1, 5)).toBe("out");
  });
  it("returns 'low' when qty equals reorder", () => {
    expect(stockLevel(3, 3)).toBe("low");
  });
  it("returns 'low' when qty is below reorder but above 0", () => {
    expect(stockLevel(2, 5)).toBe("low");
  });
  it("returns 'good' when qty is above reorder", () => {
    expect(stockLevel(10, 3)).toBe("good");
  });
});

// ── isExpiringSoon ─────────────────────────────────────────
describe("isExpiringSoon", () => {
  it("returns true for item expiring tomorrow", () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString();
    expect(isExpiringSoon(tomorrow)).toBe(true);
  });
  it("returns true for item expiring in 7 days", () => {
    const inSeven = new Date(Date.now() + 7 * 86400000).toISOString();
    expect(isExpiringSoon(inSeven)).toBe(true);
  });
  it("returns false for item expiring in 8 days", () => {
    const inEight = new Date(Date.now() + 8 * 86400000).toISOString();
    expect(isExpiringSoon(inEight)).toBe(false);
  });
  it("returns true for already expired item", () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    expect(isExpiringSoon(yesterday)).toBe(true);
  });
  it("returns falsy for null/undefined input", () => {
    expect(isExpiringSoon(null)).toBeFalsy();
    expect(isExpiringSoon(undefined)).toBeFalsy();
  });
});

// ── getSmartUnit ───────────────────────────────────────────
describe("getSmartUnit", () => {
  it("matches HOUSEHOLD_UNITS exactly (Milk → Gallons)", () => {
    const r = getSmartUnit("Milk");
    expect(r.unit).toBe("Gallons");
    expect(r.source).toBe("household");
  });
  it("is case-insensitive for household match", () => {
    expect(getSmartUnit("milk").unit).toBe("Gallons");
    expect(getSmartUnit("RICE").unit).toBe("Kg");
  });
  it("matches PRODUCT_DEFAULTS by includes (yogurt → Cups)", () => {
    const r = getSmartUnit("Greek Yogurt");
    expect(r.unit).toBe("Cups");
    expect(r.source).toBe("global");
    expect(r.category).toBe("Dairy");
  });
  it("falls back to Pcs for unknown item", () => {
    const r = getSmartUnit("Widget XYZ");
    expect(r.unit).toBe("Pcs");
    expect(r.source).toBe("fallback");
  });
});

// ── genId ──────────────────────────────────────────────────
describe("genId", () => {
  it("returns a non-empty string", () => {
    const id = genId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(5);
  });
  it("generates unique ids", () => {
    const ids = new Set(Array.from({ length: 100 }, () => genId()));
    expect(ids.size).toBe(100);
  });
});

// ── matchBillItem ──────────────────────────────────────────
describe("matchBillItem", () => {
  const inventory = [
    { name: "Milk", brand: "Amul", qty: 3, unit: "Liters" },
    { name: "Basmati Rice", brand: "", qty: 5, unit: "Kg" },
    { name: "Diapers (Size 2)", brand: "Pampers", qty: 8, unit: "Pcs" },
  ];

  it("matches by exact name (case-insensitive)", () => {
    const match = matchBillItem("milk", inventory);
    expect(match).not.toBeNull();
    expect(match.name).toBe("Milk");
  });

  it("matches by partial name (bill name includes inventory name)", () => {
    const match = matchBillItem("Basmati Rice 5kg", inventory);
    expect(match).not.toBeNull();
    expect(match.name).toBe("Basmati Rice");
  });

  it("matches by partial name (inventory name includes bill name)", () => {
    const match = matchBillItem("Diapers", inventory);
    expect(match).not.toBeNull();
    expect(match.name).toBe("Diapers (Size 2)");
  });

  it("matches by brand name", () => {
    const match = matchBillItem("Pampers XL", inventory);
    expect(match).not.toBeNull();
    expect(match.name).toBe("Diapers (Size 2)");
  });

  it("returns null for no match", () => {
    expect(matchBillItem("Avocado", inventory)).toBeNull();
  });

  it("trims whitespace", () => {
    const match = matchBillItem("  milk  ", inventory);
    expect(match).not.toBeNull();
  });
});
