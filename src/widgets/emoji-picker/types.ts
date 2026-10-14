import type { EmojiRecord, SkinTone } from '../../foundation/emoji/types.js';

export type EmojiPickerSize = 'sm' | 'default' | 'lg';
export type EmojiPickerPicker = 'inline' | 'popup';
export type EmojiPickerStatus = 'idle' | 'loading' | 'loaded' | 'error';

/** An emoji as the picker offers it: the tone applied, or a custom image. */
export interface EmojiPickerItem {
  /** The value a pick proposes: the toned sequence, or `:id:` for a custom emoji. */
  readonly value: string;
  /** The glyph shown (the toned sequence); empty for a custom emoji. */
  readonly emoji: string;
  readonly label: string;
  readonly keywords: readonly string[];
  /** Category identifier: a dataset category, a custom group or `recent`. */
  readonly category: string;
  /** Image source of a custom emoji. */
  readonly src?: string;
  /** The dataset record of a Unicode emoji. */
  readonly record?: EmojiRecord;
  /** The tone applied, when the emoji accepts one. */
  readonly skinTone?: SkinTone;
}

/** Metadata of a value proposal. */
export interface EmojiPickerChangeMetadata extends Record<string, unknown> {
  readonly item?: EmojiPickerItem;
  readonly category?: string;
}

/** Texts of the picker; every key is optional in the `strings` property. */
export interface EmojiPickerStrings {
  /** Default name of the picker and of its list. */
  readonly label: string;
  /** Name of the search input. */
  readonly search: string;
  /** Placeholder of the search input. */
  readonly searchPlaceholder: string;
  /** Empty state when nothing matches. */
  readonly noResults: string;
  /** Status announcing the number of matches; `{count}` is replaced. */
  readonly results: string;
  /** Status announcing a single match. */
  readonly resultsOne: string;
  readonly loading: string;
  readonly error: string;
  readonly retry: string;
  /** Name of the Recent category. */
  readonly recent: string;
  /** Name of the category bar. */
  readonly categories: string;
  /** Name of the skin tone menu; the Button adds the current tone's short name. */
  readonly skinTone: string;
  /** Announcement of a tone change; `{tone}` is replaced. */
  readonly skinToneChanged: string;
  /** Tone names in emoji option names and announcements. */
  readonly toneNone: string;
  readonly toneLight: string;
  readonly toneMediumLight: string;
  readonly toneMedium: string;
  readonly toneMediumDark: string;
  readonly toneDark: string;
  /** Short tone names in the skin tone menu, which names the setting itself. */
  readonly toneOptionNone: string;
  readonly toneOptionLight: string;
  readonly toneOptionMediumLight: string;
  readonly toneOptionMedium: string;
  readonly toneOptionMediumDark: string;
  readonly toneOptionDark: string;
  /** Name of the popup trigger. */
  readonly trigger: string;
  /** Preview text while nothing is highlighted or chosen. */
  readonly previewPlaceholder: string;
  /** Validation message of a required empty picker. */
  readonly valueMissing: string;
}
