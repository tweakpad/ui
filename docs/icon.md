# Icon

`<tp-icon>` renders a supplied SVG path definition. It does not look up icon names or download artwork. The library offers independent icon-definition modules; applications may also supply their own definitions.

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

`@tweakpad/ui/icons/media` offers the media-control set as 24×24 outline artwork with the same 2-unit stroke as the single-icon modules. Each definition is a separate named export, so importing one keeps the others out of a bundled build:

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

## File icons

`@tweakpad/ui/icons/upload-cloud` exports `uploadCloudIcon`, the upload mark of File upload and the `cloud` entry of `@tweakpad/ui/icons/empty-state`. `@tweakpad/ui/icons/image` exports `imageIcon` (an image file) beside `imageOffIcon` (an image that could not load); `@tweakpad/ui/icons/file-text` exports `fileTextIcon` for other files.

## Text editing icons

Rich-text toolbars, menus and popovers can use these 24×24 outline definitions, drawn with the same 2-unit stroke as the single-icon modules. Each is a separate named export, so importing one keeps the others out of a bundled build:

```ts
import { strikethroughIcon } from '@tweakpad/ui/icons/text-formatting';
import { bulletListIcon, quoteIcon } from '@tweakpad/ui/icons/text-blocks';
```

| Module                               | Named exports                                                                                                                                                                                                         | Use                                                                          |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `@tweakpad/ui/icons/text-formatting` | `boldIcon`, `italicIcon`, `underlineIcon`, `strikethroughIcon`, `codeIcon`, `superscriptIcon`, `subscriptIcon`, `highlighterIcon`, `baselineIcon`, `removeFormattingIcon`                                             | Marks, highlight, text color and clearing formatting                         |
| `@tweakpad/ui/icons/text-blocks`     | `heading1Icon`, `heading2Icon`, `heading3Icon`, `pilcrowIcon`, `bulletListIcon`, `orderedListIcon`, `taskListIcon`, `quoteIcon`, `codeBlockIcon`, `calloutIcon`, `embedIcon`                                          | Block kinds                                                                  |
| `@tweakpad/ui/icons/text-align`      | `textAlignLeftIcon`, `textAlignCenterIcon`, `textAlignRightIcon`, `textAlignJustifyIcon`                                                                                                                              | Text alignment                                                               |
| `@tweakpad/ui/icons/link`            | `linkIcon`, `unlinkIcon`, `cornerDownLeftIcon`                                                                                                                                                                        | Adding, removing and applying links                                          |
| `@tweakpad/ui/icons/table-editing`   | `tableIcon`, `insertRowAboveIcon`, `insertRowBelowIcon`, `insertColumnLeftIcon`, `insertColumnRightIcon`, `mergeCellsIcon`, `splitCellIcon`, `headerRowIcon`, `headerColumnIcon`, `paintBucketIcon`, `clearCellsIcon` | Table structure, header rows and columns, cell background and clearing cells |
| `@tweakpad/ui/icons/arrows`          | `arrowUpIcon`, `arrowDownIcon`, `arrowLeftIcon`, `arrowRightIcon`                                                                                                                                                     | Moving blocks, rows and columns                                              |
| `@tweakpad/ui/icons/ellipsis`        | `ellipsisVerticalIcon`                                                                                                                                                                                                | More actions, stacked                                                        |
| `@tweakpad/ui/icons/image-plus`      | `imagePlusIcon`                                                                                                                                                                                                       | Adding an image                                                              |
| `@tweakpad/ui/icons/at-sign`         | `atSignIcon`                                                                                                                                                                                                          | Mentions                                                                     |
| `@tweakpad/ui/icons/ban`             | `banIcon`                                                                                                                                                                                                             | No color, or none of a set                                                   |

The text-alignment and column icons are physical: in a right-to-left editor, start alignment shows `textAlignRightIcon` and a column inserted before the current one shows `insertColumnRightIcon`. The horizontal ellipsis is the `more` entry of `navigationIcons` (`@tweakpad/ui/icons/navigation`). `@tweakpad/ui/icons/text-formatting` also exports `bookmarkIcon` and `filledBookmarkIcon`. Editing surfaces reuse `undoIcon`, `redoIcon`, `imageIcon`, `trashIcon`, `copyIcon`, `copyPlusIcon`, `minusIcon`, `plusIcon`, `gripVerticalIcon`, `chevronDownIcon`, `checkIcon` and `externalLinkIcon` from their own modules, such as `@tweakpad/ui/icons/undo`.

## Properties

| Property | Attribute | Type                          | Default     | Behavior                                                                                                                                                                                                |
| -------- | --------- | ----------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `icon`   | —         | `IconDefinition \| undefined` | `undefined` | SVG artwork; assign as a JavaScript property. No output when absent.                                                                                                                                    |
| `label`  | `label`   | `string`                      | `''`        | Non-empty text makes the host `role="img"` with that accessible name. Empty means decorative and `aria-hidden="true"`.                                                                                  |
| `size`   | `size`    | CSS length                    | `''`        | Empty takes the icon extent of the enclosing control's size, otherwise the `--tp-icon-size-md` role. A length sets the preferred square extent; CSS `width`/`height` rules on the host can override it. |

The host is non-focusable, non-interactive, `pointer-events: none`, and does not shrink in flex layouts. The SVG inherits `currentColor`. `part="icon-graphic"` exposes it for styling; `--tp-icon-size` holds the preferred extent. The host registers as the `icon` presentation part without changing its semantics.

## Custom definitions

```ts
import type { IconDefinition } from '@tweakpad/ui';

const customIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [{ d: 'M12 5v14M5 12h14', strokeWidth: 2 }],
};

document.querySelector('tp-icon').icon = customIcon;
```

Definitions contain paths, not HTML strings. Paths default to no fill and a `currentColor` stroke; each path can override `fill`, `stroke`, `strokeWidth`, `fillRule`, and `clipRule`. For filled artwork, set `fill: 'currentColor'` and `stroke: 'none'`.

The default theme uses the shared medium icon extent (`1rem`, normally 16 CSS pixels). Small icons use `0.875rem`; large icons use `1.25rem`. These extents derive from the rem-based `--tp-spacing` seed, so changing the theme’s root spacing seed keeps them proportional. Override the icon-size roles directly for a scoped icon scale. Explicit `size` still overrides the shared extent; hit targets are unchanged.
