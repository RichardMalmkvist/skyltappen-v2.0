const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { BlobServiceClient } = require("@azure/storage-blob");
const { EmailClient } = require("@azure/communication-email");

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json({ limit: "35mb" }));

const ADMIN_PASSWORD = "hemligtlosenord";
const CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const CONTAINER_NAME = "orders";
const BLOB_NAME = "orders.json";
const ORDERS_LOCAL_PATH = path.join(__dirname, "orders.json");

async function getBlobClient() {
  if (!CONNECTION_STRING) return null;
  const blobServiceClient = BlobServiceClient.fromConnectionString(CONNECTION_STRING);
  const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
  await containerClient.createIfNotExists();
  return containerClient.getBlockBlobClient(BLOB_NAME);
}

function readLocalOrders() {
  try {
    if (!fs.existsSync(ORDERS_LOCAL_PATH)) return [];
    const content = fs.readFileSync(ORDERS_LOCAL_PATH, "utf8");
    return content ? JSON.parse(content) : [];
  } catch (error) {
    console.warn("Kunde inte läsa lokala ordrar:", error.message);
    return [];
  }
}

async function readOrders() {
  if (CONNECTION_STRING) {
    try {
      const blobClient = await getBlobClient();
      const exists = await blobClient.exists();
      if (exists) {
        const download = await blobClient.download();
        const chunks = [];
        for await (const chunk of download.readableStreamBody) {
          chunks.push(chunk);
        }
        const content = Buffer.concat(chunks).toString("utf8");
        return content ? JSON.parse(content) : [];
      }
    } catch (error) {
      console.warn("Kunde inte läsa ordrar från Azure, använder lokal fallback:", error.message);
    }
  }

  return readLocalOrders();
}

async function writeOrders(orders) {
  const content = JSON.stringify(orders, null, 2);

  if (CONNECTION_STRING) {
    try {
      const blobClient = await getBlobClient();
      await blobClient.upload(Buffer.from(content), Buffer.byteLength(content), {
        overwrite: true,
      });
      return;
    } catch (error) {
      console.warn("Kunde inte spara ordrar till Azure, sparar lokalt:", error.message);
    }
  }

  fs.writeFileSync(ORDERS_LOCAL_PATH, content, "utf8");
}

const CATALOG_BLOB_NAME = "catalog-v2.json";
const CATALOG_SEED_PATH = path.join(__dirname, "catalog.seed.json");
const CATALOG_LOCAL_PATH = path.join(__dirname, "catalog-v2.local.json");

function readCatalogSeed() {
  try {
    return JSON.parse(fs.readFileSync(CATALOG_SEED_PATH, "utf8"));
  } catch {
    return { version: 2, categories: [], articles: [] };
  }
}

async function getCatalogBlobClient() {
  if (!CONNECTION_STRING) return null;
  const blobServiceClient = BlobServiceClient.fromConnectionString(CONNECTION_STRING);
  const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
  await containerClient.createIfNotExists();
  return containerClient.getBlockBlobClient(CATALOG_BLOB_NAME);
}

async function readCatalog() {
  // I Azure är catalog.json master. Lokalt används catalog.local.json.
  try {
    const blobClient = await getCatalogBlobClient();
    if (blobClient) {
      const exists = await blobClient.exists();
      if (exists) {
        const download = await blobClient.download();
        const chunks = [];
        for await (const chunk of download.readableStreamBody) chunks.push(chunk);
        const content = Buffer.concat(chunks).toString("utf8");
        if (content) return JSON.parse(content);
      }
    }
  } catch (error) {
    console.warn("Kunde inte läsa artikelregistret från Azure, använder lokal fallback:", error.message);
  }

  try {
    if (fs.existsSync(CATALOG_LOCAL_PATH)) {
      return JSON.parse(fs.readFileSync(CATALOG_LOCAL_PATH, "utf8"));
    }
  } catch (error) {
    console.warn("Kunde inte läsa lokalt artikelregister:", error.message);
  }

  const seed = readCatalogSeed();
  await writeCatalog(seed);
  return seed;
}

async function writeCatalog(catalog) {
  const normalized = {
    version: Number(catalog?.version) || 2,
    updatedAt: new Date().toISOString(),
    categories: Array.isArray(catalog?.categories) ? catalog.categories : [],
    articles: Array.isArray(catalog?.articles) ? catalog.articles : [],
  };
  const content = JSON.stringify(normalized, null, 2);

  let azureSaved = false;
  try {
    const blobClient = await getCatalogBlobClient();
    if (blobClient) {
      await blobClient.upload(Buffer.from(content), Buffer.byteLength(content), { overwrite: true });
      azureSaved = true;
    }
  } catch (error) {
    console.warn("Kunde inte spara artikelregistret till Azure, sparar lokalt:", error.message);
  }

  // Lokal spegel är praktisk i utveckling och fungerar som fallback.
  try {
    fs.writeFileSync(CATALOG_LOCAL_PATH, content, "utf8");
  } catch (error) {
    if (!azureSaved) throw error;
  }

  return normalized;
}

