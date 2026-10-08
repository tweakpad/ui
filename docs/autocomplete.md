# Autocomplete

`tp-autocomplete` is a text field that suggests matching items as you type. Its value is the
text: accepting a suggestion replaces the text, and a form receives the text. Suggestions come
from its items through ranked, typo-tolerant search by default, from the exact matching modes,
or from a search source such as a server endpoint or another search engine.

```html
<tp-autocomplete label="Fruit" placeholder="Search fruit">
  <option>Apple</option>
  <option>Banana</option>
  <option>Raspberry</option>
  <option>Strawberry</option>
</tp-autocomplete>
```

Typing `rasberry` suggests Raspberry; typing `berry` suggests the berries. Matched text is marked
in each suggestion.

Import `@tweakpad/ui/register` and `@tweakpad/ui/styles.css`. To bundle only Autocomplete, call
`defineElement(TpAutocomplete.tagName, TpAutocomplete)`; it defines the components it renders.

Autocomplete is the library's editable choice control (the searchable [Select](select.md)) without
a selection: it shares Select's input group, suggestion surface, positioning, keyboard handling,
completion and presentation. Use Select with `searchable` when the value must be one of the items.

## Items

Items are options in the element (`<option>`, `<optgroup>`, `<hr>`) or the `items` property: strings,
`{ value, label?, text?, disabled? }` records, and groups `{ type: 'group', label, items }`. The text
of an item is what is matched and what replaces the value; `itemToText` converts other values.
`matchFields` adds searchable text that is not displayed, such as keywords or descriptions:

```js
const autocomplete = document.querySelector('tp-autocomplete');
autocomplete.items = countries.map((country) => ({ value: country.name, label: country.name }));
autocomplete.matchFields = (item) => countries.find((c) => c.name === item.value)?.aliases;
```

## Matching

`matching` chooses how the text matches items:

| `matching`        | Matches                                                                                                                                                                     | Order        |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| `fuzzy` (default) | every typed word, as a whole word, a word start, a part of a word (three or more letters) or with a typo (one edit per five letters, a swap of two letters counting as one) | by relevance |
| `contains`        | the text anywhere, ignoring case, accents and punctuation                                                                                                                   | as given     |
| `prefix`          | every typed word at the start of a word                                                                                                                                     | as given     |
| `exact`           | the whole text, ignoring case, accents and punctuation                                                                                                                      | as given     |

Fuzzy matching uses the built-in index of Text search, which ranks with BM25 (rarer and denser
matches rank higher), weighs exact words over word starts, parts and typos, and counts the item
text twice as much as `matchFields`. It is rebuilt only when the items change. `limit` keeps the
first results. `filter` (`(item, query, text) => boolean`) replaces matching with your own
predicate, `filter = null` shows every item, and `filteredItems` supplies the results yourself.

`highlightMatches` (on by default) marks matched text in the `autocomplete-match` part.

## Server search

A search source supplies the suggestions instead of the items. Its `search(query, context)`
returns the results, directly or as a promise; `context` holds an `AbortSignal` for the query, the
`limit` and the `locale`. Results are presented in the order given.

```js
import { createRequestSource } from '@tweakpad/ui';

autocomplete.searchDelay = 250;
autocomplete.source = createRequestSource({
  url: (query) => `/api/cities?q=${encodeURIComponent(query)}`,
  map: (response) => response.cities.map((city) => city.name),
  minLength: 1,
});
```

A query waits `search-delay` milliseconds without typing. A newer query aborts the previous one
(the signal is passed to `fetch`), and results that settle for an older query are ignored. While a
query is pending the previous suggestions stay visible and the list is busy; with nothing to show,
a status row with a spinner reads "Loading suggestions.". A failure shows "Suggestions could not be
loaded.". `searchStatus` is `idle`, `loading`, `loaded` or `error`, and `tp-search-status`
(`{ status, query, total }`) and `tp-search-error` (`{ error, query }`) report changes. Queries run
while the suggestions are shown, including the empty query.

Results may be plain items or hits `{ item, score?, terms?, matches? }`. Matched ranges come from
`matches` (`[{ field: 'text', ranges: [[start, end], …] }]`), else from `terms`, else from the
typed words, so a server that reports what matched is highlighted exactly.

## Other search engines

Any engine plugs in as a source; the library depends on none of them. For example, with an engine
that returns ranked items and match positions:

```js
autocomplete.source = {
  search(query) {
    return engine.search(query).map((result) => ({
      item: result.item,
      score: result.score,
      matches: [
        { field: 'text', ranges: result.positions.map(([start, end]) => [start, end + 1]) },
      ],
    }));
  },
};
```

The built-in index is available on its own as `createIndexSource(items, options)` and `TextIndex`,
for example to search records over several fields with boosts:

```js
import { createIndexSource } from '@tweakpad/ui';

autocomplete.source = createIndexSource(articles, {
  fields: ['title', 'summary'],
  boost: { title: 3 },
  extract: (article, field) => article[field],
});
autocomplete.itemToText = (article) => article.title;
```

## Completion modes

