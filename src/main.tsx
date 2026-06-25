import React from "react";
import ReactDOM from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import App from "./App";
import { bootstrap } from "./lib/bootstrap";
import "./styles.css";
import "./styles/tokens.css";
import "./styles/layout.css";
import "./styles/app-views.css";
import "./styles/components.css";

async function init() {
  await bootstrap();
}

void init();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    <Analytics />
  </React.StrictMode>
);