function getNextOrderNumber(orders, now = new Date()) {
  // Ordernummer: 00 + tvåsiffrigt år + löpnummer + -00.
  // Löpnumret fortsätter över årsskiftet, t.ex.
  // 0026105-00 -> 0026106-00 -> 0027107-00.
  let highestSequence = 104;

  for (const order of orders) {
    if (!order || typeof order.orderNumber !== "string") continue;

    const match = order.orderNumber.trim().match(/^00\d{2}(\d{3,})-00$/);
    if (!match) continue;

    const sequence = Number.parseInt(match[1], 10);
    if (Number.isFinite(sequence) && sequence > highestSequence) {
      highestSequence = sequence;
    }
  }

  const year = String(now.getFullYear()).slice(-2);
  const nextSequence = String(highestSequence + 1).padStart(3, "0");
  return `00${year}${nextSequence}-00`;
}

function getNextSubmissionNumber(orders) {
  const prefix = "BEST-";
  let highestNumber = 10000;
  for (const order of orders) {
    if (!order || typeof order.submissionNumber !== "string") continue;
    if (!order.submissionNumber.startsWith(prefix)) continue;
    const parsed = parseInt(order.submissionNumber.replace(prefix, ""), 10);
    if (Number.isFinite(parsed) && parsed > highestNumber) highestNumber = parsed;
  }
  return `${prefix}${highestNumber + 1}`;
}

app.post("/api/login", (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    return res.json({ success: true });
  }
  return res.status(401).json({ success: false, message: "Fel lösenord" });
});

// Publikt artikelregister. Beställningsportalen läser alltid härifrån.
app.get("/api/catalog", async (_req, res) => {
  try {
    const catalog = await readCatalog();
    return res.json(catalog);
  } catch (error) {
    console.error("Fel vid läsning av artikelregister:", error);
    return res.status(500).json({ message: "Kunde inte läsa artikelregistret." });
  }
});

// Admin sparar hela artikelregistret. Det gör appen till master i stället för koden.
app.put("/api/admin/catalog", async (req, res) => {
  const password = req.headers["x-admin-password"];
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: "Obehörig" });
  }
  try {
    const catalog = await writeCatalog(req.body || {});
    return res.json({ success: true, catalog });
  } catch (error) {
    console.error("Fel vid sparning av artikelregister:", error);
    return res.status(500).json({ success: false, message: "Kunde inte spara artikelregistret." });
  }
});

app.get("/api/orders", async (req, res) => {
  const password = req.headers["x-admin-password"];
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: "Obehörig" });
  }
  const orders = await readOrders();
  return res.json({ success: true, orders });
});

app.patch("/api/orders/:id/status", async (req, res) => {
  const password = req.headers["x-admin-password"];
  const { id } = req.params;
  const { status } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: "Obehörig" });
  }
  const allowedStatuses = ["ny", "väntar_godkännande", "behöver_kompletteras", "godkänd", "påbörjad", "klar", "skickad", "levererad"];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: "Ogiltig status" });
  }
  const orders = await readOrders();
  const orderIndex = orders.findIndex((order) => order.id === id);
  if (orderIndex === -1) {
    return res.status(404).json({ success: false, message: "Beställningen hittades inte" });
  }
  orders[orderIndex] = { ...orders[orderIndex], status };
  await writeOrders(orders);
  return res.json({ success: true, message: "Status uppdaterad", order: orders[orderIndex] });
});

app.patch("/api/orders/:id/approval", async (req, res) => {
  const password = req.headers["x-admin-password"];
  const { id } = req.params;
  const { action } = req.body || {};

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: "Obehörig" });
  }
  if (!["approve", "needs_info"].includes(action)) {
    return res.status(400).json({ success: false, message: "Ogiltig åtgärd" });
  }

  const orders = await readOrders();
  const orderIndex = orders.findIndex((order) => order.id === id);
  if (orderIndex === -1) {
    return res.status(404).json({ success: false, message: "Beställningen hittades inte" });
  }

  const current = orders[orderIndex];
  if (action === "approve") {
    const orderNumber = current.orderNumber || getNextOrderNumber(orders);
    orders[orderIndex] = {
      ...current,
      orderNumber,
      status: "godkänd",
      approvedAt: new Date().toISOString(),
    };
  } else {
    orders[orderIndex] = {
      ...current,
      status: "behöver_kompletteras",
      needsInfoAt: new Date().toISOString(),
    };
  }

  await writeOrders(orders);
  return res.json({ success: true, order: orders[orderIndex] });
});

