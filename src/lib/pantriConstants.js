// ── PantriPal Shared Constants ────────────────────────────────

export const DEFAULT_SPACES = [
  { id: "s1", name: "Main Pantry", icon: "🗄️", color: "#fff8f0", accent: "#d97706",
    shelves: [{ id: "A1", name: "Dry Goods", shelfColor: "#d97706", items: "Rice, Pasta, Oats" },
              { id: "A2", name: "Canned Goods", shelfColor: "#ea580c", items: "Cans, Sauces" },
              { id: "A3", name: "Snacks & Extras", shelfColor: "#ca8a04", items: "Snacks, Oils" }] },
  { id: "s2", name: "Refrigerator", icon: "🧊", color: "#f0fdf9", accent: "#059669",
    shelves: [{ id: "F1", name: "Top Shelf", shelfColor: "#0891b2", items: "Milk, Yogurt" },
              { id: "F2", name: "Middle Shelf", shelfColor: "#0284c7", items: "Leftovers" },
              { id: "F3", name: "Veggie Drawer", shelfColor: "#059669", items: "Vegetables" }] },
  { id: "s3", name: "Baby Corner", icon: "🍼", color: "#fdf4ff", accent: "#9333ea",
    shelves: [{ id: "B1", name: "Baby Food & Formula", shelfColor: "#9333ea", items: "Formula" },
              { id: "B2", name: "Diapers & Wipes", shelfColor: "#a855f7", items: "Diapers" }] },
];

export const UNITS = ["Pcs","Kg","G","Lbs","Oz","Liters","Ml","Gallons","Cartons","Packs","Cans","Bottles","Boxes","Bags","Loaves","Cups","Jars","Rolls"];

export const CATEGORIES = ["Grains & Pasta","Canned Goods","Dairy","Produce","Snacks","Beverages","Baby","Cleaning","Frozen","Condiments","Bakery","Other"];

export const HOUSEHOLD_UNITS = { "Milk":"Gallons","Rice":"Kg","Pasta":"Packs","Diapers":"Pcs","Eggs":"Pcs","Bread":"Loaves" };

export const PRODUCT_DEFAULTS = {
  "milk":{ unit:"Gallons", category:"Dairy" }, "rice":{ unit:"Kg", category:"Grains & Pasta" },
  "pasta":{ unit:"Packs", category:"Grains & Pasta" }, "eggs":{ unit:"Pcs", category:"Dairy" },
  "bread":{ unit:"Loaves", category:"Bakery" }, "butter":{ unit:"Packs", category:"Dairy" },
  "yogurt":{ unit:"Cups", category:"Dairy" }, "juice":{ unit:"Bottles", category:"Beverages" },
  "diapers":{ unit:"Pcs", category:"Baby" }, "formula":{ unit:"Cans", category:"Baby" },
  "spinach":{ unit:"Bags", category:"Produce" }, "oil":{ unit:"Bottles", category:"Condiments" },
};

// Stock status → color/label maps
export const SC = { out:"#ef4444", low:"#f97316", good:"#22c55e" };      // text color
export const SB = { out:"#fef2f2", low:"#fff7ed", good:"#f0fdf4" };      // background
export const SBo = { out:"#fecaca", low:"#fde68a", good:"#bbf7d0" };     // border
export const ST = { out:"#991b1b", low:"#92400e", good:"#15803d" };      // dark text
export const SL = { out:"Out", low:"Low", good:"OK" };                    // labels

export const SHELF_COLORS = ["#d97706","#ea580c","#ca8a04","#059669","#0891b2","#0284c7","#9333ea","#a855f7","#ef4444","#6b7280"];

export const SPACE_ICONS = ["🗄️","🧊","🍼","🛒","🍷","🥫","🧴","🫙","🧺","🍳","🌿","📦","🧹","🍕","🏠","🚗"];

export const ONBOARDING_SLIDES = [
  { emoji:"👋", title:"Hey there!", desc:"I'm PantriPal — your smart pantry buddy. Let me show you how easy it is to never lose track of your stuff again. Takes 30 seconds!" },
  { emoji:"🗄️", title:"Step 1: Create Spaces", desc:"Just snap a photo of your rack, shelf, or fridge — name it whatever you like (A1, Top Shelf, Baby Corner). That's your virtual space!" },
  { emoji:"📦", title:"Step 2: Add Items", desc:"Drop items into your spaces — scan a barcode, snap a photo (I'll read the label for you!), or just type it in. Boom, virtually placed!" },
  { emoji:"🔍", title:"Step 3: Find Anything", desc:"No more guessing where you kept things! Search by item or browse by space — find what you need, grab it, and enjoy." },
  { emoji:"😎", title:"Step 4: Chill, I Got This", desc:"Just log what you use and relax. I'll handle your inventory, shopping list, restock alerts, and consumption patterns. You focus on living!" },
];
