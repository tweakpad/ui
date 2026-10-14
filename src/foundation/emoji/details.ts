import { stripSkinTone } from './skin-tones.js';
import type { EmojiData, EmojiRecord } from './types.js';

const VARIATION_SELECTORS = /[︎️]/g;

/** Comparison key of a sequence: no tone modifiers and no variation selectors. */
export function emojiKey(emoji: string): string {
  return stripSkinTone(emoji).replace(VARIATION_SELECTORS, '');
}

const indexes = new WeakMap<EmojiData, Map<string, EmojiRecord>>();

function index(data: EmojiData): Map<string, EmojiRecord> {
  let map = indexes.get(data);
  if (map) return map;
  map = new Map();
  for (const record of data.emojis) {
    const keys = [record.emoji, ...Object.values(record.skins ?? {})];
    for (const key of keys) if (key && !map.has(emojiKey(key))) map.set(emojiKey(key), record);
  }
  indexes.set(data, map);
  return map;
}

/**
 * The record of an emoji in a dataset, ignoring variation selectors and skin tones (a toned or
 * mixed-tone sequence resolves to its base record), or undefined when the dataset lacks it.
 */
export function getEmojiDetails(emoji: string, data: EmojiData): EmojiRecord | undefined {
  return index(data).get(emojiKey(emoji));
}
