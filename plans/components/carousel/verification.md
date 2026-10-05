# Carousel implementation and verification — 2026-10-05

The requested scope remains the complete `carousel.md` plan. Source implementation,
documentation and local/package checks are present. **Carousel completion is blocked
on Chrome DevTools MCP integration and acceptance checks.** No Carousel screenshot,
accessibility tree, axe result or real browser input pass is claimed.

## Implementation and shared ownership

- `src/foundation/carousel/` owns immutable configuration, typed logical membership,
  source-derived layout/snaps, loop permutations, virtual ranges/cache, input,
  transport, autoplay and the single numeric `ControllableState` lane.
- `src/components/carousel/carousel.ts` binds Lit shells, slotted/data rendering,
  observers, focus/inert ownership, announcements and existing Button/Icon/Progress
  components. `display.ts` preserves the prior public export and motion descriptor.
- `src/foundation/scrollbar.ts` is instantiated by both ScrollArea's controller and
  Carousel. Both render through `src/components/shared-scrollbar.ts`; ScrollArea
  delegates its old capture/geometry/visibility owner. Carousel supplies snap policy.
- Presentation inventories, canonical part bindings and recipes include the thirteen
  Carousel parts. Controls forward hooks to their actual Button elements.
- `docs/carousel.md`, authored Storybook controls, data/controlled/virtual examples
  and `tests/fixtures/components/carousel/index.html` use public components.
- `@tweakpad/ui/carousel` exposes the Foundation controller and types. The package
  retains Lit as its only runtime dependency and includes `LICENSE.swiper`.
- License assets are emitted by Vite into the active build output. This fixes the
  discovered hard-coded `dist` copy failure during Storybook builds.

## Local checks and their limits

Evidence lives under `tmp/component-verification/carousel/2026-10-05/` on this
machine. These files have not been uploaded and are ignored by Git.

| Check | Result / evidence |
| --- | --- |
| Full unit suite | 71 files, 510 tests pass; `unit.txt` |
| Focused coverage | 40 Carousel Foundation tests and four shared scrollbar tests included in the full suite |
| Whole-project TypeScript | `npx tsc --noEmit` passes; `typecheck.txt` |
| ESLint | `npm run lint:ts` passes; `eslint.txt` |
| CSS lint | `npm run lint:css` passes; `stylelint.txt` |
| Library build | `npm run build` passes; `build.txt` |
| Storybook build | `npm run build-storybook` passes; `storybook.txt`; chunk warnings remain build warnings |
| Built SSR | Root/subpath imports, controller initialization/release and `new TpCarousel()` with no DOM or ResizeObserver pass; `ssr.txt` |
| Consumer declarations | Strict NodeNext consumer imports and typed root/subpath usage pass; `consumer.mts`, `consumer-types.txt` |
| Package contents | Dry-run listing contains Carousel ESM/declarations and Swiper MIT notice; Lit-only runtime dependency audit passes; `pack-listing.json`, `package-audit.txt` |
| Formatting | Carousel files formatted; repository check still reports pre-existing `src/components/field/field.ts` and `src/stories/message-scroller.examples.ts`; `format.txt` |
| Diff hygiene | `git diff --check` passes |

Local test coverage includes controlled acknowledgment/veto, typed IDs, source-index
correction, numeric validation, terminal fractional snaps, hidden initialization,
throwing measurement rollback, reentrant navigation, stale renderer release,
native-preview rejection, restoration after delayed virtual rendering, immutable
breakpoints, invalid environment groups, loop buffers and after-only offsets,
virtual ranges/cache generations, wheel normalization, swipe release boundaries,
and autoplay pause leases/stop/restart/disposal. These tests exercise Foundation
logic with adapters; they do not establish DOM geometry or user-input conformance.

`V-27` and `V-29` have complete pure configuration evidence. `V-100` has built SSR
evidence. Other V-rows retain their full acceptance requirements despite partial
local coverage. No broad capability row is passed from a unit-test count.

## Browser blocker and next boundary

The registered Chrome DevTools MCP `new_page` call for the fixture and a subsequent
`list_pages` call each timed out after 300 seconds. No usable page was returned.
The user was asked to reconnect the service. No alternate browser tool was used.

The repository skill states: “If Chrome DevTools MCP is unavailable, browser gates
remain blocked; never substitute another browser tool.” This is the tool blocker,
not an approval requirement or a reduction of the requested scope.

I-01 passes the actual shared-owner/import audit. I-02 and I-03 remain blocked:
the default sourced presentation and independent constituent options need live
inspection before the exhaustive acceptance matrix. `implement` passes; `verify`
and `complete` intentionally fail on those unresolved records.

After reconnection, open the hostname-backed task fixture at
`http://localhost:5173/tests/fixtures/components/carousel/index.html`, finish I-02
and I-03, and repair findings before expanding the matrix. Then cover source and
`?package` fixtures, independent controls, both axes/RTL, responsive sizing,
continuous/rewind loops, native scrolling, virtual focus/cache, controlled refusal,
pointer/wheel/keyboard, lifecycle interruption, themes/part overrides, live
accessibility and shared ScrollArea/DragDrop regressions. Actual pointer cancel,
pinch zoom and OS reduced-motion require supported tool capabilities; synthetic
dispatch or explicit motion policy does not establish those results.

No specification commit, repository commit, dependency addition or upstream
checkout update was made. Unrelated work and the two existing formatting failures
were preserved. DragDrop's earlier evidence and tool-only gaps remain in its own
component record.
