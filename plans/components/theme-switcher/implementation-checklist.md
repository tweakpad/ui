# Component implementation and evidence record

## Delivery and source record

- Component(s) / public identity: Theme switcher, `tp-theme-switcher`; Foundation Color scheme preference store (`colorSchemeStore`, `applyColorSchemePreference`); Switch `thumb` slot.
- Requested work / claim: complete new component with three presentations (switch, button cycling dark → light → system, segmented group), animated per the motion guidelines.
- Scope source: user request 2026-10-07 ("create a control for a theme switcher… switch… or as a button… dark/light/system… animated with our standard guidelines"; "it would be three, the third one will be like a button group with the three options"); approved plan `~/.claude/plans/snazzy-crafting-quiche.md`.
- In-scope changes and existing gaps: new store, component, icons (sun, moon, monitor), Switch thumb slot, shared resolver move (Map and Data visualization now use `resolveColorScheme`), workspace Appearance migration. Repairs found during verification: Switch and Code Block read Lit comment markers as text.
- Repository baseline / unrelated changes: branch `development` at 7f60007 plus this session's uncommitted library work (warning fixes, menu sub-trigger spacing); preserved.
- Live project / document IDs and revisions: `prj_c5a403a0-d1d5-4487-ac78-f4e545f46483`; Foundation `doc_cd3c4721-…`, Library `doc_8077bf7c-…`; head `d512b4edd1b7d675e76cf961e0f5ef5baa45f9f4`. New §18.14 Color scheme preference, §16.10 Theme switcher, `ucl16-switch-thumb-content` committed as 8be73e11.
- Owning contracts / dependencies / vocabulary: §18.14 (`csp-*`), §16.10 (`ucl16-theme-switcher-*`), Switch (`ucl16-switch`), Button, Toggle group, Reduced-motion policy, Store (§5.4), Environment services (§12.3), motion inventory `tbl-cl-158-theme-switcher-icon`, coverage row `audit-cov-theme-switcher`.
- Local Base UI / Floating UI / shadcn evidence: `external/base-ui/packages/react/src/switch/` (Root/Thumb, data-checked); `external/ui/apps/v4/registry/new-york-v4/examples/mode-toggle.tsx` (Sun/Moon rotate+scale swap); `external/ui/apps/v4/content/docs/dark-mode/vite.mdx` (provider); `external/ui/apps/v4/registry/styles/style-nova.css:1250-1264` (`.cn-switch*`); `external/videojs-v10/site/src/stores/appearance.ts` (system listener, storage). Reference checkouts not modified.
- Tool readiness: Spec Blocks direct MCP available; Chrome DevTools MCP connected to the user's Chrome.
- Browser / server / build under test: Chrome (user session), Storybook dev server `http://localhost:6006`, source modules.
- Evidence directory: `tmp/component-verification/theme-switcher/run-1/` … `run-group/` (Lighthouse reports).
- Durable verification fixtures / served URLs: `iframe.html?id=components-theme-switcher--default` with `args=variant:button|group`; catalog workspace Settings → Appearance.
- Evidence availability to the next agent: local only.

## Capability and interface mapping

