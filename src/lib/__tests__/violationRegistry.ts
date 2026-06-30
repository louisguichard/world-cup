/**
 * @rulesVersion — bound to tournamentRules.ts
 * @violates — collects ERR violations and applies idempotent auto-fixes
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type RuleViolation = {
  code: string;
  file: string;
  line?: number;
  description: string;
  fixHint: "auto" | "manual";
  autoFix?: {
    targetFile: string;
    find: RegExp;
    replace: string;
  };
};

const SNAPSHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "snapshots");

export class ViolationRegistry {
  private violations: RuleViolation[] = [];

  record(v: RuleViolation): void {
    this.violations.push(v);
  }

  hasViolations(): boolean {
    return this.violations.length > 0;
  }

  report(): string {
    return this.violations
      .map((v) => {
        const line = v.line != null ? `:${v.line}` : "";
        return `[${v.code}] ${v.file}${line}\n  ${v.description}\n  fix: ${v.fixHint}`;
      })
      .join("\n\n");
  }

  async applyFixes(): Promise<void> {
    for (const violation of this.violations) {
      if (violation.fixHint !== "auto" || !violation.autoFix) continue;
      const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
      const targetPath = join(root, violation.autoFix.targetFile);
      if (!existsSync(targetPath)) continue;

      const source = readFileSync(targetPath, "utf8");
      if (!violation.autoFix.find.test(source)) continue;
      const next = source.replace(violation.autoFix.find, violation.autoFix.replace);
      if (next === source) continue;

      writeFileSync(targetPath, next, "utf8");
      if (typeof console !== "undefined") {
        console.info(`AUTO-FIXED: ${violation.code} in ${violation.autoFix.targetFile}`);
      }
    }
  }

  writeRegressionSnapshot(code: string, data: unknown): void {
    mkdirSync(SNAPSHOT_DIR, { recursive: true });
    const file = join(SNAPSHOT_DIR, `${code}.snap.json`);
    writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  }
}

export function loadRegressionSnapshot<T>(code: string): T | null {
  const file = join(SNAPSHOT_DIR, `${code}.snap.json`);
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

export function assertRegressionSnapshot<T>(
  code: string,
  data: T,
  registry: ViolationRegistry,
  regressionMessage: string
): void {
  const prior = loadRegressionSnapshot<T>(code);
  if (prior == null) {
    registry.writeRegressionSnapshot(code, data);
    return;
  }

  const live = JSON.stringify(data);
  const frozen = JSON.stringify(prior);
  if (live !== frozen) {
    registry.record({
      code,
      file: `snapshots/${code}.snap.json`,
      description: regressionMessage,
      fixHint: "manual",
    });
  }
}
