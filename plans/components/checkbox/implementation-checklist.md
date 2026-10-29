# Component implementation and evidence record

## Delivery and source record

- Component(s) / public identity: Checkbox (`tp-checkbox`); Field label hand-off.
- Requested work / claim: inline variant of Checkbox (label at the start and box at the end of one compact row), on the shared inline row; bounded to this variant.
- Scope source: user request 2026-10-29 ("Lets now do the checkbox inline").
- In-scope changes and existing gaps: `variant` on Checkbox; Switch extends Checkbox and inherits the property without inline paint yet (its own family has no variant axis).
- Repository baseline / unrelated changes: `development`; Slider, Select and Input inline work in the tree.
- Live project / document IDs and revisions: Component Library §16.3 Checkbox, amended at v0.47.9 (`cbin-prop-0`, `cbin-q1`); review `ucl21-markdown-dep-4` approved (Markdown task lists keep the default variant).
- Owning contracts / dependencies / vocabulary: §16.3 Checkbox; Foundation §14.3 Field (`sltk-f2`).
- Local reference evidence: the Checkbox control already wraps the box and its label slot as one press target and name; inline is layout and paint.
- Tool readiness: direct Spec Blocks MCP and Chrome DevTools MCP available.
- Browser / server / build under test: Chrome via DevTools MCP; Vite dev server on sources; clean HEAD copy for the Switch baseline.
- Evidence directory: `tmp/component-verification/checkbox/2026-10-29/` (screenshots in session; local only).
- Durable verification fixtures / served URLs: `tests/fixtures/components/select/inline.html` (inline controls page); `tests/fixtures/components/switch/` (`switchAPI.runAssertions()`).
- Evidence availability to the next agent: local only.

## Capability and interface mapping

| ID   | Requirement / capability and defaults | Live authority | Local reference path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status  | Evidence / gap   |
| ---- | ------------------------------------- | -------------- | ----------------------------- | ------------------------------ | ------------- | ------------ | ------- | ---------------- |
| C-01 | `variant` default \| inline, reflected | `cbin-prop-0` | Select, Input inline | `TpCheckbox.variant`, family axis | checkbox.mdx ### Inline | V-01 | passed | screenshot |
| C-02 | Control is the shared inline row; label at the start, box at the end; row rings on keyboard focus and validity | `cbin-prop-0` | `shared/inline-control.ts` | `checkbox-variant-inline`, `.box { order: 1 }` | ### Inline | V-01, V-02 | passed | rows 32px, label at 571 |
| C-03 | Press anywhere on the row toggles; Space toggles | `cbin-q1` | existing Checkbox behavior | unchanged | ### Inline | V-02 | passed | real click and Space |
| C-04 | Without its own label, the Field's label fills the row | `sltk-f2` | Slider, Select, Input | `rendersFieldLabel`, slot fallback | ### Inline | V-03 | passed | Recycled stock row |

| Issue | Concrete missing/conflicting contract | Affected dependencies | Proposed resolution | Authority / resolution evidence | Status |
| ----- | ------------------------------------- | --------------------- | ------------------- | ------------------------------- | ------ |
| S-1 | No Checkbox variant | Checkbox, Markdown | Add Variant row and requirement | Spec v0.47.9 | passed |

## Architecture and reuse

- Component folder and responsibility boundaries: `checkbox.ts` layout; paint in `recipes/checkbox.ts` from `shared/inline-control.ts`.
- Supported exports / registration / constituent API impact: new `CheckboxVariant` export; the default Checkbox renders as before (golden: additions only).
- Public vocabulary / tokens / parts / presentation review: no new parts or tokens; insets `space-2-5` and `space-3` as the Select trigger.

### Family dependency map

