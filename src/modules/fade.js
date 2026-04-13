/**
 * Animate an element's opacity using requestAnimationFrame.
 * Returns a cancel function.
 */
export function fadeTo(el, targetOpacity, duration, cb) {
  const from = parseFloat(el.style.opacity) || 0;
  let id = null;
  let startTs = null;

  function tick(ts) {
    if (!startTs) startTs = ts;
    const progress = Math.min((ts - startTs) / duration, 1);
    el.style.opacity = from + (targetOpacity - from) * progress;
    if (progress < 1) {
      id = requestAnimationFrame(tick);
    } else {
      el.style.opacity = targetOpacity;
      cb?.();
    }
  }

  id = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(id);
}
