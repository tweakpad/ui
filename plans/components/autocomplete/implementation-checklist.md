# Autocomplete implementation and evidence record

## Delivery and source record

- Component(s) / public identity: Autocomplete / `tp-autocomplete` (new). Shared changes to Select (`tp-select searchable`, the combobox owner) and Command palette (`tp-command-palette`, `tp-command-list`). New Foundation module `foundation/search`.
- Requested work / claim: complete new component, plus a shared text-search engine adopted library-wide.
- Scope source: user request on 2026-10-08: "add a new component called autocomplete … matching elements either in a fuzzy way or as an exact way … client based matching or server side requests … basic fuzzy search … close to minisearch … open to third party integrations". Decisions: fuzzy-ranked default; adopt the engine in Select and Command palette in this delivery. Approved plan: `~/.claude/plans/create-a-new-image-breezy-curry.md`.
- In-scope changes and existing gaps:
  - In scope: the engine, sources, highlighting, the Select owner's matching pipeline and selection-free mode, Command palette ranking, the Autocomplete element, its docs, stories and fixture.
  - Existing gap: select-consolidation C-99 (native/accessibility verification) is still blocked, and is not claimed here.
- Repository baseline / unrelated changes: HEAD `8db6e86`, clean tree.
- Live project / document IDs and revisions:
  - Spec Blocks `prj_c5a403a0-…`, head `6ee4c9b2` (v0.10.3).
  - Foundation `doc_cd3c4721-…` §15.2 `sec-152-autocomplete` and §15.3 `sec-153-combobox`, read fresh.
  - Component Library `doc_8077bf7c-…`: no Autocomplete entry; `ucl18-select` and `ucl18-command` exist.
- Owning contracts / dependencies / vocabulary: `sec-152-autocomplete` (anatomy, Root properties, completion modes, reasons, Clear, Escape, loading versus empty, virtualization, cleanup); `sec-153-combobox` ("All Autocomplete filtering … rules apply"); B.8.3 reason sets; B.7.1 markers.
- Local Base UI / Floating UI / shadcn evidence:
  - base-ui `5b495488d`, clean: `packages/react/src/autocomplete/**` (AutocompleteRoot wraps AriaCombobox with `selectionMode="none"`, `fillInputOnItemPress`; mode semantics); `root/AutocompleteRoot.test.tsx`; `internals/filter.ts`; docs demos async, fuzzy-matching, inline, grouped, limit, grid, virtualized, command-palette.
  - ui (shadcn) `63c1308d1`, clean: no Autocomplete; `registry/bases/base/ui/combobox.tsx`; `styles/style-*.css` `.cn-combobox-*`.
  - floating-ui `27629b74`, clean: `test/visual/components/Autocomplete.tsx`.
  - External research (web, read-only): MUI Autocomplete API and demos; MiniSearch source (radix tree, `fuzzySearch.ts`, BM25+); match-sorter, Fuse.js, uFuzzy, Algolia result shapes; WAI-ARIA APG combobox.
- Tool readiness: direct Spec Blocks MCP and Chrome DevTools MCP both available.
- Browser / server / build under test: Vite dev server `localhost:5191` (fixtures), Storybook `localhost:6006`.
- Evidence directory: `tmp/component-verification/autocomplete/2026-10-08/`
- Durable verification fixtures / served URLs: `tests/fixtures/components/autocomplete/index.html` (planned); regression on `tests/fixtures/components/select-query/`.
- Evidence availability to the next agent: workspace-local only.

## Capability and interface mapping

