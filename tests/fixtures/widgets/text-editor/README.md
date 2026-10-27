# Text editor fixtures

Browser verification of the text editor's engine adapters, driven only through the Chrome
DevTools MCP tools (never another driver). The record lives in
`plans/widgets/text-editor/implementation-checklist.md`. `corpus/` holds the content corpus
(`corpus/README.md`).

`engines.html` is the parity page: each instance hosts one adapter through the real headless
controller and a fixture-only controller host, with no widget, router or surface. The host's
hooks are logged under the names of the events that the widget dispatches.

`index.html` is the widget page: paired `tp-text-editor` instances of both engines, each read
through an element-backed facade with the same page API (see "Widget page (`index.html`)").

`nesting.html` places the widget under 0–2 open shadow roots, inside library containers and
under a closed shadow root, with move targets for reconnection and the resource ledger;
`large.html` holds a generated document of 2,000 blocks beside the bare engines; `csp.html` runs
the widget under a strict content-security policy. Each has its own section below. `ledger.ts`
and `perf.ts` hold the cleanup and performance probes these pages share.

## Serving and opening

1. From the library root, start Vite in the background:
   `./node_modules/.bin/vite --port 5173 --strictPort`. When port 5173 is held by a process that
   is not yours, leave it alone and use `--port 5180 --strictPort`. Never touch Storybook (6006)
   or Spec Blocks (8787, 54026).
2. Open your own tab with `new_page` at
   `http://localhost:5173/tests/fixtures/widgets/text-editor/engines.html`; never select, read or
   reuse another tab. Keep the tab selected while measuring: a background tab pauses
   `requestAnimationFrame`, and the controller publishes its state in a frame.
3. `wait_for` the text `After editors`, then `evaluate_script`
   `() => textEditorAPI.ready()`. `html[data-fixture-ready]` appears once every instance is
   ready; `html[data-fixture-error]` lists the instances that failed or did not settle within
   10 s, and the line under the heading names them.
4. `take_snapshot` lists each editing root as a `textbox` named by its label (the pairs share
   one label). Use `click`, `type_text`, `press_key`, `hover` and `drag` on those uids for real
   input, and `evaluate_script` for the API below. Record dispatched events, the native Copy and
   Cut commands and `beforeinput` as synthetic.
5. Before returning: `close_page` your tab, stop the server (`lsof -ti tcp:<port> -sTCP:LISTEN`,
   then `kill <pid>`), and `kill -9` the exact PIDs of orphaned
   `esbuild --service` processes (parent PID 1) under this library's `node_modules`.

Query parameters:

| Parameter                 | Effect                                                                                                                                 |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `?level=0\|1\|2`          | every instance host sits inside 0, 1 or 2 ancestor open shadow roots of plain `div`s (default 0)                                       |
| `?only=<ids>`             | only the listed instances, comma-separated (`?only=tiptap-default,lexical-default`)                                                    |
| `?engine=tiptap\|lexical` | only that engine's instances                                                                                                           |
| `?content=<name>`         | the mount content of the non-empty instances, a corpus document name (default `state`; `custom` uses `05-custom` unless this is given) |
| `?baseline`               | adds `#tiptap-baseline` and `#lexical-baseline`: bare engines with the same content and no adapter                                     |

The page loads no remote resource. Load corpus documents after navigation with `reset(id, name)`:
`portable.html` names a remote image (`https://harbor.example/pier.jpg`), which the browser then
fails to fetch and logs as a network error; documents with a local image use `pantry-shelf.svg`
beside the page (`textEditorAPI.fixtureImage`).

With `?baseline`, the bare Tiptap engine's shadow root adopts the base CSS that the Tiptap
adapter adopts (the editing mechanics the engine relies on, `white-space: pre-wrap` among them),
because the engine's own style injection targets the document head, which a shadow root does not
see. The bare Lexical engine writes its root styles itself. Neither adds a `style` element to the
page.

## Instances

Each pair is `#tiptap-<variant>` and `#lexical-<variant>`, side by side at equal widths:

| Variant    | Engine                                                                   | Content                                                                                                | Label (`aria-label`)    |
| ---------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | ----------------------- |
| `default`  | full modules                                                             | `corpus/state.html`                                                                                    | Field notes             |
| `empty`    | full modules                                                             | none; `placeholder` "Write…"                                                                           | Empty notes             |
| `readonly` | full modules, `readOnly`                                                 | `corpus/state.html`                                                                                    | Read-only notes         |
| `disabled` | full modules, `disabled`                                                 | `corpus/state.html`                                                                                    | Disabled notes          |
| `reduced`  | no `table` and `tables` modules (Tiptap) or `table` module (Lexical)     | `corpus/state.html` (its table converts at mount, with one `text-editor-content-converted` diagnostic) | Notes without tables    |
| `custom`   | full modules, `nodes` = the corpus definitions (callout, embed, mention) | `corpus/05-custom.html`                                                                                | Notes with custom nodes |

Corpus documents that need the custom definitions (`05-custom`, `addressing`, `lists`) convert
their custom nodes on the other pairs; run rows that need the mention or the callout as nodes on
the `custom` pair.

The engine modules are the installed engines, passed to the adapters as module objects. The
modules the adapters receive wrap the engines' own serializers: Tiptap's `Editor.getHTML`,
`Editor.getText`, `getHTMLFromFragment`, `generateHTML`, `generateText` and `getText`, and
Lexical's `$generateHtmlFromNodes` and `$generateNodesFromDOM`; `serializers()` reports their
call counts.

## Root attributes

