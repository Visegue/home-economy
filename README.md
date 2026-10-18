# Hemekonomi

En svensk app för hushållets ekonomi, byggd utifrån en Excel-arbetsbok. Månadsöversikten samlar inkomster, utgifter, avsättningar, avräkningar och sparande. Produktkartan omfattar även konton, lån och investeringar; se [arbetsbokens produktkarta](docs/workbook-mapping.md). All demodata i repot är syntetisk.

## Hitta rätt

- [Använd appen](docs/usage.md) – månadsöversikt, registreringar, historik och kontoinställningar.
- [Kom igång lokalt](docs/local-development.md) – verktyg, installation och start.
- [Utveckla och testa](docs/testing.md) – förtest, kvalitetskontroller och E2E.
- [Konfiguration och inloggning](docs/authentication.md) – Google, e-post och miljöinställningar; [databas och migrationer](docs/database.md) för anslutning och schemaändringar.
- [Arkitektur och UI](docs/README.md#arkitektur-domän-och-ui) – domän, komponenter, formulär och ADR.
- [Deploy och återställning](docs/release-runbook.md) – release, driftfel och produktionsåtergång.
- [Säkerhet](SECURITY.md) – rapportera brister privat.

[Alla guider, beslut och historiskt underlag](docs/README.md).

## Snabbstart

Installera Bun och Node 24 enligt [.tool-versions](.tool-versions), exempelvis med `mise install`. Aktivera verktygen i PATH innan du kör:

```bash
corepack enable
pnpm install
cp .env.example .env.local
```

Konfigurera `.env.local` **före start** enligt [installationsguiden](docs/local-development.md#installation-och-start): välj [egen Neon-branch eller lokal PGlite](docs/database.md), sätt lokal auth-hemlighet och konfigurera [Google eller verifierad e-post/lösenord](docs/authentication.md). PGlite ersätter databasen men kräver fortfarande inloggningskonfiguration.

```bash
pnpm db:migrate
pnpm dev
```

Öppna [localhost:3000](http://localhost:3000) och logga in. När databasen är uppdaterad räcker `pnpm dev` för senare starter.

För enbart kvalitetskontroll efter installation behövs ingen `.env.local`, databas eller egna auth-nycklar:

```bash
bun scripts/check-local-environment.mjs
pnpm check
```

Se [testguiden](docs/testing.md) för förtestets resultat, separata kontroller och [E2E-resursdelning](docs/e2e-resources.md). Agenter följer [AGENTS.md](AGENTS.md) och [verktygs- och jobbguiden](docs/agents/tool-jobs.md).

## Licens

[MIT](LICENSE): programvaran ges i befintligt skick, utan garanti. Ansvarsfriskrivningen garanterar inte ansvarsfrihet i alla jurisdiktioner.
