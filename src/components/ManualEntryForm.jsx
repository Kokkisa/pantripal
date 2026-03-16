import { useState } from "react";
import S from "../lib/styles.js";
import { CATEGORIES, UNITS } from "../lib/pantriConstants.js";
import { getSmartUnit } from "../lib/pantriUtils.js";

export default function ManualEntryForm({ initialItem, onBack, onContinue, navBar }) {
  const [name, setName] = useState(initialItem.name || "");
  const [brand, setBrand] = useState(initialItem.brand || "");
  const [category, setCategory] = useState(initialItem.category || "");
  const [unit, setUnit] = useState(initialItem.unit || "Pcs");
  const [unitSource, setUnitSource] = useState(null);
  const [imagePreview] = useState(initialItem.imagePreview || null);
  const [aiResult] = useState(initialItem.aiResult || null);
  const [aiError] = useState(initialItem.aiError || null);

  const handleNameChange = (e) => {
    const n = e.target.value;
    const smart = getSmartUnit(n);
    setName(n);
    setUnit(smart.unit);
    setUnitSource(smart.source);
    if (smart.category && !category) setCategory(smart.category);
  };

  const btnStyle = (active) => S.btn("#1e1b18", "white", !active);

  return (
    <div>
      <div style={S.dh(aiResult ? "#059669" : "#1e1b18")}>
        <div style={{ display:"flex", alignItems:"center" }}>
          <button style={{ color:"white", fontSize:22, cursor:"pointer", background:"none", border:"none", padding:0, marginRight:8 }} onClick={onBack}>‹</button>
          <div>
            <h1 style={{ fontSize:20, fontWeight:800, margin:0 }}>{aiResult ? "AI Filled ✨" : "Enter Manually"}</h1>
            <p style={{ color: aiResult ? "#a7f3d0" : "#9ca3af", margin:0, fontSize:12 }}>Smart unit fills as you type</p>
          </div>
        </div>
      </div>
      <div style={{ padding:"14px 14px 88px" }}>
        {imagePreview && <div style={{ borderRadius:14, overflow:"hidden", height:110, marginBottom:10 }}><img src={imagePreview} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt="" /></div>}
        {aiError && <div style={{ background:"#fef3c7", borderRadius:12, padding:"10px 14px", marginBottom:10, border:"1px solid #fde68a" }}><p style={{ margin:0, fontSize:12, fontWeight:600, color:"#92400e" }}>⚠️ {aiError}</p></div>}
        <div style={S.card}>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div>
              <label style={S.label}>Item Name *</label>
              <input style={S.input} placeholder="e.g. Milk, Rice..." value={name} onChange={handleNameChange} />
              {name && unitSource && (
                <div style={{ marginTop:5, display:"flex", gap:5, alignItems:"center" }}>
                  <span style={{ fontSize:10, color:unitSource==="household"?"#059669":"#2563eb", fontWeight:700 }}>{unitSource==="household"?"✓ Household:":"✓ Suggested:"}</span>
                  <span style={{ background:unitSource==="household"?"#f0fdf4":"#eff6ff", color:unitSource==="household"?"#059669":"#2563eb", fontSize:10, fontWeight:800, borderRadius:7, padding:"2px 8px" }}>{unit}</span>
                </div>
              )}
            </div>
            <div>
              <label style={S.label}>Brand</label>
              <input style={S.input} placeholder="e.g. Royal, Quaker..." value={brand} onChange={e => setBrand(e.target.value)} />
            </div>
            <div>
              <label style={S.label}>Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...S.input, padding:"11px 13px" }}>
                <option value="">Select...</option>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>Unit</label>
              <select value={unit} onChange={e => setUnit(e.target.value)} style={{ ...S.input, padding:"11px 13px" }}>
                {UNITS.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
        </div>
        <button style={btnStyle(!!name.trim())} disabled={!name.trim()} onClick={() => onContinue({ name, brand, category, unit })}>
          Continue →
        </button>
      </div>
      {navBar}
    </div>
  );
}
