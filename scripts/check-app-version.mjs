import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// SemVer 2.0.0 grammar. Parse suffixes separately to keep validation linear
// even when package.json comes from an untrusted pull request.
const corePattern = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)/;
const identifierPattern = /^[0-9A-Za-z-]+$/;

function identifiers(text, prerelease) {
  const parts = text.split(".");
  if (
    parts.some(
      (part) =>
        !identifierPattern.test(part) ||
        (prerelease &&
          /^[0-9]+$/.test(part) &&
          !/^(0|[1-9][0-9]*)$/.test(part)),
    )
  ) {
    return null;
  }
  return parts;
}

export function parseVersion(version) {
  if (typeof version !== "string") return null;
  const match = corePattern.exec(version);
  if (!match) return null;
  let suffix = version.slice(match[0].length);
  let prerelease = null;
  let build = null;

  if (suffix.startsWith("-")) {
    const plusIndex = suffix.indexOf("+");
    prerelease = identifiers(
      suffix.slice(1, plusIndex === -1 ? undefined : plusIndex),
      true,
    );
    if (!prerelease) return null;
    suffix = plusIndex === -1 ? "" : suffix.slice(plusIndex);
  }
  if (suffix.startsWith("+")) {
    build = identifiers(suffix.slice(1), false);
    if (!build) return null;
    suffix = "";
  }
  if (suffix !== "") return null;

  return {
    major: BigInt(match[1]),
    minor: BigInt(match[2]),
    patch: BigInt(match[3]),
    prerelease,
    build,
  };
}

export function isSemVerVersion(version) {
  return parseVersion(version) !== null;
}

function compareIdentifier(left, right) {
  const leftNumeric = /^[0-9]+$/.test(left);
  const rightNumeric = /^[0-9]+$/.test(right);
  if (leftNumeric && rightNumeric) {
    const leftNumber = BigInt(left);
    const rightNumber = BigInt(right);
    return leftNumber < rightNumber ? -1 : Number(leftNumber > rightNumber);
  }
  if (leftNumeric !== rightNumeric) return leftNumeric ? -1 : 1;
  return left < right ? -1 : Number(left > right);
}

export function compareVersions(left, right) {
  const first = parseVersion(left);
  const second = parseVersion(right);
  if (!first || !second)
    throw new TypeError("Expected two valid SemVer versions.");

  for (const part of ["major", "minor", "patch"]) {
    if (first[part] < second[part]) return -1;
    if (first[part] > second[part]) return 1;
  }

  // Build metadata has no effect on precedence.
  if (!first.prerelease && !second.prerelease) return 0;
  if (!first.prerelease) return 1;
  if (!second.prerelease) return -1;

  for (
    let index = 0;
    index < Math.min(first.prerelease.length, second.prerelease.length);
    index++
  ) {
    const result = compareIdentifier(
      first.prerelease[index],
      second.prerelease[index],
    );
    if (result !== 0) return result;
  }
  return first.prerelease.length < second.prerelease.length
    ? -1
    : Number(first.prerelease.length > second.prerelease.length);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const packageJson = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  );
  if (!isSemVerVersion(packageJson.version)) {
    console.error("package.json must contain a valid SemVer 2.0.0 version.");
    process.exitCode = 1;
  }
}
