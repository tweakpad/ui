# Component implementation and evidence record

Library-wide consolidation and normalization (structural, no behavior or appearance change
intended; bug fixes recorded individually). Approved plan:
`/Users/vanrez/.claude/plans/lets-review-the-whole-streamed-nautilus.md`.

## Delivery and source record

- Component(s) / public identity: every cataloged component (73 catalog entries, 177 elements); shared Foundation and presentation owners.
- Requested work / claim: library-wide consolidation to reduce size and improve reuse without changing functionality or appearance; fix bugs, gaps and attribute/feature misalignments; normalize attribute, marker and event conventions.
- Scope source: the user, 2026-10-09: "review the whole library implementation and code to find and optimize the code in terms of re-usability … consolidate the codebase to reduce its size without compromising any functionality or how it looks. Any gaps, bugs, attributes or feature misalignments corrections are welcome", "also notice that refactors to take into account include attribute convention and normalization", "No need to keep legacy support … no migration paths are needed".
- In-scope changes and existing gaps: Workstreams A (conventions), B (components), C (foundation), D (presentation), E (stories/tooling/package) of the approved plan. Deferred: Select-onto-TpAnchoredSurface fold, SurfaceState→ControllableState merge, examples.ts merge.
- Repository baseline / unrelated changes: branch `development` at `0013aaf`, clean tree. No commits (user rule); the user commits.
- Live project / document IDs and revisions: project `prj_c5a403a0-d1d5-4487-ac78-f4e545f46483` v0.12.0 head `2ac6c59d`; CL `doc_8077bf7c-0361-48f3-ac87-53b983bd89b3`; Foundation `doc_cd3c4721-9f9b-4531-abab-a8bfdbac75f1`. Read through direct Spec Blocks MCP (search, get_document, list_terms) on 2026-10-09.
- Owning contracts / dependencies / vocabulary: CL §10.5 mirrored markers, §10.6 canonical axes (`req-cl-106-vocab`, `req-cl-106-no-boolean`), §11.1 state vocabulary (`ucl111-canonical`), §19.7 Side panel migration ("MAY remain"); Foundation §19.1.1 StateMarkerSet, B.5, B.6.1, B.7.1 (`audit-b7-marker-domains`), B.8 change reasons, §5.3 ChangeEvent; CL §17.6 One-time code field slots `one-time-code-field-*`.
- Local Base UI / Floating UI / shadcn evidence: `../specification/external/` (read only; not modified).
- Tool readiness: direct Spec Blocks MCP available and used; Chrome DevTools MCP available and used.
- Browser / server / build under test: Chrome via DevTools MCP against the existing Storybook dev server `http://localhost:6006` (source).
- Evidence directory: `tmp/component-verification/consolidation/run-1/`
- Durable verification fixtures / served URLs: Storybook stories listed per scenario; existing `tests/fixtures/components/*`.
- Evidence availability to the next agent: local only.

## Capability and interface mapping

