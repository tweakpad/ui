/**
 * Emojibase adapter. The library never imports Emojibase: the application imports its data
 * files or hosts them, and either converts them with `createEmojibaseData` or loads them per
 * locale with `createEmojibaseSource`.
 *
 * ```ts
 * import data from 'emojibase-data/en/data.json';
 * import messages from 'emojibase-data/en/messages.json';
 * import { createEmojibaseData } from '@tweakpad/ui/emoji';
 * picker.data = createEmojibaseData(data, messages, 'en');
 * ```
 */
import { createEmojiDataCache, type EmojiDataCache } from '../cache.js';
import {
  SKIN_TONES,
  type EmojiData,
  type EmojiDataSource,
  type EmojiRecord,
  type SkinTone,
  type ToneModifier,
} from '../types.js';

/** The structural slice of an Emojibase emoji this adapter reads. */
export interface EmojibaseEmojiLike {
  readonly emoji: string;
  readonly label: string;
  readonly group?: number;
  readonly subgroup?: number;
  readonly version: number;
  readonly tags?: readonly string[];
  readonly skins?: readonly {
    readonly emoji: string;
    readonly tone?: number | readonly number[];
  }[];
}

/** The structural slice of an Emojibase messages file this adapter reads. */
export interface EmojibaseMessagesLike {
  readonly groups: readonly {
    readonly key: string;
    readonly message: string;
    readonly order: number;
  }[];
  readonly subgroups: readonly {
    readonly key: string;
    readonly message: string;
    readonly order: number;
  }[];
  readonly skinTones?: readonly { readonly key: string; readonly message: string }[];
}

/** Locales the dataset publishes. */
export const EMOJIBASE_LOCALES = [
  'bn',
  'da',
  'de',
  'en-gb',
  'en',
  'es-mx',
  'es',
  'et',
  'fi',
  'fr',
  'hi',
  'hu',
  'it',
  'ja',
  'ko',
  'lt',
  'ms',
  'nb',
  'nl',
  'pl',
  'pt',
  'ru',
  'sv',
  'th',
  'uk',
  'vi',
  'zh-hant',
  'zh',
] as const;

const COMPONENT_GROUP = 'component';
const FLAG_SUBGROUPS = new Set(['country-flag', 'subdivision-flag']);
const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * Converts the data and messages files of one locale: the component group and emoji without a
 * group are dropped, group messages name the categories, tags become keywords, skins are keyed
 * by tone and the country and subdivision flag subgroups mark flags.
 */
export function createEmojibaseData(
  emojis: readonly EmojibaseEmojiLike[],
  messages: EmojibaseMessagesLike,
  locale = 'en',
): EmojiData {
  const groups = [...messages.groups]
    .filter((group) => group.key !== COMPONENT_GROUP)
    .sort((a, b) => a.order - b.order);
  const groupKeys = new Map(groups.map((group) => [group.order, group.key]));
  const flagSubgroups = new Set(
    messages.subgroups
      .filter((subgroup) => FLAG_SUBGROUPS.has(subgroup.key))
      .map((subgroup) => subgroup.order),
  );
  const records: EmojiRecord[] = [];
  for (const emoji of emojis) {
    const category = emoji.group === undefined ? undefined : groupKeys.get(emoji.group);
    if (!category) continue;
    const skins: Partial<Record<ToneModifier, string>> = {};
    for (const skin of emoji.skins ?? [])
      if (typeof skin.tone === 'number') {
        const tone = SKIN_TONES[skin.tone];
        if (tone && tone !== 'none') skins[tone] = skin.emoji;
      }
    records.push({
      emoji: emoji.emoji,
      label: capitalize(emoji.label),
      keywords: [...(emoji.tags ?? [])],
      category,
      version: emoji.version,
      ...(Object.keys(skins).length ? { skins } : {}),
      ...(emoji.subgroup !== undefined && flagSubgroups.has(emoji.subgroup) ? { flag: true } : {}),
    });
  }
  const skinTones: Partial<Record<SkinTone, string>> = {};
  for (const tone of messages.skinTones ?? [])
    if ((SKIN_TONES as readonly string[]).includes(tone.key))
      skinTones[tone.key as SkinTone] = capitalize(tone.message);
  return {
    locale,
    categories: groups.map((group) => ({ id: group.key, label: capitalize(group.message) })),
    emojis: records,
    ...(Object.keys(skinTones).length ? { skinTones } : {}),
  };
}

/** The published locale for a BCP 47 locale: the longest matching prefix, else English. */
export function emojibaseLocale(locale: string): (typeof EMOJIBASE_LOCALES)[number] {
  const parts = locale.toLowerCase().replaceAll('_', '-').split('-');
  for (let length = parts.length; length > 0; length--) {
    const candidate = parts.slice(0, length).join('-');
    const match = EMOJIBASE_LOCALES.find((entry) => entry === candidate);
    if (match) return match;
  }
  return 'en';
}

export interface EmojibaseEtags {
  readonly emojis: string | null;
  readonly messages: string | null;
}

