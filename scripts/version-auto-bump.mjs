#!/usr/bin/env node
/**
 * Pre-commit auto bump: increments build when substantive files are staged.
 * Called from .githooks/pre-commit (via npm run prepare).
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { VERSION_ARTIFACT_PATHS } from "./lib/version-artifacts.mjs";
import { runBuildBump, summarizeStagedChanges } from "./lib/version-core.mjs";

function git(cmd) {
  return execSync(cmd, { encoding: "utf8" }).trim();
}

function listStagedFiles() {
  try {
    return git("git diff --cached --name-only")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function substantiveStaged(staged) {
  return staged.filter((file) => !VERSION_ARTIFACT_PATHS.has(file));
}

function stageVersionArtifacts() {
  const files = [
    "version.json",
    "package.json",
    "VERSION_LOG.md",
    "CHANGELOG.md",
    "build-manifest.json",
  ];
  for (const file of files) {
    if (existsSync(file)) {
      execSync(`git add ${JSON.stringify(file)}`);
    }
  }
}

function main() {
  const staged = listStagedFiles();
  if (staged.length === 0) {
    process.exit(0);
  }

  const substantive = substantiveStaged(staged);
  if (substantive.length === 0) {
    process.exit(0);
  }

  const autoMessage = summarizeStagedChanges();
  const meta = runBuildBump(autoMessage);
  stageVersionArtifacts();

  console.log(`[version-auto-bump] v${meta.version} build ${meta.build} — ${autoMessage}`);
}

main();
