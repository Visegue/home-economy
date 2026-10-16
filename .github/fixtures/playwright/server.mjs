const scenario = process.env.SERVER_SCENARIO;
if (scenario === "promise")
  console.error("UnhandledPromiseRejection: synthetic rejection");
if (scenario === "unhandled")
  console.error("Unhandled Rejection: RuntimeError: Aborted()");
if (scenario === "structured")
  console.error(
    JSON.stringify({
      event: "budget.write.failed",
      reference: "synthetic-reference",
      errorType: "Error",
    }),
  );
if (scenario === "warning")
  console.warn("Warning: development mode; error boundary enabled");
if (scenario === "negative")
  console.log(
    "Validation rejected: INVALID_PASSWORD (synthetic negative flow)",
  );
if (scenario === "startup") {
  console.error("Error: synthetic startup failure");
  process.exit(1);
}
if (scenario === "split") {
  process.stderr.write("Unhandled Rejec");
  await new Promise((resolve) => setTimeout(resolve, 30));
  process.stderr.write("tion: synthetic failure without final newline");
}
if (scenario === "redaction") {
  process.stdout.write("Authorization: Bearer synthetic-credential\n");
  process.stdout.write("Cookie: session=synthetic-session\n");
  process.stdout.write(
    "database postgres://synthetic:password@localhost/private\n",
  );
  process.stdout.write("email person@example.test\n");
  process.stdout.write(
    "https://synthetic:password@example.test/path?token=synthetic-query\n",
  );
  process.stdout.write(
    "GET /api/auth/callback/google?state=synthetic-relative-state&error=access_denied 302\n",
  );
  process.stdout.write("environment-value synthetic-environment-secret\n");
}
console.log("SERVER_READY");
setInterval(() => {}, 1_000);
process.on("SIGTERM", () => {
  if (scenario === "shutdown")
    console.error("Unhandled Rejection: synthetic shutdown failure");
  process.exit(0);
});
