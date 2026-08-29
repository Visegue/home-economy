// WSL can inherit a Windows TEMP path that Linux-native Vitest workers cannot use.
if (process.platform !== "win32") {
  process.env.TMPDIR = "/tmp";
  process.env.TEMP = "/tmp";
  process.env.TMP = "/tmp";
}

await import(new URL("../node_modules/vitest/vitest.mjs", import.meta.url));
