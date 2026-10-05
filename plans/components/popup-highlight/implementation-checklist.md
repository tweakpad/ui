# Shared popup highlight repair

## Delivery and source record

- Requested work / claim: Shared popup highlight repair.
- Scope source: user reports previous Navigation Menu sibling flashing, expands to contextual menu patterns on focus loss/closing. Repair shared presentation ownership and verify menu family; no full component conformance claim.
- Baseline: 1f2ec4e, clean worktree. Preserve concurrent user work.
- Skill: tweakpad-component. Direct Spec Blocks and Chrome DevTools MCP available.
- Fresh Foundation and Library full ASTs read through direct MCP, project prj_c5a403a0-d1d5-4487-ac78-f4e545f46483, head8440bff24a97dbbc5c762ebf4bd6baa958b305e1. Contracts sec-81-focuspolicy, sec-82-dismisspolicy, sec-172-menu, sec-174-menubar, sec-175-navigationmenu, ucl20-menu, ucl20-menubar, ucl20-navigation-menu, sec-cl-111-state-vocabulary.
- Local references: Base UI5b495488d182c81a8a14a440d7a376517118f8ec navigation-menu/trigger/NavigationMenuTrigger.tsx; Menu/context share owner. shadcn63c1308d112b6b1205d86244a156cca1abef5087 base/ui/navigation-menu.tsx -> style-nova.css cn-navigation-menu-trigger/link and shared command recipes.
- Browser: Chrome MCP102 task page, existing Storybook6006/Vite5173. Evidence local tmp/component-verification/popup-highlight/2026-10-05 and inline Chrome traces.
- Reproduction: real Learn hover -> Tools gives a cancelled outgoing200ms transition. Click Learn then hover Tools leaves Learn background painted solely by ordinary focus. Focus inside Learn then hover Documentation restores Learn focus and ramps its background from50% to100% while closed and not hovered. Computed adopted styles prove Button hover specificity overrides Navigation/Menu role recipes. Standalone Menu close inspected separately; no false claim that every family reproduces identical symptoms.
- Design: lower shared variant interaction selector specificity so composed part recipes own paint; contextual trigger backgrounds update immediately from hover/open, never from plain focus. Preserve focus restoration and visible keyboard rings. Retain popup/content motion. Shared recipe consumed by Menu, Menubar and Navigation; Navigation Panel already combines hover/open, verify as affected consumer.

## Capability and interface mapping

| ID | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Composed role paint outranks primitive Button hover | State vocabulary | base/ui/navigation-menu.tsx render composition; Nova styles | variantPresentation low specificity state predicates | docs/styling.md existing composition | V-01 V-04 | passed | Native rules now yield to compound; actual Menu/Submenu and Navigation colors verified |
| C-02 | Closing/transfer cannot replay old background through focus or fade | Navigation/Menu/Menubar | Base UI NavigationMenuTrigger; Nova trigger | shared contextual trigger transition policy, hover/open recipe | docs/navigation-menu.md existing interactions | V-01 V-02 V-03 | passed | Old fill clears immediately; native focus and keyboard outline retained |
| C-03 | Names, keyboard restoration, submenu ownership and dismissal retained | FocusPolicy/Menu | Base UI Menu family | existing AnchoredSurface, Menu, HoverSurface | docs/menu.md | V-02 V-03 | passed | Real nested, root, context, Menubar and Navigation input checks |
| C-04 | Shared consumers, themes and public customization preserved | Library presentation | shared Button and navigation row composition | real Button/NavigationPanel/Popover/Select controls | existing docs unchanged | V-04 | passed | Standalone/disabled Button, NavigationPanel, Popover, Select and public style hook checked |

## Architecture and reuse

### Family dependency map

| Responsibility | Upstream dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| --- | --- | --- | --- | --- |
| Pointer/focus/close | Base UI Menu + Navigation triggers | HoverSurfaceController, TpAnchoredSurface, Menu tree and Menubar coordinator | Retain owners; focus restoration is required and should not synthesize background | Menu/context/nested/Navigation/Menubar V-01 V-02 V-03 |
| Primitive paint | shadcn render composition onto Button | default.ts variantPresentation, PresentationController registered parts | Lower predicate specificity; contextual compound owns its own region | Button, Toggle, Popover, Select, NavigationPanel V-04 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| --- | --- | --- | --- | --- | --- |
| Contextual triggers | Base/Nova | cn-navigation-menu-trigger, Menu/Menubar trigger | command-surface shared trigger transition policy; family recipes | User requires no after-close flash; remove ordinary focus background and trailing trigger fade, retain visible ring and content motion | V-01 V-02 V-03 |
| Menu submenu item | Base/Nova | cn-menu-translucent | menuItem commandItemRules published highlight | Prevent primitive hover overriding owner; retain single active tree item | V-02 V-03 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| --- | --- | --- | --- | --- |
| Existing stories and regression fixture | All controls | actual public Menu, Button, NavigationMenu, Menubar, Popover, Select, NavigationPanel | Chrome registration and real input | Native links keep navigation semantics |

