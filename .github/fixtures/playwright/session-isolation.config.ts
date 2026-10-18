import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";
import appConfig from "../../../playwright.config";

const root = new URL("../../../", import.meta.url);
export default defineConfig({
  ...appConfig,
  testDir: "./sessions",
  testMatch: "scenario.ts",
  webServer: {
    ...appConfig.webServer,
    cwd: fileURLToPath(root),
  },
  reporter: [
    ["list"],
    [
      "json",
      { outputFile: fileURLToPath(new URL("test-results/report.json", root)) },
    ],
    [fileURLToPath(new URL("scripts/server-diagnostics-reporter.mjs", root))],
  ],
});
