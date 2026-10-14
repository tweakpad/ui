# Citation

`tp-citation` attributes content to a source inline: in a generated answer, an article, or anywhere a statement needs its provenance. It is an outlined chip that can show a source icon, a label and a number. With an address it is a link to the source; with a description it also previews the source on hover or keyboard focus. `tp-citation-list` presents the numbered sources that in-text citations refer to.

```html
<p>
  Tidal turbines produce power on a timetable set by the moon
  <tp-citation href="https://tides.example/turbines" src="/icons/tides.svg"
    >tides.example</tp-citation
  >.
</p>
```

## Content

- **Label**: the default slot, such as the site or the source title. Long labels end in an ellipsis.
- **Number**: `index`. A citation that shows only a number is a compact round chip; with a label, the number leads the chip.
- **Source icon**: `src` takes an image address, such as a site icon. The icon keeps its space while it loads. When it fails, the `icon` slot is used, else a generic web mark. Put a `tp-icon` in the `icon` slot to show an icon without an image.
- **Preview**: a `description`, or content in the `preview` slot, adds a preview card with the source icon, host, title and description. It opens after a short hover or on keyboard focus and closes when the pointer leaves both the citation and the card. The citation still activates its link normally.

## Links

An `href` renders a native link that carries `href`, `target` and `rel`. Relative addresses, `#fragment` addresses and `http`, `https`, `mailto` and `tel` addresses are accepted. Any other address, or no address, renders plain text that is not focusable, unless a preview needs a focus target.

A site address, one that starts with `http://` or `https://`, opens in a new tab. Set `target`, such as `target="_self"`, to open it elsewhere. While a labelled site citation is hovered or focused, an external-link mark appears over the end of its label and the label fades out beneath it. The citation never changes width, so the surrounding text does not move. Only labelled citations with a site address show the mark; numbered markers and other addresses do not.

Linked citations brighten their text and strengthen their border on hover, and show the focus ring and the minimum hit area; plain citations do not.

## Placement

Citations sit on the text baseline. Set `superscript` to raise one like a footnote marker; its size does not change. A citation that shows only a number keeps a small space from the word it follows, so markers can be written directly after the word.

Use one style per passage: labelled citations after the statements they support, or numbered markers that point to a Citation list. A number and a label can be combined in one citation, but mixing both styles in a passage makes it harder to scan.

## Citation list

`tp-citation-list` presents sources as a list. Each child `tp-citation` is a list item, numbered from `start` in document order unless it sets its own `index`. Numbers update when entries are added, removed or moved.

An in-text citation can name a list entry by its `id` with `source`. It then takes every value it does not set itself from that entry: number, address, target, relation, title, description and the icon shown in its preview. Its visible label and icon stay its own, so a `source` citation without content is a plain number. Edit the entry and every citation that names it follows, including citations rendered before the list exists.

```html
<p>
  Output is predictable<tp-citation source="tidal-1" href="#tidal-1" superscript></tp-citation> and
  storage needs stay small<tp-citation source="tidal-2" href="#tidal-2" superscript></tp-citation>.
</p>
<tp-citation-list label="Sources">
  <tp-citation
    id="tidal-1"
    href="https://tides.example/turbines"
    description="Ten-year inspection results."
  >
    Blade wear in fast tidal streams
  </tp-citation>
  <tp-citation
    id="tidal-2"
    href="https://grid.example/storage"
    description="Battery sizing for predictable generation."
  >
    Grid storage notes
  </tp-citation>
</tp-citation-list>
```

Numbered markers usually link to their entry: give each one the entry's fragment as its own `href`, such as `href="#tidal-1"`. Activating the marker moves focus to the entry, its preview shows the entry's source, and the entry opens the site. Without its own `href`, a marker links straight to the source.

## Accessibility

