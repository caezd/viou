/**
 * Preload and cache images & icon elements used by viou tooltips.
 * - Images are preloaded via Image() and cached as ready-to-clone <img> nodes.
 * - Icons are cached as ready-to-clone <em> nodes.
 * - A MutationObserver watches for new [data-viou-image] / [data-viou-icon]
 *   elements added to the DOM after init.
 */

const imageCache = new Map();   // src → HTMLImageElement (loaded)
const iconCache  = new Map();   // className → HTMLElement  (<em>)

let observer = null;

/* ---------- Public API ---------- */

/**
 * Scan the document for viou targets, preload their assets,
 * and start observing for future additions.
 */
export function preloadAll(root = document) {
  scan(root);
  observe();
}

/**
 * Return a cloned, ready-to-use <img> from cache (or null).
 */
export function getCachedImage(src) {
  return imageCache.has(src) ? imageCache.get(src).cloneNode() : null;
}

/**
 * Return a cloned, ready-to-use <em> from cache (or null).
 */
export function getCachedIcon(className) {
  return iconCache.has(className) ? iconCache.get(className).cloneNode(true) : null;
}

/**
 * Stop observing & clear caches.
 */
export function destroyCache() {
  observer?.disconnect();
  observer = null;
  imageCache.clear();
  iconCache.clear();
}

/* ---------- Internals ---------- */

function scan(root) {
  const els = root.querySelectorAll("[data-viou-image], [data-viou-icon]");
  els.forEach((el) => {
    const src = el.getAttribute("data-viou-image");
    const icon = el.getAttribute("data-viou-icon");
    if (src) preloadImage(src);
    if (icon) cacheIcon(icon);
  });
}

function preloadImage(src) {
  if (imageCache.has(src)) return;
  const img = new Image();
  img.src = src;
  img.alt = "";
  imageCache.set(src, img); // usable immediately, browser fetches in bg
}

function cacheIcon(className) {
  if (iconCache.has(className)) return;
  const em = document.createElement("em");
  em.className = className;
  iconCache.set(className, em);
}

function observe() {
  if (observer) return;

  observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        // Check the node itself
        const src = node.getAttribute?.("data-viou-image");
        const icon = node.getAttribute?.("data-viou-icon");
        if (src) preloadImage(src);
        if (icon) cacheIcon(icon);
        // Check descendants
        if (node.querySelectorAll) scan(node);
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}
