# Component implementation and evidence record

## Delivery and source record

- Component(s) / public identity: Input (`tp-input`); Field label hand-off; Input group (shared joined-editor paint).
- Requested work / claim: inline variant of Input (label and value in one compact row), on the shared inline row; bounded to this variant.
- Scope source: user request 2026-10-29 ("Lets now do the input to have the inline variant as well").
- In-scope changes and existing gaps: `variant`, `input-row` and `input-label` parts, `joinedEditor` shared with Input group; Text area is out of scope.
- Repository baseline / unrelated changes: `development`; Select and Slider inline work in the tree.
- Live project / document IDs and revisions: Component Library §17.4 Input, amended at v0.47.8 (`inin-prop-0`, `inin-prop-1`, `inin-pub-0/1`, `inin-detail-0/1`, `inin-q1`); Field ownership from Foundation `sltk-f2`.
- Owning contracts / dependencies / vocabulary: §17.4 Input, §17.5 Input group (joined editor), Foundation §14.3 Field.
- Local reference evidence: Input group's joined editor (`recipes/input-group.ts`) is the existing owner of an editor inside a shared boundary.
- Tool readiness: direct Spec Blocks MCP and Chrome DevTools MCP available.
- Browser / server / build under test: Chrome via DevTools MCP; Vite dev server on sources.
- Evidence directory: `tmp/component-verification/input/2026-10-29/` (screenshots in session; local only).
- Durable verification fixtures / served URLs: `tests/fixtures/components/select/inline.html` (inline controls page); `tests/fixtures/components/input-group/` (`inputGroupContract`).
- Evidence availability to the next agent: local only.

## Capability and interface mapping

| ID   | Requirement / capability and defaults | Live authority | Local reference path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status  | Evidence / gap   |
| ---- | ------------------------------------- | -------------- | ----------------------------- | ------------------------------ | ------------- | ------------ | ------- | ---------------- |
| C-01 | `variant` default \| inline, reflected | `inin-prop-1` | Select and Slider inline | `TpInput.variant`, family axis | input.mdx ### Inline | V-01 | passed | screenshot |
| C-02 | Row of the shared inline surface, rings on focus within and validity, disabled fill | `inin-prop-1` | Input group root | `input-row-variant-inline`, `inlineControlRings('&', ':focus-within')` | ### Inline | V-01, V-03 | passed | screenshots |
| C-03 | Editor joins the row as in an Input group; value at the row end | `inin-prop-1` | `input-group-control` | `joinedEditor` shared by both | ### Inline | V-01, V-05 | passed | editor border 0, text-align end |
| C-04 | `input-label` aria-hidden; press on it edits the value | `inin-q1` | Field label activation | row click focuses the editor | ### Inline | V-02, V-03 | passed | label press focused the editor |
| C-05 | Field label moves into the row | `sltk-f2` | Slider, Select | `rendersFieldLabel` | ### Inline | V-03 | passed | Reference row |
| C-06 | Value muted at rest, foreground while hovered or focused, like other inline values | `inin-prop-1` | `inlineControlValue` | `input-variant-inline` | ### Inline | V-01 | passed | screenshots |
| C-07 | Inline number: `‹ value ›` arrow Buttons around the centered value (as wide as its widest bound) replace the browser's spin buttons; Buttons and Arrow keys step onto the step grid within min and max, repeat while held, Shift ×10, reason `input`; arrows out of the tab order and the accessibility tree; mirrored in RTL; disabled while disabled or read-only | `inst-q1`, `inst-pub-0…2` (v0.52.2) | native spin buttons; NumberField actions (`PressAndHold`) and numeric normalization (`normalizeNumberFieldValue`) | `#stepper`, `#step`, `#numberKeyDown`, `compositeControl` tabIndex -1, recipe hides `::-webkit-inner-spin-button` | ### Inline | V-06, V-07, V-08 | passed | real clicks and keys, hold, axe |
| C-08 | `precision` (default: decimals of `step`): stepped and committed (blur, Enter) values round to it; the value shows that many decimals at rest; typed text shows as typed | `inst-prop-0`, `inst-q2` (v0.52.2) | NumberField format rounding | `#precision`, `#format`, `editingValue`, `#commitNumber` | ### Inline (Number steps) | V-09 | passed | decimals matrix |

