# Arkitektur

## Översikt

Next.js App Router hanterar UI, serverrendering och server actions. Better Auth sköter verifierad e-post/lösenord, Google OAuth och databassessioner. Drizzle ansluter till Postgres, som lagrar både auth- och ekonomidata.

Utveckling och drift använder isolerade Neon-branches med poolade anslutningar. PGlite används för tester och uttryckligt offline-läge. Månadsöversikten läser hushållsdata; kvarvarande fixtures är syntetiska prototyper.

```mermaid
flowchart LR
  Browser["Webbläsare"] --> Next["Next.js Server Components och actions"]
  Next --> Auth["Better Auth och Google OAuth"]
  Auth --> Session["Databasvaliderad session"]
  Session --> Context["Användarkontext för transaktionen"]
  Context --> RLS["Tvingande RLS per hushåll"]
  RLS --> DB["Miljöns Neon-branch"]
```

## Säkerhetsgränser

- OAuth- och auth-hemligheter samt databasanslutningar finns bara på servern.
- Proxy-lagret kontrollerar cookien. Skyddade sidor och ändringar validerar alltid sessionen i Better Auths databas.
- Alla Google-konton kan registrera sig. En autentiserad server action skapar användarens eget ägarhushåll efter första inloggningen.
- Lösenordskonton kräver verifierad e-post. Google länkas bara till ett befintligt konto med samma lokalt verifierade adress.
- OAuth-token krypteras med auth-hemligheten. OAuth-state är engångsposter i databasen.
- Previews använder OAuth Proxy via produktionsdomänen. En separat proxyhemlighet delas med Production för kortlivade profiler; auth-hemligheter och databaser är separata.
- Resend skickar verifierings- och återställningsmejl från servern. API-nyckeln lämnar aldrig servern.
- Alla hushållstabeller har tvingande RLS för läsning, tillägg, ändring och borttagning.
- Medlemskontroll ligger i schemat `private`. All hushållsdata nås via `withAuthenticatedDatabase()`, som validerar sessionen och sätter `app.user_id` för transaktionen.
- Främmande nycklar och vanliga hushålls-/datumfrågor har index.
- Hemligheter och verkliga ekonomidata får inte checkas in.

## Databas och miljöer

Appen återanvänder en liten pool med prepared statements avstängda för Neons transaktionspoolning.

| Anslutning               | Roll och användning                                                        |
| ------------------------ | -------------------------------------------------------------------------- |
| `DATABASE_URL`           | Poolad, branchspecifik `home_economy_runtime` utan admin- eller RLS-bypass |
| `DATABASE_MIGRATION_URL` | Direkt ägaranslutning, endast för migrationer                              |

App och migrationsverktyg läser samma lokala miljöfiler. Saknad `DATABASE_URL` ger fel. PGlite kräver `DATABASE_PROVIDER=pglite` och är förbjudet i drift.

Ett Neon-projekt i AWS Frankfurt innehåller tre miljöer:

- `production`: rotbranch för produktion.
- `development`: långlivad branch för staging och previews.
- `dev/alexander`: lokal utveckling, skapad från tom stagingdatabas.

Konton och sessioner är separata per branch. PR:er får inga egna databasbranches av kostnadsskäl. Lokala anslutningar finns i Git-ignorerade `.env.local`, hostade runtime-anslutningar i Vercel och migrationsanslutningar i GitHub environments.

`pnpm db:check` testar auth-lagring, runtime-roll, tvingande RLS och transaktionsisolering i Neon; testdata rullas tillbaka. PGlite ger snabba lokala tester. Google-inloggning och Vercels OAuth-proxy behöver även testas i webbläsaren.

Bakgrund: [plattform](adr/0001-data-and-auth-platform.md), [databasreleaser](adr/0002-database-aware-releases.md) och [appversionering](adr/0003-app-versioning-and-github-releases.md).

## Deploy

GitHub Actions sköter produktion och previews efter godkända kvalitets- och webbläsartester. Vercels automatiska Git-deploys är avstängda för alla branches.

**Produktion:** bygg i Vercel utan att flytta domänen, migrera med ägaranslutningen, kör `db:check` med runtime-rollen och smoketesta inloggningssidan. Först därefter flyttas domänen till nya bygget (promotion). Ett separat jobb publicerar GitHub Release för en ny SemVer-version i `package.json`. Hela produktionskörningar köas.

**Preview:** `Deploy preview` migrerar `development`, kör `db:check`, deployar i Vercel och smoketestar inloggningssidan. Test och deploy använder samma PR-mergecommit. Jobbet använder GitHub-miljön `staging`, köas över alla PR:er och avbryts inte av nya commits under migration.

Preview-jobbet sparar runtime-anslutningen som krypterad, branchspecifik variabel i Vercel. Ägaranslutningen stannar i GitHub Actions migrationssteg. Vercels API används direkt för projektbegränsade tokens utan CLI:ts användaruppslag. Jobbet verifierar GitHub-kopplingen och väntar på `READY` för rätt projekt och testad commit.

Bara PR:er från samma repo, utom Dependabot, får preview-jobbet. En obligatorisk kontroll stoppar externa ändringar av databas-, release- och CI-filer utan stagingvalidering. Previews delar schema och data. Motstridiga migrationer måste samordnas. Migrationer och branchspecifika Vercel-variabler finns kvar efter stängd PR.

Använd expand/contract för att hålla föregående appversion kompatibel om promotion uteblir. Se [release-runbooken](release-runbook.md) för felhantering och begränsningar vid återgång.

## Pengar och datum

