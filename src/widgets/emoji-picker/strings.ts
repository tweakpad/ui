import type { SkinTone } from '../../foundation/emoji/types.js';
import type { EmojiPickerStrings } from './types.js';

export const DEFAULT_STRINGS: EmojiPickerStrings = {
  label: 'Emoji',
  search: 'Search emoji',
  searchPlaceholder: 'Search…',
  noResults: 'No emoji found.',
  results: '{count} emoji found.',
  resultsOne: '1 emoji found.',
  loading: 'Loading emoji…',
  error: 'Emoji could not be loaded.',
  retry: 'Retry',
  recent: 'Recent',
  categories: 'Categories',
  skinTone: 'Skin tone',
  skinToneChanged: '{tone} selected.',
  toneNone: 'Default skin tone',
  toneLight: 'Light skin tone',
  toneMediumLight: 'Medium-light skin tone',
  toneMedium: 'Medium skin tone',
  toneMediumDark: 'Medium-dark skin tone',
  toneDark: 'Dark skin tone',
  toneOptionNone: 'Default',
  toneOptionLight: 'Light',
  toneOptionMediumLight: 'Medium-light',
  toneOptionMedium: 'Medium',
  toneOptionMediumDark: 'Medium-dark',
  toneOptionDark: 'Dark',
  trigger: 'Choose emoji',
  previewPlaceholder: 'Pick an emoji…',
  valueMissing: 'Please choose an emoji.',
};

export function resolveStrings(overrides: Partial<EmojiPickerStrings> = {}): EmojiPickerStrings {
  return { ...DEFAULT_STRINGS, ...overrides };
}

export const TONE_OPTION_KEYS: Readonly<Record<SkinTone, keyof EmojiPickerStrings>> = {
  none: 'toneOptionNone',
  light: 'toneOptionLight',
  'medium-light': 'toneOptionMediumLight',
  medium: 'toneOptionMedium',
  'medium-dark': 'toneOptionMediumDark',
  dark: 'toneOptionDark',
};

export const TONE_STRING_KEYS: Readonly<Record<SkinTone, keyof EmojiPickerStrings>> = {
  none: 'toneNone',
  light: 'toneLight',
  'medium-light': 'toneMediumLight',
  medium: 'toneMedium',
  'medium-dark': 'toneMediumDark',
  dark: 'toneDark',
};
