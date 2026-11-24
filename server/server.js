const {installSignArtwork}=require('./signArtwork');
const {installProfileArticles}=require('../src/data/profileSigns');
const {installOutdoorOtArticle}=require('../src/data/outdoorOtArticle');
const {installHangingCategoryFamily}=require('../src/data/hangingCategoryFamily');
const {installAdditionalHangingArticles}=require('../src/data/additionalHangingArticles');
const {installThreePanelDoorArticles}=require('./threePanelDoorArticles');
const {buildProjectOrderCart}=require('./projectOrderItems');
const {installProjectOrders}=require('./projectOrders');
const {installProjectOrderFiles}=require('./projectOrderFiles');
const {installBraLivNameBadges}=require('../src/data/braLivNameBadges');
const {installDirectionArticles}=require('../src/data/directionSigns');
const {buildOrderConfirmationEmail}=require('./orderConfirmationEmail');
const {buyerOrderVisible}=require('../src/data/buyerOrders');
const {installHangingSignPlotter}=require('./hangingSignPlotter');
const {installArticleProduction,snapshotProductionFiles}=require('./articleProduction');
const {installDibondSymbols}=require('./dibondSymbols');
const {validateAttachments,createOrderAttachments}=require('./orderAttachments');
const {purchaserEmail,orderBelongsToUser,purchaserAccountId,getOrderOwner}=require('../src/data/orderOwnership');
const {installDoorAccessories}=require('../src/data/doorAccessories');
const {installHangingTextAccessories}=require('../src/data/hangingTextAccessories');
const {installSalesUnits}=require("../src/data/salesUnits");
const {installParkingPole}=require('../src/data/parkingPole');
const {installRoadSupplement,installYellowRoadSupplement,installRoadSupplementSizes}=require('../src/data/roadSupplement');
const {installRoadSignArticles}=require('../src/data/roadSignModels');
const {installParkingProducts}=require("../src/data/parkingSign");
const {installCustomDecalArticles}=require("../src/data/customDecalArticles");
const {installDibondArticles}=require("../src/data/dibondArticles");
const {installOutdoorArticles}=require("../src/data/outdoorBusinessSigns");
const {installAcrylicArticle}=require("../src/data/acrylicPocket");
const {installAluminiumArticles}=require("../src/data/aluminiumArticles");
const {installVinylText}=require('../src/data/vinylText');
const {installHangingWhiteThumbnail}=require('../src/data/hangingWhiteThumbnail');
const {installNameBadge0207Thumbnail}=require('../src/data/nameBadge0207Thumbnail');
const {guestCatalog,guestCanOrder}=require('../src/data/catalogAccess');
const {hasProofOnlyItems}=require('../src/data/catalogVisibility');
const {isBadgeOrder,isBadgeItem,splitBadgeOrder,normalizeBadgeDelivery,badgeCheckoutErrors}=require('../src/data/badgeProduction');
const {attachBadgeProduction}=require('./badgeProduction');
const {attachOTBoards} = require("./otBoards");
const {canRead} = require("../src/data/permissions");
const {installHomepageNotice} = require("./homepageNotice");
const {normalizeHomepageImages} = require("./homepageImages");
const express = require("express");
const { installProfessionProducts } = require("../src/data/professionProducts");
const { installNameBadge0201 } = require("../src/data/nameBadge0201");
const cors = require("cors");
const path = require("path");
const crypto = require("crypto");
const { groupProjectOrderItems, buildProjectOrderItems } = require("./projectOrderGrouping");
const { BlobServiceClient } = require("@azure/storage-blob");
const { EmailClient } = require("@azure/communication-email");

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json({ limit: "35mb" }));

function asyncRoute(handler) {
  return (req, res, next) => handler(req, res, next).catch(next);
}

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "jsf-flow-api" }));

const pdfAssets = path.dirname(require.resolve("pdfjs-dist/package.json"));
const pdfVersion = require("pdfjs-dist/package.json").version;
for (const folder of ["cmaps","iccs","standard_fonts","wasm"]) {
  app.use(`/api/pdf-assets/${pdfVersion}/${folder}`,express.static(path.join(pdfAssets,folder),{
    index:false, redirect:false, immutable:true, maxAge:"1y"
  }));
}

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
const useDevStorage = !connectionString && process.argv.includes("--development") && process.env.NODE_ENV !== "production";
if (!connectionString && !useDevStorage) {
  throw new Error("AZURE_STORAGE_CONNECTION_STRING saknas. JSF Flow kräver Azure Blob Storage.");
}
const storage = useDevStorage
  ? require("./devBlobStorage").createDevBlobStorage()
  : BlobServiceClient.fromConnectionString(connectionString).getContainerClient("orders");
