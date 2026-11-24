const ARROW_FILES = {
  left: "/pil-vanster.svg",
  up: "/pil-upp.svg",
  down: "/pil-ner.svg",
  right: "/pil-hoger.svg",
};

const LABELS = {
  left: "Pil vänster",
  up: "Pil upp",
  down: "Pil ner",
  right: "Pil höger",
};

export const DEFAULT_HANGING_SIGN_ARROWS = Object.entries(ARROW_FILES).map(([direction, image]) => ({
  id: `arrow-${direction}`,
  direction,
  name: LABELS[direction],
  image,
  active: true,
  isDefault: true,
}));

export function getHangingSignArrows({ includeInactive = false } = {}) {
  return includeInactive ? DEFAULT_HANGING_SIGN_ARROWS : DEFAULT_HANGING_SIGN_ARROWS.filter((item) => item.active !== false);
}

// Pilarna är fasta systemfiler i /public och redigeras inte från Symboler-sidan.
export function saveHangingSignArrows() {}
export function resetHangingSignArrows() {}

export function getHangingSignArrowByDirection(direction) {
  return DEFAULT_HANGING_SIGN_ARROWS.find((item) => item.direction === direction) || null;
}
