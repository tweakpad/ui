import { ObservableStore } from './store.js';
import type { ChangeReason } from './types.js';

/** A color scheme preference; `system` follows the device. */
export type ColorSchemePreference = 'light' | 'dark' | 'system';
export type ResolvedColorScheme = 'light' | 'dark';

export interface ColorSchemeState {
  readonly preference: ColorSchemePreference;
  readonly resolved: ResolvedColorScheme;
}

export interface ColorSchemeStoreOptions {
  /** Local storage key for the preference; `null` disables persistence. */
  storageKey?: string | null;
}

export interface ColorSchemeApplyOptions {
  /** Elements whose own motion keeps playing while the change suppresses transitions. */
  exempt?: readonly Element[];
}

export const DEFAULT_COLOR_SCHEME_STORAGE_KEY = 'tp-theme';
const preferences: readonly ColorSchemePreference[] = ['light', 'dark', 'system'];
const darkQuery = '(prefers-color-scheme: dark)';

export function isColorSchemePreference(value: unknown): value is ColorSchemePreference {
  return preferences.includes(value as ColorSchemePreference);
}

/** The scheme for a computed `color-scheme` value: dark only when dark wins. */
export function resolveColorScheme(colorScheme: string, prefersDark: boolean): ResolvedColorScheme {
  const values = colorScheme.split(/\s+/);
  if (!values.includes('dark')) return 'light';
  return !values.includes('light') || prefersDark ? 'dark' : 'light';
}

function readStored(view: Window | null, key: string | null): ColorSchemePreference | null {
  if (!view || key === null) return null;
  try {
    const value = view.localStorage.getItem(key);
    return isColorSchemePreference(value) ? value : null;
  } catch {
    return null;
  }
}

function writeStored(view: Window | null, key: string | null, value: ColorSchemePreference): void {
  if (!view || key === null) return;
  try {
    view.localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable (privacy modes, quotas); the preference still applies.
  }
}

/**
 * Writes a preference onto its target. `system` declares both schemes so the device decides, even
 * inside an ancestor that forces one scheme.
 */
function writeTarget(target: HTMLElement, preference: ColorSchemePreference): void {
  if (preference === 'system') {
    target.style.setProperty('color-scheme', 'light dark');
    target.removeAttribute('data-theme');
  } else {
    target.style.setProperty('color-scheme', preference);
    target.setAttribute('data-theme', preference);
  }
}

function resolveTarget(target: HTMLElement): ResolvedColorScheme {
  const view = target.ownerDocument.defaultView;
  const scheme = view?.getComputedStyle(target).colorScheme || 'normal';
  return resolveColorScheme(scheme, Boolean(view?.matchMedia?.(darkQuery).matches));
}

/**
 * Applies a scheme change in one frame: library motion scales to zero on the target and
 * document-tree transitions are disabled for a single style recalculation, so every color role
 * switches together. Exempt elements keep their resolved motion scale.
 */
function withoutTransitions(
  target: HTMLElement,
  exempt: readonly Element[],
  change: () => void,
): void {
  const document = target.ownerDocument;
  const view = document.defaultView;
  if (!view) {
    change();
    return;
  }
  const kept = exempt
    .filter((element): element is HTMLElement => 'style' in element)
    .map((element) => ({
      element,
      scale: view.getComputedStyle(element).getPropertyValue('--tp-motion-scale').trim() || '1',
      inline: element.style.getPropertyValue('--tp-motion-scale'),
    }));
  const inline = target.style.getPropertyValue('--tp-motion-scale');
  const suppress = document.createElement('style');
  suppress.textContent = '*,*::before,*::after{transition:none!important}';
  (document.head ?? document.documentElement).append(suppress);
  target.style.setProperty('--tp-motion-scale', '0');
  for (const { element, scale } of kept) element.style.setProperty('--tp-motion-scale', scale);
  try {
    change();
    // Flush the new scheme while transitions are off.
    void view.getComputedStyle(target).color;
  } finally {
    suppress.remove();
    if (inline) target.style.setProperty('--tp-motion-scale', inline);
    else target.style.removeProperty('--tp-motion-scale');
    for (const { element, inline: own } of kept)
      if (own) element.style.setProperty('--tp-motion-scale', own);
      else element.style.removeProperty('--tp-motion-scale');
  }
}

/**
 * The one preference owner for a (target, storage key) pair. Controls bound to the same pair
 * share it; it applies the preference, persists it, follows the device while on `system`, and
 * picks up changes made in other browsing contexts.
 */
