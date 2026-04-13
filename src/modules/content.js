import { getCachedImage, getCachedIcon } from "./cache.js";

function makeDiv(className) {
  const d = document.createElement("div");
  d.className = className;
  return d;
}

/**
 * Read data-viou-* attributes and build tooltip inner DOM.
 * Uses preloaded/cached image and icon nodes when available.
 */
export function buildContent(el) {
  const title = el._viouTitle || el.getAttribute("data-viou") || el.getAttribute("title");
  const head  = el.getAttribute("data-viou-head");
  const image = el.getAttribute("data-viou-image");
  const icon  = el.getAttribute("data-viou-icon");
  const group = getComputedStyle(el).getPropertyValue("--group").trim() || null;

  const wrap = document.createElement("div");

  if (image) {
    const d = makeDiv("viou-image");
    const img = getCachedImage(image) || Object.assign(document.createElement("img"), { src: image, alt: "" });
    d.appendChild(img);
    wrap.appendChild(d);
  }

  if (icon) {
    const d = makeDiv("viou-icon");
    const em = getCachedIcon(icon) || Object.assign(document.createElement("em"), { className: icon });
    d.appendChild(em);
    wrap.appendChild(d);
  }

  if (head) {
    const d = makeDiv("viou-head");
    d.textContent = head;
    wrap.appendChild(d);
  }

  if (title) {
    const d = makeDiv("viou-text");
    d.textContent = title;
    wrap.appendChild(d);
  }

  if (group) wrap.style.setProperty("--group", group);

  return wrap;
}

/**
 * Check if an element has any viou-related attribute.
 */
export function hasContent(el) {
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
export function stashTitle(el) {
  const title = el.getAttribute("data-viou") || el.getAttribute("title");
  if (!title) return;
  el._viouTitle = title;
  if (el.hasAttribute("title")) el.setAttribute("title", "");
  if (el.hasAttribute("data-viou")) el.setAttribute("data-viou", "");
}

export function restoreTitle(el) {
  const original = el._viouTitle;
  if (!original) return;
  if (el.hasAttribute("data-viou")) {
    el.setAttribute("data-viou", original);
  } else {
    el.setAttribute("title", original);
  }
  delete el._viouTitle;
}
