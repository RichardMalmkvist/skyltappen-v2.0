import { useEffect, useRef } from "react";
import "../styles/catalogGroupMotion.css";

// Observe the live catalog so newly opened groups and future products work too.
export default function useCatalogCardMotion() {
  const root = useRef(null);
  useEffect(() => {
    const container = root.current;
    if (!container || !window.IntersectionObserver || !window.MutationObserver || !Element.prototype.animate) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const seen = new WeakSet();
    const pending = new Set();
    const animations = new Set();
    function reveal(card, delay = 0) {
      observer.unobserve(card);
      pending.delete(card);
      card.classList.remove("jsf-card-reveal-pending");
      if (reduced.matches || !card.isConnected || card.contains(document.activeElement)) return;
      const animation = card.animate([
        { opacity: 0, translate: "0 14px" },
        { opacity: 1, translate: "0 0" },
      ], { duration: 520, delay, easing: "cubic-bezier(.16,1,.3,1)", fill: "backwards" });
      animations.add(animation);
      animation.onfinish = animation.oncancel = () => animations.delete(animation);
    }
    const observer = new IntersectionObserver(entries => {
      let index = 0;
      for (const entry of entries) if (entry.isIntersecting) reveal(entry.target, Math.min(index++ * 55, 220));
    }, { threshold: 0.06 });
    function scan() {
      for (const card of pending) if (!container.contains(card)) {
        observer.unobserve(card);
        pending.delete(card);
        card.classList.remove("jsf-card-reveal-pending");
      }
      container.querySelectorAll(".jsf-calm-products-grid > .jsf-catalog-card").forEach(card => {
        if (seen.has(card)) return;
        seen.add(card);
        if (reduced.matches) return;
        pending.add(card);
        card.classList.add("jsf-card-reveal-pending");
        observer.observe(card);
      });
    }
    function stopMotion() {
      if (!reduced.matches) return;
      for (const card of [...pending]) reveal(card);
      for (const animation of [...animations]) animation.cancel();
    }
    function focusCard(event) {
      const card = event.target.closest(".jsf-catalog-card");
      if (card && pending.has(card)) reveal(card);
      // Keyboard focus should never wait for an entrance animation.
      if (card) card.getAnimations().forEach(animation => animation.cancel());
    }
    const mutations = new MutationObserver(scan);
    mutations.observe(container, { childList: true, subtree: true });
    container.addEventListener("focusin", focusCard);
    reduced.addEventListener("change", stopMotion);
    scan();
    return () => {
      mutations.disconnect();
      observer.disconnect();
      container.removeEventListener("focusin", focusCard);
      reduced.removeEventListener("change", stopMotion);
      for (const card of pending) card.classList.remove("jsf-card-reveal-pending");
      for (const animation of [...animations]) animation.cancel();
    };
  }, []);
  return root;
}
