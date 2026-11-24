# Säker utveckling - viktigt

Detta projekt är en utvecklingskopia av den fungerande namnskyltsappen.

## Grundregel

- Ändra inte den livekopplade produktionsmappen när vi testar nya JSF Flow-funktioner.
- Den här ZIP-filen innehåller ingen `.git`-mapp, `node_modules` eller färdig `build`.
- Nuvarande beställningsflöde, produktdata och Express-API finns kvar.
- Azure-workflow-filen finns kvar som referens, men gör ingenting förrän projektet läggs i ett Git-repository och pushas.

## Rekommenderat Git-flöde i ditt befintliga repository

1. Kontrollera att allt är pushat: `git status`.
2. Byt till nuvarande utvecklingsgren: `git switch dev`.
3. Hämta senaste: `git pull`.
4. Skapa en separat gren: `git switch -c jsf-flow-dashboard`.
5. Gör och testa ändringarna där.
6. Pusha bara den nya grenen: `git push -u origin jsf-flow-dashboard`.
7. Mergea inte till den gren Azure deployar från förrän vi uttryckligen har kontrollerat att allt fungerar.

Kontrollera alltid vilken gren Azure-workflowen lyssnar på innan merge.
