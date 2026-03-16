import { memo } from "react";

export default memo(function NavBar({ activeTab, onNavigate }) {
  return (
    <nav role="navigation" aria-label="Main navigation" style={{ position:"fixed", bottom:0, left:0, right:0, maxWidth:430, margin:"0 auto", background:"#1E1B18", borderTop:"1px solid rgba(255,255,255,0.08)", display:"flex", justifyContent:"space-around", padding:"8px 0 18px", boxShadow:"0 -4px 20px rgba(0,0,0,0.15)", zIndex:100 }}>
      {[
        { id:"home", icon:"🏠", label:"Home" },
        { id:"spaces", icon:"🗄️", label:"Spaces" },
        { id:"add", icon:"➕", label:"Add" },
        { id:"used", icon:"📉", label:"Used" },
        { id:"insights", icon:"📊", label:"Insights" },
      ].map(nav => {
        const isActive = activeTab === nav.id;
        return (
          <div key={nav.id} role="button" aria-label={nav.label} aria-current={isActive ? "page" : undefined} onClick={() => onNavigate(nav.id)} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:2, cursor:"pointer", padding:"4px 12px", borderRadius:12, background:"transparent", transition:"color 0.15s ease, background 0.15s ease" }}>
            <span style={{ fontSize:22 }}>{nav.icon}</span>
            <span style={{ fontSize:10, fontWeight: isActive ? 800 : 500, letterSpacing:"0.10em", textTransform:"uppercase", color: isActive ? "#d97706" : "#6B7280" }}>{nav.label}</span>
            <div style={{ width:20, height:3, borderRadius:2, background:"#d97706", marginTop:1, opacity: isActive ? 1 : 0, transition:"opacity 0.15s ease, width 0.2s cubic-bezier(0.4,0,0.2,1)" }} />
          </div>
        );
      })}
    </nav>
  );
})
