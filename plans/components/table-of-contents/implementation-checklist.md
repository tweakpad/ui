# Component implementation and evidence record

## Delivery and source record

- Component(s) / public identity: Table of contents, `tp-table-of-contents` with `tp-table-of-contents-item`.
- Requested work / claim: add the compact presentation (`variant="compact"`). At rest it shows one mark per item, with the current item highlighted. On hover it expands into the existing list. Sub-levels show as dots.
- Scope source: user request on 2026-10-14. User decisions:
  - Three mark states: current, active and inactive.
  - The expanded card replaces (covers) the strip.
- In-scope changes and existing gaps:
  - The compact variant across spec, component, presentation, docs, stories and fixture.
  - Shared repairs the variant needs: re-binding the list observer, and revealing the current link from the item.
  - The list variant must not regress. No earlier record existed for this component.
- Repository baseline / unrelated changes: `72b0d00` on `development`, clean tree. Another session commits in this tree; edits stay minimal and nothing is staged.
- Live project / document IDs and revisions:
  - Project `prj_c5a403a0-d1d5-4487-ac78-f4e545f46483`. Component Library `doc_8077bf7c-0361-48f3-ac87-53b983bd89b3` §20.6 Table of contents.
  - Amended in commit `4eb12b46` (0.31.1, content), then bumped in `a0a7929b` (0.32.0).
- Owning contracts / dependencies / vocabulary:
  - §20.6 nodes `toc-*` and the new `tocv-*`: `tocv-marks`, `tocv-popup`, `tocv-a11y`, `tocv-presentation`.
  - Dependencies: Foundation §18.15 Scroll spy; CL §19 Popover (`ucl19-popover`, constraint `ucl20-table-of-contents-dep-2`); CL §16 Button (`ucl16-button`, constraint `-dep-3`).
  - Popover reason set: Foundation B.8.3 (`close-action`).
- Local reference evidence:
  - `../specification/external/videojs-v10/site/src/components/docs/TableOfContents/TableOfContents.mobile.tsx` (`TableOfContentsMobile`) with `utils.ts`, `styles/globals.css` and `TableOfContents.desktop.tsx`. Revision `0164acc`, clean.
  - Base UI `packages/react/src/popover/trigger/PopoverTrigger.tsx` (`openOnHover`, `OPEN_DELAY` 300, `closeDelay` 0).
  - shadcn `apps/v4/components/docs-toc.tsx` (`variant: "list" | "dropdown"`).
- Tool readiness: direct Spec Blocks tools are available and were used. Chrome DevTools MCP is registered as deferred tools.
- Browser / server / build under test: local Vite dev server (`npm run dev` / Storybook) in Google Chrome through DevTools MCP.
- Evidence directory: `tmp/component-verification/table-of-contents/compact-1/`
- Durable verification fixtures / served URLs: `tests/fixtures/components/table-of-contents/index.html` (new).
- Evidence availability to the next agent: local only (`tmp/` is not shared).

## Capability and interface mapping

