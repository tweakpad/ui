# Table of contents

`tp-table-of-contents` lists links to targets on the page and marks the one the reader has
reached. An indicator on the inline-start rail spans the active items.

```html
<div class="page">
  <article>
    <h2 id="features">Features <a href="#features">#</a></h2>
    …
  </article>
  <aside class="page-toc">
    <tp-table-of-contents>
      <tp-table-of-contents-item href="#features">Features</tp-table-of-contents-item>
      <tp-table-of-contents-item href="#playground">Playground</tp-table-of-contents-item>
      <tp-table-of-contents-item href="#bundle-size">Bundle size</tp-table-of-contents-item>
    </tp-table-of-contents>
  </aside>
</div>
```

```css
.page {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 14rem;
  align-items: start;
}
.page-toc {
  position: sticky;
  top: 1.5rem;
  max-block-size: calc(100vh - 3rem);
  overflow: auto;
}
```

The usual place is a sticky column on either side of the page, inside the same scroll container
as the content: the document, or a scroll area that acts as the page. The table of contents
finds that container from its targets, so the same markup works in both. When the list is longer
than its column, the current link is kept in view inside the column only.

## Compact

`variant="compact"` draws less attention: it shows one short line per top-level item and
highlights the line of the section you are reading. Hovering the lines, or pressing them, opens a
card with the title and the full list over them. It usually sits at the vertical center of the
page edge:

```html
<tp-table-of-contents variant="compact" class="page-toc-compact">
  <tp-table-of-contents-item href="#features">Features</tp-table-of-contents-item>
  <tp-table-of-contents-item href="#install" depth="2">Install</tp-table-of-contents-item>
  <tp-table-of-contents-item href="#playground">Playground</tp-table-of-contents-item>
</tp-table-of-contents>
```

```css
.page-toc-compact {
  position: fixed;
  inset-inline-end: 1rem;
  top: 50%;
  translate: 0 -50%;
  max-block-size: calc(100dvh - 2rem);
}
```

- **Lines.** There is one line per item at the shallowest depth in the list. A deeper item counts
  toward the line before it, so a section's line stays highlighted while you read its
  subsections. The current section's line takes the indicator color, another active section's
  line the muted foreground, and the rest the border color. Only the color changes, never the size
  of the strip. When the strip's block size is limited, as by `max-block-size` above, the space
  between lines shrinks so every line stays visible.
- **Opening.** Hovering the lines with a pointer opens the card after `open-delay` (300 ms); it
  closes `close-delay` (0 ms) after the pointer leaves the card. Pressing the lines, or Enter or
  Space while they have focus, toggles the card and moves focus to the current link. Escape closes
  the card and returns focus to the lines. Activating a link scrolls as in the list and closes the
  card.
- **Placement.** The card covers the lines, aligned with their outer edge and centered on them.
  `side` is the direction the card grows: `inline-start` (default) for lines on the end edge of the
  page, `inline-end` for lines on the start edge. When the card does not fit on that side it grows
  the other way, and it shifts to stay in the viewport. A card taller than the viewport scrolls and
  keeps the current link in view.

## No assumptions about the content

The component knows only the targets its items name. It never scans for headings and never reads
tag names, heading levels, nesting or document order. Everything else comes from layout:

- **Targets.** An item names one element by `href="#id"`, resolved in the item's own tree scope
  and then the document, or by the `target` property, which takes an element reference (useful
  inside shadow roots or for elements without ids). Headings, sections, cards and figures all
  work the same way. Hidden targets are skipped until they show again; unresolved targets raise a
  `tp-diagnostic`.
- **Scroll root.** The nearest overflowing scroll container that holds every target: the page, a
  `tp-scroll-area`, a dialog body. Set `scroll-root` (an id) or `scrollRoot` (an element; a
  component with a `viewportElement`, such as Scroll area, resolves to its viewport) to choose
  it explicitly.
- **Regions.** Targets are ordered by position. Each one covers from its start to the next
  target's start, or to its own end when that is further. A heading therefore covers the text
  below it, a section covers itself, and a section that contains other targets contains their
  regions, so the containing item stays active and the indicator spans the chain.
