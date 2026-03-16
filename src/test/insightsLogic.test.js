import { describe, it, expect } from "vitest";
import {
  computePriceAlerts,
  computeABC,
  computeVED,
  computePredictions,
  computeWasteRisk,
  buildConsumptionMap,
} from "../lib/insightsLogic.js";

// ── Tests now import shared production logic — no duplicated computation ──

describe("InsightsTab logic (shared module)", () => {
  // ── buildConsumptionMap ──────────────────────────────────
  describe("buildConsumptionMap", () => {
    it("aggregates qty by item name", () => {
      const history = [
        { item: "Milk", qty: 3 },
        { item: "Rice", qty: 2 },
        { item: "Milk", qty: 5 },
      ];
      const map = buildConsumptionMap(history);
      expect(map.Milk).toBe(8);
      expect(map.Rice).toBe(2);
    });

    it("returns empty object for empty history", () => {
      expect(buildConsumptionMap([])).toEqual({});
    });
  });

  // ── Price alerts ───────────────────────────────────────────
  describe("price alerts", () => {
    it("flags items with increasing price", () => {
      const inv = [
        { id: "1", name: "Pasta", priceHistory: [{ price: 110, date: "2026-02-10" }, { price: 120, date: "2026-03-05" }] },
      ];
      const alerts = computePriceAlerts(inv);
      expect(alerts).toHaveLength(1);
      expect(alerts[0].name).toBe("Pasta");
      expect(alerts[0].pctChange).toBeCloseTo(9.09, 1);
    });

    it("does not flag items with stable or decreasing price", () => {
      const inv = [
        { id: "1", name: "Rice", priceHistory: [{ price: 85, date: "2026-02-10" }, { price: 85, date: "2026-03-05" }] },
        { id: "2", name: "Oil", priceHistory: [{ price: 260, date: "2026-02-10" }, { price: 250, date: "2026-03-05" }] },
      ];
      const alerts = computePriceAlerts(inv);
      expect(alerts).toHaveLength(0);
    });
  });

  // ── ABC analysis ───────────────────────────────────────────
  describe("ABC analysis", () => {
    it("puts high-consumption items in A bucket", () => {
      const inv = [
        { id: "1", name: "Milk" },
        { id: "2", name: "Rice" },
        { id: "3", name: "Olive Oil" },
        { id: "4", name: "Pasta" },
      ];
      const hist = [
        { item: "Milk", qty: 20 },
        { item: "Rice", qty: 5 },
        { item: "Olive Oil", qty: 3 },
        { item: "Pasta", qty: 2 },
      ];
      const abc = computeABC(inv, hist);
      expect(abc.A.some(i => i.name === "Milk")).toBe(true);
    });

    it("puts zero-consumption items in C bucket", () => {
      const inv = [
        { id: "1", name: "Milk" },
        { id: "2", name: "NeverUsed" },
      ];
      const hist = [{ item: "Milk", qty: 10 }];
      const abc = computeABC(inv, hist);
      expect(abc.C.some(i => i.name === "NeverUsed")).toBe(true);
    });
  });

  // ── VED classification ─────────────────────────────────────
  describe("VED classification", () => {
    it("classifies Baby category as Vital", () => {
      const inv = [{ id: "1", name: "Diapers", category: "Baby", reorder: 5 }];
      const ved = computeVED(inv, []);
      expect(ved.V.some(i => i.name === "Diapers")).toBe(true);
    });

    it("classifies items with high reorder as Vital", () => {
      const inv = [{ id: "1", name: "Rice", category: "Grains", reorder: 15 }];
      const ved = computeVED(inv, []);
      expect(ved.V.some(i => i.name === "Rice")).toBe(true);
    });

    it("classifies low-use no-reorder items as Desirable", () => {
      const inv = [{ id: "1", name: "Truffle Oil", category: "Condiments", reorder: 0 }];
      const ved = computeVED(inv, []);
      expect(ved.D.some(i => i.name === "Truffle Oil")).toBe(true);
    });
  });

  // ── Predicted reorder ──────────────────────────────────────
  describe("predicted reorder", () => {
    it("computes correct daysRemaining from usage rate", () => {
      const inv = [{ id: "1", name: "Milk", qty: 10, unit: "Gallons", expiry: null }];
      const tenDaysAgo = new Date(Date.now() - 10 * 86400000);
      const hist = [{ item: "Milk", qty: 5, time: tenDaysAgo }];
      const preds = computePredictions(inv, hist);
      expect(preds).toHaveLength(1);
      expect(preds[0].daysRemaining).toBe(20);
    });

    it("uses expiry as effective limit when sooner than usage prediction", () => {
      const inv = [{ id: "1", name: "Milk", qty: 100, unit: "Gallons", expiry: new Date(Date.now() + 3 * 86400000).toISOString() }];
      const tenDaysAgo = new Date(Date.now() - 10 * 86400000);
      const hist = [{ item: "Milk", qty: 1, time: tenDaysAgo }];
      const preds = computePredictions(inv, hist);
      expect(preds[0].daysRemaining).toBeLessThanOrEqual(4);
      expect(preds[0].limitReason).toBe("expiry");
    });
  });

  // ── Waste risk ─────────────────────────────────────────────
  describe("waste risk", () => {
    it("flags items expiring within 7 days", () => {
      const inv = [
        { id: "1", name: "Milk", qty: 2, expiry: new Date(Date.now() + 3 * 86400000).toISOString() },
        { id: "2", name: "Rice", qty: 5, expiry: new Date(Date.now() + 30 * 86400000).toISOString() },
      ];
      const risk = computeWasteRisk(inv);
      expect(risk).toHaveLength(1);
      expect(risk[0].name).toBe("Milk");
    });

    it("ignores items with zero qty", () => {
      const inv = [{ id: "1", name: "Milk", qty: 0, expiry: new Date(Date.now() + 1 * 86400000).toISOString() }];
      expect(computeWasteRisk(inv)).toHaveLength(0);
    });
  });
});
