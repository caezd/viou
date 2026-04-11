/**
 * Bind delegated mouse events on document.
 * Returns an unbind function for cleanup.
 */
export function bindEvents(selector, callbacks) {
  const { onEnter, onMove, onLeave, onClick } = callbacks;

  function match(target) {
    return target?.closest?.(selector) || null;
  }

  let current = null;

  function handleOver(e) {
    const el = match(e.target);
    if (!el || el === current) return;
    if (current) onLeave(current);
    current = el;
    onEnter(el, e);
  }

  function handleMove(e) {
    if (current) onMove(current, e);
  }

  function handleOut(e) {
    const el = match(e.target);
    if (!el || el !== current) return;
    if (el.contains(e.relatedTarget)) return;
    onLeave(el);
    current = null;
  }

  function handleClick(e) {
    const el = match(e.target);
    if (!el) return;
    onClick(el);
    current = null;
  }

  document.addEventListener("mouseover", handleOver, true);
  document.addEventListener("mousemove", handleMove, true);
  document.addEventListener("mouseout",  handleOut,  true);
  document.addEventListener("click",     handleClick, true);

  // Return cleanup
  return () => {
    document.removeEventListener("mouseover", handleOver, true);
    document.removeEventListener("mousemove", handleMove, true);
    document.removeEventListener("mouseout",  handleOut,  true);
    document.removeEventListener("click",     handleClick, true);
  };
}