export interface EmojibaseSourceOptions {
  /** Base URL holding `<locale>/data.json` and `<locale>/messages.json`. */
  readonly url: string;
  /** Fetch implementation; the global fetch by default. */
  readonly fetch?: (url: string, init?: RequestInit) => Promise<Response>;
  /**
   * Keeps the converted datasets in local storage and revalidates them by entity tag at most
   * once per session and locale; true (default) uses a cache named after the URL.
   */
  readonly cache?: boolean | EmojiDataCache<EmojibaseEtags>;
  /** Session storage recording the revalidated locales; the window's by default. */
  readonly session?: Storage | (() => Storage | null | undefined);
}

interface PendingLoad {
  readonly promise: Promise<EmojiData>;
  readonly controller: AbortController;
  callers: number;
}

const pending = new Map<string, PendingLoad>();
/** Revalidated locales per URL when session storage is unavailable. */
const revalidatedInMemory = new Map<string, Set<string>>();

/**
 * A data source loading one locale's files from `url`. Concurrent requests for the same URL and
 * locale share one load, which aborts only when every request aborted.
 */
export function createEmojibaseSource(options: EmojibaseSourceOptions): EmojiDataSource {
  const url = options.url.replace(/\/+$/, '');
  const cache =
    options.cache === false
      ? undefined
      : options.cache === undefined || options.cache === true
        ? createEmojiDataCache<EmojibaseEtags>({ name: `tp-emoji/emojibase/${url}` })
        : options.cache;
  const fetcher = (input: string, init?: RequestInit): Promise<Response> =>
    (options.fetch ?? globalThis.fetch)(input, init);
  const sessionKey = `tp-emoji/emojibase-revalidated/${url}`;
  const session = (): Storage | null => {
    try {
      const configured = options.session;
      return (
        (typeof configured === 'function' ? configured() : configured) ??
        globalThis.sessionStorage ??
        null
      );
    } catch {
      return null;
    }
  };
  const revalidated = (): Set<string> => {
    const store = session();
    if (!store) return revalidatedInMemory.get(url) ?? new Set();
    try {
      const text = store.getItem(sessionKey);
      return new Set(text ? (JSON.parse(text) as string[]) : []);
    } catch {
      return new Set();
    }
  };
  const markRevalidated = (locale: string): void => {
    const locales = revalidated();
    locales.add(locale);
    const store = session();
    if (!store) {
      revalidatedInMemory.set(url, locales);
      return;
    }
    try {
      store.setItem(sessionKey, JSON.stringify([...locales]));
    } catch {
      // Without a writable session the next request revalidates again.
    }
  };
  const files = (locale: string) => ({
    emojis: `${url}/${locale}/data.json`,
    messages: `${url}/${locale}/messages.json`,
  });
  const download = async (locale: string, signal: AbortSignal): Promise<EmojiData> => {
    const paths = files(locale);
    const [emojis, messages] = await Promise.all([
      fetcher(paths.emojis, { signal }),
      fetcher(paths.messages, { signal }),
    ]);
    if (!emojis.ok || !messages.ok)
      throw new Error(`Emoji data could not be loaded for ${locale} (${emojis.status}).`);
    const data = createEmojibaseData(
      (await emojis.json()) as EmojibaseEmojiLike[],
      (await messages.json()) as EmojibaseMessagesLike,
      locale,
    );
    signal.throwIfAborted();
    cache?.set(locale, data, {
      emojis: emojis.headers.get('etag'),
      messages: messages.headers.get('etag'),
    });
    return data;
  };
  const etag = async (path: string, signal: AbortSignal): Promise<string | null> => {
    const response = await fetcher(path, { method: 'HEAD', signal });
    return response.ok ? response.headers.get('etag') : null;
  };
  const read = async (locale: string, signal: AbortSignal): Promise<EmojiData> => {
    const cached = cache?.get(locale);
    let data: EmojiData;
    if (!cached) data = await download(locale, signal);
    else if (revalidated().has(locale)) data = cached.data;
    else
      try {
        const paths = files(locale);
        const [emojis, messages] = await Promise.all([
          etag(paths.emojis, signal),
          etag(paths.messages, signal),
        ]);
        data =
          !emojis ||
          !messages ||
          emojis !== cached.metadata?.emojis ||
          messages !== cached.metadata?.messages
            ? await download(locale, signal)
            : cached.data;
      } catch (error) {
        if (signal.aborted) throw error;
        // Revalidation failed: the cached dataset stands.
        data = cached.data;
      }
    signal.throwIfAborted();
    markRevalidated(locale);
    return data;
  };
  return ({ locale: requested, signal }) => {
    if (signal.aborted) return Promise.reject(signal.reason);
    const locale = emojibaseLocale(requested);
    const key = `${url}\u0000${locale}`;
    let load = pending.get(key);
    if (!load || load.controller.signal.aborted) {
      const controller = new AbortController();
      const promise = read(locale, controller.signal).finally(() => {
        if (pending.get(key)?.promise === promise) pending.delete(key);
      });
      load = { promise, controller, callers: 0 };
      pending.set(key, load);
    }
    const shared = load;
    shared.callers++;
    let onAbort: () => void = () => {};
    return new Promise<EmojiData>((resolve, reject) => {
      onAbort = () => reject(signal.reason);
      signal.addEventListener('abort', onAbort, { once: true });
      shared.promise.then(resolve, reject);
    }).finally(() => {
      signal.removeEventListener('abort', onAbort);
      shared.callers--;
      // A request must not cancel a load another request still waits for.
      if (shared.callers === 0 && pending.get(key) === shared) shared.controller.abort();
    });
  };
}
