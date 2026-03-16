import { useState, memo } from "react";
import S from "../lib/styles.js";
import { stockLevel } from "../lib/pantriUtils.js";
import ErrorBanner from "../components/ErrorBanner.jsx";
import TabHint from "../components/TabHint.jsx";

export default memo(function UsedTab({
  inventory, history, spaces,
  usedScreen, setUsedScreen, usedSearch, setUsedSearch,
  usedCat, setUsedCat, selConsume, setSelConsume,
  consumeQty, setConsumeQty, mealItems, setMealItems,
  selMeal, setSelMeal, justSaved,
  updateItem, logUsage, setJustSaved,
  setActiveTab,
  dismissedHints, onDismissHint, onEditItem, NavBar,
}) {
  const [busyAction, setBusyAction] = useState(null); // "using" | "cooking" | null
  const [actionError, setActionError] = useState(null);

  const filtered = inventory.filter(i =>
    i.name.toLowerCase().includes(usedSearch.toLowerCase()) &&
    (usedCat==="All"||i.category===usedCat)
  );
  const CATS = ["All","Grains & Pasta","Canned Goods","Dairy","Produce","Baby","Condiments"];

  // ── Meal Mode ───────────────────────────────────────────────
  if (usedScreen==="meal_mode") {
    const RECIPES = [
      { id:"r1", name:"Scrambled Eggs", emoji:"🍳", time:"5 min", tags:["breakfast","quick"],
        ingredients:[{name:"Eggs",qty:2,unit:"Pcs"},{name:"Milk",qty:0.1,unit:"Liters"},{name:"Butter",qty:0.05,unit:"Kg"}] },
      { id:"r2", name:"Rice & Dal", emoji:"🍚", time:"20 min", tags:["lunch","veg"],
        ingredients:[{name:"Rice",qty:0.2,unit:"Kg"},{name:"Dal",qty:0.15,unit:"Kg"},{name:"Onion",qty:1,unit:"Pcs"}] },
      { id:"r3", name:"Chicken Curry", emoji:"🍛", time:"35 min", tags:["dinner","non-veg"],
        ingredients:[{name:"Chicken",qty:0.5,unit:"Kg"},{name:"Onion",qty:2,unit:"Pcs"},{name:"Tomato",qty:2,unit:"Pcs"},{name:"Rice",qty:0.2,unit:"Kg"}] },
      { id:"r4", name:"Pasta", emoji:"🍝", time:"15 min", tags:["dinner","quick"],
        ingredients:[{name:"Pasta",qty:0.2,unit:"Kg"},{name:"Tomato",qty:2,unit:"Pcs"},{name:"Onion",qty:1,unit:"Pcs"}] },
      { id:"r5", name:"Omelette", emoji:"🍳", time:"5 min", tags:["breakfast","quick"],
        ingredients:[{name:"Eggs",qty:3,unit:"Pcs"},{name:"Onion",qty:1,unit:"Pcs"},{name:"Tomato",qty:1,unit:"Pcs"}] },
      { id:"r6", name:"Chicken Rice Bowl", emoji:"🥘", time:"25 min", tags:["lunch","dinner"],
        ingredients:[{name:"Chicken",qty:0.3,unit:"Kg"},{name:"Rice",qty:0.2,unit:"Kg"}] },
      { id:"r7", name:"Vegetable Pulao", emoji:"🍲", time:"25 min", tags:["lunch","veg"],
        ingredients:[{name:"Rice",qty:0.25,unit:"Kg"},{name:"Onion",qty:1,unit:"Pcs"},{name:"Tomato",qty:1,unit:"Pcs"}] },
      { id:"r8", name:"Milk Oats", emoji:"🥣", time:"5 min", tags:["breakfast","quick"],
        ingredients:[{name:"Oats",qty:0.1,unit:"Kg"},{name:"Milk",qty:0.25,unit:"Liters"}] },
      { id:"r9", name:"Egg Fried Rice", emoji:"🍳", time:"15 min", tags:["lunch","quick"],
        ingredients:[{name:"Rice",qty:0.2,unit:"Kg"},{name:"Eggs",qty:2,unit:"Pcs"}] },
      { id:"r10", name:"Tomato Soup", emoji:"🍵", time:"15 min", tags:["light","veg"],
        ingredients:[{name:"Tomato",qty:4,unit:"Pcs"},{name:"Onion",qty:1,unit:"Pcs"}] },
      { id:"r11", name:"Bread Toast", emoji:"🍞", time:"3 min", tags:["breakfast","quick"],
        ingredients:[{name:"Bread",qty:4,unit:"Pcs"},{name:"Butter",qty:0.03,unit:"Kg"}] },
      { id:"r12", name:"Chicken Sandwich", emoji:"🥪", time:"10 min", tags:["lunch","quick"],
        ingredients:[{name:"Bread",qty:4,unit:"Pcs"},{name:"Chicken",qty:0.15,unit:"Kg"}] },
    ];

    const matchScore = (recipe) => {
      let have = 0;
      recipe.ingredients.forEach(ing => {
        const match = inventory.find(i =>
          i.name.toLowerCase().includes(ing.name.toLowerCase()) ||
          ing.name.toLowerCase().includes(i.name.toLowerCase())
        );
        if (match && match.qty >= ing.qty) have++;
      });
      return { have, total: recipe.ingredients.length, pct: have / recipe.ingredients.length };
    };

    const scored = RECIPES.map(r => ({ ...r, score: matchScore(r) }))
      .sort((a,b) => b.score.pct - a.score.pct || a.score.total - b.score.total);
    const canMake = scored.filter(r => r.score.pct === 1);
    const almostMake = scored.filter(r => r.score.pct >= 0.5 && r.score.pct < 1);

    if (selMeal) {
      const recipe = selMeal;
      const deductItems = recipe.ingredients.map(ing => {
        const inv = inventory.find(i =>
          i.name.toLowerCase().includes(ing.name.toLowerCase()) ||
          ing.name.toLowerCase().includes(i.name.toLowerCase())
        );
        return { ing, inv, hasEnough: inv && inv.qty >= ing.qty };
      });
      const allReady = deductItems.every(d => d.hasEnough);
      const isCooking = busyAction === "cooking";
      return (
        <div style={{ display:"flex", flexDirection:"column", height:"100vh", background:"#f8f7f5" }}>
          <div style={{ ...S.dh(), padding:"16px 18px 20px", flexShrink:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
              <button style={S.back} onClick={()=>{setSelMeal(null);setActionError(null);}}>‹</button>
              <div>
                <h1 style={{ fontSize:20, fontWeight:800, margin:0 }}>{recipe.emoji} {recipe.name}</h1>
                <p style={{ color:"#9ca3af", margin:0, fontSize:12 }}>⏱ {recipe.time} · {recipe.ingredients.length} ingredients</p>
              </div>
            </div>
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:"16px 16px 100px" }}>
            <p style={{ fontSize:12, fontWeight:700, color:"#6b7280", textTransform:"uppercase", letterSpacing:"0.10em", marginBottom:10 }}>Ingredients needed</p>
            {deductItems.map(({ ing, inv, hasEnough }, i) => (
              <div key={i} style={{ background:"white", borderRadius:13, padding:"12px 14px", marginBottom:7, display:"flex", alignItems:"center", gap:10, border:`1.5px solid ${hasEnough ? "#dcfce7" : "#fee2e2"}` }}>
                <div style={{ width:32, height:32, borderRadius:10, background: hasEnough ? "#dcfce7" : "#fee2e2", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>
                  {hasEnough ? "✅" : "❌"}
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ margin:0, fontWeight:700, fontSize:13 }}>{ing.name}</p>
                  <p style={{ margin:0, fontSize:11, color:"#9ca3af" }}>Need: {ing.qty} {ing.unit} {inv ? `· Have: ${inv.qty} ${inv.unit}` : "· Not in pantry"}</p>
                </div>
              </div>
            ))}
            {allReady && (
              <div style={{ background:"#f0fdf4", borderRadius:13, padding:"13px", marginTop:10, textAlign:"center", border:"1px solid #bbf7d0" }}>
                <p style={{ margin:0, fontSize:13, fontWeight:700, color:"#16a34a" }}>✅ You have everything!</p>
                <p style={{ margin:"3px 0 0", fontSize:11, color:"#6b7280" }}>Cooking will deduct these from your pantry</p>
              </div>
            )}
          </div>
          <div style={{ padding:"12px 16px 28px", background:"white", borderTop:"1px solid #f0ede8" }}>
            {actionError && <ErrorBanner message={actionError} />}
            <button
              disabled={!allReady || isCooking}
              onClick={async () => {
                setBusyAction("cooking");
                setActionError(null);
                try {
                  await Promise.all(deductItems.map(async ({ ing, inv }) => {
                    if (inv) {
                      const newQty = Math.max(0, inv.qty - ing.qty);
                      await Promise.all([
                        updateItem(inv.id, { qty: newQty }),
                        logUsage({ item: inv.name, qty: ing.qty, unit: ing.unit, meal: recipe.name, addedToCart: newQty <= inv.reorder, ...(inv.price ? { unitPrice: inv.price, cost: inv.price * ing.qty } : {}) }),
                      ]);
                    }
                  }));
                  setJustSaved({ meal:true, count: deductItems.length, mealName: recipe.name });
                  setSelMeal(null); setUsedScreen("done");
                } catch (err) {
                  console.error("Meal deduction failed:", err);
                  setActionError("Hmm, some items didn't deduct — " + err.message);
                } finally {
                  setBusyAction(null);
                }
              }}
              style={{ width:"100%", background: allReady && !isCooking ? "#1e1b18" : "#e5e7eb", color: allReady && !isCooking ? "white" : "#9ca3af", border:"none", borderRadius:14, padding:"15px", fontWeight:800, fontSize:15, cursor: allReady && !isCooking ? "pointer" : "not-allowed", marginTop: actionError ? 8 : 0 }}>
              {isCooking ? "Deducting..." : "🍳 Let's cook — deduct these"}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div style={{ display:"flex", flexDirection:"column", height:"100vh", background:"#f8f7f5" }}>
        <div style={{ ...S.dh(), flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <button style={S.back} onClick={()=>setUsedScreen("list")}>‹</button>
            <div>
              <h1 style={{ fontSize:20, fontWeight:800, margin:0 }}>What's for dinner? 🍽️</h1>
              <p style={{ color:"#9ca3af", margin:0, fontSize:12 }}>Matched against what you have right now</p>
            </div>
          </div>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"14px 14px 100px" }}>
          {canMake.length > 0 && (
            <>
              <p style={{ fontSize:11, fontWeight:800, color:"#16a34a", textTransform:"uppercase", letterSpacing:"0.10em", marginBottom:8 }}>✅ Ready right now ({canMake.length})</p>
              {canMake.map(r => (
                <div key={r.id} onClick={()=>setSelMeal(r)} style={{ background:"white", borderRadius:16, padding:"14px", marginBottom:8, border:"1.5px solid #dcfce7", cursor:"pointer", display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:46, height:46, borderRadius:13, background:"#f0fdf4", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0 }}>{r.emoji}</div>
                  <div style={{ flex:1 }}>
                    <p style={{ margin:0, fontWeight:800, fontSize:14 }}>{r.name}</p>
                    <p style={{ margin:"2px 0 0", fontSize:11, color:"#6b7280" }}>⏱ {r.time} · {r.ingredients.length} ingredients</p>
                  </div>
                  <span style={S.badge("#dcfce7", "#16a34a")}>READY</span>
                </div>
              ))}
            </>
          )}
          {almostMake.length > 0 && (
            <>
              <p style={{ fontSize:11, fontWeight:800, color:"#d97706", textTransform:"uppercase", letterSpacing:"0.10em", marginBottom:8, marginTop:14 }}>🛒 Missing just one or two things ({almostMake.length})</p>
              {almostMake.map(r => {
                const missing = r.ingredients.filter(ing => !inventory.find(i =>
                  (i.name.toLowerCase().includes(ing.name.toLowerCase()) || ing.name.toLowerCase().includes(i.name.toLowerCase())) && i.qty >= ing.qty
                ));
                return (
                  <div key={r.id} onClick={()=>setSelMeal(r)} style={{ background:"white", borderRadius:16, padding:"14px", marginBottom:8, border:"1.5px solid #fef3c7", cursor:"pointer", display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ width:46, height:46, borderRadius:13, background:"#fffbeb", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0 }}>{r.emoji}</div>
                    <div style={{ flex:1 }}>
                      <p style={{ margin:0, fontWeight:800, fontSize:14 }}>{r.name}</p>
                      <p style={{ margin:"2px 0 0", fontSize:11, color:"#d97706" }}>Missing: {missing.map(m=>m.name).join(", ")}</p>
                    </div>
                    <span style={S.badge("#fef3c7", "#d97706")}>CLOSE</span>
                  </div>
                );
              })}
            </>
          )}
          {canMake.length === 0 && almostMake.length === 0 && (
            <div style={{ ...S.emptyWrap, padding:"60px 20px" }}>
              <div style={S.emptyIcon}>🥺</div>
              <p style={{ ...S.emptyTitle, fontWeight:800 }}>Nothing to cook with yet</p>
              <p style={S.emptySub}>Add some items first and we'll match recipes</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Quick Use screen ──────────────────────────────────────
  if (usedScreen==="quick_use" && selConsume) {
    const newQty = Math.max(0, selConsume.qty - consumeQty);
    const newLevel = stockLevel(newQty, selConsume.reorder);
    const isUsing = busyAction === "using";
    return (
      <div>
        <div style={S.dh()}><div style={{ display:"flex", alignItems:"center" }}><button style={S.back} onClick={()=>{setUsedScreen("list");setActionError(null);}}>‹</button><h1 style={{ fontSize:20, fontWeight:800, margin:0 }}>How much did you use?</h1></div></div>
        <div style={S.content}>
          <div style={S.card}>
            <div style={{ display:"flex", gap:10, alignItems:"center", paddingBottom:12, marginBottom:12, borderBottom:"1px solid #f5f5f4" }}>
              <div style={{ width:46, height:46, borderRadius:13, background:"#f9fafb", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>{selConsume.emoji}</div>
              <div><p style={{ margin:"0 0 1px", fontWeight:800, fontSize:15 }}>{selConsume.name}</p><p style={{ margin:0, fontSize:12, color:"#9ca3af", fontWeight:700 }}>Stock: {selConsume.qty} {selConsume.unit}</p></div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:14, background:"#f9fafb", borderRadius:16, padding:"13px 16px", marginBottom:11 }}>
              <button onClick={()=>setConsumeQty(q=>Math.max(1,q-1))} style={{ width:44, height:44, borderRadius:12, background:"white", border:"2px solid #e5e7eb", fontSize:20, cursor:"pointer", fontWeight:700 }}>−</button>
              <div style={{ flex:1, textAlign:"center" }}><span style={{ fontWeight:800, fontSize:38 }}>{consumeQty}</span><span style={{ fontSize:13, color:"#9ca3af", marginLeft:6 }}>{selConsume.unit}</span></div>
              <button onClick={()=>setConsumeQty(q=>Math.min(selConsume.qty,q+1))} style={{ width:44, height:44, borderRadius:12, background:"#1e1b18", border:"none", color:"white", fontSize:20, cursor:"pointer", fontWeight:700 }}>+</button>
            </div>
            <div style={{ display:"flex", gap:6, marginBottom:11 }}>
              {[1,2,3,selConsume.qty].filter((v,i,a)=>a.indexOf(v)===i&&v<=selConsume.qty).map(n=>(
                <div key={n} onClick={()=>setConsumeQty(n)} style={{ flex:1, background:consumeQty===n?"#1e1b18":"#f3f4f6", borderRadius:11, padding:"8px 0", textAlign:"center", cursor:"pointer" }}>
                  <span style={{ fontWeight:700, fontSize:12, color:consumeQty===n?"white":"#374151" }}>{n===selConsume.qty?"All":n}</span>
                </div>
              ))}
            </div>
            <div style={{ background:"#f9fafb", borderRadius:11, padding:"10px 12px", border:"1px solid #f0ede8" }}>
              <p style={{ margin:0, fontSize:12, color:"#6b7280" }}>After use: <b style={{ color: newLevel==="good"?"#16a34a":newLevel==="low"?"#d97706":"#ef4444" }}>{newQty} {selConsume.unit} remaining</b></p>
            </div>
          </div>
        </div>
        <div style={{ padding:"0 16px" }}>
          {actionError && <ErrorBanner message={actionError} />}
          <button style={{ ...S.btn(isUsing ? "#e5e7eb" : "#1e1b18", isUsing ? "#9ca3af" : "white"), marginTop: actionError ? 8 : 0 }} disabled={isUsing} onClick={async()=>{
            setBusyAction("using");
            setActionError(null);
            try {
              const usageCost = selConsume.price ? selConsume.price * consumeQty : null;
              await Promise.all([
                logUsage({ item:selConsume.name, qty:consumeQty, unit:selConsume.unit, addedToCart: newQty<=selConsume.reorder, ...(selConsume.price ? { unitPrice: selConsume.price, cost: usageCost } : {}) }),
                updateItem(selConsume.id, { qty: newQty }),
              ]);
              setJustSaved({ name:selConsume.name, newQty, unit:selConsume.unit, cost: usageCost });
              setSelConsume(null); setConsumeQty(1); setUsedScreen("done");
            } catch (err) {
              console.error("Quick use failed:", err);
              setActionError("Couldn't save that — " + err.message);
            } finally {
              setBusyAction(null);
            }
          }}>{isUsing ? "Saving..." : "Done, log it →"}</button>
        </div>
        <NavBar />
      </div>
    );
  }

  // ── Done screen ───────────────────────────────────────────
  if (usedScreen==="done" && justSaved) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100vh", padding:24, textAlign:"center", background:"#0D9488" }}>
      <div style={{ fontSize:72, marginBottom:20, animation:"popIn 0.5s cubic-bezier(0.34,1.56,0.64,1)" }}>{justSaved?.meal ? "🍳" : "✅"}</div>
      <h2 style={{ fontSize:28, fontWeight:800, margin:"0 0 10px", letterSpacing:"-0.8px", color:"white" }}>{justSaved?.meal?"Meal cooked!":"Logged it!"}</h2>
      <p style={{ color:"rgba(255,255,255,0.8)", margin:"0 0 20px", fontSize:14 }}>
        {justSaved?.meal ? <><b style={{color:"white"}}>{justSaved.count} items</b> deducted for <b style={{color:"white"}}>{justSaved.mealName}</b></> : <><b style={{color:"white"}}>{justSaved?.name}</b> → <b style={{color:"white"}}>{justSaved?.newQty} {justSaved?.unit}</b> remaining</>}
      </p>
      {justSaved?.cost && <p style={{ color:"rgba(255,255,255,0.9)", margin:"0 0 12px", fontSize:14, fontWeight:700 }}>💰 Cost: ₹{justSaved.cost.toFixed(2)}</p>}
      <div style={{ display:"flex", flexDirection:"column", gap:10, width:"100%" }}>
        <button style={{ width:"100%", background:"white", color:"#0D9488", border:"none", borderRadius:16, padding:"16px", fontSize:15, fontWeight:700, cursor:"pointer" }} onClick={()=>setUsedScreen("list")}>Log something else</button>
        <button style={{ width:"100%", background:"transparent", color:"rgba(255,255,255,0.9)", border:"2px solid rgba(255,255,255,0.3)", borderRadius:16, padding:"14px", fontSize:14, fontWeight:600, cursor:"pointer" }} onClick={()=>{setActiveTab("home");setUsedScreen("list");}}>← Back home</button>
      </div>
      <NavBar />
    </div>
  );

  // ── Default list screen ───────────────────────────────────
  return (
    <div>
      <div style={{ ...S.dh(), padding:"16px 18px 0" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <div><h1 style={{ fontSize:22, fontWeight:800, margin:"0 0 2px" }}>What did you use?</h1><p style={{ color:"#9ca3af", margin:0, fontSize:12 }}>Tap anything you used today</p></div>
          <button onClick={()=>{setMealItems({});setSelMeal(null);setUsedScreen("meal_mode");}} style={{ background:"#d97706", border:"none", borderRadius:10, padding:"6px 12px", color:"white", fontSize:11, fontWeight:700, cursor:"pointer" }}>🍽️ What's cooking?</button>
        </div>
        <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:12, scrollbarWidth:"none" }}>
          {CATS.map(c=>(
            <button key={c} onClick={()=>setUsedCat(c)} style={{ flexShrink:0, background:usedCat===c?"white":"rgba(255,255,255,0.1)", color:usedCat===c?"#1e1b18":"white", border:"none", borderRadius:20, padding:"5px 13px", fontSize:11, fontWeight:700, cursor:"pointer" }}>{c}</button>
          ))}
        </div>
      </div>
      <div style={S.content}>
        {!dismissedHints.used && <TabHint tab="used" onDismiss={() => onDismissHint("used")} />}
        <input placeholder="🔍  What are you looking for?" value={usedSearch} onChange={e=>setUsedSearch(e.target.value)} style={{ width:"100%", background:"white", border:"2px solid #f0ede8", borderRadius:13, padding:"10px 13px", fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"'DM Sans',sans-serif", marginBottom:10 }} />
        {filtered.length===0 ? (
          <div style={{ ...S.emptyWrap, padding:"40px 0" }}>
            <p style={{ fontSize:28, marginBottom:8 }}>📦</p>
            <p style={{ ...S.emptyTitle, margin:0 }}>Nothing here yet</p>
            <p style={{ fontSize:12, margin:0 }}>Head to the + tab to add your first items</p>
          </div>
        ) : filtered.map(item=>(
          <div key={item.id} onClick={()=>{setSelConsume(item);setConsumeQty(1);setUsedScreen("quick_use");setActionError(null);}} style={{ background:"white", borderRadius:14, padding:"12px 13px", marginBottom:7, boxShadow:"0 2px 5px rgba(0,0,0,0.04)", display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}>
            <div style={{ width:42, height:42, borderRadius:12, background:"#f9fafb", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>{item.emoji}</div>
            <div style={{ flex:1 }}>
              <p style={{ margin:0, fontWeight:700, fontSize:13 }}>{item.name}</p>
              <p style={{ margin:0, fontSize:11, color:"#9ca3af" }}>{item.brand} · {item.qty} {item.unit}{item.price ? ` · ₹${item.price}/${item.unit}` : ""}</p>
            </div>
            <div style={{ textAlign:"right" }}>
              <span style={{ fontSize:11, fontWeight:700, color: item.qty<=0?"#ef4444":item.qty<=item.reorder?"#d97706":"#22c55e" }}>
                {item.qty<=0?"Out":item.qty<=item.reorder?"Low":"OK"}
              </span>
            </div>
          </div>
        ))}
      </div>
      <NavBar />
    </div>
  );
})
