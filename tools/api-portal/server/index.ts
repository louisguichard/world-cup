import express from "express";
import cors from "cors";
import { isKeychainSetup, isKeytarAvailable } from "./keychain.js";
import { isVaultFilePresent, evictMasterKeyCache } from "./vault.js";
import { globalRateLimit } from "./middleware/rateLimit.js";
import router from "./router.js";

const HOST = "127.0.0.1"; // NEVER 0.0.0.0
const PORT = 4242;

const app = express();

// ─── Security middleware ──────────────────────────────────────────────────────

app.use(
  cors({
    origin: ["http://localhost:4243", "http://127.0.0.1:4243"],
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(globalRateLimit);

// ─── Activity tracker for 30-min idle eviction ───────────────────────────────

let idleTimer: ReturnType<typeof setTimeout> | null = null;
const IDLE_MS = 30 * 60 * 1000;

function resetIdleTimer(): void {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    evictMasterKeyCache();
    console.log("[api-vault] Master key evicted after 30 min idle.");
  }, IDLE_MS);
}

app.use((_req, _res, next) => {
  resetIdleTimer();
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use("/api", router);

// ─── 404 ─────────────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: "Not found." });
});

// ─── Startup ──────────────────────────────────────────────────────────────────

async function start(): Promise<void> {
  // isKeychainSetup() triggers the lazy keytar load via ensureLoaded() — must
  // come before isKeytarAvailable() so the availability flag is accurate.
  const keychainSetup = await isKeychainSetup();
  const keychainAvail = isKeytarAvailable();
  const vaultExists = isVaultFilePresent();

  console.log("─────────────────────────────────────────");
  console.log("  API Vault Portal — sidecar server");
  console.log("─────────────────────────────────────────");
  console.log(`  Keychain (keytar): ${keychainAvail ? "available" : "unavailable (session mode)"}`);
  console.log(`  Vault file:        ${vaultExists ? "exists" : "not created yet"}`);
  console.log(`  Vault setup:       ${keychainSetup ? "ready" : "NEEDS SETUP"}`);

  if (!keychainSetup) {
    console.log("\n  ⚠  Run the portal and complete first-run setup before use.");
  }

  app.listen(PORT, HOST, () => {
    console.log(`\n  API Vault server running at http://${HOST}:${PORT}`);
    console.log(`  Open http://localhost:4243 to manage your keys\n`);
    resetIdleTimer();
  });
}

start().catch((err) => {
  console.error("[api-vault] Startup failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
