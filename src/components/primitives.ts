import { css, html, nothing } from 'lit';
import type { PropertyValues } from 'lit';
import { TpElement } from '../foundation/element.js';
import { createId } from '../foundation/id.js';
import { activateLabeledControl, elevatedProperty } from './shared.js';

export { TpAlert } from './alert/index.js';
export type { AlertSeverity, AlertAnnouncement } from './alert/index.js';

export { TpAspectRatio } from './aspect-ratio/index.js';

export { TpAttachment, TpAttachmentGroup } from './attachment/index.js';
export type { AttachmentStatus } from './attachment/index.js';

export class TpBadge extends TpElement {
  static tagName = 'tp-badge';
  static override properties = {
    ...TpElement.properties,
    variant: { type: String, reflect: true },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: inline-flex;
      }

      .badge {
        display: inline-flex;
        align-items: center;
      }
    `,
  ];
  variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link' = 'default';
  protected override render() {
    return this.renderPart(
      'badge',
      Object.freeze({ variant: this.variant, disabled: this.disabled }),
      {
        tag: 'span',
        properties: { class: 'badge', part: 'badge' },
        content: html`<slot></slot>`,
      },
    );
  }
}

export { TpBubble, TpBubbleGroup } from './bubble/index.js';

export { TpButtonGroup, TpButtonGroupText } from './button-group/index.js';

export class TpCard extends TpElement {
  static tagName = 'tp-card';
  static override properties = {
    ...TpElement.properties,
    elevated: elevatedProperty,
    borders: { type: String, reflect: true },
    sectionColors: { type: String, attribute: 'section-colors', reflect: true },
    size: { type: String, reflect: true },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
      }

      .card {
        display: grid;
        overflow: clip;
      }

      .card > header {
        display: grid;
      }

      .card > .content {
        display: grid;
      }

      .card > footer {
        display: flex;
        align-items: center;
        justify-content: flex-end;
      }

      .card > [hidden] {
        display: none;
      }

      slot {
        display: contents;
      }

      slot::slotted(p),
      slot::slotted(h2) {
        margin: 0;
      }
    `,
  ];
  elevated = false;
  borders: 'on' | 'off' = 'on';
  sectionColors: 'on' | 'off' = 'on';
  size: 'sm' | 'default' = 'default';
  #syncSection = (event: Event): void => {
    const slot = event.currentTarget as HTMLSlotElement;
    const wrapper = slot.parentElement;
    if (
      wrapper &&
      wrapper.matches('[part="card-title"], [part="card-description"], [part="card-action"]')
    )
      wrapper.hidden = !slot
        .assignedNodes({ flatten: true })
        .some((node) => node.nodeType !== Node.TEXT_NODE || Boolean(node.textContent?.trim()));
    const section = (event.currentTarget as HTMLSlotElement).parentElement?.closest(
      'header, footer',
    );
    if (!section) return;
    (section as HTMLElement).hidden = ![...section.querySelectorAll('slot')].some((slot) =>
      slot
        .assignedNodes({ flatten: true })
        .some((node) => node.nodeType !== Node.TEXT_NODE || Boolean(node.textContent?.trim())),
    );
  };
  protected override render() {
    return html`<article class="card" part="card">
      <header part="card-header" hidden>
        <div part="card-title" hidden>
          <slot name="header" @slotchange=${this.#syncSection}></slot>
        </div>
        <div part="card-description" hidden>
          <slot name="description" @slotchange=${this.#syncSection}></slot>
        </div>
        <div part="card-action" hidden>
          <slot name="action" @slotchange=${this.#syncSection}></slot>
        </div>
      </header>
      <div class="content" part="card-content"><slot></slot></div>
      <footer part="card-footer" hidden>
        <slot name="footer" @slotchange=${this.#syncSection}></slot>
      </footer>
    </article>`;
  }
}

export { TpEmptyState } from './empty-state/index.js';