| ID   | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status  | Evidence / gap   |
| ---- | ------------------------------------- | -------------- | ---------------------------- | ------------------------------ | ------------- | ------------ | ------- | ---------------- |
| C-01 | Preference light/dark/system, default system; resolution via prefers-color-scheme with live updates | csp-values, csp-system | videojs-v10 appearance.ts `resolveTheme` | `ColorSchemeStore`, `resolveColorScheme` (src/foundation/color-scheme.ts) | docs/theme-switcher.md | V-01, V-02 | passed | Unit tests; V-02 emulated device change both ways |
| C-02 | Apply: light/dark set inline color-scheme + data-theme; system sets `light dark`, removes data-theme | csp-apply, csp-tokens | shadcn vite.mdx provider | `writeTarget` | docs/theme-switcher.md | V-01, V-03 | passed | Unit tests; V-03 scoped card |
| C-03 | One store per (target, key); controls on the same pair agree | csp-store | next-themes provider model | `colorSchemeStore` WeakMap | docs/theme-switcher.md | V-04 | passed | Seven controls synced |
| C-04 | Persistence with key `tp-theme`, null disables, invalid/unavailable storage safe, cross-tab sync | csp-persist | videojs-v10 ThemeInit.astro | `readStored`/`writeStored`, storage listener | docs/theme-switcher.md | V-01, V-05 | passed | Unit tests; reload and cross-tab observed |
| C-05 | Transitions suppressed for the change; initiating control exempt | csp-transitions | next-themes disableTransitionOnChange | `withoutTransitions` (motion scale 0 + document rule) | docs/theme-switcher.md | V-06 | passed | Thumb/icon still animate while page swaps |
| C-06 | Pre-paint application without components | csp-prepaint | videojs-v10 ThemeInit.astro | `applyColorSchemePreference` | docs/theme-switcher.md (head snippet) | V-01, V-07 | passed | Unit test; workspace applies on connect |
| C-07 | variant switch: composes Switch, checked = resolved dark, toggles explicit light/dark, sun/moon in thumb | ucl16-theme-switcher-q3, ucl16-switch-thumb-content | base-ui Switch Thumb children | `<tp-switch>` + `thumb` slot | docs/theme-switcher.md, docs/switch.md | V-08, V-11 | passed | Real click and Space |
| C-08 | variant button: Button icon/ghost, cycle dark → light → system, name "Theme: X", no pressed | ucl16-theme-switcher-q4 | shadcn ModeSwitcher | `<tp-button>` + `nextThemePreference` | docs/theme-switcher.md | V-09, V-11 | passed | Real click and Enter |
| C-09 | variant group: Toggle group single, Light/Dark/System icon-only named, not clearable, segmented | ucl16-theme-switcher-q5 | videojs AppearanceMenu SegmentedControl | `<tp-toggle-group spacing="0">` controlled | docs/theme-switcher.md | V-10, V-11 | passed | Real click, arrows, Enter |
| C-10 | value/defaultValue/onValueChange; cancelable tp-value-change with metadata.resolved; inner events contained | ucl16-theme-switcher-q2 | Base UI controllable pattern | `ControllableState` | docs/theme-switcher.md | V-12 | passed | Inner events stopped; manifest lists tp-value-change |
| C-11 | target, storageKey, disabled, size, label, resolvedTheme | ucl16-theme-switcher props | n/a (new contract) | properties on `TpThemeSwitcher` | docs/theme-switcher.md | V-03, V-13 | passed | Scoped target, sm sizes, names |
| C-12 | Icon motion role `icon`: fast, standard easing, rotate+scale crossfade, reduced motion instant, driver replaceable | ucl16-theme-switcher-q6, tbl-cl-158-theme-switcher-icon | shadcn mode-toggle classes | `themeSwitcherMotionRoles`, recipe transitions | docs/theme-switcher.md | V-06, V-14 | passed | Sampled frames; reduce = 0s |
| C-13 | Presentation keys and composition into Switch/Button/Toggle parts | ucl16-theme-switcher-q8 | style-nova `.cn-switch*` | family/recipe theme-switcher | docs/theme-switcher.md | V-15 | passed | Neutral track, background thumb, matches screenshots |
| C-14 | Accessibility: switch named "Dark mode", button name, labelled group | ucl16-theme-switcher-q3..q5 | Base UI Switch/Toggle ARIA | part contract naming, toggle group label | docs/theme-switcher.md | V-16 | passed | Tree + Lighthouse 98 (page landmark only) |

| Issue | Concrete missing/conflicting contract | Affected dependencies | Proposed resolution | Authority / resolution evidence | Status |
| ----- | ------------------------------------- | --------------------- | ------------------- | ------------------------------- | ------ |
| S-1 | No theme switcher or color scheme preference contract existed | Switch, Button, Toggle group | New §18.14, §16.10, Switch thumb slot requirement | Committed in Spec Blocks 8be73e11 | passed |
| S-2 | Commit needs approval of reviews owned by other components (drag-drop list, media player) after the motion inventory row was added | Drag & drop list, Media player | Owner decision to approve and commit, or discard | Owner chose "Approve and commit" (2026-10-07); both reviews approved, commit 8be73e11 | passed |

## Architecture and reuse

- Component folder and responsibility boundaries: `src/components/theme-switcher/{theme-switcher,preferences,types,index}.ts`; store in `src/foundation/color-scheme.ts`; presentation in `src/presentation/{families,recipes}/theme-switcher.ts`.
- Supported exports / registration / constituent API impact: `TpThemeSwitcher`, `themeSwitcherMotionRoles`, color-scheme Foundation exports; `register.ts`, `elements.ts`, catalog; icons `@tweakpad/ui/icons/{sun,moon,monitor}`; Switch gains a `thumb` slot.
- Public vocabulary / tokens / parts / presentation review: parts `theme-switcher[-switch|-button|-group|-option|-icon]` with size keys and variant keys; tokens `muted`, `border`, `background`, `foreground`, control/icon size steps, `--tp-duration-fast`, `--tp-easing-standard`.

### Family dependency map

