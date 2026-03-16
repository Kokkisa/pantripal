import S from "../lib/styles.js";

export default function ProfileOverlay({ user, userMeta, inventory, spaces, shoppingList, onSignOut, onClose }) {
  return (
    <div onClick={onClose} style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.5)", zIndex:200, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:"min(390px,100vw)", background:"#faf9f7", borderRadius:"28px 28px 0 0", maxHeight:"85vh", overflow:"auto", animation:"slideUp 0.3s ease-out" }}>
        <div style={{ background:"#1e1b18", padding:"16px 18px 18px", borderRadius:"28px 28px 0 0", color:"white", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div><h1 style={{ fontSize:20, fontWeight:800, margin:"0 0 2px" }}>Your profile</h1><p style={{ color:"#9ca3af", margin:0, fontSize:12 }}>Here's your setup</p></div>
          <span onClick={onClose} style={{ color:"#9ca3af", fontSize:22, cursor:"pointer" }}>×</span>
        </div>
        <div style={{ padding:"14px 14px 32px" }}>
          <div style={S.card}>
            <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:14 }}>
              <div style={{ width:52, height:52, borderRadius:16, background:"#d97706", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, color:"white", fontWeight:800 }}>{(userMeta?.name||"U").charAt(0).toUpperCase()}</div>
              <div>
                <p style={{ margin:0, fontWeight:800, fontSize:16, color:"#1e1b18" }}>{userMeta?.name||"User"}</p>
                {userMeta?.partner && <p style={{ margin:0, fontSize:12, color:"#6b7280" }}>Partner: {userMeta.partner}</p>}
                <p style={{ margin:0, fontSize:12, color:"#9ca3af" }}>{user?.email||""}</p>
              </div>
            </div>
          </div>
          <div style={S.card}>
            <p style={{ margin:"0 0 8px", fontSize:11, fontWeight:700, color:"#9ca3af", letterSpacing:"0.10em", textTransform:"uppercase" }}>Household</p>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              <span style={{ fontSize:14, color:"#1e1b18" }}>Total items</span>
              <span style={{ fontSize:14, fontWeight:700, color:"#1e1b18" }}>{inventory.length}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              <span style={{ fontSize:14, color:"#1e1b18" }}>Spaces</span>
              <span style={{ fontSize:14, fontWeight:700, color:"#1e1b18" }}>{spaces.length}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <span style={{ fontSize:14, color:"#1e1b18" }}>Running low</span>
              <span style={{ fontSize:14, fontWeight:700, color:"#f97316" }}>{shoppingList.length}</span>
            </div>
          </div>
          <div style={{ marginTop:8 }}>
            <button onClick={async()=>{onClose();await onSignOut();}} style={{ ...S.btn("#ef4444"), display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              Sign Out
            </button>
          </div>
          <p style={{ textAlign:"center", fontSize:11, color:"#9ca3af", marginTop:16 }}>PantriPal v1.0 — made with ❤️</p>
        </div>
      </div>
    </div>
  );
}
