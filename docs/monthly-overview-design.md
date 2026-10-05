# Månadsöversikt: design för issue #63

Fastställd design för [issue #63](https://github.com/Visegue/home-economy/issues/63),
bekräftad av användaren den 4 oktober 2026 efter designintervjun.
Dokumentet beskriver avsedd förändring; implementationen ingår inte i intervjun.

## Fastställd riktning

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
