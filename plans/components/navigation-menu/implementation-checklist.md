# Component implementation and evidence record

## Delivery and source record

- Component(s) / public identity: Navigation menu (`tp-navigation-menu`, `tp-navigation-menu-item`) — content transition between items
- Requested work / claim: bounded fix — switching items must transition as one motion: the positioner glides to the new trigger while the viewport morphs and the panels cross-fade, instead of teleporting the container and then animating the height
- Scope source: user instruction 2026-10-27 ("we have a jump between the two menu mainly because it seems we are teleporting its parent container and the animating the height")
- In-scope changes and existing gaps: positioner glide + settled-size pin + adaptive origin + composed-tree presence wait; see Completion for older gaps
- Repository baseline / unrelated changes: development @ a43fd3a, clean tree at start; another session may commit concurrently
- Live project / document IDs and revisions: not re-read for this bounded motion fix; the reference Navigation menu positioner/popup/content contract was used as parity evidence. Recorded as a gap below.
- Owning contracts / dependencies / vocabulary: Navigation menu; anchored surface positioning; presence
- Local reference evidence: `../specification/external/base-ui/packages/react/src/navigation-menu/{positioner,popup,trigger,content}/*.tsx`, `utils/adaptiveOriginMiddleware.ts`, hero demo `index.module.css` (positioner transition on insets, popup width/height transition, `[data-instant]`)
- Tool readiness: Chrome DevTools MCP available; Spec Blocks MCP registered (not consulted)
- Browser / server / build under test: Chrome via DevTools MCP, Storybook dev `http://localhost:6006` (source), Vite dev `http://localhost:5173` for the fixture
- Evidence directory: `tmp/component-verification/navigation-menu/2026-10-27-swap-motion/`
- Durable verification fixtures / served URLs: `tests/fixtures/components/navigation-menu/` (contract checks), Storybook `components-navigation-menu--default`
- Evidence availability to the next agent: local only (sampled frame logs in the conversation and the evidence directory)

## Capability and interface mapping

| ID   | Requirement / capability and defaults | Live authority | Local reference path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| ---- | ------------------------------------- | -------------- | ----------------------------- | ------------------------------ | ------------- | ------------ | ------ | -------------- |
| C-01 | The positioner moves from the previous trigger to the next one with a transition instead of jumping | Navigation menu contract (shared positioner) | hero CSS `.Positioner { transition-property: top, left, right, bottom }` | `navigation-menu-positioner` recipe transitions `translate` (the library positions through `translate`) | docs/navigation-menu.md | V-01 | passed | translate glides 581→656 px over ~285 ms |
| C-02 | The positioner holds the next panel's settled outer size at once, so its place is computed once; the viewport morphs inside it | Navigation menu contract (viewport) | `NavigationMenuTrigger.handleValueChange` (`--positioner-width/height`) | `PopupViewportController.measure` writes `--tp-positioner-width/height` (content + viewport border/padding); `.positioner[data-viewport]` consumes them | docs/navigation-menu.md | V-01, V-02 | passed | one position write per switch; pin exact after the owner refresh |
| C-03 | Above or before the trigger the box hangs from the far edge, so the anchored edge stays while the size changes | Navigation menu contract (placement) | `adaptiveOriginMiddleware.ts`, `NavigationMenuPopup` origin-side styles | `positionSurface({ adaptiveOrigin })` writes `bottom`/`right` anchoring; `.positioner[data-viewport][data-side=top]` flex-end | docs/navigation-menu.md | V-03 | passed | viewport bottom stays at 420 px through the morph for `top center` |
| C-04 | The previous panel leaves at once and the next panel is in place at once when the active item changes; the viewport's size change reveals or clips the labels, which never move or fade between items. Opening and closing the surface still fades the panel | Navigation menu contract (content presence) | `NavigationMenuContent` transition status; user decision 2026-10-27 (reveal, not fade) | `PresenceController` waits on animations of the composed subtree (`composedAnimations`); content recipe: `transition: none` and full opacity while `data-activation-direction` is set, opacity fade (`fast`) only for the surface's own open/close; `TpNavigationMenu.updated` re-renders the current panel once the viewport stops transitioning so the direction marker clears | docs/navigation-menu.md | V-01, V-07 | passed | switch: current panel opacity 1 and in place from the first frame, previous panel gone the same frame, viewport morphs; fresh open fades 0 → 1; close fades 1 → 0 |
| C-05 | The next panel's size is known inside the same update that positions the surface | — | `NavigationMenuTrigger` sizing before positioning | `TpNavigationMenuItem.flushContent()` + `remeasureViewport()` + `updatePosition()` in `TpNavigationMenu.updated` | — | V-02 | passed | first open: pin 88/121 and translate written once |
| C-06 | Opening the surface and a window resize place the positioner at once; only a change between items glides | Navigation menu contract; user instruction 2026-10-27 ("the first transition should not slide") | `NavigationMenuPositioner` `instant` initially and on resize (100 ms) | `#holdPositioner()` sets `data-instant` on the positioner for 100 ms from `willUpdate` when the surface opens and from the window `resize` listener; recipe `&[data-instant] { transition: none }` | docs/navigation-menu.md | V-04, V-08 | passed | fresh open: translate 657 px on every frame with the marker, cleared after ~100 ms; switch still glides 657 → 582 px |