| `completion-mode` | Suggestions                | While navigating                                                                |
| ----------------- | -------------------------- | ------------------------------------------------------------------------------- |
| `list` (default)  | filtered by the text       | the text is unchanged                                                           |
| `both`            | filtered by the typed text | the highlighted suggestion completes the text, with the completed part selected |
| `inline`          | all items                  | as `both`                                                                       |
| `none`            | all items                  | the text is unchanged                                                           |

`auto-highlight` highlights the first suggestion after typing (`auto-highlight="always"` also on
opening), so Enter accepts it. `keep-highlight` keeps the highlight when the pointer leaves.

## Keyboard and forms

Down and Up open the suggestions and move through them; Home and End go to the first and last.
Enter accepts the highlighted suggestion; with nothing highlighted the text stands and the owning
form submits. Escape first removes a completion, then closes, and while closed clears the text.
Typing opens the suggestions; clearing the text closes them unless `open-on-input-click` is set.
Composition (IME) input never navigates or accepts.

With `name`, the form receives the text. `required` requires text; `disabled` and `read-only`
behave as for text inputs. `submit-on-item-click` submits the form after a suggestion is accepted.
Form reset restores `default-value`.

## Properties

| Property / attribute                                           | Values                                      | Default               |
| -------------------------------------------------------------- | ------------------------------------------- | --------------------- |
| `value`                                                        | the text (controlled)                       | —                     |
| `defaultValue` / `default-value`                               | initial text                                | `''`                  |
| `items`                                                        | items, records or groups                    | element options       |
| `matching`                                                     | `fuzzy`, `contains`, `prefix`, `exact`      | `fuzzy`               |
| `matchFields`                                                  | `(item) => string \| string[]`              | —                     |
| `source`                                                       | search source                               | —                     |
| `searchDelay` / `search-delay`                                 | milliseconds                                | `0`                   |
| `highlightMatches` / `highlight-matches`                       | boolean                                     | `true`                |
| `filter`, `filteredItems`                                      | predicate or `null`, ordered results        | —                     |
| `limit`                                                        | maximum suggestions, `-1` for all           | `-1`                  |
| `completionMode` / `completion-mode`                           | `list`, `both`, `inline`, `none`            | `list`                |
| `autoHighlight` / `auto-highlight`                             | `false`, `true`, `always`                   | `false`               |
| `keepHighlight` / `keep-highlight`, `loopFocus` / `loop-focus` | boolean                                     | `false`, `true`       |
| `openOnInputClick` / `open-on-input-click`                     | boolean                                     | `false`               |
| `submitOnItemClick` / `submit-on-item-click`                   | boolean                                     | `false`               |
| `showTrigger` / `show-trigger`, `showClear` / `show-clear`     | boolean                                     | `false`, `false`      |
| `open`, `defaultOpen` / `default-open`                         | boolean                                     | `false`               |
| `label`, `placeholder`                                         | accessible name, placeholder                | `'Suggestions'`, `''` |
| `messages`                                                     | `{ loading, error, empty, results(count) }` | English texts         |
| `locale`, `itemToText`, `itemToLabel`                          | matching locale, text and label of a value  | inherited             |
| `name`, `required`, `disabled`, `readOnly`                     | form attributes                             | —                     |

Placement (`placement`, `side`, `align`, offsets, collision options), `inline`, `modal`, `grid`,
`virtualized` and `container` work as in [Select](select.md).

Read-only: `searchStatus`, `inputElement`, `highlightedValue`. Methods: `clear()`, `setOpen(open)`,
`updatePosition()`, `actions.unmount()`.

## Events

| Event              | Detail                             | When                                                                        |
| ------------------ | ---------------------------------- | --------------------------------------------------------------------------- |
| `tp-value-change`  | `{ value, previousValue, reason }` | the text changes: `input`, `item-press`, `clear`, `escape-key` (cancelable) |
| `tp-open-change`   | `{ open, reason }`                 | the suggestions open or close (cancelable)                                  |
| `tp-search-status` | `{ status, query, total }`         | a search source's status changes                                            |
| `tp-search-error`  | `{ error, query }`                 | a search source fails                                                       |

`onValueChange`, `onOpenChange` and `onItemHighlighted(value, { index, reason })` are the callback
forms.

## Accessibility

The input is a combobox with `aria-autocomplete` matching the completion mode; DOM focus stays in
it while the highlight moves through the listbox (`aria-activedescendant`). Suggestions are options
without a selected state. A polite status region announces the result count, loading and errors,
in the `messages` texts. Give the field a label with `label` or a [Field](field.md).

## Styling

Parts: `autocomplete`, `autocomplete-input-group`, `autocomplete-input`, `autocomplete-trigger`,
`autocomplete-clear`, `autocomplete-content`, `autocomplete-list`, `autocomplete-group`,
`autocomplete-group-label`, `autocomplete-item`, `autocomplete-match`, `autocomplete-row`,
`autocomplete-separator`, `autocomplete-empty-state` and `autocomplete-status`. They present as
the searchable Select's parts; the match part adds weight to matched text. Slot `empty` replaces
the empty-state content.