| Responsibility | Reference dependency path / symbol         | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| -------------- | ------------------------------------------ | --------------------------------- | ------------------------------------------------- | ------------------------------------------ |
| Inline row paint | Slider, Select, Input inline | `shared/inline-control.ts` | reused; rings on `:focus-visible` | Checkbox / V-01 |
| Boolean control | Checkbox | `TpCheckbox.renderBooleanControl` | unchanged; Switch shares it | Switch / V-04 |
| Field label hand-off | Foundation `sltk-f2` | `rendersFieldLabel` | reused through the label slot fallback | Checkbox / V-03 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations        | Scenario IDs |
| -------------------- | ---------------------------- | ----------------------------------------- | ----------------------------------- | -------------------------------------- | ------------ |
| Row (`checkbox`) | library inline row | Select trigger row | `inlineControlSurface`, `inlineControlLabel`, rings | box at the end | V-01 |
| Box | Checkbox | `checkboxRules` | unchanged paint; no own focus ring in the row | the row carries the ring | V-02 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| ------------------ | ----------- | ------------------------------- | ----------------------------------- | --------------------------------------------- |
| docs Inline | stacked rows | `tp-checkbox`, `tp-select` inline | V-01 | stack is native grid layout |
| fixture `#checkbox-field` | label, description | `tp-field` | V-03 | none |

## Verification scenarios

| ID   | Capability IDs / evidence category | Setup and input     | Expected result     | Actual result | Tool/command and evidence  | Status  | Justification / gap |
| ---- | ---------------------------------- | ------------------- | ------------------- | ------------- | -------------------------- | ------- | ------------------- |
| V-01 | C-01, C-02; visual | inline controls page, dark | 32px rows, label at 571, box at the end | as expected; box centre 1px from the chevron (16px box, 14px icon) | DevTools screenshot and measurement | passed | Seen in the session screenshot. |
| V-02 | C-02, C-03; real input | click Rush delivery; Shift+Tab, Space | toggles; ring on the row | Rush on, Send a proof first off | DevTools click and press_key | passed | Real input through DevTools. |
| V-03 | C-04; accessibility | accessibility snapshot | each checkbox named once; Field-hosted named by the Field | as expected | DevTools snapshot | passed | Tree recorded in the session. |
| V-04 | C-02; regression | `switchAPI.runAssertions()` vs clean HEAD copy | same results | 92/93 both; `scoped-primary-token` fails on HEAD too | DevTools fixtures | passed | The failure predates this change. |
| V-05 | C-02; accessibility automation | axe, dark and light | no violations | none | injected axe-core | passed | Both schemes clean. |

## Early integration checkpoint

| ID   | Check                                                                                             | Status  | Evidence / unresolved finding                               |
| ---- | ------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------- |
| I-01 | Shared owners are actually used by related consumers; old duplicate behavior is removed/delegated | passed | row paint from `shared/inline-control.ts`; behavior unchanged |
| I-02 | Default visual regions match traced source and shared library recipes                             | passed | rows align with the Select, Input and Slider rows |
| I-03 | Independent constituent options work, including placement separately from action behavior         | passed | checked, unchecked, Field, invalid, disabled, RTL |

## Gate record

| Gate                                  | Status  | Required exit evidence / remaining work                                               |
| ------------------------------------- | ------- | ------------------------------------------------------------------------------------- |
| 0. Sources and scope                  | passed | Spec §16.3 read and amended (v0.47.9). |
| 1. Capability mapping                 | passed | C-01…C-04. |
| 2. Architecture and composition reuse | passed | Shared row recipe; boolean control unchanged. |
| 3. Behavior                           | passed | V-02. |
| 4. Presentation and customization     | passed | `checkbox-inline.test.ts`; golden diff is additions only. |
| 5. Accessibility                      | passed | V-03, V-05. |
| 6. Visual and interaction inspection  | passed | V-01. |
| 7. Documentation and demo reuse       | passed | checkbox.mdx ### Inline; check-docs passes; story `variant` control. |
| 8. Regression and reconciliation      | passed | unit tests, Switch fixture against HEAD. |

## Documentation synchronization

- [x] `docs/components/checkbox.mdx` ### Inline; `check-docs.mjs components/checkbox` passes.
- [x] JSDoc covers `variant`; the `checkbox` part description mentions the inline row.
- [x] `elementDependencies` unchanged.
- [x] Verification fixtures are separate from the page.
- [x] Previews reuse library components (`tp-select` inline).
- [x] Preview code works outside Storybook.

## Completion / handoff

- Change summary: Checkbox inline variant on the shared inline row.
- Actual delivery claim: Checkbox inline variant.
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
