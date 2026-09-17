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
        display: inline-flex;
      }

      .root {
        display: inline-flex;
        align-items: center;
        gap: var(--tp-space-2);
        cursor: pointer;
      }

      .track {
        display: flex;
        width: var(--tp-control-height-md);
        height: var(--tp-icon-size-md);
        padding: calc(var(--tp-space-1) / 2);
        border-radius: var(--tp-radius-full);
        background: var(--tp-border);
        transition: background calc(var(--tp-duration-fast, 120ms) * var(--tp-motion-scale, 1));
      }

      .thumb {
        width: var(--tp-icon-size-sm);
        height: var(--tp-icon-size-sm);
        border-radius: var(--tp-radius-full);
        background: var(--tp-background);
        box-shadow: var(--tp-shadow-sm);
        transition: transform calc(var(--tp-duration-fast, 120ms) * var(--tp-motion-scale, 1));
      }

      .root[data-checked] .track {
        background: var(--tp-accent);
      }

      .root[data-checked] .thumb {
        transform: translateX(1rem);
      }

      :host-context([dir='rtl']) .root[data-checked] .thumb {
        transform: translateX(-1rem);
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
