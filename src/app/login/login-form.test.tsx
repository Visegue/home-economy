import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  signInEmail:
    vi.fn<
      (
        input: unknown,
      ) => Promise<{ data: unknown; error: null | { status: number } }>
    >(),
  signInSocial:
    vi.fn<
      (
        input: unknown,
      ) => Promise<{ data: unknown; error: null | { status: number } }>
    >(),
  signUpEmail:
    vi.fn<
      (
        input: unknown,
      ) => Promise<{ data: unknown; error: null | { status: number } }>
    >(),
}));

vi.mock("@/lib/auth/client", () => ({
  authClient: {
    signIn: {
      email: authMocks.signInEmail,
      social: authMocks.signInSocial,
    },
    signUp: { email: authMocks.signUpEmail },
  },
}));

import { LoginForm } from "./login-form";

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(cleanup);

describe("LoginForm", () => {
  it("creates a password account and explains verification", async () => {
    authMocks.signUpEmail.mockResolvedValue({ data: {}, error: null });
    const user = userEvent.setup();

    render(<LoginForm emailConfigured googleConfigured />);
    await user.click(screen.getByRole("tab", { name: "Skapa konto" }));
    await user.type(screen.getByLabelText("Namn"), "Ada Lovelace");
    await user.type(screen.getByLabelText("E-postadress"), "ada@example.test");
    await user.type(screen.getByLabelText("Lösenord"), "a-long-password");
    await user.type(screen.getByLabelText("Upprepa"), "a-long-password");
    await user.click(screen.getByRole("button", { name: "Skapa konto" }));

    expect(authMocks.signUpEmail).toHaveBeenCalledWith({
      name: "Ada Lovelace",
      email: "ada@example.test",
      password: "a-long-password",
      callbackURL: "/",
    });
    expect(screen.getByText(/Om adressen är ny/)).toBeInTheDocument();
  });

  it("does not submit mismatching passwords", async () => {
    const user = userEvent.setup();

    render(<LoginForm emailConfigured googleConfigured />);
    await user.click(screen.getByRole("tab", { name: "Skapa konto" }));
    await user.type(screen.getByLabelText("Namn"), "Ada Lovelace");
    await user.type(screen.getByLabelText("E-postadress"), "ada@example.test");
    await user.type(screen.getByLabelText("Lösenord"), "a-long-password");
    await user.type(screen.getByLabelText("Upprepa"), "another-password");
    await user.click(screen.getByRole("button", { name: "Skapa konto" }));

    expect(authMocks.signUpEmail).not.toHaveBeenCalled();
    expect(
      screen.getByText("Lösenorden stämmer inte överens."),
    ).toBeInTheDocument();
  });

  it("recovers when Google sign-in rejects", async () => {
    authMocks.signInSocial.mockRejectedValue(new Error("network timeout"));
    const user = userEvent.setup();

    render(<LoginForm emailConfigured googleConfigured />);
    await user.click(
      screen.getByRole("button", { name: "Fortsätt med Google" }),
    );

    expect(authMocks.signInSocial).toHaveBeenCalledWith({
      provider: "google",
      callbackURL: "http://localhost:3000/",
      errorCallbackURL: "http://localhost:3000/login?error=oauth",
    });
    expect(
      await screen.findByText(
        "Inloggningen kunde inte startas. Kontrollera anslutningen och försök igen.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Fortsätt med Google" }),
    ).toBeEnabled();
  });
});
