# Component implementation and evidence record

## Delivery and source record

- Component(s) / public identity: Slider (`tp-slider`, `tp-slider-thumb`); Field (`tp-field`) label hand-off.
- Requested work / claim: add ticks (interval in value units, free or snapping, distinct center, center detent) to every Slider variant, and a new `inline` variant (compact stackable control-height row, label and value inside, fill as background) as a presentation of the existing control.
- Scope source: user request 2026-10-29 ("extend the slider types to include ticks…", "a new variant called inline…", "we concentrate only on slider for now, it needs to be polished and ready to use"); approved plan `~/.claude/plans/we-want-to-extend-glistening-panda.md`.
- In-scope changes and existing gaps: Slider value lattice, ticks, inline variant, shared inline-control recipe, Field label ownership hook. Inline variants of Input, Select and Switch are later work (user: "all of them will have this inline variant").
- Repository baseline / unrelated changes: `development` at cac27a0, clean tree.
- Live project / document IDs and revisions: UI Library `prj_c5a403a0-…`; read at head `bc79e887` (v0.46.0); amended in `85dd29fb` (v0.46.1), bumped `9fa2c455` (v0.47.0), corrected `a01f594a` (v0.47.1). Documents: Component Library `doc_8077bf7c-…` §17.9 Slider, Foundation `doc_cd3c4721-…` §14.8 Slider and §14.3 Field.
- Owning contracts / dependencies / vocabulary: §17.9 props rows `sltk-prop-0/1`, variant row `ucl17-slider-props-variant`, parts `sltk-pub-0`, `sltk-detail-0`, requirements `sltk-q1`, `sltk-q2`; Foundation `sltk-f1` (tick lattice and center detent), `sltk-f2` (Field label ownership).
- Local reference evidence: `../specification/external/` base-ui `packages/react/src/slider/*` (step lattice `roundValueToStep`), videojs-v10 `core/ui/slider/segments.ts`, media-chrome `media-chrome-range.ts` segments, base-ui `docs/src/app/(private)/experiments/slider/inset.tsx` (full-height fill). No reference implements ticks or an in-bar label; both contracts were added to the spec first.
- Tool readiness: direct Spec Blocks MCP and Chrome DevTools MCP available.
- Browser / server / build under test: Chrome via DevTools MCP; Vite dev server `127.0.0.1:5391` on sources; `npm run build` dist.
- Evidence directory: `tmp/component-verification/slider/2026-10-29/` (screenshots taken in-session; local only).
- Durable verification fixtures / served URLs: `tests/fixtures/components/slider/index.html` (existing), `tests/fixtures/components/slider/ticks-inline.html` (new; `window.sliderTicksInlineAPI.assertTicks()`, `.assertInline()`).
- Evidence availability to the next agent: local only.

## Capability and interface mapping

