// ── PantriPal Data Hook ──────────────────────────────────────
// Manages inventory, history, and spaces state.
// Connects to Firestore with real-time listeners in live mode,
// falls back to local demo data when IS_DEMO is true.

import { useState, useEffect, useRef } from "react";
import { DEFAULT_SPACES } from "../lib/pantriConstants.js";
import { genId } from "../lib/pantriUtils.js";
import { IS_DEMO, getFirebase } from "../lib/firebaseClient.js";

// ── Demo data (used when Firebase config is absent) ──────────
const DEMO_INVENTORY = [
  { id:"1", name:"Basmati Rice", brand:"Royal", category:"Grains & Pasta", qty:4, unit:"Kg", reorder:1, spaceId:"s1", shelfId:"A1", emoji:"🍚", expiry:"2026-12", price:85, priceHistory:[{price:85,date:"2026-03-01",qty:4}] },
  { id:"2", name:"Pasta", brand:"Barilla", category:"Grains & Pasta", qty:3, unit:"Packs", reorder:2, spaceId:"s1", shelfId:"A1", emoji:"🍝", expiry:"2026-08", price:120, priceHistory:[{price:110,date:"2026-02-10",qty:3},{price:120,date:"2026-03-05",qty:3}] },
  { id:"3", name:"Tomato Sauce", brand:"Heinz", category:"Canned Goods", qty:1, unit:"Cans", reorder:2, spaceId:"s1", shelfId:"A2", emoji:"🍅", expiry:"2026-06", price:45, priceHistory:[{price:45,date:"2026-02-20",qty:2}] },
  { id:"4", name:"Milk", brand:"Horizon", category:"Dairy", qty:1, unit:"Gallons", reorder:1, spaceId:"s2", shelfId:"F1", emoji:"🥛", expiry:"2026-03-10", price:65, priceHistory:[{price:60,date:"2026-02-15",qty:1},{price:65,date:"2026-03-08",qty:1}] },
  { id:"5", name:"Spinach", brand:"Generic", category:"Produce", qty:1, unit:"Bags", reorder:1, spaceId:"s2", shelfId:"F3", emoji:"🥬", expiry:"2026-03-09", price:30, priceHistory:[{price:30,date:"2026-03-07",qty:1}] },
  { id:"6", name:"Diapers (Size 2)", brand:"Pampers", category:"Baby", qty:8, unit:"Pcs", reorder:20, spaceId:"s3", shelfId:"B2", emoji:"🧷", expiry:null, price:12, priceHistory:[{price:12,date:"2026-03-01",qty:20}] },
  { id:"7", name:"Baby Formula", brand:"Similac", category:"Baby", qty:2, unit:"Cans", reorder:2, spaceId:"s3", shelfId:"B1", emoji:"🍼", expiry:"2026-09", price:320, priceHistory:[{price:310,date:"2026-02-01",qty:2},{price:320,date:"2026-03-01",qty:2}] },
  { id:"8", name:"Olive Oil", brand:"Kirkland", category:"Condiments", qty:1, unit:"Bottles", reorder:1, spaceId:"s1", shelfId:"A3", emoji:"🫒", expiry:null, price:250, priceHistory:[{price:250,date:"2026-02-25",qty:1}] },
];