The harness passes the record the widget will pass, through `setRootAttributes`: `role`
`textbox`, `aria-multiline` `true`, `aria-label` (the label, else the strings' default),
`aria-placeholder` while a placeholder is set, `aria-readonly` `true` while read-only,
`aria-disabled` `true` while disabled, `tabindex` `0` unless disabled, and `spellcheck` `true`.
It passes it again after every change of `label`, `placeholder`, `readOnly` or `disabled`. The
element's own mapping is the widget's (V-514).

## `window.textEditorAPI`

Instances and logs:

- `ids()`, `editor(id)`, `instance(id)`, `ready(ids?)`, `settle()`, `level`, `corpus()` (the
  document names) and `corpusDocument(name)` (its canonical `html`, and `markdown` and `text`
  where goldens exist).
- `editor(id)` is the instance's facade: `run(target, { value, focus })` (a request with surface
  `api` and reason `imperative-action`), `setContent(content, format = 'html')` (`content.set`
  with history `push`), `getContent(format, options?)`, `restoreContent(content, format)` (a
  form-state restore: silent, history cleared), `setDefaultContent(content, format)`, `can(action)`,
  `state`, `status`, `value`, `native`, `subscribe(selector, callback)`, `focus({ position })`
  (nothing while not ready or while disabled), `blur()`, `connect()`, `disconnect()`, `remount()`,
  `settled()`, the setters `readOnly`, `disabled`, `label`, `placeholder`, `engine` (`null`, an
  engine, or `'default'` for the instance's own), `nodes`, `tools` and `layout`, and
  `cancelRequests` (when `true`, the request hook answers "cancelled"). `host`, `shadow`,
  `container` (the content part), `root` (the editing root), `levels`, `registry`,
  `resolvedLayout`, `rootAttributeRecord()` and `mounts` expose the parts.
- `instance(id)` is the recording wrapper of the live engine instance (`destroy()` on it is the
  engine's own, recorded like every other method).
- `calls(id)` lists the recorded calls by name: `mount`, every instance method, and the context
  notifications `ready`, `state`, `content`, `error`, `diagnostic`, `adoptStyles` and
  `releaseStyles`; each record has `time`, summarized `args` and a primitive `result` or the
  error it `threw`. `callCounts(id)` gives the counts only.
- `events(id?)` is the host-hook log under the widget's event names: `tp-text-editor-request`
  (`cancelable: true`), `tp-text-editor-request-failed`, `tp-value-change` (with `origin`,
  `reason`, `tool`, `actions` and the snapshot revisions), `tp-value-commit`,
  `tp-text-editor-ready`, `tp-text-editor-error`, `tp-diagnostic` and `open-surface` (surfaces do
  not open on this page). Without `id` it merges every instance's log with an `id` member.
  `rawEvents(id)` keeps the details as the hooks received them (snapshot handles with
  `getContent`, source events). `clear(id?)` empties calls and events.
- `remount(id)` mounts anew with a fresh wrapper of the same engine, carrying the document over.
  `reset(id, name)` loads a corpus document through `restoreContent`.
- `factories.tiptap(options?, reduced?)` and `factories.lexical(options?, reduced?)` build
  engines over the page's modules, for `editor(id).engine = …` with other options (`options.css`).
  `modules`, `serializers()`, `loadErrors()`, `baseline(id)` (`native` and `root` of a bare engine)
  and `fixtureImage` complete the page state.

Probes:

- `shadowRoots()`: every open shadow root of the page, outermost first; pass it as the
  `shadowRoots` option of `getComposedRanges`.
- `liveRegions()`: `[aria-live]`, `[role=status]`, `[role=alert]` and `[role=log]` in the head,
  the body and every shadow root.
- `styleCounts()`: `style` elements, stylesheet links and adopted sheets of the document, of every
  shadow root and of each instance's shadow root. The page itself has one stylesheet link and one
  adopted document sheet, and every instance's shadow root one adopted frame sheet, before any
  mount.
- `rootAttributes(id)`: the editing root's attributes, computed `white-space`, `overflow-wrap`,
  `user-select` and `direction`, and the record the harness passed.
- `deepActiveElement()`: the focused element through every shadow root and the instance whose
  editing root holds it.
- `composedRanges(id?)`: `getComposedRanges({ shadowRoots })` of the selection with each range's
  client rectangles and whether it lies in the instance's root.
- `surfaces(id)`: per surface, the resolved tools with visibility, enablement, activity, the
  value of a radio menu, label and resolved actions, from the instance's current state.
- `startProbe(types, id?)`, `probeRecords()`, `stopProbe()`: events of `types` at document
  capture, at the editing root, at document bubble and at the window, with the key, the input
  type, the clipboard payload (`types` and each type's data) and `defaultPrevented`.
- `snapshot(id)`: canonical HTML, Markdown, text, the state, the block tree with paths and the
  geometry relative to the editing root.

Assertions; each returns `{ checks, records, passed }`:

- `assertNoForeignNodes()`: head children, body children, live regions, `style` elements and
  stylesheet links unchanged since before the first mount. `captureBaseline()` records those
  counts and returns them; the page calls it once at load, so calling it again moves the
  reference to the current page.
- `assertTables(ids?, name = 'tables')`: resets each instance from the corpus document and
  compares `getTable(id)` of every table with the shared planner's model of the document (an
  instance without table capabilities expects `null`), and the two instances with each other.
- `assertBlocks(ids?, name = 'lists')`: resets and checks the block tree against the document
  (identifiers, kinds, parents, depths, indices), its consistency, the absence of a
  `[data-lexical-cursor]` block, and that the tree object changes only with the content.
- `assertActionMatrix({ mode, pair, only, geometry })`: the 37 actions (`ACTION_MATRIX`), each on
  a fitting target of `state`, `lists` or `tables`, from identical states; `inline.insert` runs on
  the `custom` pair. `mode: 'run'` (default) runs each through `run` and checks equal outcomes,
  one request and one `tp-value-change` per document change, and parity of HTML, Markdown, text,
  state and block tree; `mode: 'can'` checks dry runs before and after a caret move (no throw, no
  mutation, `version` and history unchanged, equal answers, a malformed payload answering
  `false`).
- `assertGeometry(id, { detach })`: block, selection and caret rectangles against the elements
  and the composed selection within 1 CSS pixel, no mutation while reading, `null` or `[]` for
  an unknown identifier and, with `detach`, under a hidden ancestor and for a disconnected host.
- `assertNoEngineDomWrites(id, steps?)`: no mutation outside the editing root while the steps
  (functions of the facade) run, and no attribute in the editing root equal to a block identifier
  or named `data-id`.
- `assertParity({ pair, ids, geometry, ignore, label })`: compares a pair as it is after the next
  frame: canonical HTML, Markdown as mdast without positions, text, the state by path (without
  `version`, `contentVersion` and `focused` unless `ignore` says otherwise), block trees and
  geometry within 1 CSS pixel at equal width. On this page the host frame removes block margins
  inside the editing root, since the engines' different elements for one block (`pre` or `code`,
  a list item's `p`) carry different user-agent margins. Identifiers that both instances hold at
  the same path compare by value; any other compares by its path (`@2.0`).
- `parity(scenario, options?)`: a corpus document name (both instances reset from it, on the
  `custom` pair when it needs the custom nodes), `'corpus'` (every document), `'actions'` and
  `'can'` (the action matrix), `'tools'` (V-191: every surface's resolved tools with the caret in
  a paragraph, heading, list item, code block, table cell and link, and read-only), or an object
  `{ corpus | html, steps }` whose steps (`{ run, value }`, `{ setContent }`, `{ reset }` or a
  function of the facade) run on both instances with a comparison after each.

The parts of the parity comparison:

- `pairIds(options?)`: the two instance ids that the `pair` or `ids` option names (default
  `tiptap-default` and `lexical-default`).
- `compareSnapshots(a, b, options?)`: the checks of `assertParity` over two `snapshot(id)`
  results, with its `geometry`, `ignore` and `label` options; it returns the checks, not a report.
- `differences(a, b, path?, limit = 12)`: the paths at which two plain values differ, at most
  `limit` of them.
- `parityScenarios`: the map of named scenarios that `parity(name)` runs (`actions`, `can` and
  `tools`); an async function of the options that returns a report, set under a new name, runs
  the same way.

## Order on a fresh load

Navigate (or reload) before a run and take a fresh snapshot: a reload invalidates every uid.
Several helpers reset the content they compare, so they do not depend on each other's content,
but they leave the selection, focus and logs behind. Run them in this order:

1. `ready()`, then `assertNoForeignNodes()`, `liveRegions()`, `styleCounts()` and
   `rootAttributes(id)`, which only read.
2. Real-input rows on the pairs, each started from `reset(id, name)` or `setContent`, with
   `clear(id)` before the step whose events or calls the row counts.
3. `assertTables()`, `assertBlocks()` (and `assertBlocks(['tiptap-custom', 'lexical-custom'])`),
   `assertActionMatrix({ mode: 'can' })`, `assertActionMatrix()`, `parity('corpus')` and
   `parity('tools')`.
4. `assertGeometry(id)` after a real `click`; `assertGeometry(id, { detach: true })` last among
   the reads, since it hides and detaches the instance's slot for a moment.
5. Lifecycle steps (`remount`, `engine = null`, `destroy()` on `instance(id)`) at the end; reload
   afterwards.

After a lockfile change, the first load optimizes the engine packages and reloads the page once
(Vite's start-up dependency scan fails on the reference trees under `external/`, so it finds the
engines on the first request); wait for `data-fixture-ready` and take the snapshot after that
reload. Later starts reuse the optimized packages and do not reload.

MCP practice: a call takes about 3 s, so keep checks inside one `evaluate_script`; browser calls
first and file edits last (Vite reloads the page on a source edit); `press_key "Meta+c"` raises
no `copy` event on macOS, so record the 0-event result and run `document.execCommand('copy')`
as the native Copy command; the `drag` tool emits one move, so mid-gesture checks are synthetic;
dispatched events skip hit testing, so presses use real `click`; typed keys show a 96–128 ms
duration floor, so timing rows judge processing time.

## Widget page (`index.html`)

Serve and open it as `engines.html` (steps 1–5 of "Serving and opening"), at
`http://localhost:<port>/tests/fixtures/widgets/text-editor/index.html`, then `wait_for` the text
`After editors`. `html[data-fixture-ready]` appears once every instance settled at its expected
status (the table below); otherwise `html[data-fixture-error]` lists the others and the line under
the heading names each with its status. The full page holds about 44 instances: load batches with
`?only`, and keep the full page for the load check.

Query parameters (they combine; each narrows or changes the page on its own terms):

| Parameter                 | Effect                                                                                                                                                     |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `?level=0\|1\|2`          | every slot or shared section sits inside 0, 1 or 2 ancestor open shadow roots (default 0)                                                                  |
| `?only=<list>`            | comma-separated; a paired variant keeps both engines (`?only=default`), any other entry is an instance id (`?only=tiptap-default`, `?only=swap`)           |
| `?engine=tiptap\|lexical` | only that engine's instances and adapter; unpaired instances of the other engine are left out; `#no-engine` stays                                          |
| `?content=<name>`         | the content of the non-empty instances: a corpus name or `field-notes` (default `field-notes`); `#*-custom` keeps `05-custom` and `#swap` keeps `portable` |
| `?defer`                  | every instance is created without its engine and expected `idle`; `assign(id)` assigns its configured engine                                               |
| `?ledger`                 | installs the resource ledger before the first instance, for `assertCleanup(id)` ("Resource ledger")                                                        |
| `?built`                  | runs the built library (`npm run build` first): `/dist/styles.css`, `/dist/register.js`, `/dist/register/widgets.js` and the adapters from `dist/`         |

For example, `?level=0&defer&only=empty` gives both `#*-empty` instances with no engine.

### Instances

Paired instances are `#tiptap-<variant>` and `#lexical-<variant>`; each pair shares one label.

| Variant or id                                      | Engine                    | Content and configuration                                                                                                 | Expected |
| -------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------- |
| `default`                                          | full                      | `field-notes`                                                                                                             | ready    |
| `empty`                                            | full                      | none, with a `placeholder`                                                                                                | ready    |
| `readonly`, `disabled`                             | full                      | `field-notes` (two links), `readonly` or `disabled`                                                                       | ready    |
| `long`, `long-readonly`, `long-disabled`           | full                      | `long-notes`; the host's block size is bounded, so the viewport scrolls                                                   | ready    |
| `auto`, `auto-disabled`                            | full                      | `auto-notes`, auto height, longer than the page                                                                           | ready    |
| `form`                                             | full                      | `name="notes"`, `format="markdown"`, a Markdown `default-value`, in `form#notes-form` > `fieldset`, with submit and reset | ready    |
| `outside-form` (Tiptap only)                       | full                      | `form="notes-form"`, `name="outside"`, beside the form; a second form without an id follows (`data-fixture-form="other"`) | ready    |
| `field`                                            | full                      | inside `form` > `tp-field name="log"` with a label, a description and an error                                            | ready    |
| `rtl`, `narrow`                                    | full                      | a slot with `dir="rtl"`; a 320 px slot                                                                                    | ready    |
| `dialog`                                           | full                      | inside a `tp-dialog` (`data-fixture-surface`) with a trigger button                                                       | ready    |
| `reduced`                                          | without the table modules | `field-notes`                                                                                                             | ready    |
| `custom`                                           | full                      | `05-custom` with the corpus custom nodes                                                                                  | ready    |
| `upload`                                           | full                      | an image upload hook that records each call and resolves `pantry-shelf.svg` after 300 ms                                  | ready    |
| `core`                                             | full                      | `features: []`: the core editor without block editing, tables, images, links, the selection toolbar or the slash menu     | ready    |
| `classic`                                          | full                      | the links, tables and images features only (a classic toolbar editor)                                                     | ready    |
| `mention`                                          | full                      | the corpus mention with an `@` suggestion (asynchronous source, 400 ms) and `layout.suggestions` `['slash', 'mention']`   | ready    |
| `late`                                             | none at load (full)       | `field-notes` as its default value, in `form#late-form`                                                                   | idle     |
| `failing`                                          | failing                   | Tiptap without its history module; Lexical with a second copy of its core module                                          | error    |
| `late-json`, `late-markdown`, `late-text` (Tiptap) | none at load (full)       | `format` json (an engine JSON document through the property), markdown and text                                           | idle     |
| `no-engine`                                        | none                      | `field-notes`, no placeholder at load                                                                                     | idle     |
| `swap` (Tiptap)                                    | full                      | `portable`                                                                                                                | ready    |
| `#mount`                                           | —                         | the container `create()` appends to, nested at the page's level                                                           | —        |
| `#markdown-reference`                              | —                         | a `tp-markdown` with the `field-notes` Markdown, in a slot as wide as an editor                                           | —        |
| `#before`, `#after`                                | —                         | light-DOM buttons around the instances                                                                                    | —        |
| `#drop-source`                                     | —                         | a draggable paragraph before `#after` whose drag carries `text/html` and `text/plain` (external drop rows)                | —        |

The fixture documents are added to `corpus()` on this page: `field-notes` (a heading, two
paragraphs with links to `example.com`, a second-level heading, a paragraph, a divider, a
paragraph, a bulleted list of three items with strong lead-ins and a code block), and
`long-notes` and `auto-notes` (the same Markdown four and eight times). The task-checkbox steps
load `?only=disabled,readonly&content=portable`, whose document holds a checked and an unchecked
task.

Per batch:

| Batch | `?only=`                                                                                                           | Levels |
| ----- | ------------------------------------------------------------------------------------------------------------------ | ------ |
| H     | `default,empty,late,failing,no-engine,swap,late-json,late-markdown,late-text`                                      | 0, 2   |
| FM    | `form,field,late`                                                                                                  | 0, 2   |
| A     | `default,empty,readonly,disabled,long,long-readonly,long-disabled,field`                                           | 0, 2   |
| TB    | `default,readonly,reduced,late,narrow,dialog,rtl,form,no-engine`                                                   | 0, 2   |
| K     | `default,readonly,empty,dialog,form,late,upload`                                                                   | 0, 2   |
| P     | `default,empty,late,failing,no-engine,late-json,late-markdown,late-text,disabled,auto,auto-disabled,custom,narrow` | 0      |
| R     | `default,custom`                                                                                                   | 0–2    |
| I-01  | `default,empty`                                                                                                    | 0, 2   |

### The element facade

`editor(id)` returns the facade over the element; the helpers of `textEditorAPI` read it as they
read `engines.html`'s instances.

- `host` is the `tp-text-editor`, `container` its `[part~="text-editor-content"]`, and `root` the
  content part's only child while it carries `role="textbox"` (null before ready: the preview is
  never returned).
- `status` is the host's `data-status`; `settled()` resolves once the current mount reported
  ready or an error, then after the element's update.
- `engine` is the engine last assigned through the facade; assigning it (or `assign(id, …)`)
  wraps it with the recorder. Assigning `host.engine` directly is not recorded.
- `run(target, { value, sourceEvent })` calls the element's `run`; another `surface` or `reason`
  throws a `TypeError`, and `focus` is ignored.
- `restoreContent` (and so `reset(id, name)`) applies one `content.set` request: unlike
  `engines.html`, it raises the request and change events and adds one history step. Rows that
  need a pristine history use `create()` or a reload.
- `registry` resolves the element's engine, nodes and tools; `resolvedLayout` resolves its
  `layout` against that registry.
- `calls()`, `callCounts()`, `events()`, `rawEvents()` and `clear()` work as on `engines.html`;
  `events()` holds the element's seven events with `cancelable` and `cancelled`.
- Also: `label`, `placeholder`, `readOnly`, `disabled`, `tools`, `layout`, `nodes`, `value`,
  `native`, `state`, `subscribe`, `focus`, `blur`, `mounts`, `mountContainer`, `connect()`,
  `disconnect()`, `holdMount(ms?)`, `releaseMount()`, `fatal(error?)` and `cancelRequests`.

### Page API additions

- `create(engine, options?)`: an instance built by script into `#mount` (an engine name, an engine
  object or `null`), recorded like every other.
- `assign(id, engine?)`: no argument assigns the configured engine; `'full'`, `'reduced'` or
  `'failing'` a variant of its engine; `{ name, variant }` a named engine; an engine object; or
  `null`.
- `assertLifecycle(ids?)`: for every instance expected `ready` (or `ids`): ready after one mount,
  one ready event and no error event, a `textbox` editing root with content; `remount()` then
  reaches `ready` again with a second mount and the same content. Run it on the source page and
  with `?built` and compare the reports; `built` tells which one the page runs.
- `holdMount(id, ms?)` and `releaseMount(id)`: the next mount waits until released (or for `ms`),
  so the loading state lasts long enough to inspect. `fatal(id)` reports `Error('fatal')` through
  the live mount's context.
- `reasons()`: every `detail.reason` of every widget event since load, never cleared. Each batch
  saves it before closing its tab.
- `lanes(id?)`: the lane probe. Every opening and closing of the link popover, the
  table size picker and the suggestion lists since load, with `surface`, `open` and `reason`
  (`uwg-te-tab-reasons` r12, r13), of one instance with `id`; never cleared. The open lanes are
  internal, so the probe reads the widget's lane instrumentation, not an event.
- `layoutShifts({ since? })` and `passes({ since? })`: the layout shifts and overlay layout passes
  since load. The logs are never cleared; to start from a point, read
  `const since = performance.now()` first and pass it. `passes()` counts per frame
  (`perFrame`, `maxPerFrame`) and per instance (`byInstance`, `'?'` for an unknown content part),
  before ready included.
- `uploads(id)`: the calls of an `-upload` instance's hook, each with `aborted` (the signal aborted
  while the upload was unsettled) and `settled` (`resolved`, `rejected` or `null`).
