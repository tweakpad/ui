# Component implementation and evidence record

## Delivery and source record

- Component(s) / public identity: library-wide size, spacing and typography normalization. It applies to every cataloged component through tokens (`src/styles.css`), the shared control step table (`src/presentation/recipes/shared/variant.ts` `CONTROL_STEPS`) and the per-family recipes.
- Requested work / claim: bounded cross-cutting fix. Every component resolves height, padding, gap, type and icon extent from one token scale and step table, with Nova metrics.
- Scope source: the user, 2026-10-07. Quote: "more than fixing the demo Im interested ON FIXING THE LIBRARY NORMALIZATION OF SIZES AND SPACING … font sizes dont seem consistent". The approved plan is `/Users/vanrez/.claude/plans/lets-plan-to-create-cozy-star.md`.
- In-scope changes and existing gaps:
  - In scope: token values and roles; the step table; recipe geometry and typography; component geometry CSS; the guardrail test; docs.
  - Out of scope: behavior, APIs and demo composition, except where values are pinned.
- Repository baseline / unrelated changes: branch `development` at `ff00571`. Preserve the uncommitted map, date-picker trigger, calendar and button-outline work from this session.
- Live project / document IDs and revisions:
  - Project `prj_c5a403a0-d1d5-4487-ac78-f4e545f46483`. Component Library doc `doc_8077bf7c-0361-48f3-ac87-53b983bd89b3`.
  - Read at head `3db9e98` (v0.4.2). Amended and committed at `dcf9a948` (v0.5.0).
- Owning contracts / dependencies / vocabulary:
  - CL §5.3 Foundational scales and sizes (`measurement-seed-and-derived-scale`): `req-cl-53-spacing`, `req-cl-53-control-size`, `req-cl-53-base-typography`, `req-cl-53-radius`.
  - CL §5.4 Styling surface coverage; the no-literal law; CL §13 Layout, spacing and density.
- Local Base UI / Floating UI / shadcn evidence:
  - `../specification/external/ui/apps/v4/registry/styles/style-nova.css` and `registry/bases/base/ui/*.tsx`.
  - Tailwind 4.3.3 theme: spacing 0.25rem; text-xs/sm/base 12/14/16.
  - The reference checkout is read only.
- Tool readiness: direct Spec Blocks MCP is available and used (search, get_document, apply_document_operations, bump_version, commit). Chrome DevTools MCP is available.
- Browser / server / build under test: Chrome via the DevTools MCP, against Storybook dev at `http://localhost:6007` from source.
- Evidence directory: `tmp/component-verification/normalization/run-1/`
- Durable verification fixtures / served URLs: the Complete catalog workspace story (`tweakpad-ui-complete-catalog--overview`), plus component Docs stories.
- Evidence availability to the next agent: local only.

## Capability and interface mapping

