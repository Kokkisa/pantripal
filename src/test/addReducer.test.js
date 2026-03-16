import { describe, it, expect } from "vitest";
import {
  addReducer, initialState,
  RESET, SET_SCREEN, UPDATE_ITEM, UPDATE_META,
  SET_ITEM_AND_SCREEN, SET_META_AND_SCREEN,
  RESOLVE_EXISTING_MISMATCH, RESOLVE_EXISTING_MATCH, RESOLVE_NEW_ITEM,
  PHOTO_PREVIEW, AI_RESULT, AI_ERROR,
  SCAN_START, SCAN_DONE, SCAN_PRODUCT_FOUND, SCAN_AI_RESULT, SCAN_NOT_FOUND, SCAN_ERROR, SCAN_STOP,
  BILL_PREVIEW, BILL_RESULT, BILL_ERROR,
  SAVE_COMPLETE, INIT_FROM_SEARCH, INIT_FROM_SHELF,
} from "../hooks/useAddReducer.js";

describe("addReducer", () => {
  // ── Initial state ────────────────────────────────────────
  describe("initialState", () => {
    it("has correct default screen", () => {
      const s = initialState();
      expect(s.screen).toBe("choose");
    });
    it("has default item fields", () => {
      const s = initialState();
      expect(s.item.name).toBe("");
      expect(s.item.qty).toBe(1);
      expect(s.item.unit).toBe("Pcs");
      expect(s.item.price).toBe("");
      expect(s.item.emoji).toBe("📦");
    });
    it("has empty bill meta", () => {
      const s = initialState();
      expect(s.meta.billItems).toEqual([]);
      expect(s.meta.billImagePreview).toBeNull();
      expect(s.meta.billError).toBeNull();
    });
  });

  // ── Generic actions ──────────────────────────────────────
  describe("RESET", () => {
    it("returns fresh initial state", () => {
      const dirty = { screen: "manual", item: { name: "Milk" }, meta: {} };
      const result = addReducer(dirty, { type: RESET });
      expect(result).toEqual(initialState());
    });
  });

  describe("SET_SCREEN", () => {
    it("changes only screen", () => {
      const s = initialState();
      const result = addReducer(s, { type: SET_SCREEN, screen: "manual" });
      expect(result.screen).toBe("manual");
      expect(result.item).toEqual(s.item);
    });
  });

  describe("UPDATE_ITEM", () => {
    it("merges fields into item", () => {
      const s = initialState();
      const result = addReducer(s, { type: UPDATE_ITEM, fields: { name: "Rice", qty: 5 } });
      expect(result.item.name).toBe("Rice");
      expect(result.item.qty).toBe(5);
      expect(result.item.unit).toBe("Pcs"); // unchanged
    });
  });

  describe("UPDATE_META", () => {
    it("merges fields into meta", () => {
      const s = initialState();
      const result = addReducer(s, { type: UPDATE_META, fields: { scanning: true } });
      expect(result.meta.scanning).toBe(true);
    });
  });

  describe("SET_ITEM_AND_SCREEN", () => {
    it("sets item fields and screen simultaneously", () => {
      const s = initialState();
      const result = addReducer(s, { type: SET_ITEM_AND_SCREEN, fields: { unit: "Kg" }, screen: "set_stock" });
      expect(result.item.unit).toBe("Kg");
      expect(result.screen).toBe("set_stock");
    });
  });

  // ── Resolve intelligence ─────────────────────────────────
  describe("RESOLVE_EXISTING_MATCH", () => {
    it("sets stock_add_confirm screen with existing stock info", () => {
      const s = initialState();
      const existing = { id: "i1", qty: 3, unit: "Kg" };
      const result = addReducer(s, {
        type: RESOLVE_EXISTING_MATCH,
        unitSource: "household", unit: "Kg", existingStock: existing,
      });
      expect(result.screen).toBe("stock_add_confirm");
      expect(result.meta.existingStock).toEqual(existing);
      expect(result.item.unit).toBe("Kg");
    });
  });

  describe("RESOLVE_EXISTING_MISMATCH", () => {
    it("goes to unit_mismatch screen", () => {
      const s = initialState();
      const result = addReducer(s, {
        type: RESOLVE_EXISTING_MISMATCH,
        unitSource: "household", unit: "Kg",
        unitMismatch: { oldUnit: "Lbs", newUnit: "Kg" },
        existingStock: { id: "i1" },
      });
      expect(result.screen).toBe("unit_mismatch");
      expect(result.meta.unitMismatch.oldUnit).toBe("Lbs");
    });
  });

  describe("RESOLVE_NEW_ITEM", () => {
    it("goes to specified screen with unit and optional category", () => {
      const s = initialState();
      const result = addReducer(s, {
        type: RESOLVE_NEW_ITEM,
        unitSource: "global", unit: "Cups", category: "Dairy", screen: "select_location",
      });
      expect(result.screen).toBe("select_location");
      expect(result.item.unit).toBe("Cups");
      expect(result.item.category).toBe("Dairy");
    });
  });

  // ── Photo / AI flow ──────────────────────────────────────
  describe("PHOTO_PREVIEW", () => {
    it("sets imagePreview and goes to ai_analyzing", () => {
      const s = initialState();
      const result = addReducer(s, { type: PHOTO_PREVIEW, imagePreview: "data:image/jpeg;base64,abc" });
      expect(result.item.imagePreview).toBe("data:image/jpeg;base64,abc");
      expect(result.screen).toBe("ai_analyzing");
    });
  });

  describe("AI_RESULT", () => {
    it("populates item fields from AI and goes to review_details", () => {
      const s = initialState();
      const result = addReducer(s, {
        type: AI_RESULT,
        aiResult: { raw: "test" },
        itemFields: { name: "Oreo", brand: "Cadbury", category: "Snacks" },
      });
      expect(result.screen).toBe("review_details");
      expect(result.item.name).toBe("Oreo");
      expect(result.meta.aiResult.raw).toBe("test");
    });
  });

  describe("AI_ERROR", () => {
    it("sets error and goes to review_details", () => {
      const s = initialState();
      const result = addReducer(s, { type: AI_ERROR, aiError: "Failed to analyze" });
      expect(result.screen).toBe("review_details");
      expect(result.meta.aiError).toBe("Failed to analyze");
    });
  });

  // ── Barcode scan flow ────────────────────────────────────
  describe("barcode scan flow", () => {
    it("SCAN_START enables scanning", () => {
      const result = addReducer(initialState(), { type: SCAN_START });
      expect(result.meta.scanning).toBe(true);
      expect(result.meta.scanError).toBeNull();
    });

    it("SCAN_DONE marks scan complete", () => {
      const s = { ...initialState(), meta: { ...initialState().meta, scanning: true } };
      const result = addReducer(s, { type: SCAN_DONE });
      expect(result.meta.scanning).toBe(false);
      expect(result.meta.scanDone).toBe(true);
    });

    it("SCAN_PRODUCT_FOUND merges item fields", () => {
      const result = addReducer(initialState(), {
        type: SCAN_PRODUCT_FOUND,
        itemFields: { name: "Oreo", brand: "Cadbury" },
      });
      expect(result.item.name).toBe("Oreo");
      expect(result.item.brand).toBe("Cadbury");
    });

    it("SCAN_ERROR records error and stops scanning", () => {
      const result = addReducer(initialState(), { type: SCAN_ERROR, scanError: "Camera denied" });
      expect(result.meta.scanning).toBe(false);
      expect(result.meta.scanError).toBe("Camera denied");
    });

    it("SCAN_STOP just stops scanning", () => {
      const s = { ...initialState(), meta: { ...initialState().meta, scanning: true } };
      const result = addReducer(s, { type: SCAN_STOP });
      expect(result.meta.scanning).toBe(false);
    });
  });

  // ── Bill scan flow ───────────────────────────────────────
  describe("bill scan flow", () => {
    it("BILL_PREVIEW sets image and goes to bill_analyzing", () => {
      const result = addReducer(initialState(), {
        type: BILL_PREVIEW,
        imagePreview: "data:image/jpeg;base64,bill123",
      });
      expect(result.meta.billImagePreview).toBe("data:image/jpeg;base64,bill123");
      expect(result.meta.billError).toBeNull();
      expect(result.screen).toBe("bill_analyzing");
    });

    it("BILL_RESULT sets items and goes to bill_review", () => {
      const items = [
        { id: "bill_0", name: "Milk", qty: 2, unit: "Liters", price: 65, matched: null },
        { id: "bill_1", name: "Rice", qty: 1, unit: "Kg", price: 85, matched: { id: "i3" } },
      ];
      const result = addReducer(initialState(), { type: BILL_RESULT, billItems: items });
      expect(result.meta.billItems).toHaveLength(2);
      expect(result.meta.billItems[0].name).toBe("Milk");
      expect(result.meta.billItems[1].matched.id).toBe("i3");
      expect(result.screen).toBe("bill_review");
    });

    it("BILL_ERROR sets error and goes back to bill screen", () => {
      const result = addReducer(initialState(), {
        type: BILL_ERROR,
        billError: "Could not read the bill",
      });
      expect(result.meta.billError).toBe("Could not read the bill");
      expect(result.screen).toBe("bill");
    });
  });

  // ── Save & external entry ────────────────────────────────
  describe("SAVE_COMPLETE", () => {
    it("transitions to saved screen", () => {
      const result = addReducer(initialState(), { type: SAVE_COMPLETE });
      expect(result.screen).toBe("saved");
    });
  });

  describe("INIT_FROM_SEARCH", () => {
    it("resets state with name and goes to manual", () => {
      const dirty = { screen: "saved", item: { name: "Old" }, meta: {} };
      const result = addReducer(dirty, { type: INIT_FROM_SEARCH, name: "Avocado" });
      expect(result.screen).toBe("manual");
      expect(result.item.name).toBe("Avocado");
      expect(result.item.qty).toBe(1); // reset to default
    });
  });

  describe("INIT_FROM_SHELF", () => {
    it("resets state with space/shelf and goes to manual", () => {
      const result = addReducer(initialState(), {
        type: INIT_FROM_SHELF,
        selSpace: { id: "s1", name: "Pantry" },
        selShelf: { id: "A1", name: "Dry Goods" },
      });
      expect(result.screen).toBe("manual");
      expect(result.meta.selSpace.id).toBe("s1");
      expect(result.meta.selShelf.id).toBe("A1");
    });
  });

  // ── Default ──────────────────────────────────────────────
  describe("unknown action", () => {
    it("returns state unchanged", () => {
      const s = initialState();
      const result = addReducer(s, { type: "UNKNOWN_ACTION" });
      expect(result).toBe(s);
    });
  });
});