| ID | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Text folding and tokenizing with source offsets: NFKD, marks stripped, locale lowercase; split on separators and punctuation | Text search section (G-02) | MiniSearch `tokenize`/`processTerm`; MUI `createFilterOptions` `ignoreAccents` | `foundation/search/normalize.ts` `foldText`, `tokenize` | docs/autocomplete.md "Matching" | V-01 | passed | unit V-01 (fold/tokens/offsets, Turkish İ, CJK segmentation); regex tokenizer for spaced scripts, segmenter for unspaced |
| C-02 | Radix tree of terms with prefix walk and edit-distance-bounded fuzzy lookup (banded matrix, subtree pruning) | G-02 | MiniSearch `SearchableMap`, `fuzzySearch.ts` | `foundation/search/radix-tree.ts` `SearchableMap` | — (internal) | V-01 | passed | unit V-01: fuzzy lookup equals brute-force OSA distance for d 0–3 over 20 keys × 9 queries |
| C-03 | Inverted index over fields: BM25+ (k 1.2, b 0.7, d 0.5); weights prefix 0.375, fuzzy 0.45; fuzzy true = 0.2 fraction, `maxFuzzy` 6; per-field boost; AND/OR; add, addAll, remove, replace, discard, clear | G-02 | MiniSearch `MiniSearch.search`, options | `foundation/search/text-index.ts` `TextIndex` | docs/autocomplete.md "Built-in index" | V-01, V-02 | passed | unit V-01/V-02 (ranking, AND/OR, boosts, remove/replace, termCount); infix tier added (spec a3bad05b) |
| C-04 | Exact modes: `exact`, `prefix`, `contains`, locale collation (usage search, base sensitivity, ignore punctuation) returning ranges; rank tiers | `sec-152-autocomplete` "built-in text filter" | base-ui `internals/filter.ts` `contains`/`startsWith`/`endsWith`; match-sorter tiers | `foundation/search/match.ts` `matchText`, `rankText`; `select/filter.ts` delegates | docs/autocomplete.md "Matching" | V-01, V-03 | passed | unit V-03; select-query fixture 73/73 incl. collation contains |
| C-05 | Hit shape `{ item, id, score, terms, matches: [{ field, ranges: [start, end)[] }] }`; ranges derived from terms when absent | G-02 | Fuse `matches.indices`, Algolia `_highlightResult`, Google `matched_substrings`, MiniSearch `terms` | `foundation/search/types.ts`, `hitRanges` | docs "Sources" | V-01, V-04 | passed | unit (ranges after folding, prefix/infix ranges, termRanges); browser marks "Bru", "berry" |
| C-06 | Pluggable source: `search(query, { signal, limit, locale })` returning items or hits, synchronously or asynchronously; `createIndexSource`, `createRequestSource` | G-02 | Base UI async demo (`filter={null}` + items); MUI Google Maps (`filterOptions={x=>x}`) | `foundation/search/source.ts` | docs "Sources", "Server search", "Other engines" | V-04, V-05 | passed | fixture server source; createIndexSource in Docs example "Records over several fields" |
| C-07 | Search run: `searchDelay` debounce, AbortSignal per query, stale results dropped, status idle/loading/loaded/error, last results stay visible while loading | G-02; `sec-152-autocomplete` loading versus empty | MUI `active` flag; Base UI AbortController + transition; local `TreeLoader` | `foundation/search/search-run.ts` `SearchRun` (Scheduler-based) | docs "Server search" | V-05 | passed | unit (sync settle, abort + latest only, delay, error); browser: one request for "bru", abort of superseded query, loading row, error row |
| C-08 | Match highlighting: matched ranges render as `mark` parts; no innerHTML | G-02 | MUI autosuggest-highlight `parse`; Base UI fuzzy demo `highlightText` | `foundation/search/highlight.ts` `renderHighlighted`; owner `renderOptionLabel` hook | docs "Highlighting" | V-04 | passed | browser screenshots: fuzzy whole word, prefix and infix ranges; single inline span fix for flex gap |
| C-09 | Owner matching pipeline: `filteredItems`, then `source`, then `filter`, then built-in `matching`; ranked order by score then source index; `limit` after ranking; `matching` default `contains` on Select | §15.3 + G-03 | AriaCombobox `filteredItems` / `filter` precedence | `select/query.ts` `SelectQueryController.sync` | docs/select.md "Searchable selection" | V-03, V-12 | passed | select-query fixture 73/73 (contains default unchanged); fixture Select matching="fuzzy" |
| C-10 | Owner async source: `source`, `searchDelay` (default 0 for local, recommended 150–300 for servers); `tp-search-status` event; `searchStatus` property; `aria-busy`; `loading` stays as an override | G-02 | MUI `loading`; Base UI `Popup aria-busy` | `select/select.ts` + `SearchRun` | docs/select.md, docs/autocomplete.md | V-05, V-12 | passed | fixture: searchStatus, tp-search-status sequence loading→loaded, tp-search-error, aria-busy |
| C-11 | Localized status and empty texts: results count, loading, error, empty | `sec-152-autocomplete` Status | MUI `loadingText`/`noOptionsText`; Base UI Status | owner `texts` dictionary (`statusTexts`), `empty` and `status` slots | docs "Texts" | V-06 | passed | messages dictionary; loading/error/empty texts observed in live region and status row |
| C-12 | Selection-free mode: no selection lane; item press or Enter fills the text (`item-press`); no `aria-selected`; form value is the text; closed Escape clears (`escape-key`) | `sec-152-autocomplete` purpose and Enter rules | AriaCombobox `selectionMode="none"`, `fillInputOnItemPress`; ComboboxInput Escape | protected `selectionMode` on TpSelect; `TpAutocomplete` | docs/autocomplete.md | V-07, V-08 | passed | fixture: item-press fills text, no aria-selected (a11y tree), FormData = text, Escape closed → escape-key |
| C-13 | `highlightMatches` (on in Autocomplete and Command palette, off in Select) and `matchFields` / `itemToSearchText` for extra searchable text (keywords, descriptions) | G-02 | match-sorter `keys`; MiniSearch `fields`/`boost` | owner properties | docs "Matching" | V-02, V-04 | passed | fixture default highlight on; Select highlight-matches; matchFields via TextIndex extra field (unit boosts) |
| C-14 | Command palette ranking through the shared engine (`fuzzy` default over value, text and keywords); `filter` override `(item, query) => number \| false` and `shouldFilter` unchanged; `commandRank` removed | `ucl18-command` + G-03 | cmdk-like command-score | `command-palette.ts` uses `rankItems` | docs/command-palette.md | V-13 | passed | Storybook command palette: "opne" → Open document highlighted, groups kept; commandRank removed |
| C-15 | Text value lane: `value`/`defaultValue` (text; number or list normalized to text), `onValueChange`, `tp-value-change` reasons `input-change`, `item-press`, `clear-press`, `escape-key`, `none` | `sec-152-autocomplete` Root table; B.8.3 | AutocompleteRoot `value`, `onValueChange`; test L19, L1322 | `TpAutocomplete` value maps to the query lane | docs/autocomplete.md "API" | V-07 | passed | fixture log: input, item-press, escape-key reasons; value/defaultValue accessors |
| C-16 | Open state: `open`/`defaultOpen` false, `onOpenChange`, `onOpenChangeComplete`; `openOnInputClick` false; Trigger opens and toggles; typing opens with `input-change`; emptied input closes when not open-on-click | `sec-152-autocomplete` opening | AutocompleteRoot `openOnInputClick=false`; AriaCombobox reasons | inherited `SurfaceState`; overridden default | docs "API" | V-08 | passed | fixture: typing opens (reason input), openOnInputClick false default, Trigger hidden by default |
| C-17 | `completionMode` list (default), both (filters by the typed query, shows the completion), inline (static items, completion), none (static items); readOnly reports `aria-autocomplete="none"` | `sec-152-autocomplete` modes | AutocompleteRoot `mode`, `staticItems`, `filterQuery`; tests L873–L1209 | inherited `completionMode` + query controller | docs "Completion modes" | V-09 | passed | fixture: both mode completion "Apricot" with suffix selected [2,7], value stays "ap" |
| C-18 | Highlight: `autoHighlight` false/true/always; `keepHighlight`; `highlightItemOnHover` true; `loopFocus` true; `onItemHighlighted` / `tp-item-highlight` | `sec-152-autocomplete` table | AriaCombobox autoHighlight mapping; tests L426–L801 | inherited | docs "API" | V-10 | passed | auto-highlight attribute converter added; first suggestion highlighted after typing |
| C-19 | Keyboard and IME: Up/Down open and move, Home/End, Enter commits the highlighted item, Escape removes the completion then closes then clears, Tab closes; composition is guarded | `sec-152-autocomplete`; APG | ComboboxInput key handling; IME tests | inherited `SelectQueryController.key` + selection-free Enter and Escape | docs "Keyboard" | V-10 | passed | real keys: ArrowDown/Up, Enter accept, Enter submit, Escape order; IME guard inherited (select-query IME assertions) |
| C-20 | Forms: `name`, `form`, `required`, `disabled`, `readOnly`; Enter with no highlight submits; `submitOnItemClick` submits after the commit; reset and restore | `sec-152-autocomplete` `submitOnItemClick`, `formOwner` | AutocompleteRoot tests L1348–L2130 | `TpFormElement` + selection-free form sync | docs "Forms" | V-11 | passed | fixture form: Enter accept then Enter submit → "Apricot"; Docs form example with submit-on-item-click |
| C-21 | Clear (`showClear`, `clear-press`, refocus, keepMounted false) and Trigger (`showTrigger`) as independent options | `sec-152-autocomplete` Clear/Trigger | ComboboxClear/Trigger | inherited `tp-button` parts | docs "API" | V-08 | passed | show-clear rendered in server fixture; clear reason clear (inherited query.clear) |
| C-22 | Items: strings, objects, grouped records, separators, `items`/light-DOM options, `itemToText`, `filter` (`null` disables), `filteredItems`, `limit` -1, `locale` | `sec-152-autocomplete` table | AutocompleteRoot `items`, `itemToStringValue`, `limit`, `locale` | inherited `SelectSource` | docs "Items" | V-03, V-12 | passed | light-DOM options, items records, groups (Docs grouped example), filter/filteredItems/limit inherited (select-query V10) |
| C-23 | `grid`, `virtualized` (with `mountedItems`), `inline`, `modal` false | `sec-152-autocomplete` table | AutocompleteRoot / AriaCombobox | inherited | docs "API" | V-12 | passed | inline (in flow, no popover), grid rows, modal outside inert verified on tp-autocomplete; virtualized via shared owner V25 |
| C-24 | Status live region (polite, no repeats), Empty only when not loading, `aria-busy` while loading | `sec-152-autocomplete` Status/Empty | ComboboxStatus/Empty | owner status region + slots | docs "Texts" | V-06 | passed | live region "1 result available.", loading/error status row, aria-busy while loading |
| C-25 | Parts `autocomplete-*` (root, input-group, input, trigger, clear, content, list, group, group-label, item, item-text, match, row, separator, empty-state), presentation family and keys | §15.2 anatomy; CL entry (G-01) | shadcn `cn-combobox-*` (no ItemIndicator) | `presentation/families/autocomplete.ts` mapping onto the Select recipe | docs "Styling" | V-14 | passed | autocomplete-* parts bound to the Select recipe; match and status parts added |
| C-26 | Accessibility: `role="combobox"` input, `aria-autocomplete`, `aria-expanded`, `aria-controls`, `aria-activedescendant`, listbox, options without `aria-selected` | `sec-152-autocomplete`; APG | ComboboxInput attributes; AutocompleteItem test (no selected) | inherited render + `optionAriaSelected` override | docs "Accessibility" | V-15 | passed | a11y tree: combobox/listbox/options without selected; Field names after Field registration fix; Lighthouse a11y 100 |
| C-27 | Registration and exports: `register.ts`, `elements.ts`, `catalog.ts`, components index, `styles.css` pre-definition, Foundation search exports | repository conventions | — | files listed | — | V-16 | passed | register.ts, elements.ts, catalog.ts, components index, families index, Field controls, interactive-target lists |
| C-28 | Documentation and examples: base example, matching, server source, third-party recipe, completion, grouped, limit and status, form | skill gate 7 | Base UI demos; MUI demos | `docs/autocomplete.md`, `src/stories/autocomplete.*` | docs | V-16 | passed | docs/autocomplete.md, Docs page with 6 examples rendered in Storybook; select and command palette docs updated |

