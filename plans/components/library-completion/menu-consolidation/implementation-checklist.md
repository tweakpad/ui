# Menu consolidation implementation record

## Delivery and source record

- Requested work / claim: remove the separate Context Menu public identity and expose its complete invocation behavior on the existing Menu owner; retain every existing menu capability.
- Scope source: user explicitly says Context Menu should be Menu, same component, shared base for all menu consumers; preserve working behavior and no parallel implementation.
- Live authority: direct Foundation sec-172-menu and sec-173-contextmenu, Library ucl20-menu and ucl20-context-menu. Source pins and project IDs in ../audit.md.
- Source conflict resolution: the live Library still catalogs two public identities. The user's explicit consolidation instruction supersedes that identity split; Foundation context invocation semantics remain implemented. Public binding is invocation=trigger/context (default trigger), with existing context for target association. Normative Library reconciliation applied through direct MCP on 2026-10-04: Context entry merged into Menu, context Foundation citation retained, coverage reference redirected. Validation reports zero issues. Existing unrelated Native Select/Slider candidate edits and metadata were preserved; no project commit made.
- Upstream dependency: Base context-menu/index.parts.ts reexports all Menu parts; ContextMenuRoot.tsx renders Menu.Root, adds virtual context anchor and forbids detached context triggers. shadcn base context-menu.tsx and Nova use the same command surfaces.
- Existing owners: TpMenu extends TpHoverSurface; TpContextMenu currently subclasses TpMenu. Move only context invocation policy into menu/context-invocation.ts consumed by TpMenu. Remove public Context exports/registration/catalog/docs/definitions, retaining the same Menu items and recipes.
- Working baseline: earlier popup scroll/hover fixes are preserved. Current modified files for other completion work remain unrelated to this workstream.
- Browser/evidence: registered Chrome MCP; existing localhost servers. tmp/component-verification/library-completion/menu-consolidation/ (local only).

## Capability and interface mapping

