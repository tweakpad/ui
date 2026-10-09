import { nothing, render } from 'lit';
import { createId } from './id.js';
import { OwnedAttributes } from './owned-attributes.js';
import { reportDiagnostic, resolveLocale } from './services.js';
import { numericRange, formatNumericRange, type NumericRangeOptions } from './numeric-range.js';

export interface MeterOptions extends Partial<NumericRangeOptions> {
  value: number;
  valueText?: string | undefined;
  getAccessibleValueText?: ((formattedValue: string, rawValue: number) => string) | undefined;
}

/** Meter always has a scalar; nonfinite values clamp rather than mean indeterminate. */
export function meterState(options: MeterOptions) {
  if (typeof options.value !== 'number') throw new TypeError('Meter requires a numeric value.');
  const configuration = {
    ...options,
    minimum: options.minimum ?? 0,
    maximum: options.maximum ?? 100,
  };
  const range = numericRange(options.value, configuration);
  const formattedValue = formatNumericRange(range, configuration);
  return Object.freeze({
    ...range,
    value: options.value,
    rawMinimum: configuration.minimum,
    rawMaximum: configuration.maximum,
    formattedValue,
    accessibleValueText:
      options.valueText ??
      options.getAccessibleValueText?.(formattedValue, options.value) ??
      formattedValue,
  });
}
export type MeterState = ReturnType<typeof meterState>;
export type MeterPart = 'label' | 'value' | 'track' | 'indicator';
export interface MeterPartOptions {
  /** Lit content; receives clamped formatting and the original scalar. */
  content?: ((formattedValue: string, rawValue: number) => unknown) | undefined;
}
interface Registration {
  element: HTMLElement;
  options: MeterPartOptions;
  attributes: OwnedAttributes;
  originalNodes?: Node[];
  renderBefore?: Comment;
  originalSize?: { value: string; priority: string };
  appliedSize?: string;
}
const owners = new WeakMap<Element, MeterController>();
/** All registered constituents observe exactly the Root's immutable snapshot. */
export function getMeterState(element: Element): MeterState | undefined {
  return owners.get(element)?.state;
}
function release(record: Registration): void {
  record.attributes.dispose();
  if (record.originalNodes) {
    render(nothing, record.element, { renderBefore: record.renderBefore ?? null });
    record.element.replaceChildren(...record.originalNodes);
  }
  if (record.originalSize && record.element.style.inlineSize === record.appliedSize) {
    if (record.originalSize.value)
      record.element.style.setProperty(
        'inline-size',
        record.originalSize.value,
        record.originalSize.priority,
      );
    else record.element.style.removeProperty('inline-size');
  }
  owners.delete(record.element);
}

