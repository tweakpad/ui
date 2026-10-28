# Command palette

Command Palette filters and runs commands. Query text and the active command are independent state values. Activating an item emits `tp-execute`; it does not commit selection or close the palette automatically. The application decides what execution does, including whether to call `close()`.

```js
import '@tweakpad/ui/register';
import '@tweakpad/ui/styles.css';
import { TpCommandPalette } from '@tweakpad/ui';
const palette = new TpCommandPalette();
palette.inline = true;
palette.items = [
  {
    type: 'group',
    label: 'Documents',
    items: [
      { value: 'new', label: 'New document', keywords: ['create'], shortcut: '⌘N' },
      { value: 'open', label: 'Open document', shortcut: '⌘O' },
    ],
  },
  { type: 'separator' },
  { value: 'settings', label: 'Settings', keywords: ['preferences'] },
];
palette.onExecute = (event) => console.log(event.detail.commandId);
document.body.append(palette);
```

For a modal palette, leave `inline` false and provide a library Button in `slot="trigger"`. The Dialog provides opening, focus containment, inertness, Escape/outside dismissal, restoration and presence. `showCloseControl` defaults false for the palette, but a Dialog requires a reachable named close action: the corner Close remains visible unless you supply another, such as a Button in `slot="close"`. Header naming is visually hidden; title, description and optional footer/close slots retain Dialog semantics.

| Property / attribute                                                                                             | Type and default                                               | Behavior                                                                               |
| ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `inline`                                                                                                         | boolean, false                                                 | Inline collection instead of optional Dialog presentation.                             |
| `items`                                                                                                          | `readonly CommandEntry[]`, absent                              | Command items/groups/separators; native option children are also supported.            |
| `query`, `defaultQuery` / `query`, `default-query`                                                               | string, uncontrolled empty                                     | Independent query state and initial default.                                           |
| `value`, `defaultValue`                                                                                          | unknown, uncontrolled empty                                    | Active command identifier; never persistent selection.                                 |
| `filter`                                                                                                         | `(item, query) => number \| false`, default ranked Text search | False excludes; finite ranks sort ascending and preserve source order on ties.         |
| `shouldFilter` / `should-filter`                                                                                 | boolean, true                                                  | False treats supplied items as the visible set. `filter=null` also disables filtering. |
| `loopNavigation` / `loop-navigation`                                                                             | boolean, false                                                 | Wrap keyboard navigation at boundaries.                                                |
| `placeholder`                                                                                                    | string, `Type a command or search…`                            | Query placeholder.                                                                     |
| `label`, `description`                                                                                           | `Command Palette`, `Search for a command to run.`              | Accessible query and Dialog name/description.                                          |
| `disabled`                                                                                                       | boolean, false                                                 | Disables query and execution.                                                          |
| `showCloseControl` / `show-close-control`                                                                        | boolean, false                                                 | Subject to the inherited reachable-close requirement.                                  |
| `open`, `defaultOpen`, `keepMounted`, `modality`, `initialFocus`, `finalFocus`, dismissal policies and callbacks | inherited                                                      | Complete [Dialog API](./dialog.md).                                                    |

`CommandItem` supports `value`, `label` (text or Lit content), `text` (search/accessible text), `keywords`, `description`, `disabled`, `icon` (`IconDefinition`), `shortcut`, `forceMount`, `onSelect`, and the existing option/text/indicator part contracts. A `description` renders as a secondary line after the label in the `command-palette-item-description` part and is the item's accessible description; the accessible name stays the label. It takes part in filtering only through a supplied `filter`, and matches are marked only in the label. Icons and shortcuts render actual Icon and Key Hint components. A shortcut is informative; the palette never installs global key bindings. Groups use `{type:'group', label?, items, forceMount?}`; separators use `{type:'separator'}`. Forced hidden content stays out of accessibility, navigation and empty-state counts.

The default matcher is the shared [Text search](autocomplete.md#matching): case and accents are ignored, every query word must match the command's text, value or a keyword as a whole word, a word start, a part of a word (three or more letters) or with a typo, and commands rank by relevance (text counts double). Matched text is marked in the `command-palette-match` part. Disabled matches remain visible but cannot execute. `noExecutableMatch` is true when results exist but every match is disabled. Duplicate values retain the first registered command. Query changes and source removal preserve a visible enabled active command, otherwise repair to the first enabled result.

Controlled state must be supplied before connection. Accept synchronously by assigning the corresponding property in its callback. Rejection/cancellation restores only that state. `onQueryChange` receives `TpValueChangeEvent<string>` and `tp-query-change`; `onValueChange` receives `TpValueChangeEvent<unknown>` and `tp-value-change`. Standard details include the previous/proposed value, reason and source event. `onExecute` and `tp-execute` receive a cancelable event with `{commandId, sourceEvent}`. The item's `onSelect` receives this activation event first; canceling it prevents execution publication. It does not mutate active value.

Methods `setOpen`, `close`, `unmount`, `registerTrigger`, `registerCloseAction`, and Dialog handle integration behave as in Dialog. `inputElement` exposes the current native editor; `noExecutableMatch` is read-only. Arrow keys, Home/End and Enter navigate and execute commands. Pointer hover never scrolls or executes. IME suppresses navigation/activation until composition ends.

Canonical parts: `command-palette`, `command-palette-input-wrapper`, `command-palette-input`, `command-palette-list`, `command-palette-group`, `command-palette-item`, `command-palette-item-description`, `command-palette-match`, `command-palette-shortcut-hint`, `command-palette-separator`, `command-palette-empty-state`. Modal composition retains Dialog parts. State markers include `data-empty`, `data-no-executable-match`, and the shared focused/highlighted/selected/disabled/query surface states. `slot="empty"` replaces empty content. Inherited `partContracts`, `partPresentation`, scoped tokens and the presentation dictionary customize these parts; there are no palette spacing attributes.

## Command list with an external input

`tp-command-list` is the palette's list member. Used on its own, `inline` false presents its list and empty state in a popup in the top layer at `anchor` (an element or a virtual anchor, property only) with `placement` (default `block-end start`), shown while its `open` is true. `matching`, `source`, `searchDelay`, `highlightMatches` and `matchFields` work as in Select.

Set `queryOwner` (property only, default null) to an editing element that keeps focus, such as an editor in which a typed trigger character opens suggestions. The list then renders no input: the owner supplies the query through `inputValue`, controls `open`, closes the list when `onOpenChange` proposes closing (Escape or a press outside both the owner and the list), and forwards its keys:

```js
list.queryOwner = editor;
list.inline = false;
editor.addEventListener('keydown', (event) => {
  if (!list.open) return;
  const consumed = ['Enter', 'Tab'].includes(event.key)
    ? list.activateHighlighted(event)
    : list.handleQueryKey(event);
  if (consumed) event.preventDefault();
});
```

`handleQueryKey(event)` applies Arrow Up, Arrow Down, Home and End to the highlight and returns whether it consumed the key; `activateHighlighted(event)` executes the highlighted item for Enter or Tab and returns false when nothing is highlighted, so the key reaches the owner. The list never moves focus from the owner, also on a pointer press on an item, and closing it aborts a pending `source` call. `activeDescendantReference()` returns the list element, which forwards `aria-activedescendant` and `aria-controls` references to the highlighted item, or null where such references cannot cross into its shadow root; announce the highlighted item instead in that case.
