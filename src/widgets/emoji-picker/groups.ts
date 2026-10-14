import type { SelectEntry } from '../../components/select/types.js';
import { getEmojiDetails } from '../../foundation/emoji/details.js';
import {
  recordAcceptsSkinTone,
  SKIN_TONE_MODIFIERS,
  toneEmoji,
} from '../../foundation/emoji/skin-tones.js';
import type {
  CustomEmoji,
  CustomEmojiGroup,
  EmojiData,
  EmojiRecord,
  SkinTone,
} from '../../foundation/emoji/types.js';
import type { IconDefinition } from '../../icons/types.js';
import type { EmojiPickerItem } from './types.js';

export const RECENT_CATEGORY = 'recent';
const CUSTOM_VALUE = /^:(.+):$/;

/** A category the picker shows, in display order. */
export interface PickerCategory {
  readonly id: string;
  readonly label: string;
  readonly icon?: IconDefinition | string;
  /** Image of a custom category without an icon: its first emoji. */
  readonly image?: string;
}

/** What one option of the list stands for. */
export type PickerSlot =
  | { readonly kind: 'unicode'; readonly category: string; readonly record: EmojiRecord }
  | { readonly kind: 'custom'; readonly category: string; readonly custom: CustomEmoji }
  | {
      readonly kind: 'recent';
      readonly category: string;
      readonly given: string;
      readonly record?: EmojiRecord;
      readonly custom?: CustomEmoji;
    };

export interface PickerModel {
  readonly categories: readonly PickerCategory[];
  /** Select entries: one group per category. */
  readonly entries: readonly SelectEntry[];
  /** Option value → what it stands for. */
  readonly slots: ReadonlyMap<string, PickerSlot>;
  /** Category → value of its first option. */
  readonly first: ReadonlyMap<string, string>;
  /** Custom identifiers that appeared more than once (skipped). */
  readonly duplicates: readonly string[];
  /** Custom emoji by identifier. */
  readonly customs: ReadonlyMap<string, CustomEmoji>;
}

export interface PickerModelInput {
  readonly data: EmojiData | null;
  readonly recent: readonly string[];
  readonly custom: readonly CustomEmojiGroup[];
  /** Recent is hidden while a query is active. */
  readonly includeRecent: boolean;
  readonly recentLabel: string;
}

/** Builds the categories and Select entries: Recent, the custom groups, the dataset. */
export function buildPickerModel(input: PickerModelInput): PickerModel {
  const categories: PickerCategory[] = [];
  const entries: SelectEntry[] = [];
  const slots = new Map<string, PickerSlot>();
  const first = new Map<string, string>();
  const duplicates: string[] = [];
  const customs = new Map<string, CustomEmoji>();
  const customGroups: { group: CustomEmojiGroup; emojis: CustomEmoji[] }[] = [];
  for (const group of input.custom) {
    const emojis: CustomEmoji[] = [];
    for (const emoji of group.emojis)
      if (customs.has(emoji.id)) duplicates.push(emoji.id);
      else {
        customs.set(emoji.id, emoji);
        emojis.push(emoji);
      }
    customGroups.push({ group, emojis });
  }
  const add = (
    category: PickerCategory,
    options: { key: string; label: string; slot: PickerSlot }[],
  ): void => {
    if (!options.length) return;
    categories.push(category);
    first.set(category.id, options[0]!.key);
    // The category travels with the group node, so the list can name the group at its top.
    entries.push({
      type: 'group',
      label: category.label,
      category: category.id,
      items: options.map((option) => {
        slots.set(option.key, option.slot);
        return { value: option.key, text: option.label };
      }),
    } as SelectEntry);
  };
  if (input.includeRecent) {
    const options: { key: string; label: string; slot: PickerSlot }[] = [];
    input.recent.forEach((given, index) => {
      const custom = CUSTOM_VALUE.exec(given)?.[1];
      const customEmoji = custom === undefined ? undefined : customs.get(custom);
      const record = customEmoji || !input.data ? undefined : getEmojiDetails(given, input.data);
      if (!customEmoji && !record) return;
      options.push({
        key: `${RECENT_CATEGORY}:${index}`,
        label: customEmoji?.label ?? record!.label,
        slot: {
          kind: 'recent',
          category: RECENT_CATEGORY,
          given,
          ...(record ? { record } : {}),
          ...(customEmoji ? { custom: customEmoji } : {}),
        },
      });
    });
    add({ id: RECENT_CATEGORY, label: input.recentLabel }, options);
  }
  for (const { group, emojis } of customGroups)
    add(
      {
        id: group.id,
        label: group.label,
        ...(group.icon ? { icon: group.icon } : emojis[0] ? { image: emojis[0].src } : {}),
      },
      emojis.map((custom) => ({
        key: `:${custom.id}:`,
        label: custom.label,
        slot: { kind: 'custom', category: group.id, custom },
      })),
    );
  if (input.data) {
    const byCategory = new Map<string, EmojiRecord[]>();
    for (const record of input.data.emojis) {
      const list = byCategory.get(record.category);
      if (list) list.push(record);
      else byCategory.set(record.category, [record]);
    }
    for (const category of input.data.categories)
      add(
        category,
        (byCategory.get(category.id) ?? []).map((record) => ({
          key: record.emoji,
          label: record.label,
          slot: { kind: 'unicode', category: category.id, record },
        })),
      );
  }
  return { categories, entries, slots, first, duplicates, customs };
}

const TONES = new Map(
  Object.entries(SKIN_TONE_MODIFIERS).map(([tone, modifier]) => [modifier, tone as SkinTone]),
);

/** The one tone a given sequence carries, if every modifier in it agrees. */
function givenTone(emoji: string): SkinTone | undefined {
  const tones = new Set(Array.from(emoji, (character) => TONES.get(character)).filter(Boolean));
  return tones.size === 1 ? [...tones][0] : undefined;
}

/** The emoji an option stands for, in the active tone. */
export function pickerItem(slot: PickerSlot, tone: SkinTone): EmojiPickerItem {
  if (slot.kind === 'custom') return customItem(slot.custom, slot.category);
  if (slot.kind === 'recent') {
    if (slot.custom) return customItem(slot.custom, slot.category);
    const record = slot.record!;
    const given = givenTone(slot.given);
    return {
      value: slot.given,
      emoji: slot.given,
      label: record.label,
      keywords: record.keywords,
      category: slot.category,
      record,
      ...(given ? { skinTone: given } : {}),
    };
  }
  const record = slot.record;
  const toned = recordAcceptsSkinTone(record);
  return {
    value: toned ? toneEmoji(record, tone) : record.emoji,
    emoji: toned ? toneEmoji(record, tone) : record.emoji,
    label: record.label,
    keywords: record.keywords,
    category: slot.category,
    record,
    ...(toned ? { skinTone: tone } : {}),
  };
}

function customItem(custom: CustomEmoji, category: string): EmojiPickerItem {
  return {
    value: `:${custom.id}:`,
    emoji: '',
    label: custom.label,
    keywords: custom.keywords ?? [],
    category,
    src: custom.src,
  };
}

/** The option value standing for a picker value outside Recent, or undefined. */
export function optionKey(
  value: string,
  model: PickerModel,
  data: EmojiData | null,
): string | undefined {
  if (!value) return undefined;
  const custom = CUSTOM_VALUE.exec(value)?.[1];
  if (custom !== undefined) return model.customs.has(custom) ? value : undefined;
  return data ? getEmojiDetails(value, data)?.emoji : undefined;
}
