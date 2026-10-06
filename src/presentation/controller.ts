import { GeneratedStyleResource } from '../foundation/generated-style.js';
import type { ReactiveController, ReactiveControllerHost, RenderOptions } from 'lit';
import { presentationFamilyFor } from './family.js';
import { resolveComponentPresentation, serializeDeclarations } from './resolver.js';
import type { PartPresentation, PresentationDictionary, PresentationRule } from './resolver.js';

type Host = HTMLElement &
  ReactiveControllerHost & {
    renderRoot: HTMLElement | DocumentFragment;
    renderOptions: RenderOptions;
    partPresentation: PartPresentation;
    readonly presentationTagName?: string;
    readonly presentationOwner?: HTMLElement | null;
    readonly presentationFamilyTagNames?: readonly string[];
  };
const dictionaries = new WeakMap<Document, PresentationDictionary>();
const subscribers = new WeakMap<Document, Set<PresentationController>>();
const compositions = new WeakMap<HTMLElement, Map<object, PartPresentation>>();
let registrationId = 0;
const isDocument = (node: Node): node is Document => node.nodeType === 9;
const isShadowRoot = (node: Node): node is ShadowRoot => node.nodeType === 11 && 'host' in node;

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
  #registeredResources = new Map<Document | ShadowRoot, GeneratedStyleResource>();
  #recipeResource?: GeneratedStyleResource;
  #structuralResource?: GeneratedStyleResource;
  #document?: Document;
  #lastMissing = '';
  #refreshQueued = false;
  #hostParts = new Map<string, () => void>();
  #lightParts = new Map<HTMLElement, Map<string, () => void>>();
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
  /** Lit's structural styles must belong to the document of first connection too. */
  createRenderRoot(): ShadowRoot {
    const options = (this.host.constructor as { shadowRootOptions?: ShadowRootInit })
      .shadowRootOptions;
    const root = this.host.shadowRoot ?? this.host.attachShadow(options ?? { mode: 'open' });
    if (!this.#structuralResource) {
      this.#structuralResource = new GeneratedStyleResource(this.host, root);
      const styles =
        (
          this.host.constructor as {
            elementStyles?: ReadonlyArray<{ cssText?: string; cssRules?: CSSRuleList }>;
          }
        ).elementStyles ?? [];
      this.#structuralResource.setText(
        styles
          .map(
            (result) =>
              result.cssText ?? [...(result.cssRules ?? [])].map((rule) => rule.cssText).join('\n'),
          )
          .join('\n'),
      );
    }
    // This boundary survives nonce changes, suppression, and document adoption.
    this.host.renderOptions.renderBefore ??= this.#structuralResource.boundary;
    return root;
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
    if (this.#document && this.#document !== this.host.ownerDocument) this.host.requestUpdate();
    this.#structuralResource?.connect();
    this.#recipeResource?.connect();
    this.#document = this.host.ownerDocument;
    let listeners = subscribers.get(this.#document);
    if (!listeners) subscribers.set(this.#document, (listeners = new Set()));
    listeners.add(this);
    // Projection can reconnect an unchanged element without another Lit update.
    this.#scheduleRefresh();
  }
  hostDisconnected(): void {
    if (this.#document) subscribers.get(this.#document)?.delete(this);
    this.#structuralResource?.disconnect();
    this.#recipeResource?.disconnect();
    for (const resource of this.#registeredResources.values()) resource.dispose();
    this.#registeredResources.clear();
    for (const parts of this.#lightParts.values()) for (const cleanup of parts.values()) cleanup();
    this.#lightParts.clear();
    this.#restoreHooks();
  }
  hostUpdated(): void {
    this.refresh();
  }
  refresh(): void {
    // A public constituent consumes its family's definition and dictionary, not
    // a second visual catalog identity.
    const inheritedTag =
      this.host.presentationTagName ??
      (this.host.constructor as { presentationTagName?: string }).presentationTagName;
    const definitionTag =
      inheritedTag ??
      (this.host.localName === 'tp-radio-group-item'
        ? 'tp-radio-group'
        : this.host.localName === 'tp-slider-thumb'
          ? 'tp-slider'
          : this.host.localName);
    // Each element carries its own family; no catalog-wide registry is consulted.
    const family = presentationFamilyFor(this.host, definitionTag);
    if (!family || !this.host.renderRoot) return;
    const definition = family.definition;
    const lightParts = new Map<HTMLElement, Map<string, boolean>>();
    for (const [selector, part] of Object.entries(
      family.bindings[this.host.localName] ??
        family.bindings[inheritedTag ?? this.host.localName] ??
        {},
    )) {
      if (selector === ':host') {
        this.host.part.add(part);
        if (!this.#hostParts.has(part))
          this.#hostParts.set(part, this.registerPart(part, this.host));
      } else
        for (const element of this.host.renderRoot.querySelectorAll<HTMLElement>(selector)) {
          const authoredPart = element.part.contains(part);
          element.part.add(part);
          if (!isShadowRoot(this.host.renderRoot)) {
            const names = lightParts.get(element) ?? new Map<string, boolean>();
            names.set(part, authoredPart);
            lightParts.set(element, names);
          }
        }
    }
    // Light-DOM parts need the same scoped, policy-aware resource transport as
    // explicitly registered native parts; bare part names are not CSS scopes.
    for (const [element, parts] of this.#lightParts) {
      for (const [name, cleanup] of parts)
        if (!lightParts.get(element)?.has(name)) {
          cleanup();
          parts.delete(name);
        }
      if (!parts.size) this.#lightParts.delete(element);
    }
    for (const [element, names] of lightParts) {
      const parts = this.#lightParts.get(element) ?? new Map<string, () => void>();
      for (const [name, authoredPart] of names)
        if (!parts.has(name)) {
          const unregister = this.registerPart(name, element);
          parts.set(name, () => {
            unregister();
            if (!authoredPart) element.part.remove(name);
          });
        }
      this.#lightParts.set(element, parts);
    }
    const custom = dictionaries.get(this.host.ownerDocument);
    const dictionary = custom ?? family.appearance;
    const axes = Object.fromEntries(
      (definition.axes ?? []).map((axis) => [
        axis.name,
        (
          (this.host.presentationOwner ??
            (this.host.localName === 'tp-radio-group-item'
              ? this.host.closest('tp-radio-group')
              : null)) as unknown as Record<string, unknown> | null
        )?.[axis.name] ?? (this.host as unknown as Record<string, unknown>)[axis.name],
      ]),
    );
    let resolved = resolveComponentPresentation(definition, axes, dictionary);
    // A reused control can expose its compound's canonical parts through this
    // same controller, keeping recipe and terminal hook ownership together.
    const familyTags =
      this.host.presentationFamilyTagNames ??
      (this.host.constructor as { presentationFamilyTagNames?: readonly string[] })
        .presentationFamilyTagNames ??
      [];
    const structures: PresentationDictionary[] = [family.structure];
    for (const tagName of familyTags) {
      const member = presentationFamilyFor(this.host, tagName);
      if (!member) continue;
      structures.push(member.structure);
      const contribution = resolveComponentPresentation(
        member.definition,
        axes,
        custom ?? member.appearance,
      );
      resolved = {
        parts: { ...resolved.parts, ...contribution.parts },
        missingKeys: [...new Set([...resolved.missingKeys, ...contribution.missingKeys])],
      };
    }
    const mergedParts = Object.fromEntries(
      Object.entries(resolved.parts).map(([part, rules]) => [
        part,
        [
          ...rules,
          ...structures.flatMap((structure): readonly PresentationRule[] => structure[part] ?? []),
        ],
      ]),
    );
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
    if (isShadowRoot(this.host.renderRoot)) {
      this.#recipeResource ??= new GeneratedStyleResource(this.host, this.host.renderRoot);
      this.#recipeResource.setText(css);
    }
    const missing = resolved.missingKeys.join(',');
    if (this.host.isConnected) {
      this.host.setAttribute('data-tp-presentation-owner', this.#id);
      const roots = new Map<Document | ShadowRoot, string[]>();
      for (const [part, elements] of this.#registered) {
        const partRoots = new Set([...elements].map((element) => element.getRootNode()));
        for (const root of partRoots) {
          if (!(isDocument(root) || isShadowRoot(root))) continue;
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
      for (const [root, resource] of this.#registeredResources)
        if (!roots.has(root)) {
          resource.dispose();
          this.#registeredResources.delete(root);
        }
      for (const [root, rules] of roots) {
        let resource = this.#registeredResources.get(root);
        if (!resource) {
          resource = new GeneratedStyleResource(this.host, root);
          this.#registeredResources.set(root, resource);
        }
        resource.setText(rules.join('\n'));
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
