import { describe, it, expect } from "vitest";
import { stockLevel, isExpiringSoon, getSmartUnit, matchBillItem } from "../lib/pantriUtils.js";

describe("pantriUtils — edge cases", () => {
  // ── matchBillItem edge cases ───────────────────────────────
  describe("matchBillItem edge cases", () => {
    it("returns null for empty inventory", () => {
      expect(matchBillItem("Milk", [])).toBeNull();
    });

    it("matches everything for empty name (empty string is substring of all)", () => {
      const inv = [{ name: "Milk", brand: "Horizon" }];
      // JS: "milk".includes("") === true, so empty name matches first item
      expect(matchBillItem("", inv)).not.toBeNull();
    });

    it("matches everything for whitespace-only name (trims to empty)", () => {
      const inv = [{ name: "Milk", brand: "Horizon" }];
      // "   ".trim() === "", and "milk".includes("") === true
      expect(matchBillItem("   ", inv)).not.toBeNull();
    });

    it("returns first match when multiple items match", () => {
      const inv = [
        { name: "Basmati Rice", brand: "" },
        { name: "Rice Noodles", brand: "" },
      ];
      const result = matchBillItem("Rice", inv);
      expect(result.name).toBe("Basmati Rice");
    });

    it("handles inventory items with null brand without throwing", () => {
      const inv = [{ name: "Milk", brand: null }];
      expect(() => matchBillItem("Horizon", inv)).not.toThrow();
      // brand is null so won't match on brand
      expect(matchBillItem("Horizon", inv)).toBeNull();
    });
  });

  // ── getSmartUnit edge cases ────────────────────────────────
  describe("getSmartUnit edge cases", () => {
    it("returns fallback for empty string", () => {
      const result = getSmartUnit("");
      expect(result.unit).toBe("Pcs");
      expect(result.source).toBe("fallback");
    });

    it("returns fallback for whitespace-only string", () => {
      const result = getSmartUnit("   ");
      expect(result.unit).toBe("Pcs");
      expect(result.source).toBe("fallback");
    });

    it("matches 'chocolate milk' via product defaults (contains 'milk')", () => {
      const result = getSmartUnit("chocolate milk");
      expect(result.unit).toBe("Gallons");
      expect(result.source).toBe("global");
      expect(result.category).toBe("Dairy");
    });
  });

  // ── stockLevel edge cases ──────────────────────────────────
  describe("stockLevel edge cases", () => {
    it("returns 'good' when qty is positive and reorder is 0", () => {
      expect(stockLevel(5, 0)).toBe("good");
    });

    it("handles decimal qty correctly", () => {
      expect(stockLevel(0.5, 1)).toBe("low");
      expect(stockLevel(0.5, 0)).toBe("good");
    });
  });

  // ── isExpiringSoon edge cases ──────────────────────────────
  describe("isExpiringSoon edge cases", () => {
    it("returns falsy for empty string", () => {
      expect(isExpiringSoon("")).toBeFalsy();
    });

    it("handles date-only string correctly", () => {
      // A date far in the future should not be expiring soon
      expect(isExpiringSoon("2030-12-31")).toBeFalsy();
      // A date in the past should be expiring (already expired)
      expect(isExpiringSoon("2020-01-01")).toBeTruthy();
    });
  });
});
