import { useState } from "react";
import S from "../lib/styles.js";
import { stockLevel } from "../lib/pantriUtils.js";
import { SC, SB, SBo } from "../lib/pantriConstants.js";

export default function ShopOverlay({ shoppingList, checkedShop, setCheckedShop, spaces, userMeta, onClose }) {
  const [copyMsg, setCopyMsg] = useState(null);
  const getSpace = (id) => spaces.find(s => s.id === id);
  const getShelf = (spaceId, shelfId) => spaces.find(s => s.id === spaceId)?.shelves.find(sh => sh.id === shelfId);

  return (
    <div onClick={onClose} style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.5)", zIndex:200, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:"min(390px,100vw)", background:"#faf9f7", borderRadius:"28px 28px 0 0", maxHeight:"85vh", overflow:"auto", animation:"slideUp 0.3s ease-out" }}>
        <div style={{ background:"#1e1b18", padding:"16px 18px 18px", borderRadius:"28px 28px 0 0", color:"white", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div><h1 style={{ fontSize:20, fontWeight:800, margin:"0 0 2px" }}>Your shopping list 🛒</h1><p style={{ color:"#9ca3af", margin:0, fontSize:12 }}>{shoppingList.length} things to grab</p></div>
          <span onClick={onClose} style={{ color:"#9ca3af", fontSize:22, cursor:"pointer" }}>×</span>
        </div>
        <div style={{ padding:"14px 14px 32px" }}>
          {shoppingList.length === 0 ? (
            <div style={{ textAlign:"center", padding:"40px 20px" }}>
              <div style={{ fontSize:48, marginBottom:10 }}>🎉</div>
              <p style={{ fontWeight:700, fontSize:16, margin:"0 0 4px" }}>You're all stocked up! 🎉</p>
            </div>
          ) : shoppingList.map((item, i) => {
            const level = stockLevel(item.qty, item.reorder);
            const checked = checkedShop[item.id];
            const needQty = Math.max(1, (item.reorder+1)-item.qty);
            return (
              <div key={item.id} style={{ background:"white", borderRadius:16, padding:"12px 14px", marginBottom:8, boxShadow:"0 2px 6px rgba(0,0,0,0.04)", opacity:checked?0.4:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                  <div onClick={()=>setCheckedShop(p=>({...p,[item.id]:!p[item.id]}))} style={{ width:22, height:22, borderRadius:7, border:`2px solid ${checked?"#16a34a":"#d1d5db"}`, background:checked?"#16a34a":"transparent", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 }}>
                    {checked&&<span style={{ color:"white", fontSize:12, fontWeight:800 }}>✓</span>}
                  </div>
                  <span style={{ fontSize:18 }}>{item.emoji}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                      <span style={{ fontWeight:700, fontSize:14, textDecoration:checked?"line-through":"none" }}>{item.name}</span>
                      {level==="out"&&<span style={{ background:"#fef2f2", color:"#ef4444", fontSize:9, fontWeight:800, borderRadius:5, padding:"2px 5px" }}>OUT</span>}
                    </div>
                    <p style={{ margin:0, fontSize:11, color:"#9ca3af" }}>{getSpace(item.spaceId)?.name} · {getShelf(item.spaceId, item.shelfId)?.name || item.shelfId}</p>
                  </div>
                </div>
                <div style={{ display:"flex", gap:7 }}>
                  <div style={{ flex:1, background:SB[level], borderRadius:10, padding:"8px 10px", border:`1px solid ${SBo[level]}` }}>
                    <p style={{ margin:"0 0 1px", fontSize:9, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:"0.10em" }}>Have</p>
                    <p style={{ margin:0, fontWeight:800, fontSize:15, color:SC[level] }}>{item.qty} <span style={{ fontSize:11, fontWeight:600 }}>{item.unit}</span></p>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", color:"#d1d5db", fontSize:16 }}>→</div>
                  <div style={{ flex:1, background:"#f0fdf4", borderRadius:10, padding:"8px 10px", border:"1px solid #bbf7d0" }}>
                    <p style={{ margin:"0 0 1px", fontSize:9, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:"0.10em" }}>Buy</p>
                    <p style={{ margin:0, fontWeight:800, fontSize:15, color:"#16a34a" }}>{needQty}+ <span style={{ fontSize:11, fontWeight:600 }}>{item.unit}</span></p>
                  </div>
                  <div style={{ flex:1.2, background:"#f9fafb", borderRadius:10, padding:"8px 10px", border:"1px solid #f0ede8" }}>
                    <p style={{ margin:"0 0 1px", fontSize:9, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:"0.10em" }}>Target</p>
                    <p style={{ margin:0, fontWeight:800, fontSize:15, color:"#374151" }}>{item.reorder+1} <span style={{ fontSize:11, fontWeight:600 }}>{item.unit}</span></p>
                  </div>
                </div>
              </div>
            );
          })}
          {shoppingList.length > 0 && (
            <>
              <button onClick={async () => {
                const text = "🛒 Pantri Shopping List\n" + shoppingList.map(it => {
                  const need = Math.max(1, (it.reorder+1) - it.qty);
                  return `• ${it.name} — buy ${need}+ ${it.unit}`;
                }).join("\n");
                if (navigator.share) {
                  try { await navigator.share({ title:"Pantri Shopping List", text }); } catch {}
                } else if (navigator.clipboard) {
                  try {
                    await navigator.clipboard.writeText(text);
                    setCopyMsg("Copied to clipboard!");
                    setTimeout(() => setCopyMsg(null), 2500);
                  } catch {
                    setCopyMsg("Couldn't copy — try again");
                    setTimeout(() => setCopyMsg(null), 2500);
                  }
                }
              }} style={{ ...S.btn("#16a34a"), marginTop:4 }}>📤 Send to {userMeta.partner||"Partner"}</button>
              {copyMsg && (
                <div style={{ background:"#f0fdf4", borderRadius:10, padding:"8px 14px", marginTop:8, textAlign:"center", border:"1px solid #bbf7d0" }}>
                  <p style={{ margin:0, fontSize:12, fontWeight:600, color:"#15803d" }}>✅ {copyMsg}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
