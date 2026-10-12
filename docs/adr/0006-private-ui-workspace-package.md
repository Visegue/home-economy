# Privat UI-paket i samma repo

Gemensam UI-presentation samlas i ett privat workspace-paket, `packages/ui`, medan appen behåller sin nuvarande plats i repots rot. Syftet är ett uttryckligt gränssnitt och gemensamma presentationsregler för hela appen. Paketet får inte importera appens ekonomiska regler, autentisering eller databasåtkomst; appen konsumerar paketet. App och UI ändras i samma PR och följer samma apprelease, utan separat paketpublicering.

Paketet äger färger, typografi, avstånd, kontroller och delade presentationsmönster för fält, rubriker, layout och dialoger. Appen komponerar dessa med sin navigation och ekonomiska formulär. Fältens presentation och felkoppling kan delas; ekonomisk validering och andra domänregler förblir appens ansvar.

Att behålla allt gemensamt UI inom appen kräver färre verktygsändringar men ger mindre tydlig paketseparation. Att samtidigt flytta appen till `apps/web` påverkar miljöladdning, databasverktyg, tester och deploy utan motsvarande behov i detta arbete. Vi väljer därför ett separat UI-paket med appen kvar i roten. Bygg-, test-, säkerhets- och versionskontroller måste omfatta paketet, och serverkompatibla delar får inte göras till klientkod enbart genom gemensamma exports.

Beslutat i kravintervjun för [#97](https://github.com/Visegue/home-economy/issues/97), Q3 och Q14. Konkreta gränssnitt och användningsregler preciseras i [UI-underlaget](../ui-design.md).