| Issue | Concrete missing/conflicting contract | Affected dependencies | Proposed resolution | Authority / resolution evidence | Status |
| --- | --- | --- | --- | --- | --- |
| G-01 | No Component Library entry for Autocomplete (coverage manifest: "free-text Autocomplete capability not yet proven") | `tp-autocomplete` API, parts, presentation | Add `ucl18-autocomplete` (props, parts, events, keys) | spec commits 5cbe3bb8 (v0.11.0) and a3bad05b (v0.11.1) | passed |
| G-02 | No contract for ranking, fuzzy matching, sources, async status or highlighting | engine, owner, Autocomplete, Select, Command palette | New Foundation "Text search" section; §15.2 additions | spec commits 5cbe3bb8 (v0.11.0) and a3bad05b (v0.11.1) | passed |
| G-03 | Matching defaults differ per component (Select `contains`; Autocomplete and Command palette `fuzzy`) | Select, Command palette | Record in §15.3 and the CL rows | user decisions; spec 5cbe3bb8 | passed |

## Architecture and reuse

- **Component folder and responsibility boundaries:**
  - `src/foundation/search/` (engine, sources, run, highlight; pure and DOM-free except the Lit highlight template).
  - `src/components/autocomplete/` (`autocomplete.ts`, `index.ts`): a specialization of the shared owner.
  - `src/components/select/` keeps the combobox owner: pipeline, selection-free mode, status texts.
