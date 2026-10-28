# Styling

Import `@tweakpad/ui/styles.css` once to install the default token set. Components consume inherited custom properties, so a complete token set can be replaced on `:root` or on any subtree without targeting component internals.

```css
.brand-region {
  --tp-primary: oklch(58% 0.22 275deg);
  --tp-primary-foreground: white;
  --tp-ring: oklch(67% 0.18 275deg);
  --tp-radius: 0.75rem;
  --tp-spacing: 0.275rem;
  --tp-font-sans: 'Example Sans', sans-serif;
}
```

## Token families

- Color pairs: `background`/`foreground`, `card`/`card-foreground`, `popover`/`popover-foreground`, `primary`/`primary-foreground`, `secondary`/`secondary-foreground`, `muted`/`muted-foreground`, `accent`/`accent-foreground`, `destructive`/`destructive-foreground`, `success`/`success-foreground`, and `warning`/`warning-foreground`.
- Unpaired colors: `border`, `input`, `ring`, and `chart-1` through `chart-5`.
- Syntax colors: one role per scope of highlighted code: `syntax-comment`, `syntax-keyword`, `syntax-string`, `syntax-number`, `syntax-function`, `syntax-type`, `syntax-constant`, `syntax-variable`, `syntax-property`, `syntax-tag`, `syntax-attribute`, `syntax-operator`, `syntax-inserted` and `syntax-deleted`. See [Code block](code-block.md#theming).
- Content colors: `content-<hue>` and `content-<hue>-foreground` for the hues `gray`, `brown`, `orange`, `yellow`, `green`, `blue`, `purple`, `pink` and `red`. See [Content colors](#content-colors).
- Spacing: `spacing` plus the derived `space-*` scale: `space-0`, `space-0-5`, `space-1`, `space-1-5`, `space-2`, `space-2-5`, `space-3`, `space-4`, `space-5`, `space-6`, `space-8`, `space-10`, `space-12` and `space-16`. Each equals `spacing` times its suffix; a trailing `-5` is the half step.
- Typography: `font-*`, `text-*`, `leading-*`, and `tracking-*`.
- Extents: `control-height-xs|sm|md|lg`, `icon-size-xs|sm|md|lg`, and `target-size-min`.
- Lines and shape: `border-width`, `border-width-strong`, `border-style`, `ring-width`, `ring-offset`, and `radius-*`.
- Elevation and opacity: `shadow-*`, `opacity-disabled`, and `opacity-backdrop`.
- Motion: `duration-fast`, `duration-normal` and `duration-slow`, plus `easing-standard`, `easing-enter` and `easing-exit`. See [Motion](motion.md).

Every CSS custom property uses the `--tp-` prefix. For example, the `primary` role is exposed as `--tp-primary`.

The default typography tuple is `font-sans`, `text-base`, `font-normal`, `leading-normal`, and `tracking-normal`. Text-bearing components inherit that tuple and change individual dimensions only through another role in the same family. Controls, cards, dialogs, popovers, menus and labels set `text-sm`; titles use `text-base`; badges, tooltips, keyboard hints and the xs control step use `text-xs`.

Three font roles cover all text: `font-sans` for interface text, `font-heading` for headings (it follows `font-sans` by default), and `font-mono` for code. Everything that presents code or machine values uses `font-mono`: Code block, code spans and blocks in Markdown, One-time code field characters and value readouts. Input and Text area take a `mono` attribute for code-like values; it also turns off spell checking, autocorrection and autocapitalization, and leaves the typography of an enclosing Field, Field group or Input group alone. The widgets use it for their value editors (Color picker hex and channel fields, Easing editor parameters and duration, Flow number properties and zoom level), and a Flow property definition can set `mono` for text properties such as expressions and paths. The default stylesheet also gives native `code`, `kbd`, `samp` and `pre` elements `font-mono`, without adding specificity, so your own markup matches the components. The default `font-mono` stack starts with Cascadia Mono, which has no programming ligatures, and falls back to the platform monospace font. Font files are not bundled: install or load Cascadia Mono (and Inter for `font-sans`) in your application, or replace the roles with your own stacks. The optional `font-emoji` role names the color emoji faces the Emoji picker draws its glyphs with; it defaults to the platform's color emoji fonts and can point at a web font such as a bundled emoji face.

### Default scale

The default theme uses a 4px spacing seed:

| Role                                               | Values                                                                  |
| -------------------------------------------------- | ----------------------------------------------------------------------- |
| `spacing`                                          | `0.25rem` (4px)                                                         |
| `font-sans`, `font-mono`                           | Inter, Cascadia Mono, each followed by platform fallbacks               |
| `font-emoji`                                       | the platform color emoji fonts                                          |
| `text-xs` … `text-2xl`                             | 12, 14, 16, 18, 20, 24px                                                |
| `control-height-xs` … `lg`                         | 24, 28, 32, 36px (`spacing` × 6, 7, 8, 9)                               |
| `icon-size-xs` … `lg`                              | 12, 14, 16, 20px                                                        |
| `radius-sm`, `md`, `lg`, `xl`, `2xl`, `3xl`, `4xl` | `radius` × 0.6, 0.8, 1, 1.4, 1.8, 2.2, 2.6 (6, 8, 10, 14, 18, 22, 26px) |
| `duration-fast`, `normal`, `slow`                  | 200, 280, 560ms                                                         |
| `easing-standard`                                  | `cubic-bezier(0.2, 0, 0, 1)`                                            |
| `easing-enter`                                     | `cubic-bezier(0.22, 1, 0.36, 1)`                                        |
| `easing-exit`                                      | `cubic-bezier(0.4, 0, 1, 1)`                                            |

### Control sizes

Every single-line control resolves its size from one step table (`CONTROL_STEPS`, exported with `controlSizePresentation` from `@tweakpad/ui`): Button, Toggle, Toggle group, Select, Native select, Input, Input group, Tabs, Menubar, Pagination and navigation rows.

| Step (public sizes)    | Height              | Padding (icon edge)       | Gap         | Type      | Icon           |
| ---------------------- | ------------------- | ------------------------- | ----------- | --------- | -------------- |
| xs (`xs`, `icon-xs`)   | `control-height-xs` | `space-2` (`space-1-5`)   | `space-1`   | `text-xs` | `icon-size-xs` |
| sm (`sm`, `icon-sm`)   | `control-height-sm` | `space-2-5` (`space-1-5`) | `space-1`   | `text-sm` | `icon-size-sm` |
| md (`default`, `icon`) | `control-height-md` | `space-2-5` (`space-2`)   | `space-1-5` | `text-sm` | `icon-size-md` |
| lg (`lg`, `icon-lg`)   | `control-height-lg` | `space-2-5` (`space-2`)   | `space-1-5` | `text-sm` | `icon-size-md` |

`icon-*` sizes are squares of the step height. A control publishes its icon extent to slotted Icons, so `<tp-icon>` inside a small Button or Toggle follows the step unless it sets `size`.

### Content colors

Content colors are the colors that people apply inside documents: a text color, a highlight or a table cell background. Content stores only the hue name, such as `blue`, and the content color roles resolve it in every theme and color scheme, so a colored word keeps its meaning when the theme or scheme changes.

Each hue has two roles. The surface role `content-<hue>` paints highlights and table cell backgrounds; the foreground role `content-<hue>-foreground` paints colored text and the text on its own surface. The choice `default` names no role: text keeps the surrounding color and no fill is painted.

In the default theme, every foreground keeps a contrast of at least 4.5:1 on `background` and on its own surface, in light and dark, and every surface stays visibly apart from `background`. A text color of one hue over a highlight of another hue renders as named, with no contrast guarantee.

Content colors are for user content and for the swatches that offer these colors. Never use them for controls, states, selection, focus or any other interface paint; those use the semantic color pairs above.

Paint with the roles directly, without a fallback value:

```css
.note-highlight {
  background: var(--tp-content-blue);
  color: var(--tp-content-blue-foreground);
}
```

A theme may leave the content colors out. A missing surface role then paints no fill, and text with a missing foreground role keeps the surrounding color.

## Derived interaction colors

Library-authored percentage variations use the semantic color roles with `color-mix(in oklab, …)`. The mix percentage is documented where the interaction rule is defined; it is not a new token such as `--tp-input-hover`. Base role values can still use any valid CSS color notation.

For example, a hovered Button paints its hover color as a layer between its own fill and its content. A ghost Button's layer is `color-mix(in oklab, var(--tp-input) 50%, transparent)`, a translucent mix that lets the surface behind the Button show through. [Button](button.md#hover-colors) lists the mix of each variant and the fill it sits on.

`transparent` is an alpha operand or a no-paint value, not a replacement for a content-bearing surface role. Selected and focused states continue to use their semantic `accent` and `ring` roles; `--tp-opacity-disabled` remains a non-color state token.

## Complete themes and modes

Applications may override a few inherited roles for a scoped brand region. A named replacement theme or mode must provide every required role and must keep the same role set as every other mode. The exported `REQUIRED_TOKEN_ROLES`, `assertCompleteTokenSet`, and `assertCompatibleTokenModes` utilities validate that contract. The required roles include the syntax and content colors, so a complete replacement theme defines them too, and `assertCompleteTokenSet` names any that are missing. A theme that leaves the content colors out still renders, as described in [Content colors](#content-colors).

```ts
import { assertCompatibleTokenModes } from '@tweakpad/ui';

assertCompatibleTokenModes({ light: lightTokens, dark: darkTokens });
```

Component-specific styling belongs in a documented presentation dictionary or public property. Internal shadow elements and unpublished selectors are not a supported override surface.

`--tp-motion-scale` and `--tp-motion-play-state` are not part of a token set. The reduced-motion policy writes them (`1` and `running` normally, `0` and `paused` under reduce), so a theme leaves them alone; use `motion-policy` to choose the policy for a subtree. Replacing a component's motion entirely goes through the motion driver hooks described in [Motion](motion.md).

## Presentation resolution and overrides

Each component has a presentation family, exported as `<name>Presentation` (for example `buttonPresentation`). A family carries the component's definition (ordered axes, defaults and public part keys), part bindings, structure and default `appearance` dictionary. `resolveComponentPresentation(definition, axes, dictionary)` resolves base keys followed by axes in declaration order. Its `missingKeys` diagnostic means no appearance was supplied for that contribution; it never silently reads another dictionary.

A document dictionary set with `setPresentationDictionary` replaces the default appearance of every component in that document. Build it from the families of the components you use, so the override stays as lean as the components themselves:

```js
import {
  buttonPresentation,
  iconPresentation,
  spinnerPresentation,
  setPresentationDictionary,
} from '@tweakpad/ui';

setPresentationDictionary({
  ...buttonPresentation.appearance,
  ...iconPresentation.appearance,
  ...spinnerPresentation.appearance,
  'button-variant-default': [
    {
      declarations: {
        background: 'var(--tp-primary)',
        color: 'var(--tp-primary-foreground)',
        'border-color': 'var(--tp-primary)',
      },
    },
  ],
});

card.partPresentation = {
  'card-content': {
    classHook: 'my-content',
    styleHook: { 'padding-inline-start': 'var(--tp-space-8)' },
  },
};
```

An application that registers the whole library can spread `defaultPresentationDictionary` instead; it aggregates every family, so it also bundles every component's presentation.

Dictionary replacement is document-scoped and does not remount controls or reset state. Token variables remain inherited and separate from dictionary definitions. A class hook adds a class at the real part; it does not let document styles cross a shadow boundary. Use style hooks, public `::part`, or dictionary rules for that boundary.

Compounds contribute through `setPartComposition` before consumer hooks. Native light-DOM parts can be registered with the presentation adapter, preserving their original elements and semantics. Hooks are keyed by stable part names, not generated variant keys.

Primitive variant interaction rules use low specificity so a composed Menu or Navigation role owns its highlight. Popup triggers keep their active background while open; Menu, Menubar and Navigation Menu transfer that background without a trailing fade. Restored focus does not create a hover background on a closed navigation trigger. Keyboard focus keeps its separate visible outline, and popup/content transitions retain their motion policy.

Dictionary replacement does not yet reach every control's appearance: some component-local appearance and cross-shadow compound overrides remain outside the dictionary.

## Constituent rendering contracts

Components that document `partContracts` support rendering contracts in addition to presentation hooks. Each key is a stable public part name. `classHook`, `styleHook` and `content` can resolve from the committed state; `elementReference` receives the host and `null` when it is replaced or disconnected. `hostProperties` merges neutral attributes, classes and styles while retaining behavior-owned semantics.

```ts
import { html } from 'lit';

input.partContracts = {
  input: {
    renderDelegate: ({ bind }) => html`<input ${bind} />`,
    hostProperties: { spellcheck: false },
    classHook: (state) => (state.invalid ? 'invalid-editor' : 'editor'),
  },
};
```

Put `bind` on the delegate's compatible semantic host to retain handlers, state, accessibility and reference cleanup. Host properties use attribute names, `.property` for explicit property bindings and `@event` for handlers. Consumer handlers run first. Calling `event.preventComponentHandling()` suppresses the component action through a separate channel from native `preventDefault()`; controls retain required native-state reconciliation. Rendering customization does not transfer value or validation ownership. Consult each component's documentation for its supported hosts, parts and constituent scope.

## Default spacing

Change `--tp-spacing` in the theme to scale library padding, gaps, control/icon extents and default anchored-surface geometry. Popup menus, navigation menus and selection lists use a one-unit outer inset; Popover uses `space-2-5`. Anchored surfaces use a three-unit default trigger separation and collision inset; explicit numeric positioning overrides remain available for deliberate geometry. Popover content uses real flex gaps, including the close action. Switch derives track and thumb extents from one size-dependent spacing value.

Menu, select and combobox items use `space-1` by `space-1-5` insets and are at least `control-height-sm` tall, so they scale with `--tp-spacing`. Rows and triggers packed against their neighbours (navigation panel rows and group labels, navigation menu triggers and links) show their compact control extent on fine pointers. They cannot expand their pointer target without overlapping a neighbour, so on coarse pointers the default theme raises them to `--tp-target-size-min`.

Typography, line widths, shape seeds, responsive query thresholds and minimum accessible targets retain their independent roles. Screen-reader-only clipping dimensions and runtime-measured pixel coordinates are geometry, not visible spacing. Scoped complete themes should provide their derived `space-*` roles consistently with their spacing seed.

## Shared surface corners

Drawer, Side Panel and Navigation Panel use one exposed-edge corner recipe. The
viewport-attached edge stays flush; the two free corners use `--tp-radius-lg`.
Floating panels and inset content use that same radius on all four corners.
Logical navigation sides follow writing direction. Change the shared theme role
or use the presentation dictionary/part hooks; no panel-specific radius
or spacing attribute is needed.

### Composition owns spacing

Use each control's own regions for related content: Slider Label/Output,
Field Label/Description/Error, Form actions, InputGroup addons, Card Action/Footer,
Bubble Content/Reactions, and unjoined ButtonGroup actions. Their structural layout
arranges the children, and the active presentation dictionary selects token-based
gaps and padding. Do not add a sibling readout or a locally spaced wrapper to
repair a missing control relationship.

Slider's output-only horizontal composition includes endpoint clearance. Bubble
Content spaces direct paragraphs without author margins. Card actions and footers
arrange multiple controls and wrap at constrained widths. Dialog and Calendar
region spacing comes from their presentation recipes rather than implementation
styles, so replacing the dictionary replaces that density as well.

Application page grids, document content, media dimensions and scroll viewport
sizes remain application layout. They do not replace internal control spacing.
An explicit public geometry option such as Carousel's item gap remains distinct
from a component's default presentation. Changing default density belongs in the
owning dictionary; global sibling margins and demo-only CSS are not substitutes.
