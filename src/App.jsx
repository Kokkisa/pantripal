import { useState, useEffect, useRef } from "react";

// ══════════════════════════════════════════════════════════════
// 🔥 FIREBASE CONFIG — paste your 6 values from Firebase console
// ══════════════════════════════════════════════════════════════
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyAlBwhJR5-3C2duuoUkWS-qbLaU_hsCh1E",
  authDomain:        "pantri-d5f8e.firebaseapp.com",
  projectId:         "pantri-d5f8e",
  storageBucket:     "pantri-d5f8e.firebasestorage.app",
  messagingSenderId: "678209291878",
  appId:             "1:678209291878:web:b59cc98e2ea4d8036a0fa7",
};
// ══════════════════════════════════════════════════════════════

// ── Firebase SDK loader (loads from CDN at runtime) ───────────
let _app, _auth, _db, _cachedFns = null;

async function getFirebase() {
  if (_app && _cachedFns) return { app: _app, auth: _auth, db: _db, ..._cachedFns };
  const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js");
  const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } =
    await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
  const { getFirestore, doc, setDoc, getDoc, collection, addDoc, onSnapshot, updateDoc, deleteDoc, query, orderBy, serverTimestamp } =
    await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
  _app = initializeApp(FIREBASE_CONFIG);
  _auth = getAuth(_app);
  _db = getFirestore(_app);
  _cachedFns = {
    createUserWithEmailAndPassword, signInWithEmailAndPassword,
    onAuthStateChanged, signOut,
    doc, setDoc, getDoc, collection, addDoc, onSnapshot,
    updateDoc, deleteDoc, query, orderBy, serverTimestamp,
  };
  return { app: _app, auth: _auth, db: _db, ..._cachedFns };
}

// ── Demo mode fallback (works without Firebase config) ────────
const IS_DEMO = FIREBASE_CONFIG.apiKey === "PASTE_YOUR_API_KEY_HERE";

// ── Default spaces for new households ─────────────────────────
const DEFAULT_SPACES = [
  { id: "s1", name: "Main Pantry", icon: "🗄️", color: "#fff8f0", accent: "#d97706",
    shelves: [{ id: "A1", name: "Dry Goods", shelfColor: "#d97706", items: "Rice, Pasta, Oats" },
              { id: "A2", name: "Canned Goods", shelfColor: "#ea580c", items: "Cans, Sauces" },
              { id: "A3", name: "Snacks & Extras", shelfColor: "#ca8a04", items: "Snacks, Oils" }] },
  { id: "s2", name: "Refrigerator", icon: "🧊", color: "#f0fdf9", accent: "#059669",
    shelves: [{ id: "F1", name: "Top Shelf", shelfColor: "#0891b2", items: "Milk, Yogurt" },
              { id: "F2", name: "Middle Shelf", shelfColor: "#0284c7", items: "Leftovers" },
              { id: "F3", name: "Veggie Drawer", shelfColor: "#059669", items: "Vegetables" }] },
  { id: "s3", name: "Baby Corner", icon: "🍼", color: "#fdf4ff", accent: "#9333ea",
    shelves: [{ id: "B1", name: "Baby Food & Formula", shelfColor: "#9333ea", items: "Formula" },
              { id: "B2", name: "Diapers & Wipes", shelfColor: "#a855f7", items: "Diapers" }] },
];

const UNITS = ["pcs","kg","g","lbs","oz","liters","ml","gallons","cartons","packs","cans","bottles","boxes","bags","loaves","cups","jars","rolls"];
const CATEGORIES = ["Grains & Pasta","Canned Goods","Dairy","Produce","Snacks","Beverages","Baby","Cleaning","Frozen","Condiments","Bakery","Other"];
const HOUSEHOLD_UNITS = { "Milk":"gallons","Rice":"kg","Pasta":"packs","Diapers":"pcs","Eggs":"pcs","Bread":"loaves" };
const PRODUCT_DEFAULTS = {
  "milk":{ unit:"gallons", category:"Dairy" }, "rice":{ unit:"kg", category:"Grains & Pasta" },
  "pasta":{ unit:"packs", category:"Grains & Pasta" }, "eggs":{ unit:"pcs", category:"Dairy" },
  "bread":{ unit:"loaves", category:"Bakery" }, "butter":{ unit:"packs", category:"Dairy" },
  "yogurt":{ unit:"cups", category:"Dairy" }, "juice":{ unit:"bottles", category:"Beverages" },
  "diapers":{ unit:"pcs", category:"Baby" }, "formula":{ unit:"cans", category:"Baby" },
  "spinach":{ unit:"bags", category:"Produce" }, "oil":{ unit:"bottles", category:"Condiments" },
};

// ── Helpers ───────────────────────────────────────────────────
const stockLevel = (qty, reorder) => qty <= 0 ? "out" : qty <= reorder ? "low" : "good";
const SC = { out:"#ef4444", low:"#f97316", good:"#22c55e" };
const SB = { out:"#fef2f2", low:"#fff7ed", good:"#f0fdf4" };
const SBo = { out:"#fecaca", low:"#fde68a", good:"#bbf7d0" };
const ST = { out:"#991b1b", low:"#92400e", good:"#15803d" };
const SL = { out:"Out", low:"Low", good:"OK" };

const isExpiringSoon = (e) => e && (new Date(e) - new Date()) / 86400000 <= 7;

function getSmartUnit(name) {
  const l = name.toLowerCase().trim();
  for (const [k, u] of Object.entries(HOUSEHOLD_UNITS)) {
    if (k.toLowerCase() === l) return { unit: u, source: "household" };
  }
  for (const [k, d] of Object.entries(PRODUCT_DEFAULTS)) {
    if (l.includes(k)) return { unit: d.unit, source: "global", category: d.category };
  }
  return { unit: "pcs", source: "fallback" };
}

function genId() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

// ── Styles ────────────────────────────────────────────────────
const S = {
  btn: (bg, color="white", off=false) => ({ width:"100%", background:off?"#e5e7eb":bg, color:off?"#9ca3af":color, border:"none", borderRadius:16, padding:"16px", fontSize:15, fontWeight:700, cursor:off?"not-allowed":"pointer" }),
  outline: { width:"100%", background:"transparent", color:"#6b7280", border:"2px solid #e5e7eb", borderRadius:16, padding:"14px", fontSize:14, fontWeight:600, cursor:"pointer" },
  input: { width:"100%", background:"white", border:"2px solid #f0ede8", borderRadius:13, padding:"12px 14px", fontSize:14, fontWeight:600, outline:"none", boxSizing:"border-box", fontFamily:"'DM Sans',sans-serif", color:"#1e1b18" },
  label: { fontSize:11, fontWeight:700, color:"#9ca3af", letterSpacing:"0.07em", textTransform:"uppercase", display:"block", marginBottom:6 },
  card: { background:"white", borderRadius:18, padding:"14px", boxShadow:"0 2px 8px rgba(0,0,0,0.05)", marginBottom:10 },
  back: { color:"#d97706", fontSize:22, cursor:"pointer", background:"none", border:"none", padding:0, marginRight:8, lineHeight:1 },
  gap: (n=10) => ({ display:"flex", flexDirection:"column", gap:n }),
  dh: (bg="#1e1b18") => ({ background:bg, padding:"16px 18px 18px", color:"white" }),
  content: { padding:"14px 14px 100px", color:"#1e1b18" },
  row: { display:"flex", gap:8, alignItems:"center" },
};

