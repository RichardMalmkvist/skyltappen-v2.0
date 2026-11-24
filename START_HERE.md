# JSF Flow – tomt artikelregister

Den här versionen startar med befintliga artikelgrupper men **inga artiklar**.
Alla nya artiklar skapas och ändras via Admin > Artiklar.

## Starta lokalt
Servern kräver att `AZURE_STORAGE_CONNECTION_STRING` finns i miljön. Använd en separat Azure-lagring för lokal utveckling. Servern läser och sparar verksamhetsdata i Azure Blob Storage även när appen körs på datorn.

```bash
npm install
npm run dev
```

## Ny GitHub- och Azure-miljö

1. Pusha den här mappen till ett nytt GitHub-repo med grenen `main`. GitHub Actions bygger och testar vid push. Driftsättningen aktiveras när repot har variabeln `AZURE_WEBAPP_NAME`.
2. Skapa en egen Azure App Service för Linux med Node.js 22 och en separat Azure Storage. Lägg till `AZURE_STORAGE_CONNECTION_STRING` i App Service. För ordermejl behövs även `ACS_CONNECTION_STRING`. Sätt startkommandot till `npm start` och `SCM_DO_BUILD_DURING_DEPLOYMENT` till `false` så att Azure använder det färdiga paketet. Importera ditt befintliga administratörskonto enligt avsnittet nedan, eller skapa ett nytt genom att ange `INITIAL_ADMIN_EMAIL` och `INITIAL_ADMIN_PASSWORD` före första starten.
3. Koppla en Azure-identitet till det nya repots `main` via OIDC. Ge identiteten rätt att driftsätta till den nya webbappen. Lägg identitetens ID:n i GitHub Secrets som `AZURE_CLIENT_ID`, `AZURE_TENANT_ID` och `AZURE_SUBSCRIPTION_ID`. Sätt repo-variabeln `AZURE_WEBAPP_NAME` till den nya webbappens namn och kör workflowen från `main`.
4. Verifiera att du kan logga in som administratör. Om du använde `INITIAL_ADMIN_EMAIL` och `INITIAL_ADMIN_PASSWORD` kan du ta bort dem när kontot har skapats.

När repot är kopplat till Azure räcker det att committa och pusha kodändringar till `main`. GitHub Actions bygger och testar koden före varje driftsättning. Verksamhetsdata ligger kvar i den separata Azure-lagringen.

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
- Pil 110 x 80 mm
- Pil 30 mm från ytterkant
- Pil vertikalt centrerad

## Pendlad 1000 mm
- Arial Bold
- Texthöjd 40 mm
- Textstart 130 mm från vänsterkant
- Första symbolens högra kant 125 mm från högerkant
- 5 mm mellan symboler
- Pil 110 x 80 mm
- Pil 30 mm från ytterkant
- Pil vertikalt centrerad
