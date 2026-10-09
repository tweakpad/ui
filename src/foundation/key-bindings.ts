import {
  KEY_OWNER_ATTRIBUTE,
  NAVIGATION_KEY_OWNER_SELECTOR,
  TYPEAHEAD_KEY_OWNER_SELECTOR,
  editableTargetInPath,
  interactiveTargetInPath,
  targetInPath,
} from './interactive-target.js';
import { componentHandlingPrevented } from './part.js';
import { CleanupScope } from './services.js';
// Shortcut notation is shared with the Key Hint control's display.
import {
  canonicalKeyName,
  keyHintNotation,
  keyHintPlatform,
  type KeyHintPlatform,
  type ResolvedKeyHintPlatform,
} from './key-notation.js';

/** The lowercased `KeyboardEvent.key` an authored key matches: aliases resolved, `Space` a space. */
function eventKeyName(key: string): string {
  const name = canonicalKeyName(key);
  return name === 'space' ? ' ' : name;
}

/**
 * Foundation `sec-1920-key-bindings`: one shared owner registers scoped shortcuts,
 * matches key patterns, guards editable/activatable/nested targets, arbitrates
 * between owners and publishes shortcut metadata.
 */

/** Explicit chord. Object chords match their modifiers exactly (no implied Shift/Alt). */
export interface KeyChordInit {
  key: string;
  ctrlKey?: boolean | undefined;
  metaKey?: boolean | undefined;
  altKey?: boolean | undefined;
  shiftKey?: boolean | undefined;
}

/** A pattern string (`Mod+Shift+f`, `Space`, `0-9`, `k, Space`), a chord or a list. */
export type KeyBindingKeys = string | KeyChordInit | readonly (string | KeyChordInit)[];

export interface KeyChord {
  /** Lowercased `KeyboardEvent.key` used for matching. */
  readonly key: string;
  /** Authored key spelling (`Space` for the space key) used for ARIA/display. */
  readonly label: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly altKey: boolean;
  readonly shiftKey: boolean;
  /** Whether Shift/Alt may be implied by a caseless character such as `>` or `?`. */
  readonly implicit: boolean;
  /** Source pattern, e.g. `0-9` for each expanded digit. */
  readonly pattern: string;
}

export type KeyBindingScope = 'owner' | 'document';

/**
 * Per-binding guard policy. The defaults implement the live contract; a migrated
 * consumer may retain its previous observable semantics through these options.
 */
export interface KeyBindingGuards {
  /** Ignore IME composition (`isComposing`, `Unidentified`). Default true. */
  composition?: boolean;
  /** Ignore Space/Enter on an interactive (activatable) target. Default true. */
  activation?: boolean;
  /**
   * Editable targets: `unmodified` (default) ignores bindings without modifiers,
   * `all` ignores every binding, `none` allows every binding.
   */
  editable?: 'unmodified' | 'all' | 'none';
  /** Ignore keys owned by nested composite widgets or `data-tp-owns-keys`. Default true. */
  composites?: boolean;
  /** Ignore keys claimed by a nested key-binding owner. Default true. */
  nestedOwners?: boolean;
}

export interface KeyBindingMatch {
  readonly chord: KeyChord;
  readonly action: string | undefined;
  readonly value: unknown;
  readonly scope: KeyBindingScope;
}

/** Return `false` to decline: the event is not prevented and lower-priority bindings run. */
export type KeyBindingHandler = (event: KeyboardEvent, match: KeyBindingMatch) => boolean | void;

export interface KeyBindingOptions {
  keys: KeyBindingKeys;
  handler: KeyBindingHandler;
  scope?: KeyBindingScope;
  disabled?: boolean | (() => boolean);
  /** Fire on auto-repeat while held. Default false (toggle actions must not repeat). */
  repeat?: boolean;
  /** Published action name used by `shortcut()`. */
  action?: string;
  /** Distinguishes bindings that share an action (e.g. seek forward/backward). */
  value?: unknown;
  guards?: KeyBindingGuards;
}

