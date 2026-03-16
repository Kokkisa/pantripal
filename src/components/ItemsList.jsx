import { useState } from "react";

export default function ItemsList({ inventory, spaces, onClose, onEditItem }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");

  const COLS = [
    { key:"name",  label:"Item" },
    { key:"qty",   label:"Qty" },
    { key:"unit",  label:"Unit" },
    { key:"space", label:"Location" },
    { key:"status",label:"Status" },
  ];

  const getLocation = (item) => {
    const sp = spaces.find(s => s.id === item.spaceId);
    const sh = sp?.shelves?.find(sh => sh.id === item.shelfId);
    return sp ? `${sp.name} › ${sh?.name || item.shelfId}` : item.shelfId || "—";
  };

  const getStatus = (item) => {
    if (item.qty <= 0) return { label:"Out", color:"#ef4444" };
    if (item.qty <= item.reorder) return { label:"Low", color:"#f97316" };
    return { label:"OK", color:"#22c55e" };
  };

  const filtered = inventory
    .filter(i => i.name.toLowerCase().includes(search.toLowerCase()) ||
                 getLocation(i).toLowerCase().includes(search.toLowerCase()) ||
                 (i.brand||"").toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let va, vb;
      if (sortKey === "name")   { va = a.name.toLowerCase(); vb = b.name.toLowerCase(); }
      else if (sortKey === "qty")    { va = a.qty; vb = b.qty; }
      else if (sortKey === "unit")   { va = a.unit; vb = b.unit; }
      else if (sortKey === "space")  { va = getLocation(a); vb = getLocation(b); }
      else if (sortKey === "status") { va = a.qty <= 0 ? 0 : a.qty <= a.reorder ? 1 : 2; vb = b.qty <= 0 ? 0 : b.qty <= b.reorder ? 1 : 2; }
      else { va = ""; vb = ""; }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const inp = { width:"100%", background:"#f3f4f6", border:"none", borderRadius:12, padding:"10px 14px", fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"'DM Sans',sans-serif" };

  return (
    <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"white", zIndex:400, display:"flex", flexDirection:"column", maxWidth:"min(390px,100vw)", margin:"0 auto" }}>
      <div style={{ background:"#1e1b18", padding:"16px 18px 14px", color:"white", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
          <button onClick={onClose} style={{ color:"white", fontSize:22, cursor:"pointer", background:"none", border:"none", padding:0, lineHeight:1 }}>‹</button>
          <div>
            <h1 style={{ fontSize:20, fontWeight:800, margin:0 }}>All Items</h1>
            <p style={{ color:"#9ca3af", margin:0, fontSize:12 }}>{filtered.length} of {inventory.length} items</p>
          </div>
        </div>
        <input style={inp} placeholder="🔍  Search items, location, brand..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div style={{ display:"flex", background:"#f8f7f5", borderBottom:"1px solid #e5e7eb", flexShrink:0 }}>
        {COLS.map(col => (
          <div key={col.key}
            onClick={() => toggleSort(col.key)}
            style={{
              flex: col.key === "name" ? 2.5 : col.key === "space" ? 2 : 1,
              padding:"8px 6px", fontSize:10, fontWeight:700,
              color: sortKey === col.key ? "#d97706" : "#6b7280",
              textTransform:"uppercase", letterSpacing:"0.05em",
              cursor:"pointer", userSelect:"none", display:"flex", alignItems:"center", gap:3,
            }}>
            {col.label}
            {sortKey === col.key && <span style={{ fontSize:10 }}>{sortDir === "asc" ? "↑" : "↓"}</span>}
          </div>
        ))}
      </div>
      <div style={{ flex:1, overflowY:"auto" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign:"center", padding:"60px 20px", color:"#9ca3af" }}>
            <div style={{ fontSize:40, marginBottom:10 }}>🔍</div>
            <p style={{ fontWeight:700 }}>No items found</p>
          </div>
        ) : filtered.map((item, i) => {
          const status = getStatus(item);
          return (
            <div key={item.id} onClick={() => onEditItem && onEditItem(item)} style={{ display:"flex", alignItems:"center", padding:"10px 6px", borderBottom:"1px solid #f5f5f4", background: i % 2 === 0 ? "white" : "#fafaf9", cursor: onEditItem ? "pointer" : "default" }}>
              <div style={{ flex:2.5, display:"flex", alignItems:"center", gap:7, minWidth:0 }}>
                <span style={{ fontSize:18, flexShrink:0 }}>{item.emoji}</span>
                <div style={{ minWidth:0 }}>
                  <p style={{ margin:0, fontWeight:700, fontSize:12, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{item.name}</p>
                  {item.brand && <p style={{ margin:0, fontSize:10, color:"#9ca3af" }}>{item.brand}</p>}
                </div>
              </div>
              <div style={{ flex:1, textAlign:"center" }}>
                <span style={{ fontWeight:800, fontSize:13, color: status.color }}>{item.qty}</span>
              </div>
              <div style={{ flex:1, textAlign:"center" }}>
                <span style={{ fontSize:10, color:"#6b7280" }}>{item.unit}</span>
              </div>
              <div style={{ flex:2, minWidth:0 }}>
                <span style={{ fontSize:10, color:"#374151", fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", display:"block" }}>{getLocation(item)}</span>
              </div>
              <div style={{ flex:1, textAlign:"center" }}>
                <span style={{ background: status.color + "20", color: status.color, fontSize:9, fontWeight:800, borderRadius:6, padding:"2px 6px" }}>{status.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
