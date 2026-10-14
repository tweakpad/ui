# Component implementation and evidence record

## Delivery and source record

- Component(s) / public identity: Description list (`tp-description-list`) with its Item member (`tp-description-list-item`); catalog kind preset-composition.
- Requested work / claim: Complete new component. User request 2026-10-14: "add a Description List component … able to format a layout to have a maximum visible elements after from which we show a configurable 'Show More' element that expands the full list … DescriptionList and DescriptionListItem … items should contain an attribute for each label and contain the value."
- Scope source: the user request above; no reduced delivery.
- In-scope changes and existing gaps: new spec section CL §22.9 Description list; `src/components/description-list/`; family and recipe; shared repairs in `CollapsibleController` (`labelContent`, `hideContent`) and `disclosurePanelStyles` (closed extent); catalog, exports, registration; docs, story, examples, fixture, standalone fixture entry; changeset.
- Repository baseline / unrelated changes: `8a76a8e` (clean worktree at start); no unrelated files touched.
- Live project / document IDs and revisions: project `prj_c5a403a0-d1d5-4487-ac78-f4e545f46483` (read at v0.25.0, head `06732c5b`); Component Library `doc_8077bf7c-0361-48f3-ac87-53b983bd89b3`. Spec commits: `4d686ca1` (content + coverage row, v0.25.1), `e55cfa1d` (bump v0.26.0), `531512e0` (hidden-until-found column clarification, v0.26.1), `afb0f73a` (one native list, Viewport replaces Overflow/Overflow body, text-only Item label, v0.26.2), `c7f50d71` (bump v0.27.0).
- Owning contracts / dependencies / vocabulary: CL §22.9 Description list (`ucl22-description-list`, `udl-q1`–`udl-q7`), coverage row `audit-cov-description-list`; dependencies Collapsible (`ucl16-collapsible`, Foundation `sec-133-collapsible`), Button (`ucl16-button`), Semantic invariants (`sec-71-semantic-invariants`), motion roles (`sec-cl-158-motion-roles`). Names: `open`/`defaultOpen`/`hiddenUntilFound`/`tp-open-change`/`tp-open-change-complete` follow Collapsible (same disclosure meaning); `limit` follows Toast's "Maximum visible" → `limit`; `messages` follows Citation, with File upload's string-or-function message shape.
- Local reference evidence: `ui` 63c1308d1 (clean): `apps/v4/examples/base/bubble-collapsible.tsx` (Collapsible + CollapsibleTrigger rendered as `Button variant="link" className="gap-1 p-0 text-muted-foreground"`, `ChevronDownIcon data-icon="inline-end"` turned 180° while open, "Show more"/"Show less"); `registry/bases/base/examples/separator-example.tsx` `SeparatorInList` (`dl` rows, text-sm); `app/(app)/(styles)/sera/media-library/components/asset-details.tsx` (`dl` with muted `dt` above `dd`). `base-ui` 5b495488d (clean): `docs/src/components/DescriptionList.tsx` + `.css` (Root `dl`, Item `div`, Term `dt`, Details `dd`; grid `auto 1fr`, subgrid items, 12px row gap). No reference ships a limited description list; the limit composes the Collapsible family.
- Tool readiness: Spec Blocks direct MCP available and used for every read and amendment. Chrome DevTools MCP available.
- Browser / server / build under test: Chrome via DevTools MCP; private Vite server `http://localhost:5199` (fixture, standalone, `?package` dist) started for this run; the user's Storybook dev server `http://localhost:6006` (Docs page, Default story, Collapsible regression).
- Evidence directory: `tmp/component-verification/description-list/2026-10-14/`
- Durable verification fixtures / served URLs: `tests/fixtures/components/description-list/index.html` (+ `fixture.ts`, `api.ts`, `browser-steps.md`); `tests/fixtures/components/standalone/?component=TpDescriptionList`.
- Evidence availability to the next agent: local only.

## Capability and interface mapping

