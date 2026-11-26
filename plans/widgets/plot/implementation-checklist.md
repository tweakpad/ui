# Plot implementation and evidence record

## Delivery and source record

- Requested work / claim: implement all capabilities of the approved plans/widgets/plot/plan.md, including mandatory incremental push/latest history rendering.
- Scope source: user “lets do it”; display/configuration only, all four supplied image cases.
- Live authority: direct Foundation, Library, Widgets ASTs at 4303a769; Plot amendment committed e2b945d3 (v0.56.15), validates with zero issues.
- Local evidence: sibling specification/external monitor graph-log controller/view and buffered-value at 50a18c3d, clean; rendering additions expressly user-approved.
- Shared ownership: TpElement; CanvasSurface with backward-compatible external schedule/DPR hooks; frame source; existing visualization metadata/content.
- Framework bindings: generated after manifest update; widget entries only.
- Browser: Google Chrome DevTools MCP exclusively; fixture tests/fixtures/widgets/plot/.
- Evidence: tmp/component-verification/plot/; no claim for checks not executed.

## Capability and interface mapping

| ID | Requirement / capability and defaults | Live authority | Local reference path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Static 2D data, series metadata, gaps and authored nonmonotonic paths; defaults in plan §4 | uwg-plot-sec and owning shared contracts | plan §9 source map, graph-log and shared local owners | data/types, geometry | docs/widgets/plot.mdx | V-01 | passed | Unit stream/decimation cases; bare waveform and all six website previews render; authored nonmonotonic point order preserved. |
| C-02 | Bounded explicit streams, atomic batches, retention and revisions; defaults in plan §4 | uwg-plot-sec and owning shared contracts | plan §9 source map, graph-log and shared local owners | stream | docs/widgets/plot.mdx | V-02 | passed | Unit atomic/oversize/wrap/gap/dispose checks; browser 256 and 1024 retained counts stay bounded. |
| C-03 | Index push and latest-only revisions; defaults in plan §4 | uwg-plot-sec and owning shared contracts | plan §9 source map, graph-log and shared local owners | stream/history-raster | docs/widgets/plot.mdx | V-03 | passed | Chrome push/replace/retract comparisons: latest updates shift zero pixels; history shifts integer pixels only. |
| C-04 | Static/scroll/push domains, fixed/auto, clock follow; defaults in plan §4 | uwg-plot-sec and owning shared contracts | plan §9 source map, graph-log and shared local owners | geometry | docs/widgets/plot.mdx | V-04 | passed | Static and push domains observed; fixed/auto helpers and scroll implementation inspected; clock follow finite/regression handling implemented. Chrome clock follow advanced [-20,100] to [-15,105], held the last clock on regression and retained the coherent picture for NaN with diagnostics. |
| C-05 | Linear/step strokes, areas and signed crossings; defaults in plan §4 | uwg-plot-sec and owning shared contracts | plan §9 source map, graph-log and shared local owners | renderer | docs/widgets/plot.mdx | V-05 | passed | Chrome raster-check: overlapping signed/baseline areas, gaps and dashed linear/step-before/step-after compare with full baseline; results in performance.md. |
| C-06 | Incremental integer blit, fractional offsets, tail damage, rebases; defaults in plan §4 | uwg-plot-sec and owning shared contracts | plan §9 source map, graph-log and shared local owners | history-raster | docs/widgets/plot.mdx | V-06 | passed | Chrome long run at DPR 1.25 and 2: no ordinary full redraws; subpixel offset and alpha recomposition measured in performance.md. |
| C-07 | Peak/gap preserving reduction and window lookup; defaults in plan §4 | uwg-plot-sec and owning shared contracts | plan §9 source map, graph-log and shared local owners | decimation | docs/widgets/plot.mdx | V-07 | passed | Unit extrema/gap/order cases; binary window lookup and bounded column reduction inspected. Dashed strokes retain raw path-length checkpoints for phase fidelity. |
| C-08 | Axes, time/number ticks and labels independently optional; defaults in plan §4 | uwg-plot-sec and owning shared contracts | plan §9 source map, graph-log and shared local owners | decorations | docs/widgets/plot.mdx | V-08 | passed | Website numeric axes/titles/labels and independent x labels/ticks; RTL y-axis placement inspected. Chrome observed 08:00 PM, 08:30 PM, 09:00 PM, 09:30 PM ticks; calendar month boundaries and collision suppression implemented. |
| C-09 | Background none/solid/dots/grid and custom guides; defaults in plan §4 | uwg-plot-sec and owning shared contracts | plan §9 source map, graph-log and shared local owners | decorations | docs/widgets/plot.mdx | V-09 | passed | Chrome solid/dots/grid/no-background; front/back guides and variable colors; guide-only change adds no history redraw columns. |
| C-10 | Independent sampling and render rate, manual/paused states; defaults in plan §4 | uwg-plot-sec and owning shared contracts | plan §9 source map, graph-log and shared local owners | sampler/scheduler | docs/widgets/plot.mdx | V-10 | passed | Unit sampler start/pause/resume/deadlines; Chrome idle/manual/paused/resume counters; manual writes produce zero scheduled paints. |
| C-11 | Shared budget, fairness, custom scheduling and cleanup; defaults in plan §4 | uwg-plot-sec and owning shared contracts | plan §9 source map, graph-log and shared local owners | scheduler | docs/widgets/plot.mdx | V-11 | passed | Unit fairness/deadlines/visibility/disposal; Chrome real dashboard 32 plots with budget 1 ms/count 4, fair 6-7 paints each; performance.md. |
| C-12 | Canvas DPR, theme, context restoration and visibility; defaults in plan §4 | uwg-plot-sec and owning shared contracts | plan §9 source map, graph-log and shared local owners | CanvasSurface | docs/widgets/plot.mdx | V-12 | blocked | Canvas unit tests include external scheduling, DPR cap, hidden/lost/reconnect; Chrome actual offscreen suspension and DPR 1.25/2/3 capped to 2, live cap 1. Real hidden-tab state stayed visible in this MCP environment; real GPU context loss not induced. |
| C-13 | Informational legend and shared metadata/content; defaults in plan §4 | uwg-plot-sec and owning shared contracts | plan §9 source map, graph-log and shared local owners | chart content | docs/widgets/plot.mdx | V-13 | passed | Shared visualization metadata/content and recipe; passive legend, latest formatter and inspection seen in Chrome; website multiseries labels render. |
| C-14 | Keyboard/pointer inspection without editing; defaults in plan §4 | uwg-plot-sec and owning shared contracts | plan §9 source map, graph-log and shared local owners | plot inspection | docs/widgets/plot.mdx | V-14 | passed | Chrome real hover nearest-point and keyboard Home/End/Left/Escape; original sample count unchanged; AX one focus target and polite inspection only. |
| C-15 | Accessible label, interpretation/table, no telemetry announcements; defaults in plan §4 | uwg-plot-sec and owning shared contracts | plan §9 source map, graph-log and shared local owners | plot semantics | docs/widgets/plot.mdx | V-15 | passed | Chrome AX caption and label, decorative canvas absent, passive plots no focus; axe main fixture zero violations, 13 passes. No screen-reader claim. |
| C-16 | Theme, scoped paint and public part customization; defaults in plan §4 | uwg-plot-sec and owning shared contracts | plan §9 source map, graph-log and shared local owners | presentation | docs/widgets/plot.mdx | V-16 | passed | Light/dark and RTL screenshot inspection; actual DPR3 cap; public styleHook --tp-plot-grid resolves to #dc2626 and causes one rebase. |
| C-17 | SSR, disconnect/reconnect/adoption and no form participation; defaults in plan §4 | uwg-plot-sec and owning shared contracts | plan §9 source map, graph-log and shared local owners | plot lifecycle | docs/widgets/plot.mdx | V-17 | passed | Chrome detach/reconnect and iframe document adoption resume incremental paints; custom scheduler owner mismatch diagnoses and resumes after replacement. SSR render unit passes with no document/canvas and zero paints; package smoke passes. |
| C-18 | Widget-only packaging and generated bindings; defaults in plan §4 | uwg-plot-sec and owning shared contracts | plan §9 source map, graph-log and shared local owners | catalog/register/bindings | docs/widgets/plot.mdx | V-18 | passed | Generated widget-only bindings; React/Vue source and built props/event/smoke checks; all five framework type compilers pass; size-report tree-shaking/budgets pass. Package smoke passes exports, types and tree-shaking. |
| C-19 | Four image examples and docs/story parity; defaults in plan §4 | uwg-plot-sec and owning shared contracts | plan §9 source map, graph-log and shared local owners | docs/stories | docs/widgets/plot.mdx | V-19 | passed | Shared page checker passes; isolated website build 116 pages and 96 library docs, all six previews inspected and history Buttons exercised. Final static Storybook and isolated website render all six previews; real history Buttons push one frame then revise without changing count. API descriptions and Keyboard ordered; no Related in Storybook; website leaf has no inbound Related. |
| C-20 | Resource and CPU/GPU performance against full renderer; defaults in plan §4 | uwg-plot-sec and owning shared contracts | plan §9 source map, graph-log and shared local owners | benchmark | docs/widgets/plot.mdx | V-20 | blocked | Final repeat: one monitor mean 0.293 ms/p95 0.6 ms (0.5 ms target not met); actual 32-monitor scheduler p95 1.5 ms/frame; dense full comparison ~2.7x mean CPU reduction. GPU/GC duration totals not exposed by returned MCP trace summary. |

