import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  root: "client",
  server: {
    port: 4243,
    strictPort: true,
    host: "localhost",
  },
  build: {
    outDir: "../dist/client",
    emptyOutDir: true,
  },
});
