// WSL can inherit a Windows TEMP path that Linux-native Playwright cannot use.
if (process.platform !== "win32") {
  process.env.TMPDIR = "/tmp";
  process.env.TEMP = "/tmp";
  process.env.TMP = "/tmp";
}

// The test server discovers exactly these cases before opening its temporary DB.
process.env.PLAYWRIGHT_TEST_ARGS = JSON.stringify(process.argv.slice(2));

await import("@playwright/test/cli");
