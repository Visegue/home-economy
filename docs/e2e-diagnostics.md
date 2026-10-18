# E2E-diagnostik

`pnpm test:e2e` bedömer browserassertioner och serverutfall separat. Playwright-reportern fångar den pipade testserverns stdout/stderr från seedning och uppstart till avslutad nedstängning. Även en körning med godkända assertioner får exitkod 1 vid oväntade serverfel eller misslyckad diagnostikinsamling.

`test-results/server/report.json` innehåller körnings-ID, tidsintervall, Git-commit, markering för lokala ändringar, sanerat kommando som argumentlista, konfigurerad worker-gräns, faktisk planerad parallellitet och startade worker-index. Den sanerade loggen ligger bredvid, med körnings-ID som filnamn. Browserrapportens metadata innehåller samma ID. Vid `PLAYWRIGHT_JSON_OUTPUT_FILE` placeras serverdiagnostiken bredvid den rapporten. Saknad eller omatchad serverrapport får inte sammanfattas som en ren körning.

Felgrinden känner igen unhandled rejection/exception, uncaught error/exception, fatal error, FATAL, Aborted(), out-of-memory, inledande Error/TypeError/ReferenceError/SyntaxError/RangeError/RuntimeError och appens fem strukturerade skrivfelshändelser. ANSI-färger tas bort och ofullständiga rader fogas samman per ström före bedömning. En överstor rad eller logg ger insamlingsfel i stället för tyst bortfall. Regeln matchar inte godtyckliga förekomster av ordet `error`.

Inga fatala fel undantas. Vanliga utvecklingsvarningar och negativa valideringsflöden utan dessa felsignaler passerar; väntade `PeriodWriteError` returneras redan utan serverfelloggning. Om ett nytt meddelande behöver undantas ska dess verkliga ursprung och snäva matchningsvillkor först verifieras och regressionstestas. En lyckad körning med färre workers bevisar inte att PGlites tidigare Aborted()-fel är rotorsaksrättat.

Kör bara mot den befintliga syntetiska PGlite-testmiljön. Sparade serverloggar maskerar hemlighetsvärden från miljön, databas-URL:er, URL-inloggning/query, e-postadresser och auth-/cookie-/tokenfält. Varken denna insamling eller traces ska användas för verkliga hushållsdata. Playwright-traces har fortsatt `sources: false`.

CI-sammanfattningen visar browserstatistik och serverstatus separat. Befintlig artifactuppladdning sparar `test-results/` och HTML-rapporten vid fel, retries eller serverfel med sju dagars retention. Rena körningar behöver ingen uppladdning. Lokalt finns diagnostiken kvar i `test-results/` tills nästa körning rensar resultatkatalogen.

Kontraktstesterna i `scripts/server-diagnostics.test.mjs` kör riktiga Playwright-processer med en syntetisk server och assertioner utan browserstart. De verifierar bland annat fel trots godkända assertioner, uppstart/nedstängning, fragmenterade rader, maskering och CI-retention. Den ordinarie E2E-sviten verifierar browserflödena mot appservern.

## PGlite och import av routes

Nexts separata utvecklingsworkers importerar även auth-routen. Tidigare startade varje sådan import PGlite mot samma diskdatabas som appservern; i det riktade kontoflödet passerade två browsertester samtidigt som tre Aborted()-rejections loggades. Webpack gav samma fel. Offlineklienten initieras nu först när klienten används. Samma kontoflöde passerar då med rent serverutfall. Detta ändrar inte Neons anslutningsväg, hushållsbehörigheter eller ekonomiska regler. `src/db/pglite.test.ts` verifierar import utan initiering och faktisk fråga/transaktion.

## Sessionsisolering

Importera `test`, `expect` och `setSession` från `e2e/helpers/session`. Fixturets `session.token` och `session.otherToken` är två vanliga databassessioner för samma användare; `session.outsider.token` har en annan användare. Återanvänd en token mellan browserkontexter bara när testet avsiktligt behöver delad data.

Kör via `pnpm test:e2e`: testservern samlar samma testurval med `--list` före seedning. Fixture och seedning delar beräkningen för test-ID, `repeatEachIndex`, retry och roll. Varje vanligt försök börjar utan hushåll; hushållet skapas genom appen. Metadata `session-profile` väljer vid behov `credential`, `google`, `legacy`, `expired` eller `missing`. Inga testinloggningsroutes används.

Ordinarie E2E verifierar giltiga sessioner och samtidiga skrivningar i separata hushåll. Identitets-/discovery-kontraktet ingår i `pnpm test`. Det separata scenariot för verkliga retries körs med:

```sh
pnpm test:e2e --config=.github/fixtures/playwright/session-isolation.config.ts --repeat-each=2 --retries=1 --workers=2
```

Scenariot fallerar avsiktligt efter skrivningar i fyra första försök och kräver sedan giltig session och nytt onboardingläge i samtliga retries. Förväntat utfall är exit 0, fyra avsiktligt flaky tester och ren serverdiagnostik. Det ingår inte i ordinarie appsvit. Testserverns temporära PGlite-katalog ska vara borttagen efter körningen.