## Family dependency map

| Reference family / constituent | Exact reference path / symbol | Existing local owner and consumers | Reuse or repair decision | Component-specific differences / independent options | Scenario IDs |
| --- | --- | --- | --- | --- | --- |
| Canvas lifecycle | graph-log view and shared surface | CanvasSurface used by color surfaces | Extend optional external scheduling and DPR cap without changing defaults | Fixed layers and history raster only in Plot | V-12 |
| Metadata/legend | graph-log cursor labels | chart payload/content | Generalize provider guard and part names for Plot | Passive legend plus sample inspection | V-13 |
| Scheduling | monitor ticker plus FrameLoop | Foundation frame source and Scheduler | Deadline/budget adapter uses owner frame source | Coalescing per Plot and dashboard budget | V-11 |

## Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| --- | --- | --- | --- | --- | --- |
| Surface/lines | supplied four images and local monitor style | graph-log.scss monitor foreground/background | chart palette, semantic surface/text/border roles | Canvas paint from resolved family tokens; no canvas pseudo-parts | V-16 |
| Legend/inspection | existing visualization frame | chart content and recipes | shared legend/inspection content | Plot named parts with shared content only | V-13 |

## Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| --- | --- | --- | --- | --- |
| Settings examples | rate, visibility and ranges | Slider, Select, Switch, Field | V-19 | Canvas is contract-required native render surface; layout/figure/text are native content |
| Legend/inspection | series labels/marks | shared visualization content | V-13 | No independent toggle/tooltip lookalikes |