| ID   | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status  | Evidence / gap   |
| ---- | ------------------------------------- | -------------- | ---------------------------- | ------------------------------ | ------------- | ------------ | ------- | ---------------- |
| C-01 | Property/attribute spelling: camelCase + explicit kebab attribute; DOM-mirroring names keep IDL spelling (`autocomplete`) | CL property tables (`defaultValue (default-value)`), Foundation B.6.1 | n/a | `autoComplete`→`autocomplete` in OTP and Select; `src/conventions.test.ts` | docs/conventions.md | V-01 | passed | 1026 declarations scanned; test passes |
| C-02 | Boolean state markers present only when true; no `"false"` serialization | Foundation `audit-b7-marker-domains` | Base UI data-* | `data-visible/modal/viewport/current/active/in-view/selected` presence-only + selectors `:not([…])` | docs/image.md, message-scroller.md, table.md | V-02, V-06 | passed | Scroll area track, table row, image verified |
| C-03 | One canonical presence marker: `data-open`/`data-closed` (+starting/ending), no `data-state` alias | CL `ucl111-canonical`, Foundation B.7.1 | Base UI `data-open` | removed from anchored-surface, dialog, collapsible, tree view, foundation/collapsible; `disclosurePanelStyles` uses `[data-open]:not([data-starting-style])` | docs/accordion.md, collapsible.md | V-03 | passed | Collapsible and Tree view open/close with 0.28s block-size transition |
| C-04 | Canonical axes reflect on public hosts | CL §10.5 | n/a | `side`/`align` reflect on anchored-surface, select, media popovers, timeline item; `variant` on menu item | docs/conventions.md | V-01 | passed | conventions test |
| C-05 | Change reasons ⊂ registry; event names `-change`/`-change-complete` | Foundation B.8; README conventions | n/a | `tp-layout-changed`→`tp-layout-change-complete`; floating-tree removed | docs/resizable-panel-group.md | V-01 | passed | conventions test |
| C-06 | Select busy flag does not collide with Image `loading` strategy | CL §18.1 Select property table (no loading) | n/a | `loading`→`busy` (reflected) | docs/select.md | V-01 | passed | tsc/tests |
| C-07 | No compatibility barrels or aliases; one folder per component with `index.ts`; per-module `HTMLElementTagNameMap` | architecture.md folder rule; user no-legacy rule | n/a | 14 barrels, `elements.ts`, 4 shims, `closeParentOnEsc`, side panel removed; 8 legacy modules moved; `register.ts`/`components/index.ts` regenerated | architecture.md | V-04 | passed | tsc both configs, 1373 tests, lint clean |
| C-08 | Presentation identity derived from `static presentation` (+ prototype chain for inherited root bindings); member families bind the host tag | CL §8.4 part exposure | n/a | `inheritedRootTag` in `presentation/family.ts`; controller refresh; 30 static declarations deleted; `TpRadioGroupItem.presentationOwner` | architecture.md | V-05 | passed | Navigation panel link parts, select trigger, map overlay `popover map-overlay`, tree items verified in Chrome |
| C-09 | One `OwnedAttributes` owner (attributes + inline styles) | architecture.md reuse | n/a | foundation class gains `style()`; tabs fork deleted | n/a | V-04 | passed | tabs tests pass |
| C-10 | Family key inventories derived from axes; runtime-dead metadata stripped; families complete by default | CL §6.1 key grammar, §6.4 completeness | n/a | `PartDefinition.axes` allow-lists; `partAxes`/`partKeys`/`presentationKeys` in `presentation/family.ts`; `publicName`/`cardinality`/`sourceNode`/`states`/`nonVisualParts`/`motionRoles` removed; `definePresentation` complete by default | architecture.md | V-07 | passed | dist family snapshots before/after differ only in intentional items (canonical-marker selectors, one deduplicated select/autocomplete focus rule, icon dead keys, OTP rename); presentation 14,862→11,740 lines |
| C-11 | Shared owners for diagnostics, converters, motion roles, slot presence, part references, form validity, stack groups, navigation-panel member | architecture.md reuse | n/a | `TpElement.diagnose`; `foundation/converters.ts`; `stateRole/ambientRole/presenceRole`; `components/shared/slots.ts`; `PresentationController.partReference/partElement/dropReference`; `TpFormElement.setRequiredValidity`; `components/shared/stack-group.ts`; `NavigationPanelLayoutPart` on `NavigationPanelMember` | docs/conventions.md | V-08 | passed | 46 component/presentation test files pass; controlled-accessor and Select anchored-geometry folds deferred (generic mixin risk) |
| C-12 | Bug fixes B.4 (elementDependencies for Menu icon, Navigation panel drawer, button-part tooltip, Avatar group; Select `tp-open-change-complete`; `tp-field-value` detail on OTP and Select; callback-before-dispatch order; surface brands replacing tag lists; map overlay density offset; owning-window observers; `createId` for Code block; typed Native select size) and C.4 (key alias chords, observer-driven anchor tracking, `clearPosition` restores `position`) | component contracts | n/a | `foundation/surface-brand.ts`; per-class `families.test.ts` dependency check; `canonicalKeyName`; `anchorLayoutShift?: boolean \| 'poll'` | docs/select.md, autocomplete.md | V-09 | passed | unit tests green; Chrome: Select and Dialog emit callback → `tp-open-change` → `tp-open-change-complete`; map overlay carries `popover map-overlay` |
| C-13 | Dead code removal (B.3, C.1) and package/scripts/stories/docs (E.1–E.4) | plan | n/a | removed modules listed under Architecture; manifest minified with private members stripped (`scripts/minify-manifest.mjs`); 7 scripts and Playwright deleted, assertions ported to `tests/fixtures/components/*`; story galleries dropped; `documentation-examples.ts` helpers; `stories.test.ts` readdir-based | README.md, CONTRIBUTING.md, docs/navigation-panel.md | V-10 | passed | build, pack-smoke and size report green; `custom-elements.json` 7.37→2.33 MB; package 2.6 MB packed / 11.2 MB unpacked |
| C-14 | Disabled state dims a host exactly once (`TpElement` host rule) | CL §11.1 state vocabulary; theme token `--tp-opacity-disabled` | shadcn `disabled:opacity-50` on the control | duplicated `opacity: var(--tp-opacity-disabled)` removed from part rules in `recipes/switch.ts` (root), `slider.ts` (thumb), `native-select.ts` (root), `one-time-code-field.ts` (slot), `map.ts` (pin); cursors kept | n/a | V-11 | passed | Chrome computed opacity: effective 0.303 → 0.55 on all five |

