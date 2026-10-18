# Lokal utveckling

Installera projektets verktyg, konfigurera en lokal miljö och starta appen. För enbart verifiering behövs ingen egen databas eller auth-konfiguration; se [utveckla och testa](testing.md).

## Förutsättningar

- Next.js 16, React 19 och TypeScript
- Tailwind CSS 4 och shadcn/ui (Radix)
- Neon Postgres, Drizzle ORM och Better Auth (verifierad e-post/lösenord och Google OAuth)
- PGlite för tester och offlineutveckling utan Docker eller molnprojekt
- Oxlint, `tsc`, Vitest, Testing Library och Playwright
- Bun för appen, byggen, databasskript och övriga kompatibla verktyg
- pnpm 11 som pakethanterare; Node.js 24 LTS för pnpm och testkörare

Använd pnpm som pakethanterare för samma låsfil lokalt och i CI. Paketets skript väljer Bun där det fungerar. Vitest med jsdom, Playwrights testkörare och Next.js med PGlite använder Node 24 efter verifierade kompatibilitetsfel under Bun. `pnpm dev` väljer automatiskt Node i PGlite-läge och Bun med Neon. `.tool-versions` anger Bun 1.3.14 och Node 24 och används lokalt och i CI. `package.json` begränsar Node till `24.x`.

## Installation och start

Med mise installerat, kör `mise install` för att installera projektets Bun- och Node-versioner. Aktiverad mise väljer dem automatiskt i projektkatalogen. För enskilda kommandon fungerar även `mise exec -- pnpm check`. Med en annan versionshanterare, installera versionerna i `.tool-versions` innan du fortsätter.

```bash
corepack enable
pnpm install
cp .env.example .env.local
```

Fyll i `.env.local` enligt [databasguiden](database.md) och [inloggningsguiden](authentication.md), med minst ett inloggningssätt. Sätt en lokal `BETTER_AUTH_SECRET` (generera exempelvis med `openssl rand -base64 32`) och behåll `BETTER_AUTH_URL=http://localhost:3000`. Välj antingen egen Neon-branch med båda anslutningarna eller uttryckligt offline-läge enligt [PGlite](database.md#offline-med-pglite). Använd aldrig produktionsanslutningen lokalt. Starta sedan:

```bash
pnpm db:migrate
pnpm dev
```

Öppna [localhost:3000](http://localhost:3000). Appvyerna kräver en session som valideras i databasen. Ekonomidatan kan även köras lokalt med PGlite.

Kör [förtest och kvalitetskontroller](testing.md#förtest) efter installationen. För agenter som kör längre jobb finns [verktygsguiden](agents/tool-jobs.md).

[Till dokumentationsindexet](README.md) · [Till projektets README](../README.md)
