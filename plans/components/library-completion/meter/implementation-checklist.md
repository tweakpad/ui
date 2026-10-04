# Meter Foundation implementation record

## Delivery and source record

- Requested work / claim: implement the missing Meter Foundation capability within the whole-library objective; keep existing Progress behavior and no new catalog identity.
- Scope source: user goal explicitly requires the whole library; live audit coverage distinguishes Foundation-only optional Meter from the Progress catalog control.
- Sources: direct full Foundation and Library reads on 2026-10-04, head8440bff24a97dbbc5c762ebf4bd6baa958b305e1; sec-182-meter, sec-183-progress, audit-foundation-catalog-coverage-map. Clean upstream pins in ../audit.md.
- References read: Base meter/root/MeterRoot.tsx and tests, label/value/indicator/track constituents, utils/valueToPercent. shadcn has Progress but no separate Meter identity; shared normalization does not make measurement task progress.
- Existing owner: components/progress/state.ts owns range validation, clamping and LocaleService formatting. Extract that behavior into Foundation numeric-range.ts and consume it from both Progress state and Meter state.
- Tools: direct Spec Blocks and Chrome MCP available, existing Vite5173 and Storybook6006 retained. Native OS media emulation unavailable.

## Capability and interface mapping

| ID | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Required scalar, min0/max100, clamped finite/nonfinite geometry, invalid range diagnostic | sec-182-meter | MeterRoot.tsx/tests range | meterState and shared numeric range snapshot | docs/meter.md | V-01 | passed | Mapped API implemented; corresponding V rows record observed source/built evidence. |
| C-02 | Locale/format, default percentage, explicit valueText/resolver receives raw value | sec-182-meter | MeterRoot format/getAriaValueText tests | LocaleService through common range formatter | docs/meter.md | V-01 | passed | Mapped API implemented; corresponding V rows record observed source/built evidence. |
| C-03 | Root meter role/current/range/text, optional Label naming and Value resolver | sec-182-meter | MeterRoot/Label/Value | MeterController on authored native root, registerPart for optional constituents; Lit content renderer for Value | docs/meter.md | V-02 | passed | Mapped API implemented; corresponding V rows record observed source/built evidence. |
| C-04 | Track/Indicator normalized state and geometry; optional constituents independently removable | sec-182-meter | MeterTrack/Indicator | stable immutable state shared by all registrations, Indicator inlineSize from percent | docs/meter.md | V-02 | passed | Mapped API implemented; corresponding V rows record observed source/built evidence. |
| C-05 | Dynamic options/locale/label replacement, cleanup and reconnect, restore authored attributes/content | shared lifecycle/parts | Base constituent context/effect cleanup | controller update/refresh/registerPart release/dispose; owner-window MutationObserver | docs/meter.md | V-03 | passed | Mapped API implemented; corresponding V rows record observed source/built evidence. |
| C-06 | Existing Progress status/indeterminate/motion/presentation unchanged | sec-183-progress | ProgressRoot, local progress/state.ts | shared range extraction; existing Progress renderer and recipe retained | docs/progress.md | V-01 V-04 | passed | Mapped API implemented; corresponding V rows record observed source/built evidence. |
| C-07 | Public exports, complete Foundation docs and native fixture, no catalog addition | audit coverage map | Base meter/index.parts.ts | foundation/index exports controller/state; source/built fixture | docs/meter.md | V-04 | passed | Mapped API implemented; corresponding V rows record observed source/built evidence. |

## Architecture and reuse

Meter is a Foundation controller over authored native anatomy, matching the existing CheckboxGroup exposure and avoiding an unauthorized catalog control. Its root and optional constituents are one owner; Progress retains its own component binding while both consume the same numerical snapshot/formatting owner. Meter has no task status, selection, interaction or motion owner. A constituent registration returns cleanup and accepts optional Value content; public state snapshots support custom Lit rendering without a second numeric model.

### Family dependency map

| Responsibility | Upstream dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| --- | --- | --- | --- | --- |
| Range/format | MeterRoot and ProgressRoot -> formatNumber/clamp/valueToPercent | progress/state.ts, LocaleService | Extract numeric normalization and formatting; Meter nonfinite clamps while Progress remains indeterminate | meterState, progressState V-01 V-04 |
| Native lifecycle | Base Meter context and constituent effects | CheckboxGroupController, createId, resolveLocale | Existing Foundation controller pattern, explicit native registrations and owner-window observer; no value proposals for read-only measurement | MeterController V-02 V-03 |
| Content rendering | MeterValue children resolver -> useRenderElement | Lit render, public Foundation composition | Render only owned Value content, retain original nodes for cleanup | optional Meter Value V-02 V-03 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| --- | --- | --- | --- | --- | --- |
| Root/Track/Indicator/Value/Label | Base unstyled Meter; no shadcn Meter | meter constituents only provide semantics and percentage geometry | Existing native meter or consumer-authored Foundation anatomy | No new visual control or spacing tokens; fixture uses native meter and native text. Progress recipe unchanged | V-02 V-04 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| --- | --- | --- | --- | --- |
| Foundation meter fixture/docs | measurement, label/value, update action | native meter anatomy; actual TpButton for update | Native AX role and semantics, source/package imports | No catalog Meter exists by contract, native measurement is deliberate Foundation binding |
| Progress regression | progressbar | actual TpProgress | State and native AX preservation | None |

