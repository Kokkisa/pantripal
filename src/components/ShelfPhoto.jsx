export default function ShelfPhoto({ shelf, space, size="sm", refreshKey=0 }) {
  const h = size==="lg"?160:size==="md"?100:56;
  const bg = shelf?.shelfColor || space?.accent || "#6b7280";
  const photoKey = space?.id && shelf?.id ? "pantri_shelf_photo_" + space.id + "_" + shelf.id : null;
  const photo = shelf?.photo || (photoKey ? localStorage.getItem(photoKey) : null);
  if (photo) {
    return (
      <div style={{ width:"100%", height:h, borderRadius:size==="lg"?16:12, overflow:"hidden", flexShrink:0 }}>
        <img src={photo} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt={shelf?.name} />
      </div>
    );
  }
  return (
    <div style={{ width:"100%", height:h, borderRadius:size==="lg"?16:12, background:`linear-gradient(135deg,${bg}dd,${bg}88)`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", position:"relative", overflow:"hidden", flexShrink:0 }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, bottom:0, background:"repeating-linear-gradient(0deg,transparent,transparent 18px,rgba(255,255,255,0.06) 18px,rgba(255,255,255,0.06) 20px)" }} />
      <div style={{ textAlign:"center", opacity:0.6, position:"relative", zIndex:1 }}>
        <div style={{ fontSize:size==="sm"?14:20 }}>📷</div>
        {size!=="sm" && <p style={{ margin:"3px 0 0", fontSize:9, color:"#1e1b18", fontWeight:700 }}>Snap a photo!</p>}
      </div>
    </div>
  );
}