- `uploadMode(id, { delay, source, reject, holdAfterFirst })`: how the hook answers the uploads that
  start afterwards: after `delay` ms (default 300), with `source` or rejecting; `holdAfterFirst` keeps
  every upload after the first one pending until it is aborted. `uploadMode(id)` restores the default.
- `mentionQueries()`: every query of the `mention` pair's source with `aborted` and `settled`;
  `mentionDelay(ms = 400)` sets how long the source takes to answer.
- `elements()`: the forms, the fieldset, the fields, the dialogs, the Markdown reference and
  `#mount`, which sit inside level shadow roots.
- `calibrateEngineReactions()`: learns each engine's own root writes on focus and blur from a
  widget-free instance, which is removed afterwards.
- `startRootWatch(id)` and `stopRootWatch()`: bracket real input on the editing root; the report
  fails on any record that is not a learned engine reaction (listed under
  `records.engineReactions`), or when the root was replaced or nothing was calibrated.
- `assertNoWidgetRootWrites(id, steps?)`: the same watch over scripted steps (default: a 60 px
  viewport scroll and a 40 px host resize, both synthetic).
- `assertRootAttributeWrites(id, steps?)`: with the root unfocused, during `readOnly`,
  `disabled`, `label` and `placeholder` changes, every root attribute write names an admitted
  attribute and takes a value the element passed through `setRootAttributes` (or `setEditable`).