| Responsibility | Upstream dependency path / symbol          | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| -------------- | ------------------------------------------ | --------------------------------- | ------------------------------------------------- | ------------------------------------------ |
| Binary control | base-ui switch Root/Thumb | src/components/switch/switch.ts | Reused; repaired with `thumb` slot and comment-safe label text | theme-switcher, all Switch users / V-08, V-16 |
| Cycling button | shadcn ModeSwitcher (Button) | src/components/button.ts | Reused as icon ghost Button, icons in `icon-start` | theme-switcher / V-09 |
| Segmented selection | videojs SegmentedControl | src/components/toggle-group/toggle-group.ts | Reused, controlled single selection, spacing 0 | theme-switcher, workspace Settings / V-10 |
| Scheme resolution | videojs `resolveTheme` | src/foundation/map/theme.ts `resolveScheme`, data-visualization inline copy | Moved to `resolveColorScheme`; Map re-exports, Data visualization uses it | map, data-visualization / V-17 |
| Preference application | shadcn vite provider, next-themes | story-local workspace `setTheme` | Replaced by the store; workspace uses the component and `applyColorSchemePreference` | workspace / V-07 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations        | Scenario IDs |
| -------------------- | ---------------------------- | ----------------------------------------- | ----------------------------------- | -------------------------------------- | ------------ |
| Switch track/thumb | base / nova | style-nova.css `.cn-switch`, `.cn-switch-thumb` | recipes/switch.ts via `::part()` | Neutral muted track, background thumb, larger geometry per user screenshots | V-15 |
| Icons | new-york-v4 mode-toggle | Sun/Moon `rotate-0 scale-100` ↔ `-rotate-90 scale-0` | tp-icon + recipes/theme-switcher.ts | Same swap at fast duration with motion scale | V-14 |
| Button | base / nova | `.cn-button` ghost icon | recipes/core/button.ts | Unchanged | V-09 |
| Group | base / nova | toggle-group outline, spacing 0 | recipes/toggle.ts, toggle-group | Unchanged; pressed uses Toggle's muted fill | V-10 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| ------------------ | ----------- | ------------------------------- | ----------------------------------- | --------------------------------------------- |
| theme-switcher internals | switch, button, group, icons | tp-switch, tp-button, tp-toggle-group/tp-toggle, tp-icon | elementDependencies; V-08..V-10 | none |
| Story | preview surface | tp-card as scoped target | V-03 | none |
| Workspace Settings | Appearance theme | tp-theme-switcher variant group | V-07 | none |

## Verification scenarios

| ID   | Capability IDs / evidence category | Setup and input     | Expected result     | Actual result | Tool/command and evidence  | Status  | Justification / gap |
| ---- | ---------------------------------- | ------------------- | ------------------- | ------------- | -------------------------- | ------- | ------------------- |
| V-01 | C-01, C-02, C-04, C-06; unit | vitest color-scheme.test.ts | store rules hold | 8 tests pass | npx vitest run | passed | src/foundation/color-scheme.test.ts 8/8 pass |
| V-02 | C-01; behavior | group on System, emulate dark/light | resolves live both ways | dark → light, text color flips | MCP emulate + evaluate | passed | MCP emulate colorScheme dark/light on story tab; resolved and h2 color changed |
| V-03 | C-02, C-11; behavior | story card as target | only card changes | card inline scheme only, root untouched | MCP evaluate | passed | MCP evaluate: card style colorScheme set, documentElement inline empty |
| V-04 | C-03; behavior | seven controls on one target, click RTL switch | all update | all show Dark / checked | MCP real click + snapshot | passed | MCP snapshot after real click: all switches checked, button "Theme: Dark", groups Dark pressed |
| V-05 | C-04; behavior | reload; user Docs tab sharing key | restored and synced | reload restored; Docs-tab choice appeared | MCP | passed | MCP reload restored stored value; tp-theme-story value set from user Docs tab appeared |
| V-06 | C-05, C-12; motion | click switch, sample frames | thumb 26px over 200ms, icons crossfade | sampled frames as expected | MCP evaluate | passed | MCP frame samples: thumb 0→26px in ~200ms, sun opacity 1→0, moon 0→1 |
| V-07 | C-06; integration | workspace Settings → Light, reload | workspace + dialog portal light; applied before Settings opens | as expected; localStorage cleared after | MCP real click | passed | MCP screenshot of light workspace and dialog; reload shows data-theme=light before Settings |
| V-08 | C-07; behavior | real click and Space on switch | toggles explicit light/dark | as expected | MCP click/press_key | passed | MCP snapshot: switch checked toggled by click and Space |
| V-09 | C-08; behavior | click / Enter on button | dark → light → system → dark | as expected, names update | MCP | passed | MCP snapshots: Theme: Dark → Light → System |
| V-10 | C-09; behavior | click, ArrowRight + Enter in group | selects; cannot clear | as expected | MCP | passed | MCP snapshots: Dark pressed after ArrowRight+Enter |
| V-11 | C-07, C-08, C-09; keyboard | Tab order, focus ring | visible ring, one stop per group | as expected | MCP screenshot | passed | MCP screenshots show focus ring on group toggle and button |
| V-12 | C-10; events | listen on host | one tp-value-change, inner events contained | manifest events tp-value-change; inner events stopped in handlers | cem + code review | passed | no automated event test in Node env |
| V-13 | C-11; visual | sm sizes, RTL | smaller geometry; RTL thumb mirrored | as expected | MCP screenshots | passed | MCP screenshot: sm switch/group/button and RTL switch thumb at inline end |
| V-14 | C-12; motion | motion-policy="reduce" | 0s transitions, instant | 0s, thumb jumps | MCP evaluate | passed | MCP evaluate: transitionDuration 0s; thumb at end after two frames |
| V-15 | C-13; visual | light and dark | matches reference screenshots | neutral track, background thumb with sun/moon | MCP screenshots | passed | MCP screenshots light and dark compared with the user references |
| V-16 | C-14; accessibility | snapshot + Lighthouse per variant | named roles, no violations | "Dark mode" switch, "Theme: …" button, group "Theme"; 98 (page landmark only) | MCP, tmp/component-verification/theme-switcher | passed | screen reader not tested |
| V-17 | C-01; regression | Map/Data visualization use shared resolver; warning scan | no regressions | scan clean over 65 tags; tests pass | tmp/warn-scan, vitest | passed | tmp/warn-scan scan over 65 tags: no warnings or loops; vitest 1140 pass |

