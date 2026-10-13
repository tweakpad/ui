# File upload fixture

Served by the Vite dev server (`npm run dev`), driven only through Chrome DevTools MCP. Append
`?built` to load the built package. The library dev server may listen only on the IPv6
loopback; use `http://[::1]:5173/` when `localhost` resolves to another server.

- `index.html`: one instance per layout (single backup file, chips with Clear, the
  Trigger and `paste="document"`, documents with badges and a metadata validator, an eight-slot image grid with `paste="control"` and a
  textarea that keeps its own pastes), an upload
  adapter case, a CSV validator, a Field + Form case, disabled and read-only instances, an empty
  `#host` for the contract and an event `#log`.
- `fixture.ts`: sample files and images, validators, the simulated uploader, the Form submit
  callback and `fileUploadFixture` (`makeFile`, `makeImage`, `dropFiles`, `pasteFiles`, `events`,
  `diagnostics`, `$`). `dropFiles` dispatches constructed drag events; this is API evidence,
  because MCP cannot drive an operating-system drag.
- `contract-checks.js`: `fileUploadContract.run()` checks assignment without events, proposal
  metadata and cancellation, single replacement, fill-then-reject and the full state, size and
  duplicate limits, validator order, metadata and exclusion, `validate()`, reset abort and
  default restore, messages, item state and server rejection, `keep-rejected="false"`, the
  upload queue (progress, concurrency, abort, error, retry, cancel), preview address lifecycle,
  disabled and read-only refusals, FormData, toggles, diagnostics, the document drop guard and
  paste routing (control and document scopes, editable targets, text-only pastes, read-only,
  disabled, `none` and disconnection).

## Through Chrome DevTools MCP

1. Navigate to `http://[::1]:5173/tests/fixtures/components/file-upload/` and wait for
   `html[data-ready]`.
2. Evaluate `await fileUploadContract.run()`; the promise rejects with the failing keys.
3. Real picker input: take a snapshot and call `upload_file` on the input buttons (named by the
   title or Field label) with files from disk: a `.sql` and a `.txt` for `#backup` (replace and
   type rejection), an oversized and a valid PDF for `#contract` (Field error, then submit and
   read `#log` for `contract=…`), CSVs for `#csv`. For the pointer path into the picker, call
   `upload_file` on slotted title text; shadow fallback text is not targetable by the tool.
4. Click a Remove Button and the Retry Button (after "Add three files") with real clicks.
5. Tab to an input and screenshot the Dropzone focus ring; check the input leaves the tab
   order in the full grid.
6. Evaluate `await fileUploadFixture.dropFiles(el, files, { leave: true })` for
   `data-drop-target` and `data-drop-reject`.
7. Paste: put an image on the clipboard with `navigator.clipboard.write`, `hover` the grid
   summary text, then dispatch `fileUploadFixture.pasteFiles(document.body, [file])`; the grid
   (pointer over it) takes it ahead of the document-scoped chips. Key presses through the MCP
   raise no native paste event, so a real keyboard paste is recorded as blocked.
8. Inject `/node_modules/axe-core/axe.min.js` and run `axe.run(document)`; the fixture page
   itself has no level-one heading. Take dark, light, RTL and 390 px screenshots.
9. Standalone tree-shaking: `http://[::1]:5173/tests/fixtures/components/standalone/?component=TpFileUpload`
   defines only File upload and the elements it renders.
