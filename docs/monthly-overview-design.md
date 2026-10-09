# Månadsöversikt: design för issue #63

Fastställd design för [issue #63](https://github.com/Visegue/home-economy/issues/63),
bekräftad av användaren den 4 oktober 2026 efter designintervjun.
Dokumentet beskriver avsedd förändring; implementationen ingår inte i intervjun.

## Autonom batch: kravintervju 2026-10-08

Det samlade kravunderlaget bekräftades av användaren den 8 oktober 2026.
Issues #64, #62, #82 och #66 är redo för autonom implementation när användaren
senare startar batchen. Ingen implementation ingår i kravintervjun.

### Urval och leverans

Urvalet har efter användarens beslut utökats från tre till fyra issues.
Ordningen är **#64 → #62 → #82 → #66**, med en separat PR per issue.
#64 och #62 är avgränsade presentations- och navigeringsförbättringar.
#82 gör detaljvyn lättare att nå, och #66 gör den till platsen för postens
hantering. Alla fyra kan genomföras utan nya pengaregler eller migrationer.

När användaren senare startar batchen ska varje issue implementeras och
testas, committas och pushas, få en PR, granskas av en annan agent och rättas
innan den mergas. Kör `pnpm check`, `pnpm test:e2e` och obligatoriska
PR-kontroller. Vid ändrad databasintegration eller behörighet gäller även
`pnpm db:check`. Använd syntetiska data och håll befintlig RLS, validering,
giltighetsdatum och överföringshistorik intakta.

Granskningen ska kontrollera både projektets standarder och issue-specen mot
en fixerad PR-bas och slutlig commit. Åtgärda fynd, kör om berörda tester och
låt ändrad kod granskas igen. Agentgranskningen ersätter inte obligatoriska
GitHub-kontroller eller branchskydd; inga kontroller får kringgås. Följ
projektets versioneringsregler och release-runbook. Verifiera lyckad
produktionsdeploy och promotion av rätt commit före nästa issue. Starta
nästa arbete från senaste `main`, med ny versionsjämförelse.

Användaren vill ha hela flödet automatiserat utan löpande PR-godkännanden.
Agenten löser rutinmässiga implementationstekniska val inom denna spec.
Stoppa vid nödvändig ändring av omfattning, nya kostnader eller olöst
blockering som kräver användaren; dokumentera hindret och kringgå inte
skydd. Detta mandat startar inga Git-operationer eller någon implementation
under kravintervjun. Inga återkommande automationsjobb skapas här.

### Obligatoriska leveranskrav per implementation

Användaren kompletterade kravunderlaget den 8 oktober 2026: dokumentation,
ADR:er, tester och säkerhetsskanningar ska ingå i varje implementation och
kontrolleras före merge, även när GitHubs branchskydd inte kräver dem.

- **Dokumentation:** uppdatera berörd README, design- och
  arkitekturdokumentation i samma PR som funktionen. Dokumentera faktiskt
  implementerat beteende, avgränsningar och verifiering; lämna inte
  motstridiga äldre UI-beskrivningar. Ta med kravintervjuns lokala
  dokumentändringar i första PR om de ännu inte finns på `main`.
- **ADR:er:** läs berörda ADR:er och kontrollera att implementationen följer
  dem. Uppdatera eller skapa ADR när ett arkitektur- eller domänbeslut
  faktiskt ändras eller tillkommer, med motivering och konsekvenser.
  Dokumentera ADR-bedömningen i varje PR, även om inga ADR-ändringar behövs.
  Ändra inte beslut utanför issue-scope för att undvika en dokumenterad
  konflikt. `CONTEXT.md` uppdateras om domänbegrepp ändras.
- **Tester:** lägg till eller uppdatera meningsfulla tester för issue:s
  acceptanskriterier och regressionsrisker. Kör `pnpm check` och
  `pnpm test:e2e` på slutlig kod; kör `pnpm db:check` vid ändrad
  databasintegration eller behörighet. Redovisa resultat och testade
  användarflöden i PR. Skippade eller misslyckade krav får inte beskrivas
  som godkända.
- **Säkerhetsskanningar:** invänta och kontrollera CodeQL för slutlig
  PR-kod, kör beroendegranskning med `pnpm audit` och kontrollera secret
  scanning samt push protection. CodeQL default setup, secret scanning,
  push protection och Dependabot security updates verifierades som aktiva
  i repot den 8 oktober 2026; verifiera tillgänglighet igen vid implementation.
  Rätta nya säkerhetsfynd som ändringen introducerar. Bedöm befintliga
  fynd som påverkar ändringen; tysta eller kringgå inte fynd för att kunna
  mergea. Vid olöst fynd eller utebliven nödvändig skanning stoppas merge
  och hindret dokumenteras. Redovisa skanningarnas verktyg, omfattning,
  resultat och relevanta körningslänkar för granskad kod utan hemligheter
  eller persondata.
- **Riktad säkerhetsgranskning:** kontrollera att ny klientinteraktion inte
  försvagar servervalidering, sessionskontroll eller hushållsisolering,
  läcker data via loggar/cache eller inför osäker rendering av användartext.
  För #66 granskas även vald post/version, skrivningar, formulärskydd och
  skydd mot dubbla åtgärder. Skanningar ersätter inte denna granskning.

Den separata granskningsagenten ska uttryckligen kontrollera dessa
leveranskrav och verifieringsbevis. Säkerhetsdetaljer rapporteras privat
enligt `SECURITY.md`; publika PR:er får bara innehålla ofarliga sammanfattningar.
Inga nya betaltjänster eller säkerhetsplattformar är förutbestämda.

### #64: ikoner i kortrubriker

Alla fem kort på Månaden får dekorativa Lucide-ikoner före rubriken:

| Kort              | Ikonriktning     |
| ----------------- | ---------------- |
| Att föra över     | Överföringspilar |
| Utgifter          | Kvitto           |
| Avräkningar       | Cirkulära pilar  |
| Spara             | Spargris         |
| Räcker inkomsten? | Våg              |

Storlek och placering är enhetliga. Agenten får välja motsvarande konkreta
ikoner och finjustera avstånd och färg inom befintlig stil. Rubriktexter och
tillgängliga namn bevaras, utan extra uppläsning eller tabbstopp. Riktningen
är godkänd och kan justeras senare; ingen separat designgrind behövs.
Verifiera radbrutna rubriker, mobil och åtkomst till kortens kontroller.

### #62: månadsväljare

Implementationens kontroll ligger i en liten klientkomponent. Serverns
bekräftade månad behålls i väljare, rubrik och data under bytet. Kontroller
spärras med `aria-disabled` och händelsekontroll; månadens inmatning är
skrivskyddad medan bytet pågår. Det behåller fokus utan att avmontera
kontrollen. Statusraden har reserverad höjd och spinnern är stilla vid
minskad rörelse. Månadsdata och giltighetsregler är fortsatt serverstyrda.

- Gäller bara **Månaden**. Väljaren på **Överföringar och värden** ingår inte.
- Direktval av en giltig månad byter omedelbart, utan **Visa månad**-knapp.
  Komplettera med pilar för föregående/nästa och **Denna månad**.
- Behåll intervallet 1900–2199 och aktuell månad i `Europe/Stockholm`.
  Spärra pilar vid intervallgränser. Tom eller ofullständig inmatning får
  inte starta ogiltig navigation. Befintlig policy för ogiltig URL behålls.
- URL, väljare och visade data ska överensstämma när navigationen är klar.
  Omladdning och bakåt/framåt ska ge rätt månad. Varje faktiskt byte skapar
  en historikpost; redan vald månad är en no-op. Bevara övriga URL-parametrar.
- Under byte från väljaren visas en liten spinner och svensk tillgänglig
  status vid kontrollen. Väljarens kontroller spärras tills bytet är klart.
  Ingen minsta väntetid införs; reservera utrymme så att indikatorn inte
  flyttar layouten och respektera minskad rörelse.
- Den tidigare månadens innehåll och dess rubrik ligger kvar tills nästa
  månad är klar. De får inte visas som om de tillhörde den nya månaden.
  Vanligt månadsbyte ska bevara sidans scrolläge och inte stjäla fokus.
- Detaljpanelen stängs vid bekräftat månadsbyte. Formulärens befintliga
  skydd för osparade ändringar och pågående sparning bevaras.
- Spinnaren gäller byte initierat i väljaren. Generell laddningsindikering,
  fel/omförsök, offline-hantering och prestandaarbete ligger i #77/#76.
  Befintlig auth- och felhantering behålls; pending får inte bli ett separat
  låst tillstånd efter avslutad eller avbruten navigation.

Verifiera direktval, båda pilarna, Denna månad, årsskifte, intervallgränser,
no-op, historik/omladdning och Stockholms månadsskifte. Med fördröjd navigation
ska spinner och status synas, kontroller spärras och rubrik/data höra ihop.
Kontrollera mobil, tangentbord, fokus och minskad rörelse. Spinnern behöver
inte hinna synas vid snabba byten.

### #82: hela postraden öppnar detaljer

Alla fyra posttabeller omfattas: direkta utgifter, avsatta utgifter,
avräkningar och sparande. Klick eller tryck på belopp och tom yta i en
postrad öppnar samma detaljpanel som namnet. Rubrik- och totalrader är
inaktiva. Bevara tabellsemantiken och namnets riktiga knapp som ett enda
tangentbordsmål för detaljöppningen, med Enter/Space och synlig fokusmarkering.

Andra kontroller utför bara sina egna åtgärder. Textmarkering, kopiering och
scrollning får inte öppna panelen. Vid vanlig stängning återgår fokus till
namnknappen även när panelen öppnades från beloppet. Rätt post/version och
vald månad visas, även vid likadana namn och historiska/framtida månader.
Månadsbyte och navigation stänger panelen enligt befintligt kontrakt.

#82 levereras före #66. Fram till dess behålls Hantera och dess kontroller;
radaktivering öppnar detaljer även i hanteringsläge. #66 tar därefter bort
läget. Testa alla fyra tabeller med mus, touch och tangentbord, inklusive
textmarkering, scrollning, summeringar och befintliga radåtgärder.

Implementationen av #82 låter den lilla klientkomponenten äga tabellraden och
namnets Sheet-trigger, medan beloppsceller och detaljer fortsatt renderas på
servern. Raden får ingen extra roll eller tabbposition. Pointergester,
textmarkering och andra kontroller aktiverar inte namnknappen. Radens
månads-/versionsnyckel behåller befintlig stängning vid månadsbyte.

### #66: hantering från detaljer

Den valda riktningen är **Ändra** och **Avsluta** som tydliga åtgärder i
postens detaljpanel för alla fyra posttyper på Månaden. Ta bort Hantera/Klar,
kortens hanteringslägen och tabellernas åtgärdskolumn. Skapandeknapparna
behålls. Andra sidors hantering och formulärens större omdesign ingår inte.

- **Öppna formulär:** stäng detaljpanelen tillfälligt och öppna befintlig
  formulärdialog. Högst en huvudmodal är aktiv åt gången. Befintlig
  bekräftelse för att kasta osparade ändringar får visas ovanpå formuläret.
- **Avbryt redigering:** återgå till oförändrade detaljer, med fokus till
  Ändra. Kasta/Fortsätt redigera och befintliga formulärskydd bevaras.
- **Spara:** invänta serverbekräftelse och uppdaterade data, återgå sedan
  till uppdaterade detaljer för samma post och valda månad. Fokus går till
  Ändra. Om posten inte längre hör till månaden, återgå till översikten med
  bekräftelse och fokus vid det berörda kortet.
- **Fel:** behåll formulär och inmatning med begripligt fel och möjlighet
  att korrigera eller försöka igen enligt befintligt kontrakt. Stäng inte
  en pågående skrivning via Escape, overlay eller stängknapp.
- **Avbryt avslut:** återgå till samma detaljer, med fokus till Avsluta.
- **Lyckat avslut:** återgå alltid till översikten, med bekräftelse och
  fokus vid det berörda kortet, även när posten fortfarande visas där.

Vald version och datumförval följer dagens regler även i historiska och
framtida månader. Ändra från valt datum och Rätta denna version behålls;
utgiftstypen är låst. Avslut gäller vald version, inte automatiskt hela
posten, och bevarar senare versioner och registrerade pengar. Ingen permanent
radering, automatisk frigöring eller omfördelning införs; det hör till #73.

Exempel: tryck på en rad → detaljer → Ändra → formulär → Spara → uppdaterade
detaljer. Avbryt går till oförändrade detaljer. Detaljer → Avsluta → bekräfta
valt datum → översikt med bekräftelse. Detta ersätter issue #66:s öppna
val mellan gemensamt hanteringsläge och åtgärder i detaljerna; någon ny
användargodkänd prototyp krävs inte före implementation.

Verifiera alla fyra typer, skapa oförändrat, lyckad ändring/rättelse,
avbryt, osparade ändringar, valideringsfel, långsam sparning och avslut.
Täck ny version efter sparning, namnbyte, post som lämnar månaden, sista post
som försvinner, historiska/framtida versioner och bevarade senare versioner.
Fokus och återgång ska fungera även om den ursprungliga raden avmonteras.
Kontrollera mobil och tangentbord genom hela kedjan.

### Domän och dokumentation

UI-valen ändrar inga domänbegrepp eller pengaregler. `CONTEXT.md` behålls som
ordlista och ingen ny ADR är förutbestämd; ADR-bedömningen och relevant
uppdatering enligt leveranskraven ovan är obligatoriska. Följ ADR 0004 och 0005. Detta designunderlag
innehåller avsedda förändringar; README och arkitekturbeskrivning ska bara
beskriva dem som befintliga funktioner efter respektive implementation.

## Fastställd riktning

Nedan bevaras det ursprungliga designunderlaget för #63. Batchbesluten ovan
ersätter dess äldre UI-regler där de överlappar, särskilt namnöppning,
Hantera-läge och fokus efter posthantering. Nulägesbeskrivningar nedan avser
tidpunkten för #63:s designintervju.

- Vyns huvuduppgift är att visa förväntade överföringar och följa det totalt
  undansparade beloppet per avsatt utgift, avräkning och sparändamål.
- Uppföljningen gäller varje post oberoende av vilket verkligt konto pengarna
  finns på. Kontokoppling och gruppering per konto ingår inte i #63.
- Jämförelsen mellan inkomster och utgifter är sekundär. En framtida flytt till
  en annan vy övervägs, men är inte beslutad.
- Enhetlighet gäller framför allt enkla tabeller med de viktigaste uppgifterna
  och liknande presentation för de olika posttyperna. Detaljer ska kunna nås
  från respektive post. Gemensam visuell utformning är också önskad.
- Postens namn öppnar detaljer i en sidopanel, med helskärmsvisning på mobil.
  Interaktionsmodellen kan justeras efter utvärdering.
- Sidopanelen visar detaljer, månadens planuppföljning och postens
  överföringshistorik samt en länk till befintlig registrering. Nuvarande
  redigeringsåtgärder behålls tills #66 ändrar redigeringsläget.
- Avsatta utgifter, avräkningar och sparanden får enkla, enhetliga tabeller
  med **Namn**, **Per månad** och **Totalt undansparat**. Månadens belopp visas
  per post; ingen ytterligare kolumn för samma jämförelsebelopp införs nu.
- **Per månad** avser månadsavsättningen för avsatta utgifter och avräkningar,
  respektive sparavsättningen för sparändamål. Sparavsättningar är inte utgifter.
- Direkta utgifter får en egen tabell. En eventuell framtida sammanslagning
  kan utvärderas senare.
- Undansparat visas vid månadsslut för tidigare månader och per dagens datum
  för innevarande och framtida månader. Endast registrerade belopp räknas in;
  förväntade framtida avsättningar visas aldrig som redan undansparade.
- När pengar används för en betalning, återbetalning eller ett uttag ska det
  registrerade värdet minska från händelsens datum, utan att skriva om tidigare
  värden. En avslutad post ska inte ligga kvar enbart som en permanent notis.
- Avslut av definitionen och användning av pengarna är olika handlingar.
  Avslut innebär inte fysisk radering. Hantering av kvarvarande pengar och
  innebörden av avslut preciseras i det separata ärendet #73; ingen automatisk
  frigörande- eller omfördelningsregel är beslutad för #63.
- Saknat ingående värde markeras med **Ingående värde saknas** vid den
  registrerade summan. Ett uttryckligen registrerat ingående värde på noll är
  ett känt startvärde och får inte samma markering.
- Webappen ska fungera på mobil. Designen behöver inte prioritera mobil över
  större skärmar, och de tre kolumnerna ska vara användbara även på mobil.

## Avgränsning mot andra issues

- [#60](https://github.com/Visegue/home-economy/issues/60) är det separata
  ärendet för förenklad överföringsregistrering: flera utförda överföringar
  registreras från månadsvyn med gemensamt datum, urval och belopp per rad.
  Det flödet införs i #60, enligt användarens önskan att hålla isär arbetena.
- #63 gäller översiktens presentation och detaljer per post. Befintlig
  registrering nås via en länk från postens sidopanel.
- #62 gäller månadsväljaren, #64 rubrikikoner, #65 gemensamt skapandeflöde och
  #66 gemensamt redigeringsläge. Dessa förändringar införs i respektive ärende.
- [#72](https://github.com/Visegue/home-economy/issues/72) fångar det framtida
  behovet av att skapa konton, koppla utförda överföringar till konton och visa
  öronmärkta medel per post i en kontovy. Kontofunktionerna tas efter #63.
- [#73](https://github.com/Visegue/home-economy/issues/73) gäller tydligare
  avslut och hantering av kvarvarande öronmärkta pengar. Det skiljer stopp av
  framtida avsättningar från faktisk betalning/uttag och ändrad öronmärkning,
  med bevarad historik. Arbetet görs separat från #63.

## Befintliga begrepp och funktioner

- Ett **Account** (konto) är en verklig plats där pengar eller investeringar
  finns. En **Earmark** (öronmärkning) anger vad pengar tillhör; flera ändamål
  kan dela ett konto. Se [ordlistan](../CONTEXT.md).
- Månadsöversiktens överföringssammanfattning visar beräknade avsättningar,
  avräkningar och sparande. Den visar inte registrerade överföringar.
- `/transfers` erbjuder individuell registrering, månadens planuppföljning,
  öronmärkt värde och överföringshistorik per ändamål. Den använder ingen
  mottagande kontokoppling för att gruppera ändamålen.
- Det finns ännu ingen generell detaljvisning per post.
- Nuvarande avslut gäller från ett valt datum för den valda versionen och
  bevarar registrerade överföringar samt tidigare och senare versioner. Den
  nya månadsvyn ska inte ändra detta skrivbeteende.
- Planerat belopp, registrerade insättningar för en månad och öronmärkt värde
  är olika mått. Utfört datum och **avser månad** har olika betydelse enligt
  [ADR 0004](adr/0004-effective-dates-and-confirmed-transfers.md).

## Fastställda presentationsregler

- Behåll **Att föra över** som övergripande sammanfattning före posttabellerna.
  Behåll inkomstjämförelsen längre ned tills en annan placering beslutats.
- Visa summor per tabell och behåll tomlägen med tydlig text. Visa en kort
  markering vid ändringar inom månaden; de fullständiga uppgifterna finns i
  sidopanelen.
- Sidopanelen stängs vid månadsbyte eller navigering. Vid vanlig stängning
  återgår fokus till postens namn. Den ska kunna stängas med tangentbord.
- Historiska månader visar poster som hörde till månaden och deras
  registrerade värde vid månadsslut, även när posten senare har avslutats
  eller värdet nu är noll. Ingen ny regel för frigörande av pengar införs.

## Verifiering vid implementation

- Visa en avsatt utgift, en avräkning och ett sparande med de tre gemensamma
  kolumnerna, separat från direkta utgifter. Summorna följer befintliga regler.
- Registrerade insättningar, uttag och ingående värden påverkar undansparat
  på utfört datum. **Avser månad** styr planuppföljningen, inte värdedatumet.
- Exempel: 2 000 kr är undansparat vid september månads slut och används genom
  ett registrerat uttag i oktober. September visar fortsatt 2 000 kr; efter
  uttaget visar det aktuella registrerade värdet noll. Ett senare avslut får
  inte ta bort septemberposten från den historiska månadsvisningen.
- Ingen planerad framtida avsättning räknas som redan registrerad. Ett saknat
  ingående värde markeras, medan ett registrerat startvärde på noll är känt.
- Fullständiga datum-, ägar- och beräkningsuppgifter samt överföringshistorik
  kan nås via sidopanelen. Ändringar inom månaden är upptäckbara från tabellen.
- Kontrollera smala skärmar, långa namn, tangentbordsstyrning, panelens
  fokusåterställning och månadsbyte utan att förlora befintliga formulärskydd.
- Kör projektets `pnpm check` och `pnpm test:e2e` efter implementationen.

## Testplan

Utöka befintliga tester när beteendet implementeras. Följande kontroller är
acceptanskrav, inte tester som redan har skrivits eller körts för den nya vyn.

### Läsmodell och belopp

Utöka `src/features/dashboard/monthly-overview.test.ts`, som redan testar
verkliga frågor, avrundning, datumversioner och hushållsisolering med PGlite.

- Läs planbelopp, registrerat värde och panelens uppföljning från samma
  autentiserade, skrivskyddade databasögonblicksbild. Behåll den befintliga
  läsmodellens transaktions- och hushållsgränser.
- Knyt överföringar till stabil postidentitet, inte namn. Två poster med samma
  namn ska ha oberoende belopp; en namnändring får inte tappa historiken.
- Testa septembervärdet efter ett uttag och ett avslut i oktober. Historisk
  visning ska behålla både posten och septembervärdet.
- Testa värdedatum med fixerad klocka för tidigare, aktuell och framtida
  månad. Inkludera ett månadsskifte i `Europe/Stockholm` när UTC-datumet skiljer
  sig, så att testerna inte beror på när de körs.
- Testa en insättning vars utförda datum och **avser månad** skiljer sig.
  Månadens planuppföljning och undansparat ska få rätt värden var för sig.
- Testa saknat ingående värde, ett registrerat ingående nollvärde och ett
  ingående värde vars utförda datum ligger efter den historiska visningens
  värdedatum. Markeringen ska följa registreringarnas utförda datum.
- Testa noll och negativt registrerat värde utan att dölja eller nolla
  avvikelsen. Befintliga bekräftelseregler för negativa värden bevaras.
- Säkerställ att samma post eller dess överföringar inte räknas flera gånger
  när versioner eller posttyp förändras. Planer får inte skapa överföringsrader.

### Användarflöden och tillgänglighet

Utöka berörda Playwright-tester i `e2e/budget.spec.ts`, `e2e/savings.spec.ts`,
`e2e/settlements.spec.ts` och `e2e/funding.spec.ts`. Behåll befintliga kontrakt
för hanteringsläge, formulärskydd och historik; anpassa kontroller som avser
detaljer som nu finns i sidopanelen.

- Verifiera de tre kolumnerna, separata direkta utgifter, summor och tomlägen.
- Öppna rätt posts panel via tangentbord. Kontrollera tillgängligt namn,
  fokus inne i panelen, Escape, stängknapp och återgång till postens namn.
  Stängknappens text ska vara svensk även om den återanvända UI-primitiven
  har engelsk standardtext.
- Byt månad och navigera medan panelen är öppen. Innehåll från föregående
  månad ska inte ligga kvar. Vanliga formulär behåller sitt befintliga skydd
  för osparade ändringar.
- Kontrollera mobil, bland annat befintlig teststorlek 390 × 844, långa namn
  och stora belopp utan oavsiktlig horisontell sidrullning. Kontrollera också
  sidopanel och tabeller på större skärm.
- Verifiera att länken till individuell registrering leder till rätt post.
  Att öppna, stänga eller navigera i vyn får inte skapa överföringar.

## Säkerhetsgenomgång vid implementation

Granska den nya läsningen av registrerade belopp och detaljhistorik särskilt.
Detta är en riktad kontroll av ändringen, inte en redan genomförd granskning av
framtida kod eller en fullständig säkerhetsrevision av appen.

- All hushållsdata ska läsas server-side genom `withAuthenticatedDatabase()`
  och tvingande RLS. Klientens val av post, månad eller eventuell detaljlänk
  får inte användas som åtkomstkontroll.
- Utöka hushållsisoleringstestet för den nya läsmodellen med ett andra hushålls
  överföringar, belopp och historik. Bevara även filtret till ägarhushållet när
  RLS tillåter medlemskap i andra hushåll. Använd syntetiska fixtures.
- Om panelen får separat serverläsning ska en manipulerad postidentitet från
  ett annat hushåll nekas. Testa också saknad eller utgången session för den
  nya åtkomstvägen; återanvänd befintlig sessionsvalidering.
- Granska vad som skickas till klienten. Belopp och historik får inte läcka
  via delad cache, felmeddelanden eller loggar; skicka bara data som vyn behöver.
- Namn och anteckningar ska visas som text. Ingen obehandlad HTML-rendering
  behövs för detaljpanelen.
- Bekräftade överföringar, deras datum och historik ska inte ändras som följd
  av läsning, månadsbyte eller panelens öppning. #63 inför ingen ny skrivväg.
- Kör `pnpm db:check` när implementationen ändrar databasintegration eller
  behörigheter, enligt projektets riktlinjer.

## Dokumentation och ADR

- Detta dokument är designunderlaget. `CONTEXT.md` innehåller definitionen av
  registrerat öronmärkt värde, men inga UI- eller implementationsregler.
- Uppdatera README:s beskrivning av månadsvyn när funktionen är implementerad,
  inklusive tabellerna, sidopanelen, värdedatum och markeringen för saknat
  ingående värde. Beskriv bara funktioner som då finns.
- Uppdatera `docs/architecture.md` när månadsvyns läsmodell även returnerar
  registrerade belopp och historik; dagens text beskriver enbart planbelopp.
- Ingen ny ADR behövs för tabellstruktur eller sidopanel: valen är enkla att
  justera. Följ befintlig ADR 0004 för datum, manuellt registrerade händelser
  och bevarad historik.
- Pröva behovet av en ny ADR i #72 och #73 när modellen för kontokoppling eller
  frigörande/omfördelning faktiskt beslutas. Dokumentera då verkliga alternativ
  och konsekvenser som är betydelsefulla och svåra att ändra senare.
