import { nothing, render } from 'lit';
import { createId } from './id.js';
import { resolveLocale } from './services.js';
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
  attributes: Map<string, { original: string | null; applied: string | null }>;
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
function attribute(record: Registration, name: string, value: string | null): void {
  let owned = record.attributes.get(name);
  if (!owned) {
    owned = { original: record.element.getAttribute(name), applied: value };
    record.attributes.set(name, owned);
  }
  owned.applied = value;
  if (record.element.getAttribute(name) === value) return;
  if (value === null) record.element.removeAttribute(name);
  else record.element.setAttribute(name, value);
}
function release(record: Registration): void {
  for (const [name, owned] of record.attributes) {
    if (record.element.getAttribute(name) !== owned.applied) continue;
    if (owned.original === null) record.element.removeAttribute(name);
    else record.element.setAttribute(name, owned.original);
  }
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
    this.#root = { element: host, options: {}, attributes: new Map() };
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
        if (this.#diagnostics.has(code)) return;
        this.#diagnostics.add(code);
        const Event = this.host.ownerDocument.defaultView!.CustomEvent;
        this.host.dispatchEvent(
          new Event('tp-diagnostic', {
            bubbles: true,
            composed: true,
            detail: { code: `meter-${code}`, message, severity: 'warning' },
          }),
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
    const record: Registration = { element, options, attributes: new Map() };
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
    attribute(this.#root, 'role', 'meter');
    for (const [name, value] of Object.entries({
      'aria-valuemin': s.minimum,
      'aria-valuemax': s.maximum,
      'aria-valuenow': s.clampedValue,
      'aria-valuetext': s.accessibleValueText,
    }))
      attribute(this.#root, name, String(value));
    if (this.host.localName === 'meter') {
      attribute(this.#root, 'min', String(s.minimum));
      attribute(this.#root, 'max', String(s.maximum));
      attribute(this.#root, 'value', String(s.clampedValue));
    }
    const label = this.#parts.get('label');
    if (label) {
      if (!label.element.id) attribute(label, 'id', createId('tp-meter-label'));
      this.#labelIdentifier = label.element.id;
      attribute(label, 'role', 'presentation');
      attribute(this.#root, 'aria-labelledby', label.element.id);
      this.#appliedLabels = [label.element];
      this.host.ariaLabelledByElements = this.#appliedLabels;
      // Element-reference reflection clears the string association attribute.
      this.#root.attributes.get('aria-labelledby')!.applied =
        this.host.getAttribute('aria-labelledby');
    } else if (this.#appliedLabels !== undefined) {
      this.host.ariaLabelledByElements = this.#originalLabels;
      this.#appliedLabels = undefined;
      const owned = this.#root.attributes.get('aria-labelledby');
      if (owned) attribute(this.#root, 'aria-labelledby', owned.original);
    }
    const value = this.#parts.get('value');
    if (value) {
      attribute(value, 'aria-hidden', 'true');
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
