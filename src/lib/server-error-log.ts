import "server-only";

const safeDatabaseFields = [
  "code",
  "severity",
  "schema",
  "table",
  "column",
  "constraint",
  "routine",
] as const;

type SafeDatabaseField = (typeof safeDatabaseFields)[number];

interface SafeErrorMetadata {
  databaseCode?: string;
  databaseColumn?: string;
  databaseConstraint?: string;
  databaseRoutine?: string;
  databaseSchema?: string;
  databaseSeverity?: string;
  databaseTable?: string;
  errorType: string;
  stage?: string;
}

interface ServerErrorLog {
  error: unknown;
  event: string;
  reference: string;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

function readShortString(
  records: Record<string, unknown>[],
  key: string,
  maximumLength = 160,
) {
  for (const record of records) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) {
      return value.slice(0, maximumLength);
    }
  }
  return undefined;
}

function getErrorChain(error: unknown) {
  const records: Record<string, unknown>[] = [];
  const visited = new Set<unknown>();
  let current: unknown = error;

  while (records.length < 5 && !visited.has(current)) {
    visited.add(current);
    const record = asRecord(current);
    if (!record) break;
    records.push(record);
    current = record.cause;
  }

  return records;
}

export function getSafeErrorMetadata(error: unknown): SafeErrorMetadata {
  const records = getErrorChain(error);
  const metadata: SafeErrorMetadata = {
    errorType:
      readShortString(records, "name") ??
      (error === null ? "null" : typeof error),
  };
  const stage = readShortString(records, "stage", 80);
  if (stage) metadata.stage = stage;

  for (const field of safeDatabaseFields) {
    const value = readShortString(records, field);
    if (!value) continue;
    const key =
      `database${field[0].toUpperCase()}${field.slice(1)}` as `database${Capitalize<SafeDatabaseField>}`;
    metadata[key] = value;
  }

  return metadata;
}

export function logServerError({ error, event, reference }: ServerErrorLog) {
  console.error(
    JSON.stringify({
      event,
      reference,
      ...getSafeErrorMetadata(error),
    }),
  );
}