| ID   | Requirement / capability and defaults | Live authority | Local reference path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status  | Evidence / gap   |
| ---- | ------------------------------------- | -------------- | ----------------------------- | ------------------------------ | ------------- | ------------ | ------- | ---------------- |
| C-01 | One native description list: per Item a `div` group directly in the `dl` holding a `dt` (label) and a `dd` (the Item itself as content), document order | udl-q1 | base-ui `DescriptionList.tsx` Root/Item/Term/Details | Root renders `<dl part="description-list">` with `repeat()` pairs; manual slot assignment puts each Item in its `dd` | docs/description-list.md Items, Accessibility | V-01, V-12 | passed | `api.ts` q1 (4 assertions); a11y tree DescriptionList > term/definition; axe `definition-list`/`dlitem` clean |
| C-02 | Children other than Items are not presented; one `tp-diagnostic` `description-list-child` | udl-q1 | tree-item manual assignment | `#collect()` + `diagnose(…, { once, defer })` | docs Items | V-02 | passed | `api.ts` q1 stray child (2 assertions) |
| C-03 | `limit` (positive integer, default none): Items past the limit concealed (visibility hidden, laid out) while closed; Trigger follows the Viewport | udl-q2, udl-q4 | — | `limit` property; `data-overflow`/`data-concealed` pairs; `#measure()` collapsed extent | docs Show more | V-03, V-12, V-13 | passed | `api.ts` q2; Tab skips hidden link; a11y tree omits hidden pairs |
| C-04 | No limit, `limit` < 1 or not a number, or Items ≤ limit: every Item, no Trigger, no clipping | udl-q2 | — | `#resolvedLimit()`; `data-limited` host marker | docs Show more | V-04 | passed | `api.ts` 6 limit cases |
| C-05 | Split follows added, removed, moved Items, label changes and `limit` changes without changing `open` | udl-q2 | — | MutationObserver (child list + Item `label`), `#collect()` | docs Items | V-05 | passed | `api.ts` q2 membership (5 assertions) + q1 label change |
| C-06 | Trigger composes Button `variant="link"` `size="sm"` in the muted foreground with the Indicator after the text; `aria-expanded` and `aria-controls` → Viewport | udl-q3 | ui `bubble-collapsible.tsx` | `renderPart('description-list-trigger', { tag: 'tp-button' })`; `CollapsibleController` trigger = composite target | docs Styling | V-06, V-13 | passed | `api.ts` q3; snapshot `button "Show more" expandable` |
| C-07 | Trigger label `showMore`/`showLess`; defaults "Show more"/"Show less"; function messages receive `{ hidden, total }` | udl-q3, udl-q7 | ui `bubble-collapsible.tsx` | `messages`, `description-list-trigger-label` part | docs Show more | V-07 | passed | `api.ts` q7 (4 assertions); Docs "Counted button text" shows "Show 3 more" |
| C-08 | Activation proposes the opposite state through cancelable `tp-open-change` (`trigger-press`), then `onOpenChange`; canceled keeps state; focus stays on the Trigger | udl-q3 | Collapsible `#requestOpen` | `#requestOpen()` mirrors TpCollapsible | docs Show more | V-08 | passed | `api.ts` q3; real click/Enter/Space keep focus on `tp-button>button` |
| C-09 | `open` (reflects) / `defaultOpen`; programmatic changes; `tp-open-change-complete` | udl-q3, udl-q4 | Collapsible | properties as TpCollapsible; `onComplete` dispatch | docs Show more, API | V-09 | passed | `api.ts` q4 default-open and completion |
| C-10 | `disabled` prevents activation and removes the Trigger from the tab order | udl-q3 | Collapsible disabled | `CollapsibleController.update(open, disabled)` + composite control policy | docs API | V-10 | passed | `api.ts` q3 disabled |
| C-11 | Presence lifecycle; `disclosure` on Viewport and `content` on list (enter/exit); `indicator` on chevron (change); chevron down closed / up open; hidden Items shown until exit completes; visible Items never move | udl-q4 | Collapsible motion contract | `DisclosurePanelController` (extent `--description-list-height`), `disclosurePanelStyles(…, '--description-list-collapsed-height')`, `DisclosureIndicator` 180° | docs Styling | V-11 | passed | rAF samples: 87→186px open, 186→87px close, reversal settles at 87; first item top and value left constant; concealed only after exit; `motion-policy="reduce"` instant |
| C-12 | Viewport adds no role or name | udl-q4 | — | `CollapsibleController` `labelContent: false`, `hideContent: false` | docs Accessibility | V-12 | passed | `api.ts` q4; a11y tree shows Viewport ignored |
| C-13 | `hiddenUntilFound`: hidden pairs `hidden="until-found"` stay searchable; a match opens with `programmatic`; their Labels size the column only once open | udl-q4, udl-q5 | Collapsible `hiddenUntilFound` | `#conceal()`; bubbling `beforematch` reaches the Viewport listener | docs Show more | V-14 | passed | Real text-fragment navigation `#:~:text=hive%20by%20the%20south` opened `#found`; `api.ts` q5 |
| C-14 | Horizontal (default): one Label column `fit-content(40%)` incl. hidden Items; vertical stacks; RTL; wrapping | udl-q6 | base-ui `DescriptionList.css` | `orientation`; grid + subgrid pairs; labels `break-word`, values `anywhere` | docs Layout | V-15, V-16 | passed | `api.ts` q6; RTL 400px: column 147px (40%), no overflow (`rtl-400-light-open.png`) |
| C-15 | Labels muted foreground, Values foreground, text-sm; spacing tokens | udl-q7 | sera `asset-details.tsx`, separator example | recipe `description-list*` | docs Styling | V-15, V-17 | passed | `api.ts` q7 computed colors; screenshots light/dark |
| C-16 | Item `label` (text, reflects) is the term; default slot is the value | props table (v0.26.2) | base-ui Term/Details | `TpDescriptionListItem` (`display: contents`, `color: inherit`) | docs API | V-01 | passed | `api.ts` q1 |
| C-17 | Public parts/keys: description-list (+ orientation keys), -viewport, -item, -label, -value, -trigger, -trigger-label, -indicator; `partPresentation`/`partContracts`/`::part()` | definition tables | — | `families/description-list.ts`, `recipes/description-list.ts` | docs Styling | V-17 | passed | CEM lists the 8 parts; token, `::part`, `partPresentation`, `partContracts` overrides applied with focus kept |
| C-18 | Catalog tuple, exports, registration; standalone definition defines only Item, Button, Icon (+ Spinner via Button) | coverage row | — | `src/catalog.ts`, `components/index.ts`, `register.ts`, `families/index.ts` | docs API | V-18 | passed | standalone fixture: unrelated Badge/Collapsible/Card/List undefined; size report exit 0 |
| C-19 | Docs, Default story with Controls, examples, fixture, changeset | Docs policy | — | `docs/description-list.md`, `src/stories/description-list.*` | docs/description-list.md | V-19 | passed | Storybook Docs page renders Default first, API, 3 examples; Controls drive the element |

