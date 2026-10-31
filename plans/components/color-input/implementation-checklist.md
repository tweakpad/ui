# Component implementation and evidence record

## Delivery and source record

- Component(s) / public identity: Color input (`tp-color-input`, `TpColorInput`); Color picker widget (`tp-color-picker`) popup trigger.
- Requested work / claim: complete new component with a default swatch and an inline variant, plus the Color picker popup trigger built from it.
- Scope source: user request 2026-10-31 ("create a new color picker control … open … the standard one … an additional inline variant … chip and the value inline and configurable … also works with our Color Picker Widget") and the answers: swatch + inline row, editable value text, the control as the widget trigger, name `tp-color-input`.
- In-scope changes and existing gaps: the component, its family and recipe, the color model moved to Foundation, the widget's default and authored popup triggers, docs, story, fixtures, bindings. Out of scope: SSR attribute naming (tweakpad/ui#25).
- Repository baseline / unrelated changes: `development` at `7bb8c48` with the uncommitted framework-bindings and Kbd work of this session; `src/presentation/recipes/shared/text-control.ts` was already unformatted at HEAD and is left alone.
- Live project / document IDs and revisions: Spec Blocks `prj_c5a403a0-d1d5-4487-ac78-f4e545f46483`, v0.52.0 (`b4b73e5e`, after content commit `ac74b974` at 0.51.3). Component Library §17 Color input (`ucl17-color-input`, `cinp-*`), coverage row `cinp-coverage-row`; Foundation B.8.3 reason row `cinp-b83-row`; Widgets §6.1 trigger amendment (`cpt-2163`, `uwg-cp-req-ana-trigger`).
- Owning contracts / dependencies / vocabulary: §17 Color input; Form-control contract (`sec-91-formcontrolcontractt`); Semantic invariants; §17.4 Input (inline row, value editor); Field; Widgets §6.1 Color picker.
- Local reference evidence: `../specification/external/tweakpane` `50a18c3d` (clean): `packages/core/src/input-binding/color/view/color-swatch.ts` (`ColorSwatchView`: paint layer under a transparent button), `controller/color.ts` (`ColorController`: swatch + text field row, swatch press opens the picker popup).
- Tool readiness: direct Spec Blocks MCP and Chrome DevTools MCP available.
- Browser / server / build under test: Chrome via DevTools MCP; Vite dev server on sources at `http://[::1]:5173/`.
- Evidence directory: `tmp/component-verification/color-input/2026-10-31/` (screenshots in the session; local only).
- Durable verification fixtures / served URLs: `tests/fixtures/components/color-input/index.html` (`colorInputFixture`); `tests/fixtures/widgets/color-picker/` (`assertColorInputTrigger`); `tests/fixtures/frameworks/{react,vue}/` (`lane('tp-color-input')`).
- Evidence availability to the next agent: local only.

## Capability and interface mapping

