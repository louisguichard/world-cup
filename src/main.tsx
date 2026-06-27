import React from "react";
import ReactDOM from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import App from "./App";
import { bootstrap } from "./lib/bootstrap";
import { isMobileBootProfile } from "./lib/bootProfile";
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
import "./styles/ui-debug.css";

async function init() {
  if (typeof performance !== "undefined" && performance.mark) {
    performance.mark("wc-init-start");
  }
  await bootstrap();
  const registerSw = () => {
    void registerServiceWorker();
  };
  if (isMobileBootProfile() && "requestIdleCallback" in window) {
    window.requestIdleCallback(registerSw, { timeout: 8_000 });
  } else {
    registerSw();
  }
}

void init();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    <Analytics />
    <SpeedInsights />
  </React.StrictMode>
);
