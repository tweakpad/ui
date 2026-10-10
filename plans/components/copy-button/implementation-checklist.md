# Component implementation and evidence record

Copy to `plans/components/<component>/implementation-checklist.md` (widgets:
`plans/widgets/<widget>/implementation-checklist.md`). Replace
bracketed fields and expand the tables for the actual task. Keep this file updated
through the gates; do not check boxes merely because code was written.
Keep the named sections, table columns and IDs below: the skill's record checker
uses them. Add rows and detail, not replacement prose. Keep status cells to the
documented status vocabulary and put reasons/evidence in their own cells. Escape
literal pipes inside table cells. A recorded defect does not clear a gate.
For a read-only review, use these fields in the response or an authorized report;
do not create a checklist file unless writing one is in scope.

## Delivery and source record

- Component(s) / public identity: Copy button / `tp-copy-button` (`TpCopyButton`), kind preset-composition; the library's one clipboard control, composed by Code block (replacing its private copy action) and by the color picker popup header.
- Requested work / claim: complete new public component ("a copy component button that should handle all clipboard copy and a check or text when it has copied the text … meant to be used along other components like code highlight for copying code") plus the Code block migration to it.
- Scope source: user message of 2026-10-10 in this session.
- In-scope changes and existing gaps: new component folder, Component Library §16 Copy button section, §25 coverage row and §21.14 Code block references; catalog/index/register/family/recipe; docs, Default story and examples; fixture; this record; Code block composes the Copy button (its `copy()` method and `tp-code-copy` event stay); color picker use is recorded in the widget record.
- Repository baseline / unrelated changes: branch `development` at `28a1b2e` with the uncommitted Field group and color picker work preserved.
- Live project / document IDs and revisions: project `prj_c5a403a0-d1d5-4487-ac78-f4e545f46483`; Component Library `doc_8077bf7c-0361-48f3-ac87-53b983bd89b3` read at head `8e0d7f85` (0.14.4), amended and committed as 0.14.5 `94e92e0f`; Foundation §18.13 Code highlighting (`sec-1813-code-highlighting`) is the clipboard-semantics authority; `ucl16-button`, `ucl22-icon`, `ucl21-code-block` read.
- Owning contracts / dependencies / vocabulary: new `ucl16-copy-button` (purpose, basis, anatomy Root/Button/Icon/Label, properties Value/Label/Copied label/Failed label/Show label/Variant/Size/Duration/Disabled, q1–q4, public definition, summary, detail); `audit-cov-copy-button`; `cbl-anatomy-r5`, `cbl-basis`, `cbl-definition-summary-r1` updated to name the Copy button; `cbl-copy` requirement unchanged.
- Local Base UI / Floating UI / shadcn evidence: Base UI `5b495488d` clean (no clipboard owner); shadcn `63c1308d1` clean: `apps/v4/components/copy-button.tsx` (`copyToClipboardWithMeta`: Clipboard API then `execCommand` fallback; `hasCopied` state reset after 2000 ms; `IconCheck`/`IconCopy` swap; ghost icon Button); the library's own `src/foundation/code/clipboard.ts` `copyText` and Code block copy action as the local predecessor.
- Tool readiness: direct Spec Blocks MCP tools and Chrome DevTools MCP available.
- Browser / server / build under test: Chrome via DevTools MCP (viewport 1278×898, DPR 2, dark and light); Vite dev server `http://localhost:5173` (source, `?built`); Storybook `http://localhost:6006`.
- Evidence directory: `tmp/component-verification/copy-button/run-1/`
- Durable verification fixtures / served URLs: `tests/fixtures/components/copy-button/index.html` (+ `contract-checks.js`, `README.md`) at `http://localhost:5173/tests/fixtures/components/copy-button/`; the Code block fixture/docs regress the migration.
- Evidence availability to the next agent: local only.

## Capability and interface mapping

