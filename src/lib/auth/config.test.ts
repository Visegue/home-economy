import { afterEach, describe, expect, it, vi } from "vitest";

import { getAllowedEmails, isAuthConfigured } from "./config";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("auth configuration", () => {
  it("normalizes and deduplicates allowed e-mail addresses", () => {
    vi.stubEnv(
      "AUTH_ALLOWED_EMAILS",
      " Alex@example.com,partner@example.com,alex@example.com ",
    );

    expect([...getAllowedEmails()]).toEqual([
      "alex@example.com",
      "partner@example.com",
    ]);
  });

  it("fails closed until every private auth setting is present", () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "test-secret-at-least-32-characters");
    vi.stubEnv("GOOGLE_CLIENT_ID", "google-client");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "google-secret");
    vi.stubEnv("AUTH_ALLOWED_EMAILS", "");

    expect(isAuthConfigured()).toBe(false);

    vi.stubEnv("AUTH_ALLOWED_EMAILS", "owner@example.com");
    expect(isAuthConfigured()).toBe(true);
  });
});