- `assertSurfacesInRoot(id, { expectOpen })`: open surfaces sit in the widget's shadow tree and
  the top layer; none is open outside the widget trees except the fixture's own dialogs.
- `assertNoForeignNodes(id)`: with an id, the live regions inside the instances' shadow trees are
  the widget's own; `records.announcer` counts them per instance.
- `selfTest(id?)`: the negative control. It plants a class on a block, an `aria-label` on the
  root, a live region and a popover in the body, checks that each assertion reports its plant
  (and that a live region inside the widget is not reported), removes every plant and remounts.
  `passed` is true when every plant was reported.
- `startProbe`, `probeRecords` and `stopProbe` serve as the containment probe for events.
- `assertNoEngineDomWrites` belongs to `engines.html`: on this page its outside-root check flags
  the widget's own DOM by design.

### Order on a fresh load (`index.html`)

1. `ready()`, then `selfTest()`, then `calibrateEngineReactions()`.
2. `assertNoForeignNodes(id)`, `liveRegions()`, `styleCounts()` and `rootAttributes(id)`.
3. The watches and real-input rows, each started from `reset(id, name)` and `clear(id)`.
4. `assertRootAttributeWrites(id)` with the root unfocused.
5. The parity helpers.
6. Lifecycle last: `remount`, `assign`, `fatal`, `destroy()` on `instance(id)` (which leaves the
   widget unaware of it); then reload.

