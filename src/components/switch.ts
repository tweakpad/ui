import { css, html } from 'lit';
import type { PropertyValues } from 'lit';
import { TpElement } from '../foundation/element.js';
import {
  prepareMotion,
  type MotionHandle,
  type MotionRoleDefinition,
} from '../foundation/motion.js';
import { TpCheckbox } from './checkbox.js';

export const switchMotionRoles = {
  track: {
    name: 'track',
    kind: 'state',
    phases: ['change'],
    completion: 'non-blocking',
  },
  thumb: {
    name: 'thumb',
    kind: 'state',
    phases: ['change'],
    completion: 'non-blocking',
  },
} as const satisfies Record<string, MotionRoleDefinition>;

export class TpSwitch extends TpCheckbox {
  static tagName = 'tp-switch';
  static override properties = {
    ...TpCheckbox.properties,
    size: { type: String, reflect: true },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        --_tp-switch-width: var(--tp-control-height-md);
        --_tp-switch-height: var(--tp-icon-size-md);
        --_tp-switch-thumb: var(--tp-icon-size-sm);
        --_tp-switch-padding: calc(var(--tp-space-1) / 2);

        display: inline-flex;
      }

      :host([size='sm']) {
        --_tp-switch-width: var(--tp-control-height-sm);
        --_tp-switch-height: var(--tp-icon-size-sm);
        --_tp-switch-thumb: calc(var(--tp-icon-size-sm) - var(--tp-space-1));
      }

      .root {
        display: inline-flex;
        align-items: center;
        cursor: pointer;
      }

      .track {
        display: flex;
        width: var(--_tp-switch-width);
        height: var(--_tp-switch-height);
        padding: var(--_tp-switch-padding);
        border-radius: var(--tp-radius-full);
        background: var(--tp-border);
        transition: background calc(var(--tp-duration-fast) * var(--tp-motion-scale))
          var(--tp-easing-standard);
      }

      .thumb {
        position: relative;
        inset-inline-start: 0;
        width: var(--_tp-switch-thumb);
        height: var(--_tp-switch-thumb);
        flex: none;
        transition: inset-inline-start calc(var(--tp-duration-fast) * var(--tp-motion-scale))
          var(--tp-easing-standard);
      }

      .root[data-checked] .track {
        background: var(--tp-accent);
      }

      .root[data-checked] .thumb {
        inset-inline-start: calc(
          var(--_tp-switch-width) - var(--_tp-switch-thumb) - 2 * var(--_tp-switch-padding)
        );
      }

      .root input:focus-visible + .track {
        outline: var(--tp-ring-width) var(--tp-border-style) var(--tp-ring);
        outline-offset: var(--tp-ring-offset);
      }

      :host([invalid]) input:focus-visible + .track {
        outline-color: var(--tp-destructive);
      }

      [data-tp-motion-driven] {
        transition: none !important;
      }
    `,
  ];
  size: 'sm' | 'default' = 'default';
  #motion: MotionHandle[] = [];
  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    if (!changed.has('checked') || changed.get('checked') === undefined) return;
    const from = Boolean(changed.get('checked'));
    this.#motion = [
      prepareMotion(
        this,
        this.renderRoot.querySelector<HTMLElement>('.track'),
        switchMotionRoles.track,
        {
          phase: 'change',
          fromState: from,
          toState: this.checked,
        },
      ),
      prepareMotion(
        this,
        this.renderRoot.querySelector<HTMLElement>('.thumb'),
        switchMotionRoles.thumb,
        {
          phase: 'change',
          fromState: from,
          toState: this.checked,
        },
      ),
    ];
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (changed.has('checked')) {
      for (const handle of this.#motion) handle.start();
      this.#motion = [];
    }
  }
  protected override render() {
    return html`<label class="root" part="switch" ?data-checked=${this.checked}>
      <input
        class="visually-hidden"
        part="focusable"
        type="checkbox"
        role="switch"
        .checked=${this.checked}
        ?disabled=${this.disabled}
        ?required=${this.required}
        aria-checked=${String(this.checked)}
        @change=${this.handleChange}
      />
      <span class="track" part="switch-track" aria-hidden="true"
        ><span class="thumb" part="switch-thumb"></span></span
      ><span part="label"><slot></slot></span>
    </label>`;
  }
}
