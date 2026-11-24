import seedCatalog from './generated/catalog.seed.json';
import {
  getCatalogSnapshot,
  getCatalogCategories,
  saveCatalog,
} from './catalogStore';

export const CATEGORY_STATUS_OPTIONS = [
  { value: 'open', label: 'Öppen' },
  { value: 'closed', label: 'Stängd' },
  { value: 'hidden', label: 'Dold' },
  { value: 'internal', label: 'Endast intern' },
];

const seedById = Object.fromEntries((seedCatalog.categories || []).map((c) => [c.id, c]));

export function getCategoryDefaultStatus(category) {
  const seed = seedById[category?.id];
  if (seed?.status) return seed.status;
  if (seed) return seed.isImplemented ? 'open' : 'closed';
  return category?.status || 'closed';
}

export function getAllAdminCategories() {
  return (getCatalogCategories() || []).map((category) => {
    const status = category.status || (category.isImplemented ? 'open' : 'closed');
    return {
      ...category,
      status,
      isImplemented: status === 'open',
      isCustom: !Boolean(seedById[category.id]),
    };
  });
}

export function getPublicCategories() {
  // Only open categories are available in the public storefront and navigation.
  // Closed, hidden and internal categories remain available in admin.
  return getAllAdminCategories().filter((category) => category.status === 'open');
}

export function getPublicCategoryById(categoryId) {
  return getPublicCategories().find((category) => category.id === categoryId) || null;
}

async function persistCategories(categories, adminPassword) {
  const snapshot = getCatalogSnapshot();
  return saveCatalog(
    {
      ...snapshot,
      categories: categories.map((category) => ({
        ...category,
        isImplemented: (category.status || 'closed') === 'open',
      })),
      updatedAt: new Date().toISOString(),
    },
    adminPassword
  );
}

export async function setCategoryStatus(categoryId, status, adminPassword) {
  const categories = getAllAdminCategories().map((category) =>
    category.id === categoryId
      ? { ...category, status, isImplemented: status === 'open' }
      : category
  );
  await persistCategories(categories, adminPassword);
}

export async function resetCategoryStatus(categoryId, adminPassword) {
  const defaultStatus = getCategoryDefaultStatus({ id: categoryId });
  return setCategoryStatus(categoryId, defaultStatus, adminPassword);
}

export async function addCustomCategory({ title }, adminPassword) {
  const cleanTitle = String(title || '').trim();
  if (!cleanTitle) return null;

  const categories = getAllAdminCategories();
  const slugBase = cleanTitle
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'artikelgrupp';

  let id = slugBase;
  let index = 2;
  const existingIds = new Set(categories.map((item) => item.id));
  while (existingIds.has(id)) {
    id = `${slugBase}-${index}`;
    index += 1;
  }

  const category = {
    id,
    title: cleanTitle,
    isImplemented: false,
    status: 'closed',
  };
  await persistCategories([...categories, category], adminPassword);
  return category;
}

export async function deleteCustomCategory(categoryId, adminPassword) {
  const categories = getAllAdminCategories().filter((category) => category.id !== categoryId);
  await persistCategories(categories, adminPassword);
}

// Category cover images are stored in the shared catalog (not in browser localStorage).
export async function setCategoryCoverImage(categoryId, coverImage, adminPassword) {
  const categories = getAllAdminCategories().map((category) =>
    category.id === categoryId ? { ...category, coverImage: coverImage || '' } : category
  );
  await persistCategories(categories, adminPassword);
}

export function getPublicRootCategories(){return getPublicCategories().filter(category=>!category.parentId);}
export function getPublicChildCategories(parentId){return getPublicCategories().filter(category=>category.parentId===parentId);}
