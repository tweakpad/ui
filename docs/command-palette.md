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

For a modal palette, leave `inline` false and provide a library Button in `slot="trigger"`. The actual Dialog owner provides opening, focus containment, inertness, Escape/outside dismissal, restoration and presence. `showCloseControl` defaults false for the palette, but the library Dialog contract requires a reachable named close action: the corner Close remains visible unless you supply another, such as a Button in `slot="close"`. This differs intentionally from shadcn's unrestricted hidden close button. Header naming is visually hidden; title, description and optional footer/close slots retain Dialog semantics.

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

`CommandItem` supports `value`, `label` (text or Lit content), `text` (search/accessible text), `keywords`, `disabled`, `icon` (`IconDefinition`), `shortcut`, `forceMount`, `onSelect`, and the existing option/text/indicator part contracts. Icons and shortcuts render actual Icon and Key Hint components. A shortcut is informative; the palette never installs global key bindings. Groups use `{type:'group', label?, items, forceMount?}`; separators use `{type:'separator'}`. Forced hidden content stays out of accessibility, navigation and empty-state counts.

The default matcher is the shared [Text search](autocomplete.md#matching): case and accents are ignored, every query word must match the command's text, value or a keyword as a whole word, a word start, a part of a word (three or more letters) or with a typo, and commands rank by relevance (text counts double). Matched text is marked in the `command-palette-match` part. Disabled matches remain visible but cannot execute. `noExecutableMatch` is true when results exist but every match is disabled. Duplicate values retain the first registered command. Query changes and source removal preserve a visible enabled active command, otherwise repair to the first enabled result.

Controlled state must be supplied before connection. Accept synchronously by assigning the corresponding property in its callback. Rejection/cancellation restores only that state. `onQueryChange` receives `TpValueChangeEvent<string>` and `tp-query-change`; `onValueChange` receives `TpValueChangeEvent<unknown>` and `tp-value-change`. Standard details include the previous/proposed value, reason and source event. `onExecute` and `tp-execute` receive a cancelable event with `{commandId, sourceEvent}`. The item's `onSelect` receives this activation event first; canceling it prevents execution publication. It does not mutate active value.

Methods `setOpen`, `close`, `unmount`, `registerTrigger`, `registerCloseAction`, and Dialog handle integration retain the Dialog contract. `inputElement` exposes the current native editor; `noExecutableMatch` is read-only. Arrow keys, Home/End and Enter operate through the shared editable choice collection. Pointer hover never scrolls or executes. IME suppresses navigation/activation until composition ends.

Canonical parts: `command-palette`, `command-palette-input-wrapper`, `command-palette-input`, `command-palette-list`, `command-palette-group`, `command-palette-item`, `command-palette-match`, `command-palette-shortcut-hint`, `command-palette-separator`, `command-palette-empty-state`. Modal composition retains Dialog parts. State markers include `data-empty`, `data-no-executable-match`, and the shared focused/highlighted/selected/disabled/query surface states. `slot="empty"` replaces empty content. Inherited `partContracts`, `partPresentation`, scoped tokens and the presentation dictionary customize the actual shared parts; there are no palette spacing attributes.
