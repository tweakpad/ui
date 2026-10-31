import { nothing } from 'lit';
import { html, unsafeStatic } from 'lit/static-html.js';
import { AsyncDirective } from 'lit/async-directive.js';
import { directive, PartType } from 'lit/directive.js';
import type { ElementPart, PartInfo } from 'lit/directive.js';
import { attachPartReference, detachPartReference } from './part-reference.js';

export type ElementReference =
  ((element: HTMLElement | null) => void) | { current: HTMLElement | null };
export type PartState = Readonly<Record<string, unknown>>;
export type HostProperties = Record<string, unknown>;
export interface PartRenderContext<S extends PartState = PartState> {
  state: S;
  properties: HostProperties;
  content: unknown;
  /** Place this directive on the delegate's semantic host to retain the behavior bundle. */
  bind: ReturnType<typeof bindPart>;
}
export interface ComponentPartContract<S extends PartState = PartState> {
  renderDelegate?: (context: PartRenderContext<S>) => unknown;
  hostProperties?: HostProperties;
  classHook?: string | ((state: S) => string);
  styleHook?: Record<string, string | number> | ((state: S) => Record<string, string | number>);
  elementReference?: ElementReference;
  content?: unknown | ((state: S) => unknown);
}
export interface PartRenderOptions {
  tag?: string;
  enabled?: boolean;
  properties?: HostProperties;
  content?: unknown;
  reference?: ElementReference;
  /** Additional behavior-owned keys beyond role, ARIA, state markers and native state. */
  protectedProperties?: readonly string[];
  /** Restore native state when a consumer suppresses an initiating component action. */
  onHandlerPrevented?: Record<string, (event: Event) => void>;
}
export type ComponentInitiatingEvent = Event & {
  preventComponentHandling(): void;
  readonly componentHandlingPrevented: boolean;
};
const prevented = new WeakSet<Event>();
export function preventComponentHandling(event: Event): void {
  prevented.add(event);
}
export function componentHandlingPrevented(event: Event): boolean {
  return prevented.has(event);
}
function prepareEvent(event: Event): void {
  if (!('preventComponentHandling' in event))
    Object.defineProperties(event, {
      preventComponentHandling: { value: () => preventComponentHandling(event) },
      componentHandlingPrevented: { get: () => componentHandlingPrevented(event) },
    });
}
function callHandler(handler: unknown, element: HTMLElement, event: Event): void {
  if (typeof handler === 'function') handler.call(element, event);
  else if (handler && typeof (handler as EventListenerObject).handleEvent === 'function')
    (handler as EventListenerObject).handleEvent(event);
}
function propertyIdentity(key: string): string {
  const name = key.replace(/^[.?]/, '').toLowerCase();
  // ARIA property and attribute channels refer to the same owned semantic state.
  return name.startsWith('aria') ? name.replaceAll('-', '').replace(/elements$/, '') : name;
}
function protectedKey(key: string): boolean {
  const name = propertyIdentity(key);
  return (
    name === 'role' ||
    name === 'part' ||
    name.startsWith('aria') ||
    name.startsWith('data-') ||
    [
      'disabled',
      'readonly',
      'required',
      'checked',
      'indeterminate',
      'value',
      'name',
      'type',
      'tabindex',
    ].includes(name)
  );
}
/** Consumer handlers precede component handlers; native preventDefault is a separate channel. */
export function mergePartProperties(
  internal: HostProperties,
  external: HostProperties = {},
  protectedProperties: readonly string[] = [],
  onHandlerPrevented: Record<string, (event: Event) => void> = {},
): HostProperties {
  const result = { ...internal };
  const owned = new Set(Object.keys(internal).map(propertyIdentity));
  const additionalProtected = new Set(protectedProperties.map(propertyIdentity));
  for (const [key, value] of Object.entries(external)) {
    if (key === 'class' || key === 'className')
      result.class = [internal.class ?? internal.className, value].filter(Boolean).join(' ');
    else if (key === 'style')
      result.style = { ...((internal.style as object) ?? {}), ...((value as object) ?? {}) };
    else if (key.startsWith('@')) {
      const component = internal[key];
      result[key] = function (this: HTMLElement, event: Event) {
        prepareEvent(event);
        callHandler(value, this, event);
        if (!componentHandlingPrevented(event)) callHandler(component, this, event);
        else onHandlerPrevented[key]?.(event);
      };
    } else if (
      !owned.has(propertyIdentity(key)) ||
      (!protectedKey(key) && !additionalProtected.has(propertyIdentity(key)))
    )
      result[key] = value;
  }
  return result;
}