## Verification scenarios

| ID | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V-01 | C-01 C-02 C-06 | Bounds, nonfinite/range overflow, locale/format/resolver plus existing Progress cases | Coherent immutable range/format; Progress unchanged | 21 focused Meter/Progress assertions pass: nonzero bounds, NaN/infinities, invalid ranges/extent, raw resolver values and locale fallback. Existing Progress semantic outputs retained. | focused Vitest | passed | Observed evidence; source screenshot inspected inline, built package tested separately. |
| V-02 | C-03 C-04 | Native root, label/value/track/indicator with independent registrations and custom Value content | Named meter, synchronized semantics/state/geometry | Chrome66 source: native meter named Storage used with30 in20..40; Value50%. Optional Indicator75% and Track share identical immutable state. Releasing Indicator clears geometry; releasing Value restores original node. Real public Button click updates35 and75%. | Chrome MCP AX/public APIs/axe | passed | Observed evidence; source screenshot inspected inline, built package tested separately. |
| V-03 | C-05 | Locale change, replacement/removal, consumer attribute updates and disposal/reconnect | No stale binding or overwritten author values; cleanup | Chrome66 source: Infinity clamps100, custom Value receives raw Infinity; inherited de-DE yields100 NBSP %. Label id rename updates actual element association. Empty content resolver stays empty. Release/dispose preserves later authored text/23% size, restores role/original nodes; fresh controller on same Value renders25%. | Chrome MCP public APIs | passed | Observed evidence; source screenshot inspected inline, built package tested separately. |
| V-04 | C-06 C-07 | Actual Progress, source/built exports, docs/types/lint | Existing Progress retained and documented Foundation exposure usable | TypeScript, focused ESLint, production build pass. Served built fixture exposes all three public Meter APIs, clamps Infinity to40 with100% text while existing Progress becomes indeterminate and omits current value. Authored Foundation docs and fixture use native meter plus actual public Button/Progress. | Chrome MCP/build/static | passed | Observed evidence; source screenshot inspected inline, built package tested separately. |

## Early integration checkpoint

| ID | Check | Status | Evidence / unresolved finding |
| --- | --- | --- | --- |
| I-01 | Actual shared owners | passed | Diff extracts Progress range/format policy to Foundation; Progress and Meter both consume it. Existing Progress21 combined state assertions pass. |
| I-02 | Intended Foundation presentation boundary | passed | Chrome66 dark screenshot inspected: browser-native meter distinct from unchanged themed Progress, actual shared Button update action; no new catalog paint. |
| I-03 | Independent constituents | passed | Chrome66 API binds named root and shared constituent state,75% indicator; releasing Indicator clears owned width, releasing Value restores Original while Track stays registered. |

## Gate record

| Gate | Status | Required exit evidence / remaining work |
| --- | --- | --- |
| 0. Sources and scope | passed | Fresh full docs; exact Meter/Progress contracts and upstream constituent tests read |
| 1. Capability mapping | passed | C-01..C-07 cover state, semantics, optional constituents, lifecycle and public exposure |
| 2. Architecture and composition reuse | passed | Extract existing range owner; preserve actual Progress renderer and recipes; native Foundation controller avoids catalog duplication |
| 3. Behavior | passed | Focused shared state tests and native lifecycle/API V-01..V-03 pass. |
| 4. Presentation and customization | passed | Foundation exposes no independent paint; native meter and unchanged actual Progress screenshot inspected. Optional Value resolver and geometry cleanup pass. |
| 5. Accessibility | passed | Verbose AX exposes named meter/current/min/max; local axe main scope0 violations. DOM aria-valuetext matches visible formatting; snapshot tool reports an empty text field for both native Meter and existing Progress, so no speech claim. |
| 6. Visual and interaction inspection | passed | Dark source screenshot inspected; native browser meter is deliberate Foundation anatomy, existing Progress presentation unchanged. Meter has no motion or authored theme to certify with OS media. |
| 7. Documentation and demo reuse | passed | docs/meter.md reconciles exports/options/parts/state/content/cleanup; source/built fixture uses actual shared controls. |
| 8. Regression and reconciliation | passed |21 focused tests, TypeScript, ESLint, production and Storybook builds, source/built Chrome and diff check pass. Meter Foundation boundary only; whole-library manifest remains active. |

## Current scope status

Meter Foundation implementation and focused source/built evidence pass. This does not complete the whole-library goal: NumberField, Toolbar, free-text Autocomplete, provider mapping and the complete catalog/constituent manifest remain active. Full inherited-OS-media evidence for existing visual controls remains separately tracked.
