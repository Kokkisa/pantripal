import { useEffect, useState } from "react";

const COLORS = {
  success: { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d", icon: "✅" },
  error:   { bg: "#fef2f2", border: "#fecaca", text: "#991b1b", icon: "⚠️" },
  info:    { bg: "#fff7ed", border: "#fde68a", text: "#92400e", icon: "💡" },
};

export default function Toast({ message, type = "success", onDone }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger slide-in on next frame
    const rAF = requestAnimationFrame(() => setVisible(true));
    const ms = type === "error" ? 5000 : 3000;
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDone?.(), 300); // wait for slide-out
    }, ms);
    return () => { cancelAnimationFrame(rAF); clearTimeout(timer); };
  }, [type, onDone]);

  const c = COLORS[type] || COLORS.info;

  return (
    <div style={{
      position: "fixed", bottom: visible ? 90 : -80, left: "50%", transform: "translateX(-50%)",
      zIndex: 9999, transition: "bottom 0.3s ease",
      background: c.bg, border: `1.5px solid ${c.border}`, borderRadius: 14,
      padding: "10px 18px", display: "flex", alignItems: "center", gap: 8,
      boxShadow: "0 4px 20px rgba(0,0,0,0.12)", maxWidth: "min(360px, 90vw)",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <span style={{ fontSize: 16, flexShrink: 0 }}>{c.icon}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: c.text, lineHeight: 1.3 }}>{message}</span>
    </div>
  );
}
