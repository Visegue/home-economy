# Release och återställning

GitHub Actions sköter releasen. Efter merge till `main`:

1. Kör kvalitets- och webbläsartester.
2. Bygg i Vercel utan att flytta produktionsdomänen.
3. Applicera väntande Drizzle-migrationer i Neon.
4. Kontrollera databasroll/RLS och smoketesta `/login` på det nya bygget.
5. Flytta domänen till det godkända bygget (promotion).

Betrodda PR:er måste klara migration, databaskontroll och smoketest i staging före merge.

## Version och GitHub Release

`package.json.version` är appens SemVer-version. I produktion visas den under **Inställningar**; öppna raden för deployad commit och releaselänk. Preview visar gren och exakt byggcommit, inte planerad version eller versionen på `main`. Deployjobben skickar uppgifterna. Saknad commit visas som `okänd`.

SemVer 2.0.0 stöds: `MAJOR.MINOR.PATCH`, prerelease (`0.3.0-beta.1`) och byggmetadata (`0.3.0+build.2`). API och datamodell är inte stabila före `1.0.0`. Välj ändå medvetet:

- **Patch:** rättningar.
- **Minor:** nya funktioner.
- **Major:** avsiktligt bruten utlovad kompatibilitet.

### Krav på PR:er

App- och releaseändringar kräver högre version än `main`. Det gäller `src/`, `public/`, `drizzle/`, `scripts/`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `proxy`/`middleware`, `instrumentation` samt TypeScript-, PostCSS-, Tailwind- och bygg-/deploykonfiguration.

Testfiler samt rena dokumentations- och CI-ändringar är undantagna. `quality` stoppar annars merge; en botkommentar förklarar spärren och uppdateras när den lösts. `pnpm check` validerar versionsformatet lokalt.

Motivera versionsvalet i PR:en. Enbart `+...` höjer inte SemVer-ordningen. Om `main` hunnit få samma version, uppdatera grenen och höj igen. Vid nya releasepåverkande sökvägar: uppdatera `scripts/check-pr-version.mjs` och dess tester.

### Publicering

Efter promotion skapar **Publish GitHub release**, med separat begränsad behörighet, taggen `v<version>` på deployad commit och publicerar en GitHub Release med automatiska ändringsnoteringar. Det sker även för första releasen, utan manuell start. Inga personliga åtkomsttokens, externa releasetjänster eller nya betalkonton behövs.

Prerelease på `main` går också till produktion; GitHub-etiketten skapar ingen stagingmiljö. Oförändrad version är bara tillåten för ändringar utan releasepåverkan och deployas utan ny release. Produktionskörningar köas genom både deploy och publicering.

Kontrollera release-jobbet efter första merge. Vid fel kan appen redan vara i produktion utan GitHub Release. Följ stegen nedan. Skapa eller flytta aldrig releasetaggar manuellt. Återanvänd inte publicerade versioner.

## Migrationshistorik och hemligheter

Migrationsköraren jämför databasens tidsstämplar och SHA-256-hashar med migrationsfilerna. Historiken måste vara ett exakt prefix av filerna. På Neon hålls kontrollen och migrationen under samma databaslås.

Skriv aldrig om en applicerad migration, även om den bara körts i staging. Återställ originalfilen och skapa en ny migration. Innehåller staging en annan PR:s migration måste grenarna samordnas. Radera eller redigera aldrig historiken för att få grönt.

Preview och Production kräver varsin `BETTER_AUTH_SECRET` med minst 32 tecken. Saknad hemlighet eller utvecklingsnyckeln stoppar bygge/uppstart. Kvalitetsjobbet har en syntetisk nyckel för sitt isolerade bygge. Vercel behöver miljöns riktiga nyckel vid både bygge och körning.

## Om ett steg misslyckas

Börja med första felande steget i GitHub Actions. Vid behov: `gh run view <run-id> --log-failed`. Kopiera aldrig hemligheter eller personlig ekonomidata till issues eller publika loggar.

