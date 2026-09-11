// @vitest-environment node

import { getRedirectUrl } from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { proxy } from "./proxy";

describe("proxy route protection", () => {
  it("redirects requests without a session cookie to login", async () => {
    const response = await proxy(
      new NextRequest("https://home-economy.example/onboarding"),
    );

    expect(getRedirectUrl(response)).toBe("https://home-economy.example/login");
  });
});
