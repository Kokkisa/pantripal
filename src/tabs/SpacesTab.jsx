import { useState, memo } from "react";
import S from "../lib/styles.js";
import { IS_DEMO, getFirebase } from "../lib/firebaseClient.js";
import { stockLevel, compressImage } from "../lib/pantriUtils.js";
import { SC, SL, SHELF_COLORS, SPACE_ICONS } from "../lib/pantriConstants.js";
import { uploadPhoto, clearLocalPhoto } from "../lib/photoStorage.js";
import ShelfPhoto from "../components/ShelfPhoto.jsx";
import AddShelfForm from "../components/AddShelfForm.jsx";
import AddSpaceForm from "../components/AddSpaceForm.jsx";
import TabHint from "../components/TabHint.jsx";
import Toast from "../components/Toast.jsx";

export default memo(function SpacesTab({
  spaces, setSpaces, inventory, userMeta, photoVersion, setPhotoVersion,
  spaceScreen, setSpaceScreen, selectedSpace, setSelectedSpace,
  editingSpace, setEditingSpace, editingShelf, setEditingShelf,
  showAddSpace, setShowAddSpace, showAddShelf, setShowAddShelf,
  expandedShelf, setExpandedShelf,
  dismissedHints, onDismissHint, onEditItem, onAddItemFromShelf, NavBar,
}) {
  const [spaceSaving, setSpaceSaving] = useState(false);
  const [spaceError, setSpaceError] = useState(null);
  const [confirmDeleteSpace, setConfirmDeleteSpace] = useState(false);

  const saveSpaces = async (updatedSpaces) => {
    // 1. Hydrate photos from localStorage for instant local preview
    const spacesWithPhotos = updatedSpaces.map(s => ({
      color: "#fff8f0", accent: "#d97706", icon: "📦", shelves: [], ...s,
      photo: s.photo || localStorage.getItem("pantri_space_photo_" + s.id) || null,
      shelves: (s.shelves || []).map(sh => ({
        shelfColor: "#d97706", ...sh,
        photo: sh.photo || localStorage.getItem("pantri_shelf_photo_" + s.id + "_" + sh.id) || null,
      }))
    }));
    setSpaces([...spacesWithPhotos]);
    setPhotoVersion(v => v + 1);
    if (IS_DEMO || userMeta?.householdId === "demo" || userMeta?.householdId === "demo-household") return;

    setSpaceSaving(true);
    setSpaceError(null);
    try {
      const fb = await getFirebase();
      const hid = userMeta.householdId;

      // 2. Upload base64 photos to Firebase Storage, get download URLs
      const spacesForFirestore = await Promise.all(spacesWithPhotos.map(async s => {
        let spacePhoto = s.photo;
        // Only upload base64 data URIs — URLs from previous uploads are kept as-is
        if (spacePhoto && spacePhoto.startsWith("data:")) {
          try {
            spacePhoto = await uploadPhoto(hid, `spaces/${s.id}.jpg`, spacePhoto);
            clearLocalPhoto("pantri_space_photo_" + s.id);
          } catch (e) {
            console.warn("Space photo upload failed, keeping in localStorage:", e);
            spacePhoto = null; // Firestore gets null; localStorage still has the base64
          }
        }
        const shelves = await Promise.all((s.shelves || []).map(async sh => {
          let shelfPhoto = sh.photo;
          if (shelfPhoto && shelfPhoto.startsWith("data:")) {
            try {
              shelfPhoto = await uploadPhoto(hid, `shelves/${s.id}_${sh.id}.jpg`, shelfPhoto);
              clearLocalPhoto("pantri_shelf_photo_" + s.id + "_" + sh.id);
            } catch (e) {
              console.warn("Shelf photo upload failed, keeping in localStorage:", e);
              shelfPhoto = null;
            }
          }
          return { ...sh, photo: shelfPhoto || null };
        }));
        return { ...s, photo: spacePhoto || null, shelves };
      }));

      // 3. Save to Firestore — photos are now URLs (or null if upload failed)
      await fb.updateDoc(fb.doc(fb.db, "households", hid), { spaces: spacesForFirestore });
    } catch(err) {
      console.error("saveSpaces error:", err);
      setSpaceError("Couldn't save — " + err.message + ". Try again?");
    } finally {
      setSpaceSaving(false);
    }
  };

  const handleAddSpace = async (spaceName, spaceIcon, photo, shelfCount = 1) => {
    if (!spaceName.trim()) return;
    const id = "s" + Date.now();
    const accent = SHELF_COLORS[spaces.length % SHELF_COLORS.length];
    const shelves = Array.from({ length: shelfCount }, (_, i) => ({
      id: String.fromCharCode(65 + i) + "1",
      name: "Shelf " + (i + 1),
      shelfColor: SHELF_COLORS[i % SHELF_COLORS.length],
      items: "",
    }));
    if (photo) localStorage.setItem("pantri_space_photo_" + id, photo);
    const newSpace = { id, name: spaceName.trim(), icon: spaceIcon || "📦", color: "#fff8f0", accent, photo: photo || null, shelves };
    const updated = [...spaces, newSpace];
    await saveSpaces(updated);
    setShowAddSpace(false);
  };

  const handleEditSpace = async (spaceId, newName, newIcon, photo) => {
    const updated = spaces.map(s => s.id === spaceId ? { ...s, name: newName, icon: newIcon, photo: photo || null } : s);
    await saveSpaces(updated);
    setEditingSpace(null);
  };

  const handleDeleteSpace = async (spaceId) => {
    const updated = spaces.filter(s => s.id !== spaceId);
    await saveSpaces(updated);
    setConfirmDeleteSpace(false);
    setEditingSpace(null);
    setSpaceScreen("list");
  };

  const handleAddShelf = async (spaceId, shelfIdVal, shelfNameVal, shelfPhoto) => {
    if (!shelfNameVal.trim()) return;
    const space = spaces.find(s => s.id === spaceId);
    const shelfId = shelfIdVal.trim() || (String.fromCharCode(65 + space.shelves.length) + "1");
    const color = SHELF_COLORS[space.shelves.length % SHELF_COLORS.length];
    if (shelfPhoto) localStorage.setItem("pantri_shelf_photo_" + spaceId + "_" + shelfId, shelfPhoto);
    const newShelf = { id: shelfId, name: shelfNameVal.trim(), shelfColor: color, items: "", photo: shelfPhoto || null };
    const updated = spaces.map(s => s.id === spaceId ? { ...s, shelves: [...s.shelves, newShelf] } : s);
    await saveSpaces(updated);
    setShowAddShelf(null);
  };

  const handleEditShelf = async (spaceId, shelfId, newName, newColor, photo) => {
    const updated = spaces.map(s => s.id === spaceId ? {
      ...s, shelves: s.shelves.map(sh => sh.id === shelfId ? { ...sh, name: newName, shelfColor: newColor, photo: photo || null } : sh)
    } : s);
    await saveSpaces(updated);
    setEditingShelf(null);
  };

  const handleDeleteShelf = async (spaceId, shelfId) => {
    const updated = spaces.map(s => s.id === spaceId ? {
      ...s, shelves: s.shelves.filter(sh => sh.id !== shelfId)
    } : s);
    await saveSpaces(updated);
  };

  // ── Space detail screen ──────────────────────────────────
  if (spaceScreen === "detail" && selectedSpace) {
    const space = spaces.find(s => s.id === selectedSpace.id) || selectedSpace;
    if (!space || !space.shelves) return (
      <div>
        <div style={S.dh()}><button style={S.back} onClick={() => setSpaceScreen("list")}>‹</button><span style={{color:"white"}}>Back</span></div>
        <div style={{padding:20,textAlign:"center",color:"#ef4444"}}>Something's off — head back and try again</div>
        <NavBar />
      </div>
    );
    const spaceItems = inventory.filter(i => i.spaceId === space.id);
    return (
      <div>
        <div style={S.dh()}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center" }}>
              <button style={S.back} onClick={() => setSpaceScreen("list")}>‹</button>
              <span style={{ fontSize:20, marginRight:8 }}>{space.icon}</span>
              <div>
                <h1 style={{ fontSize:20, fontWeight:800, margin:0 }}>{space.name}</h1>
                <p style={{ color:"#9ca3af", margin:0, fontSize:12 }}>{spaceItems.length} items · {space.shelves.length} shelves</p>
              </div>
            </div>
            <button onClick={() => { setEditingSpace(space); setConfirmDeleteSpace(false); }} style={{ background:"rgba(255,255,255,0.1)", border:"none", borderRadius:10, padding:"6px 12px", color:"white", fontSize:11, fontWeight:700, cursor:"pointer" }}>✏️ Edit</button>
          </div>
        </div>

        {/* Edit Space Modal */}
        {editingSpace && (
          <div onClick={()=>{setEditingSpace(null);setConfirmDeleteSpace(false);}} style={S.overlay}>
            <div onClick={e=>e.stopPropagation()} style={S.sheet}>
              <h2 style={S.sheetTitle}>Edit Space</h2>
              <div style={{ marginBottom:14 }}>
                <label style={S.label}>Cover Photo (optional)</label>
                <label style={{ position:"relative", height:100, borderRadius:14, overflow:"hidden", background:"#f3f4f6", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
                  {editingSpace.photo
                    ? <>
                        <img src={editingSpace.photo} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt="" />
                        <div style={{ position:"absolute", bottom:8, right:8, background:"#1e1b18", color:"white", borderRadius:9, padding:"5px 11px", fontSize:11, fontWeight:700 }}>📷 Upload my latest look</div>
                      </>
                    : <div style={{ textAlign:"center", color:"#9ca3af" }}><div style={{ fontSize:28 }}>📸</div><p style={{ margin:"4px 0 0", fontSize:12, fontWeight:700 }}>Tap to give me a face!</p></div>
                  }
                  <input type="file" accept="image/*" style={{ display:"none" }} onChange={async e => {
                    const file = e.target.files[0]; if (!file) return;
                    const compressed = await compressImage(file);
                    const key = "pantri_space_photo_" + editingSpace.id;
                    localStorage.setItem(key, compressed);
                    setEditingSpace(p => ({ ...p, photo: compressed }));
                  }} />
                </label>
                {editingSpace.photo && <button onClick={() => setEditingSpace(p => ({ ...p, photo: null }))} style={{ marginTop:5, background:"transparent", border:"none", color:"#ef4444", fontSize:11, fontWeight:700, cursor:"pointer", padding:0 }}>😢 Remove my photo</button>}
              </div>
              <div style={{ marginBottom:12 }}>
                <label style={S.label}>Space Name</label>
                <input style={S.input} value={editingSpace.name} onChange={e => setEditingSpace(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div style={{ marginBottom:16 }}>
                <label style={S.label}>Icon</label>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:8 }}>
                  {SPACE_ICONS.map(icon => (
                    <div key={icon} onClick={() => setEditingSpace(p => ({ ...p, icon }))} style={{ width:40, height:40, borderRadius:11, background:editingSpace.icon===icon?"#1e1b18":"#f3f4f6", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, cursor:"pointer" }}>{icon}</div>
                  ))}
                </div>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <input style={{ ...S.input, width:60, textAlign:"center", fontSize:20, padding:"6px" }} placeholder="😀" value={!SPACE_ICONS.includes(editingSpace.icon) ? editingSpace.icon : ""} onChange={e => { if(e.target.value) setEditingSpace(p => ({ ...p, icon: e.target.value })); }} maxLength={2} />
                  <span style={{ fontSize:11, color:"#9ca3af", fontWeight:600 }}>Or type your own emoji</span>
                </div>
              </div>
              <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                <button disabled={spaceSaving} onClick={() => handleEditSpace(editingSpace.id, editingSpace.name, editingSpace.icon, editingSpace.photo)} style={{ flex:1, background: spaceSaving ? "#e5e7eb" : "#1e1b18", color: spaceSaving ? "#9ca3af" : "white", border:"none", borderRadius:13, padding:"13px", fontWeight:700, cursor: spaceSaving ? "not-allowed" : "pointer" }}>{spaceSaving ? "Saving..." : "Save Changes"}</button>
                <button onClick={() => { setEditingSpace(null); setConfirmDeleteSpace(false); }} style={{ flex:1, background:"#f3f4f6", color:"#374151", border:"none", borderRadius:13, padding:"13px", fontWeight:700, cursor:"pointer" }}>Cancel</button>
              </div>
              {!confirmDeleteSpace ? (
                <button onClick={() => setConfirmDeleteSpace(true)} style={{ width:"100%", background:"#fef2f2", color:"#ef4444", border:"1px solid #fecaca", borderRadius:13, padding:"11px", fontWeight:700, cursor:"pointer" }}>🗑️ Delete Space</button>
              ) : (
                <div style={S.confirmBox}>
                  <p style={{ margin:"0 0 10px", fontSize:13, fontWeight:700, color:"#991b1b" }}>Delete "{space.name}"? Items inside won't be deleted.</p>
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={() => setConfirmDeleteSpace(false)} style={{ ...S.outline, flex:1, padding:"10px" }}>Cancel</button>
                    <button disabled={spaceSaving} onClick={() => handleDeleteSpace(space.id)} style={{ ...S.btn("#ef4444"), flex:1, padding:"10px" }}>
                      {spaceSaving ? "Deleting..." : "Yes, Delete"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Edit Shelf Modal */}
        {editingShelf && (
          <div onClick={()=>setEditingShelf(null)} style={S.overlay}>
            <div onClick={e=>e.stopPropagation()} style={S.sheet}>
              <h2 style={S.sheetTitle}>Edit Shelf</h2>
              <div style={{ marginBottom:14 }}>
                <label style={S.label}>Shelf Photo</label>
                <label style={{ position:"relative", height:120, borderRadius:14, overflow:"hidden", background:"#f3f4f6", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
                  {editingShelf.shelf.photo
                    ? <>
                        <img src={editingShelf.shelf.photo} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt="" />
                        <div style={{ position:"absolute", bottom:8, right:8, background:"#1e1b18", color:"white", borderRadius:9, padding:"5px 11px", fontSize:11, fontWeight:700 }}>📷 Upload my latest look</div>
                      </>
                    : <div style={{ textAlign:"center", color:"#9ca3af" }}><div style={{ fontSize:28 }}>📸</div><p style={{ margin:"4px 0 0", fontSize:12, fontWeight:700 }}>Tap to give me a face!</p></div>
                  }
                  <input type="file" accept="image/*" style={{ display:"none" }} onChange={async e => {
                    const file = e.target.files[0]; if (!file) return;
                    const compressed = await compressImage(file);
                    const key = "pantri_shelf_photo_" + editingShelf.spaceId + "_" + editingShelf.shelf.id;
                    localStorage.setItem(key, compressed);
                    setPhotoVersion(v => v + 1);
                    setEditingShelf(p => ({ ...p, shelf: { ...p.shelf, photo: compressed } }));
                  }} />
                </label>
                {editingShelf.shelf.photo && (
                  <button onClick={() => setEditingShelf(p => ({ ...p, shelf: { ...p.shelf, photo: null } }))} style={{ marginTop:6, background:"transparent", border:"none", color:"#ef4444", fontSize:11, fontWeight:700, cursor:"pointer", padding:0 }}>😢 Remove my photo</button>
                )}
              </div>
              <div style={{ marginBottom:12 }}>
                <label style={S.label}>Shelf Name</label>
                <input style={S.input} value={editingShelf.shelf.name} onChange={e => setEditingShelf(p => ({ ...p, shelf: { ...p.shelf, name: e.target.value } }))} />
              </div>
              <div style={{ marginBottom:16 }}>
                <label style={S.label}>Color</label>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {SHELF_COLORS.map(color => (
                    <div key={color} onClick={() => setEditingShelf(p => ({ ...p, shelf: { ...p.shelf, shelfColor: color } }))} style={{ width:32, height:32, borderRadius:9, background:color, border:editingShelf.shelf.shelfColor===color?"3px solid #1e1b18":"3px solid transparent", cursor:"pointer" }} />
                  ))}
                </div>
              </div>
              <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                <button disabled={spaceSaving} onClick={() => handleEditShelf(editingShelf.spaceId, editingShelf.shelf.id, editingShelf.shelf.name, editingShelf.shelf.shelfColor, editingShelf.shelf.photo)} style={{ flex:1, background: spaceSaving ? "#e5e7eb" : "#1e1b18", color: spaceSaving ? "#9ca3af" : "white", border:"none", borderRadius:13, padding:"13px", fontWeight:700, cursor: spaceSaving ? "not-allowed" : "pointer" }}>{spaceSaving ? "Saving..." : "Save"}</button>
                <button onClick={() => setEditingShelf(null)} style={{ flex:1, background:"#f3f4f6", color:"#374151", border:"none", borderRadius:13, padding:"13px", fontWeight:700, cursor:"pointer" }}>Cancel</button>
              </div>
              <button disabled={spaceSaving} onClick={() => { handleDeleteShelf(editingShelf.spaceId, editingShelf.shelf.id); setEditingShelf(null); }} style={{ width:"100%", background:"#fef2f2", color:"#ef4444", border:"1px solid #fecaca", borderRadius:13, padding:"11px", fontWeight:700, cursor: spaceSaving ? "not-allowed" : "pointer" }}>🗑️ Delete Shelf</button>
            </div>
          </div>
        )}

        <div style={S.content}>
          {space.shelves.map(shelf => {
            const shelfItems = inventory.filter(i => i.spaceId === space.id && i.shelfId === shelf.id);
            return (
              <div key={shelf.id} style={S.card}>
                <div onClick={() => setEditingShelf({ spaceId: space.id, shelf: { ...shelf } })} style={{ marginBottom:6, cursor:"pointer" }}><ShelfPhoto shelf={shelf} space={space} size="md" refreshKey={photoVersion} /></div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:6, marginBottom:8 }}>
                  <span onClick={() => setExpandedShelf(expandedShelf === shelf.id ? null : shelf.id)} style={{ fontWeight:700, fontSize:14, cursor:"pointer", color:"#1e1b18" }}>{shelf.name}</span>
                  <div style={{ display:"flex", gap:6 }}>
                    <span onClick={() => setEditingShelf({ spaceId: space.id, shelf: { ...shelf } })} style={{ fontSize:12, color:"#6b7280", cursor:"pointer", background:"#f3f4f6", borderRadius:8, padding:"4px 10px", fontWeight:600 }}>Edit Shelf ✏️</span>
                    <span onClick={() => onAddItemFromShelf(space, shelf)} style={{ fontSize:12, color:space.accent, cursor:"pointer", fontWeight:700, background:space.accent+"15", borderRadius:8, padding:"4px 10px" }}>+ Add Item</span>
                  </div>
                </div>
                {shelfItems.length === 0
                  ? <p style={{ margin:0, fontSize:12, color:"#9ca3af", textAlign:"center", padding:"8px 0" }}>No items yet — tap "+ Add Item" to get started!</p>
                  : expandedShelf === shelf.id
                    ? <>
                        {shelfItems.map((item, i) => {
                          const level = stockLevel(item.qty, item.reorder);
                          return (
                            <div key={item.id} onClick={() => onEditItem(item)} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom: i < shelfItems.length - 1 ? "1px solid #f5f5f4" : "none", cursor:"pointer" }}>
                              <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                                <span style={{ fontSize:16 }}>{item.emoji}</span>
                                <div>
                                  <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                                    <span style={{ fontWeight:600, fontSize:13 }}>{item.name}</span>
                                    {level !== "good" && <span style={{ background:SC[level]+"20", color:SC[level], fontSize:9, fontWeight:800, borderRadius:5, padding:"1px 5px" }}>{SL[level]}</span>}
                                  </div>
                                </div>
                              </div>
                              <div style={{ textAlign:"right" }}>
                                <p style={{ margin:0, fontWeight:800, fontSize:15, color:SC[level] }}>{item.qty}</p>
                                <p style={{ margin:0, fontSize:10, color:"#9ca3af" }}>{item.unit}</p>
                              </div>
                            </div>
                          );
                        })}
                        <div onClick={() => setExpandedShelf(null)} style={{ display:"flex", justifyContent:"center", alignItems:"center", padding:"10px 0 4px", cursor:"pointer" }}>
                          <span style={{ fontSize:11, color:space.accent, fontWeight:700 }}>‹ Hide items</span>
                        </div>
                      </>
                    : (
                      <div onClick={() => setExpandedShelf(shelf.id)} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", cursor:"pointer" }}>
                        <span style={{ fontSize:12, color:"#6b7280" }}>{shelfItems.length} {shelfItems.length===1?"item":"items"} · {shelfItems.reduce((s,i)=>s+i.qty,0)} total units</span>
                        <span style={{ fontSize:11, color:space.accent, fontWeight:700 }}>View items ›</span>
                      </div>
                    )}
              </div>
            );
          })}
          {showAddShelf === space.id ? (
            <AddShelfForm
              onAdd={(sid, sname, sphoto) => handleAddShelf(space.id, sid, sname, sphoto)}
              onCancel={() => setShowAddShelf(null)}
            />
          ) : (
            <button onClick={() => setShowAddShelf(space.id)} style={{ width:"100%", background:"white", border:"2px dashed #d1d5db", borderRadius:16, padding:"14px", color:"#6b7280", fontSize:13, fontWeight:700, cursor:"pointer" }}>+ Add a shelf</button>
          )}
        </div>
        {spaceError && <Toast message={spaceError} type="error" onDone={() => setSpaceError(null)} />}
        <NavBar />
      </div>
    );
  }

  // ── Spaces list screen ───────────────────────────────────
  return (
    <div>
      <div style={S.dh()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, margin:"0 0 2px" }}>Your spaces</h1>
            <p style={{ color:"#9ca3af", margin:0, fontSize:12 }}>Everything has its place</p>
          </div>
          <button onClick={() => setShowAddSpace(true)} style={{ background:"#d97706", border:"none", borderRadius:12, padding:"8px 14px", color:"white", fontSize:12, fontWeight:700, cursor:"pointer" }}>+ New space</button>
        </div>
      </div>
      {showAddSpace && (
        <div onClick={()=>setShowAddSpace(false)} style={S.overlay}>
          <AddSpaceForm
            onAdd={(name, icon, photo, shelfCount) => handleAddSpace(name, icon, photo, shelfCount)}
            onCancel={() => setShowAddSpace(false)}
          />
        </div>
      )}
      <div style={S.content}>
        {!dismissedHints.spaces && <TabHint tab="spaces" onDismiss={() => onDismissHint("spaces")} />}
        {spaces.map(space => {
          const items = inventory.filter(it => it.spaceId === space.id);
          const low = items.filter(it => stockLevel(it.qty, it.reorder) !== "good").length;
          return (
            <div key={space.id} style={{ background:space.color, borderRadius:18, padding:"16px", marginBottom:10, border:`1.5px solid ${space.accent}30` }}>
              {space.photo && (
                <div onClick={() => { setSelectedSpace(space); setSpaceScreen("detail"); }} style={{ borderRadius:14, overflow:"hidden", height:80, marginBottom:10, cursor:"pointer" }}>
                  <img src={space.photo} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt="" />
                </div>
              )}
              <div onClick={() => { setSelectedSpace(space); setSpaceScreen("detail"); }} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12, cursor:"pointer" }}>
                <div style={{ width:48, height:48, borderRadius:14, background:space.accent+"20", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>{space.icon}</div>
                <div style={{ flex:1 }}>
                  <p style={{ margin:0, fontWeight:800, fontSize:16 }}>{space.name}</p>
                  <p style={{ margin:0, fontSize:12, color:"#6b7280" }}>{space.shelves.length} {space.shelves.length===1?"shelf":"shelves"} · {items.length} {items.length===1?"item":"items"}</p>
                </div>
                {low > 0 && <span style={{ background:"#fff7ed", color:"#ea580c", fontSize:11, fontWeight:800, borderRadius:9, padding:"3px 9px" }}>{low} running low</span>}
                <span style={{ fontSize:18, color:space.accent }}>›</span>
              </div>
              <div style={{ display:"flex", gap:6 }}>
                {space.shelves.map(shelf => (
                  <div key={shelf.id} style={{ flex:1, cursor:"pointer" }} onClick={() => { setSelectedSpace(space); setSpaceScreen("detail"); setExpandedShelf(shelf.id); }}>
                    <ShelfPhoto shelf={shelf} space={space} size="sm" refreshKey={photoVersion} />
                    <p style={{ margin:"4px 0 0", fontSize:10, fontWeight:600, color:"#1e1b18", textAlign:"center", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{shelf.name}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {spaces.length === 0 && (
          <div style={S.emptyWrap}>
            <div style={S.emptyIcon}>🗄️</div>
            <p style={S.emptyTitle}>No spaces yet — add your first one!</p>
            <p style={S.emptySub}>Tap below to set up your first storage spot</p>
            <button onClick={() => setShowAddSpace(true)} style={{ background:"#d97706", color:"white", border:"none", borderRadius:13, padding:"12px 24px", fontWeight:700, cursor:"pointer" }}>+ Add my first space</button>
          </div>
        )}
      </div>
      {spaceError && <Toast message={spaceError} type="error" onDone={() => setSpaceError(null)} />}
      <NavBar />
    </div>
  );
})