## Verification scenarios

| ID | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V-01 | C-01; behavior/visual as applicable | plan §§10–11 matrix for data/types, geometry | Static 2D data, series metadata, gaps and authored nonmonotonic paths | Unit stream/decimation cases; bare waveform and all six website previews render; authored nonmonotonic point order preserved. | Chrome DevTools MCP; unit/build logs under tmp/component-verification/plot/ | passed | Observed evidence above. |
| V-02 | C-02; behavior/visual as applicable | plan §§10–11 matrix for stream | Bounded explicit streams, atomic batches, retention and revisions | Unit atomic/oversize/wrap/gap/dispose checks; browser 256 and 1024 retained counts stay bounded. | Chrome DevTools MCP; unit/build logs under tmp/component-verification/plot/ | passed | Observed evidence above. |
| V-03 | C-03; behavior/visual as applicable | plan §§10–11 matrix for stream/history-raster | Index push and latest-only revisions | Chrome push/replace/retract comparisons: latest updates shift zero pixels; history shifts integer pixels only. | Chrome DevTools MCP; unit/build logs under tmp/component-verification/plot/ | passed | Observed evidence above. |
| V-04 | C-04; behavior/visual as applicable | plan §§10–11 matrix for geometry | Static/scroll/push domains, fixed/auto, clock follow | Static and push domains observed; fixed/auto helpers and scroll implementation inspected; clock follow finite/regression handling implemented. Chrome clock follow advanced [-20,100] to [-15,105], held the last clock on regression and retained the coherent picture for NaN with diagnostics. | Chrome DevTools MCP; unit/build logs under tmp/component-verification/plot/ | passed | Observed evidence above. |
| V-05 | C-05; behavior/visual as applicable | plan §§10–11 matrix for renderer | Linear/step strokes, areas and signed crossings | Chrome raster-check: overlapping signed/baseline areas, gaps and dashed linear/step-before/step-after compare with full baseline; results in performance.md. | Chrome DevTools MCP; unit/build logs under tmp/component-verification/plot/ | passed | Observed evidence above. |
| V-06 | C-06; behavior/visual as applicable | plan §§10–11 matrix for history-raster | Incremental integer blit, fractional offsets, tail damage, rebases | Chrome long run at DPR 1.25 and 2: no ordinary full redraws; subpixel offset and alpha recomposition measured in performance.md. | Chrome DevTools MCP; unit/build logs under tmp/component-verification/plot/ | passed | Observed evidence above. |
| V-07 | C-07; behavior/visual as applicable | plan §§10–11 matrix for decimation | Peak/gap preserving reduction and window lookup | Unit extrema/gap/order cases; binary window lookup and bounded column reduction inspected. Dashed strokes retain raw path-length checkpoints for phase fidelity. | Chrome DevTools MCP; unit/build logs under tmp/component-verification/plot/ | passed | Observed evidence above. |
| V-08 | C-08; behavior/visual as applicable | plan §§10–11 matrix for decorations | Axes, time/number ticks and labels independently optional | Website numeric axes/titles/labels and independent x labels/ticks; RTL y-axis placement inspected. Chrome observed 08:00 PM, 08:30 PM, 09:00 PM, 09:30 PM ticks; calendar month boundaries and collision suppression implemented. | Chrome DevTools MCP; unit/build logs under tmp/component-verification/plot/ | passed | Observed evidence above. |
| V-09 | C-09; behavior/visual as applicable | plan §§10–11 matrix for decorations | Background none/solid/dots/grid and custom guides | Chrome solid/dots/grid/no-background; front/back guides and variable colors; guide-only change adds no history redraw columns. | Chrome DevTools MCP; unit/build logs under tmp/component-verification/plot/ | passed | Observed evidence above. |
| V-10 | C-10; behavior/visual as applicable | plan §§10–11 matrix for sampler/scheduler | Independent sampling and render rate, manual/paused states | Unit sampler start/pause/resume/deadlines; Chrome idle/manual/paused/resume counters; manual writes produce zero scheduled paints. | Chrome DevTools MCP; unit/build logs under tmp/component-verification/plot/ | passed | Observed evidence above. |
| V-11 | C-11; behavior/visual as applicable | plan §§10–11 matrix for scheduler | Shared budget, fairness, custom scheduling and cleanup | Unit fairness/deadlines/visibility/disposal; Chrome real dashboard 32 plots with budget 1 ms/count 4, fair 6-7 paints each; performance.md. | Chrome DevTools MCP; unit/build logs under tmp/component-verification/plot/ | passed | Observed evidence above. |
| V-12 | C-12; behavior/visual as applicable | plan §§10–11 matrix for CanvasSurface | Canvas DPR, theme, context restoration and visibility | Canvas unit tests include external scheduling, DPR cap, hidden/lost/reconnect; Chrome actual offscreen suspension and DPR 1.25/2/3 capped to 2, live cap 1. Real hidden-tab state stayed visible in this MCP environment; real GPU context loss not induced. | Chrome DevTools MCP; unit/build logs under tmp/component-verification/plot/ | blocked | See explicit pending or tool limitation above. |
| V-13 | C-13; behavior/visual as applicable | plan §§10–11 matrix for chart content | Informational legend and shared metadata/content | Shared visualization metadata/content and recipe; passive legend, latest formatter and inspection seen in Chrome; website multiseries labels render. | Chrome DevTools MCP; unit/build logs under tmp/component-verification/plot/ | passed | Observed evidence above. |
| V-14 | C-14; behavior/visual as applicable | plan §§10–11 matrix for plot inspection | Keyboard/pointer inspection without editing | Chrome real hover nearest-point and keyboard Home/End/Left/Escape; original sample count unchanged; AX one focus target and polite inspection only. | Chrome DevTools MCP; unit/build logs under tmp/component-verification/plot/ | passed | Observed evidence above. |
| V-15 | C-15; behavior/visual as applicable | plan §§10–11 matrix for plot semantics | Accessible label, interpretation/table, no telemetry announcements | Chrome AX caption and label, decorative canvas absent, passive plots no focus; axe main fixture zero violations, 13 passes. No screen-reader claim. | Chrome DevTools MCP; unit/build logs under tmp/component-verification/plot/ | passed | Observed evidence above. |
| V-16 | C-16; behavior/visual as applicable | plan §§10–11 matrix for presentation | Theme, scoped paint and public part customization | Light/dark and RTL screenshot inspection; actual DPR3 cap; public styleHook --tp-plot-grid resolves to #dc2626 and causes one rebase. | Chrome DevTools MCP; unit/build logs under tmp/component-verification/plot/ | passed | Observed evidence above. |
| V-17 | C-17; behavior/visual as applicable | plan §§10–11 matrix for plot lifecycle | SSR, disconnect/reconnect/adoption and no form participation | Chrome detach/reconnect and iframe document adoption resume incremental paints; custom scheduler owner mismatch diagnoses and resumes after replacement. SSR render unit passes with no document/canvas and zero paints; package smoke passes. | Chrome DevTools MCP; unit/build logs under tmp/component-verification/plot/ | passed | Observed evidence above. |
| V-18 | C-18; behavior/visual as applicable | plan §§10–11 matrix for catalog/register/bindings | Widget-only packaging and generated bindings | Generated widget-only bindings; React/Vue source and built props/event/smoke checks; all five framework type compilers pass; size-report tree-shaking/budgets pass. Package smoke passes exports, types and tree-shaking. | Chrome DevTools MCP; unit/build logs under tmp/component-verification/plot/ | passed | Observed evidence above. |
| V-19 | C-19; behavior/visual as applicable | plan §§10–11 matrix for docs/stories | Four image examples and docs/story parity | Shared page checker passes; isolated website build 116 pages and 96 library docs, all six previews inspected and history Buttons exercised. Final static Storybook and isolated website render all six previews; real history Buttons push one frame then revise without changing count. API descriptions and Keyboard ordered; no Related in Storybook; website leaf has no inbound Related. | Chrome DevTools MCP; unit/build logs under tmp/component-verification/plot/ | passed | Observed both renderings through Chrome DevTools MCP. |
| V-20 | C-20; behavior/visual as applicable | plan §§10–11 matrix for benchmark | Resource and CPU/GPU performance against full renderer | Final repeat: one monitor mean 0.293 ms/p95 0.6 ms (0.5 ms target not met); actual 32-monitor scheduler p95 1.5 ms/frame; dense full comparison ~2.7x mean CPU reduction. GPU/GC duration totals not exposed by returned MCP trace summary. | Chrome DevTools MCP; unit/build logs under tmp/component-verification/plot/ | blocked | See explicit pending or tool limitation above. |