- **Reading line.** By default the scroll root's `scroll-padding-block-start` plus one pixel.
  Fragment navigation lands targets exactly there, after their own `scroll-margin-block-start`,
  so a jump always makes its target current. Set the CSS you already use for anchor offsets:

  ```css
  html {
    scroll-padding-block-start: 4rem;
  } /* a sticky header */
  ```

  `activation-offset` replaces it with pixels or a percentage of the scroll root.

- **Both edges.** There is always a current item. At the top, and whenever the reading line is
  still above the first target (an introduction, padding, or overscroll), the first target is
  current. Over the last screen of scrolling the reading line moves down to the end edge, so short
  final sections still become current in order and the last is current at the bottom, including
  overscroll.
- **Navigation.** Activating an item scrolls the scroll container, and nothing around it, until
  the target meets its scroll padding. `scroll-behavior` chooses `smooth` (default), `instant`,
  or `auto` (the container's CSS `scroll-behavior`); reduced motion is always instant. With
  `navigation="fragment"` (default) the target's id is then recorded in the URL as a new
  history entry; set `navigation="scroll"` when your application routes on the URL fragment.
  The activated item stays current until you scroll again, so the indicator does not sweep
  through the sections in between. Focus does not move.
- **Anchors both ways.** Links in the content work like the items: a heading's own `#` anchor or
  a cross-reference such as `<a href="#theming">` scrolls the same way and makes its target
  current. Back and forward through history and a fragment present at load do the same.

## Performance

Many components can react to the same scrolling without adding listeners. Scroll observation is
a shared service: each scroll container has one native listener per event type, the window one
`ResizeObserver`, and each observed root one `MutationObserver`, however many components
subscribe (`observeScroll`, `observeResize`, `observeSubtree` from `@tweakpad/ui`).

Targets are measured only when layout changes: their size, the container's size or scroll
height, or the DOM under the container. A scroll alone recomputes from the scroll position, with
no layout reads of the targets.

Each subscriber chooses its timing. The table of contents updates once per animation frame by
default; `scroll-throttle` limits updates to one per interval (with a trailing update), and
`scroll-debounce` updates only after scrolling pauses.

## Building items from your content

`collectTargets(root, selector, options)` (from `@tweakpad/ui`) returns `{ element, id, label, depth? }` records for the elements your selector matches. It has no default selector, assigns no
ids and returns a depth only when you supply a `depth` function. Render one item per record:

```js
import { collectTargets } from '@tweakpad/ui';

const toc = document.querySelector('tp-table-of-contents');
toc.replaceChildren(
  ...collectTargets(document.querySelector('main'), 'h2, h3', {
    depth: (heading) => (heading.tagName === 'H3' ? 2 : 1),
  }).map(({ element, label, depth }) => {
    const item = document.createElement('tp-table-of-contents-item');
    item.target = element;
    item.depth = depth ?? 1;
    item.textContent = label;
    return item;
  }),
);
```

The heading selector and depth rule are the page's choice here, not the library's.

## API

### `tp-table-of-contents`

| Property             | Attribute           | Type                              | Default          | Description                                                                                                               |
| -------------------- | ------------------- | --------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `value`              | —                   | `string \| null`                  | —                | Controlled current target identifier. Setting it, even to `null`, controls the component.                                 |
| `defaultValue`       | `default-value`     | `string \| null`                  | `null`           | Initial current target before the first measurement.                                                                      |
| `scrollRoot`         | —                   | `Element \| null`                 | `null`           | Explicit scroll root.                                                                                                     |
| `scrollRootId`       | `scroll-root`       | `string \| null`                  | `null`           | Id of the scroll root, resolved in this tree scope, then the document.                                                    |
| `activationOffset`   | `activation-offset` | `string \| number \| null`        | `null`           | Reading line: pixels, or a percentage such as `25%`.                                                                      |
| `navigation`         | `navigation`        | `'fragment' \| 'scroll'`          | `'fragment'`     | `fragment` records the target in the URL; `scroll` leaves the URL untouched, for applications that route on the fragment. |
| `scrollBehavior`     | `scroll-behavior`   | `'smooth' \| 'instant' \| 'auto'` | `'smooth'`       | How the content scrolls when navigating; `auto` follows the container's CSS. Reduced motion is always instant.            |
| `scrollThrottle`     | `scroll-throttle`   | `number`                          | `0`              | Milliseconds between updates while scrolling; `0` updates once per frame.                                                 |
| `scrollDebounce`     | `scroll-debounce`   | `number`                          | `0`              | Update only after scrolling pauses this many milliseconds; wins over `scrollThrottle`.                                    |
| `label`              | `label`             | `string`                          | `''`             | Title text when no `title` slot is authored.                                                                              |
| `variant`            | `variant`           | `'list' \| 'compact'`             | `'list'`         | `list` shows the title and links in place; `compact` shows one line per top-level item that opens them in a card.         |
| `side`               | `side`              | `'inline-start' \| 'inline-end'`  | `'inline-start'` | Compact: the direction the card grows from the lines; it grows the other way when it does not fit.                        |
| `openDelay`          | `open-delay`        | `number`                          | `300`            | Compact: milliseconds of hover before the card opens.                                                                     |
| `closeDelay`         | `close-delay`       | `number`                          | `0`              | Compact: milliseconds before the card closes once the pointer leaves it.                                                  |
| `messages`           | —                   | `TableOfContentsMessages`         | `{}`             | `{ title }`, default "On this page".                                                                                      |
| `activeValues`       | —                   | `readonly string[]`               | —                | Read-only: active target identifiers, by position.                                                                        |
| `resolvedScrollRoot` | —                   | `HTMLElement \| null`             | —                | Read-only: the scroll container being observed.                                                                           |

Methods: `navigate(value)` scrolls to an item's target and makes it current (reason
`programmatic`); `refresh()` recalculates after changes the component cannot observe, such as
transforms.

