import S from "../lib/styles.js";
import { IS_DEMO } from "../lib/firebaseClient.js";
import { stockLevel } from "../lib/pantriUtils.js";
import { SC, SB, SBo } from "../lib/pantriConstants.js";
import TabHint from "../components/TabHint.jsx";

export default function HomeTab({ userMeta, inventory, spaces, shoppingList, expiringItems, babyItems, dismissedHints, onDismissHint, onShowSearch, onShowShop, onShowProfile, onShowItemsList, onEditItem, onNavigateToSpace, onSetActiveTab, NavBar }) {
  return (
    <div>
      <div style={{ background:"#1e1b18", padding:"18px 18px 0", color:"white" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <div>
            <p style={{ fontSize:11, color:"#9ca3af", margin:0, textTransform:"uppercase", letterSpacing:"0.08em" }}>Good Evening</p>
            <h1 style={{ fontSize:22, fontWeight:800, margin:"3px 0 0", letterSpacing:"-0.5px" }}>{userMeta.name} {userMeta.partner?`& ${userMeta.partner}`:""} 👋</h1>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <div onClick={onShowSearch} style={{ width:38, height:38, borderRadius:12, background:"rgba(255,255,255,0.1)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>🔍</div>
            <div onClick={onShowShop} style={{ width:38, height:38, borderRadius:12, background:shoppingList.length>0?"#d97706":"rgba(255,255,255,0.1)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", position:"relative" }}>
              🛒
              {shoppingList.length>0&&<div style={{ position:"absolute", top:-4, right:-4, width:16, height:16, borderRadius:8, background:"#ef4444", display:"flex", alignItems:"center", justifyContent:"center" }}><span style={{ fontSize:9, color:"white", fontWeight:800 }}>{shoppingList.length}</span></div>}
            </div>
            <div onClick={onShowProfile} style={{ width:38, height:38, borderRadius:12, background:"rgba(255,255,255,0.1)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:16 }} title="Profile">👤</div>
          </div>
        </div>
        {IS_DEMO && <div style={{ background:"rgba(217,119,6,0.15)", borderRadius:12, padding:"9px 13px", marginBottom:12, border:"1px solid rgba(217,119,6,0.3)" }}><p style={{ margin:0, fontSize:11, color:"#fcd34d", fontWeight:600 }}>🔧 Demo Mode — data resets on reload. Add Firebase config to persist.</p></div>}
        {(shoppingList.length>0||expiringItems.length>0) && (
          <div style={{ background:"rgba(217,119,6,0.15)", borderRadius:13, padding:"10px 13px", marginBottom:14, border:"1px solid rgba(217,119,6,0.3)" }}>
            {shoppingList.length>0&&<p style={{ margin:0, fontSize:12, fontWeight:600, color:"#fcd34d" }}>⚠️ {shoppingList.length} item{shoppingList.length>1?"s":""} need restocking</p>}
            {expiringItems.length>0&&<p style={{ margin:"2px 0 0", fontSize:11, color:"#fbbf24" }}>⏰ {expiringItems.length} expiring within 7 days</p>}
          </div>
        )}
      </div>
      <div style={S.content}>
        {!dismissedHints.home && <TabHint tab="home" onDismiss={() => onDismissHint("home")} />}
        <div style={{ display:"flex", gap:8, marginBottom:14 }}>
          {[
            { label:"Items", value:inventory.length, icon:"📦", color:"#eff6ff", accent:"#2563eb", action:onShowItemsList },
            { label:"Low Stock", value:shoppingList.length, icon:"🔴", color:"#fff7ed", accent:"#ea580c", action:onShowShop },
            { label:"Expiring", value:expiringItems.length, icon:"⏰", color:"#fdf4ff", accent:"#9333ea", action:()=>onSetActiveTab("insights") },
          ].map((s,i)=>(
            <div key={i} onClick={s.action} style={{ flex:1, background:s.color, borderRadius:14, padding:"10px 6px", textAlign:"center", cursor:"pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", transition:"transform 0.1s" }}>
              <div style={{ fontSize:16, marginBottom:2 }}>{s.icon}</div>
              <div style={{ fontSize:20, fontWeight:800, color:s.accent }}>{s.value}</div>
              <div style={{ fontSize:9, color:"#6b7280", fontWeight:700, textTransform:"uppercase" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {babyItems.length>0&&(
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <h2 style={{ fontSize:14, fontWeight:800, margin:0 }}>🍼 Baby Supplies</h2>
              <span onClick={()=>onNavigateToSpace(spaces.find(s=>s.id==="s3"))} style={{ fontSize:12, color:"#9333ea", fontWeight:700, cursor:"pointer" }}>Manage →</span>
            </div>
            <div style={{ display:"flex", gap:8, marginBottom:14 }}>
              {babyItems.map(item=>{
                const level=stockLevel(item.qty,item.reorder);
                return(
                  <div key={item.id} onClick={() => onEditItem(item)} style={{ flex:1, background:level!=="good"?SB[level]:"#fdf4ff", borderRadius:14, padding:"11px", border:`1.5px solid ${level!=="good"?SBo[level]:"#e9d5ff"}`, cursor:"pointer" }}>
                    <div style={{ fontSize:18, marginBottom:3 }}>{item.emoji}</div>
                    <p style={{ margin:"0 0 1px", fontWeight:700, fontSize:11, lineHeight:1.2 }}>{item.name}</p>
                    <p style={{ margin:0, fontWeight:800, fontSize:13, color:SC[level] }}>{item.qty} {item.unit}</p>
                    {level!=="good"&&<p style={{ margin:"2px 0 0", fontSize:9, color:SC[level], fontWeight:700 }}>⚠️ Reorder!</p>}
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <h2 style={{ fontSize:14, fontWeight:800, margin:0 }}>Your Spaces</h2>
          <span onClick={()=>onSetActiveTab("spaces")} style={{ fontSize:12, color:"#d97706", fontWeight:700, cursor:"pointer" }}>See All →</span>
        </div>
        {spaces.map(space=>{
          const items=inventory.filter(it=>it.spaceId===space.id);
          const low=items.filter(it=>stockLevel(it.qty,it.reorder)!=="good").length;
          return(
            <div key={space.id} onClick={()=>onNavigateToSpace(space)} style={{ background:space.color, borderRadius:16, padding:"12px 14px", marginBottom:8, cursor:"pointer", border:`1px solid ${space.accent}22` }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:40, height:40, borderRadius:12, background:space.accent+"18", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>{space.icon}</div>
                <div style={{ flex:1 }}>
                  <p style={{ margin:0, fontWeight:700, fontSize:14, color:"#1e1b18" }}>{space.name}</p>
                  <p style={{ margin:0, fontSize:11, color:"#6b7280" }}>{space.shelves.length} {space.shelves.length===1?"shelf":"shelves"} · {items.length} {items.length===1?"item":"items"}</p>
                </div>
                {low>0&&<span style={{ background:"#fff7ed", color:"#ea580c", fontSize:10, fontWeight:800, borderRadius:8, padding:"3px 8px" }}>{low} low</span>}
                <span style={{ fontSize:16, color:space.accent }}>›</span>
              </div>
            </div>
          );
        })}

        {expiringItems.length>0&&(
          <>
            <h2 style={{ fontSize:14, fontWeight:800, margin:"14px 0 8px" }}>Expiring Soon ⏰</h2>
            <div style={S.card}>
              {expiringItems.map((item,i)=>(
                <div key={item.id} onClick={() => onEditItem(item)} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0", borderBottom:i<expiringItems.length-1?"1px solid #f5f5f4":"none", cursor:"pointer" }}>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <span style={{ fontSize:17 }}>{item.emoji}</span>
                    <div><p style={{ margin:0, fontWeight:600, fontSize:13 }}>{item.name}</p><p style={{ margin:0, fontSize:11, color:"#ef4444" }}>Exp {item.expiry}</p></div>
                  </div>
                  <span style={{ background:"#fef3c7", color:"#92400e", borderRadius:9, padding:"3px 9px", fontSize:11, fontWeight:700 }}>Use Now!</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <NavBar />
    </div>
  );
}