## Early integration checkpoint

| ID | Check | Status | Evidence / unresolved finding |
| --- | --- | --- | --- |
| I-01 | Shared ownership and actual integration | passed | Actual diff uses CanvasSurface, windowFrames, shared visualization content and recipe. Chrome fixture paints without template updates on stream ingestion. |
| I-02 | First rendered signed history matches presentation source | passed | Chrome MCP page 56: signed colored area and bare waveform inspected; semantic palette and shared chart metadata treatment. Canvas 680x212 device pixels. |
| I-03 | Push, latest, fill/line and decorations independent | passed | Chrome MCP: 40 pushes kept fullRedraws=2; incrementalPaints 4 to 44, redrawnColumns 1387 to 1774, 227 shifted pixels. Latest peak and retraction shifted no pixels. Full comparison mean 0 at integer alignment, <=0.335/255 fractional, <=0.48% channels differ >24. Fill, sign and optional background independent. |

## Gate record

| Gate | Status | Required exit evidence / remaining work |
| --- | --- | --- |
| 0. Sources and scope | passed | Fresh contract e2b945d3, full plan capability/source/reuse mapping above. |
| 1. Capability mapping | passed | Fresh contract e2b945d3, full plan capability/source/reuse mapping above. |
| 2. Architecture and composition reuse | passed | Fresh contract e2b945d3, full plan capability/source/reuse mapping above. |
| 3. Behavior | blocked | C-01 to C-18 behavior observed; actual hidden-document and native GPU-loss verification unavailable (C-12). |
| 4. Presentation and customization | passed | Light/dark, RTL, live dictionary/part hooks and palette inheritance observed; final shared subscription unit passes. |
| 5. Accessibility | passed | Real keyboard/pointer inspection, captions and AX tree, axe zero violations; C-14/C-15. |
| 6. Visual and interaction inspection | passed | Signed overlapping areas, waveforms, axes, guides, fractional DPR raster comparisons and real input observed; C-05 to C-09 and C-14. |
| 7. Documentation and demo reuse | passed | Shared page checker (20 tests + page), 96 docs, both static renderings read in Chrome; all six previews and actual Buttons work. |
| 8. Regression and reconciliation | blocked | 441 files / 6241 unit tests passed, 3 skipped; final focused 31 passed; all types, ESLint/Stylelint, formatting, package/size/tree-shaking and framework ledgers pass. C-12/C-20 actual-environment measurements remain open. |

