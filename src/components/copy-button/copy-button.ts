import { css, html, nothing, type PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';
import { LiveAnnouncer } from '../../foundation/announcer.js';
import {
  copyData,
  copyText,
  type ClipboardRepresentations,
  type ClipboardWriteResult,
} from '../../foundation/clipboard.js';
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
/** Detail of `tp-copied` and `tp-copy-error`: the value and the media types actually written. */
export interface CopyResultDetail extends CopyDetail {
  readonly types: readonly string[];
}
/**
 * Supplies further clipboard representations for `value`, keyed by media type (for example
 * `image/png`), written together with `value` as `text/plain` in one clipboard item. Called
 * synchronously during the activation; pending representations are returned as promises.
 */
export type CopyDataProvider = (value: string) => ClipboardRepresentations;

const ICON_SIZES: Record<CopyButtonSize, 'icon-xs' | 'icon-sm' | 'icon' | 'icon-lg'> = {
  xs: 'icon-xs',
  sm: 'icon-sm',
  default: 'icon',
  lg: 'icon-lg',
};

/**
 * Writes `value` to the clipboard and confirms in place: the composed Button swaps its copy Icon
 * for a check and takes the copied message as its name for `duration`, every result is announced
 * politely, and `tp-copy` (cancelable) / `tp-copied` / `tp-copy-error` report the sequence. With
 * `data` set, one clipboard item carries its representations together with `value` as
 * `text/plain`.
 *
 * @fires tp-copy - Cancelable, before writing; `detail.value`.
 * @fires tp-copied - After a successful write; `detail.value` and the written `detail.types`.
 * @fires tp-copy-error - After a failed write; `detail.value` and empty `detail.types`.
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
    data: { attribute: false },
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

      /* The composed Button paints the unavailable state; the host is not dimmed twice. */
      :host([disabled]) {
        cursor: auto;
        opacity: 1;
      }

      .label {
        white-space: nowrap;
      }
    `,
  ];
  /** The exact text to copy. */
  value = '';
  /** Further representations written with `value` in one clipboard item; null copies text. */
  data: CopyDataProvider | null = null;
  /**
   * The accessible name, or the visible text with `show-label`; make it specific, such as "Copy
   * invite link", so it makes sense out of context.
   */
  label = 'Copy';
  /** The name and announcement after a successful copy, shown for `duration`. */
  copiedLabel = 'Copied';
  /** The announcement when the browser refuses the clipboard write. */
  failedLabel = 'Copy failed';
  /** Shows the label as text beside the Icon instead of an Icon-only button. */
  showLabel = false;
  /**
   * The paint of the composed Button: `ghost` beside inline values, `outline` or `secondary` when
   * copying is the main action.
   */
  variant: CopyButtonVariant = 'ghost';
  /** The size of the composed Button; Icon-only buttons take the square size of the same height. */
  size: CopyButtonSize = 'sm';
  /**
   * How long, in milliseconds, the check and the copied message stay before the button returns to
   * its resting state.
   */
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

  /** Writes `value` (and `data`) and resolves to whether the clipboard accepted it. */
  async copy(sourceEvent?: Event): Promise<boolean> {
    void sourceEvent;
    if (this.disabled) return false;
    const value = this.value;
    if (!this.emit<CopyDetail>('tp-copy', { value }, { cancelable: true })) return false;
    const result = await this.#write(value);
    this.#announcer ??= new LiveAnnouncer({ document: () => this.ownerDocument });
    this.#announcer.announce(result.copied ? this.copiedLabel : this.failedLabel);
    if (result.copied) {
      this._copied = true;
      clearTimeout(this.#timer);
      this.#timer = setTimeout(() => {
        this._copied = false;
      }, this.duration);
      this.emit<CopyResultDetail>('tp-copied', { value, types: result.types });
    } else this.emit<CopyResultDetail>('tp-copy-error', { value, types: [] });
    return result.copied;
  }

  /** The text write, or one data write when `data` supplies further representations. */
  #write(value: string): Promise<ClipboardWriteResult> {
    const document = this.ownerDocument;
    if (!this.data) {
      return copyText(document, value).then((copied) => ({
        copied,
        types: copied ? ['text/plain'] : [],
      }));
    }
    let representations: ClipboardRepresentations = {};
    try {
      representations = this.data(value);
    } catch (error) {
      this.diagnose('copy-button-data', `The data provider threw: ${String(error)}`);
    }
    const record: Record<string, ClipboardRepresentations[string]> = { ...representations };
    if (!('text/plain' in record) && value !== '') record['text/plain'] = value;
    return copyData(document, record);
  }

  /** Moves focus to the composed Button. */
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