## Nesting page (`nesting.html`)

Serve and open it as `index.html`, at
`http://localhost:<port>/tests/fixtures/widgets/text-editor/nesting.html`, then `wait_for` the
text `After editors` and `evaluate_script` `() => textEditorAPI.ready()`. Every instance is
expected `ready`. Query parameters: `?level=0|1|2` (each slot's ancestor open shadow roots, default
0), `?only=<variants or ids>` and `?engine=tiptap|lexical`. The resource ledger is always
installed before the first instance.

Paired instances `#tiptap-<variant>` and `#lexical-<variant>`, each with the `state` corpus
document:

| Variant       | Placement                                                                                                   |
| ------------- | ----------------------------------------------------------------------------------------------------------- |
| `nested`      | the slot's level frame                                                                                      |
| `dialog`      | inside a `tp-dialog` with a trigger button                                                                  |
| `popover`     | inside a `tp-popover` with a trigger button                                                                 |
| `tabs`        | in the kept-mounted `notes` panel of a `tp-tabs` (a second `summary` tab hides it)                          |
| `scroll`      | inside a `tp-scroll-area` 260 px high, with the document four times, so the area scrolls                    |
| `closed-root` | inside `div#closed-host-<engine>`, whose shadow root is `closed`; the page keeps the root, nothing else can |

