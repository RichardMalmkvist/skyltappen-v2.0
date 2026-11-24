# Arkitektur - stegvis utbyggnad

## Det vi behåller oförändrat

- Publik startsida och produktbeställning
- Namnbrickor och yrkestitelsskyltar
- Kundkorg och orderläggning
- Befintliga ordernummer och statusar
- Befintlig orderlista
- Azure Storage / e-postkoppling i `server/server.js`

## Ny inloggad struktur

Efter lyckad admininloggning går användaren till `adminHome` i stället för direkt till `orders`.

Moduler:

- Översikt / planering
- Befintliga beställningar
- Lagda produktionsordrar
- Ordrar att godkänna
- Artiklar
- Artikelgrupper
- Projekt
- Ritningar
- Planering
- Användare
- Behörigheter
- Inställningar

## Nästa datamigrering

Dagens katalogdata ligger kvar i `src/data`. Senare flyttar vi artikel-/gruppstatus till administrerbar backend-data så att öppna/stänga, skapa, ändra och radera kan göras i gränssnittet utan kodändring.