export interface KeyBindingOwnerOptions {
  /** Listen for `keydown` on the owner. When false, deliver events via `handleKeyDown`. */
  listen?: boolean;
  /** Owner disabled or interaction-locked. */
  disabled?: () => boolean;
  /** Consumer-specific nested ownership: true means the target owns this key. */
  ownsKey?: (event: KeyboardEvent) => boolean;
  /** Platform used for `Mod` and display notation. Default `auto`. */
  platform?: KeyHintPlatform;
  /** Dispatch `tp-shortcut-change` on the owner. Default true. */
  dispatch?: boolean;
  /** Dispose this owner with an enclosing lifetime. */
  scope?: CleanupScope;
}

export interface KeyShortcut {
  /** `aria-keyshortcuts` value, e.g. `Control+Shift+f` or `k Space`. */
  readonly aria: string;
  /** Display form for tooltips, e.g. `Ctrl+Shift+F` or `⇧⌘F` on macOS. */
  readonly display: string;
  /** Preferred chord as Key Hint `key` values, e.g. `['Control', 'Shift', 'F']`. */
  readonly keys: readonly string[];
}

export interface KeyBindingSummary {
  readonly action: string | undefined;
  readonly value: unknown;
  readonly scope: KeyBindingScope;
  readonly chords: readonly KeyChord[];
}

export class TpShortcutChangeEvent extends CustomEvent<{ owner: KeyBindingOwner }> {
  static readonly eventName = 'tp-shortcut-change';
  constructor(owner: KeyBindingOwner) {
    super(TpShortcutChangeEvent.eventName, {
      bubbles: true,
      composed: true,
      detail: { owner },
    });
  }
}

const MODIFIERS: Record<string, 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey' | 'mod'> = {
  ctrl: 'ctrlKey',
  control: 'ctrlKey',
  meta: 'metaKey',
  cmd: 'metaKey',
  command: 'metaKey',
  alt: 'altKey',
  option: 'altKey',
  shift: 'shiftKey',
  mod: 'mod',
};
const NAVIGATION_KEYS = new Set([
  'arrowup',
  'arrowdown',
  'arrowleft',
  'arrowright',
  'home',
  'end',
  'pageup',
  'pagedown',
]);

/** Split comma-separated patterns; a comma directly after `+` or alone is the key. */
function splitPatterns(input: string): string[] {
  const patterns: string[] = [];
  let current = '';
  for (const character of input) {
    if (character === ',' && current.trim() && !current.trimEnd().endsWith('+')) {
      patterns.push(current.trim());
      current = '';
    } else current += character;
  }
  if (current.trim()) patterns.push(current.trim());
  return patterns;
}

/** Parse one or more key patterns into chords. Throws on an empty key or unknown modifier. */
export function parseKeyPattern(input: string, platform: ResolvedKeyHintPlatform): KeyChord[] {
  const chords: KeyChord[] = [];
  for (const pattern of splitPatterns(input)) {
    let key: string;
    let prefix: string;
    if (pattern.endsWith('+') && (pattern.length === 1 || pattern.endsWith('++'))) {
      key = '+';
      prefix = pattern.slice(0, -2);
    } else {
      const index = pattern.lastIndexOf('+');
      key = pattern.slice(index + 1).trim();
      prefix = index < 0 ? '' : pattern.slice(0, index);
    }
    if (!key) throw new Error(`Invalid key pattern "${pattern}": missing key.`);
    const modifiers = { ctrlKey: false, metaKey: false, altKey: false, shiftKey: false };
    for (const segment of prefix ? prefix.split('+') : []) {
      const modifier = MODIFIERS[segment.trim().toLowerCase()];
      if (!modifier) throw new Error(`Invalid key pattern "${pattern}": unknown "${segment}".`);
      modifiers[modifier === 'mod' ? (platform === 'mac' ? 'metaKey' : 'ctrlKey') : modifier] =
        true;
    }
    const keys = key === '0-9' ? Array.from({ length: 10 }, (_, digit) => String(digit)) : [key];
    for (const match of keys)
      chords.push({
        key: eventKeyName(match),
        label: eventKeyName(match) === ' ' ? 'Space' : match,
        ...modifiers,
        implicit: true,
        pattern,
      });
  }
  return chords;
}

