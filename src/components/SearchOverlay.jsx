import S from "../lib/styles.js";
import { stockLevel } from "../lib/pantriUtils.js";
import { SC, SB } from "../lib/pantriConstants.js";
import ShelfPhoto from "./ShelfPhoto.jsx";

export default function SearchOverlay({ searchQuery, setSearchQuery, inventory, spaces, photoVersion, onClose, onEditItem, onAddItem }) {
  const getSpace = (id) => spaces.find(s => s.id === id);
  const getShelf = (spaceId, shelfId) => spaces.find(s => s.id === spaceId)?.shelves.find(sh => sh.id === shelfId);

  const results = searchQuery.length > 1 ? inventory.filter(i =>
    i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (i.brand||"").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (i.category||"").toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  return (
    <div onClick={()=>{ onClose(); }} style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.5)", zIndex:200, display:"flex", alignItems:"flex-start", justifyContent:"center" }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:"min(390px,100vw)", background:"#faf9f7", borderRadius:"0 0 28px 28px", maxHeight:"85vh", overflow:"auto" }}>
        <div style={{ background:"#1e1b18", padding:"16px 16px 12px" }}>
          <div style={{ display:"flex", gap:10, alignItems:"center", background:"rgba(255,255,255,0.12)", borderRadius:14, padding:"10px 14px" }}>
            <span>🔍</span>
            <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Search your pantry..." autoFocus style={{ background:"transparent", border:"none", outline:"none", color:"white", fontSize:15, fontWeight:500, flex:1, fontFamily:"'DM Sans',sans-serif" }} />
            <span onClick={onClose} style={{ color:"#9ca3af", cursor:"pointer", fontSize:20 }}>×</span>
          </div>
        </div>
        <div style={{ padding:"14px" }}>
          {searchQuery.length < 2 ? (
            <div style={{ textAlign:"center", padding:"40px 20px", color:"#9ca3af" }}>
              <div style={{ fontSize:40, marginBottom:10 }}>🔍</div>
              <p style={{ fontWeight:600, fontSize:14 }}>Search by name, brand or category</p>
            </div>
          ) : results.length === 0 ? (
            <div style={{ textAlign:"center", padding:"40px 20px", color:"#9ca3af" }}>
              <div style={{ fontSize:40, marginBottom:10 }}>😕</div>
              <p style={{ fontWeight:600, fontSize:14 }}>"{searchQuery}" not found</p>
              <p style={{ fontSize:12, margin:"4px 0 16px" }}>Not in your pantry yet</p>
              <button onClick={()=>onAddItem(searchQuery)} style={S.btn("#d97706")}>+ Add "{searchQuery}"</button>
            </div>
          ) : results.map(item => {
            const space = getSpace(item.spaceId);
            const shelf = getShelf(item.spaceId, item.shelfId);
            const level = stockLevel(item.qty, item.reorder);
            return (
              <div key={item.id} style={{ background:"white", borderRadius:18, padding:"14px", marginBottom:10, boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>
                <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:12 }}>
                  <div style={{ width:44, height:44, borderRadius:13, background:SB[level], display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>{item.emoji}</div>
                  <div style={{ flex:1 }}>
                    <p style={{ margin:0, fontWeight:800, fontSize:15 }}>{item.name}</p>
                    <p style={{ margin:0, fontSize:12, color:"#9ca3af" }}>{item.brand} · {item.category}</p>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <p style={{ margin:0, fontWeight:800, fontSize:18, color:SC[level] }}>{item.qty}</p>
                    <p style={{ margin:0, fontSize:11, color:"#9ca3af" }}>{item.unit}</p>
                  </div>
                </div>
                <div style={{ background:"#f9fafb", borderRadius:13, padding:"10px 12px" }}>
                  <p style={{ margin:"0 0 7px", fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:"0.06em" }}>📍 Where to find it</p>
                  <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                    <div style={{ width:80, flexShrink:0 }}><ShelfPhoto shelf={shelf} space={space} size="sm" refreshKey={photoVersion} /></div>
                    <div>
                      <p style={{ margin:"0 0 3px", fontWeight:800, fontSize:14 }}>{space?.name || "Unknown Space"}</p>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <span style={{ background:(space?.accent||"#6b7280")+"20", color:space?.accent||"#6b7280", fontSize:11, fontWeight:800, borderRadius:7, padding:"2px 9px" }}>{shelf?.id}</span>
                        <span style={{ fontSize:12, color:"#6b7280" }}>{shelf?.name}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
