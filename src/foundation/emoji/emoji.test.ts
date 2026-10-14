import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { builtinEmojiData } from './builtin.js';
import { createEmojiDataCache } from './cache.js';
import { emojiKey, getEmojiDetails } from './details.js';
import { acceptsSkinTone, applySkinTone, stripSkinTone, toneEmoji } from './skin-tones.js';
import { detectEmojiSupport, filterSupported, isEmojiSupported } from './support.js';
import {
  createEmojibaseData,
  createEmojibaseSource,
  emojibaseLocale,
  type EmojibaseEmojiLike,
  type EmojibaseMessagesLike,
} from './adapters/emojibase.js';
import type { EmojiData } from './types.js';

class MemoryStorage implements Storage {
  #items = new Map<string, string>();
  get length(): number {
    return this.#items.size;
  }
  clear(): void {
    this.#items.clear();
  }
  getItem(key: string): string | null {
    return this.#items.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.#items.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.#items.delete(key);
  }
  setItem(key: string, value: string): void {
    this.#items.set(key, value);
  }
}

describe('built-in dataset', () => {
  it('stays under 10 KB and covers every standard group except components', () => {
    const source = readFileSync(new URL('./builtin.ts', import.meta.url));
    expect(source.byteLength).toBeLessThanOrEqual(10 * 1024);
    const data = builtinEmojiData();
    expect(data.locale).toBe('en');
    expect(data.categories.map((category) => category.id)).toEqual([
      'smileys-emotion',
      'people-body',
      'animals-nature',
      'food-drink',
      'travel-places',
      'activities',
      'objects',
      'symbols',
      'flags',
    ]);
    for (const category of data.categories)
      expect(data.emojis.some((record) => record.category === category.id)).toBe(true);
  });

  it('gives every emoji a label, keywords and a version, without duplicates', () => {
    const data = builtinEmojiData();
    const seen = new Set<string>();
    for (const record of data.emojis) {
      expect(record.emoji).not.toBe('');
      expect(record.label).toMatch(/^[A-Z0-9]/);
      expect(record.keywords.length).toBeGreaterThan(0);
      expect(record.version).toBeGreaterThanOrEqual(1);
      expect(seen.has(record.emoji)).toBe(false);
      seen.add(record.emoji);
    }
    expect(data.emojis.find((record) => record.emoji === '🇺🇳')?.flag).toBe(true);
    expect(data.emojis.find((record) => record.emoji === '🥰')?.version).toBe(11);
    expect(builtinEmojiData()).toBe(data);
  });
});

describe('skin tones', () => {
  it('applies the modifier after each base and keeps other emoji', () => {
    expect(applySkinTone('👍', 'medium')).toBe('👍🏽');
    expect(applySkinTone('✌️', 'dark')).toBe('✌🏿');
    expect(applySkinTone('😀', 'dark')).toBe('😀');
    expect(applySkinTone('👍🏽', 'none')).toBe('👍');
    expect(applySkinTone('👍🏽', 'light')).toBe('👍🏻');
    // People holding hands: both people take the tone, the handshake keeps its default.
    expect(applySkinTone('🧑‍🤝‍🧑', 'dark')).toBe('🧑🏿‍🤝‍🧑🏿');
    expect(applySkinTone('🤝', 'medium')).toBe('🤝🏽');
    expect(acceptsSkinTone('🙏')).toBe(true);
    expect(acceptsSkinTone('🐶')).toBe(false);
    expect(stripSkinTone('🧑🏿‍🤝‍🧑🏻')).toBe('🧑‍🤝‍🧑');
  });

  it('prefers listed skins', () => {
    const record = { emoji: '🤝', skins: { medium: 'M', dark: 'D' } };
    expect(toneEmoji(record, 'medium')).toBe('M');
    expect(toneEmoji(record, 'light')).toBe('🤝');
    expect(toneEmoji(record, 'none')).toBe('🤝');
  });
});

describe('details', () => {
  it('finds records ignoring variation selectors and tones', () => {
    const data = builtinEmojiData();
    expect(getEmojiDetails('❤️', data)?.label).toBe('Red heart');
    expect(getEmojiDetails('❤', data)?.label).toBe('Red heart');
    expect(getEmojiDetails('👍🏾', data)?.label).toBe('Thumbs up');
    expect(getEmojiDetails('🦄', data)).toBeUndefined();
    expect(emojiKey('✌🏿')).toBe('✌');
  });
});

