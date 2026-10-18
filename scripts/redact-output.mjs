export function redact(line) {
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