Record spec/reference conflicts here before dependent implementation:

| Issue | Concrete missing/conflicting contract | Affected dependencies | Proposed resolution | Authority / resolution evidence | Status |
| ----- | ------------------------------------- | --------------------- | ------------------- | ------------------------------- | ------ |
| S-1 | No Description list contract existed | Whole component | Add CL §22 Description list with q1–q7, definition tables and coverage row | Spec `4d686ca1`, `e55cfa1d`; user requested the component (Citation precedent) | passed |
| S-2 | `CollapsibleController` always labelled its content with the trigger, naming a generic region | Collapsible, Description list | `labelContent` option (default true) | udl-q4; Collapsible story keeps `role=region` + `aria-labelledby` | passed |
| S-3 | First design (Item shadow `dt`/`dd`, Overflow `div` inside the `dl`) failed axe `definition-list` and `dlitem` (HTML content model across shadow trees) | Whole structure | Root renders one `dl` with `div > dt + dd` pairs; Item projected into `dd`; Viewport outside the `dl`; `hideContent` option; collapsed extent in `disclosurePanelStyles`; Item label text-only | Spec `afb0f73a` (v0.26.2) + bump `c7f50d71` (v0.27.0); axe clean in light theme | passed |
| S-4 | With `hidden-until-found`, unrendered hidden Labels cannot size the label column (measured 57→176px on open) | udl-q4, udl-q6 | Contract states the trade-off for this opt-in mode | Spec `531512e0` (v0.26.1), refined in v0.26.2 | passed |

