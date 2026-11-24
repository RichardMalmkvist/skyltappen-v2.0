# JSF Flow – tomt artikelregister

Den här versionen startar med befintliga artikelgrupper men **inga artiklar**.
Alla nya artiklar skapas och ändras via Admin > Artiklar.

## Starta lokalt
Använd Node.js 22.9 eller senare. `npm run dev` startar både webben och API:t. Om Azure-anslutningen är tom startar ett lokalt testläge. Har den tidigare lokala appen ett godkänt adminkonto kan du använda samma inloggning. Du kan också logga in med `admin@jsf.test` och testlösenordet som visas i VS Code-terminalen. Katalog, ordrar, projekt, korrektur, ritningar och tillhörande filer läses från den tidigare arbetskopian när de finns. Ändringar sparas i minnet så länge utvecklingsservern körs. Testläget skickar inga ordermejl.

För att behålla ändringar mellan omstarter, använd en separat Azure-lagring för utveckling. Ange `AZURE_STORAGE_CONNECTION_STRING` i miljön eller kopiera `.env.example` till `.env` och fyll i utvecklingskontots anslutningssträng. `.env` är undantagen från Git. När anslutningen är angiven sparar utvecklingsservern data i Azure Blob Storage.

```bash
npm install
npm run dev
```

För att bara förhandsvisa webbgränssnittet kan du köra `npm run client`. Inloggning, sparade projekt och andra funktioner som använder API:t kräver servern och Azure-lagringen.

## Ny GitHub- och Azure-miljö

1. Pusha koden till grenen `dev` i det nya GitHub-repot. IT granskar och flyttar ändringarna till `main`. GitHub Actions bygger och testar ändringar mot `main`.
2. Skapa en egen Azure App Service för Linux med Node.js 22 och en separat Azure Storage. Lägg till `AZURE_STORAGE_CONNECTION_STRING` i App Service. För ordermejl behövs även `ACS_CONNECTION_STRING`. Sätt startkommandot till `npm start` och `SCM_DO_BUILD_DURING_DEPLOYMENT` till `false` så att Azure använder det färdiga paketet. Flytta den lokala arbetskopians data enligt avsnittet nedan före första starten.
3. Koppla en Azure-identitet till det nya repots `main` via OIDC. Ge identiteten rätt att driftsätta till den nya webbappen. Lägg identitetens ID:n i GitHub Secrets som `AZURE_CLIENT_ID`, `AZURE_TENANT_ID` och `AZURE_SUBSCRIPTION_ID`. Sätt repo-variabeln `AZURE_WEBAPP_NAME` till den nya webbappens namn och kör workflowen från `main`.
4. Verifiera att du kan logga in som administratör. Om du använde `INITIAL_ADMIN_EMAIL` och `INITIAL_ADMIN_PASSWORD` kan du ta bort dem när kontot har skapats.

Framtida ändringar pushas till `dev`. När IT flyttar dem till `main` bygger och testar GitHub Actions koden före driftsättning. Verksamhetsdata ligger kvar i Azure-lagringen.

### Flytta befintliga uppgifter från den lokala appen

Kör från arbetskopian där de befintliga uppgifterna finns. Kontrollen räknar poster och kontrollerar filreferenser utan att ansluta till Azure.

```bash
npm run import:local-data
```

Pausa ändringar i den lokala appen under flytten. Ange anslutningssträngen för det nya lagringskontot i miljövariabeln `JSF_NEW_AZURE_STORAGE_CONNECTION_STRING`. Använd det faktiska lagringskontots namn i kommandot.

```bash
npm run import:local-data -- --apply NYTT_LAGRINGSKONTO
```

Importen kopierar konton, artikelregister, ordrar, projekt, korrekturversioner, ritningar och tillhörande filer direkt till den nya Azure-lagringen. Om körningen avbryts kan den köras om med samma källdata. Målet måste vara tomt eller innehålla identiska filer från samma import. Verksamhetsdata hålls utanför Git.

Starta webbappen med samma lagringskonto när importen är klar. Konton följer med i importen. Lämna `INITIAL_ADMIN_EMAIL` och `INITIAL_ADMIN_PASSWORD` tomma och verifiera inloggning samt att befintliga projekt, ordrar och korrektur går att öppna. Om den äldre appen har egna pendlade symboler eller dörrsymboler som bara finns i webbläsaren behöver de först exporteras som JSON-listor till `server/hanging-sign-symbols-v1.json` respektive `server/door-sign-symbols-v1.json`.

### Behåll ett befintligt administratörskonto

Kör importen från arbetskopian som har `server/users.json`, innan du startar den nya appen. Ange anslutningssträngen för den **nya** Azure-lagringen i miljövariabeln `JSF_NEW_AZURE_STORAGE_CONNECTION_STRING` och kör:

```bash
npm run import:first-admin -- NYTT_LAGRINGSKONTO DIN_EPOSTADRESS
```

Använd det faktiska namnet på lagringskontot och e-postadressen som finns i arbetskopian. Importen kopierar det valda kontot direkt till Azure med samma inloggning. Om ett användarregister redan finns i Azure avbryts importen. Vid denna metod kan du lämna `INITIAL_ADMIN_EMAIL` och `INITIAL_ADMIN_PASSWORD` tomma.

## Nytt i denna version
- Tomt artikelregister (catalog v2) – gamla artiklar importeras inte tillbaka.
- Artikelgrupperna finns kvar.
- Flera produktbilder per artikel.
- Separat **Huvudbild** för produktsidan.
- Separat **Kortbild** för översikten/beställningssidan innan artikeln öppnas.
- Produktmallar för pendlade skyltar 1500 mm och 1000 mm.
- Enkelsidig/dubbelsidig väljs i admin.
- Fasta måttregler för pendlade skyltar.
- Flera symboler kan väljas på pendlade skyltar.

## Pendlad 1500 mm
- Arial Regular
- Texthöjd 70 mm
- Textstart 190 mm från vänsterkant
- Första symbolens högra kant 190 mm från högerkant
- 5 mm mellan symboler
- Pil enligt den stora pilmallen, 110 × 80 mm för vänster och höger
- Pil 30 mm från ytterkant
- Pil vertikalt centrerad

## Pendlad 1000 mm
- Arial Bold
- Texthöjd 40 mm
- Textstart 130 mm från vänsterkant
- Första symbolens högra kant 125 mm från högerkant
- 5 mm mellan symboler
- Pil inom 60 × 50 mm
- Pil 30 mm från ytterkant
- Pil vertikalt centrerad
