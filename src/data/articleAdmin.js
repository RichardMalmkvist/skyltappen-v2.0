import {
  getCatalogSnapshot,
  getCatalogArticles,
  saveCatalog,
} from './catalogStore';

function normalizeImages(article = {}) {
  const images = Array.isArray(article.images) ? article.images.filter(Boolean) : [];
  const legacy = article.image ? [article.image] : [];
  const merged = images.length ? images : legacy;
  const primaryIndex = Math.min(
    Math.max(Number(article.primaryImageIndex) || 0, 0),
    Math.max(merged.length - 1, 0)
  );
  const cardIndex = Math.min(
    Math.max(Number(article.cardImageIndex ?? primaryIndex) || 0, 0),
    Math.max(merged.length - 1, 0)
  );
  return {
    ...article,
    images: merged,
    primaryImageIndex: primaryIndex,
    cardImageIndex: cardIndex,
    image: merged[primaryIndex] || article.image || '',
    cardImage: merged[cardIndex] || merged[primaryIndex] || article.image || '',
    imageFit: article.imageFit || 'contain',
    imageScale: Number(article.imageScale) || 100,
    unitPrice: Math.max(0, Number(article.unitPrice) || 0),
    currency: article.currency || 'SEK',
    source: 'catalog',
  };
}

export function getAdminArticles() {
  return getCatalogArticles().map(normalizeImages);
}

async function persistArticles(articles, adminPassword) {
  const snapshot = getCatalogSnapshot();
  return saveCatalog(
    {
      ...snapshot,
      version: 2,
      articles: articles.map((article) => {
        const { source, cardImage, ...clean } = normalizeImages(article);
        return clean;
      }),
      updatedAt: new Date().toISOString(),
    },
    adminPassword
  );
}

export async function saveAdminArticle(article, adminPassword) {
  const normalized = normalizeImages(article);
  const articles = [...getCatalogArticles()];
  const index = articles.findIndex((p) => String(p.id) === String(normalized.id));
  const { source, cardImage, ...clean } = normalized;
  if (index >= 0) articles[index] = clean;
  else articles.push(clean);
  await persistArticles(articles, adminPassword);
  return normalized;
}

export function createAdminArticle(seed = {}) {
  return normalizeImages({
    id: `article-${Date.now()}`,
    articleNumber: '',
    categoryId: 'namnbrickor',
    productType: 'skylt',
    flowType: 'form',
    previewType: 'image',
    name: 'Ny artikel',
    desc: '',
    image: '',
    images: [],
    primaryImageIndex: 0,
    cardImageIndex: 0,
    imageFit: 'contain',
    imageScale: 100,
    unitPrice: 0,
    currency: 'SEK',
    isImplemented: false,
    storefrontOrderable: true,
    adminArchived: false,
    fields: { quantity: true },
    fasteningOptions: [],
    ...seed,
  });
}

export function duplicateAdminArticle(article) {
  return createAdminArticle({
    ...article,
    id: `article-${Date.now()}`,
    articleNumber: article.articleNumber ? `${article.articleNumber}-KOPIA` : '',
    name: `${article.name || 'Artikel'} – kopia`,
  });
}

export async function deleteAdminArticle(article, adminPassword) {
  const articles = getCatalogArticles().filter(
    (p) => String(p.id) !== String(article.id)
  );
  await persistArticles(articles, adminPassword);
}

// Replace only this category's slots so other groups keep their saved order.
export function reorderArticlesInCategory(articles, categoryId, orderedIds) {
  const categoryArticles = articles.filter(article => article.categoryId === categoryId);
  const byId = new Map(categoryArticles.map(article => [String(article.id), article]));
  const ids = Array.isArray(orderedIds) ? orderedIds.map(String) : [];
  if (!categoryArticles.length || ids.length !== categoryArticles.length ||
      new Set(ids).size !== ids.length || ids.some(id => !byId.has(id))) {
    throw new Error('Artikelgruppen har ändrats. Uppdatera sidan och försök igen.');
  }
  let index = 0;
  return articles.map(article => article.categoryId === categoryId ? byId.get(ids[index++]) : article);
}

export async function saveAdminArticleOrder(categoryId, orderedIds, adminPassword) {
  const snapshot = getCatalogSnapshot();
  const articles = reorderArticlesInCategory(snapshot.articles || [], categoryId, orderedIds);
  // Preserve all saved article fields, images and category data verbatim.
  await saveCatalog({ ...snapshot, articles, updatedAt: new Date().toISOString() }, adminPassword);
}

export async function setAdminArticleActive(article, isActive, adminPassword) {
  return saveAdminArticle(
    { ...article, isImplemented: Boolean(isActive), adminArchived: false },
    adminPassword
  );
}

export async function resetAdminArticle(article) {
  return article;
}

// The four homepage shortcuts are persisted with the articles in one catalog update.
export async function setHomepageFeaturedArticles(articleIds, adminPassword) {
  const ids = [...new Set((articleIds || []).filter(Boolean).map(String))].slice(0, 4);
  const snapshot = getCatalogSnapshot();
  const articles = (snapshot.articles || []).map((article) => {
    const { homepageFeaturedOrder, ...rest } = article;
    const index = ids.indexOf(String(article.id));
    return index >= 0 ? { ...rest, homepageFeaturedOrder: index + 1 } : rest;
  });
  await saveCatalog({ ...snapshot, articles, updatedAt: new Date().toISOString() }, adminPassword);
}