| ID   | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status  | Evidence / gap   |
| ---- | ------------------------------------- | -------------- | ---------------------------- | ------------------------------ | ------------- | ------------ | ------- | ---------------- |
| C-01 | Spacing seed 0.25rem with half-step roles space-0-5/1-5/2-5 | CL §5.3 spacing row (dcf9a948) | Tailwind `--spacing: 0.25rem`; Nova `px-2.5`, `gap-1.5`, `p-0.5` | `src/styles.css` `--tp-space-*`; `tokens.ts` spacing family | docs/styling.md | V-01, V-07 | passed | Implemented and verified (see V-rows) |
| C-02 | Type scale 12/14/16/18/20/24; default tuple text-base | CL §5.3 font size, `req-cl-53-base-typography` | Tailwind text-xs/sm/base | `--tp-text-*`; TpElement host reset | docs/styling.md | V-02 | passed | Implemented and verified (see V-rows) |
| C-03 | Control heights xs/sm/md/lg 24/28/32/36; icons 12/14/16/20 | CL §5.3 control and icon row, `req-cl-53-control-size` | Nova `cn-button-size-*` h-6/7/8/9 | `--tp-control-height-*`, `--tp-icon-size-*` | docs/styling.md | V-01, V-03 | passed | Implemented and verified (see V-rows) |
| C-04 | Radius derived from radius alone (×.6, .8, 1.4, 1.8, 2.2, 2.6) | `req-cl-53-radius` | shadcn `globals.css` radius mapping | `--tp-radius-*` | docs/styling.md | V-04 | passed | Implemented and verified (see V-rows) |
| C-05 | One control step table: height, padding, icon edge, gap, type, icon extent, radius | `req-cl-53-control-size`; CL §13 size axis | Nova button/toggle/select/input sizes | `CONTROL_STEPS`, `controlStepDeclarations`, `controlSizePresentation`; `--_tp-icon-extent` consumed by `tp-icon` | docs/styling.md | V-01, V-03, V-05, V-09, V-10 | passed | Implemented and verified (see V-rows) |
| C-06 | Display metrics: badge 20 / 500, avatar 24/32/40, key hint 20, table head 40, progress 4 | CL §5.3 spacing and size | Nova `cn-badge`, `cn-avatar`, `cn-kbd`, `cn-table-head`, `cn-progress` | Display recipes | component docs | V-06 | passed | Implemented and verified (see V-rows) |
| C-07 | Surface and text typography: card, dialog, popover, tooltip, label, field, accordion, bubble set text-sm; titles text-base medium | `req-cl-53-base-typography` | Nova `cn-card` text-sm, `cn-dialog-*`, `cn-label` | Surface recipes | component docs | V-02, V-06 | passed | Implemented and verified (see V-rows) |
| C-08 | Menus, navigation rows and menubar: row heights from the steps; menubar 32 | `req-cl-53-control-size` | Nova `cn-menubar`, `cn-dropdown-menu-item`, `cn-sidebar-menu-button` | Control and navigation recipes | component docs | V-03, V-05 | passed | Implemented and verified (see V-rows) |
| C-09 | Pointer targets: coarse-only packed floor; no fine-pointer 44 px floor | CL §13 hit-target expansion | n/a | `packedExtent`; pagination and navigation-panel recipes | docs/styling.md | V-08 | passed | Implemented and verified (see V-rows) |
| C-10 | Guardrails: no raw-seed spacing; only defined roles; step consistency | CL §5.3, §5.4, no-literal law | n/a | `src/presentation/recipes/normalization.test.ts` | n/a | V-07 | passed | Implemented and verified (see V-rows) |

| Issue | Concrete missing/conflicting contract | Affected dependencies | Proposed resolution | Authority / resolution evidence | Status |
| ----- | ------------------------------------- | --------------------- | ------------------- | ------------------------------- | ------ |
| S-01 | CL §5.3 lacked half-step spacing, control-height-xs and icon-size-xs, which Nova sizes need | Every control and spacing recipe | Amend §5.3 with the roles; bump minor | The user chose "Amend spec §5.3". Committed `dcf9a948`, v0.5.0 | passed |
| S-02 | Nova sm Button and Toggle use the non-token `text-[0.8rem]` | Button and Toggle sm | Use text-sm at sm, the same as Nova's sm Select and Native select (one control font per step) | Approved plan normalization rule | passed |

## Architecture and reuse

- Component folder and responsibility boundaries: no folder changes. Geometry stays in the presentation system, and one shared owner holds the control steps.
- Supported exports / registration / constituent API impact:
  - `controlSizePresentation` is still exported from `presentation/default.ts`, with an optional icon-edge selector argument.
  - New exports: `CONTROL_STEPS`, `controlStepOf` and `controlStepDeclarations`.
- Public vocabulary / tokens / parts / presentation review:
  - New roles `--tp-space-0-5/1-5/2-5`, `--tp-control-height-xs` and `--tp-icon-size-xs`.
  - The private `--_tp-icon-extent` replaces the local `--tp-icon-size-md` redefinitions.

### Family dependency map

