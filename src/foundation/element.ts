import { LitElement, css } from 'lit';
import type { CSSResultGroup, PropertyDeclarations, PropertyValues } from 'lit';
import type { Direction, Orientation } from './types.js';
import { cancelMotions, type MotionPolicy } from './motion.js';

import { PresentationController } from '../presentation/controller.js';
import type { PresentationFamily } from '../presentation/family.js';
import type { PartPresentation } from '../presentation/resolver.js';
import { renderPart } from './part.js';
import type { ComponentPartContract, PartRenderOptions, PartState } from './part.js';

export class TpElement extends LitElement {
  /** This element's presentation family: its definition, bindings and default appearance. */
  static presentation: PresentationFamily | undefined;
  /** Other families whose parts this element also presents. */
  static presentationFamilies: readonly PresentationFamily[] | undefined;
  static properties: PropertyDeclarations = {
    disabled: { type: Boolean, reflect: true },
    readOnly: { type: Boolean, attribute: 'readonly', reflect: true },
    invalid: { type: Boolean, reflect: true },
    required: { type: Boolean, reflect: true },
    orientation: { type: String, reflect: true },
    motionPolicy: { type: String, attribute: 'motion-policy', reflect: true },
    partPresentation: { attribute: false },
    partContracts: { attribute: false },
  };

  static styles: CSSResultGroup = css`
    :host {
      box-sizing: border-box;
      color: var(--tp-foreground);
      font-family: var(--tp-font-sans);
      font-size: var(--tp-text-base);
      font-weight: var(--tp-font-normal);
      line-height: var(--tp-leading-normal);
      letter-spacing: var(--tp-tracking-normal);
    }

    :host([motion-policy='reduce']) {
      --tp-motion-scale: 0;
      --tp-motion-play-state: paused;
    }

    :host([motion-policy='normal']) {
      --tp-motion-scale: 1;
      --tp-motion-play-state: running;
    }

    :host([hidden]) {
      display: none !important;
    }

    :host([disabled]),
    :host([data-disabled]) {
      cursor: not-allowed;
      opacity: var(--tp-opacity-disabled);
    }

    *,
    *::before,
    *::after {
      box-sizing: inherit;
    }

    [part~='focusable']:focus-visible {
      outline: var(--tp-ring-width) var(--tp-border-style) var(--tp-ring);
      outline-offset: var(--tp-ring-offset);
    }

    :host([invalid]) [part~='focusable'],
    :host([data-invalid]) [part~='focusable'] {
      border-color: var(--tp-destructive);
    }

    :host([invalid]) [part~='focusable']:focus-visible,
    :host([data-invalid]) [part~='focusable']:focus-visible {
      outline-color: var(--tp-destructive);
    }

    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
      border: 0;
    }
  `;

  disabled = false;
  readOnly = false;
  invalid = false;
  required = false;
  orientation: Orientation = 'horizontal';
  motionPolicy: MotionPolicy = 'inherit';
  partPresentation: PartPresentation = {};
  partContracts: Record<string, ComponentPartContract> = {};
  renderPart(name: string, state: PartState, options: PartRenderOptions = {}): unknown {
    return renderPart(name, state, this.partContracts[name], options);
  }
  readonly presentationController = new PresentationController(this);
  protected override createRenderRoot(): HTMLElement | DocumentFragment {
    return this.presentationController.createRenderRoot();
  }
  /** Captured before Lit reflects defaults; compounds use this to preserve authored attributes. */
  readonly authoredAttributes = new Set<string>();
  override connectedCallback(): void {
    if (!this.hasUpdated)
      for (const attribute of this.attributes) this.authoredAttributes.add(attribute.name);
    super.connectedCallback();
  }

  get direction(): Direction {
    const own = this.getAttribute('dir');
    if (own === 'rtl' || own === 'ltr') return own;
    return this.ownerDocument.defaultView?.getComputedStyle(this).direction === 'rtl'
      ? 'rtl'
      : 'ltr';
  }

  override disconnectedCallback(): void {
    cancelMotions(this);
    super.disconnectedCallback();
  }

  protected emit<T>(type: string, detail: T, init: CustomEventInit<T> = {}): boolean {
    return this.dispatchEvent(
      new CustomEvent(type, {
        bubbles: true,
        composed: true,
        ...init,
        detail,
      }),
    );
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.toggleAttribute('data-disabled', this.disabled);
    this.toggleAttribute('data-readonly', this.readOnly);
    this.toggleAttribute('data-invalid', this.invalid);
    this.setAttribute('data-orientation', this.orientation);
  }
}