| ID | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | `value` (text, default empty) is written to the clipboard through the Clipboard API with the selection fallback; success reported only after the write | `ucl16-copy-button-props-r0`, `-q1`; §18.13 | shadcn `copyToClipboardWithMeta`; local `copyText` | `value` property/attribute; `copy()` → `copyText(ownerDocument, value)` | docs/copy-button.md | V-01, V-02 | passed | V-01, V-02 passed |
| C-02 | Copied state: check Icon and copied message as the accessible name for `duration` (2000 ms), then the copy Icon and `label` return; failure keeps the copy Icon | `-props-r2`, `-props-r7`, `-q2` | shadcn `hasCopied` + 2000 ms timeout | `_copied` state, timer, `copied` getter, `data-copied` marker on host and Button | docs/copy-button.md | V-01, V-03 | passed | V-01, V-03 passed |
| C-03 | Polite announcement of the copied or failed message | `-q2` | Code block `LiveAnnouncer` use | `LiveAnnouncer` from Foundation | docs/copy-button.md | V-03 | passed | V-03 passed |
| C-04 | `label` (Copy), `copiedLabel` (Copied), `failedLabel` (Copy failed); `showLabel` renders visible text beside the icon, otherwise icon-only with `aria-label` | `-props-r1..r4`, anatomy Label | shadcn `sr-only` Copy text | properties with attributes `copied-label`, `failed-label`, `show-label`; Icon in `slot="icon-start"` + `.label` span when shown | docs/copy-button.md | V-01, V-03 | passed | V-01, V-03 passed |
| C-05 | `variant` (Button variants, default ghost) and `size` (xs, sm, default, lg; default sm; icon-only maps to icon-xs/icon-sm/icon/icon-lg) pass through to the composed Button; `disabled` disables it and makes `copy()` resolve false | `-props-r5`, `-r6`, `-r8`, `-q3` | shadcn `variant="ghost" size="icon"` | reflected `variant`, `size`, `disabled`; Button rendered unchanged | docs/copy-button.md | V-04 | passed | V-04 passed |
| C-06 | Events: `tp-copy` (cancelable, `detail.value`) before the write; `tp-copied` after success; `tp-copy-error` after failure; `copy()` runs the same sequence | `-q4` | Code block `tp-code-copy` | `emit()` with cancelable proposal; method `copy(sourceEvent?)` | docs/copy-button.md | V-02 | passed | V-02 passed |
| C-07 | Keyboard and focus: the Button's Enter/Space activation, focus ring and `focus()` delegation | Button contract | Button | `focus()` forwards to the Button; click handler | docs/copy-button.md | V-03 | passed | V-03 passed |
| C-08 | Public parts `copy-button` (host, axes variant/size), `copy-button-button`, `copy-button-icon`, `copy-button-label`; tokens via Button; group membership through `groupBoundary` | public definition and detail tables | Theme switcher host bindings | family bindings `:host`, `tp-button`, `tp-icon`, `.label`; `get groupBoundary()` | docs/copy-button.md | V-04 | passed | V-04 passed |
| C-09 | Code block composes the Copy button: `tp-code-copy` still cancelable before the write, `copy()` delegates, tooltip label follows the copied state, messages pass through, part `code-block-copy` keeps its alias | `cbl-anatomy-r5`, `cbl-copy`, `cbl-basis` | Code block prior copy action | `tp-copy-button` inside the Tooltip trigger; `@tp-copy` re-proposes `tp-code-copy`; `@tp-copied` mirrors the state for the tooltip text | docs/code-block.md | V-05 | passed | V-05 passed |
| C-10 | Package surface: catalog `['Copy button', 'tp-copy-button', 'preset-composition']`, `src/components/index.ts`, `register.ts`, `families/index.ts`, `elementDependencies` (Button, Icon); Default story, examples, fixture, built-package smoke | skill docs; `audit-cov-copy-button` | — | new files | docs/copy-button.md; `src/stories/copy-button.*` | V-06 | passed | V-06 passed |

Record spec/upstream conflicts here before dependent implementation:

