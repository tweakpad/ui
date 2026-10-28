# Component implementation and evidence record

## Delivery and source record

- Component(s) / public identity: Menu (`tp-menu`), Menubar (`tp-menubar`) — menu replacement motion
- Requested work / claim: bounded fix — a menu replaced by another menu (menubar hand-over, sibling submenu) closes without exit motion; motion only when the whole branch leaves
- Scope source: user instruction 2026-10-27 ("not using animation to fade out when replacing it with other menu, the fade out should only be made when we are hiding all")
- In-scope changes and existing gaps: `instant` policy in `src/components/menu/menu.ts`; shared Foundation presence/positioning changes listed in the Navigation menu record. Older gaps untouched (see Completion).
- Repository baseline / unrelated changes: development @ a43fd3a, clean tree at start; another session may commit concurrently (minimal edits, nothing staged)
- Live project / document IDs and revisions: not re-read for this bounded motion fix; the behavior follows the reference Menu root (`instantType = 'group'` for menubar hand-over reasons). Recorded as a gap below.
- Owning contracts / dependencies / vocabulary: Menu, Menubar; `data-instant` popup marker (existing vocabulary: `delay`, `focus`, `dismiss`; adds `group`)
- Local reference evidence: `../specification/external/base-ui/packages/react/src/menu/root/MenuRoot.tsx` (`instantType` 'group' for trigger-focus, focus-out, trigger-hover, list-navigation, sibling-open in a menubar), `menu/positioner/MenuPositioner.tsx` (trigger-change), menubar hero demo CSS (`[data-instant] { transition: none }`)
- Tool readiness: Chrome DevTools MCP available; Spec Blocks MCP registered (not consulted for this fix)
- Browser / server / build under test: Chrome via DevTools MCP, Storybook dev `http://localhost:6006` (source), Vite dev `http://localhost:5173` for fixtures
- Evidence directory: `tmp/component-verification/menu/2026-10-27-swap-motion/`
- Durable verification fixtures / served URLs: `tests/fixtures/components/menu/` (regressions), Storybook `components-menubar--default`
- Evidence availability to the next agent: local only (sampled frame logs in the conversation and the evidence directory)

## Capability and interface mapping

| ID   | Requirement / capability and defaults | Live authority | Local reference path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| ---- | ------------------------------------- | -------------- | ----------------------------- | ------------------------------ | ------------- | ------------ | ------ | -------------- |
| C-01 | Menubar hand-over (hover, keyboard list navigation, focus) closes the previous menu and opens the next without presence motion (`data-instant="group"` on both popups) | Menubar contract (hover transfer) | `MenuRoot.tsx` setOpen: `parent.type === 'menubar'` reasons → `instantType = 'group'` | `TpMenu.instant` getter reads the last accepted reason; `MENUBAR_GROUP_REASONS` | docs/menubar.md | V-01, V-02 | passed | Edit popup: ending + instant=group + opacity 0 in the same frame; File popup opens with instant=group |
| C-02 | A submenu closed by a sibling submenu opening leaves without exit motion; the opening sibling enters normally | Menu contract (submenus) | `MenuRoot.tsx` `REASONS.siblingOpen`; user decision extends instant exit to submenus | `TpMenu.instant`: `sibling-open` → `group` | docs/menu.md | V-03 | passed | Share popup: ending + instant=group + opacity 0; Export popup enters with instant null |
| C-03 | Escape / outside press / trigger press still fade the surface (whole branch leaves) | Menu contract (dismissal) | `anchoredPresenceAppearance` ending style | unchanged `hover.instant` fallback | docs/menu.md | V-04 | passed | Export submenu fades 1→0 over ~285 ms on Escape; Edit popup fade on Escape observed before the change path and unchanged |

| Issue | Concrete missing/conflicting contract | Affected dependencies | Proposed resolution | Authority / resolution evidence | Status |
| ----- | ------------------------------------- | --------------------- | ------------------- | ------------------------------- | ------ |
| I-1 | Reference keeps exit motion for a submenu replaced by a sibling (instant only inside a menubar); the user asked for no fade-out on any replacement | C-02 | Instant exit for `sibling-open` everywhere; entrance of the new submenu unchanged | User instruction 2026-10-27 | resolved |

## Architecture and reuse

- Component folder and responsibility boundaries: policy lives in `TpMenu` (the owner of menubar membership and submenu siblings); the marker is rendered by the shared `TpAnchoredSurface.popupProperties` and consumed by the shared `anchoredPresenceAppearance` recipe
- Supported exports / registration / constituent API impact: none
- Public vocabulary / tokens / parts / presentation review: `data-instant` value `group` matches the reference vocabulary; no new parts

### Family dependency map

| Responsibility | Reference dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| -------------- | ---------------------------------- | --------------------------------- | ------------------------------------------------- | ------------------------------------------ |
| Instant presence marker | `MenuPopup` `instant` state attribute | `TpAnchoredSurface.popupProperties` (`data-instant`), `HoverSurfaceController.instant` | Reuse: `TpMenu` overrides the `instant` getter; hover's own values keep precedence otherwise | Menu, Menubar, Context menu / V-01..V-04 |
| Transition suppression | hero demo CSS `[data-instant] { transition: none }` | `anchoredPresenceAppearance` (`command-surface.ts`) | Reuse unchanged | Menu, Menubar, Select, Popover / V-01 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| -------------------- | ---------------------------- | ----------------------------------------- | ----------------------------------- | ------------------------------- | ------------ |
| `menu-content` / `menubar-content` | command surface | menubar demo `.Popup[data-instant]` | `menuSurface` → `commandSurfaceAppearance` → `anchoredPresenceAppearance` | no change | V-01, V-03 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| ------------------ | ----------- | ------------------------------- | ----------------------------------- | --------------------------------------------- |
| Storybook Menubar Default | menus, items, sub-triggers | `tp-menu`, `tp-menu-item`, `tp-button` triggers | V-01..V-04 | none (a second sibling submenu was appended through the DOM for V-03 only) |