| ID   | Requirement / capability and defaults | Live authority | Local reference path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status  | Evidence / gap   |
| ---- | ------------------------------------- | -------------- | ----------------------------- | ------------------------------ | ------------- | ------------ | ------- | ---------------- |
| C-01 | `variant`: `list` or `compact`, default `list`, reflected | §20.6 props `tocv-p1`; summary `tocs1c` | shadcn `DocsTableOfContents` `variant` | `TpTableOfContents.variant`; render branch | docs API table; Default control | V-01, V-15 | passed | verified by V-01, V-15 |
| C-02 | `side`: `inline-start` or `inline-end`, default `inline-start`; flips when the card does not fit | `tocv-p2`, `tocv-popup` | videojs `Popover.Positioner side="right"` | forwarded to the composed `tp-popover` `side`; `collisionAvoidance` side `flip` | docs API, Compact section | V-08, V-17 | passed | verified by V-08, V-17 |
| C-03 | `openDelay` 300 / `closeDelay` 0 (`open-delay` / `close-delay`) | `tocv-p3` | Base UI `PopoverTrigger` `delay`/`closeDelay` | forwarded to `tp-popover` | docs API | V-05 | passed | verified by V-05 |
| C-04 | One Mark per top-level Item (the shallowest depth present), in order; deeper Items count toward the Mark before them | `tocv-marks` (0.32.1) | videojs stripes in `TableOfContentsMobile` (one per heading; widths by depth) | root `#marks()` groups the slotted items; renders `[part~=marks] > [part~=mark]` | docs Compact section | V-02, V-13 | passed | verified by V-02, V-13 |
| C-05 | Mark states: inactive (border), active (muted foreground), current (indicator/primary); only color transitions | `tocv-marks`, `tocv-presentation` | videojs `bg-current` / active `bg-faded-black` | `data-active`/`data-current` on marks; recipe `table-of-contents-mark` | docs Customization | V-03, V-18 | passed | verified by V-03, V-18 |
| C-06 | Trigger size unchanged by state changes; row spacing shrinks to the mark thickness when the block size is limited | `tocv-marks` | videojs `calculateRailGeometry` | flex rows `0 1 space-2` with a thickness minimum | docs Compact section | V-04, V-14 | passed | verified by V-04, V-14 |
| C-07 | Pointer hover opens after the open delay; entering the covering card keeps it open; leaving closes it | `tocv-popup` | Base UI `openOnHover` | `tp-popover` `openOnHover`, `HoverSurfaceController` | docs Compact section | V-05 | passed | verified by V-05 |
| C-08 | Press toggles; Enter/Space opens and focuses the current (else first) Link; a hover open does not move focus | `tocv-popup` | videojs `initialFocus` to `a[aria-current]` | `tp-popover` `pressToggles`; `initialFocus` function (interaction is not `''`) | docs Accessibility | V-06 | passed | verified by V-06 |
| C-09 | Escape closes and returns focus to the Trigger | `tocv-popup` | Base UI dismiss | `tp-popover` `finalFocus` `trigger` | docs Accessibility | V-06 | passed | verified by V-06 |
| C-10 | Link activation navigates as in the list variant and closes the popup (`close-action`) | `tocv-popup`; B.8.3 | videojs `handleNavigate` | `#click` → `#go` → `popover.setOpen(false, 'close-action', event)` | docs Compact section | V-07 | passed | verified by V-07 |
| C-11 | The card covers the Trigger from the edge opposite `side`, centered on the block axis, flipped and shifted into view | `tocv-popup` | videojs positioner `align="center"`, `sideOffset=-4`, `collisionPadding` | `sideOffset` = −(Trigger extent on the side axis); `align` center; collision `flip`/`shift` | docs Compact section | V-08, V-17 | passed | verified by V-08, V-17 |
| C-12 | The popup holds the Title and List with list-variant presentation; the indicator is placed; the current link is kept visible in the card's scroll | `tocv-presentation`, `toc-indicator`, `toc-own-scroll` | videojs `TableOfContentsDesktop` reused as content | shared `#renderBody()`; item ResizeObservers place the indicator; `#revealCurrent` starts from the item | docs | V-09, V-14 | passed | verified by V-09, V-14 |
| C-13 | Accessibility: nav named by Title; Trigger named by the Title text with expanded state; Marks hidden; popup named; Links focusable while open; `aria-current` | `tocv-a11y`, `toc-a11y` | videojs trigger `aria-label`, Popover ARIA | nav `aria-labelledby`; `tp-button` `aria-label`; marks `aria-hidden`; `tp-popover` `label` | docs Accessibility | V-10, V-11 | passed | verified by V-10, V-11 |
| C-14 | Parts `trigger`, `marks`, `mark`, `popover`; keys `table-of-contents-variant-*`, `-trigger`, `-marks`, `-mark`, `-popover`; dictionary/token overrides | §20.6 part tables `tocv-d*`, `tocv-k*` | n/a | family definition axes + bindings; recipe | docs Parts / Customization | V-12, V-18 | passed | verified by V-12, V-18 |
| C-15 | Dynamic items and depth changes update the marks; switching `variant` at runtime keeps the spy, value and indicator | `tocv-marks`; `toc-indicator` | n/a | slotchange; item `depth` notification; list observer re-bound | docs | V-13, V-15 | passed | verified by V-13, V-15 |
| C-16 | List variant unchanged | §20.6 existing rows | existing implementation | `variant="list"` keeps the current template | docs | V-16 | passed | verified by V-16 |
| C-17 | RTL and logical sides | `tocv-popup` (logical `side`) | n/a | logical `side` values; marks aligned to inline start | docs | V-17 | passed | verified by V-17 |
| C-18 | Reduced motion and popup presence motion | `toc-indicator`; Popover presence | n/a | Popover `anchoredPresenceAppearance`; mark color transition through `motionTransition` | docs Customization | V-18 | passed | verified by V-18 |
| C-19 | Registration: TOC defines Popover and Button; standalone `defineElement` works | architecture (rendered elements) | n/a | `elementDependencies` adds `TpPopover`, `TpButton` | n/a | V-19 | passed | verified by V-19 |
| C-20 | Documentation: Compact section, API rows, Default controls, Compact example, fixture | skill gate 7 | n/a | docs, stories, examples, fixture | `docs/table-of-contents.md` | V-20 | passed | verified by V-20 |