const DEMO_HISTORY = [
  { id:"h1", item:"Milk", qty:1, unit:"Gallons", time:new Date(Date.now()-5*86400000), unitPrice:65, cost:65 },
  { id:"h2", item:"Pasta", qty:1, unit:"Packs", time:new Date(Date.now()-7*86400000), unitPrice:120, cost:120 },
  { id:"h3", item:"Milk", qty:1, unit:"Gallons", time:new Date(Date.now()-10*86400000), unitPrice:60, cost:60 },
  { id:"h4", item:"Diapers (Size 2)", qty:4, unit:"Pcs", time:new Date(Date.now()-2*86400000), unitPrice:12, cost:48 },
  { id:"h5", item:"Spinach", qty:1, unit:"Bags", time:new Date(Date.now()-3*86400000), unitPrice:30, cost:30 },
  { id:"h6", item:"Basmati Rice", qty:1, unit:"Kg", time:new Date(Date.now()-4*86400000), unitPrice:85, cost:85 },
  { id:"h7", item:"Baby Formula", qty:1, unit:"Cans", time:new Date(Date.now()-6*86400000), unitPrice:320, cost:320 },
  { id:"h8", item:"Olive Oil", qty:0.5, unit:"Bottles", time:new Date(Date.now()-8*86400000), unitPrice:250, cost:125 },
  { id:"h9", item:"Tomato Sauce", qty:1, unit:"Cans", time:new Date(Date.now()-12*86400000), unitPrice:45, cost:45 },
  { id:"h10", item:"Diapers (Size 2)", qty:3, unit:"Pcs", time:new Date(Date.now()-14*86400000), unitPrice:12, cost:36 },
];

// ── Helper: check if household ID is a demo ID ──────────────
function isDemoHousehold(id) {
  return IS_DEMO || id === "demo" || id === "demo-household";
}

// ── Hook ─────────────────────────────────────────────────────
export default function usePantriData(householdId) {
  const [inventory, setInventory] = useState([]);
  const [history, setHistory] = useState([]);
  const [spaces, setSpaces] = useState(DEFAULT_SPACES);
  const [loading, setLoading] = useState(true);
  const unsubRef = useRef([]);

  // ── Subscribe to Firestore (or load demo data) ────────────
  useEffect(() => {
    if (!householdId) return;

    if (isDemoHousehold(householdId)) {
      setInventory(DEMO_INVENTORY);
      setHistory(DEMO_HISTORY);
      setSpaces(DEFAULT_SPACES);
      setLoading(false);
      return;
    }

    let mounted = true;

    (async () => {
      try {
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
        }, err => {
          console.error("Inventory listener error:", err);
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
        }, err => {
          console.error("History listener error:", err);
        });

        unsubRef.current = [unsubInv, unsubHist];
      } catch (err) {
        console.error("usePantriData: failed to load data:", err);
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      unsubRef.current.forEach(u => u());
      unsubRef.current = [];
    };
  }, [householdId]);

  // ── Write operations ──────────────────────────────────────
  const addItem = async (item) => {
    if (isDemoHousehold(householdId)) {
      setInventory(prev => [...prev, { ...item, id: genId() }]);
      return;
    }
    try {
      const fb = await getFirebase();
      await fb.addDoc(fb.collection(fb.db, "households", householdId, "inventory"), {
        ...item, createdAt: fb.serverTimestamp(),
      });
    } catch (err) {
      console.error("addItem failed:", err);
      throw err;
    }
  };

  const updateItem = async (id, updates) => {
    if (isDemoHousehold(householdId)) {
      setInventory(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
      return;
    }
    try {
      const fb = await getFirebase();
      await fb.updateDoc(fb.doc(fb.db, "households", householdId, "inventory", id), updates);
    } catch (err) {
      console.error("updateItem failed:", err);
      throw err;
    }
  };

  const logUsage = async (entry) => {
    if (isDemoHousehold(householdId)) {
      setHistory(prev => [{ ...entry, id: genId(), time: new Date() }, ...prev]);
      return;
    }
    try {
      const fb = await getFirebase();
      await fb.addDoc(fb.collection(fb.db, "households", householdId, "history"), {
        ...entry, time: fb.serverTimestamp(),
      });
    } catch (err) {
      console.error("logUsage failed:", err);
      throw err;
    }
  };

  const deleteItem = async (id) => {
    if (isDemoHousehold(householdId)) {
      setInventory(prev => prev.filter(i => i.id !== id));
      return;
    }
    try {
      const fb = await getFirebase();
      await fb.deleteDoc(fb.doc(fb.db, "households", householdId, "inventory", id));
    } catch (err) {
      console.error("deleteItem failed:", err);
      throw err;
    }
  };

  return { inventory, history, spaces, setSpaces, loading, addItem, updateItem, deleteItem, logUsage };
}