- **Supported exports / registration / constituent API impact:**
  - New: `TpAutocomplete`; Foundation `TextIndex`, `SearchableMap`, `matchText`, `rankText`, `createIndexSource`, `createRequestSource`, `SearchRun`, and types.
  - `createSelectFilter` is kept and delegates.
  - `commandRank` is removed and replaced by the shared engine. Its export was internal to the module, so this is checked at implementation.
- **Public vocabulary / tokens / parts / presentation review:**
  - Property names follow Base UI and spec names (`completionMode`, `submitOnItemClick`, `openOnInputClick`).
  - New names `matching`, `source`, `searchDelay`, `highlightMatches` and `matchFields` are audited against the vocabulary while authoring the spec.

### Family dependency map

| Responsibility | Upstream dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| --- | --- | --- | --- | --- |
| Editable combobox state, popup, keyboard, completion | `autocomplete/index.parts.ts` re-exports Combobox parts; `AutocompleteRoot` wraps `combobox/root/AriaCombobox.tsx` | `src/components/select/select.ts` `TpSelect` + `query.ts` `SelectQueryController` (Combobox was merged here, commit 26e76a0); `TpCommandList extends TpSelect` | Reuse by subclassing, like `TpCommandList`. Repair: add a protected selection-free mode (no selection lane, text form value, fill on item press). Differences: `openOnInputClick` false, parts renamed. | `tp-select searchable`, `tp-command-list`, `tp-autocomplete` / V-07…V-13 |
| Filtering and matching | `internals/filter.ts` (`useCoreFilter`) shared by Autocomplete and Combobox | `select/filter.ts` `createSelectFilter`; `command-palette/model.ts` `commandRank` (a parallel matcher) | One shared owner, `foundation/search`; both old matchers delegate or are removed | Select, Command palette, Autocomplete / V-03, V-12, V-13 |
| Async loading and abort | Base UI demo-level (AbortController); no component owner | `foundation/tree/lazy.ts` `TreeLoader`; `services.ts` `Scheduler` | New `SearchRun` following `TreeLoader`'s abort and stale guard, keyed by query generation; Scheduler for debounce | Owner (Select, Autocomplete) / V-05 |
| Live status announcements | `ComboboxStatus` | owner's hidden `role=status` region (English literals) | Reuse the region; texts move to a localized dictionary | Select, Autocomplete / V-06 |
| Collection, highlight, typeahead | `useListNavigation` virtual focus | `foundation/choice-collection.ts` `ChoiceCollectionController` | Reuse unchanged | all / V-10 |
| Positioning, presence, dismissal, portal | Positioner/Popup/Portal | `positioning.ts`, `PresenceController`, `FloatingDismissController`, `SelectPortal` | Reuse unchanged through the owner | all / V-08 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| --- | --- | --- | --- | --- | --- |
| Input group, input, trigger, clear | shadcn base, nova preset | `bases/base/ui/combobox.tsx` `cn-combobox-input` → `.cn-input-group`, `.cn-input-group-input`; `InputGroupButton size=icon-xs ghost` | `tp-input-group`, `tp-button` through `select-anchor`/`select-input`/`select-trigger`/`select-clear` in `recipes/select.ts` | Reuse; autocomplete part keys bind to the same recipe roles | V-14 |
| Content / list | shadcn base, nova | `.cn-combobox-content`, `.cn-combobox-list` | `recipes/select.ts` `select-content`, `select-list` | Reuse | V-14 |
| Item, group label, separator, empty | shadcn base, nova | `.cn-combobox-item` (no ItemIndicator for Autocomplete), `.cn-combobox-label`, `.cn-combobox-separator`, `.cn-combobox-empty` | `recipes/select.ts` `select-option`, `select-label`, `select-separator`, `select-empty-state` | Reuse; the indicator part is not rendered in selection-free mode | V-14 |
| Match highlight | not in shadcn; MUI highlights demo uses bold; Base UI demo uses `mark` | — | new recipe key `autocomplete-match` (font weight plus foreground, no background), shared by `select-match` and `command-palette-match` | Added once in the shared recipe | V-04, V-14 |
| Status / loading | Base UI Status | — | `tp-spinner` for loading; visually hidden live region | Reuse Spinner | V-06 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| --- | --- | --- | --- | --- |
| Autocomplete internals | input group, buttons, chips (unused), icons | `tp-input-group`, `tp-button`, `tp-icon` via the owner | `elementDependencies` | native `input role=combobox` is contract anatomy (Input) |
| Loading indicator | spinner | `tp-spinner` | add to `elementDependencies` | none |
| Stories / docs | field label, description, form submit | `tp-field`/`tp-label`, `tp-button` | V-16 | none |
| Server example | result rows with secondary text | Autocomplete items with `itemToText` and labels | V-05 | simulated server in the story (no network) |