## Early integration checkpoint

| ID   | Check                                                                                             | Status  | Evidence / unresolved finding                               |
| ---- | ------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------- |
| I-01 | Shared owners are actually used by related consumers; old duplicate behavior is removed/delegated | passed | Workspace `setTheme` removed; Map/Data visualization use `resolveColorScheme`; Switch/Button/Toggle group composed |
| I-02 | Default visual regions match traced source and shared library recipes                             | passed | Switch matches the user's screenshots; button/group use unchanged recipes |
| I-03 | Independent constituent options work, including placement separately from action behavior         | passed | variant × size × direction × target verified (V-04, V-13) |

## Gate record

| Gate                                  | Status  | Required exit evidence / remaining work                                               |
| ------------------------------------- | ------- | ------------------------------------------------------------------------------------- |
| 0. Sources and scope                  | passed  | Spec Blocks commit 8be73e11 adds §18.14, §16.10 and `ucl16-switch-thumb-content`; reviews approved with the owner's consent. |
| 1. Capability mapping                 | passed  | C-01…C-14 mapped to §18.14/§16.10 candidate requirements and upstream sources.          |
| 2. Architecture and composition reuse | passed  | Family and presentation maps above; no parallel owner.                                  |
| 3. Behavior                           | passed  | V-01…V-12.                                                                              |
| 4. Presentation and customization     | passed  | V-13, V-15; recipe keys and `::part()` composition.                                     |
| 5. Accessibility                      | passed  | V-11, V-16; screen reader not tested.                                                   |
| 6. Visual and interaction inspection  | passed  | V-06, V-13, V-14, V-15.                                                                 |
| 7. Documentation and demo reuse       | passed  | docs/theme-switcher.md, docs/switch.md, story with scoped target, workspace migration. |
| 8. Regression and reconciliation      | passed  | vitest 1140 pass, lint, build + cem, size report (no leaks), warning scan over 65 tags clean; spec commit 8be73e11. |

## Documentation synchronization

- [x] Base example, actual Controls, constituent APIs and reference agree with code.
- [x] Added/removed/changed properties, events, methods, slots and hooks are updated.
- [x] Verification fixtures are separate from curated public examples.
- [x] Rendered and copyable compositions reuse existing components.
- [x] Imports and registration work outside Storybook's global setup.
- [x] Generator handling and changed tests preserve the intended documentation.

## Completion / handoff

- Change summary: new Theme switcher with three variants on a shared Color scheme preference store; Switch thumb slot; shared resolver; workspace migrated; Switch and Code Block comment-marker repairs.
- Actual delivery claim: complete component; implementation verified in the browser against the committed spec (8be73e11).
- Record checker: see run results below.
- Non-browser checks: vitest 1140 passed; lint clean; build + cem pass; size report 31.4 kB gzip, no leaks.
- Behavior: V-01…V-12 passed.
- Accessibility: tree and Lighthouse passed; no assistive-technology testing.
- Visual/customization/motion inspection: passed.
- Documentation and demo composition reuse: passed.
- Shared-consumer regressions / package boundaries: warning scan clean; Map/Data visualization resolver move tested by suite.
- Required failures or blocked checks: none; screen-reader testing not performed.
- Older out-of-scope gaps: Toggle group pressed contrast in dark mode is the existing Nova outline style.
- Changed source revisions / reopened gates: none after verification.
