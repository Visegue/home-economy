# Hemekonomi

En svensk app för hushållets ekonomi, byggd utifrån en Excel-arbetsbok. Produktområdena är månadsplan, kassaflöde, återkommande utgifter, konton, lån, sparande och investeringar.

Gränssnittet använder sand, aubergine, blått, senap och salvia. All demodata i repot är syntetisk.

## Månadsbudget

- **Månaden** visar inkomster, direkta utgifter, avsättningar och kvarvarande belopp eller underskott. Årslistan jämför tolv månader.
- Lägg till inkomstkällor under **Inställningar → Hushållets inkomster** med namn, månadsbelopp efter skatt, startmånad och valfri slutmånad. Båda gränsmånaderna ingår. Utan slutmånad gäller inkomsten tills vidare. Aktiva källor summeras per månad.
- Vid ändrat inkomstbelopp: avsluta den gamla inkomsten och skapa en ny från nästa månad. Då bevaras historiken. Äldre månadsregistreringar och medlemsinkomster migreras enligt [arkitekturen](docs/architecture.md#pengar-och-datum).
- Utgifter betalas varje månad eller avsätts inför betalning var 2, 3, 6, 12 eller 24:e månad. Ange startmånad och, för avsatta utgifter, nästa betalningsdatum.
- Månadsavsättningen är beloppet delat med intervallet, avrundat till öre per utgift. Betalningen räknas inte dubbelt. Kontots saldo och extra avsättning inför första betalningen ingår inte.
- **Ändra** och **Avsluta** utgifter eller sparande gäller från vald månad. Tidigare månader behålls. Avslut från startmånaden döljer hela perioden; lagrade kopplingar till månadsplaner finns kvar.
- Lägg till medlemmar under **Inställningar** och välj valfritt flera ägare per utgift. Namnen ger ingen inloggning och påverkar inte summorna.

Månadsöversikten visar sparad hushållsdata. Kör `pnpm db:migrate` före start mot en befintlig databas.

## Teknik

- Next.js 16, React 19 och TypeScript
- Tailwind CSS 4 och shadcn/ui (Radix)
- Neon Postgres, Drizzle ORM och Better Auth (verifierad e-post/lösenord och Google OAuth)
- PGlite för tester och offlineutveckling utan Docker eller molnprojekt
- Oxlint, `tsc`, Vitest, Testing Library och Playwright
- pnpm 11 och Node.js 24 i CI

Använd pnpm som pakethanterare för samma låsfil lokalt och i CI. Bun kan köra appen lokalt.

## Kom igång

```bash
corepack enable
pnpm install
cp .env.example .env.local
```

Fyll i `.env.local` enligt [Databas](#databas) och [Inloggning](#inloggning), med minst ett inloggningssätt. Starta sedan:

```bash
pnpm db:migrate
pnpm dev
```

Öppna [localhost:3000](http://localhost:3000). Appvyerna kräver en session som valideras i databasen. Ekonomidatan kan även köras lokalt med PGlite.

## Kvalitetskontroller

`pnpm check` kontrollerar versionsformat och kör format, lint, typkontroll, tester och bygge. Kör enskilt med:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Oxlint kontrollerar React, tillgänglighet, importer, promises, Vitest och Next.js. Typmedveten lint är avstängd; `tsc --noEmit` ansvarar för typkontrollen.

Två kontroller körs separat:

- `pnpm test:e2e`: Playwright testar användarflöden med en tillfällig PGlite-databas, syntetiska användare och vanliga databassessioner. Testerna täcker hushållsskapande, återbesök och nekad åtkomst vid saknad eller utgången session. Ingen testinloggningsroute finns. Databasen tas bort när testservern stängs.
- `pnpm db:check`: verifierar auth-tabeller, sessionslagring, runtime-rollens rättigheter, tvingande RLS och transaktionsisolering i konfigurerad Neon-branch. Syntetiska poster rullas alltid tillbaka. Kör vid ändrad databaskoppling, migration eller behörighet. Kontrollen körs även efter migration i CI:s deployjobb.

Databastesterna kör migrationer och RLS med en begränsad roll i PGlite. PGlite- och Playwright-tester använder ingen Neon-kvot och skickar inga mejl. Google OAuth och mejlleverans kräver separat kontroll i webbläsaren. `db:check` använder Neon-kvot även när testdata rullas tillbaka.

CI kör även `pnpm db:generate` och stoppar PR:er med saknade migrationsfiler. Vid Playwright-fel sparas rapporter och traces i sju dagar. CI och rapporter använder Actions-tid och lagring.

## Deploy och release

GitHub Actions sköter all deploy. Vercels automatiska Git-deploys är avstängda i `vercel.json`.

| Miljö               | Flöde efter godkända kvalitets- och Playwright-tester                                                                                                                  |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Produktion (`main`) | Bygg utan att flytta domänen → migrera → `db:check` → smoketesta `/login` → flytta produktionsdomänen till nya bygget (promotion) → publicera eventuell GitHub Release |
| Preview (PR)        | Migrera staging → `db:check` → deploy → smoketesta `/login` → visa preview-länk på GitHub-deploymenten                                                                 |

Produktionskörningar köas hela vägen genom release. Preview-körningar köas eftersom de delar databas. Schemaändringar ska vara bakåtkompatibla; destruktiva ändringar delas upp enligt expand/contract. Se [release-runbooken](docs/release-runbook.md) för versionsval, kontroller och återställning.

Appversionen finns i `package.json` och visas under **Inställningar** i produktion. Öppna raden för commit och releaselänk. Preview visar i stället gren och deployad commit i samma kompakta vy.

App-, beroende-, migrations- och releaseändringar kräver en högre SemVer-version än `main`. `quality` stoppar annars merge och en botkommentar förklarar varför. Dokumentations-, testfil- och CI-ändringar kan behålla versionen. Prerelease och byggmetadata stöds, men enbart `+...` räknas inte som höjning.

Efter lyckad promotion av en ny version skapar CI taggen `v<version>` och en GitHub Release med automatiska ändringsnoteringar. Prerelease på `main` går också till produktion, med prerelease-etikett på GitHub. Oförändrad version deployas utan ny release.

### Secrets

Både GitHub-miljöerna `staging` och `production` behöver:

| Secret                   | Innehåll                                                              |
| ------------------------ | --------------------------------------------------------------------- |
| `DATABASE_URL`           | Poolad anslutning med `home_economy_runtime` till miljöns Neon-branch |
| `DATABASE_MIGRATION_URL` | Direkt ägaranslutning till samma branch, utan pooler                  |
| `VERCEL_TOKEN`           | Token med deploybehörighet till projektet                             |
| `VERCEL_ORG_ID`          | Vercel-teamets ID                                                     |
| `VERCEL_PROJECT_ID`      | Vercel-projektets ID                                                  |

Projekt- och branch-ID för Neon finns som variabler i respektive GitHub-miljö. Auth- och mejlinställningar finns i Vercels motsvarande miljö. Migrationsanslutningen får inte ligga i Vercel.

### PR-previews

Även draft-PR:er från samma repo får previews, utom Dependabot. Fork- och Dependabot-PR:er kör isolerade tester. En obligatorisk kontroll stoppar känsliga ändringar utan stagingvalidering; granskade ändringar måste då köras från en betrodd branch. Se [undantag och detaljer](docs/release-runbook.md#staging-och-prer).

`Deploy preview` migrerar Neons `development` via GitHub-miljön `staging`. Runtime-anslutningen sparas som krypterad, branchspecifik Preview-variabel i Vercel för både bygge och körning. Den finns kvar när PR:en stängs, liksom applicerade migrationer. Samordna schemaändringar mellan PR:er.

Jobbet använder Vercels API direkt för att stödja projektbegränsade tokens utan CLI:ts användaruppslag. Det kontrollerar GitHub-kopplingen och väntar på `READY` för rätt projekt och testad commit.

## Databas

Alla miljöer ligger i Neon-projektet [home-economy](https://console.neon.tech/app/projects/wandering-king-47243958), AWS Frankfurt (`aws-eu-central-1`), valt som närmaste tillgängliga region till Sverige.

| Miljö            | Neon-branch              | Data                               |
| ---------------- | ------------------------ | ---------------------------------- |
| Lokal utveckling | `dev/alexander`          | Lokala konton och integrationstest |
| Staging/preview  | `development`            | Gemensam testdatabas för previews  |
| Produktion       | Rotbranchen `production` | Verklig hushållsdata               |

Varje utvecklare ska ha en egen branch, exempelvis `dev/<namn>`, med syntetiska data. Lägg den poolade runtime-anslutningen i `DATABASE_URL` och den direkta ägaranslutningen i `DATABASE_MIGRATION_URL` i Git-ignorerade `.env.local`. App och migrationsverktyg läser samma miljöfil. Prepared statements är avstängda för transaktionspoolning.

Samma Drizzle-schema och SQL-migrationer används överallt:

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:check
pnpm db:studio
```

Saknad `DATABASE_URL` ger fel. Välj offline-läge uttryckligen med `DATABASE_PROVIDER=pglite`:

```bash
DATABASE_PROVIDER=pglite pnpm db:migrate
DATABASE_PROVIDER=pglite pnpm dev
```

PGlite är förbjudet i produktionsläge och på Vercel. Isolerade tester använder PGlite utan att röra utvecklingsdatabasen.

Hushållsdata skyddas av tvingande row-level security (RLS). All läsning och skrivning går via `withAuthenticatedDatabase(operation)`, som validerar sessionen och sätter användarkontext för enbart transaktionen.

Inga Neon-branches skapas automatiskt per PR. Framtida behov av sådan isolering kräver en separat kostnadsbedömning.

Better Auth lagrar konton och sessioner per databas. Samma Google-identitet kan användas i alla miljöer, men appkonton och hushåll är separata. Lokalt används localhost-klienten och lokal `BETTER_AUTH_SECRET`. Tidigare PGlite-konton flyttas inte automatiskt. Mejlverifiering och lösenordsåterställning kräver lokala Resend-inställningar även med Neon.

## Inloggning

### Google

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

### E-post och lösenord

Skapa en Resend API-nyckel, verifiera avsändardomänen och sätt `RESEND_API_KEY` och `AUTH_EMAIL_FROM`. Lösenord ska vara 12–128 tecken. E-postadressen måste verifieras före första inloggningen. Resend skickar verifierings- och återställningsmejl.

Alla Google-konton kan registrera sig. Vid första inloggningen skapar användaren ett eget hushåll. En unik databasregel tillåter ett personligt ägarhushåll per konto. Tvingande RLS skyddar datan även om en fråga saknar hushållsfilter.

Google och lösenord länkas vid samma verifierade e-postadress. Google-användare kan lägga till lösenord via **Glömt lösenord?** Google-token lagras krypterat och OAuth-state som en engångspost i databasen.

## Dokumentation

- [Arbetsbokens produktkarta](docs/workbook-mapping.md)
- [Arkitektur och säkerhetsgränser](docs/architecture.md)
- [ADR 0001: data- och authplattform](docs/adr/0001-data-and-auth-platform.md)
- [ADR 0002: databasmedvetna releaser](docs/adr/0002-database-aware-releases.md)
- [ADR 0003: appversionering och GitHub Releases](docs/adr/0003-app-versioning-and-github-releases.md)
- [Release och återställning](docs/release-runbook.md)
- [Rapportera säkerhetsbrister](SECURITY.md)
- Schema: `src/db/schema/`; migrationer: `drizzle/`

## Licens

[MIT](LICENSE): programvaran ges i befintligt skick, utan garanti. Ansvarsfriskrivningen garanterar inte ansvarsfrihet i alla jurisdiktioner.
