// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import SayurSerbaLima from "./SayurSerbaLima.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";
import "./index.css";

const ENABLE_ADMIN = import.meta.env.VITE_ENABLE_ADMIN === "true";
let LazyAdmin = null;
if (ENABLE_ADMIN) {
  LazyAdmin = React.lazy(() => import("./AdminPanel.jsx"));
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<SayurSerbaLima />} />
         <ErrorBoundary>
      <Router basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/" element={<SayurSerbaLima />} />
        
        {ENABLE_ADMIN && (
          <Route
            path="/admin"
            element={
              <React.Suspense fallback={<div>Loading…</div>}>
                <LazyAdmin />
              </React.Suspense>
            }
          />
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
       <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ErrorBoundary>    
  </React.StrictMode>
);
