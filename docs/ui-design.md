# Gemensamt UI och formulärdesign

Historiskt kravunderlag för #97/#83. Båda stegen är genomförda; se [aktuella UI- och formulärregler](ui-components.md). Den ursprungliga intervjun och införandeordningen bevaras nedan.

Bekräftad kravspecifikation för [#97](https://github.com/Visegue/home-economy/issues/97) och [#83](https://github.com/Visegue/home-economy/issues/83). Kravintervjun avslutades med användarens bekräftelse av helheten, Q20, den 2026-10-10. Issues är specificerade för senare implementation i ordningen #97 → #83. Specifikationen är kravunderlag; leveransmandatet lämnas separat av användaren. #97:s gemensamma UI-grund är implementerad enligt [UI-regler och inventering](ui-components.md). #83:s ändrade formulärbeteende följer i ett separat steg.

## Bekräftade beslut

- Q1: Standardiseringen omfattar hela appen, inklusive befintliga och framtida sidor, autentisering, onboarding och lösenordsflöden.
- Q2: En annan visuell profil fick utforskas om den kunde ge nytta. Utforskningen är avslutad; Q11 väljer att behålla befintligt färgschema.
- Q3: Ett privat `packages/ui` införs inom samma repo. Appen behåller sin nuvarande plats. UI och app ändras i gemensamma PR:er och följer appens release; ingen separat publicering beslutas. Paketet får inte importera appens ekonomiska regler, autentisering eller databasåtkomst. Paketets ändringar måste omfattas av test-, säkerhets- och releasekontroller. Se ADR 0006.
- Q4: Läsbarhet och snabb ekonomisk överblick prioriteras. Jämförbara riktningar utforskades med samma formulär och månadsöversikt; färgvalet fastställs av Q11.
- Q5: Varm plommon uppskattas som accent. Utforskade paletter ersätter inte appens befintliga färgschema; Q11 fastställer nuvarande färger som utgångspunkt.
- Q6: Typvalet Direkt/Avsatt/Avräkning placeras kompakt överst i samma formulär. Relevanta fält visas efter vald typ; inget separat guide-steg införs. Vid redigering förblir typen låst och visas som information.
- Q7: Minimera initiala hjälptexter och detaljer. Information visas från början när den är nödvändig för det aktuella beslutet, enligt Q9.
- Q8: Ikoner är förstahandsval för åtgärder; synlig text används när det är nödvändigt för begriplighet, enligt Q10. Fältetiketter och värden tas inte bort som följd av detta.
- Q9: Förklaringar och exempel nås via informationsknapp. Fel som behöver åtgärdas och varningar om konsekvenser visas när de är relevanta. Exempelvis ska varningen vid negativt registrerat värde vara synlig i bekräftelsen, medan en allmän förklaring av avräkningsberäkningen kan ligga bakom information.
- Q10: Tvetydighet går före preferensen för ikoner. Bekräftelser besvarar den faktiska frågan med tydlig text, exempelvis Ja/Nej eller en uttrycklig åtgärd. En bock och ett kryss ersätter inte dessa svar. Autentiseringsmetoder och andra val som behöver text behåller den.
- Q11: Behåll appens nuvarande färgschema till att börja med. Den sista ljusa förhandsvisningen upplevdes bättre men tråkig; tabelltext var inte synlig för användaren. Dess färger är inte godkända som ersättning. Användaren kan justera färgprofilen senare. Befintliga ljusa tokens i `src/app/globals.css` är utgångspunkt, med nödvändiga korrigeringar om verifiering visar faktisk oläsbarhet i appen.
- Q12: Stöd för både ljust och mörkt tema önskas, om möjligt. En mörk motsvarighet till befintlig profil behöver tas fram eftersom appen idag bara definierar ljusa tokens. Detta är temaanpassning, inte en ny färgprofil för det ljusa temat.
- Q13: Toppmeny på dator och bottenmeny på mobil väljs. Dagens fem huvudmål behålls; Historik och Överföringar nås fortsatt från Månaden. Anpassning vid mellanbredder och tillgänglig interaktion preciseras i implementationsspecen.
- Q14: UI-paketet äger färger, typografi, avstånd, kontroller och delade presentationsmönster för fält, rubriker, layout och dialoger. Appen komponerar dessa med navigation och ekonomiska formulär. Domänregler och dataåtkomst stannar i appen.
- Q15: Nya fel visas vid sparförsök, kopplas till respektive fält och första felaktiga fältet får fokus. Efter första försöket uppdateras fältfelet när fältet lämnas. Övergripande fel visas gemensamt. Ofullständiga förhandsberäkningar visar —, inte ett skenbart nollbelopp. Servervalidering är fortsatt auktoritativ; säkerhetskänsliga autentiseringsfel får inte röja om ett konto finns.
- Q16: Skapandets typbyte behåller gemensamma uppgifter och typspecifika utkast enligt befintligt beteende. Etiketter och enheter tydliggör att beloppets betydelse kan ändras. Typen förblir låst vid redigering.
- Q17: Systemets inställning är standardtema. Tidigare förslag om ljust som standard är ersatt.
- Q18: Inställningar erbjuder System/Ljust/Mörkt. Valet sparas per webbläsare och gäller även login och onboarding. System följer operativsystemets ändringar; uttryckligt val går före. Ingen konto-/hushållssynkning av preferensen införs.
- Q19: Två steg med en PR per issue: #97:s UI-grund, teman och navigation först, sedan #83:s formulär-UX ovanpå den mergade grunden. Dokumentation, ADR-bedömning, tester och säkerhetsskanningar ingår i båda.
- Q20: Användaren bekräftade den sammanställda helheten. Kravintervjun är avslutad; ingen ytterligare produktfråga väntar på svar.
- Luftiga marginaler, padding och mellanrum prioriteras. Färre synliga detaljer ska inte uppnås genom att komprimera kontroller eller göra text mindre.
- #97 samlar gemensamma UI-mönster och användningsregler. #83 preciserar formulärens läsbarhet, gruppering och typval. Gemensamma delar ska samordnas.

## Faktaunderlag inför implementation

Inventerat mot appversion 0.14.0 före #97. Nulägesbeskrivningarna i detta avsnitt är historiskt inventeringsunderlag; den implementerade grunden beskrivs i [UI-reglerna](ui-components.md). Projektet har en Next.js-app i repots rot. `pnpm-workspace.yaml` innehåller byggallowlist och beroendeoverrides, men ingen lista av separata workspace-paket. Befintlig UI-grund är shadcn/ui, Radix, Tailwind CSS 4 och tokens i `src/app/globals.css`.

- `src/components/ui/` delar basprimitiver. AppShell, CollapsibleCard, ActionIconButton, InfoButton och FormDialog/FormDialogContent delar större mönster och interaktionsskydd.
- Fältgrupper och hjälp-/felkoppling byggs upp lokalt; en gemensam presentation kan återanvändas utan att flytta domänvalidering.
- Budget, inkomst och sparande duplicerar sticky formulärfot. Auth och registrering av överföringar har andra, avsiktliga primära åtgärder.
- Checkbox/radio förekommer som enkla kontroller, utgiftstypskort, ägarflerval och färgpalett. Gemensamma kontrollregler får inte sudda ut deras olika innehåll.
- AppShell härleder titel från huvudnavigationen. Historik och Överföringar saknas där, får fallbacktiteln Månaden och lägger till egna h1. Auth/onboarding använder CardTitle som h2 utan egen h1. Explicit sidtitel och semantiska rubriknivåer behöver hanteras i förslaget.
- Authsidor upprepar layout men har legitima breddskillnader. Onboarding har ett annat placeringsbehov. Sidspacing, fältspacing och innehållsgrids behöver beskrivas efter roll, inte tvingas till ett enda avstånd eller grid.
- Huvudnavigationen har fem mål. Vid `lg` tar sidomenyn 256px; under `lg` används femkolumners bottenmeny. Vid 1024px skärm återstår ungefär 704px för innehåll efter meny och padding. Historik och Överföringar nås från månadsöversikten och ingår inte i huvudmenyn. En ändring av placering ska skiljas från ett beslut om fler globala mål.
- `globals.css` innehåller ljusa tokens och en `.dark`-variant, men ingen mörk tokenuppsättning. Sökning hittar ingen ThemeProvider eller systemstyrning i appen. `dark:`-klasser i UI-primitiverna innebär därför inte ett färdigt mörkt tema.
- Rootlayouten omfattar även login/onboarding; temat måste tillämpas där och omfatta portaler/dialoger samt native datum-/månadskontroller. Diagram använder redan chart-tokens. Hushållsmedlemmars avsiktliga färger och Googles logotyp är inte generella färgprofilstokens och måste behålla sina betydelser.
- Formulären validerar huvudsakligen vid submit, med native HTML-validering före submit där sådan finns. Sparande har fältkopplade serverfel; budget/inkomst/medlem och auth använder främst gemensamma fel. Ingen gemensam blur-validering eller automatisk fokusering av första serverfel finns. Fältfel kan ligga kvar tills nästa submit.
- Vid skapandets typbyte bevaras gemensamma värden och dolda typspecifika utkast. Avsatt och avräkning delar nästa utgiftsdatum; planerad dag bevaras separat per typ. Domändokumenten föreskriver inte valideringstidpunkt, fel-fokus eller återställning vid skapandets typbyte.

## Befintliga krav som ska bevaras

Domänregler och åtkomst ligger kvar i appens features. ADR 0004/0005 gäller fortsatt: rättelse skiljs från ändring från valt datum, framtida versioner bevaras och utgiftstypen är låst vid redigering. Utfört datum, avser månad och faktiskt belopp behåller sina olika betydelser. Negativt registrerat värde kräver uttrycklig bekräftelse.

FormDialog-skydd för osparade ändringar och pending, mobilens fokus/scroll, autentiseringens autofyllning samt #66:s återgång till rätt post och fokus ska bevaras. UI-standardisering ändrar inte servervalidering, RLS eller databasbehörigheter.

## Status och tekniskt handlingsutrymme

Inga ytterligare produktval har identifierats och helheten är bekräftad. Komponenternas exakta exports, CSS-/gridutformning, temainitiering och lagringsmekanism väljs vid implementation inom kontrakten nedan. Detta ger inget mandat till nya produktfunktioner eller nya domänregler.

Återanvänd befintlig shadcn/Radix-grund. Flytta rena UI-primitiver och delade presentationsansvar till paketet; lämna Next-routing, autentiseringskoppling, hushållsdata och ekonomiska beräkningar i appen. Små gemensamma gränssnitt ska bära verkligt återkommande ansvar. Layout kan delas med tokens/klasser när en React-wrapper inte tillför något. Serverkompatibla exports ska behållas; interaktiva delar får inte göra hela paketet till klientkod.

Sidor har en explicit, korrekt h1. Sektioner och dialoger använder semantiskt lämpliga rubriknivåer. Historik och Överföringar ska inte ärva Månaden som titel. Spacing/maxbredder följer innehållsroller: sidlayout, sektion, fältgrupp och åtgärdsfot. Legitima skillnader mellan listor, kortgrids, auth och onboarding bevaras och dokumenteras.

Formulär grupperas efter grunduppgifter, datum/giltighet och relevanta typspecifika uppgifter; gemensamma etikett-/hjälp-/felkontrakt återanvänds. Förklaringar ligger bakom tillgänglig InfoButton. Nödvändig varning och fältfel ligger intill beslutet/fältet. Spara är nåbart även med mobilt tangentbord och scrollning. Formulären ligger kvar i befintliga dialoger/paneler där sådana redan används; inget guide-steg eller byte till egen sida införs.

Fel uppdateras efter första sparförsöket vid blur för regler som kan kontrolleras lokalt. Serverberoende fel kontrolleras vid nästa uttryckliga sparförsök; ingen extra auth-/databasförfrågan krävs för varje blur. Fältfel markeras med `aria-invalid` och beskrivningskoppling. Gemensamma fel annonseras; focus flyttas till första felaktiga fältet eller en fokuserbar gemensam felpresentation när inget fält kan pekas ut. Authfel förblir säkert generiska. Domänvalideringens utfall får inte ändras av presentationen.

Paketplaceringen är beslutad i ADR 0006. Tekniska UI-begrepp förs inte in i domänordlistan CONTEXT.md.

## Integrations- och verifieringskrav

Systemtemat ska följa ändrad OS-inställning under pågående session. Ett explicit val ska vinna över systemet. Saknat, ogiltigt eller otillgängligt sparat val faller tillbaka till System utan att blockera appen. Temat ska tillämpas konsekvent på autentisering, onboarding, app, dialoger och native kontroller, utan felaktig första temabild eller hydrationfel. Den ljusa paletten bevaras; den mörka motsvarigheten verifieras för faktiska text-/ytpar, fokus, fel, disabled, tabeller, diagram och avatarer. Beräknade enskilda kontrastpar ersätter inte visuell granskning i den riktiga appen.

Navigationen ska fungera vid 320px, mellanbredder och desktop utan att täcka innehåll, fokuserade element eller formulär vid öppet mobilt tangentbord. Safe area, aktiv sida, tangentbordsordning, tillgängliga namn och posternas befintliga fokusåtergång bevaras. Brytpunkter väljs efter att verkligt innehåll ryms, inte efter en förenklad förhandsvisning.

Tester ska omfatta båda systemlägena, explicita temaval, OS-byte, omladdning, sidbyte och dialoger. #83 täcker direkt/avsatt/avräkning/sparande, inkomst och övriga formulär som migreras, inklusive skapa/redigera/rätta, framtida versioner, giltiga och ogiltiga belopp, typbyte tillbaka, hjälp, osparat/pending och fokusåtergång. Nollbelopp och negativa belopp följer befintliga domänregler, inte förhandsvisningens förenklade validering.

`pnpm check`, `pnpm test:e2e`, dokumentation, ADR-bedömning och säkerhetsskanningar ingår i respektive implementation. Kör `pnpm audit`, CodeQL för slutlig PR-kod och kontroll av secret scanning/push protection; redovisa befintliga fynd och nya fynd utan att kringgå säkerhetskrav. `pnpm db:check` krävs om integration/behörigheter påverkas. Endast syntetiska data används. En annan agent granskar både Standards och Spec samt test-/säkerhets-/leveransbevis. Vid senare auktoriserad leverans verifieras CI och produktion på rätt merge-commit före nästa issue.

UI-paketets ändringar ska omfattas av versionering och befintliga CI-/releasekontroller: workspace-konfiguration, typkontroll/tester, Tailwind-källor, shadcn-konfiguration, versionskontrollens releasepåverkande sökvägar och migration-/preview-gate granskas. Gemensam apprelease används och endast CI skapar releasetaggar. Databas-/behörighetsändringar ingår inte i UI-arbetet.

## Beslutad införandeordning

1. #97: Privat UI-paket, bevarade ljusa tokens och mörka motsvarigheter, gemensamma bas- och layoutmönster, konsekvent användning i hela appen samt topp-/bottennavigation. Befintliga ekonomiska regler och formulärbeteenden bevaras i detta steg.
2. #83: Formulärens gruppering, kompakta typval, hjälp, ikon-/textåtgärder och felbeteende enligt Q6–Q10 och Q15–Q16, ovanpå den gemensamma grunden. Täcker relevanta skapa-/redigera-/rättelseflöden och gemensam felpresentation även i auth/onboarding.

En separat PR per issue är beslutad. Den andra börjar från den första mergade grunden. Ta med denna kravspecifikation och ADR 0006 i första PR. Denna kravspecifikation ger inte i sig leveransauktorisation; användarens separata beställning styr genomförandet.

## Visuella förslag under utvärdering

**Status efter senaste återkopplingen:** Förslagen nedan är historiskt utforskningsunderlag och ska inte användas som godkänd färgspecifikation. Nuvarande färgschema behålls enligt Q11. Toppmeny/bottenmeny är däremot beslutade enligt Q13. Att tabelltext var oläsbar i användarens förhandsvisning ska inte förklaras bort med beräknad kontrast; faktisk text och yta måste verifieras tillsammans i appen, i båda teman.

Den ursprungliga jämförelsen använde **Varm plommon** och **Klar blå**. Den aktuella jämförelsen använder i stället **Sidomeny** och **Toppmeny** med samma ljusa plommonaccent, samma syntetiska belopp och samma förenklade formulär. Sidomenyn illustrerar dagens 256px bredd; toppmenyn ger innehållet mer bredd. Båda visar bottenmeny på mobil. Presentationen börjar uttryckligen ljust även i mörk chatt. Mörkt kan utforskas med förhandsvisningens temaval; detta är inte ett beslutat gränssnitt för appens temainställning. Exempelformuläret visar presentation och typberoende fält, inte samtliga domänfält eller ett beslutat byte från dialog till sida. Mobilmenyn återges i normalt dokumentflöde i exemplet; det ändrar inte i sig appens befintliga fasta placering.

Förslagen har granskats visuellt vid desktop och 390px mobilbredd, i ljus/mörk presentation. Öppning/återgång, radiotypval med uppdaterad hjälp och fält samt felvisning vid nollbelopp har provats. Det är designexempel, inte appkod eller godkända ekonomiska valideringsregler.

Efter användarens återkoppling har Varm plommon reviderats: plus-, stäng- och sparaikoner, hjälp som öppnas per typ-/datumgrupp och rymligare formuläravstånd. Ordinarie fältetiketter behålls. Ikonerna har tillgängliga namn; hjälpknappar annonserar öppet/stängt. Revideringen är visuellt granskad vid 390px och hjälp/visning av fel vid tomt belopp har provats. Exemplet ställer inte längre krav på positivt belopp; den verkliga domänvalideringen ska vara oförändrad.

Den föregående plommonpaletten hade god beräknad textkontrast men upplevdes ändå svårläst. Textkontrast ensam är därför otillräcklig som godkännande: färgval måste även bedömas visuellt för tydliga ytor, fält, grupper och tillstånd. Förslaget revideras med neutrala ytor och plommon på åtgärder och aktivt val. En ljus/mörk presentation i designexemplet innebär inte att mörkt tema redan är beslutat för appen.

Den nya plommonriktningen använder neutral sidbakgrund, separat kortyta, egna inmatningsytor och tydligare fältkanter. Navigationens bas är neutral och sammanfattningen har en liten plommonmarkering i stället för en stor färgad yta. Luft och hjälp-/ikonbeteende från föregående revision behålls. Desktopöversikt har granskats i ljus/mörk presentation, formulär i ljust vid 390px och mörkt vid 320px. Typbyte, öppning av information och fel vid tomt belopp har provats i denna revision.

Efter Q11–Q14 visas även navigationen med ljus yta och mörk text. Sidomeny och toppmeny har granskats vid 1024px och bottenmenyn vid 320px. Att produktförslaget förblir ljust trots mörk omgivning, menyknapparnas tillgängliga namn och öppning av toppmenyvariantens formulär har verifierats. Navigation och den senaste ljusa färgriktningen väntar på användarens bedömning.

Beräknad kontrast mot kortytan: ljus huvudtext 15,24:1, sekundärtext 6,18:1 och fältkant 3,45:1; mörk huvudtext 11,55:1, sekundärtext 7,45:1 och fältkant 3,25:1. Fältkant mot inmatningsytan är 3,22:1 ljust och 4,42:1 mörkt. Kontrollen omfattar dessa färgpar, inte alla tillstånd eller hela appens tillgänglighet. Den visuella riktningen väntar på användarens bedömning.

Lokalt primärunderlag: `/Users/alexanderfridlund/.codex/visualizations/2026/10/08/01a11b75-32e4-7b30-b2e3-83ea81ac2d7f/hemekonomi-ui-riktningar.html`.

## Tillgänglighetsunderlag

Ikonåtgärder behöver ett tillgängligt namn som beskriver syftet enligt [WCAG 1.1.1](https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html). Produktens befintliga ActionIconButton har aria-label, tooltip och pending-spärrning och ska återanvändas eller motsvaras av samma kontrakt i UI-paketet. Hjälp måste kunna nås med tangentbord och touch, inte bara hover. Kontrast verifieras för text och faktiskt använda ytor enligt [WCAG 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html); klickytor och mellanrum enligt [WCAG 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html). Den föreslagna designen ska gå att förstå utan att enbart tolka färg.

## Genomfört formulärsteg (#83)

Formulärens gemensamma klientexport i `packages/ui/src/form.tsx` delar namngivna grupper, lokal submit/blur-feedback, aria-koppling och fokus. Appens `src/features/forms/validation.ts` återanvänder ekonomiska scheman, och lösenordsjämförelsen ligger i appens authpresentation. Servervalidering, generiska autentiseringsfel och behörigheter är fortsatt auktoritativa. Kompakt typval ligger först, med bevarade gemensamma/typegna utkast och låst typ vid redigering. Avsatt/avräkning visar — för ogiltigt beräkningsunderlag.

Konsumenter, avsiktlig serverrenderad filterform, giltiga nollvärden och ADR-bedömning finns i [UI-komponenternas kontrakt](ui-components.md#formulärkontrakt-83). Den bekräftade paletten och navigationen från #97 gäller oförändrat.
