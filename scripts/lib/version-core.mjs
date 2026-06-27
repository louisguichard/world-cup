/**
 * Core version/build/changelog/manifest/canvas sync logic.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import {
  BUILD_MANIFEST,
  CHANGELOG,
  PACKAGE_FILE,
  RELEASE_CANVAS_PATH,
  RELEASE_CANVAS_SNAPSHOT_END,
  RELEASE_CANVAS_SNAPSHOT_START,
  VERSION_FILE,
  VERSION_LOG,
} from "./version-artifacts.mjs";

const MAX_MANIFEST_BUILDS = 40;
const MAX_MANIFEST_COMMITS = 30;
const MAX_MANIFEST_DEPLOYS = 20;

export function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function writeJson(path, data) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function nowIso() {
  return new Date().toISOString();
}

function readManifest() {
  if (!existsSync(BUILD_MANIFEST)) {
    return { updatedAt: null, builds: [], commits: [], deploys: [] };
  }
  return readJson(BUILD_MANIFEST);
}

function writeManifest(manifest) {
  manifest.updatedAt = nowIso();
  writeJson(BUILD_MANIFEST, manifest);
}

function trimManifest(manifest) {
  manifest.builds = (manifest.builds ?? []).slice(0, MAX_MANIFEST_BUILDS);
  manifest.commits = (manifest.commits ?? []).slice(0, MAX_MANIFEST_COMMITS);
  manifest.deploys = (manifest.deploys ?? []).slice(0, MAX_MANIFEST_DEPLOYS);
}

export function recordBuildInManifest({ version, build, message, kind }) {
  const manifest = readManifest();
  manifest.builds.unshift({
    version,
    build,
    kind,
    message: message || "(no message provided)",
    date: todayIso(),
    timestamp: nowIso(),
  });
  trimManifest(manifest);
  writeManifest(manifest);
}

export function recordCommitInManifest({ hash, shortHash, message, version, build }) {
  const manifest = readManifest();
  manifest.commits.unshift({
    hash,
    shortHash,
    message,
    version,
    build,
    timestamp: nowIso(),
  });
  trimManifest(manifest);
  writeManifest(manifest);
}

export function recordDeployInManifest({ url, environment, version, build, message }) {
  const manifest = readManifest();
  manifest.deploys.unshift({
    url: url ?? null,
    environment: environment ?? "production",
    version,
    build,
    message: message ?? "Production deploy",
    timestamp: nowIso(),
  });
  trimManifest(manifest);
  writeManifest(manifest);
}

export function bumpSemver(version, level) {
  const parts = version.split(".").map((n) => Number(n));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    throw new Error(`Invalid semver: ${version}`);
  }
  let [major, minor, patch] = parts;
  switch (level) {
    case "major":
      major += 1;
      minor = 0;
      patch = 0;
      break;
    case "minor":
      minor += 1;
      patch = 0;
      break;
    case "patch":
      patch += 1;
      break;
    default:
      throw new Error(`Unknown semver level: ${level}`);
  }
  return `${major}.${minor}.${patch}`;
}

export function appendVersionLog({ version, build, message, kind }) {
  const header = `## [${version}] build ${build} — ${todayIso()} (${kind})`;
  const body = message
    ? message
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => `- ${line}`)
        .join("\n")
    : "- (no message provided)";

  let existing = "";
  try {
    existing = readFileSync(VERSION_LOG, "utf8");
  } catch {
    existing = `# Version Log\n\nDetailed chronological record of every version and build increment.\n\n`;
  }

  const entry = `${header}\n${body}\n\n`;
  const marker = "# Version Log";
  const idx = existing.indexOf(marker);
  const prefix = idx >= 0 ? existing.slice(0, idx + marker.length) : `# Version Log`;
  let rest = idx >= 0 ? existing.slice(idx + marker.length) : "\n";

  const firstEntry = rest.search(/^## \[/m);
  if (firstEntry >= 0) {
    const intro = rest.slice(0, firstEntry);
    const entries = rest.slice(firstEntry);
    const next = `${prefix}${intro}\n${entry}${entries.trimStart()}`;
    writeFileSync(VERSION_LOG, next.endsWith("\n") ? next : `${next}\n`, "utf8");
    return;
  }

  const next = `${prefix}${rest}\n${entry}`.replace(/\n{3,}/g, "\n\n");
  writeFileSync(VERSION_LOG, next.endsWith("\n") ? next : `${next}\n`, "utf8");
}

function ensureUnreleasedSection(existing) {
  if (existing.includes("## [Unreleased]")) return existing;
  const marker = "# Changelog";
  const idx = existing.indexOf(marker);
  if (idx < 0) {
    return `# Changelog\n\n## [Unreleased]\n\n### Builds\n\n${existing}`;
  }
  const prefix = existing.slice(0, idx + marker.length);
  const rest = existing.slice(idx + marker.length);
  return `${prefix}\n\n## [Unreleased]\n\n### Builds\n\n${rest.trimStart()}`;
}

export function appendChangelogBuildEntry({ version, build, message }) {
  let existing = "";
  try {
    existing = readFileSync(CHANGELOG, "utf8");
  } catch {
    existing = `# Changelog\n\nAll notable releases of **Road to the World Cup Final 2026**.\n\n`;
  }

  existing = ensureUnreleasedSection(existing);
  const summary = (message || "Build increment")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("; ");

  const line = `- **${version} build ${build}** (${todayIso()}): ${summary}\n`;
  const buildsMarker = "### Builds\n";
  const buildsIdx = existing.indexOf(buildsMarker);
  if (buildsIdx < 0) {
    writeFileSync(CHANGELOG, `${existing}\n${line}`, "utf8");
    return;
  }

  const insertAt = buildsIdx + buildsMarker.length;
  const next = `${existing.slice(0, insertAt)}${line}${existing.slice(insertAt)}`;
  writeFileSync(CHANGELOG, next.endsWith("\n") ? next : `${next}\n`, "utf8");
}

export function prependChangelogRelease({ version, message }) {
  let existing = "";
  try {
    existing = readFileSync(CHANGELOG, "utf8");
  } catch {
    existing = `# Changelog\n\n`;
  }

  existing = ensureUnreleasedSection(existing);

  const unreleasedMatch = existing.match(/## \[Unreleased\][\s\S]*?(?=^## \[|\Z)/m);
  let unreleasedBuilds = "";
  if (unreleasedMatch) {
    const buildsSection = unreleasedMatch[0].match(/### Builds\n([\s\S]*?)(?=\n### |\n## |\Z)/);
    unreleasedBuilds = buildsSection?.[1]?.trim() ?? "";
    existing = existing.replace(/## \[Unreleased\][\s\S]*?(?=^## \[|\Z)/m, "");
  }

  const body = message
    ? message
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => `- ${line}`)
        .join("\n")
    : "- Release bump";

  const buildsBlock = unreleasedBuilds
    ? `\n### Builds\n${unreleasedBuilds.split("\n").filter(Boolean).join("\n")}\n`
    : "";

  const entry = `## [${version}] — ${todayIso()}\n\n### Changed\n${body}${buildsBlock}\n`;
  const marker = "# Changelog";
  const idx = existing.indexOf(marker);
  const prefix = idx >= 0 ? existing.slice(0, idx + marker.length) : `# Changelog`;
  const rest = idx >= 0 ? existing.slice(idx + marker.length).replace(/^\s*\n/, "\n") : "\n";

  const unreleasedStub = `\n## [Unreleased]\n\n### Builds\n\n`;
  const next = `${prefix}\n\n${entry}${unreleasedStub}${rest.trimStart()}`;
  writeFileSync(CHANGELOG, next.endsWith("\n") ? next : `${next}\n`, "utf8");
}

export function syncPackageJson(version) {
  const pkg = readJson(PACKAGE_FILE);
  pkg.version = version;
  writeJson(PACKAGE_FILE, pkg);
}

export function buildReleaseSnapshot() {
  const meta = readJson(VERSION_FILE);
  const manifest = readManifest();
  return {
    syncedAt: nowIso(),
    version: meta.version,
    build: meta.build,
    channel: meta.channel ?? "stable",
    releasedAt: meta.releasedAt ?? todayIso(),
    label: `v${meta.version} · build ${meta.build}`,
    compact: `v${meta.version}+${meta.build}`,
    builds: manifest.builds ?? [],
    commits: manifest.commits ?? [],
    deploys: manifest.deploys ?? [],
  };
}

export function syncReleaseCanvas() {
  if (!existsSync(RELEASE_CANVAS_PATH)) {
    console.warn("sync-release-canvas: canvas missing at", RELEASE_CANVAS_PATH);
    return false;
  }

  const canvasSrc = readFileSync(RELEASE_CANVAS_PATH, "utf8");
  if (!canvasSrc.includes(RELEASE_CANVAS_SNAPSHOT_START)) {
    console.warn("sync-release-canvas: snapshot markers missing");
    return false;
  }

  const snapshot = buildReleaseSnapshot();
  const block = `${RELEASE_CANVAS_SNAPSHOT_START}\nconst RELEASE_SNAPSHOT = ${JSON.stringify(snapshot, null, 2)} as const;\n${RELEASE_CANVAS_SNAPSHOT_END}`;

  const nextCanvas = canvasSrc.replace(
    new RegExp(`${RELEASE_CANVAS_SNAPSHOT_START}[\\s\\S]*?${RELEASE_CANVAS_SNAPSHOT_END}`),
    block
  );
  writeFileSync(RELEASE_CANVAS_PATH, nextCanvas);
  console.log(`Release canvas synced → ${snapshot.label} (${snapshot.syncedAt})`);
  return true;
}

export function runBuildBump(message) {
  const meta = readJson(VERSION_FILE);
  meta.build += 1;
  meta.releasedAt = todayIso();
  writeJson(VERSION_FILE, meta);
  syncPackageJson(meta.version);
  appendVersionLog({
    version: meta.version,
    build: meta.build,
    message,
    kind: "build",
  });
  appendChangelogBuildEntry({
    version: meta.version,
    build: meta.build,
    message,
  });
  recordBuildInManifest({
    version: meta.version,
    build: meta.build,
    message,
    kind: "build",
  });
  syncReleaseCanvas();
  return meta;
}

export function runSemverBump(level, message) {
  const meta = readJson(VERSION_FILE);
  meta.version = bumpSemver(meta.version, level);
  meta.build = 1;
  meta.releasedAt = todayIso();
  writeJson(VERSION_FILE, meta);
  syncPackageJson(meta.version);
  appendVersionLog({
    version: meta.version,
    build: meta.build,
    message,
    kind: level,
  });
  prependChangelogRelease({ version: meta.version, message });
  recordBuildInManifest({
    version: meta.version,
    build: meta.build,
    message,
    kind: level,
  });
  syncReleaseCanvas();
  return meta;
}

export function runRecordCommit() {
  let hash = "";
  let shortHash = "";
  let message = "";
  try {
    hash = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
    shortHash = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
    message = execSync("git log -1 --pretty=%s", { encoding: "utf8" }).trim();
  } catch {
    console.warn("record-commit: git unavailable");
    return null;
  }

  const meta = readJson(VERSION_FILE);
  recordCommitInManifest({
    hash,
    shortHash,
    message,
    version: meta.version,
    build: meta.build,
  });
  syncReleaseCanvas();
  return { hash, shortHash, message, version: meta.version, build: meta.build };
}

export function runRecordDeploy({ url, environment, message }) {
  const meta = readJson(VERSION_FILE);
  recordDeployInManifest({
    url,
    environment,
    version: meta.version,
    build: meta.build,
    message,
  });
  syncReleaseCanvas();
  return meta;
}

export function summarizeStagedChanges() {
  try {
    const names = execSync("git diff --cached --name-only", { encoding: "utf8" })
      .trim()
      .split("\n")
      .filter(Boolean);
    if (names.length === 0) return "";

    const areas = new Set();
    for (const name of names) {
      const top = name.split("/")[0] ?? name;
      areas.add(top);
    }

    const stat = execSync("git diff --cached --shortstat", { encoding: "utf8" }).trim();
    const areaList = [...areas].slice(0, 6).join(", ");
    const fileCount = names.length;
    return `${fileCount} file(s) in ${areaList}${stat ? ` — ${stat}` : ""}`;
  } catch {
    return "Staged changes (auto bump)";
  }
}
