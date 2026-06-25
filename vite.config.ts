import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import type { Server } from "http-proxy";

const SOFA_BROWSER_HEADERS: Record<string, string> = {
  Referer: "https://www.sofascore.com/",
  Origin: "https://www.sofascore.com",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
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
  configure: configureSofaProxy
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
  configure: configureFifaApiProxy
};

const proxy = {
  "/espn": {
    target: "https://site.api.espn.com",
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/espn/, "")
  },
  "/poly": {
    target: "https://gamma-api.polymarket.com",
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/poly/, "")
  },
  "/fifa": {
    target: "https://inside.fifa.com",
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/fifa/, "")
  },
  "/fifa-api": fifaApiProxy
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
        rewrite: (path: string) => path.replace(/^\/espn-web/, "")
      },
      "/api/clubelo": {
        target: "http://api.clubelo.com",
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/clubelo/, "")
      }
    }
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
        rewrite: (path: string) => path.replace(/^\/espn-web/, "")
      },
      "/api/clubelo": {
        target: "http://api.clubelo.com",
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/api\/clubelo/, "")
      }
    }
  },
  define: {
    "import.meta.env.VITE_BUILD_VERSION": JSON.stringify(process.env.npm_package_version ?? "0.1.0")
  }
});