| Issue | Concrete missing/conflicting contract | Affected dependencies | Proposed resolution | Authority / resolution evidence | Status |
| ----- | ------------------------------------- | --------------------- | ------------------- | ------------------------------- | ------ |
| I-1 | Reference transitions inset offsets; the library positions through `translate` | C-01 | transition `translate` on the positioner; adaptive origin expressed through `bottom`/`right` anchoring plus `translate` | reference parity in effect, not in property | resolved |

## Architecture and reuse

- Component folder and responsibility boundaries: positioning policy in Foundation (`positioning.ts` adaptive origin), viewport sizing in `PopupViewportController`, presence wait in `PresenceController`, item flush in `TpNavigationMenuItem`, orchestration in `TpNavigationMenu.updated`
- Supported exports / registration / constituent API impact: `PositioningOptions.adaptiveOrigin` (Foundation option), `TpNavigationMenuItem.flushContent()` (constituent method used by its owner), `TpAnchoredSurface.positionerProperties()` / `viewportPositioning` / `remeasureViewport()` (protected hooks)
- Public vocabulary / tokens / parts / presentation review: `--tp-positioner-width/height` beside the existing `--tp-popup-width/height`; `data-instant` on the positioner (reference marker); `data-viewport` on the positioner (internal marker)

### Family dependency map

| Responsibility | Reference dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| -------------- | ---------------------------------- | --------------------------------- | ------------------------------------------------- | ------------------------------------------ |
| Positioner placement | `useAnchorPositioning` + `adaptiveOrigin` middleware | `positionSurface` (`src/foundation/positioning.ts`) | repaired: `adaptiveOrigin` option; default path unchanged | every anchored surface / positioning unit tests |
| Viewport sizing | `NavigationMenuTrigger` size variables | `PopupViewportController` | repaired: also writes the positioner pin | Navigation menu (only viewport user) / V-01, V-02 |
| Presence completion | `useTransitionStatus` / animations finished | `PresenceController` | repaired: composed-tree animation collection | every presence consumer / presence unit tests |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| -------------------- | ---------------------------- | ----------------------------------------- | ----------------------------------- | ------------------------------- | ------------ |
| `navigation-menu-positioner` | hero demo | `.Positioner { transition-property: top,left,right,bottom } &[data-instant]{transition:none}` | `navigationMenuAppearance['navigation-menu-positioner']` | transition `translate`; instant rule added | V-01, V-04 |
| `navigation-menu-viewport` | hero demo | `.Popup { transition: width, height }` | unchanged recipe | none | V-01 |
| `navigation-menu-content` | hero demo | `.Content[data-starting-style]/[data-ending-style]` | unchanged recipe | none | V-01 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| ------------------ | ----------- | ------------------------------- | ----------------------------------- | --------------------------------------------- |
| Storybook Navigation menu Default | triggers, links | `tp-button`, native `a[href]` | V-01..V-04 | native links are contract anatomy |

## Verification scenarios

