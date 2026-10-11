# QR code

`<tp-qr-code>` turns a text value into a scannable QR code on a light tile. It can copy the code
and download it as PNG, SVG or JPG, at any size and with any error correction level. The encoder
is built in (ISO/IEC 18004, QR Code Model 2), so there is no dependency to install, and it is
also published on its own as `@tweakpad/ui/qr`.

## Base example

```html
<tp-qr-code
  value="https://ledger.app/connect/jd-4829"
  label="Scan to connect your mobile device"
></tp-qr-code>
```

Give every code a `label` that says what scanning does; it names the image for assistive
technology and titles SVG exports. The value itself is never announced, because it may be
private. Show a link or the text beside the code for people who cannot scan.

## Properties

| Property          | Attribute          | Values                                             | Default   |
| ----------------- | ------------------ | -------------------------------------------------- | --------- |
| `value`           | `value`            | Text to encode                                     | `""`      |
| `errorCorrection` | `error-correction` | `L`, `M`, `Q`, `H`                                 | `M`       |
| `quietZone`       | `quiet-zone`       | Light border in modules, a non-negative integer    | `4`       |
| `size`            | `size`             | `sm` (128 px), `default` (192 px), `lg` (256 px)   | `default` |
| `label`           | `label`            | Accessible name and export title                   | `""`      |
| `copyable`        | `copyable`         | Boolean; shows the Copy button                     | `false`   |
| `downloadable`    | `downloadable`     | Boolean; shows the Download menu                   | `false`   |
| `exportSize`      | `export-size`      | Side of exports and of the copied image, in pixels | `1024`    |
| `filename`        | `filename`         | Download file name without its extension           | `qr-code` |
| `messages`        | (property)         | Built-in strings, see below                        | English   |

Error correction restores about 7 % (`L`), 15 % (`M`), 25 % (`Q`) or 30 % (`H`) of a damaged
code. Higher levels need more modules for the same value, so the code becomes denser at the same
size. Use `H` when a logo or sticker may cover part of the code.

The quiet zone is the light border scanners need around the modules. It is drawn inside the tile
and included in every export. Keep the default of 4 modules unless the code sits on a light
surface that already provides the margin.

## Copy and download

`copyable` and `downloadable` add an actions row below the tile, independently of each other.
Both actions are disabled while there is no code to show.

- **Copy** writes one clipboard item holding the PNG image at `exportSize` and the value as
  text. An image editor or chat pastes the picture, and a text field pastes the value. When the
  browser refuses images, the text alone is copied. The button confirms and announces the
  result like any [Copy button](copy-button.md).
- **Download** opens a menu with PNG, SVG and JPG. The file is named after `filename`
  (`qr-code.png` by default) and is exported at `exportSize`.

```html
<tp-qr-code
  value="https://tweakpad.github.io/invite/42"
  label="Invite link"
  copyable
  downloadable
  filename="invite"
  export-size="2048"
></tp-qr-code>
```

The same work is available without the actions row:

- `copy()` copies the image and the value and resolves to whether anything was written.
- `download(format, options)` downloads `png`, `svg` or `jpeg`. `options` can set `size`,
  `filename` and JPEG `quality` (0 to 1, default 0.92).
- `toBlob(format, options)` resolves to the image file, and `toSVG(options)` returns the SVG
  document as text. Both give `null` while there is no code.

```js
const code = document.querySelector('tp-qr-code');
await code.download('svg', { size: 512, filename: 'poster-code' });
const png = await code.toBlob('png', { size: 300 });
```

PNG and JPEG files are exactly the requested size. Every module is the same whole number of
pixels, so the code never blurs; the pixels left over widen the quiet zone. JPEG has no
transparency and is painted on white. Sizes are clamped between the module count and 4096
pixels.

## Events

| Event               | Cancelable | Detail                                                        |
| ------------------- | ---------- | ------------------------------------------------------------- |
| `tp-copy`           | yes        | `value`; preventing it skips the copy                         |
| `tp-copied`         | no         | `value` and `types`, the media types written                  |
| `tp-copy-error`     | no         | `value` and empty `types`                                     |
| `tp-download`       | yes        | `format`, `size`, `filename`, `sourceEvent`; preventing skips |
| `tp-download-error` | no         | the same detail and `error`; the failure is also announced    |
| `tp-diagnostic`     | no         | `code`, `message`, `severity`                                 |