Beräkningar använder heltals-öre; Postgres använder `numeric(14,2)`. Månadsperioder lagras som månadens första dag och valideras i databasen. Datum utan tid använder `date`, auditfält `timestamptz`.

### Månadsöversiktens läsmodell

`getMonthlyOverview(period)` i `src/features/dashboard/monthly-overview.ts` är månadssidans gemensamma läsingång. Den validerar `YYYY-MM` och läser inkomster, utgifter, avräkningar, sparande och hushållspersoner i en kort, skrivskyddad `REPEATABLE READ`-transaktion via `withAuthenticatedDatabase()`. Samma databasanslutning, ögonblicksbild och transaktionslokala `app.user_id` gäller för samtliga frågor; tvingande RLS och ägarhushållsfiltret behålls. Inställningarna kan fortsatt använda den fristående budgetläsningen.

Läsmodellen väljer månadens giltiga poster och returnerar oformaterade belopp i heltals-öre, inklusive varje posts månadsbelopp, separata tabellsummor och totalt att föra över. Överföringar är månadsavsättningar för utgifter plus avräkningar och sparande. Kvarvarande belopp är inkomst minus dessa poster och direkta utgifter. Saknad inkomst ger `null`; registrerad nollinkomst är ett känt belopp. En betalning från redan reserverade medel dras inte av igen.

Månaden är en rapporteringsperiod över långlivade poster, inte en separat plan eller ett lagrat kontosaldo. React-komponenterna formaterar beloppen och visar de aktiva posterna; de räknar inte om månadsbelopp eller tabellsummor. Avräkningarnas prognos för hela målbeloppet visas också, utan att den behandlas som månadens kostnad.

Integrationstesterna i `monthly-overview.test.ts` använder PGlite, verkliga frågor och en begränsad RLS-roll. De täcker transaktionsläge, hushållsisolering, historik, avrundning, typbyten och avräkningarnas sista överföring. `pnpm db:check` verifierar runtime-åtkomst och RLS på utvecklingsbranchen eller i staging; PGlite ersätter inte denna kontroll.

### Inkomster

`household_incomes` lagrar namn, månadsbelopp, startmånad och valfri slutmånad. Båda gränsmånaderna ingår. Inställningarna hanterar flera källor; översikten summerar månadens aktiva inkomster.

Valfri inkomst vid hushållsskapande gäller från aktuell månad i Sverige, utan slutdatum. Upprepad onboarding skapar inga nya inkomster.

Äldre `monthly_plans` bevaras som inkomster för respektive månad. `household_member_income` kopieras till inkomster utan slutdatum från månaden för senaste uppdateringen (`Europe/Stockholm`); tidigare giltighet är okänd. Den gamla tabellen behåller RLS men används inte för nya inkomster. All åtkomst går via `withAuthenticatedDatabase()` och tvingande RLS.

### Utgifter och sparande

Poster har startmånad och valfri slutmånad som ingår i perioden. Vid ändring från en senare månad avslutas gamla raden månaden före och en ny skapas i samma autentiserade transaktion. Raden låses för att undvika överlapp vid samtidiga anrop.

Ändring i en avslutad period påverkar bara den perioden, inte senare versioner. Avslut från startmånaden döljer hela perioden; annars behålls tidigare månader. Länkad planhistorik och tidigare utgiftsägare bevaras. Månads- och årsöversikten summerar bara månadens giltiga poster.

Migration 0010 lägger till nullable datumfält och constraints. Äldre sparande utan startmånad gäller även tidigare månader fram till en ändring; okänd historik gissas inte. Borttagna poster förblir dolda. Nytt sparande får vald startmånad.

### Avräkningar

Domänens engelska namn är **Replacement Reserve** och **Replacement Contribution**, med svenska visningsnamn enligt [CONTEXT.md](../CONTEXT.md). Befintliga identifierare som `settlement`, `settlementInOre` och `SettlementsSection` är tekniska namn för samma område, inte en separat domänbetydelse. Den nya läsmodellen använder `replacementReserves` och `replacementContributionsInOre`. Inga tabeller, enumvärden eller historiska migrationer döps om i denna refaktorering.

Avräkningar lagras i `recurring_items` med destination `settlement` och använder samma ägare, versionshistorik och tvingande RLS som andra utgifter. Migration 0013 lägger till beräkningsstart, påslag i kronor eller procent samt årlig inflation. `null` betyder att respektive justering är avstängd.

Målbeloppet är `(kostnad + påslag) × (1 + inflation / 100)^(månader / 12)`, avrundat till öre. Månader räknas från planens startmånad till nästa utgiftsmånad. Avsättningen fördelas från startmånaden till månaden före utgiften, minst en månad. De sista överföringarna justeras så att summan blir exakt målbeloppet. Standardvärdena i formuläret är 10 procent påslag och 2 procent inflation; båda kan stängas av.

Avsättningen upphör i utgiftsmånaden (efter startmånaden för en plan som betalas samma månad). Posten finns kvar för hantering. Ett nytt utgiftsdatum startar en ny plan från vald ändringsmånad. Om datumet behålls bevaras beräkningsstarten, så en namnändring inte höjer månadsavsättningen. Det är en budgetplan, inte ett kontosaldo: faktiska insättningar, uttag och avkastning räknas inte av. Avräkningar räknas en gång bland utgifterna och visas separat under överföringar.

## Nästa steg

Månadsöversikten visar inkomster, direkta utgifter, avsättningar, avräkningar och sparande. Bekräftade överföringar, öronmärkta kontosaldon, förfallna betalningar, investeringsavkastning och beräkning av tillgängliga medel/nettoförmögenhet ingår ännu inte. Begreppen finns i domänglossariet men ska inte tolkas som redan implementerad funktionalitet.
