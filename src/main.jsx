// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// 🔎 log versi React supaya pasti ter-load
console.log("React version:", React?.version, "isNull?", React == null);

// === ErrorBoundary sederhana agar error modul tampil di halaman ===
class RootErrorBoundary extends React.Component {
  constructor(p){ super(p); this.state = { error: null }; }
  static getDerivedStateFromError(err){ return { error: err }; }
  componentDidCatch(err, info){ console.error("App crashed:", err, info); }
  render(){
    if (this.state.error) {
      return (
        <div style={{ padding: 16, fontFamily: "system-ui, sans-serif" }}>
          <h2>Something went wrong.</h2>
          <pre style={{ whiteSpace: "pre-wrap" }}>{String(this.state.error)}</pre>
          <div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>
            (lihat Console untuk stacktrace)
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ⬇️ Lazy-load modul halaman utama agar jika modulnya error, ketangkep boundary
const LazyMain = React.lazy(() => import("./SayurSerbaLima.jsx"));
// (opsional admin)
// const LazyAdmin = React.lazy(() => import("./AdminPanel.jsx"));

function AppRouter() {
  return (
    <Router>
      <React.Suspense fallback={<div style={{padding:16}}>Loading…</div>}>
        <Routes>
          <Route path="/" element={<LazyMain />} />
          {/* <Route path="/admin" element={<LazyAdmin />} /> */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </React.Suspense>
    </Router>
  );
}

const rootEl = document.getElementById("root");
if (!rootEl) {
  document.body.innerHTML = "<pre>Missing &lt;div id='root'&gt; in index.html</pre>";
} else {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <RootErrorBoundary>
        <AppRouter />
      </RootErrorBoundary>
    </React.StrictMode>
  );
}
