// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";

console.log("React version:", React?.version, "isNull?", React == null);

function Smoke() {
  const [n, setN] = React.useState(0);
  return (
    <div style={{ padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <h3>Sayur5 Smoke Test</h3>
      <button onClick={() => setN((x) => x + 1)}>Counter: {n}</button>
    </div>
  );
}

const root = document.getElementById("root");
if (!root) {
  document.body.innerHTML = "<pre>Missing &lt;div id='root'&gt; in index.html</pre>";
} else {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <Smoke />
    </React.StrictMode>
  );
}
