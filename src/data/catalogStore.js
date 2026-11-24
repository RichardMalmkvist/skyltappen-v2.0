import { guestCatalog } from './catalogAccess';
import seedCatalog from './generated/catalog.seed.json';
import { normalizeThreePartDoorArticles } from './doorSignDimensions';
import { cleanDoorPhoto0608 } from './cleanDoorPhoto0608';
import { normalizeDoorTextReference } from './doorTextReference';
import { saveDoorSignSymbols } from './doorSignSymbols';
import { saveHangingSignSymbols } from './hangingSignSymbols';

let catalogToken = "";
let accessVersion = 0;
let catalog = guestCatalog({
  ...seedCatalog,
  categories: Array.isArray(seedCatalog.categories) ? seedCatalog.categories : [],
  articles: Array.isArray(seedCatalog.articles) ? seedCatalog.articles.map(cleanDoorPhoto0608) : [],
  loadedFromServer: false,
});

export function setCatalogAccessToken(token = "") {
  if (catalogToken === token) return;
  catalogToken = token;
  accessVersion += 1;
  saveHangingSignSymbols(null);
  saveDoorSignSymbols(null);
  // Immediately discard private articles on logout, including offline fallback.
  if (!token) catalog = guestCatalog(catalog);
}

export function getCatalogAccessHeaders(){return catalogToken?{Authorization:`Bearer ${catalogToken}`}:{ };}

export function getCatalogSnapshot() {
  return catalog;
}

export function setCatalogSnapshot(next = {}) {
  const originalArticles = Array.isArray(next.articles) ? next.articles.map(cleanDoorPhoto0608) : [];
  let articles = originalArticles;
  if (typeof normalizeThreePartDoorArticles === 'function') {
    try {
      const normalized = normalizeThreePartDoorArticles(originalArticles).map(normalizeDoorTextReference);
      // A preview adjustment must never prevent the saved catalog from loading.
      if (Array.isArray(normalized) && normalized.length === originalArticles.length) articles = normalized;
    } catch (error) {
      console.warn('Artikelregistret läses in utan anpassningen för 0607.', error);
    }
  }
  catalog = {
    homepageImages: next.homepageImages && typeof next.homepageImages === "object" ? next.homepageImages : {},
    productUpdates: Array.isArray(next.productUpdates) ? next.productUpdates : [],
    version: next.version || 2,
    updatedAt: next.updatedAt || new Date().toISOString(),
    categories: Array.isArray(next.categories) ? next.categories : [],
    articles,
    loadedFromServer: Boolean(next.loadedFromServer ?? true),
  };
  if (!catalogToken) catalog = guestCatalog(catalog);
  return catalog;
}

export function getCatalogArticles() {
  return catalog.articles || [];
}

export function getCatalogCategories() {
  return catalog.categories || [];
}

export async function fetchCatalog(sessionToken) {
  // React retains the logged-in account during a development refresh, while
  // this module can be reloaded. Reconnect from the caller's current session.
  if (typeof sessionToken === 'string') setCatalogAccessToken(sessionToken);
  const requestVersion = accessVersion;
  const response = await fetch('/api/catalog', {
    headers: catalogToken ? { Authorization: `Bearer ${catalogToken}` } : {},
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Kunde inte hämta artikelregistret.');
  const data = await response.json();
  if (requestVersion !== accessVersion) return catalog;
  saveHangingSignSymbols(data.signSymbols?.hanging);
  saveDoorSignSymbols(data.signSymbols?.door);
  return setCatalogSnapshot({ ...data, loadedFromServer: true });
}

export async function saveSignSymbolLibrary(library, symbols, adminPassword) {
  const response = await fetch('/api/admin/sign-symbols/' + encodeURIComponent(library), {
    method:'PUT',
    headers:{'Content-Type':'application/json','x-admin-password':adminPassword || ''},
    body:JSON.stringify({symbols})
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Kunde inte spara symbolbiblioteket.');
  if (library === 'door') saveDoorSignSymbols(data.symbols);
  else saveHangingSignSymbols(data.symbols);
  return data.symbols;
}

export async function saveCatalog(nextCatalog, adminPassword) {
  const response = await fetch('/api/admin/catalog', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-password': adminPassword || '',
    },
    body: JSON.stringify(nextCatalog),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Kunde inte spara artikelregistret.');
  return setCatalogSnapshot({ ...data.catalog, loadedFromServer: true });
}
