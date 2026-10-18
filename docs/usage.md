# Använd Hemekonomi

Guide till månadsöversikten och registreringarna. [Domänbegreppen](../CONTEXT.md) förklarar även planerade funktioner; den här guiden beskriver det implementerade beteendet.

## Överblick och detaljer

- **Månaden** visar först **Att föra över** och därefter posttabellerna. Inkomstjämförelsen **Räcker inkomsten?** ligger längre ned. Alla fem kort kan minimeras med pilknappen och tangentbordet; de öppnas igen vid omladdning.
- Kortrubrikerna har dekorativa ikoner för överföringar, utgifter, avräkningar, sparande och inkomstjämförelse. Rubriktexten och kortens tillgängliga namn behålls.
- Välj månad direkt eller använd pilarna och **Denna månad** (Stockholmstid). Vid byte visas en diskret laddningsstatus och väljarens kontroller spärras. Rubrik och data byts tillsammans när månaden är klar; scrolläge, fokus, övriga URL-parametrar och webbläsarhistorik bevaras. Intervallet är 1900–2199. Väljaren på **Överföringar och värden** använder fortsatt **Visa**.
- Direkta utgifter har en egen tabell. Avsatta utgifter, avräkningar och sparanden visar **Namn**, **Per månad** och **Totalt undansparat**, med summor per tabell. Undansparat räknas enbart från registrerat ingående värde, insättningar och uttag per post, oberoende av bankkonto. Värdedatumet är månadsslut för tidigare månader och dagens datum i Stockholm för aktuell eller framtida månad. Saknat startvärde markeras med **Ingående värde saknas**; registrerat nollvärde är känt.
- Tryck på postradens belopp eller tomma yta, eller aktivera namnets knapp med Enter/Space, för detaljer i en sidopanel (helskärm på mobil): datum, ägare och beräkningsuppgifter, månadens planuppföljning, överföringshistorik samt en länk till registrering för rätt post. Escape eller **Stäng** återför fokus till namnet. Panelen stängs vid månadsbyte eller navigering.
- Ändra och avsluta posten via **Ändra** och **Avsluta** i detaljerna. Panelen ersätts tillfälligt av befintligt formulär; avbryt återgår till detaljerna och lyckad sparning visar uppdaterade detaljer. Avslut återgår till översikten med bekräftelse och fokus vid kortet. Hanteringsläge och åtgärdskolumner finns inte på Månaden; skapandeknapparna behålls.

## Inkomster och utgifter

- Lägg till inkomstkällor under **Inställningar → Hushållets inkomster** med namn, månadsbelopp efter skatt, startdatum, valfritt slutdatum och planerad dag i månaden. Båda gränsdatumen ingår. Utan slutdatum gäller inkomsten tills vidare. Beloppet vid respektive källas planerade dag räknas i månadsbudgeten.
- Vid ändrat inkomstbelopp: välj **Ändra från valt datum**. Det gamla beloppet avslutas dagen före och det nya börjar gälla valt datum; senare versioner bevaras. Ändring från versionens startdatum ersätter den versionen. **Rätta denna version** behåller startdatumet och uppdaterar även historiska belopp. Äldre månadsregistreringar och medlemsinkomster migreras enligt [arkitekturen](architecture.md#pengar-och-datum).
- Formulär för utgifter, inkomster, sparande och familjemedlemmar bekräftar när sparningen lyckats. Stänger du ett ändrat formulär med krysset, Escape eller ett tryck utanför väljer du om du vill fortsätta redigera eller kasta ändringarna.
- Utgifter betalas varje månad eller avsätts inför betalning var 2, 3, 6, 12 eller 24:e månad. Ange startdatum, planerad dag i månaden och, för avsatta utgifter, nästa betalningsdatum.
- Välj **Direkt utgift**, **Avsatt utgift** eller **Avräkning** när posten skapas. Typen är sedan låst, även vid rättelse och **Ändra från valt datum**. För en annan typ avslutar du den gamla posten och skapar en ny; registrerade pengar och överföringar ligger kvar på den gamla posten. Avslut gäller den valda versionen och bevarar senare versioner. Båda posterna kan ge ett månadsbelopp under övergångsmånaden, beroende på giltighetsdatum och planerad dag. Se [beslutet om låst typ](adr/0005-locked-expense-types.md).
- Månadsavsättningen är beloppet delat med intervallet, avrundat till öre per utgift. Betalningen räknas inte dubbelt. Kontots saldo och extra avsättning inför första betalningen ingår inte.

## Avräkningar

- **Avräkningar** planerar större framtida utgifter: ange dagens kostnad, nästa utgiftsdatum och valfria ägare. Påslag i kronor eller procent och årlig inflation med ränta på ränta är valfria; standardvärdena är 10 respektive 2 procent. Formuläret visar beräknat totalbelopp och månadsavsättning.
- Avräkningens avsättning löper till månaden före utgiften och justeras till exakt målbelopp i öre. En utgift i startmånaden får en enda avsättning. Posten finns kvar när avsättningen upphör; ange ett nytt utgiftsdatum för en ny plan. Registrerade insättningar och uttag följs upp separat och ändrar inte prognosen. Bankkontosaldo och faktisk avkastning ingår inte. Avräkningar visas på en egen överföringsrad och räknas bara en gång i utgiftssumman. Se [beräkningsreglerna](architecture.md#avräkningar).

## Historik och registrerade värden

- **Ändra** och **Avsluta** inkomster, utgifter eller sparande gäller från valt datum. Tidigare dagar och kommande versioner behålls. Avslut från versionens startdatum döljer hela versionen. Månadsöversikten skiljer definitionen vid månadens slut från planbeloppet vid den planerade dagen och visar ändringar inom månaden; ingen dagsproportionering görs. Under **Historik** kan tidigare och kommande versioner visas och redigeras.
- Under **Överföringar och värden** registrerar du manuellt insättningar, uttag och ingående värde för avsättningar, avräkningar och sparande. Utfört datum styr öronmärkt värde, medan **Avser månad** styr planuppföljningen. Flera överföringar med valfria belopp kan registreras för samma månad. Planerade belopp flyttar inga pengar och skapar inga bekräftade överföringar; verkliga bankkontosaldon ingår inte.
- Lägg till medlemmar under **Inställningar** och välj valfritt flera ägare per utgift. Namnen ger ingen inloggning och påverkar inte summorna.

Månadsöversikten visar sparad hushållsdata. För installation och migration före start, se [lokal utveckling](local-development.md).

## Konto och tema

Alla Google-konton kan registrera sig. Vid första inloggningen skapar användaren ett eget hushåll. En unik databasregel tillåter ett personligt ägarhushåll per konto. Tvingande RLS skyddar datan även om en fråga saknar hushållsfilter.

Under **Inställningar → Konto** visas kopplade inloggningssätt. Befintligt lösenord ändras med det nuvarande lösenordet; övriga enheter loggas ut. Google-användare kan lägga till lösenord via en mejllänk utan att skapa ett nytt konto eller hushåll. Lösenordskonton kan koppla Google med samma verifierade e-postadress. Flödet **Glömt lösenord?** finns också kvar. Google-token lagras krypterat och OAuth-state som en engångspost i databasen.

Under **Inställningar** kan System, Ljust eller Mörkt väljas för denna webbläsare. Gränssnittet använder sand, aubergine, blått, senap och salvia.

[Till dokumentationsindexet](README.md) · [Till projektets README](../README.md)