| Issue | Concrete missing/conflicting contract | Affected dependencies | Proposed resolution | Authority / resolution evidence | Status |
| ----- | ------------------------------------- | --------------------- | ------------------- | ------------------------------- | ------ |
| S-01 | §20.6 had no variant axes, compact anatomy, properties or behavior | C-01–C-14 | Amend §20.6 with `variant`, `side`, the delays, Trigger/Marks/Mark/Popup and four requirements | Spec Blocks commits `4eb12b46` and `a0a7929b` (0.32.0) | passed |
| S-02 | User review: nested dots looked poor; mark only top-level items | C-04, C-05 | `tocv-marks`, the Marks/Mark rows, the key table and the decisions note now describe one Mark per top-level Item whose deeper Items count toward it | Spec Blocks commit `2554370d` (0.32.1) | passed |

## Architecture and reuse

- Component folder and responsibility boundaries:
  - The root keeps the spy, value and indicator. `table-of-contents-compact.ts` holds the compact template: Trigger, Marks and the popup configuration.
  - The item gains only a `depth` change notification.
- Supported exports / registration / constituent API impact:
  - New public properties `variant`, `side`, `openDelay` and `closeDelay`, and new parts `trigger`, `marks`, `mark` and `popover`.
  - `elementDependencies` now includes Popover and Button.
  - No export removals.
- Public vocabulary / tokens / parts / presentation review:
  - `variant` follows the canonical axis and the reference naming (`list`). `side` follows Popover's logical sides.
  - The current mark reuses `--tp-table-of-contents-indicator`. No new tokens.

### Family dependency map