## Verification scenarios

| ID | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V-01 | C-01 C-02 visual | Learn -> Tools -> Documentation; clicked trigger and focused panel; light/dark and rapid public value reversal | Previous background clears once, no focus repaint; current uses role color | Passed light/dark Storybook and source/built fixture. Before: ordinary/restored focus retained or ramped fill. After: old fill clears once; closed focused trigger transparent; nine frame-spaced public value changes have zero trigger animations | Chrome frame trace; verification-results.md | passed | Public rapid changes are API evidence, not fast-pointer evidence |
| V-02 | C-02 C-03 | Menu root/submenus, sibling rows, action close and Escape; context invocation | One highlighted item; no primitive hover flash; focus restored | Source/light and built/dark Share -> Email -> Copy: one highlighted row, Share clears as submenu closes. Copy activation closes root and restores unhovered trigger resting paint. Context Shift+F10 -> Inspect hover -> Escape restores target with resting paint | Chrome real input | passed | Same Menu owner; unrelated radio-group axe finding recorded separately |
| V-03 | C-02 C-03 | Menubar File/Edit/Help transfer, outside and Escape | Single active sibling; focus restored and keyboard visible | File -> Edit -> File trace moves open state and fill together. Escape returns focus; pointer exit clears fill immediately, including built dark | Chrome real input | passed | Retain coordinated state |
| V-04 | C-01 C-04 | Button standalone; NavigationPanel disclosure; Popover/Select, themed and disabled; public hook override | Ordinary hover still works; compound role paint wins; custom paint retained | Standalone ghost hover works; disabled ghost remains transparent; NavigationPanel team fill stays accent in popup then clears on activation close; Popover Done and Select Banana retain behavior; public Navigation trigger hook wins with active value retained | Chrome and517 tests/type/lint/CSS/build/Storybook | passed | No API or runtime dependency change |

## Early integration checkpoint

| ID | Check | Status | Evidence / unresolved finding |
| --- | --- | --- | --- |
| I-01 | Shared owner adopted | passed | Diff: one shared primitive selector; popupTriggerAppearance consumed by Menu/Menubar/Navigation; no demo rules |
| I-02 | Source-aligned first render | passed | Real Learn/Tools/Documentation trace now uses recipe muted39/39/42, no intermediate colors or transitions; old trigger clears on value transfer |
| I-03 | Independent interaction paths | passed | Real ArrowDown focuses content, hovering Documentation closes; focus restoration retained with transparent closed trigger |

## Gate record

| Gate | Status | Required exit evidence / remaining work |
| --- | --- | --- |
| 0. Sources and scope | passed | Fresh direct contracts and local reference chain read |
| 1. Capability mapping | passed | Shared pattern requested, mapped above |
| 2. Architecture and composition reuse | passed | Existing owners repaired, no demo-specific rules |
| 3. Behavior | passed | Real pointer/keyboard menu transfer and dismissal on source/built; behavior code unchanged |
| 4. Presentation and customization | passed | Role colors win over primitive; public hook retained; disabled hover unchanged |
| 5. Accessibility | passed | Names/roles and actual keyboard focus restoration verified. Settled closed fixture axe has0violations. Existing open fixture radio-group issue and modal landmark findings remain outside CSS repair scope; see results |
| 6. Visual and interaction inspection | passed | Frame-sampled colors/hover/focus/open/highlight reviewed in light/dark; no after-close fill replay |
| 7. Documentation and demo reuse | passed | Shared policy documented in styling.md; durable real-input regression steps added to existing Menu fixture |
| 8. Regression and reconciliation | passed |517tests, typecheck, scoped ESLint/stylelint, build, Storybook and diff checks pass; shared consumers verified |

## Completion and handoff

Shared presentation repair completed. No behavior, public API, trigger geometry or popup/content motion changes. Local evidence and separate accessibility findings are detailed in verification-results.md. User staged the changes during verification; staging was preserved.
