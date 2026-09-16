import { appendFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export async function deployPreview(
  env,
  fetchApi = fetch,
  pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
) {
  for (const key of [
    "VERCEL_TOKEN",
    "VERCEL_ORG_ID",
    "VERCEL_PROJECT_ID",
    "DATABASE_URL",
    "PR_BRANCH",
    "GITHUB_SHA",
    "GITHUB_REPOSITORY_ID",
  ]) {
    if (!env[key]) throw new Error(`Missing ${key}`);
  }
  const project = encodeURIComponent(env.VERCEL_PROJECT_ID);
  const team = encodeURIComponent(env.VERCEL_ORG_ID);
  async function request(path, body) {
    let response;
    try {
      response = await fetchApi(
        `https://api.vercel.com${path}${path.includes("?") ? "&" : "?"}teamId=${team}`,
        {
          method: body ? "POST" : "GET",
          headers: {
            Authorization: `Bearer ${env.VERCEL_TOKEN}`,
            "Content-Type": "application/json",
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
          redirect: "error",
          signal: AbortSignal.timeout(30_000),
        },
      );
    } catch {
      throw new Error("Vercel API network request failed");
    }
    // Never print API response bodies: project responses can contain secrets.
    if (!response.ok)
      throw new Error(
        `Vercel API HTTP ${response.status} (${path.split("?")[0]})`,
      );
    try {
      return await response.json();
    } catch {
      throw new Error("Invalid Vercel API response");
    }
  }
  const settings = await request(`/v9/projects/${project}`);
  if (
    settings.id !== env.VERCEL_PROJECT_ID ||
    String(settings.link?.repoId) !== env.GITHUB_REPOSITORY_ID
  ) {
    throw new Error("Vercel project does not match the GitHub repository");
  }
  const variables = await request(
    `/v10/projects/${project}/env?upsert=true`,
    [
      { key: "DATABASE_URL", value: env.DATABASE_URL },
      { key: "DATABASE_PROVIDER", value: "postgres" },
    ].map((variable) => ({
      ...variable,
      type: "encrypted",
      target: ["preview"],
      gitBranch: env.PR_BRANCH,
    })),
  );
  if (!Array.isArray(variables.failed) || variables.failed.length > 0) {
    throw new Error("Vercel could not save preview environment variables");
  }
  // Omit target: the API defaults to preview. Pin the tested PR merge SHA.
  const created = await request("/v13/deployments", {
    name: settings.name,
    project: env.VERCEL_PROJECT_ID,
    gitSource: {
      type: "github",
      repoId: env.GITHUB_REPOSITORY_ID,
      ref: env.PR_BRANCH,
      sha: env.GITHUB_SHA,
    },
  });
  if (!created.id) throw new Error("Vercel did not return a deployment ID");
  for (let attempt = 0; attempt < 100; attempt++) {
    const deployment = await request(
      `/v13/deployments/${encodeURIComponent(created.id)}`,
    );
    if (
      deployment.projectId !== env.VERCEL_PROJECT_ID ||
      deployment.target === "production" ||
      deployment.gitSource?.sha !== env.GITHUB_SHA
    ) {
      throw new Error(
        "Deployment project, target or commit does not match the preview request",
      );
    }
    if (["ERROR", "CANCELED"].includes(deployment.readyState))
      throw new Error(
        `Vercel deployment ${deployment.readyState}; inspect build logs in Vercel`,
      );
    if (deployment.readyState === "READY") {
      if (!/^[a-zA-Z0-9.-]+\.vercel\.app$/.test(deployment.url))
        throw new Error("Invalid preview URL");
      return `https://${deployment.url}`;
    }
    await pause(10_000);
  }
  throw new Error("Timed out waiting for Vercel preview");
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const url = await deployPreview(process.env);
    await appendFile(process.env.GITHUB_OUTPUT, `url=${url}\n`);
    console.log(`Preview ready: ${url}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
