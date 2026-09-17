type DeploymentEnvironment = {
  [key: string]: string | undefined;
  APP_DEPLOY_ENV?: string;
  APP_DEPLOY_SHA?: string;
  APP_DEPLOY_BRANCH?: string;
  VERCEL_ENV?: string;
  VERCEL_GIT_COMMIT_SHA?: string;
  VERCEL_GIT_COMMIT_REF?: string;
};

function commitSha(value: string | undefined) {
  return value && /^[0-9a-f]{40}$/i.test(value) ? value.toLowerCase() : null;
}

export function getDeploymentVersion(
  packageVersion: string,
  environment: DeploymentEnvironment,
) {
  const target = environment.APP_DEPLOY_ENV ?? environment.VERCEL_ENV;
  const commit =
    commitSha(environment.APP_DEPLOY_SHA) ??
    commitSha(environment.VERCEL_GIT_COMMIT_SHA);

  if (target === "production") {
    return { kind: "production" as const, version: packageVersion, commit };
  }
  if (target === "preview") {
    return {
      kind: "preview" as const,
      branch:
        environment.APP_DEPLOY_BRANCH ||
        environment.VERCEL_GIT_COMMIT_REF ||
        null,
      commit,
    };
  }
  return { kind: "local" as const };
}
