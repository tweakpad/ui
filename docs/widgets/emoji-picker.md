# Emoji picker

`tp-emoji-picker` chooses one emoji. A search field filters a categorized grid of emoji by name
and keyword, a category bar jumps between categories, a skin tone menu applies a tone to the
emoji that accept one, and a footer previews the highlighted emoji. The picker shows inline or
opens from a trigger in a popup. It ships with a small English dataset, so it works without any
setup or network access; the complete dataset is one adapter away.

```html
<script type="module">
  import '@tweakpad/ui/styles.css';
  import '@tweakpad/ui/register';
  import '@tweakpad/ui/register/widgets';
</script>
<tp-emoji-picker label="Reaction" name="reaction"></tp-emoji-picker>
```

Supply `value` for a controlled picker or `defaultValue` for an uncontrolled one; the mode stays
fixed for the element's lifetime. The same rule applies to the `query`, `skinTone` and `open`
lanes.

## Value

The value is the chosen emoji as a string, with the active skin tone applied when the emoji
accepts one (`👍🏽`), or `:id:` for a custom emoji. The empty string means no emoji. The option of
the current value is marked selected in the grid.

## Picking

Every pick dispatches the cancelable `tp-action` with `{ value, item, sourceEvent }`, where
`item` describes the emoji: its `value`, `emoji` glyph, `label`, `keywords`, `category`, the
`skinTone` applied and, for a custom emoji, its image `src`. Cancelling `tp-action` leaves the
value and the popup unchanged. A pick of a different emoji then proposes the cancelable
`tp-value-change` (reason `item-press` for a press, `keyboard` for Enter) with `item` and
`category` in its metadata, and commits at once with `tp-value-commit`. Picking the current
emoji again dispatches only `tp-action`, so an application that inserts emoji into text listens
to `tp-action`.

## Data

Without `data` the picker uses its built-in English dataset: a small selection of common emoji in
every standard category, each with a name, keywords and its Emoji version. For the complete set,
or another language, set `data` to a dataset or to a data source: a function that receives
`{ locale, signal }` and returns a dataset or a promise of one.

```ts
import { createEmojibaseSource } from '@tweakpad/ui/emoji';

picker.data = createEmojibaseSource({ url: 'https://cdn.jsdelivr.net/npm/emojibase-data@16' });
```

`createEmojibaseSource` loads `<url>/<locale>/data.json` and `<url>/<locale>/messages.json` from
the Emojibase dataset, hosted wherever you choose: your own server, or a public copy as above.
The locale comes from `locale` (or the document language) and falls back to English when the
dataset does not publish it. Concurrent pickers share one load. Converted datasets are kept in
local storage and revalidated against the files' entity tags at most once per session; pass
`cache: false` to skip the cache. To bundle the data instead, import the files and convert them:

```ts
import emojis from 'emojibase-data/en/data.json';
import messages from 'emojibase-data/en/messages.json';
import { createEmojibaseData } from '@tweakpad/ui/emoji';

picker.data = createEmojibaseData(emojis, messages, 'en');
```

The library never depends on the dataset; your application chooses where it comes from. A
dataset of your own has the shape `{ locale, categories, emojis, skinTones? }`: categories are
`{ id, label, icon? }` in display order, and emojis are
`{ emoji, label, keywords, category, version?, skins?, flag? }`.

The picker calls a source after it connects, when `data` or `locale` changes and on `reload()`,
aborting the previous call. While a call is pending, `status` is `loading` and the previous
emoji stay listed; a failure shows an error with a Retry button. Every status change dispatches
`tp-loading-status-change` with `{ status, error }`.

### Platform support

The picker hides emoji the platform cannot draw. After connecting, it draws one emoji of each
Emoji version in the dataset and keeps the newest version that renders as a color glyph;
`supportedVersion` reports it. Country flags are hidden where the platform draws them as
letters. Set `emojiVersion` to cap the versions yourself.

## Search

Typing filters the emoji whose name or keywords contain the text, in category order, and
highlights the first match; a status message announces the number of matches. The Recent
category is hidden while searching. The `query` lane proposes the cancelable `tp-query-change`.

## Categories

The category bar is a row of icon tabs, one per category, underlined like `variant="underline"`
Tabs; a Tooltip names the tab under the pointer or focus. The selected category follows the top of
the list; pressing one scrolls its label to the top and highlights its first emoji, clearing an
active search, and it stays selected until the list scrolls or the highlight moves. `scrollToCategory(id)` does the same from code. Category labels stay at the top of the
list while their category scrolls; `sticky="false"` turns that off. `category-bar="false"` hides
the bar.

