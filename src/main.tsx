import React from "react";
import ReactDOM from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import App from "./App";
import { bootstrap } from "./lib/bootstrap";
import "./lib/pwaInstallController";
import { registerServiceWorker } from "./lib/registerServiceWorker";
import "./styles.css";
import "./styles/themes.css";
import "./styles/tokens.css";
import "./styles/team-identity.css";
import "./styles/layout.css";
import "./styles/app-views.css";
import "./styles/components.css";
import "./styles/responsive.css";
import "./styles/platform.css";
import "./styles/modules.css";
import "./styles/edges.css";

if (import.meta.env.DEV) {
  void import("./styles/ui-debug.css");
  void import("./lib/uiDebugBridge");
}

if (!import.meta.env.DEV) {
  void registerServiceWorker();
}

async function init() {
  if (typeof performance !== "undefined" && performance.mark) {
    performance.mark("wc-init-start");
  }
  await bootstrap();
}

void init();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    <Analytics />
    <SpeedInsights />
  </React.StrictMode>
);
