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

For example, the outline Button's hover recipe is `color-mix(in oklab, var(--tp-input) 50%, transparent)`. That translucent layer sits over the opaque `--tp-background` fill, while text keeps `--tp-foreground` and the boundary keeps `--tp-border`. `transparent` is an alpha operand or a no-paint value, not a replacement for a content-bearing surface role. Selected and focused states continue to use their semantic `accent` and `ring` roles; `--tp-opacity-disabled` remains a non-color state token.

## Complete themes and modes

Applications may override a few inherited roles for a scoped brand region. A named replacement theme or mode must provide every required role and must keep the same role set as every other mode. The exported `REQUIRED_TOKEN_ROLES`, `assertCompleteTokenSet`, and `assertCompatibleTokenModes` utilities validate that contract.

```ts
import { assertCompatibleTokenModes } from '@tweakpad/ui';

assertCompatibleTokenModes({ light: lightTokens, dark: darkTokens });
```

Component-specific styling belongs in a documented presentation dictionary, public property, or justified token extension. Internal shadow elements and unpublished selectors are not a supported override surface. Motion remains governed by the separate motion-role and driver contract.
