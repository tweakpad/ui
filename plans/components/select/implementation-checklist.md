# Component implementation and evidence record

## Delivery and source record

- Component(s) / public identity: Select (`tp-select`); Field (`tp-field`) label hand-off.
- Requested work / claim: inline variant of Select: the label and the selected value in one compact row, in the normal font, sharing the inline row of the Slider; bounded to this variant.
- Scope source: user request 2026-10-29 ("We now need inline variants for the select … label and the selected value in a single line … by default the normal font").
- In-scope changes and existing gaps: `variant`, `label` default, `select-trigger-label` part, Field label ownership; searchable Select keeps its look (out of scope).
- Repository baseline / unrelated changes: `development` at a35dd81; slider work committed by the user.
- Live project / document IDs and revisions: UI Library `prj_c5a403a0-…`, Component Library §18.1 Select; amended at v0.47.6 (rows `slin-prop-0`, `slin-prop-1`, `slin-pub-0`, `slin-detail-0`, requirement `slin-q1`); Field ownership from Foundation `sltk-f2`.
- Owning contracts / dependencies / vocabulary: §18.1 Select; Foundation §14.3 Field (`sltk-f2`); review `ucl18-autocomplete-dep-2` approved (Autocomplete keeps its own `label` default).
- Local reference evidence: no reference has an in-row label; the inline row reuses the Slider's shared inline-control recipe.
- Tool readiness: direct Spec Blocks MCP and Chrome DevTools MCP available.
- Browser / server / build under test: Chrome via DevTools MCP; Vite dev server on sources; clean HEAD copy for the baseline.
- Evidence directory: `tmp/component-verification/select/2026-10-29/` (screenshots in session; local only).
- Durable verification fixtures / served URLs: `tests/fixtures/components/select/inline.html` (new); `tests/fixtures/components/select/index.html` (`selectAPI.apiChecks()`).
- Evidence availability to the next agent: local only.

## Capability and interface mapping

| ID   | Requirement / capability and defaults | Live authority | Local reference path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status  | Evidence / gap   |
| ---- | ------------------------------------- | -------------- | ----------------------------- | ------------------------------ | ------------- | ------------ | ------- | ---------------- |
| C-01 | `variant` default \| inline, default `default`, reflected | `slin-prop-1` | Slider inline variant | `TpSelect.variant`, family axis `variant` | select.mdx ### Inline | V-01 | passed | fixture screenshot |
| C-02 | Inline row: trigger on the shared inline surface, label at the start, value and chevron at the end, full width | `slin-prop-1` | `shared/inline-control.ts` | `select-trigger-variant-inline`, styles `:host([variant='inline'])` | ### Inline | V-01, V-02 | passed | rows 32px, aligned with an inline Slider |
| C-03 | `select-trigger-label` part, aria-hidden | `slin-pub-0`, `slin-q1` | — | `#part('select-trigger-label')` | API Reference (part) | V-03 | passed | a11y tree names each combobox once |
| C-04 | `label` default empty; trigger and list named “Options” without label or Field | `slin-prop-0` | — | `label = ''`, trigger `aria-label` fallback, `listLabel` | API Reference | V-03 | passed | a11y tree |
| C-05 | Field label moves into the row; Field keeps it for naming | `sltk-f2` | Slider `rendersFieldLabel` | `rendersFieldLabel`, `fieldLabel` getter on the form element | ### Inline | V-03 | passed | “Binding” row, combobox named Binding with its description |
| C-06 | Searchable Select keeps the default look | `slin-prop-1` | — | `#inline` excludes searchable; recipe scoped `:not([data-searchable])` | ### Inline | V-01 | passed | screenshot |
| C-08 | Inline opens the List below the row with the shared popup entrance and exit (align item with trigger defaults off, as in searchable mode) | `slin-prop-1` | searchable default `alignItemWithTrigger` | `alignItemWithTrigger` getter; `anchoredPresenceAppearance` | ### Inline | V-07 | passed | opacity 0→1 over ~13 frames, fade-out on close, list below the row |
| C-07 | Behavior unchanged: open, keyboard select, close, focus | `slin-q1` | existing Select | no behavior change | — | V-04, V-05 | passed | real click + ArrowDown + Enter |

