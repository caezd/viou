import { defaults } from "../defaults.js";
import { fadeTo } from "../modules/fade.js";
import { buildContent, hasContent, stashTitle, restoreTitle } from "../modules/content.js";
import { computePosition } from "../modules/position.js";
import { bindEvents } from "../modules/events.js";
import { preloadAll, destroyCache } from "../modules/cache.js";

export class Viou {
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