A citation's accessible name is the citation word, its number and its label, else its source title, else the address host, for example "Citation 1: Blade wear in fast tidal streams". When the link opens in a new tab, the name ends with "(opens in a new tab)". Numbers follow the locale of the nearest `lang`. A plain citation is announced as a note with the same name. The preview is supplementary: its text describes the citation without replacing its name, and the destination page must carry everything a reader needs. The list is announced as a list named by `label`.

## API

### `tp-citation`

| Property / attribute           | Type                                                                                    | Default   | Meaning                                                                     |
| ------------------------------ | --------------------------------------------------------------------------------------- | --------- | --------------------------------------------------------------------------- |
| `href`                         | string \| null                                                                          | `null`    | Source address. An accepted address renders a link.                         |
| `target`                       | string \| null                                                                          | `null`    | Link target. Unset, a site address opens in a new tab.                      |
| `rel`                          | string \| null                                                                          | `null`    | Link relation.                                                              |
| `index`                        | number \| null                                                                          | `null`    | Displayed number. Inside a Citation list, the entry's position by default.  |
| `src`                          | string                                                                                  | `''`      | Source icon image address.                                                  |
| `sourceTitle` / `source-title` | string                                                                                  | `''`      | Full source title for the preview and the accessible-name fallback.         |
| `description`                  | string                                                                                  | `''`      | Preview text. Enables the preview.                                          |
| `source`                       | string                                                                                  | `''`      | `id` of a citation in the same document or shadow root to take values from. |
| `superscript`                  | boolean                                                                                 | `false`   | Raises the citation like a footnote marker.                                 |
| `variant`                      | `outline`, `secondary`, `default`, `ghost`, `link`, `success`, `warning`, `destructive` | `outline` | Badge treatment.                                                            |
| `messages`                     | `{ citation?: string; newTab?: string }` (property only)                                | English   | Accessible-name text: `Citation` and `opens in a new tab`.                  |
| `resolvedSource`               | read-only: `{ href, target, rel, number, src, sourceTitle, description }`               | —         | The values the citation presents after taking unset ones from `source`.     |

Slots: the default slot (label), `icon` (source icon used when `src` is unset or fails) and `preview` (extra preview content).

### `tp-citation-list`

| Property / attribute | Type                                   | Default    | Meaning                                     |
| -------------------- | -------------------------------------- | ---------- | ------------------------------------------- |
| `label`              | string                                 | `''`       | Accessible list name; `Sources` if empty.   |
| `start`              | number                                 | `1`        | Number of the first entry.                  |
| `orientation`        | `vertical`, `horizontal`               | `vertical` | Stack the entries or let them wrap in rows. |
| `messages`           | `{ sources?: string }` (property only) | English    | Default list name.                          |

Slot: the default slot takes `tp-citation` entries.

## Styling

The chip is a composed Badge, so Badge tokens, variants and dictionary entries apply. The default `outline` chip is only a border: it has no hover fill. Outline and ghost citations show their text in the muted foreground, so they read below the surrounding text, and switch to the foreground while a link is hovered or focused. Public parts:

| Part                           | Element                                    |
| ------------------------------ | ------------------------------------------ |
| `citation-badge`               | The composed `tp-badge`.                   |
| `citation-index`               | The number.                                |
| `citation-icon`                | The source icon.                           |
| `citation-label`               | The label.                                 |
| `citation-external`            | The external-link mark over the label end. |
| `citation-preview`             | The composed `tp-preview-card`.            |
| `citation-preview-source`      | Preview row with the source icon and host. |
| `citation-preview-title`       | Preview title.                             |
| `citation-preview-description` | Preview description.                       |
| `citation-list`                | The list in `tp-citation-list`.            |

Host markers: `data-linked` while the citation is a link, `data-external` while it shows the external-link mark, and `data-number-only` while it shows only a number. Use `partPresentation` or the presentation dictionary to change a part, for example a wider label with `partPresentation = { 'citation-label': { styleHook: { 'max-inline-size': '20rem' } } }`.