| ID | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Default trigger Menu retains open/default/cancellation, modal/portal/positioning and multiple detached triggers | sec-172-menu | Base menu/root and ContextMenuRoot omitted properties | existing TpMenu/TpHoverSurface unchanged default; invocation=trigger | docs/menu.md; src/stories/menu.stories.ts | V-01 | passed | Implementation and documented API reconciled; observed results in V-01. |
| C-02 | Context invocation target remains semantically unchanged and does not activate on ordinary click | sec-173-contextmenu | ContextMenuTrigger; ContextMenuRoot | invocation=context; for ID or single trigger slot/parent target; no normal button trigger registration | docs/menu.md; src/stories/menu.stories.ts | V-02 | passed | Implementation and documented API reconciled; observed results in V-02. |
| C-03 | Right click opens at zero-size point; keyboard ContextMenu/Shift F10 at deterministic target anchor | sec-173-contextmenu | context-menu/trigger/ContextMenuTrigger.tsx | existing context handlers moved to ContextInvocation; same actual Menu SurfaceState; trigger-press reason | docs/menu.md; src/stories/menu.stories.ts | V-02 | passed | Implementation and documented API reconciled; observed results in V-02. |
| C-04 | Single-touch 500ms threshold, movement >10 cancellation, 10 by 10 context geometry, multi-touch/end/cancel cleanup | sec-173-contextmenu | ContextMenuTrigger touch handlers | preserve existing thresholds as interaction constants, not CSS spacing; one cleanup owner | docs/menu.md; src/stories/menu.stories.ts | V-03 | blocked | Implementation and documented API reconciled; observed results in V-03. Native-input validation remains blocked. |
| C-05 | Rejected open does not suppress native context action; reopen updates point without close transition | sec-173-contextmenu | ContextMenuRoot virtual anchor and Menu onOpenChange | controller proposes to existing requestOpen, restores point/keyboard flag on rejection | docs/menu.md; src/stories/menu.stories.ts | V-02 | passed | Implementation and documented API reconciled; observed results in V-02. |
| C-06 | Keyboard opening focuses first enabled item; closing restores invoking context only if focus moved inside | sec-173-contextmenu; sec-172-menu | Menu.Popup focus and context close policy | existing Menu highlight/focus/dismissal; contextual keyboard marker integrated with accepted open | docs/menu.md; src/stories/menu.stories.ts | V-02 | passed | Implementation and documented API reconciled; observed results in V-02. |
| C-07 | Dynamic target replacement, mode changes, disabled, disconnect/reconnect and handle policy | sec-173-contextmenu | ContextMenuRoot detached-trigger exclusions; trigger effect cleanup | reset existing trigger registrations through base owner; context controller binds only while enabled; no duplicate open state | docs/menu.md; src/stories/menu.stories.ts | V-01, V-02 | passed | Implementation and documented API reconciled; observed results in V-01, V-02. |
| C-08 | All Menu constituents: groups/labels, separators, checked/radio state, links, icons/kbd, arbitrary nested menus and chevrons | sec-172-menu; user parity request | Base context-menu/index.parts.ts direct reexports; shadcn context-menu.tsx | retain TpMenuItem/Checkbox/Radio/child TpMenu, public Icon/KeyHint and common command recipes | docs/menu.md; src/stories/menu.stories.ts | V-01, V-02 | passed | Implementation and documented API reconciled; observed results in V-01, V-02. |
| C-09 | One Menu presentation namespace and public identity; complete docs and consumers migrate | user explicit consolidation; ucl20-menu semantics retained | Nova shared command surface; existing menu-family recipes | remove context-menu key family; add menu-target; catalog/exports/elements/story/fixtures use TpMenu | docs/menu.md; src/stories/menu.stories.ts | V-04 | passed | Implementation and documented API reconciled; observed results in V-04. |
| C-99 | Native browser media/accessibility and applicable native-input or SSR verification | Shared Foundation accessibility/motion/lifecycle contract; skill verification procedure | Shared native platform and component source tests recorded above | Existing shared owners; no simulated platform substitute | Component docs and ../verification-results.md | V-98 V-99 | blocked | Implementation remains in scope; verification requires capabilities not exposed by registered tools. |

## Architecture and reuse

### Family dependency map

| Responsibility | Upstream dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| --- | --- | --- | --- | --- |
| Root/menu collection/focus/checked state | ContextMenuRoot -> Menu.Root; index.parts -> Menu.* | TpMenu, MenuItem/Checkbox/Radio, ChoiceCollectionController | Keep the complete Menu owner; controller owns only invocation target and virtual anchor | Menu, context invocation, Menubar, Navigation Panel menus; V-01, V-02 |
| Portal focus admission | Foundation branch/inert lifecycle; Base Menu.Popup | outside-inert.ts and TpAnchoredSurface | Refresh the existing inert lease after a nested portal is mounted and before focus; no second focus/inert owner | All anchored surfaces inside modals; V-01, V-02 |
| Trigger registration lifecycle | Menu Trigger registration versus ContextMenuTrigger | TpHoverSurface/TpAnchoredSurface slot/handle registrations | Add protected reset/sync hooks; default path unchanged; context mode removes ordinary trigger semantics/listeners | Menu and other anchored surfaces; V-01 |
| Command appearance | Context/Menu registry shared Nova menu target selectors | command-surface.ts and menu-family.ts | All consumers use menu namespace and existing recipes; no context paint copy | Menu, Menubar and sidebar menu compositions; V-04 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| --- | --- | --- | --- | --- | --- |
| Context target | Base; Nova | ContextMenuTrigger native region | menu-target empty recipe; caller's existing public Button or native region | No target button state or appearance is fabricated | V-02 |
| Content, items, label, separator, shortcut and submenus | Base; Nova | context-menu/index.parts direct Menu reexports; cn-menu-* | actual Menu family and shared commandSurface/commandItem recipes | Same parts, inset, radius and sibling behavior regardless of invocation | V-01, V-04 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| --- | --- | --- | --- | --- |
| Context invocation story | Target, actions, checks, radio, submenu, icons, shortcuts | TpButton, TpMenu*, TpIcon, TpKeyHint, TpSeparator | real context/keyboard opening and nested use; V-02 | Generic target region may remain native because its semantics belong to caller |
| Existing Menu/Menubar/sidebar stories | same actual command owner | Existing canonical full menu composition | trigger and submenu regression; V-01 | None; preserve public controls |