Move targets: `#elsewhere` (a slot at the page's level), each instance's own slot outside every
level root (`outer`), and `iframe.move-frame`, a same-origin frame whose document links the
library stylesheet.

Page API (with `ready`, `editor`, `events`, `calls`, `callCounts`, `clear`, `deepActiveElement`,
`shadowRoots`, `liveRegions`, `styleCounts`, `assertNoForeignNodes` and the other `api.ts`
helpers):

- `move(id, target = 'elsewhere', { gapFrames })`: moves the host to `'elsewhere'`, `'outer'`,
  `'back'` (its original parent), `'frame'` (the frame's body) or an element, in one task by
  default, or detached for `gapFrames` frames first; resolves once settled with `before` and
  `after` (`mounts`, `destroys`, `status`, `html`, `selection`, `history`, `document`,
  `focused`), `kept` (no mount and no destroy), `remounted` and `destroyed`. A move within the
  page keeps the instance; a move into the frame within the release window remounts once with
  the document carried over, an empty history and focus left where it was (C-012, C-013).
- `removeAndCount(id, max = 6)`: removes the host and counts the frames until the instance is
  destroyed (expected 2), with the content part's child count and `releaseStyles` calls; the
  host stays detached until `move(id, 'back')`.
- `container(id, open = true, tab = 'notes')`: opens or closes the instance's dialog or popover
  through `setOpen`, or clicks the tab of its tabs, and returns its state after a settle.
- `assertClosedRoot()`: each `closed-root` instance reported exactly one `tp-diagnostic` with the
  code `text-editor-closed-root` naming `div#closed-host-<engine>`, and every other instance none
  (V-579). A reconnection reports again.
- `assertCleanup(id, options)` and `ledger`: see "Resource ledger".
- The performance probes of "Performance probes", `create`, `assign`, `holdMount`,
  `releaseMount`, `reasons`, `layoutShifts`, `passes`, `elements()` (the move targets and the
  containers by id), `level`, `factories` and `loadErrors()`.

Order on a fresh load: `ready()`, `assertClosedRoot()`, `assertNoForeignNodes()`, the real-input
rows per level (V-262: `click`, `type_text`, `press_key`, double click, Shift+arrows in a cell),
the container rows (open each container first), then moves within the page, then
`removeAndCount`, then `move(id, 'frame')`, then `assertCleanup` last; reload between
`assertCleanup` runs.

## Large-document page (`large.html`)

Open `large.html` as `index.html`; the instances settle within 30 s. Query parameters:
`?blocks=<n>` (top-level blocks, default 2,000, at most 5,000; use 500 for the 500-block
budgets), `?engine=tiptap|lexical`, `?nobaseline` (no bare engines).

The generated document is a ferry log, the same on every load: a heading every 25 blocks and,
between them, paragraphs with bold and italic runs and a link, three-item bulleted lists, quotes,
code blocks, dividers and 3×3 tables with a header row. `#tiptap-large` and `#lexical-large` hold
it in a widget 600 px high; `#tiptap-baseline` and `#lexical-baseline` hold it in the bare engine
(no adapter, no widget), in a host 600 px high that scrolls.

Page API:

- `blocks`, `generatedHtml()` and `blockCount(id)` (the instance's top-level blocks).
- `mountTimes()`: per widget instance the adapter's mount (its `mount` call to its ready
  notification) and the element's (creation to `tp-text-editor-ready`), in ms; per bare engine
  its synchronous mount.
- `measureMounts({ runs = 3 })`: mounts each engine's widget and bare engine `runs` times in
  `#mount` and removes them; checks the median adapter mount ≤ the bare engine's + 15% (V-589).
- `baseline(id)`: the bare engine's `native`, `root` and `mountMs`.
- The performance probes below, with the bare engines registered as probe targets.

Order: `ready()`, then `mountTimes()`; the typing rows (V-588) at 1× and then 4×
(`emulate` CPU throttling), each instance after a `click` at a paragraph end in the middle of the
document; the hover and overlay rows (V-589); `measureMounts()` last.

## CSP page (`csp.html`)

`csp.html` sets the policy
`default-src 'self'; style-src 'self' 'nonce-tpFixtureCsp'; script-src 'self'; img-src 'self' data:`
in a `meta` element, so `style` attributes and `style` elements without the nonce are blocked,
while stylesheets of the origin, constructed sheets and CSSOM writes are allowed. The page writes
no `style` attribute and no level frames (`?level` does not apply). Query parameters: `?only` and
`?engine`.

| Variant     | Policy scope of the pair                                                                      |
| ----------- | --------------------------------------------------------------------------------------------- |
| `sheets`    | no service: generated styles, the engine CSS included, go to the shadow root's adopted sheets |
| `nonce`     | `ContentSecurityService({ nonce: 'tpFixtureCsp' })`: nonced `style` elements                  |
| `no-styles` | `ContentSecurityService({ disableStyleElements: true })`: no generated style                  |

Page API (with the `api.ts` helpers):

- `violations()`: every `securitypolicyviolation` since load (also the buffered reports from
  before the bootstrap), with directive, blocked URL, sample, source and target.
- `styles(id)`: where the engine CSS went (`engineSheets`, `engineStyleElements`), the `style`
  elements of the instance's composed tree and those without the nonce, and the editing root's
  computed `white-space`.
- `assertCsp(id)`: no violation on the page, the instance ready, the editing root computing
  `white-space: pre-wrap` in every variant, and per variant the engine CSS in one adopted sheet
  (`sheets`), in one nonced `style` element with every `style` element nonced (`nonce`), or
  nowhere (`no-styles`) (V-591).
- `disposeServices()`, `nonce`, `factories`, `loadErrors()`.

Order: `ready()`, `assertCsp(id)` per instance, then the real-input rows (typing, a mark through
the toolbar, a centered paragraph, a table through `run`) and `violations()` again, plus
`list_console_messages`.

## Resource ledger (`ledger.ts`)

Installed by `nesting.html` and by `index.html?ledger` before the first instance, the ledger
records listeners added to windows, documents, shadow roots, `tp-text-editor` hosts and
window-level targets (font sets, media queries, the visual viewport), every observation of a
Resize, Mutation or Intersection observer, and every pending timeout, interval and animation
frame, in the page and in a wrapped frame.

- `ledger.counts(since?)`, `ledger.entries(since?)` and `ledger.mark()`: the live registrations
  per kind or as records (`seq`, `kind`, `target`, `type`, `capture`, `once`), since a mark.
- `assertCleanup(id, { frames = 3, restore = true })`: removes the host; at the removal no
  observation of a node in the host's tree outside the editing root and no window, document or
  host listener other than the engines' `selectionchange` may stay (the widget's own release is
  synchronous); after `frames` frames nothing registered since the instance was created may stay
  (listeners of the host's tree and the page level, observations, timers, frames) and the
  window's frame loop is at rest (V-584). The host is re-appended afterwards unless `restore` is
  false. Run it with the other instances idle: page-level registrations cannot be told apart by
  instance, so `?only=` one instance is the reliable setup.

## Performance probes (`perf.ts`)

On `index.html`, `nesting.html` and `large.html`; each probe starts and stops around real input.

- `startTypingProbe()` and `stopTypingProbe()`: Event Timing entries of `keydown`, `keypress`,
  `beforeinput`, `input` and `keyup`; each keystroke, from one `keydown` to the next, counts the
  union of its processing windows and goes to the instance whose editing root held focus at its
  `keydown`. A no-op window `input` listener runs during the probe on every page alike. Returns
  per instance `count`, `median`, `p95`, `max` and the values.
- `typingBudget(result, widgetId, baselineId, blocks)`: widget minus bare engine, median ≤ 3 ms
  and p95 ≤ 8 ms at 500 blocks (absolute p95 ≤ 16 ms), ≤ 5 ms and ≤ 12 ms at 2,000 blocks, with
  at least 20 keystrokes each (C-450, V-588). Record the 4× values without a budget.
- `startFrameProbe(ids?)` and `stopFrameProbe()`: per instance and frame at most one overlay
  layout pass and one state publication, and no long task (C-443, C-444).
- `startPointerProbe()` and `stopPointerProbe(budget = 1)`: the handling time of each real
  `pointermove`, from a window capture listener to a window bubble listener, so every handler of
  the widget is inside (the gutter's block hit test runs in the next frame, outside the handler);
  p95 ≤ `budget` ms per instance (V-589).
  `hoverSweep(id, count = 20)` times dispatched moves over the visible blocks (synthetic).
- `startOverlayWatch(ids?)` and `stopOverlayWatch()`: child-list mutations in the overlay and
  underlay layers; none after warm-up, since pooled marks are hidden, not detached (V-589).
- `registerProbeTarget(id, element)`, `probeTargetOf(node)` and `stats(values)`.

## Manual checklist (outside the DevTools MCP boundary)

These rows need a person, another browser or an operating-system feature; record the evidence
the person provides with the date, browser and system.

Serve the pages as in step 1 of "Serving and opening" and open the same URLs in the other
browser. For a phone or tablet on the same network, add `--host` to that Vite command, open the
page at the computer's network address and read page state through the device's remote
inspector. On macOS, Tab reaches buttons in Firefox only with Keyboard navigation turned on
(System Settings, Keyboard) and in Safari only with "Press Tab to highlight each item on a
webpage" (Settings, Advanced).

- [ ] V-035: CJK and Korean IME composition in a paragraph and inside a colored word on the
      default pair: `state.composing` true while composing, one change with reason `input` at
      its end, no binding matching during composition.
- [ ] V-036: on macOS, a text range cut with a real `Meta+x` on the default pair: one change with
      reason `input` for the deletion.
- [ ] V-037: the browser's Edit menu Undo after typing on the default pair: one undo with reason
      `engine` and origin `engine`.
- [ ] V-097: IME composition (Japanese, Korean) in a paragraph and inside a colored run on both
      engines: one engine change with reason `input` at composition end.
- [ ] V-099: Undo and Redo from the browser's Edit menu or the content context menu after typing
      on both engines: an engine change with reason `engine`.
- [ ] V-130: real keyboard copy and cut of a text range (`Meta+c`, `Meta+x`) and real keyboard
      paste (`Meta+v`) through the operating-system clipboard, both engines, levels 0–2: the
      payload is written and the paste inserts through a `content.insert` request.
- [ ] V-154: Firefox and Safari, both engines, levels 0–2: copy and cut payloads, paste and drop
      routing, hash navigation and form submission, as in Chrome.
- [ ] V-300: a real IME (Japanese, Korean): composing in text, at a `#` or `**` boundary and
      starting in block mode, committing and cancelling: no binding and no input rule fires
      during composition, and a composition started in block mode replaces the blocks once.
- [ ] V-303: Firefox and Safari, both engines, levels 0–2: toolbar roving, capture pre-emption,
      the Escape-to-dialog sequence and input rules, as in Chrome.
- [ ] V-395: on macOS, `#tiptap-default`: real `Meta+c` and `Meta+x` on a block selection copy and
      cut through the keyboard.
- [ ] V-477: Firefox and Safari, both engines, levels 0–2: grips and menus, cell ranges, the cell
      handle, column resize, horizontal scroll and the sticky header, and touch on the grips, the
      handle and the separator, as in Chrome.
- [ ] V-503: a real IME, both engines: compose inside a blue word; the composed text stays blue
      in the DOM and in the native JSON.
- [ ] V-575: the steps of V-262 in Firefox 142 or later.
- [ ] V-576: the steps of V-262 in Safari 17.5 or later, plus Backspace beside shadow hosts,
      `isCollapsed` and a cross-tree selection.
- [ ] V-145: after Copy link on `index.html`, paste the system clipboard into another
      application: the document URL with `#<id>`.
- [ ] V-245: real AltGr layouts (German, French, Polish on Windows and Linux), `index.html`: type
      `[`, `]`, `\`, `{` and `@` with AltGr in the editing root, then press Ctrl+Alt+0 to 3: the
      characters are typed with no binding fired; Ctrl+Alt+<digit> applies its Mod+Alt binding only
      where the layout types the digit itself.
- [ ] V-246: the macOS Option layer on US and German layouts, `index.html`: Cmd+Option+1, 2, 3, 0
      and Cmd+Option+C apply the headings, the paragraph and the code block by physical key.
- [ ] V-301: the real keyboard clipboard on macOS, `index.html`: Meta+C and Meta+X in text, Meta+V
      in text and in block mode: the editor leaves them to the engine's clipboard flow, and a paste
      in block mode replaces the blocks.
- [ ] V-302: Chrome, Edge, Firefox and Safari on macOS and Windows, `index.html`: Mod+D,
      Mod+Shift+B, Mod+K, Mod+E, Mod+[, Mod+], Mod+comma, Mod+Alt+C, Mod+Shift+Up and Down,
      Alt+F10 and Shift+F10 in the editing root each reach the page and the editor consumes them
      (no bookmark, history navigation, settings, search field or developer tools).
- [ ] V-304: real touch: tap toolbar controls over a text selection (focus and selection kept);
      long-press and drag a grip (the drag starts without page scroll).
- [ ] V-305: the operating system's reduced motion (hover fills change at once, the selection
      toolbar appears without motion) and forced colors (pressed toggles distinguishable, focus
      ring visible).
- [ ] V-314: Chrome with a real IME, both engines: start composition over a text selection; the
      toolbar hides while composing and shows again after it ends with a non-empty selection.
- [ ] V-320: a real touch device, both engines: select text by touch and tap a selection-toolbar
      control, then open a suggestion list and tap an item: the editing root keeps focus (the
      virtual keyboard stays), the selection is kept and the control or item activates.
- [ ] V-339: Chrome, Firefox and Safari, both engines: Meta+click (Ctrl+click elsewhere) a link
      while editing: it opens in a new tab without an opener and the document is unchanged.
- [ ] V-356: Chrome with a real IME, both engines: Escape during composition is ignored: no
      surface closes and block mode does not start.
- [ ] V-364: Firefox 142 or later and Safari 17.5 or later, both engines, levels 0–2: the
      selection toolbar, the slash and mention lists, the link popover, the image upload cards and the color
      menus give the Chrome results, the selection kept on a toolbar press and every surface in
      the top layer of the widget's shadow root.
- [ ] V-376: a coarse pointer and touch, both engines: tap into a block, type, tap again: the
      gutter shows beside the caret block and hides while typing.
- [ ] V-380: a real Alt+click (Option+click) on the insert button, both engines: the paragraph is
      inserted before the block.
- [ ] V-392: a real Shift+click on a grip and on block content, both engines: the block selection
      extends as with scripted input.
- [ ] V-401: Firefox and Safari, both engines, levels 0–2: the gutter, the block menu, block
      selection with copy, block drag and a touch drag of a grip behave as in Chrome.
- [ ] V-412: real browser sessions: Mod+Shift+Up and Down, and Alt+Left and Right on the resize
      separator on Windows and Linux, are consumed before browser accelerators; on layouts where
      `]` and `[` need AltGraph, no Mod chord matches.
- [ ] V-487: both engines: type `@` with AltGr (Q on a German layout) and with Option on a macOS
      layout that needs it, then `／` and `＠` through a Japanese IME: the character reaches the
      engine and the list opens on the typed or composed trigger.
- [ ] V-491: a real IME, both engines: compose after `@` and press Enter to commit: no item is
      inserted; an item activates only after composition ends.
- [ ] V-498: a screen reader in Firefox and Safari, both engines: open the slash list and move the
      highlight: each entry is announced with its position, with no `aria-expanded` on the
      textbox.
- [ ] V-536: Firefox and Safari, both engines: the suggestion list without `referenceTarget`
      announces each highlighted item; textbox semantics and toolbar roving as in Chrome; axe
      reports nothing.
- [ ] V-537: the operating system's reduced motion on, `motionPolicy` unset, both engines:
      presence and the reveal scroll are instant.
- [ ] V-562: a real IME, both engines, in an empty document and in an empty block: the
      placeholder and the hint hide during composition and show again after cancelling it.
- [ ] V-563: a touch device, both engines: the grips, the cell handle, quick add and the separator
      expand for touch without overlaps; the gutter follows the caret block.
- [ ] V-566: Firefox and Safari, both engines: content typography, overlays, selection paint, the
      sticky header and no layout shift, as in Chrome.
- [ ] V-567: forced colors, both engines: the selection fill and outlines, focus rings, pressed
      toolbar states, swatches and the task checkbox stay visible in system colors.
- [ ] V-607: Firefox 142 or later, then Safari 17.5 or later, each page on a fresh load; every
      result is the one the named row records in Chrome.
  - `tests/fixtures/components/toolbar/index.html`: steps 1–5 of that fixture's README, with
    the results it states (V-201 to V-203, V-597).
  - `tests/fixtures/widgets/flow/index.html`, the Support triage bar (V-200, V-202, V-203):
    first run `document.onkeydown = (e) => console.log(e.key, e.defaultPrevented)` in the
    console. Press Before flow, then Tab twice: Zoom in has focus. ArrowDown visits Zoom out,
    Fit view, Select tool, Pan tool, Undo, Redo and Lock editing and wraps to Zoom in; the
    disabled Undo and Redo take focus with `aria-disabled="true"`, and no arrow key is
    logged. Tab moves to the Stage lighting graph, so the bar is one tab stop.
  - Same load: press Before flow, Tab twice and ArrowDown five times to Undo, then press
    Escape: the console logs `Escape false`.
  - Same load: press the title of Ticket received: its node toolbar (Duplicate, Delete)
    shows above it. Drag the node by its title: the toolbar stays above it. Tab until
    Duplicate has focus and press Escape: the console logs `Escape false`, the selection
    empties and the toolbar goes.
  - Reload, then run
    `bar = flowAPI.flows.monitor.shadowRoot.querySelector('tp-flow-controls').shadowRoot`,
    `bar.querySelector('[data-action="zoom-in"]').hidden = true` and
    `bar.querySelector('[data-action="fit"]').disabled = true`. Press Before flow and Tab
    twice: Zoom out has focus; the arrow keys never reach Zoom in, and Fit view is a stop
    with `aria-disabled="true"`. Set both back to `false`, press Before flow and Tab twice:
    the arrow keys reach Zoom in again and Fit view is enabled.
  - Reload and run `await flowAPI.assertToolbars()`: `passed` is `true`.
  - Once the fixtures have them, the steps of V-593 to V-595, V-210 and V-214 on the
    select-query `#external-owner` instance, the toolbar's `#contextual` section, the
    popover-placement multi-line anchor and the resizable-panel-group fixture. Where
    `'referenceTarget' in ShadowRoot.prototype` is false, `activeDescendantReference()`
    returns `null`.
- [ ] V-608: a phone or tablet (Safari on iOS or iPadOS, Chrome on Android), each page on a fresh
      load.
  - `tests/fixtures/components/toolbar/index.html`, the Text marks section: select "slate
    water" in the paragraph by touch, so that the virtual keyboard shows, then tap Highlight
    and Strike: the paragraph keeps focus and the selection, the virtual keyboard stays up,
    and `toolbarFixture.press.activations()` counts one press for each.
  - Once the toolbar fixture has its `#contextual` section: select text in its paragraph by
    touch and tap a control of the toolbar that shows over the selection, with the same
    results.
  - Once `tests/fixtures/components/resizable-panel-group/index.html` exists: drag a
    separator with one finger, starting just beside its line: the drag takes it and the
    panels resize with the finger. In the remote inspector the separator's `::before` hit
    area measures `--tp-resize-target-coarse` (20 px) across the line, not the fine 10 px.
- [ ] V-609: Chrome on Windows with a contrast theme on (Settings, Accessibility, Contrast
      themes), once with a dark theme such as Night sky and once with a light one such as
      Desert, each page on a fresh load. Every fill, line, ring and mark below stays visible in
      the theme's system colors.
  - `tests/fixtures/widgets/flow/index.html`, Support triage: press an empty part of the
    canvas and drag across a node, holding the pointer: the marquee's fill and dotted edge
    show against the canvas.
  - `tests/fixtures/widgets/color-picker/index.html`, the swatch paint the color menu
    shares: in the Schemes picker choose a swatch in the Swatches view: its pressed ring
    shows. Do the same in its Schemes view and among the recent colors of the Popup picker.
  - On the widget's `index.html`, once it comes with the element: a block selection, the
    color menu's swatches, and task checkboxes unchecked and checked: the block selection's
    fill and outline, the swatch rings and the check marks show.
  - Once `tests/fixtures/components/resizable-panel-group/index.html` exists: Tab to a
    separator: its focus ring shows.
- [ ] V-816: `engines.html` at levels 0–2 in Firefox 142 or later and Safari 17.5 or later: the
      steps of the paired rows V-700 to V-815 and of V-834, every rule giving the same normalized
      state, block tree and geometry (±1 px) on both engines (`assertParity`).
- [ ] V-819: real keyboard layouts in Firefox 142 or later. `engines.html` binds no heading or
      code block chord, so the editing-root steps run on the widget's `index.html` once it comes
      with the element.
  - macOS, US then German input source: in the editing root press Cmd+Option+1, 2, 3 and 0,
    then Cmd+Option+C: headings 1 to 3, the paragraph and the code block apply by physical
    key.
  - Windows, German layout: Ctrl+Alt+1 applies heading 1; AltGr+8, AltGr+9, AltGr+0 and
    AltGr+ß type `[`, `]`, `}` and `\` with no binding fired.
  - Before the element, on `engines.html` (Windows, German layout): run
    `textEditorAPI.clear()`, click into `#tiptap-default` and type AltGr+8, AltGr+9, AltGr+0
    and AltGr+ß, then do the same in `#lexical-default`: each engine inserts `[`, `]`, `}`
    and `\` at the caret, and `textEditorAPI.events(id)` records them as `tp-value-change`
    with reason `input`.
  - On both systems and layouts, the flow and media player keys of V-212, with the results
    Chrome gives. `tests/fixtures/widgets/flow/index.html`: press the title of Ticket
    received, then Shift+1 (zoom to fit), Shift+0 (`flowAPI.flows.monitor.viewport.zoom` is
    1), Mod+D (Cmd+D or Ctrl+D: `flowAPI.flows.monitor.nodes.length` grows by one and no
    bookmark dialog opens) and `+` (one zoom-in step).
    `tests/fixtures/components/media-player/index.html`: Tab to the Play control of `#video`
    (Video layout) and press Space, K, M and ArrowLeft, then Shift+Tab to the player itself
    and press them again: Space and K toggle playback, M toggles mute and ArrowLeft seeks
    back 10 s.
- [ ] V-845: `engines.html?level=0`, `#lexical-default` with
      `setContent('<p>top</p><hr><p>mid</p>', 'html')`, then `#tiptap-default` likewise: click to
      place the caret at the start of "top", then press with Shift between "top" and the divider:
      only the selection head moves, to the text point nearest the press, the anchor stays at
      the start of "top", no collapsed selection rests beside the divider, and the normalized
      `state.selection` is equal on both engines.
