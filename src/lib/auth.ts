import { betterAuth } from "better-auth/minimal";
import { oAuthProxy } from "better-auth/plugins";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { after } from "next/server";

import { db } from "@/db";
import { schema } from "@/db/schema";
import { getAuthEnvironment, isEmailAuthConfigured } from "@/lib/auth/config";
import { sendAuthEmail } from "@/lib/auth/email";

const environment = getAuthEnvironment();
const emailAuthConfigured = isEmailAuthConfigured();

export const auth = betterAuth({
  appName: "Hemekonomi",
  baseURL: environment.baseUrl,
  secret: environment.secret,
  trustedOrigins: environment.trustedOrigins,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  advanced: {
    backgroundTasks: {
      handler: (promise) => after(() => promise),
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url, token }) =>
      sendAuthEmail({
        to: user.email,
        subject: "Verifiera din e-postadress",
        intro:
          "Bekräfta din e-postadress för att logga in i Hemekonomi med lösenord.",
        actionLabel: "Verifiera e-postadressen",
        actionUrl: url,
        idempotencyKey: `verify-email-${token}`,
      }),
  },
  emailAndPassword: {
    enabled: emailAuthConfigured,
    requireEmailVerification: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url, token }) =>
      sendAuthEmail({
        to: user.email,
        subject: "Välj ett nytt lösenord",
        intro: "Välj ett nytt lösenord för Hemekonomi via länken.",
        actionLabel: "Välj nytt lösenord",
        actionUrl: url,
        idempotencyKey: `reset-password-${token}`,
      }),
  },
  account: {
    encryptOAuthTokens: true,
    storeStateStrategy: "database",
    accountLinking: {
      enabled: true,
      disableImplicitLinking: false,
      requireLocalEmailVerified: true,
    },
  },
  socialProviders: {
    google: {
      clientId: environment.googleClientId,
      clientSecret: environment.googleClientSecret,
      prompt: "select_account",
    },
  },
  plugins: environment.oauthProxy
    ? [
        oAuthProxy({
          productionURL: environment.oauthProxy.productionUrl,
          secret: environment.oauthProxy.secret,
        }),
      ]
    : [],
});
