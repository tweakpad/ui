import type { EmojiData } from './types.js';

export interface EmojiDataCacheEntry<M> {
  readonly data: EmojiData;
  readonly metadata?: M;
}

/** Datasets kept in local storage, keyed by locale; storage failures are ignored. */
export interface EmojiDataCache<M = undefined> {
  get(locale: string): EmojiDataCacheEntry<M> | null;
  set(locale: string, data: EmojiData, metadata?: M): void;
  delete(locale: string): void;
  clear(): void;
}

export interface EmojiDataCacheOptions {
  /** Prefix of the storage keys, `<name>/<locale>`. */
  readonly name?: string;
  /** Storage to use; the window's local storage by default. */
  readonly storage?: Storage | (() => Storage | null | undefined);
}

const DEFAULT_NAME = 'tp-emoji/data';

function isDataset(value: unknown): value is EmojiData {
  const data = value as EmojiData | null;
  return (
    !!data &&
    typeof data.locale === 'string' &&
    Array.isArray(data.categories) &&
    Array.isArray(data.emojis) &&
    data.emojis.every(
      (record) =>
        typeof record?.emoji === 'string' &&
        typeof record.label === 'string' &&
        typeof record.category === 'string' &&
        Array.isArray(record.keywords),
    )
  );
}

/** Creates a local-storage cache of datasets; nothing is read until it is used. */
export function createEmojiDataCache<M = undefined>(
  options: EmojiDataCacheOptions = {},
): EmojiDataCache<M> {
  const name = options.name ?? DEFAULT_NAME;
  const storage = (): Storage | null => {
    try {
      const configured = options.storage;
      return (
        (typeof configured === 'function' ? configured() : configured) ??
        globalThis.localStorage ??
        null
      );
    } catch {
      return null;
    }
  };
  const key = (locale: string): string => `${name}/${locale}`;
  return {
    get(locale) {
      try {
        const text = storage()?.getItem(key(locale));
        if (!text) return null;
        const entry = JSON.parse(text) as EmojiDataCacheEntry<M>;
        return isDataset(entry?.data) ? entry : null;
      } catch {
        return null;
      }
    },
    set(locale, data, metadata) {
      try {
        storage()?.setItem(key(locale), JSON.stringify({ data, metadata }));
      } catch {
        // Quota or privacy mode: the cache is best effort.
      }
    },
    delete(locale) {
      try {
        storage()?.removeItem(key(locale));
      } catch {
        // Best effort.
      }
    },
    clear() {
      try {
        const store = storage();
        if (!store) return;
        const prefix = `${name}/`;
        for (let index = store.length - 1; index >= 0; index--) {
          const entry = store.key(index);
          if (entry?.startsWith(prefix)) store.removeItem(entry);
        }
      } catch {
        // Best effort.
      }
    },
  };
}
