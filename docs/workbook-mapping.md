# Från arbetsbok till produkt

Källarbetsboken innehåller 22 blad och historik från 2015–2026. Webbappen behandlar inte varje årsblad som en egen funktion. De återkommande mönstren blir i stället följande produktområden.

| Arbetsblad                                          | Betydelse                                                                                                                               | Produktvy                                  |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `InkomstKostnader`                                  | Inkomster, fasta och periodiska kostnader, betalningsintervall, nästa betalning, kostnad per månad, fördelning och långsiktiga reserver | Återkommande poster och månadsplan         |
| `Flöde`                                             | Fördelning av hushållets netto mellan konto, fasta/variabla kostnader, buffert, sparmål och amortering                                  | Planens fördelning och kassaflöde          |
| `Kvar på kontot`                                    | Saldo före lön, extra insättningar/uttag och kommentarer per månad över flera år                                                        | Likviditetshistorik                        |
| `Konto - ÅÅÅÅ`                                      | Månatliga saldon för gemensamma och personliga konton, barnsparande, pensioner, investeringar och lån                                   | Konton, skulder och förmögenhetsbild       |
| `Investeringar - ÅÅÅÅ` och äldre investeringstabell | Insättningar, marknadsvärde och utveckling för vuxna och barn                                                                           | Investeringar och värdehistorik            |
| `Grafer`                                            | Formelbaserade hjälpserier från övriga blad                                                                                             | Beräknas av appen; inget separat datalager |

## Modellprinciper

- Ett hushåll äger sin data och kan ha flera medlemmar.
- År är ett filter, inte en egen tabell eller vytyp.
- En återkommande post lagrar belopp, intervall, nästa datum och hur pengarna hanteras.
- En månadsplan kan innehålla både återkommande poster och engångsposter.
- Kontosaldon lagras som tidsstämplade snapshots. Det räcker för både konton, lån, pensioner och investeringsvärde.
- Transaktioner och snapshots är separata: appen kan ge värde innan full bankimport finns.
- Historiska diagram beräknas från normaliserad data.

## Integritet

Arbetsboken används endast som kravunderlag. Den kopieras inte in i projektet, och dokumentationen innehåller inga verkliga namn, kontonummer eller belopp. En framtida import ska förhandsgranskas av användaren och vara möjlig att ångra.