| Responsibility | Reference dependency path / symbol         | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| -------------- | ------------------------------------------ | --------------------------------- | ------------------------------------------------- | ------------------------------------------ |
| Hover/press popup, dismissal, focus, positioning, presence | videojs `TableOfContentsMobile` → Base UI `Popover.Root/Trigger/Positioner/Popup`; `PopoverTrigger` `openOnHover` | `src/components/popover/popover.ts` `TpPopover` on `TpHoverSurface` (`anchored-surface.ts`) and `HoverSurfaceController` (`foundation/hover-surface.ts`) | Compose `tp-popover` with `.portal=false`, `openOnHover`, a covering `sideOffset`, `align` center, flip/shift, and `initialFocus` on the current link. No local hover or dismissal logic. | `media-player/volume-popover.ts` and the color picker compose it the same way; V-05–V-09, V-16 |
| Trigger control | videojs `Popover.Trigger` (native button) | `src/components/button/button.ts` `TpButton` | Compose `tp-button variant="ghost"`; size the control through the recipe (`&::part(button)`) | color picker trigger; V-06, V-10 |
| Scroll spy / current value | own (`foundation/scroll-spy.ts` `ScrollSpyController`) | same | Unchanged; marks read item states | V-03, V-15, V-16 |
| Indicator geometry | own (`foundation/indicator-geometry.ts` `blockSpanGeometry`) | same | Unchanged; offset-based, so the popup scale does not distort it | V-09, V-16 |
| Reveal the current link | videojs `useAutoScroll` | `#revealCurrent` + `foundation/scroll.ts` `scrollableAncestors` | Repair: start from the current item so the search crosses slots into the popup's scroll box; same result for the list variant | V-14, V-16 |
| Marks | videojs stripes from `useRenderedHeadings` data | none (TOC-specific) | The root derives marks from the slotted items' `depth`/`active`/`current`; no parallel spy | V-02, V-03 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations        | Scenario IDs |
| -------------------- | ---------------------------- | ----------------------------------------- | ----------------------------------- | -------------------------------------- | ------------ |
| Marks / Mark | videojs site (Tailwind, `globals.css`) | stripes `h=1px`, `gap 4px`, `w 10/8/4px` by depth; `bg-current` (`text-manila-75`), active `bg-faded-black` | `table-of-contents-mark` recipe; Indicator thickness `calc(border-width*2)`; roles `--tp-border`, `--tp-muted-foreground`, `--tp-table-of-contents-indicator`/`--tp-primary` | Nested items are dots (user decision); three states (user decision); color painted as a border and transitioned with `color` only (fill-layer rule) | V-02, V-03 |
| Trigger | videojs | `min-h-6 w-6` button, `intent:` darkening | `tp-button` ghost (`buttonCoreAppearance` ghost variant) | Recipe `table-of-contents-trigger` `&::part(button)` gives auto block size and `--tp-target-size-min` inline size | V-10, V-12 |
| Popup surface | videojs | `rounded-lg border bg-manila-light shadow-xl`, `width:min(20rem,100vw-3rem)`, `overflow-y-auto` | `popoverAppearance['popover-content']` | Recipe `table-of-contents-popover` `&::part(popover-content)`: max-content inline size capped by spacing tokens and `--tp-available-width`, block overflow auto | V-08, V-09 |
| Popup content | videojs `TableOfContentsDesktop` | `nav > h2 + ul.border-l` with a sliding `bg-accent` indicator | existing `table-of-contents-title/list/rail/indicator/link` recipes | Reused unchanged | V-09, V-16 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| ------------------ | ----------- | ------------------------------- | ----------------------------------- | --------------------------------------------- |
| TOC compact internals | trigger button | `tp-button` | V-06, V-10, V-19 | none |
| TOC compact internals | popup | `tp-popover` | V-05–V-09, V-19 | none |
| TOC compact internals | marks | native `span`s | V-02 | decorative marks; no library role exists (like Rail/Indicator) |
| Stories / examples | page scroller, action button | `tp-scroll-area`, `tp-button` | V-20 | none |
| Fixture | variant switch and page controls | `tp-toggle-group` / `tp-button` | V-15, V-20 | none |

## Verification scenarios

