import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

type AuthRequest = (
  input: unknown,
) => Promise<{ error: { status: number } | null }>;
const requests = vi.hoisted(() => ({
  signIn: vi.fn<AuthRequest>(),
  signUp: vi.fn<AuthRequest>(),
  requestReset: vi.fn<AuthRequest>(),
  reset: vi.fn<AuthRequest>(),
}));
vi.mock("@/lib/auth/client", () => ({
  authClient: {
    signIn: { email: requests.signIn },
    signUp: { email: requests.signUp },
    requestPasswordReset: requests.requestReset,
    resetPassword: requests.reset,
  },
}));
import { LoginForm } from "@/app/login/login-form";
import { ForgotPasswordForm } from "@/app/forgot-password/forgot-password-form";
import { ResetPasswordForm } from "@/app/reset-password/reset-password-form";

beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

it("reenables email login after a network failure and allows retry", async () => {
  requests.signIn
    .mockRejectedValueOnce(new TypeError("offline"))
    .mockResolvedValueOnce({ error: { status: 401 } });
  const user = userEvent.setup();
  render(<LoginForm emailConfigured googleConfigured={false} />);
  await user.type(screen.getByLabelText("E-postadress"), "test@example.test");
  await user.type(screen.getByLabelText("Lösenord"), "synthetic-password");
  const button = screen.getByRole("button", { name: "Logga in" });
  await user.click(button);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Kontrollera anslutningen",
  );
  expect(button).toBeEnabled();
  expect(screen.getByLabelText("E-postadress")).toHaveValue(
    "test@example.test",
  );
  await user.click(button);
  expect(requests.signIn).toHaveBeenCalledTimes(2);
});

it("reenables registration after a network failure", async () => {
  requests.signUp.mockRejectedValueOnce(new TypeError("offline"));
  const user = userEvent.setup();
  render(<LoginForm emailConfigured googleConfigured={false} />);
  await user.click(screen.getByRole("tab", { name: "Skapa konto" }));
  await user.type(screen.getByLabelText("Namn"), "Testperson");
  await user.type(screen.getByLabelText("E-postadress"), "test@example.test");
  await user.type(screen.getByLabelText("Lösenord"), "synthetic-password");
  await user.type(screen.getByLabelText("Upprepa"), "synthetic-password");
  const button = screen.getByRole("button", { name: "Skapa konto" });
  await user.click(button);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Kontrollera anslutningen",
  );
  expect(button).toBeEnabled();
});

it.each([429, 500, "offline"] as const)(
  "does not claim a reset email was sent after %s",
  async (failure) => {
    if (failure === "offline")
      requests.requestReset.mockRejectedValueOnce(new TypeError("offline"));
    else
      requests.requestReset.mockResolvedValueOnce({
        error: { status: failure },
      });
    requests.requestReset.mockResolvedValueOnce({ error: null });
    const user = userEvent.setup();
    render(<ForgotPasswordForm configured />);
    await user.type(screen.getByLabelText("E-postadress"), "test@example.test");
    const button = screen.getByRole("button", {
      name: "Skicka återställningslänk",
    });
    await user.click(button);
    expect(await screen.findByRole("alert")).toBeVisible();
    expect(
      screen.queryByText(/Om adressen finns hos oss/),
    ).not.toBeInTheDocument();
    expect(button).toBeEnabled();
    await user.click(button);
    expect(await screen.findByText(/Om adressen finns hos oss/)).toBeVisible();
  },
);

it("lets the user retry a password change after a network failure", async () => {
  requests.reset
    .mockRejectedValueOnce(new TypeError("offline"))
    .mockResolvedValueOnce({ error: null });
  const user = userEvent.setup();
  render(<ResetPasswordForm token="synthetic-token" />);
  await user.type(screen.getByLabelText("Nytt lösenord"), "synthetic-password");
  await user.type(
    screen.getByLabelText("Upprepa lösenordet"),
    "synthetic-password",
  );
  const button = screen.getByRole("button", { name: "Spara nytt lösenord" });
  await user.click(button);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Kontrollera anslutningen",
  );
  expect(button).toBeEnabled();
  await user.click(button);
  expect(await screen.findByText(/Lösenordet är uppdaterat/)).toBeVisible();
});