## Architecture and reuse

- Component folder and responsibility boundaries: `src/components/description-list/` — `description-list.ts` (Root: Item collection, limit split, single `dl` rendering, concealment, collapsed-extent measurement, disclosure binding, trigger, messages), `description-list-item.ts` (Item: label + value content), `index.ts`.
- Supported exports / registration / constituent API impact: new exports `TpDescriptionList`, `TpDescriptionListItem`, types `DescriptionListMessages`, `DescriptionListMessage`, `DescriptionListCounts`; catalog tuple `['Description list', 'tp-description-list', 'preset-composition']`; both tags registered. Foundation: `CollapsibleControllerOptions.labelContent`, `.hideContent`; `disclosurePanelStyles(panel, blockExtent, collapsedExtent?)`.
- Public vocabulary / tokens / parts / presentation review: names follow CL §22.9 v0.27.0; tokens only (`--tp-space-*`, `--tp-text-sm`, `--tp-muted-foreground`, `--tp-foreground`, ring tokens for the clip margin).

### Family dependency map

| Responsibility | Reference dependency path / symbol         | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| -------------- | ------------------------------------------ | --------------------------------- | ------------------------------------------------- | ------------------------------------------ |
| Disclosure state, trigger relationship, presence, hidden-until-found | ui `bubble-collapsible.tsx` → `Collapsible`, `CollapsibleTrigger` | `src/foundation/collapsible.ts` `CollapsibleController` (consumer `tp-collapsible`, through it Accordion) | Reuse; repairs `labelContent` and `hideContent` (defaults keep previous behavior). Description list conceals pairs itself in `onStateChange` | Collapsible, Accordion, Description list / V-08, V-12, V-20 |
| Measured disclosure motion | Collapsible Panel | `src/foundation/disclosure-panel.ts` `DisclosurePanelController` (consumers `tp-collapsible`, `tp-tree-item`) | Reuse with own extent properties (tree item `GROUP_EXTENT` precedent) | Collapsible, Tree view, Description list / V-11 |
| Disclosure panel structure | — | `src/presentation/motion.ts` `disclosurePanelStyles` (Collapsible, Tree item) | Extended with optional closed extent; existing calls unchanged | Collapsible, Tree item, Description list / V-11, V-20 |
| Indicator rotation motion | `ChevronDownIcon` `rotate-180` | `DisclosureIndicator`, `disclosureIndicatorStyles` | Reuse with `180deg` | Description list / V-11 |
| Trigger control | `Button variant="link"` | `TpButton` + `compositeControl` (TpCollapsible composed-trigger path) | Compose | Description list / V-06, V-10 |
| Child assignment | — | `tree-item.ts` manual slot assignment | Same mechanism; per-Item slot in its `dd` | Description list / V-01, V-05 |
| Messages | — | File upload `FileUploadMessage`, Citation `messages` | Same shape, functions carry counts (no new placeholder parser) | Description list / V-07 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations        | Scenario IDs |
| -------------------- | ---------------------------- | ----------------------------------------- | ----------------------------------- | -------------------------------------- | ------------ |
| List (description-list) | base / library theme | base-ui `.DescriptionList` grid `auto 1fr`; ui separator `dl … text-sm` | structure in component; recipe on `--tp-space-*`, `--tp-text-sm` | `fit-content(40%) minmax(0,1fr)`; column gap space-4; pair spacing space-3 / space-4 (vertical) as margins so the collapsed extent ends at the last visible value | V-15 |
| Viewport (description-list-viewport) | base | Collapsible Panel | `disclosurePanelStyles` with closed extent | `overflow-clip-margin` keeps focus rings; unclipped when not limited | V-11 |
| Pair (description-list-item) | base | base-ui `.DescriptionListItem` subgrid | structure: `display:grid; grid-template-columns: subgrid` | vertical row gap space-1 | V-15 |
| Label (description-list-label) | base / sera | sera `dt … text-muted-foreground` | recipe `--tp-muted-foreground` | normal weight, no uppercase | V-15 |
| Value (description-list-value) | base | base-ui `.DescriptionListDetails` | recipe `--tp-foreground` | `overflow-wrap: anywhere` | V-15, V-16 |
| Trigger (description-list-trigger) | base / rhea example | ui `bubble-collapsible.tsx` `variant="link" … gap-1 p-0 text-muted-foreground` | `tp-button variant="link" size="sm"`; recipe clears inline padding and border via `::part(button)`, gap space-1, muted color | margin-block-start space-2; text aligned to the label edge (measured 32 = 32) | V-06, V-17 |
| Indicator (description-list-indicator) | base | `ChevronDownIcon data-icon="inline-end"` | `tp-icon` in Button `icon-end` | 180° via DisclosureIndicator | V-11 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| ------------------ | ----------- | ------------------------------- | ----------------------------------- | --------------------------------------------- |
| Description list internals | Show more trigger | `tp-button variant="link"` | V-06, V-18 | none |
| Description list internals | Indicator | `tp-icon` with `chevronDownIcon` | V-11, V-18 | none |
| Description list internals | List, term, description | native `dl`, `div`, `dt`, `dd` | V-01, V-12 | Contract-required native semantics (udl-q1) |
| Docs "Record details" | Surface | `tp-card` | V-19 | none |
| Docs "Record details", Default story, catalog example | Status value | `tp-badge variant="success"` | V-19 | none |
| Docs "Record details" | Date value | `tp-time mode="absolute"` | V-19 | none |
| Docs "Record details" | Copy action | `tp-copy-button size="xs"` | V-19 | Inline flex `span` lays the code and button out (layout only) |
| Fixture | Value link | native `a` | V-13 | Deliberate focusable value for tab-order checks |