| Fel                                                                                      | Åtgärd                                                                                                                                                                                                                           |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bygge, migration, databaskontroll eller smoketest före **Promote production deployment** | Gamla bygget ligger kvar på domänen. Stoppa nya releaser tills orsaken är känd. Databasen kan redan vara ändrad; migrationer rullas inte tillbaka automatiskt.                                                                   |
| Promotion                                                                                | Kontrollera vilken deployment domänen pekar på i Vercel. Kör om först när migrationerna fortfarande är säkra att applicera.                                                                                                      |
| Appfel efter promotion                                                                   | Prioritera en rättande release. Återgå till äldre deployment bara efter kontroll att den förstår det nya schemat och datan.                                                                                                      |
| **Publish GitHub release**                                                               | Appen är redan promoverad. Verifiera aktiv commit i Vercel och kör om det misslyckade GitHub-jobbet. Finns taggen på annan commit: utred, flytta inte taggen. Releaseutkast måste granskas och hanteras manuellt före omkörning. |

### Schemaändringar och återgång

Dela destruktiva ändringar i flera releaser (expand/contract):

1. Lägg till nytt schema.
2. Flytta läsning och skrivning i en senare release.
3. Ta bort gammalt schema först när ingen körande app behöver det.

Återställ Neon bara som sista utväg vid verifierad dataförlust, inte som standard vid deployfel. Återställning kan förlora senare användarändringar. Den kräver separat beslut, en tillgänglig återställningspunkt och en plan för data som skrivits sedan dess.

När giltighetsperioder för utgifter/sparande används får en äldre app som ignorerar slutmånad inte återinföras: den kan summera både gamla och nya perioder. Migration 0010 är additiv, men appen måste förstå perioderna. Äldre previews med samma stagingdatabas måste också uppdateras innan de redigerar posterna.

## Staging och PR:er

Previews delar `development`. En PR:s migration påverkar därför andra previews och finns kvar efter stängning. Samordna motstridiga schemaändringar eller kör dem i turordning.

Fork- och Dependabot-PR:er saknar staging-hemligheter. Ändringar i databas-, release- eller CI-filer måste granskas och köras från en betrodd branch via `Deploy preview`. Enbart versionshöjning i `package.json` är undantagen, så externa appbidrag kan klara versionskravet. Beroenden, npm-skript och annan paketkonfiguration kräver betrodd stagingkörning.

Smoketestet kontrollerar att inloggningssidan nås via HTTPS. `pnpm db:check` kontrollerar databasåtkomst och RLS. Google OAuth och mejlleverans måste testas manuellt efter relevanta ändringar. Lägg inte riktiga användaruppgifter i CI.

## GitHub-skydd

Det publika repot har CodeQL default setup, secret scanning, push protection och privat sårbarhetsrapportering. Actions har normalt läsbehörighet och får inte godkänna PR:er. Produktion godtar bara `main`.

Main-regeln kräver kvalitetstester, Playwright, `Deploy preview` och `Preview migration gate`. Den sista hindrar känsliga fork-/Dependabot-ändringar från att godkännas genom ett hoppat preview-jobb. Ersätt skydd med likvärdiga kontroller om inställningarna ändras.

Actions är pinnade till fullständiga commit-SHA:n. Uppdatera vid behov och verifiera SHA mot rätt officiell release. Rapportera säkerhetsbrister enligt [SECURITY.md](../SECURITY.md).

## Kostnadsram

Flödet använder befintliga gratisnivåer i GitHub Actions, Vercel och Neon. Det kräver inga automatiska Neon-branches per PR, köpta observability-tjänster eller externa testkonton. Deploys, tester och databaskontroller använder ändå gratiskvoter. Vid kvotbrist: pausa nya releaser och minska onödiga körningar. Uppgradera inte automatiskt.
