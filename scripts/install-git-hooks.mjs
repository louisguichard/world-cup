#!/usr/bin/env node
/**
 * Point this repo at .githooks/ for pre-commit build bumps and post-commit tracking.
 */
import { chmodSync, copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const HOOKS_DIR = join(ROOT, ".githooks");

const PRE_COMMIT = `#!/bin/sh
# Auto-increment build when substantive files are staged.
set -e
node scripts/version-auto-bump.mjs
`;

const POST_COMMIT = `#!/bin/sh
# Record commit hash + sync release canvas.
set -e
node scripts/version.mjs record-commit
`;

function writeHook(name, body) {
  const path = join(HOOKS_DIR, name);
  writeFileSync(path, body, { mode: 0o755 });
  chmodSync(path, 0o755);
}

mkdirSync(HOOKS_DIR, { recursive: true });
writeHook("pre-commit", PRE_COMMIT);
writeHook("post-commit", POST_COMMIT);

try {
  execSync("git rev-parse --git-dir", { cwd: ROOT, stdio: "ignore" });
  execSync(`git config core.hooksPath ${JSON.stringify(".githooks")}`, { cwd: ROOT });
  console.log("Git hooks installed → .githooks (pre-commit build bump, post-commit tracking)");
} catch {
  console.warn("install-git-hooks: not a git repo — hooks written but not configured");
}
