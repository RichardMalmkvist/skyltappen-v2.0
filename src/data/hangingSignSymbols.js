import {hangingSymbolKind} from './hangingTargetRules';
const DEFAULT_HANGING_SIGN_SYMBOLS = [
  {
    id: "waiting-room",
    name: "Väntrum",
    image: "/symbol-vantrum.svg",
    active: true,
    isDefault: true,
  },
];

let symbols = DEFAULT_HANGING_SIGN_SYMBOLS;

export function getHangingSignSymbolKind(symbol = {}) {
  return hangingSymbolKind(symbol);
}

export function getHangingSignSymbols({ includeInactive = false } = {}) {
  return includeInactive ? symbols : symbols.filter((symbol) => symbol?.active !== false);
}

export function saveHangingSignSymbols(next) {
  symbols = Array.isArray(next) ? next : DEFAULT_HANGING_SIGN_SYMBOLS;
}

export function resetHangingSignSymbols() {
  symbols = DEFAULT_HANGING_SIGN_SYMBOLS;
}

export function getHangingSignSymbolById(symbolId) {
  return getHangingSignSymbols({ includeInactive: true }).find((symbol) => symbol.id === symbolId) || null;
}

// Keep the actual artwork with the order so later symbol edits cannot change it.
export function getHangingSignSymbolAssets(form = {}) {
  const ids = [...new Set([
    ...(Array.isArray(form.hangingSignSymbols) ? form.hangingSignSymbols : []),
    form.hangingSignSymbol,
    ...(form.hangingSignDifferentBackText ? [
      ...(Array.isArray(form.backHangingSignSymbols) ? form.backHangingSignSymbols : []),
      form.backHangingSignSymbol,
    ] : []),
  ].filter(id => id && id !== 'none'))];
  return ids.map(id => getHangingSignSymbolById(id)||(form.hangingSignSymbolAssets||[]).find(asset=>asset.id===id)).filter(Boolean).map(symbol => ({id:symbol.id,name:symbol.name,image:symbol.image,kind:hangingSymbolKind(symbol)}));
}

export { DEFAULT_HANGING_SIGN_SYMBOLS };
