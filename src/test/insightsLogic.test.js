import { describe, it, expect } from "vitest";

// ── Replicate InsightsTab computation logic for testability ──
// These functions mirror the inline computations in InsightsTab.jsx

function computePriceAlerts(inventory) {
  return inventory.filter(i => {
    const ph = i.priceHistory;
    return ph && ph.length >= 2 && ph[ph.length - 1].price > ph[ph.length - 2].price;
  }).map(i => {
    const ph = i.priceHistory;
    const curr = ph[ph.length - 1].price;
    const prev = ph[ph.length - 2].price;
    return { ...i, prev, curr, pctChange: ((curr - prev) / prev * 100) };
  });
}

function computeABC(inventory, history) {
  const consumptionMap = {};
  history.forEach(h => { consumptionMap[h.item] = (consumptionMap[h.item] || 0) + Number(h.qty || 0); });
  const totalConsumed = Object.values(consumptionMap).reduce((s, v) => s + v, 0);
  const sorted = inventory.map(i => ({ ...i, consumed: consumptionMap[i.name] || 0 })).sort((a, b) => b.consumed - a.consumed);
  let cum = 0;
  const abc = { A: [], B: [], C: [] };
  sorted.forEach(item => {
    cum += item.consumed;
    const pct = totalConsumed > 0 ? cum / totalConsumed : 1;
    if (pct <= 0.70) abc.A.push(item);
    else if (pct <= 0.90) abc.B.push(item);
    else abc.C.push(item);
  });
  return abc;
}

function computeVED(inventory, history) {
  const consumptionMap = {};
  history.forEach(h => { consumptionMap[h.item] = (consumptionMap[h.item] || 0) + Number(h.qty || 0); });
  const ved = { V: [], E: [], D: [] };
  inventory.forEach(item => {
    const c = consumptionMap[item.name] || 0;
    if (item.category === "Baby" || item.reorder >= 10 || c > 5) ved.V.push(item);
    else if (c >= 1 || item.reorder >= 2) ved.E.push(item);
    else ved.D.push(item);
  });
  return ved;
}

function computePredictions(inventory, history) {
  return inventory.map(item => {
    const entries = history.filter(h => h.item === item.name);
    if (!entries.length) return null;
    const total = entries.reduce((s, h) => s + Number(h.qty), 0);
    const dates = entries.map(h => new Date(h.time).getTime());
    const span = Math.max(1, (Date.now() - Math.min(...dates)) / 86400000);
    const rate = total / span;
    const daysLeft = rate > 0 ? Math.floor(item.qty / rate) : null;
    const expiryDays = item.expiry ? Math.ceil((new Date(item.expiry) - new Date()) / 86400000) : null;
    const effective = expiryDays != null && daysLeft != null ? Math.min(daysLeft, expiryDays) : daysLeft ?? expiryDays;
    return { ...item, daysRemaining: effective, limitReason: expiryDays != null && daysLeft != null && expiryDays < daysLeft ? "expiry" : "usage" };
  }).filter(Boolean);
}

describe("InsightsTab logic", () => {
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
      // Milk = 20 out of total 30 = 66.7% cumulative → A bucket (<=70%)
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
      const hist = [
        { item: "Milk", qty: 10 },
      ];
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
      const hist = [
        { item: "Milk", qty: 5, time: tenDaysAgo },
      ];
      // rate = 5 / 10 = 0.5/day, daysLeft = floor(10 / 0.5) = 20
      const preds = computePredictions(inv, hist);
      expect(preds).toHaveLength(1);
      expect(preds[0].daysRemaining).toBe(20);
    });

    it("uses expiry as effective limit when sooner than usage prediction", () => {
      const inv = [{ id: "1", name: "Milk", qty: 100, unit: "Gallons", expiry: new Date(Date.now() + 3 * 86400000).toISOString() }];
      const tenDaysAgo = new Date(Date.now() - 10 * 86400000);
      const hist = [
        { item: "Milk", qty: 1, time: tenDaysAgo },
      ];
      // rate = 1/10 = 0.1/day, usage days = floor(100/0.1) = 1000
      // expiry days = ~3
      // effective = min(1000, 3) = 3
      const preds = computePredictions(inv, hist);
      expect(preds[0].daysRemaining).toBeLessThanOrEqual(4);
      expect(preds[0].limitReason).toBe("expiry");
    });
  });
});