| ID   | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| ---- | ---------------------------------- | --------------- | --------------- | ------------- | ------------------------- | ------ | ------------------- |
| V-01 | C-01, C-02, C-04; motion, real input | Default story: click Learn, hover Tools | positioner translate glides; viewport morphs 121→84; previous panel fades out with `translate`; new panel fades in from +50 % | as expected over ~285 ms, single glide | DevTools MCP click + hover, rAF sampler | passed | evidence: `tmp/component-verification/navigation-menu/2026-10-27-swap-motion/README.md` |
| V-02 | C-02, C-05; behavior | first open via click; style-write observer | pin and translate written once with the settled size | first write pin 88/121, translate 581/480; one sub-pixel pin refinement | DevTools MCP evaluate (MutationObserver on the positioner style) | passed | evidence: `tmp/component-verification/navigation-menu/2026-10-27-swap-motion/README.md` |
| V-03 | C-03; motion, API | `placement = 'top center'`, value learn → tools | viewport bottom edge constant; positioner anchored with `bottom: 0`; width glides | bottom stayed at 420 px; translate x 581→656 | DevTools MCP evaluate (API value change, rAF sampling) | passed | API-driven switch (geometry only); evidence: `tmp/component-verification/navigation-menu/2026-10-27-swap-motion/README.md` |
| V-04 | C-06; behavior | open, dispatch `resize` on window | `data-instant` present ~100 ms, then removed; positioner transition-property is `translate` | as expected | DevTools MCP evaluate (synthetic resize; the window could not be resized through the tool) | passed | synthetic event, not a real window resize; evidence: `tmp/component-verification/navigation-menu/2026-10-27-swap-motion/README.md` |
| V-08 | C-06; motion, API, 1× | Default story: fresh open (value tools), switch to learn, close, fresh open again | opening does not move the positioner; the switch glides; the next fresh open does not move | open frames `657I ×7, 657 ×3`; switch `657 → 654 → 640 … → 582` over 16 frames; second open `582I ×7, 582` | DevTools MCP evaluate (rAF frames) | passed | before the hold, a fresh open glided 700.5 → 658 px because the surface was positioned once unmeasured and again measured with a layout read in between; evidence: `tmp/component-verification/navigation-menu/2026-10-27-swap-motion/README.md` |
| V-05 | C-01, C-04; regression, keyboard | Escape with the panel open | panel fades out in place, positioner does not move, surface unmounts | as expected | DevTools MCP press_key + sampler | passed | evidence: `tmp/component-verification/navigation-menu/2026-10-27-swap-motion/README.md` |
| V-07 | C-04; motion, API, 12× motion scale | Vertical and Default stories: fresh open, value learn → tools, settle, close, with `--tp-motion-scale: 12` | labels neither move nor fade between items: next panel fully visible in place from the first frame, previous panel removed, viewport size morph reveals/clips; fresh open and close still fade | vertical: `cur op=1 tr=none` from t=27 ms, no `prev` entry, viewport 121 → 117 px over the first 318 ms; horizontal: `cur op=1` from t=24 ms, viewport gliding 582 → 590 px while shrinking; after settle `data-activation-direction` null; close `data-ending-style` opacity 1 → 0.87 at +600 ms; fresh open 0.15 → 0.86 over 800 ms. Screenshots `vertical-reveal-1/2.png`, `horizontal-reveal-1/2.png` | DevTools MCP evaluate + screenshots | passed | user instruction 2026-10-27: clip/reveal instead of fade; the first fix pass (cross-fade + slide) is superseded; evidence: `tmp/component-verification/navigation-menu/2026-10-27-swap-motion/README.md` |
| V-06 | C-04; regression, fixture | `tests/fixtures/components/navigation-menu/` README steps | disclosure, native links, escape restored | `disclosure()` value products/expanded true; `nativeLinks()` 3 native; `escapeRestored()` closed, panel not rendered, focus on the trigger after the exit transition | DevTools MCP on Vite dev `http://localhost:5173` | passed | fixture helpers updated to find the projected panel through the composed tree (they were stale before this change); evidence: `tmp/component-verification/navigation-menu/2026-10-27-swap-motion/README.md` |
| V-09 | C-02, C-05; regression, frameworks | React and Vue lane `tp-navigation-menu` (controlled accept/reject, default); plain DOM open, switch, close, remove while open, re-append; geometry fixture with content grown to 420 px | no change-in-update warning, no ResizeObserver loop error, items re-read after re-append | before: a warning on open (viewport `measure()` requested an update inside `updated()`; member sync re-accepted the open state on a removed menu) and a loop error on open and on content resize (rounded `offsetWidth` 163 vs observed 162.59375, then the observer resized the positioner inside its delivery); after: none, panel 430 px around 428 px content, re-appended menu opens with `aria-expanded` | DevTools MCP evaluate + screenshots; `navigationGeometry.geometry()` 39/39 and `association()` 48/48 | passed | `alignment()` fails and `association()` misses by ~1.7 px intermittently with `showViewport=false`, both identical on the unchanged files (pre-existing) |

