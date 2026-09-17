---
status: accepted
date: 2026-08-29
---

# Neon, Better Auth och PGlite

Policyn om egna databasbranches per PR ersätts av [ADR 0002](0002-database-aware-releases.md). Övriga beslut gäller fortsatt.

## Beslut

Använd PostgreSQL via Drizzle i alla miljöer. Lokal utveckling kör en isolerad Neon-branch, `dev/alexander`, med samma drivrutin, runtime-roll, poolning och TLS som drift. PGlite används bara för uttryckligt offline-läge och automatiska tester.

Alla miljöer ligger i ett Neon-projekt: rotbranchen för produktion, `development` för staging och ursprungligen kortlivade `preview/pr-*` för PR:er. AWS Frankfurt (`aws-eu-central-1`) valdes eftersom Neon saknade svensk region.

Runtime använder poolad anslutning och rollen `home_economy_runtime`, utan adminrättigheter eller RLS-bypass. Migrationer använder direkt ägaranslutning.

Better Auth hanterar verifierad e-post/lösenord och Google OAuth. Samma verifierade e-postadress länkar metoderna till en användare. Auth- och ekonomidata lagras i Postgres. Tvingande RLS skyddar hushållsdata med användarkontext per transaktion.

## Alternativ

- **Supabase för databas och auth:** samlad lösning, men separata projekt ger mer administration för återkommande appstarter och binder auth och dataåtkomst till en plattform.
- **Neon Auth:** möjligt framtida alternativ. Egen Better Auth ger portabilitet och samma auth-schema i PGlite och Postgres.
- **Neon-projekt per miljö:** bortvalt. Branches ger separata scheman, data, credentials och compute utan ett helt projekt per preview/staging.
- **PGlite som lokal standard:** ändrat 2026-09-11. Enkel start testar inte Neon-anslutning, poolning eller runtime-rättigheter. Neon är nu standard; PGlite används för offline och snabba tester. Lokalt arbete kräver nätverk och använder Neon-compute.

## Följder

- Testa schemaändringar lokalt, sedan i staging före produktion.
- Ursprungskravet att skapa och städa PR-branches ersätts av ADR 0002.
- Projektet ansvarar för Better Auth-uppgraderingar och OAuth-inställningar.
- Runtime- och migrationsanslutningar är separata secrets och får aldrig checkas in.
- Free-planens avsaknad av skyddade branches gör att produktionen skyddas genom begränsade runtime-rättigheter och releaseflödet tills en betald plan används.
- Saknad runtime-anslutning ska ge fel även lokalt. Drift får aldrig falla tillbaka till PGlite. Migrationer läser samma miljöfiler som Next.js och kräver separat direkt ägaranslutning.
- Lokala auth-konton stannar i utvecklarens branch. Använd aldrig verkliga personuppgifter från produktion som testdata. Google-credentials och auth-hemligheter hålls per miljö.
- PGlite täcker inte allt i drift. `pnpm db:check` testar auth-lagring och RLS via Neons runtime-anslutning. Google OAuth och preview-proxy måste även testas i respektive miljös webbläsare.
