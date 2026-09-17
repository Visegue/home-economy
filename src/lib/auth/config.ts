const developmentSecret = "development-only-secret-change-before-deployment";

export interface OAuthProxyEnvironment {
  productionUrl: string;
  secret: string;
}

export interface AuthEnvironment {
  baseUrl: string;
  googleClientId: string;
  googleClientSecret: string;
  oauthProxy?: OAuthProxyEnvironment;
  secret: string;
  trustedOrigins: string[];
}

function asHttpsUrl(hostOrUrl: string | undefined): string | undefined {
  if (!hostOrUrl) {
    return undefined;
  }

  return hostOrUrl.startsWith("http://") || hostOrUrl.startsWith("https://")
    ? hostOrUrl
    : `https://${hostOrUrl}`;
}

function getOAuthProxyProductionUrl(): string | undefined {
  return (
    asHttpsUrl(process.env.OAUTH_PROXY_PRODUCTION_URL) ||
    asHttpsUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL)
  );
}

function getOAuthProxyEnvironment(): OAuthProxyEnvironment | undefined {
  const productionUrl = getOAuthProxyProductionUrl();
  const secret = process.env.OAUTH_PROXY_SECRET;

  if (!process.env.VERCEL_URL || !productionUrl || !secret) {
    return undefined;
  }

  return { productionUrl, secret };
}

function getTrustedOrigins(): string[] {
  return (process.env.BETTER_AUTH_TRUSTED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function getBaseUrl(): string {
  const vercelUrl = asHttpsUrl(process.env.VERCEL_URL);
  const productionUrl = asHttpsUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL);

  if (process.env.VERCEL_ENV === "preview" && vercelUrl) {
    return vercelUrl;
  }

  return (
    asHttpsUrl(process.env.BETTER_AUTH_URL) ||
    (process.env.VERCEL_ENV === "production" ? productionUrl : undefined) ||
    vercelUrl ||
    "http://localhost:3000"
  );
}

function hasAuthSecret(): boolean {
  return Boolean(process.env.BETTER_AUTH_SECRET?.trim());
}

function getAuthSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  const hosted =
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL === "1" ||
    ["preview", "production"].includes(process.env.VERCEL_ENV ?? "");
  if (
    hosted &&
    (!secret || secret.trim().length < 32 || secret === developmentSecret)
  ) {
    throw new Error(
      "BETTER_AUTH_SECRET måste vara en separat hemlighet med minst 32 tecken i drift.",
    );
  }
  return secret?.trim() ? secret : developmentSecret;
}

export function isGoogleAuthConfigured(): boolean {
  const credentialsConfigured = Boolean(
    hasAuthSecret() &&
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET,
  );

  if (process.env.VERCEL_ENV === "preview") {
    return (
      credentialsConfigured &&
      Boolean(getOAuthProxyEnvironment()) &&
      getTrustedOrigins().length > 0
    );
  }

  return credentialsConfigured;
}

export function isEmailAuthConfigured(): boolean {
  return Boolean(
    hasAuthSecret() &&
    process.env.RESEND_API_KEY &&
    process.env.AUTH_EMAIL_FROM,
  );
}

export function getAuthEnvironment(): AuthEnvironment {
  return {
    baseUrl: getBaseUrl(),
    googleClientId:
      process.env.GOOGLE_CLIENT_ID || "google-client-not-configured",
    googleClientSecret:
      process.env.GOOGLE_CLIENT_SECRET || "google-secret-not-configured",
    oauthProxy: getOAuthProxyEnvironment(),
    secret: getAuthSecret(),
    trustedOrigins: getTrustedOrigins(),
  };
}