Events:

- `tp-value-change`: not cancelable. `detail.value` is the current target identifier or `null`,
  with reason `scroll`, `link-press` (an item or a link in the content) or `programmatic`
  (`navigate()`, a fragment change or the fragment at load). A controlled `value` is never rewritten.
- `tp-diagnostic`: `table-of-contents-target-missing` and `table-of-contents-target-duplicate`.

Slots: default (items) and `title`. Parts: `table-of-contents` (the `nav`), `title`, `list`,
`rail`, `indicator`; in the compact variant also `trigger` (the Button holding the lines), `marks`,
`mark` (one per top-level item, with `data-active` and `data-current`) and `popover` (the Popover
holding the title and list). The root carries `data-active` while any target is active.

### `tp-table-of-contents-item`

| Property             | Attribute | Type              | Default | Description                                                                                |
| -------------------- | --------- | ----------------- | ------- | ------------------------------------------------------------------------------------------ |
| `href`               | `href`    | `string \| null`  | `null`  | Fragment URL naming the target.                                                            |
| `target`             | —         | `Element \| null` | `null`  | Target element reference; wins over `href`.                                                |
| `depth`              | `depth`   | `number`          | `1`     | Indentation level; compact lines group items under the top level. Never used for tracking. |
| `active` / `current` | —         | `boolean`         | `false` | Set by the table of contents.                                                              |

The item publishes the target's id as its value, or a generated stable identifier for a
reference without an id. Part: `link` (with `data-active`, `data-current`). The host carries
`data-active` and `data-current`; the current link has `aria-current="location"`.

## Accessibility

The root is one `nav` landmark named by its title, and the items form a list. Only the current
link carries `aria-current="location"`. The rail and indicator are hidden from assistive
technology. Scrolling never moves focus or announces anything.

In the compact variant the landmark is named by the title text and holds a button with the same
name that reports whether the card is expanded. The lines are hidden from assistive technology.
The card is a dialog named by the title and holds the same list; its links are in the focus order
while it is open.

## Customization

Links use `text-sm` with `--tp-muted-foreground`, and `--tp-foreground` when active or hovered.
The rail uses `--tp-border`; the indicator uses `--tp-table-of-contents-indicator`, falling back
to `--tp-primary`. Depth indents by `--tp-space-3` per level. The indicator glides between
positions, except on first placement and layout changes, and jumps under reduced motion.

Compact lines are as thick as the indicator and `--tp-space-3` long, spaced `--tp-space-2` apart.
They use `--tp-border`, `--tp-muted-foreground` when active and
`--tp-table-of-contents-indicator` (falling back to `--tp-primary`) when current, and fade between
colors. The card is the Popover surface.
