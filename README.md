# Hemekonomi

En svensk webbapp för att planera hushållets ekonomi utan kalkylbladskänslan. Den första versionen översätter en historisk Excel-arbetsbok till tydliga produktområden: månadsplan, kassaflöde, återkommande poster, konton och lån, sparmål samt investeringar.

Dashboarden använder en varm sandfärgad grund med aubergine, dammigt blått, senap och salvia. All incheckad demodata är syntetisk.

## Månadsbudget

- **Månaden** visar sparad månadsinkomst, direkta utgifter, avsättningar och kvarvarande belopp eller underskott. Årslistan jämför årets tolv månader.
- Registrera namngivna inkomstkällor under **Inställningar → Hushållets inkomster**. Varje källa har ett månadsbelopp efter skatt, startmånad och valfri slutmånad. Båda gränsmånaderna ingår; utan slutmånad gäller inkomsten tills vidare. Alla aktiva källor summeras per månad.
- Vid ändrat belopp: avsluta den gamla inkomsten och skapa en ny från nästa månad. Befintliga månadsregistreringar migreras till egna inkomstposter för sina ursprungliga månader. Äldre medlemsinkomster blir egna källor utan slutdatum, från månaden för senaste uppdateringen.
- Lägg till direkta månadsutgifter eller avsatta utgifter med intervall på 2, 3, 6, 12 eller 24 månader och nästa betalningsdatum. Utgifterna gäller från vald månad och framåt.
- Avsättningen är beloppet delat med antalet månader, avrundat till närmaste öre per utgift. Betalningen räknas inte en gång till i månadsbudgeten. Befintligt avsättningssaldo och eventuell upphämtning inför första betalningen ingår inte.
- Skapa medlemmar under **Inställningar** och välj valfritt flera ägare per utgift. Namnen ger ingen inloggningsåtkomst och påverkar inte summeringen.
- **Ta bort** tar bort utgiften ur hela budgeten, även tidigare månader. Den lagrade posten behålls för eventuella kopplingar till månadsplaner.

Den första vyn använder hushållets sparade data. Kör `pnpm db:migrate` innan den nya versionen startas mot en befintlig databas.

## Teknik

- Next.js 16, React 19 och TypeScript
- Tailwind CSS 4 och shadcn/ui (Radix)
- Neon Postgres, Drizzle ORM och Better Auth med verifierad e-post/lösenord samt Google OAuth
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

