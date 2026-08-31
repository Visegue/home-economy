# Hemekonomi

En svensk webbapp för att planera hushållets ekonomi utan kalkylbladskänslan. Den första versionen översätter en historisk Excel-arbetsbok till tydliga produktområden: månadsplan, kassaflöde, återkommande poster, konton och lån, sparmål samt investeringar.

Dashboarden använder en varm sandfärgad grund med aubergine, dammigt blått, senap och salvia. All incheckad demodata är syntetisk.

## Teknik

- Next.js 16, React 19 och TypeScript
- Tailwind CSS 4 och shadcn/ui (Radix)
- Neon Postgres, Drizzle ORM och Better Auth med Google OAuth
- PGlite för lokal Postgres utan Docker eller molnprojekt
- Oxlint för linting, separat `tsc` för typkontroll
- Vitest, Testing Library och Playwright
- pnpm 11; Node.js 24 i CI

Bun kan användas som runtime lokalt, men pnpm är projektets enda pakethanterare. Det ger samma låsfil i utveckling och CI.

## Kom igång

```bash
corepack enable
pnpm install
cp .env.example .env.local
pnpm db:migrate
pnpm dev
```

Öppna [http://localhost:3000](http://localhost:3000). Översikten fungerar med syntetisk demodata även innan Google OAuth eller Neon har konfigurerats.

## Kvalitetskontroller

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

`pnpm check` kör alla kontroller utom Playwright. Oxlints vanliga React-, accessibility-, import-, promise-, Vitest- och Next.js-regler är aktiverade. Typmedvetet Oxlint-läge är medvetet avstängt tills projektet kan gå till TypeScript 7; `tsc --noEmit` är därför den auktoritativa typkontrollen.

## Databas

När `DATABASE_URL` saknas kör appen Postgres lokalt via PGlite i `.data/pglite`. Ingen Docker eller separat molndatabas krävs. Drizzle-schemat är källa för både PGlite och Neon:

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:studio
```

För drift används en poolad Neon-anslutning med den begränsade rollen `home_economy_runtime` i `DATABASE_URL`. Den separata ägaranslutningen i `DATABASE_MIGRATION_URL` används endast för migrationer. Prepared statements är avstängda för kompatibilitet med transaktionspoolning.

Hushållstabellerna har tvingande row-level security. All serverkod som läser eller skriver hushållsdata använder `withAuthenticatedDatabase(operation)`, som validerar sessionen och sätter användarkontext endast för den aktuella transaktionen.

Miljöerna delar samma migrationer men inte samma databasanslutning:

| Miljö            | Databas                       | Användning                                           |
| ---------------- | ----------------------------- | ---------------------------------------------------- |
| Lokal utveckling | PGlite i `.data/pglite`       | Snabb utveckling utan molnresurs                     |
| Staging/preview  | Neon-branchen `development`   | Integrationstest och förhandsgranskning före release |
| Produktion       | Neon-rotbranchen `production` | Verklig hushållsdata                                 |

De hostade databaserna ligger i Neon-projektet [`home-economy`](https://console.neon.tech/app/projects/wandering-king-47243958) i AWS Frankfurt (`aws-eu-central-1`), den närmaste tillgängliga Neon-regionen till Sverige. GitHub environments `staging` och `production` innehåller branchspecifika `DATABASE_URL`- och `DATABASE_MIGRATION_URL`-secrets samt projekt- och branch-ID som variabler.

Enskilda pull requests kan senare få kortlivade Neon-branches med namnet `preview/pr-*`. De ska tas bort när preview-miljön stängs.

## Google-inloggning

Skapa en OAuth-klient av typen “Web application” i Google Cloud och lägg till följande redirect URI lokalt:

```text
http://localhost:3000/api/auth/callback/google
```

I drift används motsvarande HTTPS-adress på den riktiga domänen. Sätt därefter `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` och `AUTH_ALLOWED_EMAILS` i `.env.local` eller hostingmiljön. `AUTH_ALLOWED_EMAILS` är en kommaseparerad allowlist; Google-kontot kontrolleras vid varje inloggning. Generera auth-hemligheten med exempelvis `openssl rand -base64 32`.

Auth är avsiktligt begränsad till Google i första versionen. Implicit kontolänkning är avstängd, så en framtida extra leverantör måste länkas uttryckligen från en redan autentiserad session.
Google-token krypteras innan lagring och OAuth-state sparas som en engångspost i databasen.

## Dokumentation

- [Arbetsbokens produktkarta](docs/workbook-mapping.md)
- [Arkitektur och säkerhetsgränser](docs/architecture.md)
- [ADR 0001: data- och authplattform](docs/adr/0001-data-and-auth-platform.md)
- Databasens schema: `src/db/schema/`
- Körbara migrationer: `drizzle/`

## Licens

Projektet är licensierat under MIT. Programvaran tillhandahålls i befintligt skick utan garanti; se [LICENSE](LICENSE). Det är en bred ansvarsfriskrivning, men inte en garanti om immunitet i alla jurisdiktioner.