| Responsibility | Upstream dependency path / symbol          | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| -------------- | ------------------------------------------ | --------------------------------- | ------------------------------------------------- | ------------------------------------------ |
| Control size steps | Nova `cn-button-size-*`, `cn-toggle-size-*`, `cn-select-trigger` `data-[size]`, `cn-native-select` | `shared/variant.ts` `controlSizePresentation`; `core/toggle.ts` `toggleSizePresentation` (a duplicate) | Repaired into `CONTROL_STEPS`. Removed Toggle's duplicate padding, font and icon overrides | Button, Toggle, Toggle group, Select, Native select, Tabs, Menubar, Pagination, Calendar / V-03, V-05 |
| Field boundary | Nova `cn-input`, `cn-textarea` | `shared/text-control.ts` `fieldBoundary`; `shared/surface.ts` `controlFieldAppearance` (stale, leaked accent hover) | `fieldBoundary` is the only owner; Input and Text area cores no longer apply `controlFieldAppearance` | Input, Text area, Input group, Select input, Questionnaire / V-03 |
| Popup item rhythm | Nova `cn-dropdown-menu-item`, `cn-select-item`, `cn-menubar-item` | `command-surface.ts` `popupItemSpacingAppearance`, `commandItemRules` | Normalized to roles; min-block control-height-sm | Menu, Context menu, Menubar, Select, Command palette, Navigation menu / V-05 |
| Navigation row | Nova `cn-sidebar-menu-button` h-8 | `shared/navigation-row.ts` `navigationRow` | md height; publishes the icon extent | Navigation panel link, action and disclosure / V-05 |
| Joined seams | Nova `cn-button-group`, `cn-toggle-group` spacing 0 | `composition.ts` `joinedControlPresentation` | Default outer radius is radius-lg (Nova rounded-lg) | Button group, Toggle group / V-03 |
| Icon extent | Nova `[&_svg:not([class*='size-'])]:size-4` per size | `components/icon.ts` default `--tp-icon-size`; Button marks font-size; Toggle `--tp-icon-size-md` override | `tp-icon` defaults to `var(--_tp-icon-extent, var(--tp-icon-size-md))`, published by the step table | Button, Toggle, navigation rows, Badge / V-03, V-06 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations        | Scenario IDs |
| -------------------- | ---------------------------- | ----------------------------------------- | ----------------------------------- | -------------------------------------- | ------------ |
| Control sizes | base / nova | `style-nova.css:177-207` (button), `:1359-1367` (toggle), `:1004` (select), `:901` (native select), `:678` (input) | `CONTROL_STEPS` | sm uses text-sm instead of 0.8rem (S-02) | V-03 |
| Badge | base / nova | `style-nova.css:96` `cn-badge` h-5 px-2 text-xs font-medium | `recipes/badge.ts` | Exact | V-06 |
| Avatar | base / nova | `style-nova.css:75` size-6/8/10; `avatar.tsx:49` fallback text-sm/xs | `recipes/avatar.ts` | Exact | V-06 |
| Card / Dialog / Popover / Tooltip | base / nova | `style-nova.css:245-265`, `:468-488`, `:927-939`, `:1381` | core/card, core/dialog-family, popover, core/anchored | Card radius-xl = 14 | V-02, V-06 |
| Menubar / Tabs | base / nova | `style-nova.css:799-803`, `:1321-1325` p-[3px] h-8 | menubar.ts, tabs.ts | 3 px = space-1 − border-width | V-05 |
| Navigation panel | base / nova | `style-nova.css:1159-1219` | navigation-panel.ts, navigation-row.ts | Sublink md text-sm (base `size="md"`) | V-05 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| ------------------ | ----------- | ------------------------------- | ----------------------------------- | --------------------------------------------- |
| Complete catalog workspace | Every control and surface | Library components only (unchanged) | V-03, V-05, V-06 | none |

## Verification scenarios

