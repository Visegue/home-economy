import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    // Each database test file starts PGlite; limit local resource contention.
    maxWorkers: process.env.CI ? undefined : 2,
    environment: "jsdom",
    exclude: ["e2e/**", "node_modules/**", ".next/**", ".tmp/**"],
    setupFiles: ["./src/test/setup.ts"],
  },
});