const tokens = (value: unknown): Set<string> =>
  new Set(
    value === undefined || value === null || value === false || value === nothing
      ? []
      : String(value).split(/\s+/).filter(Boolean),
  );

/**
 * Writes only what differs from the element: an unchanged value queues no mutation record for
 * the observers in the tree. `part` and `class` reconcile the tokens this binding owns, so tokens
 * added by the presentation layer (bound parts, class hooks) survive a re-render.
 */
class BindPartDirective extends AsyncDirective {
  #element?: HTMLElement;
  #keys = new Set<string>();
  /** The latest handler per event; one listener per event name calls it. */
  #handlers = new Map<string, unknown>();
  #listeners = new Map<string, EventListener>();
  #refs: (ElementReference | undefined)[] = [];
  #properties: HostProperties = {};
  #styles = new Set<string>();
  #tokens = new Map<string, Set<string>>();
  constructor(info: PartInfo) {
    super(info);
    if (info.type !== PartType.ELEMENT) throw new Error('bindPart belongs on an element.');
  }
  render(properties: HostProperties, references: (ElementReference | undefined)[] = []): unknown {
    void properties;
    void references;
    return nothing;
  }
  override update(
    part: ElementPart,
    [properties, references = []]: [HostProperties, (ElementReference | undefined)[]?],
  ): unknown {
    const element = part.element as HTMLElement;
    if (this.#element !== element) {
      this.#release();
      this.#tokens.clear();
      this.#styles.clear();
      this.#element = element;
    }
    const keys = new Set(Object.keys(properties));
    this.#properties = properties;
    for (const key of this.#keys) if (!keys.has(key)) this.#write(key, undefined);
    for (const [key, value] of Object.entries(properties)) this.#write(key, value);
    this.#keys = keys;
    if (
      references.length !== this.#refs.length ||
      references.some((ref, i) => ref !== this.#refs[i])
    ) {
      for (const ref of this.#refs) detachPartReference(this, ref);
      this.#refs = references;
      for (const ref of this.#refs) attachPartReference(this, ref, element);
    }
    return nothing;
  }
  #write(key: string, value: unknown): void {
    const element = this.#element!;
    if (key === 'ref') return;
    if (key.startsWith('@')) {
      const name = key.slice(1);
      if (value) {
        this.#handlers.set(name, value);
        if (!this.#listeners.has(name)) {
          const listener = (event: Event) => callHandler(this.#handlers.get(name), element, event);
          this.#listeners.set(name, listener);
          element.addEventListener(name, listener);
        }
      } else {
        this.#handlers.delete(name);
        const listener = this.#listeners.get(name);
        if (listener) element.removeEventListener(name, listener);
        this.#listeners.delete(name);
      }
    } else if (key.startsWith('.')) {
      const name = key.slice(1);
      const current = (element as unknown as HostProperties)[name];
      // A fresh array with the same items (`ariaControlsElements`) would re-reflect its attribute.
      const same =
        current === value ||
        (Array.isArray(current) &&
          Array.isArray(value) &&
          current.length === value.length &&
          current.every((item, index) => item === value[index]));
      if (!same) (element as unknown as HostProperties)[name] = value;
    } else if (key === 'style' && typeof value === 'object' && value !== null) {
      const next = new Set<string>();
      for (const [name, entry] of Object.entries(value)) {
        const property = name.startsWith('--')
          ? name
          : name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
        next.add(property);
        const text = String(entry);
        if (element.style.getPropertyValue(property) !== text)
          element.style.setProperty(property, text);
      }
      for (const property of this.#styles)
        if (!next.has(property)) element.style.removeProperty(property);
      this.#styles = next;
    } else {
      const name = key === 'className' ? 'class' : key.replace(/^\?/, '');
      if (name === 'part' || name === 'class') {
        const list = name === 'part' ? element.part : element.classList;
        const next = tokens(value);
        for (const token of this.#tokens.get(name) ?? [])
          if (!next.has(token) && list.contains(token)) list.remove(token);
        for (const token of next) if (!list.contains(token)) list.add(token);
        this.#tokens.set(name, next);
        if (!list.length && element.hasAttribute(name)) element.removeAttribute(name);
        return;
      }
      const text =
        typeof value === 'boolean' && ['spellcheck', 'draggable', 'contenteditable'].includes(name)
          ? String(value)
          : value === undefined || value === null || value === false || value === nothing
            ? null
            : value === true
              ? ''
              : String(value);
      if (element.getAttribute(name) === text) return;
      if (text === null) element.removeAttribute(name);
      else element.setAttribute(name, text);
    }
  }
  #release(clear = true): void {
    for (const ref of this.#refs) detachPartReference(this, ref);
    for (const [name, listener] of this.#listeners)
      this.#element?.removeEventListener(name, listener);
    if (clear) this.#refs = [];
    this.#listeners.clear();
    this.#handlers.clear();
  }
  override disconnected(): void {
    this.#release(false);
  }
  override reconnected(): void {
    for (const [key, value] of Object.entries(this.#properties)) this.#write(key, value);
    if (this.#element) for (const ref of this.#refs) attachPartReference(this, ref, this.#element);
  }
}
export const bindPart = directive(BindPartDirective);

/** Lit binding of Foundation ComponentPartContract; default and delegated hosts share this bundle. */
export function renderPart<S extends PartState>(
  name: string,
  state: S,
  contract: ComponentPartContract<S> = {},
  options: PartRenderOptions = {},
): unknown {
  if (options.enabled === false) return nothing;
  const properties = mergePartProperties(
    { part: name, ...options.properties },
    contract.hostProperties,
    options.protectedProperties,
    options.onHandlerPrevented,
  );
  const classHook =
    typeof contract.classHook === 'function' ? contract.classHook(state) : contract.classHook;
  const styleHook =
    typeof contract.styleHook === 'function' ? contract.styleHook(state) : contract.styleHook;
  if (classHook) properties.class = [properties.class, classHook].filter(Boolean).join(' ');
  if (styleHook) properties.style = { ...((properties.style as object) ?? {}), ...styleHook };
  const content =
    'content' in contract
      ? typeof contract.content === 'function'
        ? contract.content(state)
        : contract.content
      : options.content;
  const refs = [
    options.reference,
    properties.ref as ElementReference | undefined,
    contract.elementReference,
  ];
  const bind = bindPart(properties, refs);
  if (contract.renderDelegate) return contract.renderDelegate({ state, properties, content, bind });
  const tagName = options.tag ?? 'div';
  if (!/^[a-z][a-z0-9-]*$/.test(tagName)) throw new Error('Invalid part host tag.');
  const tag = unsafeStatic(tagName);
  // Static HTML resolves the validated tag before parsing. The lint plugin
  // treats these static values as forbidden ordinary Lit tag bindings.
  /* eslint-disable lit/binding-positions, lit/no-invalid-html */
  // Editable textarea text is owned by its value property, never a Lit child marker.
  if (['input', 'textarea', 'img', 'hr', 'br'].includes(tagName))
    return html`<${tag} ${bind}></${tag}>`;
  return html`<${tag} ${bind}>${content ?? nothing}</${tag}>`;
  /* eslint-enable lit/binding-positions, lit/no-invalid-html */
}