if (useDevStorage) {
  app.use("/api", (req, res, next) => {
    const forwarded = req.headers["x-forwarded-for"]?.split(",").at(-1).trim();
    if (forwarded && !["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(forwarded)) {
      return res.status(403).json({message:"Testläget kan bara användas från den här datorn."});
    }
    next();
  });
}
let storageReady;
async function projectsBlob(name) {
  storageReady ||= storage.createIfNotExists().catch(error => {
    storageReady = undefined;
    throw error;
  });
  await storageReady;
  return storage.getBlockBlobClient(name);
}

async function readBlobJson(name, fallback) {
  const blob = await projectsBlob(name);
  try {
    return JSON.parse((await blob.downloadToBuffer()).toString("utf8"));
  } catch (error) {
    if (error.code === "BlobNotFound" || error.details?.errorCode === "BlobNotFound") return fallback;
    throw error;
  }
}

async function writeBlobJson(name, value) {
  const blob = await projectsBlob(name);
  await blob.uploadData(Buffer.from(JSON.stringify(value, null, 2)), {
    blobHTTPHeaders: {blobContentType: "application/json"}
  });
}

async function readStoredOrders() {
  return readBlobJson("orders.json", []);
}

async function prepareOrderParts(order, existing, childId=crypto.randomUUID()) {
  for(const item of order.cart||[])await signArtworkStore.validate(item);
  const parts=splitBadgeOrder({...order,badgeChildId:childId});
  for(const part of parts){
    delete part.badgeChildId;
    if(isBadgeOrder(part) && !part.orderNumber)part.orderNumber=await getNextOrderNumber([...existing,...parts.filter(p=>p!==part)],`order:${part.id}`);
    if(parts.length>1)part.relatedOrderIds=parts.filter(p=>p!==part).map(p=>p.id);
  }
  return parts;
}
async function readOrders() {
  const stored=await readStoredOrders(),result=[];
  for(const order of stored){
    // Older unapproved mixed submissions are separated with stable IDs.
    if(!order.workflow && ["väntar_godkännande","behöver_kompletteras","ny"].includes(order.status)){
      result.push(...await prepareOrderParts(order,[...stored,...result],order.id+"-badges"));
    }else if(isBadgeOrder(order)) result.push({...order,workflow:"badge-production",status:order.status==="skickad"?"levererad":order.status==="godkänd"?"ny":order.status});
    else result.push(order);
  }
  return result;
}

// Stored with the order so updates remain available after logout/restart.
function addOrderStatusNotification(previous, next) {
  if ((!purchaserEmail(next) && !next.accountUserId) || previous.status === next.status || !["godkänd", "levererad"].includes(next.status)) return;
  next.statusNotifications = [...(previous.statusNotifications || []), {
    id: crypto.randomUUID(), status: next.status, previousStatus: previous.status,
    createdAt: new Date().toISOString(), readAt: null,
  }];
}

async function writeOrders(orders) {
  await writeBlobJson("orders.json", orders);
}

const CATALOG_BLOB_NAME = "catalog-v2.json";
const catalogSeed = require("./catalog.seed.json");

async function ensureNameBadgeProducts(catalog) {
  const existing=installProfileArticles(installOutdoorOtArticle(installDirectionArticles(installOutdoorArticles(installAcrylicArticle(installCustomDecalArticles(installDibondArticles(installAluminiumArticles(installSalesUnits(installParkingProducts(catalog))))))))));
  const updated=installBraLivNameBadges(installNameBadge0207Thumbnail(installHangingWhiteThumbnail(installVinylText(installHangingTextAccessories(installDoorAccessories(installProfessionProducts(installNameBadge0201(existing))))))));
  const withPanels=installParkingPole(installRoadSupplementSizes(installYellowRoadSupplement(installRoadSupplement(installRoadSignArticles(installHangingCategoryFamily(installAdditionalHangingArticles(installThreePanelDoorArticles(updated))))))));
  return withPanels===catalog ? catalog : await writeCatalog(withPanels);
}

async function readCatalog() {
  const catalog = await readBlobJson(CATALOG_BLOB_NAME, null);
  return ensureNameBadgeProducts(catalog ?? structuredClone(catalogSeed));
}

async function writeCatalog(catalog) {
  const normalized = {
    homepageImages: normalizeHomepageImages(catalog?.homepageImages),
    productUpdates: Array.isArray(catalog?.productUpdates) ? catalog.productUpdates : [],
    version: Number(catalog?.version) || 2,
    updatedAt: new Date().toISOString(),
    categories: Array.isArray(catalog?.categories) ? catalog.categories : [],
    articles: Array.isArray(catalog?.articles) ? catalog.articles : [],
  };
  await writeBlobJson(CATALOG_BLOB_NAME, normalized);
  return normalized;
}

const {createOrderNumbers}=require('./orderNumbers');
const orderNumbers=createOrderNumbers({directory:__dirname,blobFor:projectsBlob,readOrders:readStoredOrders});

async function getNextOrderNumber(orders,key){return orderNumbers.reserve(key,orders);}
async function reserveProjectOrderNumber(project){
  if(project.orderId){const order=(await readStoredOrders()).find(order=>String(order.id)===String(project.orderId));if(order?.orderNumber)return order.orderNumber;}
  return orderNumbers.reserve(`project:${project.id}`);
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


// Kontoansökningar och konton. Lösenord sparas enbart som scrypt-hash.
const sessions = new Map();
async function readUsers() {
  return readBlobJson("users.json", []);
}
async function writeUsers(users) {
  await writeBlobJson("users.json", users);
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString("hex")}`;
}
function verifyPassword(password, stored) {
  try {
    const [salt, hash] = stored.split(":");
    const expected = Buffer.from(hash, "hex");
    const actual = crypto.scryptSync(password, salt, expected.length);
    return crypto.timingSafeEqual(actual, expected);
  } catch { return false; }
}
function publicUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}
function requireAccount(req, res, next) {
  const token = (req.headers.authorization || "").replace(/^Bearer /i, "");
  accountSession(req).then(session => {
    if (!session) return res.status(401).json({ message: "Logga in igen." });
    req.accountId = session.id;
    next();
  }).catch(next);
}
// Behörighet hämtas från ett godkänt konto, aldrig från ett gammalt administratörslösenord.
async function accountSession(req) {
  const credential = String(req.headers["x-admin-password"] || "");
  const token = credential.startsWith("account:") ? credential.slice(8) : String(req.headers.authorization || "").replace(/^Bearer /i, "");
  const session = sessions.get(token);
  if (!session || session.expires < Date.now()) return null;
  const user = (await readUsers()).find(u => u.id === session.id);
  if (!user || user.status !== "approved") return null;
  return { ...session, role: user.role };
}
async function adminAccess(req) {
  return (await accountSession(req))?.role === "admin";
}
installHomepageNotice(app, {
  asyncRoute,
  canEdit: adminAccess,
  read: () => readBlobJson("homepage-notice-v1.json", null),
  write: notice => writeBlobJson("homepage-notice-v1.json", notice),
});
async function readAccess(req) {
  return canRead((await accountSession(req))?.role);
}
async function staffAccess(req) {
  return ["admin", "personal"].includes((await accountSession(req))?.role);
}
app.post("/api/account/register", asyncRoute(async (req, res) => {
  try {
    const { firstName, lastName, email, phone, organization, department, password } = req.body || {};
    if (![firstName, lastName, email, organization].every(v => typeof v === "string" && v.trim()) ||
        typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        typeof password !== "string" || password.length < 12 || password.length > 128)
      return res.status(400).json({ message: "Fyll i obligatoriska fält och välj ett lösenord med minst 12 tecken." });
    const users = await readUsers();
    if (users.some(u => u.email === email.trim().toLowerCase())) return res.status(409).json({ message: "E-postadressen är redan registrerad." });
    users.push({ id: crypto.randomUUID(), firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim().toLowerCase(), phone: String(phone || "").trim(), organization: organization.trim(), department: String(department || "").trim(), passwordHash: hashPassword(password), role: "bestallare", status: "pending", createdAt: new Date().toISOString() });
    await writeUsers(users);
    return res.status(201).json({ success: true, message: "Ansökan skickad. Du kan logga in när admin har godkänt kontot." });
  } catch (error) { console.error(error); return res.status(500).json({ message: "Kunde inte spara ansökan." }); }
}));
app.post("/api/account/login", asyncRoute(async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const users = await readUsers();
    const user = users.find(u => u.email === String(email || "").trim().toLowerCase());
    if (!user || !verifyPassword(String(password || ""), user.passwordHash)) return res.status(401).json({ message: "Fel e-postadress eller lösenord." });
    if (user.status !== "approved") return res.status(403).json({ message: user.status === "rejected" ? "Kontot har inte godkänts." : "Kontot väntar på godkännande." });
    const token = crypto.randomBytes(32).toString("hex");
    sessions.set(token, { id: user.id, role: user.role, status: user.status, expires: Date.now() + 8 * 60 * 60 * 1000 });
    return res.json({ token, user: publicUser(user) });
  } catch (error) { console.error(error); return res.status(500).json({ message: "Inloggningen misslyckades." }); }
}));
app.get("/api/account/me", requireAccount, asyncRoute(async (req, res) => {
  try {
    const user = (await readUsers()).find(u => u.id === req.accountId && u.status === "approved");
    if (!user) return res.status(403).json({ message: "Kontot är inte aktivt." });
    return res.json({ user: publicUser(user) });
  } catch { return res.status(500).json({ message: "Kunde inte läsa kontot." }); }
}));
app.patch("/api/account/me", requireAccount, asyncRoute(async (req, res) => {
  try {
    const fields = ["firstName", "lastName", "phone", "organization", "department"];
    const patch = {};
    for (const key of fields) {
      if (Object.prototype.hasOwnProperty.call(req.body || {}, key)) {
        if (typeof req.body[key] !== "string" || req.body[key].length > 200) return res.status(400).json({ message: "Ogiltiga profiluppgifter." });
        patch[key] = req.body[key].trim();
      }
    }
    if (!patch.firstName && Object.prototype.hasOwnProperty.call(patch, "firstName")) return res.status(400).json({ message: "Förnamn krävs." });
    if (!patch.lastName && Object.prototype.hasOwnProperty.call(patch, "lastName")) return res.status(400).json({ message: "Efternamn krävs." });
    if (!patch.organization && Object.prototype.hasOwnProperty.call(patch, "organization")) return res.status(400).json({ message: "Organisation krävs." });
    const users = await readUsers();
    const user = users.find(u => u.id === req.accountId && u.status === "approved");
    if (!user) return res.status(403).json({ message: "Kontot är inte aktivt." });
    Object.assign(user, patch, { updatedAt: new Date().toISOString() });
    await writeUsers(users);
    return res.json({ user: publicUser(user) });
  } catch (error) { console.error(error); return res.status(500).json({ message: "Kunde inte spara profiluppgifterna." }); }
}));
app.post("/api/account/change-password", requireAccount, asyncRoute(async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (typeof newPassword !== "string" || newPassword.length < 12 || newPassword.length > 128) return res.status(400).json({ message: "Nytt lösenord måste vara 12–128 tecken." });
    const users = await readUsers();
    const user = users.find(u => u.id === req.accountId && u.status === "approved");
    if (!user || !verifyPassword(String(currentPassword || ""), user.passwordHash)) return res.status(403).json({ message: "Nuvarande lösenord stämmer inte." });
    user.passwordHash = hashPassword(newPassword);
    await writeUsers(users);
    return res.json({ message: "Lösenordet har ändrats." });
  } catch (error) { console.error(error); return res.status(500).json({ message: "Kunde inte ändra lösenord." }); }
}));
app.get("/api/account/orders", requireAccount, asyncRoute(async (req, res) => {
  try {
    const user = (await readUsers()).find(u => u.id === req.accountId && u.status === "approved");
    if (!user) return res.status(403).json({ message: "Kontot är inte aktivt." });
    const allOrders = (await readOrders()).filter(order => user.role !== 'bestallare' || buyerOrderVisible(order));
    const showAll = req.query?.scope === "all";
    const orders = (showAll ? allOrders : allOrders.filter(order => orderBelongsToUser(order,user))).map(order => {
      const { statusNotifications, ...sharedOrder } = order;
      return {...sharedOrder,orderedBy:getOrderOwner(order)};
    });
    res.setHeader("Cache-Control", "no-store");
    return res.json({ orders });
  } catch { return res.status(500).json({ message: "Kunde inte läsa beställningar." }); }
}));
let projectProofApprovals;
function visibleAccountNotification(event, now = Date.now()) {
  if (event.dismissedAt || !["godkänd", "levererad"].includes(event.status)) return false;
  if (!event.readAt) return true;
  const readTime = Date.parse(event.readAt);
  const lastRead = Number.isFinite(readTime) ? readTime : Date.parse(event.createdAt);
  return lastRead >= now - 30 * 24 * 60 * 60 * 1000;
}
app.get("/api/account/notifications", requireAccount, asyncRoute(async (req, res) => {
  try {
    const user=(await readUsers()).find(user=>user.id===req.accountId);
    const orders = (await readOrders()).filter(order => orderBelongsToUser(order,user) && (user.role !== 'bestallare' || buyerOrderVisible(order)));
    const notifications = orders.flatMap(order => (order.statusNotifications || []).filter(event => visibleAccountNotification(event)).map(event => ({
      ...event, orderId: order.id, orderNumber: order.orderNumber || order.submissionNumber,
    }))).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    res.setHeader("Cache-Control", "no-store");
    const projectEvents=await projectProofApprovals.notificationsFor(user);
    return res.json({ notifications:[...notifications,...projectEvents].sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))), orders });
  } catch { return res.status(500).json({ message: "Kunde inte hämta notiser." }); }
}));
app.post("/api/account/notifications/clear-read", requireAccount, asyncRoute(async (req, res) => {
  try {
    const orders = await readOrders();
    const clearedIds = [];
    const now = new Date().toISOString();
    const user=(await readUsers()).find(user=>user.id===req.accountId);
    orders.filter(order => orderBelongsToUser(order,user) && (user.role !== 'bestallare' || buyerOrderVisible(order))).forEach(order => {
      (order.statusNotifications || []).forEach(event => {
        if (event.readAt && !event.dismissedAt) { event.dismissedAt = now; clearedIds.push(event.id); }
      });
    });
    if (clearedIds.length) await writeOrders(orders);
    clearedIds.push(...await projectProofApprovals.clearRead(user));
    return res.json({ success: true, clearedIds });
  } catch { return res.status(500).json({ message: "Kunde inte rensa lästa notiser." }); }
}));
app.patch("/api/account/notifications/:id/read", requireAccount, asyncRoute(async (req, res) => {
  try {
    if(req.params.id.startsWith('proof-event-')){
      const user=(await readUsers()).find(user=>user.id===req.accountId);
      const event=await projectProofApprovals.markRead(user,req.params.id);
      return event?res.json({success:true,notification:event}):res.status(404).json({message:'Notisen hittades inte.'});
    }
    const orders = await readOrders();
    const user=(await readUsers()).find(user=>user.id===req.accountId);
    const order = orders.find(order => orderBelongsToUser(order,user) && (user.role !== 'bestallare' || buyerOrderVisible(order)) && (order.statusNotifications || []).some(event => event.id === req.params.id));
    if (!order) return res.status(404).json({ message: "Notisen hittades inte." });
    const event = order.statusNotifications.find(event => event.id === req.params.id);
    event.readAt = event.readAt || new Date().toISOString();
    await writeOrders(orders);
    return res.json({ success: true, notification: event });
  } catch { return res.status(500).json({ message: "Kunde inte markera notisen som läst." }); }
}));
app.post("/api/account/logout", requireAccount, (req, res) => {
  sessions.delete((req.headers.authorization || "").replace(/^Bearer /i, ""));
  res.json({ success: true });
});
app.get("/api/admin/users", asyncRoute(async (req, res) => {
  if (!(await adminAccess(req))) return res.status(403).json({ message: "Åtkomst nekad." });
  try { return res.json({ users: (await readUsers()).map(publicUser) }); }
  catch { return res.status(500).json({ message: "Kunde inte läsa användare." }); }
}));
app.patch("/api/admin/users/:id", asyncRoute(async (req, res) => {
  if (!(await adminAccess(req))) return res.status(403).json({ message: "Åtkomst nekad." });
  const { status, role } = req.body || {};
  if ((status && !["approved", "rejected", "pending"].includes(status)) || (role && !["bestallare", "personal", "admin"].includes(role)))
    return res.status(400).json({ message: "Ogiltig status eller roll." });
  try {
    const users = await readUsers();
    const user = users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ message: "Användaren hittades inte." });
    if (status) user.status = status;
    if (role) user.role = role;
    for (const session of sessions.values()) {
      if (session.id === user.id) { session.role = user.role; session.status = user.status; }
    }
    await writeUsers(users);
    return res.json({ user: publicUser(user) });
  } catch { return res.status(500).json({ message: "Kunde inte uppdatera användaren." }); }
}));

// Publikt artikelregister. Beställningsportalen läser alltid härifrån.
app.get("/api/catalog", asyncRoute(async (req, res) => {
  try {
    const catalog = await readCatalog();
    res.set({"Cache-Control":"private, no-store",Vary:"Authorization, x-admin-password"});
    if (!(await accountSession(req))) {
      if(req.headers.authorization || req.headers["x-admin-password"])
        return res.status(401).json({message:"Logga in igen för att hämta hela artikelregistret."});
      return res.json(guestCatalog(catalog));
    }
    // Elevator variants are resolved from the saved drawing library, not published copies.
    const [drawings, hangingSymbols, doorSymbols] = await Promise.all([
      readDrawingLibrary(), readBlobJson("hanging-sign-symbols-v1.json", null), readBlobJson("door-sign-symbols-v1.json", null)
    ]);
    catalog.signSymbols = {hanging:hangingSymbols, door:doorSymbols};
    const folders=drawings.folders||[];
    const articleByNumber = new Map((catalog.articles||[]).map(article=>[String(article.articleNumber||"").trim(),article]));
    const variants=[];
    for (const item of drawings.items||[]) {
      if(item.type!=="elevator")continue;
      const names=[];let folder=folders.find(f=>f.id===item.folderId);const seen=new Set();
      while(folder&&!seen.has(folder.id)){seen.add(folder.id);names.unshift(folder.name);folder=folders.find(f=>f.id===folder.parentId);}
      const completeNumber=String(item.completeArticleNumber||"").trim();
      const printNumber=String(item.printArticleNumber||item.articleNumber||"").trim();
      variants.push({id:item.id,name:item.name,location:names.join(" / "),board:item.board,floorCopies:item.floorCopies??1,cabinCopies:item.cabinCopies??0,
        options:{complete:completeNumber?{articleNumber:completeNumber,articleId:articleByNumber.get(completeNumber)?.id,articleName:articleByNumber.get(completeNumber)?.name,unitPrice:Number(articleByNumber.get(completeNumber)?.unitPrice)||0}:null,
        print:printNumber?{articleNumber:printNumber,articleId:articleByNumber.get(printNumber)?.id,articleName:articleByNumber.get(printNumber)?.name,unitPrice:Number(articleByNumber.get(printNumber)?.unitPrice)||0}:null}});
    }
    // All lift choices are available regardless of which of the two products opened the configurator.
    for(const article of catalog.articles||[]){
      const number=String(article.articleNumber||"").trim();
      if(!number||!variants.some(v=>v.options.complete?.articleNumber===number||v.options.print?.articleNumber===number))continue;
      article.elevatorBoards=variants;
      article.previewType="elevator_board";
      article.elevatorBoardConfig=variants[0].board;
      article.fields={...(article.fields||{}),quantity:false};
    }
    return res.json(attachOTBoards(catalog,drawings));
  } catch (error) {
    console.error("Fel vid läsning av artikelregister:", error);
    return res.status(500).json({ message: "Kunde inte läsa artikelregistret." });
  }
}));

app.put("/api/admin/sign-symbols/:library", asyncRoute(async (req, res) => {
  try {
    if (!await adminAccess(req)) return res.status(401).json({message:"Obehörig"});
    const files = {hanging:"hanging-sign-symbols-v1.json", door:"door-sign-symbols-v1.json"};
    const library = req.params.library;
    if (!Object.hasOwn(files, library)) return res.status(404).json({message:"Symbolbiblioteket hittades inte."});
    const symbols = req.body?.symbols;
    if (!Array.isArray(symbols) || symbols.some(symbol =>
      typeof symbol?.id !== "string" || !symbol.id.trim() ||
      typeof symbol.name !== "string" || !symbol.name.trim() ||
      typeof symbol.image !== "string" || symbol.image.length > 7 * 1024 * 1024 ||
      !(symbol.image === "/symbol-vantrum.svg" || /^data:image\/(?:png|jpeg|webp|svg\+xml);base64,[A-Za-z\d+/=]+$/.test(symbol.image))
    ) || new Set(symbols.map(symbol => symbol.id)).size !== symbols.length) {
      return res.status(400).json({message:"Kontrollera symbolnamn och bilder. Varje bild får vara högst 5 MB."});
    }
    await writeBlobJson(files[library], symbols);
    return res.json({symbols});
  } catch (error) {
    console.error("Kunde inte spara symbolbiblioteket:", error.message);
    return res.status(500).json({message:"Kunde inte spara symbolbiblioteket i Azure. Försök igen."});
  }
}));

// Admin sparar hela artikelregistret. Det gör appen till master i stället för koden.
app.put("/api/admin/catalog", asyncRoute(async (req, res) => {
  const password = req.headers["x-admin-password"];
  if (!(await adminAccess(req))) {
    return res.status(401).json({ success: false, message: "Obehörig" });
  }
  try {
    const catalog = await writeCatalog(req.body || {});
    return res.json({ success: true, catalog });
  } catch (error) {
    console.error("Fel vid sparning av artikelregister:", error);
    return res.status(500).json({ success: false, message: "Kunde inte spara artikelregistret." });
  }
}));

// Projekt sparas separat från ordrar och artikelregister.
const PROJECTS_BLOB = "projects-v1.json";
async function readProjects() {
  return readBlobJson(PROJECTS_BLOB, []);
}
async function writeProjects(projects) {
  await writeBlobJson(PROJECTS_BLOB, projects);
}

const {createProjectFolderStore,installProjectFolders}=require('./projectFolders');
const projectFolders=installProjectFolders(app,{store:createProjectFolderStore({blobFor:projectsBlob,directory:__dirname}),readAccess,adminAccess,readProjects,writeProjects});
const {createProofStore,installProjectProofApprovals}=require('./projectProofApprovals');
projectProofApprovals=installProjectProofApprovals(app,{
  reserveOrderNumber:reserveProjectOrderNumber,store:createProofStore({blobFor:projectsBlob,directory:__dirname}),accountSession,readUsers,readProjects,readCatalog:readProjectBoardCatalog,getDrawing:projectDrawingSnapshot,assetStorage:{blobFor:projectsBlob,directory:__dirname},
  buildQuote:async(project,catalog)=>{
    const cart=buildProjectOrderCart(project,catalog),details=getProjectDocumentDetails(project);
    return {orderNumber:`OFF-${project.number||project.id}`,createdAt:new Date().toISOString(),source:'project-quote',projectId:project.id,cart,
      orderTotal:Math.round(cart.reduce((sum,item)=>sum+item.lineTotal,0)*100)/100,currency:'SEK',orderer:getProjectOrderer(project),delivery:{company:project.customer||''},orderDetails:details,...details};
  }
});
// Shared drawing library, stored separately from projects, orders and catalogue.
const { installDrawingLibrary } = require("./drawingLibrary");
const DRAWING_LIBRARY_BLOB = "drawing-library-v1.json";
async function readDrawingLibrary() {
  const data = await readBlobJson(DRAWING_LIBRARY_BLOB, {folders:[], items:[]});
  return {folders:Array.isArray(data.folders)?data.folders:[],items:Array.isArray(data.items)?data.items:[]};
}

async function readProjectBoardCatalog() {
  const [catalog,library] = await Promise.all([readCatalog(), readDrawingLibrary()]);
  return attachOTBoards(catalog,library);
}
const {syncProjectBoardsOnProductionStart} = installDrawingLibrary(app, {
  canAccess: readAccess,
  canEdit: adminAccess,
  canPublish: adminAccess, readCatalog, writeCatalog,
  getProjectDrawing: projectDrawingSnapshot,
  read: readDrawingLibrary,
  write: library => writeBlobJson(DRAWING_LIBRARY_BLOB, library),
});

const projectFields = ["name", "customer", "contact", "phone", "email", "object", "targetPoint", "responsible", "notes", "status", "accountNumber", "customerReference", "projectCode", "managementObject", "property", "building", "floor", "room", "priority", "requestedCompletionDate", "requestedExecutionNote", "purchaserName", "purchaserEmail", "purchaserPhone"];
function cleanProject(body, original = {}) {
  const result = { ...original };
  for (const key of projectFields) if (Object.prototype.hasOwnProperty.call(body, key)) result[key] = String(body[key] ?? "").slice(0, key === "notes" ? 4000 : 250);
  if (!["Planering", "Pågående", "Pausat", "Avslutat"].includes(result.status)) result.status = "Planering";
  if (!["planeringsbar","snarast","datum"].includes(result.priority)) result.priority="planeringsbar";
  if (result.priority!=="datum") result.requestedCompletionDate="";
  return result;
}
function getProjectDocumentDetails(project) {
  return normalizeOrderDetails({orderDetails:{projectName:project.name,
    projectCode:project.projectCode ?? project.number, customerReference:project.customerReference ?? project.number,
    managementObject:project.managementObject ?? project.object,targetPoint:project.targetPoint,
    property:project.property,building:project.building,floor:project.floor,room:project.room,
    priority:project.priority || "planeringsbar",requestedCompletionDate:project.requestedCompletionDate || "",
    requestedExecutionNote:project.requestedExecutionNote ?? ""}});
}
function getProjectOrderer(project) {
  return {purchaserName:project.purchaserName||"",purchaserEmail:project.purchaserEmail||"",purchaserPhone:project.purchaserPhone||"",customer:project.customer || "",ordererName:project.contact || "",ordererEmail:project.email || "",
    ordererPhone:project.phone || "",accountNumber:project.accountNumber || "",messageToSupplier:project.notes || ""};
}
function clearMissingProjectOrderLinks(projects, orders) {
  const orderIds = new Set(orders.map(order => String(order.id)));
  let changed = false;
  for (const project of projects) {
    if (project.orderId && !orderIds.has(String(project.orderId))) {
      delete project.orderId;
      delete project.orderNumber;
      project.updatedAt = new Date().toISOString();
      changed = true;
    }
  }
  return changed;
}
app.get("/api/projects", asyncRoute(async (req, res) => {
  if (!(await readAccess(req))) return res.status(403).json({ message: "Åtkomst nekad." });
  try {
    const projects = await readProjects();
    if (clearMissingProjectOrderLinks(projects, await readOrders())) await writeProjects(projects);
    const reservations=await orderNumbers.reservations();
    res.set("Cache-Control","no-store").json({ projects:projects.map(project=>({...project,reservedOrderNumber:reservations[`project:${project.id}`]||project.orderNumber||null})), folders:await projectFolders.readFolders() });
  }
  catch (e) { console.error(e); res.status(500).json({ message: "Kunde inte läsa projekt." }); }
}));
app.post("/api/projects", asyncRoute(async (req, res) => {
  if (!(await adminAccess(req))) return res.status(403).json({ message: "Åtkomst nekad." });
  try {
    if (!String(req.body?.name || "").trim()) return res.status(400).json({ message: "Ange projektnamn." });
    const projects = await readProjects();
    const next = Math.max(1000, ...projects.map(p => Number(String(p.number || "").replace(/\D/g, "")) || 0)) + 1;
    const now = new Date().toISOString();
    const folderId=await projectFolders.validateFolderId(req.body?.folderId);
    const project = { ...cleanProject(req.body), folderId, id: crypto.randomUUID(), number: `PRJ-${next}`, drawings: [], createdAt: now, updatedAt: now };
    projects.unshift(project);
    await writeProjects(projects);
    res.status(201).json({ project });
  } catch (e) { console.error(e); res.status(e.status||500).json({ message:e.status?e.message:"Kunde inte skapa projekt." }); }
}));
app.patch("/api/projects/:id", asyncRoute(async (req, res) => {
  if (!(await adminAccess(req))) return res.status(403).json({ message: "Åtkomst nekad." });
  try {
    const projects = await readProjects();
    const index = projects.findIndex(p => p.id === req.params.id);
    if (index < 0) return res.status(404).json({ message: "Projektet hittades inte." });
    const project = cleanProject(req.body || {}, projects[index]);
    if(Object.hasOwn(req.body||{},"folderId"))project.folderId=await projectFolders.validateFolderId(req.body.folderId);
    if (!project.name.trim()) return res.status(400).json({ message: "Ange projektnamn." });
    // Moving a project changes organization, not the content of a prepared proof.
    if(Object.keys(req.body||{}).length===1&&Object.hasOwn(req.body,"folderId"))project.organizedAt=new Date().toISOString();
    else project.updatedAt = new Date().toISOString();
    projects[index] = project;
    await writeProjects(projects);
    res.json({ project });
  } catch (e) { console.error(e); res.status(e.status||500).json({ message:e.status?e.message:"Kunde inte spara projekt." }); }
}));
app.delete("/api/projects/:id", asyncRoute(async (req, res) => {
  if (!(await adminAccess(req))) return res.status(403).json({ message: "Åtkomst nekad." });
  try {
    const projects = await readProjects();
    const remaining = projects.filter(project => project.id !== req.params.id);
    if (remaining.length === projects.length) return res.status(404).json({ message: "Projektet hittades inte." });
    // Orders and imported library drawings are independent snapshots. Keep them,
    // and retain stored PDF assets rather than risking shared file references.
    await writeProjects(remaining);
    res.json({ success: true });
  } catch (e) { console.error(e); res.status(500).json({ message: "Kunde inte ta bort projektet." }); }
}));
app.post("/api/projects/:id/drawings", asyncRoute(async (req, res) => {
  if (!(await adminAccess(req))) return res.status(403).json({ message: "Åtkomst nekad." });
  try {
    const { name, data } = req.body || {};
    if (typeof data !== "string" || !/^data:application\/pdf;base64,/.test(data)) return res.status(400).json({ message: "Välj en PDF-ritning." });
    const buffer = Buffer.from(data.split(",")[1], "base64");
    if (buffer.length > 20 * 1024 * 1024 || buffer.subarray(0,5).toString() !== "%PDF-") return res.status(400).json({ message: "PDF-filen är ogiltig eller större än 20 MB." });
    const projects = await readProjects();
    const project = projects.find(p => p.id === req.params.id);
    if (!project) return res.status(404).json({ message: "Projektet hittades inte." });
    const drawing = { id: crypto.randomUUID(), name: String(name || "Ritning").slice(0,150), fileName: `${crypto.randomUUID()}.pdf`, uploadedAt: new Date().toISOString(), markers: [] };
    const blob = await projectsBlob(`project-pdfs/${project.id}/${drawing.fileName}`);
    await blob.uploadData(buffer, {blobHTTPHeaders:{blobContentType:"application/pdf"}});

    project.drawings = [...(project.drawings || []), drawing];
    project.updatedAt = new Date().toISOString();
    await writeProjects(projects);
    res.status(201).json({ drawing });
  } catch (e) { console.error(e); res.status(500).json({ message: "Kunde inte ladda upp ritningen." }); }
}));
async function projectDrawingSnapshot(projectId,drawingId) {
  const project=(await readProjects()).find(project=>project.id===projectId);
  const drawing=project?.drawings?.find(drawing=>drawing.id===drawingId);
  if(!drawing)return null;
  const blob=await projectsBlob(`project-pdfs/${project.id}/${drawing.fileName}`);
  const bytes = await blob.downloadToBuffer();

  return {project,drawing,bytes};
}
app.get("/api/projects/:id/drawings/:drawingId/file", asyncRoute(async (req, res) => {
  if (!(await readAccess(req))) return res.status(403).json({ message: "Åtkomst nekad." });
  try {
    const source=await projectDrawingSnapshot(req.params.id,req.params.drawingId);
    if(!source)return res.status(404).json({message:"Ritningen hittades inte."});
    res.set("Content-Type", "application/pdf");
    res.set("Content-Disposition", "inline");
    res.send(source.bytes);
  } catch (e) { console.error(e); res.status(500).json({ message: "Kunde inte öppna ritningen." }); }
}));

// Skyltmarkeringar: koordinater normaliseras till varje PDF-sida (0..1).
const {markerFields,createUpdateMarkerHandler}=require('./projectMarkerFields');
const {installProjectSigns}=require('./projectSigns');
installProjectSigns(app,{readProjects,writeProjects,readCatalog,readAccess,adminAccess,markerFields,blobFor:projectsBlob,directory:__dirname});

app.post("/api/projects/:id/drawings/:drawingId/markers", asyncRoute(async (req, res) => {
  if (!(await adminAccess(req))) return res.status(403).json({ message: "Åtkomst nekad." });
  try {
    const projects = await readProjects();
    const project = projects.find(p => p.id === req.params.id);
    const drawing = project?.drawings?.find(d => d.id === req.params.drawingId);
    if (!drawing) return res.status(404).json({ message: "Ritningen hittades inte." });
    const fields = markerFields(req.body || {});
    if (!fields.articleId || (fields.unplaced!==true && (!Number.isFinite(fields.x) || !Number.isFinite(fields.y) || !fields.page))) return res.status(400).json({ message: "Välj artikel och placering." });
    const positions = [...(project.signs||[]),...(project.drawings || []).flatMap(d => d.markers || [])].map(m => Number(String(m.position || "").replace(/\D/g, "")) || 0);
    const number = Math.max(0, ...positions) + 1;
    const marker = { ...fields, id: crypto.randomUUID(), position: `S${String(number).padStart(3, "0")}`, createdAt: new Date().toISOString() };
    drawing.markers = [...(drawing.markers || []), marker];
    project.updatedAt = new Date().toISOString();
    await writeProjects(projects);
    return res.status(201).json({ marker, drawing });
  } catch (e) { console.error(e); return res.status(400).json({ message: e.message || "Kunde inte spara markering." }); }
}));
app.patch("/api/projects/:id/drawings/:drawingId/markers/:markerId",createUpdateMarkerHandler({adminAccess,readProjects,writeProjects}));

app.delete("/api/projects/:id/drawings/:drawingId/markers/:markerId", asyncRoute(async (req, res) => {
  if (!(await adminAccess(req))) return res.status(403).json({ message: "Åtkomst nekad." });
  try {
    const projects = await readProjects();
    const project = projects.find(p => p.id === req.params.id);
    const drawing = project?.drawings?.find(d => d.id === req.params.drawingId);
    if (!drawing || !(drawing.markers || []).some(m => m.id === req.params.markerId)) return res.status(404).json({ message: "Markeringen hittades inte." });
    drawing.markers = drawing.markers.filter(m => m.id !== req.params.markerId);
    project.updatedAt = new Date().toISOString();
    await writeProjects(projects);
    return res.json({ drawing });
  } catch (e) { console.error(e); return res.status(500).json({ message: "Kunde inte ta bort markeringen." }); }
}));

app.get("/api/orders", asyncRoute(async (req, res) => {
  const password = req.headers["x-admin-password"];
  if (!(await staffAccess(req))) {
    return res.status(401).json({ success: false, message: "Obehörig" });
  }
  const orders = await readOrders();
  return res.json({ success: true, orders });
}));

let productionStatusQueue = Promise.resolve();
function serializeProductionUpdate(handler) {
  return (req, res) => {
    const task = productionStatusQueue.then(() => handler(req, res));
    productionStatusQueue = task.catch(() => {});
    return task.catch(error => {
      if (error.status !== 409) console.error("Produktionsstatus:", error);
      if (!res.headersSent) res.status(error.status === 409 ? 409 : 500).json({
        success:false,
        message:error.status === 409 ? error.message : "Kunde inte spara produktionsstatus eller uppdatera Ritningar. Försök igen."
      });
    });
  };
}

async function saveProductionStatus(orders, index, previousOrder) {
  await syncProjectBoardsOnProductionStart(previousOrder, orders[index]);
  addOrderStatusNotification(previousOrder, orders[index]);
  await writeOrders(orders);
}

app.patch("/api/orders/:id/department-status", serializeProductionUpdate(async (req, res) => {
  if (!(await staffAccess(req))) return res.status(401).json({ success:false, message:"Obehörig" });
  const { department, status } = req.body || {};
  if (!["Layout", "Produktion", "Montering", "Packning"].includes(department) || !["ej_paborjad", "paborjad", "pausad", "klar"].includes(status)) return res.status(400).json({success:false,message:"Ogiltig avdelning eller status"});
  const orders = await readOrders();
  const index = orders.findIndex(o => String(o.id) === String(req.params.id));
  if (index < 0) return res.status(404).json({success:false,message:"Ordern hittades inte"});
  const order = orders[index];
  if(isBadgeOrder(order)) return res.status(409).json({message:"Brickbeställningar hanteras i den separata kön."});
  const plan = order.productionPlan;
  if (!plan?.departments?.[department]?.enabled) return res.status(400).json({success:false,message:"Avdelningen är inte planerad för ordern"});
  const departments = { ...plan.departments, [department]: { ...plan.departments[department], status } };
  const enabled = Object.values(departments).filter(item => item?.enabled);
  const complete = enabled.length > 0 && enabled.every(item => item.status === "klar");
  const started = enabled.some(item => ["paborjad", "pausad", "klar"].includes(item.status));
  // Delivery is always a separate manual action. Never overwrite delivered orders.
  if (order.status === "levererad") return res.status(409).json({success:false,message:"Återöppna ordern innan avdelningsstatus ändras."});
  const managed = ["godkänd", "påbörjad", "klar"].includes(String(order.status || "").toLowerCase());
  const nextStatus = managed ? (complete ? "klar" : started ? "påbörjad" : "godkänd") : order.status;
  orders[index] = { ...order, status: nextStatus, productionPlan:{ ...plan, departments }, updatedAt:new Date().toISOString() };
  await saveProductionStatus(orders, index, order);
  return res.json({success:true,order:orders[index]});
}));

app.patch("/api/orders/:id/status", serializeProductionUpdate(async (req, res) => {
  const password = req.headers["x-admin-password"];
  const { id } = req.params;
  const { status } = req.body;
  if (!(await staffAccess(req))) {
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
  if (isBadgeOrder(orders[orderIndex])) return res.status(409).json({message:"Ändra status under Namnbrickor & yrkestitlar."});
  if (status === "levererad") {
    const current = orders[orderIndex];
    const departments = Object.values(current.productionPlan?.departments || {}).filter(item => item?.enabled);
    if (!departments.length || !departments.every(item => item.status === "klar")) {
      return res.status(409).json({ success:false, message:"Alla valda avdelningar måste vara klara innan ordern kan levereras." });
    }
  }
  const previousOrder = orders[orderIndex];
  orders[orderIndex] = { ...orders[orderIndex], status, updatedAt:new Date().toISOString(),
    ...(status === "levererad" ? { deliveredAt: new Date().toISOString() } : { deliveredAt: null }) };
  await saveProductionStatus(orders, orderIndex, previousOrder);
  return res.json({ success: true, message: "Status uppdaterad", order: orders[orderIndex] });
}));

app.patch("/api/orders/:id/approval", asyncRoute(async (req, res) => {
  const password = req.headers["x-admin-password"];
  const { id } = req.params;
  const { action, productionPlan } = req.body || {};

  if (!(await adminAccess(req))) {
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
  if (isBadgeOrder(current)) return res.status(409).json({message:"Brickbeställningar kräver inget godkännande."});
  if (action === "approve") {
    const departments = ["Layout", "Produktion", "Montering", "Packning"];
    const year = Number(productionPlan?.year);
    const entries = productionPlan?.departments;
    const valid = Number.isInteger(year) && year >= 2025 && year <= 2100 && entries && typeof entries === "object"
      && departments.some(name => entries[name]?.enabled)
      && departments.every(name => !entries[name]?.enabled || (Number.isInteger(Number(entries[name]?.week)) && Number(entries[name]?.week) >= 1 && Number(entries[name]?.week) <= 53 && Number.isInteger(Number(entries[name]?.day)) && Number(entries[name]?.day) >= 1 && Number(entries[name]?.day) <= 5))
      && (productionPlan?.deliveryDate || productionPlan?.installationDate)
      && [productionPlan?.deliveryDate, productionPlan?.installationDate].every(value => !value || /^\d{4}-\d{2}-\d{2}$/.test(value));
    if (!valid) return res.status(400).json({success:false,message:"Fyll i giltig produktionsplanering och bekräftat datum före godkännande."});
    const orderNumber = current.orderNumber || await getNextOrderNumber(orders,`order:${current.id}`);
    orders[orderIndex] = {
      ...current,
      orderNumber,
      status: "godkänd",
      approvedAt: new Date().toISOString(),
      productionPlan,
    };
  } else {
    orders[orderIndex] = {
      ...current,
      status: "behöver_kompletteras",
      needsInfoAt: new Date().toISOString(),
    };
  }

  addOrderStatusNotification(current, orders[orderIndex]);
  await writeOrders(orders);
  return res.json({ success: true, order: orders[orderIndex] });
}));

const ORDER_DETAIL_KEYS = [
  "customerReference", "projectName", "projectCode", "managementObject", "targetPoint",
  "property", "building", "floor", "room",
  "requestedCompletionDate", "requestedExecutionNote",
];

function normalizeOrderDetails(order = {}) {
  const nested = order.orderDetails && typeof order.orderDetails === "object" ? order.orderDetails : {};
  return ORDER_DETAIL_KEYS.reduce((result, key) => {
    // Nested orderDetails is canonical. Top-level fallback keeps older clients compatible.
    const value = nested[key] ?? order[key] ?? "";
    result[key] = typeof value === "string" ? value.trim() : value;
    return result;
  }, {});
}

// Shared project order flow includes drawing markers, standalone articles and Corel originals.
const readProjectOrderAsset=installProjectOrderFiles(app,{readOrders,staffAccess,blobFor:projectsBlob,directory:__dirname});
installProjectOrders(app,{readProjects,writeProjects,readOrders,writeOrders,readCatalog:readProjectBoardCatalog,staffAccess,adminAccess,accountSession,readUsers,purchaserAccountId,prepareOrderParts,addOrderStatusNotification,reserveProjectOrderNumber,getNextSubmissionNumber,getProjectDocumentDetails,getProjectOrderer,clearMissingProjectOrderLinks,readAsset:readProjectOrderAsset});

// Ändra produktionsplanering på en redan godkänd order, även manuella ordrar.
app.put("/api/orders/:id/production-plan", serializeProductionUpdate(async (req, res) => {
  if (!(await adminAccess(req))) return res.status(401).json({ success:false, message:"Obehörig" });
  const orders = await readOrders();
  const index = orders.findIndex(o => String(o.id) === String(req.params.id));
  if (index < 0) return res.status(404).json({ success:false, message:"Ordern hittades inte." });
  const order = orders[index];
  if (isBadgeOrder(order)) return res.status(409).json({message:"Brickbeställningar hanteras i den separata kön."});
  if (!["godkänd", "påbörjad", "klar"].includes(order.status)) return res.status(409).json({ success:false, message:"Endast aktiva, godkända ordrar kan planeras." });
  const input = req.body || {};
  const departments = ["Layout", "Produktion", "Montering", "Packning"];
  const validDate = value => !value || (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value + "T12:00:00Z")));
  const year = Number(input.year);
  if (!Number.isInteger(year) || year < 2025 || year > 2100 || !validDate(input.deliveryDate) || !validDate(input.installationDate)) return res.status(400).json({success:false,message:"Kontrollera år och leveransdatum."});
  const old = order.productionPlan?.departments || {};
  const next = {};
  for (const name of departments) {
    const item = input.departments?.[name] || {};
    const enabled = item.enabled === true;
    const week = Number(item.week), day = Number(item.day);
    if (enabled && (!Number.isInteger(week) || week < 1 || week > 53 || !Number.isInteger(day) || day < 1 || day > 5)) return res.status(400).json({success:false,message:`Kontrollera planeringen för ${name}.`});
    next[name] = { enabled, week:enabled ? week : null, day:enabled ? day : null,
      status: enabled ? (old[name]?.enabled ? old[name].status || "ej_paborjad" : "ej_paborjad") : "ej_paborjad" };
  }
  if (!departments.some(name => next[name].enabled)) return res.status(400).json({success:false,message:"Välj minst en avdelning."});
  if (!input.deliveryDate && !input.installationDate) return res.status(400).json({success:false,message:"Ange slutleveransdatum."});
  const active = Object.values(next).filter(d => d.enabled);
  const complete = active.every(d => d.status === "klar");
  const started = active.some(d => ["paborjad","pausad","klar"].includes(d.status));
  orders[index] = {...order, status:complete ? "klar" : started ? "påbörjad" : "godkänd",
    productionPlan:{year, deliveryDate:input.deliveryDate || "", installationDate:input.installationDate || "", departments:next},updatedAt:new Date().toISOString()};
  await saveProductionStatus(orders, index, order);
  return res.json({success:true,order:orders[index]});
}));

app.post("/api/orders/manual", asyncRoute(async (req, res) => {
  if (!(await adminAccess(req))) return res.status(401).json({ success: false, message: "Obehörig" });
  const input = req.body || {};
  if (!Array.isArray(input.cart) || input.cart.length === 0 || input.cart.length > 500) {
    return res.status(400).json({ success: false, message: "Ordern måste innehålla 1–500 artiklar." });
  }
  let cart = input.cart.map(item => {
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice ?? 0);
    if (!Number.isFinite(quantity) || !Number.isInteger(quantity) || quantity < 1 || quantity > 100000 || !Number.isFinite(unitPrice) || unitPrice < 0) return null;
    return { ...item, quantity, unitPrice, currency: "SEK", lineTotal: Math.round(quantity * unitPrice * 100) / 100 };
  });
  if (cart.some(item => !item)) return res.status(400).json({ success: false, message: "Kontrollera antal och pris på artiklarna." });
  try {
    for(const item of cart)await signArtworkStore.validate(item);
    cart = snapshotProductionFiles(cart, await readCatalog());
    const session = await accountSession(req);
    const orders = await readOrders();
    const details = normalizeOrderDetails(input);
    const now = new Date().toISOString();
    const order = {
      accountUserId: session?.id || null,
      id: crypto.randomUUID(), orderNumber: await getNextOrderNumber(orders),
      submissionNumber: getNextSubmissionNumber(orders), source: "manual",
      createdAt: now, approvedAt: now, status: "godkänd",
      cart, orderTotal: Math.round(cart.reduce((sum, item) => sum + item.lineTotal, 0) * 100) / 100,
      currency: "SEK", orderer: input.orderer || {}, delivery: input.delivery || {},
      orderDetails: details, ...details,
    };
    order.createdByAccountId=session?.id || null;
    order.accountUserId=purchaserAccountId(order,await readUsers());
    const parts=await prepareOrderParts(order,orders);
    parts.forEach(part=>addOrderStatusNotification({status:null},part));
    orders.unshift(...parts);
    await writeOrders(orders);
    return res.status(201).json({ success: true, order:parts[0],orders:parts });
  } catch (error) {
    console.error("Kunde inte skapa intern order:", error);
    return res.status(500).json({ success: false, message: "Kunde inte skapa ordern." });
  }
}));

const signArtworkStore=installSignArtwork(app,{accountSession,blobFor:projectsBlob,directory:__dirname});
installDibondSymbols(app,{accountSession,staffAccess:adminAccess,blobFor:projectsBlob,directory:__dirname});

const orderAttachmentStore=createOrderAttachments({app,readOrders,accountSession,blobFor:projectsBlob,directory:path.join(__dirname,'order-attachments')});

app.post("/api/orders", asyncRoute(async (req, res) => {
  const session = req.headers.authorization ? await accountSession(req) : null;
  if (req.headers.authorization && !session) return res.status(401).json({ success: false, message: "Logga in igen innan du skickar beställningen." });
  const order = req.body;
  if (!order || !Array.isArray(order.cart) || order.cart.length === 0) {
    return res.status(400).json({ success: false, message: "Tom beställning" });
  }
  const orderCatalog=await readCatalog();
  if(hasProofOnlyItems(order.cart,orderCatalog))return res.status(403).json({success:false,message:"En artikel i kundkorgen är endast tillgänglig för Projekt & Korrektur och kan inte beställas på beställningssidan."});
  if (!session) {
    const catalog = orderCatalog;
    if (!order.cart.every(item => guestCanOrder(item, catalog)))
      return res.status(403).json({success:false,message:"Logga in för att beställa övriga artiklar. Utan inloggning kan du beställa namnbrickor, yrkestitelsskyltar och extra magnetfästen."});
  }
  if(order.cart.every(isBadgeItem)){
    const errors=badgeCheckoutErrors(order.orderer,order.delivery);
    if(Object.keys(errors).length)return res.status(422).json({message:Object.values(errors)[0],fields:errors});
    order.delivery=normalizeBadgeDelivery(order.delivery);
  }
  let pdfFiles;
  try{pdfFiles=validateAttachments(order.orderer?.pdfAttachments);}
  catch(error){return res.status(400).json({success:false,message:error.message});}
  const {pdfAttachments,...cleanOrderer}=order.orderer||{};
  const orders = await readOrders();
  const submissionNumber = getNextSubmissionNumber(orders);
  console.log("Ny beställning skapas:", submissionNumber);
  try{for(const item of order.cart)await signArtworkStore.validate(item);}catch(error){return res.status(400).json({message:error.message});}
  const pricedCart = snapshotProductionFiles((order.cart || []).map((item) => {
    const quantity = Math.max(1, Number(item?.quantity) || 1);
    const unitPrice = Math.max(0, Number(item?.unitPrice) || 0);
    return {
      ...item,
      quantity,
      unitPrice,
      currency: item?.currency || "SEK",
      lineTotal: Math.round(unitPrice * quantity * 100) / 100,
    };
  }),await readCatalog());
  const orderTotal = Math.round(pricedCart.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0) * 100) / 100;
  const newOrder = {
    id: crypto.randomUUID(),
    accountUserId: session?.id || null,
    submissionNumber,
    orderNumber: null,
    createdAt: new Date().toISOString(),
    status: "väntar_godkännande",
    cart: pricedCart,
    orderTotal,
    currency: "SEK",
    orderer: cleanOrderer,
    delivery: order.delivery || {},
    orderDetails: normalizeOrderDetails(order),
    // Spara också samma värden på toppnivå så äldre vyer och importer förblir kompatibla.
    ...normalizeOrderDetails(order),
  };
  newOrder.createdByAccountId=session?.id || null;
  newOrder.accountUserId=purchaserAccountId(newOrder,await readUsers());
  let parts;
  try{
    newOrder.attachments=await orderAttachmentStore.save(pdfFiles);
    parts=await prepareOrderParts(newOrder,orders);
    orders.unshift(...parts);
    await writeOrders(orders);
  }catch(error){
    await orderAttachmentStore.remove(newOrder.attachments||[]);
    console.error('Kunde inte spara order och bilagor:',error);
    return res.status(500).json({success:false,message:'Kunde inte spara beställningen och PDF-bilagorna. Försök igen.'});
  }

  if (useDevStorage) return res.json({success:true, order:parts[0], orders:parts});

  try {
    const emailClient = new EmailClient(process.env.ACS_CONNECTION_STRING);
    const customerEmail = order.orderer?.purchaserEmail || order.orderer?.ordererEmail;
    if (customerEmail) {
      console.log("Försöker skicka mail till:", customerEmail);

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

      const message = await buildOrderConfirmationEmail(parts, { submissionNumber, productLines });

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

  return res.json({ success: true, order: parts[0], orders: parts });
}));


app.put("/api/orders/:id", asyncRoute(async (req, res) => {
  const password = req.headers["x-admin-password"];
  const { id } = req.params;
  if (!(await adminAccess(req))) {
    return res.status(401).json({ success: false, message: "Obehörig" });
  }

  const orders = await readOrders();
  const orderIndex = orders.findIndex((order) => order.id === id);
  if (orderIndex === -1) {
    return res.status(404).json({ success: false, message: "Beställningen hittades inte" });
  }

  const current = orders[orderIndex];
  const incoming = req.body || {};
  const cart = Array.isArray(incoming.cart) ? incoming.cart : current.cart || [];
  if (!cart.length) {
    return res.status(400).json({ success: false, message: "Ordern måste innehålla minst en artikel." });
  }

  if(isBadgeOrder(current) && !cart.every(require("../src/data/badgeProduction").isBadgeItem)) return res.status(400).json({message:"Övriga skyltar måste läggas som separat beställning."});
  try{for(const item of cart)await signArtworkStore.validate(item);}catch(error){return res.status(400).json({message:error.message});}
  const normalizedCart = snapshotProductionFiles(cart.map((item) => {
    const quantity = Math.max(1, Number(item?.quantity) || 1);
    const unitPrice = Math.max(0, Number(item?.unitPrice) || 0);
    return {
      ...item,
      quantity,
      unitPrice,
      currency: item?.currency || "SEK",
      lineTotal: Math.round(quantity * unitPrice * 100) / 100,
    };
  }),await readCatalog(),current.cart||[]);
  const orderTotal = Math.round(normalizedCart.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0) * 100) / 100;

  const normalizedOrderDetails = normalizeOrderDetails({
    ...current,
    ...incoming,
    orderDetails: { ...(current.orderDetails || {}), ...(incoming.orderDetails || {}) },
  });

  orders[orderIndex] = {
    ...current,
    orderer: { ...(current.orderer || {}), ...(incoming.orderer || {}) },
    delivery: { ...(current.delivery || {}), ...(incoming.delivery || {}) },
    orderDetails: normalizedOrderDetails,
    ...normalizedOrderDetails,
    cart: normalizedCart,
    orderTotal,
    currency: incoming.currency || current.currency || "SEK",
    updatedAt: new Date().toISOString(),
  };

  await writeOrders(orders);
  return res.json({ success: true, order: orders[orderIndex] });
}));

app.delete("/api/orders/:id", asyncRoute(async (req, res) => {
  const password = req.headers["x-admin-password"];
  const { id } = req.params;
  if (!(await adminAccess(req))) {
    return res.status(401).json({ success: false, message: "Obehörig" });
  }
  try {
  const orders = await readOrders();
  const filteredOrders = orders.filter((order) => order.id !== id);
  if (filteredOrders.length === orders.length) {
    return res.status(404).json({ success: false, message: "Beställningen hittades inte" });
  }
  await writeOrders(filteredOrders);
  const projects = await readProjects();
  if (clearMissingProjectOrderLinks(projects, filteredOrders)) await writeProjects(projects);
  return res.json({ success: true, message: "Beställningen är borttagen" });
  } catch (error) {
    console.error("Kunde inte radera beställningen:", error);
    return res.status(500).json({ success: false, message: "Kunde inte slutföra borttagningen. Uppdatera sidan och försök igen." });
  }
}));

const BADGE_SETTINGS_BLOB = "badge-production-settings.json";
const readBadgeSettings = () => readBlobJson(BADGE_SETTINGS_BLOB, {});
const writeBadgeSettings = settings => writeBlobJson(BADGE_SETTINGS_BLOB, settings);

attachBadgeProduction(app,{readOrders,writeOrders,readCatalog,readSettings:readBadgeSettings,writeSettings:writeBadgeSettings,staffAccess:adminAccess,adminAccess,addOrderStatusNotification});

installHangingSignPlotter(app,{readOrders,readCatalog,staffAccess,blobFor:projectsBlob,directory:__dirname});
installArticleProduction(app,{adminAccess,staffAccess,blobFor:projectsBlob,directory:__dirname});

const buildPath = path.join(__dirname, "../build");
app.use(express.static(buildPath));

app.get("*", (req, res) => {
  res.sendFile(path.join(buildPath, "index.html"));
});

app.use((error, req, res, next) => {
  if (res.headersSent || !req.path.startsWith("/api/")) return next(error);
  const status = Number(error.status || error.statusCode);
  if (status >= 400 && status < 500 && error.type === "entity.parse.failed") {
    return res.status(status).json({message:"Begäran innehåller ogiltig JSON."});
  }
  if (error.type === "entity.too.large") {
    return res.status(413).json({message:"Begäran är för stor."});
  }
  console.error("API-fel:", error.code || error.name);
  return res.status(503).json({message:"Tjänsten kunde inte läsa eller spara uppgifterna. Försök igen."});
});

async function createInitialAdmin() {
  const existing = useDevStorage ? await require("./devBlobStorage").readDevAdmin() : null;
  const email = useDevStorage ? "admin@jsf.test" : process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  const password = useDevStorage ? crypto.randomBytes(15).toString("base64url") : process.env.INITIAL_ADMIN_PASSWORD;
  if (!email && !password) return;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "") || !password || password.length < 12 || password.length > 128) {
    throw new Error("För första administratören krävs en giltig e-postadress och ett lösenord på 12–128 tecken.");
  }
  const user = {id:crypto.randomUUID(),email,firstName:"Admin",lastName:"",role:"admin",status:"approved",
    passwordHash:hashPassword(password),createdAt:new Date().toISOString()};
  const users = existing && existing.email !== email ? [existing, user] : [user];
  const blob = await projectsBlob("users.json");
  try {
    await blob.uploadData(Buffer.from(JSON.stringify(users)), {
      conditions:{ifNoneMatch:"*"},
      blobHTTPHeaders:{blobContentType:"application/json"}
    });
    if (useDevStorage) {
      console.log("Lokalt testläge. Data sparas i minnet och försvinner när servern stoppas.");
      if (users.length > 1) console.log("Det befintliga lokala adminkontot kan också användas.");
      console.log("Testadmin:", email);
      console.log("Testlösenord:", password);
    } else {
      console.log("Första administratörskontot har skapats.");
    }
  } catch (error) {
    if (error.code !== "BlobAlreadyExists" && error.statusCode !== 412) throw error;
  }
}

async function startServer() {
  if (useDevStorage) {
    const {ordrar, projekt, korrekturversioner, ritningsobjekt} = await require("./devBlobStorage").seedDevData(storage);
    console.log(`Inläst från arbetskopian: ${ordrar} ordrar, ${projekt} projekt, ${korrekturversioner} korrekturversioner och ${ritningsobjekt} ritningsobjekt.`);
  }
  await createInitialAdmin();
  const onListening = () => console.log(`Server kör på http://localhost:${PORT}`);
  if (useDevStorage) app.listen(PORT, "127.0.0.1", onListening);
  else app.listen(PORT, onListening);
}

startServer().catch(error => {
  console.error("Servern kunde inte starta:", error.code || error.message);
  process.exitCode = 1;
});