function chordsFor(keys: KeyBindingKeys, platform: ResolvedKeyHintPlatform): KeyChord[] {
  const list = typeof keys === 'string' || !Array.isArray(keys) ? [keys] : keys;
  return (list as readonly (string | KeyChordInit)[]).flatMap((entry) => {
    if (typeof entry === 'string') return parseKeyPattern(entry, platform);
    // An empty chord key is accepted and never matches (KeyboardEvent.key is never empty).
    if (typeof entry?.key !== 'string') throw new Error('Invalid key chord: missing key.');
    return [
      {
        key: eventKeyName(entry.key),
        label: entry.key === ' ' ? 'Space' : entry.key,
        ctrlKey: Boolean(entry.ctrlKey),
        metaKey: Boolean(entry.metaKey),
        altKey: Boolean(entry.altKey),
        shiftKey: Boolean(entry.shiftKey),
        implicit: false,
        pattern: entry.key,
      },
    ];
  });
}

const modifierCount = (chord: KeyChord): number =>
  Number(chord.ctrlKey) + Number(chord.metaKey) + Number(chord.altKey) + Number(chord.shiftKey);

/**
 * Whether a chord matches a keyboard event. Keys compare case-insensitively. For a
 * pattern chord whose event key is a caseless character (`>`, `?`, digits), Shift
 * and Alt count only when the chord asks for them, because layouts use them to
 * produce the character. Every other modifier must match exactly.
 */
export function matchesKeyChord(chord: KeyChord, event: KeyboardEvent): boolean {
  const key = event.key;
  if (typeof key !== 'string' || key === 'Unidentified' || key.toLowerCase() !== chord.key)
    return false;
  const implicit =
    chord.implicit && key.length === 1 && key.toLowerCase() === key.toUpperCase() && key !== ' ';
  const shiftKey = implicit ? Boolean(event.shiftKey) && chord.shiftKey : Boolean(event.shiftKey);
  const altKey = implicit ? Boolean(event.altKey) && chord.altKey : Boolean(event.altKey);
  return (
    shiftKey === chord.shiftKey &&
    altKey === chord.altKey &&
    Boolean(event.ctrlKey) === chord.ctrlKey &&
    Boolean(event.metaKey) === chord.metaKey
  );
}

/** Event already consumed (default or component handling prevented) or composing. */
export function keyEventPreempted(event: KeyboardEvent): boolean {
  return (
    event.defaultPrevented ||
    componentHandlingPrevented(event) ||
    Boolean(event.isComposing) ||
    event.key === 'Unidentified'
  );
}

/**
 * Whether a native text editor still owns an arrow/Home/End operation: it keeps
 * horizontal arrows until a collapsed caret reaches the matching edge (direction
 * aware), textarea vertical arrows until the first/last position, and every
 * modified or composing key. Composite owners (Toolbar) transfer focus only at an edge.
 */
export function editableOwnsNavigationKey(event: KeyboardEvent, element: HTMLElement): boolean {
  if (event.isComposing || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey)
    return true;
  if (!['input', 'textarea'].includes(element.localName)) return false;
  const input = element as HTMLInputElement | HTMLTextAreaElement;
  if (input.readOnly || input.disabled) return false;
  const start = input.selectionStart;
  const end = input.selectionEnd;
  if (start === null || end === null) {
    // Numeric/date/range editors own their native increment/decrement arrows.
    return event.key.startsWith('Arrow');
  }
  if (event.key === 'Home' || event.key === 'End') return true;
  if (start !== end) return event.key.startsWith('Arrow');
  const rtl = element.ownerDocument.defaultView?.getComputedStyle(element).direction === 'rtl';
  if (event.key === 'ArrowLeft') return rtl ? end < input.value.length : start > 0;
  if (event.key === 'ArrowRight') return rtl ? start > 0 : end < input.value.length;
  if (element.localName === 'textarea') {
    if (event.key === 'ArrowUp') return start > 0;
    if (event.key === 'ArrowDown') return end < input.value.length;
  }
  return false;
}

function explicitlyOwned(event: KeyboardEvent, boundary: EventTarget | null): boolean {
  const key = event.key.toLowerCase();
  for (const node of event.composedPath()) {
    if (node === boundary) return false;
    const value = (node as Element).getAttribute?.(KEY_OWNER_ATTRIBUTE);
    if (value === null || value === undefined) continue;
    const keys = value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!keys.length || keys.some((entry) => (entry === 'space' ? ' ' : entry) === key))
      return true;
  }
  return false;
}

