const fs = require("node:fs/promises");
const path = require("node:path");
const {BlobServiceClient} = require("@azure/storage-blob");

async function importFirstAdmin({connectionString, accountName, email, source}) {
  if (!connectionString || !accountName || !email) {
    throw new Error("Ange det nya lagringskontot, administratörens e-postadress och JSF_NEW_AZURE_STORAGE_CONNECTION_STRING.");
  }
  const service = BlobServiceClient.fromConnectionString(connectionString);
  if (service.accountName !== accountName) throw new Error("Anslutningssträngen hör inte till det angivna lagringskontot.");

  const users = JSON.parse(await fs.readFile(source,"utf8"));
  if (!Array.isArray(users)) throw new Error("Det lokala användarregistret har ett ogiltigt format.");
  const matches = users.filter(user => user?.role === "admin" && user.status === "approved"
    && typeof user.email === "string" && user.email.toLowerCase() === email.trim().toLowerCase());
  if (matches.length !== 1) throw new Error("Det måste finnas exakt ett godkänt administratörskonto med den e-postadressen.");
  const original = matches[0];
  if (!original.id || !/^[a-f0-9]{32}:[a-f0-9]{128}$/i.test(original.passwordHash || "")) {
    throw new Error("Administratörskontot saknar ett giltigt ID eller en giltig lösenordshash.");
  }
  const fields = ["id","email","firstName","lastName","phone","organization","department","role","status","passwordHash","createdAt","updatedAt"];
  const admin = Object.fromEntries(fields.filter(key => Object.hasOwn(original,key)).map(key => [key,original[key]]));
  const container = service.getContainerClient("orders");
  await container.createIfNotExists();
  try {
    await container.getBlockBlobClient("users.json").uploadData(Buffer.from(JSON.stringify([admin])), {
      conditions:{ifNoneMatch:"*"},
      blobHTTPHeaders:{blobContentType:"application/json"}
    });
  } catch (error) {
    if (error.statusCode === 412 || error.code === "BlobAlreadyExists") {
      throw new Error("Det finns redan ett användarregister i Azure. Importen avbröts.");
    }
    throw error;
  }
}

if (require.main === module) {
  const [accountName,email] = process.argv.slice(2);
  importFirstAdmin({
    accountName,email,
    connectionString:process.env.JSF_NEW_AZURE_STORAGE_CONNECTION_STRING,
    source:path.join(__dirname,"../server/users.json")
  }).then(() => console.log("Administratörskontot har importerats till Azure."))
    .catch(error => {
      console.error(error.code ? "Importen misslyckades (" + error.code + ")." : error.message);
      process.exitCode = 1;
    });
}

module.exports = {importFirstAdmin};
