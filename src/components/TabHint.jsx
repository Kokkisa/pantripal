const TAB_HINTS = {
  home:     { icon:"🏠", text:"This is your dashboard — see stock levels, expiring items & quick stats. Tap 🛒 for your shopping list." },
  spaces:   { icon:"🗄️", text:"Tap a space to see shelves inside. Add photos to remember what goes where!" },
  add:      { icon:"➕", text:"Choose how to add: scan, photo, or manual. AI auto-fills details from photos." },
  used:     { icon:"📉", text:"Tap any item to log usage. Try 🍽️ Cook to pick a recipe!" },
  insights: { icon:"📊", text:"Your pantry intelligence — consumption trends, reorder predictions & waste alerts." },
};

export default function TabHint({ tab, onDismiss }) {
  const hint = TAB_HINTS[tab];
  if (!hint) return null;

  return (
    <div style={{ margin:"0 0 12px", position:"relative", zIndex:500 }}>
      <div style={{ width:0, height:0, borderLeft:"8px solid transparent", borderRight:"8px solid transparent", borderBottom:"8px solid #d97706", margin:"0 auto 0", position:"relative", top:1 }} />
      <div style={{ background:"white", borderRadius:16, padding:"14px 16px", border:"2px solid #d97706", boxShadow:"0 4px 20px rgba(217,119,6,0.15)" }}>
        <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
          <div style={{ width:36, height:36, borderRadius:10, background:"#fff8f0", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{hint.icon}</div>
          <div style={{ flex:1 }}>
            <p style={{ margin:"0 0 8px", fontSize:13, color:"#374151", lineHeight:1.5, fontWeight:500 }}>{hint.text}</p>
            <button onClick={onDismiss} style={{ background:"#d97706", color:"white", border:"none", borderRadius:10, padding:"6px 16px", fontSize:12, fontWeight:700, cursor:"pointer" }}>Got it ✓</button>
          </div>
        </div>
      </div>
    </div>
  );
}