app.post("/api/orders", async (req, res) => {
  const order = req.body;
  if (!order || !Array.isArray(order.cart) || order.cart.length === 0) {
    return res.status(400).json({ success: false, message: "Tom beställning" });
  }
  const orders = await readOrders();
  const submissionNumber = getNextSubmissionNumber(orders);
  console.log("Ny beställning skapas:", submissionNumber);
  const pricedCart = (order.cart || []).map((item) => {
    const quantity = Math.max(1, Number(item?.quantity) || 1);
    const unitPrice = Math.max(0, Number(item?.unitPrice) || 0);
    return {
      ...item,
      quantity,
      unitPrice,
      currency: item?.currency || "SEK",
      lineTotal: Math.round(unitPrice * quantity * 100) / 100,
    };
  });
  const orderTotal = Math.round(pricedCart.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0) * 100) / 100;
  const newOrder = {
    id: crypto.randomUUID(),
    submissionNumber,
    orderNumber: null,
    createdAt: new Date().toISOString(),
    status: "väntar_godkännande",
    cart: pricedCart,
    orderTotal,
    currency: "SEK",
    orderer: order.orderer || {},
    delivery: order.delivery || {},
    orderDetails: order.orderDetails || {},
  };
  orders.unshift(newOrder);
  await writeOrders(orders);

  try {
    const emailClient = new EmailClient(process.env.ACS_CONNECTION_STRING);
    const customerEmail = order.orderer?.ordererEmail;
    if (customerEmail) {
      console.log("Försöker skicka mail till:", customerEmail);

      const firstName = order.orderer?.ordererName?.split(" ")[0] || "";
      const productLines = newOrder.cart.map((item, i) => {
        if (item.productType === "yrkestitelsskyltar") {
          return `${i + 1}. ${item.badgeName}\n   Text: ${item.title}\n   Antal: ${item.quantity}`;
        }
        let line = `${i + 1}. ${item.badgeName}\n   Namn: ${item.name}\n   Titel: ${item.title}`;
        if (item.titleLine2) line += `\n   Titel rad 2: ${item.titleLine2}`;
        if (item.orgLine1) line += `\n   Verksamhet: ${item.orgLine1}`;
        if (item.orgLine2) line += `\n   Verksamhet rad 2: ${item.orgLine2}`;
        line += `\n   Fäste: ${item.fastening}\n   Extra magnetfästen: ${item.extraMagnets}\n   Antal: ${item.quantity}`;
        return line;
      }).join("\n\n");

      const emailBody = `Hej ${firstName},\n\nTack för din beställning!\n\nDin beställning är mottagen och väntar nu på godkännande.\n\nReferens: ${submissionNumber}\n\n── DIN BESTÄLLNING ──\n${productLines}\n\nOm något ser fel ut, kontakta oss på: richard.malmkvist@jonkopingsskyltfabrik.se\n\nMed vänliga hälsningar,\nJönköpings Skyltfabrik`;

      const message = {
        senderAddress: "DoNotReply@a80901a0-70aa-4a01-ab49-02633e2442ea.azurecomm.net",
        recipients: { to: [{ address: customerEmail }] },
        content: {
          subject: `Beställning mottagen – ${submissionNumber}`,
          plainText: emailBody,
        },
      };
      const poller = await emailClient.beginSend(message);
      const result = await poller.pollUntilDone({
        intervalInMs: 5000,
      });
      if (result.status === "Succeeded") {
        console.log("Mail skickat, status:", result.status);
      } else {
        console.log("Mail status:", result.status);
      }
    } else {
      console.log("Ingen e-postadress angiven, hoppar över mail.");
    }
  } catch (emailError) {
    console.error("Fel vid skickning av bekräftelsemail:", emailError);
  }

  return res.json({ success: true, order: newOrder });
});

app.delete("/api/orders/:id", async (req, res) => {
  const password = req.headers["x-admin-password"];
  const { id } = req.params;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: "Obehörig" });
  }
  const orders = await readOrders();
  const filteredOrders = orders.filter((order) => order.id !== id);
  if (filteredOrders.length === orders.length) {
    return res.status(404).json({ success: false, message: "Beställningen hittades inte" });
  }
  await writeOrders(filteredOrders);
  return res.json({ success: true, message: "Beställningen är borttagen" });
});

const buildPath = path.join(__dirname, "../build");
app.use(express.static(buildPath));

app.get("*", (req, res) => {
  res.sendFile(path.join(buildPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server kör på http://localhost:${PORT}`);
});
