import { useState } from "react";
import S from "../lib/styles.js";
import { SPACE_ICONS } from "../lib/pantriConstants.js";
import { compressImage } from "../lib/pantriUtils.js";

export default function AddSpaceForm({ onAdd, onCancel }) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📦");
  const [customEmoji, setCustomEmoji] = useState("");
  const [photo, setPhoto] = useState(null);
  const [shelfCount, setShelfCount] = useState(1);
  return (
    <div onClick={e=>e.stopPropagation()} style={S.sheet}>
      <h2 style={S.sheetTitle}>New Space</h2>
      <div style={{ marginBottom:14 }}>
        <label style={S.label}>Cover Photo</label>
        <div style={{ position:"relative", height:100, borderRadius:14, overflow:"hidden", background:"#f3f4f6", display:"flex", alignItems:"center", justifyContent:"center" }}>
          {photo
            ? <img src={photo} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt="" />
            : <div style={{ textAlign:"center", color:"#9ca3af" }}><div style={{ fontSize:28 }}>📸</div><p style={{ margin:"4px 0 0", fontSize:11, fontWeight:600 }}>Show me my best angle!</p></div>
          }
          <label style={{ position:"absolute", bottom:8, right:8, background:"#1e1b18", color:"white", borderRadius:9, padding:"5px 11px", fontSize:11, fontWeight:700, cursor:"pointer" }}>
            📷 {photo ? "Retake" : "Snap Photo"}
            <input type="file" accept="image/*" capture="environment" style={{ display:"none" }} onChange={async e => {
              const file = e.target.files[0]; if (!file) return;
              const compressed = await compressImage(file);
              setPhoto(compressed);
            }} />
          </label>
        </div>
        {photo && <button onClick={() => setPhoto(null)} style={{ marginTop:5, background:"transparent", border:"none", color:"#ef4444", fontSize:11, fontWeight:700, cursor:"pointer", padding:0 }}>✕ Remove photo</button>}
      </div>
      <div style={{ marginBottom:12 }}>
        <label style={S.label}>Space Name</label>
        <input style={S.input} placeholder="e.g. Kitchen Cupboard, Garage..." value={name} onChange={e => setName(e.target.value)} autoFocus />
      </div>
      <div style={{ marginBottom:14 }}>
        <label style={S.label}>Pick an Icon</label>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:8 }}>
          {SPACE_ICONS.map(ic => (
            <div key={ic} onClick={() => { setIcon(ic); setCustomEmoji(""); }} style={{ width:40, height:40, borderRadius:11, background:icon===ic&&!customEmoji?"#1e1b18":"#f3f4f6", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, cursor:"pointer" }}>{ic}</div>
          ))}
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <input style={{ ...S.input, width:60, textAlign:"center", fontSize:20, padding:"6px" }} placeholder="😀" value={customEmoji} onChange={e => { setCustomEmoji(e.target.value); if(e.target.value) setIcon(e.target.value); }} maxLength={2} />
          <span style={{ fontSize:11, color:"#9ca3af", fontWeight:600 }}>Or type your own emoji</span>
        </div>
      </div>
      <div style={{ marginBottom:16 }}>
        <label style={S.label}>How many shelves?</label>
        <div style={{ display:"flex", alignItems:"center", gap:12, background:"#f9fafb", borderRadius:14, padding:"10px 16px" }}>
          <button onClick={() => setShelfCount(c => Math.max(1, c-1))} style={{ width:36, height:36, borderRadius:10, background:"white", border:"2px solid #e5e7eb", fontSize:18, cursor:"pointer", fontWeight:700 }}>−</button>
          <div style={{ flex:1, textAlign:"center" }}><span style={{ fontWeight:800, fontSize:24 }}>{shelfCount}</span><span style={{ fontSize:12, color:"#9ca3af", marginLeft:5 }}>{shelfCount===1?"shelf":"shelves"}</span></div>
          <button onClick={() => setShelfCount(c => Math.min(10, c+1))} style={{ width:36, height:36, borderRadius:10, background:"#1e1b18", border:"none", color:"white", fontSize:18, cursor:"pointer", fontWeight:700 }}>+</button>
        </div>
        <p style={{ margin:"5px 0 0", fontSize:11, color:"#9ca3af" }}>Don't worry, you can always add more later!</p>
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <button onClick={() => onAdd(name, customEmoji || icon, photo, shelfCount)} style={{ flex:1, background:"#1e1b18", color:"white", border:"none", borderRadius:13, padding:"13px", fontWeight:700, cursor:"pointer" }}>Create Space</button>
        <button onClick={onCancel} style={{ flex:1, background:"#f3f4f6", color:"#374151", border:"none", borderRadius:13, padding:"13px", fontWeight:700, cursor:"pointer" }}>Cancel</button>
      </div>
    </div>
  );
}
