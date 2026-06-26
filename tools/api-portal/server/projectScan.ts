import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, extname, join, relative } from "node:path";
import { nanoid } from "nanoid";
import { propagateEnvVarValue } from "./envImport.js";
import { isPlaceholderValue, parseEnvFile } from "./envParse.js";
import type { SyncTarget, VaultData } from "./vault.js";
import { hashValue } from "./vault.js";

const IGNORE_ENV_VARS = new Set([
  "DEV",
  "PROD",
  "MODE",
  "SSR",
  "BASE_URL",
  "NODE_ENV",
  "VITE_BUILD_VERSION",
]);

const SCAN_DIR_NAMES = new Set(["src", "api", "scripts", "app", "server", "electron", "lib"]);
const SCAN_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".vue", ".svelte"]);
const MAX_FILE_BYTES = 512_000;
const MAX_FILES = 800;

const CODE_PATTERNS = [
  /import\.meta\.env\.([A-Z][A-Z0-9_]*)/g,
  /process\.env\.([A-Z][A-Z0-9_]*)/g,
] as const;

const VITE_ENV_DECL = /readonly\s+([A-Z][A-Z0-9_]*)\??\s*:/g;
const ENV_LINE = /^([A-Z][A-Z0-9_]*)=/gm;

export type DiscoveredEnvVar = {
  name: string;
  sources: string[];
  inVault: boolean;
  vaultKeyId: string | null;
  onTarget: boolean;
  inEnvFile: boolean;
  envFileValueIsPlaceholder: boolean | null;
};

export type ProjectScanResult = {
  projectName: string;
  envFilePath: string;
  rootPath: string;
  targetId: string | null;
  discovered: DiscoveredEnvVar[];
  /** Used in code / env example but not assigned to this app's sync target */
  unassigned: DiscoveredEnvVar[];
  /** Not in vault yet */
  missingFromVault: DiscoveredEnvVar[];
  /** Assigned to this app but env var no longer appears in source scan */
  staleAssigned: Array<{ keyId: string; envVarName: string; label: string }>;
};

function shouldIncludeVar(name: string): boolean {
  if (IGNORE_ENV_VARS.has(name)) return false;
  if (name.startsWith("npm_")) return false;
  return true;
}

function addVar(
  map: Map<string, Set<string>>,
  name: string,
  source: string
): void {
  if (!shouldIncludeVar(name)) return;
  const set = map.get(name) ?? new Set<string>();
  set.add(source);
  map.set(name, set);
}

function scanContent(map: Map<string, Set<string>>, content: string, source: string): void {
  for (const pattern of CODE_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of content.matchAll(pattern)) {
      const name = match[1];
      if (name) addVar(map, name, source);
    }
  }
}

function scanViteEnvDecl(map: Map<string, Set<string>>, content: string, source: string): void {
  VITE_ENV_DECL.lastIndex = 0;
  for (const match of content.matchAll(VITE_ENV_DECL)) {
    const name = match[1];
    if (name) addVar(map, name, source);
  }
}

function scanEnvLines(map: Map<string, Set<string>>, content: string, source: string): void {
  ENV_LINE.lastIndex = 0;
  for (const match of content.matchAll(ENV_LINE)) {
    const name = match[1];
    if (name) addVar(map, name, source);
  }
}

