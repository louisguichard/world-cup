#!/usr/bin/env node
/** Zafronix alias for scripts/mcp-endpoint-config.mjs */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const script = join(ROOT, "scripts/mcp-endpoint-config.mjs");
const [command, ...rest] = process.argv.slice(2);

let args;
if (!command) {
  args = ["list", "zafronix"];
} else if (command === "list") {
  args = rest.length > 0 ? ["list", ...rest] : ["list", "zafronix"];
} else if (["show", "enable", "disable", "set"].includes(command)) {
  args = [command, "zafronix", ...rest];
} else if (command === "reset") {
  args = rest.length > 0 ? ["reset", ...rest] : ["reset", "zafronix"];
} else {
  args = [command, ...rest];
}

const result = spawnSync("node", [script, ...args], { stdio: "inherit" });
process.exit(result.status ?? 1);