| Issue | Concrete missing/conflicting contract | Affected dependencies | Proposed resolution | Authority / resolution evidence | Status |
| ----- | ------------------------------------- | --------------------- | ------------------- | ------------------------------- | ------ |
| S-1 | No Input variant, label or row part | Input | Add Label and Variant rows, Row and Label parts | Spec v0.47.8 | passed |
| S-2 | Native spin buttons in the inline number row: tiny, unthemed, and their reserved space pushed the value off the row end | Input inline number | `‹ value ›` arrow Buttons in place of the spin buttons, plus Precision (user request 2026-10-31) | Spec v0.52.1, v0.52.2 (`inst-q1`, `inst-q2`, `inst-prop-0`) | passed |

## Architecture and reuse

- Component folder and responsibility boundaries: `input.ts` renders the row; paint in `recipes/input.ts` from `shared/inline-control.ts` and `shared/text-control.ts`.
- Supported exports / registration / constituent API impact: new `InputVariant` export; default Input renders unchanged.
- Framework bindings: `npm run cem` regenerated with 0 binding changes (new CSS parts only); `npm test` and `npm run typecheck` pass.
- Public vocabulary / tokens / parts / presentation review: `input-row`, `input-label`; no new tokens; spacing uses the scale steps the Select trigger uses.

### Family dependency map

| Responsibility | Reference dependency path / symbol         | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| -------------- | ------------------------------------------ | --------------------------------- | ------------------------------------------------- | ------------------------------------------ |
| Editor inside a shared boundary | Input group joined editor | `recipes/input-group.ts` | extracted to `joinedEditor` in `shared/text-control.ts`, used by both | Input group, Input / V-05 |
| Inline row paint | Slider and Select inline | `shared/inline-control.ts` | reused; rings take a focus condition | Slider, Select, Input / V-01 |
| Stepping actions and hold to repeat | NumberField increment and decrement | `foundation/press-and-hold.ts`, `tp-button`, `compositeControl` | reused; steps the native editor (`stepUp`/`stepDown`) instead of a numeric model, so type semantics stay native | NumberField, Input / V-06, V-07 |
| Field label hand-off | Foundation `sltk-f2` | `rendersFieldLabel` | reused | Slider, Select, Input / V-03 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations        | Scenario IDs |
| -------------------- | ---------------------------- | ----------------------------------------- | ----------------------------------- | -------------------------------------- | ------------ |
| Row | library inline row | Input group root boundary | `inlineControlSurface`, rings on `:focus-within` | same height and inset as the Select row | V-01 |
| Label | library inline row | Select trigger label | `inlineControlLabel` | inset `space-2-5` like the trigger | V-01 |
| Editor | Input group control | `input-group-control` | `joinedEditor` | value at the row end | V-01 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| ------------------ | ----------- | ------------------------------- | ----------------------------------- | --------------------------------------------- |
| docs Inline | stacked rows | `tp-input`, `tp-select` inline | V-01 | stack is native grid layout |
| fixture `#input-field` | label, description | `tp-field` | V-03 | none |

## Verification scenarios