| ID   | Requirement / capability and defaults | Live authority | Local reference path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status  | Evidence / gap   |
| ---- | ------------------------------------- | -------------- | ----------------------------- | ------------------------------ | ------------- | ------------ | ------- | ---------------- |
| C-01 | `ticks` interval in value units from `minimum`, none by default; clamped to the domain | `sltk-prop-0`, `sltk-f1` | none (new); lattice from base-ui `roundValueToStep` | `TpSlider.ticks`; `sliderTicks()` in `src/foundation/slider.ts` | slider.mdx ### Ticks | V-01 | passed | T01, unit tests |
| C-02 | Center tick on the domain midpoint, distinct paint, always drawn | `sltk-prop-0`, `sltk-q1` | none | `SliderTick.center`, `data-center`; recipe `slider-tick` | ### Ticks | V-01, V-05 | passed | T01, screenshots |
| C-03 | Tick markers `data-center`, `data-filled`, `data-edge`, aria-hidden inside the Track, Thumb geometry | `sltk-q1` | videojs segments geometry | `slider-tick` part, `#axisPosition()` shared with `thumbPosition()` | API Reference (part) | V-01, V-06 | passed | T01, T02, I05 |
| C-04 | Only selectable ticks are drawn (on the value lattice); center tick and detent only when the midpoint is selectable; thinning to a minimum drawn spacing; snapping uses every tick | `sltk-q1` | none | `sliderTicks(length, spacing)`, control length from the ResizeObserver | ### Ticks | V-02 | passed | unit test "thins drawn ticks" |
| C-05 | `snapToTicks` / `snap-to-ticks`, default false: interval replaces step for pointer, keys, form input, normalization, separation | `sltk-prop-1`, `sltk-f1` | base-ui step lattice | `#step` getter used by `#normalize`, `#move`, `#pointerValue`, keys, `thumbState().step` | ### Ticks | V-03 | passed | T06, real ArrowRight 1→1.25→1.5 |
| C-06 | Center detent for free movement: pointer within 6px proposes the center; keys/programmatic unaffected | `sltk-f1` | none | `sliderCenterDetent()`, `SLIDER_CENTER_DETENT` | ### Ticks | V-04 | passed | T03–T05 |
| C-07 | `ticks` validation diagnostic | `sltk-prop-0` | — | `sliderConfigurationError(…, ticks)` | — | V-02 | passed | unit test |
| C-08 | `variant="inline"`: control-height row, label inline-start, output inline-end, full-height Range ending at the value | variant row, `sltk-q2` | base-ui inset experiment (full-height fill) | `styles.ts` inline grid; recipe `*-variant-inline` | ### Inline | V-05, V-06 | passed | I01–I03, screenshots |
| C-09 | Inline output on without configuration | variant row | — | `output = contract ∥ slot ∥ #inline` | ### Inline | V-06 | passed | I02 |
| C-10 | Inline handle: full-height primary edge at the value while hovered, pointed, dragged or focused, painted by the Range and trimmed by the bar's rounded clip (both ends of a multi-value range); primary fill on the muted row | variant row, `sltk-q2` | — | `slider-range-variant-inline::after`/`[data-multiple]::before`, `inlineControlFill`, `inlineControlEdge` | ### Inline | V-05 | passed | light and dark screenshots, axe clean |
| C-11 | Inline press on label or output moves the value (unchanged jump + drag) | variant row | existing track press | header `pointer-events: none` | ### Inline | V-07 | passed | I04 |
| C-12 | Inline focus and validity ring the row; disabled, read-only | variant row | — | `inlineControlRings('[part~="slider"]')` | ### Inline | V-05 | passed | screenshots, axe |
| C-13 | Vertical inline keeps default presentation | variant row | — | styles scoped `:not([orientation=vertical])`, recipe `horizontal()` scope, `#inline` | ### Inline | V-08 | passed | I08, screenshot |
| C-14 | Field label ownership: Field hides its label visually, control shows it, name preserved | `sltk-f2` | — | `TpFormElement.rendersFieldLabel`, Field `data-control-label`, slider label fallback `aria-hidden` | ### Inline | V-09 | passed | I06, I07, a11y tree |
| C-15 | Shared inline-control paint for later controls | plan | — | `src/presentation/recipes/shared/inline-control.ts` | — | V-05 | passed | used by slider recipe |

| Issue | Concrete missing/conflicting contract | Affected dependencies | Proposed resolution | Authority / resolution evidence | Status |
| ----- | ------------------------------------- | --------------------- | ------------------- | ------------------------------- | ------ |
| S-1 | No ticks, snap-to-ticks or center contract | Slider | Add props, part, requirements | Spec v0.46.1/v0.47.0 | passed |
| S-2 | No inline variant or Field label ownership | Slider, Field | Add variant text, `sltk-q2`, `sltk-f2` | Spec v0.46.1; geometry corrected v0.47.1 | passed |

## Architecture and reuse

- Component folder and responsibility boundaries: value math in `src/foundation/slider.ts`; rendering and pointer in `src/components/slider/slider.ts`; layout in `styles.ts`; paint in `src/presentation/recipes/slider.ts` and `shared/inline-control.ts`.
- Supported exports / registration / constituent API impact: new `SliderVariant` export; new props `ticks`, `snapToTicks`; new part `slider-tick`; `rendersFieldLabel` on form elements; no registration change.
- Public vocabulary / tokens / parts / presentation review: names follow the spec rows; token roles only (input surface, foreground mixes, ring).

### Family dependency map