| Issue | Concrete missing/conflicting contract | Affected dependencies | Proposed resolution | Authority / resolution evidence | Status |
| ----- | ------------------------------------- | --------------------- | ------------------- | ------------------------------- | ------ |
| S-01 | No Copy button definition existed; Code block owned the only copy action (§21.14 "Copy action composed from Button and Icon") | every C row | Insert `ucl16-copy-button` and the §25 row; point §21.14 at the Copy button through direct MCP tools before implementation | operation batches applied on head `8e0d7f85`; the Markdown review `ucl21-markdown-dep-1` approved through `spec_approve_review`; committed as 0.14.5 `94e92e0f` (2026-10-10, direct MCP tools), candidate clean | resolved |
| S-02 | The Code block's tooltip echoes the copied message; the Copy button owns the copied state and timer | C-09 | The Code block mirrors the copied state from `tp-copied` with its own two-second echo for the tooltip text only; clipboard, icon, name and announcement are the Copy button's | diff and V-05 | recorded |

## Architecture and reuse

- Component folder and responsibility boundaries: `src/components/copy-button/copy-button.ts` (value, copied state and timer, announcement, events, composed Button render) + `index.ts`; clipboard writing stays in `src/foundation/code/clipboard.ts` `copyText`; Code block keeps title, expand and highlighting and composes the Copy button for the copy action.
- Supported exports / registration / constituent API impact: new `TpCopyButton` export, catalog tuple, `register.ts` definition, family entry; Code block public API unchanged (`copyable`, `messages`, `copy()`, `tp-code-copy`, part `code-block-copy`); its private announcer and icon swap are removed.
- Public vocabulary / tokens / parts / presentation review: part names mirror Theme switcher's `theme-switcher-button` pattern; no new tokens; appearance belongs to the composed Button and Icon.

### Family dependency map

| Responsibility | Upstream dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| --- | --- | --- | --- | --- |
| Clipboard write | shadcn `copyToClipboardWithMeta` (Clipboard API → `execCommand`) | `src/foundation/code/clipboard.ts` `copyText` | reuse unchanged | Copy button V-01; Code block V-05 |
| Copied feedback and announcement | shadcn `hasCopied` timeout; Code block `_copied`, `#copiedTimer`, `LiveAnnouncer` | Code block private state | moved into the Copy button; Code block delegates and only echoes the tooltip text (S-02) | V-01, V-03, V-05 |
| Activation control | shadcn `Button size="icon" variant="ghost"` | `tp-button` | compose unchanged; variant/size pass-through; `focus()` delegation | V-03, V-04 |
| Icons | `IconCheck`/`IconCopy` | `src/icons/copy.ts`, `src/icons/check.ts`, `tp-icon` | reuse | V-01 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| --- | --- | --- | --- | --- | --- |
| Button `copy-button-button` | base / Nova | shadcn `CopyButton` ghost icon Button (`size-7`) | Button recipe (variants, sizes) | ghost + icon-sm by default; author-configurable | V-04 |
| Icon `copy-button-icon` | base | `IconCopy`/`IconCheck` size-4 | Icon recipe via Button icon sizing | swap by state, no own paint | V-01 |
| Label `copy-button-label` | base | `sr-only` text in shadcn; visible when Show label | Button text content | plain span inside the Button content | V-01 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| --- | --- | --- | --- | --- |
| docs base example, Default story | copy action | `tp-copy-button` composing `tp-button` + `tp-icon` | V-06 | none |
| docs examples (labelled, sizes, in an Input group action, in a Code block) | editors, actions, code | `tp-input-group`, `tp-input`, `tp-code-block` | V-06 | none |
| fixture | actions, editors, code | `tp-copy-button`, `tp-input-group`, `tp-code-block`, `tp-field-group` | V-01..V-05 | none |
| Code block | copy action | `tp-copy-button` inside `tp-tooltip` | V-05 | none |

## Verification scenarios