| Issue | Concrete missing/conflicting contract | Affected dependencies | Proposed resolution | Authority / resolution evidence | Status |
| ----- | ------------------------------------- | --------------------- | ------------------- | ------------------------------- | ------ |
| S-1 | No Select variant or visible label contract | Select, Autocomplete | Add Label and Variant rows, Trigger label part | Spec v0.47.6 | passed |

## Architecture and reuse

- Component folder and responsibility boundaries: rendering in `select.ts`, layout in `styles.ts`, paint in `recipes/select.ts` from `recipes/shared/inline-control.ts`.
- Supported exports / registration / constituent API impact: new `SelectVariant` export; `label` default changes from “Options” to empty (names still fall back to “Options”).
- Public vocabulary / tokens / parts / presentation review: `select-trigger-label` is distinct from the group `select-label`.

### Family dependency map

| Responsibility | Reference dependency path / symbol         | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| -------------- | ------------------------------------------ | --------------------------------- | ------------------------------------------------- | ------------------------------------------ |
| Inline row paint | Slider inline variant | `recipes/shared/inline-control.ts` | reused surface, label and value paint | Slider, Select / V-01 |
| Field label hand-off | Foundation `sltk-f2` | `TpFormElement.rendersFieldLabel`, Field `data-control-label` | reused; Field also observes `searchable` | Slider, Select / V-03 |
| Selection behavior | Select | `TpSelect` | unchanged | Autocomplete, Command list, Emoji list / V-05 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations        | Scenario IDs |
| -------------------- | ---------------------------- | ----------------------------------------- | ----------------------------------- | -------------------------------------- | ------------ |
| Trigger row | library inline row | Slider inline track | `inlineControlSurface` + text-control focus and invalid rings | same height as other controls | V-01 |
| Trigger label | library inline row | Slider label | `inlineControlLabel` | normal font | V-01 |
| Value | library inline row | Slider output | `inlineControlValue` | brightens on hover, focus, open | V-01 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| ------------------ | ----------- | ------------------------------- | ----------------------------------- | --------------------------------------------- |
| docs Inline | stacked rows | `tp-select`, `tp-slider` inline | V-01 | stack is native grid layout |
| fixture `#field` | label, description | `tp-field` | V-03 | none |

## Verification scenarios

| ID   | Capability IDs / evidence category | Setup and input     | Expected result     | Actual result | Tool/command and evidence  | Status  | Justification / gap |
| ---- | ---------------------------------- | ------------------- | ------------------- | ------------- | -------------------------- | ------- | ------------------- |
| V-01 | C-01, C-02, C-06; visual | `inline.html` dark | rows aligned with the inline Slider; searchable unchanged | as expected, 32px rows | DevTools screenshot | passed | Seen in the session screenshot. |
| V-02 | C-02; visual | Field-hosted and long-label rows | full-width rows; long text ellipsizes | fixed `display: block`; as expected | DevTools screenshot | passed | Rechecked after the fix. |
| V-03 | C-03, C-04, C-05; accessibility | accessibility snapshot | each combobox named once; Binding named by the Field | as expected | DevTools snapshot | passed | Tree recorded in the session. |
| V-04 | C-07; real input | click Paper, ArrowDown, Enter | Gloss selected, list closed, focus kept | as expected | DevTools click and press_key | passed | Real input through DevTools. |
| V-05 | C-07; regression | `selectAPI.apiChecks()` vs clean HEAD copy | same results | 27/31 both; the same 4 fail on HEAD | DevTools fixtures | passed | The 4 failures predate this change. |
| V-07 | C-08; motion | open and close `#paper`, sample opacity per frame | entrance and exit transitions run | as expected | DevTools evaluate + screenshot | passed | Same presence recipe as searchable Select and menus. |
| V-06 | C-02, C-03; accessibility automation | axe on `inline.html` dark and light | no violations | none | injected axe-core | passed | Both schemes clean. |
| V-08 | C-02, C-08; update cost regression | `inline-update-cost` fixture: 40 inline selects in one shadow root, controlled value, hook on instance 0; 20 value changes and 30 updates per frame; dist from 3eeb6b4 vs this tree | no presentation refresh and no attribute rewritten to its own value per value change; hook kept; forced refresh changes nothing | 82.6 → 3 records per change (75 → 0 no-op), updates 3 → 1, querySelectorAll 69.2 → 0.1; 120 → 83 µs per update, frame 13.2 → 5.2 ms; safety 0 differences; real input: open, choose, reopen shows the check on the new value; select fixture 27/31 | DevTools MCP, `tests/fixtures/components/inline-update-cost/` (`counters`, `startTiming`, `safety`), baseline `tmp/inline-update-cost/baseline.json` | passed | Shared fix for tweakpad/ui#26; options that are not rendered settle their indicator presence. The 4 failing select checks fail on the 3eeb6b4 package too. |