| ID   | Capability IDs / evidence category | Setup and input     | Expected result     | Actual result | Tool/command and evidence  | Status  | Justification / gap |
| ---- | ---------------------------------- | ------------------- | ------------------- | ------------- | -------------------------- | ------- | ------------------- |
| V-01 | C-01, C-03, C-05; tokens | Computed `:root` tokens in Chrome | spacing 4px; controls 24/28/32/36; icons 12/14/16/20 | spacing 4, xs 24, md 32, text-base 16, radius-sm 6, space-2-5 10, icon-xs 12 | DevTools evaluate on Storybook 6007 | passed | Observed in Chrome DevTools MCP / command output on 2026-10-07; artifacts in tmp/component-verification/normalization/run-1/ |
| V-02 | C-02, C-07; typography | Measure every text-bearing part in the workspace on all tabs and in dialogs | No component part at 15px; control text 14 (xs 12) | Every text-bearing part on all six tabs reads 14px (12px meta, 16px Nova card titles); the TpElement host reset was removed so Card/Table/Dialog text-sm reaches child components | DevTools text-node scan; overview-dark-2.png | passed | Observed in Chrome DevTools MCP / command output on 2026-10-07; artifacts in tmp/component-verification/normalization/run-1/ |
| V-03 | C-03, C-05; controls | Button/Toggle/Select/Input/Native select at each size | Equal height, font and icon per step | Button xs/sm/default/lg 24/28/32/36 with 12/14/14/14px text and 12/14/16/16 icons; icon squares 24/28/32/36; Toggle, Select, Native select, Input, Input group all 32 at default | DevTools measurement on the Button docs and the workspace | passed | Observed in Chrome DevTools MCP / command output on 2026-10-07; artifacts in tmp/component-verification/normalization/run-1/ |
| V-04 | C-04; radius | Computed radius tokens | 6/8/10/14/18/22/26 | radius-sm 6 (computed); radius scale multiplicative | DevTools evaluate | passed | Observed in Chrome DevTools MCP / command output on 2026-10-07; artifacts in tmp/component-verification/normalization/run-1/ |
| V-05 | C-08; menus and navigation | Menubar, Tabs, menus, Select popup, Navigation panel rows and sublinks | Menubar 32; rows 28/32; sublink text 14 | Menubar 32 with 24px triggers inset 4; Tabs 32; navigation rows 32, sublinks 28 at 14px, lg rows 48; menu items min 28 | DevTools; brief-dark.png | passed | Observed in Chrome DevTools MCP / command output on 2026-10-07; artifacts in tmp/component-verification/normalization/run-1/ |
| V-06 | C-06, C-07; display | Badge, Avatar, Key hint, Card, Dialog, Label | Badge 20 at 500; Avatar 24/32/40; Label 14/500 | Badge 20px at 500; Avatar 24/32/40 (sidebar/user rows use the default 32 per Nova); Label 14/500; Card titles 16 medium | DevTools; work-dark.png, settings-dark.png | passed | Observed in Chrome DevTools MCP / command output on 2026-10-07; artifacts in tmp/component-verification/normalization/run-1/ |
| V-07 | C-10; automated | `npx vitest run`, `npm run lint`, `npm run build` | Pass, including the normalization tests | tsc clean; vitest 1107 passed (including normalization.test.ts); lint clean; build ok | npx tsc, npx vitest run, npm run lint, npm run build | passed | Observed in Chrome DevTools MCP / command output on 2026-10-07; artifacts in tmp/component-verification/normalization/run-1/ |
| V-08 | C-09; pointer targets | Pagination and navigation-panel trigger on a fine pointer | No forced 44px | Pagination squares 32; navigation-panel trigger 28 on a fine pointer; packedExtent remains coarse-only | DevTools | passed | Observed in Chrome DevTools MCP / command output on 2026-10-07; artifacts in tmp/component-verification/normalization/run-1/ |
| V-09 | C-01, C-02, C-03, C-05; density and themes | Compact density, light and dark | Scales proportionally; no regressions | Compact: controls 24.5/28/31.5, badge 17.5, text 13; light drawer screenshot consistent | DevTools with globals=density:compact; drawer-light.png | passed | Observed in Chrome DevTools MCP / command output on 2026-10-07; artifacts in tmp/component-verification/normalization/run-1/ |
| V-10 | C-05, C-06, C-09; accessibility | axe on the workspace and Button/Badge/Avatar stories | No new violations (target-size, contrast) | axe wcag2a/aa/22aa: no contrast violations on any tab in light or dark. target-size: fixed the menubar triggers (now 24), checkbox/radio rows (min 24) and link Buttons (they keep the size step, as Nova does). The Switch track (32x18.4) is still flagged, but its ::after hit expansion gives 56x34 and axe measures only the box. | axe-core 4.10.2 in DevTools | passed | Observed in Chrome DevTools MCP / command output on 2026-10-07; artifacts in tmp/component-verification/normalization/run-1/ |

## Early integration checkpoint