| ID   | Capability IDs / evidence category | Setup and input     | Expected result     | Actual result | Tool/command and evidence  | Status  | Justification / gap |
| ---- | ---------------------------------- | ------------------- | ------------------- | ------------- | -------------------------- | ------- | ------------------- |
| V-01 | C-01; API | fixture: read/set `variant`, attribute reflection | defaults to `list`; `compact` renders Trigger + Marks | variant, side, delays default and reflect; compact renders Trigger + Marks | `api.ts` verifyTableOfContents (24 assertions, all returned) | passed | evidence: `api.ts` verifyTableOfContents (24 assertions, all returned) |
| V-02 | C-04; render | fixture nested page | mark count, order and depth classes match the items; dots indented | 6 marks for the 6 top-level handbook sections; subsections count toward their section | `api.ts`; tmp/component-verification/table-of-contents/compact-1/rest-roots-dark-zoom.png | passed | evidence: `api.ts`; tmp/component-verification/table-of-contents/compact-1/rest-roots-dark-zoom.png |
| V-03 | C-05; behavior/visual | scroll the nested page | current/active/inactive markers and colors follow the spy | `C-----` at Welcome, `--C---` while reading Respirators (depth 3), `--AC--` at Kilns; colors border/muted/primary | `api.ts`; tmp/component-verification/table-of-contents/compact-1/light-pair.png | passed | evidence: `api.ts`; tmp/component-verification/table-of-contents/compact-1/light-pair.png |
| V-04 | C-06; layout | record the Trigger rect across scroll states | rect unchanged | strip rect identical across state changes | `api.ts` "strip size unchanged" | passed | evidence: `api.ts` "strip size unchanged" |
| V-05 | C-03, C-07; real pointer | hover the Trigger, wait, move into the card, leave | opens after ~300 ms; stays open over the card; closes on leave | Real hover: opens after ~300 ms; trigger leave is paired with card enter; card stays open while the pointer rests 3.5 s; closes on leave | MCP hover + event log | passed | evidence: MCP hover + event log |
| V-06 | C-08, C-09; real keyboard | Tab to the Trigger, Enter, Escape | focus on the current link, then back on the Trigger | Tab focuses the trigger without opening; Enter opens and focuses the current link with :focus-visible; Escape closes and returns focus to the trigger (focus-visible); a mouse press focuses the current link without a ring | MCP press_key / click + evaluate | passed | evidence: MCP press_key / click + evaluate |
| V-07 | C-10; real pointer | click a link in the card | scrolls, records the fragment, closes the card, value `link-press` | Real click on Kilns: value kilns (`link-press`), hash #kilns, card closed, focus back on the trigger without a ring | MCP click + evaluate | passed | evidence: MCP click + evaluate |
| V-08 | C-02, C-11; geometry | end-docked and start-docked fixed TOC | the card covers the strip from the outer edge, centered, within the viewport | end: card right = strip right 1264; start (inline-end) and start-flip: card left = strip left 16; centered within 2 px | MCP evaluate rects; `api.ts` | passed | evidence: MCP evaluate rects; `api.ts` |
| V-09 | C-12; visual | open the card | title, rail, indicator and links as in the list variant; indicator on the active links | Card shows title, rail, indicator spanning the active chain, indented links, start-aligned text | screenshots tmp/component-verification/table-of-contents/compact-1/light-pair.png | passed | evidence: screenshots tmp/component-verification/table-of-contents/compact-1/light-pair.png |
| V-10 | C-13; a11y tree | snapshot, closed and open | nav named; button named with expanded; marks absent; dialog named; list; `aria-current` once | navigation "On this page" > button (expandable, expanded) + dialog "On this page" > list > listitems > links; no mark nodes; no named generic | verbose snapshots tmp/component-verification/table-of-contents/compact-1/snapshot-*-verbose.txt | passed | evidence: verbose snapshots tmp/component-verification/table-of-contents/compact-1/snapshot-*-verbose.txt |
| V-11 | C-13; automated | inject axe on the fixture (closed and open) | no violations | axe: 0 violations closed and open | axe-core through MCP | passed | evidence: axe-core through MCP |
| V-12 | C-14; customization | override `--tp-table-of-contents-indicator` and a dictionary entry for `table-of-contents-mark` | marks and indicator follow | `--tp-table-of-contents-indicator` colors the current mark | `api.ts` | passed | evidence: `api.ts` |
| V-13 | C-04, C-15; dynamic | add an item; change a `depth` | marks update | depth change adds/removes a mark; added/removed item updates marks | `api.ts` | passed | evidence: `api.ts` |
| V-14 | C-06, C-12; constrained | long list with a limited Trigger block size; open the card | rows shrink, all marks visible; the card scrolls with the current link revealed | 36 rows shrink to 4 px in a 10rem strip; card capped at the viewport and scrolled so Chapter 30 shows (after the open-complete reveal fix) | MCP evaluate on `?page=long` | passed | evidence: MCP evaluate on `?page=long` |
| V-15 | C-01, C-15; runtime switch | toggle `variant` while scrolled | value, indicator and spy keep working in both directions | variant switch both ways keeps value and indicator (API and real click on the Switch variant button) | `api.ts`; MCP click; tmp/component-verification/table-of-contents/compact-1/switch-to-list.png | passed | evidence: `api.ts`; MCP click; tmp/component-verification/table-of-contents/compact-1/switch-to-list.png |
| V-16 | C-16; regression | Default story, DocumentScroll, Markdown fixture, design-tokens page | list variant unchanged | list variant unchanged on `?page=list`; Default story and Docs page render; shared surfaces now text-align start | screenshots tmp/component-verification/table-of-contents/compact-1/list-regression-crop.png | passed | evidence: screenshots tmp/component-verification/table-of-contents/compact-1/list-regression-crop.png |
| V-17 | C-02, C-11, C-17; RTL | `dir=rtl` fixture page | marks at the inline start; the card covers from the correct physical edge | RTL end-docked strip at the left; card covers it from the left edge | MCP evaluate rects | passed | evidence: MCP evaluate rects |
| V-18 | C-05, C-18; themes/motion | dark scheme; `motion-policy="reduce"` | colors legible as designed; no popup/mark animation under reduce | dark and light inspected; `motion-policy="reduce"`: no card animations, mark transition 0s (normal: 2 animations, 0.2s) | MCP evaluate + screenshots | passed | evidence: MCP evaluate + screenshots |
| V-19 | C-19; registration | standalone fixture page calling `defineElement(TpTableOfContents)` only | Popover and Button are defined; compact works | standalone defines only TOC, item, Popover, Button; card opens styled | standalone fixture `?component=TpTableOfContents` | passed | evidence: standalone fixture `?component=TpTableOfContents` |
| V-20 | C-20; docs | Storybook Docs page (dev and static build) | Compact example works; API rows match | Static Storybook Docs page renders the Compact example (3 lines) and the API rows; no visible error display | `npm run build-storybook`; tmp/component-verification/table-of-contents/compact-1/docs-compact-example-small.png | passed | evidence: `npm run build-storybook`; tmp/component-verification/table-of-contents/compact-1/docs-compact-example-small.png |