## Verification scenarios

| ID | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V-01 | C-01 C-07 C-08; regression | Trigger click, first/post-dismiss hover, keyboard submenu, checkbox/radio, Menubar sibling hover; context -> trigger mode | Existing owner and behavior preserved; no duplicate listeners/state; full command anatomy retained | Real trigger/context mode, checkbox/radio and two nested submenu levels checked; ArrowRight focuses enabled child. Menubar atomic API passes; actual Navigation Learn click to Tools hover reanchors with9.5px gap. Sidebar first/returned hover matches. | Chrome MCP actual input and current menu fixtures | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-02 | C-02 C-03 C-05 C-06 C-07 C-08; context behavior | Right click if supported; Shift F10; ordinary click; Escape; canceled opening; replaced for target; nested levels | Point anchored acceptance; correct menu focus and restored context; target not converted to trigger button; one action | Ordinary context-target click remains closed; real Shift F10 opens and Escape returns focus. API cancellation, target replacement and nested context state pass. Secondary mouse click unavailable and tracked separately. | Chrome MCP real keyboard/pointer and public APIs | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-03 | C-04; touch | Real touch hold/cancel/movement when MCP input supports it | Threshold and cancellation match source; no synthetic input claimed as real | Native touch hold/movement/cancel not available in registered Chrome MCP schemas; source thresholds retained, no synthetic pass claimed. | Registered Chrome MCP capabilities; deterministic unit policy checks if needed | blocked | See execution appendices and ../verification-results.md. Remaining physical-input boundary recorded in V-99. |
| V-04 | C-09; package/docs/visual | Catalog/registration/type/build, canonical docs, theme spacing, light/dark, body code search | One public Menu; shared padding and recipes; no separate Context entry; imports and constituents work | One Menu identity, canonical context story and full icon/shortcut/submenu docs. Eleven selected existing Menu API cases pass including portal, unmount, reconnect, rejection, mode and customization. Built ContextMenu export/tag absent; builds pass. | Type/build, source audit, Chrome MCP | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-98 | C-99; native media/accessibility | OS forced-colors and applicable OS reduced-motion policy | Correct native high-contrast and media behavior | Registered Chrome MCP has no forced-colors or OS reduced-motion control. Explicit component reduce policy was tested separately where applicable. | Registered tool schema inspection | blocked | No CSS pseudo-state or matchMedia mock is accepted as native media evidence. |
| V-99 | C-99; native input/runtime | Required physical-input or SSR boundary | Native platform behavior verified without simulation | Real secondary click and touch long-press/movement/cancellation input are absent from the registered Chrome MCP schemas. | Registered Chrome MCP schemas and current runtime inventory | blocked | Source/API evidence does not substitute for this required execution. |

## Early integration checkpoint

| ID | Check | Status | Evidence / unresolved finding |
| --- | --- | --- | --- |
| I-01 | Shared owners are actually used by related consumers; old duplicate behavior is removed/delegated | passed | TpContextMenu removed; ContextInvocation only owns target/point/touch policy; actual TpMenu retains state, items, focus, nested branches and presentation. |
| I-02 | Default visual regions match traced source and shared library recipes | passed | Chrome 1000x850 dark screenshot inspected after repairs: shared padding, actual icons/KeyHints/check/radio, trailing chevron, correct submenu menuitem role. Screenshot is in tool conversation; MCP refused the configured local artifact path as outside its workspace roots. |
| I-03 | Independent constituent options work, including placement separately from action behavior | passed | Actual Chrome ordinary click remains closed; Shift F10 focuses first command; Escape restores target; switching to trigger mode restores expanded/haspopup. Keyboard opens two submenu levels and inline-back returns after shared inert repair. |

