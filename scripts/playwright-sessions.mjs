import { createHash } from "node:crypto";

// Shared by test discovery, database seed and the browser fixture.
export function sessionIdentity(
  { testId, repeatEachIndex, retry },
  role = "primary",
) {
  const id = createHash("sha256")
    .update(JSON.stringify([testId, repeatEachIndex, retry, role]))
    .digest("hex");
  return { userId: id, token: id, otherToken: `${id}-other` };
}

export function sessionProfile(annotations) {
  const profile =
    annotations.find(({ type }) => type === "session-profile")?.description ??
    "ordinary";
  if (
    ![
      "ordinary",
      "credential",
      "google",
      "legacy",
      "expired",
      "missing",
    ].includes(profile)
  ) {
    throw new Error(`Unknown Playwright session profile: ${profile}`);
  }
  return profile;
}