| ID   | Check                                                                                             | Status  | Evidence / unresolved finding                               |
| ---- | ------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------- |
| I-01 | Shared owners are actually used by related consumers; old duplicate behavior is removed/delegated | passed | `controlSizePresentation` is consumed by Button and Toggle (Toggle's duplicate `toggleSizePresentation` was deleted); `controlFieldAppearance` was deleted; Select, Native select, Tabs, Menubar and Pagination use the step tokens; `tp-icon` reads `--_tp-icon-extent` |
| I-02 | Default visual regions match traced source and shared library recipes                             | passed | Button ladder equals Nova h-6/7/8/9; Badge h-5; Avatar size-6/8/10; Menubar h-8 p-[3px]; navigation lg h-12 |
| I-03 | Independent constituent options work, including placement separately from action behavior         | passed | Size axes (xs..lg, icon-*), Toggle icon edges, joined groups, link variant, density override all resolve independently |

## Gate record

| Gate                                  | Status  | Required exit evidence / remaining work                                               |
| ------------------------------------- | ------- | ------------------------------------------------------------------------------------- |
| 0. Sources and scope                  | passed  | Live CL §5.3/§5.4/§13 read at 3db9e98; amended at dcf9a948 (v0.5.0); Nova reference traced; user-scoped boundary recorded above. |
| 1. Capability mapping                 | passed  | C-01..C-10 map every normalization capability to authority, upstream, owner and scenarios; S-01 and S-02 resolved. |
| 2. Architecture and composition reuse | passed  | Family dependency map names the repaired shared owners (step table, field boundary, popup rhythm, navigation row, joined seams, icon extent) and their consumers. |
| 3. Behavior                           | passed | No behavior changed; 1107 tests pass; menus, drawer and date-picker interactions exercised in Chrome. |
| 4. Presentation and customization     | passed | Step table and roles resolve; normalization.test.ts guards raw-seed spacing, undefined roles and step consistency. |
| 5. Accessibility                      | passed | axe clean except the Switch box measurement (its hit expansion covers it); see V-10. |
| 6. Visual and interaction inspection  | passed | All workspace tabs, the drawer, light and dark, default and compact inspected; screenshots in tmp/component-verification/normalization/run-1/. |
| 7. Documentation and demo reuse       | passed | docs/styling.md documents the scale and step table; component docs checked; the demo uses default avatars per Nova. |
| 8. Regression and reconciliation      | passed | tsc, vitest, lint and build pass; spec dcf9a948 and the tokens agree. |

## Documentation synchronization

- [x] Base example, actual Controls, constituent APIs and reference agree with code.
- [x] Added/removed/changed properties, events, methods, slots and hooks are updated.
- [x] Verification fixtures are separate from curated public examples.
- [x] Rendered and copyable compositions reuse existing components.
- [x] Imports and registration work outside Storybook's global setup.
- [x] Generator handling and changed tests preserve the intended documentation.

## Completion / handoff

- Change summary:
  - Adopted Nova metrics: 4px seed; 12/14/16 text; controls 24/28/32/36.
  - Added the half-step, xs control and xs icon roles; amended CL §5.3 in dcf9a948, v0.5.0.
  - One `CONTROL_STEPS` table for every control, and every recipe on named roles.
  - Host typography now inherits.
- Actual delivery claim: library-wide size, spacing and typography normalization, verified on the workspace and on the Button docs.
- Record checker: implement, verify and complete stages run (see the terminal).
- Non-browser checks: tsc, vitest (1107), lint and build all pass.
- Behavior: unchanged; the tests pass.
- Accessibility: axe as in V-10.
- Visual/customization/motion inspection: V-02 to V-09.
- Documentation and demo composition reuse: docs/styling.md.
- Shared-consumer regressions / package boundaries: build ok; `CONTROL_STEPS` and related helpers are exported from `@tweakpad/ui`.
- Required failures or blocked checks: none.
- Older out-of-scope gaps:
  - Badge has no icon-edge marker for Nova's `pr-1.5`.
  - Nova's inline-addon input inset (`pl-1.5`) is not applied.
  - Avatar-group initials overlap by Nova's 8px.
- Changed source revisions / reopened gates: none outstanding.