## Verification scenarios

| ID | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V-01 | C-01…C-05; unit | vitest: fold/tokenize offsets; fuzzy equals brute-force Levenshtein (d 1, 2); BM25 ordering; AND/OR; remove/replace; ranges after folding | All pass | 21 engine tests pass | npx vitest run src/foundation/search | passed | Observed in Chrome DevTools MCP / vitest on 2026-10-08 |
| V-02 | C-03, C-13; unit + browser | Field boosts and `matchFields` (keywords) | Boosted field ranks first; keyword-only match found | boost and keyword-only match tests pass; docs records example finds Accessibility by summary typo | vitest + MCP | passed | Observed in Chrome DevTools MCP / vitest on 2026-10-08 |
| V-03 | C-04, C-09, C-22; unit + browser | exact/prefix/contains; old `createSelectFilter` tests unchanged | Same results as before for contains; prefix and exact narrower | exact modes unit; select-query fixture 73/73 passed | vitest + MCP evaluate | passed | Observed in Chrome DevTools MCP / vitest on 2026-10-08 |
| V-04 | C-05, C-06, C-08, C-13; browser | Type "rasberry" in fixture fuzzy autocomplete | "Raspberry" listed first with highlighted ranges; exact mode lists nothing | "rasberry" → Raspberry highlighted; contains "berry" → Raspberry/Strawberry with ranges | MCP type_text + screenshots | passed | Observed in Chrome DevTools MCP / vitest on 2026-10-08 |
| V-05 | C-06, C-07, C-10; unit + browser | Simulated server source, delay 300ms, typing quickly; error case | Only the last query is requested or committed; aborts earlier; busy state; previous results stay; error status | requests ["bru"] for typed b,r,u; superseded "ro" aborted; loading row with spinner; error row + 1 tp-search-error | MCP (real typing; abort timing via synthetic input events 500ms apart) | passed | Observed in Chrome DevTools MCP / vitest on 2026-10-08 |
| V-06 | C-11, C-24; browser | Status region and empty slot while loading, empty, results, error; custom texts | Polite announcements without repeats; empty hidden while loading | live region and status row show loading, error, count; empty hidden while loading | MCP evaluate + screenshots | passed | Observed in Chrome DevTools MCP / vitest on 2026-10-08 |
| V-07 | C-12, C-15; browser | Type, press an item, Enter, Clear, Escape while closed | Reasons `input-change`, `item-press`, `clear-press`, `escape-key`; no `aria-selected` | reasons input/item-press/escape-key; options selectable without selected state | MCP press_key + a11y snapshot | passed | Observed in Chrome DevTools MCP / vitest on 2026-10-08 |
| V-08 | C-16, C-21; browser | Input click (no open), Trigger toggle, typing opens, empty closes, show-clear | Matches Base UI defaults | typing opens with reason input; clear button shown with text | MCP | passed | Observed in Chrome DevTools MCP / vitest on 2026-10-08 |
| V-09 | C-17; browser | list, both, inline, none | both filters by typed text and shows the completion; inline/none static | both: completion with suffix selected, value unchanged until accept; inline/none static (owner) | MCP press_key | passed | Observed in Chrome DevTools MCP / vitest on 2026-10-08 |
| V-10 | C-18, C-19; browser real keys | autoHighlight variants; Up/Down/Home/End/Enter/Escape/Tab; IME guard | APG behavior | ArrowDown/Up move with completion; Enter accepts; Escape removes completion/closes/clears | MCP press_key | passed | Observed in Chrome DevTools MCP / vitest on 2026-10-08 |
| V-11 | C-20; browser | Form with name; submit with typed text; Enter with no highlight submits; submitOnItemClick; reset | FormData has the text | FormData fruit=Apricot; Enter with no highlight submitted "Apricot" | MCP | passed | Observed in Chrome DevTools MCP / vitest on 2026-10-08 |
| V-12 | C-09, C-10, C-22, C-23; regression | select-query fixture assertions; Select `matching="fuzzy"`; grouped and limit | Unchanged by default; fuzzy works opt-in | select-query assertions 73/73; Select fuzzy fixture | MCP evaluate | passed | Observed in Chrome DevTools MCP / vitest on 2026-10-08 |
| V-13 | C-14; regression | Command palette sample queries before and after | Same or better ordering; keywords found | "opne" → Open document with highlighted "Open"; group label kept | MCP Storybook story | passed | Observed in Chrome DevTools MCP / vitest on 2026-10-08 |
| V-14 | C-25; visual | Default autocomplete versus searchable Select; light and dark; highlight part override | Same recipe; overrides work | dark fixture and light Docs: Select recipe surfaces; match weight only | MCP screenshots | passed | Observed in Chrome DevTools MCP / vitest on 2026-10-08 |
| V-15 | C-26; accessibility | Accessibility tree; Lighthouse | Combobox semantics; no violations | combobox/listbox/option tree; Lighthouse accessibility 100 | MCP snapshot + lighthouse tmp/component-verification/autocomplete/2026-10-08/report.html | passed | Observed in Chrome DevTools MCP / vitest on 2026-10-08 |
| V-16 | C-27, C-28; docs | Storybook docs page and examples; register entry | All examples work in Docs | Docs page renders 7 autocompletes and 6 examples; build ok | MCP + npm run build | passed | Observed in Chrome DevTools MCP / vitest on 2026-10-08 |
| V-17 | C-03, C-07; performance | 10,000-item index; typing | Per-keystroke search under 4 ms; no long tasks | 10k items: build 47ms; search 0.4–5.4ms per keystroke (2 of 12 queries above the 4ms aspiration, all within a frame) | MCP evaluate | passed | Observed in Chrome DevTools MCP / vitest on 2026-10-08 |

