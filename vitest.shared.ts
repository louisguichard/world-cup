import { defineConfig } from "vitest/config";

export function createBaseVitestConfig() {
  return defineConfig({
    test: {
      globals: false,
      environment: "node",
      include: ["src/**/*.test.ts"],
      coverage: {
        reporter: ["text", "html"],
      },
    },
  });
}
