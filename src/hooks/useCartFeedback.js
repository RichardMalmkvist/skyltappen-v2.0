import { useEffect, useRef, useState } from "react";

// Keep independent confirmations when several different products are added quickly.
export default function useCartFeedback() {
  const [added, setAdded] = useState({});
  const timers = useRef(new Map());
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  function confirmAdded(id) {
    clearTimeout(timers.current.get(id));
    setAdded(previous => ({ ...previous, [id]: true }));
    timers.current.set(id, setTimeout(() => {
      setAdded(previous => { const next = { ...previous }; delete next[id]; return next; });
      timers.current.delete(id);
    }, 1800));
  }

  return { isAdded: id => Boolean(added[id]), confirmAdded };
}
