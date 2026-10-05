# Component implementation and evidence record
## Delivery and source record
- Requested work / claim: fix duplicate active Menu items across nested menus, preserving checked values and keyboard return.
- Scope source: user screenshot, explicit single active element requirement.
- Baseline: 8eea3a8; clean worktree at start. Earlier Drawer/Carousel changes preserved.
- Live sources: fresh direct MCP Foundation sec-172-menu and Library ucl20-menu (docs doc_cd3c4721-9f9b-4531-abab-a8bfdbac75f1 / doc_8077bf7c-0361-48f3-ac87-53b983bd89b3). One active item, arbitrary nested shared owner, logical navigation and return focus. User explicitly requests one tree-wide visual active item.
- Reference: external/base-ui menu/item/MenuItem.tsx uses store isActive; submenu-trigger/MenuSubmenuTrigger.tsx retains parent activeIndex for return. external/ui Base dropdown-menu -> shared menu-item and style-nova.css cn-dropdown-menu / cn-menu-translucent. Existing Command Palette also consumes command-surface recipe and keeps its existing focus behavior.
- Reproduced with Chrome88 actual Document actions, checkbox click, Share hover, Copy link hover, Invite people hover, Email invitation hover: all three menus retain highlightedItem and their rows are painted simultaneously. Root cause: per-level persistent highlights plus independent focus/open paint selectors.
- Tools: direct MCP Spec Blocks and Chrome DevTools available; existing localhost:6006/5173. Evidence local tmp/component-verification/menu/highlight/ and task Chrome88.
## Capability and interface mapping
| ID | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | One visual highlight across open menu tree | ucl20-menu and explicit user instruction | MenuItem store isActive | Root owns highlight menu; local collection keeps navigation cursor | docs/menu.md | V-01 | passed | Chrome three-level pointer trace: one state owner and one painted row |
| C-02 | Pointer and keyboard transfer ownership, return restores parent trigger | sec-172-menu | SubmenuTrigger activeIndex, list navigation | Existing highlight, pointer, focus and close hooks; no replacement state machine | docs/menu.md | V-02 | passed | V-01 through V-03 below |
| C-03 | Checked/radio values independent, cancellation and disabled behavior retained | sec-172-menu | CheckboxItem/RadioItem | Preserve ControllableState and checked indicators | existing docs | V-01,V-02 | passed | V-01 through V-03 below |
| C-04 | Nested portals, cleanup, context and Menubar use same Menu; Command Palette unchanged | ucl20-menu | same Menu owners | Shared command recipe parameterizes active selector; Menu only opts into highlighted paint | existing docs | V-03 | passed | V-01 through V-03 below |
| C-05 | Moving to another item closes the parent's open child branch at every depth | User clarification; sec-172-menu nested coordination | Base MenuSubmenuTrigger hover/list coordination | TpMenu highlight path closes other child menus via existing cancellable setOpen | docs/menu.md | V-04 | passed | V-04 trusted three-level pointer and keyboard, A29 source/package |
## Architecture and reuse
- TpMenu remains collection/tree owner; one root highlight-owner reference coordinates publication without resetting ancestor navigation indices. No CSS-only hiding of stale state.
### Family dependency map
| Responsibility | Upstream dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| --- | --- | --- | --- | --- |
| collection/focus/tree | Menu/SubmenuRoot -> shared store | TpMenu/ChoiceCollectionController/AnchoredSurface | Add tree-wide highlight ownership and preserve existing focus restoration | Menu context/trigger and Menubar V-01,V-03 |
| shared command paint | base dropdown menu shared item -> Nova | command-surface.ts + menu-family.ts | Parameterize highlight selector; Menu removes focus/open independent paint; Command Palette keeps current default | V-01,V-03 |
### Presentation source map
| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| --- | --- | --- | --- | --- | --- |
| item/checkbox/radio/sub-trigger | Base/Nova | focus and data-open paint in cn-dropdown-menu; cn-menu-translucent | shared command appearance | User single active requirement: Menu data-highlighted is sole active paint source, values stay indicated | V-01,V-02 |
### Implementation and composition reuse map
| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| --- | --- | --- | --- | --- |
| existing Menu/Context/Menubar stories | item/trigger/choice/icon/keyhint | existing tp-menu-item/tp-button/choice items/icons | V-01,V-03 | No demo edits |
## Verification scenarios
| ID | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V-01 | C-01,C-03 visual/pointer | Reproduce screenshot and traverse all three levels, return to sibling; light/dark | At most one highlighted/painted item, checked values remain | Source frame trace: one painted row throughout three-level entry/exit, no blank frame; both themes visually inspected; checked indicators retained. | Chrome88 and user Chrome47 frame traces | passed | No demo styles changed |
| V-02 | C-02,C-03 keyboard | Root keyboard open, child forward, movement, backward/Escape, checkbox activation, disabled skip | One highlight at focused item, correct return and values | Disabled Paste skipped; Space toggles Word wrap; forward/backward/Escape preserve one highlight and restore parent trigger. | Chrome88 trusted input and AX snapshots | passed | No screen-reader claim |
| V-03 | C-04 regressions | Context and Menubar nested items, disconnect/reopen, shared Command Palette recipe, builds/axe | Same ownership, no stale markers, no palette regression | Context Shift+F10/arrows/Escape and Menubar Edit/Undo/Show ruler pass; A28 source/package passes focus, disconnect/reconnect and no fade; 517 unit tests, TypeScript, focused lint, library/Storybook builds pass. | Chrome88; A28 in tests/fixtures/components/menu/api.ts; tmp/component-verification/menu/highlight/ | passed | Command Palette default recipe unchanged; axe details below |
| V-04 | C-05 parent branch dismissal | Three levels: child to sibling in parent; root sibling; keyboard/focus; canceled close | Only abandoned child branch closes; ancestors and current highlight/focus remain; veto respected | Email to Copy link closes only Invite people; Email to Word wrap closes Share and descendants, retains new highlight/focus. Keyboard forward/backward/Up stays in parent. A29 verifies same at two depths and close veto. | Chrome88 fresh reload; A28/A29 source and package | passed | Focus restoration uses retained popup containment after live dismissal layers release |
## Early integration checkpoint
| ID | Check | Status | Evidence / unresolved finding |
| --- | --- | --- | --- |
| I-01 | Shared owners adopted | passed | TpMenu root highlight owner used by every level; ancestor cursor retained; existing recipe factory keeps Command Palette default. |
| I-02 | Active paint matches one owner | passed | Chrome88 exact path: Invite people alone active, then Email invitation alone active. All other row backgrounds transparent. |
| I-03 | Checked/expanded states independent | passed | Expanded Share and Invite people remain open with transparent backgrounds; Comfortable retains checked semantics without active paint. |
## Gate record
| Gate | Status | Required exit evidence / remaining work |
| --- | --- | --- |
| 0. Sources and scope | passed | Live contracts and trusted reproduction |
| 1. Capability mapping | passed | Visual/pointer/keyboard/tree scope mapped |
| 2. Architecture and composition reuse | passed | Existing Menu and command recipe reuse, user policy resolves upstream multiple open path paint |
| 3. Behavior | passed | V-01,V-02 and A28 source/built |
| 4. Presentation and customization | passed | Shared recipe preserves tokens/hooks; Menu overrides inherited Button fade; both themes |
| 5. Accessibility | passed | Keyboard and AX roles/focus verified for repair; submenu axe zero violations/incomplete; older fixture diagnostics recorded below |
| 6. Visual and interaction inspection | passed | Frame-level source trace, both themes, source and built pointer input |
| 7. Documentation and demo reuse | passed | docs/menu.md documents tree highlight versus checked values; no demo workaround |
| 8. Regression and reconciliation | passed | A28 source/built, unit/type/lint/build/Storybook/diff checks |
## Documentation synchronization
- Existing API preserved; document single active highlight independently of checked state.
## Completion / handoff
- Completed the requested single-highlight and submenu blink repair in the shared Menu behavior/presentation. No complete Menu family certification claimed.
- Follow-up blink reproduction: normal items switch immediately but submenu Button triggers retained a 200ms background fade. Chrome animation-frame traces showed old and new rows painted during transfer. Shared Menu recipe now sets transition:none; after full reload every sampled transfer frame has exactly one painted row, with no blank frame. Storybook HMR retained the previous presentation dictionary; full reload was necessary and user Chrome47 was refreshed after verification.
- Durable A28 checks root/child focus ownership, sibling marker cleanup, keyboard-return trigger, detached/reconnected owner and absence of inherited Button fade; passed in source and package fixtures. Marker assertions await Lit rendering rather than asserting before updateComplete.
- Accessibility scope: nested popup axe returned zero violations and incomplete checks. Full Storybook reported shell landmark/heading diagnostics. Existing family fixture reported root aria-required-children for radio group/sentinels and page landmark diagnostics while modal; a scan during theme change reported contrast. These are outside the highlight repair and not a whole-family accessibility pass. Native AX tree roles, checked values and real keyboard navigation were separately inspected.
- Evidence logs are local under tmp/component-verification/menu/highlight (not portable artifacts). Screenshots were inspected inline because the MCP screenshot file writer rejected the workspace path. Source/built A28 and frame trace results are recorded here.

- Parent-dismissal follow-up: preserve staged prior work. Fresh-read both live documents; reuse each TpMenu local child list, existing cancellable setOpen and descendant cascade. On accepted navigation close, transfer focus out of the closing branch before its deferred teardown, preventing old trigger restoration from stealing highlight. No root-only logic or new presentation changes.

- Parent-dismissal result: trusted Chrome three-level pointer and keyboard paths pass; A28/A29 source and built pass; 517 tests, focused ESLint/Stylelint, TypeScript and rebuilt library pass. Nested Up/Down now belongs to the parent list; top-level trigger open keys remain unchanged. Existing cancellation and focus return preserved. No presentation/demo changes in this follow-up.
