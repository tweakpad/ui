import { css, html, nothing, type PropertyValues } from 'lit';
import { observeSlots, slotOccupied } from '../shared/slots.js';
import { TpElement } from '../../foundation/element.js';
import { componentHandlingPrevented } from '../../foundation/part.js';
import { xIcon } from '../../icons/x.js';
import { attachmentPresentation } from '../../presentation/families/attachment.js';
import { fillLayerStyles } from '../../presentation/motion.js';
import { TpSpinner } from '../spinner/spinner.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';
import { TpButton } from '../button/button.js';

export type AttachmentStatus = 'idle' | 'uploading' | 'processing' | 'error' | 'complete';
/** File presentation only. Application code owns upload, retry, removal and navigation. */
export class TpAttachment extends TpElement {
  static tagName = 'tp-attachment';
  /** Library elements this element renders; defining it defines them too. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpSpinner, TpButton];
  }
  static override presentation = attachmentPresentation;
  static override properties = {
    ...TpElement.properties,
    filename: { type: String },
    href: { type: String },
    target: { type: String },
    fileSize: { type: Number, attribute: 'file-size' },
    description: { type: String },
    errorMessage: { type: String, attribute: 'error-message' },
    size: { type: String, reflect: true },
    status: { type: String, reflect: true },
    mediaTreatment: { type: String, attribute: 'media-treatment', reflect: true },
    removable: { type: Boolean },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
        min-inline-size: 0;
        max-inline-size: 100%;
      }

      ${fillLayerStyles('.attachment')}

      .attachment {
        position: relative;
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        min-inline-size: 0;
        max-inline-size: 100%;
      }

      .media {
        display: flex;
        align-items: center;
        justify-content: center;
        aspect-ratio: 1;
        flex: none;
        overflow: hidden;
      }

      .content {
        flex: 1;
        min-inline-size: 0;
        max-inline-size: 100%;
      }

      .title,
      .description {
        display: block;
        min-inline-size: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .actions {
        position: relative;
        z-index: 2;
        display: flex;
        flex: none;
        align-items: center;
      }

      .attachment[data-status='error'] .description {
        white-space: normal;
        overflow-wrap: anywhere;
      }

      .trigger,
      ::slotted([slot='trigger']) {
        position: absolute;
        inset: 0;
        z-index: 1;
      }

      ::slotted(img) {
        inline-size: 100%;
        block-size: 100%;
        object-fit: cover;
      }

      :host([orientation='vertical']) .attachment {
        flex-direction: column;
        align-items: stretch;
      }

      :host([orientation='vertical']) .media {
        inline-size: 100%;
      }

      :host([orientation='vertical']) .attachment[data-media] .actions {
        position: absolute;
        inset-block-start: var(--tp-space-3);
        inset-inline-end: var(--tp-space-3);
      }

      [hidden] {
        display: none !important;
      }
    `,
  ];
  filename = '';
  href = '';
  target = '';
  fileSize = 0;
  description = '';
  errorMessage = '';
  size: 'xs' | 'sm' | 'default' = 'default';
  status: AttachmentStatus = 'idle';
  mediaTreatment: 'mark' | 'image' = 'mark';
  removable = false;
  #releaseSlots: (() => void) | undefined;
  #delegates = new Map<Element, { part: string; release: () => void }>();
  #sync = (): void => {
    this.requestUpdate();
  };
  protected override render() {
    const busy = this.status === 'uploading' || this.status === 'processing';
    const hasMedia = slotOccupied(this, 'media') || slotOccupied(this, 'preview');
    const hasActions = this.removable || slotOccupied(this, 'actions');
    const hasContent =
      !!this.filename ||
      !!this.description ||
      !!this.errorMessage ||
      this.fileSize > 0 ||
      busy ||
      slotOccupied(this, 'title') ||
      slotOccupied(this, 'description') ||
      [...this.childNodes].some((node) =>
        node.nodeType === Node.TEXT_NODE
          ? !!node.textContent?.trim()
          : node instanceof Element && !node.getAttribute('slot'),
      );
    const hasTrigger = !!this.href || slotOccupied(this, 'trigger');
    const state = {
      status: this.status,
      size: this.size,
      orientation: this.orientation,
      disabled: this.disabled,
    };
    const description =
      this.status === 'error'
        ? this.errorMessage || this.description || 'This attachment could not be processed.'
        : this.description ||
          [
            this.fileSize > 0 ? formatBytes(this.fileSize) : '',
            busy ? (this.status === 'uploading' ? 'Uploading…' : 'Processing…') : '',
          ]
            .filter(Boolean)
            .join(' · ');
    const part = (name: string, options: Parameters<TpElement['renderPart']>[2]) =>
      this.renderPart(name, state, options);
    return part('attachment-root', {
      properties: {
        class: 'attachment',
        'data-status': this.status,
        'data-trigger': hasTrigger,
        'data-media': hasMedia || busy,
        'data-content': hasContent,
        'aria-busy': busy ? 'true' : undefined,
      },
      content: html`
        ${part('attachment-media', { properties: { class: 'media', hidden: !hasMedia && !busy, 'data-treatment': this.mediaTreatment }, content: html`${busy && !hasMedia ? html`<tp-spinner size="sm" .label=${this.status === 'uploading' ? 'Uploading attachment' : 'Processing attachment'}></tp-spinner>` : html`<slot name="media" @slotchange=${this.#sync}><slot name="preview" @slotchange=${this.#sync}></slot></slot>`}` })}
        ${part('attachment-content', {
          properties: { class: 'content', hidden: !hasContent },
          content: html` ${part('attachment-title', { tag: 'span', properties: { class: 'title' }, content: html`<slot name="title" @slotchange=${this.#sync}>${this.filename}</slot>` })}
            ${part('attachment-description', { tag: 'span', properties: { class: 'description', hidden: !description && !slotOccupied(this, 'description'), role: 'status', 'aria-live': 'polite' }, content: html`<slot name="description" @slotchange=${this.#sync}>${description}</slot>` })}
            <slot></slot>`,
        })}
        ${part('attachment-actions', {
          properties: { class: 'actions', hidden: !hasActions },
          content: html` ${
              this.removable
                ? part('attachment-action', {
                    tag: 'tp-button',
                    properties: {
                      '.variant': 'ghost',
                      '.size': 'icon-xs',
                      '.icon': xIcon,
                      '.disabled': this.disabled,
                      '.ariaLabel': `Remove ${this.filename || 'attachment'}`,
                      '@click': (event: Event) => {
                        if (
                          !event.defaultPrevented &&
                          !componentHandlingPrevented(event) &&
                          !this.disabled
                        )
                          this.emit('tp-remove', { filename: this.filename, sourceEvent: event });
                      },
                    },
                  })
                : nothing
            }
            <slot name="actions" @slotchange=${this.#sync}></slot>`,
        })}
        <slot name="trigger" @slotchange=${this.#sync}
          >${this.href ? part('attachment-trigger', { tag: 'tp-button', properties: { class: 'trigger', '.href': this.href, '.target': this.target, '.variant': 'ghost', '.disabled': this.disabled, '.ariaLabel': `Open ${this.filename || 'attachment'}` } }) : nothing}</slot
        >
      `,
    });
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    const current = new Set<Element>();
    for (const child of this.children)
      if (child.slot === 'trigger' || child.slot === 'actions') {
        current.add(child);
        const part = child.slot === 'trigger' ? 'attachment-trigger' : 'attachment-action';
        if (this.#delegates.get(child)?.part !== part) {
          this.#delegates.get(child)?.release();
          this.#delegates.set(child, {
            part,
            release: this.presentationController.registerPart(part, child as HTMLElement),
          });
        }
      }
    for (const [child, { release }] of this.#delegates)
      if (!current.has(child)) {
        release();
        this.#delegates.delete(child);
      }
  }
  override connectedCallback(): void {
    super.connectedCallback();
    this.#releaseSlots = observeSlots(this, this.#sync, { characterData: true });
    this.requestUpdate();
  }
  override disconnectedCallback(): void {
    this.#releaseSlots?.();
    for (const { release } of this.#delegates.values()) release();
    this.#delegates.clear();
    super.disconnectedCallback();
  }
}
function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(
    units.length - 1,
    Math.floor(Math.log(Math.max(value, 1)) / Math.log(1024)),
  );
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: index ? 1 : 0 }).format(value / 1024 ** index)} ${units[index]}`;
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-attachment': TpAttachment;
  }
}
