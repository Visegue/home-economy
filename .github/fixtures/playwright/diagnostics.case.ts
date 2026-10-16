import { expect, test } from "@playwright/test";

test("syntetiskt diagnostikfall", async () => {
  const testInfo = test.info();
  await test.step("kontrollerat utfall utan auth, nätverk eller appserver", () => {
    const scenario = process.env.DIAGNOSTICS_SCENARIO;
    expect(["passed", "flaky", "failed"]).toContain(scenario);
    expect(
      scenario === "passed" || (scenario === "flaky" && testInfo.retry > 0),
    ).toBe(true);
  });
});
