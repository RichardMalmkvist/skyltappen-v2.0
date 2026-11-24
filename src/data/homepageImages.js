export const HOMEPAGE_IMAGE_SLOTS = [
  { key: 'hero', label: 'Headerbild', fallback: '/landing-background.jpg', alt: 'Skyltning i en sjukhuskorridor' },
  { key: 'detail', label: 'Bakgrundsbild – Små detaljer, stor tydlighet', fallback: '/door-photo-0603.webp', alt: 'Dörrskylt med whiteboard' },
  { key: 'proof', label: 'Bild – Korrektur och godkännande', fallback: '', alt: 'Ritning med skyltplaceringar' },
];
export function getHomepageImage(settings, key) {
  return getHomepageSlide(settings, key, 0).image;
}

export function getHomepageSlideList(settings, key) {
  const saved = settings?.[key];
  return saved?.slides?.length ? saved.slides : [saved || {}];
}

export function getHomepageSlide(settings, key, index) {
  const slot = HOMEPAGE_IMAGE_SLOTS.find(item => item.key === key);
  const saved = getHomepageSlideList(settings, key)[index] || {};
  return {
    image: {src: saved.src || slot?.fallback || '', alt: saved.alt ?? slot?.alt ?? '', position: saved.position || '50% 50%'},
    hasCustomImage: Boolean(saved.src),
    content: getHomepageSlideContent(saved, key),
  };
}


export const HOMEPAGE_DETAIL_CONTENT = {
  eyebrow: 'Tydlig information i varje rum',
  heading: 'Små detaljer.\nStor tydlighet.',
  body: 'Hitta dörrskyltar, rumsskyltar och\ndekaler för din verksamhet.',
  buttonLabel: 'Utforska sortimentet',
  buttonTarget: 'catalog',
};
export function getHomepageDetailContent(settings) {
  return getHomepageSlide(settings, 'detail', 0).content;
}

const CONTENT = {
  hero: {
    eyebrow: 'Skyltar för vård och verksamhet',
    heading: 'Tydligt.\nTryggt.\nVälkomnande.',
    body: 'Beställ och anpassa skyltar för\ndin verksamhet.',
    buttonLabel: 'Se sortimentet', buttonTarget: 'catalog',
  },
  detail: HOMEPAGE_DETAIL_CONTENT,
  proof: {
    eyebrow: 'Korrektur och godkännande', heading: 'Du ser exakt vad\nsom tillverkas.',
    body: 'Granska text, utseende och placering i ett samlat korrektur. När allt stämmer godkänner du, och ordern skapas direkt från projektet.',
    buttonLabel: 'Så fungerar det', buttonTarget: 'details',
    detailsText: 'Skyltarna samlas i projektet, med eller utan placering på ritning. Du får ett korrektur att granska och kan lämna kommentarer innan du godkänner det.',
  },
};

export function getHomepageSlideContent(slide, slot) {
  const content = slide?.content || {};
  return Object.fromEntries(Object.entries(CONTENT[slot] || {}).map(([key, fallback]) =>
    [key, typeof content[key] === 'string' ? content[key] : fallback]
  ));
}
