import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  workers: process.env.CI ? undefined : 2,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ["html", { open: "never" }],
    ["json", { outputFile: "test-results/report.json" }],
    [
      fileURLToPath(
        new URL("./scripts/server-diagnostics-reporter.mjs", import.meta.url),
      ),
    ],
  ],
  use: {
    baseURL: "http://127.0.0.1:3000",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : undefined,
    trace: { mode: "retain-on-failure-and-retries", sources: false },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command:
      "node scripts/with-next-output.mjs test:e2e node scripts/start-playwright-server.mjs",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: false,
    stdout: "pipe",
    stderr: "pipe",
    gracefulShutdown: { signal: "SIGTERM", timeout: 10_000 },
    env: {
      DATABASE_PROVIDER: "pglite",
      PGLITE_DATA_DIR: "memory://",
      DATABASE_URL: "",
      DATABASE_MIGRATION_URL: "",
      BETTER_AUTH_URL: "http://127.0.0.1:3000",
      BETTER_AUTH_SECRET: "synthetic-playwright-secret-only-for-tests",
      GOOGLE_CLIENT_ID: "synthetic-google-client",
      GOOGLE_CLIENT_SECRET: "synthetic-google-secret",
      RESEND_API_KEY: "synthetic-resend-key",
      AUTH_EMAIL_FROM: "test@example.test",
      APP_DEPLOY_ENV: "preview",
      APP_DEPLOY_SHA: "a".repeat(40),
      APP_DEPLOY_BRANCH: "codex/test-preview",
    },
  },
});
