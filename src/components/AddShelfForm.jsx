import { useState } from "react";
import S from "../lib/styles.js";
import { compressImage } from "../lib/pantriUtils.js";

export default function AddShelfForm({ onAdd, onCancel }) {
  const [shelfName, setShelfName] = useState("");
  const [photo, setPhoto] = useState(null);
  return (
    <div style={S.card}>
      <p style={{ margin:"0 0 12px", fontWeight:800, fontSize:14 }}>New Shelf</p>
      <div style={{ marginBottom:12 }}>
        <label style={S.label}>Shelf Photo</label>
        <div style={{ position:"relative", height:90, borderRadius:12, overflow:"hidden", background: photo ? "transparent" : "#f3f4f6", display:"flex", alignItems:"center", justifyContent:"center" }}>
          {photo
            ? <img src={photo} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt="" />
            : <div style={{ textAlign:"center", color:"#9ca3af" }}><div style={{ fontSize:24 }}>📸</div><p style={{ margin:"2px 0 0", fontSize:10, fontWeight:600 }}>Show me off! Snap a photo 📷</p></div>
          }
          <label style={{ position:"absolute", bottom:6, right:6, background:"#1e1b18", color:"white", borderRadius:8, padding:"4px 10px", fontSize:10, fontWeight:700, cursor:"pointer" }}>
            {photo ? "📷 New look!" : "📷 Snap!"}
            <input type="file" accept="image/*" style={{ display:"none" }} onChange={async e => {
              const file = e.target.files[0]; if (!file) return;
              const compressed = await compressImage(file);
              setPhoto(compressed);
            }} />
          </label>
          {photo && <button onClick={() => setPhoto(null)} style={{ position:"absolute", top:6, right:6, background:"rgba(0,0,0,0.5)", color:"white", border:"none", borderRadius:6, padding:"2px 7px", fontSize:10, cursor:"pointer" }}>✕</button>}
        </div>
      </div>
      <div style={{ marginBottom:12 }}>
        <label style={S.label}>Shelf Name</label>
        <input style={S.input} placeholder="e.g. Top Shelf, Snacks, Spices..." value={shelfName} onChange={e => setShelfName(e.target.value)} autoFocus />
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <button onClick={() => onAdd("", shelfName, photo)} style={{ flex:1, background:"#1e1b18", color:"white", border:"none", borderRadius:13, padding:"12px", fontWeight:700, cursor:"pointer" }}>Add Shelf</button>
        <button onClick={onCancel} style={{ flex:1, background:"#f3f4f6", color:"#374151", border:"none", borderRadius:13, padding:"12px", fontWeight:700, cursor:"pointer" }}>Cancel</button>
      </div>
    </div>
  );
}
