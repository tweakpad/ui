# Copy button fixture

Served by the Vite dev server (`npm run dev`), driven only through Chrome DevTools MCP. Append
`?built` to load the built package.

- `index.html`: icon-only, labelled, outline and disabled buttons, the four sizes, an Input group
  action, a Field group member, a Code block (which composes the same control), a button whose
  `tp-copy` proposal the page cancels, an event log and an empty `#host` for the contract.
- `contract-checks.js`: `copyButtonContract.run()` checks the rest name, the copied state and
  name swap with `data-copied`, the `tp-copy` → `tp-copied` order, the reset after `duration`, a
  cancelled proposal, the disabled result and the labelled rendering; `run({ readClipboard: true })`
  also reads the clipboard back, which prompts for permission in Chrome.

## Through Chrome DevTools MCP

1. Navigate to `http://localhost:5173/tests/fixtures/components/copy-button/` and wait for
   `html[data-ready]`.
2. Evaluate `await copyButtonContract.run()`; the promise rejects with the failing keys.
3. Tool-driven: click `#plain` and read its accessible name in a snapshot (Copied), wait two
   seconds and snapshot again (Copy plain value); Tab to `#labelled` and press Enter; click the
   Code block copy action; click `#cancelled` and read `#log` (`cancelled not copied`).
4. Run axe through `evaluate_script`; take light and dark screenshots.
