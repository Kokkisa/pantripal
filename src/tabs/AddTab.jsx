import { useState } from "react";
import S from "../lib/styles.js";
import { IS_DEMO } from "../lib/firebaseClient.js";
import { SET_SCREEN, UPDATE_ITEM, UPDATE_META, SET_ITEM_AND_SCREEN } from "../hooks/useAddReducer.js";
import TabHint from "../components/TabHint.jsx";
import ManualEntryForm from "../components/ManualEntryForm.jsx";
import Toast from "../components/Toast.jsx";

export default function AddTab({
  addState, dispatch,
  inventory, spaces, userMeta,
  resolveIntelligence, handlePhotoCapture, startScan, stopScan,
  handleSaveNewItem, savingItem, toast, setToast,
  resetAdd, photoRef, scannerContainerId,
  justSaved, setActiveTab,
  dismissedHints, onDismissHint, NavBar,
  handleBillCapture, handleBillSave, billRef,
}) {
  const { screen, item, meta } = addState;
  const { unitSource, existingStock, unitMismatch, selSpace, selShelf, scanning, scanDone, aiResult, scanError } = meta;

  if (screen==="choose") return(
    <div>
      <div style={S.dh()}><h1 style={{ fontSize:22, fontWeight:800, margin:"0 0 2px" }}>Add Item</h1><p style={{ color:"#9ca3af", margin:0, fontSize:12 }}>Choose entry method</p></div>
      <div style={S.content}>
        {!dismissedHints.add && <TabHint tab="add" onDismiss={() => onDismissHint("add")} />}
        {[
          { id:"barcode", emoji:"📊", title:"Scan Barcode", sub:"Point at product barcode", accent:"#d97706", tag:"FASTEST" },
          { id:"photo", emoji:"📸", title:"Snap a Photo", sub:"AI reads details automatically", accent:"#059669", tag:"AI POWERED" },
          { id:"manual", emoji:"✏️", title:"Enter Manually", sub:"Smart unit auto-fills as you type", accent:"#2563eb", tag:"MANUAL" },
          { id:"bill", emoji:"🧾", title:"Scan Bill", sub:"AI reads your receipt", accent:"#9333ea", tag:"BULK ADD" },
        ].map(opt=>(
          <div key={opt.id} onClick={()=>dispatch({type:SET_SCREEN,screen:opt.id})} style={{ background:opt.accent+"10", borderRadius:18, padding:"16px", marginBottom:10, cursor:"pointer", border:`1.5px solid ${opt.accent}22` }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:50, height:50, borderRadius:14, background:opt.accent+"18", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>{opt.emoji}</div>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:2 }}>
                  <span style={{ fontWeight:800, fontSize:15 }}>{opt.title}</span>
                  <span style={{ background:opt.accent, color:"white", fontSize:9, fontWeight:800, borderRadius:5, padding:"2px 7px" }}>{opt.tag}</span>
                </div>
                <p style={{ margin:0, fontSize:12, color:"#6b7280" }}>{opt.sub}</p>
              </div>
              <span style={{ fontSize:18, color:opt.accent }}>›</span>
            </div>
          </div>
        ))}
      </div>
      <NavBar />
    </div>
  );

  if (screen==="barcode") return(
    <div>
      <div style={S.dh()}><div style={{ display:"flex", alignItems:"center" }}><button style={S.back} onClick={()=>{stopScan();dispatch({type:SET_SCREEN,screen:"choose"});}}>‹</button><h1 style={{ fontSize:20, fontWeight:800, margin:0 }}>Scan Barcode</h1></div></div>
      <div style={S.content}>
        <div style={{ background:"#1e1b18", borderRadius:24, minHeight:240, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", marginBottom:14, border:"2px dashed #d97706", position:"relative", overflow:"hidden" }}>
          {[0,1,2,3].map(i=><div key={i} style={{ position:"absolute", width:24, height:24, top:i<2?18:"auto", bottom:i>=2?18:"auto", left:i%2===0?18:"auto", right:i%2===1?18:"auto", borderTop:i<2?"3px solid #d97706":"none", borderBottom:i>=2?"3px solid #d97706":"none", borderLeft:i%2===0?"3px solid #d97706":"none", borderRight:i%2===1?"3px solid #d97706":"none", zIndex:1 }} />)}
          {scanDone?<div style={{ textAlign:"center", padding:20 }}><div style={{ fontSize:44 }}>✅</div><p style={{ color:"#4ade80", fontWeight:800, fontSize:15, margin:"7px 0 0" }}>Found!</p></div>
          :scanning?<div id={scannerContainerId} style={{ width:"100%", minHeight:240 }} />
          :<div style={{ textAlign:"center", padding:20, cursor:"pointer" }} onClick={startScan}><div style={{ fontSize:40, marginBottom:8 }}>📊</div><p style={{ color:"white", fontWeight:700, fontSize:14, margin:"0 0 3px" }}>Tap to Scan</p><p style={{ color:"#9ca3af", fontSize:11, margin:0 }}>Point camera at a barcode</p></div>}
        </div>
        {scanError && <div style={{ background:"#fef3c7", borderRadius:12, padding:"10px 14px", marginBottom:10, border:"1px solid #fde68a" }}><p style={{ margin:0, fontSize:12, fontWeight:600, color:"#92400e" }}>⚠️ {scanError}</p></div>}
        <div style={S.gap()}>
          <button style={S.btn("#d97706")} onClick={scanning?stopScan:startScan}>{scanning?"Stop Scanner":"📊 Start Scanner"}</button>
          <button style={S.outline} onClick={()=>{stopScan();dispatch({type:SET_SCREEN,screen:"manual"});}}>Enter manually</button>
        </div>
      </div>
      <NavBar />
    </div>
  );

  if (screen==="photo") return(
    <div>
      <div style={S.dh()}><div style={{ display:"flex", alignItems:"center" }}><button style={S.back} onClick={()=>dispatch({type:SET_SCREEN,screen:"choose"})}>‹</button><h1 style={{ fontSize:20, fontWeight:800, margin:0 }}>Snap a Photo</h1></div></div>
      <div style={S.content}>
        <div onClick={()=>photoRef.current?.click()} style={{ background:"#1e1b18", borderRadius:24, height:240, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", marginBottom:14, cursor:"pointer", border:"2px dashed #059669" }}>
          <div style={{ fontSize:46, marginBottom:10 }}>📸</div>
          <p style={{ color:"white", fontWeight:700, fontSize:14, margin:"0 0 3px" }}>Tap to photograph</p>
          <p style={{ color:"#9ca3af", fontSize:11, margin:0 }}>AI reads the label</p>
          <input ref={photoRef} type="file" accept="image/*" capture="environment" style={{ display:"none" }} onChange={handlePhotoCapture} />
        </div>
        <div style={S.gap()}>
          <button style={S.btn("#059669")} onClick={()=>photoRef.current?.click()}>📸 Open Camera</button>
          <button style={S.outline} onClick={()=>dispatch({type:SET_SCREEN,screen:"manual"})}>Enter manually</button>
        </div>
      </div>
      <NavBar />
    </div>
  );

  if (screen==="ai_analyzing") return(
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px 24px", textAlign:"center", minHeight:680 }}>
      {item.imagePreview&&<div style={{ width:130, height:130, borderRadius:22, overflow:"hidden", marginBottom:20 }}><img src={item.imagePreview} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt="" /></div>}
      <div style={{ width:50, height:50, border:"5px solid #059669", borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.9s linear infinite", margin:"0 auto 16px" }} />
      <h2 style={{ fontSize:20, fontWeight:800, margin:"0 0 6px" }}>AI reading photo...</h2>
      <p style={{ fontSize:13, color:"#6b7280", margin:0 }}>Identifying product & details</p>
    </div>
  );

  if (screen==="manual"||screen==="review_details") return (
    <ManualEntryForm
      initialItem={{ name: item.name, brand: item.brand, category: item.category, unit: item.unit, imagePreview: item.imagePreview, aiResult: meta.aiResult, aiError: meta.aiError }}
      onBack={() => dispatch({type:SET_SCREEN,screen:"choose"})}
      onContinue={(formValues) => {
        dispatch({type:UPDATE_ITEM,fields:formValues});
        resolveIntelligence(formValues.name, formValues.unit !== "Pcs" ? formValues.unit : null);
      }}
      navBar={<NavBar />}
    />
  );

  if (screen==="unit_mismatch") return(
    <div>
      <div style={S.dh("#d97706")}><div style={{ display:"flex", alignItems:"center" }}><button style={{...S.back,color:"white"}} onClick={()=>dispatch({type:SET_SCREEN,screen:"manual"})}>‹</button><h1 style={{ fontSize:20, fontWeight:800, margin:0 }}>Unit Mismatch ⚠️</h1></div></div>
      <div style={S.content}>
        <div style={S.card}>
          <div style={S.gap(8)}>
            <div style={{ background:"#f0fdf4", borderRadius:12, padding:"11px", border:"1.5px solid #bbf7d0" }}><p style={{ margin:"0 0 2px", fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase" }}>Currently tracked as</p><p style={{ margin:0, fontWeight:800, fontSize:16, color:"#059669" }}>{unitMismatch?.existing?.qty} {unitMismatch?.oldUnit}</p></div>
            <div style={{ background:"#fff7ed", borderRadius:12, padding:"11px", border:"1.5px solid #fde68a" }}><p style={{ margin:"0 0 2px", fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase" }}>You're adding in</p><p style={{ margin:0, fontWeight:800, fontSize:16, color:"#d97706" }}>{item.qty} {unitMismatch?.newUnit}</p></div>
            <div style={{ background:"#fef2f2", borderRadius:12, padding:"10px", border:"1px solid #fecaca" }}><p style={{ margin:0, fontSize:12, color:"#991b1b", fontWeight:600 }}>⚠️ {unitMismatch?.oldUnit} ≠ {unitMismatch?.newUnit}</p></div>
          </div>
        </div>
        <div style={S.gap(8)}>
          <button style={S.btn("#1e1b18")} onClick={()=>dispatch({type:SET_ITEM_AND_SCREEN,fields:{unit:unitMismatch?.newUnit},screen:"stock_add_confirm"})}>Switch to {unitMismatch?.newUnit}</button>
          <button style={S.btn("#6b7280")} onClick={()=>dispatch({type:SET_ITEM_AND_SCREEN,fields:{unit:unitMismatch?.oldUnit},screen:"stock_add_confirm"})}>Keep {unitMismatch?.oldUnit}</button>
          <button style={S.outline} onClick={()=>dispatch({type:SET_SCREEN,screen:"manual"})}>Go back</button>
        </div>
      </div>
      <NavBar />
    </div>
  );

  if (screen==="stock_add_confirm") return(
    <div>
      <div style={S.dh("#2563eb")}><div style={{ display:"flex", alignItems:"center" }}><button style={{...S.back,color:"white"}} onClick={()=>dispatch({type:SET_SCREEN,screen:"manual"})}>‹</button><h1 style={{ fontSize:20, fontWeight:800, margin:0 }}>Already In Stock!</h1></div></div>
      <div style={S.content}>
        <div style={S.card}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ flex:1, background:"#f0fdf4", borderRadius:12, padding:"11px", textAlign:"center", border:"1.5px solid #bbf7d0" }}>
              <p style={{ margin:"0 0 1px", fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase" }}>In Stock</p>
              <p style={{ margin:0, fontWeight:800, fontSize:26, color:"#059669" }}>{existingStock?.qty}</p>
              <p style={{ margin:0, fontSize:11, color:"#9ca3af" }}>{item.unit}</p>
            </div>
            <span style={{ fontSize:22, fontWeight:800, color:"#d97706" }}>+</span>
            <div style={{ flex:1, background:"#fff8f0", borderRadius:12, padding:"11px", textAlign:"center", border:"1.5px solid #fde68a" }}>
              <p style={{ margin:"0 0 1px", fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase" }}>Adding</p>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                <button onClick={()=>dispatch({type:UPDATE_ITEM,fields:{qty:Math.max(1,item.qty-1)}})} style={{ width:24, height:24, borderRadius:7, background:"white", border:"1px solid #fde68a", fontSize:14, cursor:"pointer", fontWeight:700 }}>−</button>
                <span style={{ fontWeight:800, fontSize:24, color:"#d97706" }}>{item.qty}</span>
                <button onClick={()=>dispatch({type:UPDATE_ITEM,fields:{qty:item.qty+1}})} style={{ width:24, height:24, borderRadius:7, background:"#d97706", border:"none", color:"white", fontSize:14, cursor:"pointer", fontWeight:700 }}>+</button>
              </div>
              <p style={{ margin:0, fontSize:11, color:"#9ca3af" }}>{item.unit}</p>
            </div>
            <span style={{ fontSize:20, fontWeight:800, color:"#6b7280" }}>=</span>
            <div style={{ flex:1, background:"#1e1b18", borderRadius:12, padding:"11px", textAlign:"center" }}>
              <p style={{ margin:"0 0 1px", fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase" }}>Total</p>
              <p style={{ margin:0, fontWeight:800, fontSize:26, color:"white" }}>{(existingStock?.qty||0)+item.qty}</p>
              <p style={{ margin:0, fontSize:11, color:"#9ca3af" }}>{item.unit}</p>
            </div>
          </div>
        </div>
        <div style={{ ...S.card, marginTop:0 }}>
          <label style={S.label}>Price per {item.unit}</label>
          <div style={{ display:"flex", alignItems:"center", gap:8, background:"#f9fafb", borderRadius:14, padding:"12px 16px", border:"1px solid #f0ede8" }}>
            <span style={{ fontWeight:800, fontSize:18, color:"#6b7280" }}>₹</span>
            <input type="number" min="0" step="0.01" placeholder={existingStock?.price ? String(existingStock.price) : "0.00"} value={item.price} onChange={e=>dispatch({type:UPDATE_ITEM,fields:{price:e.target.value}})} style={{ ...S.input, border:"none", background:"transparent", padding:0, fontSize:20, fontWeight:800, flex:1 }} />
          </div>
          <p style={{ margin:"7px 0 0", fontSize:11, color:"#9ca3af" }}>💰 Optional — update if price changed</p>
        </div>
        <button style={S.btn("#1e1b18", "white", savingItem)} disabled={savingItem} onClick={handleSaveNewItem}>{savingItem ? "Saving..." : `✅ Add ${item.qty} to Stock`}</button>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
      <NavBar />
    </div>
  );

  if (screen==="select_location") return(
    <div>
      <div style={S.dh()}><div style={{ display:"flex", alignItems:"center" }}><button style={S.back} onClick={()=>dispatch({type:SET_SCREEN,screen:"manual"})}>‹</button><h1 style={{ fontSize:20, fontWeight:800, margin:0 }}>Where does it live?</h1></div></div>
      <div style={S.content}>
        {spaces.map(space=>(
          <div key={space.id} style={S.card}>
            <div onClick={()=>dispatch({type:UPDATE_META,fields:{selSpace:selSpace?.id===space.id?null:space}})} style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", marginBottom:selSpace?.id===space.id?10:0 }}>
              <div style={{ width:38, height:38, borderRadius:11, background:space.accent+"18", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{space.icon}</div>
              <div style={{ flex:1 }}><p style={{ margin:0, fontWeight:700, fontSize:14 }}>{space.name}</p></div>
              <span style={{ fontSize:16, color:space.accent, transform:selSpace?.id===space.id?"rotate(90deg)":"none", transition:"transform 0.2s" }}>›</span>
            </div>
            {selSpace?.id===space.id&&space.shelves.map(shelf=>(
              <div key={shelf.id} onClick={()=>dispatch({type:UPDATE_META,fields:{selShelf:shelf}})} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 10px", borderRadius:12, background:selShelf?.id===shelf.id?space.accent+"15":"#f9fafb", border:`2px solid ${selShelf?.id===shelf.id?space.accent:"transparent"}`, cursor:"pointer", marginBottom:5 }}>
                <div style={{ width:30, height:30, borderRadius:8, background:selShelf?.id===shelf.id?space.accent:"#e5e7eb", display:"flex", alignItems:"center", justifyContent:"center" }}><span style={{ fontWeight:800, fontSize:11, color:selShelf?.id===shelf.id?"white":"#6b7280" }}>📦</span></div>
                <span style={{ fontWeight:600, fontSize:13 }}>{shelf.name}</span>
                {selShelf?.id===shelf.id&&<span style={{ marginLeft:"auto" }}>✅</span>}
              </div>
            ))}
          </div>
        ))}
        <button style={S.btn(selShelf?"#1e1b18":"#e5e7eb","white",!selShelf)} disabled={!selShelf} onClick={()=>dispatch({type:SET_SCREEN,screen:"set_stock"})}>Set Stock Levels →</button>
      </div>
      <NavBar />
    </div>
  );

  if (screen==="set_stock") return(
    <div>
      <div style={S.dh()}><div style={{ display:"flex", alignItems:"center" }}><button style={S.back} onClick={()=>dispatch({type:SET_SCREEN,screen:meta.selSpace && meta.selShelf ? "manual" : "select_location"})}>‹</button><h1 style={{ fontSize:20, fontWeight:800, margin:0 }}>How many are you adding?</h1></div></div>
      <div style={S.content}>
        {meta.selSpace && meta.selShelf && (
          <div style={{ background:"#f0fdf4", borderRadius:12, padding:"10px 14px", marginBottom:10, border:"1px solid #bbf7d0" }}>
            <p style={{ margin:0, fontSize:12, color:"#15803d", fontWeight:600 }}>📍 Going to: {meta.selSpace.name} › {meta.selShelf.name}</p>
          </div>
        )}
        <div style={S.card}>
          <div style={{ marginBottom:16 }}>
            <label style={S.label}>Quantity</label>
            <div style={{ display:"flex", alignItems:"center", gap:12, background:"#f9fafb", borderRadius:14, padding:"12px 16px" }}>
              <button onClick={()=>dispatch({type:UPDATE_ITEM,fields:{qty:Math.max(0,item.qty-1)}})} style={{ width:42, height:42, borderRadius:12, background:"white", border:"2px solid #e5e7eb", fontSize:20, cursor:"pointer", fontWeight:700 }}>−</button>
              <div style={{ flex:1, textAlign:"center" }}><span style={{ fontWeight:800, fontSize:34 }}>{item.qty}</span><span style={{ fontSize:13, color:"#9ca3af", marginLeft:5 }}>{item.unit}</span></div>
              <button onClick={()=>dispatch({type:UPDATE_ITEM,fields:{qty:item.qty+1}})} style={{ width:42, height:42, borderRadius:12, background:"#1e1b18", border:"none", color:"white", fontSize:20, cursor:"pointer", fontWeight:700 }}>+</button>
            </div>
          </div>
          <div>
            <label style={S.label}>Reorder Level (JIT trigger)</label>
            <div style={{ display:"flex", alignItems:"center", gap:12, background:"#fff8f0", borderRadius:14, padding:"12px 16px", border:"1px solid #fde68a" }}>
              <button onClick={()=>dispatch({type:UPDATE_ITEM,fields:{reorder:Math.max(1,item.reorder-1)}})} style={{ width:42, height:42, borderRadius:12, background:"white", border:"2px solid #fde68a", fontSize:20, cursor:"pointer", fontWeight:700 }}>−</button>
              <div style={{ flex:1, textAlign:"center" }}><span style={{ fontWeight:800, fontSize:34, color:"#d97706" }}>{item.reorder}</span><span style={{ fontSize:13, color:"#9ca3af", marginLeft:5 }}>{item.unit}</span></div>
              <button onClick={()=>dispatch({type:UPDATE_ITEM,fields:{reorder:item.reorder+1}})} style={{ width:42, height:42, borderRadius:12, background:"#d97706", border:"none", color:"white", fontSize:20, cursor:"pointer", fontWeight:700 }}>+</button>
            </div>
            <p style={{ margin:"7px 0 0", fontSize:11, color:"#9ca3af" }}>💡 Auto-adds to shopping list when stock hits {item.reorder} {item.unit}</p>
          </div>
          <div style={{ marginTop:16 }}>
            <label style={S.label}>Price per {item.unit}</label>
            <div style={{ display:"flex", alignItems:"center", gap:8, background:"#f9fafb", borderRadius:14, padding:"12px 16px", border:"1px solid #f0ede8" }}>
              <span style={{ fontWeight:800, fontSize:18, color:"#6b7280" }}>₹</span>
              <input type="number" min="0" step="0.01" placeholder="0.00" value={item.price} onChange={e=>dispatch({type:UPDATE_ITEM,fields:{price:e.target.value}})} style={{ ...S.input, border:"none", background:"transparent", padding:0, fontSize:20, fontWeight:800, flex:1 }} />
            </div>
            <p style={{ margin:"7px 0 0", fontSize:11, color:"#9ca3af" }}>💰 Optional — helps track spending later</p>
          </div>
        </div>
        <button style={S.btn("#1e1b18", "white", savingItem)} disabled={savingItem} onClick={handleSaveNewItem}>{savingItem ? "Saving..." : "💾 Save Item →"}</button>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
      <NavBar />
    </div>
  );

  /* ── Bill Scan: capture ────────────────────────────────── */
  if (screen==="bill") return(
    <div>
      <div style={S.dh("#9333ea")}><div style={{ display:"flex", alignItems:"center" }}><button style={{...S.back,color:"white"}} onClick={()=>dispatch({type:SET_SCREEN,screen:"choose"})}>‹</button><h1 style={{ fontSize:20, fontWeight:800, margin:0 }}>Scan Bill 🧾</h1></div></div>
      <div style={S.content}>
        {IS_DEMO && <div style={{ background:"#fef3c7", borderRadius:12, padding:"10px 14px", marginBottom:10, border:"1px solid #fde68a" }}><p style={{ margin:0, fontSize:12, fontWeight:600, color:"#92400e" }}>⚠️ Bill scanning requires the AI API and won't work in demo mode.</p></div>}
        {meta.billError && <div style={{ background:"#fef2f2", borderRadius:12, padding:"10px 14px", marginBottom:10, border:"1px solid #fecaca" }}><p style={{ margin:0, fontSize:12, fontWeight:600, color:"#991b1b" }}>❌ {meta.billError}</p></div>}
        <div onClick={()=>!IS_DEMO && billRef.current?.click()} style={{ background:"#1e1b18", borderRadius:24, height:240, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", marginBottom:14, cursor:IS_DEMO?"not-allowed":"pointer", border:"2px dashed #9333ea", opacity:IS_DEMO?0.5:1 }}>
          <div style={{ fontSize:46, marginBottom:10 }}>🧾</div>
          <p style={{ color:"white", fontWeight:700, fontSize:14, margin:"0 0 3px" }}>Tap to photograph your bill</p>
          <p style={{ color:"#9ca3af", fontSize:11, margin:0 }}>AI extracts every line item</p>
          <input ref={billRef} type="file" accept="image/*" capture="environment" style={{ display:"none" }} onChange={handleBillCapture} />
        </div>
        <div style={S.gap()}>
          <button style={S.btn("#9333ea")} disabled={IS_DEMO} onClick={()=>billRef.current?.click()}>📷 Open Camera</button>
          <button style={S.outline} onClick={()=>dispatch({type:SET_SCREEN,screen:"choose"})}>← Back</button>
        </div>
      </div>
      <NavBar />
    </div>
  );

  /* ── Bill Scan: analyzing spinner ────────────────────── */
  if (screen==="bill_analyzing") return(
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px 24px", textAlign:"center", minHeight:680 }}>
      {meta.billImagePreview&&<div style={{ width:130, height:170, borderRadius:18, overflow:"hidden", marginBottom:20, border:"3px solid #9333ea22" }}><img src={meta.billImagePreview} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt="" /></div>}
      <div style={{ width:50, height:50, border:"5px solid #9333ea", borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.9s linear infinite", margin:"0 auto 16px" }} />
      <h2 style={{ fontSize:20, fontWeight:800, margin:"0 0 6px" }}>Reading your bill...</h2>
      <p style={{ fontSize:13, color:"#6b7280", margin:0 }}>Extracting items, prices & quantities</p>
    </div>
  );

  /* ── Bill Scan: review extracted items ───────────────── */
  if (screen==="bill_review") return <BillReviewScreen addState={addState} dispatch={dispatch} spaces={spaces} handleBillSave={handleBillSave} savingItem={savingItem} resetAdd={resetAdd} NavBar={NavBar} />;

  if (screen==="saved") return(
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"56px 24px", textAlign:"center", minHeight:680 }}>
      <div style={{ fontSize:68, marginBottom:16 }}>{justSaved?.bill ? "🧾" : "🎉"}</div>
      <h2 style={{ fontSize:26, fontWeight:800, margin:"0 0 8px", letterSpacing:"-0.8px" }}>
        {justSaved?.bill ? "Bill Processed!" : justSaved?.existingStock ? "Stock Updated!" : "Item Saved!"}
      </h2>
      {justSaved?.bill ? (
        <p style={{ fontSize:13, color:"#6b7280", margin:"0 0 12px" }}>
          {justSaved.restocked > 0 && <span><b>{justSaved.restocked}</b> item{justSaved.restocked>1?"s":""} restocked</span>}
          {justSaved.restocked > 0 && justSaved.added > 0 && ", "}
          {justSaved.added > 0 && <span><b>{justSaved.added}</b> new item{justSaved.added>1?"s":""} added</span>}
          {IS_DEMO && " (demo mode — won't persist)"}
        </p>
      ) : (
        <p style={{ fontSize:13, color:"#6b7280", margin:"0 0 12px" }}><b>{justSaved?.name}</b> is now in your PantriPal{IS_DEMO?" (demo mode — won't persist)":""}</p>
      )}
      {!IS_DEMO&&<div style={{ background:"#f0fdf4", borderRadius:12, padding:"10px 14px", marginBottom:16, border:"1px solid #bbf7d0", width:"100%" }}><p style={{ margin:0, fontSize:12, color:"#15803d", fontWeight:600 }}>🔥 Saved to Firebase — synced to {userMeta.partner||"partner"}'s phone instantly</p></div>}
      <div style={{...S.gap(), width:"100%"}}>
        <button style={S.btn("#1e1b18")} onClick={resetAdd}>+ Add Another</button>
        <button style={S.outline} onClick={()=>{setActiveTab("home");resetAdd();}}>← Home</button>
      </div>
      <NavBar />
    </div>
  );

  // Fallback — still render toast for error feedback even on unknown screens
  return <>
    {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
  </>;
}

/* ════════════════════════════════════════════════════════════════
   Bill Review Screen — extracted as sub-component for local state
   ════════════════════════════════════════════════════════════════ */
function BillReviewScreen({ addState, dispatch, spaces, handleBillSave, savingItem, resetAdd, NavBar }) {
  const { meta } = addState;
  const billItems = meta.billItems || [];

  // Local toggle/edit state — keeps reducer simpler
  const [toggles, setToggles] = useState(() => billItems.map(() => true));
  const [locations, setLocations] = useState(() =>
    billItems.map(bi => ({
      spaceId: bi.spaceId || "",
      shelfId: bi.shelfId || "",
    }))
  );

  const toggle = (i) => setToggles(t => t.map((v, j) => j === i ? !v : v));

  const setLoc = (i, field, val) => {
    setLocations(l => l.map((loc, j) => {
      if (j !== i) return loc;
      if (field === "spaceId") return { spaceId: val, shelfId: "" };
      return { ...loc, [field]: val };
    }));
  };

  // Check if all enabled NEW items have a location assigned
  const enabledCount = toggles.filter(Boolean).length;
  const hasUnassigned = billItems.some((bi, i) => toggles[i] && !bi.matched && !locations[i].shelfId);

  const onSave = () => {
    // Build enriched items and pass directly to save
    const enriched = billItems.map((bi, i) => ({
      ...bi,
      enabled: toggles[i],
      spaceId: bi.matched ? bi.spaceId : locations[i].spaceId,
      shelfId: bi.matched ? bi.shelfId : locations[i].shelfId,
    }));
    handleBillSave(enriched);
  };

  return (
    <div>
      <div style={S.dh("#9333ea")}>
        <div style={{ display:"flex", alignItems:"center" }}>
          <button style={{...S.back,color:"white"}} onClick={()=>dispatch({type:"SET_SCREEN",screen:"choose"})}>‹</button>
          <h1 style={{ fontSize:20, fontWeight:800, margin:0 }}>Bill Review 🧾</h1>
        </div>
        <p style={{ margin:"4px 0 0", fontSize:12, color:"rgba(255,255,255,0.7)" }}>{billItems.length} item{billItems.length!==1?"s":""} found · {enabledCount} selected</p>
      </div>
      <div style={S.content}>
        {billItems.map((bi, i) => {
          const enabled = toggles[i];
          const isNew = !bi.matched;
          const space = spaces.find(s => s.id === (isNew ? locations[i].spaceId : bi.spaceId));
          const shelf = space?.shelves?.find(sh => sh.id === (isNew ? locations[i].shelfId : bi.shelfId));

          return (
            <div key={bi.id} style={{ background: enabled ? "white" : "#f9fafb", borderRadius:16, padding:"14px", marginBottom:10, border:`1.5px solid ${enabled ? (isNew ? "#9333ea33" : "#05966933") : "#e5e7eb"}`, opacity: enabled ? 1 : 0.55, transition:"all 0.2s" }}>
              {/* Header row: toggle + name + price */}
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                <div onClick={()=>toggle(i)} style={{ width:28, height:28, borderRadius:8, background: enabled ? "#9333ea" : "#e5e7eb", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 }}>
                  {enabled && <span style={{ color:"white", fontWeight:800, fontSize:14 }}>✓</span>}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ margin:0, fontWeight:700, fontSize:14, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{bi.emoji || "📦"} {bi.name}</p>
                  <p style={{ margin:0, fontSize:11, color:"#6b7280" }}>{bi.qty} × {bi.unit}{bi.brand ? ` · ${bi.brand}` : ""}</p>
                </div>
                {bi.price > 0 && <span style={{ fontWeight:800, fontSize:15, color:"#059669", flexShrink:0 }}>₹{bi.price}</span>}
              </div>

              {/* Match status */}
              {!isNew ? (
                <div style={{ background:"#f0fdf4", borderRadius:10, padding:"8px 12px", border:"1px solid #bbf7d0" }}>
                  <p style={{ margin:0, fontSize:12, fontWeight:600, color:"#15803d" }}>
                    ✅ Found in pantry — {space?.name || "?"} › {shelf?.name || "?"}
                  </p>
                  <p style={{ margin:"3px 0 0", fontSize:11, color:"#6b7280" }}>
                    Current stock: {bi.matched.qty} {bi.matched.unit} → will become {bi.matched.qty + bi.qty} {bi.matched.unit}
                  </p>
                </div>
              ) : enabled ? (
                <div>
                  <div style={{ background:"#fefce8", borderRadius:10, padding:"8px 12px", marginBottom:8, border:"1px solid #fde68a" }}>
                    <p style={{ margin:0, fontSize:12, fontWeight:700, color:"#92400e" }}>🆕 New item — not in your inventory</p>
                    <p style={{ margin:"2px 0 0", fontSize:11, color:"#a16207" }}>Assign a space & shelf below</p>
                  </div>
                  {/* Inline space → shelf picker */}
                  <div style={{ display:"flex", gap:8 }}>
                    <select
                      value={locations[i].spaceId}
                      onChange={e => setLoc(i, "spaceId", e.target.value)}
                      style={{ flex:1, padding:"9px 10px", borderRadius:10, border:"1.5px solid #e5e7eb", fontSize:13, fontWeight:600, background:"white", color: locations[i].spaceId ? "#1e1b18" : "#9ca3af" }}
                    >
                      <option value="">Space…</option>
                      {spaces.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
                    </select>
                    <select
                      value={locations[i].shelfId}
                      onChange={e => setLoc(i, "shelfId", e.target.value)}
                      disabled={!locations[i].spaceId}
                      style={{ flex:1, padding:"9px 10px", borderRadius:10, border:`1.5px solid ${!locations[i].spaceId ? "#f0ede8" : "#e5e7eb"}`, fontSize:13, fontWeight:600, background: !locations[i].spaceId ? "#f9fafb" : "white", color: locations[i].shelfId ? "#1e1b18" : "#9ca3af" }}
                    >
                      <option value="">Shelf…</option>
                      {(spaces.find(s => s.id === locations[i].spaceId)?.shelves || []).map(sh => (
                        <option key={sh.id} value={sh.id}>{sh.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}

        {/* Summary bar */}
        <div style={{ background:"#f9fafb", borderRadius:14, padding:"12px 16px", marginBottom:12, border:"1px solid #f0ede8" }}>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
            <span style={{ color:"#6b7280" }}>Total items</span>
            <span style={{ fontWeight:800 }}>{enabledCount}</span>
          </div>
          {billItems.some(bi => bi.price > 0) && (
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginTop:4 }}>
              <span style={{ color:"#6b7280" }}>Bill total</span>
              <span style={{ fontWeight:800, color:"#059669" }}>₹{billItems.reduce((s, bi, i) => toggles[i] ? s + (bi.price || 0) : s, 0)}</span>
            </div>
          )}
        </div>

        <div style={S.gap()}>
          <button
            style={S.btn(enabledCount > 0 && !hasUnassigned ? "#9333ea" : "#e5e7eb", "white", savingItem || enabledCount === 0 || hasUnassigned)}
            disabled={savingItem || enabledCount === 0 || hasUnassigned}
            onClick={onSave}
          >
            {savingItem ? "Saving..." : hasUnassigned ? "⚠️ Assign all locations first" : `✅ Save ${enabledCount} Item${enabledCount!==1?"s":""}`}
          </button>
          <button style={S.outline} onClick={()=>dispatch({type:"SET_SCREEN",screen:"choose"})}>← Back</button>
        </div>
      </div>
      <NavBar />
    </div>
  );
}