| ID   | Capability IDs / evidence category | Setup and input     | Expected result     | Actual result | Tool/command and evidence  | Status  | Justification / gap |
| ---- | ---------------------------------- | ------------------- | ------------------- | ------------- | -------------------------- | ------- | ------------------- |
| V-01 | C-01, C-02, C-03, C-06; visual | inline controls page, dark | 32px rows, label at 571 like the Select, value at the end | as expected | DevTools screenshot and measurement | passed | Seen in the session screenshot. |
| V-02 | C-04; real input | click the editor, End, type " v2" | caret, ring on the row, value updated | value "Spring catalog v2" | DevTools click, press_key, type_text | passed | Real input through DevTools. |
| V-03 | C-04, C-05; accessibility | accessibility snapshot; label press | each textbox named once; label press focuses the editor | as expected | DevTools snapshot and evaluate | passed | Tree recorded in the session. |
| V-04 | C-02; accessibility automation | axe, dark and light | no violations | none | injected axe-core | passed | Both schemes clean. |
| V-05 | C-03; regression | `inputGroupContract` checks | single boundary, action inheritance | both pass | DevTools fixture | passed | Shared joined editor unchanged. |
| V-06 | C-07; real input | decimals rows on `select/inline.html`: Line height (0.1) ArrowUp, ArrowDown ×2; Scale (0.25, precision 2) › ×3; Opacity (0.01) › ‹ ‹, Shift+ArrowUp ×3; Tolerance (0.005), Offset (any), empty Bleed; Tab | 1.6, 1.5, 1.4; 1.25, 1.50, 1.75; 0.81, 0.80, 0.79, then 0.89, 0.99, 1.00 (max); 0.015; −1.4; −1; Tab skips the arrows | as expected, no float noise, each step `tp-value-change` (input) | DevTools click (aria-hidden lifted for the click only), press_key | passed | Hold measured with dispatched pointer events (V-07). |
| V-07 | C-07; API | 640 ms hold on ‹ from 3.50 (step 0.25); read-only; disabled | 2.25; Buttons disabled | as expected | evaluate | passed | DevTools cannot hold a real press. |
| V-09 | C-08; real input | Scale (0.25, precision 2): type 2.5 Tab; type 1.237 Tab; ArrowUp from 1.24; type 3.5 Enter in a form | 2.50; 1.24 with stepMismatch; 1.25; 3.50 submitted | as expected | DevTools type_text, press_key | passed | Native step validity kept for off-grid typed values. |
| V-08 | C-07; visual and accessibility | dark, light, RTL, disabled, focus; axe | ‹ value › at the row end, value centered, arrows steady while stepping, mirrored in RTL; no violations | as expected | screenshots, injected axe-core | passed | `aria-hidden-focus` found first, fixed with `compositeControl`. |

## Early integration checkpoint

| ID   | Check                                                                                             | Status  | Evidence / unresolved finding                               |
| ---- | ------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------- |
| I-01 | Shared owners are actually used by related consumers; old duplicate behavior is removed/delegated | passed | Input group and Input import `joinedEditor`; rings and row paint from `shared/inline-control.ts` |
| I-02 | Default visual regions match traced source and shared library recipes                             | passed | rows align with Select and Slider rows |
| I-03 | Independent constituent options work, including placement separately from action behavior         | passed | label, Field, placeholder, number, invalid, disabled cases |

## Gate record

| Gate                                  | Status  | Required exit evidence / remaining work                                               |
| ------------------------------------- | ------- | ------------------------------------------------------------------------------------- |
| 0. Sources and scope                  | passed | Spec §17.4 read and amended (v0.47.8). |
| 1. Capability mapping                 | passed | C-01…C-06. |
| 2. Architecture and composition reuse | passed | Joined editor shared with Input group. |
| 3. Behavior                           | passed | V-02, V-06, V-07. |
| 4. Presentation and customization     | passed | `input-inline.test.ts`. |
| 5. Accessibility                      | passed | V-03, V-04, V-08. |
| 6. Visual and interaction inspection  | passed | V-01, V-08. |
| 7. Documentation and demo reuse       | passed | input.mdx ### Inline; check-docs passes; story `variant` control. |
| 8. Regression and reconciliation      | passed | unit tests, Input group fixture. |

## Documentation synchronization

- [x] `docs/components/input.mdx` ### Inline; `check-docs.mjs components/input` passes.
- [x] JSDoc covers `variant`; `input-row` and `input-label` have part descriptions.
- [x] `elementDependencies` unchanged.
- [x] Verification fixtures are separate from the page.
- [x] Previews reuse library components (`tp-select` inline).
- [x] Preview code works outside Storybook.

## Completion / handoff

- Change summary: Input inline variant on the shared inline row; Input group's joined-editor paint extracted for reuse.
- Actual delivery claim: Input inline variant.
- Record checker: see the final report.
- Non-browser checks: unit tests, lint, check-docs.
- Behavior: V-02.
- Accessibility: V-03, V-04; no screen-reader run.
- Visual/customization/motion inspection: V-01.
- Documentation and demo composition reuse: gate 7.
- Shared-consumer regressions / package boundaries: V-05.
- Required failures or blocked checks: none.
- Older out-of-scope gaps: none found.
- Changed source revisions / reopened gates: none open.
