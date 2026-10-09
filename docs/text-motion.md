# Text motion

`tp-text-motion` splits its text into lines, words and characters, optionally clips them behind
masks, and reveals the pieces one after another when the text scrolls into view. The split never
changes how the text reads, wraps or how much space it takes: lines are measured from the
original text's own layout and recalculated before paint when the width changes or fonts load,
so content below never moves.

```html
<h2>
  <tp-text-motion split="words lines" mask="lines" reveal="up">
    Quiet spaces, open light
  </tp-text-motion>
</h2>
```

Import `@tweakpad/ui/register` and `@tweakpad/ui/styles.css`. The stylesheet keeps the text
hidden, in its final space, until the element is defined, so the unsplit text never flashes
(it appears anyway after three seconds if the script never loads). To bundle only Text motion,
call `defineElement(TpTextMotion.tagName, TpTextMotion)`.

Text motion is a block. Put it inside the heading or paragraph whose text it animates, and keep
typography on that element: the pieces inherit it.

## Properties

| Property / attribute             | Values                                                                                         | Default                                         |
| -------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `split`                          | tokens of `chars`, `words`, `lines`; the finest animates                                       | `words`                                         |
| `mask`                           | `none`, `lines`, `words`, `chars` (must be a split unit)                                       | `none`                                          |
| `reveal`                         | tokens of `fade`, `up`, `down`, `left`, `right`, `zoom-in`, `zoom-out`, `blur`; empty disables | unset: the coordinator's `reveal`, or `fade up` |
| `stagger`                        | milliseconds between consecutive pieces                                                        | `30`                                            |
| `staggerFrom` / `stagger-from`   | `first`, `last`, `center`                                                                      | `first`                                         |
| `revealRepeat` / `reveal-repeat` | reveal again on every viewport entry                                                           | `false`                                         |
| `revealHold` / `reveal-hold`     | a ready reveal waits until cleared                                                             | `false`                                         |

Read-only: `lines`, `words`, `chars`, `masks` (arrays of the current pieces, in order) and
`revealed`. Methods: `splitText()` splits again from the original content (also after
`revert()`), and `revert()` restores the original nodes and stops splitting.

## Splitting

- **Words** follow the browser's word segmentation for the text's `lang`, so Chinese, Japanese
  and Thai split at word boundaries. Spaces stay plain text between pieces, and words break
  only where the line could already break (after hyphens and dashes), so punctuation stays with
  its word.
- **Characters** are user-perceived characters: accents, emoji sequences and flags are never
  divided. Characters cannot kern or form ligatures, so `split` with `chars` switches both off
  from the first frame, before splitting, and the text never re-wraps when it splits.
- **Scripts whose letters join** when shaped (Arabic, the Indic scripts and similar) are never
  split into characters: such words stay whole and animate as one piece, and a `tp-diagnostic`
  warning reports it.
- **Lines** are measured from a hidden copy of the original text, so every line-breaking rule
  the browser applies to the original (alignment, `text-wrap: balance`, CJK punctuation) applies
  to the pieces. Lines are laid out for every split, so words and characters wrap exactly as the
  original would; `lines` lists them only when `split` includes `lines`.
- **Formatting** such as `<strong>`, `<em>` and `<code>` is kept around its pieces, cloned once
  per line when it spans lines, so page styles apply unchanged. `<br>` and preserved whitespace
  are kept.
- **Links** wrap like ordinary text. The original `<a>` keeps the first fragment, so its
  listeners, focus and identity stay; fragments on later lines are inert continuations that
  forward clicks to it. Buttons, form controls, images and other custom elements are kept as the
  original elements, whole, as one piece.

Inline boxes cannot shape across their edges, so kerning against the neighbouring space is lost
and a line can be a fraction of a pixel wider than the original; its breaks and height are still
the original's.

## Reveal

Every piece of the finest unit starts in the effect's start state and moves to rest after a
delay of its stagger position times `stagger`. `stagger-from="center"` reveals from the middle
outward. With a mask on the moving unit (or a coarser one), `up`, `down`, `left` and `right`
travel the piece's own size, so pieces emerge from behind the clip; without a mask they travel
`--tp-text-motion-distance`. Effects only change opacity, translate, scale and filter, so
nothing around the text moves.

Standalone, a text reveals the first time it enters the viewport, once its fonts are ready.
`reveal-repeat` resets it instantly once it has left the viewport entirely and plays again when
it comes back 10% into view. Inside a [Scroll trigger](scroll-trigger.md) (or an Image group),
that coordinator owns the timing.