describe('cache', () => {
  const dataset: EmojiData = {
    locale: 'en',
    categories: [{ id: 'a', label: 'A' }],
    emojis: [{ emoji: '😀', label: 'Grin', keywords: [], category: 'a' }],
  };

  it('round-trips datasets with metadata and clears its own keys only', () => {
    const storage = new MemoryStorage();
    storage.setItem('other', 'kept');
    const cache = createEmojiDataCache<{ tag: string }>({ name: 'test', storage });
    expect(cache.get('en')).toBeNull();
    cache.set('en', dataset, { tag: 'x' });
    expect(cache.get('en')).toEqual({ data: dataset, metadata: { tag: 'x' } });
    cache.set('fr', dataset);
    cache.delete('fr');
    expect(cache.get('fr')).toBeNull();
    cache.clear();
    expect(cache.get('en')).toBeNull();
    expect(storage.getItem('other')).toBe('kept');
  });

  it('rejects broken entries and swallows storage failures', () => {
    const storage = new MemoryStorage();
    storage.setItem('test/en', '{"data":{"locale":"en","emojis":[{}]}}');
    const cache = createEmojiDataCache({ name: 'test', storage });
    expect(cache.get('en')).toBeNull();
    const throwing = createEmojiDataCache({
      storage: () => {
        throw new Error('blocked');
      },
    });
    expect(() => throwing.set('en', dataset)).not.toThrow();
    expect(throwing.get('en')).toBeNull();
  });
});

describe('support detection', () => {
  /** A canvas stub that draws the listed emoji as one color glyph and everything else as text. */
  function fakeDocument(drawn: Set<string>) {
    let current = '';
    let fill = '';
    const pixels = () => {
      const data = new Uint8ClampedArray(16);
      // Color glyphs ignore the fill; text takes it.
      const color = drawn.has(current)
        ? [200, 100, 50]
        : fill === '#00f'
          ? [0, 0, 255]
          : [255, 0, 0];
      for (let index = 0; index < 16; index += 4) data.set([...color, 255], index);
      return data;
    };
    const context = {
      canvas: { width: 0, height: 0 },
      font: '',
      textBaseline: '',
      set fillStyle(value: string) {
        fill = value;
      },
      measureText: (text: string) => ({ width: drawn.has(text) ? 2 : 2 }),
      fillText: (text: string) => {
        current = text;
      },
      clearRect: () => {},
      getImageData: () => ({ data: pixels() }),
    };
    return { createElement: () => ({ getContext: () => context }) } as unknown as Document;
  }

  it('picks the newest drawn version and checks flags', () => {
    const emojis = [
      { emoji: 'a', version: 1 },
      { emoji: 'b', version: 11 },
      { emoji: 'c', version: 14 },
    ];
    const document = fakeDocument(new Set(['a', 'b']));
    expect(detectEmojiSupport(emojis, document)).toEqual({ version: 11, flags: false });
    expect(isEmojiSupported('c', document)).toBe(false);
    const withFlags = fakeDocument(new Set(['a', 'b', 'c', '🇪🇺']));
    expect(detectEmojiSupport(emojis, withFlags)).toEqual({ version: 14, flags: true });
    expect(
      filterSupported([{ version: 1 }, { version: 12 }, { version: 1, flag: true }], {
        version: 11,
        flags: false,
      }),
    ).toEqual([{ version: 1 }]);
  });

  it('keeps every version without a canvas', () => {
    const document = { createElement: () => ({ getContext: () => null }) } as unknown as Document;
    expect(detectEmojiSupport([{ emoji: 'a', version: 5 }], document)).toEqual({
      version: 5,
      flags: false,
    });
  });
});

