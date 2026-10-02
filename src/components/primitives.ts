import { css, html, nothing } from 'lit';
import { setPartComposition } from '../presentation/controller.js';
import { joinedControlPresentation } from '../presentation/composition.js';
import type { PropertyValues } from 'lit';
import { TpElement } from '../foundation/element.js';
import { createId } from '../foundation/id.js';
import {
  prepareMotion,
  type MotionHandle,
  type MotionRoleDefinition,
} from '../foundation/motion.js';
import { activateLabeledControl, controlStyles, elevatedProperty } from './shared.js';

export const primitiveMotionRoles = {
  skeletonLoading: {
    name: 'loading',
    kind: 'ambient',
    phases: ['start', 'stop'],
    completion: 'non-blocking',
  },
} as const satisfies Record<string, MotionRoleDefinition>;

export class TpAlert extends TpElement {
  static tagName = 'tp-alert';
  static override properties = {
    ...TpElement.properties,
    severity: { type: String, reflect: true },
    title: { type: String },
    announcement: { type: String, reflect: true },
  };
  static override styles = [
    TpElement.styles,
    controlStyles,
    css`
      :host {
        display: block;
      }

      .alert {
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: start;
      }

      :host([severity='danger']) {
        --tp-alert-color: var(--tp-destructive);
      }

      :host([severity='warning']) {
        --tp-alert-color: var(--tp-warning);
      }

      :host([severity='success']) {
        --tp-alert-color: var(--tp-success);
      }
    `,
  ];
  severity: 'informational' | 'success' | 'warning' | 'danger' = 'informational';
  title = '';
  announcement: 'off' | 'polite' | 'assertive' = 'off';
  protected override render() {
    const title = this.title
      ? html`<div class="title" part="alert-title">${this.title}</div>`
      : nothing;
    return html`<div
      class="surface alert"
      part="alert"
      role=${this.announcement === 'assertive' ? 'alert' : this.announcement === 'polite' ? 'status' : nothing}
      aria-live=${this.announcement}
    >
      <span part="alert-mark"><slot name="icon"></slot></span>
      <div>
        ${title}
        <div part="alert-description"><slot></slot></div>
      </div>
      <span part="alert-action"><slot name="actions"></slot></span>
    </div>`;
  }
}

export class TpAspectRatio extends TpElement {
  static tagName = 'tp-aspect-ratio';
  static override properties = { ...TpElement.properties, ratio: { type: Number } };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
      }

      .box {
        position: relative;
        width: 100%;
        aspect-ratio: var(--tp-aspect-ratio, 1.7778);
        overflow: hidden;
      }

      ::slotted(*) {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    `,
  ];
  ratio = 16 / 9;
  protected override render() {
    return html`<div
      class="box"
      part="root"
      style=${`--tp-aspect-ratio:${Math.max(0.01, this.ratio)}`}
    >
      <slot></slot>
    </div>`;
  }
}

export class TpAttachment extends TpElement {
  static tagName = 'tp-attachment';
  static override properties = {
    ...TpElement.properties,
    filename: { type: String },
    href: { type: String },
    fileSize: { type: Number, attribute: 'file-size' },
    size: { type: String, reflect: true },
    status: { type: String, reflect: true },
    removable: { type: Boolean },
  };
  static override styles = [
    TpElement.styles,
    controlStyles,
    css`
      :host {
        display: block;
      }

      .attachment {
        display: flex;
        align-items: center;
      }

      :host([orientation='vertical']) .attachment {
        flex-direction: column;
        align-items: stretch;
      }

      .meta {
        min-width: 0;
        flex: 1;
      }

      .name {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    `,
  ];
  filename = '';
  href = '';
  fileSize = 0;
  size: 'xs' | 'sm' | 'default' = 'default';
  status: 'idle' | 'uploading' | 'processing' | 'error' | 'complete' = 'idle';
  removable = false;
  protected override render() {
    const name = this.href
      ? html`<a class="name" part="name" href=${this.href}>${this.filename}</a>`
      : html`<span class="name" part="name">${this.filename}</span>`;
    const size = this.fileSize
      ? html`<span class="size" part="size">${formatBytes(this.fileSize)}</span>`
      : nothing;
    const spinner =
      this.status === 'uploading' ? html`<tp-spinner part="spinner"></tp-spinner>` : nothing;
    const removeButton = this.removable
      ? html`
          <button
            class="control"
            part="remove focusable"
            type="button"
            aria-label=${`Remove ${this.filename}`}
            @click=${(event: Event) =>
              this.emit('tp-remove', { filename: this.filename, sourceEvent: event })}
          >
            ×
          </button>
        `
      : nothing;
    return html`<div class="surface attachment" part="root">
      <span part="attachment-media"><slot name="preview"></slot></span>
      <div class="meta" part="meta">${name}${size}<slot></slot></div>
      ${spinner}<span part="attachment-actions">${removeButton}<slot name="actions"></slot></span>
    </div>`;
  }
}
function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 ** 2).toFixed(1)} MB`;
}

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
    return html`<span class="badge" part="badge"><slot></slot></span>`;
  }
}

