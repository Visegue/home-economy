import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

export function preparePgliteDataDir(dataDir: string): string {
  if (dataDir.includes("://")) return dataDir;

  mkdirSync(dirname(resolve(dataDir)), { recursive: true });
  return dataDir;
}
