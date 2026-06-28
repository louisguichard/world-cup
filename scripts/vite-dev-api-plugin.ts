/**
 * Vite dev middleware — serves BC QueryAPI routes without vercel dev.
 * Falls back to catalog compute when Postgres/Redis are unavailable.
 */

import type { Plugin, ViteDevServer } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

async function handleQualification(
  server: ViteDevServer,
  groupId: string,
  res: ServerResponse
): Promise<void> {
  try {
    const mod = await server.ssrLoadModule("/server/src/api/qualification.ts");
    const getGroupQualification = mod.getGroupQualification as (
      id: string,
      asOf?: string
    ) => Promise<unknown>;
    const result = await getGroupQualification(groupId);
    if (result) {
      sendJson(res, 200, result);
      return;
    }
  } catch {
    // DB/Redis unavailable — use catalog fallback
  }

  const fallbackMod = await server.ssrLoadModule(
    "/server/src/api/qualificationCatalogFallback.ts"
  );
  const getCatalogQualificationFallback = fallbackMod.getCatalogQualificationFallback as (
    id: string
  ) => unknown;
  const fallback = getCatalogQualificationFallback(groupId);
  if (!fallback) {
    sendJson(res, 404, { error: `No qualification data for group ${groupId}` });
    return;
  }
  sendJson(res, 200, fallback);
}

function handleEventsSse(req: IncomingMessage, res: ServerResponse): void {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });

  const send = (data: unknown) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  send({ type: "connected", timestamp: new Date().toISOString() });

  const heartbeat = setInterval(() => {
    send({ type: "heartbeat", timestamp: new Date().toISOString() });
  }, 15_000);

  req.on("close", () => {
    clearInterval(heartbeat);
  });
}

async function handleHealth(server: ViteDevServer, res: ServerResponse): Promise<void> {
  try {
    const mod = await server.ssrLoadModule("/server/src/api/health.ts");
    const health = await mod.getHealth();
    sendJson(res, health.status === "critical" ? 503 : 200, health);
  } catch {
    sendJson(res, 200, {
      status: "degraded",
      timestamp: new Date().toISOString(),
      providers: [],
      quarantineDepth: 0,
      redisConnected: false,
      dbConnected: false,
      note: "Dev fallback — start stack with npm run stack:up for full health",
    });
  }
}

export function viteDevApiPlugin(): Plugin {
  return {
    name: "wc-dev-api",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? "";
        if (!url.startsWith("/api/")) return next();

        void (async () => {
          if (url.startsWith("/api/qualification/")) {
            const groupId = url.split("/")[3]?.split("?")[0];
            if (!groupId) {
              sendJson(res, 400, { error: "groupId required" });
              return;
            }
            await handleQualification(server, groupId, res);
            return;
          }

          if (url === "/api/events" || url.startsWith("/api/events?")) {
            handleEventsSse(req, res);
            return;
          }

          if (url === "/api/health" || url.startsWith("/api/health?")) {
            await handleHealth(server, res);
            return;
          }

          next();
        })().catch((err: unknown) => {
          console.error("[vite-dev-api]", err);
          if (!res.headersSent) {
            sendJson(res, 500, { error: "Dev API error" });
          }
        });
      });
    },
  };
}
