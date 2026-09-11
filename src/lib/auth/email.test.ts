// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { sendAuthEmail } from "./email";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("auth e-mail delivery", () => {
  it("fails closed when the server-side provider is missing", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("AUTH_EMAIL_FROM", "");

    await expect(
      sendAuthEmail({
        to: "person@example.test",
        subject: "Verifiera",
        intro: "Verifiera adressen.",
        actionLabel: "Verifiera",
        actionUrl: "https://example.test/verify?token=test",
        idempotencyKey: "verify-test",
      }),
    ).rejects.toThrow("inte konfigurerad");
  });

  it("sends secrets only in the authorization header", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_private_test");
    vi.stubEnv("AUTH_EMAIL_FROM", "Hemekonomi <auth@example.test>");
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));

    await sendAuthEmail({
      to: "person@example.test",
      subject: "Verifiera",
      intro: "Verifiera adressen.",
      actionLabel: "Verifiera",
      actionUrl: "https://example.test/verify?token=test&next=/",
      idempotencyKey: "verify-test",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer re_private_test",
      "Idempotency-Key": "verify-test",
    });
    expect(String(init?.body)).not.toContain("re_private_test");
    expect(String(init?.body)).toContain("&amp;next=/");
  });
});
