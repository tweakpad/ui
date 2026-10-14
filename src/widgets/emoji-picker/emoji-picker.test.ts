import { describe, expect, it } from 'vitest';
import { builtinEmojiData } from '../../foundation/emoji/builtin.js';
import type { CustomEmojiGroup } from '../../foundation/emoji/types.js';
import { buildPickerModel, optionKey, pickerItem, RECENT_CATEGORY } from './groups.js';
import { DEFAULT_STRINGS, resolveStrings } from './strings.js';

const custom: CustomEmojiGroup[] = [
  {
    id: 'team',
    label: 'Team',
    emojis: [
      { id: 'ship-it', label: 'Ship it', keywords: ['deploy'], src: 'ship.svg' },
      { id: 'blocked', label: 'Blocked', src: 'blocked.svg' },
      { id: 'ship-it', label: 'Again', src: 'again.svg' },
    ],
  },
];

describe('picker model', () => {
  it('orders Recent, custom groups, then the dataset categories', () => {
    const data = builtinEmojiData();
    const model = buildPickerModel({
      data,
      recent: ['👍🏽', ':ship-it:', '🦄', '❤'],
      custom,
      includeRecent: true,
      recentLabel: 'Recent',
    });
    expect(model.categories.map((category) => category.id)).toEqual([
      RECENT_CATEGORY,
      'team',
      ...data.categories.map((category) => category.id),
    ]);
    expect(model.categories[1]).toMatchObject({ label: 'Team', image: 'ship.svg' });
    expect(model.duplicates).toEqual(['ship-it']);
    const recent = model.entries[0] as unknown as { items: { value: string; text: string }[] };
    // The unknown entry is skipped; the others keep their given form.
    expect(recent.items.map((item) => item.text)).toEqual(['Thumbs up', 'Ship it', 'Red heart']);
    expect(model.first.get('team')).toBe(':ship-it:');
    expect((model.entries[1] as { category?: string }).category).toBe('team');
  });

  it('hides Recent while searching and skips empty categories', () => {
    const model = buildPickerModel({
      data: {
        locale: 'en',
        categories: [
          { id: 'a', label: 'A' },
          { id: 'b', label: 'B' },
        ],
        emojis: [{ emoji: '😀', label: 'Grin', keywords: [], category: 'a' }],
      },
      recent: ['😀'],
      custom: [],
      includeRecent: false,
      recentLabel: 'Recent',
    });
    expect(model.categories.map((category) => category.id)).toEqual(['a']);
  });

  it('builds items in the active tone and maps values back to options', () => {
    const data = builtinEmojiData();
    const model = buildPickerModel({
      data,
      recent: ['👍🏽'],
      custom,
      includeRecent: true,
      recentLabel: 'Recent',
    });
    const thumbs = pickerItem(model.slots.get('👍')!, 'dark');
    expect(thumbs).toMatchObject({
      value: '👍🏿',
      emoji: '👍🏿',
      label: 'Thumbs up',
      skinTone: 'dark',
    });
    const grin = pickerItem(model.slots.get('😀')!, 'dark');
    expect(grin.value).toBe('😀');
    expect(grin.skinTone).toBeUndefined();
    // Recent entries keep their own tone, and name it.
    expect(pickerItem(model.slots.get('recent:0')!, 'none')).toMatchObject({
      value: '👍🏽',
      skinTone: 'medium',
    });
    const ship = pickerItem(model.slots.get(':ship-it:')!, 'medium');
    expect(ship).toMatchObject({ value: ':ship-it:', emoji: '', src: 'ship.svg' });
    expect(optionKey('👍🏾', model, data)).toBe('👍');
    expect(optionKey(':blocked:', model, data)).toBe(':blocked:');
    expect(optionKey(':unknown:', model, data)).toBeUndefined();
    expect(optionKey('', model, data)).toBeUndefined();
  });
});

describe('strings', () => {
  it('merges overrides over the defaults', () => {
    expect(resolveStrings({ search: 'Find' })).toEqual({ ...DEFAULT_STRINGS, search: 'Find' });
  });
});
