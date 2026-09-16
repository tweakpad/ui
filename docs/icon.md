# Icon

`<tp-icon>` renders a supplied SVG path definition. The normative control is UI Component Library §22 (Icon), with shared iconography rules in §14. It does not look up icon names or download artwork. The library offers independent icon-definition modules; applications may also supply their own definitions.

## Selective imports

```ts
import '@tweakpad/ui/register/icon';
import { plusIcon } from '@tweakpad/ui/icons/plus';

const icon = document.querySelector('tp-icon');
icon.icon = plusIcon;
```

```html
<tp-icon label="Add"></tp-icon>
```

Importing `@tweakpad/ui/icons/plus` selects only the plus definition. Do not import an all-icons registry; none is provided. The `register/icon` entry registers only `tp-icon`, while `register` opts into every component. The main entry exports the `TpIcon` class and `IconDefinition` type but does not re-export artwork. Bundlers can therefore omit definitions that are never imported.

Accordion uses `chevronRightIcon` for its fallback Indicator. Replacing an Item's `indicator` slot with another `<tp-icon>` changes only that Item's artwork; `indicator-position="leading"` or `"trailing"` independently chooses its logical edge.

## Properties

| Property | Attribute | Type                          | Default     | Behavior                                                                                                               |
| -------- | --------- | ----------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------- |
| `icon`   | —         | `IconDefinition \| undefined` | `undefined` | SVG artwork; assign as a JavaScript property. No output when absent.                                                   |
| `label`  | `label`   | `string`                      | `''`        | Non-empty text makes the host `role="img"` with that accessible name. Empty means decorative and `aria-hidden="true"`. |
| `size`   | `size`    | CSS length                    | `'1em'`     | Sets the preferred square extent. CSS `width`/`height` rules on the host can override it.                              |

The host is non-focusable, non-interactive, `pointer-events: none`, and does not shrink in flex layouts. The SVG inherits `currentColor`. `part="graphic"` exposes it for styling; `--tp-icon-size` holds the preferred extent.

## Custom definitions

```ts
import type { IconDefinition } from '@tweakpad/ui';

const customIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [{ d: 'M12 5v14M5 12h14', strokeWidth: 2 }],
};

document.querySelector('tp-icon').icon = customIcon;
```

Definitions contain paths, not HTML strings. Paths default to no fill and a `currentColor` stroke; each path can override `fill`, `stroke`, `strokeWidth`, `fillRule`, and `clipRule`. For filled artwork, set `fill: 'currentColor'` and `stroke: 'none'`. This data shape keeps custom and offered icons on the same rendering path.