export class ColorSchemeStore {
  readonly target: HTMLElement;
  readonly storageKey: string | null;
  readonly #store: ObservableStore<ColorSchemeState>;
  #users = 0;
  #media: MediaQueryList | null = null;
  #stored: boolean;

  constructor(target: HTMLElement, storageKey: string | null) {
    this.target = target;
    this.storageKey = storageKey;
    const stored = readStored(target.ownerDocument.defaultView, storageKey);
    this.#stored = stored !== null;
    // A pre-paint application leaves its preference on the target.
    const applied = target.getAttribute('data-theme');
    const preference = stored ?? (isColorSchemePreference(applied) ? applied : 'system');
    if (stored !== null) writeTarget(target, preference);
    this.#store = new ObservableStore({ preference, resolved: resolveTarget(target) });
  }

  get state(): ColorSchemeState {
    return this.#store.value;
  }
  get preference(): ColorSchemePreference {
    return this.#store.value.preference;
  }
  get resolved(): ResolvedColorScheme {
    return this.#store.value.resolved;
  }
  /** Whether a persisted preference existed or has been written since. */
  get stored(): boolean {
    return this.#stored;
  }

  set(
    preference: ColorSchemePreference,
    reason: ChangeReason = 'programmatic',
    options: ColorSchemeApplyOptions = {},
  ): boolean {
    if (!isColorSchemePreference(preference)) return false;
    const view = this.target.ownerDocument.defaultView;
    writeStored(view, this.storageKey, preference);
    if (this.storageKey !== null) this.#stored = true;
    if (preference === this.preference) return false;
    withoutTransitions(this.target, options.exempt ?? [], () =>
      writeTarget(this.target, preference),
    );
    return this.#publish(preference, reason);
  }

  subscribe(listener: (state: ColorSchemeState) => void): () => void {
    return this.#store.subscribe(({ value }) => listener(value));
  }

  /** Keeps device and storage listeners attached while any control uses this store. */
  retain(): () => void {
    if (this.#users++ === 0) this.#attach();
    let released = false;
    return () => {
      if (released) return;
      released = true;
      if (--this.#users === 0) this.#detach();
    };
  }

  #publish(preference: ColorSchemePreference, reason: ChangeReason): boolean {
    return this.#store.set({ preference, resolved: resolveTarget(this.target) }, reason);
  }

  #deviceChange = (): void => {
    const resolved = resolveTarget(this.target);
    if (resolved !== this.resolved) this.#store.set({ ...this.state, resolved }, 'programmatic');
  };

  #storageChange = (event: StorageEvent): void => {
    if (event.key !== this.storageKey || this.storageKey === null) return;
    const preference = isColorSchemePreference(event.newValue) ? event.newValue : 'system';
    if (preference === this.preference) return;
    withoutTransitions(this.target, [], () => writeTarget(this.target, preference));
    this.#publish(preference, 'programmatic');
  };

  #attach(): void {
    const view = this.target.ownerDocument.defaultView;
    if (!view) return;
    this.#media = view.matchMedia?.(darkQuery) ?? null;
    this.#media?.addEventListener('change', this.#deviceChange);
    view.addEventListener('storage', this.#storageChange);
  }

  #detach(): void {
    this.#media?.removeEventListener('change', this.#deviceChange);
    this.#media = null;
    this.target.ownerDocument.defaultView?.removeEventListener('storage', this.#storageChange);
  }
}

const stores = new WeakMap<HTMLElement, Map<string | null, ColorSchemeStore>>();

/** The shared store for a target (default: the document root) and storage key. */
export function colorSchemeStore(
  target: HTMLElement = document.documentElement,
  { storageKey = DEFAULT_COLOR_SCHEME_STORAGE_KEY }: ColorSchemeStoreOptions = {},
): ColorSchemeStore {
  let byKey = stores.get(target);
  if (!byKey) stores.set(target, (byKey = new Map()));
  let store = byKey.get(storageKey);
  if (!store) byKey.set(storageKey, (store = new ColorSchemeStore(target, storageKey)));
  return store;
}

/**
 * Applies the persisted preference before first paint, without rendering any component. Call it
 * from a module loaded in `<head>`, or inline its body as a classic script.
 */
export function applyColorSchemePreference({
  target = document.documentElement,
  storageKey = DEFAULT_COLOR_SCHEME_STORAGE_KEY,
}: ColorSchemeStoreOptions & { target?: HTMLElement } = {}): ColorSchemePreference {
  const stored = readStored(target.ownerDocument.defaultView, storageKey);
  // Nothing persisted leaves the target's own scheme untouched.
  if (stored) writeTarget(target, stored);
  return stored ?? 'system';
}
