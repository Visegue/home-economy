// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { smokeDeployment } from "./smoke-deployment.mjs";

const html = '<html lang="sv"><body>Välkommen tillbaka</body></html>';
const response = (status = 200, body = html, type = "text/html") => ({
  status,
  headers: new Headers({ "content-type": type }),
  text: async () => body,
});

describe("staged deployment smoke test", () => {
  it("checks only the staged Vercel login page", async () => {
    const fetchPage = vi.fn(async () => response());
    await smokeDeployment("https://home-economy-abc.vercel.app", fetchPage);
    expect(fetchPage).toHaveBeenCalledOnce();
    expect(fetchPage.mock.calls[0][0].href).toBe(
      "https://home-economy-abc.vercel.app/login",
    );
    expect(fetchPage.mock.calls[0][1].redirect).toBe("manual");
  });

  it.each([
    "http://home-economy.vercel.app",
    "https://example.com",
    "https://home-economy.vercel.app.evil.example",
    "https://user:secret@home-economy.vercel.app",
    "https://home-economy.vercel.app/other",
  ])("rejects an unsafe deployment URL: %s", async (url) => {
    const fetchPage = vi.fn();
    await expect(smokeDeployment(url, fetchPage)).rejects.toThrow(
      "Deployment URL must be an HTTPS Vercel hostname",
    );
    expect(fetchPage).not.toHaveBeenCalled();
  });

  it.each([
    response(302),
    response(500),
    response(200, html, "application/json"),
    response(200, "<html>Deployment failed</html>"),
  ])("rejects a non-working app response", async (result) => {
    await expect(
      smokeDeployment("https://home-economy.vercel.app", async () => result),
    ).rejects.toThrow(/Staged application/);
  });
});