## Early integration checkpoint

| ID   | Check                                                                                             | Status  | Evidence / unresolved finding                               |
| ---- | ------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------- |
| I-01 | Shared owners are actually used by related consumers; old duplicate behavior is removed/delegated | passed | The diff composes `tp-popover` (`table-of-contents-compact.ts`) and `tp-button`; hover, press, Escape, dismissal and positioning come from `TpHoverSurface`/`HoverSurfaceController`; spy, indicator and list template are shared through `#renderBody()`. Shared repair: the anchored surface host now resets the `align` text-align hint (`anchored-surface.ts`), and Preview card's duplicate rule was removed. |
| I-02 | Default visual regions match traced source and shared library recipes                             | passed | `tmp/component-verification/table-of-contents/compact-1/light-pair.png`, `rest-roots-dark-zoom.png`: lines in border/primary roles; the card uses the Popover surface with the list-variant title, rail, indicator and links. Fixed during the checkpoint: centered link text (align hint), the unnamed compact landmark, the current link not revealed in an overflowing card. |
| I-03 | Independent constituent options work, including placement separately from action behavior         | passed | `side` inline-end/default flip/RTL each cover the strip from the outer edge (V-08, V-17); hover, press, keyboard and link press each open or close independently (V-05–V-07). |

## Gate record