Record spec/upstream conflicts here before dependent implementation:

| Issue | Concrete missing/conflicting contract | Affected dependencies | Proposed resolution | Authority / resolution evidence | Status |
| ----- | ------------------------------------- | --------------------- | ------------------- | ------------------------------- | ------ |
| S-01 | Side panel compatibility binding "MAY remain" (CL §19.7) | drawer provider, fixtures, docs | Remove (no consumers; user no-legacy rule) | user decision 2026-10-09 | passed |
| S-02 | OTP identity split (`tp-one-time-code-field` vs spec slots `one-time-code-field-*`) | component, family, docs, stories | Renamed everywhere: tag `tp-one-time-code-field`, class `TpOneTimeCodeField`, folder/family/recipe/docs/stories `one-time-code-field` | CL §17.6 slot naming; Chrome: element defined, parts `one-time-code-field`, `-group`, `-slot`, `-separator`; `one-time-code-field.png` | passed |

## Architecture and reuse

- Component folder and responsibility boundaries: every component in `src/components/<name>/` with `index.ts`; shared helpers in `src/components/shared/`; no top-level barrels.
- Supported exports / registration / constituent API impact: `components/index.ts` re-exports every folder index; `register.ts` imports owning modules; `elements.ts` deleted in favor of per-module `declare global`; removed public names: `overlayMotionRoles`, `displayMotionRoles`, `primitiveMotionRoles` (→ `skeletonMotionRoles`), `controlStyles`, `elevationStyles`, `closeParentOnEsc`, `TpSidePanel`, `globalFloatingTree`, `SelectModel/SelectPortal/SelectEnvironment` aliases, `TpSelect.loading` (→ `busy`).
- Public vocabulary / tokens / parts / presentation review: docs/conventions.md records the rules; no token or part names changed; the map overlay now carries its spec-mapped `map-overlay` part.

### Family dependency map

| Responsibility | Upstream dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| -------------- | --------------------------------- | --------------------------------- | ------------------------------------------------- | ------------------------------------------ |
| Disclosure panel presence markers | Base UI Collapsible Panel `data-open`/`data-starting-style` | `foundation/collapsible.ts`, `presentation/motion.ts disclosurePanelStyles` | One canonical marker set; tree view groups/segments publish `data-open`/`data-closed` | Collapsible, Accordion, Tree view / V-03 |
| Presentation identity | n/a (library) | `presentation/controller.ts` + 30 static declarations | Derived from `static presentation` and prototype chain (`inheritedRootTag`) | Navigation panel parts, Select actions, media context, message groups, map constituents / V-05 |
| Owned attribute restore | n/a | `foundation/owned-attributes.ts`, `components/tabs/owned-attributes.ts` (fork) | Foundation owner extended with `style()`; fork deleted | Tabs, media player, carousel, list item, timeline / V-04 |
| Choice model, owned portal, composed environment, key notation | n/a | foundation owners + alias shims in select/key-hint | Direct imports; shims deleted | Select, Command palette, Autocomplete, Key hint / V-04 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| -------------------- | ---------------------------- | ----------------------------------------- | ----------------------------------- | ------------------------------- | ------------ |
| Map overlay surface | base / nova | shadcn popover content | `recipes/popover.ts`, `families/map.ts` `tp-map-overlay` binding | Popover `:host` part and `map-overlay` part now both apply (member bindings) | V-05 |
| Disclosure panels | n/a | n/a | `presentation/motion.ts` | selector rewritten to canonical markers; same transition | V-03 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| ------------------ | ----------- | ------------------------------- | ----------------------------------- | --------------------------------------------- |
| Fixtures formerly using `tp-side-panel` | side panel | `<tp-drawer edge="inline-end" swipe-enabled="false">` | drawer registration | none |

