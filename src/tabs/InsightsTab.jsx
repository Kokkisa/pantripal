import { memo } from "react";
import S from "../lib/styles.js";
import { stockLevel } from "../lib/pantriUtils.js";
import { SB } from "../lib/pantriConstants.js";
import { buildConsumptionMap, computePriceAlerts, computeABC, computeVED, computePredictions, computeWasteRisk } from "../lib/insightsLogic.js";
import TabHint from "../components/TabHint.jsx";

export default memo(function InsightsTab({ inventory, history, spaces, dismissedHints, onDismissHint, NavBar }) {
  // ── Shared logic imported from lib/insightsLogic.js ─────
  const consumptionMap = buildConsumptionMap(history);
  const abc = computeABC(inventory, history);
  const ved = computeVED(inventory, history);
  const topItems = Object.entries(consumptionMap).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const predictions = computePredictions(inventory, history);
  const wasteRisk = computeWasteRisk(inventory);
  const recentH = history.filter(h=>new Date(h.time).getTime()>Date.now()-30*86400000);

  // ── Spending computations ─────────────────────────────────
  const pricedItems = inventory.filter(i => i.price);
  const totalValue = pricedItems.reduce((s, i) => s + i.price * i.qty, 0);

  const catValue = {};
  pricedItems.forEach(i => { catValue[i.category || "Other"] = (catValue[i.category || "Other"] || 0) + i.price * i.qty; });
  const catValueSorted = Object.entries(catValue).sort((a, b) => b[1] - a[1]);

  const priceAlerts = computePriceAlerts(inventory);

  const thirtyDaysAgo = Date.now() - 30 * 86400000;
  const buyingTotal = inventory.reduce((sum, i) => {
    if (!i.priceHistory) return sum;
    return sum + i.priceHistory
      .filter(ph => new Date(ph.date).getTime() > thirtyDaysAgo)
      .reduce((s, ph) => s + ph.price * ph.qty, 0);
  }, 0);
  const consumptionTotal = recentH.reduce((s, h) => s + (h.cost || 0), 0);

  const catSpend = {};
  recentH.forEach(h => {
    if (!h.cost) return;
    const inv = inventory.find(i => i.name === h.item);
    const cat = inv?.category || "Other";
    catSpend[cat] = (catSpend[cat] || 0) + h.cost;
  });
  const catSpendSorted = Object.entries(catSpend).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const itemSpend = {};
  recentH.forEach(h => {
    if (!h.cost) return;
    itemSpend[h.item] = (itemSpend[h.item] || 0) + h.cost;
  });
  const topSpenders = Object.entries(itemSpend).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const totalSpent = Object.values(itemSpend).reduce((s, v) => s + v, 0);

  const Tag=({label,color,bg})=><span style={{ background:bg, color, fontSize:9, fontWeight:800, borderRadius:6, padding:"2px 7px" }}>{label}</span>;
  const bars5=["#d97706","#059669","#2563eb","#9333ea","#6b7280"];

  return(
    <div>
      <div style={S.dh()}><h1 style={{ fontSize:22, fontWeight:800, margin:"0 0 2px" }}>Your insights 📊</h1><p style={{ color:"#9ca3af", margin:0, fontSize:12 }}>Here's what your pantry is telling you</p></div>
      <div style={S.content}>
        {!dismissedHints.insights && <TabHint tab="insights" onDismiss={() => onDismissHint("insights")} />}

        {/* ── Inventory Valuation ────────────────────────────── */}
        <div style={{ background:"linear-gradient(135deg, #d97706, #b45309)", borderRadius:18, padding:"20px 18px", marginBottom:10, color:"white" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <p style={{ margin:0, fontWeight:800, fontSize:14 }}>💰 Your pantry is worth</p>
            <Tag label="LIVE" color="#fcd34d" bg="rgba(255,255,255,0.2)" />
          </div>
          <p style={{ margin:"0 0 4px", fontWeight:800, fontSize:36, letterSpacing:"-1px" }}>₹{totalValue.toLocaleString("en-IN")}</p>
          <p style={{ margin:"0 0 14px", fontSize:12, color:"rgba(255,255,255,0.7)" }}>{pricedItems.length} of {inventory.length} items priced</p>
          {catValueSorted.length > 0 && (
            <>
              <div style={{ display:"flex", borderRadius:6, overflow:"hidden", height:8, marginBottom:8 }}>
                {catValueSorted.map(([cat, val], i) => (
                  <div key={cat} style={{ width:`${(val/totalValue)*100}%`, background: i===0?"#fef3c7":i===1?"#fde68a":i===2?"#fcd34d":i===3?"rgba(255,255,255,0.4)":"rgba(255,255,255,0.2)", minWidth:2 }} />
                ))}
              </div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {catValueSorted.slice(0, 4).map(([cat, val], i) => (
                  <div key={cat} style={{ display:"flex", alignItems:"center", gap:4 }}>
                    <div style={{ width:8, height:8, borderRadius:3, background: i===0?"#fef3c7":i===1?"#fde68a":i===2?"#fcd34d":"rgba(255,255,255,0.4)" }} />
                    <span style={{ fontSize:10, color:"rgba(255,255,255,0.8)", fontWeight:600 }}>{cat} ₹{val.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── Price Alerts ────────────────────────────────────── */}
        <div style={S.card}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <p style={{ margin:0, fontWeight:800, fontSize:14 }}>📈 Price changes spotted</p>
            <Tag label={priceAlerts.length > 0 ? `${priceAlerts.length} ALERT${priceAlerts.length>1?"S":""}` : "STABLE"} color={priceAlerts.length > 0 ? "#ef4444" : "#059669"} bg={priceAlerts.length > 0 ? "#fef2f2" : "#f0fdf4"} />
          </div>
          {priceAlerts.length === 0 ? (
            <div style={{ background:"#f0fdf4", borderRadius:12, padding:"11px", border:"1px solid #bbf7d0" }}>
              <p style={{ margin:0, fontSize:13, color:"#15803d", fontWeight:600 }}>✅ All prices stable — no increases detected</p>
            </div>
          ) : priceAlerts.map(item => (
            <div key={item.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:"1px solid #f5f5f4" }}>
              <div style={{ width:36, height:36, borderRadius:11, background:"#fef2f2", display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, flexShrink:0 }}>{item.emoji}</div>
              <div style={{ flex:1 }}>
                <p style={{ margin:"0 0 2px", fontWeight:700, fontSize:13 }}>{item.name}</p>
                <p style={{ margin:0, fontSize:11, color:"#9ca3af" }}>₹{item.prev} → ₹{item.curr} per {item.unit}</p>
              </div>
              <span style={{ background:"#fef2f2", color:"#ef4444", fontSize:11, fontWeight:800, borderRadius:8, padding:"3px 8px" }}>+{item.pctChange.toFixed(1)}%</span>
            </div>
          ))}
        </div>

        {/* ── Buying vs Consuming ─────────────────────────────── */}
        <div style={S.card}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <p style={{ margin:0, fontWeight:800, fontSize:14 }}>🛒 Are you buying faster than you eat?</p>
            <Tag label="30 DAYS" color="#2563eb" bg="#eff6ff" />
          </div>
          <div style={{ display:"flex", gap:8, marginBottom:10 }}>
            <div style={{ flex:1, background:"#fff7ed", borderRadius:14, padding:"14px 12px", textAlign:"center", border:"1px solid #fde68a" }}>
              <p style={{ margin:"0 0 2px", fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:"0.10em" }}>Bought</p>
              <p style={{ margin:0, fontWeight:800, fontSize:22, color:"#d97706" }}>₹{buyingTotal.toFixed(0)}</p>
              <p style={{ margin:"2px 0 0", fontSize:10, color:"#9ca3af" }}>stocked up</p>
            </div>
            <div style={{ display:"flex", alignItems:"center" }}><span style={{ fontSize:18, color:"#9ca3af" }}>→</span></div>
            <div style={{ flex:1, background:"#f0fdf4", borderRadius:14, padding:"14px 12px", textAlign:"center", border:"1px solid #bbf7d0" }}>
              <p style={{ margin:"0 0 2px", fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:"0.10em" }}>Consumed</p>
              <p style={{ margin:0, fontWeight:800, fontSize:22, color:"#059669" }}>₹{consumptionTotal.toFixed(0)}</p>
              <p style={{ margin:"2px 0 0", fontSize:10, color:"#9ca3af" }}>used up</p>
            </div>
          </div>
          {buyingTotal > 0 && (
            <div style={{ background:"#f9fafb", borderRadius:12, padding:"10px 14px" }}>
              <p style={{ margin:0, fontSize:12, color:"#6b7280", fontWeight:600 }}>
                {buyingTotal > consumptionTotal
                  ? `📦 ₹${(buyingTotal - consumptionTotal).toFixed(0)} stocking up — building reserves`
                  : buyingTotal < consumptionTotal
                  ? `📉 ₹${(consumptionTotal - buyingTotal).toFixed(0)} more consumed than bought — depleting stock`
                  : "⚖️ Perfectly balanced — buying matches consumption"}
              </p>
            </div>
          )}
        </div>

        {/* ── Spending by Category ────────────────────────────── */}
        <div style={S.card}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <p style={{ margin:0, fontWeight:800, fontSize:14 }}>📊 Where your money goes</p>
            <Tag label="30 DAYS" color="#2563eb" bg="#eff6ff" />
          </div>
          {catSpendSorted.length === 0 ? (
            <p style={{ margin:0, fontSize:12, color:"#9ca3af" }}>Log item usage with prices to see category breakdown</p>
          ) : catSpendSorted.map(([cat, amt], i) => (
            <div key={cat} style={{ marginBottom:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ fontSize:13, fontWeight:700 }}>{cat}</span>
                <span style={{ fontSize:12, color:"#6b7280", fontWeight:600 }}>₹{amt.toFixed(0)}</span>
              </div>
              <div style={{ background:"#f3f4f6", borderRadius:5, height:8, overflow:"hidden" }}>
                <div style={{ height:"100%", borderRadius:5, background:bars5[i], width:`${(amt/catSpendSorted[0][1])*100}%`, transition:"width 0.4s" }} />
              </div>
            </div>
          ))}
        </div>

        {/* ── Top Spenders ────────────────────────────────────── */}
        <div style={S.card}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <p style={{ margin:0, fontWeight:800, fontSize:14 }}>🔥 Top Spenders</p>
            <Tag label="30 DAYS" color="#2563eb" bg="#eff6ff" />
          </div>
          {topSpenders.length === 0 ? (
            <p style={{ margin:0, fontSize:12, color:"#9ca3af" }}>Log item usage with prices to see top spenders</p>
          ) : topSpenders.map(([name, amt], i) => {
            const inv = inventory.find(it => it.name === name);
            const pct = totalSpent > 0 ? (amt / totalSpent * 100) : 0;
            return (
              <div key={name} style={{ marginBottom:11 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                  <span style={{ fontSize:13, fontWeight:700 }}>{inv?.emoji || "📦"} {name}</span>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ fontSize:10, color:"#9ca3af", fontWeight:600 }}>{pct.toFixed(0)}%</span>
                    <span style={{ fontSize:12, color:"#6b7280", fontWeight:700 }}>₹{amt.toFixed(0)}</span>
                  </div>
                </div>
                <div style={{ background:"#f3f4f6", borderRadius:5, height:8, overflow:"hidden" }}>
                  <div style={{ height:"100%", borderRadius:5, background:bars5[i], width:`${(amt/topSpenders[0][1])*100}%`, transition:"width 0.4s" }} />
                </div>
              </div>
            );
          })}
        </div>

        <div style={S.card}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}><p style={{ margin:0, fontWeight:800, fontSize:14 }}>📊 Your top items (ABC)</p><Tag label="LIVE" color="#059669" bg="#f0fdf4" /></div>
          <p style={{ margin:"0 0 10px", fontSize:11, color:"#9ca3af" }}>Pareto by consumption · A={abc.A.length} · B={abc.B.length} · C={abc.C.length}</p>
          {[{key:"A",label:"A — High Value",desc:"Top 70% of consumption",color:"#ef4444",bg:"#fef2f2",items:abc.A},
            {key:"B",label:"B — Medium",desc:"Next 20%",color:"#f97316",bg:"#fff7ed",items:abc.B},
            {key:"C",label:"C — Low Value",desc:"Bottom 10%",color:"#6b7280",bg:"#f9fafb",items:abc.C}].map(g=>(
            <div key={g.key} style={{ background:g.bg, borderRadius:12, padding:"10px 12px", marginBottom:6, border:`1px solid ${g.color}22` }}>
              <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:6 }}>
                <div style={{ width:20, height:20, borderRadius:6, background:g.color, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><span style={{ color:"white", fontSize:10, fontWeight:800 }}>{g.key}</span></div>
                <span style={{ fontSize:12, fontWeight:800, color:g.color }}>{g.label}</span>
                <span style={{ fontSize:10, color:"#9ca3af" }}>{g.desc}</span>
              </div>
              {g.items.length===0?<p style={{ margin:0, fontSize:11, color:"#9ca3af" }}>No items yet</p>:(
                <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                  {g.items.map(i=><span key={i.id} style={{ background:"white", borderRadius:7, padding:"2px 8px", fontSize:11, fontWeight:600, color:"#374151", border:`1px solid ${g.color}20` }}>{i.emoji} {i.name}{i.consumed>0?` ·${i.consumed}`:""}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={S.card}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}><p style={{ margin:0, fontWeight:800, fontSize:14 }}>🔄 What you use and when</p><Tag label="LIVE" color="#059669" bg="#f0fdf4" /></div>
          {topItems.length===0?<p style={{ margin:0, fontSize:12, color:"#9ca3af" }}>Log item usage to see patterns</p>
          :topItems.map(([name,qty],i)=>{
            const inv=inventory.find(it=>it.name===name);
            return(<div key={i} style={{ marginBottom:11 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ fontSize:13, fontWeight:700 }}>{inv?.emoji||"📦"} {name}</span>
                <span style={{ fontSize:12, color:"#6b7280", fontWeight:600 }}>{qty} {inv?.unit||"units"}</span>
              </div>
              <div style={{ background:"#f3f4f6", borderRadius:5, height:8, overflow:"hidden" }}>
                <div style={{ height:"100%", borderRadius:5, background:bars5[i], width:`${(qty/topItems[0][1])*100}%`, transition:"width 0.4s" }} />
              </div>
            </div>);
          })}
        </div>

        <div style={S.card}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}><p style={{ margin:0, fontWeight:800, fontSize:14 }}>🔮 When you'll run out</p><Tag label="COMPUTED" color="#2563eb" bg="#eff6ff" /></div>
          <p style={{ margin:"0 0 10px", fontSize:11, color:"#9ca3af" }}>Based on your actual usage rate · {predictions.length} items tracked</p>
          {predictions.length===0?<p style={{ margin:0, fontSize:12, color:"#9ca3af" }}>Log usage to generate predictions</p>
          :predictions.map((p,i)=>{
            const urg=p.daysRemaining!=null&&p.daysRemaining<=3?"critical":p.daysRemaining!=null&&p.daysRemaining<=7?"high":"ok";
            const uc=urg==="critical"?"#ef4444":urg==="high"?"#f97316":"#059669";
            const dl=p.daysRemaining==null?"No data":p.daysRemaining<=0?"Out now!":p.daysRemaining===1?"~1 day left":`~${p.daysRemaining} days`;
            return(<div key={p.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:i<predictions.length-1?"1px solid #f5f5f4":"none" }}>
              <div style={{ width:36, height:36, borderRadius:11, background:SB[urg==="critical"?"out":urg==="high"?"low":"good"], display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, flexShrink:0 }}>{p.emoji}</div>
              <div style={{ flex:1 }}><p style={{ margin:"0 0 1px", fontWeight:700, fontSize:13 }}>{p.name}</p><p style={{ margin:0, fontSize:10, color:"#9ca3af" }}>{p.rateLabel}{p.limitReason==="expiry"?" · expiry sooner":""}</p></div>
              <div style={{ textAlign:"right" }}><p style={{ margin:0, fontSize:12, fontWeight:800, color:uc }}>{dl}</p><p style={{ margin:0, fontSize:10, color:"#9ca3af" }}>{p.qty} {p.unit} left</p></div>
            </div>);
          })}
        </div>

        <div style={S.card}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}><p style={{ margin:0, fontWeight:800, fontSize:14 }}>♻️ What might expire on you</p><Tag label="LIVE" color="#059669" bg="#f0fdf4" /></div>
          {wasteRisk.length===0?<div style={{ background:"#f0fdf4", borderRadius:12, padding:"11px", border:"1px solid #bbf7d0" }}><p style={{ margin:0, fontSize:13, color:"#15803d", fontWeight:600 }}>✅ No waste risk — great management!</p></div>
          :wasteRisk.map(item=>{
            const days=Math.ceil((new Date(item.expiry)-new Date())/86400000);
            const daily=days>0?(item.qty/days).toFixed(1):"∞";
            return(<div key={item.id} style={{ background:"#fff7ed", borderRadius:12, padding:"11px 13px", marginBottom:7, border:"1px solid #fde68a" }}>
              <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:7 }}>
                <span style={{ fontSize:19 }}>{item.emoji}</span>
                <div style={{ flex:1 }}><p style={{ margin:0, fontWeight:700, fontSize:13 }}>{item.name}</p><p style={{ margin:0, fontSize:11, color:"#92400e" }}>{item.qty} {item.unit} · expires in {days} day{days!==1?"s":""}</p></div>
                <span style={{ background:days<=2?"#fef2f2":"#fef3c7", color:days<=2?"#ef4444":"#92400e", borderRadius:7, padding:"3px 8px", fontSize:10, fontWeight:800 }}>{days<=0?"Expired!":days<=2?"Use Today!":"Use First!"}</span>
              </div>
              <div style={{ background:"rgba(0,0,0,0.05)", borderRadius:8, padding:"6px 10px" }}><p style={{ margin:0, fontSize:11, color:"#92400e", fontWeight:600 }}>💡 Use {daily} {item.unit}/day to finish before expiry</p></div>
            </div>);
          })}
        </div>

        <div style={S.card}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}><p style={{ margin:0, fontWeight:800, fontSize:14 }}>📋 Vital vs. non-essential items</p><Tag label="COMPUTED" color="#2563eb" bg="#eff6ff" /></div>
          <p style={{ margin:"0 0 10px", fontSize:11, color:"#9ca3af" }}>Vital · Essential · Desirable — inferred from category, reorder & usage</p>
          {[{key:"V",label:"V — Vital",desc:"Baby, high reorder or frequent use",color:"#ef4444",bg:"#fef2f2",items:ved.V},
            {key:"E",label:"E — Essential",desc:"Regular use or moderate reorder",color:"#f97316",bg:"#fff7ed",items:ved.E},
            {key:"D",label:"D — Desirable",desc:"Rarely used, low criticality",color:"#6b7280",bg:"#f9fafb",items:ved.D}].map(g=>(
            <div key={g.key} style={{ background:g.bg, borderRadius:12, padding:"10px 12px", marginBottom:6, border:`1px solid ${g.color}22` }}>
              <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:5 }}>
                <div style={{ width:20, height:20, borderRadius:6, background:g.color, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><span style={{ color:"white", fontSize:10, fontWeight:800 }}>{g.key}</span></div>
                <span style={{ fontSize:12, fontWeight:800, color:g.color }}>{g.label}</span>
                <span style={{ fontSize:10, color:"#9ca3af" }}>{g.desc}</span>
              </div>
              {g.items.length===0?<p style={{ margin:0, fontSize:11, color:"#9ca3af" }}>No items</p>:(
                <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>{g.items.map(i=><span key={i.id} style={{ background:"white", borderRadius:7, padding:"2px 8px", fontSize:11, fontWeight:600, color:"#374151" }}>{i.emoji} {i.name}</span>)}</div>
              )}
            </div>
          ))}
        </div>

        <div style={{ background:"#1e1b18", borderRadius:18, padding:"18px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}><p style={{ margin:0, fontWeight:800, fontSize:14, color:"white" }}>💰 Your last 30 days</p><Tag label="COMPUTED" color="#fcd34d" bg="rgba(255,255,255,0.1)" /></div>
          <div style={{ display:"flex", gap:8 }}>
            {[{label:"Items Used",value:recentH.length,icon:"📦",color:"#60a5fa",sub:"log entries"},
              {label:"Spent",value:`₹${recentH.reduce((s,h)=>s+(h.cost||0),0).toFixed(0)}`,icon:"💰",color:"#fcd34d",sub:"estimated"},
              {label:"Before Expiry",value:recentH.filter(h=>inventory.find(i=>i.name===h.item)?.expiry).length,icon:"♻️",color:"#4ade80",sub:"waste avoided"},
              {label:"JIT Triggered",value:recentH.filter(h=>{ const i=inventory.find(it=>it.name===h.item); return i&&i.reorder>0; }).length,icon:"⚡",color:"#f97316",sub:"restock alerts"}].map((s,i)=>(
              <div key={i} style={{ flex:1, background:"rgba(255,255,255,0.08)", borderRadius:13, padding:"12px 6px", textAlign:"center" }}>
                <div style={{ fontSize:17, marginBottom:3 }}>{s.icon}</div>
                <p style={{ margin:"0 0 1px", fontWeight:800, fontSize:20, color:s.color }}>{s.value}</p>
                <p style={{ margin:0, fontSize:9, color:"#9ca3af", fontWeight:600, lineHeight:1.3 }}>{s.label}<br/>{s.sub}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
      <NavBar />
    </div>
  );
})