## Verification scenarios

| ID   | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| ---- | ---------------------------------- | --------------- | --------------- | ------------- | ------------------------- | ------ | ------------------- |
| V-01 | C-01; behavior/motion, real input | Menubar story: click File, hover Edit | File popup gets `data-ending-style` + `data-instant="group"`, opacity 0 in the same frame; Edit opens with `data-instant="group"` | as expected (both popups settled within 10 ms) | DevTools MCP click + hover, rAF sampler in page | passed | evidence: `tmp/component-verification/menu/2026-10-27-swap-motion/README.md` |
| V-02 | C-01; behavior, keyboard | Focus a root item, ArrowRight to the next menubar menu | hand-over without motion (`list-navigation` → group) | File `closed ending group opacity 0` and Edit `open starting group opacity 0` in the same frame; Edit `open` 14 ms later | DevTools MCP click File + press ArrowRight + sampler | passed | ArrowRight on a focused sub-trigger opens the submenu instead (correct), so the hand-over was driven right after opening File; evidence: `tmp/component-verification/menu/2026-10-27-swap-motion/README.md` |
| V-03 | C-02; behavior/motion, real input | File menu open, hover Share then Export sub-trigger | Share popup ending + instant=group + opacity 0; Export enters with instant null | as expected | DevTools MCP hover + sampler | passed | evidence: `tmp/component-verification/menu/2026-10-27-swap-motion/README.md` |
| V-04 | C-03; behavior/motion, keyboard | Escape with a submenu / root menu open | fade over the exit duration, `data-instant` null | Export submenu faded 1→0 over ~285 ms | DevTools MCP press_key + sampler | passed | evidence: `tmp/component-verification/menu/2026-10-27-swap-motion/README.md` |

## Early integration checkpoint

| ID   | Check | Status | Evidence / unresolved finding |
| ---- | ----- | ------ | ----------------------------- |
| I-01 | Shared owners are actually used by related consumers; old duplicate behavior is removed/delegated | passed | one getter override in `TpMenu`; marker and CSS remain shared |
| I-02 | Default visual regions match traced source and shared library recipes | passed | no presentation change |
| I-03 | Independent constituent options work, including placement separately from action behavior | passed | menubar hand-over, sibling submenu and dismissal each verified |

## Gate record

| Gate | Status | Required exit evidence / remaining work |
| ---- | ------ | --------------------------------------- |
| 0. Sources and scope | passed | user instruction + reference MenuRoot instant policy; bounded fix |
| 1. Capability mapping | passed | C-01..C-03 |
| 2. Architecture and composition reuse | passed | shared marker/recipe reused; policy in the owner |
| 3. Behavior | passed | V-01..V-04 |
| 4. Presentation and customization | passed | no change; `[data-instant]` rule reused |
| 5. Accessibility | not applicable | no semantic, focus or keyboard change (bounded motion fix) |
| 6. Visual and interaction inspection | passed | frame samples of both routes |
| 7. Documentation and demo reuse | passed | docs/menubar.md, docs/menu.md sentences |
| 8. Regression and reconciliation | passed | `npx vitest run`, `npm run lint`, `tsc --noEmit` (see Completion) |

## Documentation synchronization

- [x] Base example, actual Controls, constituent APIs and reference agree with code.
- [x] Added/removed/changed properties, events, methods, slots and hooks are updated.
- [x] Verification fixtures are separate from curated public examples.
- [x] Rendered and copyable compositions reuse existing components.
- [x] Imports and registration work outside Storybook's global setup.
- [x] Generator handling and changed tests preserve the intended documentation.

## Completion / handoff

- Change summary: `TpMenu` renders `data-instant="group"` while its last accepted change reason is a menubar hand-over reason or `sibling-open`, so a replaced menu leaves at once.
- Actual delivery claim: bounded motion fix for menu replacement; not a full Menu/Menubar certification.
- Record checker: `check-gates.mjs --stage complete` passed (see conversation).
- Non-browser checks: `tsc --noEmit`, `npx vitest run`, `npm run lint` (results in the conversation).
- Behavior: V-01..V-04 passed.
- Accessibility: unchanged; not re-run.
- Visual/customization/motion inspection: frame samplers; see V rows.
- Documentation and demo composition reuse: docs sentences added; demos unchanged.
- Shared-consumer regressions / package boundaries: none for this file; shared Foundation changes recorded in the Navigation menu record.
- Required failures or blocked checks: none.
- Older out-of-scope gaps: `tests/fixtures/components/menu/regression-checks.js` `commands()` queries items through `root.querySelector`, but Menu items live in the menu's portal host even while closed, so that helper fails before any click (stale since item projection; `menubarAtomicCancellation()` passes: aOpen, bClosed, value true); menu popups' entrance transition does not visibly run (known pre-existing: anchored entrance cancels in frame one); keyboard-opened menus do not use the reference `click` instant type; a dynamically appended submenu trigger kept role `button` in the a11y tree during V-03 scaffolding (not investigated).
- Changed source revisions / reopened gates: none after verification.
