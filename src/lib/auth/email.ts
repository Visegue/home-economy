import "server-only";

interface AuthEmail {
  actionLabel: string;
  actionUrl: string;
  idempotencyKey: string;
  intro: string;
  subject: string;
  to: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export async function sendAuthEmail({
  actionLabel,
  actionUrl,
  idempotencyKey,
  intro,
  subject,
  to,
}: AuthEmail): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM;

  if (!apiKey || !from) {
    throw new Error("E-postleverans för autentisering är inte konfigurerad.");
  }

  const safeActionUrl = escapeHtml(actionUrl);
  const safeActionLabel = escapeHtml(actionLabel);
  const safeIntro = escapeHtml(intro);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
      "User-Agent": "home-economy/0.1",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text: `${intro}\n\n${actionLabel}: ${actionUrl}\n\nOm du inte begärde detta kan du bortse från meddelandet.`,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#342b32;max-width:560px;margin:0 auto;padding:32px 20px">
          <h1 style="font-size:24px;margin:0 0 16px">Hemekonomi</h1>
          <p>${safeIntro}</p>
          <p style="margin:28px 0">
            <a href="${safeActionUrl}" style="display:inline-block;background:#6d315f;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600">${safeActionLabel}</a>
          </p>
          <p style="font-size:13px;color:#746a70">Om du inte begärde detta kan du bortse från meddelandet.</p>
        </div>
      `,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`E-postleveransen misslyckades (${response.status}).`);
  }
}
