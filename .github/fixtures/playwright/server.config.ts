import { defineConfig } from "@playwright/test";
import appConfig from "../../../playwright.config";

export default defineConfig({
  ...appConfig,
  testDir: ".",
  testMatch: "server.case.ts",
  retries: 0,
  workers: 1,
  outputDir: `${process.env.DIAGNOSTICS_DIRECTORY}/test-results`,
  webServer: {
    command: "node server.mjs",
    wait: { stdout: /SERVER_READY/ },
    stdout: "pipe",
    stderr: "pipe",
    gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 },
  },
});
