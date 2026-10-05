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
- Spacing: `spacing` plus the derived `space-*` scale.
- Typography: `font-*`, `text-*`, `leading-*`, and `tracking-*`.
- Extents: `control-height-*`, `icon-size-*`, and `target-size-min`.
- Lines and shape: `border-width`, `border-width-strong`, `border-style`, `ring-width`, `ring-offset`, and `radius-*`.
- Elevation and opacity: `shadow-*`, `opacity-disabled`, and `opacity-backdrop`.

Every CSS custom property uses the `--tp-` prefix. For example, the `primary` role is exposed as `--tp-primary`.

The default typography tuple is `font-sans`, `text-base`, `font-normal`, `leading-normal`, and `tracking-normal`. Text-bearing components inherit that tuple and change individual dimensions only through another role in the same family.

## Derived interaction colors

Library-authored percentage variations use existing semantic color roles with `color-mix(in oklab, …)`. The mix percentage is documented where the interaction rule is defined; it is not a new token such as `--tp-input-hover`. Base role values can still use any valid CSS color notation.

For example, outline and ghost Buttons share the hover recipe `color-mix(in oklab, var(--tp-input) 50%, transparent)`. That translucent layer transitions over the opaque `--tp-background` fill, while text keeps `--tp-foreground`; outline alone paints the `--tp-border` boundary. Filled Button variants instead mix their paired base role toward a mode-aware contrast role. The link appearance never paints a background. `transparent` is an alpha operand or a no-paint value, not a replacement for a content-bearing surface role. Selected and focused states continue to use their semantic `accent` and `ring` roles; `--tp-opacity-disabled` remains a non-color state token.

## Complete themes and modes

Applications may override a few inherited roles for a scoped brand region. A named replacement theme or mode must provide every required role and must keep the same role set as every other mode. The exported `REQUIRED_TOKEN_ROLES`, `assertCompleteTokenSet`, and `assertCompatibleTokenModes` utilities validate that contract.

```ts
import { assertCompatibleTokenModes } from '@tweakpad/ui';

assertCompatibleTokenModes({ light: lightTokens, dark: darkTokens });
```

Component-specific styling belongs in a documented presentation dictionary, public property, or justified token extension. Internal shadow elements and unpublished selectors are not a supported override surface. Motion remains governed by the separate motion-role and driver contract.

## Presentation resolution and overrides

`componentDefinitions` contains the cataloged ordered axes/defaults and canonical public part keys. `resolveComponentPresentation(definition, axes, dictionary)` resolves base keys followed by axes in declaration order. Its `missingKeys` diagnostic means no appearance was supplied for that contribution; it never silently reads another dictionary.

```js
import { defaultPresentationDictionary, setPresentationDictionary } from '@tweakpad/ui';

setPresentationDictionary({
  ...defaultPresentationDictionary,
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

Dictionary replacement is document-scoped and does not remount controls or reset state. Token variables remain inherited and separate from dictionary definitions. A class hook adds a class at the real part; it does not let document styles cross a shadow boundary. Use style hooks, public `::part`, or dictionary rules for that boundary.

Compounds contribute through `setPartComposition` before consumer hooks. Native light-DOM parts can be registered with the presentation adapter, preserving their original elements and semantics. Hooks are keyed by stable part names, not generated variant keys.

Primitive variant interaction rules use low specificity so a composed Menu or Navigation role owns its highlight. Popup triggers keep their active background while open; Menu, Menubar and Navigation Menu transfer that background without a trailing fade. Restored focus does not create a hover background on a closed navigation trigger. Keyboard focus keeps its separate visible outline, and popup/content transitions retain their motion policy.

Migration is partial: consult [the repair ledger](./first-pass-conformance.md) before relying on dictionary-only customization for a control. In particular, the remaining component-local appearance and cross-shadow compound overrides have not yet been fully migrated.

## Constituent rendering contracts

Components that document `partContracts` support Foundation rendering contracts in addition to presentation hooks. Each key is a stable public part name. `classHook`, `styleHook` and `content` can resolve from the committed state; `elementReference` receives the host and `null` when it is replaced or disconnected. `hostProperties` merges neutral attributes, classes and styles while retaining behavior-owned semantics.

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

Change `--tp-spacing` in the theme to scale library padding, gaps, control/icon extents and default anchored-surface geometry. Popup menus, navigation menus, selection lists and Popover use the same two-unit outer inset. Anchored surfaces use a three-unit default trigger separation and collision inset; explicit numeric positioning overrides remain available for deliberate geometry. Popover content uses real flex gaps, including the close action. Switch derives track and thumb extents from one size-dependent spacing value. Example stories leave positioning overrides unset so they use these defaults.

Typography, line widths, shape seeds, responsive query thresholds and minimum accessible targets retain their independent roles. Screen-reader-only clipping dimensions and runtime-measured pixel coordinates are geometry, not visible spacing. Scoped complete themes should provide their derived `space-*` roles consistently with their spacing seed.

## Shared surface corners

Drawer, Side Panel and Navigation Panel use one exposed-edge corner recipe. The
viewport-attached edge stays flush; the two free corners use `--tp-radius-lg`.
Floating panels and inset content use that same radius on all four corners.
Logical navigation sides follow writing direction. Change the shared theme role
or use the existing presentation dictionary/part hooks; no panel-specific radius
or spacing attribute is needed.

### Composition owns spacing

Use each control's existing regions for related content: Slider Label/Output,
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
