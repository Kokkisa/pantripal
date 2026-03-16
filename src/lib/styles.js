// ── PantriPal Shared Styles ──────────────────────────────────
const S = {
  // ── Buttons ──────────────────────────────────────────────────
  btn: (bg, color="white", off=false) => ({ width:"100%", background:off?"#e5e7eb":bg, color:off?"#9ca3af":color, border:"none", borderRadius:16, padding:"16px", fontSize:15, fontWeight:700, cursor:off?"not-allowed":"pointer" }),
  outline: { width:"100%", background:"transparent", color:"#6b7280", border:"2px solid #e5e7eb", borderRadius:16, padding:"14px", fontSize:14, fontWeight:600, cursor:"pointer" },

  // ── Form elements ────────────────────────────────────────────
  input: { width:"100%", background:"white", border:"2px solid #f0ede8", borderRadius:13, padding:"12px 14px", fontSize:14, fontWeight:600, outline:"none", boxSizing:"border-box", fontFamily:"'DM Sans',sans-serif", color:"#1e1b18" },
  label: { fontSize:11, fontWeight:700, color:"#9ca3af", letterSpacing:"0.10em", textTransform:"uppercase", display:"block", marginBottom:6 },

  // ── Layout primitives ────────────────────────────────────────
  card: { background:"white", borderRadius:18, padding:"14px", boxShadow:"0 2px 8px rgba(0,0,0,0.05)", marginBottom:10 },
  back: { color:"#d97706", fontSize:22, cursor:"pointer", background:"none", border:"none", padding:0, marginRight:8, lineHeight:1 },
  gap: (n=10) => ({ display:"flex", flexDirection:"column", gap:n }),
  dh: (bg="#1e1b18") => ({ background:bg, padding:"16px 18px 18px", color:"white" }),
  content: { padding:"14px 14px 100px", color:"#1e1b18" },
  row: { display:"flex", gap:8, alignItems:"center" },

  // ── Modal overlay (fullscreen backdrop, bottom-aligned) ──────
  overlay: { position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.5)", zIndex:300, display:"flex", alignItems:"flex-end", justifyContent:"center" },

  // ── Bottom sheet (white panel with rounded top corners) ──────
  sheet: { width:"min(390px,100vw)", background:"white", borderRadius:"28px 28px 0 0", padding:"24px 20px 36px", maxHeight:"90vh", overflowY:"auto" },

  // ── Sheet title ──────────────────────────────────────────────
  sheetTitle: { fontSize:18, fontWeight:800, margin:"0 0 16px" },

  // ── Error / warning banner ───────────────────────────────────
  errorBanner: { background:"#fef2f2", borderRadius:12, padding:"10px 14px", border:"1px solid #fecaca" },

  // ── Destructive-action confirmation box ──────────────────────
  confirmBox: { background:"#fef2f2", borderRadius:14, padding:"14px", border:"1px solid #fecaca" },

  // ── Status badge ─────────────────────────────────────────────
  badge: (bg, color) => ({ background:bg, color, fontSize:10, fontWeight:800, borderRadius:8, padding:"3px 8px" }),

  // ── Circular alert badge (replaces ⚠️) ──────────────────────
  alertBadge: (bg="#ef4444") => ({ display:"inline-flex", alignItems:"center", justifyContent:"center", width:16, height:16, borderRadius:"50%", background:bg, color:"white", fontSize:10, fontWeight:800, lineHeight:1, flexShrink:0 }),

  // ── Empty state container ────────────────────────────────────
  emptyWrap: { textAlign:"center", padding:"50px 20px", color:"#9ca3af" },
  emptyIcon: { fontSize:48, marginBottom:12 },
  emptyTitle: { fontWeight:700, fontSize:16, margin:"0 0 4px", color:"#374151" },
  emptySub: { fontSize:13, margin:"0 0 20px" },
};

export default S;
