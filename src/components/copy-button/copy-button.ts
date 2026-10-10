import { css, html, nothing, type PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';
import { LiveAnnouncer } from '../../foundation/announcer.js';
import { copyText } from '../../foundation/code/clipboard.js';
import { copyIcon } from '../../icons/copy.js';
import { checkIcon } from '../../icons/check.js';
import { copyButtonPresentation } from '../../presentation/families/copy-button.js';
import { TpButton } from '../button/button.js';
import { TpIcon } from '../icon/icon.js';

export type CopyButtonVariant =
  'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link';
export type CopyButtonSize = 'xs' | 'sm' | 'default' | 'lg';
export interface CopyDetail {
  readonly value: string;
}

const ICON_SIZES: Record<CopyButtonSize, 'icon-xs' | 'icon-sm' | 'icon' | 'icon-lg'> = {
  xs: 'icon-xs',
  sm: 'icon-sm',
  default: 'icon',
  lg: 'icon-lg',
};

/**
 * Writes `value` to the clipboard and confirms in place (Component Library §16 Copy button,
 * clipboard semantics of Foundation §18.13): the composed Button swaps its copy Icon for a
 * check and takes the copied message as its name for `duration`, every result is announced
 * politely, and `tp-copy` (cancelable) / `tp-copied` / `tp-copy-error` report the sequence.
 *
 * @fires tp-copy - Cancelable, before writing; `detail.value`.
 * @fires tp-copied - After a successful write; `detail.value`.
 * @fires tp-copy-error - After a failed write; `detail.value`.
 */
export class TpCopyButton extends TpElement {
  static tagName = 'tp-copy-button';
  static override presentation = copyButtonPresentation;
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpButton, TpIcon];
  }
  static override properties = {
    ...TpElement.properties,
    value: { type: String },
    label: { type: String },
    copiedLabel: { type: String, attribute: 'copied-label' },
    failedLabel: { type: String, attribute: 'failed-label' },
    showLabel: { type: Boolean, attribute: 'show-label', reflect: true },
    variant: { type: String, reflect: true },
    size: { type: String, reflect: true },
    duration: { type: Number },
    disabled: { type: Boolean, reflect: true },
    _copied: { state: true },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: inline-flex;
        vertical-align: middle;
      }

      :host([hidden]) {
        display: none;
      }

      .label {
        white-space: nowrap;
      }
    `,
  ];
  value = '';
  label = 'Copy';
  copiedLabel = 'Copied';
  failedLabel = 'Copy failed';
  showLabel = false;
  variant: CopyButtonVariant = 'ghost';
  size: CopyButtonSize = 'sm';
  duration = 2000;
  disabled = false;
  declare _copied: boolean;
  #timer: ReturnType<typeof setTimeout> | undefined;
  #announcer: LiveAnnouncer | undefined;

  constructor() {
    super();
    this._copied = false;
  }

  /** True while the check Icon and the copied message are shown. */
  get copied(): boolean {
    return this._copied;
  }

  /** The composed Button is the boundary a joined group seams. */
  get groupBoundary(): Element | null {
    return this.renderRoot?.querySelector('tp-button') ?? null;
  }

  /** Writes `value` and resolves to whether the clipboard accepted it. */
  async copy(sourceEvent?: Event): Promise<boolean> {
    void sourceEvent;
    if (this.disabled) return false;
    const value = this.value;
    if (!this.emit<CopyDetail>('tp-copy', { value }, { cancelable: true })) return false;
    const copied = await copyText(this.ownerDocument, value);
    this.#announcer ??= new LiveAnnouncer({ document: () => this.ownerDocument });
    this.#announcer.announce(copied ? this.copiedLabel : this.failedLabel);
    if (copied) {
      this._copied = true;
      clearTimeout(this.#timer);
      this.#timer = setTimeout(() => {
        this._copied = false;
      }, this.duration);
      this.emit<CopyDetail>('tp-copied', { value });
    } else this.emit<CopyDetail>('tp-copy-error', { value });
    return copied;
  }

  override focus(options?: FocusOptions): void {
    this.renderRoot?.querySelector<HTMLElement>('tp-button')?.focus(options);
  }

  override disconnectedCallback(): void {
    clearTimeout(this.#timer);
    this.#timer = undefined;
    this.#announcer?.dispose();
    this.#announcer = undefined;
    super.disconnectedCallback();
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (changed.has('_copied')) this.toggleAttribute('data-copied', this._copied);
  }

  #click = (event: Event): void => {
    void this.copy(event);
  };

  protected override render() {
    const icon = this._copied ? checkIcon : copyIcon;
    const text = this._copied ? this.copiedLabel : this.label;
    return html`<tp-button
      class="button"
      variant=${this.variant}
      size=${this.showLabel ? this.size : ICON_SIZES[this.size]}
      .icon=${this.showLabel ? undefined : icon}
      aria-label=${this.showLabel ? nothing : text}
      ?disabled=${this.disabled}
      data-copied=${this._copied ? '' : nothing}
      @click=${this.#click}
      >${
        this.showLabel
          ? html`<tp-icon slot="icon-start" .icon=${icon}></tp-icon
              ><span class="label">${text}</span>`
          : nothing
      }</tp-button
    >`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-copy-button': TpCopyButton;
  }
}
