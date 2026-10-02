import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { componentDefinitions } from './components.js';
import { partBindings } from './bindings.js';
import { registeredPartStructure } from './structure.js';
import { defaultPresentationDictionary } from './default.js';
import { resolveComponentPresentation, serializeDeclarations } from './resolver.js';
import type { PartPresentation, PresentationDictionary } from './resolver.js';

type Host = HTMLElement &
  ReactiveControllerHost & {
    renderRoot: HTMLElement | DocumentFragment;
    partPresentation: PartPresentation;
  };
const dictionaries = new WeakMap<Document, PresentationDictionary>();
const subscribers = new WeakMap<Document, Set<PresentationController>>();
const compositions = new WeakMap<HTMLElement, Map<object, PartPresentation>>();
let registrationId = 0;

/** A compound's contribution precedes the member's terminal consumer overrides. */
export function setPartComposition(
  host: Host,
  owner: object,
  presentation?: PartPresentation,
): void {
  let owners = compositions.get(host);
  if (!owners) compositions.set(host, (owners = new Map()));
  if (presentation) owners.set(owner, presentation);
  else owners.delete(owner);
  host.requestUpdate();
}

/** Repaints connected instances in place; no state, focus, or form ownership changes. */
export function setPresentationDictionary(
  dictionary: PresentationDictionary,
  ownerDocument: Document = document,
): void {
  dictionaries.set(ownerDocument, dictionary);
  for (const controller of subscribers.get(ownerDocument) ?? []) controller.refresh();
}

