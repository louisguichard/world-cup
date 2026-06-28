import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  "./vitest.config.ts",
  "./packages/identity/vitest.config.ts",
  "./packages/qualification/vitest.config.ts",
]);