## Verification boundary

The requested implementation remains the full approved scope. Tool-limited measurements are not a
reduced feature release: actual hidden-document suspension and native GPU context-loss recovery
cannot be claimed from the current Chrome session (every tested tab remained visible); the
Foundation handler paths have deterministic unit evidence. The returned trace insight set did not
supply total GPU/raster/composite/GC durations. Those parts of C-12/C-20 remain blocked; no complete
conformance claim is made. Screenshot file export was denied by the MCP server; screenshots were
inspected inline. Local logs and the isolated website copy do not ship with the package.

## Final shared appearance repair

PresentationController now exposes a cached-renderer subscription. It notifies only when a
resolved recipe or an owned terminal hook changes, avoiding template-driven history rebases.
Plot releases the subscription on disconnect/scheduler replacement. The native color probe lives
inside the surface so part-scoped palette roles inherit correctly. Legend marks update directly
from resolved paint colors without a telemetry-triggered Lit update.
Chrome dictionary replacement changed surface to #123456 and palette marks to rgb(171,205,239),
with one full history rebase. Existing presentation update/hook unit coverage also runs.

## Final regression summary

- Full unit suite: 441 files passed, 6241 tests passed, 3 skipped, 160.30 s; one worker.
- Final focused Plot/presentation rerun after the SSR type correction: 5 files, 31 tests passed.
- Final library TypeScript and React/Vue/Preact/Solid/Svelte compilers pass; Svelte zero warnings.
- Focused ESLint/Stylelint and repository formatting pass; generated bindings report zero stale files.
- Build, 97-bundle size report and tree-shaking budgets pass; pack smoke passes including Node SSR.
- Plot independent consumer bundle: 80,992 uncompressed bytes / 25,806 gzip bytes, not a sum of compressed modules.
- React/Vue source and built props/event + isolated smoke passed, index 154/204 with no diagnostics.
- Isolated site: 116 built pages, 96 shared docs; final Plot page has six working full-width previews,
  generated API descriptions, correct Keyboard order, no raw frontmatter or native table chrome.
