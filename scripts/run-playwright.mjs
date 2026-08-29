// WSL can inherit a Windows TEMP path that Linux-native Playwright cannot use.
if (process.platform !== "win32") {
  process.env.TMPDIR = "/tmp";
  process.env.TEMP = "/tmp";
  process.env.TMP = "/tmp";
}

await import("@playwright/test/cli");