| Responsibility | Reference dependency path / symbol         | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| -------------- | ------------------------------------------ | --------------------------------- | ------------------------------------------------- | ------------------------------------------ |
| Value lattice | base-ui `roundValueToStep` | `snapSliderValue`, `moveSliderThumb` | reused; the effective step is the tick interval while snapping | media sliders, color picker, easing editor / V-10 |
| Tick geometry | videojs `SliderSegmentsCore` | `normalizeSliderSegments` + `thumbPosition` | new `sliderTicks`; position shared with Thumbs through `#axisPosition` | V-01 |
| Inline row paint | base-ui inset experiment | `fieldBoundary`, `fieldFocus`, `fieldInvalid` (`shared/text-control.ts`) | reused via `shared/inline-control.ts` | slider; future Input/Select/Switch inline |
| Field label | Field.Label | `tp-field` `#associate`, `setFieldAssociation` | repaired: `rendersFieldLabel` hook, visually hidden label | V-09 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations        | Scenario IDs |
| -------------------- | ---------------------------- | ----------------------------------------- | ----------------------------------- | -------------------------------------- | ------------ |
| Inline row (Track) | user reference image | full-height bar | `fieldBoundary` surface + rings | row surface matches Input | V-05 |
| Inline fill (Range) | library slider colors | primary range on the muted track | primary 30% mix on `--tp-muted` | user: library colors, no grays | V-05 |
| Inline handle (Thumb) | user direction 2026-10-29 | full-height edge at the value | primary edge | shown only while in use | V-05 |
| Ticks | user reference image | hairlines, longer center | muted / foreground mixes | edge ticks hidden inline | V-01 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| ------------------ | ----------- | ------------------------------- | ----------------------------------- | --------------------------------------------- |
| fixture `#stack` | filter rows | `tp-slider` inline | V-05 | stack is native grid layout |
| docs Inline in a field | label, description | `tp-field` | V-09 | none |

## Verification scenarios

| ID   | Capability IDs / evidence category | Setup and input     | Expected result     | Actual result | Tool/command and evidence  | Status  | Justification / gap |
| ---- | ---------------------------------- | ------------------- | ------------------- | ------------- | -------------------------- | ------- | ------------------- |
| V-01 | C-01, C-02, C-03; behavior | `#ticks` −50…50, ticks 10 | 11 ticks, one center, filled markers | as expected | `assertTicks` T01–T02 | passed | Recorded in the Actual result and evidence columns; fixture `ticks-inline.html` reruns it. |
| V-02 | C-04, C-07; unit | `npx vitest run src/foundation/slider.test.ts` | helpers pass | 24 tests pass | vitest | passed | Recorded in the Actual result and evidence columns; fixture `ticks-inline.html` reruns it. |
| V-03 | C-05; real keyboard + pointer | Tab to `#snap`, ArrowRight ×2; press at 60% | 1.25, 1.5; 1.25; input step 0.25 | as expected | DevTools `press_key`, T06 | passed | Recorded in the Actual result and evidence columns; fixture `ticks-inline.html` reruns it. |
| V-04 | C-06; pointer (dispatched at hit-tested element) | presses at center ±3…12px, drag ending +4px | ≤6px → 0, farther → 1, 2 | as expected | T03–T05 | passed | dispatched events, not physical input |
| V-05 | C-08, C-10, C-12, C-15; visual | dark/light, hover, keyboard focus, invalid/disabled/read-only, 400px | matches reference rows | as expected | screenshots in session | passed | Recorded in the Actual result and evidence columns; fixture `ticks-inline.html` reruns it. |
| V-06 | C-09, C-03; behavior | `#distance`, `#rating` | output 7 km, edge ticks hidden | as expected | I02, I05 | passed | Recorded in the Actual result and evidence columns; fixture `ticks-inline.html` reruns it. |
| V-07 | C-11; pointer | press on label and output | value moves | 2 and 47 | I04 | passed | Recorded in the Actual result and evidence columns; fixture `ticks-inline.html` reruns it. |
| V-08 | C-13; visual | `#inline-vertical` | default vertical look | as expected | I08, screenshot | passed | Recorded in the Actual result and evidence columns; fixture `ticks-inline.html` reruns it. |
| V-09 | C-14; accessibility | `#inline-field`, switch variant to default | label in bar, Field label hidden, name "Check-in flexibility", restored on default | as expected | I06, I07, a11y snapshot | passed | Recorded in the Actual result and evidence columns; fixture `ticks-inline.html` reruns it. |
| V-10 | C-01, C-05, C-08; regression | existing slider fixture, media player, color picker, easing editor | unchanged | all slider asserts pass (C07 fixture repaired: drag moves carry `buttons`) | DevTools fixtures | passed | Recorded in the Actual result and evidence columns; fixture `ticks-inline.html` reruns it. |
| V-11 | C-03, C-12, C-14; accessibility automation | axe on ticks-inline fixture, dark and light | no violations | none | injected axe-core | passed | Recorded in the Actual result and evidence columns; fixture `ticks-inline.html` reruns it. |
| V-12 | C-08, C-12, C-15; update cost regression | `inline-update-cost` fixture: 40 inline sliders in one shadow root, controlled value, hook on instance 0; 20 value changes and 30 updates per frame; dist from 3eeb6b4 vs this tree | no presentation refresh and no attribute rewritten to its own value per value change; hook kept; forced refresh changes nothing | 66.2 → 15 mutation records per change (51 → 0 no-op), refresh 2 → 0, querySelectorAll 12.1 → 2.1; 173 → 127 µs per update, frame 9.9 → 7.8 ms; safety 0 differences; slider fixture 119/119, ticks-inline 14/14 | DevTools MCP, `tests/fixtures/components/inline-update-cost/` (`counters`, `startTiming`, `safety`), baseline `tmp/inline-update-cost/baseline.json` | passed | Shared fix for tweakpad/ui#26 (bindPart, PresentationController, markers, Field association). The remaining cost is the Slider's own `#refreshThumbs` scans. |

