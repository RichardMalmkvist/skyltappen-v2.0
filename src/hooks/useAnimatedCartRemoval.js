import { useEffect, useRef, useState } from "react";

export default function useAnimatedCartRemoval(remove) {
  const pending = useRef(new Map());
  const removeRef = useRef(remove);
  const mounted = useRef(true);
  const [removing, setRemoving] = useState({});
  removeRef.current = remove;
  useEffect(() => {
    mounted.current = true;
    const tasks = pending.current;
    return () => {
      mounted.current = false;
      // A navigation during the short exit animation must still honour removal.
      [...tasks.values()].forEach(task => task.finish());
    };
  }, []);

  function removeAnimated(id, row) {
    if (pending.current.has(id)) return;
    if (!row?.animate || window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) { removeRef.current(id); return; }
    let animation;
    try {
      animation = row.animate([
        { height: `${row.getBoundingClientRect().height}px`, opacity: 1, overflow: "hidden" },
        { height: "0px", paddingTop: "0px", paddingBottom: "0px", borderBottomWidth: "0px", opacity: 0, overflow: "hidden" },
      ], { duration: 200, easing: "ease-out", fill: "forwards" });
    } catch { removeRef.current(id); return; }
    setRemoving(previous => ({ ...previous, [id]: true }));
    let finished = false;
    const task = { finish: () => {
      if (finished) return;
      finished = true;
      clearTimeout(task.timer);
      pending.current.delete(id);
      removeRef.current(id);
      if (mounted.current) setRemoving(previous => { const next = { ...previous }; delete next[id]; return next; });
      animation.cancel();
    }};
    pending.current.set(id, task);
    task.timer = setTimeout(task.finish, 250);
    animation.finished?.then(task.finish, task.finish);
  }

  return { removeAnimated, removing };
}
