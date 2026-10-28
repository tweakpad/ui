import { css, html, nothing } from 'lit';
import type { PropertyValues } from 'lit';
import { ref } from 'lit/directives/ref.js';
import { defaultTrue, numberOrNull } from '../../foundation/converters.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';
import { TpElement } from '../../foundation/element.js';
import { observeLanguage, observeSubtree } from '../../foundation/observation.js';
import { resolveLocale } from '../../foundation/services.js';
import {
  isBuiltInTextPreset,
  subscribeTextPresets,
  transformText,
  type TextFormatOptions,
  type TextFormatter,
  type TextTransformResult,
} from '../../foundation/text-transform/presets.js';
import {
  countCut,
  joinCut,
  OMISSION,
  singleLine,
  truncationUnits,
  type TruncatePosition,
  type TruncateUnit,
} from '../../foundation/text-transform/truncate.js';
import { textTransformPresentation } from '../../presentation/families/text-transform.js';
import { DescriptionTooltipController } from '../shared/description-tooltip.js';
import { TpTooltip } from '../tooltip/tooltip.js';
import { TruncationFitController, type FitRequest } from './fit.js';

const POSITIONS = new Set<TruncatePosition>(['none', 'start', 'middle', 'end']);

/**
 * Presents one value as text shaped by a named preset or a formatter (case and identifier
 * transforms, localized numbers, currency, percentages, byte sizes and durations), optionally
 * shortened at its start, middle or end to a count or to the available width.
 *
 * @slot - Fallback content: the input when `value` is unset, and the presentation when a numeric
 *   preset cannot read the input.
 * @csspart text-transform-value - The presented text: a `data` element for numeric input.
 * @csspart text-transform-description - The Tooltip showing the complete text while truncated.
 */
export class TpTextTransform extends TpElement {
  static tagName = 'tp-text-transform';
  /** Library elements this element renders; defining it defines them too. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpTooltip];
  }
  static override presentation = textTransformPresentation;
  static override properties = {
    ...TpElement.properties,
    value: {},
    preset: { type: String, reflect: true },
    format: { attribute: false },
    formatter: { attribute: false },
    currency: { type: String },
    unit: { type: String },
    decimals: { converter: numberOrNull },
    locale: { type: String },
    truncate: { type: String, reflect: true },
    truncateBy: { type: String, attribute: 'truncate-by' },
    maxLength: { attribute: 'max-length', converter: numberOrNull },
    tooltip: { converter: defaultTrue },
  };
  static override styles = [
    TpElement.styles,
    css`
      /* Isolated like a bdi element, so a value never reorders with the text around it. */
      :host {
        display: inline;
        color: inherit;
        font: inherit;
        unicode-bidi: isolate;
      }

      :host([truncate='start']),
      :host([truncate='middle']),
      :host([truncate='end']) {
        display: inline-block;
        max-inline-size: 100%;
        min-inline-size: 0;
      }

      .numeric {
        font-variant-numeric: tabular-nums;
      }

      .value[tabindex] {
        border-radius: var(--tp-radius-sm);
        cursor: default;
      }

      .fit {
        display: block;
        position: relative;
        white-space: nowrap;
      }

      /* The whole text sets the inline size, so the size never depends on the presented cut. */
      .sizer {
        display: block;
        block-size: 0;
        overflow: hidden;
        visibility: hidden;
      }

      .sizer-text {
        display: inline-block;
      }

      .shown {
        display: block;
        overflow: hidden;
        text-overflow: clip;
      }

