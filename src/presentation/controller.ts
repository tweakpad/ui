import { GeneratedStyleResource, styleText } from '../foundation/generated-style.js';
import type {
  CSSResultGroup,
  ReactiveController,
  ReactiveControllerHost,
  RenderOptions,
} from 'lit';
import { inheritedRootTag, presentationFamilyFor, type PresentationFamily } from './family.js';
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
const controllers = new WeakMap<HTMLElement, PresentationController>();
/** Hook classes and styles this adapter wrote to an element, to undo exactly those. */
interface AppliedHooks {
  classes: Set<string>;
  styles: Map<string, { previous: string; applied: string; value: string }>;
}
let registrationId = 0;
const isDocument = (node: Node): node is Document => node.nodeType === 9;
/** A rule's selector bound to its part target; an ampersand in the rule stands for the target. */
const selectorFor = (rule: PresentationRule, target: string): string =>
  rule.selector?.includes('&')
    ? rule.selector.replaceAll('&', target)
    : target + (rule.selector ?? '');
const ruleCss = (rule: PresentationRule, selector: string): string =>
  `${selector}{${serializeDeclarations(rule.declarations)}}`;
const isShadowRoot = (node: Node): node is ShadowRoot => node.nodeType === 11 && 'host' in node;

/** One resolved recipe: merged part rules and their shadow-root CSS. Pure, so instances share it. */
interface Recipe {
  readonly parts: Readonly<Record<string, readonly PresentationRule[]>>;
  readonly css: string;
  readonly missingKeys: readonly string[];
  /** The `:host(...)` conditions of each part's rules, evaluated against the owner. */
  readonly conditions: Map<string, readonly string[]>;
}
// Keyed by family, then dictionary (the family itself stands for its own appearance), then the
// member families and axis values; a replaced dictionary releases its recipes.
const recipes = new WeakMap<PresentationFamily, WeakMap<object, Map<string, Recipe>>>();
const familyIds = new WeakMap<PresentationFamily, number>();
let familyCount = 0;
const familyId = (family: PresentationFamily): number => {
  let id = familyIds.get(family);
  if (id === undefined) familyIds.set(family, (id = ++familyCount));
  return id;
};
function recipeFor(
  family: PresentationFamily,
  members: readonly PresentationFamily[],
  custom: PresentationDictionary | undefined,
  axes: Record<string, unknown>,
): Recipe {
  let dictionaries = recipes.get(family);
  if (!dictionaries) recipes.set(family, (dictionaries = new WeakMap()));
  let cached = dictionaries.get(custom ?? family);
  if (!cached) dictionaries.set(custom ?? family, (cached = new Map()));
  const key = JSON.stringify([
    members.map(familyId),
    Object.values(axes).map((value) => (value === undefined ? { unset: true } : value)),
  ]);
  let recipe = cached.get(key);
  if (!recipe) cached.set(key, (recipe = resolveRecipe(family, members, custom, axes)));
  return recipe;
}
function resolveRecipe(
  family: PresentationFamily,
  members: readonly PresentationFamily[],
  custom: PresentationDictionary | undefined,
  axes: Record<string, unknown>,
): Recipe {
  let resolved = resolveComponentPresentation(family.definition, axes, custom ?? family.appearance);
  const structures: PresentationDictionary[] = [family.structure];
  for (const member of members) {
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
  const parts = Object.fromEntries(
    Object.entries(resolved.parts).map(([part, rules]) => [
      part,
      [
        ...rules,
        ...structures.flatMap((structure): readonly PresentationRule[] => structure[part] ?? []),
      ],
    ]),
  );
  const css = Object.entries(parts)
    .flatMap(([part, rules]) =>
      rules.map((rule) => ruleCss(rule, selectorFor(rule, `[part~="${part}"]`))),
    )
    .join('\n');
  const conditions = new Map(
    Object.entries(parts).map(([part, rules]) => [
      part,
      rules.flatMap((rule) =>
        [...selectorFor(rule, '').matchAll(/:host\(([^)]+)\)/g)].map((match) => match[1]!),
      ),
    ]),
  );
  return { parts, css, missingKeys: resolved.missingKeys, conditions };
}
// A `[part~="x"]` binding to `x` matches only elements that already carry the part.
const shadowBindings = new WeakMap<Record<string, string>, readonly [string, string][]>();
function bindingEntries(set: Record<string, string>, shadow: boolean): readonly [string, string][] {
  if (!shadow) return Object.entries(set);
  let entries = shadowBindings.get(set);
  if (!entries)
    shadowBindings.set(
      set,
      (entries = Object.entries(set).filter(
        ([selector, part]) => selector !== `[part~="${part}"]`,
      )),
    );
  return entries;
}

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
  // Compositions only feed the hook pass, so the host repaints its hooks without re-rendering.
  const controller = controllers.get(host);
  if (controller) controller.requestRefresh();
  else host.requestUpdate();
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
  /** Inputs of the last style pass; an update with the same inputs skips it. */
  #signature: readonly unknown[] = [];
  #registrations = 0;
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
  #hooks = new Map<HTMLElement, AppliedHooks>();
  constructor(private host: Host) {
    host.addController(this);
    controllers.set(host, this);
  }
  /** Re-applies recipes and hooks after this update, without requesting a host render. */
  requestRefresh(): void {
    this.#scheduleRefresh();
  }
  /** Lit's structural styles must belong to the document of first connection too. */
  createRenderRoot(): ShadowRoot {
    const options = (this.host.constructor as { shadowRootOptions?: ShadowRootInit })
      .shadowRootOptions;
    const root = this.host.shadowRoot ?? this.host.attachShadow(options ?? { mode: 'open' });
    if (!this.#structuralResource) {
      this.#structuralResource = new GeneratedStyleResource(this.host, root);
      const styles =
        (this.host.constructor as { elementStyles?: CSSResultGroup }).elementStyles ?? [];
      this.#structuralResource.setText(styleText(styles));
    }
    // This boundary survives nonce changes, suppression, and document adoption.
    this.host.renderOptions.renderBefore ??= this.#structuralResource.boundary;
    return root;
  }
  /** Register consumer-owned native parts without wrapping or replacing them. */
  #references = new Map<
    string,
    { ref: (element: HTMLElement | null) => void; element: HTMLElement | null }
  >();
  /**
   * A stable ref callback for a rendered part: it tracks the element under `key`, registers it
   * as the presentation part `part` (resolved per call when a function) while it is mounted, and
   * reports replacements to `commit`. Identity is stable per key, so templates stay cacheable.
   */
  partReference(
    key: string,
    part?: string | (() => string | undefined),
    commit?: (element: HTMLElement | null) => void,
  ): (element: HTMLElement | null) => void {
    let entry = this.#references.get(key);
    if (!entry) {
      let release: (() => void) | undefined;
      const record: { element: HTMLElement | null; ref: (element: HTMLElement | null) => void } = {
        element: null,
        ref: () => {},
      };
      record.ref = (element) => {
        if (element === record.element) return;
        release?.();
        release = undefined;
        record.element = element;
        const name = typeof part === 'function' ? part() : part;
        if (element && name) release = this.registerPart(name, element);
        commit?.(element);
      };
      entry = record;
      this.#references.set(key, entry);
    }
    return entry.ref;
  }
  /** The element currently mounted for a `partReference` key. */
  partElement(key: string): HTMLElement | null {
    return this.#references.get(key)?.element ?? null;
  }
  /** Forgets an unmounted reference (a removed collection item); `false` while still mounted. */
  dropReference(key: string): boolean {
    const entry = this.#references.get(key);
    if (!entry || entry.element) return !entry;
    this.#references.delete(key);
    return true;
  }
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
    this.#registrations++;
    this.#scheduleRefresh();
    return () => {
      members.delete(element);
      this.#registrations++;
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
    this.#update(false);
  }
  /** Re-resolves and rewrites everything, including after structure changed outside an update. */
  refresh(): void {
    this.#update(true);
  }
  #update(force: boolean): void {
    // A public constituent consumes its family's definition and dictionary, not
    // a second visual catalog identity. A class that extends a family's root element under
    // another tag (a Navigation panel button, a Select action) also inherits the root's
    // bindings; a constituent (a radio item, a map pin) binds only its own tag.
    const constructor = this.host.constructor as {
      presentation?: PresentationFamily;
      presentationFamilies?: readonly PresentationFamily[];
    };
    const familyTag = constructor.presentation?.definition.tagName;
    const inheritedTag = this.host.presentationTagName ?? inheritedRootTag(constructor, familyTag);
    const definitionTag = inheritedTag ?? familyTag ?? this.host.localName;
    // Each element carries its own family; no catalog-wide registry is consulted.
    const family = presentationFamilyFor(this.host, definitionTag);
    if (!family || !this.host.renderRoot) return;
    const definition = family.definition;
    // A reused control can expose its compound's canonical parts through this same
    // controller, keeping recipe and terminal hook ownership together: member families
    // bind this element's own tag and contribute their structure and appearance.
    const familyTags =
      this.host.presentationFamilyTagNames ??
      constructor.presentationFamilies?.map((member) => member.definition.tagName) ??
      [];
    const members = familyTags.flatMap((tagName) => {
      const member = presentationFamilyFor(this.host, tagName);
      return member ? [member] : [];
    });
    const shadow = isShadowRoot(this.host.renderRoot);
    const bindings = [
      family.bindings[this.host.localName] ??
        (inheritedTag ? family.bindings[inheritedTag] : undefined) ??
        {},
      ...members.map((member) => member.bindings[this.host.localName] ?? {}),
    ];
    const lightParts = new Map<HTMLElement, Map<string, boolean>>();
    for (const [selector, part] of bindings.flatMap((set) => bindingEntries(set, shadow))) {
      if (selector === ':host') {
        if (!this.host.part.contains(part)) this.host.part.add(part);
        if (!this.#hostParts.has(part))
          this.#hostParts.set(part, this.registerPart(part, this.host));
      } else
        for (const element of this.host.renderRoot.querySelectorAll<HTMLElement>(selector)) {
          const authoredPart = element.part.contains(part);
          if (!authoredPart) element.part.add(part);
          if (!shadow) {
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
    const axes = Object.fromEntries(
      (definition.axes ?? []).map((axis) => [
        axis.name,
        (this.host.presentationOwner as unknown as Record<string, unknown> | null | undefined)?.[
          axis.name
        ] ?? (this.host as unknown as Record<string, unknown>)[axis.name],
      ]),
    );
    const recipe = recipeFor(family, members, dictionaries.get(this.host.ownerDocument), axes);
    const signature = this.#signatureOf(recipe);
    if (
      force ||
      signature.length !== this.#signature.length ||
      signature.some((value, index) => value !== this.#signature[index])
    ) {
      this.#signature = signature;
      this.#writeStyles(recipe, definition.name);
    }
    this.#applyHooks();
  }
  /** Everything the style pass reads besides the recipe: registered parts, their roots, owner state. */
  #signatureOf(recipe: Recipe): unknown[] {
    const signature: unknown[] = [recipe, this.host.isConnected, this.#registrations];
    if (this.host.isConnected)
      for (const [part, elements] of this.#registered) {
        if (!elements.size) continue;
        for (const element of elements) signature.push(element.getRootNode());
        for (const condition of recipe.conditions.get(part) ?? [])
          signature.push(this.host.matches(condition));
      }
    return signature;
  }
  #writeStyles(recipe: Recipe, component: string): void {
    if (isShadowRoot(this.host.renderRoot)) {
      if (!this.#recipeResource) {
        this.#recipeResource = new GeneratedStyleResource(this.host, this.host.renderRoot);
        // An update that runs after the removal creates it without a policy subscription, which
        // would hold the removed element for good; the reconnection subscribes (`hostConnected`).
        if (!this.host.isConnected) this.#recipeResource.disconnect();
      }
      this.#recipeResource.setText(recipe.css);
    }
    const missing = recipe.missingKeys.join(',');
    if (this.host.isConnected) {
      if (this.host.getAttribute('data-tp-presentation-owner') !== this.#id)
        this.host.setAttribute('data-tp-presentation-owner', this.#id);
      const roots = new Map<Document | ShadowRoot, string[]>();
      for (const [part, elements] of this.#registered) {
        const partRoots = new Set([...elements].map((element) => element.getRootNode()));
        for (const root of partRoots) {
          if (!(isDocument(root) || isShadowRoot(root))) continue;
          const rules = roots.get(root) ?? [];
          roots.set(root, rules);
          for (const rule of recipe.parts[part] ?? []) {
            // The owning component may be outside this shadow tree. Evaluate owner
            // conditions here; do not accidentally bind :host to the member's host.
            let applies = true;
            const selector = selectorFor(rule, `[data-tp-presentation-part~="${this.#id}-${part}"]`)
              .replace(/:host\(([^)]+)\)/g, (_match, condition: string) => {
                applies &&= this.host.matches(condition);
                return '';
              })
              .replace(/:host\b/g, '');
            if (applies) rules.push(ruleCss(rule, selector.trim()));
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
          detail: { component, missingKeys: recipe.missingKeys },
          bubbles: true,
          composed: true,
        }),
      );
    this.#lastMissing = missing;
  }
  #restoreHooks(): void {
    // Undo only values still owned by this adapter; preserve later consumer writes.
    for (const [element, hook] of this.#hooks) this.#undoHooks(element, hook);
    this.#hooks.clear();
  }
  #undoHooks(element: HTMLElement, hook: AppliedHooks, keep?: AppliedHooks): void {
    for (const token of hook.classes)
      if (!keep?.classes.has(token) && element.classList.contains(token))
        element.classList.remove(token);
    for (const [property, state] of hook.styles)
      if (
        !keep?.styles.has(property) &&
        element.style.getPropertyValue(property) === state.applied
      ) {
        if (state.previous) element.style.setProperty(property, state.previous);
        else element.style.removeProperty(property);
      }
  }
  /** Brings hook classes and styles to what the layers ask for, writing only the differences. */
  #applyHooks(): void {
    const wanted = new Map<HTMLElement, { classes: Set<string>; styles: Map<string, string> }>();
    const layers = [...(compositions.get(this.host)?.values() ?? []), this.host.partPresentation];
    for (const layer of layers)
      for (const [part, hook] of Object.entries(layer)) {
        if (!/^[a-z][a-z0-9-]*$/.test(part)) continue;
        for (const element of new Set([
          ...this.host.renderRoot.querySelectorAll<HTMLElement>(`[part~="${part}"]`),
          ...(this.#registered.get(part) ?? []),
        ])) {
          let entry = wanted.get(element);
          if (!entry) wanted.set(element, (entry = { classes: new Set(), styles: new Map() }));
          for (const token of (hook.classHook ?? '').split(/\s+/))
            if (token) entry.classes.add(token);
          for (const [property, value] of Object.entries(hook.styleHook ?? {}))
            entry.styles.set(property, String(value));
        }
      }
    if (!wanted.size && !this.#hooks.size) return;
    const applied = new Map<HTMLElement, AppliedHooks>();
    for (const [element, next] of wanted) {
      const previous = this.#hooks.get(element);
      const hook: AppliedHooks = { classes: new Set(), styles: new Map() };
      for (const token of next.classes)
        if (previous?.classes.has(token)) {
          hook.classes.add(token);
          if (!element.classList.contains(token)) element.classList.add(token);
        } else if (!element.classList.contains(token)) {
          // A class the element already had is not the hook's to remove later.
          element.classList.add(token);
          hook.classes.add(token);
        }
      for (const [property, value] of next.styles) {
        const state = previous?.styles.get(property);
        if (
          state &&
          state.value === value &&
          element.style.getPropertyValue(property) === state.applied
        ) {
          hook.styles.set(property, state);
          continue;
        }
        const before = state?.previous ?? element.style.getPropertyValue(property);
        element.style.setProperty(property, value);
        hook.styles.set(property, {
          previous: before,
          applied: element.style.getPropertyValue(property),
          value,
        });
      }
      applied.set(element, hook);
    }
    for (const [element, hook] of this.#hooks) this.#undoHooks(element, hook, applied.get(element));
    this.#hooks = applied;
  }
}
