// @ts-check
import { test, expect } from "@playwright/test";

// ── Helper: enter demo mode and land on home ────────────────
async function enterDemo(page) {
  await page.goto("/");
  const exploreBtn = page.getByText("Explore Demo →");
  await expect(exploreBtn).toBeVisible({ timeout: 10000 });
  await exploreBtn.click();
  // Skip onboarding — keep trying until nav bar appears
  for (let i = 0; i < 5; i++) {
    const skipBtn = page.getByText("Skip");
    if (await skipBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await skipBtn.click();
    }
    // Check if we're past onboarding
    if (await page.locator("span:text-is('Home')").isVisible({ timeout: 1500 }).catch(() => false)) {
      break;
    }
  }
  // Dismiss any hints on home
  const gotIt = page.getByText("Got it ✓").first();
  if (await gotIt.isVisible({ timeout: 2000 }).catch(() => false)) {
    await gotIt.click();
  }
  await expect(page.locator("span:text-is('Home')")).toBeVisible({ timeout: 5000 });
}

// Nav helper — click the tab bar icon by its label
async function goToTab(page, tabName) {
  // The nav uses <span> with exact text like "Add", "Used", etc.
  await page.locator(`span:text-is("${tabName}")`).click();
  // Dismiss hint if present
  const gotIt = page.getByText("Got it ✓").first();
  if (await gotIt.isVisible({ timeout: 1000 }).catch(() => false)) {
    await gotIt.click();
  }
}

