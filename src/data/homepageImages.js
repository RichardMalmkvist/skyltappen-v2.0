export const HOMEPAGE_IMAGE_SLOTS = [
  { key: 'hero', label: 'Headerbild', fallback: '/landing-background.jpg', alt: 'Skyltning i en sjukhuskorridor' },
  { key: 'detail', label: 'Bakgrundsbild – Små detaljer, stor tydlighet', fallback: '/door-photo-0603.webp', alt: 'Dörrskylt med whiteboard' },
  { key: 'proof', label: 'Bild – Korrektur och godkännande', fallback: '', alt: 'Ritning med skyltplaceringar' },
];
export function getHomepageImage(settings, key) {
  const slot = HOMEPAGE_IMAGE_SLOTS.find(item => item.key === key);
  const saved = settings?.[key];
  return { src: saved?.src || slot?.fallback || '', alt: saved?.alt || slot?.alt || '', position: saved?.position || '50% 50%' };
}


export const HOMEPAGE_DETAIL_CONTENT = {
  eyebrow: 'Tydlig information i varje rum',
  heading: 'Små detaljer.\nStor tydlighet.',
  body: 'Hitta dörrskyltar, rumsskyltar och\ndekaler för din verksamhet.',
  buttonLabel: 'Utforska sortimentet',
  buttonTarget: 'catalog',
};
export function getHomepageDetailContent(settings) {
  const content = settings?.detail?.content || {};
  return Object.fromEntries(Object.entries(HOMEPAGE_DETAIL_CONTENT).map(([key, fallback]) =>
    [key, typeof content[key] === 'string' ? content[key] : fallback]
  ));
}
