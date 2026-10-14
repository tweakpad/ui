import type { EmojiRecord, SkinTone, ToneModifier } from './types.js';

const ZWJ = '‍';
const MODIFIER_BASE = /\p{Emoji_Modifier_Base}/u;
const TRAILING_VARIATION_SELECTOR = /️$/;
const MODIFIERS = /[\u{1F3FB}-\u{1F3FF}]/gu;
const HANDSHAKE = '🤝';

export const SKIN_TONE_MODIFIERS: Readonly<Record<ToneModifier, string>> = {
  light: '\u{1F3FB}',
  'medium-light': '\u{1F3FC}',
  medium: '\u{1F3FD}',
  'medium-dark': '\u{1F3FE}',
  dark: '\u{1F3FF}',
};

/** English names of the tones. */
export const SKIN_TONE_NAMES: Readonly<Record<SkinTone, string>> = {
  none: 'Default skin tone',
  light: 'Light skin tone',
  'medium-light': 'Medium-light skin tone',
  medium: 'Medium skin tone',
  'medium-dark': 'Medium-dark skin tone',
  dark: 'Dark skin tone',
};

/** Whether a sequence has an emoji modifier base, so that a tone applies to it. */
export function acceptsSkinTone(emoji: string): boolean {
  return emoji.split(ZWJ).some((segment) => MODIFIER_BASE.test(segment));
}

/** Removes every tone modifier from a sequence. */
export function stripSkinTone(emoji: string): string {
  return emoji.replace(MODIFIERS, '');
}

/**
 * Applies a tone to a sequence: the modifier follows each modifier base, a variation selector
 * after the base is dropped, and a handshake inside a joined sequence keeps its default.
 */
export function applySkinTone(emoji: string, tone: SkinTone): string {
  if (!acceptsSkinTone(emoji)) return emoji;
  const base = stripSkinTone(emoji);
  if (tone === 'none') return base;
  const segments = base.split(ZWJ);
  return segments
    .map((segment) =>
      !MODIFIER_BASE.test(segment) || (segments.length > 1 && segment === HANDSHAKE)
        ? segment
        : segment.replace(TRAILING_VARIATION_SELECTOR, '') + SKIN_TONE_MODIFIERS[tone],
    )
    .join(ZWJ);
}

/** The glyph of a record in a tone: its listed variant, otherwise the modifier rule. */
export function toneEmoji(record: Pick<EmojiRecord, 'emoji' | 'skins'>, tone: SkinTone): string {
  if (tone === 'none') return record.emoji;
  if (record.skins) return record.skins[tone] ?? record.emoji;
  return applySkinTone(record.emoji, tone);
}

/** Whether a record changes with the tone. */
export function recordAcceptsSkinTone(record: Pick<EmojiRecord, 'emoji' | 'skins'>): boolean {
  return record.skins ? Object.keys(record.skins).length > 0 : acceptsSkinTone(record.emoji);
}
