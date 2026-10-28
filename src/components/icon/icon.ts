import { LitElement, css, html, nothing, svg } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { iconGraphicAttributes, iconPathAttributes } from '../../foundation/icon-graphic.js';
import type { IconDefinition } from '../../icons/types.js';
import { PresentationController } from '../../presentation/controller.js';
import type { PartPresentation } from '../../presentation/resolver.js';
import { iconPresentation } from '../../presentation/families/icon.js';

/**
 * One SVG mark drawn from a path definition, never from a name or a download. It is decorative
 * and hidden from assistive technology until `label` names it, and it strokes in the current text
 * color.
 */
export class TpIcon extends LitElement {
  static tagName = 'tp-icon';
  static presentation = iconPresentation;
  static properties = {
    icon: { attribute: false },
    label: { type: String },
    size: { type: String },
    partPresentation: { attribute: false },
  };

  static styles = css`
    :host {
      display: inline-flex;
      box-sizing: border-box;
      flex: none;
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

  /** The artwork: a definition imported from an icon module, such as `@tweakpad/ui/icons/plus`, or your own. */
  icon: IconDefinition | undefined;
  /** Names the icon when it is the only signal of its meaning; leave it empty when text beside it says the same. */
  label = '';
  /** A square extent as a CSS length; by default the icon size of the enclosing control, or the medium icon size. */
  size = '';
  /** Presentation contributions for this Icon's parts, merged over the theme's. */
  partPresentation: PartPresentation = {};
  /** Applies the theme's presentation and `partPresentation` to this Icon's parts. */
  readonly presentationController = new PresentationController(this);
  protected override createRenderRoot(): ShadowRoot {
    return this.presentationController.createRenderRoot();
  }
  #rootPartCleanup: (() => void) | undefined;
  override connectedCallback(): void {
    super.connectedCallback();
    this.#rootPartCleanup = this.presentationController.registerPart('icon', this);
  }
  override disconnectedCallback(): void {
    this.#rootPartCleanup?.();
    super.disconnectedCallback();
  }

  protected override willUpdate(): void {
    // Direct width/height rules on the host can still override this default extent.
    // A control step publishes --_tp-icon-extent so slotted Icons follow its size.
    this.style.setProperty(
      '--tp-icon-size',
      this.size || 'var(--_tp-icon-extent, var(--tp-icon-size-md))',
    );
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
    const graphic = iconGraphicAttributes(this.icon);
    return html`<svg
      part="icon-graphic"
      viewBox=${graphic.viewBox}
      fill=${graphic.fill}
      stroke=${graphic.stroke}
      stroke-linecap=${graphic['stroke-linecap']}
      stroke-linejoin=${graphic['stroke-linejoin']}
      aria-hidden="true"
      focusable="false"
    >
      ${this.icon.paths.map((path) => {
        const drawn = iconPathAttributes(path);
        return svg`<path
          d=${drawn.d}
          fill=${ifDefined(drawn.fill)}
          stroke=${ifDefined(drawn.stroke)}
          stroke-width=${ifDefined(drawn['stroke-width'])}
          fill-rule=${ifDefined(drawn['fill-rule'])}
          clip-rule=${ifDefined(drawn['clip-rule'])}
        ></path>`;
      })}
    </svg>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-icon': TpIcon;
  }
}
