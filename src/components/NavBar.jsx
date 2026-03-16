export default function NavBar({ activeTab, onNavigate }) {
  return (
    <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"white", borderTop:"1px solid #f0ede8", display:"flex", justifyContent:"space-around", padding:"8px 0 18px", boxShadow:"0 -4px 20px rgba(0,0,0,0.08)", zIndex:100 }}>
      {[
        { id:"home", icon:"🏠", label:"Home" },
        { id:"spaces", icon:"🗄️", label:"Spaces" },
        { id:"add", icon:"➕", label:"Add" },
        { id:"used", icon:"📉", label:"Used" },
        { id:"insights", icon:"📊", label:"Insights" },
      ].map(nav => {
        const isActive = activeTab === nav.id;
        return (
          <div key={nav.id} onClick={() => onNavigate(nav.id)} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2, cursor:"pointer", padding:"4px 12px", borderRadius:12, background: isActive ? "#fff7ed" : "transparent", transition:"all 0.2s ease" }}>
            <span style={{ fontSize:22 }}>{nav.icon}</span>
            <span style={{ fontSize:10, fontWeight: isActive ? 800 : 500, letterSpacing:"0.04em", textTransform:"uppercase", color: isActive ? "#d97706" : "#9ca3af" }}>{nav.label}</span>
            {isActive && <div style={{ width:20, height:3, borderRadius:2, background:"#d97706", marginTop:1 }} />}
          </div>
        );
      })}
    </div>
  );
}