| Gate                                  | Status  | Required exit evidence / remaining work                                               |
| ------------------------------------- | ------- | ------------------------------------------------------------------------------------- |
| 0. Sources and scope                  | passed  | Live §20.6 read and amended (0.32.0 `a0a7929b`); references traced; scope is the compact variant from the user request. |
| 1. Capability mapping                 | passed  | C-01–C-20 mapped to V-01–V-20; spec gap S-01 resolved before code. |
| 2. Architecture and composition reuse | passed  | Popover/Button composition, unchanged spy/indicator owners, the `#revealCurrent` repair and presentation sources mapped. |
| 3. Behavior | passed  | V-01–V-08, V-13–V-15 passed through `api.ts` and real hover, click and keyboard input. |
| 4. Presentation and customization | passed  | V-09, V-12, V-18 passed; recipe keys `table-of-contents-variant-compact`, `-trigger`, `-marks`, `-mark`, `-popover`; color-only mark transition. |
| 5. Accessibility | passed  | V-10 tree, V-06 keyboard and focus, V-11 axe (0 violations). No screen-reader run. |
| 6. Visual and interaction inspection | passed  | Light and dark, RTL, start and end docking, long list, reduced motion and hover stability inspected (V-02–V-05, V-08, V-09, V-14, V-17, V-18). |
| 7. Documentation and demo reuse | passed  | docs Compact section and API, parts, accessibility and customization updates; Default controls; Compact example; static Docs page verified (V-20). |
| 8. Regression and reconciliation | passed  | vitest 226 files / 2054 tests passed; eslint, stylelint and prettier clean on changed files; `npm run build` and `build-storybook` succeed; size report regenerated; list variant and shared surfaces checked (V-16, V-19). |

## Documentation synchronization

- [x] Base example, actual Controls, constituent APIs and reference agree with code.
- [x] Added/removed/changed properties, events, methods, slots and hooks are updated.
- [x] Verification fixtures are separate from curated public examples.
- [x] Rendered and copyable compositions reuse existing components.
- [x] Imports and registration work outside Storybook's global setup.
- [x] Generator handling and changed tests preserve the intended documentation.

## Completion / handoff

- Change summary: `variant="compact"` on `tp-table-of-contents`.
  - At rest: one line per top-level item, with current, active and inactive states.
  - On hover, press or keyboard: a composed Popover card covers the strip and shows the list-variant title, rail, indicator and links.
  - New properties: `side`, `open-delay`, `close-delay`.
  - Shared repair: anchored surfaces ignore the reflected `align` text-align hint.
- Actual delivery claim: the compact variant and its spec amendment (CL §20.6, 0.32.0 and 0.32.1). The list variant is unchanged apart from the shared `#revealCurrent` and list-observer repairs.
- Record checker: `--stage implement`, `--stage verify` and `--stage complete` all passed.
- Non-browser checks:
  - `npx vitest run`: 226 files, 2054 tests passed.
  - eslint, stylelint and prettier clean on the changed files.
  - `npm run build` succeeded; `npm run build-storybook` succeeded.
  - `node scripts/size-report.mjs`: the table of contents is now 226 kB / 81.7 kB gzip (was 90.7 kB / 35.3 kB) because it bundles Popover and Button.
- Behavior: V-01–V-08 and V-13–V-15 passed.
- Accessibility: tree (V-10), keyboard and focus (V-06) and axe (V-11) passed. No screen reader was used.
- Visual/customization/motion inspection: V-09, V-12 and V-16–V-18 passed; screenshots in `tmp/component-verification/table-of-contents/compact-1/`.
- Documentation and demo composition reuse: the Compact example and Default controls compose the library elements; the static Docs page renders (V-20).
- Shared-consumer regressions / package boundaries: Popover, Tooltip and Preview card hosts now resolve text-align `start`; standalone registration passed (V-19).
- Required failures or blocked checks: none. Real touch input was not exercised; the DevTools MCP runs no touch session.
- Older out-of-scope gaps: the page fragment followed at load depends on DevTools navigation timing (iframe loads follow it in both variants). Not changed.
- Changed source revisions / reopened gates: gate 2 was reopened after the user asked for top-level marks only (S-02), then re-verified.
- Evidence is local only (`tmp/` is not shared).