| ID   | Requirement / capability and defaults | Live authority | Local reference path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status  | Evidence / gap   |
| ---- | ------------------------------------- | -------------- | ----------------------------- | ------------------------------ | ------------- | ------------ | ------- | ---------------- |
| C-01 | Native picker from the swatch on pointer, Enter and Space; the rendered native color input is the control | `cinp-q1` | `ColorSwatchView` button over paint | `<input type=color part=color-input-control>` covering the swatch, opacity 0 | hero, ## Usage | V-01, V-02 | passed | trusted click and Enter open `:open`; hit test reaches the input |
| C-02 | Picker colors proposed with reason `input`, one commit on close; rejection restores; opaque pick keeps alpha | `cinp-q2` | `ColorController` value | `#nativeInput`, `#nativeChange`, `PickSession` | ### Formats and alpha | V-03, V-04 | passed | event order and alpha retention |
| C-03 | `picker="none"`: a native button that never opens the browser picker | `cinp-q3` | — | button control | ### Another picker | V-05, V-12 | passed | widget trigger opens the popup |
| C-04 | Value text: any notation, serialized in `format`; commits on Enter, blur, paste; invalid reverts; Escape reverts | `cinp-q4` | `TextController` | nested `tp-input mono`, `#commitText` | ### Inline | V-06 | passed | keyboard, input-blur, input-paste reasons |
| C-05 | Names: control from label or Field label; value text "label FORMAT"; row label aria-hidden; label press activates the control | `cinp-q5` | — | `aria-label`, `#rowPress` | ### Inline | V-07 | passed | snapshot names |
| C-06 | Read-only blocks the picker and edits; disabled disables both; required while empty | `cinp-q6` | — | `#guard`, `setRequiredValidity` | ### In a form, ### Disabled and read-only | V-08, V-09 | passed | real click and Enter blocked |
| C-07 | Chip paints the parsed color through the color model, gamut mapped; empty shows the checker | `cinp-q7` | `colorToHexRgbaString` paint | `flatGradient` + `swatchFill` | ### Formats and alpha | V-10 | passed | paint values per format |
| C-08 | `value`/`default-value` controlled and uncontrolled lane; `onValueChange`, `onValueCommitted`; late controlled owner overlay | Form-control contract | — | `ControllableState`, `#overlay` | ### In a form | V-04 | passed | late owner and never-owner |
| C-09 | `format` (hex default) and `alpha` (false) | `cinp-props` | color model | `format`, `alpha`, re-serialization on change | ### Formats and alpha | V-03, V-10 | passed | hsl, rgb alpha, oklch |
| C-10 | `variant` default \| inline; `show-swatch`, `show-value` (true); chip stays when both off | `cinp-props` | `ColorController` row | row with label, chip and text | ### Inline, ### Chip or text | V-11 | passed | screenshots |
| C-11 | `size` sm \| default | `cinp-summary` | — | family axis | ### Sizes | V-11 | passed | screenshots |
| C-12 | Form participation: name, submit, reset, restore | Form-control contract | — | `TpFormElement` | ### In a form | V-09 | passed | FormData and reset |
| C-13 | Field association and inline Field label | Field | Input inline | `rendersFieldLabel`, `associationTarget` | ### In a form | V-07 | passed | describedby on the control |
| C-14 | Events `tp-value-change`, `tp-value-commit`, `tp-field-value`; nested editor events contained | `cinp-b83-row` | — | `containNestedEvents` | API Reference | V-03, V-06 | passed | event log |
| C-15 | Widget default trigger is a Color input with picker none; authored trigger synced, re-proposed, contained, ARIA on its swatch | `uwg-cp-req-ana-trigger` | `ColorController` popup | `#syncColorTrigger`, `#registerAuthoredTrigger` | widgets/color-picker ### Popup | V-12 | passed | `assertColorInputTrigger` 18/18 |
| C-16 | Presentation: parts and keys per §17 Color input; outline swatch, inline row surface, rings | `cinp-presentation-keys` | — | family `color-input`, recipe | API Reference (CSS parts) | V-11, V-13 | passed | screenshots both schemes |
| C-17 | Framework bindings `ColorInput` (React, Vue) and tag types | `ucl24-no-branch` | — | generated | docs/frameworks.md | V-14 | passed | lanes and smoke |

| Issue | Concrete missing/conflicting contract | Affected dependencies | Proposed resolution | Authority / resolution evidence | Status |
| ----- | ------------------------------------- | --------------------- | ------------------- | ------------------------------- | ------ |
| S-1 | No Color input contract; Color picker trigger defined as a swatch Button | Color picker widget | Add §17 Color input, the B.8.3 reason row and the §6.1 trigger amendment | Spec v0.52.0 | passed |
| S-2 | Color model lived in the widget; components may not import widgets | Color picker, Color input | Move it to `src/foundation/color/` | catalog test passes | passed |

## Architecture and reuse

