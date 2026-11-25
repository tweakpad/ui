# Styling

Import `@tweakpad/ui/styles.css` once to install the default token set. Components consume inherited custom properties, so a complete token set can be replaced on `:root` or on any subtree without targeting component internals.

```css
.brand-region {
  --tp-primary: oklch(58% 0.22 275deg);
  --tp-primary-foreground: white;
  --tp-ring: oklch(67% 0.18 275deg);
  --tp-radius: 0.75rem;
  --tp-font-sans: 'Example Sans', sans-serif;
}
```

Spacing is the exception: the `space-*` roles, control heights and icon sizes derive from the spacing seed, so a region changes its spacing through [Density](#density), not by setting `--tp-spacing` on the subtree.

## Token families

- Color pairs: `background`/`foreground`, `card`/`card-foreground`, `popover`/`popover-foreground`, `primary`/`primary-foreground`, `secondary`/`secondary-foreground`, `muted`/`muted-foreground`, `accent`/`accent-foreground`, `destructive`/`destructive-foreground`, `success`/`success-foreground`, and `warning`/`warning-foreground`.
- Status tints: for each of `primary`, `destructive`, `success` and `warning`, a tinted fill `<role>-subtle`, its text tone `<role>-subtle-foreground` and an edge `<role>-border`. They derive from the role, so a theme that sets only `--tp-destructive` gets a matching set; a theme can also set them directly.
- Lines and fills: `border` draws dividers, `edge` the outer edge of a component or panel, and `input` the edge of a field or an outline control. `control` fills fields and outline controls, and `control-strong` is their stronger fill for hover and disabled states. `control-border` is the boundary of checkboxes and radios, `choice` and `choice-foreground` the fill and dot of a chosen radio, and `pressed`, `pressed-foreground` and `pressed-border` the fill, content and edge of a pressed Toggle.
- Native selection: `selection` and `selection-foreground` paint selected text and selected options in Native Select listboxes, both focused and unfocused. They default to the primary pair and can be changed independently in a theme or a nested region. The stylesheet covers document text; library shadow roots cover their native inputs and editable content. Forced colors uses the system selection colors. Operating-system pickers can retain platform rendering where the browser does not expose styling.
- Unpaired colors: `ring`, and `chart-1` through `chart-5`.
- Syntax colors: one role per scope of highlighted code: `syntax-comment`, `syntax-keyword`, `syntax-string`, `syntax-number`, `syntax-function`, `syntax-type`, `syntax-constant`, `syntax-variable`, `syntax-property`, `syntax-tag`, `syntax-attribute`, `syntax-operator`, `syntax-inserted` and `syntax-deleted`. See [Code block](components/code-block.mdx#theming).
- Content colors: `content-<hue>` and `content-<hue>-foreground` for the hues `gray`, `brown`, `orange`, `yellow`, `green`, `blue`, `purple`, `pink` and `red`. See [Content colors](#content-colors).
- Spacing: `spacing` and `spacing-compact`, the seed of each [density](#density) mode, plus the derived `space-*` scale: `space-0`, `space-0-5`, `space-1`, `space-1-5`, `space-2`, `space-2-5`, `space-3`, `space-4`, `space-5`, `space-6`, `space-8`, `space-10`, `space-12` and `space-16`. Each equals `spacing` times its suffix; a trailing `-5` is the half step.
- Typography: `font-*`, `text-*`, `leading-*`, and `tracking-*`. Each `text-*` size is its rem size times `type-scale`, the type seed of the [density](#density) mode, with `type-scale-compact` for the compact mode.
- Extents: `control-height-xs|sm|md|lg`, `icon-size-xs|sm|md|lg`, and `target-size-min`.
- Lines and shape: `border-width`, `border-width-strong`, `border-style`, `ring-width`, `ring-offset`, and `radius-*`.
- Elevation and opacity: `shadow-*`, `opacity-disabled`, `opacity-backdrop`, `opacity-drag-ghost`, and `opacity-drag-copy`.
- Scroll edges: `scroll-edge-fade-size` (24px) sets the width of every scroll-edge fade and of the shadow that sticky table headers, footers and pinned columns cast over scrolled content; `scroll-edge-fade-intensity` (`1`) sets how strong both are, from `0` (none) to `1`.
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

For example, a hovered Button paints its hover color as a layer between its own fill and its content. A ghost or outline Button's layer is the `control-strong` role; a status variant such as `destructive` deepens its tint with `color-mix(in oklab, var(--tp-destructive) 12%, var(--tp-destructive-subtle))`.

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

## Density

The token set has two density modes. `default` uses the theme's spacing seed; `compact` uses a smaller spacing seed (0.1875rem against the default 0.25rem) and a smaller type scale (0.9 against the default 1), so padding, gaps, control heights, icon sizes and text sizes all tighten together. Set `density="compact"` on any element to make it and everything inside it compact, and `density="default"` to return part of a compact region to the default density. Regions nest in any order, so one document can mix both:

```html
<main>
  <tp-card>…</tp-card>
  <aside density="compact">
    <tp-input variant="inline" label="Radius"></tp-input>
    <tp-slider variant="inline" label="Opacity" editable-value></tp-slider>
    <section density="default">
      <tp-button>Apply</tp-button>
    </section>
  </aside>
</main>
```

| Role                              | default        | compact            |
| --------------------------------- | -------------- | ------------------ |
| `spacing`                         | 0.25rem (4px)  | 0.1875rem (3px)    |
| `space-2`                         | 8px            | 6px                |
| `control-height-xs` … `lg`        | 24, 28, 32, 36 | 18, 21, 24, 27px   |
| `icon-size-xs` … `lg`             | 12, 14, 16, 20 | 9, 10.5, 12, 15px  |
| `type-scale`                      | 1              | 0.9                |
| `text-xs`, `text-sm`, `text-base` | 12, 14, 16     | 10.8, 12.6, 14.4px |

Library elements also take `density` as an attribute or a property (`element.density = 'compact'`, or `density` in the framework bindings), which works inside other shadow roots where the default stylesheet's document rules do not reach. Popups opened from a region, such as a Select list or a Menu, keep the region's density, also when they are portaled to the document body, and changing `density` on a region updates surfaces that are already open.

Density and a component's `size` combine: `size` picks a step of the control scale, and density sets how large that scale is. A compact region of `size="sm"` controls is smaller still.

A theme sets the seeds of each mode on `:root`: `--tp-spacing` and `--tp-type-scale` for the default mode, `--tp-spacing-compact` and `--tp-type-scale-compact` for the compact mode. Every derived role follows in each region, so a theme never restates the `space-*`, control, icon or `text-*` roles:

```css
:root {
  --tp-spacing: 0.275rem;
  --tp-spacing-compact: 0.2rem;
  --tp-type-scale-compact: 0.92;
}
```

## Status colors

Status variants, such as a `destructive` Button or a `success` Badge, paint the role's tinted fill, its text tone and its edge: `--tp-destructive-subtle`, `--tp-destructive-subtle-foreground` and `--tp-destructive-border`. The `default` and `secondary` variants keep their solid fill and foreground. An Alert paints its severity the same way: the tinted fill, the edge, and the text tone for its title, description and icon; `informational` uses the primary role. Controls inside an Alert, such as its action Buttons or a Badge in its title, follow the severity too: their text, edges and fills take its tones. Error messages and destructive menu commands use the destructive text tone, so they stay readable on any surface.

## Lines and edges

Every line a component draws belongs to one kind, and each kind takes exactly one color role, so a theme or an appearance mode changes a kind everywhere at once:

| Kind          | Draws                                                            | Role                   | Flat |
| ------------- | ---------------------------------------------------------------- | ---------------------- | ---- |
| Surface edge  | cards, panels, tables, code and callout surfaces, drawers        | `edge`                 | none |
| Floating edge | menus, popovers, lists, floating toolbars, color picker surfaces | `hairline`             | none |
| Field edge    | fields and outline controls                                      | `input`                | none |
| Mark edge     | checkboxes, radios, switch tracks                                | `control-border`       | none |
| Status edge   | status variants and alerts                                       | `<role>-border`        | none |
| Divider       | separators, table rows, header and footer lines                  | `border`               | kept |
| Swatch edge   | color swatches                                                   | the swatch's own color | kept |

In a joined group (Button group, Toggle group, Field group) the seam between members takes the member's own edge, or cuts through the fills where the member has none, such as two `secondary` Buttons. In the flat appearance every seam is a cut, `joined-edge-width` wide. A Separator inside a joined group is part of that cut.

## Flat appearance

The token set has two appearance modes. `default` draws an edge around components and panels: cards, popups, fields, outline controls and status variants. `flat` removes those edges and separates components by fill instead: panels take a fill a step from the page, fields and outline controls a step from panels, and status variants keep their tint without an edge. Checkboxes and radios lose their boundary too and show as filled marks; a chosen radio is a plain primary fill with no dot (`choice`, `choice-foreground`), and a pressed Toggle a primary fill with no edge (`pressed`, `pressed-foreground`, `pressed-border`). Dividers, focus rings, shadows and corner radii stay the same.

Set `appearance="flat"` on any element to make it and everything inside it flat, and `appearance="default"` to return part of a flat region to the default look. Regions nest in any order and combine with [density](#density):

```html
<main>
  <tp-card>…</tp-card>
  <aside appearance="flat" density="compact">
    <tp-input variant="inline" label="Radius"></tp-input>
    <tp-badge variant="success">Live</tp-badge>
    <section appearance="default">
      <tp-button variant="outline">Apply</tp-button>
    </section>
  </aside>
</main>
```

| Role                                              | default                                     | flat                                     |
| ------------------------------------------------- | ------------------------------------------- | ---------------------------------------- |
| `edge`, `input`                                   | the `border` color                          | transparent                              |
| `control-border`                                  | the foreground over the background          | transparent                              |
| `choice`, `choice-foreground`                     | the control fill and the primary color      | the primary color, with no dot           |
| `pressed`, `pressed-foreground`, `pressed-border` | the accent and an edge in the primary color | the primary color, with no edge          |
| `<role>-border`                                   | the role over the background                | transparent                              |
| `card`                                            | the theme's card color                      | the background with 4% of the foreground |
| `control`                                         | transparent in light, a tint in dark        | the card with 10% of the foreground      |
| `control-strong`                                  | half of the `input` color                   | the card with 15% of the foreground      |

Library elements also take `appearance` as an attribute or a property (`element.appearance = 'flat'`, or `appearance` in the framework bindings), which works inside other shadow roots. Popups opened from a region keep its appearance, also when they are portaled to the document body.

## Default spacing

Change `--tp-spacing` in the theme to scale library padding, gaps, control/icon extents and default anchored-surface geometry; [Density](#density) changes it for a region. Popup menus, navigation menus and selection lists use a one-unit outer inset; Popover uses `space-2-5`. Anchored surfaces use a three-unit default trigger separation and collision inset; explicit numeric positioning overrides remain available for deliberate geometry. Popover content uses real flex gaps, including the close action. Switch derives track and thumb extents from one size-dependent spacing value.

Menu, select and combobox items use `space-1` by `space-1-5` insets and are at least `control-height-sm` tall, so they scale with `--tp-spacing`. Rows and triggers packed against their neighbours (navigation panel rows and group labels, navigation menu triggers and links) show their compact control extent on fine pointers. They cannot expand their pointer target without overlapping a neighbour, so on coarse pointers the default theme raises them to `--tp-target-size-min`.

Typography, line widths, shape seeds, responsive query thresholds and minimum accessible targets retain their independent roles. Screen-reader-only clipping dimensions and runtime-measured pixel coordinates are geometry, not visible spacing.

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
