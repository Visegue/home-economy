// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getSafeErrorMetadata, logServerError } from "./server-error-log";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("server error logging", () => {
  it("keeps diagnostic database fields and removes sensitive error details", () => {
    const databaseError = Object.assign(
      new Error("parameters: private-user-id and household name"),
      {
        code: "42501",
        constraint: "household_members_insert_by_owner",
        detail: "Secret database detail",
        query: "insert into household_members values ($1, $2)",
        severity: "ERROR",
        table: "household_members",
      },
    );
    const error = Object.assign(
      new Error("Failed query", { cause: databaseError }),
      { stage: "insert_owner_membership" },
    );

    expect(getSafeErrorMetadata(error)).toEqual({
      databaseCode: "42501",
      databaseConstraint: "household_members_insert_by_owner",
      databaseSeverity: "ERROR",
      databaseTable: "household_members",
      errorType: "Error",
      stage: "insert_owner_membership",
    });
  });

  it("writes one searchable JSON event without messages or stack traces", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const error = Object.assign(new Error("do-not-log-this"), {
      code: "23505",
      constraint: "households_owner_user_id_uidx",
    });

    logServerError({
      error,
      event: "household.create.failed",
      reference: "test-reference",
    });

    expect(consoleError).toHaveBeenCalledOnce();
    const output = String(consoleError.mock.calls[0]?.[0]);
    expect(JSON.parse(output)).toEqual({
      event: "household.create.failed",
      reference: "test-reference",
      errorType: "Error",
      databaseCode: "23505",
      databaseConstraint: "households_owner_user_id_uidx",
    });
    expect(output).not.toContain("do-not-log-this");
    expect(output).not.toContain("stack");
  });
});