/** Keys owned by a nested composite widget (slider, menu, list, editor) in the path. */
function compositeOwnsKey(event: KeyboardEvent, boundary: EventTarget | null): boolean {
  if (explicitlyOwned(event, boundary)) return true;
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  const key = event.key.toLowerCase();
  if (NAVIGATION_KEYS.has(key))
    return targetInPath(event, boundary, NAVIGATION_KEY_OWNER_SELECTOR) !== null;
  if (event.key.length === 1 && event.key !== ' ')
    return targetInPath(event, boundary, TYPEAHEAD_KEY_OWNER_SELECTOR) !== null;
  return false;
}

interface Binding {
  readonly id: number;
  readonly chords: readonly KeyChord[];
  readonly options: KeyBindingOptions;
}

const owners = new WeakMap<object, KeyBindingOwner>();
let bindingIds = 0;
let activitySequence = 0;

/** Per owner-document arbitration: only the most recently active owner handles. */
class DocumentRouter {
  readonly #owners = new Set<KeyBindingOwner>();
  readonly #document: EventTarget;
  #listening = false;
  constructor(document: EventTarget) {
    this.#document = document;
  }
  add(owner: KeyBindingOwner): void {
    this.#owners.add(owner);
    if (this.#listening) return;
    this.#listening = true;
    this.#document.addEventListener('keydown', this.#keyDown as EventListener);
  }
  delete(owner: KeyBindingOwner): void {
    this.#owners.delete(owner);
    if (this.#owners.size || !this.#listening) return;
    this.#listening = false;
    this.#document.removeEventListener('keydown', this.#keyDown as EventListener);
  }
  #keyDown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || componentHandlingPrevented(event)) return;
    // An inert (disabled/locked) most-recent owner still wins and then ignores the
    // event; an older owner never handles on its behalf.
    let selected: KeyBindingOwner | undefined;
    for (const owner of this.#owners) {
      if (!owner.hasMatchingBinding(event, 'document', true)) continue;
      if (!selected || owner.activity > selected.activity) selected = owner;
    }
    selected?.dispatch(event, 'document');
  };
}
const routers = new WeakMap<object, DocumentRouter>();

/**
 * One key-binding owner per owner element. Owner-scoped bindings listen on the
 * owner; document-scoped bindings are routed by the owner document to the most
 * recently active owner (pointerdown, focusin or keydown within it).
 */
export class KeyBindingOwner {
  readonly #host: EventTarget;
  readonly #options: KeyBindingOwnerOptions;
  readonly #scope = new CleanupScope();
  readonly #bindings: Binding[] = [];
  readonly #listeners = new Set<(owner: KeyBindingOwner) => void>();
  readonly #platform: ResolvedKeyHintPlatform;
  #router: DocumentRouter | undefined;
  #activity = 0;
  #locks = 0;
  #pending = false;
  #disposed = false;

  constructor(host: EventTarget, options: KeyBindingOwnerOptions = {}) {
    const existing = owners.get(host);
    if (existing && !existing.disposed)
      throw new Error('This element already has a KeyBindingOwner.');
    owners.set(host, this);
    this.#host = host;
    this.#options = options;
    const view = (host as Node).ownerDocument?.defaultView;
    this.#platform = keyHintPlatform(
      options.platform ?? 'auto',
      view?.navigator ?? (globalThis as { navigator?: Navigator }).navigator,
    );
    const active = () => {
      this.#activity = ++activitySequence;
    };
    for (const type of ['pointerdown', 'focusin', 'keydown'] as const)
      this.#scope.listen(host, type, active, { capture: true, passive: true });
    if (options.listen !== false)
      this.#scope.listen(host, 'keydown', (event) => this.dispatch(event, 'owner'));
    options.scope?.add(() => this.dispose());
  }

  /** The owner registered for an element, if any. */
  static for(host: EventTarget): KeyBindingOwner | undefined {
    const owner = owners.get(host);
    return owner && !owner.disposed ? owner : undefined;
  }

