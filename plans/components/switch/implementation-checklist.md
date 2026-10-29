# Component implementation and evidence record

## Delivery and source record

- Component(s) / public identity: Switch (`tp-switch`); Field label hand-off.
- Requested work / claim: inline variant of Switch (label at the start and track at the end of one compact row), on the shared inline row; bounded to this variant.
- Scope source: user request 2026-10-29 ("yeah lets move to switch now").
- In-scope changes and existing gaps: the `variant` Switch inherits from Checkbox now renders a `switch-row`; Switch family gains the variant axis.
- Repository baseline / unrelated changes: `development`; Slider, Select, Input and Checkbox inline work in the tree.
- Live project / document IDs and revisions: Component Library §16.7 Switch, amended at v0.47.10 (`swin-prop-0`, `swin-pub-0`, `swin-detail-0`, `swin-q1`); review `ucl16-theme-switcher-dep-1` approved (Theme switcher keeps the default variant).
- Owning contracts / dependencies / vocabulary: §16.7 Switch; Foundation §14.3 Field (`sltk-f2`).
- Local reference evidence: the Switch control is only the track; its label is a sibling `tp-label`, so the inline row wraps both, as the Input row wraps its editor.
- Tool readiness: direct Spec Blocks MCP and Chrome DevTools MCP available.
- Browser / server / build under test: Chrome via DevTools MCP; Vite dev server on sources; clean HEAD copy for the Switch baseline.
- Evidence directory: `tmp/component-verification/switch/2026-10-29/` (screenshots in session; local only).
- Durable verification fixtures / served URLs: `tests/fixtures/components/select/inline.html` (inline controls page); `tests/fixtures/components/switch/` (`switchAPI.runAssertions()`).
- Evidence availability to the next agent: local only.

## Capability and interface mapping

| ID   | Requirement / capability and defaults | Live authority | Local reference path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status  | Evidence / gap   |
| ---- | ------------------------------------- | -------------- | ----------------------------- | ------------------------------ | ------------- | ------------ | ------- | ---------------- |
| C-01 | `variant` default \| inline (inherited from Checkbox), family axis | `swin-prop-0` | Checkbox inline | `TpSwitch` render, family axis | switch.mdx ### Inline | V-01 | passed | screenshot |
| C-02 | `switch-row` around label and track; label at the start, track at the end; row rings while the track has keyboard focus, and on validity; the track draws neither | `swin-prop-0` | Input row | `switch-row-variant-inline`, `switch-variant-inline` | ### Inline | V-01, V-02 | passed | rows 32px; track end 1107 = Checkbox box end |
| C-03 | Press on the track, the label or the row padding toggles; Space and Enter toggle | `swin-q1` | existing Switch behavior | row click forwards to the control | ### Inline | V-02 | passed | real click, dispatched presses at hit-tested points, real Enter |
| C-04 | Without its own label, the Field's label fills the row | `sltk-f2` | Checkbox inline | `rendersFieldLabel`, label slot fallback | ### Inline | V-03 | passed | Keep files on record row |

| Issue | Concrete missing/conflicting contract | Affected dependencies | Proposed resolution | Authority / resolution evidence | Status |
| ----- | ------------------------------------- | --------------------- | ------------------- | ------------------------------- | ------ |
| S-1 | No Switch variant or row part | Switch, Theme switcher | Add Variant row, Row part, requirement | Spec v0.47.10 | passed |

## Architecture and reuse

- Component folder and responsibility boundaries: `switch.ts` renders the row; paint in `recipes/switch.ts` from `shared/inline-control.ts`.
- Supported exports / registration / constituent API impact: new `switch-row` part; the default Switch renders as before (golden: additions only).
- Public vocabulary / tokens / parts / presentation review: `switch-row`; no new tokens; insets `space-2-5` and `space-3` as the Select trigger.

### Family dependency map