/** Unstyled Foundation binding, not a new catalog component or a Progress mode. */
export class MeterController {
  readonly #root: Registration;
  #options: MeterOptions;
  #state!: MeterState;
  #parts = new Map<MeterPart, Registration>();
  #observer: MutationObserver | undefined;
  #disposed = false;
  #locale: string | undefined;
  #labelIdentifier: string | undefined;
  #originalLabels: readonly Element[] | null;
  #appliedLabels: Element[] | null | undefined;
  #diagnostics = new Set<string>();
  constructor(
    readonly host: HTMLElement,
    options: MeterOptions,
  ) {
    if (owners.has(host)) throw new Error('This element already belongs to a MeterController.');
    if (typeof options.value !== 'number') throw new TypeError('Meter requires a numeric value.');
    this.#options = { ...options };
    this.#root = { element: host, options: {}, attributes: new OwnedAttributes(host) };
    this.#originalLabels = host.ariaLabelledByElements;
    owners.set(host, this);
    const Observer = host.ownerDocument.defaultView?.MutationObserver;
    if (Observer) {
      this.#observer = new Observer(() => {
        const locale = resolveLocale(host);
        const label = this.#parts.get('label');
        if (locale !== this.#locale || (label && label.element.id !== this.#labelIdentifier))
          this.refresh();
      });
      this.#observer.observe(host.ownerDocument, {
        subtree: true,
        attributes: true,
        attributeFilter: ['lang', 'id'],
      });
      const root = host.getRootNode();
      if (root !== host.ownerDocument)
        this.#observer.observe(root, {
          subtree: true,
          attributes: true,
          attributeFilter: ['lang', 'id'],
        });
    }
    this.refresh();
  }
  get state(): MeterState {
    return this.#state;
  }
  update(options: Partial<MeterOptions>): void {
    if (this.#disposed) return;
    if ('value' in options && typeof options.value !== 'number')
      throw new TypeError('Meter requires a numeric value.');
    this.#options = { ...this.#options, ...options };
    this.refresh();
  }
  #configuration(): MeterOptions {
    this.#locale = resolveLocale(this.host);
    return {
      ...this.#options,
      locale: this.#options.locale ?? this.#locale,
      diagnostic: (code, message) => {
        this.#options.diagnostic?.(code, message);
        reportDiagnostic(
          this.host,
          { code: `meter-${code}`, message, severity: 'warning' },
          { once: this.#diagnostics },
        );
      },
    };
  }
  /** Register one optional constituent; releasing/replacing it restores owned DOM. */
  registerPart(part: MeterPart, element: HTMLElement, options: MeterPartOptions = {}): () => void {
    if (this.#disposed) throw new Error('MeterController has been disposed.');
    if (owners.has(element)) throw new Error('This element already belongs to a MeterController.');
    const old = this.#parts.get(part);
    if (old) release(old);
    const record: Registration = { element, options, attributes: new OwnedAttributes(element) };
    if (part === 'value') {
      record.originalNodes = [...element.childNodes];
      record.renderBefore = element.ownerDocument.createComment('meter-value');
      element.replaceChildren(record.renderBefore);
    }
    if (part === 'indicator')
      record.originalSize = {
        value: element.style.getPropertyValue('inline-size'),
        priority: element.style.getPropertyPriority('inline-size'),
      };
    this.#parts.set(part, record);
    owners.set(element, this);
    this.refresh();
    return () => {
      if (this.#parts.get(part) !== record) return;
      this.#parts.delete(part);
      release(record);
      this.refresh();
    };
  }
  refresh(): void {
    if (this.#disposed) return;
    this.#state = meterState(this.#configuration());
    const s = this.#state;
    this.#root.attributes.set('role', 'meter');
    for (const [name, value] of Object.entries({
      'aria-valuemin': s.minimum,
      'aria-valuemax': s.maximum,
      'aria-valuenow': s.clampedValue,
      'aria-valuetext': s.accessibleValueText,
    }))
      this.#root.attributes.set(name, String(value));
    if (this.host.localName === 'meter') {
      this.#root.attributes.set('min', String(s.minimum));
      this.#root.attributes.set('max', String(s.maximum));
      this.#root.attributes.set('value', String(s.clampedValue));
    }
    const label = this.#parts.get('label');
    if (label) {
      if (!label.element.id) label.attributes.set('id', createId('tp-meter-label'));
      this.#labelIdentifier = label.element.id;
      label.attributes.set('role', 'presentation');
      // Element-reference reflection clears the string association attribute: own that cleared
      // state, and spell the identifier out only where references are not reflected.
      const view = this.host.ownerDocument.defaultView;
      const reflectsElements = !!view && 'ariaLabelledByElements' in view.Element.prototype;
      this.#root.attributes.set('aria-labelledby', reflectsElements ? null : label.element.id);
      this.#appliedLabels = [label.element];
      this.host.ariaLabelledByElements = this.#appliedLabels;
    } else if (this.#appliedLabels !== undefined) {
      this.host.ariaLabelledByElements = this.#originalLabels;
      this.#appliedLabels = undefined;
      const attributes = this.#root.attributes;
      attributes.set('aria-labelledby', attributes.original('aria-labelledby'));
    }
    const value = this.#parts.get('value');
    if (value) {
      value.attributes.set('aria-hidden', 'true');
      render(
        value.options.content ? value.options.content(s.formattedValue, s.value) : s.formattedValue,
        value.element,
        { renderBefore: value.renderBefore ?? null },
      );
    }
    const indicator = this.#parts.get('indicator');
    if (indicator) {
      indicator.element.style.inlineSize = `${s.percentage}%`;
      indicator.appliedSize = indicator.element.style.inlineSize;
    }
  }
  /** Release observers and only the attributes/content/geometry owned by this binding. */
  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#observer?.disconnect();
    if (this.#appliedLabels !== undefined) {
      const current = this.host.ariaLabelledByElements;
      if (
        current?.length === this.#appliedLabels?.length &&
        current?.every((el, i) => el === this.#appliedLabels?.[i])
      )
        this.host.ariaLabelledByElements = this.#originalLabels;
    }
    for (const record of this.#parts.values()) release(record);
    this.#parts.clear();
    release(this.#root);
  }
}
