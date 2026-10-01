# Giltighetsdatum och registrerade överföringar

Finansiella definitioner versionshanteras med exakta, inkluderande giltighetsdatum och en stabil identitet. Framtida versioner bevaras när en tidigare period ändras; en rättelse ändrar den valda versionen. Månadsöversikten skiljer värdet vid månadens slut från beloppet vid den planerade betalningsdagen. Dagsproportionering görs inte.

Förväntade överföringar beräknas från definitionerna. Endast manuellt bekräftade insättningar och uttag lagras som faktiska händelser. Utfört datum styr öronmärkt värde, medan en separat månad styr planuppföljningen. Detta undviker att en kalenderhändelse eller ett ändrat budgetbelopp blir en påstådd penningförflyttning. Inkomster och direkta utgifter är budgetunderlag; banköverföringar, kontosaldon och avkastning ingår inte.

## Bekräftade regler

- Standarddag per hushåll och typ är initialt 25. Nya poster får ett eget datum; ändrad standard påverkar inte befintliga poster. Korta månader använder sista dagen.
- Ändringar inom månaden visas med datum och tidigare/nytt värde. Avslutade poster som påverkar månadens belopp visas även efter avslutsdatumet.
- En kommande ändring visas vid redigering. Ingen massöverskrivning av framtida ändringar införs.
- Överföringar kan ha valfria belopp och datum, flera gånger i månaden. Bekräftade händelser ändras aldrig när en definition ändras.
- Ingående värde anges med datum. Historiska planer blir aldrig automatiskt insättningar.
- Uttag minskar värdet vid manuell bekräftelse. Negativt registrerat värde kräver en uttrycklig varningsbekräftelse.
- Planuppföljning visar planerat, insatt och kvar/över plan. Uttag och ingående värde räknas inte som bidrag till månadens plan.
- Exempel: en insättning den 2 november som avser oktober räknas mot oktoberplanen men höjer värdet först den 2 november.

## Införande

Arbetet sker i ordningen gemensamt skrivprotokoll och identitet, datumstyrd månadsöversikt, samt manuella överföringar och uppföljning. Äldre versioner saknar säker koppling till varandra; migrationen får inte gissa samband från lika namn. Befintliga månadsperioder och okända startdatum bevaras.

### Kompatibilitetsgräns vid första skrivning

Migration 0014 är additiv och lämnar befintliga data läsbara för föregående app. Däremot kan två exakta versioner inom samma månad inte representeras korrekt av en app som bara förstår månadsgränser. Äldre inkomster saknar även stöd för den nya inaktiveringen. Vi väljer därför rättande releaser framåt efter att den nya appen börjat skriva, i stället för en förlustbringande nedkonvertering av historik eller skenbar dubbelkompatibilitet.

Detta preciserar ADR 0002: kompatibilitet med föregående app gäller efter enbart migrationen, inte efter nya skrivningar. Innan nya skrivningar tillåts ska äldre previews som delar databasen stängas för åtkomst eller uppdateras. Produktion ska bara exponera det promoverade bygget för skrivningar. Återgång till äldre app är endast tillåten om det har verifierats att inga nya datumversioner, inaktiverade inkomster eller registrerade överföringar har skrivits; vid osäkerhet gäller rättande release. Överföringshistorik får inte raderas för att möjliggöra återgång. Körordning och kontrollfrågor finns i release-runbooken.
