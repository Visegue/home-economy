# Låst utgiftstyp vid redigering

Utgiftstypen väljs när en post skapas och får därefter inte ändras genom redigering eller rättelse. **Ändra från valt datum** fortsätter att bevara tidigare giltighet och senare versioner enligt ADR 0004; den version som skapas genom ändringen behåller den valda versionens typ. En annan typ kräver avslut och en separat ny post, utan automatisk överföring, kopiering eller frigörande av registrerade pengar.

Kompatibilitet med äldre typbyten ingår inte i issue #79. Användaren har avgränsat arbetet utifrån att all befintlig data är testdata och funktionen ännu inte har driftsatts. Särskild visning, kategorisering och summering för äldre poster med blandade typer behövs därför inte. Med den nya regeln behåller en post sin typ genom alla ändringar och rättelser.

Beslutat i designintervjun för [issue #79](https://github.com/Visegue/home-economy/issues/79).
