---
status: accepted
date: 2026-09-16
---

# Databasmedvetna releaser med gemensam staging

## Beslut

Appen lagrar personlig ekonomidata. En missad migration har redan orsakat produktionsfel. GitHub Actions sköter därför hela releasen och validerar databasen före deploy till användare.

Alla previews delar Neons långlivade `development`-branch för att hålla projektets budget på noll kronor.

- **Betrodd PR:** kvalitetstester och webbläsartester → migrera med direkt ägaranslutning → verifiera med begränsad runtime-roll → deploya testad commit → kontrollera inloggningssidan.
- **`main`:** bygg utan att flytta produktionsdomänen → migrera → verifiera databas och inloggningssida → flytta domänen till nya bygget. Produktion godtar bara `main`.
- **Fork/Dependabot:** får inga staging-secrets. En obligatorisk kontroll stoppar ändringar i databas, auth, beroenden och release tills de granskats och körts från en betrodd branch.

## Alternativ

- **Vercels automatiska Git-deploy eller migration vid appstart:** kan släppa trafik före migration eller låta flera instanser migrera samtidigt med förhöjd behörighet.
- **Neon-branch per PR:** bättre isolering, men använder mer av Free-planens gemensamma branch- och compute-kvot. Ompröva först vid återkommande schemaändringar som inte kan samsas, med accepterad resurskostnad.
- **Manuell migration efter merge:** kan glömmas eller köras i fel ordning, som tidigare inträffat.

## Följder

- Migrationer måste stödja föregående appversion. Dela destruktiva ändringar enligt expand/contract.
- Previews delar schema och data. Samordna motstridiga migrationer; stängd PR återställer inget.
- Fel efter migration lämnar gamla produktionsbygget kvar men återställer inte databasen. Följ [release-runbooken](../release-runbook.md).
- CI och kontroller i drift använder gratiskvoter. Smoketestet täcker inte Google OAuth eller mejlleverans; testa dem manuellt vid behov.

Detta ersätter ADR 0001:s policy att skapa och ta bort en Neon-branch per PR. Övriga plattformsbeslut gäller fortsatt.