## Early integration checkpoint

| ID   | Check                                                                                             | Status  | Evidence / unresolved finding                               |
| ---- | ------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------- |
| I-01 | Shared owners are actually used by related consumers; old duplicate behavior is removed/delegated | passed | `#axisPosition` serves Thumbs and Ticks; inline paint reuses text-control boundary and rings; Field hook generic |
| I-02 | Default visual regions match traced source and shared library recipes                             | passed | first render compared with the reference image; vertical-inline regression found and fixed |
| I-03 | Independent constituent options work, including placement separately from action behavior         | passed | ticks × snap × variant × orientation × Field combinations in the fixture |

## Gate record

| Gate                                  | Status  | Required exit evidence / remaining work                                               |
| ------------------------------------- | ------- | ------------------------------------------------------------------------------------- |
| 0. Sources and scope                  | passed | Spec read at v0.46.0, amended to v0.47.1; scope from the user request. |
| 1. Capability mapping                 | passed | C-01…C-15 mapped; S-1, S-2 resolved in the spec. |
| 2. Architecture and composition reuse | passed | Family and presentation maps above. |
| 3. Behavior                           | passed | V-01, V-03, V-04, V-06, V-07, V-10. |
| 4. Presentation and customization     | passed | Parts and keys resolve (`slider-bar.test.ts`), tokens only. |
| 5. Accessibility                      | passed | V-09 tree, V-03 keyboard, V-11 axe. |
| 6. Visual and interaction inspection  | passed | V-05, V-08. |
| 7. Documentation and demo reuse       | passed | slider.mdx Inline and Ticks sections; check-docs passes; story args. |
| 8. Regression and reconciliation      | passed | `npm test`, `npm run build`, consumer fixtures. |

## Documentation synchronization

- [x] `docs/components/slider.mdx` follows the tweakpad-docs skill; `check-docs.mjs components/slider` passes.
- [x] JSDoc covers `ticks`, `snapToTicks`, `variant`; `slider-tick` has a part description.
- [x] `elementDependencies` unchanged (no new rendered elements).
- [x] Verification fixtures are separate from the page.
- [x] Previews reuse library components (`tp-field`).
- [x] Preview code works outside Storybook.

## Completion / handoff

- Change summary: ticks with snapping, center mark and detent; inline variant; shared inline-control paint; Field label ownership hook.
- Actual delivery claim: Slider ticks and inline variant as specified in v0.47.1.
- Record checker: see the final report.
- Non-browser checks: `npm test` (all pass), `npm run build` (pass), check-docs (pass).
- Behavior: V-01…V-07, V-10.
- Accessibility: V-09, V-11; no screen-reader run.
- Visual/customization/motion inspection: V-05, V-08.
- Documentation and demo composition reuse: gate 7.
- Shared-consumer regressions / package boundaries: V-10.
- Required failures or blocked checks: none.
- Older out-of-scope gaps: the slider fixture's C07 dispatched moves without `buttons` (repaired); a decimal native input reports `valuenow` with float noise (1.2000000476837158), pre-existing.
- Changed source revisions / reopened gates: none open.
