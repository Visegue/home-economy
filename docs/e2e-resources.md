# Lokal E2E och resursdelning

Kör förtestet i [testguiden](testing.md#förtest) före längre jobb. Använd Node 24 för Playwright/PGlite och Vitest, Bun för de kompatibla verktygen och pnpm för projektkommandon.

## Workers och resultat

`pnpm test:e2e` använder två workers lokalt. Ändra uttryckligen med exempelvis `pnpm test:e2e --workers=1` (även `--workers 1` fungerar). CI behåller Playwrights automatiska standard, 50 procent av tillgängliga CPU:er, samt sina befintliga retries och releasegrindar.

Serverrapporten och terminalens slutsvar visar kommandot samt faktisk planerad parallellitet/konfigurerad gräns. `workerIndices` visar vilka worker-processer som startade; ersättningsworkers kan tillkomma efter fel. Kommandot saneras med samma regler som serverloggen och sparas som argumentlista i `test-results/server/report.json`. Vid uppstartsfel kan faktisk parallellitet vara okänd. Browserutfall och serverutfall måste båda bedömas enligt [E2E-diagnostik](e2e-diagnostics.md).

## Ägarskap för Next-utdata

`dev`, `build`, `build:check`, `start`, `typecheck` och Playwrights appserver delar ett exklusivt lås per worktree i `.tmp/next-output.lock`. Playwright tar låset före seedning och behåller det tills testservern har avslutats. Övriga ingångar behåller det genom barnprocessens avslut. Ägarprocessen avvisar en konflikt med exit 73 före nästa kommando startar, med jobbnamn och ägarens PID. Playwright rapporterar appserverns exit 73 och avslutar då E2E-körningen med sin vanliga felkod 1. Kör det avvisade jobbet igen när ägaren är klar.

Next 16.3.6 skiljer på `.next/dev` och `.next` för dev respektive build, men genererade typer och `next-env.d.ts` delas också med typkontrollen. Därför är projektets lås avsiktligt bredare än Nexts interna dev-lås. Även en produktionsserver skyddas från ett samtidigt bygge som ersätter dess filer. Direkta `next`-/`tsc`-kommandon går förbi projektets lås; använd projektets ingångar för verifiering.

Vid SIGINT/SIGTERM vidarebefordras signalen och låset hålls tills barnet stängt. Om ägaren dödas med SIGKILL eller maskinen avbryts kan låset ligga kvar. Kontrollera först ägarens PID och eventuella barnprocesser; ta endast bort `.tmp/next-output.lock` när ingen av dem arbetar med utdata. Ett lås återtas aldrig automatiskt enbart för att ägarens PID saknas: ett barn kan fortfarande skriva.

| Jobb                                                     | Parallellt i samma worktree?          | Skäl                                                                                                        |
| -------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Next-byggjobb, dev/server, E2E-appserver och typkontroll | Nej                                   | Delade utdata eller genererade typer; konflikt ger exit 73.                                                 |
| Formatkontroll, lint och förtest                         | Ja                                    | Läser källor/konfiguration utan att äga Next-utdata.                                                        |
| Vitest                                                   | Tekniskt ja, men kör efter E2E lokalt | Egna PGlite-instanser och syntetiska reporterfixturer delar inte Next-utdata, men konkurrerar om CPU/minne. |
| Separata worktrees                                       | Ja, med resurser och portar avsatta   | Egna lås och utdata; en gemensam port eller en överbelastad dator isoleras inte av ett worktree.            |

Kör `pnpm check` och därefter `pnpm test:e2e` sekventiellt lokalt. `pnpm check` består själv av sekventiella steg; låset gäller respektive ägarsteg, inte hela kedjan. CI:s separata kvalitetstest- och E2E-jobb har skilda checkouts och kör fortsatt parallellt.

## Mätunderlag för #115

Mätningen använder samma syntetiska PGlite-svit och befintlig sessionsisolering från #106. En lägre worker-gräns är en lokal resursbudget. Den bevisar inte att tidigare PGlite-, scroll- eller timeoutfel har samma orsak eller är rättade. #113:s felgrind är kvar.

Mätt 2026-10-18 på macOS arm64, 10 CPU:er/32 GiB, Node 24.21.0, Bun 1.3.14, pnpm 11.24.0 och installerad Chromium headless-shell 153.0.8010.12 (build 1243). Förtestet passerade i den tillåtna worktree-körmiljön. Samma 37 testfall kördes med nya temporära databaser, utan lokala retries. Inga andra Next-/byggjobb kördes i detta worktree; korta browserfria kontraktstester kördes under delar av mätningen. Detta är en lokal jämförelse, inte ett kontrollerat prestandalabb.

| Val                                        | Cache               | Browserutfall            | Serverutfall | Playwright-tid |
| ------------------------------------------ | ------------------- | ------------------------ | ------------ | -------------- |
| `--workers=1`                              | Befintlig dev-cache | 37 godkända              | Rent         | 212,7 s        |
| `--workers=2`                              | Befintlig dev-cache | 37 godkända              | Rent         | 113,0 s        |
| Provisorisk standard 1, utan worker-flagga | Ny dev-cache        | 36 godkända, 1 scrollfel | Rent         | 194,4 s        |
| Slutlig standard 2, utan worker-flagga     | Ny dev-cache        | 37 godkända              | Rent         | 115,9 s        |

Två workers väljs eftersom båda hela körningarna var rena och ungefär halverade tiden jämfört med den rena enworker-körningen, samtidigt som nivån begränsas från den tidigare lokala CLI-standardens fem. En worker finns kvar som konservativ override för mindre maskiner. Detta visar ett användbart resurs-/tidval på den mätta datorn, inte en statistiskt bevisad flake-frekvens eller rotorsaksrättning.

Scrollfelet med en worker var `row-details.spec.ts`: efter touchgesten blev `scrollY` 1764 där assertionen krävde mindre än 1094. Tre isolerade repetitioner med en worker passerade därefter med rent serverutfall. Underlaget ger ingen säker orsak; assertionen och serverfelgrinden har inte försvagats. Tidigare PGlite-fel ska fortfarande rapporteras som fel.

Port 3000 var upptagen av ett annat projekt. För denna mätning användes en ignorerad kopia av E2E-filerna och konfigurationen, med endast app-URL:ens port utbytt till 3115 och ursprungliga källimporter bevarade. Den första körningen stoppades före tester på portkonflikt; ett försök med bara konfigurationsbyte avbröts när en hårdkodad URL-assertion upptäcktes. De räknas inte som mätvärden. Ordinarie testfiler har inte ändrats. Rårapporter, även fel och trace, bevarades lokalt i `.tmp/issue-115`.

För en ledig standardport kan jämförelsen upprepas med `pnpm test:e2e --workers=1`, `pnpm test:e2e --workers=2` och `pnpm test:e2e`. Kör sekventiellt, notera cacheläget och bedöm både browser- och serverrapport. En ny dev-cache kan skapas genom att ta bort `.next/dev` först efter att alla ägare avslutats. På den delade mätdatorn kördes samma kommandon med `--config=.tmp/issue-115/playwright.config.ts` och `PLAYWRIGHT_JSON_OUTPUT_FILE` satt till worktreets `test-results/report.json`.