export class PresentationController implements ReactiveController {
  readonly #id = `tp-presentation-${++registrationId}`;
  #registered = new Map<string, Set<HTMLElement>>();
  #registeredStyles = new Map<Document | ShadowRoot, HTMLStyleElement>();
  #registeredSheets = new Map<ShadowRoot, CSSStyleSheet>();
  #style?: HTMLStyleElement;
  #sheet: CSSStyleSheet | undefined;
  #document?: Document;
  #lastMissing = '';
  #refreshQueued = false;
  #hostParts = new Map<string, () => void>();
  #scheduleRefresh(): void {
    if (this.#refreshQueued) return;
    this.#refreshQueued = true;
    queueMicrotask(() => {
      this.#refreshQueued = false;
      if (this.host.isConnected) this.refresh();
    });
  }
  #hooks = new Map<
    HTMLElement,
    { classes: string[]; styles: Map<string, { previous: string; applied: string }> }
  >();
  constructor(private host: Host) {
    host.addController(this);
  }
  /** Register consumer-owned native parts without wrapping or replacing them. */
  registerPart(name: string, element: HTMLElement): () => void {
    if (!/^[a-z][a-z0-9-]*$/.test(name)) throw new Error('Invalid presentation part name');
    const members = this.#registered.get(name) ?? new Set<HTMLElement>();
    members.add(element);
    this.#registered.set(name, members);
    const token = `${this.#id}-${name}`;
    const tokens = new Set(
      (element.getAttribute('data-tp-presentation-part') ?? '').split(/\s+/).filter(Boolean),
    );
    tokens.add(token);
    element.setAttribute('data-tp-presentation-part', [...tokens].join(' '));
    this.#scheduleRefresh();
    return () => {
      members.delete(element);
      const current = (element.getAttribute('data-tp-presentation-part') ?? '')
        .split(/\s+/)
        .filter((value) => value && value !== token);
      if (current.length) element.setAttribute('data-tp-presentation-part', current.join(' '));
      else element.removeAttribute('data-tp-presentation-part');
      this.#scheduleRefresh();
    };
  }
  hostConnected(): void {
    this.#document = this.host.ownerDocument;
    let listeners = subscribers.get(this.#document);
    if (!listeners) subscribers.set(this.#document, (listeners = new Set()));
    listeners.add(this);
  }
  hostDisconnected(): void {
    if (this.#document) subscribers.get(this.#document)?.delete(this);
    for (const style of this.#registeredStyles.values()) style.remove();
    this.#registeredStyles.clear();
    for (const [root, sheet] of this.#registeredSheets)
      root.adoptedStyleSheets = root.adoptedStyleSheets.filter((entry) => entry !== sheet);
    this.#registeredSheets.clear();
    this.#restoreHooks();
  }
  hostUpdated(): void {
    this.refresh();
  }
  refresh(): void {
    const definition = componentDefinitions.find((item) => item.tagName === this.host.localName);
    if (!definition || !this.host.renderRoot) return;
    for (const [selector, part] of Object.entries(partBindings[this.host.localName] ?? {})) {
      if (selector === ':host') {
        this.host.part.add(part);
        if (!this.#hostParts.has(part))
          this.#hostParts.set(part, this.registerPart(part, this.host));
      } else
        for (const element of this.host.renderRoot.querySelectorAll<HTMLElement>(selector))
          element.part.add(part);
    }
    const dictionary = dictionaries.get(this.host.ownerDocument) ?? defaultPresentationDictionary;
    const axes = Object.fromEntries(
      (definition.axes ?? []).map((axis) => [
        axis.name,
        (this.host as unknown as Record<string, unknown>)[axis.name],
      ]),
    );
    const resolved = resolveComponentPresentation(definition, axes, dictionary);
    const mergedParts = Object.fromEntries(
      Object.entries(resolved.parts).map(([part, rules]) => [
        part,
        [...rules, ...(registeredPartStructure[part] ?? [])],
      ]),
    );
    this.#style ??= this.host.ownerDocument.createElement('style');
    const css = Object.entries(mergedParts)
      .flatMap(([part, rules]) =>
        rules.map((rule) => {
          const target = `[part~="${part}"]`;
          const selector = rule.selector?.includes('&')
            ? rule.selector.replaceAll('&', target)
            : target + (rule.selector ?? '');
          return `${selector}{${serializeDeclarations(rule.declarations)}}`;
        }),
      )
      .join('\n');
    if (
      this.host.renderRoot instanceof ShadowRoot &&
      'adoptedStyleSheets' in this.host.renderRoot
    ) {
      this.#sheet ??= new CSSStyleSheet();
      if (this.#style.textContent !== css) {
        this.#sheet.replaceSync(css);
        this.#style.textContent = css;
      }
      if (!this.host.renderRoot.adoptedStyleSheets.includes(this.#sheet))
        this.host.renderRoot.adoptedStyleSheets = [
          ...this.host.renderRoot.adoptedStyleSheets,
          this.#sheet,
        ];
    } else {
      if (this.#style.textContent !== css) this.#style.textContent = css;
      if (this.#style.parentNode !== this.host.renderRoot)
        this.host.renderRoot.appendChild(this.#style);
    }
    const missing = resolved.missingKeys.join(',');
    if (this.host.isConnected) {
      this.host.setAttribute('data-tp-presentation-owner', this.#id);
      const roots = new Map<Document | ShadowRoot, string[]>();
      for (const [part, elements] of this.#registered) {
        const partRoots = new Set([...elements].map((element) => element.getRootNode()));
        for (const root of partRoots) {
          if (!(root instanceof Document || root instanceof ShadowRoot)) continue;
          const rules = roots.get(root) ?? [];
          roots.set(root, rules);
          for (const rule of mergedParts[part] ?? []) {
            const target = `[data-tp-presentation-part~="${this.#id}-${part}"]`;
            let selector = rule.selector?.includes('&')
              ? rule.selector.replaceAll('&', target)
              : target + (rule.selector ?? '');
            // The owning component may be outside this shadow tree. Evaluate owner
            // conditions here; do not accidentally bind :host to the member's host.
            let applies = true;
            selector = selector
              .replace(/:host\(([^)]+)\)/g, (_match, condition: string) => {
                applies &&= this.host.matches(condition);
                return '';
              })
              .replace(/:host\b/g, '');
            if (applies)
              rules.push(`${selector.trim()}{${serializeDeclarations(rule.declarations)}}`);
          }
        }
      }
      for (const [root, style] of this.#registeredStyles)
        if (!roots.has(root)) {
          style.remove();
          this.#registeredStyles.delete(root);
          if (root instanceof ShadowRoot) {
            const sheet = this.#registeredSheets.get(root);
            root.adoptedStyleSheets = root.adoptedStyleSheets.filter((entry) => entry !== sheet);
            this.#registeredSheets.delete(root);
          }
        }
      for (const [root, rules] of roots) {
        let style = this.#registeredStyles.get(root);
        if (!style) {
          style = this.host.ownerDocument.createElement('style');
          this.#registeredStyles.set(root, style);
        }
        const nativeCss = rules.join('\n');
        if (root instanceof ShadowRoot && 'adoptedStyleSheets' in root) {
          let sheet = this.#registeredSheets.get(root);
          if (!sheet) {
            sheet = new CSSStyleSheet();
            this.#registeredSheets.set(root, sheet);
            root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
          }
          if (style.textContent !== nativeCss) sheet.replaceSync(nativeCss);
          style.textContent = nativeCss;
          continue;
        }
        if (style.textContent !== nativeCss) style.textContent = nativeCss;
        const parent = root instanceof Document ? root.head : root;
        if (style.parentNode !== parent) parent.appendChild(style);
      }
    }
    if (missing && missing !== this.#lastMissing)
      this.host.dispatchEvent(
        new CustomEvent('tp-presentation-diagnostic', {
          detail: { component: definition.name, missingKeys: resolved.missingKeys },
          bubbles: true,
          composed: true,
        }),
      );
    this.#lastMissing = missing;
    this.#applyHooks();
  }
  #restoreHooks(): void {
    // Undo only values still owned by this adapter; preserve later consumer writes.
    for (const [element, hook] of this.#hooks) {
      for (const token of hook.classes) element.classList.remove(token);
      for (const [property, state] of hook.styles)
        if (element.style.getPropertyValue(property) === state.applied) {
          if (state.previous) element.style.setProperty(property, state.previous);
          else element.style.removeProperty(property);
        }
    }
    this.#hooks.clear();
  }
  #applyHooks(): void {
    this.#restoreHooks();
    const layers = [...(compositions.get(this.host)?.values() ?? []), this.host.partPresentation];
    for (const layer of layers)
      for (const [part, hook] of Object.entries(layer)) {
        if (!/^[a-z][a-z0-9-]*$/.test(part)) continue;
        for (const element of new Set([
          ...this.host.renderRoot.querySelectorAll<HTMLElement>(`[part~="${part}"]`),
          ...(this.#registered.get(part) ?? []),
        ])) {
          const classes = (hook.classHook ?? '')
            .split(/\s+/)
            .filter((token) => token && !element.classList.contains(token));
          element.classList.add(...classes);
          const existing = this.#hooks.get(element);
          const styles =
            existing?.styles ?? new Map<string, { previous: string; applied: string }>();
          for (const [property, value] of Object.entries(hook.styleHook ?? {})) {
            const previous =
              styles.get(property)?.previous ?? element.style.getPropertyValue(property);
            element.style.setProperty(property, String(value));
            styles.set(property, { previous, applied: element.style.getPropertyValue(property) });
          }
          this.#hooks.set(element, { classes: [...(existing?.classes ?? []), ...classes], styles });
        }
      }
  }
}
