import { useState } from "react";
import S from "../lib/styles.js";
import { CATEGORIES, UNITS } from "../lib/pantriConstants.js";
import ErrorBanner from "./ErrorBanner.jsx";

export default function EditItemModal({ item, onSave, onDelete, onClose, spaces }) {
  const [form, setForm] = useState({
    name: item.name || "",
    brand: item.brand || "",
    category: item.category || "",
    qty: item.qty ?? 1,
    unit: item.unit || "Pcs",
    price: item.price ?? "",
    reorder: item.reorder ?? 1,
    expiry: item.expiry || "",
    emoji: item.emoji || "📦",
  });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const priceNum = Number(form.price) || null;
      const updates = {
        name: form.name.trim(),
        brand: form.brand.trim(),
        category: form.category,
        qty: Number(form.qty) || 0,
        unit: form.unit,
        price: priceNum,
        reorder: Number(form.reorder) || 1,
        expiry: form.expiry,
        emoji: form.emoji,
      };
      if (priceNum && priceNum !== item.price) {
        updates.priceHistory = [
          ...(item.priceHistory || []),
          { price: priceNum, date: new Date().toISOString(), qty: Number(form.qty) || 0 },
        ];
      }
      await onSave(item.id, updates);
      onClose();
    } catch (err) {
      console.error("EditItemModal save failed:", err);
      setError("Save failed: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    setError(null);
    try {
      await onDelete(item.id);
      onClose();
    } catch (err) {
      console.error("EditItemModal delete failed:", err);
      setError("Delete failed: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const EMOJIS = ["📦","🥛","🍚","🥫","🍞","🥚","🧈","🥤","🍼","🧃","🫙","🥜","🧀","🍎","🥩","🥬","🍪","🧴","🧻","🧹"];

  return (
    <div onClick={onClose} style={S.overlay}>
      <div onClick={e=>e.stopPropagation()} style={{ ...S.sheet, padding:0, background:"#faf9f7", maxHeight:"85vh", overflow:"auto" }}>
        <div style={{ ...S.dh(), borderRadius:"28px 28px 0 0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div><h1 style={{ fontSize:20, fontWeight:800, margin:"0 0 2px" }}>Edit Item ✏️</h1><p style={{ color:"#9ca3af", margin:0, fontSize:12 }}>Update details or remove</p></div>
          <span onClick={onClose} style={{ color:"#9ca3af", fontSize:22, cursor:"pointer" }}>×</span>
        </div>
        <div style={{ padding:"14px 14px 32px", ...S.gap(12) }}>
          {error && <ErrorBanner message={error} />}
          <div>
            <label style={S.label}>Emoji</label>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {EMOJIS.map(e => (
                <div key={e} onClick={() => set("emoji", e)} style={{ width:34, height:34, borderRadius:10, background: form.emoji === e ? "#d97706" : "#f3f4f6", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, cursor:"pointer", border: form.emoji === e ? "2px solid #b45309" : "2px solid transparent" }}>{e}</div>
              ))}
            </div>
          </div>
          <div>
            <label style={S.label}>Name</label>
            <input style={S.input} value={form.name} onChange={e => set("name", e.target.value)} placeholder="Item name" />
          </div>
          <div>
            <label style={S.label}>Brand</label>
            <input style={S.input} value={form.brand} onChange={e => set("brand", e.target.value)} placeholder="Brand (optional)" />
          </div>
          <div>
            <label style={S.label}>Category</label>
            <select style={{ ...S.input, appearance:"auto" }} value={form.category} onChange={e => set("category", e.target.value)}>
              <option value="">Select...</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <div style={{ flex:1 }}>
              <label style={S.label}>Quantity</label>
              <input style={S.input} type="number" min="0" step="0.5" value={form.qty} onChange={e => set("qty", e.target.value)} />
            </div>
            <div style={{ flex:1 }}>
              <label style={S.label}>Unit</label>
              <select style={{ ...S.input, appearance:"auto" }} value={form.unit} onChange={e => set("unit", e.target.value)}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={S.label}>Price per {form.unit}</label>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ fontWeight:700, fontSize:16, color:"#6b7280" }}>₹</span>
              <input style={{ ...S.input, flex:1 }} type="number" min="0" step="0.01" placeholder="0.00" value={form.price} onChange={e => set("price", e.target.value)} />
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <div style={{ flex:1 }}>
              <label style={S.label}>Reorder Level</label>
              <input style={S.input} type="number" min="0" step="1" value={form.reorder} onChange={e => set("reorder", e.target.value)} />
            </div>
            <div style={{ flex:1 }}>
              <label style={S.label}>Expiry Date</label>
              <input style={S.input} type="date" value={form.expiry} onChange={e => set("expiry", e.target.value)} />
            </div>
          </div>
          {item.spaceId && (
            <div style={{ background:"#f3f4f6", borderRadius:12, padding:"10px 14px" }}>
              <p style={{ margin:0, fontSize:11, color:"#6b7280" }}>Location: <strong>{spaces.find(s => s.id === item.spaceId)?.name || item.spaceId}</strong> &rsaquo; {spaces.find(s => s.id === item.spaceId)?.shelves?.find(sh => sh.id === item.shelfId)?.name || item.shelfId || "—"}</p>
            </div>
          )}
          <button onClick={handleSave} disabled={saving || !form.name.trim()} style={S.btn("#d97706", "white", saving || !form.name.trim())}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} style={{ ...S.outline, color:"#ef4444", borderColor:"#fecaca" }}>
              🗑️ Delete Item
            </button>
          ) : (
            <div style={S.confirmBox}>
              <p style={{ margin:"0 0 10px", fontSize:13, fontWeight:700, color:"#991b1b" }}>Delete "{form.name}" permanently?</p>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={() => setConfirmDelete(false)} style={{ ...S.outline, flex:1, padding:"10px" }}>Cancel</button>
                <button onClick={handleDelete} disabled={saving} style={{ ...S.btn("#ef4444"), flex:1, padding:"10px" }}>
                  {saving ? "Deleting..." : "Yes, Delete"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