- Component folder and responsibility boundaries: `src/components/color-input/` (`color-input.ts` element, `types.ts`, `index.ts`); paint in `src/presentation/recipes/color-input.ts` and `families/color-input.ts`; color model in `src/foundation/color/`.
- Supported exports / registration / constituent API impact: `TpColorInput` and its types from the main index and `register`; catalog tuple; Field control selector; widget exports unchanged (re-exported from Foundation); the widget's default trigger part `color-picker-trigger` is now a Color input.
- Framework bindings: regenerated with `npm run cem` (React and Vue `ColorInput`, tag types for Preact, Solid and Svelte; widget bindings follow the moved color types); `npm test`, `npm run typecheck` and the React and Vue `lane('tp-color-input')`, `lane('tp-color-picker')` and smoke 201/201 run; `plans/frameworks/ledger.md` row `tp-color-input`.
- Public vocabulary / tokens / parts / presentation review: parts `color-input`, `-row`, `-label`, `-swatch`, `-chip`, `-control`, `-value`; no new tokens; private `--_tp-color-input-paint`, `--_tp-color-input-checker`, `--_tp-color-input-chars`.

### Family dependency map

| Responsibility | Reference dependency path / symbol         | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| -------------- | ------------------------------------------ | --------------------------------- | ------------------------------------------------- | ------------------------------------------ |
| Color parse, serialize, convert, gamut | `color/model`, `converter/color-string.ts` | `src/widgets/color-picker/color/` | moved to `src/foundation/color/` with `normalizeColorText` and `flatGradient`; widget imports it | Color picker, Color input / V-12, V-15 |
| Value lane and form participation | `ColorController.value` | `ControllableState`, `TpFormElement`, Native select pattern | reused | Color input / V-04, V-09 |
| Value text editor | `TextController` | `tp-input mono`, the widget hex field handlers | reused; joined into the row through `registerPart` like Input group | Color input / V-06 |
| Inline row | Input, Select, Switch inline | `shared/inline-control.ts`, `rendersFieldLabel` | reused | Color input / V-11 |
| Swatch paint | `ColorSwatchView` | `shared/swatch.ts` | reused | Color picker, Text editor, Color input / V-10 |
| Outline swatch frame | Button outline | `variantPresentation('outline')`, `controlSizePresentation('icon')` | `outlineFieldPaint` extracted from the Button recipe and shared | Button, Color input / V-13 |
| Popup trigger semantics | `ColorController` popup | `TpAnchoredSurface.registerTrigger`, `targetOf` | authored triggers register directly so the composed control carries ARIA | Color picker / V-12 |
| Nested event containment | — | `containNestedEvents` | reused | Color input, Color picker / V-06, V-12 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations        | Scenario IDs |
| -------------------- | ---------------------------- | ----------------------------------------- | ----------------------------------- | -------------------------------------- | ------------ |
| Swatch (default) | library outline Button | `recipes/core/button.ts` outline + icon size | `variantPresentation`, `outlineFieldPaint`, `controlSizePresentation` | ring drawn on the swatch for the transparent control | V-13 |
| Chip | Color picker preview | `recipes/color-picker.ts` `color-picker-preview` | `swatchFill`, `swatchCorner`, `popupBorder` | inset like the old trigger preview | V-10 |
| Row | library inline row | Input inline | `inlineControlSurface`, `inlineControlRings` | rings while the text is edited; the swatch rings on its own | V-11, V-13 |
| Label | library inline row | Input inline label | `inlineControlLabel` | none | V-11 |
| Value text | Input group control | `joinedEditor` | `joinedEditor`, `inlineControlValue` | mono width by length | V-11 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| ------------------ | ----------- | ------------------------------- | ----------------------------------- | --------------------------------------------- |
| component internals | value text | `tp-input mono` | V-06 | none |
| component internals | swatch control | native `input type=color` / `button` | V-01, V-05 | contract-required native anatomy (`cinp-q1`, `cinp-q3`) |
| docs, fixture | label, help, errors | `tp-field` | V-07 | none |
| docs, fixture | submit and reset | `tp-button` | V-09 | none |
| docs Inline | neighbouring row | `tp-input variant="inline"` | V-11 | none |
| widget popup | trigger | `tp-color-input picker="none"` | V-12 | none |

## Verification scenarios

