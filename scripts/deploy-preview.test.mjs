// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { deployPreview } from "./deploy-preview.mjs";

const env = {
  VERCEL_TOKEN: "synthetic-token",
  VERCEL_ORG_ID: "team_test",
  VERCEL_PROJECT_ID: "prj_test",
  DATABASE_URL: "postgresql://synthetic:unused@localhost/test",
  DATABASE_MIGRATION_URL: "owner-must-not-be-transmitted",
  PR_BRANCH: "codex/test",
  GITHUB_SHA: "a".repeat(40),
  GITHUB_REPOSITORY_ID: "123",
};
const project = { id: "prj_test", name: "test", link: { repoId: 123 } };
const ready = {
  projectId: "prj_test",
  target: null,
  gitSource: { sha: env.GITHUB_SHA },
  readyState: "READY",
  url: "test.vercel.app",
};
function api(responses) {
  return vi.fn(async () => ({ ok: true, json: async () => responses.shift() }));
}

describe("preview deployment", () => {
  it("uses only project APIs, branch preview variables and the tested commit, waiting for READY", async () => {
    const fetchApi = api([
      project,
      { failed: [] },
      { id: "dpl_test" },
      { ...ready, readyState: "BUILDING" },
      ready,
    ]);
    const pause = vi.fn();
    await expect(deployPreview(env, fetchApi, pause)).resolves.toBe(
      "https://test.vercel.app",
    );
    expect(pause).toHaveBeenCalledWith(10000);
    const calls = fetchApi.mock.calls;
    expect(calls.every(([url]) => !url.includes("/user"))).toBe(true);
    const variables = JSON.parse(calls[1][1].body);
    expect(variables).toEqual([
      {
        key: "DATABASE_URL",
        value: env.DATABASE_URL,
        type: "encrypted",
        target: ["preview"],
        gitBranch: env.PR_BRANCH,
      },
      {
        key: "DATABASE_PROVIDER",
        value: "postgres",
        type: "encrypted",
        target: ["preview"],
        gitBranch: env.PR_BRANCH,
      },
    ]);
    const deployment = JSON.parse(calls[2][1].body);
    expect(deployment.gitSource.sha).toBe(env.GITHUB_SHA);
    expect(deployment).not.toHaveProperty("target");
    expect(JSON.stringify(calls)).not.toContain(env.DATABASE_MIGRATION_URL);
  });
  it("stops before mutation if the repository does not match", async () => {
    const fetchApi = api([{ ...project, link: { repoId: 999 } }]);
    await expect(deployPreview(env, fetchApi)).rejects.toThrow(
      "does not match",
    );
    expect(fetchApi).toHaveBeenCalledTimes(1);
  });
  it.each([
    { ...ready, readyState: "ERROR" },
    { ...ready, target: "production" },
    { ...ready, gitSource: { sha: "wrong" } },
  ])("rejects failed or mismatched deployments", async (deployment) => {
    await expect(
      deployPreview(
        env,
        api([project, { failed: [] }, { id: "dpl_test" }, deployment]),
      ),
    ).rejects.toThrow(/Vercel deployment ERROR|does not match/);
  });
  it("does not deploy when environment variable updates partially fail", async () => {
    const fetchApi = api([
      project,
      { failed: [{ error: { code: "forbidden" } }] },
    ]);
    await expect(deployPreview(env, fetchApi)).rejects.toThrow(
      "could not save",
    );
    expect(fetchApi).toHaveBeenCalledTimes(2);
  });
  it("does not expose error response bodies", async () => {
    const json = vi.fn(() => ({ secret: env.DATABASE_URL }));
    await expect(
      deployPreview(env, async () => ({ ok: false, status: 403, json })),
    ).rejects.toThrow("HTTP 403");
    expect(json).not.toHaveBeenCalled();
  });
});