export class TpBubble extends TpElement {
  static tagName = 'tp-bubble';
  static override properties = {
    ...TpElement.properties,
    align: { type: String, reflect: true },
    variant: { type: String, reflect: true },
    reactionSide: { type: String, attribute: 'reaction-side', reflect: true },
    reactionsAlign: { type: String, attribute: 'reactions-align', reflect: true },
    label: { type: String },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
      }

      .bubble {
        display: flex;
        flex-direction: column;
        max-width: 75%;
        width: fit-content;
      }

      :host([align='end']) .bubble {
        margin-inline-start: auto;
      }

      [part='bubble-reactions'] {
        display: flex;
        justify-content: end;
      }
      :host([reactions-align='start']) [part='bubble-reactions'] {
        justify-content: start;
      }
      :host([reaction-side='block-start']) [part='bubble-reactions'] {
        order: -1;
      }
    `,
  ];
  align: 'start' | 'end' = 'start';
  reactionSide: 'block-start' | 'block-end' = 'block-end';
  reactionsAlign: 'start' | 'end' = 'end';
  variant: 'default' | 'secondary' | 'subdued' | 'tinted' | 'outline' | 'ghost' | 'destructive' =
    'secondary';
  label = 'Message';
  protected override render() {
    return html`<div class="bubble" part="bubble-root" aria-label=${this.label}>
      <div part="bubble-content"><slot></slot></div>
      <div part="bubble-reactions"><slot name="reactions"></slot></div>
    </div>`;
  }
}

export class TpButtonGroup extends TpElement {
  static tagName = 'tp-button-group';
  static override properties = {
    ...TpElement.properties,
    joined: { type: Boolean, reflect: true },
    label: { type: String },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: inline-flex;
        vertical-align: middle;
      }

      [part~='button-group'] {
        display: flex;
        align-items: stretch;
      }

      :host([orientation='vertical']) [part~='button-group'] {
        flex-direction: column;
      }

      ::slotted(tp-button:focus-within) {
        z-index: 1;
      }
    `,
  ];
  override orientation: 'horizontal' | 'vertical' = 'horizontal';
  joined = true;
  label = 'Actions';
  #members: TpElement[] = [];
  #sync = (): void => {
    const members = [...this.children].filter(
      (child): child is TpElement => child instanceof TpElement && child.localName === 'tp-button',
    );
    for (const member of this.#members)
      if (!members.includes(member)) setPartComposition(member, this);
    this.#members = members;
    members.forEach((member, index) =>
      setPartComposition(
        member,
        this,
        this.joined
          ? {
              button: {
                styleHook: joinedControlPresentation(index, members.length, this.orientation),
              },
            }
          : undefined,
      ),
    );
  };
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (changed.has('joined') || changed.has('orientation')) this.#sync();
  }
  override disconnectedCallback(): void {
    for (const member of this.#members) setPartComposition(member, this);
    super.disconnectedCallback();
  }
  protected override render() {
    return html`<div part="button-group" role="group" aria-label=${this.label}>
      <slot @slotchange=${this.#sync}></slot>
    </div>`;
  }
}

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

export class TpEmptyState extends TpElement {
  static tagName = 'tp-empty-state';
  static override properties = {
    ...TpElement.properties,
    title: { type: String },
    description: { type: String },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
      }

      .root {
        display: grid;
        justify-items: center;
        text-align: center;
      }

      .description {
        max-width: 36rem;
      }
    `,
  ];
  title = 'Nothing here';
  description = '';
  protected override render() {
    const description = this.description
      ? html`
          <p class="description" part="description">
            <slot name="description">${this.description}</slot>
          </p>
        `
      : nothing;
    return html`<section class="root" part="root">
      <slot name="icon"></slot>
      <h2 part="title"><slot name="title">${this.title}</slot></h2>
      ${description}
      <div part="actions"><slot name="actions"></slot></div>
    </section>`;
  }
}

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

export class TpListItem extends TpElement {
  static tagName = 'tp-list-item';
  static override properties = {
    ...TpElement.properties,
    selected: { type: Boolean, reflect: true },
    value: { type: String },
    description: { type: String },
    variant: { type: String, reflect: true },
    size: { type: String, reflect: true },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
      }

      .item {
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
      }

      .description {
        display: block;
      }

      [part='list-item-header'],
      [part='list-item-footer'] {
        grid-column: 1 / -1;
      }
      [part='list-item-media'] {
        align-self: start;
      }
      [hidden] {
        display: none;
      }
    `,
  ];
  selected = false;
  value = '';
  description = '';
  variant: 'ghost' | 'outline' | 'subdued' = 'ghost';
  size: 'xs' | 'sm' | 'default' = 'default';
  #region = (event: Event): void => {
    const slot = event.currentTarget as HTMLSlotElement;
    if (slot.parentElement)
      slot.parentElement.hidden = !slot
        .assignedNodes()
        .some((node) => node.nodeType !== Node.TEXT_NODE || Boolean(node.textContent?.trim()));
  };
  protected override render() {
    const description = this.description
      ? html`<span class="description" part="list-item-description">${this.description}</span>`
      : nothing;
    return html`<div
      class="item"
      part="list-item-root"
      role="group"
      aria-current=${this.selected ? 'true' : nothing}
    >
      <div part="list-item-header" hidden>
        <slot name="header" @slotchange=${this.#region}></slot>
      </div>
      <span part="list-item-media"><slot name="leading"></slot></span>
      <span part="list-item-content"
        ><span part="list-item-title"><slot></slot></span>${description}</span
      >
      <span part="list-item-actions"><slot name="trailing"></slot></span>
      <div part="list-item-footer" hidden>
        <slot name="footer" @slotchange=${this.#region}></slot>
      </div>
    </div>`;
  }
}