- Static Storybook: six working previews, generated API, no Related; only missing favicon request,
  no component runtime errors. Numeric stroke control step corrected to 0.5.
- Tests/builds ran sequentially at low priority with bounded heaps, no owned user server stopped.

The complete gate checker intentionally remains blocked by the explicit C-12/C-20 measurement
boundaries above. Implementation and verification-stage record checks pass; full conformance is
not asserted. The final CPU p95 repeat (0.6 ms single monitor) is recorded against the 0.5 ms target.

Final static rebuild verified stroke input value 1.5 with step 0.5 and no invalid controls.
Focusing the Storybook axes switch and pressing real Space changed the hero's xAxis/yAxis to
independent axis configurations while preserving all 240 data points. Temporary verification tab
and servers on 5391/5392/5393 were closed; existing user Storybook on 6006 was preserved.

## Live hero revision, 2026-11-06

Scope: replace the first documentation/Default example with the user's supplied live graph-only
reference. No widget API or rendering implementation changed. Reuse stays with tp-plot,
createPlotStream, public series configuration and partPresentation hooks; no substitute canvas.
The label part is visually hidden while the figure retains its accessible name. The native
single timeout is demo-owned (10 Hz, hidden-document writes skipped, removed plot stops and
releases its bounded stream). Initial 121 irregular samples fill a fixed 120-interval window;
retention is 256. White line/subtle baseline fill and a dark surface match the supplied visual.
No axes, legend, guide or extra controls are enabled by default. Other use cases remain unchanged.
Bindings are unaffected: no public surface change.
Verification: shared page checker passed 20 tests and one page. Build and Chrome observations
are recorded below after execution. Older C-12/C-20 environmental gaps remain unchanged.

