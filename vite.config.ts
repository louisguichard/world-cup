import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import type { Server } from "http-proxy";

const versionMeta = JSON.parse(readFileSync("./version.json", "utf8")) as {
  version: string;
  build: number;
  channel: string;
};

const SOFA_BROWSER_HEADERS: Record<string, string> = {
  Referer: "https://www.sofascore.com/",
  Origin: "https://www.sofascore.com",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
  "X-Requested-With": "XMLHttpRequest",
};

function configureSofaProxy(proxy: Server) {
  proxy.on("proxyReq", (proxyReq) => {
    for (const [key, value] of Object.entries(SOFA_BROWSER_HEADERS)) {
      proxyReq.setHeader(key, value);
    }
  });
}

const sofaProxy = {
  target: "https://api.sofascore.com",
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/api\/sofascore/, "/api/v1"),
  configure: configureSofaProxy,
};

function configureFifaApiProxy(proxy: Server) {
  proxy.on("proxyReq", (proxyReq) => {
    proxyReq.setHeader("Accept", "application/json");
  });
}

const fifaApiProxy = {
  target: "https://www.fifa.com",
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/fifa-api/, ""),
  configure: configureFifaApiProxy,
};

const ESPN_BROWSER_HEADERS: Record<string, string> = {
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

function configureEspnWebProxy(proxy: Server) {
  proxy.on("proxyReq", (proxyReq) => {
    for (const [key, value] of Object.entries(ESPN_BROWSER_HEADERS)) {
      proxyReq.setHeader(key, value);
    }
  });
}

/** Strip a path prefix — order matters: longer prefixes must be registered first in the proxy map. */
const stripPrefix = (prefix: string) => (path: string) => {
  if (!path.startsWith(prefix)) return path;
  const rest = path.slice(prefix.length);
  return rest.startsWith("/") ? rest : `/${rest}`;
};

const rapidApiProxy = (target: string, prefix: string) => ({
  target,
  changeOrigin: true,
  rewrite: stripPrefix(prefix),
});

// Longer /rapidapi-* keys MUST come before /rapidapi (prefix collision).
const rapidApiProxies = {
  "/rapidapi-sportapi": rapidApiProxy("https://sportapi7.p.rapidapi.com", "/rapidapi-sportapi"),
  "/rapidapi-wc2026": rapidApiProxy("https://world-cup-2026.p.rapidapi.com", "/rapidapi-wc2026"),
  "/rapidapi-wc-live": rapidApiProxy("https://world-cup-2026-live-api.p.rapidapi.com", "/rapidapi-wc-live"),
  "/rapidapi-weather": rapidApiProxy("https://open-weather13.p.rapidapi.com", "/rapidapi-weather"),
  "/rapidapi-odds": rapidApiProxy("https://sports-odds-intelligence-api.p.rapidapi.com", "/rapidapi-odds"),
  "/rapidapi": rapidApiProxy("https://free-api-live-football-data.p.rapidapi.com", "/rapidapi"),
  "/api/footballdata": rapidApiProxy("https://free-api-live-football-data.p.rapidapi.com", "/api/footballdata"),
  "/api/sportapi": rapidApiProxy("https://sportapi7.p.rapidapi.com", "/api/sportapi"),
  "/api/sofascore6": rapidApiProxy("https://sofascore6.p.rapidapi.com", "/api/sofascore6"),
  "/api/sofascore-rapid": rapidApiProxy("https://sofascore.p.rapidapi.com", "/api/sofascore-rapid"),
  "/api/wc2026": rapidApiProxy("https://world-cup-2026.p.rapidapi.com", "/api/wc2026"),
  "/api/wc-live": rapidApiProxy("https://world-cup-2026-live-api.p.rapidapi.com", "/api/wc-live"),
  "/api/weather": rapidApiProxy("https://open-weather13.p.rapidapi.com", "/api/weather"),
  "/api/odds": rapidApiProxy("https://sports-odds-intelligence-api.p.rapidapi.com", "/api/odds"),
  "/api/football-prediction": rapidApiProxy(
    "https://football-prediction-api.p.rapidapi.com",
    "/api/football-prediction"
  ),
  "/api/world-cup-history": rapidApiProxy(
    "https://world-cup1.p.rapidapi.com",
    "/api/world-cup-history"
  ),
  "/api/sport-highlights": rapidApiProxy(
    "https://sport-highlights-api.p.rapidapi.com",
    "/api/sport-highlights"
  ),
  "/api/all-sport-live-stream": rapidApiProxy(
    "https://all-sport-live-stream.p.rapidapi.com",
    "/api/all-sport-live-stream"
  ),
  "/api/sports-live-scores": rapidApiProxy(
    "https://sports-live-scores.p.rapidapi.com",
    "/api/sports-live-scores"
  ),
  "/api/free-daily-xtream-iptv": rapidApiProxy(
    "https://free-daily-xtream-iptv-servers.p.rapidapi.com",
    "/api/free-daily-xtream-iptv"
  ),
  "/api/cloud-api-hub-iptv": rapidApiProxy(
    "https://cloud-api-hub-iptv-auto-subscriber.p.rapidapi.com",
    "/api/cloud-api-hub-iptv"
  ),
  "/api/tvview": rapidApiProxy("https://tvview.p.rapidapi.com", "/api/tvview"),
  "/api/flashlive": rapidApiProxy("https://flashlive-sports.p.rapidapi.com", "/api/flashlive"),
  "/api/espn-web": {
    target: "https://site.web.api.espn.com",
    changeOrigin: true,
    rewrite: stripPrefix("/api/espn-web"),
    configure: configureEspnWebProxy,
  },
  "/api/zafronix": {
    target: "https://zafronix-fifa-world-cup-api.p.rapidapi.com",
    changeOrigin: true,
    rewrite: stripPrefix("/api/zafronix"),
  },
};

const proxy = {
  ...rapidApiProxies,
  "/espn": {
    target: "https://site.api.espn.com",
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/espn/, ""),
  },
  "/poly": {
    target: "https://gamma-api.polymarket.com",
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/poly/, ""),
  },
  "/fifa": {
    target: "https://inside.fifa.com",
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/fifa/, ""),
  },
  "/fifa-api": fifaApiProxy,
};

export default defineConfig({
  plugins: [react],
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      ...proxy,
      "/api/sofascore": sofaProxy,
      "/espn-web": {
        target: "https://site.web.api.espn.com",
        changeOrigin: true,
        rewrite: stripPrefix("/espn-web"),
        configure: configureEspnWebProxy,
      },
      "/api/clubelo": {
        target: "http://api.clubelo.com",
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/clubelo/, ""),
      },
    },
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
    proxy: {
      ...proxy,
      "/api/sofascore": sofaProxy,
      "/espn-web": {
        target: "https://site.web.api.espn.com",
        changeOrigin: true,
        rewrite: stripPrefix("/espn-web"),
        configure: configureEspnWebProxy,
      },
      "/api/clubelo": {
        target: "http://api.clubelo.com",
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/clubelo/, ""),
      },
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(versionMeta.version),
    __APP_BUILD__: JSON.stringify(String(versionMeta.build)),
    __APP_CHANNEL__: JSON.stringify(versionMeta.channel),
    "import.meta.env.VITE_BUILD_VERSION": JSON.stringify(
      `${versionMeta.version}+${versionMeta.build}`
    ),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          zustand: ["zustand"],
        },
      },
    },
  },
});
