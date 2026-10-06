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

## Media icons

`@tweakpad/ui/icons/media` offers the media-control set as original 24×24 outline artwork with the same 2-unit stroke as the single-icon modules. Each definition is a separate named export, so importing one keeps the others out of a bundled build:

```ts
import { pauseIcon, playIcon } from '@tweakpad/ui/icons/media';
```

The grouped `mediaIcons` object (keys below) is for layouts that use the whole set; importing it includes every media definition. `MediaIconName` is the union of its keys.

| Key               | Named export          | Use                                               |
| ----------------- | --------------------- | ------------------------------------------------- |
| `play`            | `playIcon`            | Play                                              |
| `pause`           | `pauseIcon`           | Pause                                             |
| `replay`          | `replayIcon`          | Restart after the end                             |
| `volumeHigh`      | `volumeHighIcon`      | Volume, upper range                               |
| `volumeLow`       | `volumeLowIcon`       | Volume, lower range                               |
| `volumeOff`       | `volumeOffIcon`       | Muted or zero volume                              |
| `captionsOn`      | `captionsOnIcon`      | Captions shown                                    |
| `captionsOff`     | `captionsOffIcon`     | Captions hidden                                   |
| `fullscreenEnter` | `fullscreenEnterIcon` | Enter fullscreen                                  |
| `fullscreenExit`  | `fullscreenExitIcon`  | Exit fullscreen                                   |
| `pipEnter`        | `pipEnterIcon`        | Enter picture-in-picture                          |
| `pipExit`         | `pipExitIcon`         | Exit picture-in-picture                           |
| `seekForward`     | `seekForwardIcon`     | Seek forward                                      |
| `seekBackward`    | `seekBackwardIcon`    | Seek backward (mirror of seek forward)            |
| `speed`           | `speedIcon`           | Playback rate                                     |
| `quality`         | `qualityIcon`         | Rendition quality                                 |
| `audio`           | `audioIcon`           | Audio track                                       |
| `settings`        | `settingsIcon`        | Settings; the same definition as `icons/settings` |
| `cast`            | `castIcon`            | Remote playback                                   |
| `airplay`         | `airplayIcon`         | AirPlay-style remote playback                     |
| `live`            | `liveIcon`            | Filled live-edge dot                              |
| `check`           | `checkIcon`           | Selected menu value; the same as `icons/check`    |

`settingsIcon` (`@tweakpad/ui/icons/settings`) is also the `settings` entry of `navigationIcons`.

Accordion uses `chevronRightIcon` for its default disclosure indicator. `indicator-position="leading"` or `"trailing"` selects the positional slot whose fallback renders that icon. Assigning any consumer content to the selected `leading` or `trailing` slot suppresses the fallback; the assigned content keeps its own semantics and does not automatically receive indicator motion.

## Properties

| Property | Attribute | Type                          | Default     | Behavior                                                                                                               |
| -------- | --------- | ----------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------- |
| `icon`   | —         | `IconDefinition \| undefined` | `undefined` | SVG artwork; assign as a JavaScript property. No output when absent.                                                   |
| `label`  | `label`   | `string`                      | `''`        | Non-empty text makes the host `role="img"` with that accessible name. Empty means decorative and `aria-hidden="true"`. |
| `size`   | `size`    | CSS length                    | `'1em'`     | Sets the preferred square extent. CSS `width`/`height` rules on the host can override it.                              |

The host is non-focusable, non-interactive, `pointer-events: none`, and does not shrink in flex layouts. The SVG inherits `currentColor`. `part="icon-graphic"` exposes it for styling; `--tp-icon-size` holds the preferred extent. The shared presentation adapter registers the host as `icon` without changing its semantics.

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

The default theme uses the shared medium icon extent (`1rem`, normally 16 CSS pixels). Small icons use `0.875rem`; large icons use `1.25rem`. These extents derive from the rem-based `--tp-spacing` seed, so changing the theme’s root spacing seed keeps them proportional. Override the icon-size roles directly for a scoped icon scale. Explicit `size` still overrides the shared extent; hit targets are unchanged.
