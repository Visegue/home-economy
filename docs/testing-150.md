# #150: testnivåer och mätunderlag

Utgångspunkt: `d8fe355fdf706b18dcf6df817c345af4b1a8826e` (origin/main 2026-11-02). Endast tester och dokumentation ändras; version 0.18.0 behålls enligt testundantaget. #151, #152, #154 och produktfelet #77 ingår inte.

## Skyddade beteenden

| Område                      | Före                                                                                              | Efter och kvarvarande skydd                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shared-actions`            | Samma onboarding, osparat utkast, navigation och GET-filter i båda teman; fyra layouter per tema. | En resa med riktigt hushåll, fokusåtergång, kasta/återöppna och GET/URL/månad. Fyra valda layoutfall behåller 320 px, desktop, kort dialog och 200 % text. Fortsätt/Escape, återställt originalvärde och pending-skydd testas även i `form-dialog.test.tsx` utan server eller databas.                                                                                                                            |
| `financial-actions`         | Två identiska skapa-/registrera-/spararesor; layoutkontroller vid varje tema.                     | En riktig resa; POST hålls i pending och släpps till servern, en skrivning, fokus, bekräftelse och standarddagar efter omladdning. Samma fyra distinkta layoutrisker. Destruktivt avslut och alla posttypers modalväxling finns i oförändrade `detail-management`, `savings` och `budget`.                                                                                                                        |
| `auth-actions`              | Två resor per tema, många skärmbilder och en mockad återställningsbegäran.                        | Två resor totalt med smal skärm och 200 % text i olika teman: publika länkar, riktiga sidor, hushållsskapande/pending och kontodialogens fokus. Mockad reset flyttas till befintliga `auth/forms.test.tsx`: verkliga användarhändelser, token/lösenord, en begäran, avstängda kontroller och lyckad återgångslänk. Befintliga fel-/retryfall återanvänds.                                                         |
| `row-details`               | Samma radmekanik och edit/end-loop för fyra typer, följt av touch i samma långa test.             | En cellöppning med fokus för varje typ. Gemensamma tangentbord, textmarkering/kopiering, drag och icke-aktiva rubriker/totalrad provas på sparande. Edit/end-dubbletten tas bort till förmån för befintlig riktig `detail-management` för alla typer. Touch är ett eget fall med riktig scroll, ingen oavsiktlig dialog, därefter tap och fokus. Identitet, datumversioner, URL och historik är kvar oförändrade. |
| Beräkningar och giltighet   | Rena ekonomiska tester startade jsdom.                                                            | Sju befintliga filer använder Node: domänbudget, avräkning, budgetmodell, budget/avräkning, periodmodell, sparande och inkomstvalidering. Inga regler eller assertioner tas bort.                                                                                                                                                                                                                                 |
| Säkerhet och bestående data | Riktiga integrationer och browserresor.                                                           | `auth.integration`, forced RLS/hushållsisolering, PGlite queries/transaktioner, databasbaserad månadsöversikt, sessionsisolering och sparande efter omladdning lämnas kvar. Serverfelgrind, CI-retries och workers ändras inte.                                                                                                                                                                                   |

Det lilla layouturvalet ersätter en kartesisk tema-/viewportmatris. Båda teman förekommer; temat motiverar inte att samma mutation körs igen. Ingen CSS-geometri flyttas till jsdom. Tidigare breddfel, textklippning och onåbara åtgärder kontrolleras fortfarande med browserns faktiska mått. Mobilens tangentbord/reflow och formulärtypbyte skyddas också av oförändrade `form-reflow`, `form-validation`, `contextual-help` och `form-hierarchy`; ingen total revision av dessa gjordes.

#164:s bildruteindelade `Input.dispatchTouchEvent` behålls. Inga fler retries eller toleransändringar införs. Testets förutsättningar kontrollerar att raden träffas, är synlig och inte scroll-låst. Assertionerna kräver minskad faktisk `scrollY`, ingen dialog efter gesten och fungerande efterföljande tap. Äldre touchfel från #60/#115 och Linux-felet före #164 förklaras inte generellt av denna ändring.

## Jämförelse

Mac arm64, Node 24.21.0, Bun 1.3.14, pnpm 11.24.0, Playwright 1.64.1 och Chromium headless-shell 156.0.8078.4 (build 1248). `check:local` passerade. Två lokala workers, noll retries, syntetiska sessionsfixturer och ny temporär PGlite-databas per serverstart. Inga samtidiga lokala check-/E2E-jobb. Mätningarna använder de fyra namngivna filerna med `--repeat-each=3`, samma maskin och konfiguration. Ny dev-cache före båda mätningarna; uppstart/kompilering ingår i totalen. Repetitionerna delar respektive servers uppvärmda cache och är ett litet lokalt stickprov, inte ett prestandalabb eller statistiskt stabilitetsbevis.

| Mätning | Browserutfall               | Serverutfall | Playwright-tid | Skärmbilder |
| ------- | --------------------------- | ------------ | -------------- | ----------- |
| Före    | 30/30 direkt, 0 retries/fel | Rent         | 148,8 s        | 387         |
| Efter   | 21/21 direkt, 0 retries/fel | Rent         | 76,8 s         | 153         |

Antalet resor i de fyra filerna går från 10 till 7 (hela sviten 50 till 47), medan fyra nya komponentfall läggs till. Summan av testfallens arbetstid går från 239,1 till 108,4 s; Playwrights totala väggtid minskar cirka 48 % och skärmbilderna cirka 60 %. Inga fel eller retries observerades i någon av mätningarna, så underlaget visar minskad körkostnad men ingen skattad förbättring av generell felfrekvens. Touchfallet passerade tre gånger med den mindre fixturen och den befintliga gesten; mobilbilden granskades också.

Kommandot är `pnpm test:e2e e2e/shared-actions.spec.ts e2e/financial-actions.spec.ts e2e/auth-actions.spec.ts e2e/row-details.spec.ts --repeat-each=3` genom `agent:job`. Rårapporter och jobbresultat sparas lokalt under `.tmp/issue-150/{before,after,full}`; de läggs inte i Git. Före-rapporten anger ren källversion; efter/full anger samma bas med arbetskopieändringar. Testfilernas SHA-256 sparas i `after/test-sources.json` för kontroll mot den committade PR-headen. Alla tre E2E-jobb avslutade med exit 0 och `cleanup: complete`.

## Standards

Arbetskopiegranskningen fann inga dokumenterade standardbrott eller åtgärdbara kodlukter. Oförändrad version följer testundantaget.

## Spec

Arbetskopiegranskningen fann inga kodfynd eller scope-utökningar. Det kvarstående kravet på full verifiering hanteras nedan. Sammanlagt: Standards 0 fynd (ingen högsta allvarlighetsgrad); Spec 0 kodfynd (ingen högsta allvarlighetsgrad).

## Verifiering och disposition

- Fokuserade lägre tester: 82/82 godkända. En tillfällig diagnos bekräftade att en ren ekonomisk testfil kör utan `document`; diagnosassertionen togs bort.
- Första `pnpm check` stoppade på två nya typfel i testerna (överflödig jämförelse efter typnarrowing och Testing Librarys rollalternativ). De rättades före fortsatt verifiering; detta var implementationsfel, inte instabilitet.
- Slutlig `pnpm check`: grön, 389 tester och verifieringsbygge. Full `pnpm test:e2e`: 47/47 direkt godkända, 0 retries/fel, rent serverutfall (138.4 s). CI redovisas på PR:en.
- Arbetskopiegranskning mot källversionen: Standards 0 fynd; Spec 0 kodfynd. Den öppna verifieringspunkten om touchfixturens scrollutrymme täcks av de tre godkända repetitionerna. Oberoende PR-granskning av den pinnade committade ändringen redovisas på PR:en.

Tidigare fel räknas inte bort för att denna mätning är grön. #152:s tidigare 5/10-sekunderskonflikt är rättad i #166; mätning av PGlite-uppstart/marginal återstår separat. #151:s nekade processkontroll och #154:s separata servergrupp kräver egna livscykeltester. #77:s RSC-abort/HTTP503 får inte anses löst av mockade UI-fall eller denna omfördelning.