      .omission {
        position: absolute;
        inset-block-start: 0;
        inset-inline-start: 0;
        visibility: hidden;
        pointer-events: none;
      }
    `,
  ];

  /** Number, bigint or text; the trimmed light-DOM text is read when unset. */
  value: unknown = undefined;
  /** A built-in or Consumer preset name. */
  preset = 'text';
  /** Preset options: number format options, or `{ style, guide }` for durations. */
  format: TextFormatOptions | undefined;
  /** Replaces the preset; returns text or `{ text, accessibleText }`. */
  formatter: TextFormatter | undefined;
  /** Currency code of the `currency` preset. */
  currency = '';
  /** Unit identifier of the `unit` preset. */
  unit = '';
  /** Exact number of fraction digits, from 0 to 20. */
  decimals: number | null = null;
  /** Formatting and case-mapping locale; the owner locale when empty. */
  locale = '';
  /** Where the omission goes: `none`, `start`, `middle` or `end`. */
  truncate: TruncatePosition = 'none';
  /** The unit truncation removes: `chars` (grapheme clusters) or `words`. */
  truncateBy: TruncateUnit = 'chars';
  /** The most units kept; truncates at the end when `truncate` is `none`. */
  maxLength: number | null = null;
  /** Shows the complete text in a Tooltip while the text is truncated. */
  tooltip = true;

  #result: TextTransformResult = transformText(undefined);
  #request: FitRequest | undefined;
  #truncated = false;
  #describing = false;
  readonly #fit = new TruncationFitController(this);
  readonly #descriptionTooltip = new DescriptionTooltipController(
    this,
    'text-transform-description',
  );
  // One function for the Tooltip content, so a re-render does not re-render the Tooltip.
  readonly #tooltipContent = (): string => this.#result.text;
  #releaseContent: (() => void) | undefined;
  #releaseLanguage: (() => void) | undefined;
  #releasePresets: (() => void) | undefined;

  /** The complete presented text, before truncation. */
  get text(): string {
    return this.#result.text;
  }
  /** The complete text for assistive technology: the long form of abbreviated text. */
  get accessibleText(): string {
    return this.#result.accessibleText;
  }
  /** Whether the presented text is shortened. */
  get truncated(): boolean {
    return this.#truncated;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#releaseContent = observeSubtree(
      this,
      () => {
        if (!this.#hasValue()) this.requestUpdate();
      },
      { content: true, attributes: false },
    );
    const view = this.ownerDocument.defaultView;
    if (view) this.#releaseLanguage = observeLanguage(view, () => this.requestUpdate());
    this.#releasePresets = subscribeTextPresets(() => {
      if (this.formatter || !isBuiltInTextPreset(this.preset || 'text')) this.requestUpdate();
    });
    if (this.hasUpdated) this.requestUpdate();
  }

  override disconnectedCallback(): void {
    for (const release of [this.#releaseContent, this.#releaseLanguage, this.#releasePresets])
      release?.();
    this.#releaseContent = this.#releaseLanguage = this.#releasePresets = undefined;
    super.disconnectedCallback();
  }

  protected override firstUpdated(changed: PropertyValues<this>): void {
    super.firstUpdated(changed);
    // A Value that kept focus after its text stopped being cut leaves the focus order on blur.
    this.renderRoot.addEventListener('focusout', () => {
      if (!this.#describing) this.requestUpdate();
    });
  }

  /** Whether the Value has focus; it keeps it after the text stops being cut. */
  #holdsFocus(): boolean {
    const active = (this.renderRoot as ShadowRoot).activeElement;
    return Boolean(active?.matches('[part~="text-transform-value"]'));
  }

  #hasValue(): boolean {
    return this.value !== undefined && this.value !== null && this.value !== '';
  }

  #locale(): string | undefined {
    return this.locale || resolveLocale(this);
  }

  #position(): TruncatePosition {
    return POSITIONS.has(this.truncate) ? this.truncate : 'none';
  }

  #by(): TruncateUnit {
    return this.truncateBy === 'words' ? 'words' : 'chars';
  }

  #limit(): number | undefined {
    if (this.maxLength === null) return undefined;
    if (Number.isInteger(this.maxLength) && this.maxLength >= 0) return this.maxLength;
    this.diagnose(
      'invalid-max-length',
      `Text transform max-length must be a non-negative integer, not ${this.maxLength}.`,
      { once: true, defer: true },
    );
    return undefined;
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    const locale = this.#locale();
    const result = transformText(this.#hasValue() ? this.value : this.textContent?.trim(), {
      preset: this.preset || 'text',
      format: this.format,
      formatter: this.formatter,
      currency: this.currency || undefined,
      unit: this.unit || undefined,
      decimals: this.decimals ?? undefined,
      locale,
    });
    for (const { code, message } of result.diagnostics)
      this.diagnose(code, message, { once: true, defer: true });
    this.#result = result;
    this.invalid = result.invalid;
    const position = this.#position();
    this.#request =
      position !== 'none' && result.text && !result.invalid
        ? {
            text: singleLine(result.text),
            position,
            by: this.#by(),
            limit: this.#limit(),
            locale,
          }
        : undefined;
  }

  /** The presented text and whether it is a cut, for the current fit or count. */
  #shown(): { shown: string; truncated: boolean } {
    const { text } = this.#result;
    if (this.#request)
      return {
        shown: this.#fit.text(this.#request),
        truncated: this.#fit.truncated(this.#request),
      };
    const limit = this.#position() === 'none' ? this.#limit() : undefined;
    if (limit === undefined) return { shown: text, truncated: false };
    const units = truncationUnits(text, this.#by(), this.#locale());
    const cut = countCut(units.length, limit, 'none');
    return cut
      ? { shown: joinCut(units, cut), truncated: true }
      : { shown: text, truncated: false };
  }

  protected override render() {
    const result = this.#result;
    if (result.invalid) return html`<slot></slot>`;
    const { shown, truncated } = this.#shown();
    this.#truncated = truncated;
    this.#describing = truncated && this.tooltip;
    const focusable = this.#describing || this.#holdsFocus();
    // The visible text stands in for the accessible text unless it is cut or abbreviated.
    const hidden = truncated || result.accessibleText !== shown;
    const accessible = hidden
      ? html`<span class="visually-hidden">${result.accessibleText}</span>`
      : nothing;
    const content = this.#request
      ? html`<span class="sizer" aria-hidden="true"
            ><span class="sizer-text">${this.#request.text}</span></span
          ><span class="shown" aria-hidden=${hidden ? 'true' : nothing}>${shown}</span
          ><span class="omission" aria-hidden="true">${OMISSION}</span>${accessible}`
      : hidden
        ? html`<span aria-hidden="true">${shown}</span>${accessible}`
        : shown;
    const classes = ['value', this.#request ? 'fit' : '', result.numeric ? 'numeric' : '']
      .filter(Boolean)
      .join(' ');
    return html`${this.renderPart(
      'text-transform-value',
      { numeric: result.numeric, truncated },
      {
        tag: result.machineValue !== undefined ? 'data' : 'span',
        properties: {
          part: focusable ? 'text-transform-value focusable' : 'text-transform-value',
          class: classes,
          value: result.machineValue ?? nothing,
          tabindex: this.#describing ? '0' : focusable ? '-1' : nothing,
        },
        content,
      },
    )}${
      this.#describing
        ? html`<tp-tooltip
            describes="none"
            ${ref(this.#descriptionTooltip.reference)}
            .content=${this.#tooltipContent}
          ></tp-tooltip>`
        : nothing
    }`;
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.toggleAttribute('data-truncated', this.#truncated);
    const value =
      this.renderRoot.querySelector<HTMLElement>('[part~="text-transform-value"]') ?? undefined;
    const sizer = value?.querySelector<HTMLElement>('.sizer-text');
    const shown = value?.querySelector<HTMLElement>('.shown');
    const omission = value?.querySelector<HTMLElement>('.omission');
    this.#fit.sync(
      this.#request,
      value && sizer && shown && omission ? { box: value, sizer, shown, omission } : undefined,
    );
    this.#descriptionTooltip.sync(this.#describing ? value : undefined);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-text-transform': TpTextTransform;
  }
}
