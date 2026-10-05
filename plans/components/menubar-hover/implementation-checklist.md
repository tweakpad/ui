# Component implementation and evidence record
## Delivery and source record
- Requested work / claim: repair Menubar hover switching and outside dismissal.
- Scope source: user Menubar screenshot; after deliberate opening hover switches sibling menus, outside click closes. Baseline b7a4bf7, clean worktree.
- Live direct MCP reads: Foundation doc_cd3c4721-9f9b-4531-abab-a8bfdbac75f1 sec-174-menubar; Library doc_8077bf7c-0361-48f3-ac87-53b983bd89b3 ucl20-menubar. Modal defaults true; Menubar owns one scalar; canceled transfers preserve prior menu.
- Local references: external/base-ui/packages/react/src/menu/trigger/MenuTrigger.tsx openOnHover from parentMenubarHasSubmenuOpen; popup/MenuPopup.tsx FloatingFocusManager and Menubar return focus. Existing Base/Nova menu-family.ts recipe unchanged.
- Chrome102 Storybook reproduced: File open makes Edit and Help hosts inert and removes them from AX tree. The existing pointerover handler cannot receive sibling input. Direct spec and Chrome tools available, existing localhost:6006/5173.
## Capability and interface mapping
| ID | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Closed hover inert; open hover transfers one menu | sec-174-menubar | MenuTrigger parentMenubarHasSubmenuOpen | Existing Menubar hover/requestMenu, repair shared branch boundary | docs/menubar.md | V-01 | passed | Verified in V-01 through V-03 |
| C-02 | Outside dismissal, modal sibling reachability, cancellation and disabled | sec-174-menubar | MenuPopup FloatingFocusManager, MenuRoot | Shared FloatingDismiss/outside-inert with Menubar inside branch | docs/menubar.md | V-02 | passed | Verified in V-01 through V-03 |
| C-03 | Shared Menu/Popover unchanged outside Menubar; cleanup | ucl20-menubar | shared Menu owners | Protected anchored surface branch hook; only Menubar root extends it | existing docs | V-03 | passed | Verified in V-01 through V-03 |
## Architecture and reuse
- No new public API. Extend existing surface branch roots with a protected getter; Menubar supplies its host through internal MenuBarOwner. Same roots drive inert, focus containment and dismissal. No duplicate hover state machine or styling.
### Family dependency map
| Responsibility | Upstream dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| --- | --- | --- | --- | --- |
| Modal boundary | MenuPopup/FloatingFocusManager | AnchoredSurface/FloatingDismiss/outside-inert | Shared branch getter; Menu includes coordinated Menubar | Menu, Menubar, Popover V-01,V-02,V-03 |
### Presentation source map
| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| --- | --- | --- | --- | --- | --- |
| Bar and popup | Base/Nova | menu and menubar source | menu-family.ts | Preserve all recipes, repair event reachability | V-01 |
### Implementation and composition reuse map
| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| --- | --- | --- | --- | --- |
| Existing Storybook and Menu fixture | triggers/items/popups | TpMenubar/TpMenu/Button/MenuItem | V-01,V-03 | No demo workaround |
## Verification scenarios
| ID | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V-01 | C-01 real pointer and AX | Closed hover then File click, Edit/Help/File hover | No initial open; one open menu switches, all bar triggers reachable | Closed hover leaves value empty; File click then Edit/Help/File hover switches one open menu; all siblings remain in AX tree. | Chrome102 trusted input and dark screenshot | passed | Existing recipes unchanged |
| V-02 | C-02 behavior/accessibility | Outside click, post-dismiss hover, veto/disabled, nested child | Close entire bar, require activation again; veto/disabled preserve old menu | Outside click closes all and releases inert; subsequent hover stays closed. Veto keeps File, disabled Help keeps Edit; nested Share closes when Help opens. Escape/Left/Down restores and moves focus correctly. Scoped bar/popup axe: zero violations, aria-valid-attr-value incomplete. | Chrome102 trusted input + AX; A12 source/package | passed | No screen-reader claim |
| V-03 | C-03 regressions | Source/package branch API, ordinary Menu/Popover, disconnect, type/lint/tests/build | Non-Menubar default boundary unchanged, no inert leak | Source and package A12,A13,A19,A20,A21 pass: modal branches/live regions, Popover positioning and disconnect/reconnect. 517 unit tests, TypeScript, focused ESLint/Stylelint, library and Storybook builds pass. | tests/fixtures/components/menu/api.ts; tmp/component-verification/menubar/hover/ | passed | Default shared branch unchanged outside Menubar |
## Early integration checkpoint
| ID | Check | Status | Evidence / unresolved finding |
| --- | --- | --- | --- |
| I-01 | Shared branch owner reused | passed | AnchoredSurface getter feeds existing FloatingDismiss branch; Menu adds Menubar host. |
| I-02 | Same appearance | passed | Existing File composition and all three triggers visible, recipes unchanged. |
| I-03 | Hover and outside dismissal independent | passed | File click then Edit/Help/File hover transfers one scalar; idle hover did not open. Inactive dismissal rejected. |
## Gate record
| Gate | Status | Required exit evidence / remaining work |
| --- | --- | --- |
| 0. Sources and scope | passed | Fresh contracts and observed inert siblings |
| 1. Capability mapping | passed | C-01 through C-03 |
| 2. Architecture and composition reuse | passed | Single shared branch owner; no recipe changes |
| 3. Behavior | passed | V-01,V-02 |
| 4. Presentation and customization | passed | No visual changes; V-01 |
| 5. Accessibility | passed | AX/focus/axe |
| 6. Visual and interaction inspection | passed | Trusted pointer path |
| 7. Documentation and demo reuse | passed | Document hover activation |
| 8. Regression and reconciliation | passed | V-03 |
## Completion / handoff
- Completed the requested Menubar hover/dismissal repair. docs/menubar.md records activation and reset semantics; existing demos unchanged. Narrow interaction claim, not full family conformance. Logs are local under tmp/component-verification/menubar/hover; screenshots inspected inline.

- Integration found queued focus-outside from an inactive sibling could reset the scalar. requestMenu now rejects close requests from inactive members; existing atomic transfer remains the sole state owner. A12 covers inert exemption, shared boundary and stale dismissal.