## Verification scenarios

| ID   | Capability IDs / evidence category | Setup and input     | Expected result     | Actual result | Tool/command and evidence  | Status  | Justification / gap |
| ---- | ---------------------------------- | ------------------- | ------------------- | ------------- | -------------------------- | ------- | ------------------- |
| V-01 | C-01, C-16; API | Fixture lists | One `dl`; `div > dt + dd` per Item; Item assigned into its `dd`; label change updates the term | 4 q1 assertions passed on source and dist: `dl` children are 2 `div`s each with `dt`+`dd`; `first.assignedSlot.parentElement` is the first `dd`; "Plot size" after `label` change | `api.ts` q1 via MCP evaluate | passed | Evidence: `api.ts` run 2026-10-14, 42/42 |
| V-02 | C-02; API | Stray `<p>` child | Not presented; `description-list-child` diagnostic | `#stray` unassigned and not visible; `tp-diagnostic` code `description-list-child` received | `api.ts` q1 | passed | Evidence: `api.ts` q1 stray assertions |
| V-03 | C-03; API + a11y | `limit="3"`, 6 Items | Items 4–6 `data-overflow` + `data-concealed`, laid out below the clipped Viewport; Trigger after Viewport | Items 4–6 carry `data-overflow`/`data-concealed`; Viewport height < list height; Viewport `nextElementSibling` is the Trigger; `hiddenCount` 3 | `api.ts` q2; snapshot | passed | Evidence: `api.ts` q2; `a11y-tree-closed.txt` omits hidden pairs |
| V-04 | C-04; API | No limit, `0`, `-2`, `many`, `6`, `9` | All Items, no Trigger, no `data-limited` | All six limit values: no Trigger, no `data-limited`, every pair visible | `api.ts` q2 | passed | Evidence: `api.ts` q2 (6 assertions) |
| V-05 | C-05; API | Prepend, remove, append, move, `limit` change while open | Split follows; `open` unchanged | Prepended Item visible with 2 hidden; removals drop the Trigger; appended Item marked overflow with `open` true; `limit=1` gives 2 hidden while open | `api.ts` q2 | passed | Evidence: `api.ts` q2 (5 assertions) |
| V-06 | C-06; API + a11y | Inspect Trigger | `tp-button[variant=link]`; inner button `aria-expanded`; `ariaControlsElements` = Viewport | Trigger host `tp-button[variant=link]`; native `button` `aria-expanded` false→true; `ariaControlsElements[0]` is the Viewport | `api.ts` q3; snapshot | passed | Evidence: `api.ts` q3; snapshot `button "Show more" expandable` |
| V-07 | C-07; API | Default, string and function messages | "Show more"/"Show less"; custom text; `{"hidden":2,"total":4}` | "Show more"/"Show less"; "Show 2 more" with counts `{"hidden":2,"total":4}`; "Fewer details" | `api.ts` q7 | passed | Evidence: `api.ts` q7 (4 assertions) |
| V-08 | C-08; real input | Click; Tab+Enter; Space; cancel | Opens/closes, reason `trigger-press`, cancel keeps state, focus on Trigger | Real click and Enter opened; Space closed; focus log ends on `tp-description-list>tp-button>button`; canceled event left `open` false, reason `trigger-press`; `onOpenChange` called once | MCP click/press_key; `api.ts` q3 | passed | Evidence: MCP press_key/click + focusin log; `api.ts` q3 |
| V-09 | C-09; API | `default-open`; programmatic `open`; completion | Starts open; `tp-open-change-complete` `{ open:false }` after exit | `default-open` started open with pairs unconcealed; `tp-open-change-complete` detail `{ open: false }` after closing, then pairs concealed | `api.ts` q4 | passed | Evidence: `api.ts` q4 (5 assertions) |
| V-10 | C-10; API | `disabled` | No state change; button disabled, `tabIndex` -1 | `disabled` kept `open` true after `click()`; inner button `disabled`, `tabIndex` -1 | `api.ts` q3 | passed | Evidence: `api.ts` q3 disabled |
| V-11 | C-11; motion | Open, close, reversal after 90ms, `motion-policy="reduce"` | Height animates between collapsed and full extents; values and first Item fixed; concealed after exit | 87→186→87px; first top 101, value left 135 constant; reduce instant | MCP rAF sampling | passed | Evidence: per-frame samples of Viewport height, first pair top and first value left (open, close, reversal, reduced) |
| V-12 | C-01, C-03, C-12; a11y tree + axe | Snapshot and axe closed/open, light and dark | DescriptionList > term/definition; hidden pairs absent; Viewport unnamed; no axe violations | Tree as expected; axe light: 0 violations (fixture, 4 Storybook lists); dark: only `color-contrast` on the success Badge | `take_snapshot` (`a11y-tree-closed.txt`); injected axe 4.13.0 | passed | Dark success Badge contrast is the known token gap shown on the Design tokens page, not this component |
| V-13 | C-03, C-06; keyboard/focus | Tab from page start, Enter, Shift+Tab, Tab, Space | Hidden link skipped while closed; Trigger ring; link reachable when open; focus kept | Focus order: Trigger (hidden link skipped) → Enter → Shift+Tab reaches "Shared tap, row C" → Tab → Trigger; `:focus-visible` true, 2px solid ring | MCP press_key; focusin log | passed | Evidence: MCP press_key + focusin log; `focus-closed-dark.png` |
| V-14 | C-13; find in page | Same-document text-fragment navigation into `#found` | List opens; match revealed | `open: true`, `hidden` removed | MCP navigate `#:~:text=` | passed | `window.find` does not fire `beforematch` in Chrome (same for Collapsible) |
| V-15 | C-14, C-15; visual | Light/dark, horizontal/vertical, open/closed | Shared label column incl. hidden Items; muted labels; spacing | Labels rgb(161,161,170) muted, values foreground, 14px; label column shared by visible and hidden pairs (value left constant 135 open/closed); vertical stacks label above value | `v2-open-dark.png`, `docs-record-details.png`, `docs-counted.png`, `v2-docs-card.png` | passed | Evidence: `v2-open-dark.png`, `docs-record-details.png`, `v2-docs-card.png`, `docs-counted.png`; `api.ts` q6, q7 |
| V-16 | C-14; visual | RTL, 400px page minimum, long label and URL value | Mirrored; wrapping; no overflow | Re-run on the final structure: column 147.195px (40% of 368px), labels at the inline-start right edge (237–384), values 16–221, long label and URL wrap; `scrollWidth` 400 = `clientWidth` | `v2-rtl-400-light-open.png` + geometry | passed | 320px is below the library's 400px body minimum |
| V-17 | C-15, C-17; customization | Token override, `::part()`, `partPresentation`, `partContracts` | Applied; focus and state kept; reset restores | Re-run on the final structure: labels rgb(200,0,0) from the token override; `::part(description-list)` gap 40px; `::part(description-list-value)` weight 600 (inherited by the Item); `::part(description-list-viewport)` outline; `partPresentation` uppercase; `partContracts` "4 more" then "Hide"; focus stayed on `tp-button`; reset restored "Show less" and the muted color | MCP evaluate | passed | Evidence: MCP evaluate on the fixture after the S-3 restructure |
| V-18 | C-18; standalone + package | `standalone/?component=TpDescriptionList`; fixture `?package` | Only own dependencies defined; styled; 42 assertions on dist | Standalone: list, item, button, icon, spinner defined; badge, collapsible, card, list undefined; labels styled rgb(161,161,170). `?package` fixture: 42/42 | MCP evaluate | passed | Evidence: MCP evaluate on `standalone/?component=TpDescriptionList` and `description-list/?package` |
| V-19 | C-19; docs | Storybook Docs and Default story args | Base example first, API, 3 examples; Controls drive the element | Docs headings: Default, Public properties, Items, Layout, Show more, Accessibility, API, Styling, Usage examples (Record details, Stacked labels, Counted button text); story args `limit:2;orientation:vertical;showMore:More details` gave `limit` 2, vertical, hidden 4, text "More details" | MCP navigate + screenshots; `args=limit:2;orientation:vertical;showMore:…` | passed | Evidence: Storybook :6006 Docs and iframe; `docs-top.png`, `docs-record-details.png`, `docs-counted.png`, `v2-docs-card.png` |
| V-20 | C-12 (shared repairs); regression | Collapsible story after controller and styles changes | Content keeps `role=region` labelled by trigger; panel closes to 0 | Collapsible content `role=region`, `aria-labelledby` = `tp-collapsible-trigger-3`, `aria-controls` = content id | Storybook :6006 snapshot evaluate; unit tests 224 files pass | passed | Evidence: Storybook `components-collapsible--default` evaluate; vitest 224 files pass |

