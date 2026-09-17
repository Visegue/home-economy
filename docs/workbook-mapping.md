# Från arbetsbok till produkt

Arbetsbokens 22 blad med historik från 2015–2026 blir produktområden utifrån återkommande mönster. Årsblad blir inga egna funktioner.

| Arbetsblad                                          | Betydelse                                                                                                                               | Produktvy                                  |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `InkomstKostnader`                                  | Inkomster, fasta och periodiska kostnader, betalningsintervall, nästa betalning, kostnad per månad, fördelning och långsiktiga reserver | Återkommande poster och månadsplan         |
| `Flöde`                                             | Fördelning av hushållets netto mellan konto, fasta/variabla kostnader, buffert, sparmål och amortering                                  | Planens fördelning och kassaflöde          |
| `Kvar på kontot`                                    | Saldo före lön, extra insättningar/uttag och månadskommentarer över flera år                                                            | Likviditetshistorik                        |
| `Konto - ÅÅÅÅ`                                      | Månadssaldon för gemensamma/personliga konton, barnsparande, pensioner, investeringar och lån                                           | Konton, skulder och förmögenhetsbild       |
| `Investeringar - ÅÅÅÅ` och äldre investeringstabell | Insättningar, marknadsvärde och utveckling för vuxna och barn                                                                           | Investeringar och värdehistorik            |
| `Grafer`                                            | Formelbaserade hjälpserier från övriga blad                                                                                             | Beräknas av appen; inget separat datalager |

## Modellprinciper

- Hushållet äger sin data och kan ha flera medlemmar.
- År är ett filter, inte en egen tabell eller vytyp.
- Återkommande poster lagrar belopp, intervall, nästa datum och hur pengarna hanteras.
- Månadsplaner kan innehålla återkommande poster och engångsposter.
- Tidsstämplade saldon (snapshots) används för konton, lån, pensioner och investeringar.
- Transaktioner och saldon är separata, så appen fungerar även utan full bankimport.
- Historiska diagram beräknas från normaliserad data.

## Integritet

Arbetsboken är bara kravunderlag och får inte kopieras till repot. Dokumentationen innehåller inga verkliga namn, kontonummer eller belopp. Framtida import ska kunna förhandsgranskas och ångras av användaren.
