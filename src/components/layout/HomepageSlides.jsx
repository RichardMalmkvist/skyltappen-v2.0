import {useEffect, useState} from 'react';
import {getHomepageSlide, getHomepageSlideList} from '../../data/homepageImages';

export default function HomepageSlides({settings, slot, label, children}) {
  const count = getHomepageSlideList(settings, slot).length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches || false);
  const [visible, setVisible] = useState(() => !document.hidden);
  const autoplay = count > 1 && settings?.[slot]?.autoplay && !reduceMotion;
  const activeIndex = index % count;

  useEffect(() => {
    if (count < 2) return;
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setReduceMotion(query?.matches || false);
    const updateVisibility = () => setVisible(!document.hidden);
    updateMotion();
    updateVisibility();
    query?.addEventListener?.('change', updateMotion);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => {
      query?.removeEventListener?.('change', updateMotion);
      document.removeEventListener('visibilitychange', updateVisibility);
    };
  }, [count]);

  useEffect(() => {
    if (!autoplay || paused || interacting || focused || !visible) return;
    const timer = window.setTimeout(() => setIndex((activeIndex + 1) % count), 7000);
    return () => window.clearTimeout(timer);
  }, [autoplay, paused, interacting, focused, visible, activeIndex, count]);

  const sectionProps = count > 1 ? {
    onMouseEnter: () => setInteracting(true), onMouseLeave: () => setInteracting(false),
    onFocusCapture: () => setFocused(true),
    onBlurCapture: event => {if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);},
  } : {};
  const controls = count > 1 && <div className="jsf-home-slide-controls" role="group" aria-label={label}>
    <button type="button" aria-label="Föregående bild" onClick={() => setIndex((activeIndex + count - 1) % count)}>←</button>
    <span>{activeIndex + 1} / {count}</span>
    <button type="button" aria-label="Nästa bild" onClick={() => setIndex((activeIndex + 1) % count)}>→</button>
    {autoplay && <button type="button" aria-label={paused ? 'Starta automatiskt bildbyte' : 'Pausa automatiskt bildbyte'}
      onClick={() => setPaused(value => !value)}>{paused ? 'Starta' : 'Pausa'}</button>}
  </div>;
  return children({...getHomepageSlide(settings, slot, activeIndex), sectionProps, controls, activeIndex});
}
