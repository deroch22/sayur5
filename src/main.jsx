// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import SayurSerbaLima from "./SayurSerbaLima.jsx";
import "leaflet/dist/leaflet.css";
import "./index.css";

// log versi React supaya ketahuan di Console
console.log("React version:", React?.version, "isNull?", React == null);

const root = document.getElementById("root");
if (!root) {
  document.body.innerHTML = "<pre>Missing &lt;div id='root'&gt; in index.html</pre>";
} else {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <SayurSerbaLima />
    </React.StrictMode>
  );
}
