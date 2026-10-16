import { appendFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

try {
  const reportFile = process.argv[2] ?? "test-results/report.json";
  const report = JSON.parse(readFileSync(reportFile, "utf8"));
  const server = JSON.parse(
    readFileSync(join(dirname(reportFile), "server/report.json"), "utf8"),
  );
  if (
    !server.runId ||
    server.runId !== report.config?.metadata?.serverDiagnosticsRunId ||
    !["passed", "failed"].includes(server.serverStatus) ||
    !Array.isArray(server.findings) ||
    !/^[a-f0-9]{40}$/.test(server.sourceRevision)
  )
    throw new Error("Invalid server diagnostics");
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
    retries > 0 ||
    stats.flaky > 0 ||
    stats.unexpected > 0 ||
    errors.length > 0 ||
    server.serverStatus === "failed";
  const lines = [
    "## Playwright",
    "",
    `- Direkt godkända: **${stats.expected}**`,
    `- Godkända efter omförsök: **${stats.flaky}**`,
    `- Slutligt misslyckade: **${stats.unexpected}**`,
    `- Överhoppade: **${stats.skipped}**`,
    `- Omförsök totalt: **${retries}**`,
    `- Globala testfel: **${errors.length}**`,
    `- Serverutfall: **${server.serverStatus}**`,
    `- Oväntade serverfel: **${server.findings.length}**`,
    `- Insamlingsfel: **${server.captureFailed ? "ja" : "nej"}**`,
    `- Körning: <code>${server.runId}</code>`,
    `- Källversion: <code>${server.sourceRevision}</code>${server.sourceDirty ? " (lokala ändringar)" : ""}`,
    `- Workers, faktisk/gräns: **${server.actualWorkers ?? "okänt"}/${server.workers ?? "okänt"}**`,
    `- Serverlogg: <code>server/${server.logFile}</code>`,
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
    "Playwright-rapport saknas, är ogiltig eller kunde inte sparas. Även matchande serverdiagnostik krävs.",
  );
  process.exitCode = 1;
}
