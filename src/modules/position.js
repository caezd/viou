/**
 * Compute tooltip position based on mouse event and config.
 * Returns { left, top } in page coordinates.
 */
export function computePosition(e, tooltip, config) {
  const tw = tooltip.offsetWidth;
  const th = tooltip.offsetHeight;
  const { offset } = config;

  if (config.smartPosition) {
    return smartPosition(e, tw, th, offset);
  }
  return fallbackPosition(e, tw, th, offset);
}

/**
 * Smart: pick quadrant based on cursor's relative viewport position.
 */
function smartPosition(e, tw, th, offset) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const left = e.clientX > vw / 2
    ? e.pageX - tw - offset
    : e.pageX + offset;

  const top = e.clientY > vh / 2
    ? e.pageY - th - offset
    : e.pageY + offset;

  return { left, top };
}

/**
 * Default: bottom-right with overflow correction.
 */
function fallbackPosition(e, tw, th, offset) {
  const wr = window.scrollX + window.innerWidth;
  const wb = window.scrollY + window.innerHeight;

  let left = e.pageX + offset;
  let top  = e.pageY + offset;

  if (left + tw > wr) left = e.pageX - tw - offset;
  if (top + th > wb)  top  = e.pageY - th - offset;

  return { left, top };
}
