# Component implementation and evidence record

## Delivery and source record

- Component(s) / public identity: Flow (`tp-flow`, `tp-flow-node`, inspector panel); composed Slider, Input, Select, Switch, Checkbox.
- Requested work / claim: bounded change: node-body properties render as inline fields by default, so the docs hero ("Voice chain") uses inline fields. Not a complete-widget certification.
- Scope source: user 2026-10-31 "update our use case for the flow (first one). To use inline fields"; asked where the option lives, the user chose "Make it the default" (node-body properties always render as inline fields; no option).
- In-scope changes and existing gaps: `FlowPropertyControlContext.inline`; inline variants in the default factories for `text`, `number`, `slider` (with `editableValue`), `select`, `switch`, `checkbox`; field rows in node bodies; inspector unchanged (Field labels); docs paragraph. `textarea`, `color`, `easing`, `custom` keep label-and-control rows. Extended 2026-11-01 (tweakpad/ui#29, user: "pull the next one … the flow component"): `color` renders inline too, and the Color picker hides an empty footer.
- Repository baseline / unrelated changes: `development` at 80f3b9f with the uncommitted helper consolidation and the Slider editable value (#27) in the same tree; staged dependency-cruiser changes belong to someone else.
- Live project / document IDs and revisions: UI Library `prj_c5a403a0-…` read at v0.53.0 (`2c68e6b1`); UI Widgets Specification `doc_0d98facc-…` §6.3.3 Properties (`uwg-fl-sec-properties`, props row `uwg-fl-tab-props-r8`).
- Owning contracts / dependencies / vocabulary: Widgets §6.3.3 (property controls by kind); Component Library inline variants of Input (`inin-prop-1`), Select, Switch (`swin-prop-0`), Checkbox (`cbin-prop-0`), Slider (`sltk-q2`, `sltk-q3`).
- Local reference evidence: none needed beyond the library's own inline variants; the widget reference implementation renders property rows as label + control.
- Tool readiness: direct Spec Blocks and Chrome DevTools MCP available.
- Browser / server / build under test: Chrome via DevTools MCP; Vite dev server `127.0.0.1:5180` on sources; user's Storybook dev (6006) for the docs page.
- Evidence directory: `tmp/component-verification/flow/2026-10-31-inline/`
- Durable verification fixtures / served URLs: `tests/fixtures/widgets/flow/index.html` (`#lighting` panel nodes, `#monitor` card nodes; `flowAPI` helpers).
- Evidence availability to the next agent: local only.

## Capability and interface mapping

| ID   | Requirement / capability and defaults | Live authority | Local reference path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status  | Evidence / gap   |
| ---- | ------------------------------------- | -------------- | ----------------------------- | ------------------------------ | ------------- | ------------ | ------- | ---------------- |
| C-01 | Node-body `text`, `number`, `slider`, `select`, `switch`, `checkbox` render their inline variant as the whole row with the property label | S-1 amendment (Widgets §6.3.3) | library inline variants | `INLINE_PROPERTY_CONTROLS`, factories branch on `context.inline` (`property-controls.ts`) | flow.mdx properties paragraph | V-01, V-02 | passed | `#lighting`, `#monitor`, hero rows |
| C-02 | Node-body slider value is editable | S-1, `sltk-q3` | Slider `editableValue` | `?editable-value=${context.inline}` | flow.mdx | V-03 | passed | real click, type, Enter |
| C-03 | The row anchors the property's port | S-1 | existing row ports | field row carries `data-port-id` (`default-templates.ts` `propertyRows`) | — | V-02 | passed | dimmer port at its row |
| C-04 | Other controls keep the label-and-control row; the inspector keeps Field labels | S-1 | existing rows | `INLINE_PROPERTY_CONTROLS` membership; inspector context `inline: false` | flow.mdx | V-02, V-05 | passed | tint row; assertInspector |
| C-05 | Factory context `inline` (true in a node body, false in the inspector) | S-1 | — | `FlowPropertyControlContext.inline` | flow.mdx | V-05 | passed | typecheck, suite |
| C-06 | Node-body `color` is a popup Color picker whose trigger is an inline Color input (label, swatch, color text); inspector keeps the swatch trigger in its Field | S-2 | Color picker docs "Color input trigger" | `color` in `INLINE_PROPERTY_CONTROLS`; factory slots `tp-color-input variant="inline"` when `context.inline`; `TpColorInput` in node `elementDependencies` | flow.mdx properties paragraph | V-06, V-07, V-08 | passed | `#lighting` tint row |
| C-07 | An empty Color picker footer adds no row or gap | `uwg-cp-tab-anatomy-r14` (footer is a slot); JSDoc "hidden while empty" | Dialog hides empty regions by assignment | `hidden` from `:scope > [slot="footer"]`, re-rendered on `slotchange`; `.footer[hidden]` display none (the old `:not(:has(*))` always matched the slot) | — | V-06 | passed | root grid one 32px row |

| Issue | Concrete missing/conflicting contract | Affected dependencies | Proposed resolution | Authority / resolution evidence | Status |
| ----- | ------------------------------------- | --------------------- | ------------------- | ------------------------------- | ------ |
| S-2 | `uwg-flinline-req-prop-9` listed the inline kinds without `color` | Flow node, custom color factories | add `color` and require the popup picker with an inline Color input trigger | committed `4d63a66b` (v0.56.12) | passed |
| S-1 | Widgets §6.3.3 has no rule for inline node-body fields or the `inline` context field | Flow node, inspector, custom factories | Add a requirement and the context field | `uwg-flinline-req-prop-9` after `uwg-fl-req-prop-3`; content `7bc8b575` (v0.53.1), bump `d4bf5d46` (v0.54.0); context fields are not enumerated in the spec | passed |

## Architecture and reuse

- Component folder and responsibility boundaries: factories in `src/widgets/flow/node/property-controls.ts`; row layout in `default-templates.ts`; structure CSS `.field` in `src/widgets/flow/styles.ts`; context in `types.ts`, set by `node.ts` and `panels/inspector.ts`.
- Supported exports / registration / constituent API impact: `FlowPropertyControlContext` gains `inline`; no element or export added.
- Framework bindings: `npm run cem` regenerated nothing (0 files updated); the context type is not an element property.
- Public vocabulary / tokens / parts / presentation review: rows keep part `flow-node-row`; no new token or part.

### Family dependency map

| Responsibility | Reference dependency path / symbol         | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| -------------- | ------------------------------------------ | --------------------------------- | ------------------------------------------------- | ------------------------------------------ |
| Inline field rows | library inline variants | Input, Select, Switch, Checkbox, Slider `variant="inline"`; shared inline-control recipe | reused as is; Flow only selects the variant | node bodies / V-01, V-02 |
| Number editing | NumberField | `NumberFieldController` bound by `node.ts #syncNumberFields` on `[data-number-field]` | reused; inline root is a plain span around an inline Input | V-04 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations        | Scenario IDs |
| -------------------- | ---------------------------- | ----------------------------------------- | ----------------------------------- | -------------------------------------- | ------------ |
| Node body field row | library inline controls | `shared/inline-control.ts` via each control's recipe | inline variants | row spans the body (`.field > *` 100%) | V-01 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| ------------------ | ----------- | ------------------------------- | ----------------------------------- | --------------------------------------------- |
| node body rows | property fields | `tp-slider`, `tp-input`, `tp-select`, `tp-switch`, `tp-checkbox` inline | V-01–V-04 | number root is a native span (NumberField root) |
| docs hero Voice chain | node fields | schema properties | V-01 | none |

## Verification scenarios

| ID   | Capability IDs / evidence category | Setup and input     | Expected result     | Actual result | Tool/command and evidence  | Status  | Justification / gap |
| ---- | ---------------------------------- | ------------------- | ------------------- | ------------- | -------------------------- | ------- | ------------------- |
| V-01 | C-01; visual | `#lighting` dark, `#monitor` light, docs hero dark | inline field rows; colour keeps its row | as expected | `lighting-dark.png`, `monitor-light.png`, `hero-dark.png` | passed | dark/light inspected |
| V-02 | C-01, C-03, C-04; structure | row inventory per node | inline kinds are field rows, others list rows; ports at their rows | `[row, select/inline, slider/inline, …]`; dimmer port aligned | DevTools evaluate + screenshot | passed | — |
| V-03 | C-02; real input | click the dimmer value, type `0.82`, Backspace, Enter; undo/redo | field opens, node stays, Backspace edits text, data 0.8, one history step | 4 nodes kept, data 0.8, undo 0.5, redo 0.8 | DevTools `click`, `type_text`, `press_key` | passed | real input |
| V-04 | C-01; real input | universe number field: select, type `99` | clamped like the previous control | `64` while typing, same with the old input-group control (temporary swap) | DevTools | passed | clamping while typing is pre-existing NumberField behavior in nodes |
| V-06 | C-06, C-07; visual and layout | `#lighting` Fixture group, dark; scratch page `tmp/component-verification/flow/color-inline/inputs.html` (default and compact density, source and `dist/`) | color row as tall and wide as the select, slider and checkbox rows; hex shown in full; picker exactly as tall as its trigger | rows 32/32/32/32 layout px; hex box 59 = text 59; picker grid `32px`, footer hidden | DevTools screenshot + evaluate | passed | tweakpad/ui#28 clipping does not reproduce in source or `dist/`, in the document or in Flow |
| V-07 | C-06; real input | focus the tint hex, type `#ff0000`, Enter | one node data proposal and one commit, reason keyboard; picker and trigger show the value | data tint `#ff0000`; flow events `tp-value-change`, `tp-value-commit` only; nothing leaked | DevTools `type_text` + `flowAPI.events`/`leaked` | passed | no duplicate from the trigger's own event |
| V-08 | C-06; real input | focus the swatch, Enter | popup opens styled under the row with the node's color; Escape closes | as expected | DevTools `press_key` + screenshot | passed | — |
| V-09 | C-06, C-07; regression | `assertValueLane`, `assertNestedEventBoundary` on a fresh load; `npx vitest run` | pass | all checks ok; 6191 passed | DevTools, vitest | passed | new unit test for the inline color factory |
| V-05 | C-01–C-05; regression | all 31 flow helpers in file order, fresh load (assertVirtualization 300, no assertPerformance) | identical to the earlier baseline | 31 helpers, 188 checks, identical | `tmp/component-verification/flow/2026-10-31-inline/suite.json` vs `tmp/consolidation/batch3/after-suite.json` | passed | — |

## Early integration checkpoint

| ID   | Check                                                                                             | Status  | Evidence / unresolved finding                               |
| ---- | ------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------- |
| I-01 | Shared owners are actually used by related consumers; old duplicate behavior is removed/delegated | passed | factories select library variants; no local field paint |
| I-02 | Default visual regions match traced source and shared library recipes                             | passed | rows match the inline controls elsewhere (screenshots) |
| I-03 | Independent constituent options work, including placement separately from action behavior         | passed | node body vs inspector; inline vs non-inline kinds; port rows |

## Gate record

| Gate                                  | Status  | Required exit evidence / remaining work                                               |
| ------------------------------------- | ------- | ------------------------------------------------------------------------------------- |
| 0. Sources and scope                  | passed | Scope from the user; spec read at v0.53.0 and amended to v0.54.0 (S-1). |
| 1. Capability mapping                 | passed | C-01…C-05. |
| 2. Architecture and composition reuse | passed | maps above. |
| 3. Behavior                           | passed | V-02–V-05. |
| 4. Presentation and customization     | passed | library variants and recipes only. |
| 5. Accessibility                      | passed | inline controls keep their names (slider "dimmer", spinbutton "universe"); assertInspector/forms pass. |
| 6. Visual and interaction inspection  | passed | V-01. |
| 7. Documentation and demo reuse       | passed | flow.mdx paragraph; check-docs passes; hero read in Storybook. |
| 8. Regression and reconciliation      | passed | typecheck, lint, 6183 tests; V-05. |

## Documentation synchronization

- [x] `docs/widgets/flow.mdx` follows the tweakpad-docs skill; `check-docs.mjs widgets/flow` passes (new paragraph, website paragraphs untouched).
- [x] JSDoc covers `FlowPropertyControlContext.inline`.
- [x] `elementDependencies` unchanged.
- [x] Verification fixtures are separate from the page.
- [x] Previews reuse library components.
- [x] Preview code works outside Storybook.

## Completion / handoff

- Change summary: node-body properties render as inline fields by default.
- Actual delivery claim: the bounded change above, verified in the flow fixture and the docs hero.
- Record checker: see the final report.
- Non-browser checks: `npm run typecheck`, `npm run lint`, `npm test` (6183 passed), `npm run cem` (no binding change), check-docs.
- Behavior: V-02–V-05.
- Accessibility: names kept; no screen-reader run.
- Visual/customization/motion inspection: V-01.
- Documentation and demo composition reuse: gate 7.
- Shared-consumer regressions / package boundaries: V-05.
- Required failures or blocked checks: none. Optional spec wording: anatomy cell `uwg-fl-tab-anatomy-r5-c1-p` still says panel rows are "label and control rows"; suggested "property rows, each an inline control or a label and a control" (not changed).
- Older out-of-scope gaps: a node's number field clamps while typing (typing 99 over a 1–64 field shows 64 after the second digit), pre-existing.
- Changed source revisions / reopened gates: none.

## Minimap direct-reconnect repair (2026-11-08)

- Scope: the confirmed pre-existing direct TpFlowMinimap reconnect failure discovered while testing CanvasSurface consumers. No public API, presentation recipe, examples or generated binding changes.
- Source: live Widgets Flow minimap contract via direct spec_search; repository HEAD c148dd70, minimap source previously unchanged. Existing minimap lifecycle is the reuse reference; CanvasSurface/Scheduler/PointerDrag remain their existing owners.
- Capability/dependency map: preserve scene and canvas, dispose all resources on disconnect, re-create exactly once on connect, reset panning and refresh cached theme colors. Public composition and ownership unchanged.
- Gates 0–2: bounded lifecycle repair mapped above. Early integration: original failing pixel-repaint check now passes; source diff uses one shared #connectCanvas routine for first render/reconnect.
- Browser regression: tests/fixtures/widgets/flow/minimap-reconnect.ts failed on original CanvasSurface, then passed five times on source and five times on rebuilt package. Tests use twelve actual nodes and compare canvas pixels after viewport changes. Real MCP canvas click after reconnection pans x from 100 to -1221, retaining zoom 1; data-panning clears after release.
- Verification: source TypeScript, targeted ESLint/stylelint and package build pass. Focused Flow/CanvasSurface unit results are recorded at handoff. No unrelated full-component claim; this repair closes only the direct-reconnect failure.

Focused Flow/CanvasSurface checks: five test files, 27 tests passed (one worker, 2.98 seconds).
