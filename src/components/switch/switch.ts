import { css, html } from 'lit';
import type { PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import {
  prepareMotion,
  type MotionHandle,
  type MotionRoleDefinition,
} from '../../foundation/motion.js';
import { TpCheckbox } from '../checkbox/index.js';
import type { SwitchState } from './types.js';

export const switchMotionRoles = {
  track: { name: 'track', kind: 'state', phases: ['change'], completion: 'non-blocking' },
  thumb: { name: 'thumb', kind: 'state', phases: ['change'], completion: 'non-blocking' },
} as const satisfies Record<string, MotionRoleDefinition>;

/** Binary setting policy bound to the existing Checkbox Boolean/action/form owner. */
export class TpSwitch extends TpCheckbox {
  static tagName = 'tp-switch';
  static override properties = {
    ...TpCheckbox.properties,
    size: { type: String, reflect: true },
    // These Checkbox-only compatibility properties cannot alter Switch policy.
    indeterminate: { attribute: false, noAccessor: true },
    parent: { attribute: false, reflect: false },
    keepMounted: { attribute: false, reflect: false },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: inline-flex;
        align-items: center;
        gap: var(--tp-space-2);

        --_tp-switch-spacing: var(--tp-space-4);
        --_tp-switch-width: calc(var(--_tp-switch-spacing) * 2);
        --_tp-switch-height: calc(var(--_tp-switch-spacing) * 1.15);
        --_tp-switch-thumb: var(--_tp-switch-spacing);
      }

      :host([size='sm']) {
        --_tp-switch-spacing: var(--tp-space-3);
      }

      .root {
        position: relative;
        display: inline-flex;
        align-items: center;
        flex: none;
        container-type: inline-size;
        inline-size: var(--_tp-switch-width);
        block-size: var(--_tp-switch-height);
        box-sizing: border-box;
        padding: 0;
        cursor: pointer;
        outline: none;
      }

      .root::after {
        content: '';
        position: absolute;
        inset-inline: calc(-1 * var(--tp-space-3));
        inset-block: calc(-1 * var(--tp-space-2));
      }

      .thumb {
        display: flex;
        align-items: center;
        justify-content: center;
        flex: none;
        inline-size: var(--_tp-switch-thumb);
        block-size: var(--_tp-switch-thumb);
        pointer-events: none;
        transform: translateX(0);
      }

      .thumb[data-checked] {
        transform: translateX(calc(100cqi - 100%));
      }

      .root:dir(rtl) .thumb[data-checked] {
        transform: translateX(calc(100% - 100cqi));
      }

      .legacy-label[hidden] {
        display: none;
      }

      [data-tp-motion-driven] {
        transition: none !important;
      }
    `,
  ];
  size: 'sm' | 'default' = 'default';
  #motion: MotionHandle[] = [];
  #labelText = '';
  #labelObserver: MutationObserver | null = null;
  protected override get supportsIndeterminate(): boolean {
    return false;
  }
  protected override get supportsCheckboxGroup(): boolean {
    return false;
  }
  protected override get activatesOnEnter(): boolean {
    return true;
  }
  protected override get usesIndicatorPresence(): boolean {
    return false;
  }

  #syncLabel = (): void => {
    const text = [...this.childNodes]
      .filter((node) => node.nodeType !== 1 || !(node as Element).hasAttribute('slot'))
      .map((node) => node.textContent ?? '')
      .join(' ')
      .trim();
    if (text !== this.#labelText) {
      this.#labelText = text;
      this.requestUpdate();
    }
  };
  override connectedCallback(): void {
    super.connectedCallback();
    this.#syncLabel();
    const Observer = this.ownerDocument.defaultView?.MutationObserver;
    if (Observer) {
      this.#labelObserver = new Observer(this.#syncLabel);
      this.#labelObserver.observe(this, { childList: true, subtree: true, characterData: true });
    }
    this.requestUpdate();
  }
  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    if (!changed.has('checked') || changed.get('checked') === undefined) return;
    for (const handle of this.#motion) handle.cancel();
    const from = Boolean(changed.get('checked'));
    this.#motion = [
      prepareMotion(this, this.controlElement, switchMotionRoles.track, {
        phase: 'change',
        fromState: from,
        toState: this.checked,
      }),
      prepareMotion(
        this,
        this.renderRoot.querySelector<HTMLElement>('[part~="switch-thumb"]'),
        switchMotionRoles.thumb,
        { phase: 'change', fromState: from, toState: this.checked },
      ),
    ];
  }
  protected override render(): unknown {
    const state: SwitchState = Object.freeze({
      ...this.booleanControlState(),
      size: this.size,
      direction: this.direction,
    });
    const thumb = this.renderPart('switch-thumb', state, {
      tag: 'span',
      properties: {
        class: 'thumb',
        'aria-hidden': 'true',
        tabindex: -1,
        'data-checked': state.checked,
        'data-unchecked': !state.checked,
        'data-disabled': state.disabled,
        'data-readonly': state.readOnly,
        'data-read-only': state.readOnly,
        'data-required': state.required,
        'data-invalid': state.invalid,
        'data-valid': state.valid === true,
        'data-focused': state.focused,
        'data-focus-visible': state.focusVisible,
        'data-touched': state.touched,
        'data-dirty': state.dirty,
        'data-filled': state.filled,
        'data-size': state.size,
      },
    });
    return html`${this.renderBooleanControl(state, thumb, 'switch', 'switch', {
        'data-size': state.size,
        ...(this.#labelText ? { 'aria-label': this.#labelText } : {}),
      })}<tp-label
        class="legacy-label"
        .for=${this.booleanControlIdentifier}
        ?hidden=${!this.#labelText}
        @click=${() => this.activateFromLabel()}
        ><slot @slotchange=${this.#syncLabel}></slot
      ></tp-label>`;
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (changed.has('checked')) {
      for (const handle of this.#motion) handle.start();
      this.#motion = [];
    }
  }
  override disconnectedCallback(): void {
    this.#labelObserver?.disconnect();
    this.#labelObserver = null;
    for (const handle of this.#motion) handle.cancel();
    this.#motion = [];
    super.disconnectedCallback();
  }
}