## Early integration checkpoint

| ID   | Check | Status | Evidence / unresolved finding |
| ---- | ----- | ------ | ----------------------------- |
| I-01 | Shared owners are actually used by related consumers; old duplicate behavior is removed/delegated | passed | Foundation positioning/presence/viewport repaired in place; no local copies |
| I-02 | Default visual regions match traced source and shared library recipes | passed | recipes unchanged apart from the positioner transition |
| I-03 | Independent constituent options work, including placement separately from action behavior | passed | bottom and top placements verified; `showViewport` off leaves the positioner untouched (`data-viewport` absent) |

## Gate record

| Gate | Status | Required exit evidence / remaining work |
| ---- | ------ | --------------------------------------- |
| 0. Sources and scope | passed | user instruction; reference positioner/trigger/adaptive origin |
| 1. Capability mapping | passed | C-01..C-06 |
| 2. Architecture and composition reuse | passed | Foundation owners repaired, consumers listed |
| 3. Behavior | passed | V-01..V-05 |
| 4. Presentation and customization | passed | positioner recipe; `--tp-positioner-*` hooks documented |
| 5. Accessibility | not applicable | no semantic, focus or keyboard change (bounded motion fix) |
| 6. Visual and interaction inspection | passed | frame samples for bottom/top placement, open, close, resize |
| 7. Documentation and demo reuse | passed | docs/navigation-menu.md paragraph |
| 8. Regression and reconciliation | passed | V-06 fixture passed; `npx vitest run` 406 files passed; `npm run lint` clean; `tsc --noEmit` clean; `npm run build` exit 0 |

## Documentation synchronization

- [x] Base example, actual Controls, constituent APIs and reference agree with code.
- [x] Added/removed/changed properties, events, methods, slots and hooks are updated.
- [x] Verification fixtures are separate from curated public examples.
- [x] Rendered and copyable compositions reuse existing components.
- [x] Imports and registration work outside Storybook's global setup.
- [x] Generator handling and changed tests preserve the intended documentation.

## Completion / handoff

- Change summary: positioner glides (translate transition), holds the settled size of the next panel, hangs from the far edge above/before the trigger (adaptive origin), presence waits across shadow roots so the previous panel finishes its exit, the owner flushes and measures the next panel inside its own update, and a window resize is instant.
- Actual delivery claim: bounded motion fix for item switching; not a full Navigation menu certification.
- Record checker: `check-gates.mjs --stage complete` passed (see conversation).
- Non-browser checks: `tsc --noEmit`, `npx vitest run` (adaptive-origin tests added), `npm run lint`.
- Behavior: V-01..V-06 passed.
- Accessibility: unchanged; not re-run.
- Visual/customization/motion inspection: frame samplers; see V rows.
- Documentation and demo composition reuse: docs paragraph added; demos unchanged.
- Shared-consumer regressions / package boundaries: positioning default path unchanged (unit tests), presence collection superset of the previous behavior, `data-viewport` only for viewport surfaces.
- Required failures or blocked checks: real window resize could not be driven through the tool (window maximized); verified with a synthetic resize event.
- Older out-of-scope gaps: the viewport part carries the popup presence recipe but the presence markers live on the popup, so only the panels fade; Spec Blocks contracts were not re-read for this fix.
- Changed source revisions / reopened gates: none after verification.
