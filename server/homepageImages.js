const {HOMEPAGE_SLIDE_LIMIT, HOMEPAGE_IMAGE_TOTAL_LIMIT, HOMEPAGE_CONTENT_LIMITS} = require('../src/data/homepageSlideFields');

function normalizeHomepageImages(settings) {
  const slots = {};
  let totalImageLength = 0;

  function normalizeSlide(slide) {
    const src = typeof slide?.src === 'string' ? slide.src : '';
    if (src && (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(src) || src.length > 3000000)) {
      throw new Error('Startsidesbilden måste vara JPG, PNG eller WebP och högst 3 MB efter komprimering.');
    }
    totalImageLength += src.length;
    const normalized = {
      src, fileName: String(slide?.fileName || '').slice(0, 180),
      position: ['50% 50%', '25% 50%', '75% 50%', '50% 25%', '50% 75%'].includes(slide?.position) ? slide.position : '50% 50%',
    };
    if (typeof slide?.alt === 'string') normalized.alt = slide.alt.slice(0, 180);
    if (slide?.content && typeof slide.content === 'object') {
      normalized.content = Object.fromEntries(Object.entries(HOMEPAGE_CONTENT_LIMITS)
        .filter(([field]) => typeof slide.content[field] === 'string')
        .map(([field, limit]) => [field, slide.content[field].slice(0, limit)]));
    }
    return normalized;
  }

  for (const key of ['hero', 'detail', 'proof']) {
    const slot = settings?.[key];
    if (!slot || typeof slot !== 'object') continue;
    if (!Array.isArray(slot.slides) || !slot.slides.length) {
      slots[key] = normalizeSlide(slot);
      continue;
    }
    if (slot.slides.length > HOMEPAGE_SLIDE_LIMIT) throw new Error(`Använd högst ${HOMEPAGE_SLIDE_LIMIT} bilder per bildfält.`);
    slots[key] = {slides: slot.slides.map(normalizeSlide), autoplay: slot.autoplay === true};
  }
  if (totalImageLength > HOMEPAGE_IMAGE_TOTAL_LIMIT) throw new Error('Startsidesbilderna får tillsammans vara högst 12 MB efter komprimering.');
  return slots;
}

module.exports = {normalizeHomepageImages};