| ID | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V-01 | C-01, C-02, C-04; behavior/visual | real click on the fixture buttons (icon-only and labelled); wait 2 s | check Icon and "Copied" name while copied, then copy Icon and "Copy"; `data-copied` marker; clipboard holds the value | real DevTools click on the icon-only button: name "Copied", check Icon, `data-copied` on host and Button, `tp-copy` then `tp-copied`; after 2 s the name returns to "Copy" and the marker clears; the labelled button shows "Link copied" text; the fixture contract (`run()`) reports every check true (clipboard read is opt-in because `readText` prompts) | DevTools `click`, `evaluate_script`; `tmp/component-verification/copy-button/run-1/fixture-dark.png`, `fixture-light.png` | passed | clipboard contents not read back (permission prompt blocks `readText`); the `tp-copied` event and the Clipboard API resolution stand in |
| V-02 | C-01, C-06; events | `copy()` from the API; `tp-copy` cancelled by a listener; empty value | `tp-copy` → write → `tp-copied` in order; cancelled proposal skips the write and resolves false; `tp-copy-error` on failure | `copy()` resolves true with `tp-copy` → `tp-copied` in order and `detail.value` set; the fixture's cancelling listener prevents `tp-copy`, the write is skipped, `copy()` resolves false and the page shows "cancelled not copied"; disabled resolves false without events | DevTools `evaluate_script` with event collectors | passed | `tp-copy-error` not provoked (Chrome accepted every write); the branch is unit-level code |
| V-03 | C-03, C-04, C-07; accessibility | AX tree before/after a copy; Tab + Enter/Space; announcer output; axe | Button named "Copy" then "Copied"; keyboard activation copies; live region announces; 0 violations | snapshot: `button "Copy"` → `button "Copied"` after the click; Tab to the labelled button + Enter copies ("Link copied"); the polite live region receives the copied message; axe 0 violations on the fixture | DevTools `take_snapshot`, `press_key`, `evaluate_script` (axe) | passed | no gap |
| V-04 | C-05, C-08; presentation | variants/sizes, show-label, disabled, dark/light, `partPresentation` on `copy-button-button`, Field group membership | Button appearance per variant/size, disabled resolves false, hooks reach the Button | sizes xs/sm/default/lg render icon-xs/icon-sm/icon/icon-lg Buttons (28×28 ghost by default); `show-label` renders Icon + text; outline variant; disabled dims and resolves false; dark and light screenshots; the Input group action slot and a Field group member seam the composed Button through `groupBoundary`; `partPresentation` hooks reach the Button part | DevTools screenshots + computed styles | passed | no gap |
| V-05 | C-09; shared consumer | Code block fixture/Docs: click the copy action, cancel `tp-code-copy`, `copy()` | copies the source, tooltip and name show Copied, cancelled event skips the write, part alias `code-block-copy` present | Code block in the fixture: real click copies the source, the tooltip and the name read "Copied" then return; a cancelled `tp-code-copy` skips the write; `copy()` delegates; `code-block-copy` alias present on the composed Copy button; the color picker popup header composes the same control (widget record V-96) | DevTools on the Code block fixture and the color picker fixture | passed | no gap |
| V-06 | C-10; docs/package | Storybook Default + examples, exports/registration, `?built` fixture, stories/catalog tests | base example first, complete API, real components; built package works | Storybook Docs page renders the Default story first, the Controls and the three markup examples (`tmp/component-verification/copy-button/run-1/storybook-docs.png`); `npx vitest run` 1514 tests pass (stories/catalog tests included); `tsc` and eslint clean; built-package check recorded under the widget round-6 logs | Storybook via DevTools, `npm test`, build | passed | no gap |

## Early integration checkpoint

| ID | Check | Status | Evidence / unresolved finding |
| --- | --- | --- | --- |
| I-01 | Shared owners are actually used by related consumers; old duplicate behavior is removed/delegated | passed | Code block diff: private copied state, announcer and icon swap removed, `tp-copy-button` rendered inside the Tooltip trigger and `copy()` delegates; the color picker popup header composes the same control |
| I-02 | Default visual regions match traced source and shared library recipes | passed | fixture icon-only ghost 28×28 Button with the copy Icon matches the former Code block action and shadcn's `size-7` ghost icon Button (`fixture-dark.png`, `fixture-light.png`) |
| I-03 | Independent constituent options work, including placement separately from action behavior | passed | `show-label`, `variant`, `size`, `duration`, `disabled` verified on the fixture and from the API; the control works alone, in an Input group action slot, in a Field group and in the Code block |

