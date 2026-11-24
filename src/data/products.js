import {supportsFlagSign3D} from './flagSign3D';
import {isThinDecal3D} from './decal3D';
import { isAreaPriced } from "./areaPricing";
import seedCatalog from './generated/catalog.seed.json';
import { getCatalogArticles } from './catalogStore';
import { storefrontCatalog } from './catalogVisibility';

// Endast migrerings-/offlinefallback. Det levande artikelregistret hämtas från servern.
export const PRODUCTS = seedCatalog.articles || [];

function normalizeRuntimeProduct(product = {}) {
  const images = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
  const merged = images.length ? images : (product.image ? [product.image] : []);
  const primaryImageIndex = Math.min(
    Math.max(Number(product.primaryImageIndex) || 0, 0),
    Math.max(merged.length - 1, 0)
  );
  const cardImageIndex = Math.min(
    Math.max(Number(product.cardImageIndex ?? primaryImageIndex) || 0, 0),
    Math.max(merged.length - 1, 0)
  );
  return {
    ...product,
    ...((isThinDecal3D(product)||supportsFlagSign3D(product)||product?.previewType==='profession'||String(product?.articleNumber)==='02030')?{flowType:"form",directAddToCart:false}:{}),
    ...(isAreaPriced(product) ? {flowType:"form",directAddToCart:false,fields:{...product.fields,areaDimensions:true,quantity:true}} : {}),
    images: merged,
    primaryImageIndex,
    cardImageIndex,
    image: merged[primaryImageIndex] || product.image || '',
    cardImage: merged[cardImageIndex] || merged[primaryImageIndex] || product.image || '',
    imageFit: product.imageFit || 'contain',
    imageScale: Number(product.imageScale) || 100,
  };
}

export function getRuntimeProducts() {
  return (getCatalogArticles() || []).map(normalizeRuntimeProduct);
}

export function getStorefrontProducts() {
  return storefrontCatalog({articles:getRuntimeProducts()}).articles;
}

export const NAME_BADGE_PRODUCTS = PRODUCTS.filter(
  (product) => product.categoryId === 'namnbrickor' && product.isImplemented
);

export function getProductsByCategory(categoryId) {
  return getStorefrontProducts().filter(
    (product) =>
      product.categoryId === categoryId &&
      product.isImplemented &&
      !product.adminArchived
  );
}

export function getProductById(productId) {
  return getRuntimeProducts().find(
    (product) => String(product.id) === String(productId)
  );
}

export function getProductFlowType(product) {
  if (!product || product.previewType === 'profession' || isAreaPriced(product) || (isThinDecal3D(product)||supportsFlagSign3D(product))) return 'form';
  return product.flowType || 'form';
}

export function getProductPreviewType(product) {
  if (!product) return 'image';
  return product.previewType || 'image';
}

export function isDirectFlowProduct(product) {
  return getProductFlowType(product) === 'direct';
}

export function isFormFlowProduct(product) {
  return getProductFlowType(product) === 'form';
}

export function isProfessionFlowProduct(product) {
  return getProductFlowType(product) === 'profession';
}
