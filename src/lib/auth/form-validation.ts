export function matchingPasswords(
  data: FormData,
  password = "password",
  confirmation = "password-confirmation",
) {
  return data.get(password) !== data.get(confirmation)
    ? { [confirmation]: "Lösenorden matchar inte." }
    : {};
}
