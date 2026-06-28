import { defineConfig } from "vitest/config";

/** Multi-project test runner — root app + packages. */
export default defineConfig({
  test: {
    projects: [
      "./vitest.config.ts",
      "./packages/identity/vitest.config.ts",
      "./packages/qualification/vitest.config.ts",
      {
        test: {
          name: "server",
          environment: "node",
          include: ["server/src/**/*.test.ts"],
        },
      },
    ],
  },
});
