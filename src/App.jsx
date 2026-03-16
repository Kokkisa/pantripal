import { useState, useEffect, useRef } from "react";
import { CATEGORIES, UNITS, DEFAULT_SPACES, SHELF_COLORS, SPACE_ICONS } from "./lib/pantriConstants.js";
import { stockLevel, isExpiringSoon, getSmartUnit, matchBillItem, genId } from "./lib/pantriUtils.js";
import { IS_DEMO, getFirebase } from "./lib/firebaseClient.js";
import usePantriData from "./hooks/usePantriData.js";
import useAddReducer, {
  RESET, SET_SCREEN, UPDATE_ITEM, UPDATE_META,
  SET_ITEM_AND_SCREEN, SET_META_AND_SCREEN,
  RESOLVE_EXISTING_MISMATCH, RESOLVE_EXISTING_MATCH, RESOLVE_NEW_ITEM,
  PHOTO_PREVIEW, AI_RESULT, AI_ERROR,
  SCAN_START, SCAN_DONE, SCAN_PRODUCT_FOUND, SCAN_AI_RESULT, SCAN_NOT_FOUND, SCAN_ERROR, SCAN_STOP,
  BILL_PREVIEW, BILL_RESULT, BILL_ERROR,
  SAVE_COMPLETE, INIT_FROM_SEARCH, INIT_FROM_SHELF,
} from "./hooks/useAddReducer.js";
import S from "./lib/styles.js";

// Components
import Wrapper from "./components/Wrapper.jsx";
import AuthScreen from "./components/AuthScreen.jsx";
import OnboardingCarousel from "./components/OnboardingCarousel.jsx";
import NavBarComponent from "./components/NavBar.jsx";
import SearchOverlay from "./components/SearchOverlay.jsx";
import ShopOverlay from "./components/ShopOverlay.jsx";
import ProfileOverlay from "./components/ProfileOverlay.jsx";
import EditItemModal from "./components/EditItemModal.jsx";
import ItemsList from "./components/ItemsList.jsx";

// Tabs
import HomeTab from "./tabs/HomeTab.jsx";
import SpacesTab from "./tabs/SpacesTab.jsx";
import AddTab from "./tabs/AddTab.jsx";
import UsedTab from "./tabs/UsedTab.jsx";
import InsightsTab from "./tabs/InsightsTab.jsx";

