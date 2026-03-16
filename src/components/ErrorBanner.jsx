import S from "../lib/styles.js";

export default function ErrorBanner({ message }) {
  return (
    <div style={S.errorBanner}>
      <p style={{ margin:0, fontSize:12, fontWeight:600, color:"#991b1b" }}>⚠️ {message}</p>
    </div>
  );
}
