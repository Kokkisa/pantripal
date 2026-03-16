// ── PantriPal Shared Utilities ────────────────────────────────
import { HOUSEHOLD_UNITS, PRODUCT_DEFAULTS } from "./pantriConstants.js";

export const stockLevel = (qty, reorder) => qty <= 0 ? "out" : qty <= reorder ? "low" : "good";

export const isExpiringSoon = (e) => e && (new Date(e) - new Date()) / 86400000 <= 7;

export function getSmartUnit(name) {
  const l = name.toLowerCase().trim();
  for (const [k, u] of Object.entries(HOUSEHOLD_UNITS)) {
    if (k.toLowerCase() === l) return { unit: u, source: "household", category: null };
  }
  for (const [k, d] of Object.entries(PRODUCT_DEFAULTS)) {
    if (l.includes(k)) return { unit: d.unit, source: "global", category: d.category };
  }
  return { unit: "Pcs", source: "fallback", category: null };
}

export function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function matchBillItem(name, inventory) {
  const lower = name.toLowerCase().trim();
  return inventory.find(i =>
    i.name.toLowerCase().includes(lower) ||
    lower.includes(i.name.toLowerCase()) ||
    (i.brand && lower.includes(i.brand.toLowerCase()))
  ) || null;
}

export function compressImage(file, maxWidth = 250, quality = 0.45) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        let q = quality;
        let result = canvas.toDataURL("image/jpeg", q);
        while (result.length > 80000 && q > 0.1) {
          q -= 0.1;
          result = canvas.toDataURL("image/jpeg", q);
        }
        resolve(result);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}
