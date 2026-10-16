import { appendFileSync, readFileSync } from "node:fs";

try {
  const report = JSON.parse(
    readFileSync(process.argv[2] ?? "test-results/report.json", "utf8"),
  );
  const { stats, suites, errors } = report;
  if (
    !Array.isArray(suites) ||
    !Array.isArray(errors) ||
    !["expected", "flaky", "unexpected", "skipped"].every(
      (key) => Number.isInteger(stats?.[key]) && stats[key] >= 0,
    )
  ) {
    throw new Error("Invalid report");
  }

  const tests = [];
  function collect(suite) {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests) {
        tests.push({ title: spec.title, ...test });
      }
    }
    for (const child of suite.suites ?? []) collect(child);
  }
  for (const suite of suites) collect(suite);
  const retried = tests.filter((test) =>
    test.results.some((result) => result.retry > 0),
  );
  const retries = retried.reduce(
    (count, test) =>
      count + test.results.filter((result) => result.retry > 0).length,
    0,
  );
  const retain =
    retries > 0 || stats.flaky > 0 || stats.unexpected > 0 || errors.length > 0;
  const lines = [
    "## Playwright",
    "",
    `- Direkt godkända: **${stats.expected}**`,
    `- Godkända efter omförsök: **${stats.flaky}**`,
    `- Slutligt misslyckade: **${stats.unexpected}**`,
    `- Överhoppade: **${stats.skipped}**`,
    `- Omförsök totalt: **${retries}**`,
    `- Globala testfel: **${errors.length}**`,
  ];
  const affected = tests.filter(
    (test) => test.status === "unexpected" || retried.includes(test),
  );
  if (affected.length) lines.push("", "### Tester med fel eller omförsök", "");
  for (const test of affected) {
    // Test titles are source text; do not render them as HTML or new log lines.
    const label = `${test.projectName}: ${test.title}`
      .replace(/\s/g, " ")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
    lines.push(
      `- <code>${label}</code>: ${test.results.map((result) => result.status).join(" → ")}`,
    );
  }
  const summary = `${lines.join("\n")}\n`;
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `retain=${retain}\n`);
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  }
  console.log(summary);
} catch {
  console.error(
    "Playwright-rapport saknas, är ogiltig eller kunde inte sparas.",
  );
  process.exitCode = 1;
}