// ══════════════════════════════════════════════════════════════
// ─── AUTH SCREEN ─────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("welcome"); // welcome | login | signup
  const [name, setName] = useState("");
  const [partner, setPartner] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) return;
    setLoading(true); setError("");
    if (IS_DEMO) {
      // Demo mode — skip Firebase, go straight in
      onAuth({ uid: "demo-user", email, displayName: name }, { name, partner, householdId: "demo-household", isNew: true });
      return;
    }
    try {
      const fb = await getFirebase();
      const cred = await fb.createUserWithEmailAndPassword(fb.auth, email, password);
      const householdId = genId();
      // Create user doc
      await fb.setDoc(fb.doc(fb.db, "users", cred.user.uid), {
        name, partner, email, householdId, createdAt: fb.serverTimestamp(),
      });
      // Create household doc with default spaces
      await fb.setDoc(fb.doc(fb.db, "households", householdId), {
        name: `${name}'s Home`, members: [cred.user.uid], memberNames: { [cred.user.uid]: name },
        partnerName: partner, spaces: DEFAULT_SPACES, createdAt: fb.serverTimestamp(),
      });
      onAuth(cred.user, { name, partner, householdId, isNew: true });
    } catch (e) { setError(e.message); setLoading(false); }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true); setError("");
    if (IS_DEMO) {
      onAuth({ uid: "demo-user", email }, { name: "Nithin", partner: "Swetha", householdId: "demo-household", isNew: false });
      return;
    }
    try {
      const fb = await getFirebase();
      const cred = await fb.signInWithEmailAndPassword(fb.auth, email, password);
      const userDoc = await fb.getDoc(fb.doc(fb.db, "users", cred.user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        onAuth(cred.user, { ...data, isNew: false });
      }
    } catch (e) { setError(e.message.replace("Firebase: ", "")); setLoading(false); }
  };

  // Welcome
  if (mode === "welcome") return (
    <div style={{ minHeight:680, background:"#1e1b18", display:"flex", flexDirection:"column", justifyContent:"space-between", padding:"48px 24px 40px" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:72, marginBottom:20 }}>🥫</div>
        <h1 style={{ fontSize:36, fontWeight:800, margin:"0 0 12px", letterSpacing:"-1.5px", color:"white", lineHeight:1.1 }}>pantri</h1>
        <p style={{ fontSize:14, color:"#9ca3af", lineHeight:1.6, margin:0 }}>Smart pantry management for busy couples — know what you have, where it is, when to restock.</p>
      </div>
      <div style={S.gap(10)}>
        {IS_DEMO && (
          <div style={{ background:"rgba(217,119,6,0.15)", borderRadius:13, padding:"11px 14px", border:"1px solid rgba(217,119,6,0.3)" }}>
            <p style={{ margin:0, fontSize:12, color:"#fcd34d", fontWeight:600 }}>🔧 Demo Mode — Firebase config not set yet. App works with local data.</p>
          </div>
        )}
        <button style={S.btn("#d97706")} onClick={() => setMode("signup")}>Create Account →</button>
        <button style={{ ...S.outline, color:"white", borderColor:"rgba(255,255,255,0.2)" }} onClick={() => setMode("login")}>I already have an account</button>
        {IS_DEMO && <button style={{ ...S.outline, color:"#9ca3af", borderColor:"rgba(255,255,255,0.1)" }} onClick={() => onAuth({ uid:"demo" }, { name:"Nithin", partner:"Swetha", householdId:"demo", isNew:false })}>Explore Demo →</button>}
      </div>
    </div>
  );

  // Signup
  if (mode === "signup") return (
    <div style={{ minHeight:680, background:"#faf9f7", padding:"28px 24px" }}>
      <div style={{ display:"flex", alignItems:"center", marginBottom:24 }}>
        <button style={S.back} onClick={() => setMode("welcome")}>‹</button>
        <div>
          <h2 style={{ fontSize:24, fontWeight:800, margin:0, color:"#1e1b18" }}>Create Account</h2>
          <p style={{ fontSize:12, color:"#9ca3af", margin:0 }}>Set up your household pantry</p>
        </div>
      </div>
      <div style={S.gap(14)}>
        <div style={S.card}>
          <div style={S.gap(12)}>
            <div><label style={S.label}>Your Name</label><input style={S.input} placeholder="e.g. Nithin" value={name} onChange={e=>setName(e.target.value)} autoFocus /></div>
            <div><label style={S.label}>Partner's Name (optional)</label><input style={S.input} placeholder="e.g. Swetha" value={partner} onChange={e=>setPartner(e.target.value)} /></div>
          </div>
        </div>
        <div style={S.card}>
          <div style={S.gap(12)}>
            <div><label style={S.label}>Email</label><input style={S.input} type="email" placeholder="your@email.com" value={email} onChange={e=>setEmail(e.target.value)} /></div>
            <div><label style={S.label}>Password</label><input style={S.input} type="password" placeholder="Min 6 characters" value={password} onChange={e=>setPassword(e.target.value)} /></div>
          </div>
        </div>
        {error && <div style={{ background:"#fef2f2", borderRadius:12, padding:"11px 13px", border:"1px solid #fecaca" }}><p style={{ margin:0, fontSize:12, color:"#991b1b", fontWeight:600 }}>⚠️ {error}</p></div>}
        <button style={S.btn(name&&email&&password?"#1e1b18":"#e5e7eb","white",!(name&&email&&password)||loading)} disabled={!(name&&email&&password)||loading} onClick={handleSignup}>
          {loading ? "Creating account..." : "Create My Pantri →"}
        </button>
        <p style={{ textAlign:"center", fontSize:12, color:"#9ca3af", margin:0 }}>Already have an account? <span onClick={()=>setMode("login")} style={{ color:"#d97706", fontWeight:700, cursor:"pointer" }}>Sign in</span></p>
      </div>
    </div>
  );

  // Login
  return (
    <div style={{ minHeight:680, background:"#faf9f7", padding:"28px 24px" }}>
      <div style={{ display:"flex", alignItems:"center", marginBottom:24 }}>
        <button style={S.back} onClick={() => setMode("welcome")}>‹</button>
        <div>
          <h2 style={{ fontSize:24, fontWeight:800, margin:0, color:"#1e1b18" }}>Welcome Back</h2>
          <p style={{ fontSize:12, color:"#9ca3af", margin:0 }}>Sign in to your pantry</p>
        </div>
      </div>
      <div style={S.gap(14)}>
        <div style={S.card}>
          <div style={S.gap(12)}>
            <div><label style={S.label}>Email</label><input style={S.input} type="email" placeholder="your@email.com" value={email} onChange={e=>setEmail(e.target.value)} autoFocus /></div>
            <div><label style={S.label}>Password</label><input style={S.input} type="password" placeholder="Your password" value={password} onChange={e=>setPassword(e.target.value)} /></div>
          </div>
        </div>
        {error && <div style={{ background:"#fef2f2", borderRadius:12, padding:"11px 13px", border:"1px solid #fecaca" }}><p style={{ margin:0, fontSize:12, color:"#991b1b", fontWeight:600 }}>⚠️ {error}</p></div>}
        <button style={S.btn(email&&password?"#1e1b18":"#e5e7eb","white",!(email&&password)||loading)} disabled={!(email&&password)||loading} onClick={handleLogin}>
          {loading ? "Signing in..." : "Sign In →"}
        </button>
        <p style={{ textAlign:"center", fontSize:12, color:"#9ca3af", margin:0 }}>No account? <span onClick={()=>setMode("signup")} style={{ color:"#d97706", fontWeight:700, cursor:"pointer" }}>Create one</span></p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ─── FIREBASE DATA HOOK ───────────────────────────────────────
// ══════════════════════════════════════════════════════════════
function usePantriData(householdId) {
  const [inventory, setInventory] = useState([]);
  const [history, setHistory] = useState([]);
  const [spaces, setSpaces] = useState(DEFAULT_SPACES);

  const [loading, setLoading] = useState(true);
  const unsubRef = useRef([]);

  useEffect(() => {
    if (!householdId) return;

    if (IS_DEMO || householdId === "demo" || householdId === "demo-household") {
      // Demo mode — use local state only
      setInventory(DEMO_INVENTORY);
      setHistory(DEMO_HISTORY);
      setSpaces(DEFAULT_SPACES);
      setLoading(false);
      return;
    }

    let mounted = true;
    (async () => {
      const fb = await getFirebase();

      // Load spaces from household doc
      const hDoc = await fb.getDoc(fb.doc(fb.db, "households", householdId));
      if (hDoc.exists() && mounted) {
        const data = hDoc.data();
        if (data.spaces) {
          const spacesWithPhotos = data.spaces.map(s => ({
            color: "#fff8f0", accent: "#d97706", icon: "📦", shelves: [], ...s,
            photo: localStorage.getItem("pantri_space_photo_" + s.id) || null,
            shelves: (s.shelves || []).map(sh => ({
              shelfColor: "#d97706", ...sh,
              photo: localStorage.getItem("pantri_shelf_photo_" + s.id + "_" + sh.id) || null,
            }))
          }));
          setSpaces(spacesWithPhotos);
        }
      }

      // Real-time listener for inventory
      const invQ = fb.query(
        fb.collection(fb.db, "households", householdId, "inventory"),
        fb.orderBy("name")
      );
      const unsubInv = fb.onSnapshot(invQ, snap => {
        if (mounted) setInventory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      // Real-time listener for history
      const histQ = fb.query(
        fb.collection(fb.db, "households", householdId, "history"),
        fb.orderBy("time", "desc")
      );
      const unsubHist = fb.onSnapshot(histQ, snap => {
        if (mounted) {
          setHistory(snap.docs.map(d => ({ id: d.id, ...d.data(), time: d.data().time?.toDate?.() || new Date() })));
          setLoading(false);
        }
      });

      unsubRef.current = [unsubInv, unsubHist];
    })();

    return () => { mounted = false; unsubRef.current.forEach(u => u()); };
  }, [householdId]);

  // ── Write operations ──────────────────────────────────────
  const addItem = async (item) => {
    if (IS_DEMO || householdId === "demo" || householdId === "demo-household") {
      setInventory(prev => [...prev, { ...item, id: genId() }]); return;
    }
    const fb = await getFirebase();
    await fb.addDoc(fb.collection(fb.db, "households", householdId, "inventory"), {
      ...item, createdAt: fb.serverTimestamp(),
    });
  };

  const updateItem = async (id, updates) => {
    if (IS_DEMO || householdId === "demo" || householdId === "demo-household") {
      setInventory(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i)); return;
    }
    const fb = await getFirebase();
    await fb.updateDoc(fb.doc(fb.db, "households", householdId, "inventory", id), updates);
  };

  const logUsage = async (entry) => {
    if (IS_DEMO || householdId === "demo" || householdId === "demo-household") {
      setHistory(prev => [{ ...entry, id: genId(), time: new Date() }, ...prev]); return;
    }
    const fb = await getFirebase();
    await fb.addDoc(fb.collection(fb.db, "households", householdId, "history"), {
      ...entry, time: fb.serverTimestamp(),
    });
  };

  const deleteItem = async (id) => {
    if (IS_DEMO || householdId === "demo" || householdId === "demo-household") {
      setInventory(prev => prev.filter(i => i.id !== id)); return;
    }
    const fb = await getFirebase();
    await fb.deleteDoc(fb.doc(fb.db, "households", householdId, "inventory", id));
  };

  return { inventory, history, spaces, setSpaces, loading, addItem, updateItem, deleteItem, logUsage };
}

// ── Demo data (used in demo mode) ─────────────────────────────
const DEMO_INVENTORY = [
  { id:"1", name:"Basmati Rice", brand:"Royal", category:"Grains & Pasta", qty:4, unit:"kg", reorder:1, spaceId:"s1", shelfId:"A1", emoji:"🍚", expiry:"2026-12" },
  { id:"2", name:"Pasta", brand:"Barilla", category:"Grains & Pasta", qty:3, unit:"packs", reorder:2, spaceId:"s1", shelfId:"A1", emoji:"🍝", expiry:"2026-08" },
  { id:"3", name:"Tomato Sauce", brand:"Heinz", category:"Canned Goods", qty:1, unit:"cans", reorder:2, spaceId:"s1", shelfId:"A2", emoji:"🍅", expiry:"2026-06" },
  { id:"4", name:"Milk", brand:"Horizon", category:"Dairy", qty:1, unit:"gallons", reorder:1, spaceId:"s2", shelfId:"F1", emoji:"🥛", expiry:"2026-03-10" },
  { id:"5", name:"Spinach", brand:"Generic", category:"Produce", qty:1, unit:"bags", reorder:1, spaceId:"s2", shelfId:"F3", emoji:"🥬", expiry:"2026-03-09" },
  { id:"6", name:"Diapers (Size 2)", brand:"Pampers", category:"Baby", qty:8, unit:"pcs", reorder:20, spaceId:"s3", shelfId:"B2", emoji:"🧷", expiry:null },
  { id:"7", name:"Baby Formula", brand:"Similac", category:"Baby", qty:2, unit:"cans", reorder:2, spaceId:"s3", shelfId:"B1", emoji:"🍼", expiry:"2026-09" },
  { id:"8", name:"Olive Oil", brand:"Kirkland", category:"Condiments", qty:1, unit:"bottles", reorder:1, spaceId:"s1", shelfId:"A3", emoji:"🫒", expiry:null },
];
const DEMO_HISTORY = [
  { id:"h1", item:"Milk", qty:1, unit:"gallons", time:new Date(Date.now()-5*86400000) },
  { id:"h2", item:"Pasta", qty:1, unit:"packs", time:new Date(Date.now()-7*86400000) },
  { id:"h3", item:"Milk", qty:1, unit:"gallons", time:new Date(Date.now()-10*86400000) },
  { id:"h4", item:"Diapers (Size 2)", qty:4, unit:"pcs", time:new Date(Date.now()-2*86400000) },
  { id:"h5", item:"Spinach", qty:1, unit:"bags", time:new Date(Date.now()-3*86400000) },
];

// ── Shelf visual ───────────────────────────────────────────────
function ShelfPhoto({ shelf, space, size="sm", refreshKey=0 }) {
  const h = size==="lg"?160:size==="md"?100:56;
  const bg = shelf?.shelfColor || space?.accent || "#6b7280";
  // Read photo from localStorage directly — most reliable source
  const photoKey = space?.id && shelf?.id ? "pantri_shelf_photo_" + space.id + "_" + shelf.id : null;
  const photo = shelf?.photo || (photoKey ? localStorage.getItem(photoKey) : null);
  if (photo) {
    return (
      <div style={{ width:"100%", height:h, borderRadius:size==="lg"?16:12, overflow:"hidden", position:"relative", flexShrink:0 }}>
        <img src={photo} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt={shelf?.name} />
        <div style={{ position:"absolute", top:6, right:6, background:"rgba(0,0,0,0.45)", borderRadius:6, padding:"2px 7px" }}><span style={{ color:"white", fontSize:10, fontWeight:800 }}>{shelf?.id}</span></div>
        <div style={{ position:"absolute", bottom:0, left:0, right:0, background:"linear-gradient(transparent,rgba(0,0,0,0.55))", padding:"16px 9px 7px" }}>
          <span style={{ fontSize:10, fontWeight:700, color:"white" }}>{shelf?.name}</span>
        </div>
      </div>
    );
  }
  // Gradient placeholder
  return (
    <div style={{ width:"100%", height:h, borderRadius:size==="lg"?16:12, background:`linear-gradient(135deg,${bg}dd,${bg}88)`, display:"flex", flexDirection:"column", alignItems:"flex-start", justifyContent:"flex-end", padding:"7px 9px", position:"relative", overflow:"hidden", flexShrink:0 }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, bottom:0, background:"repeating-linear-gradient(0deg,transparent,transparent 18px,rgba(255,255,255,0.06) 18px,rgba(255,255,255,0.06) 20px)" }} />
      <div style={{ position:"absolute", top:7, right:7, background:"rgba(0,0,0,0.3)", borderRadius:6, padding:"2px 7px" }}><span style={{ color:"white", fontSize:10, fontWeight:800 }}>{shelf?.id}</span></div>
      <div style={{ position:"absolute", bottom:7, left:9 }}>
        <span style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.9)" }}>{shelf?.name}</span>
      </div>
      <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", textAlign:"center", opacity:0.4 }}>
        <div style={{ fontSize:size==="sm"?14:20 }}>📷</div>
        {size!=="sm" && <p style={{ margin:"3px 0 0", fontSize:9, color:"white", fontWeight:600 }}>Add photo</p>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ─── MAIN APP ─────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════
export default function PantriApp() {
  const [user, setUser] = useState(null);
  const [userMeta, setUserMeta] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [checkedShop, setCheckedShop] = useState({});
  const [showSearch, setShowSearch] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Sub-screens
  const [spaceScreen, setSpaceScreen] = useState("list");
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [addScreen, setAddScreen] = useState("choose");
  const [addItem, setAddItem] = useState(blankItem());
  const [addMeta, setAddMeta] = useState(blankMeta());
  const [usedScreen, setUsedScreen] = useState("list");
  const [usedSearch, setUsedSearch] = useState("");
  const [usedCat, setUsedCat] = useState("All");
  const [selConsume, setSelConsume] = useState(null);
  const [consumeQty, setConsumeQty] = useState(1);
  const [mealItems, setMealItems] = useState({});
  const [selMeal, setSelMeal] = useState(null);
  const [justSaved, setJustSaved] = useState(null);
  const photoRef = useRef();

  function blankItem() { return { name:"", brand:"", category:"", qty:1, unit:"pcs", reorder:1, expiry:"", emoji:"📦", imagePreview:null }; }
  function blankMeta() { return { unitSource:null, existingStock:null, unitMismatch:null, selSpace:null, selShelf:null, scanning:false, scanDone:false, aiResult:null }; }

  const { inventory, history, spaces, setSpaces, loading, addItem: saveItem, updateItem, deleteItem: removeItem, logUsage } = usePantriData(userMeta?.householdId);
  const [photoVersion, setPhotoVersion] = useState(0);
  const [showItemsList, setShowItemsList] = useState(false);
  const [editingSpace, setEditingSpace] = useState(null);
  const [editingShelf, setEditingShelf] = useState(null);
  const [showAddSpace, setShowAddSpace] = useState(false);
  const [showAddShelf, setShowAddShelf] = useState(null);
  const [newSpaceName, setNewSpaceName] = useState("");
  const [newSpaceIcon, setNewSpaceIcon] = useState("📦");
  const [newShelfName, setNewShelfName] = useState("");
  const [newShelfId, setNewShelfId] = useState("");

  // ── Edit item state ─────────────────────────────────────
  const [editingItem, setEditingItem] = useState(null);

  // ── Onboarding state ──────────────────────────────────────
  const [onboarded, setOnboarded] = useState(true); // assume true, update after auth
  const [dismissedHints, setDismissedHints] = useState({});

  // ── Check Firebase auth state on mount ──────────────────────
  useEffect(() => {
    if (IS_DEMO) { setAuthChecked(true); return; }
    getFirebase().then(fb => {
      fb.onAuthStateChanged(fb.auth, async (firebaseUser) => {
        if (firebaseUser) {
          const userDoc = await fb.getDoc(fb.doc(fb.db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            setUser(firebaseUser);
            setUserMeta(userDoc.data());
            // Restore onboarding state
            const uid = firebaseUser.uid;
            setOnboarded(!!localStorage.getItem("pantri_onboarded_" + uid));
            const hints = {};
            ["home","spaces","add","used","insights"].forEach(tab => {
              if (localStorage.getItem("pantri_hint_" + tab + "_" + uid)) hints[tab] = true;
            });
            setDismissedHints(hints);
          }
        }
        setAuthChecked(true);
      });
    });
  }, []);

  const handleAuth = (firebaseUser, meta) => {
    setUser(firebaseUser);
    setUserMeta(meta);
    // Check onboarding status
    const uid = firebaseUser.uid || "demo";
    const alreadyOnboarded = localStorage.getItem("pantri_onboarded_" + uid);
    setOnboarded(!!alreadyOnboarded);
    // Load dismissed hints
    const hints = {};
    ["home","spaces","add","used","insights"].forEach(tab => {
      if (localStorage.getItem("pantri_hint_" + tab + "_" + uid)) hints[tab] = true;
    });
    setDismissedHints(hints);
  };

  const handleSignOut = async () => {
    if (!IS_DEMO) {
      const fb = await getFirebase();
      await fb.signOut(fb.auth);
    }
    setUser(null); setUserMeta(null);
  };

  const resetAdd = () => { setAddScreen("choose"); setAddItem(blankItem()); setAddMeta(blankMeta()); };

  const completeOnboarding = () => {
    const uid = user?.uid || "demo";
    localStorage.setItem("pantri_onboarded_" + uid, "1");
    setOnboarded(true);
  };

  const dismissHint = (tab) => {
    const uid = user?.uid || "demo";
    localStorage.setItem("pantri_hint_" + tab + "_" + uid, "1");
    setDismissedHints(prev => ({ ...prev, [tab]: true }));
  };

  // Derived
  const shoppingList = inventory.filter(i => stockLevel(i.qty, i.reorder) !== "good");
  const expiringItems = inventory.filter(i => isExpiringSoon(i.expiry));
  const babyItems = inventory.filter(i => i.category === "Baby");
  const getSpace = (id) => spaces.find(s => s.id === id);
  const getShelf = (spaceId, shelfId) => spaces.find(s => s.id === spaceId)?.shelves.find(sh => sh.id === shelfId);

  // ── Item operations ────────────────────────────────────────
  const resolveIntelligence = (name, overrideUnit=null) => {
    const smart = getSmartUnit(name);
    const resolvedUnit = overrideUnit || smart.unit;
    const existing = inventory.find(i => i.name.toLowerCase() === name.toLowerCase());
    setAddMeta(m => ({ ...m, unitSource: smart.source }));
    if (existing) {
      if (existing.unit !== resolvedUnit) {
        setAddMeta(m => ({ ...m, unitMismatch:{ oldUnit:existing.unit, newUnit:resolvedUnit, existing }, existingStock:existing }));
        setAddItem(p => ({ ...p, unit:resolvedUnit }));
        setAddScreen("unit_mismatch");
      } else {
        setAddMeta(m => ({ ...m, existingStock:existing }));
        setAddItem(p => ({ ...p, unit:resolvedUnit }));
        setAddScreen("stock_add_confirm");
      }
    } else {
      setAddItem(p => ({ ...p, unit:resolvedUnit, category:smart.category||p.category }));
      setAddScreen("select_location");
    }
  };

  const handlePhotoCapture = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result.split(",")[1];
      setAddItem(p => ({ ...p, imagePreview:ev.target.result }));
      setAddScreen("ai_analyzing");
      try {
        const res = await fetch("/api/analyze", {
          method:"POST", headers:{ "Content-Type":"application/json" },
          body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:1000,
            messages:[{ role:"user", content:[
              { type:"image", source:{ type:"base64", media_type:file.type, data:base64 } },
              { type:"text", text:`Analyze this product. Return ONLY JSON no markdown:\n{"name":"product name","brand":"brand or empty","category":"one of: ${CATEGORIES.join(",")}","suggestedUnit":"one of: ${UNITS.join(" ")}","confidence":"high or medium or low","emoji":"single emoji"}` }
            ]}]
          })
        });
        const data = await res.json();
        const text = data.content?.find(b=>b.type==="text")?.text||"{}";
        const parsed = JSON.parse(text.replace(/```json|```/g,"").trim());
        setAddMeta(m => ({ ...m, aiResult:parsed }));
        setAddItem(p => ({ ...p, name:parsed.name||"", brand:parsed.brand||"", category:parsed.category||"", unit:parsed.suggestedUnit||"pcs", emoji:parsed.emoji||"📦" }));
      } catch(e) {
        console.error("AI analysis failed:", e);
        setAddMeta(m => ({ ...m, aiError: "Could not analyze photo. You can fill details manually." }));
      }
      setAddScreen("review_details");
    };
    reader.readAsDataURL(file);
  };

  const scannerRef = useRef(null);
  const scannerContainerId = "barcode-scanner-container";

  const startScan = async () => {
    setAddMeta(m => ({ ...m, scanning:true, scanError:null }));
    try {
      if (!window.Html5Qrcode) {
        await new Promise((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
          s.onload = resolve; s.onerror = reject;
          document.head.appendChild(s);
        });
      }
      const html5Qr = new window.Html5Qrcode(scannerContainerId);
      scannerRef.current = html5Qr;
      await html5Qr.start(
        { facingMode:"environment" },
        { fps:10, qrbox:{ width:250, height:150 }, aspectRatio:1.5 },
        async (decodedText) => {
          // Barcode detected — stop scanner
          await html5Qr.stop().catch(() => {});
          scannerRef.current = null;
          setAddMeta(m => ({ ...m, scanning:false, scanDone:true }));
          // Try multiple sources to identify the product
          let found = false;
          // 1. Open Food Facts
          try {
            const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${decodedText}.json`);
            const data = await res.json();
            if (data.status === 1 && data.product && data.product.product_name) {
              const p = data.product;
              const cat = (p.categories_tags||[])[0]?.replace("en:","").replace(/-/g," ") || "";
              const matchedCat = CATEGORIES.find(c => cat.toLowerCase().includes(c.toLowerCase().split(" ")[0])) || "";
              setAddItem(prev => ({ ...prev, name:p.product_name, brand:p.brands||"", category:matchedCat, emoji:"🛒" }));
              found = true;
            }
          } catch {}
          // 2. AI fallback — ask Claude to identify the barcode
          if (!found) {
            try {
              const res = await fetch("/api/analyze", {
                method:"POST", headers:{ "Content-Type":"application/json" },
                body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:500,
                  messages:[{ role:"user", content:[
                    { type:"text", text:`Barcode number: ${decodedText}. Identify this product. Return ONLY JSON no markdown:\n{"name":"product name","brand":"brand or empty","category":"one of: ${CATEGORIES.join(",")}","suggestedUnit":"one of: ${UNITS.join(" ")}","emoji":"single emoji"}\nIf you cannot identify it, set name to empty string.` }
                  ]}]
                })
              });
              const data = await res.json();
              const text = data.content?.find(b=>b.type==="text")?.text||"{}";
              const parsed = JSON.parse(text.replace(/```json|```/g,"").trim());
              if (parsed.name) {
                setAddItem(prev => ({ ...prev, name:parsed.name, brand:parsed.brand||"", category:parsed.category||"", unit:parsed.suggestedUnit||"pcs", emoji:parsed.emoji||"🛒" }));
                setAddMeta(m => ({ ...m, aiResult:parsed }));
                found = true;
              }
            } catch {}
          }
          // 3. Last resort — show barcode number and let user fill manually
          if (!found) {
            setAddItem(prev => ({ ...prev, name:"", brand:"", emoji:"📊" }));
            setAddMeta(m => ({ ...m, aiError:`Scanned barcode: ${decodedText}. Could not identify product — please enter details manually.` }));
          }
          setTimeout(() => setAddScreen("review_details"), 600);
        },
      );
    } catch (e) {
      console.error("Barcode scanner error:", e);
      setAddMeta(m => ({ ...m, scanning:false, scanError:"Camera access denied or unavailable. Try entering manually." }));
    }
  };

  const stopScan = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    setAddMeta(m => ({ ...m, scanning:false }));
  };

  const handleSaveNewItem = async () => {
    const { selSpace, selShelf, existingStock } = addMeta;
    if (existingStock) {
      await updateItem(existingStock.id, { qty: existingStock.qty + addItem.qty });
    } else {
      const { imagePreview, ...itemToSave } = addItem;
      await saveItem({ ...itemToSave, spaceId:selSpace?.id, shelfId:selShelf?.id });
    }
    setJustSaved({ name:addItem.name, existingStock });
    setAddScreen("saved");
  };

  const confirmQuickUse = async () => {
    const newQty = Math.max(0, selConsume.qty - consumeQty);
    const level = stockLevel(newQty, selConsume.reorder);
    await updateItem(selConsume.id, { qty: newQty });
    await logUsage({ item:selConsume.name, qty:consumeQty, unit:selConsume.unit, addedToCart:level!=="good" });
    setJustSaved({ name:selConsume.name, newQty, unit:selConsume.unit, level });
    setUsedScreen("done");
  };

  const confirmMealUse = async () => {
    const deductions = Object.entries(mealItems).filter(([,q])=>q>0);
    for (const [id, qty] of deductions) {
      const item = inventory.find(i=>i.id===id);
      if (!item) continue;
      await updateItem(id, { qty: Math.max(0, item.qty - qty) });
      await logUsage({ item:item.name, qty, unit:item.unit, meal:selMeal?.name||"Custom Meal", addedToCart:false });
    }
    setJustSaved({ meal:true, count:deductions.length, mealName:selMeal?.name||"Custom Meal" });
    setUsedScreen("done");
  };

  // ── Loading / Auth gates ───────────────────────────────────
  if (!authChecked) return (
    <Wrapper><div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:680, flexDirection:"column", gap:16 }}>
      <div style={{ width:48, height:48, border:"5px solid #d97706", borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.9s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <p style={{ color:"#6b7280", fontSize:14, fontWeight:600, margin:0 }}>Loading pantri...</p>
    </div></Wrapper>
  );

  if (!user || !userMeta) return <Wrapper><AuthScreen onAuth={handleAuth} /></Wrapper>;
  if (loading) return (
    <Wrapper><div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:680, flexDirection:"column", gap:16 }}>
      <div style={{ width:48, height:48, border:"5px solid #d97706", borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.9s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <p style={{ color:"#6b7280", fontSize:14, fontWeight:600, margin:0 }}>Loading your pantry...</p>
    </div></Wrapper>
  );

  // ── Onboarding carousel for first-time users ──────────────
  if (!onboarded) return (
    <Wrapper><OnboardingCarousel onComplete={completeOnboarding} /></Wrapper>
  );

  // ─── NAV BAR ────────────────────────────────────────────────
  const NavBar = () => (
    <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"white", borderTop:"1px solid #f0ede8", display:"flex", justifyContent:"space-around", padding:"10px 0 env(safe-area-inset-bottom, 20px)", boxShadow:"0 -4px 20px rgba(0,0,0,0.08)", zIndex:100 }}>
      {[
        { id:"home", icon:"🏠", label:"Home" },
        { id:"spaces", icon:"🗄️", label:"Spaces" },
        { id:"add", icon:"➕", label:"Add" },
        { id:"used", icon:"📉", label:"Used" },
        { id:"insights", icon:"📊", label:"Insights" },
      ].map(nav => (
        <div key={nav.id} onClick={()=>{ setActiveTab(nav.id); if(nav.id==="spaces")setSpaceScreen("list"); if(nav.id==="add")resetAdd(); if(nav.id==="used")setUsedScreen("list"); }} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, cursor:"pointer", color:activeTab===nav.id?"#d97706":"#9ca3af" }}>
          <span style={{ fontSize:22 }}>{nav.icon}</span>
          <span style={{ fontSize:10, fontWeight:activeTab===nav.id?800:500, letterSpacing:"0.04em", textTransform:"uppercase" }}>{nav.label}</span>
        </div>
      ))}
    </div>
  );

  // ── Search Overlay ─────────────────────────────────────────
  const SearchOverlay = () => {
    const results = searchQuery.length > 1 ? inventory.filter(i =>
      i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (i.brand||"").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (i.category||"").toLowerCase().includes(searchQuery.toLowerCase())
    ) : [];
    return (
      <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.5)", zIndex:200, display:"flex", alignItems:"flex-start", justifyContent:"center" }}>
        <div style={{ width:"min(390px,100vw)", background:"#faf9f7", borderRadius:"0 0 28px 28px", maxHeight:"85vh", overflow:"auto" }}>
          <div style={{ background:"#1e1b18", padding:"16px 16px 12px" }}>
            <div style={{ display:"flex", gap:10, alignItems:"center", background:"rgba(255,255,255,0.12)", borderRadius:14, padding:"10px 14px" }}>
              <span>🔍</span>
              <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Search your pantry..." autoFocus style={{ background:"transparent", border:"none", outline:"none", color:"white", fontSize:15, fontWeight:500, flex:1, fontFamily:"'DM Sans',sans-serif" }} />
              <span onClick={()=>{ setShowSearch(false); setSearchQuery(""); }} style={{ color:"#9ca3af", cursor:"pointer", fontSize:20 }}>×</span>
            </div>
          </div>
          <div style={{ padding:"14px" }}>
            {searchQuery.length < 2 ? (
              <div style={{ textAlign:"center", padding:"40px 20px", color:"#9ca3af" }}>
                <div style={{ fontSize:40, marginBottom:10 }}>🔍</div>
                <p style={{ fontWeight:600, fontSize:14 }}>Search by name, brand or category</p>
              </div>
            ) : results.length === 0 ? (
              <div style={{ textAlign:"center", padding:"40px 20px", color:"#9ca3af" }}>
                <div style={{ fontSize:40, marginBottom:10 }}>😕</div>
                <p style={{ fontWeight:600, fontSize:14 }}>"{searchQuery}" not found</p>
                <p style={{ fontSize:12, margin:"4px 0 16px" }}>Not in your pantry yet</p>
                <button onClick={()=>{ setShowSearch(false); setSearchQuery(""); setAddItem(p=>({...p,name:searchQuery})); setActiveTab("add"); setAddScreen("manual"); }} style={S.btn("#d97706")}>+ Add "{searchQuery}"</button>
              </div>
            ) : results.map(item => {
              const space = getSpace(item.spaceId);
              const shelf = getShelf(item.spaceId, item.shelfId);
              const level = stockLevel(item.qty, item.reorder);
              return (
                <div key={item.id} style={{ background:"white", borderRadius:18, padding:"14px", marginBottom:10, boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>
                  <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:12 }}>
                    <div style={{ width:44, height:44, borderRadius:13, background:SB[level], display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>{item.emoji}</div>
                    <div style={{ flex:1 }}>
                      <p style={{ margin:0, fontWeight:800, fontSize:15 }}>{item.name}</p>
                      <p style={{ margin:0, fontSize:12, color:"#9ca3af" }}>{item.brand} · {item.category}</p>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <p style={{ margin:0, fontWeight:800, fontSize:18, color:SC[level] }}>{item.qty}</p>
                      <p style={{ margin:0, fontSize:11, color:"#9ca3af" }}>{item.unit}</p>
                    </div>
                  </div>
                  <div style={{ background:"#f9fafb", borderRadius:13, padding:"10px 12px" }}>
                    <p style={{ margin:"0 0 7px", fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase", letterSpacing:"0.06em" }}>📍 Where to find it</p>
                    <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                      <div style={{ width:80, flexShrink:0 }}><ShelfPhoto shelf={shelf} space={space} size="sm" refreshKey={photoVersion} /></div>
                      <div>
                        <p style={{ margin:"0 0 3px", fontWeight:800, fontSize:14 }}>{space?.name || "Unknown Space"}</p>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <span style={{ background:(space?.accent||"#6b7280")+"20", color:space?.accent||"#6b7280", fontSize:11, fontWeight:800, borderRadius:7, padding:"2px 9px" }}>{shelf?.id}</span>
                          <span style={{ fontSize:12, color:"#6b7280" }}>{shelf?.name}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ── Shop Overlay ───────────────────────────────────────────
  const ShopOverlay = () => (
    <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.5)", zIndex:200, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div style={{ width:"min(390px,100vw)", background:"#faf9f7", borderRadius:"28px 28px 0 0", maxHeight:"85vh", overflow:"auto" }}>
        <div style={{ background:"#1e1b18", padding:"16px 18px 18px", borderRadius:"28px 28px 0 0", color:"white", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div><h1 style={{ fontSize:20, fontWeight:800, margin:"0 0 2px" }}>Shopping List 🛒</h1><p style={{ color:"#9ca3af", margin:0, fontSize:12 }}>{shoppingList.length} items to restock</p></div>
          <span onClick={()=>setShowShop(false)} style={{ color:"#9ca3af", fontSize:22, cursor:"pointer" }}>×</span>
        </div>
        <div style={{ padding:"14px 14px 32px" }}>
          {shoppingList.length === 0 ? (
            <div style={{ textAlign:"center", padding:"40px 20px" }}>
              <div style={{ fontSize:48, marginBottom:10 }}>🎉</div>
              <p style={{ fontWeight:700, fontSize:16, margin:"0 0 4px" }}>All stocked up!</p>
            </div>
          ) : shoppingList.map((item, i) => {
            const level = stockLevel(item.qty, item.reorder);
            const checked = checkedShop[item.id];
            const needQty = Math.max(1, (item.reorder+1)-item.qty);
            return (
              <div key={item.id} style={{ background:"white", borderRadius:16, padding:"12px 14px", marginBottom:8, boxShadow:"0 2px 6px rgba(0,0,0,0.04)", opacity:checked?0.4:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                  <div onClick={()=>setCheckedShop(p=>({...p,[item.id]:!p[item.id]}))} style={{ width:22, height:22, borderRadius:7, border:`2px solid ${checked?"#16a34a":"#d1d5db"}`, background:checked?"#16a34a":"transparent", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 }}>
                    {checked&&<span style={{ color:"white", fontSize:12, fontWeight:800 }}>✓</span>}
                  </div>
                  <span style={{ fontSize:18 }}>{item.emoji}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                      <span style={{ fontWeight:700, fontSize:14, textDecoration:checked?"line-through":"none" }}>{item.name}</span>
                      {level==="out"&&<span style={{ background:"#fef2f2", color:"#ef4444", fontSize:9, fontWeight:800, borderRadius:5, padding:"2px 5px" }}>OUT</span>}
                    </div>
                    <p style={{ margin:0, fontSize:11, color:"#9ca3af" }}>{getSpace(item.spaceId)?.name} · {item.shelfId}</p>
                  </div>
                </div>
                <div style={{ display:"flex", gap:7 }}>
                  <div style={{ flex:1, background:SB[level], borderRadius:10, padding:"8px 10px", border:`1px solid ${SBo[level]}` }}>
                    <p style={{ margin:"0 0 1px", fontSize:9, fontWeight:700, color:"#9ca3af", textTransform:"uppercase" }}>Have</p>
                    <p style={{ margin:0, fontWeight:800, fontSize:15, color:SC[level] }}>{item.qty} <span style={{ fontSize:11, fontWeight:600 }}>{item.unit}</span></p>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", color:"#d1d5db", fontSize:16 }}>→</div>
                  <div style={{ flex:1, background:"#f0fdf4", borderRadius:10, padding:"8px 10px", border:"1px solid #bbf7d0" }}>
                    <p style={{ margin:"0 0 1px", fontSize:9, fontWeight:700, color:"#9ca3af", textTransform:"uppercase" }}>Buy</p>
                    <p style={{ margin:0, fontWeight:800, fontSize:15, color:"#16a34a" }}>{needQty}+ <span style={{ fontSize:11, fontWeight:600 }}>{item.unit}</span></p>
                  </div>
                  <div style={{ flex:1.2, background:"#f9fafb", borderRadius:10, padding:"8px 10px", border:"1px solid #f0ede8" }}>
                    <p style={{ margin:"0 0 1px", fontSize:9, fontWeight:700, color:"#9ca3af", textTransform:"uppercase" }}>Target</p>
                    <p style={{ margin:0, fontWeight:800, fontSize:15, color:"#374151" }}>{item.reorder+1} <span style={{ fontSize:11, fontWeight:600 }}>{item.unit}</span></p>
                  </div>
                </div>
              </div>
            );
          })}
          {shoppingList.length > 0 && <button onClick={async () => {
            const text = "🛒 Pantri Shopping List\n" + shoppingList.map(it => {
              const need = Math.max(1, (it.reorder+1) - it.qty);
              return `• ${it.name} — buy ${need}+ ${it.unit}`;
            }).join("\n");
            if (navigator.share) {
              try { await navigator.share({ title:"Pantri Shopping List", text }); } catch {}
            } else if (navigator.clipboard) {
              await navigator.clipboard.writeText(text);
              alert("Shopping list copied to clipboard!");
            } else {
              alert(text);
            }
          }} style={{ ...S.btn("#16a34a"), marginTop:4 }}>📤 Share with {userMeta.partner||"Partner"}</button>}
        </div>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════
  // ─── HOME TAB ───────────────────────────────────────────
  // ══════════════════════════════════════════════════════════
  const HomeTab = () => (
    <div>
      <div style={{ background:"#1e1b18", padding:"18px 18px 0", color:"white" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <div>
            <p style={{ fontSize:11, color:"#9ca3af", margin:0, textTransform:"uppercase", letterSpacing:"0.08em" }}>Good Evening</p>
            <h1 style={{ fontSize:22, fontWeight:800, margin:"3px 0 0", letterSpacing:"-0.5px" }}>{userMeta.name} {userMeta.partner?`& ${userMeta.partner}`:""} 👋</h1>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <div onClick={()=>setShowSearch(true)} style={{ width:38, height:38, borderRadius:12, background:"rgba(255,255,255,0.1)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>🔍</div>
            <div onClick={()=>setShowShop(true)} style={{ width:38, height:38, borderRadius:12, background:shoppingList.length>0?"#d97706":"rgba(255,255,255,0.1)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", position:"relative" }}>
              🛒
              {shoppingList.length>0&&<div style={{ position:"absolute", top:-4, right:-4, width:16, height:16, borderRadius:8, background:"#ef4444", display:"flex", alignItems:"center", justifyContent:"center" }}><span style={{ fontSize:9, color:"white", fontWeight:800 }}>{shoppingList.length}</span></div>}
            </div>
            <div onClick={handleSignOut} style={{ width:38, height:38, borderRadius:12, background:"rgba(255,255,255,0.1)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:16 }} title="Sign out">👤</div>
          </div>
        </div>
        {IS_DEMO && <div style={{ background:"rgba(217,119,6,0.15)", borderRadius:12, padding:"9px 13px", marginBottom:12, border:"1px solid rgba(217,119,6,0.3)" }}><p style={{ margin:0, fontSize:11, color:"#fcd34d", fontWeight:600 }}>🔧 Demo Mode — data resets on reload. Add Firebase config to persist.</p></div>}
        {(shoppingList.length>0||expiringItems.length>0) && (
          <div style={{ background:"rgba(217,119,6,0.15)", borderRadius:13, padding:"10px 13px", marginBottom:14, border:"1px solid rgba(217,119,6,0.3)" }}>
            {shoppingList.length>0&&<p style={{ margin:0, fontSize:12, fontWeight:600, color:"#fcd34d" }}>⚠️ {shoppingList.length} item{shoppingList.length>1?"s":""} need restocking</p>}
            {expiringItems.length>0&&<p style={{ margin:"2px 0 0", fontSize:11, color:"#fbbf24" }}>⏰ {expiringItems.length} expiring within 7 days</p>}
          </div>
        )}
      </div>
      <div style={S.content}>
        {!dismissedHints.home && <TabHint tab="home" onDismiss={() => dismissHint("home")} />}
        <div style={{ display:"flex", gap:8, marginBottom:14 }}>
          {[
            { label:"Items", value:inventory.length, icon:"📦", color:"#eff6ff", accent:"#2563eb", action:()=>setShowItemsList(true) },
            { label:"Low Stock", value:shoppingList.length, icon:"🔴", color:"#fff7ed", accent:"#ea580c", action:()=>setShowShop(true) },
            { label:"Expiring", value:expiringItems.length, icon:"⏰", color:"#fdf4ff", accent:"#9333ea", action:()=>setActiveTab("insights") },
          ].map((s,i)=>(
            <div key={i} onClick={s.action} style={{ flex:1, background:s.color, borderRadius:14, padding:"10px 6px", textAlign:"center", cursor:"pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", transition:"transform 0.1s" }}>
              <div style={{ fontSize:16, marginBottom:2 }}>{s.icon}</div>
              <div style={{ fontSize:20, fontWeight:800, color:s.accent }}>{s.value}</div>
              <div style={{ fontSize:9, color:"#6b7280", fontWeight:700, textTransform:"uppercase" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {babyItems.length>0&&(
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <h2 style={{ fontSize:14, fontWeight:800, margin:0 }}>🍼 Baby Supplies</h2>
              <span onClick={()=>{setSelectedSpace(spaces.find(s=>s.id==="s3"));setSpaceScreen("detail");setActiveTab("spaces");}} style={{ fontSize:12, color:"#9333ea", fontWeight:700, cursor:"pointer" }}>Manage →</span>
            </div>
            <div style={{ display:"flex", gap:8, marginBottom:14 }}>
              {babyItems.map(item=>{
                const level=stockLevel(item.qty,item.reorder);
                return(
                  <div key={item.id} onClick={() => setEditingItem(item)} style={{ flex:1, background:level!=="good"?SB[level]:"#fdf4ff", borderRadius:14, padding:"11px", border:`1.5px solid ${level!=="good"?SBo[level]:"#e9d5ff"}`, cursor:"pointer" }}>
                    <div style={{ fontSize:18, marginBottom:3 }}>{item.emoji}</div>
                    <p style={{ margin:"0 0 1px", fontWeight:700, fontSize:11, lineHeight:1.2 }}>{item.name}</p>
                    <p style={{ margin:0, fontWeight:800, fontSize:13, color:SC[level] }}>{item.qty} {item.unit}</p>
                    {level!=="good"&&<p style={{ margin:"2px 0 0", fontSize:9, color:SC[level], fontWeight:700 }}>⚠️ Reorder!</p>}
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <h2 style={{ fontSize:14, fontWeight:800, margin:0 }}>Your Spaces</h2>
          <span onClick={()=>setActiveTab("spaces")} style={{ fontSize:12, color:"#d97706", fontWeight:700, cursor:"pointer" }}>See All →</span>
        </div>
        {spaces.map(space=>{
          const items=inventory.filter(it=>it.spaceId===space.id);
          const low=items.filter(it=>stockLevel(it.qty,it.reorder)!=="good").length;
          return(
            <div key={space.id} onClick={()=>{setActiveTab("spaces");setSelectedSpace(space);setSpaceScreen("detail");}} style={{ background:space.color, borderRadius:16, padding:"12px 14px", marginBottom:8, cursor:"pointer", border:`1px solid ${space.accent}22` }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:40, height:40, borderRadius:12, background:space.accent+"18", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>{space.icon}</div>
                <div style={{ flex:1 }}>
                  <p style={{ margin:0, fontWeight:700, fontSize:14, color:"#1e1b18" }}>{space.name}</p>
                  <p style={{ margin:0, fontSize:11, color:"#6b7280" }}>{space.shelves.length} shelves · {items.length} items</p>
                </div>
                {low>0&&<span style={{ background:"#fff7ed", color:"#ea580c", fontSize:10, fontWeight:800, borderRadius:8, padding:"3px 8px" }}>{low} low</span>}
                <span style={{ fontSize:16, color:space.accent }}>›</span>
              </div>
            </div>
          );
        })}

        {expiringItems.length>0&&(
          <>
            <h2 style={{ fontSize:14, fontWeight:800, margin:"14px 0 8px" }}>Expiring Soon ⏰</h2>
            <div style={S.card}>
              {expiringItems.map((item,i)=>(
                <div key={item.id} onClick={() => setEditingItem(item)} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0", borderBottom:i<expiringItems.length-1?"1px solid #f5f5f4":"none", cursor:"pointer" }}>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <span style={{ fontSize:17 }}>{item.emoji}</span>
                    <div><p style={{ margin:0, fontWeight:600, fontSize:13 }}>{item.name}</p><p style={{ margin:0, fontSize:11, color:"#ef4444" }}>Exp {item.expiry}</p></div>
                  </div>
                  <span style={{ background:"#fef3c7", color:"#92400e", borderRadius:9, padding:"3px 9px", fontSize:11, fontWeight:700 }}>Use Now!</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <NavBar />
    </div>
  );

  // ══════════════════════════════════════════════════════════
  // ─── SPACES TAB ─────────────────────────────────────────
  // ══════════════════════════════════════════════════════════
  const SpacesTab = () => {

    const SPACE_ICONS = ["🗄️","🧊","🍼","🛒","🍷","🥫","🧴","🫙","🧺","🍳","🌿","📦"];
    const SHELF_COLORS = ["#d97706","#ea580c","#ca8a04","#059669","#0891b2","#0284c7","#9333ea","#a855f7","#ef4444","#6b7280"];

    // Save spaces back to Firestore household doc
    const saveSpaces = async (updatedSpaces) => {
      // Reattach any localStorage photos before setting state
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
      if (IS_DEMO || userMeta?.householdId === "demo" || userMeta?.householdId === "demo-household") {
        return;
      }
      try {
        const fb = await getFirebase();
        const spacesForFirestore = spacesWithPhotos.map(s => ({
          ...s, photo: null,
          shelves: s.shelves.map(sh => ({ ...sh, photo: null }))
        }));
        await fb.updateDoc(fb.doc(fb.db, "households", userMeta.householdId), { spaces: spacesForFirestore });
      } catch(err) {
        console.error("saveSpaces error:", err);
        alert("Save failed: " + err.message);
      }
    };

    const handleAddSpace = async (spaceName, spaceIcon) => {
      if (!spaceName.trim()) return;
      const id = "s" + Date.now();
      const accent = SHELF_COLORS[spaces.length % SHELF_COLORS.length];
      const newSpace = {
        id, name: spaceName.trim(), icon: spaceIcon || "📦",
        color: "#fff8f0", accent,
        shelves: [{ id: "A1", name: "Shelf 1", shelfColor: accent, items: "" }],
      };
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

    const inp = { width:"100%", background:"white", border:"2px solid #f0ede8", borderRadius:13, padding:"11px 13px", fontSize:14, fontWeight:600, outline:"none", boxSizing:"border-box", fontFamily:"'DM Sans',sans-serif", color:"#1e1b18" };
    const lbl = { fontSize:11, fontWeight:700, color:"#9ca3af", letterSpacing:"0.07em", textTransform:"uppercase", display:"block", marginBottom:5 };

    // ── Space detail screen ──────────────────────────────────
    if (spaceScreen === "detail" && selectedSpace) {
      const space = spaces.find(s => s.id === selectedSpace.id) || selectedSpace;
      if (!space || !space.shelves) return (
        <div>
          <div style={S.dh()}><button style={S.back} onClick={() => setSpaceScreen("list")}>‹</button><span style={{color:"white"}}>Back</span></div>
          <div style={{padding:20,textAlign:"center",color:"#ef4444"}}>Space data missing — tap back and re-open</div>
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
              <button onClick={() => setEditingSpace(space)} style={{ background:"rgba(255,255,255,0.1)", border:"none", borderRadius:10, padding:"6px 12px", color:"white", fontSize:11, fontWeight:700, cursor:"pointer" }}>✏️ Edit</button>
            </div>
          </div>

          {/* Edit Space Modal */}
          {editingSpace && (
            <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.5)", zIndex:300, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
              <div style={{ width:"min(390px,100vw)", background:"white", borderRadius:"28px 28px 0 0", padding:"24px 20px 36px", maxHeight:"90vh", overflowY:"auto" }}>
                <h2 style={{ fontSize:18, fontWeight:800, margin:"0 0 16px" }}>Edit Space</h2>

                {/* Space cover photo */}
                <div style={{ marginBottom:14 }}>
                  <label style={lbl}>Cover Photo (optional)</label>
                  <div style={{ position:"relative", height:100, borderRadius:14, overflow:"hidden", background:"#f3f4f6", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {editingSpace.photo
                      ? <img src={editingSpace.photo} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt="" />
                      : <div style={{ textAlign:"center", color:"#9ca3af" }}><div style={{ fontSize:28 }}>📷</div><p style={{ margin:"4px 0 0", fontSize:11, fontWeight:600 }}>No photo yet</p></div>
                    }
                    <label style={{ position:"absolute", bottom:8, right:8, background:"#1e1b18", color:"white", borderRadius:9, padding:"5px 11px", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                      📷 {editingSpace.photo ? "Change" : "Add Photo"}
                      <input type="file" accept="image/*" capture="environment" style={{ display:"none" }} onChange={async e => {
                        const file = e.target.files[0]; if (!file) return;
                        const compressed = await compressImage(file);
                        const key = "pantri_space_photo_" + editingSpace.id;
                        localStorage.setItem(key, compressed);
                        setEditingSpace(p => ({ ...p, photo: compressed }));
                      }} />
                    </label>
                  </div>
                  {editingSpace.photo && <button onClick={() => setEditingSpace(p => ({ ...p, photo: null }))} style={{ marginTop:5, background:"transparent", border:"none", color:"#ef4444", fontSize:11, fontWeight:700, cursor:"pointer", padding:0 }}>✕ Remove photo</button>}
                </div>

                <div style={{ marginBottom:12 }}>
                  <label style={lbl}>Space Name</label>
                  <input style={inp} value={editingSpace.name} onChange={e => setEditingSpace(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div style={{ marginBottom:16 }}>
                  <label style={lbl}>Icon</label>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    {SPACE_ICONS.map(icon => (
                      <div key={icon} onClick={() => setEditingSpace(p => ({ ...p, icon }))} style={{ width:40, height:40, borderRadius:11, background:editingSpace.icon===icon?"#1e1b18":"#f3f4f6", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, cursor:"pointer" }}>{icon}</div>
                    ))}
                  </div>
                </div>
                <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                  <button onClick={() => handleEditSpace(editingSpace.id, editingSpace.name, editingSpace.icon, editingSpace.photo)} style={{ flex:1, background:"#1e1b18", color:"white", border:"none", borderRadius:13, padding:"13px", fontWeight:700, cursor:"pointer" }}>Save Changes</button>
                  <button onClick={() => setEditingSpace(null)} style={{ flex:1, background:"#f3f4f6", color:"#374151", border:"none", borderRadius:13, padding:"13px", fontWeight:700, cursor:"pointer" }}>Cancel</button>
                </div>
                <button onClick={() => { if(window.confirm("Delete this space? Items inside won't be deleted.")) handleDeleteSpace(space.id); }} style={{ width:"100%", background:"#fef2f2", color:"#ef4444", border:"1px solid #fecaca", borderRadius:13, padding:"11px", fontWeight:700, cursor:"pointer" }}>🗑️ Delete Space</button>
              </div>
            </div>
          )}

          {/* Edit Shelf Modal */}
          {editingShelf && (
            <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.5)", zIndex:300, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
              <div style={{ width:"min(390px,100vw)", background:"white", borderRadius:"28px 28px 0 0", padding:"24px 20px 36px", maxHeight:"90vh", overflowY:"auto" }}>
                <h2 style={{ fontSize:18, fontWeight:800, margin:"0 0 16px" }}>Edit Shelf</h2>

                {/* Shelf photo */}
                <div style={{ marginBottom:14 }}>
                  <label style={lbl}>Shelf Photo</label>
                  <div style={{ position:"relative" }}>
                    <ShelfPhoto shelf={editingShelf.shelf} space={space} size="lg" refreshKey={photoVersion} />
                    <label style={{ position:"absolute", bottom:10, right:10, background:"#1e1b18", color:"white", borderRadius:10, padding:"6px 12px", fontSize:11, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>
                      📷 {editingShelf.shelf.photo ? "Change Photo" : "Add Photo"}
                      <input type="file" accept="image/*" capture="environment" style={{ display:"none" }} onChange={async e => {
                        const file = e.target.files[0]; if (!file) return;
                        const compressed = await compressImage(file);
                        const key = "pantri_shelf_photo_" + editingShelf.spaceId + "_" + editingShelf.shelf.id;
                        localStorage.setItem(key, compressed);
                        bumpPhotoRefresh();
                        setEditingShelf(p => ({ ...p, shelf: { ...p.shelf, photo: compressed } }));
                      }} />
                    </label>
                  </div>
                  {editingShelf.shelf.photo && (
                    <button onClick={() => setEditingShelf(p => ({ ...p, shelf: { ...p.shelf, photo: null } }))} style={{ marginTop:6, background:"transparent", border:"none", color:"#ef4444", fontSize:11, fontWeight:700, cursor:"pointer", padding:0 }}>✕ Remove photo</button>
                  )}
                </div>

                <div style={{ marginBottom:12 }}>
                  <label style={lbl}>Shelf Name</label>
                  <input style={inp} value={editingShelf.shelf.name} onChange={e => setEditingShelf(p => ({ ...p, shelf: { ...p.shelf, name: e.target.value } }))} />
                </div>
                <div style={{ marginBottom:16 }}>
                  <label style={lbl}>Color</label>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    {SHELF_COLORS.map(color => (
                      <div key={color} onClick={() => setEditingShelf(p => ({ ...p, shelf: { ...p.shelf, shelfColor: color } }))} style={{ width:32, height:32, borderRadius:9, background:color, border:editingShelf.shelf.shelfColor===color?"3px solid #1e1b18":"3px solid transparent", cursor:"pointer" }} />
                    ))}
                  </div>
                </div>
                <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                  <button onClick={() => handleEditShelf(editingShelf.spaceId, editingShelf.shelf.id, editingShelf.shelf.name, editingShelf.shelf.shelfColor, editingShelf.shelf.photo)} style={{ flex:1, background:"#1e1b18", color:"white", border:"none", borderRadius:13, padding:"13px", fontWeight:700, cursor:"pointer" }}>Save</button>
                  <button onClick={() => setEditingShelf(null)} style={{ flex:1, background:"#f3f4f6", color:"#374151", border:"none", borderRadius:13, padding:"13px", fontWeight:700, cursor:"pointer" }}>Cancel</button>
                </div>
                <button onClick={() => { handleDeleteShelf(editingShelf.spaceId, editingShelf.shelf.id); setEditingShelf(null); }} style={{ width:"100%", background:"#fef2f2", color:"#ef4444", border:"1px solid #fecaca", borderRadius:13, padding:"11px", fontWeight:700, cursor:"pointer" }}>🗑️ Delete Shelf</button>
              </div>
            </div>
          )}

          <div style={S.content}>
            {space.shelves.map(shelf => {
              const shelfItems = inventory.filter(i => i.spaceId === space.id && i.shelfId === shelf.id);
              return (
                <div key={shelf.id} style={S.card}>
                  <div style={{ marginBottom:10 }}><ShelfPhoto shelf={shelf} space={space} size="md" refreshKey={photoVersion} /></div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                      <div style={{ background:space.accent+"20", borderRadius:8, padding:"2px 9px" }}><span style={{ fontWeight:800, color:space.accent, fontSize:11 }}>{shelf.id}</span></div>
                      <span style={{ fontWeight:700, fontSize:13 }}>{shelf.name}</span>
                    </div>
                    <div style={{ display:"flex", gap:6 }}>
                      <span onClick={() => setEditingShelf({ spaceId: space.id, shelf: { ...shelf } })} style={{ fontSize:13, color:"#6b7280", cursor:"pointer", background:"#f3f4f6", borderRadius:8, padding:"3px 9px" }}>✏️</span>
                      <span onClick={() => { setActiveTab("add"); resetAdd(); }} style={{ fontSize:13, color:space.accent, cursor:"pointer", fontWeight:700, background:space.accent+"15", borderRadius:8, padding:"3px 9px" }}>+ Add</span>
                    </div>
                  </div>
                  {shelfItems.length === 0
                    ? <p style={{ margin:0, fontSize:12, color:"#9ca3af", textAlign:"center", padding:"8px 0" }}>No items yet</p>
                    : shelfItems.map((item, i) => {
                      const level = stockLevel(item.qty, item.reorder);
                      return (
                        <div key={item.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom: i < shelfItems.length - 1 ? "1px solid #f5f5f4" : "none" }}>
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
                </div>
              );
            })}

            {/* Add Shelf */}
            {showAddShelf === space.id ? (
              <AddShelfForm
                onAdd={(sid, sname, sphoto) => handleAddShelf(space.id, sid, sname, sphoto)}
                onCancel={() => setShowAddShelf(null)}
              />
            ) : (
              <button onClick={() => setShowAddShelf(space.id)} style={{ width:"100%", background:"white", border:"2px dashed #d1d5db", borderRadius:16, padding:"14px", color:"#6b7280", fontSize:13, fontWeight:700, cursor:"pointer" }}>+ Add Shelf</button>
            )}
          </div>
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
              <h1 style={{ fontSize:22, fontWeight:800, margin:"0 0 2px" }}>My Spaces</h1>
              <p style={{ color:"#9ca3af", margin:0, fontSize:12 }}>Your virtual warehouse</p>
            </div>
            <button onClick={() => setShowAddSpace(true)} style={{ background:"#d97706", border:"none", borderRadius:12, padding:"8px 14px", color:"white", fontSize:12, fontWeight:700, cursor:"pointer" }}>+ New Space</button>
          </div>
        </div>

        {/* Add Space Modal */}
        {showAddSpace && (
          <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.5)", zIndex:300, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
            <AddSpaceForm
              onAdd={(name, icon) => handleAddSpace(name, icon)}
              onCancel={() => setShowAddSpace(false)}
            />
          </div>
        )}

        <div style={S.content}>
          {!dismissedHints.spaces && <TabHint tab="spaces" onDismiss={() => dismissHint("spaces")} />}
          {spaces.map(space => {
            const items = inventory.filter(it => it.spaceId === space.id);
            const low = items.filter(it => stockLevel(it.qty, it.reorder) !== "good").length;
            return (
              <div key={space.id} style={{ background:space.color, borderRadius:18, padding:"16px", marginBottom:10, border:`1.5px solid ${space.accent}30` }}>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                  <div onClick={() => { setSelectedSpace(space); setSpaceScreen("detail"); }} style={{ width:48, height:48, borderRadius:14, background:space.accent+"20", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, cursor:"pointer" }}>{space.icon}</div>
                  <div style={{ flex:1, cursor:"pointer" }} onClick={() => { setSelectedSpace(space); setSpaceScreen("detail"); }}>
                    <p style={{ margin:0, fontWeight:800, fontSize:16 }}>{space.name}</p>
                    <p style={{ margin:0, fontSize:12, color:"#6b7280" }}>{space.shelves.length} shelves · {items.length} items</p>
                  </div>
                  {low > 0 && <span style={{ background:"#fff7ed", color:"#ea580c", fontSize:11, fontWeight:800, borderRadius:9, padding:"3px 9px" }}>{low} low</span>}
                  <span onClick={() => { setSelectedSpace(space); setSpaceScreen("detail"); }} style={{ fontSize:18, color:space.accent, cursor:"pointer" }}>›</span>
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  {space.shelves.map(shelf => <div key={shelf.id} style={{ flex:1 }}><ShelfPhoto shelf={shelf} space={space} size="sm" refreshKey={photoVersion} /></div>)}
                </div>
              </div>
            );
          })}

          {spaces.length === 0 && (
            <div style={{ textAlign:"center", padding:"50px 20px", color:"#9ca3af" }}>
              <div style={{ fontSize:48, marginBottom:12 }}>🗄️</div>
              <p style={{ fontWeight:700, fontSize:16, margin:"0 0 4px" }}>No spaces yet</p>
              <p style={{ fontSize:13, margin:"0 0 20px" }}>Create your first space to start organizing</p>
              <button onClick={() => setShowAddSpace(true)} style={{ background:"#d97706", color:"white", border:"none", borderRadius:13, padding:"12px 24px", fontWeight:700, cursor:"pointer" }}>+ Create First Space</button>
            </div>
          )}
        </div>
        <NavBar />
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════
  // ─── ADD TAB ────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════
  const AddTab = () => {
    const { unitSource, existingStock, unitMismatch, selSpace, selShelf, scanning, scanDone, aiResult, scanError } = addMeta;

    if (addScreen==="choose") return(
      <div>
        <div style={S.dh()}><h1 style={{ fontSize:22, fontWeight:800, margin:"0 0 2px" }}>Add Item</h1><p style={{ color:"#9ca3af", margin:0, fontSize:12 }}>Choose entry method</p></div>
        <div style={S.content}>
          {!dismissedHints.add && <TabHint tab="add" onDismiss={() => dismissHint("add")} />}
          {[
            { id:"barcode", emoji:"📊", title:"Scan Barcode", sub:"Point at product barcode", accent:"#d97706", tag:"FASTEST" },
            { id:"photo", emoji:"📸", title:"Snap a Photo", sub:"AI reads details automatically", accent:"#059669", tag:"AI POWERED" },
            { id:"manual", emoji:"✏️", title:"Enter Manually", sub:"Smart unit auto-fills as you type", accent:"#2563eb", tag:"MANUAL" },
          ].map(opt=>(
            <div key={opt.id} onClick={()=>setAddScreen(opt.id)} style={{ background:opt.accent+"10", borderRadius:18, padding:"16px", marginBottom:10, cursor:"pointer", border:`1.5px solid ${opt.accent}22` }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:50, height:50, borderRadius:14, background:opt.accent+"18", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24 }}>{opt.emoji}</div>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:2 }}>
                    <span style={{ fontWeight:800, fontSize:15 }}>{opt.title}</span>
                    <span style={{ background:opt.accent, color:"white", fontSize:9, fontWeight:800, borderRadius:5, padding:"2px 7px" }}>{opt.tag}</span>
                  </div>
                  <p style={{ margin:0, fontSize:12, color:"#6b7280" }}>{opt.sub}</p>
                </div>
                <span style={{ fontSize:18, color:opt.accent }}>›</span>
              </div>
            </div>
          ))}
        </div>
        <NavBar />
      </div>
    );

    if (addScreen==="barcode") return(
      <div>
        <div style={S.dh()}><div style={{ display:"flex", alignItems:"center" }}><button style={S.back} onClick={()=>{stopScan();setAddScreen("choose");}}>‹</button><h1 style={{ fontSize:20, fontWeight:800, margin:0 }}>Scan Barcode</h1></div></div>
        <div style={S.content}>
          <div style={{ background:"#1e1b18", borderRadius:24, minHeight:240, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", marginBottom:14, border:"2px dashed #d97706", position:"relative", overflow:"hidden" }}>
            {[0,1,2,3].map(i=><div key={i} style={{ position:"absolute", width:24, height:24, top:i<2?18:"auto", bottom:i>=2?18:"auto", left:i%2===0?18:"auto", right:i%2===1?18:"auto", borderTop:i<2?"3px solid #d97706":"none", borderBottom:i>=2?"3px solid #d97706":"none", borderLeft:i%2===0?"3px solid #d97706":"none", borderRight:i%2===1?"3px solid #d97706":"none", zIndex:1 }} />)}
            {scanDone?<div style={{ textAlign:"center", padding:20 }}><div style={{ fontSize:44 }}>✅</div><p style={{ color:"#4ade80", fontWeight:800, fontSize:15, margin:"7px 0 0" }}>Found!</p></div>
            :scanning?<div id={scannerContainerId} style={{ width:"100%", minHeight:240 }} />
            :<div style={{ textAlign:"center", padding:20, cursor:"pointer" }} onClick={startScan}><div style={{ fontSize:40, marginBottom:8 }}>📊</div><p style={{ color:"white", fontWeight:700, fontSize:14, margin:"0 0 3px" }}>Tap to Scan</p><p style={{ color:"#9ca3af", fontSize:11, margin:0 }}>Point camera at a barcode</p></div>}
          </div>
          {scanError && <div style={{ background:"#fef3c7", borderRadius:12, padding:"10px 14px", marginBottom:10, border:"1px solid #fde68a" }}><p style={{ margin:0, fontSize:12, fontWeight:600, color:"#92400e" }}>⚠️ {scanError}</p></div>}
          <div style={S.gap()}>
            <button style={S.btn("#d97706")} onClick={scanning?stopScan:startScan}>{scanning?"Stop Scanner":"📊 Start Scanner"}</button>
            <button style={S.outline} onClick={()=>{stopScan();setAddScreen("manual");}}>Enter manually</button>
          </div>
        </div>
        <NavBar />
      </div>
    );

    if (addScreen==="photo") return(
      <div>
        <div style={S.dh()}><div style={{ display:"flex", alignItems:"center" }}><button style={S.back} onClick={()=>setAddScreen("choose")}>‹</button><h1 style={{ fontSize:20, fontWeight:800, margin:0 }}>Snap a Photo</h1></div></div>
        <div style={S.content}>
          <div onClick={()=>photoRef.current?.click()} style={{ background:"#1e1b18", borderRadius:24, height:240, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", marginBottom:14, cursor:"pointer", border:"2px dashed #059669" }}>
            <div style={{ fontSize:46, marginBottom:10 }}>📸</div>
            <p style={{ color:"white", fontWeight:700, fontSize:14, margin:"0 0 3px" }}>Tap to photograph</p>
            <p style={{ color:"#9ca3af", fontSize:11, margin:0 }}>AI reads the label</p>
            <input ref={photoRef} type="file" accept="image/*" capture="environment" style={{ display:"none" }} onChange={handlePhotoCapture} />
          </div>
          <div style={S.gap()}>
            <button style={S.btn("#059669")} onClick={()=>photoRef.current?.click()}>📸 Open Camera</button>
            <button style={S.outline} onClick={()=>setAddScreen("manual")}>Enter manually</button>
          </div>
        </div>
        <NavBar />
      </div>
    );

    if (addScreen==="ai_analyzing") return(
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px 24px", textAlign:"center", minHeight:680 }}>
        {addItem.imagePreview&&<div style={{ width:130, height:130, borderRadius:22, overflow:"hidden", marginBottom:20 }}><img src={addItem.imagePreview} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt="" /></div>}
        <div style={{ width:50, height:50, border:"5px solid #059669", borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.9s linear infinite", margin:"0 auto 16px" }} />
        <h2 style={{ fontSize:20, fontWeight:800, margin:"0 0 6px" }}>AI reading photo...</h2>
        <p style={{ fontSize:13, color:"#6b7280", margin:0 }}>Identifying product & details</p>
      </div>
    );

    if (addScreen==="manual"||addScreen==="review_details") return (
      <ManualEntryForm
        initialItem={{ name: addItem.name, brand: addItem.brand, category: addItem.category, unit: addItem.unit, imagePreview: addItem.imagePreview, aiResult: addMeta.aiResult, aiError: addMeta.aiError }}
        onBack={() => setAddScreen("choose")}
        onContinue={(formValues) => {
          setAddItem(p => ({ ...p, ...formValues }));
          resolveIntelligence(formValues.name, formValues.unit !== "pcs" ? formValues.unit : null);
        }}
        navBar={<NavBar />}
      />
    );

    if (addScreen==="unit_mismatch") return(
      <div>
        <div style={S.dh("#d97706")}><div style={{ display:"flex", alignItems:"center" }}><button style={{...S.back,color:"white"}} onClick={()=>setAddScreen("manual")}>‹</button><h1 style={{ fontSize:20, fontWeight:800, margin:0 }}>Unit Mismatch ⚠️</h1></div></div>
        <div style={S.content}>
          <div style={S.card}>
            <div style={S.gap(8)}>
              <div style={{ background:"#f0fdf4", borderRadius:12, padding:"11px", border:"1.5px solid #bbf7d0" }}><p style={{ margin:"0 0 2px", fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase" }}>Currently tracked as</p><p style={{ margin:0, fontWeight:800, fontSize:16, color:"#059669" }}>{unitMismatch?.existing?.qty} {unitMismatch?.oldUnit}</p></div>
              <div style={{ background:"#fff7ed", borderRadius:12, padding:"11px", border:"1.5px solid #fde68a" }}><p style={{ margin:"0 0 2px", fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase" }}>You're adding in</p><p style={{ margin:0, fontWeight:800, fontSize:16, color:"#d97706" }}>{addItem.qty} {unitMismatch?.newUnit}</p></div>
              <div style={{ background:"#fef2f2", borderRadius:12, padding:"10px", border:"1px solid #fecaca" }}><p style={{ margin:0, fontSize:12, color:"#991b1b", fontWeight:600 }}>⚠️ {unitMismatch?.oldUnit} ≠ {unitMismatch?.newUnit}</p></div>
            </div>
          </div>
          <div style={S.gap(8)}>
            <button style={S.btn("#1e1b18")} onClick={()=>{setAddItem(p=>({...p,unit:unitMismatch?.newUnit}));setAddScreen("stock_add_confirm");}}>Switch to {unitMismatch?.newUnit}</button>
            <button style={S.btn("#6b7280")} onClick={()=>{setAddItem(p=>({...p,unit:unitMismatch?.oldUnit}));setAddScreen("stock_add_confirm");}}>Keep {unitMismatch?.oldUnit}</button>
            <button style={S.outline} onClick={()=>setAddScreen("manual")}>Go back</button>
          </div>
        </div>
        <NavBar />
      </div>
    );

    if (addScreen==="stock_add_confirm") return(
      <div>
        <div style={S.dh("#2563eb")}><div style={{ display:"flex", alignItems:"center" }}><button style={{...S.back,color:"white"}} onClick={()=>setAddScreen("manual")}>‹</button><h1 style={{ fontSize:20, fontWeight:800, margin:0 }}>Already In Stock!</h1></div></div>
        <div style={S.content}>
          <div style={S.card}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ flex:1, background:"#f0fdf4", borderRadius:12, padding:"11px", textAlign:"center", border:"1.5px solid #bbf7d0" }}>
                <p style={{ margin:"0 0 1px", fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase" }}>In Stock</p>
                <p style={{ margin:0, fontWeight:800, fontSize:26, color:"#059669" }}>{existingStock?.qty}</p>
                <p style={{ margin:0, fontSize:11, color:"#9ca3af" }}>{addItem.unit}</p>
              </div>
              <span style={{ fontSize:22, fontWeight:800, color:"#d97706" }}>+</span>
              <div style={{ flex:1, background:"#fff8f0", borderRadius:12, padding:"11px", textAlign:"center", border:"1.5px solid #fde68a" }}>
                <p style={{ margin:"0 0 1px", fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase" }}>Adding</p>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                  <button onClick={()=>setAddItem(p=>({...p,qty:Math.max(1,p.qty-1)}))} style={{ width:24, height:24, borderRadius:7, background:"white", border:"1px solid #fde68a", fontSize:14, cursor:"pointer", fontWeight:700 }}>−</button>
                  <span style={{ fontWeight:800, fontSize:24, color:"#d97706" }}>{addItem.qty}</span>
                  <button onClick={()=>setAddItem(p=>({...p,qty:p.qty+1}))} style={{ width:24, height:24, borderRadius:7, background:"#d97706", border:"none", color:"white", fontSize:14, cursor:"pointer", fontWeight:700 }}>+</button>
                </div>
                <p style={{ margin:0, fontSize:11, color:"#9ca3af" }}>{addItem.unit}</p>
              </div>
              <span style={{ fontSize:20, fontWeight:800, color:"#6b7280" }}>=</span>
              <div style={{ flex:1, background:"#1e1b18", borderRadius:12, padding:"11px", textAlign:"center" }}>
                <p style={{ margin:"0 0 1px", fontSize:10, fontWeight:700, color:"#9ca3af", textTransform:"uppercase" }}>Total</p>
                <p style={{ margin:0, fontWeight:800, fontSize:26, color:"white" }}>{(existingStock?.qty||0)+addItem.qty}</p>
                <p style={{ margin:0, fontSize:11, color:"#9ca3af" }}>{addItem.unit}</p>
              </div>
            </div>
          </div>
          <button style={S.btn("#1e1b18")} onClick={handleSaveNewItem}>✅ Add {addItem.qty} to Stock</button>
        </div>
        <NavBar />
      </div>
    );

    if (addScreen==="select_location") return(
      <div>
        <div style={S.dh()}><div style={{ display:"flex", alignItems:"center" }}><button style={S.back} onClick={()=>setAddScreen("manual")}>‹</button><h1 style={{ fontSize:20, fontWeight:800, margin:0 }}>Where does it live?</h1></div></div>
        <div style={S.content}>
          {spaces.map(space=>(
            <div key={space.id} style={S.card}>
              <div onClick={()=>setAddMeta(m=>({...m,selSpace:m.selSpace?.id===space.id?null:space}))} style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", marginBottom:selSpace?.id===space.id?10:0 }}>
                <div style={{ width:38, height:38, borderRadius:11, background:space.accent+"18", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{space.icon}</div>
                <div style={{ flex:1 }}><p style={{ margin:0, fontWeight:700, fontSize:14 }}>{space.name}</p></div>
                <span style={{ fontSize:16, color:space.accent, transform:selSpace?.id===space.id?"rotate(90deg)":"none", transition:"transform 0.2s" }}>›</span>
              </div>
              {selSpace?.id===space.id&&space.shelves.map(shelf=>(
                <div key={shelf.id} onClick={()=>setAddMeta(m=>({...m,selShelf:shelf}))} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 10px", borderRadius:12, background:selShelf?.id===shelf.id?space.accent+"15":"#f9fafb", border:`2px solid ${selShelf?.id===shelf.id?space.accent:"transparent"}`, cursor:"pointer", marginBottom:5 }}>
                  <div style={{ width:30, height:30, borderRadius:8, background:selShelf?.id===shelf.id?space.accent:"#e5e7eb", display:"flex", alignItems:"center", justifyContent:"center" }}><span style={{ fontWeight:800, fontSize:11, color:selShelf?.id===shelf.id?"white":"#6b7280" }}>{shelf.id}</span></div>
                  <span style={{ fontWeight:600, fontSize:13 }}>{shelf.name}</span>
                  {selShelf?.id===shelf.id&&<span style={{ marginLeft:"auto" }}>✅</span>}
                </div>
              ))}
            </div>
          ))}
          <button style={S.btn(selShelf?"#1e1b18":"#e5e7eb","white",!selShelf)} disabled={!selShelf} onClick={()=>setAddScreen("set_stock")}>Set Stock Levels →</button>
        </div>
        <NavBar />
      </div>
    );

    if (addScreen==="set_stock") return(
      <div>
        <div style={S.dh()}><div style={{ display:"flex", alignItems:"center" }}><button style={S.back} onClick={()=>setAddScreen("select_location")}>‹</button><h1 style={{ fontSize:20, fontWeight:800, margin:0 }}>Set Stock Levels</h1></div></div>
        <div style={S.content}>
          <div style={S.card}>
            <div style={{ marginBottom:16 }}>
              <label style={S.label}>Current Stock</label>
              <div style={{ display:"flex", alignItems:"center", gap:12, background:"#f9fafb", borderRadius:14, padding:"12px 16px" }}>
                <button onClick={()=>setAddItem(p=>({...p,qty:Math.max(0,p.qty-1)}))} style={{ width:42, height:42, borderRadius:12, background:"white", border:"2px solid #e5e7eb", fontSize:20, cursor:"pointer", fontWeight:700 }}>−</button>
                <div style={{ flex:1, textAlign:"center" }}><span style={{ fontWeight:800, fontSize:34 }}>{addItem.qty}</span><span style={{ fontSize:13, color:"#9ca3af", marginLeft:5 }}>{addItem.unit}</span></div>
                <button onClick={()=>setAddItem(p=>({...p,qty:p.qty+1}))} style={{ width:42, height:42, borderRadius:12, background:"#1e1b18", border:"none", color:"white", fontSize:20, cursor:"pointer", fontWeight:700 }}>+</button>
              </div>
            </div>
            <div>
              <label style={S.label}>Reorder Level (JIT trigger)</label>
              <div style={{ display:"flex", alignItems:"center", gap:12, background:"#fff8f0", borderRadius:14, padding:"12px 16px", border:"1px solid #fde68a" }}>
                <button onClick={()=>setAddItem(p=>({...p,reorder:Math.max(1,p.reorder-1)}))} style={{ width:42, height:42, borderRadius:12, background:"white", border:"2px solid #fde68a", fontSize:20, cursor:"pointer", fontWeight:700 }}>−</button>
                <div style={{ flex:1, textAlign:"center" }}><span style={{ fontWeight:800, fontSize:34, color:"#d97706" }}>{addItem.reorder}</span><span style={{ fontSize:13, color:"#9ca3af", marginLeft:5 }}>{addItem.unit}</span></div>
                <button onClick={()=>setAddItem(p=>({...p,reorder:p.reorder+1}))} style={{ width:42, height:42, borderRadius:12, background:"#d97706", border:"none", color:"white", fontSize:20, cursor:"pointer", fontWeight:700 }}>+</button>
              </div>
              <p style={{ margin:"7px 0 0", fontSize:11, color:"#9ca3af" }}>💡 Auto-adds to shopping list when stock hits {addItem.reorder} {addItem.unit}</p>
            </div>
          </div>
          <button style={S.btn("#1e1b18")} onClick={handleSaveNewItem}>💾 Save Item →</button>
        </div>
        <NavBar />
      </div>
    );

    if (addScreen==="saved") return(
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"56px 24px", textAlign:"center", minHeight:680 }}>
        <div style={{ fontSize:68, marginBottom:16 }}>🎉</div>
        <h2 style={{ fontSize:26, fontWeight:800, margin:"0 0 8px", letterSpacing:"-0.8px" }}>{justSaved?.existingStock?"Stock Updated!":"Item Saved!"}</h2>
        <p style={{ fontSize:13, color:"#6b7280", margin:"0 0 12px" }}><b>{justSaved?.name}</b> is now in your pantri{IS_DEMO?" (demo mode — won't persist)":""}</p>
        {!IS_DEMO&&<div style={{ background:"#f0fdf4", borderRadius:12, padding:"10px 14px", marginBottom:16, border:"1px solid #bbf7d0", width:"100%" }}><p style={{ margin:0, fontSize:12, color:"#15803d", fontWeight:600 }}>🔥 Saved to Firebase — synced to {userMeta.partner||"partner"}'s phone instantly</p></div>}
        <div style={{...S.gap(), width:"100%"}}>
          <button style={S.btn("#1e1b18")} onClick={resetAdd}>+ Add Another</button>
          <button style={S.outline} onClick={()=>{setActiveTab("home");resetAdd();}}>← Home</button>
        </div>
        <NavBar />
      </div>
    );
    return null;
  };

  // ══════════════════════════════════════════════════════════
  // ─── USED TAB ───────────────────────────────────────────
  // ══════════════════════════════════════════════════════════
  const UsedTab = () => {
    const filtered = inventory.filter(i =>
      i.name.toLowerCase().includes(usedSearch.toLowerCase()) &&
      (usedCat==="All"||i.category===usedCat)
    );
    const CATS = ["All","Grains & Pasta","Canned Goods","Dairy","Produce","Baby","Condiments"];


    // ── Meal Mode: What can I cook? ───────────────────────────
    if (usedScreen==="meal_mode") {
      const RECIPES = [
        { id:"r1", name:"Scrambled Eggs", emoji:"🍳", time:"5 min", tags:["breakfast","quick"],
          ingredients:[{name:"Eggs",qty:2,unit:"pcs"},{name:"Milk",qty:0.1,unit:"litres"},{name:"Butter",qty:0.05,unit:"kg"}] },
        { id:"r2", name:"Rice & Dal", emoji:"🍚", time:"20 min", tags:["lunch","veg"],
          ingredients:[{name:"Rice",qty:0.2,unit:"kg"},{name:"Dal",qty:0.15,unit:"kg"},{name:"Onion",qty:1,unit:"pcs"}] },
        { id:"r3", name:"Chicken Curry", emoji:"🍛", time:"35 min", tags:["dinner","non-veg"],
          ingredients:[{name:"Chicken",qty:0.5,unit:"kg"},{name:"Onion",qty:2,unit:"pcs"},{name:"Tomato",qty:2,unit:"pcs"},{name:"Rice",qty:0.2,unit:"kg"}] },
        { id:"r4", name:"Pasta", emoji:"🍝", time:"15 min", tags:["dinner","quick"],
          ingredients:[{name:"Pasta",qty:0.2,unit:"kg"},{name:"Tomato",qty:2,unit:"pcs"},{name:"Onion",qty:1,unit:"pcs"}] },
        { id:"r5", name:"Omelette", emoji:"🍳", time:"5 min", tags:["breakfast","quick"],
          ingredients:[{name:"Eggs",qty:3,unit:"pcs"},{name:"Onion",qty:1,unit:"pcs"},{name:"Tomato",qty:1,unit:"pcs"}] },
        { id:"r6", name:"Chicken Rice Bowl", emoji:"🥘", time:"25 min", tags:["lunch","dinner"],
          ingredients:[{name:"Chicken",qty:0.3,unit:"kg"},{name:"Rice",qty:0.2,unit:"kg"}] },
        { id:"r7", name:"Vegetable Pulao", emoji:"🍲", time:"25 min", tags:["lunch","veg"],
          ingredients:[{name:"Rice",qty:0.25,unit:"kg"},{name:"Onion",qty:1,unit:"pcs"},{name:"Tomato",qty:1,unit:"pcs"}] },
        { id:"r8", name:"Milk Oats", emoji:"🥣", time:"5 min", tags:["breakfast","quick"],
          ingredients:[{name:"Oats",qty:0.1,unit:"kg"},{name:"Milk",qty:0.25,unit:"litres"}] },
        { id:"r9", name:"Egg Fried Rice", emoji:"🍳", time:"15 min", tags:["lunch","quick"],
          ingredients:[{name:"Rice",qty:0.2,unit:"kg"},{name:"Eggs",qty:2,unit:"pcs"}] },
        { id:"r10", name:"Tomato Soup", emoji:"🍵", time:"15 min", tags:["light","veg"],
          ingredients:[{name:"Tomato",qty:4,unit:"pcs"},{name:"Onion",qty:1,unit:"pcs"}] },
        { id:"r11", name:"Bread Toast", emoji:"🍞", time:"3 min", tags:["breakfast","quick"],
          ingredients:[{name:"Bread",qty:4,unit:"pcs"},{name:"Butter",qty:0.03,unit:"kg"}] },
        { id:"r12", name:"Chicken Sandwich", emoji:"🥪", time:"10 min", tags:["lunch","quick"],
          ingredients:[{name:"Bread",qty:4,unit:"pcs"},{name:"Chicken",qty:0.15,unit:"kg"}] },
      ];

      // Match recipes against inventory (fuzzy name match)
      const invNames = inventory.map(i => i.name.toLowerCase());
      const matchScore = (recipe) => {
        let have = 0;
        recipe.ingredients.forEach(ing => {
          const match = inventory.find(i =>
            i.name.toLowerCase().includes(ing.name.toLowerCase()) ||
            ing.name.toLowerCase().includes(i.name.toLowerCase())
          );
          if (match && match.qty >= ing.qty) have++;
        });
        return { have, total: recipe.ingredients.length, pct: have / recipe.ingredients.length };
      };

      const scored = RECIPES.map(r => ({ ...r, score: matchScore(r) }))
        .sort((a,b) => b.score.pct - a.score.pct || a.score.total - b.score.total);

      const canMake = scored.filter(r => r.score.pct === 1);
      const almostMake = scored.filter(r => r.score.pct >= 0.5 && r.score.pct < 1);

      // Recipe detail view
      if (selMeal) {
        const recipe = selMeal;
        const deductItems = recipe.ingredients.map(ing => {
          const inv = inventory.find(i =>
            i.name.toLowerCase().includes(ing.name.toLowerCase()) ||
            ing.name.toLowerCase().includes(i.name.toLowerCase())
          );
          return { ing, inv, hasEnough: inv && inv.qty >= ing.qty };
        });

        return (
          <div style={{ display:"flex", flexDirection:"column", height:"100vh", background:"#f8f7f5" }}>
            <div style={{ background:"#1e1b18", padding:"16px 18px 20px", color:"white", flexShrink:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                <button style={S.back} onClick={()=>setSelMeal(null)}>‹</button>
                <div>
                  <h1 style={{ fontSize:20, fontWeight:800, margin:0 }}>{recipe.emoji} {recipe.name}</h1>
                  <p style={{ color:"#9ca3af", margin:0, fontSize:12 }}>⏱ {recipe.time} · {recipe.ingredients.length} ingredients</p>
                </div>
              </div>
            </div>
            <div style={{ flex:1, overflowY:"auto", padding:"16px 16px 100px" }}>
              <p style={{ fontSize:12, fontWeight:700, color:"#6b7280", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:10 }}>Ingredients needed</p>
              {deductItems.map(({ ing, inv, hasEnough }, i) => (
                <div key={i} style={{ background:"white", borderRadius:13, padding:"12px 14px", marginBottom:7, display:"flex", alignItems:"center", gap:10, border:`1.5px solid ${hasEnough ? "#dcfce7" : "#fee2e2"}` }}>
                  <div style={{ width:32, height:32, borderRadius:10, background: hasEnough ? "#dcfce7" : "#fee2e2", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>
                    {hasEnough ? "✅" : "❌"}
                  </div>
                  <div style={{ flex:1 }}>
                    <p style={{ margin:0, fontWeight:700, fontSize:13 }}>{ing.name}</p>
                    <p style={{ margin:0, fontSize:11, color:"#9ca3af" }}>Need: {ing.qty} {ing.unit} {inv ? `· Have: ${inv.qty} ${inv.unit}` : "· Not in pantry"}</p>
                  </div>
                </div>
              ))}
              {deductItems.every(d => d.hasEnough) && (
                <div style={{ background:"#f0fdf4", borderRadius:13, padding:"13px", marginTop:10, textAlign:"center", border:"1px solid #bbf7d0" }}>
                  <p style={{ margin:0, fontSize:13, fontWeight:700, color:"#16a34a" }}>✅ You have everything!</p>
                  <p style={{ margin:"3px 0 0", fontSize:11, color:"#6b7280" }}>Cooking will deduct these from your pantry</p>
                </div>
              )}
            </div>
            <div style={{ padding:"12px 16px 28px", background:"white", borderTop:"1px solid #f0ede8" }}>
              <button
                disabled={!deductItems.every(d => d.hasEnough)}
                onClick={async () => {
                  for (const { ing, inv } of deductItems) {
                    if (inv) {
                      const newQty = Math.max(0, inv.qty - ing.qty);
                      await updateItem(inv.id, { qty: newQty });
                      await logUsage({ item: inv.name, qty: ing.qty, unit: ing.unit, meal: recipe.name, addedToCart: newQty <= inv.reorder });
                    }
                  }
                  setJustSaved({ meal:true, count: deductItems.length, mealName: recipe.name });
                  setSelMeal(null); setUsedScreen("done");
                }}
                style={{ width:"100%", background: deductItems.every(d=>d.hasEnough) ? "#1e1b18" : "#e5e7eb", color: deductItems.every(d=>d.hasEnough) ? "white" : "#9ca3af", border:"none", borderRadius:14, padding:"15px", fontWeight:800, fontSize:15, cursor: deductItems.every(d=>d.hasEnough) ? "pointer" : "not-allowed" }}>
                🍳 Cook This — Deduct Ingredients
              </button>
            </div>
          </div>
        );
      }

      // Recipe list view
      return (
        <div style={{ display:"flex", flexDirection:"column", height:"100vh", background:"#f8f7f5" }}>
          <div style={{ background:"#1e1b18", padding:"16px 18px 18px", color:"white", flexShrink:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <button style={S.back} onClick={()=>setUsedScreen("list")}>‹</button>
              <div>
                <h1 style={{ fontSize:20, fontWeight:800, margin:0 }}>What can I cook? 🍽️</h1>
                <p style={{ color:"#9ca3af", margin:0, fontSize:12 }}>Based on your pantry · {inventory.length} items</p>
              </div>
            </div>
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:"14px 14px 100px" }}>
            {canMake.length > 0 && (
              <>
                <p style={{ fontSize:11, fontWeight:800, color:"#16a34a", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8 }}>✅ Ready to cook ({canMake.length})</p>
                {canMake.map(r => (
                  <div key={r.id} onClick={()=>setSelMeal(r)} style={{ background:"white", borderRadius:16, padding:"14px", marginBottom:8, border:"1.5px solid #dcfce7", cursor:"pointer", display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ width:46, height:46, borderRadius:13, background:"#f0fdf4", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0 }}>{r.emoji}</div>
                    <div style={{ flex:1 }}>
                      <p style={{ margin:0, fontWeight:800, fontSize:14 }}>{r.name}</p>
                      <p style={{ margin:"2px 0 0", fontSize:11, color:"#6b7280" }}>⏱ {r.time} · {r.ingredients.length} ingredients</p>
                    </div>
                    <span style={{ background:"#dcfce7", color:"#16a34a", fontSize:10, fontWeight:800, borderRadius:8, padding:"3px 8px" }}>READY</span>
                  </div>
                ))}
              </>
            )}
            {almostMake.length > 0 && (
              <>
                <p style={{ fontSize:11, fontWeight:800, color:"#d97706", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8, marginTop:14 }}>🛒 Almost there ({almostMake.length})</p>
                {almostMake.map(r => {
                  const missing = r.ingredients.filter(ing => !inventory.find(i =>
                    (i.name.toLowerCase().includes(ing.name.toLowerCase()) || ing.name.toLowerCase().includes(i.name.toLowerCase())) && i.qty >= ing.qty
                  ));
                  return (
                    <div key={r.id} onClick={()=>setSelMeal(r)} style={{ background:"white", borderRadius:16, padding:"14px", marginBottom:8, border:"1.5px solid #fef3c7", cursor:"pointer", display:"flex", alignItems:"center", gap:12 }}>
                      <div style={{ width:46, height:46, borderRadius:13, background:"#fffbeb", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0 }}>{r.emoji}</div>
                      <div style={{ flex:1 }}>
                        <p style={{ margin:0, fontWeight:800, fontSize:14 }}>{r.name}</p>
                        <p style={{ margin:"2px 0 0", fontSize:11, color:"#d97706" }}>Missing: {missing.map(m=>m.name).join(", ")}</p>
                      </div>
                      <span style={{ background:"#fef3c7", color:"#d97706", fontSize:10, fontWeight:800, borderRadius:8, padding:"3px 8px" }}>CLOSE</span>
                    </div>
                  );
                })}
              </>
            )}
            {canMake.length === 0 && almostMake.length === 0 && (
              <div style={{ textAlign:"center", padding:"60px 20px", color:"#9ca3af" }}>
                <div style={{ fontSize:48, marginBottom:12 }}>🥺</div>
                <p style={{ fontWeight:800, fontSize:16, color:"#374151" }}>Pantry looks bare!</p>
                <p style={{ fontSize:13 }}>Add items to your pantry to see what you can cook</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    // ── Quick Use screen ──────────────────────────────────────
    if (usedScreen==="quick_use" && !selConsume) { setUsedScreen("list"); return null; }
    if (usedScreen==="quick_use" && selConsume) {
      const newQty = Math.max(0, selConsume.qty - consumeQty);
      const newLevel = stockLevel(newQty, selConsume.reorder);
      return (
        <div>
          <div style={S.dh()}><div style={{ display:"flex", alignItems:"center" }}><button style={S.back} onClick={()=>setUsedScreen("list")}>‹</button><h1 style={{ fontSize:20, fontWeight:800, margin:0 }}>I Used This</h1></div></div>
          <div style={S.content}>
            <div style={S.card}>
              <div style={{ display:"flex", gap:10, alignItems:"center", paddingBottom:12, marginBottom:12, borderBottom:"1px solid #f5f5f4" }}>
                <div style={{ width:46, height:46, borderRadius:13, background:"#f9fafb", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>{selConsume.emoji}</div>
                <div><p style={{ margin:"0 0 1px", fontWeight:800, fontSize:15 }}>{selConsume.name}</p><p style={{ margin:0, fontSize:12, color:"#9ca3af", fontWeight:700 }}>Stock: {selConsume.qty} {selConsume.unit}</p></div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:14, background:"#f9fafb", borderRadius:16, padding:"13px 16px", marginBottom:11 }}>
                <button onClick={()=>setConsumeQty(q=>Math.max(1,q-1))} style={{ width:44, height:44, borderRadius:12, background:"white", border:"2px solid #e5e7eb", fontSize:20, cursor:"pointer", fontWeight:700 }}>−</button>
                <div style={{ flex:1, textAlign:"center" }}><span style={{ fontWeight:800, fontSize:38 }}>{consumeQty}</span><span style={{ fontSize:13, color:"#9ca3af", marginLeft:6 }}>{selConsume.unit}</span></div>
                <button onClick={()=>setConsumeQty(q=>Math.min(selConsume.qty,q+1))} style={{ width:44, height:44, borderRadius:12, background:"#1e1b18", border:"none", color:"white", fontSize:20, cursor:"pointer", fontWeight:700 }}>+</button>
              </div>
              <div style={{ display:"flex", gap:6, marginBottom:11 }}>
                {[1,2,3,selConsume.qty].filter((v,i,a)=>a.indexOf(v)===i&&v<=selConsume.qty).map(n=>(
                  <div key={n} onClick={()=>setConsumeQty(n)} style={{ flex:1, background:consumeQty===n?"#1e1b18":"#f3f4f6", borderRadius:11, padding:"8px 0", textAlign:"center", cursor:"pointer" }}>
                    <span style={{ fontWeight:700, fontSize:12, color:consumeQty===n?"white":"#374151" }}>{n===selConsume.qty?"All":n}</span>
                  </div>
                ))}
              </div>
              <div style={{ background:"#f9fafb", borderRadius:11, padding:"10px 12px", border:"1px solid #f0ede8" }}>
                <p style={{ margin:0, fontSize:12, color:"#6b7280" }}>After use: <b style={{ color: newLevel==="ok"?"#16a34a":newLevel==="low"?"#d97706":"#ef4444" }}>{newQty} {selConsume.unit} remaining</b></p>
              </div>
            </div>
          </div>
          <div style={{ padding:"0 16px" }}>
            <button style={S.btn("#1e1b18")} onClick={async()=>{
              await logUsage({ item:selConsume.name, qty:consumeQty, unit:selConsume.unit, addedToCart: newQty<=selConsume.reorder });
              await updateItem(selConsume.id, { qty: newQty });
              setJustSaved({ name:selConsume.name, newQty, unit:selConsume.unit });
              setSelConsume(null); setConsumeQty(1); setUsedScreen("done");
            }}>Confirm Usage</button>
          </div>
          <NavBar />
        </div>
      );
    }

    // ── Done screen ───────────────────────────────────────────
    if (usedScreen==="done" && !justSaved) { setUsedScreen("list"); return null; }
    if (usedScreen==="done") return (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"80vh", padding:24, textAlign:"center" }}>
        <div style={{ width:72, height:72, borderRadius:22, background:"#f0fdf4", display:"flex", alignItems:"center", justifyContent:"center", fontSize:36, marginBottom:16 }}>✅</div>
        <h2 style={{ fontSize:26, fontWeight:800, margin:"0 0 8px", letterSpacing:"-0.8px" }}>{justSaved?.meal?"Meal Logged!":"Usage Updated!"}</h2>
        <p style={{ color:"#6b7280", margin:"0 0 24px", fontSize:14 }}>
          {justSaved?.meal ? <><b>{justSaved.count} items</b> deducted for <b>{justSaved.mealName}</b></> : <><b>{justSaved?.name}</b> → <b>{justSaved?.newQty} {justSaved?.unit}</b> remaining</>}
        </p>
        <div style={{ display:"flex", flexDirection:"column", gap:10, width:"100%" }}>
          <button style={S.btn("#1e1b18")} onClick={()=>setUsedScreen("list")}>Log Another</button>
          <button style={S.outline} onClick={()=>{setActiveTab("home");setUsedScreen("list");}}>← Home</button>
        </div>
        <NavBar />
      </div>
    );

    // ── Default list screen ───────────────────────────────────
    return (
      <div>
        <div style={{ background:"#1e1b18", padding:"16px 18px 0", color:"white" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div><h1 style={{ fontSize:22, fontWeight:800, margin:"0 0 2px" }}>I Used Something</h1><p style={{ color:"#9ca3af", margin:0, fontSize:12 }}>{inventory.length} items tracked</p></div>
            <button onClick={()=>{setMealItems({});setSelMeal(null);setUsedScreen("meal_mode");}} style={{ background:"#d97706", border:"none", borderRadius:10, padding:"6px 12px", color:"white", fontSize:11, fontWeight:700, cursor:"pointer" }}>🍽️ Cook</button>
          </div>
          <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:12, scrollbarWidth:"none" }}>
            {CATS.map(c=>(
              <button key={c} onClick={()=>setUsedCat(c)} style={{ flexShrink:0, background:usedCat===c?"white":"rgba(255,255,255,0.1)", color:usedCat===c?"#1e1b18":"white", border:"none", borderRadius:20, padding:"5px 13px", fontSize:11, fontWeight:700, cursor:"pointer" }}>{c}</button>
            ))}
          </div>
        </div>
        <div style={S.content}>
          {!dismissedHints.used && <TabHint tab="used" onDismiss={() => dismissHint("used")} />}
          <input placeholder="🔍  Search items..." value={usedSearch} onChange={e=>setUsedSearch(e.target.value)} style={{ width:"100%", background:"white", border:"2px solid #f0ede8", borderRadius:13, padding:"10px 13px", fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"'DM Sans',sans-serif", marginBottom:10 }} />
          {filtered.length===0 ? (
            <div style={{ textAlign:"center", padding:"40px 0", color:"#9ca3af" }}>
              <p style={{ fontSize:28, marginBottom:8 }}>📦</p>
              <p style={{ fontWeight:700 }}>No items yet</p>
              <p style={{ fontSize:12 }}>Add items via the + tab first</p>
            </div>
          ) : filtered.map(item=>(
            <div key={item.id} onClick={()=>{setSelConsume(item);setConsumeQty(1);setUsedScreen("quick_use");}} style={{ background:"white", borderRadius:14, padding:"12px 13px", marginBottom:7, boxShadow:"0 2px 5px rgba(0,0,0,0.04)", display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}>
              <div style={{ width:42, height:42, borderRadius:12, background:"#f9fafb", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>{item.emoji}</div>
              <div style={{ flex:1 }}>
                <p style={{ margin:0, fontWeight:700, fontSize:13 }}>{item.name}</p>
                <p style={{ margin:0, fontSize:11, color:"#9ca3af" }}>{item.brand} · {item.qty} {item.unit}</p>
              </div>
              <div style={{ textAlign:"right" }}>
                <span style={{ fontSize:11, fontWeight:700, color: item.qty<=0?"#ef4444":item.qty<=item.reorder?"#d97706":"#22c55e" }}>
                  {item.qty<=0?"Out":item.qty<=item.reorder?"Low":"OK"}
                </span>
              </div>
            </div>
          ))}
        </div>
        <NavBar />
      </div>
    );



  };

  // ══════════════════════════════════════════════════════════
  // ─── INSIGHTS TAB ───────────────────────────────────────
  // ══════════════════════════════════════════════════════════
  const InsightsTab = () => {
    const consumptionMap = {};
    history.forEach(h => { consumptionMap[h.item] = (consumptionMap[h.item]||0) + Number(h.qty||0); });

    const totalConsumed = Object.values(consumptionMap).reduce((s,v)=>s+v,0);
    const sorted = inventory.map(i=>({...i,consumed:consumptionMap[i.name]||0})).sort((a,b)=>b.consumed-a.consumed);
    let cum=0;
    const abc={A:[],B:[],C:[]};
    sorted.forEach(item=>{
      cum+=item.consumed;
      const pct=totalConsumed>0?cum/totalConsumed:1;
      if(pct<=0.70)abc.A.push(item); else if(pct<=0.90)abc.B.push(item); else abc.C.push(item);
    });

    const ved={V:[],E:[],D:[]};
    inventory.forEach(item=>{
      const c=consumptionMap[item.name]||0;
      if(item.category==="Baby"||item.reorder>=10||c>5) ved.V.push(item);
      else if(c>=1||item.reorder>=2) ved.E.push(item);
      else ved.D.push(item);
    });

    const topItems = Object.entries(consumptionMap).sort((a,b)=>b[1]-a[1]).slice(0,5);

    const predictions = inventory.map(item=>{
      const entries=history.filter(h=>h.item===item.name);
      if(!entries.length) return null;
      const total=entries.reduce((s,h)=>s+Number(h.qty),0);
      const dates=entries.map(h=>new Date(h.time).getTime());
      const span=Math.max(1,(Date.now()-Math.min(...dates))/86400000);
      const rate=total/span;
      const daysLeft=rate>0?Math.floor(item.qty/rate):null;
      const expiryDays=item.expiry?Math.ceil((new Date(item.expiry)-new Date())/86400000):null;
      const effective=expiryDays!=null&&daysLeft!=null?Math.min(daysLeft,expiryDays):daysLeft??expiryDays;
      const rateLabel=rate>=1?`${rate.toFixed(1)} ${item.unit}/day`:`1 ${item.unit} every ${Math.round(1/rate)} days`;
      return{...item,daysRemaining:effective,rateLabel,limitReason:expiryDays!=null&&daysLeft!=null&&expiryDays<daysLeft?"expiry":"usage"};
    }).filter(Boolean).sort((a,b)=>(a.daysRemaining??999)-(b.daysRemaining??999));

    const wasteRisk=inventory.filter(i=>i.expiry&&i.qty>0&&(new Date(i.expiry)-new Date())/86400000<=7);
    const recentH=history.filter(h=>new Date(h.time).getTime()>Date.now()-30*86400000);

    const Tag=({label,color,bg})=><span style={{ background:bg, color, fontSize:9, fontWeight:800, borderRadius:6, padding:"2px 7px" }}>{label}</span>;

    return(
      <div>
        <div style={S.dh()}><h1 style={{ fontSize:22, fontWeight:800, margin:"0 0 2px" }}>Insights 📊</h1><p style={{ color:"#9ca3af", margin:0, fontSize:12 }}>Real intelligence from your pantry data</p></div>
        <div style={S.content}>
          {!dismissedHints.insights && <TabHint tab="insights" onDismiss={() => dismissHint("insights")} />}

          <div style={S.card}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}><p style={{ margin:0, fontWeight:800, fontSize:14 }}>📊 ABC Analysis</p><Tag label="LIVE" color="#059669" bg="#f0fdf4" /></div>
            <p style={{ margin:"0 0 10px", fontSize:11, color:"#9ca3af" }}>Pareto by consumption · A={abc.A.length} · B={abc.B.length} · C={abc.C.length}</p>
            {[{key:"A",label:"A — High Value",desc:"Top 70% of consumption",color:"#ef4444",bg:"#fef2f2",items:abc.A},
              {key:"B",label:"B — Medium",desc:"Next 20%",color:"#f97316",bg:"#fff7ed",items:abc.B},
              {key:"C",label:"C — Low Value",desc:"Bottom 10%",color:"#6b7280",bg:"#f9fafb",items:abc.C}].map(g=>(
              <div key={g.key} style={{ background:g.bg, borderRadius:12, padding:"10px 12px", marginBottom:6, border:`1px solid ${g.color}22` }}>
                <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:6 }}>
                  <div style={{ width:20, height:20, borderRadius:6, background:g.color, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><span style={{ color:"white", fontSize:10, fontWeight:800 }}>{g.key}</span></div>
                  <span style={{ fontSize:12, fontWeight:800, color:g.color }}>{g.label}</span>
                  <span style={{ fontSize:10, color:"#9ca3af" }}>{g.desc}</span>
                </div>
                {g.items.length===0?<p style={{ margin:0, fontSize:11, color:"#9ca3af" }}>No items yet</p>:(
                  <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                    {g.items.map(i=><span key={i.id} style={{ background:"white", borderRadius:7, padding:"2px 8px", fontSize:11, fontWeight:600, color:"#374151", border:`1px solid ${g.color}20` }}>{i.emoji} {i.name}{i.consumed>0?` ·${i.consumed}`:""}</span>)}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={S.card}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}><p style={{ margin:0, fontWeight:800, fontSize:14 }}>🔄 Consumption Patterns</p><Tag label="LIVE" color="#059669" bg="#f0fdf4" /></div>
            {topItems.length===0?<p style={{ margin:0, fontSize:12, color:"#9ca3af" }}>Log item usage to see patterns</p>
            :topItems.map(([name,qty],i)=>{
              const inv=inventory.find(it=>it.name===name);
              const bars=["#d97706","#059669","#2563eb","#9333ea","#6b7280"];
              return(<div key={i} style={{ marginBottom:11 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ fontSize:13, fontWeight:700 }}>{inv?.emoji||"📦"} {name}</span>
                  <span style={{ fontSize:12, color:"#6b7280", fontWeight:600 }}>{qty} {inv?.unit||"units"}</span>
                </div>
                <div style={{ background:"#f3f4f6", borderRadius:5, height:8, overflow:"hidden" }}>
                  <div style={{ height:"100%", borderRadius:5, background:bars[i], width:`${(qty/topItems[0][1])*100}%`, transition:"width 0.4s" }} />
                </div>
              </div>);
            })}
          </div>

          <div style={S.card}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}><p style={{ margin:0, fontWeight:800, fontSize:14 }}>🔮 Predicted Reorder</p><Tag label="COMPUTED" color="#2563eb" bg="#eff6ff" /></div>
            <p style={{ margin:"0 0 10px", fontSize:11, color:"#9ca3af" }}>Based on your actual usage rate · {predictions.length} items tracked</p>
            {predictions.length===0?<p style={{ margin:0, fontSize:12, color:"#9ca3af" }}>Log usage to generate predictions</p>
            :predictions.map((p,i)=>{
              const urg=p.daysRemaining!=null&&p.daysRemaining<=3?"critical":p.daysRemaining!=null&&p.daysRemaining<=7?"high":"ok";
              const uc=urg==="critical"?"#ef4444":urg==="high"?"#f97316":"#059669";
              const dl=p.daysRemaining==null?"No data":p.daysRemaining<=0?"Out now!":p.daysRemaining===1?"~1 day left":`~${p.daysRemaining} days`;
              return(<div key={p.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:i<predictions.length-1?"1px solid #f5f5f4":"none" }}>
                <div style={{ width:36, height:36, borderRadius:11, background:SB[urg==="critical"?"out":urg==="high"?"low":"good"], display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, flexShrink:0 }}>{p.emoji}</div>
                <div style={{ flex:1 }}><p style={{ margin:"0 0 1px", fontWeight:700, fontSize:13 }}>{p.name}</p><p style={{ margin:0, fontSize:10, color:"#9ca3af" }}>{p.rateLabel}{p.limitReason==="expiry"?" · expiry sooner":""}</p></div>
                <div style={{ textAlign:"right" }}><p style={{ margin:0, fontSize:12, fontWeight:800, color:uc }}>{dl}</p><p style={{ margin:0, fontSize:10, color:"#9ca3af" }}>{p.qty} {p.unit} left</p></div>
              </div>);
            })}
          </div>

          <div style={S.card}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}><p style={{ margin:0, fontWeight:800, fontSize:14 }}>♻️ Waste Risk</p><Tag label="LIVE" color="#059669" bg="#f0fdf4" /></div>
            {wasteRisk.length===0?<div style={{ background:"#f0fdf4", borderRadius:12, padding:"11px", border:"1px solid #bbf7d0" }}><p style={{ margin:0, fontSize:13, color:"#15803d", fontWeight:600 }}>✅ No waste risk — great management!</p></div>
            :wasteRisk.map(item=>{
              const days=Math.ceil((new Date(item.expiry)-new Date())/86400000);
              const daily=days>0?(item.qty/days).toFixed(1):"∞";
              return(<div key={item.id} style={{ background:"#fff7ed", borderRadius:12, padding:"11px 13px", marginBottom:7, border:"1px solid #fde68a" }}>
                <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:7 }}>
                  <span style={{ fontSize:19 }}>{item.emoji}</span>
                  <div style={{ flex:1 }}><p style={{ margin:0, fontWeight:700, fontSize:13 }}>{item.name}</p><p style={{ margin:0, fontSize:11, color:"#92400e" }}>{item.qty} {item.unit} · expires in {days} day{days!==1?"s":""}</p></div>
                  <span style={{ background:days<=2?"#fef2f2":"#fef3c7", color:days<=2?"#ef4444":"#92400e", borderRadius:7, padding:"3px 8px", fontSize:10, fontWeight:800 }}>{days<=0?"Expired!":days<=2?"Use Today!":"Use First!"}</span>
                </div>
                <div style={{ background:"rgba(0,0,0,0.05)", borderRadius:8, padding:"6px 10px" }}><p style={{ margin:0, fontSize:11, color:"#92400e", fontWeight:600 }}>💡 Use {daily} {item.unit}/day to finish before expiry</p></div>
              </div>);
            })}
          </div>

          <div style={S.card}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}><p style={{ margin:0, fontWeight:800, fontSize:14 }}>📋 VED Analysis</p><Tag label="COMPUTED" color="#2563eb" bg="#eff6ff" /></div>
            <p style={{ margin:"0 0 10px", fontSize:11, color:"#9ca3af" }}>Vital · Essential · Desirable — inferred from category, reorder & usage</p>
            {[{key:"V",label:"V — Vital",desc:"Baby, high reorder or frequent use",color:"#ef4444",bg:"#fef2f2",items:ved.V},
              {key:"E",label:"E — Essential",desc:"Regular use or moderate reorder",color:"#f97316",bg:"#fff7ed",items:ved.E},
              {key:"D",label:"D — Desirable",desc:"Rarely used, low criticality",color:"#6b7280",bg:"#f9fafb",items:ved.D}].map(g=>(
              <div key={g.key} style={{ background:g.bg, borderRadius:12, padding:"10px 12px", marginBottom:6, border:`1px solid ${g.color}22` }}>
                <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:5 }}>
                  <div style={{ width:20, height:20, borderRadius:6, background:g.color, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><span style={{ color:"white", fontSize:10, fontWeight:800 }}>{g.key}</span></div>
                  <span style={{ fontSize:12, fontWeight:800, color:g.color }}>{g.label}</span>
                  <span style={{ fontSize:10, color:"#9ca3af" }}>{g.desc}</span>
                </div>
                {g.items.length===0?<p style={{ margin:0, fontSize:11, color:"#9ca3af" }}>No items</p>:(
                  <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>{g.items.map(i=><span key={i.id} style={{ background:"white", borderRadius:7, padding:"2px 8px", fontSize:11, fontWeight:600, color:"#374151" }}>{i.emoji} {i.name}</span>)}</div>
                )}
              </div>
            ))}
          </div>

          <div style={{ background:"#1e1b18", borderRadius:18, padding:"18px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}><p style={{ margin:0, fontWeight:800, fontSize:14, color:"white" }}>💰 Last 30 Days</p><Tag label="COMPUTED" color="#fcd34d" bg="rgba(255,255,255,0.1)" /></div>
            <div style={{ display:"flex", gap:8 }}>
              {[{label:"Items Used",value:recentH.length,icon:"📦",color:"#60a5fa",sub:"log entries"},
                {label:"Before Expiry",value:recentH.filter(h=>inventory.find(i=>i.name===h.item)?.expiry).length,icon:"♻️",color:"#4ade80",sub:"waste avoided"},
                {label:"JIT Triggered",value:recentH.filter(h=>{ const i=inventory.find(it=>it.name===h.item); return i&&i.reorder>0; }).length,icon:"⚡",color:"#fcd34d",sub:"restock alerts"}].map((s,i)=>(
                <div key={i} style={{ flex:1, background:"rgba(255,255,255,0.08)", borderRadius:13, padding:"12px 6px", textAlign:"center" }}>
                  <div style={{ fontSize:17, marginBottom:3 }}>{s.icon}</div>
                  <p style={{ margin:"0 0 1px", fontWeight:800, fontSize:20, color:s.color }}>{s.value}</p>
                  <p style={{ margin:0, fontSize:9, color:"#9ca3af", fontWeight:600, lineHeight:1.3 }}>{s.label}<br/>{s.sub}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
        <NavBar />
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────
  return(
    <Wrapper>
      {showItemsList && <ItemsList inventory={inventory} spaces={spaces} onClose={() => setShowItemsList(false)} onEditItem={(item) => setEditingItem(item)} />}
      {editingItem && <EditItemModal item={editingItem} spaces={spaces} onSave={async (id, data) => { await updateItem(id, data); }} onDelete={async (id) => { await removeItem(id); }} onClose={() => setEditingItem(null)} />}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      {activeTab==="home"&&<HomeTab />}
      {activeTab==="spaces"&&<SpacesTab />}
      {activeTab==="add"&&<AddTab />}
      {activeTab==="used"&&<UsedTab />}
      {activeTab==="insights"&&<InsightsTab />}
      {showSearch&&<SearchOverlay />}
      {showShop&&<ShopOverlay />}
    </Wrapper>
  );
}


// ── Global photo refresh counter ─────────────────────────────
let _photoRefreshKey = 0;
function bumpPhotoRefresh() { _photoRefreshKey++; }

// ── Compress image to base64 (max 400px, 0.7 quality) ────────
function compressImage(file, maxWidth=250, quality=0.45) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        // Keep compressing until under 60KB
        let q = quality;
        let result = canvas.toDataURL("image/jpeg", q);
        while (result.length > 80000 && q > 0.1) {
          q -= 0.1;
          result = canvas.toDataURL("image/jpeg", q);
        }
        resolve(result);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ── Stable AddShelfForm ──────────────────────────────────────
function AddShelfForm({ onAdd, onCancel }) {
  const [shelfId, setShelfId] = useState("");
  const [shelfName, setShelfName] = useState("");
  const [photo, setPhoto] = useState(null);
  const inp = { width:"100%", background:"white", border:"2px solid #f0ede8", borderRadius:13, padding:"11px 13px", fontSize:14, fontWeight:600, outline:"none", boxSizing:"border-box", fontFamily:"'DM Sans',sans-serif", color:"#1e1b18" };
  const lbl = { fontSize:11, fontWeight:700, color:"#9ca3af", letterSpacing:"0.07em", textTransform:"uppercase", display:"block", marginBottom:5 };
  return (
    <div style={{ background:"white", borderRadius:18, padding:"14px", boxShadow:"0 2px 8px rgba(0,0,0,0.05)", marginBottom:10 }}>
      <p style={{ margin:"0 0 12px", fontWeight:800, fontSize:14 }}>New Shelf</p>

      {/* Photo */}
      <div style={{ marginBottom:12 }}>
        <label style={lbl}>Shelf Photo (optional)</label>
        <div style={{ position:"relative", height:90, borderRadius:12, overflow:"hidden", background: photo ? "transparent" : "#f3f4f6", display:"flex", alignItems:"center", justifyContent:"center" }}>
          {photo
            ? <img src={photo} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt="" />
            : <div style={{ textAlign:"center", color:"#9ca3af" }}><div style={{ fontSize:24 }}>📷</div><p style={{ margin:"2px 0 0", fontSize:10, fontWeight:600 }}>Take a photo of this shelf</p></div>
          }
          <label style={{ position:"absolute", bottom:6, right:6, background:"#1e1b18", color:"white", borderRadius:8, padding:"4px 10px", fontSize:10, fontWeight:700, cursor:"pointer" }}>
            {photo ? "Change" : "📷 Add"}
            <input type="file" accept="image/*" capture="environment" style={{ display:"none" }} onChange={async e => {
              const file = e.target.files[0]; if (!file) return;
              const compressed = await compressImage(file);
              setPhoto(compressed);
            }} />
          </label>
          {photo && <button onClick={() => setPhoto(null)} style={{ position:"absolute", top:6, right:6, background:"rgba(0,0,0,0.5)", color:"white", border:"none", borderRadius:6, padding:"2px 7px", fontSize:10, cursor:"pointer" }}>✕</button>}
        </div>
      </div>

      <div style={{ marginBottom:10 }}>
        <label style={lbl}>Shelf ID (e.g. A1, B2)</label>
        <input style={inp} placeholder="e.g. A4" value={shelfId} onChange={e => setShelfId(e.target.value)} />
      </div>
      <div style={{ marginBottom:12 }}>
        <label style={lbl}>Shelf Name</label>
        <input style={inp} placeholder="e.g. Top Shelf, Snacks..." value={shelfName} onChange={e => setShelfName(e.target.value)} />
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <button onClick={() => onAdd(shelfId, shelfName, photo)} style={{ flex:1, background:"#1e1b18", color:"white", border:"none", borderRadius:13, padding:"12px", fontWeight:700, cursor:"pointer" }}>Add Shelf</button>
        <button onClick={onCancel} style={{ flex:1, background:"#f3f4f6", color:"#374151", border:"none", borderRadius:13, padding:"12px", fontWeight:700, cursor:"pointer" }}>Cancel</button>
      </div>
    </div>
  );
}

// ── Stable AddSpaceForm ──────────────────────────────────────
function AddSpaceForm({ onAdd, onCancel }) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📦");
  const SPACE_ICONS = ["🗄️","🧊","🍼","🛒","🍷","🥫","🧴","🫙","🧺","🍳","🌿","📦"];
  const inp = { width:"100%", background:"white", border:"2px solid #f0ede8", borderRadius:13, padding:"11px 13px", fontSize:14, fontWeight:600, outline:"none", boxSizing:"border-box", fontFamily:"'DM Sans',sans-serif", color:"#1e1b18" };
  const lbl = { fontSize:11, fontWeight:700, color:"#9ca3af", letterSpacing:"0.07em", textTransform:"uppercase", display:"block", marginBottom:5 };
  return (
    <div style={{ width:"min(390px,100vw)", background:"white", borderRadius:"28px 28px 0 0", padding:"24px 20px 36px" }}>
      <h2 style={{ fontSize:18, fontWeight:800, margin:"0 0 16px" }}>New Space</h2>
      <div style={{ marginBottom:12 }}>
        <label style={lbl}>Space Name</label>
        <input style={inp} placeholder="e.g. Kitchen Cupboard, Garage..." value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div style={{ marginBottom:16 }}>
        <label style={lbl}>Icon</label>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {SPACE_ICONS.map(ic => (
            <div key={ic} onClick={() => setIcon(ic)} style={{ width:40, height:40, borderRadius:11, background:icon===ic?"#1e1b18":"#f3f4f6", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, cursor:"pointer" }}>{ic}</div>
          ))}
        </div>
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <button onClick={() => onAdd(name, icon)} style={{ flex:1, background:"#1e1b18", color:"white", border:"none", borderRadius:13, padding:"13px", fontWeight:700, cursor:"pointer" }}>Create Space</button>
        <button onClick={onCancel} style={{ flex:1, background:"#f3f4f6", color:"#374151", border:"none", borderRadius:13, padding:"13px", fontWeight:700, cursor:"pointer" }}>Cancel</button>
      </div>
    </div>
  );
}

// ── Stable ManualEntryForm — own local state, no remount on parent re-render ──
function ManualEntryForm({ initialItem, onBack, onContinue, navBar }) {
  const [name, setName] = useState(initialItem.name || "");
  const [brand, setBrand] = useState(initialItem.brand || "");
  const [category, setCategory] = useState(initialItem.category || "");
  const [unit, setUnit] = useState(initialItem.unit || "pcs");
  const [unitSource, setUnitSource] = useState(null);
  const [imagePreview] = useState(initialItem.imagePreview || null);
  const [aiResult] = useState(initialItem.aiResult || null);
  const [aiError] = useState(initialItem.aiError || null);

  const UNITS = ["pcs","kg","g","lbs","oz","liters","ml","gallons","cartons","packs","cans","bottles","boxes","bags","loaves","cups","jars","rolls"];
  const CATEGORIES = ["Grains & Pasta","Canned Goods","Dairy","Produce","Snacks","Beverages","Baby","Cleaning","Frozen","Condiments","Bakery","Other"];
  const PRODUCT_DEFAULTS = {
    "milk":{ unit:"gallons", category:"Dairy" }, "rice":{ unit:"kg", category:"Grains & Pasta" },
    "pasta":{ unit:"packs", category:"Grains & Pasta" }, "eggs":{ unit:"pcs", category:"Dairy" },
    "bread":{ unit:"loaves", category:"Bakery" }, "butter":{ unit:"packs", category:"Dairy" },
    "yogurt":{ unit:"cups", category:"Dairy" }, "juice":{ unit:"bottles", category:"Beverages" },
    "diapers":{ unit:"pcs", category:"Baby" }, "formula":{ unit:"cans", category:"Baby" },
    "spinach":{ unit:"bags", category:"Produce" }, "oil":{ unit:"bottles", category:"Condiments" },
  };
  const HOUSEHOLD_UNITS = { "Milk":"gallons","Rice":"kg","Pasta":"packs","Diapers":"pcs","Eggs":"pcs","Bread":"loaves" };

  function smartUnit(n) {
    const l = n.toLowerCase().trim();
    for (const [k,u] of Object.entries(HOUSEHOLD_UNITS)) if (k.toLowerCase()===l) return {unit:u,source:"household",category:null};
    for (const [k,d] of Object.entries(PRODUCT_DEFAULTS)) if (l.includes(k)) return {unit:d.unit,source:"global",category:d.category};
    return {unit:"pcs",source:"fallback",category:null};
  }

  const handleNameChange = (e) => {
    const n = e.target.value;
    const smart = smartUnit(n);
    setName(n);
    setUnit(smart.unit);
    setUnitSource(smart.source);
    if (smart.category && !category) setCategory(smart.category);
  };

  const inp = { width:"100%", background:"white", border:"2px solid #f0ede8", borderRadius:13, padding:"12px 14px", fontSize:14, fontWeight:600, outline:"none", boxSizing:"border-box", fontFamily:"'DM Sans',sans-serif", color:"#1e1b18" };
  const lbl = { fontSize:11, fontWeight:700, color:"#9ca3af", letterSpacing:"0.07em", textTransform:"uppercase", display:"block", marginBottom:6 };
  const card = { background:"white", borderRadius:18, padding:"14px", boxShadow:"0 2px 8px rgba(0,0,0,0.05)", marginBottom:10 };
  const btnStyle = (active) => ({ width:"100%", background:active?"#1e1b18":"#e5e7eb", color:active?"white":"#9ca3af", border:"none", borderRadius:16, padding:"16px", fontSize:15, fontWeight:700, cursor:active?"pointer":"not-allowed" });

  return (
    <div>
      <div style={{ background: aiResult ? "#059669" : "#1e1b18", padding:"16px 18px 18px", color:"white" }}>
        <div style={{ display:"flex", alignItems:"center" }}>
          <button style={{ color:"white", fontSize:22, cursor:"pointer", background:"none", border:"none", padding:0, marginRight:8 }} onClick={onBack}>‹</button>
          <div>
            <h1 style={{ fontSize:20, fontWeight:800, margin:0 }}>{aiResult ? "AI Filled ✨" : "Enter Manually"}</h1>
            <p style={{ color: aiResult ? "#a7f3d0" : "#9ca3af", margin:0, fontSize:12 }}>Smart unit fills as you type</p>
          </div>
        </div>
      </div>
      <div style={{ padding:"14px 14px 88px" }}>
        {imagePreview && <div style={{ borderRadius:14, overflow:"hidden", height:110, marginBottom:10 }}><img src={imagePreview} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt="" /></div>}
        {aiError && <div style={{ background:"#fef3c7", borderRadius:12, padding:"10px 14px", marginBottom:10, border:"1px solid #fde68a" }}><p style={{ margin:0, fontSize:12, fontWeight:600, color:"#92400e" }}>⚠️ {aiError}</p></div>}
        <div style={card}>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div>
              <label style={lbl}>Item Name *</label>
              <input style={inp} placeholder="e.g. Milk, Rice..." value={name} onChange={handleNameChange} />
              {name && unitSource && (
                <div style={{ marginTop:5, display:"flex", gap:5, alignItems:"center" }}>
                  <span style={{ fontSize:10, color:unitSource==="household"?"#059669":"#2563eb", fontWeight:700 }}>{unitSource==="household"?"✓ Household:":"✓ Suggested:"}</span>
                  <span style={{ background:unitSource==="household"?"#f0fdf4":"#eff6ff", color:unitSource==="household"?"#059669":"#2563eb", fontSize:10, fontWeight:800, borderRadius:7, padding:"2px 8px" }}>{unit}</span>
                </div>
              )}
            </div>
            <div>
              <label style={lbl}>Brand</label>
              <input style={inp} placeholder="e.g. Royal, Quaker..." value={brand} onChange={e => setBrand(e.target.value)} />
            </div>
            <div>
              <label style={lbl}>Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...inp, padding:"11px 13px" }}>
                <option value="">Select...</option>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Unit</label>
              <select value={unit} onChange={e => setUnit(e.target.value)} style={{ ...inp, padding:"11px 13px" }}>
                {UNITS.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
        </div>
        <button style={btnStyle(!!name.trim())} disabled={!name.trim()} onClick={() => onContinue({ name, brand, category, unit })}>
          Continue →
        </button>
      </div>
      {navBar}
    </div>
  );
}


// ── ItemsList overlay ────────────────────────────────────────
function ItemsList({ inventory, spaces, onClose, onEditItem }) {
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
    return sp ? `${sp.name} › ${item.shelfId}` : item.shelfId || "—";
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
      {/* Header */}
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

      {/* Column headers */}
      <div style={{ display:"flex", background:"#f8f7f5", borderBottom:"1px solid #e5e7eb", flexShrink:0 }}>
        {COLS.map(col => (
          <div key={col.key}
            onClick={() => toggleSort(col.key)}
            style={{
              flex: col.key === "name" ? 2.5 : col.key === "space" ? 2 : 1,
              padding:"8px 6px",
              fontSize:10,
              fontWeight:700,
              color: sortKey === col.key ? "#d97706" : "#6b7280",
              textTransform:"uppercase",
              letterSpacing:"0.05em",
              cursor:"pointer",
              userSelect:"none",
              display:"flex",
              alignItems:"center",
              gap:3,
            }}>
            {col.label}
            {sortKey === col.key && <span style={{ fontSize:10 }}>{sortDir === "asc" ? "↑" : "↓"}</span>}
          </div>
        ))}
      </div>

      {/* Rows */}
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

// ── Phone wrapper ──────────────────────────────────────────────
function Wrapper({ children }) {
  const [isMobile] = useState(() => window.innerWidth <= 500);

  // Mobile: full-screen, no phone frame
  if (isMobile) {
    return (
      <div style={{ minHeight:"100vh", width:"100%", background:"#faf9f7", fontFamily:"'DM Sans',sans-serif" }}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        {children}
      </div>
    );
  }

  // Desktop: phone frame preview
  return(
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#1e1b18 0%,#3d2f1f 50%,#1e1b18 100%)", display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"32px 16px", fontFamily:"'DM Sans',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ textAlign:"center", width:"100%" }}>
        <div style={{ marginBottom:18 }}>
          <h1 style={{ color:"white", fontSize:26, fontWeight:800, margin:"0 0 4px", letterSpacing:"-1px" }}>🥫 pantri</h1>
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

// ══════════════════════════════════════════════════════════════
// ─── EDIT ITEM MODAL ─────────────────────────────────────────
// ══════════════════════════════════════════════════════════════
function EditItemModal({ item, onSave, onDelete, onClose, spaces }) {
  const [form, setForm] = useState({
    name: item.name || "",
    brand: item.brand || "",
    category: item.category || "",
    qty: item.qty ?? 1,
    unit: item.unit || "pcs",
    reorder: item.reorder ?? 1,
    expiry: item.expiry || "",
    emoji: item.emoji || "📦",
  });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    await onSave(item.id, {
      name: form.name.trim(),
      brand: form.brand.trim(),
      category: form.category,
      qty: Number(form.qty) || 0,
      unit: form.unit,
      reorder: Number(form.reorder) || 1,
      expiry: form.expiry,
      emoji: form.emoji,
    });
    setSaving(false);
    onClose();
  };

  const handleDelete = async () => {
    setSaving(true);
    await onDelete(item.id);
    setSaving(false);
    onClose();
  };

  const EMOJIS = ["📦","🥛","🍚","🥫","🍞","🥚","🧈","🥤","🍼","🧃","🫙","🥜","🧀","🍎","🥩","🥬","🍪","🧴","🧻","🧹"];
  const inp = S.input;
  const lbl = S.label;

  return (
    <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.5)", zIndex:300, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div style={{ width:"min(390px,100vw)", background:"#faf9f7", borderRadius:"28px 28px 0 0", maxHeight:"85vh", overflow:"auto" }}>
        <div style={{ background:"#1e1b18", padding:"16px 18px 18px", borderRadius:"28px 28px 0 0", color:"white", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div><h1 style={{ fontSize:20, fontWeight:800, margin:"0 0 2px" }}>Edit Item ✏️</h1><p style={{ color:"#9ca3af", margin:0, fontSize:12 }}>Update details or remove</p></div>
          <span onClick={onClose} style={{ color:"#9ca3af", fontSize:22, cursor:"pointer" }}>×</span>
        </div>
        <div style={{ padding:"14px 14px 32px", ...S.gap(12) }}>
          {/* Emoji picker */}
          <div>
            <label style={lbl}>Emoji</label>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {EMOJIS.map(e => (
                <div key={e} onClick={() => set("emoji", e)} style={{ width:34, height:34, borderRadius:10, background: form.emoji === e ? "#d97706" : "#f3f4f6", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, cursor:"pointer", border: form.emoji === e ? "2px solid #b45309" : "2px solid transparent" }}>{e}</div>
              ))}
            </div>
          </div>
          {/* Name + Brand */}
          <div>
            <label style={lbl}>Name</label>
            <input style={inp} value={form.name} onChange={e => set("name", e.target.value)} placeholder="Item name" />
          </div>
          <div>
            <label style={lbl}>Brand</label>
            <input style={inp} value={form.brand} onChange={e => set("brand", e.target.value)} placeholder="Brand (optional)" />
          </div>
          {/* Category */}
          <div>
            <label style={lbl}>Category</label>
            <select style={{ ...inp, appearance:"auto" }} value={form.category} onChange={e => set("category", e.target.value)}>
              <option value="">Select...</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {/* Qty + Unit row */}
          <div style={{ display:"flex", gap:8 }}>
            <div style={{ flex:1 }}>
              <label style={lbl}>Quantity</label>
              <input style={inp} type="number" min="0" step="0.5" value={form.qty} onChange={e => set("qty", e.target.value)} />
            </div>
            <div style={{ flex:1 }}>
              <label style={lbl}>Unit</label>
              <select style={{ ...inp, appearance:"auto" }} value={form.unit} onChange={e => set("unit", e.target.value)}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          {/* Reorder + Expiry row */}
          <div style={{ display:"flex", gap:8 }}>
            <div style={{ flex:1 }}>
              <label style={lbl}>Reorder Level</label>
              <input style={inp} type="number" min="0" step="1" value={form.reorder} onChange={e => set("reorder", e.target.value)} />
            </div>
            <div style={{ flex:1 }}>
              <label style={lbl}>Expiry Date</label>
              <input style={inp} type="date" value={form.expiry} onChange={e => set("expiry", e.target.value)} />
            </div>
          </div>
          {/* Location (read-only info) */}
          {item.spaceId && (
            <div style={{ background:"#f3f4f6", borderRadius:12, padding:"10px 14px" }}>
              <p style={{ margin:0, fontSize:11, color:"#6b7280" }}>Location: <strong>{spaces.find(s => s.id === item.spaceId)?.name || item.spaceId}</strong> &rsaquo; {item.shelfId || "—"}</p>
            </div>
          )}
          {/* Save */}
          <button onClick={handleSave} disabled={saving || !form.name.trim()} style={S.btn("#d97706", "white", saving || !form.name.trim())}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
          {/* Delete */}
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} style={{ ...S.outline, color:"#ef4444", borderColor:"#fecaca" }}>
              🗑️ Delete Item
            </button>
          ) : (
            <div style={{ background:"#fef2f2", borderRadius:14, padding:"14px", border:"1px solid #fecaca" }}>
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

// ══════════════════════════════════════════════════════════════
// ─── ONBOARDING CAROUSEL ─────────────────────────────────────
// ══════════════════════════════════════════════════════════════
const ONBOARDING_SLIDES = [
  { emoji:"🥫", title:"Welcome to Pantri!", desc:"Your smart pantry assistant. Let's show you around in 30 seconds." },
  { emoji:"🗄️", title:"Organize by Space", desc:"Create spaces like \"Pantry\", \"Fridge\", \"Baby Corner\" — add shelves & photos inside each." },
  { emoji:"➕", title:"Add Items Easily", desc:"Scan a barcode, snap a photo (AI reads labels), or type manually. Smart units auto-fill." },
  { emoji:"📉", title:"Track What You Use", desc:"Tap items to log usage. Try Meal Mode — pick a recipe and auto-deduct ingredients." },
  { emoji:"📊", title:"Stay Ahead", desc:"Insights predict when you'll run out, flag expiring items, and build your shopping list automatically." },
];

function OnboardingCarousel({ onComplete }) {
  const [step, setStep] = useState(0);
  const slide = ONBOARDING_SLIDES[step];
  const isLast = step === ONBOARDING_SLIDES.length - 1;

  return (
    <div style={{ minHeight:680, background:"#1e1b18", display:"flex", flexDirection:"column", justifyContent:"space-between", padding:"0" }}>
      {/* Skip */}
      <div style={{ padding:"16px 20px 0", textAlign:"right" }}>
        <span onClick={onComplete} style={{ color:"#9ca3af", fontSize:12, fontWeight:600, cursor:"pointer", letterSpacing:"0.03em" }}>Skip</span>
      </div>

      {/* Card */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"0 32px", textAlign:"center" }}>
        <div style={{ width:100, height:100, borderRadius:28, background:"rgba(217,119,6,0.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:48, marginBottom:28, border:"2px solid rgba(217,119,6,0.25)" }}>
          {slide.emoji}
        </div>
        <h2 style={{ fontSize:26, fontWeight:800, color:"white", margin:"0 0 12px", letterSpacing:"-0.8px", lineHeight:1.2 }}>{slide.title}</h2>
        <p style={{ fontSize:14, color:"#9ca3af", margin:0, lineHeight:1.7, maxWidth:280 }}>{slide.desc}</p>
      </div>

      {/* Dots + Button */}
      <div style={{ padding:"0 24px 40px" }}>
        {/* Dot indicators */}
        <div style={{ display:"flex", justifyContent:"center", gap:8, marginBottom:20 }}>
          {ONBOARDING_SLIDES.map((_, i) => (
            <div key={i} onClick={() => setStep(i)} style={{
              width: i === step ? 24 : 8, height:8, borderRadius:4,
              background: i === step ? "#d97706" : "rgba(255,255,255,0.15)",
              transition:"all 0.3s ease", cursor:"pointer",
            }} />
          ))}
        </div>
        {/* Action button */}
        <button onClick={() => isLast ? onComplete() : setStep(s => s + 1)} style={{
          width:"100%", background: isLast ? "#d97706" : "white", color: isLast ? "white" : "#1e1b18",
          border:"none", borderRadius:16, padding:"16px", fontSize:15, fontWeight:700, cursor:"pointer",
        }}>
          {isLast ? "Let's Go →" : "Next →"}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ─── TAB HINT TOOLTIP ────────────────────────────────────────
// ══════════════════════════════════════════════════════════════
const TAB_HINTS = {
  home:     { icon:"🏠", text:"This is your dashboard — see stock levels, expiring items & quick stats. Tap 🛒 for your shopping list." },
  spaces:   { icon:"🗄️", text:"Tap a space to see shelves inside. Add photos to remember what goes where!" },
  add:      { icon:"➕", text:"Choose how to add: scan, photo, or manual. AI auto-fills details from photos." },
  used:     { icon:"📉", text:"Tap any item to log usage. Try 🍽️ Cook to pick a recipe!" },
  insights: { icon:"📊", text:"Your pantry intelligence — consumption trends, reorder predictions & waste alerts." },
};

function TabHint({ tab, onDismiss }) {
  const hint = TAB_HINTS[tab];
  if (!hint) return null;

  return (
    <div style={{ margin:"0 0 12px", position:"relative", zIndex:500 }}>
      {/* Arrow pointing up */}
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
