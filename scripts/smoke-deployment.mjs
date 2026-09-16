import { pathToFileURL } from "node:url";

export async function smokeDeployment(rawUrl, fetchPage = fetch) {
  let deployment;
  try {
    deployment = new URL(rawUrl);
  } catch {
    throw new Error("Invalid deployment URL");
  }
  if (
    deployment.protocol !== "https:" ||
    !/^[a-z0-9-]+\.vercel\.app$/i.test(deployment.hostname) ||
    deployment.pathname !== "/" ||
    deployment.search ||
    deployment.hash ||
    deployment.username ||
    deployment.password
  ) {
    throw new Error("Deployment URL must be an HTTPS Vercel hostname");
  }

  const loginUrl = new URL("/login", deployment);
  let response;
  try {
    response = await fetchPage(loginUrl, {
      redirect: "manual",
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new Error("Staged application did not respond");
  }
  if (response.status !== 200) {
    throw new Error(`Staged application returned HTTP ${response.status}`);
  }
  if (!response.headers.get("content-type")?.includes("text/html")) {
    throw new Error("Staged application did not return HTML");
  }
  const html = await response.text();
  if (!html.includes("Välkommen tillbaka")) {
    throw new Error("Staged application did not render the login page");
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    await smokeDeployment(process.env.DEPLOYMENT_URL);
    console.log("Staged application login page responded successfully.");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