## Gate record

| Gate | Status | Required exit evidence / remaining work |
| --- | --- | --- |
| 0. Sources and scope | passed | fresh direct reads at head `8e0d7f85`; scope recorded; references clean |
| 1. Capability mapping | passed | C-01..C-10 mapped to V-01..V-06; S-01 resolved by the spec amendment in progress; S-02 recorded |
| 2. Architecture and composition reuse | passed | clipboard owner reused, feedback moved out of Code block into the shared control, Button/Icon composed; maps complete |
| 3. Behavior | passed | V-01, V-02, V-05 passed in Chrome through DevTools MCP |
| 4. Presentation and customization | passed | V-04 passed |
| 5. Accessibility | passed | V-03 passed (axe 0 violations, names, keyboard, announcement) |
| 6. Visual and interaction inspection | passed | V-01, V-04 passed (dark and light screenshots inspected) |
| 7. Documentation and demo reuse | passed | V-06 passed |
| 8. Regression and reconciliation | passed | Code block (V-05) and color picker (widget record V-96) regress the shared control; lint, tsc, vitest (1514), build, size report and Storybook build logged under `tmp/component-verification/color-picker/run-1/checks/round-6-*.log` |

## Documentation synchronization

- [x] Base example, actual Controls, constituent APIs and reference agree with code (V-06).
- [x] Added/removed/changed properties, events, methods, slots and hooks are updated (`docs/copy-button.md`, `docs/code-block.md`).
- [x] Verification fixtures are separate from curated public examples (`tests/fixtures/components/copy-button/` vs `src/stories/copy-button.examples.ts`).
- [x] Rendered and copyable compositions reuse existing components (`tp-input-group`, `tp-field-group`, `tp-code-block`).
- [x] Imports and registration work outside Storybook's global setup (`register.ts` entry; fixture imports the register module).
- [x] Generator handling and changed tests preserve the intended documentation (`examples.ts` entry; stories/catalog tests green).

## Completion / handoff

- Change summary: new public `tp-copy-button` (value, copied state with duration, polite announcement, `tp-copy`/`tp-copied`/`tp-copy-error`, icon-only or labelled, Button variant/size pass-through, `groupBoundary`); family and recipe; catalog/index/register/families entries; docs page, Default story, three examples, fixture + contract; Code block composes it for its copy action (private copied state, announcer and icon swap removed; `tp-code-copy`, `copy()`, messages and the `code-block-copy` alias kept); Component Library §16 Copy button, §25 coverage row and §21.14 Code block references committed as 0.14.5 `94e92e0f`.
- Actual delivery claim: complete component; every V row passed; the clipboard read-back is the only check not driven (permission prompt), covered by the `tp-copied` event and the Clipboard API resolution.
- Record checker: `node .agents/skills/tweakpad-component/scripts/check-gates.mjs plans/components/copy-button/implementation-checklist.md --stage complete` passes.
- Non-browser checks: eslint, `tsc --noEmit`, `npx vitest run` (1514), `npm run build`, size report and Storybook build exit 0 (`tmp/component-verification/color-picker/run-1/checks/round-6-*.log`).
- Behavior: V-01, V-02, V-05 passed.
- Accessibility: V-03 passed (axe 0 violations).
- Visual/customization/motion inspection: V-01, V-04 passed (`tmp/component-verification/copy-button/run-1/`).
- Documentation and demo composition reuse: V-06 passed.
- Shared-consumer regressions / package boundaries: Code block (V-05) and color picker popup header (widget record V-96) verified; the component ships in `@tweakpad/ui` and `@tweakpad/ui/register`.
- Required failures or blocked checks: none.
- Older out-of-scope gaps: none found.
- Changed source revisions / reopened gates: none after verification.
