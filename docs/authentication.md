# Konfiguration och inloggning

Appvyerna kräver en databasvaliderad session. Kopiera [.env.example](../.env.example) till Git-ignorerade `.env.local`, sätt lokal `BETTER_AUTH_URL` och `BETTER_AUTH_SECRET` enligt [lokal utveckling](local-development.md#installation-och-start), och konfigurera minst ett av inloggningssätten nedan. Databasanslutningarna beskrivs i [databasguiden](database.md). Auth- och OAuth-hemligheter ska stanna på servern.

## Google

Skapa en OAuth-klient av typen **Web application** i Google Cloud. Lokal redirect URI:

```text
http://localhost:3000/api/auth/callback/google
```

Registrera bara den stabila callback-adressen i produktion, exempelvis `https://home-economy.vercel.app/api/auth/callback/google`. Dynamiska previews använder Better Auths OAuth Proxy: Google återvänder till produktion, som skickar en kortlivad, krypterad profil till rätt preview utan att spara preview-användaren i produktionsdatabasen.

| Variabel                                   | Inställning                                                                                                            |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Produktionsklientens värden i både Preview och Production                                                              |
| `BETTER_AUTH_SECRET`                       | Separat hemlighet per miljö, minst 32 tecken i Preview/Production; utvecklingsnyckeln tillåts inte där                 |
| `OAUTH_PROXY_SECRET`                       | Samma separata proxyhemlighet i Preview och Production                                                                 |
| `OAUTH_PROXY_PRODUCTION_URL`               | Stabil produktionsadress                                                                                               |
| `BETTER_AUTH_TRUSTED_ORIGINS`              | Snävt mönster för egna previews, exempelvis `https://home-economy-*-visegue.vercel.app`; aldrig `https://*.vercel.app` |
| `BETTER_AUTH_URL`                          | Tom i Preview (härleds från `VERCEL_URL`); stabil adress i Production                                                  |

Generera hemligheter med exempelvis `openssl rand -base64 32`.

## E-post och lösenord

Skapa en Resend API-nyckel, verifiera avsändardomänen och sätt `RESEND_API_KEY` och `AUTH_EMAIL_FROM`. Lösenord ska vara 12–128 tecken. E-postadressen måste verifieras före första inloggningen. Resend skickar verifierings- och återställningsmejl.

## Konton och verifiering

[Användarguiden](usage.md#konto-och-tema) beskriver hushållsskapande, kontolänkning och lösenordsbyte. Konton och sessioner är separata per databas enligt [databasguiden](database.md#åtkomst-och-konton). Google OAuth och mejlleverans kräver separat kontroll i webbläsaren efter relevanta ändringar; de isolerade testerna skickar inga mejl. Hostade hemligheter placeras enligt [release-runbooken](release-runbook.md#miljöinställningar).

[Till dokumentationsindexet](README.md) · [Till projektets README](../README.md)