Öppna [http://localhost:3000](http://localhost:3000). Alla appvyer kräver en databasvaliderad session. Konfigurera minst ett inloggningssätt enligt nedan; ekonomidatan kan fortfarande köras helt lokalt i PGlite.

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

### Isolerade tester och resursanvändning

Databastesterna kör migrationerna i PGlite och testar RLS med en begränsad roll.
Playwright skapar en separat temporär PGlite-databas med syntetiska användare och
sessioner innan appen startar. Testerna verifierar hushållsskapande, återbesök och
nekad åtkomst med saknad eller utgången databassession. Appens vanliga
sessionskontroll används; ingen testinloggningsroute finns i appen.
Den temporära databasen tas bort när testservern stängs.

Dessa tester ansluter inte till Neon och skickar inga riktiga mail. De testar inte
Googles OAuth-flöde eller leverans av verifierings- och återställningsmail.
`pnpm db:check` är en separat integrationskontroll mot den konfigurerade
Neon-utvecklingsbranchen och förbrukar Neon-kvot trots att testdata rullas tillbaka.
Kör den lokalt vid ändringar i databaskoppling, migrationer eller behörigheter.
Den ingår inte i `pnpm check` eller Playwright, men körs i CI:s deployjobb efter
migrationerna för preview respektive produktion.

CI sparar Playwright-rapporter och traces vid fel i sju dagar. Testkörningar och
rapporter använder GitHub Actions-tid och lagring, men ingen Neon-kvot.
CI kör också `pnpm db:generate` och stoppar en PR om Drizzle genererar
oincheckade migrationsfiler. En schemaändring kan därför inte mergas utan sin
migration.

### Produktionsrelease

Efter en merge till `main` väntar produktionsjobbet på både kvalitetskontroller
och Playwright. Därefter byggs en staged Vercel-deployment utan produktionsdomän,
alla väntande Drizzle-migrationer appliceras mot Neon med den direkta
ägaranslutningen och `pnpm db:check` verifierar runtime-roll och RLS. Först när
samtliga steg lyckas, inklusive ett HTTP-smoketest av inloggningssidan på den
staged deploymenten, promoveras den till produktionsdomänen.

Appens releaseversion är `version` i `package.json` och visas i produktion som
en diskret rad längst ned under **Inställningar**. Preview använder samma kompakta
layout. När raden öppnas visas dess gren och faktiskt deployade commit, så att
den planerade releaseversionen inte misstas för en publicerad. Full SemVer 2.0.0
stöds (`MAJOR.MINOR.PATCH`, valfri prerelease och
byggmetadata), med GitHub-taggar som börjar på `v`. Ändringar i app, beroenden,
migrationer eller releaseskript kräver en högre version än på `main`; den
obligatoriska `quality`-kontrollen stoppar annars merge och en botkommentar
förklarar spärren. Dokumentations-, testfil- och CI-ändringar kan behålla
versionen. Byggmetadata (`+...`) ensam räknas inte som höjning.

När en ny version har promoverats till produktion skapar CI taggen och en
GitHub Release med automatiskt genererade ändringsnoteringar. En prerelease på
`main` deployas också till produktion, men markeras som prerelease på GitHub.
En merge utan versionshöjning deployas fortfarande, men skapar ingen ny release. Se
[release-runbooken](docs/release-runbook.md) för versionsval och felhantering.

GitHub-miljön `production` måste innehålla följande secrets:

- `DATABASE_URL`: poolad runtime-anslutning med rollen `home_economy_runtime`
- `DATABASE_MIGRATION_URL`: direkt ägaranslutning utan pooler
- `VERCEL_TOKEN`: token med deploybehörighet till Vercel-projektet
- `VERCEL_ORG_ID`: Vercel-teamets ID
- `VERCEL_PROJECT_ID`: Vercel-projektets ID

Produktionskörningar serialiseras så att migration, promotion och GitHub Release
för en commit avslutas innan nästa produktionskörning börjar. Vercels automatiska
Git-deployments är avstängda för alla branches i `vercel.json`; GitHub Actions
sköter både produktion och previews. Databasmigrationer ska vara
bakåtkompatibla med föregående appversion. Destruktiva ändringar delas upp enligt
expand/contract så att en misslyckad promotion kan lämna den gamla deploymenten
körande mot det nya schemat. Se [release-runbooken](docs/release-runbook.md) för
felhantering och återställning.

### PR-previews och migrationer

Vid PR från en branch i samma repo kör GitHub Actions först kvalitetstester och
Playwright. Jobbet `Deploy preview` använder därefter GitHub-miljön `staging`
för att köra `pnpm db:migrate` och `pnpm db:check` mot Neons `development`-branch.
Vercel-previewen skapas endast om båda databasstegen lyckas. Preview-länken visas
på GitHub-deploymenten när smoketestet också har lyckats. Även draft-PR:er får
previews. Fork- och Dependabot-PR:er kör bara isolerade tester; en separat
obligatorisk kontroll stoppar merge om de ändrar databas-, release- eller
CI-filer utan stagingvalidering. Granskade sådana ändringar måste först tas in
på en betrodd branch i repot och där köras genom preview-jobbet.

Följande secrets krävs i GitHub-miljön `staging`:

- `DATABASE_URL`: poolad runtime-anslutning till `development`
- `DATABASE_MIGRATION_URL`: direkt ägaranslutning till samma branch
- `VERCEL_TOKEN`: token med deploybehörighet till projektet
- `VERCEL_ORG_ID`: Vercel-teamets ID
- `VERCEL_PROJECT_ID`: Vercel-projektets ID

Auth- och e-postinställningar hämtas från Vercels Preview-miljö. Runtime-anslutningen
sparas från `staging` som en krypterad, branchspecifik Preview-variabel via Vercels API
och används av både bygget och appen; migrationsanslutningen
ska inte läggas i Vercel. Jobbet förbrukar Neon-kvot och är serialiserat eftersom
alla previews delar databasen. Migrationer rullas inte tillbaka när en PR stängs.
Samordna schemaändringar mellan PR:er och håll dem bakåtkompatibla. Nya
Neon-branches per PR skapas inte automatiskt för att inte öka resursförbrukningen.

Preview-jobbet använder Vercels projekt- och deployment-API direkt för att stödja
projektbegränsade tokens utan CLI:ts användaruppslag. Det verifierar kopplingen
till GitHub-repot och väntar på `READY` för rätt projekt och testad commit.
Branchspecifika databasvariabler finns kvar i Vercel när en PR stängs.

## Databas

Lokal apputveckling använder Neon-branchen `dev/alexander` i samma projekt som Preview och Production. Lägg dess poolade runtime-anslutning i `DATABASE_URL` och dess direkta ägaranslutning i `DATABASE_MIGRATION_URL` i den Git-ignorerade `.env.local`. Appen och migrationsverktygen läser samma miljöfil. En ny utvecklare ska använda en egen branch, exempelvis `dev/<namn>`, med syntetiska testdata.

Drizzle-schemat och samma SQL-migrationer används i alla miljöer:

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:check
pnpm db:studio
```

Lokalt och i drift används en poolad Neon-anslutning med den begränsade rollen `home_economy_runtime` i `DATABASE_URL`. Den separata ägaranslutningen i `DATABASE_MIGRATION_URL` används endast för migrationer. Prepared statements är avstängda för kompatibilitet med transaktionspoolning.

`pnpm db:check` verifierar runtime-rollens rättigheter, auth-tabeller, sessionslagring, tvingande RLS och transaktionsisolering mot den konfigurerade Neon-branchen. Syntetiska testposter skapas inom en transaktion som alltid rullas tillbaka. Testet ersätter inte ett fullständigt Google- eller e-postflöde i webbläsaren.

Saknad `DATABASE_URL` ger ett tydligt fel. Offline-läge väljs uttryckligen med `DATABASE_PROVIDER=pglite`; kör då `DATABASE_PROVIDER=pglite pnpm db:migrate` och `DATABASE_PROVIDER=pglite pnpm dev`. PGlite är förbjudet i produktionsläge och på Vercel. Unit-tester och de isolerade Playwright-smoketesterna använder PGlite utan att röra din utvecklingsdatabas.

Hushållstabellerna har tvingande row-level security. All serverkod som läser eller skriver hushållsdata använder `withAuthenticatedDatabase(operation)`, som validerar sessionen och sätter användarkontext endast för den aktuella transaktionen.

Miljöerna delar samma migrationer men inte samma databasanslutning:

| Miljö            | Databas                       | Användning                                           |
| ---------------- | ----------------------------- | ---------------------------------------------------- |
| Lokal utveckling | Neon-branchen `dev/alexander` | Egen databas för lokala konton och integrationstest  |
| Staging/preview  | Neon-branchen `development`   | Integrationstest och förhandsgranskning före release |
| Produktion       | Neon-rotbranchen `production` | Verklig hushållsdata                                 |

De hostade databaserna ligger i Neon-projektet [`home-economy`](https://console.neon.tech/app/projects/wandering-king-47243958) i AWS Frankfurt (`aws-eu-central-1`), den närmaste tillgängliga Neon-regionen till Sverige. GitHub environments `staging` och `production` innehåller branchspecifika `DATABASE_URL`- och `DATABASE_MIGRATION_URL`-secrets samt projekt- och branch-ID som variabler.

Enskilda pull requests får inte automatiskt egna Neon-branches. Om en framtida
ändring kräver isolering behöver den resurskostnaden utvärderas separat.

Better Auth lagrar konton och sessioner i respektive databas. Lokal Google-inloggning använder den befintliga localhost-klienten och lokal `BETTER_AUTH_SECRET`. Samma Google-identitet kan användas i alla miljöer, men appkonton och hushållsdata är separata. Konton från tidigare PGlite-utveckling migreras inte automatiskt. Verifiering och återställning via e-post kräver lokala Resend-inställningar även när databasen är Neon.

## Inloggning

Skapa en OAuth-klient av typen “Web application” i Google Cloud och lägg till följande redirect URI lokalt:

```text
http://localhost:3000/api/auth/callback/google
```

I produktion registreras endast den stabila callback-adressen, till exempel `https://home-economy.vercel.app/api/auth/callback/google`. Vercels dynamiska PR-previews använder Better Auths OAuth Proxy: Google återvänder till produktionen, som skickar en kortlivad krypterad profil vidare till rätt preview. Produktionen skriver inte preview-användaren till sin databas.

Sätt `GOOGLE_CLIENT_ID` och `GOOGLE_CLIENT_SECRET` från produktionsklienten i både Vercel Preview och Production. `BETTER_AUTH_SECRET` ska vara miljöspecifik, medan en separat `OAUTH_PROXY_SECRET` måste ha samma värde i Preview och Production. `OAUTH_PROXY_PRODUCTION_URL` är den stabila produktionsadressen. `BETTER_AUTH_TRUSTED_ORIGINS` innehåller ett snävt mönster för projektets egna previewdomäner, exempelvis `https://home-economy-*-visegue.vercel.app`; använd inte det breda `https://*.vercel.app`.

I Preview ska `BETTER_AUTH_URL` lämnas tom så att den aktuella adressen härleds från Vercels `VERCEL_URL`. I Production sätts den till den stabila produktionsadressen. Generera auth- och proxyhemligheter med exempelvis `openssl rand -base64 32`.

E-post och lösenord använder Resend för verifiering och lösenordsåterställning. Skapa en Resend API-nyckel, verifiera avsändardomänen och sätt `RESEND_API_KEY` samt `AUTH_EMAIL_FROM`. Lösenord måste vara 12–128 tecken och e-postadressen måste verifieras före första inloggningen.

Alla Google-konton kan registrera sig. Efter den första inloggningen skapar användaren ett eget hushåll; en unik databasregel säkerställer ett personligt ägarhushåll per konto. Hushållets data skyddas därefter av tvingande row-level security även om en applikationsfråga skulle sakna ett vanligt filter.

Google och lösenord länkas automatiskt till samma användare när de har samma verifierade e-postadress. Ett befintligt Google-konto kan få ett lösenord via “Glömt lösenord?”. Google-token krypteras innan lagring och OAuth-state sparas som en engångspost i databasen.

## Dokumentation

- [Arbetsbokens produktkarta](docs/workbook-mapping.md)
- [Arkitektur och säkerhetsgränser](docs/architecture.md)
- [ADR 0001: data- och authplattform](docs/adr/0001-data-and-auth-platform.md)
- [ADR 0002: databasmedvetna releaser](docs/adr/0002-database-aware-releases.md)
- [ADR 0003: appversionering och GitHub Releases](docs/adr/0003-app-versioning-and-github-releases.md)
- [Release och återställning](docs/release-runbook.md)
- [Rapportera säkerhetsbrister](SECURITY.md)
- Databasens schema: `src/db/schema/`
- Körbara migrationer: `drizzle/`

## Licens

Projektet är licensierat under MIT. Programvaran tillhandahålls i befintligt skick utan garanti; se [LICENSE](LICENSE). Det är en bred ansvarsfriskrivning, men inte en garanti om immunitet i alla jurisdiktioner.
