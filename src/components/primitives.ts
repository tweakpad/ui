import { css, html, nothing } from 'lit';
import type { PropertyValues } from 'lit';
import { TpElement } from '../foundation/element.js';
import { createId } from '../foundation/id.js';
import {
  prepareMotion,
  type MotionHandle,
  type MotionRoleDefinition,
} from '../foundation/motion.js';
import { activateLabeledControl, controlStyles } from './shared.js';

export const primitiveMotionRoles = {
  cardInteraction: {
    name: 'interaction',
    kind: 'state',
    phases: ['change'],
    completion: 'non-blocking',
  },
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
    dismissible: { type: Boolean },
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
        gap: var(--tp-space-3);
        align-items: start;
        border-inline-start: var(--tp-border-width-strong) var(--tp-border-style)
          var(--tp-alert-color, var(--tp-primary));
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

      .title {
        font-weight: var(--tp-font-bold);
      }
    `,
  ];
  severity: 'info' | 'success' | 'warning' | 'danger' = 'info';
  title = '';
  dismissible = false;
  protected override render() {
    const title = this.title ? html`<div class="title" part="title">${this.title}</div>` : nothing;
    const closeButton = this.dismissible
      ? html`
          <button
            class="control"
            part="close focusable"
            type="button"
            aria-label="Dismiss"
            @click=${() => this.remove()}
          >
            ×
          </button>
        `
      : nothing;
    return html`<div
      class="surface alert"
      part="root"
      role=${this.severity === 'danger' ? 'alert' : 'status'}
    >
      <span part="icon"><slot name="icon"></slot></span>
      <div part="content">${title}<slot></slot></div>
      ${closeButton}
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
    size: { type: Number },
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
        gap: var(--tp-space-3);
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

      .size {
        color: var(--tp-muted-foreground);
        font-size: var(--tp-text-sm);
      }
    `,
  ];
  filename = '';
  href = '';
  size = 0;
  status: 'ready' | 'uploading' | 'error' = 'ready';
  removable = false;
  protected override render() {
    const name = this.href
      ? html`<a class="name" part="name" href=${this.href}>${this.filename}</a>`
      : html`<span class="name" part="name">${this.filename}</span>`;
    const size = this.size
      ? html`<span class="size" part="size">${formatBytes(this.size)}</span>`
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
      <span part="preview"><slot name="preview">📎</slot></span>
      <div class="meta" part="meta">${name}${size}<slot></slot></div>
      ${spinner}${removeButton}
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
        gap: var(--tp-space-1);
        padding: var(--tp-space-1) var(--tp-space-2);
        border-radius: var(--tp-radius-full);
        font-size: var(--tp-text-xs);
        font-weight: var(--tp-font-semibold);
        background: var(--tp-card);
        border: var(--tp-border-width) var(--tp-border-style) var(--tp-border);
      }

      :host([variant='accent']) .badge {
        background: var(--tp-accent);
        color: var(--tp-accent-foreground);
        border-color: transparent;
      }
    `,
  ];
  variant = 'neutral';
  protected override render() {
    return html`<span class="badge" part="root"><slot></slot></span>`;
  }
}

export class TpBubble extends TpElement {
  static tagName = 'tp-bubble';
  static override properties = {
    ...TpElement.properties,
    side: { type: String, reflect: true },
    label: { type: String },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
      }

      .bubble {
        max-width: 75%;
        width: fit-content;
        border-radius: var(--tp-radius-md);
        padding: var(--tp-space-3);
        background: var(--tp-card);
      }

      :host([side='end']) .bubble {
        margin-inline-start: auto;
        background: var(--tp-accent);
        color: var(--tp-accent-foreground);
      }
    `,
  ];
  side: 'start' | 'end' = 'start';
  label = 'Message';
  protected override render() {
    return html`<div class="bubble" part="root" aria-label=${this.label}><slot></slot></div>`;
  }
}

export class TpButtonGroup extends TpElement {
  static tagName = 'tp-button-group';
  static override properties = { ...TpElement.properties, label: { type: String } };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: inline-flex;
      }

      [part='root'] {
        display: flex;
      }

      :host([orientation='vertical']) [part='root'] {
        flex-direction: column;
      }

      ::slotted(*) {
        border-radius: 0 !important;
      }

      ::slotted(:first-child) {
        border-start-start-radius: var(--tp-radius-sm) !important;
        border-end-start-radius: var(--tp-radius-sm) !important;
      }

      ::slotted(:last-child) {
        border-start-end-radius: var(--tp-radius-sm) !important;
        border-end-end-radius: var(--tp-radius-sm) !important;
      }
    `,
  ];
  label = 'Actions';
  protected override render() {
    return html`<div part="root" role="group" aria-label=${this.label}><slot></slot></div>`;
  }
}