## Early integration checkpoint

| ID   | Check                                                                                             | Status  | Evidence / unresolved finding                               |
| ---- | ------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------- |
| I-01 | Shared owners are actually used by related consumers; old duplicate behavior is removed/delegated | passed | Select imports the Slider's inline-control recipe and the form-element label hook |
| I-02 | Default visual regions match traced source and shared library recipes                             | passed | Select and Slider rows share surface, height and text |
| I-03 | Independent constituent options work, including placement separately from action behavior         | passed | placeholder, disabled, invalid, Field, RTL, searchable cases in `inline.html` |

## Gate record

| Gate                                  | Status  | Required exit evidence / remaining work                                               |
| ------------------------------------- | ------- | ------------------------------------------------------------------------------------- |
| 0. Sources and scope                  | passed | Spec §18.1 read and amended (v0.47.6); scope from the user request. |
| 1. Capability mapping                 | passed | C-01…C-07 mapped. |
| 2. Architecture and composition reuse | passed | Shared inline recipe and Field hook reused. |
| 3. Behavior                           | passed | V-04, V-05. |
| 4. Presentation and customization     | passed | `select-inline.test.ts`; keys resolve. |
| 5. Accessibility                      | passed | V-03, V-06. |
| 6. Visual and interaction inspection  | passed | V-01, V-02. |
| 7. Documentation and demo reuse       | passed | select.mdx ### Inline; check-docs passes; story `variant` control. |
| 8. Regression and reconciliation      | passed | unit tests, Select fixture against HEAD. |

## Documentation synchronization

- [x] `docs/components/select.mdx` ### Inline; `check-docs.mjs components/select` passes.
- [x] JSDoc covers `variant` and `label`; `select-trigger-label` has a part description.
- [x] `elementDependencies` unchanged.
- [x] Verification fixtures are separate from the page.
- [x] Previews reuse library components (`tp-slider` inline).
- [x] Preview code works outside Storybook.

## Completion / handoff

- Change summary: Select inline variant on the shared inline row; `label` default empty with an “Options” fallback.
- Actual delivery claim: plain (non-searchable) Select inline variant.
- Record checker: see the final report.
- Non-browser checks: unit tests, lint, check-docs.
- Behavior: V-04, V-05.
- Accessibility: V-03, V-06; no screen-reader run.
- Visual/customization/motion inspection: V-01, V-02.
- Documentation and demo composition reuse: gate 7.
- Shared-consumer regressions / package boundaries: V-05.
- Required failures or blocked checks: none caused by this change.
- Older out-of-scope gaps: 4 Select fixture checks fail on HEAD as well (modal lease in shadow scopes, scroll repeat, adoption paint, icon length tokens).
- Changed source revisions / reopened gates: none open.
