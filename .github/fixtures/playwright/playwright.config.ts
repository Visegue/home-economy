import { defineConfig } from "@playwright/test";
import appConfig from "../../../playwright.config";

export default defineConfig({
  ...appConfig,
  testDir: ".",
  testMatch: "diagnostics.case.ts",
  webServer: undefined,
  retries: 1,
  workers: 1,
  outputDir: `${process.env.DIAGNOSTICS_DIRECTORY}/test-results`,
});
