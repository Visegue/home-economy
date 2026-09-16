# Release och återställning

GitHub Actions äger den automatiska releasen till Vercels produktionsdomän. En merge till
`main` kör kvalitets- och webbläsartester, bygger en staged production-deployment,
applicerar väntande Drizzle-migrationer i Neon, kontrollerar databasroll/RLS och
smoketestar `/login` på den staged URL:en. Först därefter promoveras den. PR:er
från betrodda branches går genom motsvarande migration, databaskontroll och
smoketest i staging innan de får mergas.

## Om ett steg misslyckas

1. Öppna det misslyckade jobbet under GitHub Actions och identifiera första
   felande steg. Kör vid behov `gh run view <run-id> --log-failed` lokalt. Kopiera
   inte hemligheter eller personlig ekonomi till issues eller publika loggar.
2. Om bygge, migration, databaskontroll eller smoketest misslyckas före
   **Promote production deployment**, ligger den tidigare deploymenten kvar på
   produktionsdomänen. Stoppa en ny release tills orsaken är känd. En lyckad
   migration kan redan ha ändrat databasen; den rullas inte tillbaka automatiskt.
3. Om promotionen misslyckas, kontrollera i Vercel vilken deployment
   produktionsdomänen faktiskt pekar på. Återkör bara releasen när dess
   databasmigrationer fortfarande är säkra att applicera.
4. Om appen får problem efter promotion, prioritera en korrigerande release.
   Att manuellt promovera en äldre Vercel-deployment är bara säkert om den äldre
   appversionen är kompatibel med det nya databasschemat. Kontrollera detta
   innan en sådan återgång.

Destruktiva databasändringar måste delas upp enligt expand/contract: lägg först
till det nya schemat, flytta läsning/skrivning i en senare release och ta bort det
gamla först när ingen körande app behöver det. Återställning av Neon-databasen
är en sista utväg vid verifierad dataförlust, inte standardåtgärden för ett
deployfel. Den kan förlora senare användarändringar och kräver separat beslut,
kontroll av tillgänglig återställningspunkt och en plan för de data som skrivits
sedan dess.

## Staging och PR:er

Alla previews delar Neons `development`-branch. En migration i en PR påverkar
därför andra previews och rullas inte tillbaka när PR:en stängs. Kör inte två
motstridiga schemaändringar parallellt; samordna eller sekvensera dem. Fork- och
Dependabot-PR:er har inte tillgång till staging-hemligheter. Om de ändrar
databas-, release- eller CI-filer måste ändringarna först granskas och tas in
på en betrodd branch, där `Deploy preview` kan validera dem.

Smoketestet verifierar endast att den nya appen levererar inloggningssidan via
HTTPS. `pnpm db:check` verifierar separat databasåtkomst och RLS. Inget av dem
bevisar att Google OAuth eller e-postleverans fungerar; kontrollera de flödena
manuellt efter relevanta ändringar utan att lägga riktiga användaruppgifter i CI.

## GitHub-skydd som behöver bevaras

Repot är publikt. GitHub CodeQL default setup, secret scanning, push protection
och privat sårbarhetsrapportering är aktiverade. Actions har som standard bara
läsbehörighet och får inte godkänna PR:er. Produktionsmiljön godtar bara branch
`main`. Main-regeln kräver kvalitetstester, Playwright, `Deploy preview` och
`Preview migration gate`; den sista kontrollen hindrar att ett hoppat
preview-jobb godkänner känsliga ändringar från fork eller Dependabot. Ändra
inte dessa inställningar utan att ersätta skyddet med en likvärdig kontroll.

GitHub Actions i repot är pinnade till fullständiga commit-SHA:n. Uppdatera
dem avsiktligt när en ny version behövs och verifiera att SHA:n tillhör rätt
officiell release. Säkerhetsbrister rapporteras enligt [SECURITY.md](../SECURITY.md).

## Kostnadsram

Flödet använder befintliga GitHub Actions-, Vercel- och Neon-resurser på deras
kostnadsfria nivåer. Inga automatiska Neon-branches per PR, köpta
observability-tjänster eller externa testkonton krävs. Deploys, tester och
databaskontroller förbrukar fortfarande respektive gratiskvot. Vid kvotbrist:
pausa nya releaser och minska onödiga körningar; uppgradera inte automatiskt.