## Smooth-scroll performance follow-up design

User authorized profiling and optimization after the graph-only demo appeared choppy. Scope:
C-06/C-10/C-11/C-19/C-20, with C-09 solid-background presentation equivalence as a dependency.
Actual automatic source-story baseline (no tests/builds): 29 paints/3.2 s, mean 0.383 ms/p95
0.600 ms; history mean 0.221 ms. Public CanvasSurface, PlotHistoryRaster and PlotDecorations
methods were instrumented from the actual loaded module identities, restored after measurement.
Planned repairs: keep native scheduler in existing owner, request rAF ahead of short deadlines;
use its timestamp consistently in element rate checking. Direct solid background fill avoids an
extra cached background canvas copy when no back guides/pattern is needed. Update hero to an
explicit monotonic timestamp stream in scroll/clock mode, fixed y, 10 Hz samples and 60 Hz maximum
paints. A one-sample display delay supplies the segment ahead of the right edge without invented
extrapolation or sample catch-up. No new API, binding, theme token or rendering framework.
Live Plot authority remains e2b945d3; push requires latest-follow, so clock motion uses scroll,
which the current contract already supports. Existing shared owners and source/reuse maps apply.
Test plan: deterministic scheduler deadline/fairness regressions, actual automatic callback/frame
measurements before/after, stream retention and teardown; signed/full raster comparisons after
solid-paint repair. Existing unrelated real hidden/GPU-total evidence gaps remain open.

Follow-up source-backed internal design: the element's history cache uses a two-viewport raster
atlas. Ordinary integer shifts advance its source rectangle; newly exposed logical strips are
translated into atlas coordinates. The atlas compacts with one overlapping Canvas copy only when
its bounded physical width is exhausted. Fractional composition is still a single drawImage,
with no ring seam, repeated resampling or new public API. Extra backing storage is one viewport
(plus guard), independent of retention. Static/full and standalone comparison paths retain their
linear layout. Compare real element output and the atlas fixture against full rendering through
many compactions, latest revisions, signed fills, dashed/step paths, fractional offsets and reset.

Follow-up early integration evidence: actual graph-only hero uses the existing clock/scroll APIs,
not push with an unsupported clock. Phase-preserving deadlines deliver 240 paints/240 display
refreshes in four seconds, versus 205 callbacks/239 refreshes before the phase repair. At 1592 x
192 CSS pixels/DPR2, matched automatic A/B: linear cache 0.339 ms mean/0.500 p95, atlas 0.312 ms
mean/0.400 p95; 180 versus zero history self-copies in three seconds, same 60 Hz cadence. Ordinary
paints stayed incremental. The atlas/full raster fixture across 400 sparse pushes matches the
old cache's error levels (signed/dashed/steps), with no ordinary full redraw. Real element clock
comparison through 30 seconds of timestamps: 240 incremental paints versus 241 full baseline;
retention 256; max checkpoint mean pixel error 0.000922/255. No total GPU timing claim: raw trace
export was denied by the MCP workspace policy, and returned insight set only reports CLS 0.
Native Canvas timing wrappers were restored after each measurement. No build/test ran concurrently.