## Gate record

| Gate | Status | Required exit evidence / remaining work |
| --- | --- | --- |
| 0. Sources and scope | passed | Full current Menu/Context contracts, upstream reexport owner and source registry read; explicit user identity consolidation recorded. |
| 1. Capability mapping | passed | Context invocation, all Menu constituent capabilities, timing/cancellation/focus and identity migration have C/V mappings; no behavior removed. |
| 2. Architecture and composition reuse | passed | TpMenu remains actual sole command owner; only context target policy extracted; one presentation namespace and public constituent set. |
| 3. Behavior | blocked | Observed behavior in V rows and execution appendices. Required native-input/runtime evidence remains V-99 blocked. |
| 4. Presentation and customization | passed | Shared recipes, theme overrides and applicable actual part/ref/delegate/dictionary checks pass; source and visual evidence in V rows. |
| 5. Accessibility | blocked | Native AX, real keyboard and local axe checks recorded; forced-colors browser inspection V-98 cannot be emulated with registered tools. |
| 6. Visual and interaction inspection | blocked | Light/dark/RTL/density and relevant optional states inspected; OS media/forced-colors V-98 remains blocked. |
| 7. Documentation and demo reuse | passed | Authored API documentation, copyable source and actual public nested controls reconciled; full Storybook build passes. |
| 8. Regression and reconciliation | blocked | Focused regressions, lint/type/build, served built package and documentation pass. Complete-component certification remains blocked by explicit V-98/V-99 evidence boundaries. |

## Documentation synchronization

- [ ] Context invocation public Menu API, constituent APIs and controlled examples.
- [ ] Removed identity absent from catalog, public exports, registration and current docs.
- [ ] Examples use the actual Menu/Icon/KeyHint/Button constituents.
- [ ] Normative Library catalog reconciled with explicit user consolidation.

## Completion / handoff

Active work. Unsupported real touch verification remains a recorded gap, never a synthetic pass. Full parent scope retained.

## Integration findings and repairs

- Nested portal carried a previous outside-inert lease during synchronous first focus. Instrumented actual Chrome focus confirmed an inert ancestor at that point; refreshOutsideInert now synchronizes the existing owner before placement. Real ArrowRight opened both submenu levels with focused first items afterward. Seven focused inert-owner unit cases passed.
- Menu role/part registration occurred before its parent relationship was established. Initialize parent before shared trigger registration and restore native attributes when a pre-upgrade semantic target is replaced. Preserve actual Button owner.
- Submenu chevrons were absent. Actual public Icon now supplies the default trailing graphic, with caller-authored trailing content respected and logical direction mirrored; shared submenu recipe aligns Button trailing marks.
- RadioGroup string default-value binding now maps to existing defaultValue ownership; objects still use the property. This repairs existing Menu/Menubar examples without a second selection owner.
- Focused catalog/story/presentation checks: 3 files, 17 tests passed. Typecheck and targeted lint passed before latest indicator change; final batch checks pending. Real secondary-click/touch input unavailable in registered MCP schema, so those browser scenarios remain unverified.

## Reconciled execution status — 2026-10-04

Implementation and documentation for this workstream are delivered. The scenario table above supersedes earlier prospective statements below/above that say implementation or final checks are pending. Required unavailable browser/runtime evidence remains explicitly blocked; no full conformance claim is made. See [final verification results](../verification-results.md) for shared fixes, commands, package evidence and tool boundaries.
