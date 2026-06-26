#!/usr/bin/env node
/**
 * Universal RapidAPI MCP endpoint configuration for all catalogued hubs.
 *
 * Usage:
 *   node scripts/mcp-endpoint-config.mjs list [apiId]
 *   node scripts/mcp-endpoint-config.mjs show <apiId>
 *   node scripts/mcp-endpoint-config.mjs enable <apiId> <endpoint-id>...
 *   node scripts/mcp-endpoint-config.mjs disable <apiId> <endpoint-id>...
 *   node scripts/mcp-endpoint-config.mjs set <apiId> <endpoint-id>...
 *   node scripts/mcp-endpoint-config.mjs reset [apiId]
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG_PATH = join(ROOT, "tools/api-portal/client/src/data/rapidapi-mcp-catalog.json");
const CONFIG_PATH = join(ROOT, ".cursor/mcp-endpoints.config.json");
const LEGACY_ZAFRONIX_CONFIG = join(ROOT, ".cursor/mcp-zafronix.config.json");
const MANIFEST_PATH = join(ROOT, ".cursor/mcp-endpoints.active.json");

function loadCatalog() {
  return JSON.parse(readFileSync(CATALOG_PATH, "utf8"));
}

function getApi(catalog, apiId) {
  const api = catalog.apis.find((a) => a.id === apiId);
  if (!api) {
    console.error(`Unknown API id: ${apiId}`);
    console.error(`Valid ids: ${catalog.apis.map((a) => a.id).join(", ")}`);
    process.exit(1);
  }
  return api;
}

function defaultEnabledForApi(api) {
  return api.endpoints.filter((e) => e.defaultEnabled).map((e) => e.id);
}

function migrateLegacyZafronix(config) {
  if (!existsSync(LEGACY_ZAFRONIX_CONFIG)) return config;
  try {
    const legacy = JSON.parse(readFileSync(LEGACY_ZAFRONIX_CONFIG, "utf8"));
    if (Array.isArray(legacy.enabled) && legacy.enabled.length > 0 && !config.apis.zafronix) {
      config.apis.zafronix = { enabled: legacy.enabled };
    }
  } catch {
    /* ignore */
  }
  return config;
}

function loadConfig() {
  let config = { apis: {} };
  if (existsSync(CONFIG_PATH)) {
    const raw = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
    config = { apis: raw.apis && typeof raw.apis === "object" ? raw.apis : {} };
  }
  return migrateLegacyZafronix(config);
}

