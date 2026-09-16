import { LitElement, css, html, nothing, svg } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import type { IconDefinition } from '../icons/types.js';

/** Non-interactive SVG presentation for a consumer-supplied icon definition. */
export class TpIcon extends LitElement {
  static tagName = 'tp-icon';
  static properties = {
    icon: { attribute: false },
    label: { type: String },
    size: { type: String },
  };

  static styles = css`
    :host {
      display: inline-flex;
      box-sizing: border-box;
      inline-size: var(--tp-icon-size, 1em);
      block-size: var(--tp-icon-size, 1em);
      flex: none;
      color: inherit;
      pointer-events: none;
      vertical-align: middle;
    }

    :host([hidden]) {
      display: none;
    }

    :host([data-empty]) {
      display: none;
    }

    svg {
      display: block;
      inline-size: 100%;
      block-size: 100%;
      overflow: visible;
    }
  `;

  icon: IconDefinition | undefined;
  label = '';
  size = '1em';

  protected override willUpdate(): void {
    // Direct width/height rules on the host can still override this default extent.
    this.style.setProperty('--tp-icon-size', this.size || '1em');
    this.toggleAttribute('data-empty', !this.icon);
    if (this.icon && this.label.trim()) {
      this.setAttribute('role', 'img');
      this.setAttribute('aria-label', this.label.trim());
      this.removeAttribute('aria-hidden');
    } else {
      this.removeAttribute('role');
      this.removeAttribute('aria-label');
      this.setAttribute('aria-hidden', 'true');
    }
  }

  protected override render() {
    if (!this.icon) return nothing;
    return html`<svg
      part="graphic"
      viewBox=${this.icon.viewBox}
      fill="none"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      ${this.icon.paths.map(
        (path) =>
          svg`<path
            d=${path.d}
            fill=${ifDefined(path.fill)}
            stroke=${ifDefined(path.stroke)}
            stroke-width=${ifDefined(path.strokeWidth)}
            fill-rule=${ifDefined(path.fillRule)}
            clip-rule=${ifDefined(path.clipRule)}
          ></path>`,
      )}
    </svg>`;
  }
}
