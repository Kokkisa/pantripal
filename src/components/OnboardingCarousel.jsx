import { useState, useRef } from "react";
import { ONBOARDING_SLIDES } from "../lib/pantriConstants.js";

export default function OnboardingCarousel({ onComplete }) {
  const [step, setStep] = useState(0);
  const touchStart = useRef(null);
  const slide = ONBOARDING_SLIDES[step];
  const isLast = step === ONBOARDING_SLIDES.length - 1;
  const isFirst = step === 0;

  const goNext = () => { if (isLast) onComplete(); else setStep(s => s + 1); };
  const goBack = () => { if (!isFirst) setStep(s => s - 1); };

  const handleTouchStart = (e) => { touchStart.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStart.current === null) return;
    const diff = touchStart.current - e.changedTouches[0].clientX;
    touchStart.current = null;
    if (diff > 50) goNext();
    else if (diff < -50) goBack();
  };

  return (
    <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} style={{ minHeight:"100vh", background:"#1e1b18", display:"flex", flexDirection:"column", justifyContent:"space-between", padding:"0" }}>
      <div style={{ padding:"16px 20px 0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        {!isFirst ? <span onClick={goBack} style={{ color:"#9ca3af", fontSize:14, fontWeight:600, cursor:"pointer" }}>‹ Back</span> : <span />}
        <span onClick={onComplete} style={{ color:"#9ca3af", fontSize:12, fontWeight:600, cursor:"pointer", letterSpacing:"0.03em" }}>Skip</span>
      </div>
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"0 32px", textAlign:"center" }}>
        <div style={{ width:100, height:100, borderRadius:28, background:"rgba(217,119,6,0.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:48, marginBottom:28, border:"2px solid rgba(217,119,6,0.25)" }}>
          {slide.emoji}
        </div>
        <h2 style={{ fontSize:26, fontWeight:800, color:"white", margin:"0 0 12px", letterSpacing:"-0.8px", lineHeight:1.2 }}>{slide.title}</h2>
        <p style={{ fontSize:14, color:"#9ca3af", margin:0, lineHeight:1.7, maxWidth:280 }}>{slide.desc}</p>
      </div>
      <div style={{ padding:"0 24px 40px" }}>
        <div style={{ display:"flex", justifyContent:"center", gap:8, marginBottom:20 }}>
          {ONBOARDING_SLIDES.map((_, i) => (
            <div key={i} onClick={() => setStep(i)} style={{
              width: i === step ? 24 : 8, height:8, borderRadius:4,
              background: i === step ? "#d97706" : "rgba(255,255,255,0.15)",
              transition:"all 0.3s ease", cursor:"pointer",
            }} />
          ))}
        </div>
        <div style={{ display:"flex", gap:10 }}>
          {!isFirst && (
            <button onClick={goBack} style={{
              width:52, background:"rgba(255,255,255,0.1)", color:"white",
              border:"none", borderRadius:16, padding:"16px", fontSize:15, fontWeight:700, cursor:"pointer", flexShrink:0,
            }}>‹</button>
          )}
          <button onClick={goNext} style={{
            flex:1, background: isLast ? "#d97706" : "white", color: isLast ? "white" : "#1e1b18",
            border:"none", borderRadius:16, padding:"16px", fontSize:15, fontWeight:700, cursor:"pointer",
          }}>
            {isLast ? "Let's Go! →" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}
