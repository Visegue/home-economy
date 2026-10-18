# Utveckla och testa

Här finns förtest, kvalitetskontroller och testernas avgränsning. Se [lokal utveckling](local-development.md) för installation.

## Förtest

Kör `bun scripts/check-local-environment.mjs` i repots rot före längre verifieringsjobb; när pnpm redan fungerar finns även `pnpm check:local`. Om Bun saknas kan en redan installerad Node köra samma `.mjs`-fil. Direktkommandot låter diagnostiken starta även när pnpm/Corepack annars försöker hämta rätt version före ett npm-skript.

Förtestet läser `.tool-versions`, `package.json` och installerad Playwright. Det kontrollerar Node/Bun/pnpm i aktuell PATH, den headless-shell som E2E faktiskt väljer (inklusive `PLAYWRIGHT_BROWSERS_PATH`) eller befintlig `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`, samt skrivbarhet i worktreet och befintliga verifieringskataloger. För körbara macOS-appbundlar läses versionen med systemets `plutil` i stället för att starta Chrome med `--version`. Varje processuppslag begränsas till två sekunder. Exit 0 betyder stödd miljö, exit 1 ofullständig miljö med nästa steg. Kontrollen startar ingen browser och ersätter inte kvalitetskontroller eller E2E; en explicit override måste fortfarande verifieras med E2E.

Diagnostiken laddar inte ned verktyg/browser eller ändrar globala trust-inställningar. Den spärrar automatisk installation via Corepack, pnpm och mise i sina uppslag och skapar/tar bort tomma temporära kataloger för skrivkontrollen. Vid shim-, timeout- eller behörighetsfel: välj redan installerade binärer i PATH och kör direktkommandot igen inom tillåten sandbox. Installation eller utökad behörighet är ett separat, uttryckligt steg. Inga personliga sökvägar eller `.tmp`-wrappers behövs. CI:s pinnade installationer och Node 24-undantagen ovan behålls.

## Kvalitetskontroller

Efter `pnpm install` kan `pnpm check` köras utan `.env.local`, databas eller egna auth-nycklar. Kommandot kontrollerar versionsformat och UI-gränser och kör format, lint, typkontroll, tester och verifieringsbygge. Kör enskilt med:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build:check
```

`pnpm build:check` använder samma syntetiska databasadress och auth-nyckel lokalt som i CI. Bygget importerar konfigurationen utan att fråga databasen. Det skapade bygget är endast för verifiering. För deploy används `pnpm build` med miljöns riktiga inställningar.

Oxlint kontrollerar React, tillgänglighet, importer, promises, Vitest och Next.js. Typmedveten lint är avstängd; `tsc --noEmit` ansvarar för typkontrollen.

Två kontroller körs separat:

- `pnpm test:e2e`: Playwright testar användarflöden med en tillfällig PGlite-databas, syntetiska användare och vanliga databassessioner. Testerna täcker hushållsskapande, återbesök och nekad åtkomst vid saknad eller utgången session. Ingen testinloggningsroute finns. Databasen tas bort när testservern stängs.
- `pnpm db:check`: verifierar auth-tabeller, sessionslagring, runtime-rollens rättigheter, tvingande RLS och transaktionsisolering i konfigurerad Neon-branch. Syntetiska poster rullas alltid tillbaka. Kör vid ändrad databaskoppling, migration eller behörighet. Kontrollen körs även efter migration i CI:s deployjobb.

Databastesterna kör migrationer och RLS med en begränsad roll i PGlite. PGlite- och Playwright-tester använder ingen Neon-kvot och skickar inga mejl. Google OAuth och mejlleverans kräver separat kontroll i webbläsaren. `db:check` använder Neon-kvot även när testdata rullas tillbaka.

För lokal E2E-workerstandard, override, mätunderlag och vilka jobb som kan dela ett worktree, se [Lokal E2E och resursdelning](e2e-resources.md).

Vitest använder högst två testprocesser lokalt eftersom varje databastestfil startar en egen PGlite-instans. Ändra vid behov med `pnpm test --maxWorkers=4` eller `VITEST_MAX_WORKERS=4 pnpm check`. I CI väljer Vitest antalet automatiskt utifrån tillgängliga processorer.

CI kör även `pnpm db:generate` och stoppar PR:er med saknade migrationsfiler. Vid Playwright-fel eller omförsök sparas HTML-/JSON-rapport och traces som `playwright-diagnostics-<körningsförsök>` i sju dagar, även om slutresultatet är grönt. Separata namn bevarar tidigare underlag när hela jobbet körs om. Körningssammanfattningen visar direkt godkända tester, lyckade omförsök, slutliga fel och berörda testnamn. En lyckad retry betyder inte att orsaken är rättad.

`retain-on-failure-and-retries` spelar in varje första försök för att kunna behålla det ursprungliga felet och alla retries. Traces från direkt lyckade försök kastas, källkodsinbäddning är avstängd och helt rena körningar laddar inte upp någon diagnostikartefakt. Rapporteringen använder befintlig Actions-lagring; den tillfälliga inspelningen har ändå en tids-/diskkostnad. E2E-miljön använder endast isolerade syntetiska sessioner och data, inga produktionsnycklar eller verkliga hushållsdata.

Lokalt finns rapporterna i `playwright-report/` och `test-results/report.json`. Kör `bun .github/scripts/summarize-playwright.mjs` för samma sammanfattning. `pnpm test scripts/playwright-diagnostics.test.mjs` verifierar kontrollerat lyckat, flaky och misslyckat utfall med den installerade Playwright-CLI:n, utan appserver, browser eller auth. Felsimuleringen ligger utanför appens ordinarie E2E-suite. Serverfel utan browserfel bedöms enligt [E2E-diagnostik](e2e-diagnostics.md).

När diagnostikens konfiguration, tester eller CI-filer ändras kör **Verify Playwright diagnostics** dessutom ett isolerat fall i Actions som avsiktligt fallerar först och lyckas på retry. Det gröna kontraktsjobbet sparar `playwright-diagnostics-contract-<körningsförsök>` med rapport och båda traces i sju dagar. Detta verifierar själva uppladdningen även när appens tester passerar direkt. Det kräver ingen browserinstallation eller databas och körs endast för berörda PR-ändringar.

[Till dokumentationsindexet](README.md) · [Till projektets README](../README.md)
