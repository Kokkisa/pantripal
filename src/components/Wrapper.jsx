import { useState } from "react";
import { IS_DEMO } from "../lib/firebaseClient.js";

export default function Wrapper({ children }) {
  const [isMobile] = useState(() => window.innerWidth <= 500);

  if (isMobile) {
    return (
      <div style={{ minHeight:"100vh", width:"100%", background:"#faf9f7", fontFamily:"'DM Sans',sans-serif" }}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        {children}
      </div>
    );
  }

  return(
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#1e1b18 0%,#3d2f1f 50%,#1e1b18 100%)", display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"32px 16px", fontFamily:"'DM Sans',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ textAlign:"center", width:"100%" }}>
        <div style={{ marginBottom:18 }}>
          <h1 style={{ color:"white", fontSize:26, fontWeight:800, margin:"0 0 4px", letterSpacing:"-1px" }}>🥫 PantriPal</h1>
          <p style={{ color:"#9ca3af", fontSize:11, margin:0 }}>
            {IS_DEMO?"Demo Mode — paste Firebase config to go live":"Firebase Connected · Real-time sync active"}
          </p>
        </div>
        <div style={{ width:390, background:"#faf9f7", borderRadius:44, boxShadow:"0 40px 100px rgba(0,0,0,0.3),0 0 0 10px #1a1a1a,0 0 0 12px #333", overflow:"hidden", margin:"0 auto" }}>
          <div style={{ background:"#1e1b18", padding:"12px 26px 9px", display:"flex", justifyContent:"space-between", color:"white", fontSize:12, fontWeight:600 }}>
            <span>9:41</span><span style={{ fontSize:14, letterSpacing:2 }}>●●●</span><span>⚡ 87%</span>
          </div>
          <div style={{ maxHeight:780, overflow:"auto" }}>{children}</div>
        </div>
        <p style={{ color:"#4b5563", fontSize:11, marginTop:14 }}>
          {IS_DEMO?"Paste your Firebase config in the code to enable real accounts & sync":""}
        </p>
      </div>
    </div>
  );
}
