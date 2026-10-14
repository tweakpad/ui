import type { IconDefinition } from '../../icons/types.js';

/** Skin tones in selector order; `none` is the default yellow. */
export const SKIN_TONES = [
  'none',
  'light',
  'medium-light',
  'medium',
  'medium-dark',
  'dark',
] as const;
export type SkinTone = (typeof SKIN_TONES)[number];
/** The tones that have a modifier. */
export type ToneModifier = Exclude<SkinTone, 'none'>;

export const isSkinTone = (value: unknown): value is SkinTone =>
  typeof value === 'string' && (SKIN_TONES as readonly string[]).includes(value);

/** One emoji of a dataset. */
export interface EmojiRecord {
  /** The emoji sequence as the dataset spells it, without a skin tone. */
  readonly emoji: string;
  /** Display name, such as "Grinning face". */
  readonly label: string;
  /** Extra search terms. */
  readonly keywords: readonly string[];
  /** Identifier of the category the emoji belongs to. */
  readonly category: string;
  /** Emoji version that introduced the emoji; emoji newer than the platform renders are hidden. */
  readonly version?: number;
  /** Variant per tone. Without it, a tone is applied to the emoji modifier bases. */
  readonly skins?: Readonly<Partial<Record<ToneModifier, string>>>;
  /** A country or subdivision flag; hidden where the platform draws flags as letters. */
  readonly flag?: boolean;
}

/** A category of a dataset, in display order. */
export interface EmojiCategory {
  readonly id: string;
  readonly label: string;
  /** Icon of the category bar; a string is shown as an emoji glyph. */
  readonly icon?: IconDefinition | string;
}

/** Emoji, their categories and the names of the tones, for one locale. */
export interface EmojiData {
  readonly locale: string;
  readonly categories: readonly EmojiCategory[];
  readonly emojis: readonly EmojiRecord[];
  /** Names of the tones, such as "Medium skin tone"; English names are used when absent. */
  readonly skinTones?: Readonly<Partial<Record<SkinTone, string>>>;
}

export interface EmojiDataRequest {
  readonly locale: string;
  readonly signal: AbortSignal;
}

/** Supplies a dataset for a locale; the signal aborts when a newer request supersedes it. */
export type EmojiDataSource = (request: EmojiDataRequest) => EmojiData | Promise<EmojiData>;

/** One custom image emoji supplied by the application. */
export interface CustomEmoji {
  readonly id: string;
  readonly label: string;
  readonly keywords?: readonly string[];
  /** Image source. */
  readonly src: string;
}

/** A category of custom emoji; it follows Recent and precedes the dataset categories. */
export interface CustomEmojiGroup {
  readonly id: string;
  readonly label: string;
  readonly icon?: IconDefinition | string;
  readonly emojis: readonly CustomEmoji[];
}