## Early integration checkpoint

| ID   | Check                                                                                             | Status  | Evidence / unresolved finding                               |
| ---- | ------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------- |
| I-01 | Shared owners are actually used by related consumers; old duplicate behavior is removed/delegated | passed | `description-list.ts` uses `CollapsibleController` (trigger relationship, presence markers, hidden-until-found, beforematch), `DisclosurePanelController`, `DisclosureIndicator`, `disclosurePanelStyles`, and composes `TpButton` through `compositeControl` like `TpCollapsible.triggerElement`; no local disclosure state machine. Shared repairs default to previous behavior; Collapsible story re-checked (V-20). |
| I-02 | Default visual regions match traced source and shared library recipes                             | passed | Fixture and Storybook screenshots: muted labels/foreground values at 14px, shared label column, link Trigger in muted foreground with trailing chevron and zero inline padding. Found and fixed: Button's transparent inline border offset the Trigger text 1px from the labels. Re-checked after the S-3 restructure (`v2-open-dark.png`, `v2-docs-card.png`). |
| I-03 | Independent constituent options work, including placement separately from action behavior         | passed | `api.ts` 42/42 (source and dist) covering limit, membership, messages, cancelation, `onOpenChange`, `disabled`, `default-open`, completion, Viewport naming, hidden-until-found and orientation; real keyboard and pointer input. Findings S-3 (axe content model) and S-4 (hidden-until-found column) reopened gates 1–2 and were resolved through spec amendments and the restructure. |