## Recent and custom emoji

`recent` lists emoji your application wants to offer first, such as the latest picks; the picker
keeps no history of its own. Entries the dataset does not know are skipped. `custom` adds your
own image emoji in categories of their own, after Recent and before the dataset:

```js
picker.custom = [
  {
    id: 'workspace',
    label: 'Workspace',
    emojis: [{ id: 'ship-it', label: 'Ship it', keywords: ['deploy'], src: '/emoji/ship-it.png' }],
  },
];
```

A custom emoji publishes `:id:` as its value. Its category shows `icon` in the bar, or its first
image.

## Skin tones

The skin tone Button shows a hand in the current tone and opens a "Skin tone" menu listing every
tone by its short name (Default, Light, Medium-light, Medium, Medium-dark and Dark) with its hand.
Choosing one proposes the cancelable `tp-skin-tone-change` and closes the menu. Emoji whose dataset record lists tone variants show them;
other hand and person emoji receive the tone modifier. Toned emoji are named with their tone, for
example "Thumbs up, Medium skin tone". `skin-tone-selector="false"` hides the Button.

## Popup

`picker="popup"` renders a trigger Button showing the chosen emoji (or a smiling face), named by
`label` ("Choose emoji" without one) and the chosen emoji, and opens the picker in a Popover with
focus in the search field. A pick closes it with reason `item-press`; cancel that
`tp-open-change` to keep it open for several picks. Escape, an outside press or focus leaving
close it and return focus to the trigger. Put your own trigger in the `trigger` slot to replace
the Button. `open` and `defaultOpen` control the popup, `setOpen()` and `close()` change it, and
the Popover's `tp-open-change` and `tp-open-change-complete` are dispatched from the picker.

## Events

| Event                      | Detail                                                                                       | Cancelable                     |
| -------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------ |
| `tp-action`                | `value`, `item`, `sourceEvent`                                                               | yes: no value change, no close |
| `tp-value-change`          | value, previous value, reason, `{ item, category }` metadata                                 | yes                            |
| `tp-value-commit`          | value, previous value, reason                                                                | no                             |
| `tp-query-change`          | query, reason (`input`, `input-clear`, `input-paste`, `clear`, `item-press`, `programmatic`) | yes                            |
| `tp-skin-tone-change`      | tone, reason (`item-press`, `programmatic`)                                                  | yes                            |
| `tp-open-change`           | open, reason                                                                                 | yes                            |
| `tp-open-change-complete`  | `{ open }`                                                                                   | no                             |
| `tp-loading-status-change` | `{ status, error }`                                                                          | no                             |

Events of the composed controls stay inside the picker.

## Keyboard

Focus stays in the search field while the highlight moves through the grid.

| Key                        | Action                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------- |
| Down, Up                   | Next or previous row, keeping the column; the first emoji when nothing is highlighted |
| Left, Right                | Previous or next emoji in the row, following the writing direction                    |
| Home, End                  | First or last emoji                                                                   |
| Enter                      | Pick the highlighted emoji                                                            |
| Tab                        | Move to the skin tone Button and the footer                                           |
| Arrows in the category bar | Move between categories; Enter or Space jumps                                         |
| Enter on the skin tone     | Open the tone menu; arrows move, Enter chooses, Escape closes                         |

Hovering an emoji with a mouse highlights it; pressing it picks it without moving focus.

## Constituents and accessibility

The search field is a combobox named "Search emoji" that points its active descendant at the
highlighted emoji. The grid is a listbox named by `label`; each category is a group named by its
label, and each emoji is an option named by its name (and tone) with its position in the whole
list. A polite status announces the number of matches, loading and errors; tone changes are
announced. The category bar is a tab list named "Categories" whose tabs are named by their
categories. The skin tone Button is named by "Skin tone" and the current tone and opens a menu of
radio items with the current tone checked. The preview and custom images
are decorative. Only the rows near the visible part of the list are rendered, so large datasets
stay fast.

## Forms and Field

With `name`, the chosen emoji submits as the form value; `required` reports "Please choose an
emoji." while empty, form reset restores `defaultValue` (reason `form-reset`), and the picker
works as the control of a `tp-field`. `disabled` makes the picker inert; `readOnly` keeps
searching, browsing and the skin tone but refuses picks.

## Parts and customization

