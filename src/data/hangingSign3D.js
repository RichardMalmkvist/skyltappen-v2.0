import {getCatalogArticles} from './catalogStore';
import {hangingDimensions,hangingStackEntries,isHanging} from './hangingStack';

function supportsPanel(product) {
  if (!isHanging(product) || product.hangingSignTextOnly || product.vinylText) return false;
  const {width,height} = hangingDimensions(product);
  return [1000,1500].includes(width) && height >= 93 && height <= 260;
}

export function supportsHangingSign3D(product, form = {}) {
  if (!supportsPanel(product)) return false;
  if (!form.hangingStack?.items?.length) return true;
  return hangingStackEntries(product, form, getCatalogArticles(), {preferSaved:true}).every(entry => supportsPanel(entry.product));
}

export function hangingSign3DLayout(product, form) {
  const entries = hangingStackEntries(product, form, getCatalogArticles(), {preferSaved:true});
  const sizes = entries.map(entry => hangingDimensions(entry.product));
  const gapMm = Number(form.hangingStack?.gapMm ?? 10);
  const gap = Number.isFinite(gapMm) ? Math.max(0, Math.min(500, gapMm)) / 1000 : 0;
  const suspension = entries.length === 1 ? .08 : .12;
  const height = sizes.reduce((sum, size) => sum + size.height / 1000, 0) + gap * (entries.length - 1) + suspension;
  const width = Math.max(...sizes.map(size => size.width)) / 1000;
  const anchor = Math.min(...sizes.map(size => size.width)) / 1000 * .42;
  let top = height / 2 - suspension;
  const panels = entries.map(({product}, index) => {
    const size = sizes[index];
    const center = top - size.height / 2000;
    top -= size.height / 1000 + gap;
    return {product, size, center};
  });
  return {panels, width, height, anchor, gap, suspension};
}
