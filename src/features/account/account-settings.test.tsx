import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SaveNoticeProvider } from "@/components/save-notice";

type AuthRequest = (
  input: unknown,
) => Promise<{ error: { status: number; code?: string } | null }>;

const requests = vi.hoisted(() => ({
  change: vi.fn<AuthRequest>(),
  reset: vi.fn<AuthRequest>(),
  link: vi.fn<AuthRequest>(),
}));
vi.mock("@/lib/auth/client", () => ({
  authClient: {
    changePassword: requests.change,
    requestPasswordReset: requests.reset,
    linkSocial: requests.link,
  },
}));
import { AccountSettings } from "./account-settings";

const defaults = {
  email: "account@example.test",
  hasPassword: false,
  googleLinked: true,
  emailConfigured: true,
  googleConfigured: true,
};
function show(
  props: Partial<React.ComponentProps<typeof AccountSettings>> = {},
) {
  return render(
    <SaveNoticeProvider>
      <AccountSettings {...defaults} {...props} />
    </SaveNoticeProvider>,
  );
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("offers an email link for a Google account and handles a failed request before retry", async () => {
  requests.reset
    .mockRejectedValueOnce(new TypeError("offline"))
    .mockResolvedValueOnce({ error: null });
  const user = userEvent.setup();
  show();
  expect(
    screen.queryByRole("button", { name: "Ändra lösenord" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Koppla Google" }),
  ).not.toBeInTheDocument();
  const button = screen.getByRole("button", { name: "Lägg till lösenord" });
  await user.click(button);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Kontrollera anslutningen",
  );
  expect(screen.queryByText(/Kontrollera din inkorg/)).not.toBeInTheDocument();
  expect(button).toBeEnabled();
  await user.click(button);
  expect(requests.reset).toHaveBeenLastCalledWith({
    email: defaults.email,
    redirectTo: "/reset-password",
  });
  expect(await screen.findByText(/Kontrollera din inkorg/)).toBeVisible();
  expect(screen.getByRole("button", { name: "Länk begärd" })).toBeDisabled();
});

it("keeps unavailable account methods disabled", () => {
  show({
    googleLinked: false,
    emailConfigured: false,
    googleConfigured: false,
  });
  expect(
    screen.getByRole("button", { name: "Lägg till lösenord" }),
  ).toBeDisabled();
  expect(screen.getByRole("button", { name: "Koppla Google" })).toBeDisabled();
});

it("requires matching passwords and only closes after a successful change", async () => {
  requests.change
    .mockResolvedValueOnce({ error: { status: 400, code: "INVALID_PASSWORD" } })
    .mockResolvedValueOnce({ error: null });
  const user = userEvent.setup();
  show({ hasPassword: true });
  await user.click(screen.getByRole("button", { name: "Ändra lösenord" }));
  const dialog = within(screen.getByRole("dialog"));
  await user.type(
    dialog.getByLabelText("Nuvarande lösenord"),
    "old-synthetic-password",
  );
  await user.type(
    dialog.getByLabelText("Nytt lösenord"),
    "new-synthetic-password",
  );
  await user.type(
    dialog.getByLabelText("Upprepa lösenordet"),
    "different-password",
  );
  await user.click(dialog.getByRole("button", { name: "Spara nytt lösenord" }));
  expect(dialog.getByRole("alert")).toHaveTextContent(
    "Lösenorden matchar inte",
  );
  expect(requests.change).not.toHaveBeenCalled();
  await user.clear(dialog.getByLabelText("Upprepa lösenordet"));
  await user.type(
    dialog.getByLabelText("Upprepa lösenordet"),
    "new-synthetic-password",
  );
  await user.click(dialog.getByRole("button", { name: "Spara nytt lösenord" }));
  expect(await dialog.findByRole("alert")).toHaveTextContent(
    "Det nuvarande lösenordet stämmer inte",
  );
  await user.click(dialog.getByRole("button", { name: "Spara nytt lösenord" }));
  expect(requests.change).toHaveBeenLastCalledWith({
    currentPassword: "old-synthetic-password",
    newPassword: "new-synthetic-password",
    revokeOtherSessions: true,
  });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(await screen.findByText(/Lösenordet uppdaterat/)).toBeVisible();
});

it("preserves password input and allows retry after a network failure", async () => {
  requests.change.mockRejectedValueOnce(new TypeError("offline"));
  const user = userEvent.setup();
  show({ hasPassword: true });
  await user.click(screen.getByRole("button", { name: "Ändra lösenord" }));
  await user.type(
    screen.getByLabelText("Nuvarande lösenord"),
    "synthetic-password",
  );
  await user.type(
    screen.getByLabelText("Nytt lösenord"),
    "new-synthetic-password",
  );
  await user.type(
    screen.getByLabelText("Upprepa lösenordet"),
    "new-synthetic-password",
  );
  await user.click(screen.getByRole("button", { name: "Spara nytt lösenord" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Kontrollera anslutningen",
  );
  expect(screen.getByLabelText("Nytt lösenord")).toHaveValue(
    "new-synthetic-password",
  );
  expect(
    screen.getByRole("button", { name: "Spara nytt lösenord" }),
  ).toBeEnabled();
});

it("starts explicit Google linking with separate success and error callbacks and permits retry", async () => {
  requests.link
    .mockResolvedValueOnce({ error: { status: 429 } })
    .mockResolvedValueOnce({ error: null });
  const user = userEvent.setup();
  show({ hasPassword: true, googleLinked: false });
  const button = screen.getByRole("button", { name: "Koppla Google" });
  await user.click(button);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "För många försök",
  );
  expect(button).toBeEnabled();
  await user.click(button);
  expect(requests.link).toHaveBeenLastCalledWith({
    provider: "google",
    callbackURL: new URL(
      "/settings?accountLink=success#account",
      window.location.origin,
    ).toString(),
    errorCallbackURL: new URL(
      "/settings?accountLink=error#account",
      window.location.origin,
    ).toString(),
  });
  expect(screen.getByRole("button", { name: "Öppnar Google…" })).toBeDisabled();
});

it("does not confirm a link unless Google is actually linked", () => {
  const view = show({ googleLinked: false, linkResult: "success" });
  expect(
    screen.queryByText("Google har kopplats till ditt konto."),
  ).not.toBeInTheDocument();
  view.rerender(
    <SaveNoticeProvider>
      <AccountSettings {...defaults} linkResult="success" />
    </SaveNoticeProvider>,
  );
  expect(
    screen.getByText("Google har kopplats till ditt konto."),
  ).toBeVisible();
});