| ID   | Capability IDs / evidence category | Setup and input     | Expected result     | Actual result | Tool/command and evidence  | Status  | Justification / gap |
| ---- | ---------------------------------- | ------------------- | ------------------- | ------------- | -------------------------- | ------- | ------------------- |
| V-01 | C-01; real input | fixture `#default`, foreground tab, DevTools click | browser picker opens | `:open` true, trusted click, hit test `input.swatch-control` | DevTools click, evaluate | passed | The picker window itself cannot be driven. |
| V-02 | C-01; real keyboard | focus on the swatch, Enter, Escape | opens, closes, focus kept | `:open` true then false, focus on the control | DevTools press_key | passed | Observed in the session; recorded above. |
| V-03 | C-02, C-09, C-14; API | `pick(#default, [#ff0000, #00ff00])` | change per color, one commit start→final | 2 changes + field values, 1 commit `#6d5dfc`→`#00ff00` | `colorInputFixture.pick` | passed | Picks applied through the input's value and events (API evidence). |
| V-04 | C-02, C-08; API | `#inline-alpha` opaque pick; `#rejecting`; `#controlled` late owner; `#frozen` never-owner | alpha 0.5 kept; rejected returns; overlay shown mid-session; never-owner rolls back on close | as expected | fixture evaluate | passed | Observed in the session; recorded above. |
| V-05 | C-03; API | `#button-swatch` | button control, no picker | button rendered | snapshot | passed | Observed in the session; recorded above. |
| V-06 | C-04, C-14; API | type `rebeccapurple` Enter, invalid text blur, Escape, rgb blur, paste oklch | `#663399` keyboard; revert, no events; revert; input-blur; input-paste | as expected | `colorInputFixture.type`, paste events | passed | Observed in the session; recorded above. |
| V-07 | C-05, C-13; accessibility | snapshot | ColorWell named by label or Field; textbox "Fill HEX"; description on the control | as expected | DevTools snapshot | passed | Observed in the session; recorded above. |
| V-08 | C-06; real input | click and Enter on `#readonly` | picker stays closed, focus kept | `:open` false, focused | DevTools click, press_key | passed | Observed in the session; recorded above. |
| V-09 | C-06, C-12; API | submit, reset, required, `validate()` | FormData `accent=#112233`; reset `#6d5dfc`; valueMissing, then valid after a commit; Field error shown and cleared | as expected | fixture evaluate, screenshot | passed | Observed in the session; recorded above. |
| V-10 | C-07, C-09; visual | hex, rgb alpha, hsl, empty | chip paint per color, checker under alpha and empty | as expected | screenshots dark and light | passed | Observed in the session; recorded above. |
| V-11 | C-10, C-11, C-16; visual | inline rows, show-swatch/show-value, sm, RTL, 400px | aligned rows, chip then text at the end, no clipping, no overflow | text scroll = client width; 10px chip gap; 400px no overflow | screenshots, evaluate | passed | Observed in the session; recorded above. |
| V-12 | C-03, C-15; widget | widget fixture `assertColorInputTrigger`, real click on the authored swatch, ArrowRight, Escape | 18 checks; popup opens; row follows; focus returns | 18/18; open; row `#653199`; focus on swatch | DevTools fixture, click, press_key | passed | Observed in the session; recorded above. |
| V-13 | C-16; visual | Tab to swatch and text, hover, invalid focus, light/dark | swatch ring vs row ring; outline hover fill; destructive ring | as expected | screenshots | passed | Observed in the session; recorded above. |
| V-14 | C-17; frameworks | React and Vue `lane('tp-color-input')`, `lane('tp-color-picker')`, smoke | pass; 201/201 | as expected | DevTools fixtures | passed | Observed in the session; recorded above. |
| V-15 | C-15; regression | widget helpers in file order | all pass | 15/15 | DevTools fixture | passed | Observed in the session; recorded above. |
| V-16 | C-07, C-16; accessibility automation | injected axe-core, dark and light | no violations | none | evaluate | passed | Observed in the session; recorded above. |
| V-17 | C-01, C-08, C-12, C-14, C-16, C-17; non-browser | `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, `check-docs`, `npm run size:report`, `npm run test:package` | pass | pass; lint only reports the pre-existing `text-control.ts` | commands | passed | Observed in the session; recorded above. |
| V-18 | C-10, C-16; update cost regression | `inline-update-cost` fixture: 40 inline color inputs in one shadow root, controlled value, hook on instance 0; 20 value changes and 30 updates per frame; dist from 3eeb6b4 vs this tree | no presentation refresh and no attribute rewritten to its own value per value change; hook kept; forced refresh changes nothing | 62.2 → 5 records per change (57 → 0 no-op), refresh 2 → 0; 120 → 90 µs per update, frame 9.2 → 7.4 ms; safety 0 differences; color picker fixture 107/107 | DevTools MCP, `tests/fixtures/components/inline-update-cost/` (`counters`, `startTiming`, `safety`), baseline `tmp/inline-update-cost/baseline.json` | passed | Shared fix for tweakpad/ui#26. |

## Early integration checkpoint

| ID   | Check                                                                                             | Status  | Evidence / unresolved finding                               |
| ---- | ------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------- |
| I-01 | Shared owners are actually used by related consumers; old duplicate behavior is removed/delegated | passed | The widget and the component import `src/foundation/color/`; the widget folder keeps only harmony, scheme and contrast; Button and Color input share `outlineFieldPaint`; the value editor joins like Input group's |
| I-02 | Default visual regions match traced source and shared library recipes                             | passed | default swatch matches the outline Reset Button; inline rows align with the inline Input |
| I-03 | Independent constituent options work, including placement separately from action behavior         | passed | show-swatch/show-value combinations, picker none vs native, sizes, formats, alpha |

## Gate record

| Gate                                  | Status  | Required exit evidence / remaining work                                               |
| ------------------------------------- | ------- | ------------------------------------------------------------------------------------- |
| 0. Sources and scope                  | passed | Spec v0.52.0 read and amended; tweakpane color swatch and controller read. |
| 1. Capability mapping                 | passed | C-01…C-17; S-1, S-2 resolved. |
| 2. Architecture and composition reuse | passed | Color model in Foundation; shared recipes; widget trigger composed from the component. |
| 3. Behavior                           | passed | V-01…V-09, V-12. |
| 4. Presentation and customization     | passed | V-10, V-11, V-13; parts and keys per the definition. |
| 5. Accessibility                      | passed | V-07 tree, V-02/V-08/V-13 keyboard and focus, V-16 axe; no screen-reader run. |
| 6. Visual and interaction inspection  | passed | V-10, V-11, V-13 in both schemes, RTL and 400px. |
| 7. Documentation and demo reuse       | passed | `docs/components/color-input.mdx`, widget Popup section; check-docs passes for both. |
| 8. Regression and reconciliation      | passed | V-14, V-15, V-17. |

## Documentation synchronization

- [x] `docs/components/color-input.mdx` follows the tweakpad-docs skill; `check-docs.mjs components/color-input` passes; the story renders it with `libraryDocs()`; no pending entry.
- [x] JSDoc covers the element summary, every public field and method and the events; parts carry descriptions in the family; `npm run build` reports no undescribed row.
- [x] `elementDependencies` lists `TpInput`; the widget lists `TpColorInput`.
- [x] Verification fixtures are separate from the page.
- [x] Previews reuse library components (`tp-field`, `tp-input`, `tp-button`).
- [x] Preview code works outside Storybook.

## Completion / handoff

- Change summary: new Color input component (browser picker, inline row, editable text), color model moved to Foundation, Color picker popup trigger built from it and authored triggers registered with the Popover directly.
- Actual delivery claim: complete Color input component and the Color picker trigger amendment.
- Record checker: `check-gates.mjs … --stage complete` (see the final report).
- Non-browser checks: V-17.
- Behavior: V-01…V-09, V-12.
- Accessibility: V-07, V-16; keyboard V-02, V-08, V-13; no assistive-technology run.
- Visual/customization/motion inspection: V-10, V-11, V-13.
- Documentation and demo composition reuse: gate 7.
- Shared-consumer regressions / package boundaries: V-14, V-15, V-17.
- Required failures or blocked checks: the browser's picker window cannot be driven through DevTools; picks are applied through the input (V-03).
- Older out-of-scope gaps: SSR attribute naming (tweakpad/ui#25).
- Changed source revisions / reopened gates: none open.
