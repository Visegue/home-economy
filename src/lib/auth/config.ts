const developmentSecret = "development-only-secret-change-before-deployment";

export interface AuthEnvironment {
  baseUrl: string;
  googleClientId: string;
  googleClientSecret: string;
  secret: string;
}

export function getAllowedEmails(): ReadonlySet<string> {
  return new Set(
    (process.env.AUTH_ALLOWED_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAuthConfigured(): boolean {
  return Boolean(
    process.env.BETTER_AUTH_SECRET &&
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    getAllowedEmails().size,
  );
}

export function getAuthEnvironment(): AuthEnvironment {
  return {
    baseUrl: process.env.BETTER_AUTH_URL || "http://localhost:3000",
    googleClientId:
      process.env.GOOGLE_CLIENT_ID || "google-client-not-configured",
    googleClientSecret:
      process.env.GOOGLE_CLIENT_SECRET || "google-secret-not-configured",
    secret: process.env.BETTER_AUTH_SECRET || developmentSecret,
  };
}