## Gate record

| Gate                                  | Status  | Required exit evidence / remaining work                                               |
| ------------------------------------- | ------- | ------------------------------------------------------------------------------------- |
| 0. Sources and scope                  | passed  | Spec read at v0.25.0 and amended to v0.27.0 (S-1, S-3, S-4); references ui 63c1308d1 and base-ui 5b495488d clean; scope is the user request. |
| 1. Capability mapping                 | passed  | C-01–C-19 mapped to udl-q1–q7 and the v0.27.0 definition tables; S-1–S-4 resolved. |
| 2. Architecture and composition reuse | passed  | Family map: CollapsibleController (repairs), DisclosurePanelController, disclosurePanelStyles (closed extent), DisclosureIndicator, TpButton; presentation map traced to bubble-collapsible, base-ui DescriptionList.css and sera asset-details; reopened by S-3 and passed again after the restructure. |
| 3. Behavior                           | passed  | V-01–V-11, V-13, V-14 passed (API, real keyboard/pointer, text-fragment find). |
| 4. Presentation and customization     | passed  | V-15, V-17: recipe roles, token override, `::part()`, `partPresentation`, `partContracts` without losing focus or state. |
| 5. Accessibility                      | passed  | Tree (V-12), keyboard/focus (V-13) and axe (V-12) recorded separately; no screen-reader run claimed. |
| 6. Visual and interaction inspection  | passed  | V-11, V-15, V-16: light/dark, horizontal/vertical, RTL, 400px, long content, open/close/reversal motion. |
| 7. Documentation and demo reuse       | passed  | V-19: Docs page (Default first, API tables, Record details with Card/Badge/Time/Copy button, Stacked labels, Counted button text); Controls drive the element. |
| 8. Regression and reconciliation      | passed  | `npx vitest run` 224 files / 2039 tests pass; `npm run lint` passes; `tsc -p tsconfig.build.json` passes; `npm run build` + CEM; `size-report` exit 0; `pack-smoke` passes; Collapsible regression V-20; `?package` fixture 42/42. |

