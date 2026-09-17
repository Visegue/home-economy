import { describe, expect, it } from "vitest";
import { getDeploymentVersion } from "./deployment-version";

const sha = "a".repeat(40);

describe("deployment version", () => {
  it("shows the deployed SemVer and commit in production", () => {
    expect(
      getDeploymentVersion("0.3.0", {
        APP_DEPLOY_ENV: "production",
        APP_DEPLOY_SHA: sha,
      }),
    ).toEqual({ kind: "production", version: "0.3.0", commit: sha });
  });

  it("identifies a preview by its deployed commit, not its planned release", () => {
    expect(
      getDeploymentVersion("0.3.0", {
        APP_DEPLOY_ENV: "preview",
        APP_DEPLOY_SHA: sha,
        APP_DEPLOY_BRANCH: "codex/feature",
      }),
    ).toEqual({ kind: "preview", branch: "codex/feature", commit: sha });
  });

  it("uses Vercel deployment metadata when no CI override is present", () => {
    expect(
      getDeploymentVersion("0.3.0", {
        VERCEL_ENV: "preview",
        VERCEL_GIT_COMMIT_SHA: sha,
        VERCEL_GIT_COMMIT_REF: "feature",
      }),
    ).toEqual({ kind: "preview", branch: "feature", commit: sha });
  });

  it("does not mistake local development or an invalid SHA for a release", () => {
    expect(getDeploymentVersion("0.3.0", {})).toEqual({ kind: "local" });
    expect(
      getDeploymentVersion("0.3.0", {
        APP_DEPLOY_ENV: "preview",
        APP_DEPLOY_SHA: "not-a-commit",
      }),
    ).toEqual({ kind: "preview", branch: null, commit: null });
  });
});
