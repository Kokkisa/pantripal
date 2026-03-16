import { describe, it, expect } from "vitest";
import {
  DEFAULT_SPACES, UNITS, CATEGORIES, HOUSEHOLD_UNITS, PRODUCT_DEFAULTS,
  SC, SB, SBo, ST, SL, SHELF_COLORS, SPACE_ICONS, ONBOARDING_SLIDES,
} from "../lib/pantriConstants.js";

describe("pantriConstants", () => {
  // ── DEFAULT_SPACES ─────────────────────────────────────────
  describe("DEFAULT_SPACES", () => {
    it("has exactly 3 spaces with correct ids", () => {
      expect(DEFAULT_SPACES).toHaveLength(3);
      expect(DEFAULT_SPACES.map(s => s.id)).toEqual(["s1", "s2", "s3"]);
    });

    it("each space has required fields", () => {
      DEFAULT_SPACES.forEach(space => {
        expect(space).toHaveProperty("id");
        expect(space).toHaveProperty("name");
        expect(space).toHaveProperty("icon");
        expect(space).toHaveProperty("color");
        expect(space).toHaveProperty("accent");
        expect(space).toHaveProperty("shelves");
        expect(Array.isArray(space.shelves)).toBe(true);
        expect(space.shelves.length).toBeGreaterThan(0);
      });
    });

    it("every shelf has id, name, and shelfColor", () => {
      DEFAULT_SPACES.forEach(space => {
        space.shelves.forEach(shelf => {
          expect(shelf).toHaveProperty("id");
          expect(shelf).toHaveProperty("name");
          expect(shelf).toHaveProperty("shelfColor");
          expect(typeof shelf.id).toBe("string");
          expect(typeof shelf.name).toBe("string");
        });
      });
    });
  });

  // ── UNITS ──────────────────────────────────────────────────
  describe("UNITS", () => {
    it("is a non-empty array of strings", () => {
      expect(UNITS.length).toBeGreaterThan(0);
      UNITS.forEach(u => expect(typeof u).toBe("string"));
    });

    it("contains critical units referenced throughout the app", () => {
      ["Pcs", "Kg", "G", "Liters", "Gallons", "Packs", "Cans", "Bottles", "Bags", "Loaves"].forEach(u => {
        expect(UNITS).toContain(u);
      });
    });
  });

  // ── CATEGORIES ─────────────────────────────────────────────
  describe("CATEGORIES", () => {
    it("is a non-empty array of strings", () => {
      expect(CATEGORIES.length).toBeGreaterThan(0);
      CATEGORIES.forEach(c => expect(typeof c).toBe("string"));
    });

    it("contains categories referenced by VED analysis and demo data", () => {
      ["Baby", "Dairy", "Grains & Pasta", "Produce", "Condiments", "Canned Goods"].forEach(c => {
        expect(CATEGORIES).toContain(c);
      });
    });
  });

  // ── HOUSEHOLD_UNITS ────────────────────────────────────────
  describe("HOUSEHOLD_UNITS", () => {
    it("is a non-empty object", () => {
      expect(Object.keys(HOUSEHOLD_UNITS).length).toBeGreaterThan(0);
    });

    it("every value exists in UNITS", () => {
      Object.values(HOUSEHOLD_UNITS).forEach(unit => {
        expect(UNITS).toContain(unit);
      });
    });

    it("known mappings are correct", () => {
      expect(HOUSEHOLD_UNITS["Milk"]).toBe("Gallons");
      expect(HOUSEHOLD_UNITS["Rice"]).toBe("Kg");
      expect(HOUSEHOLD_UNITS["Eggs"]).toBe("Pcs");
      expect(HOUSEHOLD_UNITS["Bread"]).toBe("Loaves");
    });
  });

  // ── PRODUCT_DEFAULTS ───────────────────────────────────────
  describe("PRODUCT_DEFAULTS", () => {
    it("every entry has unit and category", () => {
      Object.entries(PRODUCT_DEFAULTS).forEach(([key, val]) => {
        expect(val).toHaveProperty("unit");
        expect(val).toHaveProperty("category");
      });
    });

    it("all unit values exist in UNITS", () => {
      Object.values(PRODUCT_DEFAULTS).forEach(val => {
        expect(UNITS).toContain(val.unit);
      });
    });

    it("all category values exist in CATEGORIES", () => {
      Object.values(PRODUCT_DEFAULTS).forEach(val => {
        expect(CATEGORIES).toContain(val.category);
      });
    });
  });

  // ── Stock level color/label maps ───────────────────────────
  describe("stock level maps", () => {
    it("SC, SB, SBo, ST all have out/low/good keys", () => {
      [SC, SB, SBo, ST].forEach(map => {
        expect(map).toHaveProperty("out");
        expect(map).toHaveProperty("low");
        expect(map).toHaveProperty("good");
      });
    });

    it("SL has correct labels", () => {
      expect(SL).toEqual({ out: "Out", low: "Low", good: "OK" });
    });
  });

  // ── SHELF_COLORS & SPACE_ICONS ─────────────────────────────
  describe("UI constants", () => {
    it("SHELF_COLORS is a non-empty array", () => {
      expect(SHELF_COLORS.length).toBeGreaterThan(0);
    });

    it("SPACE_ICONS is a non-empty array", () => {
      expect(SPACE_ICONS.length).toBeGreaterThan(0);
    });

    it("ONBOARDING_SLIDES has 5 slides with required fields", () => {
      expect(ONBOARDING_SLIDES).toHaveLength(5);
      ONBOARDING_SLIDES.forEach(slide => {
        expect(slide).toHaveProperty("emoji");
        expect(slide).toHaveProperty("title");
        expect(slide).toHaveProperty("desc");
      });
    });
  });
});
