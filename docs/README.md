# Dokumentation

Välj guide efter uppgift. Aktuella guider äger instruktionerna för sitt ämne; kravintervjuer, avslutade granskningar och retrospektiv ligger separat nedan. [Projektets README](../README.md) innehåller snabbstarten.

## Använd appen

- [Användarguide](usage.md) – månadsöversikt, ekonomiska poster, historik, överföringar, konto och tema.
- [Domänbegrepp](../CONTEXT.md) – engelska begrepp och svenska visningsnamn, även för framtida funktioner.

## Utveckling och konfiguration

- [Lokal utveckling](local-development.md) – teknikval, verktygsversioner, installation och start.
- [Konfiguration och inloggning](authentication.md) – Google OAuth, e-post/lösenord och miljöernas auth-inställningar.
- [Databas och migrationer](database.md) – Neon-miljöer, anslutningar, PGlite och arbetsgång vid schemaändring.
- [Utveckla och testa](testing.md) – lokalt förtest, `pnpm check`, E2E och databaskontroll.
- [Lokal E2E och resursdelning](e2e-resources.md) – workers, Next-utdatalås och mätunderlag från #115.
- [E2E-diagnostik](e2e-diagnostics.md) – browser-/serverutfall, felgrind, rapporter och sessionsisolering.
- [Verktygsuppslag och verifieringsjobb](agents/tool-jobs.md) – riktad läsning, `pnpm agent:job`, deadlines och återhämtning av fullständigt underlag.

## Arkitektur, domän och UI

- [Arkitektur](architecture.md) – systemöversikt, säkerhetsgränser, läs-/skrivmodeller och ekonomiska beräkningsregler.
- [Gemensam UI-grund](ui-components.md) – komponenter, teman, navigation och formulärkontrakt för befintliga och nya sidor.
- [Arkitekturbeslut (ADR)](adr/README.md) – samlad ingång till beslut 0001–0006 och deras bakgrund.

## Drift och säkerhet

- [Release och återställning](release-runbook.md) – miljöinställningar, versionspolicy, deploygrindar och produktionsåtergång.
- [Rapportera säkerhetsbrister](../SECURITY.md) – privat rapporteringsväg och vilket underlag som behövs.

## Agenternas arbetsflöde

- [Projektregler](../AGENTS.md) – agenternas etablerade ingång och projektspecifika krav.
- [Automatiserad leverans](agents/delivery.md) – PR, oberoende review, mergegrind och produktionsverifiering.
- [Issue tracker](agents/issue-tracker.md) – GitHub-issues, beroenden och hantering.
- [Triagelabels](agents/triage-labels.md) – de fem kanoniska etiketterna.
- [Domändokumentation](agents/domain.md) – hur agenter läser CONTEXT och ADR i projektets befintliga layout.

## Historik och kravunderlag

Dessa dokument bevarar produktens ursprung, tidigare intervjuer och genomförda leveranser. Använd guiderna ovan för aktuella instruktioner.

- [Arbetsbokens produktkarta](workbook-mapping.md) – ursprungliga produktområden och modellprinciper; inte en förteckning över färdiga funktioner.
- [Månadsöversiktens designintervjuer](monthly-overview-design.md) – fastställda krav och införandeordning för tidigare issues.
- [UI- och formulärdesign](ui-design.md) – bekräftade intervjubeslut, historisk inventering och genomförda steg.
- [Avslutad arkitekturgranskning](architecture-review.md) – ursprungliga fynd och genomförda förbättringar.
- [Retrospektivarkiv](retros/) – leveransbevis, erfarenheter och faktiskt skapade ärenden per session.
