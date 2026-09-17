import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { compareVersions, isSemVerVersion } from "./check-app-version.mjs";

const releasePaths =
  /^(?:src\/|public\/|drizzle\/|scripts\/|package\.json$|pnpm-(?:lock|workspace)\.yaml$|(?:next|drizzle|postcss|tailwind)\.config\.[cm]?[jt]s$|vercel\.json$|(?:proxy|middleware|instrumentation(?:-client)?)\.[cm]?[jt]sx?$|tsconfig(?:\.[^/]+)?\.json$|\.(?:npmrc|node-version|nvmrc)$)/;
const testFile = /(?:^|\/)[^/]+\.(?:test|spec)\.[cm]?[jt]sx?$/;

export function needsVersionBump(path) {
  return releasePaths.test(path) && !testFile.test(path);
}

export function evaluateVersionChange(baseVersion, headVersion, changedFiles) {
  if (!isSemVerVersion(headVersion) || !isSemVerVersion(baseVersion)) {
    return {
      blocked: true,
      reason: "package.json måste innehålla en giltig SemVer 2.0.0-version.",
    };
  }
  if (!changedFiles.some(needsVersionBump)) {
    return {
      blocked: false,
      reason: "Endast filer utan releasepåverkan ändrades.",
    };
  }
  if (compareVersions(headVersion, baseVersion) <= 0) {
    return {
      blocked: true,
      reason:
        "App- eller releaseändringar kräver att version i package.json är högre än på main. Byggmetadata (+...) höjer inte versionsordningen.",
    };
  }
  return { blocked: false, reason: "Versionshöjningen är giltig." };
}

function githubApi(path, ...flags) {
  return execFileSync("gh", ["api", path, ...flags], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
}

function packageVersion(repository, sha) {
  const response = JSON.parse(
    githubApi(`repos/${repository}/contents/package.json?ref=${sha}`),
  );
  const source = Buffer.from(response.content, "base64").toString("utf8");
  return JSON.parse(source).version;
}

function pullRequestFiles(repository, number) {
  const pages = JSON.parse(
    githubApi(
      `repos/${repository}/pulls/${number}/files?per_page=100`,
      "--paginate",
      "--slurp",
    ),
  );
  return pages
    .flat()
    .flatMap((file) =>
      file.previous_filename
        ? [file.filename, file.previous_filename]
        : [file.filename],
    );
}

function run() {
  const {
    BASE_SHA: baseSha,
    CHANGED_FILE_COUNT: changedFileCount,
    GITHUB_OUTPUT: githubOutput,
    HEAD_REPOSITORY: headRepository,
    HEAD_SHA: headSha,
    PR_NUMBER: prNumber,
    REPOSITORY: repository,
  } = process.env;
  if (!repository || !headRepository || !prNumber || !baseSha || !headSha) {
    throw new Error("Missing pull request context for version check.");
  }

  const result =
    Number(changedFileCount) > 3000
      ? {
          blocked: true,
          reason:
            "PR:en har fler än 3000 ändrade filer; GitHub kan inte lista alla filer för versionskontrollen.",
        }
      : evaluateVersionChange(
          packageVersion(repository, baseSha),
          packageVersion(headRepository, headSha),
          pullRequestFiles(repository, prNumber),
        );

  if (process.argv.includes("--report")) {
    if (!githubOutput)
      throw new Error("GITHUB_OUTPUT is required in report mode.");
    appendFileSync(githubOutput, `blocked=${result.blocked}\n`);
    console.log(result.reason);
  } else if (result.blocked) {
    console.error(`::error::Versionsspärr: ${result.reason}`);
    process.exitCode = 1;
  } else {
    console.log(result.reason);
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    run();
  } catch (error) {
    console.error(
      `::error::Versionskontrollen kunde inte slutföras: ${error.message}`,
    );
    process.exitCode = 1;
  }
}
