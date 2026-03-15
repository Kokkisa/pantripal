import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error("Pantri error:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight:"100vh", background:"#1e1b18", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans',sans-serif" }}>
          <div style={{ textAlign:"center", padding:"40px 24px", maxWidth:360 }}>
            <div style={{ fontSize:60, marginBottom:16 }}>😵</div>
            <h1 style={{ color:"white", fontSize:22, fontWeight:800, margin:"0 0 8px" }}>Something went wrong</h1>
            <p style={{ color:"#9ca3af", fontSize:14, margin:"0 0 20px" }}>Pantri hit an unexpected error. Try refreshing.</p>
            <button onClick={() => window.location.reload()} style={{ background:"#d97706", color:"white", border:"none", borderRadius:16, padding:"14px 32px", fontSize:15, fontWeight:700, cursor:"pointer" }}>
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
