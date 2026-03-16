/**
 * Shared insights computation logic.
 * Imported by both InsightsTab.jsx (UI) and insightsLogic.test.js (tests).
 * Keeps a single source of truth — no duplicated logic.
 */

/** Build a { itemName → totalQtyConsumed } map from history */
export function buildConsumptionMap(history) {
  const map = {};
  history.forEach(h => { map[h.item] = (map[h.item] || 0) + Number(h.qty || 0); });
  return map;
}

/** Price alerts: items whose latest price is higher than the previous one */
export function computePriceAlerts(inventory) {
  return inventory.filter(i => {
    const ph = i.priceHistory;
    return ph && ph.length >= 2 && ph[ph.length - 1].price > ph[ph.length - 2].price;
  }).map(i => {
    const ph = i.priceHistory;
    const curr = ph[ph.length - 1].price;
    const prev = ph[ph.length - 2].price;
    return { ...i, prev, curr, pctChange: ((curr - prev) / prev * 100) };
  }).sort((a, b) => b.pctChange - a.pctChange);
}

/** ABC analysis: Pareto classification by consumption volume */
export function computeABC(inventory, history) {
  const consumptionMap = buildConsumptionMap(history);
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

/** VED classification: Vital / Essential / Desirable */
export function computeVED(inventory, history) {
  const consumptionMap = buildConsumptionMap(history);
  const ved = { V: [], E: [], D: [] };
  inventory.forEach(item => {
    const c = consumptionMap[item.name] || 0;
    if (item.category === "Baby" || item.reorder >= 10 || c > 5) ved.V.push(item);
    else if (c >= 1 || item.reorder >= 2) ved.E.push(item);
    else ved.D.push(item);
  });
  return ved;
}

/** Predicted reorder: days remaining based on usage rate + expiry */
export function computePredictions(inventory, history) {
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
    const rateLabel = rate >= 1 ? `${rate.toFixed(1)} ${item.unit}/day` : `1 ${item.unit} every ${Math.round(1 / rate)} days`;
    return { ...item, daysRemaining: effective, rateLabel, limitReason: expiryDays != null && daysLeft != null && expiryDays < daysLeft ? "expiry" : "usage" };
  }).filter(Boolean).sort((a, b) => (a.daysRemaining ?? 999) - (b.daysRemaining ?? 999));
}

/** Waste risk: items expiring within 7 days that still have stock */
export function computeWasteRisk(inventory) {
  return inventory.filter(i => i.expiry && i.qty > 0 && (new Date(i.expiry) - new Date()) / 86400000 <= 7);
}
