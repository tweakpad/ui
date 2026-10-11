# QR code fixture

Served by the Vite dev server (`npm run dev`), driven only through Chrome DevTools MCP.
Append `?built` to load the built package (`npm run build` first).

- `index.html` + `fixture.ts`: basic, actions (copyable and downloadable alone and together,
  empty, over capacity), sizes and colors (`size`, `--tp-qr-code-size` on an ancestor, a 100 px
  container, color variables, `::part(modules)`, low contrast), right to left, a dynamic area and a
  paste target. Download anchors are captured and their blobs fetched instead of saved.
- `api.ts`: `window.qrCodeAPI.assert*` helpers; each resolves to `{ checks, passed }`.

## Steps

1. Navigate to `http://localhost:5173/tests/fixtures/components/qr-code/` and wait for
   `html[data-ready]`. Keep the tab in front: helpers wait for animation frames, which a
   background tab pauses.
2. Evaluate `await qrCodeAPI.assertRoundTrip()` alone (about 6 s): Chrome's `BarcodeDetector`
   decodes sample values in every mode and level, every version 1–40 at every level filled with
   real data, all eight masks, and the rendered on-screen symbols. Short values forced into large
   versions (mostly padding) are not part of it: the macOS detector misses some of those although
   the symbols are valid (codewords read back exactly, other masks decode).
3. Evaluate, one per call, `assertExports`, `assertProperties`, `assertDownload`, `assertCopy`,
   `assertActions`, `assertPresentation` and `assertLifecycle`.
4. Real input: click Copy in `#actions` (the result reports `image/png` and `text/plain` and
   announces "Copied"); open Download by pointer and by keyboard (`ArrowDown`, `Enter`, `Escape`)
   and check the recorded files and the returned focus; Tab through the actions.
5. Run axe on `main` in light and dark (`emulate` color scheme) and take screenshots of the
   actions and the sizes rows in both schemes.
6. Repeat 2–3 with `?built`.

Reading the clipboard back (`navigator.clipboard.read()`) waits on Chrome's permission prompt and
is not part of the steps; the write itself is confirmed by the browser.