  get host(): EventTarget {
    return this.#host;
  }
  get disposed(): boolean {
    return this.#disposed;
  }
  /** Platform resolved for `Mod` and display notation. */
  get platform(): ResolvedKeyHintPlatform {
    return this.#platform;
  }
  /** Monotonic activity stamp used for document routing (0 = never active). */
  get activity(): number {
    return this.#activity;
  }
  /** Whether the owner is disabled or interaction-locked. */
  get inert(): boolean {
    return this.#locks > 0 || Boolean(this.#options.disabled?.());
  }

  /** Lock interactions (e.g. while a container-modal surface owns the owner). */
  lock(): () => void {
    this.#locks++;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.#locks--;
    };
  }

  register(options: KeyBindingOptions): () => void {
    if (this.#disposed) return () => undefined;
    const binding: Binding = {
      id: ++bindingIds,
      chords: chordsFor(options.keys, this.#platform),
      options: { ...options },
    };
    this.#bindings.push(binding);
    if (options.scope === 'document') this.#documentRouter()?.add(this);
    this.#changed();
    let removed = false;
    return () => {
      if (removed) return;
      removed = true;
      const index = this.#bindings.indexOf(binding);
      if (index < 0) return;
      this.#bindings.splice(index, 1);
      if (!this.#bindings.some((entry) => entry.options.scope === 'document'))
        this.#router?.delete(this);
      this.#changed();
    };
  }

  /** Deliver an owner-scope keydown (used when `listen` is false). */
  handleKeyDown(event: KeyboardEvent): boolean {
    return this.dispatch(event, 'owner');
  }

  /** Run guards and the highest-priority matching binding for one scope. */
  dispatch(event: KeyboardEvent, scope: KeyBindingScope): boolean {
    if (this.#disposed || event.defaultPrevented || componentHandlingPrevented(event)) return false;
    if (this.inert) return false;
    const candidates = this.#candidates(event, scope).filter(
      ({ binding }) => !event.repeat || binding.options.repeat === true,
    );
    if (!candidates.length || this.#options.ownsKey?.(event)) return false;
    const boundary = this.#host;
    const memo = new Map<string, boolean>();
    const once = (name: string, test: () => boolean): boolean => {
      if (!memo.has(name)) memo.set(name, test());
      return memo.get(name)!;
    };
    for (const { binding, chord } of candidates) {
      const guards = binding.options.guards ?? {};
      if (guards.composition !== false && (event.isComposing || event.key === 'Unidentified'))
        continue;
      if (
        guards.activation !== false &&
        (event.key === ' ' || event.key === 'Enter') &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        once('activation', () => interactiveTargetInPath(event, boundary as Element))
      )
        continue;
      const editable = guards.editable ?? 'unmodified';
      if (
        editable !== 'none' &&
        (editable === 'all' || modifierCount(chord) === 0) &&
        once('editable', () => editableTargetInPath(event))
      )
        continue;
      if (guards.composites !== false && once('composite', () => compositeOwnsKey(event, boundary)))
        continue;
      if (guards.nestedOwners !== false && once('nested', () => this.#nestedClaim(event))) continue;
      const result = binding.options.handler(event, {
        chord,
        action: binding.options.action,
        value: binding.options.value,
        scope,
      });
      if (result === false) continue;
      event.preventDefault();
      return true;
    }
    return false;
  }

  /**
   * Whether an enabled binding of `scope` matches the event's key and modifiers. An
   * inert owner matches nothing unless `includeInert` is set (document arbitration).
   */
  hasMatchingBinding(event: KeyboardEvent, scope: KeyBindingScope, includeInert = false): boolean {
    if (this.#disposed || (!includeInert && this.inert)) return false;
    return this.#candidates(event, scope).length > 0;
  }

  /** Published shortcut for an action (and optional value), or undefined. */
  shortcut(action: string, value?: unknown): KeyShortcut | undefined {
    const bindings = this.#bindings.filter(
      (binding) =>
        binding.options.action === action &&
        (value === undefined || Object.is(binding.options.value, value)) &&
        this.#enabled(binding),
    );
    if (!bindings.length) return undefined;
    const aria = [
      ...new Set(bindings.flatMap((binding) => binding.chords.map((chord) => ariaChord(chord)))),
    ].join(' ');
    // The most recently registered binding is preferred: later registrations override.
    const preferred = bindings[bindings.length - 1]!;
    const chord = preferred.chords[0]!;
    const range = chord.pattern.endsWith('0-9');
    const keys = [...this.#modifierTokens(chord), range ? '0-9' : displayKey(chord.label)];
    const text = keys.map((key) =>
      key === '0-9' || key.length === 1 ? key : keyHintNotation(key, this.#platform).text,
    );
    return {
      aria,
      display: this.#platform === 'mac' ? text.join('') : text.join('+'),
      keys,
    };
  }

  /** Snapshot of the registered bindings in registration order. */
  list(): readonly KeyBindingSummary[] {
    return this.#bindings.map((binding) => ({
      action: binding.options.action,
      value: binding.options.value,
      scope: binding.options.scope ?? 'owner',
      chords: binding.chords,
    }));
  }

  /** Observe binding changes. Notifications are coalesced to one per microtask. */
  subscribe(listener: (owner: KeyBindingOwner) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  /** Re-publish after an external `disabled` predicate changed. */
  refresh(): void {
    this.#changed();
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#bindings.length = 0;
    this.#router?.delete(this);
    this.#scope.dispose();
    this.#listeners.clear();
    if (owners.get(this.#host) === this) owners.delete(this.#host);
  }

  #enabled(binding: Binding): boolean {
    const disabled = binding.options.disabled;
    return !(typeof disabled === 'function' ? disabled() : disabled);
  }

  #candidates(event: KeyboardEvent, scope: KeyBindingScope) {
    const matches: { binding: Binding; chord: KeyChord }[] = [];
    for (const binding of this.#bindings) {
      if ((binding.options.scope ?? 'owner') !== scope || !this.#enabled(binding)) continue;
      const chord = binding.chords
        .filter((entry) => matchesKeyChord(entry, event))
        .sort((a, b) => modifierCount(b) - modifierCount(a))[0];
      if (chord) matches.push({ binding, chord });
    }
    // More modifiers win; ties keep registration order (stable sort).
    return matches.sort((a, b) => modifierCount(b.chord) - modifierCount(a.chord));
  }

  #nestedClaim(event: KeyboardEvent): boolean {
    for (const node of event.composedPath()) {
      if (node === this.#host) return false;
      const owner = owners.get(node);
      if (owner && owner !== this && owner.hasMatchingBinding(event, 'owner')) return true;
    }
    return false;
  }

  #documentRouter(): DocumentRouter | undefined {
    if (this.#router) return this.#router;
    const document = (this.#host as Node).ownerDocument;
    if (!document) return undefined;
    let router = routers.get(document);
    if (!router) routers.set(document, (router = new DocumentRouter(document)));
    return (this.#router = router);
  }

  #modifierTokens(chord: KeyChord): string[] {
    const order: [keyof KeyChord, string][] =
      this.#platform === 'mac'
        ? [
            ['ctrlKey', 'Control'],
            ['altKey', 'Alt'],
            ['shiftKey', 'Shift'],
            ['metaKey', 'Meta'],
          ]
        : [
            ['ctrlKey', 'Control'],
            ['shiftKey', 'Shift'],
            ['altKey', 'Alt'],
            ['metaKey', 'Meta'],
          ];
    return order.filter(([flag]) => chord[flag]).map(([, name]) => name);
  }

  #changed(): void {
    if (this.#disposed || this.#pending) return;
    this.#pending = true;
    queueMicrotask(() => {
      this.#pending = false;
      if (this.#disposed) return;
      for (const listener of [...this.#listeners]) listener(this);
      if (this.#options.dispatch !== false)
        this.#host.dispatchEvent(new TpShortcutChangeEvent(this));
    });
  }
}

function ariaChord(chord: KeyChord): string {
  const parts: string[] = [];
  if (chord.ctrlKey) parts.push('Control');
  if (chord.shiftKey) parts.push('Shift');
  if (chord.altKey) parts.push('Alt');
  if (chord.metaKey) parts.push('Meta');
  parts.push(chord.label);
  return parts.join('+');
}

function displayKey(label: string): string {
  return label.length === 1 ? label.toUpperCase() : label;
}