export class TpCard extends TpElement {
  static tagName = 'tp-card';
  static override properties = {
    ...TpElement.properties,
    interactive: { type: Boolean, reflect: true },
  };
  static override styles = [
    TpElement.styles,
    controlStyles,
    css`
      :host {
        display: block;
      }

      .card {
        display: grid;
        gap: var(--tp-space-3);
      }

      :host([interactive]) .card {
        cursor: pointer;
        transition:
          translate calc(var(--tp-duration-fast, 120ms) * var(--tp-motion-scale, 1)),
          box-shadow calc(var(--tp-duration-fast, 120ms) * var(--tp-motion-scale, 1));
      }

      :host([interactive]) .card:hover {
        translate: 0 -2px;
      }

      .card[data-tp-motion-driven] {
        transition: none !important;
      }
    `,
  ];
  interactive = false;
  #interactionMotion: MotionHandle | null = null;
  #setInteraction(active: boolean, input: 'pointer' | 'focus'): void {
    if (!this.interactive) return;
    this.#interactionMotion = prepareMotion(
      this,
      this.renderRoot.querySelector<HTMLElement>('.card'),
      primitiveMotionRoles.cardInteraction,
      {
        phase: 'change',
        fromState: !active,
        toState: active,
        context: { input },
      },
    );
    this.#interactionMotion.start();
  }
  protected override render() {
    return html`<article
      class="surface card"
      part="root"
      tabindex=${this.interactive ? '0' : nothing}
      @pointerenter=${() => this.#setInteraction(true, 'pointer')}
      @pointerleave=${() => this.#setInteraction(false, 'pointer')}
      @focusin=${() => this.#setInteraction(true, 'focus')}
      @focusout=${() => this.#setInteraction(false, 'focus')}
    >
      <header part="header"><slot name="header"></slot></header>
      <div part="content"><slot></slot></div>
      <footer part="footer"><slot name="footer"></slot></footer>
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
        gap: var(--tp-space-3);
        text-align: center;
        padding: var(--tp-space-8);
      }

      .description {
        max-width: 36rem;
        color: var(--tp-muted-foreground);
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
        padding: 0 var(--tp-space-1);
        border: var(--tp-border-width) var(--tp-border-style) var(--tp-border);
        border-bottom-width: var(--tp-border-width-strong);
        border-radius: var(--tp-radius-sm);
        background: var(--tp-card);
        font: inherit;
        font-family: var(--tp-font-mono);
        font-size: var(--tp-text-xs);
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
        font-weight: var(--tp-font-normal);
        color: var(--tp-muted-foreground);
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
        gap: var(--tp-space-3);
        padding: var(--tp-space-2) var(--tp-space-3);
        border-radius: var(--tp-radius-sm);
      }

      :host([selected]) .item {
        background: var(--tp-card);
      }

      .description {
        display: block;
        color: var(--tp-muted-foreground);
        font-size: var(--tp-text-sm);
      }
    `,
  ];
  selected = false;
  value = '';
  description = '';
  protected override render() {
    const description = this.description
      ? html`<span class="description" part="description">${this.description}</span>`
      : nothing;
    return html`<div
      class="item"
      part="root"
      role="group"
      aria-current=${this.selected ? 'true' : nothing}
    >
      <slot name="leading"></slot>
      <span part="content"><slot></slot>${description}</span>
      <slot name="trailing"></slot>
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
        width: var(--tp-space-3);
        height: var(--tp-space-3);
        border-radius: var(--tp-radius-full);
        background: var(--tp-marker-color, var(--tp-muted-foreground));
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
        gap: var(--tp-space-3);
      }

      .meta {
        display: flex;
        gap: var(--tp-space-2);
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
        border-radius: var(--tp-radius-sm);
        background: var(--tp-card);
        overflow: hidden;
      }

      :host([animated])::after {
        content: '';
        display: block;
        width: 45%;
        height: 100%;
        background: linear-gradient(90deg, transparent, var(--tp-muted-foreground), transparent);
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

      ::slotted(table) :is(th, td) {
        padding: var(--tp-space-2) var(--tp-space-3);
        border-bottom: var(--tp-border-width) var(--tp-border-style) var(--tp-border);
        text-align: start;
      }
    `,
  ];
  label = 'Data table';
  protected override render() {
    return html`<div class="root" part="root" role="region" aria-label=${this.label} tabindex="0">
      <slot></slot>
    </div>`;
  }
}