Browsers do not report whether a downloaded file was saved, so there is no completion event.
Diagnostics report an unknown error correction level or quiet zone (the defaults are used), a
value too long for the largest code (`qr-code-capacity`, with the limit), a clamped export size,
and colors with too little contrast (`qr-code-contrast`).

## Status

`status` is `empty` without a value, `encoded`, or `error` when the value does not fit. The host
reflects it as `data-status`. `version` (1 to 40) and `moduleCount` (modules per side, without
the quiet zone) describe the encoded code and are `null` otherwise. While empty or in error the
tile keeps its size and shows the light background alone.

The value is encoded in the most compact mode: digits only, upper-case letters with digits and
`$%*+-./:` and spaces, or any text as UTF-8 bytes. The largest code holds:

| Level | Digits | Upper-case letters | UTF-8 bytes |
| ----- | ------ | ------------------ | ----------- |
| L     | 7089   | 4296               | 2953        |
| M     | 5596   | 3391               | 2331        |
| Q     | 3993   | 2420               | 1663        |
| H     | 3057   | 1852               | 1273        |

## Messages

`messages` replaces any of the built-in strings: `qrCode` (the image name when `label` is
empty), `actions` (the actions group name), `copy`, `copied`, `copyFailed`, `download`,
`downloadPng`, `downloadSvg`, `downloadJpeg` and `downloadFailed`.

## Size and colors

The tile is square. `size` picks one of three sizes, and `--tp-qr-code-size` sets any other
size; it can be set on the element or any ancestor. The tile never grows wider than the space
around it.

The code is dark on light in every color scheme, because many scanners cannot read a light code
on a dark background. The tile stays light in a dark theme, like a printed sticker.
`--tp-qr-code-foreground` and `--tp-qr-code-background` change the colors; downloads and copies
use the same colors. A diagnostic warns when the modules are lighter than the background or the
contrast is below 3:1.

```html
<tp-qr-code
  value="https://tweakpad.github.io"
  label="Tweakpad UI"
  style="--tp-qr-code-size: 12rem; --tp-qr-code-foreground: #3b2fc9"
></tp-qr-code>
```

## Accessibility

The code is an image named by `label`, or by the `qrCode` message when `label` is empty. It is
hidden from assistive technology while there is no code. The actions are a group named by the
`actions` message; the Copy button and the Download menu keep their own keyboard behavior and
announcements. The image never mirrors in right-to-left layouts, and in forced-colors mode it
keeps its own colors so it stays scannable.

## Theming

Public parts: `tile`, `symbol` (the SVG), `background`, `modules`, `actions`, `copy`, `download`,
`download-trigger` and `download-item`. Presentation keys use the `qr-code-` prefix
(`qr-code`, `qr-code-size-sm`, `qr-code-size-default`, `qr-code-size-lg`, `qr-code-tile`,
`qr-code-symbol`, `qr-code-background`, `qr-code-modules`, `qr-code-actions`, `qr-code-copy`,
`qr-code-download`, `qr-code-download-trigger`, `qr-code-download-item`). The tile uses the
border role and the extra-large radius. The actions keep the appearance of the
[Button group](button-group.md), [Copy button](copy-button.md), [Button](button.md) and
[Menu](menu.md) they compose. Colors set through parts, keys or the variables reach the screen
and every export.

## Encoding without the element

`@tweakpad/ui/qr` encodes without a browser, for servers, workers and build scripts:

```js
import { encodeQr, qrPathData } from '@tweakpad/ui/qr';

const code = encodeQr('https://tweakpad.github.io', { errorCorrection: 'Q' });
const quietZone = 4;
const extent = code.size + quietZone * 2;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${extent} ${extent}"><path d="${qrPathData(code, quietZone)}"/></svg>`;
```

`encodeQr(text, { errorCorrection, minVersion, maxVersion, mask })` returns the version, size,
mask, mode and modules (row by row, 1 for dark). It throws `QrCapacityError`, carrying the
limit, when the value does not fit. `qrCapacity(mode, level, version)` gives the limits above.
