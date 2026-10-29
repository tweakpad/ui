import { css, html, nothing } from 'lit';
import type { PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { alertPresentation } from '../../presentation/families/alert.js';

export type AlertSeverity = 'informational' | 'success' | 'warning' | 'danger';
export type AlertAnnouncement = 'off' | 'polite' | 'assertive';

/**
 * A persistent message in the flow of the page, with a title, a description, an optional mark and
 * actions. It never opens over content, traps focus or dismisses itself, and its words, not its
 * color, say what happened.
 *
 * @slot icon - A decorative mark before the text, usually an Icon.
 * @slot title - A rich title with emphasis, a link or a Badge; it replaces `title`.
 * @slot - The description.
 * @slot actions - Buttons for what to do next; the application owns their behavior.
 */
export class TpAlert extends TpElement {
  static tagName = 'tp-alert';
  static override presentation = alertPresentation;
  static override properties = {
    ...TpElement.properties,
    severity: { type: String, reflect: true },
    title: { type: String },
    announcement: { type: String, reflect: true },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
        min-inline-size: 0;
        container-type: inline-size;
        inline-size: 100%;
      }

      .alert {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        align-items: start;
        overflow-wrap: anywhere;
      }

      .alert:has(.mark:not([hidden])) {
        grid-template-columns: auto minmax(0, 1fr);
      }

      .alert:has(.actions:not([hidden])) {
        grid-template-columns: minmax(0, 1fr) auto;
      }

      .alert:has(.mark:not([hidden])):has(.actions:not([hidden])) {
        grid-template-columns: auto minmax(0, 1fr) auto;
      }

      .body {
        display: grid;
        min-inline-size: 0;
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        align-items: start;
      }

      /*
       * A narrow alert keeps its text readable: the actions leave their column and take a row of
       * their own under the text, lined up with it.
       */
      @container (width < 30rem) {
        .alert:has(.actions:not([hidden])) {
          grid-template-columns: minmax(0, 1fr);
        }

        .alert:has(.mark:not([hidden])):has(.actions:not([hidden])) {
          grid-template-columns: auto minmax(0, 1fr);
        }

        .actions {
          grid-column: -2 / -1;
        }
      }

      [hidden] {
        display: none;
      }
    `,
  ];
  /** The color of the message: `success`, `warning` and `danger` for those outcomes, `informational` for the rest. */
  severity: AlertSeverity = 'informational';
  /** The title as plain text, when the `title` slot is empty. */
  override title = '';
  /** Whether assistive technology announces the alert: `polite` for one that appears after an action, `assertive` only for urgent problems. */
  announcement: AlertAnnouncement = 'off';

  // Slots stay mounted so dynamic insertion/removal works without replacing composed controls.
  #syncRegions = (): void => {
    for (const slot of this.renderRoot.querySelectorAll<HTMLSlotElement>('slot')) {
      const populated = slot
        .assignedNodes({ flatten: true })
        .some(
          (node) =>
            node.nodeType === Node.ELEMENT_NODE ||
            (node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim())),
        );
      slot.parentElement!.hidden = !populated;
    }
  };

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.#syncRegions();
  }

  protected override render() {
    return html`<div
      class="alert"
      part="alert"
      role=${this.announcement === 'assertive' ? 'alert' : this.announcement === 'polite' ? 'status' : nothing}
      aria-live=${this.announcement}
    >
      <span class="mark" part="alert-mark" hidden>
        <slot name="icon" @slotchange=${this.#syncRegions}></slot>
      </span>
      <div class="body">
        <div class="title" part="alert-title" hidden>
          <slot name="title" @slotchange=${this.#syncRegions}>${this.title}</slot>
        </div>
        <div part="alert-description" hidden>
          <slot @slotchange=${this.#syncRegions}></slot>
        </div>
      </div>
      <span class="actions" part="alert-action" hidden>
        <slot name="actions" @slotchange=${this.#syncRegions}></slot>
      </span>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-alert': TpAlert;
  }
}
