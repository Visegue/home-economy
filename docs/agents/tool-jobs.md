# Verktygsuppslag och verifieringsjobb

## Riktade uppslag

Välj sökord, filglob och katalog från uppgiften före utskrift. Börja med `rg --files <katalog> -g '<relevant-glob>'` eller `rg -n '<symbol>' <relevanta-filer>`. Filtrera verktygsmetadata på namn/beskrivning och skriv bara matchande namn och nödvändiga fält; inventera inte alla verktyg i kontexten.

Läs oberoende filer separat eller med `Promise.allSettled` och granska varje utfall. För valfria domänfiler: kontrollera att varje fil finns före läsning och fortsätt med övriga. Ett saknat `GLOSSARY.md` får inte hindra läsning av `CONTEXT.md`. Obligatoriska läsfel behöver fortfarande hanteras. Rikta ADR-uppslag till området.

## Starta och följ ett jobb

1. Kör [förtestet](../../README.md#kvalitetskontroller) före längre lokal verifiering. Välj installerade runtimes i PATH; behåll paketens integritets-/signaturkontroller och tillåtna sandbox. Kör projektkommandon så att [Next-låset och worker-valet](../e2e-resources.md) gäller.
2. Kör längre verifieringar genom `pnpm agent:job run --name check --timeout-ms 900000 --quiet-ms 60000 -- pnpm check`. Vid pnpm-uppstartsproblem kan en redan installerad Bun/Node köra `scripts/agent-job.mjs` direkt. Kör `check` och E2E sekventiellt enligt resursguiden. Anpassa tidsgränsen till jobbet före start.
3. Spara verktygets sessions-ID och runner-/barn-PID, evidenskatalog samt deadline i arbetsanteckningarna. Följ samma session till slut. `QUIET` betyder att loggen inte vuxit under intervallet; det är ingen godkänd verifiering eller säker diagnos på låsning. Läs riktade utdrag medan jobbet kör, invänta deadline eller signalera just runner-PID med SIGINT/SIGTERM. Runnern avslutar sin egen POSIX-processgrupp, väntar och eskalerar efter en sekund till SIGKILL. Andra sessioners jobb berörs inte.
4. Bedöm `result.json`, slutstatus och loggens relevanta diagnoser. Normalt bevaras kommandots exitkod; timeout ger 124, avbrott 130/143, startfel 127 och misslyckad eller oväntat nödvändig barnstädning 125. Ursprungligt resultat/signal bevaras i rapporten när timeout/städning ändrar slutstatus. `cleanup: complete` krävs. Ett pågående jobb saknar slutrapport.
5. Före omkörning/alternativ: avsluta den föregående egna körningen och registrera dess slutstatus. Om verktygssessionen förlorats: kontrollera sparad runner-/gruppidentitet och evidens; redovisa den som oklar tills ägare och barn är utredda. Grupp-ID återanvänds av OS: skicka inte signaler utifrån gammal metadata. Starta inte en konkurrerande verifiering under tiden. Vid SIGKILL av runnern kan grupp och Next-lås behöva undersökas enligt resursguiden.

Runnern stöder POSIX-värdar. Kommandot och barnen måste stanna i dess processgrupp; daemonisering eller nya frikopplade sessioner ligger utanför detta kontrakt. Använd verktygs-API:ts motsvarande identifierade jobb/deadline där en shellprocess inte används. Respektera samma avslutsgräns och konto för tidigare egna körningar.

## Begränsad utskrift och återhämtning

Runnern visar högst 4 000 tecken från loggen plus kort identitet/slutstatus. `--limit` kan sättas till 256–20 000; mindre gränser avvisas före start så att fortsättningsmarkören alltid kan göra framsteg. Full kombinerad stdout/stderr skrivs direkt till `output.log` i en privat temporär katalog (0700, fil 0600); strömmarnas inbördes ordning beror på operativsystemets skrivningar. `result.json` innehåller slutstatus och processidentitet. Inga sessionsloggar ska läggas i Git.

Visade utdrag saneras med projektets befintliga diagnostikregler. Råloggen är fullständig och kan innehålla känsliga värden; behandla den som privat och öppna den inte genom en osanerad massutskrift. Sanering är ingen garanti för godtyckliga okända hemlighetsformat: använd syntetiska data och undvik kommandon som skriver hemligheter. Behåll underlaget tills utfallet är utrett, ta sedan bort just den utskrivna temporära katalogen när det är lämpligt.

`TRUNCATED` är inte fullständigt bevis. Följ den utskrivna fortsättningsmarkören med `pnpm agent:job read <evidenskatalog> --from <rad> --column <tecken>`, eller filtrera med `--match '<diagnos>'`. Filtret söker i sanerad text, och varje svar är fortsatt begränsat. Rad-/kolumnmarkören avser sanerad text, inklusive enskilda långa rader. Återhämta fel, relevanta utdrag och slutstatus innan slutsatser dras; upprepa en trunkerad läsning med dess nya markör. Samma metod kan kapsla stora riktade `rg`-uppslag. Om själva verktygssvaret ändå trunkeras: läs det sparade underlaget med mindre gräns och filter i stället för att upprepa massutskriften.
