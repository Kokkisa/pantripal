import { useState } from "react";
import S from "../lib/styles.js";
import { IS_DEMO, getFirebase } from "../lib/firebaseClient.js";
import { DEFAULT_SPACES } from "../lib/pantriConstants.js";
import { genId } from "../lib/pantriUtils.js";

// Detect mobile browser — popups don't work well on mobile
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

export default function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("welcome"); // welcome | login | signup
  const [name, setName] = useState("");
  const [partner, setPartner] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleComplete = async (cred, fb) => {
    const userDoc = await fb.getDoc(fb.doc(fb.db, "users", cred.user.uid));
    if (userDoc.exists()) {
      onAuth(cred.user, { ...userDoc.data(), isNew: false });
    } else {
      const displayName = cred.user.displayName || "User";
      const householdId = genId();
      await fb.setDoc(fb.doc(fb.db, "users", cred.user.uid), {
        name: displayName, partner: "", email: cred.user.email, householdId, createdAt: fb.serverTimestamp(),
      });
      await fb.setDoc(fb.doc(fb.db, "households", householdId), {
        name: `${displayName}'s Home`, members: [cred.user.uid], memberNames: { [cred.user.uid]: displayName },
        partnerName: "", spaces: DEFAULT_SPACES, createdAt: fb.serverTimestamp(),
      });
      onAuth(cred.user, { name: displayName, partner: "", householdId, isNew: true });
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true); setError("");
    try {
      const fb = await getFirebase();
      const provider = new fb.GoogleAuthProvider();
      // Try popup first (works on desktop and most mobile browsers)
      const cred = await fb.signInWithPopup(fb.auth, provider);
      await handleGoogleComplete(cred, fb);
    } catch (e) {
      console.error("Google sign-in error:", e.code, e.message);
      if (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-this-environment") {
        // Popup blocked (common on mobile) — fall back to redirect
        try {
          const fb = await getFirebase();
          const provider = new fb.GoogleAuthProvider();
          await fb.signInWithRedirect(fb.auth, provider);
          return; // page will redirect
        } catch (e2) {
          setError("Google sign-in failed. Please try again.");
          setLoading(false);
        }
      } else if (e.code === "auth/popup-closed-by-user" || e.code === "auth/cancelled-popup-request") {
        // User closed popup — no error to show
        setLoading(false);
      } else if (e.code === "auth/account-exists-with-different-credential") {
        setError("An account already exists with this email. Try signing in with your email and password instead.");
        setLoading(false);
      } else {
        setError(e.message?.replace("Firebase: ", "") || "Google sign-in failed. Please try again.");
        setLoading(false);
      }
    }
  };

  const googleBtn = (
    <button style={{ width:"100%", background:"white", color:"#1e1b18", border:"2px solid #e5e7eb", borderRadius:16, padding:"14px", fontSize:14, fontWeight:700, cursor:loading?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10 }} disabled={loading} onClick={handleGoogleSignIn}>
      <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 019.5 24c0-1.59.28-3.14.76-4.59l-7.98-6.19A23.99 23.99 0 000 24c0 3.77.9 7.35 2.56 10.52l7.97-5.93z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 5.93C6.51 42.62 14.62 48 24 48z"/></svg>
      Continue with Google
    </button>
  );

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) return;
    setLoading(true); setError("");
    if (IS_DEMO) {
      onAuth({ uid: "demo-user", email, displayName: name }, { name, partner, householdId: "demo-household", isNew: true });
      return;
    }
    try {
      const fb = await getFirebase();
      const cred = await fb.createUserWithEmailAndPassword(fb.auth, email, password);
      const householdId = genId();
      await fb.setDoc(fb.doc(fb.db, "users", cred.user.uid), {
        name, partner, email, householdId, createdAt: fb.serverTimestamp(),
      });
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
    <div style={{ minHeight:"100vh", background:"#1e1b18", display:"flex", flexDirection:"column", justifyContent:"space-between", padding:"48px 24px 40px" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:72, marginBottom:20 }}>🥫</div>
        <h1 style={{ fontSize:36, fontWeight:800, margin:"0 0 12px", letterSpacing:"-1.5px", color:"white", lineHeight:1.1 }}>PantriPal</h1>
        <p style={{ fontSize:14, color:"#9ca3af", lineHeight:1.6, margin:0 }}>Smart pantry management for busy couples — know what you have, where it is, when to restock.</p>
      </div>
      <div style={S.gap(10)}>
        {IS_DEMO && (
          <div style={{ background:"rgba(217,119,6,0.15)", borderRadius:13, padding:"11px 14px", border:"1px solid rgba(217,119,6,0.3)" }}>
            <p style={{ margin:0, fontSize:12, color:"#fcd34d", fontWeight:600 }}>🔧 Demo Mode — Firebase config not set yet. App works with local data.</p>
          </div>
        )}
        {!IS_DEMO && googleBtn}
        {!IS_DEMO && <div style={{ display:"flex", alignItems:"center", gap:12 }}><div style={{ flex:1, height:1, background:"rgba(255,255,255,0.15)" }}/><span style={{ fontSize:11, color:"#6b7280", fontWeight:600 }}>OR</span><div style={{ flex:1, height:1, background:"rgba(255,255,255,0.15)" }}/></div>}
        <button style={S.btn("#d97706")} onClick={() => setMode("signup")}>Create Account →</button>
        <button style={{ ...S.outline, color:"white", borderColor:"rgba(255,255,255,0.2)" }} onClick={() => setMode("login")}>I already have an account</button>
        {IS_DEMO && <button style={{ ...S.outline, color:"#9ca3af", borderColor:"rgba(255,255,255,0.1)" }} onClick={() => onAuth({ uid:"demo" }, { name:"Nithin", partner:"Swetha", householdId:"demo", isNew:false })}>Explore Demo →</button>}
      </div>
    </div>
  );

  // Signup
  if (mode === "signup") return (
    <div style={{ minHeight:"100vh", background:"#faf9f7", padding:"28px 24px" }}>
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
        {!IS_DEMO && <><div style={{ display:"flex", alignItems:"center", gap:12 }}><div style={{ flex:1, height:1, background:"#e5e7eb" }}/><span style={{ fontSize:11, color:"#9ca3af", fontWeight:600 }}>OR</span><div style={{ flex:1, height:1, background:"#e5e7eb" }}/></div>{googleBtn}</>}
        <p style={{ textAlign:"center", fontSize:12, color:"#9ca3af", margin:0 }}>Already have an account? <span onClick={()=>setMode("login")} style={{ color:"#d97706", fontWeight:700, cursor:"pointer" }}>Sign in</span></p>
      </div>
    </div>
  );

  // Login
  return (
    <div style={{ minHeight:"100vh", background:"#faf9f7", padding:"28px 24px" }}>
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
        {!IS_DEMO && <><div style={{ display:"flex", alignItems:"center", gap:12 }}><div style={{ flex:1, height:1, background:"#e5e7eb" }}/><span style={{ fontSize:11, color:"#9ca3af", fontWeight:600 }}>OR</span><div style={{ flex:1, height:1, background:"#e5e7eb" }}/></div>{googleBtn}</>}
        <p style={{ textAlign:"center", fontSize:12, color:"#9ca3af", margin:0 }}>No account? <span onClick={()=>setMode("signup")} style={{ color:"#d97706", fontWeight:700, cursor:"pointer" }}>Create one</span></p>
      </div>
    </div>
  );
}