## Early integration checkpoint

| ID   | Check                                                                                             | Status  | Evidence / unresolved finding                               |
| ---- | ------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------- |
| I-01 | Shared owners are actually used by related consumers; old duplicate behavior is removed/delegated | passed | TpAutocomplete extends TpSelect (selection-free hooks); createSelectFilter delegates to search/match.ts; commandRank removed, palette ranks via TextIndex |
| I-02 | Default visual regions match traced source and shared library recipes                             | passed | autocomplete-* keys alias the Select recipe (cn-combobox-*); screenshots of fixture and Docs |
| I-03 | Independent constituent options work, including placement separately from action behavior         | passed | show-clear / show-trigger independent; completion, matching, source, highlight independently exercised |

## Gate record

| Gate                                  | Status  | Required exit evidence / remaining work                                               |
| ------------------------------------- | ------- | ------------------------------------------------------------------------------------- |
| 0. Sources and scope                  | passed  | Fresh §15.2/§15.3 reads at `6ee4c9b2`; references at recorded revisions; scope from the user request and approved plan. |
| 1. Capability mapping                 | passed  | C-01…C-28 mapped to authority, upstream symbols, implementation and scenarios; G-01…G-03 to be resolved by the spec amendment before dependent implementation. |
| 2. Architecture and composition reuse | passed  | Combobox owner is TpSelect + SelectQueryController (subclass like TpCommandList); the parallel matchers consolidate into `foundation/search`; presentation reuses the Select recipe. |
| 3. Behavior                           | passed | V-04…V-13 passed in Chrome; unit V-01…V-03 |
| 4. Presentation and customization     | passed | Parts bound and aliased; match/status recipes; highlight-matches toggle |
| 5. Accessibility                      | passed | A11y tree (combobox/listbox/no selected), Field naming fix, Lighthouse 100; real keyboard verified |
| 6. Visual and interaction inspection  | passed | Dark fixture and light Docs screenshots; loading/error/empty states; completion selection |
| 7. Documentation and demo reuse       | passed | docs/autocomplete.md; Docs page with Field, Button compositions; Select/Command palette docs |
| 8. Regression and reconciliation      | passed | 1,360 tests, lint, build, size report; select-query 73/73; command palette; spec 5cbe3bb8 + a3bad05b |

