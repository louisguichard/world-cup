#!/usr/bin/env node
/**
 * Version & build manager for Road to the World Cup Final 2026.
 *
 * Usage:
 *   node scripts/version.mjs build [--message "what changed"]
 *   node scripts/version.mjs patch|minor|major [--message "release notes"]
 *   node scripts/version.mjs log --message "note without bumping"
 *   node scripts/version.mjs show
 *
 * Every `build` increments build number. Semver bumps reset build to 1.
 * Updates: version.json, package.json, VERSION_LOG.md (and CHANGELOG on semver bumps).
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const VERSION_FILE = join(ROOT, "version.json");
const PACKAGE_FILE = join(ROOT, "package.json");
const VERSION_LOG = join(ROOT, "VERSION_LOG.md");
const CHANGELOG = join(ROOT, "CHANGELOG.md");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, data) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function parseArgs(argv) {
  const command = argv[0] ?? "show";
  let message = "";
  for (let i = 1; i < argv.length; i += 1) {
    if (argv[i] === "--message" || argv[i] === "-m") {
      message = argv[i + 1] ?? "";
      i += 1;
    }
  }
  return { command, message };
}

function bumpSemver(version, level) {
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

function appendVersionLog({ version, build, message, kind }) {
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

  // Insert new entries after the intro block, before the first existing ## [version] line.
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

function prependChangelog({ version, message }) {
  let existing = "";
  try {
    existing = readFileSync(CHANGELOG, "utf8");
  } catch {
    existing = `# Changelog\n\nAll notable releases of **Road to the World Cup Final 2026**.\n\nFormat follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).\n\n`;
  }

  const body = message
    ? message
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => `- ${line}`)
        .join("\n")
    : "- Release bump";

  const entry = `## [${version}] — ${todayIso()}\n\n### Changed\n${body}\n\n`;
  const marker = "# Changelog";
  const idx = existing.indexOf(marker);
  const prefix = idx >= 0 ? existing.slice(0, idx + marker.length) : `# Changelog`;
  const rest = idx >= 0 ? existing.slice(idx + marker.length).replace(/^\s*\n/, "\n") : "\n";
  const next = `${prefix}\n\n${entry}${rest.trimStart()}`;
  writeFileSync(CHANGELOG, next.endsWith("\n") ? next : `${next}\n`, "utf8");
}

function syncPackageJson(version) {
  const pkg = readJson(PACKAGE_FILE);
  pkg.version = version;
  writeJson(PACKAGE_FILE, pkg);
}

function main() {
  const { command, message } = parseArgs(process.argv.slice(2));
  const meta = readJson(VERSION_FILE);

  if (command === "show") {
    console.log(`${meta.version} (build ${meta.build}) [${meta.channel}]`);
    return;
  }

  if (command === "log") {
    if (!message) {
      console.error("log requires --message");
      process.exit(1);
    }
    appendVersionLog({
      version: meta.version,
      build: meta.build,
      message,
      kind: "note"
    });
    console.log(`Logged note for v${meta.version} build ${meta.build}`);
    return;
  }

  if (command === "build") {
    meta.build += 1;
    meta.releasedAt = todayIso();
    writeJson(VERSION_FILE, meta);
    syncPackageJson(meta.version);
    appendVersionLog({
      version: meta.version,
      build: meta.build,
      message,
      kind: "build"
    });
    console.log(`Build bumped → v${meta.version} build ${meta.build}`);
    return;
  }

  if (command === "patch" || command === "minor" || command === "major") {
    meta.version = bumpSemver(meta.version, command);
    meta.build = 1;
    meta.releasedAt = todayIso();
    writeJson(VERSION_FILE, meta);
    syncPackageJson(meta.version);
    appendVersionLog({
      version: meta.version,
      build: meta.build,
      message,
      kind: command
    });
    prependChangelog({ version: meta.version, message });
    console.log(`Version bumped → v${meta.version} build ${meta.build}`);
    return;
  }

  console.error(`Unknown command: ${command}`);
  console.error("Commands: build | patch | minor | major | log | show");
  process.exit(1);
}

main();
