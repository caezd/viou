const defaults = {
  selector: "[data-viou], [data-viou-head], [data-viou-image], [data-viou-icon]",
  followsCursor: true,
  delay: 0,
  fadeSpeed: 250,
  offset: 16,
  smartPosition: true,
  onShow: null,
  onHide: null,
};

/**
 * Animate an element's opacity.
 * Returns a cancel function.
 */
function fadeTo(el, opacity, duration, cb) {
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
function preloadAll(root = document) {
  scan(root);
  observe();
}

/**
 * Return a cloned, ready-to-use <img> from cache (or null).
 */
function getCachedImage(src) {
  return imageCache.has(src) ? imageCache.get(src).cloneNode() : null;
}

/**
 * Return a cloned, ready-to-use <em> from cache (or null).
 */
function getCachedIcon(className) {
  return iconCache.has(className) ? iconCache.get(className).cloneNode(true) : null;
}

/**
 * Stop observing & clear caches.
 */
function destroyCache() {
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

/**
 * Read data-viou-* attributes and build tooltip inner DOM.
 * Uses preloaded/cached image and icon nodes when available.
 */
function buildContent(el) {
  const title = el._viouTitle || el.getAttribute("data-viou") || el.getAttribute("title");
  const head  = el.getAttribute("data-viou-head");
  const image = el.getAttribute("data-viou-image");
  const icon  = el.getAttribute("data-viou-icon");
  const group = getComputedStyle(el).getPropertyValue("--group")?.trim() || null;

  const wrap = document.createElement("div");

  if (image) {
    const d = document.createElement("div");
    d.className = "viou-image";
    const img = getCachedImage(image) || Object.assign(document.createElement("img"), { src: image, alt: "" });
    d.appendChild(img);
    wrap.appendChild(d);
  }

  if (icon) {
    const d = document.createElement("div");
    d.className = "viou-image";
    const em = getCachedIcon(icon) || Object.assign(document.createElement("em"), { className: icon });
    d.appendChild(em);
    wrap.appendChild(d);
  }

  if (head) {
    const d = document.createElement("div");
    d.className = "viou-head";
    d.textContent = head;
    wrap.appendChild(d);
  }

  if (title) {
    const d = document.createElement("div");
    d.className = "viou-text";
    d.textContent = title;
    wrap.appendChild(d);
  }

  if (group) wrap.style.setProperty("--group", group);

  return wrap;
}

/**
 * Check if an element has any viou-related attribute.
 */
function hasContent(el) {
  return !!(
    el.getAttribute("data-viou") ||
    el.getAttribute("title") ||
    el.getAttribute("data-viou-head") ||
    el.getAttribute("data-viou-image") ||
    el.getAttribute("data-viou-icon")
  );
}

/**
 * Stash the title text to prevent native tooltip,
 * restore it on hide.
 */
function stashTitle(el) {
  const title = el.getAttribute("data-viou") || el.getAttribute("title");
  if (!title) return;
  el._viouTitle = title;
  if (el.hasAttribute("title")) el.setAttribute("title", "");
  if (el.hasAttribute("data-viou")) el.setAttribute("data-viou", "");
}

function restoreTitle(el) {
  const original = el._viouTitle;
  if (!original) return;
  if (el.hasAttribute("data-viou")) {
    el.setAttribute("data-viou", original);
  } else {
    el.setAttribute("title", original);
  }
  delete el._viouTitle;
}

/**
 * Compute tooltip position based on mouse event and config.
 * Returns { left, top } in page coordinates.
 */
function computePosition(e, tooltip, config) {
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

/**
 * Bind delegated mouse events on document.
 * Returns an unbind function for cleanup.
 */
function bindEvents(selector, callbacks) {
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

class Viou {
  constructor(options = {}) {
    this.config = { ...defaults, ...options };
    this.tooltip = null;
    this._delayTimer = null;
    this._cancelFade = null;
    this._unbindEvents = null;

    this._createTooltip();
    preloadAll();
    this._unbindEvents = bindEvents(this.config.selector, {
      onEnter: (el, e) => this._show(el, e),
      onMove:  (el, e) => {
        if (this.config.followsCursor) this._applyPosition(e);
      },
      onLeave: (el) => this._hide(el),
      onClick: (el) => this._hide(el),
    });
  }

  /* ---------- DOM ---------- */

  _createTooltip() {
    let el = document.getElementById("viou");
    if (el) { this.tooltip = el; return; }

    el = document.createElement("div");
    el.id = "viou";
    Object.assign(el.style, { position: "absolute", display: "none", zIndex: 9999, opacity: 0 });
    document.body.appendChild(el);
    this.tooltip = el;
  }

  /* ---------- Show / Hide ---------- */

  _show(el, event) {
    if (!hasContent(el)) return;

    stashTitle(el);

    this.tooltip.innerHTML = "";
    this.tooltip.appendChild(buildContent(el));
    Object.assign(this.tooltip.style, { opacity: "0", display: "block" });

    this._delayTimer = setTimeout(() => {
      this._cancelFade?.();
      this._cancelFade = fadeTo(this.tooltip, 1, this.config.fadeSpeed);
    }, this.config.delay);

    this._applyPosition(event);
    this.config.onShow?.(el, this.tooltip);
  }

  _hide(el) {
    clearTimeout(this._delayTimer);
    restoreTitle(el);

    this._cancelFade?.();
    this._cancelFade = fadeTo(this.tooltip, 0, this.config.fadeSpeed, () => {
      this.tooltip.style.display = "none";
    });

    this.config.onHide?.(el, this.tooltip);
  }

  _applyPosition(e) {
    const { left, top } = computePosition(e, this.tooltip, this.config);
    this.tooltip.style.left = left + "px";
    this.tooltip.style.top  = top + "px";
  }

  /* ---------- Public API ---------- */

  destroy() {
    this._unbindEvents?.();
    this._cancelFade?.();
    clearTimeout(this._delayTimer);
    destroyCache();
    this.tooltip.remove();
    this.tooltip = null;
  }

  setOptions(opts = {}) {
    Object.assign(this.config, opts);
  }
}

export { Viou as default };
//# sourceMappingURL=viou.esm.js.map
