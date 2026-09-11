import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://127.0.0.1:3000",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : undefined,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: false,
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
    },
  },
});