Follow-up final verification: 9 affected unit files/48 tests passed; final scheduler replay adds the
75 Hz regression and all 6 scheduler tests pass. Focused ESLint, Stylelint, formatting, production
TypeScript, package build and 97-bundle size/tree-shaking checks pass. Bindings/public API are
unchanged. Static Storybook build and isolated website build (116 pages/96 docs) pass; shared page
checker passes 20 tests and one page. Both final built renderings were read through Chrome MCP:
graph-only dark surface/white signal, no visible label/axes/legend, all six examples and generated
API/Keyboard order preserved, no console warnings/errors. Each final hero advanced five samples
and thirty incremental paints in 500 ms without another full redraw. Figure keeps its accessible
name. Website clock is assigned before enabling clock-follow, avoiding a transient missing-clock
configuration. Temporary verification tab and servers are closed; existing user server 6006 is
preserved. This is a scoped performance/example repair, not a new full-widget conformance claim;
older C-12/C-20 environment boundaries remain explicitly unresolved.

## Histogram example follow-up

User supplied a distribution/bar reference and requested another use case. This is a docs/story
composition change only (C-01/C-05/C-09/C-19); no widget or public API changes. Existing fill-to-zero
paths render each interval's horizontal top, and null gaps separate bins; stroke disabled.
Existing guide records provide dotted x/y lines, and public surface/label hooks apply the supplied
palette while preserving the accessible figure name. No replacement canvas/chart or new bars API.
The sample contains 50 pre-binned counts and no sampling timer. Existing source/family/reuse maps
and spec head e2b945d3 apply. Histogram fixture is excluded from autodocs, and the shared page
adds the preview under Usage without changing other examples or the live hero.
Verification scope: shared page/affected docs checks, source/type/build, both final static renderings,
actual bar gaps and dotted guides, stable idle paint count. Older hardware-measurement gaps remain.

Histogram verification: live fixture and both built documentation renderings inspected through
Chrome MCP. 50 separated bars (150 path points/50 null gaps), 11 dotted guides, proportional 16:9
surface, no visible label/axes/legend; figure keeps Sample distribution name. Idle counters stayed
unchanged over 600 ms. Seven previews render in each page, Histograms appears before existing
Areas, and generated API/Keyboard remain in order. No console warnings/errors. Shared page
checker passes 20 tests and the page; focused ESLint, full TypeScript, docs build, static Storybook
and isolated website build (116 pages/96 docs) pass. No full regression suite was rerun for this
composition-only change. No public surface/binding changes. Temporary verification tab/servers
closed; existing Storybook server preserved.

## Plot examples palette correction

User clarified that reference colors were illustrative. All Plot docs/story compositions now use
the library chart palette and default shared surface/guide recipes. Removed demo surface overrides
and fixed hex/RGB colors; retained label visibility, data and geometry. Existing signed semantic
negative color remains --tp-destructive, and other series already resolve chart palette roles.
This affects C-16/C-19 example presentation only; no widget/API/binding changes. Verify the built
shared page in light/dark and inspect actual Canvas-resolved palette colors and guide defaults.

Palette correction verified: no fixed hex/RGB values remain in Plot story/docs examples. Actual
histogram bar pixels resolve chart-1 to RGB(109,93,252); surface changes from RGB(244,244,245) in
light to RGB(39,39,42) in dark. Guides use the shared default role, with no per-guide color override.
All seven built Storybook and website previews retain palette roles (signed negative uses semantic
destructive). The RGB light/dark surface pair above was verified in the library theme fixture;
the website supplies its own current palette, where the resolved surface was RGB(23,23,23).
Changing only host color-scheme does not switch the website application palette. Chrome visual
checks found no application errors; repeated verification pixel reads produced the browser
willReadFrequently performance advisory (test-only readback, not a production behavior). ESLint, shared-page checker
(20 tests + page), docs/static Storybook/isolated website builds pass. No core/API/binding changes;
no full regression suite rerun for this palette-only change. Temporary verification resources closed.
