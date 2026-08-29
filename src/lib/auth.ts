import { betterAuth } from "better-auth/minimal";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";

import { db } from "@/db";
import { schema } from "@/db/schema";
import { getAllowedEmails, getAuthEnvironment } from "@/lib/auth/config";

const environment = getAuthEnvironment();

export const auth = betterAuth({
  appName: "Hemekonomi",
  baseURL: environment.baseUrl,
  secret: environment.secret,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  account: {
    identityStrategy: "provider-id",
    encryptOAuthTokens: true,
    storeStateStrategy: "database",
    accountLinking: {
      disableImplicitLinking: true,
    },
  },
  socialProviders: {
    google: {
      clientId: environment.googleClientId,
      clientSecret: environment.googleClientSecret,
      prompt: "select_account",
    },
  },
  user: {
    validateUserInfo: ({ source, user }) => {
      if (source.oauth?.providerId !== "google") return;

      const allowedEmails = getAllowedEmails();
      if (!user.email || !allowedEmails.has(user.email.toLowerCase())) {
        return {
          error: "email_not_allowed",
          errorDescription:
            "Det här Google-kontot har inte åtkomst till Hemekonomi.",
        };
      }
    },
  },
});