## Verification scenarios

| ID   | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| ---- | ---------------------------------- | --------------- | --------------- | ------------- | ------------------------- | ------ | ------------------- |
| V-01 | C-01, C-04, C-05, C-06; automated | `npx vitest run src/conventions.test.ts` | 6 checks pass | 6 passed | vitest | passed | no gap; the six convention checks enforce the rules for future components |
| V-02 | C-02; markers | Scroll area, Table, Image, Message scroller stories | presence-only markers; same visuals | scroll-area track `data-visible` opacity 1; table selected row `data-selected`; recipes use `:not([…])` | DevTools evaluate on 6006; `table.png` | passed | message-scroller return control not rendered in the default story (not exercised) |
| V-03 | C-03; motion | Collapsible default, Tree view default: real clicks | panel opens with block-size transition; no `data-state` | collapsible 0→100px, transition `block-size 0.28s`; tree `lib` group 36px, same transition; no `data-state` in shadow trees | DevTools click + evaluate; `collapsible-open.png`, `tree-view-lib-open.png` | passed | no gap |
| V-04 | C-07, C-09; build | `tsc -p tsconfig.json`, `tsc -p tsconfig.build.json`, `vitest run`, `npm run lint` | all green | tsc clean ×2; 143 files / 1373 tests; lint clean | terminal | passed | no gap |
| V-05 | C-08; presentation | Navigation panel, Select, Map, Tree view, Table stories | parts bound as before; map overlay gains `map-overlay` | link part `button button-variant-ghost … navigation-panel-link`; select content styled; overlay `part="popover map-overlay"` opens styled | DevTools evaluate; `navigation-panel.png`, `select-open.png`, `map-overlay-open.png` | passed | no gap |
| V-06 | C-02; image | Two eager `tp-image` probes with a never-resolving src (one in the viewport, one 6000px below) on a loaded story page; scroll the far one into view | off-screen loading image has no `data-in-view` and `--tp-motion-play-state: paused`; in-view image has the empty-string marker and `running`; never a `"false"` value | before scroll: near `inView:true`/`running`, far `inView:false` (attribute absent)/`paused`; after scroll: far `inView:true`/`running`, near absent/`paused` | DevTools evaluate on page 83 | passed | the image story itself could not be navigated to because its remote sample images keep the load event pending; the probe used the same element on another story page |
| V-07 | C-10; presentation equivalence | `node snapshot-families.mjs` on dist before and after D.1–D.3; `compare-families.mjs` | identical keys/appearance per family except intentional changes | remaining diffs: `data-current`/`data-active`/`data-viewport`/`data-selected` selector rewrites, one deduplicated trigger focus rule, icon dead keys, OTP rename | scratchpad `baseline-families.json` / `final-families.json` | passed | no gap; the intentional diffs are listed under Actual result |
| V-08 | C-11; behavior | full `npx vitest run`; Chrome: navigation panel, select, dialog, switch, one-time-code-field, map stories | unchanged behavior | 149 files / 1455 tests pass; stories render and interact as before | vitest; DevTools evaluate/click; screenshots in evidence dir | passed | new fixtures under `tests/fixtures/components/*` were ported from the smoke scripts but not yet executed in a browser |
| V-09 | C-12; bugs | Select default story (controlled): click trigger; Dialog default story: click trigger; per-class dependency test | callback before event, then `tp-open-change-complete`; every created tag registered by its class | Select order `callback:true:trigger-press`, `event:true`, `complete:true`, listbox open; Dialog `callback`, `event`, `complete:true`; `families.test.ts` per-class check passes | DevTools evaluate/click | passed | no gap |
| V-10 | C-13; package | `npm run build`, `node scripts/pack-smoke.mjs`, `node scripts/size-report.mjs` | smaller package, same public exports | build OK; pack-smoke 2.6 MB packed / 11.2 MB unpacked, consumer type check and tree-shaking pass; manifest public surface diff limited to intended removals/additions (`baseline-cem.json` vs `final-cem.json`) | terminal | passed | `[SURFACE_HOST]`/`[DRAWER_HOST]` symbol brands appear as public members in the manifest |
| V-11 | C-14; visual | Switch, Native select, One-time code field, Map (pin) stories with `disabled` set; computed `opacity` on host and part | host 0.55, part 1 | before: host 0.55 × part 0.55 = 0.303; after reload: host 0.55, part 1, cursors `not-allowed` where the base rule set `pointer` | DevTools evaluate; `switch-disabled.png` | passed | no gap |

