import { describe, expect, it } from 'vitest';
import {
  applyColorSchemePreference,
  colorSchemeStore,
  resolveColorScheme,
  type ColorSchemeState,
} from './color-scheme.js';

/** A minimal element/document/window triple: inline style, attributes, storage and media. */
function environment({ stored = null as string | null, dark = false, storage = true } = {}) {
  const listeners = new Map<string, Set<(event: unknown) => void>>();
  const mediaListeners = new Set<() => void>();
  const store = new Map<string, string>(stored === null ? [] : [['tp-theme', stored]]);
  const media = {
    matches: dark,
    addEventListener: (_: string, listener: () => void) => mediaListeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => mediaListeners.delete(listener),
  };
  const appended: unknown[] = [];
  const style = new Map<string, string>();
  const attributes = new Map<string, string>();
  const view = {
    localStorage: storage
      ? {
          getItem: (key: string) => store.get(key) ?? null,
          setItem: (key: string, value: string) => void store.set(key, value),
        }
      : {
          getItem: () => {
            throw new Error('denied');
          },
          setItem: () => {
            throw new Error('denied');
          },
        },
    matchMedia: () => media,
    getComputedStyle: (element: { style: { getPropertyValue(name: string): string } }) => ({
      colorScheme: element.style.getPropertyValue('color-scheme') || 'light dark',
      color: '',
      getPropertyValue: (name: string) => element.style.getPropertyValue(name),
    }),
    addEventListener: (type: string, listener: (event: unknown) => void) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(listener);
    },
    removeEventListener: (type: string, listener: (event: unknown) => void) =>
      listeners.get(type)?.delete(listener),
  };
  const document = {
    defaultView: view,
    head: { append: (node: unknown) => appended.push(node) },
    documentElement: null as unknown,
    createElement: () => ({ textContent: '', remove() {} }),
  };
  const target = {
    ownerDocument: document,
    style: {
      getPropertyValue: (name: string) => style.get(name) ?? '',
      setProperty: (name: string, value: string) => void style.set(name, value),
      removeProperty: (name: string) => void style.delete(name),
    },
    getAttribute: (name: string) => attributes.get(name) ?? null,
    setAttribute: (name: string, value: string) => void attributes.set(name, value),
    removeAttribute: (name: string) => void attributes.delete(name),
  };
  return {
    target: target as unknown as HTMLElement,
    style,
    attributes,
    store,
    media,
    fireMedia: () => mediaListeners.forEach((listener) => listener()),
    fireStorage: (key: string, newValue: string | null) =>
      listeners.get('storage')?.forEach((listener) => listener({ key, newValue })),
    listenerCount: () => (listeners.get('storage')?.size ?? 0) + mediaListeners.size,
  };
}

describe('color scheme preference', () => {
  it('resolves a computed color-scheme against the device preference', () => {
    expect(resolveColorScheme('light dark', false)).toBe('light');
    expect(resolveColorScheme('light dark', true)).toBe('dark');
    expect(resolveColorScheme('dark', false)).toBe('dark');
    expect(resolveColorScheme('light', true)).toBe('light');
    expect(resolveColorScheme('normal', true)).toBe('light');
  });

  it('defaults to system and leaves an untouched target alone', () => {
    const env = environment();
    env.style.set('color-scheme', 'light dark');
    const scheme = colorSchemeStore(env.target);
    expect(scheme.preference).toBe('system');
    expect(scheme.stored).toBe(false);
    expect(env.style.get('color-scheme')).toBe('light dark');
  });

  it('applies, persists and clears an explicit preference', () => {
    const env = environment();
    const scheme = colorSchemeStore(env.target);
    const seen: ColorSchemeState[] = [];
    scheme.subscribe((state) => seen.push(state));
    expect(scheme.set('dark')).toBe(true);
    expect(env.style.get('color-scheme')).toBe('dark');
    expect(env.attributes.get('data-theme')).toBe('dark');
    expect(env.store.get('tp-theme')).toBe('dark');
    expect(scheme.resolved).toBe('dark');
    scheme.set('system');
    expect(env.style.get('color-scheme')).toBe('light dark');
    expect(env.attributes.has('data-theme')).toBe(false);
    expect(seen.map((state) => state.preference)).toEqual(['dark', 'system']);
    // Transition suppression restores the target's motion scale.
    expect(env.style.has('--tp-motion-scale')).toBe(false);
  });

  it('shares one store per target and key', () => {
    const env = environment();
    expect(colorSchemeStore(env.target)).toBe(colorSchemeStore(env.target));
    expect(colorSchemeStore(env.target)).not.toBe(
      colorSchemeStore(env.target, { storageKey: null }),
    );
  });

  it('starts from a persisted preference and ignores invalid ones', () => {
    const stored = environment({ stored: 'light', dark: true });
    expect(colorSchemeStore(stored.target).preference).toBe('light');
    expect(stored.style.get('color-scheme')).toBe('light');
    const invalid = environment({ stored: 'sepia' });
    expect(colorSchemeStore(invalid.target).preference).toBe('system');
  });

  it('survives unavailable storage', () => {
    const env = environment({ storage: false });
    const scheme = colorSchemeStore(env.target);
    expect(scheme.preference).toBe('system');
    expect(() => scheme.set('dark')).not.toThrow();
    expect(env.style.get('color-scheme')).toBe('dark');
  });

  it('follows the device while on system and other contexts while retained', () => {
    const env = environment();
    const scheme = colorSchemeStore(env.target);
    const release = scheme.retain();
    expect(scheme.resolved).toBe('light');
    env.media.matches = true;
    env.fireMedia();
    expect(scheme.resolved).toBe('dark');
    env.fireStorage('tp-theme', 'light');
    expect(scheme.preference).toBe('light');
    expect(env.style.get('color-scheme')).toBe('light');
    env.fireStorage('other-key', 'dark');
    expect(scheme.preference).toBe('light');
    release();
    release();
    expect(env.listenerCount()).toBe(0);
  });

  it('applies the persisted preference before any component renders', () => {
    const env = environment({ stored: 'dark' });
    expect(applyColorSchemePreference({ target: env.target })).toBe('dark');
    expect(env.attributes.get('data-theme')).toBe('dark');
    const none = environment();
    expect(applyColorSchemePreference({ target: none.target })).toBe('system');
    expect(none.attributes.has('data-theme')).toBe(false);
  });
});