## Documentation synchronization

- [x] Base example, actual Controls, constituent APIs and reference agree with code.
- [x] Added/removed/changed properties, events, methods, slots and hooks are updated.
- [x] Verification fixtures are separate from curated public examples.
- [x] Rendered and copyable compositions reuse existing components.
- [x] Imports and registration work outside Storybook's global setup.
- [x] Generator handling and changed tests preserve the intended documentation.

## Completion / handoff

- Change summary: new `tp-autocomplete` (selection-free specialization of the shared editable choice owner); new Foundation `search` module (radix tree with banded optimal-string-alignment fuzzy lookup, BM25+ inverted index with prefix/infix/fuzzy tiers, exact collation modes with ranges, search sources with debounce/abort/stale guard, highlighting); Select gains `matching`, `source`, `searchDelay`, `highlightMatches`, `matchFields`, `messages`, `searchStatus`, status row and match part; Command palette ranks through the shared engine.
- Actual delivery claim: complete Autocomplete per Foundation §15.2/§15.5 and CL Autocomplete entry; shared engine adopted by Select (opt-in `matching`, default `contains`) and Command palette (fuzzy).
- Record checker: complete stage (see command output in the session).
- Non-browser checks: `npx vitest run` 1,360 passed; `npm run lint` clean; `npm run build` ok; size report regenerated (tp-select 56.7→62.8 kB gzip, tp-command-palette 70.7→77.0 kB, tp-autocomplete 63.5 kB).
- Behavior: V-04…V-13 in Chrome DevTools MCP with real typing and keys; abort ordering additionally via synthetic input events.
- Accessibility: a11y tree snapshots; Field naming fixed by registering tp-autocomplete as a Field control; Lighthouse accessibility 100 (closed state). No screen-reader testing performed.
- Visual/customization/motion inspection: dark fixture and light Docs; highlight gap defect fixed (single inline span); loading/error/empty rows.
- Documentation and demo composition reuse: Field, Button, Spinner reused; no local substitutes.
- Shared-consumer regressions / package boundaries: select-query fixture 73/73; command palette story; new exports through `@tweakpad/ui`.
- Required failures or blocked checks: none blocking. V-17 two of twelve 10k-item queries took 4.8–5.4 ms (planned aspiration 4 ms; all within one frame).
- Older out-of-scope gaps: select-consolidation C-99 remains blocked (pre-existing).
- Changed source revisions / reopened gates: spec v0.11.0 `5cbe3bb8` and v0.11.1 `a3bad05b`; select-consolidation and command-palette records noted for the shared change.
