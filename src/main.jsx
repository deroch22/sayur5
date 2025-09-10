// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import ErrorBoundary from "./ErrorBoundary.jsx";
import "./index.css";


// Halaman utama
const Main = React.lazy(() => import("./SayurSerbaLima.jsx"));

// (opsional) halaman admin via env
const ENABLE_ADMIN = import.meta.env.VITE_ENABLE_ADMIN === "true";
const Admin = ENABLE_ADMIN ? React.lazy(() => import("./AdminPanel.jsx")) : null;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Router>
        <React.Suspense fallback={<div>Loading…</div>}>
          <Routes>
            <Route path="/" element={<Main />} />
            {ENABLE_ADMIN && <Route path="/admin" element={<Admin />} />}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </React.Suspense>
      </Router>
    </ErrorBoundary>
  </React.StrictMode>
);