Inside a scrubbing [Scroll trigger](scroll-trigger.md) the scroll position drives the same
reveal: every piece shows its eased state at the scrubbed time, in stagger order.

### Responsive behaviour

Lines are recalculated in the same frame as the width change, before paint, and only when the
change can actually move a word to another line. All texts on the page are measured in one pass.
Until then a stale line never wraps, so the page does not jump. A recalculation keeps the reveal
state: pending pieces stay hidden, revealed pieces stay at rest, and a reveal in progress
completes at once.

Changing the content (for example `textContent`, or a template library updating the text) is
picked up and split again before the next paint. Typography changes that alter the text's height
(font size, line height, a web font loading) recalculate the lines too; after a change that keeps
the height, such as letter spacing or weight, call `splitText()`.

## Events

| Event                       | Detail                           | When                                                |
| --------------------------- | -------------------------------- | --------------------------------------------------- |
| `tp-text-split`             | `{ lines, words, chars, masks }` | after every split or line change                    |
| `tp-reveal-change`          | `{ revealed, effect }`           | the reveal starts, or a repeat resets it            |
| `tp-reveal-change-complete` | `{ revealed }`                   | the last piece has settled (or right after a reset) |
| `tp-diagnostic`             | `{ code, message, severity }`    | a joined script was kept in words                   |

### External animation libraries

The reveal runs through the Text motion `reveal` motion role. Claim it from a
`tp-motion-request` listener to animate the pieces with an external animation library: the
request context carries `effect`, `unit` and `count`, and `request.owner.words` (or `chars`,
`lines`) holds the pieces. While a driver plays, the CSS transitions are off. Rebuild your
animation on `tp-text-split`, which fires when lines change.

```js
document.addEventListener('tp-motion-request', (event) => {
  const { owner, role } = event.request;
  if (owner.localName !== 'tp-text-motion' || role !== 'reveal') return;
  event.respondWith({
    play: () => {
      const animations = owner.words.map((word, index) =>
        word.animate(
          [
            { opacity: 0, translate: '0 0.5em' },
            { opacity: 1, translate: '0 0' },
          ],
          {
            duration: 500,
            delay: index * 40,
            easing: 'ease-out',
            fill: 'backwards',
          },
        ),
      );
      return {
        finished: Promise.all(animations.map((animation) => animation.finished)),
        cancel: () => animations.forEach((animation) => animation.cancel()),
      };
    },
  });
});
```

## Accessibility

Pieces and masks are hidden from assistive technology. The original text of each run is exposed
once, in reading order, through visually hidden text, so screen readers, translation and search
read the sentence normally. Links keep their role and get their full text as their accessible
name; buttons and other controls keep theirs. No `aria-label` is put on a generic element.

Under reduced motion every piece is shown at rest immediately and the events still fire.

## Styling

Pieces are light-DOM elements with `data-tp-piece="line"`, `"word"`, `"char"` or `"mask"`, so
style them from your page, for example `tp-text-motion [data-tp-piece='char'] { color: … }`.
Each piece carries `--tp-text-index` (its index within its unit) and the animating pieces carry
`--tp-text-order` (its stagger position).

| Custom property               | Default                      | Purpose                                            |
| ----------------------------- | ---------------------------- | -------------------------------------------------- |
| `--tp-text-motion-duration`   | twice `--tp-duration-normal` | per-piece duration                                 |
| `--tp-text-motion-easing`     | `ease-out`                   | easing                                             |
| `--tp-text-motion-distance`   | `0.4em`                      | travel without a mask                              |
| `--tp-text-motion-scale`      | `0.2`                        | scale offset for `zoom-in` and `zoom-out`          |
| `--tp-text-motion-blur`       | `0.15em`                     | start blur for `blur`                              |
| `--tp-text-motion-mask-bleed` | `0.1em`                      | how far masks extend over ascenders and descenders |

All durations and delays are scaled by `--tp-motion-scale`. Markers on the host:
`data-split-ready`, `data-in-view` (while observed) and `data-revealed`.

## Limits

- `::first-line` and `::first-letter` do not apply to split text.
- `text-align: justify` stretches lines as usual, but every recalculation measures again.
- `hyphens: auto` can break inside a word in the original; such a word is presented whole.
- SVG `<text>` and vertical writing modes are not split.
- A nested `tp-text-motion` is treated as one piece of the outer one.