async function walkSourceTree(
  rootPath: string,
  map: Map<string, Set<string>>,
  state: { fileCount: number }
): Promise<void> {
  async function visit(dir: string, depth: number): Promise<void> {
    if (depth > 8 || state.fileCount >= MAX_FILES) return;
    let entries: string[];
    try {
      entries = await readdir(dir);
    } catch {
      return;
    }

    for (const entry of entries) {
      if (state.fileCount >= MAX_FILES) return;
      if (entry === "node_modules" || entry === "dist" || entry === ".git" || entry.startsWith(".")) {
        continue;
      }

      const full = join(dir, entry);
      let st;
      try {
        st = await stat(full);
      } catch {
        continue;
      }

      if (st.isDirectory()) {
        const rel = relative(rootPath, full);
        const top = rel.split("/")[0] ?? rel;
        if (depth === 0 && !SCAN_DIR_NAMES.has(top) && top !== ".") {
          if (!["vite-env.d.ts", "vite.config.ts"].some((f) => entry === f)) {
            continue;
          }
        }
        await visit(full, depth + 1);
        continue;
      }

      if (!st.isFile() || st.size > MAX_FILE_BYTES) continue;
      const ext = extname(entry);
      const relPath = relative(rootPath, full);
      const isRootConfig =
        depth === 0 && (entry === "vite-env.d.ts" || entry === "vite.config.ts");
      const inScanDir = SCAN_DIR_NAMES.has(relPath.split("/")[0] ?? "");

      if (!SCAN_EXTENSIONS.has(ext) && !isRootConfig) continue;
      if (!inScanDir && !isRootConfig && !relPath.includes("vite-env.d.ts")) continue;

      let content: string;
      try {
        content = await readFile(full, "utf8");
      } catch {
        continue;
      }

      state.fileCount++;
      if (entry === "vite-env.d.ts" || content.includes("interface ImportMetaEnv")) {
        scanViteEnvDecl(map, content, relPath);
      }
      scanContent(map, content, relPath);
    }
  }

  await visit(rootPath, 0);
}

export function rootPathFromEnvFile(envFilePath: string): string {
  return dirname(envFilePath);
}

/** Scan a project folder for env var names used in code, types, and env templates. */
export async function scanProjectRoot(
  rootPath: string,
  envFilePath: string
): Promise<Map<string, Set<string>>> {
  const map = new Map<string, Set<string>>();
  const state = { fileCount: 0 };

  if (!existsSync(rootPath)) {
    return map;
  }

  await walkSourceTree(rootPath, map, state);

  const envCandidates = [
    envFilePath,
    join(rootPath, ".env.example"),
    join(rootPath, ".env.local.example"),
    join(rootPath, ".env"),
  ];

  for (const envPath of envCandidates) {
    if (!existsSync(envPath)) continue;
    try {
      const content = await readFile(envPath, "utf8");
      scanEnvLines(map, content, relative(rootPath, envPath) || envPath);
    } catch {
      // skip unreadable env files
    }
  }

  const viteEnvPaths = [
    join(rootPath, "src/vite-env.d.ts"),
    join(rootPath, "vite-env.d.ts"),
  ];
  for (const p of viteEnvPaths) {
    if (!existsSync(p)) continue;
    try {
      const content = await readFile(p, "utf8");
      scanViteEnvDecl(map, content, relative(rootPath, p));
    } catch {
      // skip
    }
  }

  return map;
}