// ═══════════════════════════════════════════════════════════
// HOME TAB
// ═══════════════════════════════════════════════════════════
test.describe("Home Tab", () => {
  test("shows demo dashboard with inventory stats", async ({ page }) => {
    await enterDemo(page);
    await expect(page.locator("text=Your Spaces")).toBeVisible();
    await expect(page.locator("text=Main Pantry")).toBeVisible();
    await expect(page.locator("text=Refrigerator")).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════
// ADD TAB — Choose Screen
// ═══════════════════════════════════════════════════════════
test.describe("Add Tab - Choose Screen", () => {
  test("shows all 4 entry methods", async ({ page }) => {
    await enterDemo(page);
    await goToTab(page, "Add");
    await expect(page.locator("text=Scan Barcode")).toBeVisible();
    await expect(page.locator("text=Snap a Photo")).toBeVisible();
    await expect(page.locator("text=Enter Manually")).toBeVisible();
    await expect(page.locator("text=Scan Bill")).toBeVisible();
    await expect(page.locator("text=BULK ADD")).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════
// ADD TAB — Bill Scan Screen
// ═══════════════════════════════════════════════════════════
test.describe("Add Tab - Bill Scan", () => {
  test("bill capture screen shows demo warning", async ({ page }) => {
    await enterDemo(page);
    await goToTab(page, "Add");
    await page.locator("text=Scan Bill").click();
    await expect(page.locator("text=Scan Bill 🧾")).toBeVisible();
    await expect(page.locator("text=Bill scanning requires the AI API")).toBeVisible();
    await expect(page.locator("text=Tap to photograph your bill")).toBeVisible();
  });

  test("back button returns to choose screen", async ({ page }) => {
    await enterDemo(page);
    await goToTab(page, "Add");
    await page.locator("text=Scan Bill").click();
    await page.locator("text=← Back").click();
    await expect(page.locator("text=Add Item")).toBeVisible();
    await expect(page.locator("text=Scan Barcode")).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════
// ADD TAB — Bill Review (simulated via JS dispatch)
// ═══════════════════════════════════════════════════════════
test.describe("Add Tab - Bill Review", () => {
  async function simulateBillReview(page) {
    await enterDemo(page);
    await goToTab(page, "Add");
    await page.locator("text=Scan Bill").click();

    // Inject bill result via React internals
    await page.evaluate(() => {
      const container = document.getElementById("root");
      const internalKey = Object.keys(container).find((k) => k.startsWith("__reactContainer"));
      const fiber = container[internalKey];
      function findDispatch(f, depth) {
        if (!f || depth > 80) return null;
        if (f.memoizedState) {
          let s = f.memoizedState;
          while (s) {
            if (s.queue && s.queue.lastRenderedState && typeof s.queue.lastRenderedState === "object" && s.queue.lastRenderedState !== null && "screen" in s.queue.lastRenderedState) {
              return s.queue.dispatch;
            }
            s = s.next;
          }
        }
        let result = findDispatch(f.child, depth + 1);
        if (result) return result;
        return findDispatch(f.sibling, depth + 1);
      }
      const dispatch = findDispatch(fiber, 0);
      dispatch({
        type: "BILL_RESULT",
        billItems: [
          { id: "bill_0", name: "Milk", brand: "Amul", qty: 2, unit: "Liters", price: 65, enabled: true, matched: { id: "i2", name: "Milk", qty: 3, unit: "Liters", spaceId: "s2", shelfId: "F1", emoji: "🥛", category: "Dairy", price: 60, priceHistory: [] }, spaceId: "s2", shelfId: "F1", emoji: "🥛", category: "Dairy" },
          { id: "bill_1", name: "Basmati Rice", brand: "", qty: 1, unit: "Kg", price: 85, enabled: true, matched: { id: "i3", name: "Basmati Rice", qty: 5, unit: "Kg", spaceId: "s1", shelfId: "S1", emoji: "🍚", category: "Grains", price: 80, priceHistory: [] }, spaceId: "s1", shelfId: "S1", emoji: "🍚", category: "Grains" },
          { id: "bill_2", name: "Avocado", brand: "", qty: 3, unit: "Pcs", price: 120, enabled: true, matched: null, spaceId: "", shelfId: "", emoji: "📦", category: "Produce" },
          { id: "bill_3", name: "Greek Yogurt", brand: "Epigamia", qty: 2, unit: "Pcs", price: 45, enabled: true, matched: null, spaceId: "", shelfId: "", emoji: "📦", category: "Dairy" },
        ],
      });
    });
    await expect(page.locator("text=Bill Review 🧾")).toBeVisible({ timeout: 3000 });
  }

  test("shows bill review with matched and new items", async ({ page }) => {
    await simulateBillReview(page);
    await expect(page.locator("text=Milk")).toBeVisible();
    await expect(page.locator("text=₹65")).toBeVisible();
    await expect(page.locator("text=/Found in pantry/").first()).toBeVisible();
    await expect(page.locator("text=Avocado")).toBeVisible();
    await expect(page.locator("text=/New item/").first()).toBeVisible();
    await expect(page.locator("text=4 items found · 4 selected")).toBeVisible();
  });

  test("save button disabled when new items have no location", async ({ page }) => {
    await simulateBillReview(page);
    const btn = page.locator("button", { hasText: "Assign all locations first" });
    await expect(btn).toBeVisible();
    await expect(btn).toBeDisabled();
  });

  test("toggle disables an item and updates count", async ({ page }) => {
    await simulateBillReview(page);
    // Click first toggle checkbox (the ✓ inside the purple box)
    const toggles = page.locator("div[style*='cursor: pointer'] >> text=✓");
    await toggles.first().click();
    await expect(page.locator("text=4 items found · 3 selected")).toBeVisible();
  });

  test("assigning locations enables save button", async ({ page }) => {
    await simulateBillReview(page);
    const selects = page.locator("select");
    await selects.nth(0).selectOption("s2"); // Avocado space
    await selects.nth(1).selectOption("F1"); // Avocado shelf
    await selects.nth(2).selectOption("s2"); // Yogurt space
    await selects.nth(3).selectOption("F1"); // Yogurt shelf

    const saveBtn = page.locator("button", { hasText: /Save 4 Item/ });
    await expect(saveBtn).toBeEnabled();
  });

  test("full save flow shows success screen", async ({ page }) => {
    await simulateBillReview(page);
    const selects = page.locator("select");
    await selects.nth(0).selectOption("s2");
    await selects.nth(1).selectOption("F1");
    await selects.nth(2).selectOption("s2");
    await selects.nth(3).selectOption("F1");

    await page.locator("button", { hasText: /Save 4 Item/ }).click();
    await expect(page.locator("text=Bill Processed!")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=/restocked/")).toBeVisible();
    await expect(page.locator("text=+ Add Another")).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════
// USED TAB
// ═══════════════════════════════════════════════════════════
test.describe("Used Tab", () => {
  test("shows used tab with items", async ({ page }) => {
    await enterDemo(page);
    await goToTab(page, "Used");
    await expect(page.locator("text=I Used Something")).toBeVisible({ timeout: 5000 });
  });

  test("shows inventory items in the list", async ({ page }) => {
    await enterDemo(page);
    await goToTab(page, "Used");
    await expect(page.locator("text=Basmati Rice")).toBeVisible({ timeout: 5000 });
  });

  test("search filters items", async ({ page }) => {
    await enterDemo(page);
    await goToTab(page, "Used");
    await expect(page.locator("text=I Used Something")).toBeVisible({ timeout: 5000 });
    const search = page.locator("input[placeholder*='Search']");
    await search.fill("milk");
    await expect(page.locator("text=Milk")).toBeVisible();
    // Rice should be filtered out
    await expect(page.locator("text=Basmati Rice")).not.toBeVisible();
  });

  test("meal mode shows recipes", async ({ page }) => {
    await enterDemo(page);
    await goToTab(page, "Used");
    await expect(page.locator("text=I Used Something")).toBeVisible({ timeout: 5000 });
    await page.locator("text=🍽️ Cook").click();
    await expect(page.locator("text=What can I cook?")).toBeVisible({ timeout: 3000 });
  });
});

// ═══════════════════════════════════════════════════════════
// INSIGHTS TAB
// ═══════════════════════════════════════════════════════════
test.describe("Insights Tab", () => {
  test("shows spending insight cards", async ({ page }) => {
    await enterDemo(page);
    await goToTab(page, "Insights");
    await expect(page.locator("text=/Pantry Value/i")).toBeVisible({ timeout: 5000 });
  });

  test("shows all major insight headings", async ({ page }) => {
    await enterDemo(page);
    await goToTab(page, "Insights");
    await expect(page.locator("text=/Pantry Value/")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=/Price Alerts/")).toBeVisible();
    await expect(page.locator("text=/Buying vs Consuming/")).toBeVisible();
    await expect(page.locator("text=/Spending by Category/")).toBeVisible();
    await expect(page.locator("text=/ABC Analysis/")).toBeVisible();
    await expect(page.locator("text=/Consumption Patterns/")).toBeVisible();
    await expect(page.locator("text=/Predicted Reorder/")).toBeVisible();
    await expect(page.locator("text=/Waste Risk/")).toBeVisible();
    await expect(page.locator("text=/VED Analysis/")).toBeVisible();
    await expect(page.locator("text=/Last 30 Days/")).toBeVisible();
  });

  test("pantry value shows rupee amount", async ({ page }) => {
    await enterDemo(page);
    await goToTab(page, "Insights");
    await expect(page.locator("text=/Pantry Value/")).toBeVisible({ timeout: 5000 });
    // Should show a ₹ amount somewhere
    await expect(page.locator("text=/₹[\\d,]+/").first()).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════
// MANUAL ADD FLOW
// ═══════════════════════════════════════════════════════════
test.describe("Manual Add Flow", () => {
  test("navigates to manual entry form", async ({ page }) => {
    await enterDemo(page);
    await goToTab(page, "Add");
    await page.locator("text=Enter Manually").click();
    await expect(page.locator("input").first()).toBeVisible({ timeout: 3000 });
  });

  test("typing Milk shows household unit suggestion", async ({ page }) => {
    await enterDemo(page);
    await goToTab(page, "Add");
    await page.locator("text=Enter Manually").click();
    await expect(page.locator("input").first()).toBeVisible({ timeout: 3000 });
    await page.locator("input").first().fill("Milk");
    // Should show household unit match badge for "Gallons"
    await expect(page.locator("span:text-is('Gallons')")).toBeVisible({ timeout: 2000 });
    await expect(page.locator("text=/Household/i")).toBeVisible();
  });

  test("continue button disabled with empty name", async ({ page }) => {
    await enterDemo(page);
    await goToTab(page, "Add");
    await page.locator("text=Enter Manually").click();
    await expect(page.locator("input").first()).toBeVisible({ timeout: 3000 });
    const continueBtn = page.locator("button", { hasText: "Continue" });
    await expect(continueBtn).toBeDisabled();
  });
});

// ═══════════════════════════════════════════════════════════
// SPACES TAB
// ═══════════════════════════════════════════════════════════
test.describe("Spaces Tab", () => {
  test("shows all 3 demo spaces", async ({ page }) => {
    await enterDemo(page);
    await goToTab(page, "Spaces");
    await expect(page.locator("text=My Spaces")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Main Pantry")).toBeVisible();
    await expect(page.locator("text=Refrigerator")).toBeVisible();
    await expect(page.locator("text=Baby Corner")).toBeVisible();
  });

  test("navigates to space detail and shows shelves", async ({ page }) => {
    await enterDemo(page);
    await goToTab(page, "Spaces");
    await expect(page.locator("text=Main Pantry")).toBeVisible({ timeout: 5000 });
    await page.locator("text=Main Pantry").click();
    // Should show shelf names
    await expect(page.locator("text=Dry Goods")).toBeVisible({ timeout: 3000 });
    await expect(page.locator("text=Canned Goods")).toBeVisible();
    await expect(page.locator("text=Snacks & Extras")).toBeVisible();
  });

  test("expand shelf shows items", async ({ page }) => {
    await enterDemo(page);
    await goToTab(page, "Spaces");
    await page.locator("text=Main Pantry").click();
    await expect(page.locator("text=Dry Goods")).toBeVisible({ timeout: 3000 });
    // Click "View items" to expand
    const viewItems = page.locator("text=View items").first();
    if (await viewItems.isVisible({ timeout: 2000 }).catch(() => false)) {
      await viewItems.click();
    } else {
      // Try clicking the shelf name to expand
      await page.locator("text=Dry Goods").click();
    }
    await expect(page.locator("text=Basmati Rice")).toBeVisible({ timeout: 3000 });
  });

  test("back button returns to spaces list", async ({ page }) => {
    await enterDemo(page);
    await goToTab(page, "Spaces");
    await page.locator("text=Main Pantry").click();
    await expect(page.locator("text=Dry Goods")).toBeVisible({ timeout: 3000 });
    // Click back button (‹ character)
    await page.locator("text=‹").first().click();
    await expect(page.locator("text=My Spaces")).toBeVisible({ timeout: 3000 });
  });

  test("add shelf button is visible in detail", async ({ page }) => {
    await enterDemo(page);
    await goToTab(page, "Spaces");
    await page.locator("text=Main Pantry").click();
    await expect(page.locator("text=+ Add Shelf")).toBeVisible({ timeout: 3000 });
  });
});

// ═══════════════════════════════════════════════════════════
// HOME TAB — Deep Tests
// ═══════════════════════════════════════════════════════════
test.describe("Home Tab - Deep", () => {
  test("shows stat cards with labels", async ({ page }) => {
    await enterDemo(page);
    // Stat card labels are in <div> elements, use exact text match
    await expect(page.getByText("Items", { exact: true })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Low Stock", { exact: true })).toBeVisible();
    await expect(page.getByText("Expiring", { exact: true })).toBeVisible();
  });

  test("shows baby supplies section", async ({ page }) => {
    await enterDemo(page);
    await expect(page.locator("text=/Baby Supplies/")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Diapers")).toBeVisible();
    await expect(page.locator("text=Baby Formula")).toBeVisible();
  });

  test("shows expiring soon section", async ({ page }) => {
    await enterDemo(page);
    // Demo data has Milk (2026-03-10) and Spinach (2026-03-09) which are expired
    await expect(page.locator("text=/Expiring Soon/")).toBeVisible({ timeout: 5000 });
  });

  test("search overlay opens and finds items", async ({ page }) => {
    await enterDemo(page);
    // Click the search icon (🔍)
    await page.locator("text=🔍").first().click();
    await expect(page.locator("input[placeholder*='Search']")).toBeVisible({ timeout: 3000 });
    await page.locator("input[placeholder*='Search']").fill("milk");
    await expect(page.locator("text=Milk").first()).toBeVisible({ timeout: 3000 });
  });
});

// ═══════════════════════════════════════════════════════════
// NAVIGATION & OVERLAYS
// ═══════════════════════════════════════════════════════════
test.describe("Navigation & Overlays", () => {
  test("tab switching works for all 5 tabs", async ({ page }) => {
    await enterDemo(page);
    // Home is already active
    await expect(page.locator("text=Your Spaces")).toBeVisible();

    await goToTab(page, "Spaces");
    await expect(page.locator("text=My Spaces")).toBeVisible({ timeout: 3000 });

    await goToTab(page, "Add");
    await expect(page.locator("text=Add Item")).toBeVisible({ timeout: 3000 });

    await goToTab(page, "Used");
    await expect(page.locator("text=I Used Something")).toBeVisible({ timeout: 3000 });

    await goToTab(page, "Insights");
    await expect(page.locator("text=/Pantry Value/")).toBeVisible({ timeout: 3000 });
  });

  test("shopping list overlay shows low stock items", async ({ page }) => {
    await enterDemo(page);
    // Click the shopping cart icon
    await page.locator("text=🛒").first().click();
    await expect(page.locator("text=Shopping List")).toBeVisible({ timeout: 3000 });
    // Diapers are low stock (qty=8, reorder=20)
    await expect(page.locator("text=Diapers (Size 2)").first()).toBeVisible();
  });

  test("shopping list shows Have and Buy labels", async ({ page }) => {
    await enterDemo(page);
    await page.locator("text=🛒").first().click();
    await expect(page.locator("text=Shopping List")).toBeVisible({ timeout: 3000 });
    await expect(page.locator("text=/Have/i").first()).toBeVisible();
    await expect(page.locator("text=/Buy/i").first()).toBeVisible();
  });

  test("profile overlay opens", async ({ page }) => {
    await enterDemo(page);
    await page.locator("text=👤").first().click();
    await expect(page.locator("text=Profile")).toBeVisible({ timeout: 3000 });
    await expect(page.locator("text=/Pantri v/")).toBeVisible();
  });
});