## Early integration checkpoint

| ID   | Check | Status | Evidence / unresolved finding |
| ---- | ----- | ------ | ----------------------------- |
| I-01 | Shared owners are actually used by related consumers; old duplicate behavior is removed/delegated | passed | tabs use foundation `OwnedAttributes`; select/command-palette/key-hint import foundation owners directly; controller derives identity for all 30 former declarations |
| I-02 | Default visual regions match traced source and shared library recipes | passed | navigation panel, select, map overlay, tree view, collapsible inspected in Chrome (screenshots in evidence dir) |
| I-03 | Independent constituent options work, including placement separately from action behavior | passed | map overlay opens on pin press at `side=block-start`; select opens at `bottom-start`; tree groups expand independently |

## Gate record

| Gate | Status | Required exit evidence / remaining work |
| ---- | ------ | --------------------------------------- |
| 0. Sources and scope | passed | Live CL/Foundation read at 2ac6c59d; scope from the user's messages; no-legacy rule recorded |
| 1. Capability mapping | passed | C-01..C-14 mapped; S-01 and S-02 resolved |
| 2. Architecture and composition reuse | passed | family dependency map above; no new parallel owners |
| 3. Behavior | passed | V-04, V-08, V-09 green; 149 files / 1455 tests; tsc clean on both configs |
| 4. Presentation and customization | passed | V-05, V-07, V-11; family equivalence snapshots; map overlay member binding now applies |
| 5. Accessibility | passed | names/roles unchanged by design; DevTools accessibility snapshots: combobox "Fruit", modal dialog "Edit profile" with description and focused close button, labelled code field. Gap: the axe-core runner left with Playwright (user decision), so no automated axe pass was run |
| 6. Visual and interaction inspection | passed | V-02, V-03, V-05, V-08, V-09, V-11 in Chrome via DevTools MCP; screenshots under the evidence dir |
| 7. Documentation and demo reuse | passed | docs/conventions.md added; component docs updated with each rename/removal; stories galleries dropped and helpers shared; `docs/navigation-panel.md` trimmed to a base snippet |
| 8. Regression and reconciliation | passed | final run after the last edit: vitest 149/1455, `npm run lint` clean, `npm run build`, pack-smoke; family and manifest diffs reconciled |

## Documentation synchronization

- [x] Base example, actual Controls, constituent APIs and reference agree with code.
- [x] Added/removed/changed properties, events, methods, slots and hooks are updated.
- [x] Verification fixtures are separate from curated public examples.
- [x] Rendered and copyable compositions reuse existing components.
- [x] Imports and registration work outside Storybook's global setup.
- [x] Generator handling and changed tests preserve the intended documentation.

## Completion / handoff

- Change summary: all nine execution steps of the approved plan are applied on the working tree (no commits): conventions documented and tested; barrels/shims/side panel/`elements.ts` removed and legacy modules moved into folders; presentation identity derived; families reduced to axes with dead metadata stripped and complete by default; shared owners for diagnostics, converters, motion roles, slots, part references, form validity, stack groups, owned attributes/styles, scrollport geometry, CSS time, index stepping, arrow keys, Intl caching, emitter, diagnostics; B.4/C.4 bugs fixed; dead code removed; manifest minified; scripts and Playwright removed with assertions ported to fixtures; story galleries dropped; OTP renamed to `tp-one-time-code-field`; disabled double-dimming fixed. Working tree: 526 files, +5,101/−8,564 lines; `src` 162,567→159,379 lines (`.ts`+`.js`) (presentation 14,862→11,740); package 11.2 MB unpacked.
- Actual delivery claim: complete for the approved scope. Deferred by plan (unchanged): Select-onto-`TpAnchoredSurface` geometry fold, `controlledAccessor` helper, `SurfaceState`→`ControllableState` merge, `syncArg` story helper, `examples.ts` merge. Known gaps: no automated axe pass; ported fixtures not yet exercised in a browser; Prettier reflowed three docs tables (`docs/image.md`, `docs/table.md`, `docs/resizable-panel-group.md`) without content change; `.codex/config.toml` is now untracked and ignored.
