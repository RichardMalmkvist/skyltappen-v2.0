let sequence = 0;

// Capture before React resets the form, so the visual copy contains the customer's text.
// This is presentation only; it never delays or changes the cart update.
export function prepareCartFlight(source) {
  if (!source?.isConnected || !source.animate || window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return null;
  const from = source.getBoundingClientRect();
  if (!from.width || !from.height || from.bottom <= 0 || from.right <= 0 || from.top >= window.innerHeight || from.left >= window.innerWidth) return null;
  let copy = source.cloneNode(true);
  const originals = [source, ...source.querySelectorAll("*")];
  const copies = [copy, ...copy.querySelectorAll("*")];
  const prefix = `jsf-flight-${++sequence}-`;
  const ids = new Map();
  copies.forEach(node => { if (node.id) { ids.set(node.id, prefix + node.id); node.id = prefix + node.id; } });
  copies.forEach((node, index) => {
    const computed = window.getComputedStyle(originals[index]);
    for (let i = 0; i < computed.length; i++) {
      const property = computed[i];
      node.style.setProperty(property, computed.getPropertyValue(property));
    }
    node.style.setProperty("animation", "none", "important");
    node.style.setProperty("transition", "none", "important");
    node.removeAttribute("autofocus");
    if (node.matches("input, textarea, select")) node.value = originals[index].value;
    // Keep SVG clip paths local to this copy; duplicate IDs must not affect the page.
    [...node.attributes].forEach(attribute => {
      if (attribute.name === "id") return;
      const value = attribute.value.replace(/#([\w:.-]+)/g, (match, id) => ids.has(id) ? `#${ids.get(id)}` : match);
      if (value !== attribute.value) node.setAttribute(attribute.name, value);
    });
  });
  copy.setAttribute("aria-hidden", "true");
  copy.setAttribute("inert", "");
  copy.classList.add("jsf-cart-flight");
  Object.assign(copy.style, {
    position: "fixed", left: `${from.left}px`, top: `${from.top}px`, right: "auto", bottom: "auto",
    width: `${from.width}px`, height: `${from.height}px`, minWidth: "0", minHeight: "0",
    maxWidth: "none", maxHeight: "none", margin: "0", boxSizing: "border-box",
    transform: "none", transformOrigin: "center", pointerEvents: "none", zIndex: "3200",
    overflow: "hidden", visibility: "hidden", opacity: "1", borderRadius: "4px",
  });
  if (["transparent", "rgba(0, 0, 0, 0)"].includes(copy.style.backgroundColor)) copy.style.backgroundColor = "#ffffff";
  let animation;
  let timer;
  let started = false;
  function cancel() {
    clearTimeout(timer);
    animation?.cancel();
    copy?.remove();
    copy = null;
  }
  // Also release a captured copy if navigation prevents the panel from mounting.
  timer = setTimeout(cancel, 1000);
  return {
    cancel,
    play(target) {
      if (!copy || started) return;
      started = true;
      const to = target?.getBoundingClientRect();
      if (!to?.width || !to.height || window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) { cancel(); return; }
      const dx = to.left + to.width / 2 - from.left - from.width / 2;
      const dy = to.top + to.height / 2 - from.top - from.height / 2;
      const scale = Math.min(.65, to.width / from.width, to.height / from.height);
      copy.style.visibility = "visible";
      document.body.appendChild(copy);
      try {
        animation = copy.animate([
          { transform: "translate(0, 0) scale(1)", opacity: .95 },
          { transform: `translate(${dx * .6}px, ${dy * .45}px) scale(${1 - (1 - scale) * .5})`, opacity: .9, offset: .5 },
          { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: 0 },
        ], { duration: 420, easing: "cubic-bezier(.22,.61,.36,1)", fill: "forwards" });
        animation.finished?.then(cancel, cancel);
        clearTimeout(timer);
        timer = setTimeout(cancel, 500);
      } catch { cancel(); }
    },
  };
}