describe('Emojibase adapter', () => {
  // Original sample in the published shape: groups 0 and 2, a component group 1, flags subgroup 9.
  const messages: EmojibaseMessagesLike = {
    groups: [
      { key: 'smileys-emotion', message: 'smileys & emotion', order: 0 },
      { key: 'component', message: 'component', order: 1 },
      { key: 'flags', message: 'flags', order: 2 },
    ],
    subgroups: [
      { key: 'face-smiling', message: 'face smiling', order: 0 },
      { key: 'country-flag', message: 'country flag', order: 9 },
    ],
    skinTones: [
      { key: 'light', message: 'light skin tone' },
      { key: 'dark', message: 'dark skin tone' },
    ],
  };
  const emojis: EmojibaseEmojiLike[] = [
    { emoji: '😀', label: 'grinning face', group: 0, subgroup: 0, version: 1, tags: ['smile'] },
    {
      emoji: '👋',
      label: 'waving hand',
      group: 0,
      subgroup: 0,
      version: 0.6,
      skins: [
        { emoji: '👋🏻', tone: 1 },
        { emoji: '👋🏿', tone: 5 },
        { emoji: 'mixed', tone: [1, 5] },
      ],
    },
    { emoji: '🏻', label: 'light skin tone', group: 1, version: 1 },
    { emoji: '#️⃣', label: 'keycap', version: 0.6 },
    { emoji: '🇺🇳', label: 'flag: United Nations', group: 2, subgroup: 9, version: 4 },
  ];

  it('converts groups, labels, tags, skins and flags', () => {
    const data = createEmojibaseData(emojis, messages, 'en');
    expect(data.categories).toEqual([
      { id: 'smileys-emotion', label: 'Smileys & emotion' },
      { id: 'flags', label: 'Flags' },
    ]);
    expect(data.emojis.map((record) => record.emoji)).toEqual(['😀', '👋', '🇺🇳']);
    expect(data.emojis[0]).toEqual({
      emoji: '😀',
      label: 'Grinning face',
      keywords: ['smile'],
      category: 'smileys-emotion',
      version: 1,
    });
    expect(data.emojis[1]?.skins).toEqual({ light: '👋🏻', dark: '👋🏿' });
    expect(data.emojis[2]?.flag).toBe(true);
    expect(data.skinTones).toEqual({ light: 'Light skin tone', dark: 'Dark skin tone' });
  });

  it('matches published locales by prefix', () => {
    expect(emojibaseLocale('fr-CA')).toBe('fr');
    expect(emojibaseLocale('zh-Hant-TW')).toBe('zh-hant');
    expect(emojibaseLocale('es_MX')).toBe('es-mx');
    expect(emojibaseLocale('xx')).toBe('en');
  });

  function response(body: unknown, etag: string | null = null, ok = true): Response {
    return {
      ok,
      status: ok ? 200 : 500,
      headers: { get: (name: string) => (name === 'etag' ? etag : null) },
      json: () => Promise.resolve(body),
    } as unknown as Response;
  }

  it('shares one load between concurrent requests and aborts only when all abort', async () => {
    let resolveData: (value: Response) => void = () => {};
    const fetch = vi.fn((input: string) =>
      input.endsWith('data.json')
        ? new Promise<Response>((resolve) => (resolveData = resolve))
        : Promise.resolve(response(messages)),
    );
    const source = createEmojibaseSource({ url: 'https://data.test/v1/', fetch, cache: false });
    const first = new AbortController();
    const second = new AbortController();
    const a = source({ locale: 'en-US', signal: first.signal });
    const b = source({ locale: 'en', signal: second.signal });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[0]?.[0]).toBe('https://data.test/v1/en/data.json');
    first.abort();
    await expect(a).rejects.toBeDefined();
    resolveData(response(emojis));
    const data = await b;
    expect(data.emojis).toHaveLength(3);
    // The completed load is no longer shared: a new request loads again.
    void source({ locale: 'en', signal: new AbortController().signal });
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it('revalidates a cached dataset once per session and keeps it when revalidation fails', async () => {
    const storage = new MemoryStorage();
    const session = new MemoryStorage();
    const cache = createEmojiDataCache<{ emojis: string | null; messages: string | null }>({
      name: 'eb',
      storage,
    });
    const calls: string[] = [];
    let headFails = false;
    const fetch = vi.fn((input: string, init?: RequestInit) => {
      calls.push(`${init?.method ?? 'GET'} ${input}`);
      if (init?.method === 'HEAD')
        return headFails
          ? Promise.reject(new Error('offline'))
          : Promise.resolve(response(null, 'v1'));
      return Promise.resolve(response(input.endsWith('data.json') ? emojis : messages, 'v1'));
    });
    const signal = new AbortController().signal;
    const make = () => createEmojibaseSource({ url: 'https://data.test', fetch, cache, session });
    await make()({ locale: 'en', signal });
    expect(calls).toEqual([
      'GET https://data.test/en/data.json',
      'GET https://data.test/en/messages.json',
    ]);
    calls.length = 0;
    await make()({ locale: 'en', signal });
    expect(calls).toEqual([]);
    session.clear();
    await make()({ locale: 'en', signal });
    expect(calls).toEqual([
      'HEAD https://data.test/en/data.json',
      'HEAD https://data.test/en/messages.json',
    ]);
    session.clear();
    calls.length = 0;
    headFails = true;
    const data = await make()({ locale: 'en', signal });
    expect(data.emojis).toHaveLength(3);
    expect(calls.every((call) => call.startsWith('HEAD'))).toBe(true);
  });

  it('rejects failed downloads', async () => {
    const fetch = vi.fn(() => Promise.resolve(response(null, null, false)));
    const source = createEmojibaseSource({ url: 'https://data.test/x', fetch, cache: false });
    await expect(source({ locale: 'en', signal: new AbortController().signal })).rejects.toThrow();
  });
});
