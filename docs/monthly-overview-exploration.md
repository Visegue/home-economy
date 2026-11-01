# Månadsöversikt: utforskande prototyp och mätunderlag

Status 2026-10-31. Beslutsunderlag för senare implementation, inte en leverans
av #159, #65, #77 eller #76. Inga produktflöden, driftinställningar, versioner,
migrationer eller ekonomiska regler har ändrats. Inga commits, pushar eller
PR:er har skapats.

## Underlag och körning

De aktuella issuebeskrivningarna och deras kommentarer lästes via `gh issue view`:
[#159](https://github.com/Visegue/home-economy/issues/159),
[#65](https://github.com/Visegue/home-economy/issues/65),
[#77](https://github.com/Visegue/home-economy/issues/77) och
[#76](https://github.com/Visegue/home-economy/issues/76).
Användarens beslut från 2026-10-30 är styrande framför äldre designtext.
Repo-bas: `3ef6469cb72ac8dfc30f54b3f77a0ca26daca246`.

Kör från reporoten:

```sh
bun scripts/serve-monthly-prototype.mjs
```

Öppna <http://127.0.0.1:4327>. Prototypen är även en fristående fil:
[`monthly-overview.prototype.html`](../src/features/dashboard/monthly-overview.prototype.html).
Den kan öppnas direkt utan server, installation, inloggning eller databas.
Allt tillstånd är i flikens minne; omladdning återställer skapade poster.
URL:ens `month` och `page` kan återöppna en vy. Inga uppgifter skickas till tjänster.

Skillen `prototype` används med fokus på tillstånd och klickflöden. En fast
bekräftad riktning prövas; alternativa produktlayouter införs inte. Prototypen
ligger utanför appens routning. Den använder native HTML-kontroller och kopierade
appfärger från `packages/ui/styles.css` för att vara fristående. Produktens
shadcn-formulär och deras fullständiga validering är inte kopierade.

## Vad som går att prova

- Desktop: månadsval till vänster, Registrera månadens insättningar och Lägg till
  till höger. Mobil: åtgärder i samma toppsektion under väljaren, utan fast åtgärdsrad.
- Fyra menyval öppnar rätt förenklat formulär direkt. Avsatt utgift har intervall
  och nästa betalning; avräkning har personval; sparande har månadsbelopp.
- Byt typ utan ändringar går till typval. Ändrad inmatning kräver Kasta ändringar
  och byt typ eller Fortsätt redigera. Bekräftat byte ger ett rent formulär.
  Avbryt, Escape, återöppning och simulerat sparfel går att prova.
- Spara behåller månad; bekräftelsen anger giltighetsdatum och om posten ännu
  inte visas. Skapande registrerar inga pengar. Insättningsflödet är separat.
- Hushållsnamn finns kvar och användarnamn saknas i det gemensamma sidhuvudet.
- Samma undermeny med de tre bekräftade vyerna på desktop/mobil. Månadskontext
  följer med via historiken, som fortfarande visar alla perioder.
- Väljaren har pilar och egen öppnad yta med Denna månad, utan fristående genväg.
- Simulerad väntan visar spinner/mål vid väljaren, korrekt gammal rubrik och hela
  gamla månadsytan nedtonad. Skrivåtgärder spärras; väljaren fortsätter fungera.
  Senaste avsikt vinner, även när äldre svar eller fel kommer sist.
- Fel återställer användbar gammal vy och ligger kvar vid väljaren med omförsök.
  Sidbyten markerar mål i menyn och ovanför den bevarade innehållsytan.
- Tom sida har samma Lägg till-ingång. Öppna prototypfältet högst upp för tomläge,
  svarstider 0/1 200/3 500 ms, omvänd svarsordning, fel och tre guidade prov.
  Fördröjningarna simulerar svar, inte en minsta väntetid i produktens UI.

Detaljvyer och andra huvudsidor är förenklade navigationsmål. Redigering/avslut,
auth/session, offline, riktiga serverfel, skärmläsaruppläsning och fullständig
webbläsarhistorik med öppet smutsigt formulär kräver produktens egna flöden och
senare tester. Prototypen är inte kod att flytta direkt till produktion.

## Observationer och granskningsfrågor

Teknisk webbläsargenomgång i Chromium vid 1440×900, 390×900 och 320×900 passerade:
alla fyra skapa-val och minnessparanden, typbytesbekräftelse med båda valen,
framtida giltighet med bevarad månad, tre snabba val, sena svar/fel, kvarstående
fel/omförsök, undermenyn, historikens kontext och tomläge. Ingen horisontell
sidscroll observerades. Separat DOM-simulering passerade samma tillståndsfall.
DOM-simuleringen bevisar inte layout, mänsklig uppfattning eller prestanda.

Detta är agentens kontroll, inte ett användbarhetstest eller användarens
validering av en vinnande design. Särskilt kvarstår:

| Fråga      | Vad prototypen visar                                                            | Vad som behöver bedömas av användaren                                            |
| ---------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Hittbarhet | Två stabila åtgärder högst upp; inga konkurrerande skapa-knappar i kort/tomläge | Hittas rätt åtgärd utan ledtråd, även efter scroll?                              |
| Undermeny  | Från Inställningar till översikten: två tryck; ett extra jämfört med direktlänk | Är extra steget rimligt för den önskade grupperingen?                            |
| Laddning   | Måltext/spinner och tydlig nedtoning över hela gamla månadsytan                 | Märks bytet utan att behöva läsa status? Förstås vilken månad beloppen hör till? |

Riktningen ändras inte på grundval av enbart agentens bedömning. Samma namn på
menygruppen och dess första destination kan uppfattas som ett onödigt upprepat
val; det är en prototyphypotes. Gruppens chevron och utvikt aktiv destination
visar att första trycket öppnar en meny.

För granskning: börja i Inställningar, hitta översikten och skapa ett sparande;
prova sedan tom sida. Välj långsam väntan och tryck tre gånger framåt; kontrollera
rubrik och belopp. Prova fel och omförsök. Skriv i ett formulär, byt typ och välj
först Fortsätt redigera, sedan Kasta ändringar och byt typ.

### Återkoppling och ikonjustering 2026-11-01

Användaren bedömer prototypen som ett steg i rätt riktning, men uppmärksammade
missvisande kortsymboler, textbaserade knappalternativ, felplacerade menypilar
och att logotypen hade ersatts av ”kr”. Den första återkopplingen gav underlag
för justeringen nedan.

Prototypens förenklade textsymboler har ersatts av SVG-ikoner från samma
installerade Lucide-bibliotek som appen. Logotypen använder åter appens
`CircleDollarSign`. Kort och skapa-val delar typikon: `ReceiptText` för direkt
utgift, `CalendarClock` för avsatt utgift, befintliga `RefreshCw` för avräkning
och `PiggyBank` för sparande. Ikonerna följer även med till formulärets
typsammanfattning och Byt typ. Knapptexter och menynamn behålls.

Menyer, navigation och centrala formuläråtgärder har ikon tillsammans med text.
Månadsväljaren och månadsmenyn använder en SVG-chevron med fast storlek,
centrerad mot texten, som vänds när ytan öppnas. Navigationen växlar till mobil
före 1024 pixlar, som i appens befintliga sidram, för att ge plats åt ikoner
och fullständiga etiketter. Ikonerna är dekorativa utan extra tabbstopp eller
uppläsning. Justeringen gäller fortsatt enbart prototypen.

Visuell kontroll och layoutkontroll vid 320, 390, 768, 1024 och 1440 pixlar
bekräftade att ikonerna renderas, att månadspilen är vertikalt centrerad mot
texten och att sidan ryms utan horisontell scroll. Kort och Lägg till-val
använder samma SVG-referenser. Formulärens befintliga DOM-genomgång passerade
även efter ikonbytet.

Efter granskning av den justerade versionen bekräftade användaren den visuella
riktningen: ”Det här är riktigt nice, jag gillar det”. Detta omfattar den
visade prototypversionen med återställd logotyp, enhetliga typikoner,
ikoner tillsammans med knapptexter och justerade menypilar. Återkopplingen
startar ingen produktimplementation eller driftändring. Den tekniska
prestandabaslinjen återstår enligt mätunderlaget nedan.

Efter denna justering passerade `pnpm check` med 333 tester och
produktionsbygge samt hela `pnpm test:e2e --workers=2` med 36 av 36 tester
och ren serverdiagnostik. Den tidigare scrollavvikelsen nedan återkom inte
i denna fullständiga körning.

## #76: verifierad driftmetadata

Endast läsning av kontrollplansmetadata via Vercel CLI och Neon MCP. Inga
produktionsskrivningar, SQL-frågor mot molndata, compute-stopp eller driftändringar.

| Resurs                  | Observation                                                                                                                            |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Aktiv Production        | `home-economy.vercel.app`, deploy `dpl_6VCM3EJaZ3RGAHjRx596CD46zLy3`, READY; dynamiska lambdors `deployedTo`: `iad1`; Node.js 24       |
| Senaste listade Preview | `home-economy-qka1ayoch-visegue.vercel.app`, deploy `dpl_5t4EXBMLeFxY91e11Q1NmKU3c6wS`, READY; dynamiska lambdors `deployedTo`: `iad1` |
| Neon-projekt            | `home-economy`, region `aws-eu-central-1` (Frankfurt)                                                                                  |
| Neon `production`       | Read/write-endpoint i Frankfurt; min/max 0,25 CU; `suspend_timeout_seconds: 0`; `current_state: idle` vid avläsningen                  |
| Neon `development`      | Samma region, min/max 0,25 CU, `suspend_timeout_seconds: 0`, endpoint idle; branchen anges som archived                                |

Vercel-regionen kommer från dynamiska funktioners deploymetadata, inte CDN-header
eller byggregion. Denna metadata visar en geografisk skillnad mellan Vercel och
Neon. Den bevisar inte dess latenseffekt eller att region är huvudflaskhalsen.
De deployade miljöernas exakta koppling till namngiven Neon-branch har inte
kontrollerats via hemliga miljövariabler. Metadata om idle bevisar inte kallstart
för någon användarförfrågan. Historisk ADR och avsaknad av `regions` i
`vercel.json` användes inte som bevis för dagens placering.

Reproducera regionkontrollen med `vercel inspect <deploy-url> --format json` och
läs enbart `builds[].output[].lambda.deployedTo`. Neon:
`list_projects`, `list_branches`, `list_postgres_endpoints`. Spara bara region,
branchroll, CU och suspendinställning; undvik hostnamn, anslutningssträngar och
fullständiga miljö-/deploymentobjekt.

## Baslinjens status och återstående mätning

**Ingen giltig prestandabaslinje har samlats in.** Tiderna i prototypfältet är
simulering. Inga medianer, percentiler eller förbättringsprocent kan redovisas.

En körplan fastställdes före försöket: en uppvärmning som kastas och fem prover
per desktop/mobil och normal/större fixtur, med månadsvy, månadsbyte, sidbyte och
sparande före/efter ändring. Första besök skulle använda ny webbläsarkontext;
återbesök samma kontext före mutation; efter sparande samma kontext med en
bekräftad ändring. Kall/varm backend skulle anges okänd utan serverbevis.

- Ingen befintlig Preview-session och isolerad syntetisk databas kunde verifieras
  som lämpligt mätmål. Att en deploy är READY räcker inte; `development` är
  arkiverad. Inga molnresurser skapades eller ändrades för att komma runt detta.
- Lokal reservmiljö förbereddes med ny tillfällig PGlite-databas, aktuella
  migrationer, syntetiska sessioner och hushåll med 8 respektive 200 poster
  (lika många av varje posttyp), utan persondata. Node 24 och ett färskt
  produktionsbygge användes på separat loopbackport. Appen avvisade begäran med
  **PGlite får endast användas för lokala tester och offline-utveckling.**
  Skyddet ändrades inte. Inget flödesprov slutfördes och inga tidsvärden behålls.
- Datorn var under delar av verifieringen låst; några tidigare lokala
  webbläsar-/testkörningar stannade eller fick timeout. Sådana körningar är
  förkastade som mätunderlag. Efter upplåsning gick prototypgenomgången igenom.

Nästa giltiga mätning kräver en isolerad produktionsbyggd Preview med syntetiska
normal/större fixturer, verifierad auth/RLS och dokumenterat bygg-ID/runtime,
klientläge, nätverk och datamängd. Samla utan samtidig test-/byggbelastning:

1. Aktivering → första målanknutna synliga respons respektive rätt användbar vy.
   Använd gemensam browserklocka; noterad färdig vy måste ha rätt rubrik/data.
2. Dokument-TTFB och överförda HTML/RSC-byte; total action-/serverlatens samt
   korrelerade auth-, anslutnings-, transaktions-/SQL- och renderingsspans.
   TTFB är inte ren servertid. Summera inte överlappande spans; redovisa okänd rest.
3. Antal, median och min/max per scenario/miljö/fixtur. Fem prover är en
   avgränsad första jämförelse och ger inget tillförlitligt p95. Separera första
   klientbesök från bevisad kallstart och upprepa jämförbara kandidatförsök.

Spara aldrig request bodies, bindvärden, namn, belopp, e-post, cookies eller tokens
från drift. Lokala försöksloggar ligger under gitignorerade
`.tmp/monthly-exploration/` och är inte del av levererat underlag.

## Evidensbaserat nästa försök

En kandidat är motiverad av observerad metadata: jämför nuvarande `iad1` med en
för kontot tillgänglig funktionsregion nära Frankfurt på **samma isolerade
syntetiska dataset och bygge**. Kontrollera regionens tillgänglighet, mät
före/efter och behåll databasen där den är. Effekten är okänd; detta är ett
avgränsat jämförelseförsök, inte ett beslut att ändra produktion.

Inga ytterligare tekniska optimeringar väljs utan flödestider/SQL-evidens.
Kodens seriella läsningar är instrumenteringspunkter, inte bevisade flaskhalsar.
Större ombyggnad, databasflytt och betaltjänster kräver separata beslut.

## Verifiering och fortsatt arbete

`pnpm check` passerade: version, UI-gräns, formatering, lint, typkontroll,
333 tester i 36 filer och produktionsbygge. Efter den sista justeringen av
prototypens fokus och dokumentationen passerade även riktad formatering/lint
och DOM-genomgång. Första formulärfältets fokus och återgång till Lägg till
bekräftades i den öppna webbläsaren.

`pnpm test:e2e --workers=2`: 35 av 36 passerade; ett befintligt scrolltest i
`e2e/row-details.spec.ts` misslyckades (`1764` mot förväntat `<1094`).
Isolerad omkörning med en arbetare av samma fil passerade båda testerna;
serverdiagnostiken var ren. Felet återkom alltså inte isolerat, men hela
sviten var inte grön i första körningen. Ingen produktkod ändrades för detta.
E2E verifierar befintliga produktflöden; prototypens genomgång är separat.

Efter användargranskning dokumenteras eventuella ändringar i issuebesluten innan
produktimplementation startas. Inga nya domänbegrepp eller arkitekturbeslut har
införts; ingen ADR-ändring behövs för denna fristående prototyp. Den äldre
`monthly-overview-design.md` uppdateras vid implementation, enligt #77.
Prototypen är lokal och ocommittad; skillens senare arkivering på en throwaway-branch
startas inte utan ett separat commit-/publiceringsuppdrag.
