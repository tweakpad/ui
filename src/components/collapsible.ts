import { css, html } from 'lit';
import type { PropertyValues } from 'lit';
import { TpElement } from '../foundation/element.js';
import { TpOpenChangeEvent } from '../foundation/events.js';
import { createId } from '../foundation/id.js';
import { PresenceController } from '../foundation/presence.js';
import { eventReason } from './shared.js';

export class TpCollapsible extends TpElement {
  static tagName = 'tp-collapsible';
  static override properties = {
    ...TpElement.properties,
    open: { type: Boolean, reflect: true },
    defaultOpen: { type: Boolean, attribute: 'default-open' },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
      }

      [part='collapsible-content'][hidden] {
        display: none;
      }
    `,
  ];
  open = false;
  defaultOpen = false;
  readonly #contentId = createId('tp-collapsible-content');
  readonly #presence = new PresenceController(this, {
    surface: () => this.renderRoot.querySelector('[part~="collapsible-content"]'),
  });
  protected override firstUpdated(): void {
    if (!this.hasAttribute('open') && this.defaultOpen) this.open = true;
    this.#presence.setPresent(this.open);
  }
  protected override render() {
    return html`<div part="collapsible">
      <button
        part="collapsible-trigger focusable"
        type="button"
        ?disabled=${this.disabled}
        aria-expanded=${String(this.open)}
        aria-controls=${this.#contentId}
        @click=${this.#toggle}
      >
        <slot name="trigger">Toggle</slot>
      </button>
      <div
        id=${this.#contentId}
        part="collapsible-content"
        data-state=${this.#presence.state}
        ?hidden=${!this.#presence.mounted}
      >
        <slot></slot>
      </div>
    </div>`;
  }
  #toggle(event: Event): void {
    const next = !this.open;
    if (this.dispatchEvent(new TpOpenChangeEvent(next, this.open, eventReason(event), event)))
      this.open = next;
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (changed.has('open')) this.#presence.setPresent(this.open);
  }
}
