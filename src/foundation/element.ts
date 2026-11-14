import { LitElement, css, unsafeCSS } from 'lit';
import type { CSSResultGroup, PropertyDeclarations, PropertyValues } from 'lit';
import type { Direction, Orientation } from './types.js';
import { cancelMotions, type MotionPolicy } from './motion.js';
import { appearanceDefaultDeclarations, flatDeclarations, type Appearance } from './appearance.js';
import { densityDerivedDeclarations, type Density } from './density.js';
import { dispatchTpEvent } from './events.js';
import type { Diagnostic, DiagnosticSeverity } from './services.js';
import { visuallyHiddenRule } from './visually-hidden.js';

import { PresentationController } from '../presentation/controller.js';
import { nativeSelectionCss } from '../presentation/recipes/shared/native-selection.js';
import type { PresentationFamily } from '../presentation/family.js';
import type { PartPresentation } from '../presentation/resolver.js';
import { renderPart } from './part.js';
import type { ComponentPartContract, PartRenderOptions, PartState } from './part.js';

/** Shared element lifecycle and presentation, independent of layout property names. */
export class TpElementBase extends LitElement {
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
    density: { type: String, reflect: true },
    appearance: { type: String, reflect: true },
    partPresentation: { attribute: false },
    partContracts: { attribute: false },
  };

  static styles: CSSResultGroup = css`
    /* Typography inherits: the theme establishes the default tuple (font-sans, text-base,
       font-normal, leading-normal, tracking-normal) on :root, and a text-sm root such as
       Card, Dialog or Table passes its size to the components inside it. */
    :host {
      box-sizing: border-box;
      color: var(--tp-foreground);
    }

    ${unsafeCSS(nativeSelectionCss)}

    :host([motion-policy='reduce']) {
      --tp-motion-scale: 0;
      --tp-motion-play-state: paused;
    }

    :host([motion-policy='normal']) {
      --tp-motion-scale: 1;
      --tp-motion-play-state: running;
    }

    /* A density region on a library element, as the default stylesheet's document rules state it,
       so it also applies where that stylesheet does not reach (inside another shadow root). */
    :host([density='default']) {
      --tp-spacing: var(--_tp-spacing-default);
      --tp-type-scale: var(--_tp-type-scale-default);
    }

    :host([density='compact']) {
      --tp-spacing: var(--tp-spacing-compact);
      --tp-type-scale: var(--tp-type-scale-compact);
    }

    :host([density='default']),
    :host([density='compact']) {
      ${unsafeCSS(densityDerivedDeclarations())}
    }

    /* An appearance region on a library element, as the default stylesheet's document rules state
       it. */
    :host([appearance='flat']) {
      ${unsafeCSS(flatDeclarations())}
    }

    :host([appearance='default']) {
      ${unsafeCSS(appearanceDefaultDeclarations())}
    }

    :host([hidden]) {
      display: none !important;
    }

    :host([disabled]),
    :host([data-disabled]) {
      cursor: not-allowed;
      opacity: var(--tp-opacity-disabled);
    }

    /* Custom cursor (Foundation cc-native-lease): while a cursor hides the host pointer, every
       library part yields its own pointer to it; a native zone resets the switch for its subtree.
       Hosts are light-DOM elements and take the cursor's document rule instead. */
    @container style(--tp-cursor-hidden: 1) {
      * {
        cursor: none !important;
      }
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

    ${unsafeCSS(visuallyHiddenRule('.visually-hidden'))}
  `;

  /** Takes the element out of interaction: its actions do nothing and it shows the disabled appearance. */
  disabled = false;
  /** Keeps the element readable and focusable but refuses changes to its value. */
  readOnly = false;
  invalid = false;
  required = false;
  orientation: Orientation = 'horizontal';
  motionPolicy: MotionPolicy = 'inherit';
  /**
   * The density of this element and everything inside it: `compact` tightens spacing, control
   * heights and icon sizes; `default` restores the theme's own inside a compact region. Unset, the
   * element follows the enclosing region.
   */
  density: Density | undefined;
  /**
   * The appearance of this element and everything inside it: `flat` removes the edges of
   * components and panels and separates them by fill; `default` restores the bordered look inside
   * a flat region. Unset, the element follows the enclosing region.
   */
  appearance: Appearance | undefined;
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

  override disconnectedCallback(): void {
    cancelMotions(this);
    super.disconnectedCallback();
  }

  protected emit<T>(type: string, detail: T, init: CustomEventInit<T> = {}): boolean {
    return dispatchTpEvent(this, type, detail, init);
  }

  #diagnostics: Set<string> | undefined;
  /**
   * Reports a development diagnostic as a bubbling `tp-diagnostic` event with
   * `{ code, message, severity }`. `once` reports a code a single time per instance; `defer`
   * dispatches after the current task so a render that discovered the problem completes first.
   */
  protected diagnose(
    code: string,
    message: string,
    options: {
      severity?: DiagnosticSeverity;
      once?: boolean;
      defer?: boolean;
      context?: unknown;
    } = {},
  ): void {
    if (options.once) {
      this.#diagnostics ??= new Set();
      const key = `${code}\n${message}`;
      if (this.#diagnostics.has(key)) return;
      this.#diagnostics.add(key);
    }
    const detail: Diagnostic = { code, message, severity: options.severity ?? 'warning' };
    if (options.context !== undefined) detail.context = options.context;
    if (options.defer) queueMicrotask(() => this.emit('tp-diagnostic', detail));
    else this.emit('tp-diagnostic', detail);
  }

  #committedUpdateQueued = false;
  /**
   * Requests a render for state that only exists once a render committed (layout measurement,
   * mounted renderers). It runs after the current update cycle instead of inside it.
   */
  protected requestCommittedUpdate(): void {
    if (this.#committedUpdateQueued) return;
    this.#committedUpdateQueued = true;
    queueMicrotask(() => {
      this.#committedUpdateQueued = false;
      if (this.isConnected) this.requestUpdate();
    });
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.toggleAttribute('data-disabled', this.disabled);
    this.toggleAttribute('data-readonly', this.readOnly);
    this.toggleAttribute('data-invalid', this.invalid);
    if (this.getAttribute('data-orientation') !== this.orientation)
      this.setAttribute('data-orientation', this.orientation);
  }
}

/** Standard component base with resolved writing direction. */
export class TpElement extends TpElementBase {
  get direction(): Direction {
    const own = this.getAttribute('dir');
    if (own === 'rtl' || own === 'ltr') return own;
    return this.ownerDocument.defaultView?.getComputedStyle(this).direction === 'rtl'
      ? 'rtl'
      : 'ltr';
  }
}
