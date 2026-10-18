# Databas och migrationer

Konfigurera rätt miljö före anslutning eller migration. Guiden äger databasinstallation och arbetsgången vid schemaändringar.

Alla miljöer ligger i Neon-projektet [home-economy](https://console.neon.tech/app/projects/wandering-king-47243958), AWS Frankfurt (`aws-eu-central-1`), valt som närmaste tillgängliga region till Sverige.

| Miljö            | Neon-branch              | Data                               |
| ---------------- | ------------------------ | ---------------------------------- |
| Lokal utveckling | `dev/alexander`          | Lokala konton och integrationstest |
| Staging/preview  | `development`            | Gemensam testdatabas för previews  |
| Produktion       | Rotbranchen `production` | Verklig hushållsdata               |

Varje utvecklare ska ha en egen branch, exempelvis `dev/<namn>`, med syntetiska data. Lägg den poolade runtime-anslutningen i `DATABASE_URL` och den direkta ägaranslutningen i `DATABASE_MIGRATION_URL` i Git-ignorerade `.env.local`. App och migrationsverktyg läser samma miljöfil. Prepared statements är avstängda för transaktionspoolning.

## Databasändringar

Schema finns i `src/db/schema/` och migrationer i `drizzle/`. Ändra schemat först. Samma Drizzle-schema och SQL-migrationer används överallt. Databaskommandona har olika syften:

| Kommando           | Vad det gör                                                                                                                                                                    | När det behövs                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `pnpm db:generate` | Jämför `src/db/schema/` med tidigare schemasnapshot och skapar migrationsfiler i `drizzle/`. Ändrar inte databasen.                                                            | Efter en schemaändring. Granska genererad SQL innan migration.                                  |
| `pnpm db:migrate`  | Kontrollerar migrationshistoriken och applicerar väntande SQL-migrationer. Kräver `DATABASE_MIGRATION_URL` för Neon/Postgres; stöder även PGlite.                              | När databasen behöver uppdateras till kodens schema. Redan applicerade migrationer hoppas över. |
| `pnpm db:check`    | Verifierar auth-lagring, runtime-rollens rättigheter, tvingande RLS och transaktionsisolering via `DATABASE_URL`. Syntetiska testposter rullas tillbaka. Kräver Neon/Postgres. | Efter migration eller ändrad databaskoppling eller behörighet.                                  |
| `pnpm db:studio`   | Öppnar Drizzle Studio för att läsa och redigera data i Postgres. Använder `DATABASE_MIGRATION_URL`, annars `DATABASE_URL`.                                                     | Vid manuell inspektion. Med ägaranslutningen har verktyget större rättigheter än appen.         |

Vid en schemaändring är arbetsgången:

```bash
pnpm db:generate
# Granska SQL-filerna i drizzle/ innan nästa steg.
pnpm db:migrate
pnpm db:check
```

Studio är ett separat inspektionsverktyg och ingår inte i migrationsflödet. För vanlig lokal utveckling räcker `pnpm dev` när databasen är uppdaterad; det kommandot kör inga migrationer.

## Offline med PGlite

Saknad `DATABASE_URL` ger fel. Välj offline-läge uttryckligen med `DATABASE_PROVIDER=pglite`:

```bash
DATABASE_PROVIDER=pglite pnpm db:migrate
DATABASE_PROVIDER=pglite pnpm dev
```

PGlite är förbjudet i produktionsläge och på Vercel. Isolerade tester använder PGlite utan att röra utvecklingsdatabasen.

## Åtkomst och konton

Hushållsdata skyddas av tvingande row-level security (RLS). All läsning och skrivning går via `withAuthenticatedDatabase(operation)`, som validerar sessionen och sätter användarkontext för enbart transaktionen.

Inga Neon-branches skapas automatiskt per PR. Framtida behov av sådan isolering kräver en separat kostnadsbedömning.

Better Auth lagrar konton och sessioner per databas. Samma Google-identitet kan användas i alla miljöer, men appkonton och hushåll är separata. Lokalt används localhost-klienten och lokal `BETTER_AUTH_SECRET`. Tidigare PGlite-konton flyttas inte automatiskt. Mejlverifiering och lösenordsåterställning kräver lokala Resend-inställningar även med Neon.

Se [inloggning](authentication.md) för auth-inställningarna och [release-runbooken](release-runbook.md#migrationshistorik-och-hemligheter) för historikkontroll och säkra produktionsmigrationer.

[Till dokumentationsindexet](README.md) · [Till projektets README](../README.md)
