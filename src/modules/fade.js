/**
 * Animate an element's opacity.
 * Returns a cancel function.
 */
export function fadeTo(el, opacity, duration, cb) {
  const step = 16;
  const steps = Math.max(duration / step, 1);
  const start = parseFloat(el.style.opacity) || 0;
  const delta = (opacity - start) / steps;
  let i = 0;

  const id = setInterval(() => {
    i++;
    el.style.opacity = Math.min(Math.max(start + delta * i, 0), 1);
    if (i >= steps) {
      clearInterval(id);
      el.style.opacity = opacity;
      cb?.();
    }
  }, step);

  return () => clearInterval(id);
}