Parts: `emoji-picker`, `emoji-picker-categories`, `emoji-picker-category`, `emoji-picker-search`,
`emoji-picker-input`, `emoji-picker-clear`, `emoji-picker-list`, `emoji-picker-group`,
`emoji-picker-group-label`, `emoji-picker-row`, `emoji-picker-item`, `emoji-picker-image`,
`emoji-picker-empty`, `emoji-picker-status`, `emoji-picker-retry`, `emoji-picker-footer`,
`emoji-picker-preview`, `emoji-picker-preview-emoji`, `emoji-picker-preview-label`,
`emoji-picker-skin-tone`, `emoji-picker-trigger` and `emoji-picker-popup`. Style them with
`::part()`, through `partPresentation` or with a presentation dictionary. The `size` axis (`sm`, `default`, `lg`) sets
the cell to the small, medium or large control height and the emoji to the large, extra-large
or double-extra-large text size; `columns` sets the emoji per row (9 by default). The list shows
seven rows by default and fills a block size you set on the picker. Emoji glyphs use the
`--tp-font-emoji` role, which you can point at an emoji web font.

Host markers: `data-picker`, `data-status`, `data-loading`, `data-error`, `data-empty`,
`data-searching`, `data-sticky`, `data-category-bar`, `data-preview`, `data-skin-tone` and
`data-open`.

The texts are replaceable through `strings` (`emojiPickerStrings` holds the defaults): `label`,
`search`, `searchPlaceholder`, `noResults`, `results` (with `{count}`), `resultsOne`, `loading`,
`error`, `retry`, `recent`, `categories`, `skinTone`, `skinToneChanged` (with `{tone}`), the tone
names `toneNone` … `toneDark` used in emoji names and announcements, the short tone names
`toneOptionNone` … `toneOptionDark` of the skin tone menu, `trigger`, `previewPlaceholder` and
`valueMissing`. Tone names from a dataset take precedence in emoji names.

## API reference

| Property                                     | Attribute                                       | Type                                              | Default                         |
| -------------------------------------------- | ----------------------------------------------- | ------------------------------------------------- | ------------------------------- |
| `value` / `defaultValue`                     | `value` / `default-value`                       | `string`                                          | `''`                            |
| `query` / `defaultQuery`                     | `query` / `default-query`                       | `string`                                          | `''`                            |
| `skinTone` / `defaultSkinTone`               | `skin-tone` / `default-skin-tone`               | `SkinTone`                                        | `'none'`                        |
| `picker`                                     | `picker`                                        | `'inline' \| 'popup'`                             | `'inline'`                      |
| `open` / `defaultOpen`                       | `open` / `default-open`                         | `boolean`                                         | `false`                         |
| `data`                                       | —                                               | `EmojiData \| EmojiDataSource`                    | built-in dataset                |
| `emojiVersion`                               | `emoji-version`                                 | `number`                                          | detected                        |
| `columns`                                    | `columns`                                       | `number`                                          | `9`                             |
| `sticky`                                     | `sticky`                                        | `boolean`                                         | `true`                          |
| `recent`                                     | —                                               | `string[]`                                        | `[]`                            |
| `custom`                                     | —                                               | `CustomEmojiGroup[]`                              | `[]`                            |
| `categoryBar`, `preview`, `skinToneSelector` | `category-bar`, `preview`, `skin-tone-selector` | `boolean`                                         | `true`                          |
| `size`                                       | `size`                                          | `'sm' \| 'default' \| 'lg'`                       | `'default'`                     |
| `label`, `locale`, `strings`                 | `label`, `locale`, —                            | `string`, `string`, `Partial<EmojiPickerStrings>` | `''`, `''`, `{}`                |
| `name`, `disabled`, `readOnly`, `required`   | `name`, `disabled`, `readonly`, `required`      | `string`, `boolean`, `boolean`, `boolean`         | `''`, `false`, `false`, `false` |
| `onValueChange`, `onValueCommitted`          | —                                               | callbacks                                         | `undefined`                     |

Read-only: `emojiData`, `status`, `activeEmoji`, `activeCategory`, `controlled`,
`supportedVersion`. Methods: `setValue(value, reason?, sourceEvent?)`,
`setOpen(open, reason?, event?)`, `close()`, `reload()`, `scrollToCategory(id)`, `focus()`.
Slots: `trigger`, `footer`.

`@tweakpad/ui/emoji` (also re-exported from `@tweakpad/ui/widgets`) holds the data helpers:
`builtinEmojiData`, `createEmojibaseSource`, `createEmojibaseData`, `createEmojiDataCache`,
`getEmojiDetails`, `applySkinTone`, `isEmojiSupported`, `detectEmojiSupport` and the dataset
types.
