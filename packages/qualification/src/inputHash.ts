import { createHash } from "node:crypto";

export function computeInputHash(input: unknown): string {
  const str = JSON.stringify(input, Object.keys(input as object).sort());
  return createHash("sha256").update(str).digest("hex").slice(0, 16);
}