export class TpKeyHint extends TpElement {
  static tagName = 'tp-key-hint';
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: inline-flex;
      }

      kbd {
        display: inline-flex;
        align-items: center;
        min-width: var(--tp-icon-size-lg);
        min-height: var(--tp-icon-size-lg);
        justify-content: center;
      }
    `,
  ];
  protected override render() {
    return html`<kbd part="root"><slot></slot></kbd>`;
  }
}

export class TpLabel extends TpElement {
  static tagName = 'tp-label';
  static override properties = {
    ...TpElement.properties,
    for: { type: String },
    optional: { type: Boolean },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: inline-flex;
        font-weight: var(--tp-font-semibold);
      }

      .optional {
        margin-inline-start: var(--tp-space-1);
      }
    `,
  ];
  for = '';
  optional = false;
  #control: HTMLElement | null = null;
  #controlRequired = false;
  #controlObserver: MutationObserver | null = null;
  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('click', this.#activateControl);
  }
  override disconnectedCallback(): void {
    this.removeEventListener('click', this.#activateControl);
    this.#controlObserver?.disconnect();
    super.disconnectedCallback();
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.#associate();
  }
  #associate(): void {
    if (!this.id) this.id = createId('tp-label');
    const root = this.getRootNode();
    const control = this.for
      ? root instanceof Document || root instanceof ShadowRoot
        ? root.getElementById(this.for)
        : document.getElementById(this.for)
      : this.querySelector<HTMLElement>(':scope > :not([slot])');
    if (!control) {
      if (this.#control && 'setFieldAssociation' in this.#control) {
        (
          this.#control as HTMLElement & {
            setFieldAssociation: (association: { label: string }) => void;
          }
        ).setFieldAssociation({ label: '' });
      }
      this.#controlObserver?.disconnect();
      this.#control = null;
      this.#syncRequired();
      return;
    }
    if (control !== this.#control) {
      if (this.#control && 'setFieldAssociation' in this.#control) {
        (
          this.#control as HTMLElement & {
            setFieldAssociation: (association: { label: string }) => void;
          }
        ).setFieldAssociation({ label: '' });
      }
      this.#controlObserver?.disconnect();
      this.#control = control;
      this.#controlObserver = new MutationObserver(this.#syncRequired);
      this.#controlObserver.observe(control, { attributes: true, attributeFilter: ['required'] });
    }
    this.#syncRequired();
    if ('setFieldAssociation' in control) {
      (
        control as HTMLElement & {
          setFieldAssociation: (association: { label: string }) => void;
        }
      ).setFieldAssociation({ label: this.textContent?.trim() ?? '' });
    } else {
      control.setAttribute('aria-labelledby', this.id);
    }
    if ('label' in control && !('setFieldAssociation' in control)) {
      (control as HTMLElement & { label: string }).label = this.textContent?.trim() ?? '';
    }
  }
  #syncRequired = (): void => {
    const required = Boolean(
      this.#control &&
      (this.#control.hasAttribute('required') ||
        ('required' in this.#control &&
          (this.#control as HTMLElement & { required: boolean }).required)),
    );
    if (required !== this.#controlRequired) {
      this.#controlRequired = required;
      this.requestUpdate();
    }
  };
  #activateControl = (event: Event): void => {
    if (this.#control && event.composedPath().includes(this.#control)) return;
    activateLabeledControl(this.#control);
  };
  protected override render() {
    return html`<label part="root">
      <slot @slotchange=${this.#associate}></slot>
      ${
        this.optional && !this.#controlRequired
          ? html`<span class="optional" part="optional-indicator">Optional</span>`
          : nothing
      }
    </label>`;
  }
}

export { TpListItem, TpListItemGroup, TpListItemSeparator } from './list-item/index.js';

export { TpMarker } from './marker/index.js';

export class TpMessage extends TpElement {
  static tagName = 'tp-message';
  static override properties = {
    ...TpElement.properties,
    author: { type: String },
    timestamp: { type: String },
    pending: { type: Boolean, reflect: true },
    failed: { type: Boolean, reflect: true },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
      }

      .message {
        display: grid;
        grid-template-columns: auto 1fr;
      }

      .meta {
        display: flex;
        align-items: baseline;
      }

      .time {
        color: var(--tp-muted-foreground);
        font-size: var(--tp-text-xs);
      }

      .status {
        color: var(--tp-muted-foreground);
        font-size: var(--tp-text-xs);
      }
    `,
  ];
  author = '';
  timestamp = '';
  pending = false;
  failed = false;
  protected override render() {
    const author = this.author ? html`<strong part="author">${this.author}</strong>` : nothing;
    const timestamp = this.timestamp
      ? html`<time class="time" part="timestamp">${this.timestamp}</time>`
      : nothing;
    const status =
      this.pending || this.failed
        ? html`
            <div class="status" part="status" role=${this.failed ? 'alert' : 'status'}>
              ${this.failed ? 'Failed to send' : 'Sending'}
            </div>
          `
        : nothing;
    return html`<article class="message" part="root">
      <slot name="avatar"></slot>
      <div part="body">
        <header class="meta" part="meta">${author}${timestamp}</header>
        <div part="content"><slot></slot></div>
        ${status}
      </div>
    </article>`;
  }
}

export { TpSkeleton, primitiveMotionRoles } from './skeleton/index.js';

export {
  TpTable,
  TpTableHeader,
  TpTableBody,
  TpTableFooter,
  TpTableRow,
  TpTableHead,
  TpTableCell,
  TpTableCaption,
} from './table/index.js';
