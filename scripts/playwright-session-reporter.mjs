import { sessionIdentity, sessionProfile } from "./playwright-sessions.mjs";

// --list uses the same selection, projects, repetitions and retry limits as the run.
export default class SessionReporter {
  onBegin(_config, suite) {
    const sessions = suite.allTests().flatMap((test) =>
      Array.from({ length: test.retries + 1 }, (_, retry) =>
        ["primary", "outsider"].map((role) => ({
          ...sessionIdentity(
            { testId: test.id, repeatEachIndex: test.repeatEachIndex, retry },
            role,
          ),
          profile:
            role === "primary" ? sessionProfile(test.annotations) : "ordinary",
        })),
      ).flat(),
    );
    process.stdout.write(JSON.stringify(sessions));
  }
}
