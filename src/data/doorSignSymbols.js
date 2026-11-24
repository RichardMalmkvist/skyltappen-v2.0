import { getHangingSignSymbolById } from "./hangingSignSymbols";

let symbols = [];

export function getDoorSignSymbols({ includeInactive = false } = {}) {
  return includeInactive ? symbols : symbols.filter(symbol => symbol.active !== false);
}

export function saveDoorSignSymbols(next) {
  symbols = Array.isArray(next) ? next : [];
}

export function getDoorSignSymbolById(id) {
  if (!id) return null;
  // Preserve symbols already selected on signs before the libraries were split.
  return getDoorSignSymbols({includeInactive:true}).find(symbol => symbol.id === id) || getHangingSignSymbolById(id);
}
