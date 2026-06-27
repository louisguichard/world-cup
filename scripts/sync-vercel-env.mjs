#!/usr/bin/env node
/**
 * Sync deployment env vars from .env.local → Vercel (Production + Preview).
 *
 * Usage:
 *   npm run env:sync-vercel
 *   npm run env:sync-vercel -- --dry-run
 *
 * Skips placeholders, local-only tokens, and api-portal AI keys.
 */
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ENV_FILE = resolve(ROOT, ".env.local");

/** Server-side keys for /api/* edge proxies (secrets — never VITE_* alone). */
const REQUIRED = ["RAPIDAPI_KEY", "ZAFRONIX_API_KEY"];

/** Build-time client checks (ApiSetupBanner, Zafronix header passthrough). */
const CLIENT_BUILD = ["VITE_RAPIDAPI_KEY", "VITE_ZAFRONIX_API_KEY"];

/** Optional integrations — synced only when value is not a placeholder. */
const OPTIONAL = [
  "VITE_THESTATS_API_KEY",
  "VITE_ODDS_API_KEY",
  "VITE_BETFAIR_SESSION_TOKEN",
  "VITE_SD_USERNAME",
];

const SKIP = new Set(["VERCEL_OIDC_TOKEN", "GEMINI_API_KEY", "OPENAI_API_KEY"]);
const PLACEHOLDER = /^(FILL_ME_IN|your_.*_here)$/i;
const TARGETS = ["production", "preview"];

function parseEnvFile(content) {
  /** @type {Map<string, string>} */
  const map = new Map();
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    map.set(key, value);
  }
  return map;
}

function collectKeys(env) {
  const keys = [...REQUIRED, ...CLIENT_BUILD];
  for (const key of OPTIONAL) {
    const value = env.get(key);
    if (value && !PLACEHOLDER.test(value)) keys.push(key);
  }
  return keys.filter((key) => !SKIP.has(key));
}

function addToVercel(key, value, dryRun) {
  for (const target of TARGETS) {
    if (dryRun) {
      console.log(`[dry-run] would set ${key} → ${target}`);
      continue;
    }
    const result = spawnSync(
      "npx",
      [
        "vercel",
        "env",
        "add",
        key,
        target,
        "--force",
        "--sensitive",
        "--yes",
        "--value",
        value,
      ],
      { cwd: ROOT, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
    );
    if (result.status !== 0) {
      console.error(`✗ ${key} → ${target}`);
      if (result.stderr) console.error(result.stderr.trim());
      if (result.stdout) console.error(result.stdout.trim());
      return false;
    }
    console.log(`✓ ${key} → ${target}`);
  }
  return true;
}

function main() {
  const dryRun = process.argv.includes("--dry-run");
  if (!existsSync(ENV_FILE)) {
    console.error("Missing .env.local — copy .env.example and fill in keys first.");
    process.exit(1);
  }

  const env = parseEnvFile(readFileSync(ENV_FILE, "utf8"));
  const keys = collectKeys(env);
  let failed = false;

  for (const key of keys) {
    const value = env.get(key);
    if (!value || PLACEHOLDER.test(value)) {
      console.warn(`⚠ skipping ${key} (missing or placeholder)`);
      if (REQUIRED.includes(key)) failed = true;
      continue;
    }
    if (!addToVercel(key, value, dryRun)) failed = true;
  }

  if (failed) {
    process.exit(1);
  }

  console.log(
    dryRun
      ? "\nDry run complete. Re-run without --dry-run to push to Vercel."
      : "\nDone. Redeploy so build-time VITE_* vars are baked in:\n  npm run deploy:vercel"
  );
}

main();
