import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getAuthEnvironment,
  isEmailAuthConfigured,
  isGoogleAuthConfigured,
} from "./config";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("auth configuration", () => {
  it("keeps Google disabled until every private OAuth setting is present", () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "");
    vi.stubEnv("GOOGLE_CLIENT_ID", "");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "");

    expect(isGoogleAuthConfigured()).toBe(false);

    vi.stubEnv("BETTER_AUTH_SECRET", "test-secret-at-least-32-characters");
    vi.stubEnv("GOOGLE_CLIENT_ID", "google-client");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "google-secret");

    expect(isGoogleAuthConfigured()).toBe(true);
  });

  it("requires the OAuth proxy for Google sign-in on Vercel previews", () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "test-secret-at-least-32-characters");
    vi.stubEnv("GOOGLE_CLIENT_ID", "google-client");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "google-secret");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_URL", "home-economy-abc-visegue.vercel.app");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "home-economy.vercel.app");
    vi.stubEnv("OAUTH_PROXY_SECRET", "");
    vi.stubEnv(
      "BETTER_AUTH_TRUSTED_ORIGINS",
      "https://home-economy-*-visegue.vercel.app",
    );

    expect(isGoogleAuthConfigured()).toBe(false);

    vi.stubEnv(
      "OAUTH_PROXY_SECRET",
      "shared-proxy-secret-at-least-32-characters",
    );

    expect(isGoogleAuthConfigured()).toBe(true);
  });

  it("uses the current Vercel deployment URL and configures the proxy", () => {
    vi.stubEnv("BETTER_AUTH_URL", "https://home-economy.vercel.app");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_URL", "home-economy-abc-visegue.vercel.app");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "home-economy.vercel.app");
    vi.stubEnv(
      "OAUTH_PROXY_SECRET",
      "shared-proxy-secret-at-least-32-characters",
    );
    vi.stubEnv(
      "BETTER_AUTH_TRUSTED_ORIGINS",
      "https://home-economy-*-visegue.vercel.app, http://localhost:3000",
    );

    const environment = getAuthEnvironment();

    expect(environment.baseUrl).toBe(
      "https://home-economy-abc-visegue.vercel.app",
    );
    expect(environment.oauthProxy).toEqual({
      productionUrl: "https://home-economy.vercel.app",
      secret: "shared-proxy-secret-at-least-32-characters",
    });
    expect(environment.trustedOrigins).toEqual([
      "https://home-economy-*-visegue.vercel.app",
      "http://localhost:3000",
    ]);
  });

  it("uses the stable Vercel project URL in production", () => {
    vi.stubEnv("BETTER_AUTH_URL", "");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("VERCEL_URL", "home-economy-abc-visegue.vercel.app");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "home-economy.vercel.app");

    expect(getAuthEnvironment().baseUrl).toBe(
      "https://home-economy.vercel.app",
    );
  });

  it("keeps password registration disabled without secure e-mail delivery", () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "test-secret-at-least-32-characters");
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("AUTH_EMAIL_FROM", "");

    expect(isEmailAuthConfigured()).toBe(false);

    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("AUTH_EMAIL_FROM", "Hemekonomi <auth@example.test>");

    expect(isEmailAuthConfigured()).toBe(true);
  });
});