export class TpMarker extends TpElement {
  static tagName = 'tp-marker';
  static override properties = {
    ...TpElement.properties,
    tone: { type: String, reflect: true },
    label: { type: String },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: inline-flex;
      }

      :host([tone='accent']) {
        --tp-marker-color: var(--tp-accent);
      }

      :host([tone='danger']) {
        --tp-marker-color: var(--tp-destructive);
      }

      :host([tone='success']) {
        --tp-marker-color: var(--tp-success);
      }
    `,
  ];
  tone = 'neutral';
  label = '';
  protected override render() {
    return this.label ? html`<span class="visually-hidden">${this.label}</span>` : nothing;
  }
}

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

export class TpSkeleton extends TpElement {
  static tagName = 'tp-skeleton';
  static override properties = {
    ...TpElement.properties,
    label: { type: String },
    animated: { type: Boolean, reflect: true },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
        min-height: var(--tp-icon-size-sm);
        overflow: hidden;
      }

      :host([animated])::after {
        content: '';
        display: block;
        width: 45%;
        height: 100%;
        opacity: var(--tp-opacity-disabled);
        animation: shimmer 1.4s infinite;
        animation-play-state: var(--tp-motion-play-state, running);
      }

      :host([data-tp-motion-driven])::after {
        animation: none !important;
      }

      @keyframes shimmer {
        from {
          translate: -100% 0;
        }

        to {
          translate: 300% 0;
        }
      }
    `,
  ];
  label = 'Loading';
  animated = true;
  #loadingMotion: MotionHandle | null = null;
  override connectedCallback(): void {
    super.connectedCallback();
    void this.updateComplete.then(() => {
      if (this.isConnected && this.animated && !this.#loadingMotion) {
        this.#startLoadingMotion('start', null, 'loading');
      }
    });
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    const previous = changed.get('animated');
    if (previous === undefined || Boolean(previous) === this.animated) return;
    this.#startLoadingMotion(
      this.animated ? 'start' : 'stop',
      this.animated ? 'idle' : 'loading',
      this.animated ? 'loading' : 'idle',
    );
  }
  override disconnectedCallback(): void {
    this.#loadingMotion = null;
    super.disconnectedCallback();
  }
  #startLoadingMotion(
    phase: 'start' | 'stop',
    fromState: 'loading' | 'idle' | null,
    toState: 'loading' | 'idle',
  ): void {
    this.#loadingMotion = prepareMotion(this, this, primitiveMotionRoles.skeletonLoading, {
      phase,
      fromState,
      toState,
    });
    this.#loadingMotion.start();
  }
  protected override render() {
    return html`<span class="visually-hidden" role="status">${this.label}</span>`;
  }
}

export class TpTable extends TpElement {
  static tagName = 'tp-table';
  static override properties = { ...TpElement.properties, label: { type: String } };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
        overflow: auto;
      }

      .root {
        min-width: 100%;
      }

      ::slotted(table) {
        width: 100%;
        border-collapse: collapse;
      }
    `,
  ];
  label = 'Data table';
  #registrations: Array<() => void> = [];
  #observer = new MutationObserver(() => this.#registerParts());
  #registerParts = (): void => {
    for (const cleanup of this.#registrations.splice(0)) cleanup();
    const table = this.querySelector('table');
    if (!table) return;
    const parts: Record<string, string> = {
      table: 'table-table',
      caption: 'table-caption',
      thead: 'table-header',
      tbody: 'table-body',
      tfoot: 'table-footer',
      tr: 'table-row',
      th: 'table-column-header',
      td: 'table-cell',
    };
    for (const element of [
      table,
      ...table.querySelectorAll<HTMLElement>('caption, thead, tbody, tfoot, tr, th, td'),
    ]) {
      const part = parts[element.localName]!;
      this.#registrations.push(this.presentationController.registerPart(part, element));
    }
  };
  override connectedCallback(): void {
    super.connectedCallback();
    this.#observer.observe(this, { childList: true, subtree: true });
  }
  override disconnectedCallback(): void {
    this.#observer.disconnect();
    for (const cleanup of this.#registrations.splice(0)) cleanup();
    super.disconnectedCallback();
  }
  protected override render() {
    return html`<div class="root" part="table" role="region" aria-label=${this.label} tabindex="0">
      <slot @slotchange=${this.#registerParts}></slot>
    </div>`;
  }
}