function saveConfig(config) {
  writeFileSync(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

function ensureApiConfig(config, api) {
  if (!config.apis[api.id]) {
    config.apis[api.id] = { enabled: defaultEnabledForApi(api) };
  } else if (!Array.isArray(config.apis[api.id].enabled)) {
    config.apis[api.id].enabled = defaultEnabledForApi(api);
  }
  return config;
}

function endpointFullPath(api, endpoint) {
  return `${api.apiBasePath ?? ""}${endpoint.path}`;
}

function endpointUrl(api, endpoint) {
  return `https://${api.host}${endpointFullPath(api, endpoint)}`;
}

function resolveApiEnabled(api, enabledIds) {
  const byId = new Map(api.endpoints.map((e) => [e.id, e]));
  const enabled = [];
  const unknown = [];
  for (const id of enabledIds) {
    const ep = byId.get(id);
    if (ep) enabled.push(ep);
    else unknown.push(id);
  }
  return { enabled, unknown };
}

function writeManifest(catalog, config) {
  const apis = [];
  for (const api of catalog.apis) {
    const apiConfig = config.apis[api.id];
    if (!apiConfig?.enabled?.length) continue;
    const { enabled, unknown } = resolveApiEnabled(api, apiConfig.enabled);
    if (unknown.length > 0) {
      console.warn(`Warning [${api.id}]: unknown endpoint ids: ${unknown.join(", ")}`);
    }
    apis.push({
      id: api.id,
      mcpServerName: api.mcpServerName,
      host: api.host,
      enabled: enabled.map((e) => ({
        id: e.id,
        label: e.label,
        path: endpointFullPath(api, e),
        rapidApiUrl: endpointUrl(api, e),
        category: e.category,
      })),
    });
  }

  const manifest = {
    updatedAt: new Date().toISOString(),
    catalogPath: "tools/api-portal/client/src/data/rapidapi-mcp-catalog.json",
    apis,
  };
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifest;
}

function printList(apiId) {
  const catalog = loadCatalog();
  const config = loadConfig();
  const apis = apiId ? [getApi(catalog, apiId)] : catalog.apis;

  console.log("RapidAPI MCP endpoint catalog\n");

  for (const api of apis) {
    const cfg = ensureApiConfig({ ...config, apis: { ...config.apis } }, api);
    const enabledSet = new Set(cfg.apis[api.id].enabled);
    console.log(`${api.label} (${api.id})`);
    console.log(`  MCP: ${api.mcpServerName}`);
    console.log(`  Host: ${api.host}\n`);

    const categories = [...new Set(api.endpoints.map((e) => e.category))];
    for (const category of categories) {
      console.log(`  [${category}]`);
      for (const ep of api.endpoints.filter((e) => e.category === category)) {
        const on = enabledSet.has(ep.id) ? "✓" : " ";
        const def = ep.defaultEnabled ? " (default)" : "";
        console.log(`    ${on} ${ep.id.padEnd(22)} ${ep.label}${def}`);
        console.log(`        ${endpointFullPath(api, ep)}`);
      }
      console.log();
    }
  }

  console.log("Commands:");
  console.log("  npm run mcp:endpoints -- list [apiId]");
  console.log("  npm run mcp:endpoints -- enable <apiId> <endpoint-id>...");
  console.log("  npm run mcp:endpoints -- set <apiId> <endpoint-id>...");
}

function printShow(apiId) {
  if (!apiId) {
    console.error("Usage: show <apiId>");
    process.exit(1);
  }
  const catalog = loadCatalog();
  const config = loadConfig();
  const api = getApi(catalog, apiId);
  ensureApiConfig(config, api);
  saveConfig(config);

  const { enabled, unknown } = resolveApiEnabled(api, config.apis[api.id].enabled);
  const manifest = writeManifest(catalog, config);

  if (unknown.length > 0) {
    console.warn(`Removed unknown ids from manifest: ${unknown.join(", ")}`);
  }

  const entry = manifest.apis.find((a) => a.id === apiId);
  console.log(`${api.mcpServerName} — ${enabled.length} endpoint(s) enabled:\n`);
  for (const ep of entry?.enabled ?? []) {
    console.log(`• ${ep.id} — ${ep.label}`);
    console.log(`  ${ep.rapidApiUrl}`);
  }
  console.log(`\nConfig: ${CONFIG_PATH}`);
  console.log(`Manifest: ${MANIFEST_PATH}`);
}

function cmdEnable(apiId, ids) {
  if (!apiId || ids.length === 0) {
    console.error("Usage: enable <apiId> <endpoint-id>...");
    process.exit(1);
  }
  const catalog = loadCatalog();
  const config = loadConfig();
  const api = getApi(catalog, apiId);
  ensureApiConfig(config, api);
  const valid = new Set(api.endpoints.map((e) => e.id));
  const next = new Set(config.apis[apiId].enabled);
  for (const id of ids) {
    if (!valid.has(id)) {
      console.error(`Unknown endpoint id for ${apiId}: ${id}`);
      process.exit(1);
    }
    next.add(id);
  }
  config.apis[apiId].enabled = [...next];
  saveConfig(config);
  printShow(apiId);
}

function cmdDisable(apiId, ids) {
  if (!apiId || ids.length === 0) {
    console.error("Usage: disable <apiId> <endpoint-id>...");
    process.exit(1);
  }
  const catalog = loadCatalog();
  const config = loadConfig();
  getApi(catalog, apiId);
  ensureApiConfig(config, getApi(catalog, apiId));
  const next = new Set(config.apis[apiId].enabled);
  for (const id of ids) next.delete(id);
  config.apis[apiId].enabled = [...next];
  saveConfig(config);
  printShow(apiId);
}

function cmdSet(apiId, ids) {
  if (!apiId || ids.length === 0) {
    console.error("Usage: set <apiId> <endpoint-id>...");
    process.exit(1);
  }
  const catalog = loadCatalog();
  const api = getApi(catalog, apiId);
  const valid = new Set(api.endpoints.map((e) => e.id));
  for (const id of ids) {
    if (!valid.has(id)) {
      console.error(`Unknown endpoint id for ${apiId}: ${id}`);
      process.exit(1);
    }
  }
  const config = loadConfig();
  config.apis[apiId] = { enabled: ids };
  saveConfig(config);
  printShow(apiId);
}

function cmdReset(apiId) {
  const catalog = loadCatalog();
  const config = loadConfig();
  const targets = apiId ? [getApi(catalog, apiId)] : catalog.apis;
  for (const api of targets) {
    config.apis[api.id] = { enabled: defaultEnabledForApi(api) };
  }
  saveConfig(config);
  writeManifest(catalog, config);
  if (apiId) printShow(apiId);
  else console.log(`Reset all APIs to catalog defaults.\nManifest: ${MANIFEST_PATH}`);
}

const [command, apiId, ...rest] = process.argv.slice(2);

switch (command) {
  case "list":
    printList(apiId);
    break;
  case "show":
    printShow(apiId);
    break;
  case "enable":
    cmdEnable(apiId, rest);
    break;
  case "disable":
    cmdDisable(apiId, rest);
    break;
  case "set":
    cmdSet(apiId, rest);
    break;
  case "reset":
    cmdReset(apiId);
    break;
  default:
    printList();
    break;
}