## Documentation synchronization

- [x] Base example, actual Controls, constituent APIs and reference agree with code.
- [x] Added/removed/changed properties, events, methods, slots and hooks are updated.
- [x] Verification fixtures are separate from curated public examples.
- [x] Rendered and copyable compositions reuse existing components.
- [x] Imports and registration work outside Storybook's global setup.
- [x] Generator handling and changed tests preserve the intended documentation.

## Completion / handoff

- Change summary: new `tp-description-list` / `tp-description-list-item` (one native `dl`, label attribute + value content, `limit` with a link-Button Show more/Show less that animates through the Collapsible disclosure owners); CollapsibleController `labelContent`/`hideContent`; `disclosurePanelStyles` closed extent; spec CL §22.9 (v0.27.0).
- Actual delivery claim: complete component per CL §22.9 v0.27.0, verified in Chrome only.
- Record checker: `implement` and `verify` passed earlier; `complete` run at handoff.
- Non-browser checks: vitest 224 files pass; lint passes; build-config type check passes; build passes; size report and pack smoke pass. Storybook static build not run (dev server Docs verified).
- Behavior: V-01–V-11, V-13, V-14 passed.
- Accessibility: Chrome accessibility tree and real keyboard checks passed; axe clean in light theme; no screen-reader testing performed.
- Visual/customization/motion inspection: passed (V-11, V-15–V-17).
- Documentation and demo composition reuse: passed (V-19).
- Shared-consumer regressions / package boundaries: Collapsible story unchanged (V-20); standalone and `?package` fixtures pass (V-18).
- Required failures or blocked checks: none.
- Older out-of-scope gaps: dark-theme success Badge pair fails axe color contrast (known token gap, shown on the Design tokens page).
- Changed source revisions / reopened gates: spec v0.25.0 → v0.27.0; gates 1–2 reopened by S-3/S-4 and re-passed; browser rows re-run after the restructure.
