import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { stripVTControlCharacters } from "node:util";

const failedEvents = new Set([
  "budget.write.failed",
  "household.create.failed",
  "household.member.write.failed",
  "saving.save.failed",
  "saving.remove.failed",
]);

function fatalMessage(line) {
  if (
    /unhandled[\s_-]*(?:promise[\s_-]*)?(?:rejection|exception)|uncaught\s*(?:exception|error)|fatal\s*error|\bFATAL:|\bAborted\(|\bout of memory\b/i.test(
      line,
    )
  )
    return true;
  if (
    /^\s*(?:[⨯✖×]\s*)?(?:Error|TypeError|ReferenceError|SyntaxError|RangeError|RuntimeError):/i.test(
      line,
    )
  )
    return true;
  try {
    return failedEvents.has(JSON.parse(line).event);
  } catch {
    return false;
  }
}

function redact(line) {
  for (const [key, value] of Object.entries(process.env)) {
    if (
      /(?:SECRET|TOKEN|PASSWORD|API_KEY|DATABASE.*URL|CLIENT_ID|EMAIL)/i.test(
        key,
      ) &&
      value &&
      value.length >= 4
    ) {
      line = line.replaceAll(value, "[REDACTED]");
    }
  }
  return line
    .replace(/postgres(?:ql)?:\/\/[^\s"'<>]+/gi, "[REDACTED_DATABASE_URL]")
    .replace(/https?:\/\/[^\s"'<>]+/gi, (value) => {
      try {
        const url = new URL(value);
        url.username = "";
        url.password = "";
        if (url.search) url.search = "[REDACTED]";
        url.hash = "";
        return url.href;
      } catch {
        return "[REDACTED_URL]";
      }
    })
    .replace(/\?[^\s"'<>]+/g, "?[REDACTED]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_EMAIL]")
    .replace(
      /\b([\w.-]*(?:authorization|cookie|password|token|secret|api[-_]?key)[\w.-]*)(["']?\s*[:=]\s*)[^\r\n]+/gi,
      "$1$2[REDACTED]",
    );
}

// Playwright forwards piped webServer output before onBegin and through teardown.
// Keep this reporter last: browser reporters retain the original assertion result.
export default class ServerDiagnosticsReporter {
  constructor() {
    this.directory = resolve(
      dirname(
        process.env.PLAYWRIGHT_JSON_OUTPUT_FILE ?? "test-results/report.json",
      ),
      "server",
    );
    this.report = {
      runId: randomUUID(),
      startedAt: new Date().toISOString(),
      sourceRevision: null,
      sourceDirty: null,
      workers: null,
      actualWorkers: null,
      workerIndices: [],
      findings: [],
    };
    this.report.logFile = `${this.report.runId}.log`;
    this.pending = { stdout: "", stderr: "" };
    this.lineNumber = 0;
    this.bytes = 0;
    this.failure = false;
    try {
      this.report.sourceRevision = execFileSync("git", ["rev-parse", "HEAD"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }).trim();
      this.report.sourceDirty = Boolean(
        execFileSync("git", ["status", "--porcelain"], {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
        }).trim(),
      );
    } catch {
      this.failure = true;
    }
  }

  initialize() {
    if (this.initialized) return;
    mkdirSync(this.directory, { recursive: true });
    writeFileSync(join(this.directory, this.report.logFile), "");
    this.initialized = true;
  }

  onBegin(config) {
    config.metadata.serverDiagnosticsRunId = this.report.runId;
    this.report.workers = config.workers;
    this.report.actualWorkers = config.metadata.actualWorkers ?? null;
    try {
      this.initialize();
    } catch {
      this.failure = true;
    }
  }

  onTestBegin(_test, result) {
    if (!this.report.workerIndices.includes(result.workerIndex))
      this.report.workerIndices.push(result.workerIndex);
  }

  onStdOut(chunk, test) {
    this.capture("stdout", chunk, test);
  }
  onStdErr(chunk, test) {
    this.capture("stderr", chunk, test);
  }

  capture(stream, chunk, test) {
    const text = stripVTControlCharacters(String(chunk));
    if (test || !/^\[WebServer\]/m.test(text)) return;
    try {
      this.initialize();
      this.pending[stream] += text.replace(/^\[WebServer\] ?/gm, "");
      const lines = this.pending[stream].split(/\r?\n/);
      this.pending[stream] = lines.pop();
      for (const line of lines) this.record(stream, line);
      if (this.pending[stream].length > 65_536) {
        this.record(stream, this.pending[stream].slice(0, 65_536));
        this.pending[stream] = "";
        this.failure = true;
      }
    } catch {
      this.failure = true;
    }
  }

  record(stream, line) {
    this.lineNumber++;
    if (fatalMessage(line))
      this.report.findings.push({ line: this.lineNumber, stream });
    const safeLine = `[${stream}] ${redact(line)}\n`;
    this.bytes += Buffer.byteLength(safeLine);
    if (this.bytes > 10 * 1024 * 1024) {
      this.failure = true;
      return;
    }
    appendFileSync(join(this.directory, this.report.logFile), safeLine);
  }

  onEnd(result) {
    try {
      this.initialize();
      for (const [stream, line] of Object.entries(this.pending))
        if (line) this.record(stream, line);
      this.report.browserStatus = result.status;
      this.report.serverStatus =
        this.failure || this.report.findings.length ? "failed" : "passed";
      this.report.captureFailed = this.failure;
      this.report.finishedAt = new Date().toISOString();
      writeFileSync(
        join(this.directory, "report.json"),
        `${JSON.stringify(this.report, null, 2)}\n`,
      );
      console.log(
        `Serverdiagnostik: ${this.report.serverStatus}; browser: ${result.status}; workers: ${this.report.actualWorkers ?? "okänt"}/${this.report.workers ?? "okänt"}; ${join(this.directory, "report.json")}`,
      );
    } catch {
      this.failure = true;
      console.error("Serverdiagnostiken kunde inte sparas.");
    }
    if (this.failure || this.report.findings.length)
      return { status: "failed" };
  }
}