| Responsibility | Reference dependency path / symbol         | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| -------------- | ------------------------------------------ | --------------------------------- | ------------------------------------------------- | ------------------------------------------ |
| Inline row paint | Checkbox, Input inline | `shared/inline-control.ts` | reused; rings on `:has(> [part~="switch"]:focus-visible)` | Switch / V-01 |
| Boolean control | Checkbox | `TpCheckbox.renderBooleanControl` | unchanged | Switch, Theme switcher / V-04 |
| Field label hand-off | Foundation `sltk-f2` | `rendersFieldLabel` | reused through the label slot fallback | Switch / V-03 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations        | Scenario IDs |
| -------------------- | ---------------------------- | ----------------------------------------- | ----------------------------------- | -------------------------------------- | ------------ |
| Row (`switch-row`) | library inline row | Input row | `inlineControlSurface`, `inlineControlLabel`, rings | track at the end | V-01 |
| Track (`switch`) | Switch | `switchAppearance` | unchanged paint; no own ring in the row | matches the base invalid rule's specificity | V-02 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| ------------------ | ----------- | ------------------------------- | ----------------------------------- | --------------------------------------------- |
| docs Inline | stacked rows | `tp-switch`, `tp-select` inline | V-01 | stack is native grid layout |
| fixture `#switch-field` | label, description | `tp-field` | V-03 | none |

## Verification scenarios

| ID   | Capability IDs / evidence category | Setup and input     | Expected result     | Actual result | Tool/command and evidence  | Status  | Justification / gap |
| ---- | ---------------------------------- | ------------------- | ------------------- | ------------- | -------------------------- | ------- | ------------------- |
| V-01 | C-01, C-02; visual | inline controls page, dark | 32px rows, label inset like the others, track at the end | as expected | DevTools screenshot and measurement | passed | Seen in the session screenshot. |
| V-02 | C-02, C-03; real input | click the track; presses on label and padding; Enter | toggles; ring on the row only | all toggled | DevTools click, evaluate, press_key | passed | Label and padding presses dispatched at hit-tested points. |
| V-03 | C-04; accessibility | accessibility snapshot | each switch named once; Field-hosted named by the Field | as expected | DevTools snapshot | passed | Tree recorded in the session. |
| V-04 | C-02; regression | `switchAPI.runAssertions()` | same as HEAD | 92/93; `scoped-primary-token` fails on HEAD too | DevTools fixture | passed | The failure predates this change. |
| V-05 | C-02; accessibility automation | axe, dark and light | no violations | none | injected axe-core | passed | Both schemes clean. |

## Early integration checkpoint

| ID   | Check                                                                                             | Status  | Evidence / unresolved finding                               |
| ---- | ------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------- |
| I-01 | Shared owners are actually used by related consumers; old duplicate behavior is removed/delegated | passed | row paint from `shared/inline-control.ts`; behavior unchanged |
| I-02 | Default visual regions match traced source and shared library recipes                             | passed | rows align with the Select, Input, Slider and Checkbox rows |
| I-03 | Independent constituent options work, including placement separately from action behavior         | passed | checked, unchecked, sm size, Field, invalid, disabled, RTL |

## Gate record

| Gate                                  | Status  | Required exit evidence / remaining work                                               |
| ------------------------------------- | ------- | ------------------------------------------------------------------------------------- |
| 0. Sources and scope                  | passed | Spec §16.7 read and amended (v0.47.10). |
| 1. Capability mapping                 | passed | C-01…C-04. |
| 2. Architecture and composition reuse | passed | Shared row recipe; boolean control unchanged. |
| 3. Behavior                           | passed | V-02. |
| 4. Presentation and customization     | passed | `switch-inline.test.ts`; golden diff is additions only. |
| 5. Accessibility                      | passed | V-03, V-05. |
| 6. Visual and interaction inspection  | passed | V-01. |
| 7. Documentation and demo reuse       | passed | switch.mdx ### Inline; check-docs passes; story `variant` control. |
| 8. Regression and reconciliation      | passed | unit tests, Switch fixture. |

## Documentation synchronization

- [x] `docs/components/switch.mdx` ### Inline; `check-docs.mjs components/switch` passes.
- [x] JSDoc covers `switch-row`; the part has a description.
- [x] `elementDependencies` unchanged.
- [x] Verification fixtures are separate from the page.
- [x] Previews reuse library components (`tp-select` inline).
- [x] Preview code works outside Storybook.

## Completion / handoff

- Change summary: Switch inline variant: a row around the label and track on the shared inline row.
- Actual delivery claim: Switch inline variant.
- Record checker: see the final report.
- Non-browser checks: unit tests, lint, check-docs.
- Behavior: V-02.
- Accessibility: V-03, V-05; no screen-reader run.
- Visual/customization/motion inspection: V-01.
- Documentation and demo composition reuse: gate 7.
- Shared-consumer regressions / package boundaries: V-04.
- Required failures or blocked checks: none caused by this change.
- Older out-of-scope gaps: Switch fixture `scoped-primary-token` fails on HEAD as well.
- Changed source revisions / reopened gates: none open.