// ══════════════════════════════════════════════════════════════
// ─── MAIN APP ─────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════
export default function PantriApp() {
  // ── Auth state ─────────────────────────────────────────────
  const [user, setUser] = useState(null);
  const [userMeta, setUserMeta] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  // ── Navigation state ──────────────────────────────────────
  const [activeTab, setActiveTab] = useState("home");
  const [checkedShop, setCheckedShop] = useState({});
  const [showSearch, setShowSearch] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showItemsList, setShowItemsList] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // ── Sub-screens ───────────────────────────────────────────
  const [spaceScreen, setSpaceScreen] = useState("list");
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [addState, dispatch] = useAddReducer();
  const [usedScreen, setUsedScreen] = useState("list");
  const [usedSearch, setUsedSearch] = useState("");
  const [usedCat, setUsedCat] = useState("All");
  const [selConsume, setSelConsume] = useState(null);
  const [consumeQty, setConsumeQty] = useState(1);
  const [mealItems, setMealItems] = useState({});
  const [selMeal, setSelMeal] = useState(null);
  const [justSaved, setJustSaved] = useState(null);
  const [savingItem, setSavingItem] = useState(false);
  const [toast, setToast] = useState(null);
  const photoRef = useRef();

  // ── Data hook ─────────────────────────────────────────────
  const { inventory, history, spaces, setSpaces, loading, addItem: saveItem, updateItem, deleteItem: removeItem, logUsage } = usePantriData(userMeta?.householdId);
  const [photoVersion, setPhotoVersion] = useState(0);

  // ── Spaces sub-state ──────────────────────────────────────
  const [editingSpace, setEditingSpace] = useState(null);
  const [editingShelf, setEditingShelf] = useState(null);
  const [showAddSpace, setShowAddSpace] = useState(false);
  const [showAddShelf, setShowAddShelf] = useState(null);
  const [expandedShelf, setExpandedShelf] = useState(null);

  // ── Onboarding state ──────────────────────────────────────
  const [onboarded, setOnboarded] = useState(true);
  const [dismissedHints, setDismissedHints] = useState({});

  // ── Helper: resolve a Firebase user into app state ────────
  const resolveFirebaseUser = async (firebaseUser, fb) => {
    const userDoc = await fb.getDoc(fb.doc(fb.db, "users", firebaseUser.uid));
    if (userDoc.exists()) {
      setUser(firebaseUser);
      setUserMeta(userDoc.data());
      const uid = firebaseUser.uid;
      setOnboarded(!!localStorage.getItem("pantri_onboarded_" + uid));
      const hints = {};
      ["home","spaces","add","used","insights"].forEach(tab => {
        if (localStorage.getItem("pantri_hint_" + tab + "_" + uid)) hints[tab] = true;
      });
      setDismissedHints(hints);
    } else if (firebaseUser.providerData?.[0]?.providerId === "google.com") {
      const displayName = firebaseUser.displayName || "User";
      const householdId = genId();
      await fb.setDoc(fb.doc(fb.db, "users", firebaseUser.uid), {
        name: displayName, partner: "", email: firebaseUser.email, householdId, createdAt: fb.serverTimestamp(),
      });
      await fb.setDoc(fb.doc(fb.db, "households", householdId), {
        name: `${displayName}'s Home`, members: [firebaseUser.uid], memberNames: { [firebaseUser.uid]: displayName },
        partnerName: "", spaces: DEFAULT_SPACES, createdAt: fb.serverTimestamp(),
      });
      setUser(firebaseUser);
      setUserMeta({ name: displayName, partner: "", email: firebaseUser.email, householdId, isNew: true });
      setOnboarded(false);
    }
  };

  // ── Check Firebase auth state on mount ────────────────────
  useEffect(() => {
    if (IS_DEMO) { setAuthChecked(true); return; }
    let unsubscribe;
    getFirebase().then(async (fb) => {
      // Handle mobile Google sign-in redirect result first
      try {
        const result = await fb.getRedirectResult(fb.auth);
        if (result?.user) {
          await resolveFirebaseUser(result.user, fb);
          setAuthChecked(true);
        }
      } catch (e) {
        console.error("Redirect result error:", e);
      }

      // Then listen for ongoing auth state changes
      unsubscribe = fb.onAuthStateChanged(fb.auth, async (firebaseUser) => {
        if (firebaseUser) {
          await resolveFirebaseUser(firebaseUser, fb);
        }
        setAuthChecked(true);
      });
    });
    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  // ── Auth handlers ─────────────────────────────────────────
  const handleAuth = (firebaseUser, meta) => {
    setUser(firebaseUser);
    setUserMeta(meta);
    const uid = firebaseUser.uid || "demo";
    const alreadyOnboarded = localStorage.getItem("pantri_onboarded_" + uid);
    setOnboarded(!!alreadyOnboarded);
    const hints = {};
    ["home","spaces","add","used","insights"].forEach(tab => {
      if (localStorage.getItem("pantri_hint_" + tab + "_" + uid)) hints[tab] = true;
    });
    setDismissedHints(hints);
  };

  const handleSignOut = async () => {
    if (!IS_DEMO) {
      const fb = await getFirebase();
      await fb.signOut(fb.auth);
    }
    setUser(null); setUserMeta(null);
  };

  const resetAdd = () => dispatch({ type: RESET });

  const completeOnboarding = () => {
    const uid = user?.uid || "demo";
    localStorage.setItem("pantri_onboarded_" + uid, "1");
    setOnboarded(true);
  };

  const dismissHint = (tab) => {
    const uid = user?.uid || "demo";
    localStorage.setItem("pantri_hint_" + tab + "_" + uid, "1");
    setDismissedHints(prev => ({ ...prev, [tab]: true }));
  };

  // ── Derived ───────────────────────────────────────────────
  const shoppingList = inventory.filter(i => stockLevel(i.qty, i.reorder) !== "good");
  const expiringItems = inventory.filter(i => isExpiringSoon(i.expiry));
  const babyItems = inventory.filter(i => i.category === "Baby");

  // ── Add-flow handlers ─────────────────────────────────────
  const resolveIntelligence = (name, overrideUnit=null) => {
    const smart = getSmartUnit(name);
    const resolvedUnit = overrideUnit || smart.unit;
    const existing = inventory.find(i => i.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      if (existing.unit !== resolvedUnit) {
        dispatch({
          type: RESOLVE_EXISTING_MISMATCH,
          unitSource: smart.source,
          unitMismatch: { oldUnit: existing.unit, newUnit: resolvedUnit, existing },
          existingStock: existing,
          unit: resolvedUnit,
        });
      } else {
        dispatch({
          type: RESOLVE_EXISTING_MATCH,
          unitSource: smart.source,
          existingStock: existing,
          unit: resolvedUnit,
        });
      }
    } else {
      const screen = (addState.meta.selSpace && addState.meta.selShelf) ? "set_stock" : "select_location";
      dispatch({
        type: RESOLVE_NEW_ITEM,
        unitSource: smart.source,
        unit: resolvedUnit,
        category: smart.category,
        screen,
      });
    }
  };

  const handlePhotoCapture = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result.split(",")[1];
      dispatch({ type: PHOTO_PREVIEW, imagePreview: ev.target.result });
      try {
        const res = await fetch("/api/analyze", {
          method:"POST", headers:{ "Content-Type":"application/json" },
          body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:1000,
            messages:[{ role:"user", content:[
              { type:"image", source:{ type:"base64", media_type:file.type, data:base64 } },
              { type:"text", text:`Analyze this product. Return ONLY JSON no markdown:\n{"name":"product name","brand":"brand or empty","category":"one of: ${CATEGORIES.join(",")}","suggestedUnit":"one of: ${UNITS.join(" ")}","confidence":"high or medium or low","emoji":"single emoji"}` }
            ]}]
          })
        });
        const data = await res.json();
        const text = data.content?.find(b=>b.type==="text")?.text||"{}";
        const parsed = JSON.parse(text.replace(/```json|```/g,"").trim());
        dispatch({
          type: AI_RESULT,
          aiResult: parsed,
          itemFields: { name:parsed.name||"", brand:parsed.brand||"", category:parsed.category||"", unit:parsed.suggestedUnit||"Pcs", emoji:parsed.emoji||"📦" },
        });
      } catch(e) {
        console.error("AI analysis failed:", e);
        dispatch({ type: AI_ERROR, aiError: "Could not analyze photo. You can fill details manually." });
      }
    };
    reader.readAsDataURL(file);
  };

  const scannerRef = useRef(null);
  const scannerContainerId = "barcode-scanner-container";

  const startScan = async () => {
    dispatch({ type: SCAN_START });
    try {
      if (!window.Html5Qrcode) {
        await new Promise((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
          s.onload = resolve; s.onerror = reject;
          document.head.appendChild(s);
        });
      }
      const html5Qr = new window.Html5Qrcode(scannerContainerId);
      scannerRef.current = html5Qr;
      await html5Qr.start(
        { facingMode:"environment" },
        { fps:10, qrbox:{ width:250, height:150 }, aspectRatio:1.5 },
        async (decodedText) => {
          await html5Qr.stop().catch(() => {});
          scannerRef.current = null;
          dispatch({ type: SCAN_DONE });
          let found = false;
          try {
            const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${decodedText}.json`);
            const data = await res.json();
            if (data.status === 1 && data.product && data.product.product_name) {
              const p = data.product;
              const cat = (p.categories_tags||[])[0]?.replace("en:","").replace(/-/g," ") || "";
              const matchedCat = CATEGORIES.find(c => cat.toLowerCase().includes(c.toLowerCase().split(" ")[0])) || "";
              dispatch({ type: SCAN_PRODUCT_FOUND, itemFields: { name:p.product_name, brand:p.brands||"", category:matchedCat, emoji:"🛒" } });
              found = true;
            }
          } catch {}
          if (!found) {
            try {
              const res = await fetch("/api/analyze", {
                method:"POST", headers:{ "Content-Type":"application/json" },
                body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:500,
                  messages:[{ role:"user", content:[
                    { type:"text", text:`Barcode number: ${decodedText}. Identify this product. Return ONLY JSON no markdown:\n{"name":"product name","brand":"brand or empty","category":"one of: ${CATEGORIES.join(",")}","suggestedUnit":"one of: ${UNITS.join(" ")}","emoji":"single emoji"}\nIf you cannot identify it, set name to empty string.` }
                  ]}]
                })
              });
              const data = await res.json();
              const text = data.content?.find(b=>b.type==="text")?.text||"{}";
              const parsed = JSON.parse(text.replace(/```json|```/g,"").trim());
              if (parsed.name) {
                dispatch({ type: SCAN_AI_RESULT, itemFields: { name:parsed.name, brand:parsed.brand||"", category:parsed.category||"", unit:parsed.suggestedUnit||"pcs", emoji:parsed.emoji||"🛒" }, aiResult: parsed });
                found = true;
              }
            } catch {}
          }
          if (!found) {
            dispatch({ type: SCAN_NOT_FOUND, itemFields: { name:"", brand:"", emoji:"📊" }, aiError:`Scanned barcode: ${decodedText}. Could not identify product — please enter details manually.` });
          }
          setTimeout(() => dispatch({ type: SET_SCREEN, screen: "review_details" }), 600);
        },
      );
    } catch (e) {
      console.error("Barcode scanner error:", e);
      dispatch({ type: SCAN_ERROR, scanError: "Camera access denied or unavailable. Try entering manually." });
    }
  };

  const stopScan = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    dispatch({ type: SCAN_STOP });
  };

  const handleSaveNewItem = async () => {
    setSavingItem(true);
    try {
      const { selSpace, selShelf, existingStock } = addState.meta;
      if (existingStock) {
        const priceNum = Number(addState.item.price) || null;
        const updates = { qty: existingStock.qty + addState.item.qty };
        if (priceNum) {
          updates.price = priceNum;
          updates.priceHistory = [
            ...(existingStock.priceHistory || []),
            { price: priceNum, date: new Date().toISOString(), qty: addState.item.qty },
          ];
        }
        await updateItem(existingStock.id, updates);
      } else {
        const { imagePreview, ...itemToSave } = addState.item;
        const priceNum = Number(itemToSave.price) || null;
        await saveItem({
          ...itemToSave,
          price: priceNum,
          priceHistory: priceNum ? [{ price: priceNum, date: new Date().toISOString(), qty: itemToSave.qty }] : [],
          spaceId: selSpace?.id, shelfId: selShelf?.id,
        });
      }
      setJustSaved({ name:addState.item.name, existingStock });
      dispatch({ type: SAVE_COMPLETE });
    } catch (err) {
      console.error("handleSaveNewItem failed:", err);
      setToast({ message: "Failed to save item: " + err.message, type: "error" });
    } finally {
      setSavingItem(false);
    }
  };

  // ── Bill scanning ────────────────────────────────────────
  const billRef = useRef(null);

  const handleBillCapture = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result.split(",")[1];
      dispatch({ type: BILL_PREVIEW, imagePreview: ev.target.result });
      try {
        const res = await fetch("/api/analyze", {
          method:"POST", headers:{ "Content-Type":"application/json" },
          body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:2000,
            messages:[{ role:"user", content:[
              { type:"image", source:{ type:"base64", media_type:file.type, data:base64 } },
              { type:"text", text:`Analyze this grocery bill/receipt. Extract each purchased line item. Return ONLY a JSON array, no markdown:\n[{"name":"item name","qty":1,"unit":"Pcs","price":0,"brand":""}]\nUnits must be one of: ${UNITS.join(", ")}. Price is per unit in ₹. If qty or price unclear, use best guess. Omit subtotals, tax, discounts, and total rows. Only include actual purchased items.` }
            ]}]
          })
        });
        const data = await res.json();
        const text = data.content?.find(b=>b.type==="text")?.text||"[]";
        const parsed = JSON.parse(text.replace(/```json|```/g,"").trim());
        const items = (Array.isArray(parsed) ? parsed : []).map((bi, idx) => {
          const matched = matchBillItem(bi.name, inventory);
          const smart = getSmartUnit(bi.name);
          return {
            id: "bill_" + idx,
            name: bi.name || "Unknown",
            brand: bi.brand || "",
            qty: Number(bi.qty) || 1,
            unit: bi.unit || (matched?.unit) || smart.unit,
            price: Number(bi.price) || 0,
            enabled: true,
            matched,
            spaceId: matched?.spaceId || "",
            shelfId: matched?.shelfId || "",
            emoji: matched?.emoji || "📦",
            category: matched?.category || smart.category || "",
          };
        });
        dispatch({ type: BILL_RESULT, billItems: items });
      } catch(e) {
        console.error("Bill analysis failed:", e);
        dispatch({ type: BILL_ERROR, billError: "Could not read the bill. Try a clearer photo." });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBillSave = async (overrideItems) => {
    setSavingItem(true);
    try {
      const items = (overrideItems || addState.meta.billItems).filter(bi => bi.enabled);
      let restocked = 0, added = 0;
      for (const bi of items) {
        const priceNum = Number(bi.price) || null;
        if (bi.matched) {
          const updates = { qty: bi.matched.qty + bi.qty };
          if (priceNum) {
            updates.price = priceNum;
            updates.priceHistory = [
              ...(bi.matched.priceHistory || []),
              { price: priceNum, date: new Date().toISOString(), qty: bi.qty },
            ];
          }
          await updateItem(bi.matched.id, updates);
          restocked++;
        } else {
          await saveItem({
            name: bi.name, brand: bi.brand, category: bi.category,
            qty: bi.qty, unit: bi.unit, emoji: bi.emoji, reorder: 1,
            price: priceNum, expiry: "",
            priceHistory: priceNum ? [{ price: priceNum, date: new Date().toISOString(), qty: bi.qty }] : [],
            spaceId: bi.spaceId || null, shelfId: bi.shelfId || null,
          });
          added++;
        }
      }
      setJustSaved({ bill: true, restocked, added, total: items.length });
      dispatch({ type: SAVE_COMPLETE });
    } catch (err) {
      console.error("handleBillSave failed:", err);
      setToast({ message: "Failed to save bill items: " + err.message, type: "error" });
    } finally {
      setSavingItem(false);
    }
  };

  // ── NavBar wrapper ────────────────────────────────────────
  const NavBar = () => (
    <NavBarComponent
      activeTab={activeTab}
      onNavigate={(tabId) => {
        setActiveTab(tabId);
        if (tabId === "spaces") setSpaceScreen("list");
        if (tabId === "add") resetAdd();
        if (tabId === "used") setUsedScreen("list");
      }}
    />
  );

  // ── Loading / Auth gates ──────────────────────────────────
  if (!authChecked) return (
    <Wrapper><div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:680, flexDirection:"column", gap:16 }}>
      <div style={{ width:48, height:48, border:"5px solid #d97706", borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.9s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <p style={{ color:"#6b7280", fontSize:14, fontWeight:600, margin:0 }}>Loading PantriPal...</p>
    </div></Wrapper>
  );

  if (!user || !userMeta) return <Wrapper><AuthScreen onAuth={handleAuth} /></Wrapper>;
  if (loading) return (
    <Wrapper><div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:680, flexDirection:"column", gap:16 }}>
      <div style={{ width:48, height:48, border:"5px solid #d97706", borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.9s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <p style={{ color:"#6b7280", fontSize:14, fontWeight:600, margin:0 }}>Loading your pantry...</p>
    </div></Wrapper>
  );

  if (!onboarded) return <Wrapper><OnboardingCarousel onComplete={completeOnboarding} /></Wrapper>;

  // ── Render ────────────────────────────────────────────────
  return(
    <Wrapper>
      {showItemsList && <ItemsList inventory={inventory} spaces={spaces} onClose={() => setShowItemsList(false)} onEditItem={(item) => setEditingItem(item)} />}
      {editingItem && <EditItemModal item={editingItem} spaces={spaces} onSave={async (id, data) => { await updateItem(id, data); }} onDelete={async (id) => { await removeItem(id); }} onClose={() => setEditingItem(null)} />}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {activeTab==="home"&&<HomeTab
        userMeta={userMeta} inventory={inventory} spaces={spaces}
        shoppingList={shoppingList} expiringItems={expiringItems} babyItems={babyItems}
        dismissedHints={dismissedHints} onDismissHint={dismissHint}
        onShowSearch={()=>setShowSearch(true)} onShowShop={()=>setShowShop(true)}
        onShowProfile={()=>setShowProfile(true)} onShowItemsList={()=>setShowItemsList(true)}
        onEditItem={(item)=>setEditingItem(item)}
        onNavigateToSpace={(space)=>{setSelectedSpace(space);setSpaceScreen("detail");setActiveTab("spaces");}}
        onSetActiveTab={setActiveTab}
        NavBar={NavBar}
      />}

      {activeTab==="spaces"&&<SpacesTab
        spaces={spaces} setSpaces={setSpaces} inventory={inventory} userMeta={userMeta}
        photoVersion={photoVersion} setPhotoVersion={setPhotoVersion}
        spaceScreen={spaceScreen} setSpaceScreen={setSpaceScreen}
        selectedSpace={selectedSpace} setSelectedSpace={setSelectedSpace}
        editingSpace={editingSpace} setEditingSpace={setEditingSpace}
        editingShelf={editingShelf} setEditingShelf={setEditingShelf}
        showAddSpace={showAddSpace} setShowAddSpace={setShowAddSpace}
        showAddShelf={showAddShelf} setShowAddShelf={setShowAddShelf}
        expandedShelf={expandedShelf} setExpandedShelf={setExpandedShelf}
        dismissedHints={dismissedHints} onDismissHint={dismissHint}
        onEditItem={(item)=>setEditingItem(item)}
        onAddItemFromShelf={(space, shelf)=>{dispatch({type:INIT_FROM_SHELF,selSpace:space,selShelf:shelf});setActiveTab("add");}}
        NavBar={NavBar}
      />}

      {activeTab==="add"&&<AddTab
        addState={addState} dispatch={dispatch}
        inventory={inventory} spaces={spaces} userMeta={userMeta}
        resolveIntelligence={resolveIntelligence}
        handlePhotoCapture={handlePhotoCapture}
        startScan={startScan} stopScan={stopScan}
        handleSaveNewItem={handleSaveNewItem}
        handleBillCapture={handleBillCapture} handleBillSave={handleBillSave} billRef={billRef}
        savingItem={savingItem} toast={toast} setToast={setToast}
        resetAdd={resetAdd}
        photoRef={photoRef} scannerContainerId={scannerContainerId}
        justSaved={justSaved} setActiveTab={setActiveTab}
        dismissedHints={dismissedHints} onDismissHint={dismissHint}
        NavBar={NavBar}
      />}

      {activeTab==="used"&&<UsedTab
        inventory={inventory} history={history} spaces={spaces}
        usedScreen={usedScreen} setUsedScreen={setUsedScreen}
        usedSearch={usedSearch} setUsedSearch={setUsedSearch}
        usedCat={usedCat} setUsedCat={setUsedCat}
        selConsume={selConsume} setSelConsume={setSelConsume}
        consumeQty={consumeQty} setConsumeQty={setConsumeQty}
        mealItems={mealItems} setMealItems={setMealItems}
        selMeal={selMeal} setSelMeal={setSelMeal}
        justSaved={justSaved} setJustSaved={setJustSaved}
        updateItem={updateItem} logUsage={logUsage}
        setActiveTab={setActiveTab}
        dismissedHints={dismissedHints} onDismissHint={dismissHint}
        onEditItem={(item)=>setEditingItem(item)}
        NavBar={NavBar}
      />}

      {activeTab==="insights"&&<InsightsTab
        inventory={inventory} history={history} spaces={spaces}
        dismissedHints={dismissedHints} onDismissHint={dismissHint}
        NavBar={NavBar}
      />}

      {showSearch&&<SearchOverlay
        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        inventory={inventory} spaces={spaces} photoVersion={photoVersion}
        onClose={()=>{setShowSearch(false);setSearchQuery("");}}
        onEditItem={(item)=>setEditingItem(item)}
        onAddItem={(query)=>{setShowSearch(false);setSearchQuery("");dispatch({type:INIT_FROM_SEARCH,name:query});setActiveTab("add");}}
      />}
      {showShop&&<ShopOverlay
        shoppingList={shoppingList} checkedShop={checkedShop} setCheckedShop={setCheckedShop}
        spaces={spaces} userMeta={userMeta}
        onClose={()=>setShowShop(false)}
      />}
      {showProfile&&<ProfileOverlay
        user={user} userMeta={userMeta} inventory={inventory} spaces={spaces}
        shoppingList={shoppingList} onSignOut={handleSignOut}
        onClose={()=>setShowProfile(false)}
      />}
    </Wrapper>
  );
}
