import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const directory = fileURLToPath(
  new URL("../packages/ui/src/", import.meta.url),
);
const packageRoot = resolve(directory, "..");
const manifest = JSON.parse(
  readFileSync(resolve(packageRoot, "package.json"), "utf8"),
);
const allowed = new Set([
  ...Object.keys(manifest.dependencies ?? {}),
  ...Object.keys(manifest.peerDependencies ?? {}),
]);
const problems = [];
if (!manifest.private)
  problems.push("UI must remain a private workspace package.");
function inspect(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      inspect(path);
      continue;
    }
    if (!/\.[jt]sx?$/.test(entry.name) || /\.(?:test|spec)\./.test(entry.name))
      continue;
    const source = readFileSync(path, "utf8");
    for (const match of source.matchAll(
      /(?:from\s*|import\s*\(\s*|import\s*)["']([^"']+)["']/g,
    )) {
      const dependency = match[1];
      const name = dependency.startsWith("@")
        ? dependency.split("/").slice(0, 2).join("/")
        : dependency.split("/")[0];
      const outside = dependency.startsWith(".")
        ? relative(packageRoot, resolve(dirname(path), dependency)).startsWith(
            "..",
          )
        : !allowed.has(name);
      if (outside)
        problems.push(
          `${relative(packageRoot, path)} imports outside the UI boundary: ${dependency}`,
        );
    }
  }
}
inspect(directory);
if (problems.length) {
  console.error(problems.join("\n"));
  process.exitCode = 1;
} else console.log("Private UI boundary verified.");