function buildDiscoveredList(
  map: Map<string, Set<string>>,
  vault: VaultData,
  target: SyncTarget | null,
  envParsed: Array<{ name: string; value: string }>
): DiscoveredEnvVar[] {
  const discovered: DiscoveredEnvVar[] = [];
  for (const [name, sources] of [...map.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const vaultKey = vault.keys.find((k) => k.envVarName === name);
    const envEntry = envParsed.find((v) => v.name === name);
    const onTarget = target
      ? target.keyIds.some((id) => vault.keys.find((k) => k.id === id)?.envVarName === name)
      : false;

    discovered.push({
      name,
      sources: [...sources].sort(),
      inVault: Boolean(vaultKey),
      vaultKeyId: vaultKey?.id ?? null,
      onTarget,
      inEnvFile: Boolean(envEntry),
      envFileValueIsPlaceholder: envEntry ? isPlaceholderValue(envEntry.value) : null,
    });
  }

  return discovered;
}

export async function scanProjectForVault(
  vault: VaultData,
  projectName: string,
  envFilePath: string,
  rootPath?: string
): Promise<ProjectScanResult> {
  const root = rootPath ?? rootPathFromEnvFile(envFilePath);
  const target =
    vault.syncTargets.find((t) => t.envFilePath === envFilePath) ??
    vault.syncTargets.find((t) => t.name === projectName) ??
    null;

  const map = await scanProjectRoot(root, envFilePath);
  let envParsed: Array<{ name: string; value: string }> = [];
  if (existsSync(envFilePath)) {
    try {
      envParsed = parseEnvFile(await readFile(envFilePath, "utf8"));
    } catch {
      envParsed = [];
    }
  }
  const discovered = buildDiscoveredList(map, vault, target, envParsed);
  const discoveredNames = new Set(discovered.map((d) => d.name));
  const staleAssigned =
    target
      ? target.keyIds
          .map((id) => vault.keys.find((k) => k.id === id))
          .filter((k): k is NonNullable<typeof k> => Boolean(k))
          .filter((k) => !discoveredNames.has(k.envVarName))
          .map((k) => ({ keyId: k.id, envVarName: k.envVarName, label: k.label }))
      : [];

  return {
    projectName,
    envFilePath,
    rootPath: root,
    targetId: target?.id ?? null,
    discovered,
    unassigned: discovered.filter((d) => !d.onTarget),
    missingFromVault: discovered.filter((d) => !d.inVault),
    staleAssigned,
  };
}

export type ApplyDiscoveredResult = {
  projectName: string;
  targetId: string;
  addedToVault: string[];
  assigned: string[];
  valuesPulled: string[];
};

function labelFromEnvVar(envVarName: string): string {
  const base = envVarName.replace(/_API_KEY$/, "").replace(/_/g, " ");
  return `${base} API Key`;
}

/** Register discovered vars in the vault and assign them to the app's sync target. */
export async function applyDiscoveredVars(
  vault: VaultData,
  projectName: string,
  envFilePath: string,
  varNames: string[],
  options: { pullValuesFromEnv?: boolean } = {}
): Promise<ApplyDiscoveredResult> {
  const now = new Date().toISOString();
  const addedToVault: string[] = [];
  const assigned: string[] = [];
  const valuesPulled: string[] = [];
  const newKeyIds: string[] = [];

  let envParsed: Array<{ name: string; value: string }> = [];
  if (options.pullValuesFromEnv && existsSync(envFilePath)) {
    const content = await readFile(envFilePath, "utf8");
    envParsed = parseEnvFile(content);
  }

  for (const varName of varNames) {
    let key = vault.keys.find((k) => k.envVarName === varName);
    const envEntry = envParsed.find((v) => v.name === varName);
    const pullValue =
      envEntry && !isPlaceholderValue(envEntry.value) ? envEntry.value : null;

    if (!key) {
      key = {
        id: nanoid(),
        createdAt: now,
        updatedAt: now,
        serviceGroup: projectName,
        label: labelFromEnvVar(varName),
        envVarName: varName,
        value: pullValue ?? "FILL_ME_IN",
        notes: `Detected in ${projectName} source scan.`,
        disabled: false,
      };
      vault.keys.push(key);
      addedToVault.push(varName);
      if (pullValue) valuesPulled.push(varName);
      vault.history.push({
        id: nanoid(),
        timestamp: now,
        action: "create",
        keyId: key.id,
        label: key.label,
        envVarName: varName,
        newValueHash: hashValue(key.value),
        meta: `detected in ${projectName}`,
      });
    } else if (pullValue && isPlaceholderValue(key.value)) {
      const oldHash = hashValue(key.value);
      key.value = pullValue;
      key.updatedAt = now;
      valuesPulled.push(varName);
      propagateEnvVarValue(vault, varName, pullValue, key.id);
      vault.history.push({
        id: nanoid(),
        timestamp: now,
        action: "update",
        keyId: key.id,
        label: key.label,
        envVarName: varName,
        oldValueHash: oldHash,
        newValueHash: hashValue(pullValue),
        meta: `pulled from ${envFilePath}`,
      });
    }

    newKeyIds.push(key.id);
    assigned.push(varName);
  }

  let target =
    vault.syncTargets.find((t) => t.envFilePath === envFilePath) ??
    vault.syncTargets.find((t) => t.name === projectName);

  if (!target) {
    target = {
      id: nanoid(),
      name: projectName,
      envFilePath,
      keyIds: [],
    };
    vault.syncTargets.push(target);
  }

  target.name = projectName;
  target.envFilePath = envFilePath;
  const merged = new Set([...target.keyIds, ...newKeyIds]);
  target.keyIds = [...merged];

  return {
    projectName,
    targetId: target.id,
    addedToVault,
    assigned,
    valuesPulled,
  };
}
