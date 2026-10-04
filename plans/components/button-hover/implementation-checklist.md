# Button hover and open navigation trigger

- Requested work / claim: Fix the reported sidebar trigger flash when clicking the team selector and moving into its menu; shared Button hover presentation.
- Scope source: User supplied the exact click then pointer-leave sequence. Earlier hover-only trials did not reproduce a transition restart.
- Baseline: e8c401c; clean working tree before this fix.
- Sources: Fresh direct Foundation and Component Library ASTs read 2026-10-04. Foundation sec-135-button; Library sec-cl-11-state-presentation, sec-cl-15-motion-surfaces, sec-cl-23-navigation-panel. Hover remains a platform pseudo-state; published popup state owns open appearance.
- References: local shadcn 63c1308d1 (clean), bases/base/ui/button.tsx, style-nova.css Button and SidebarMenuButton rules, sidebar-07/components/team-switcher.tsx and nav-user.tsx. Base UI button/Button.tsx delegates native behavior to useButton. Floating positioning is unchanged.
- Tools: direct Spec Blocks and Chrome DevTools MCP available. Existing localhost:6006 source Storybook, agent page130. No screenshots requested or needed for this reported sequence; computed paint/state and real input evidence below.

## Capability and interface mapping

| ID | Capability | Authority | Reference | Owner | Docs | Scenarios | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | One hover paint target; normal leave and interrupted transitions | sec-cl-11, sec-cl-15 | Nova Button hover background | variantPresentation; Button native transition | Existing Button API unchanged | V-01 V-03 | passed | Removed overlay; shared themed color transition retained, including Toggle |
| C-02 | Open popup trigger stays highlighted while pointer enters menu | sec-cl-23 | team-switcher data-open colors; nav-user expanded colors | navigationRow; existing published data-popup-open | Existing Navigation Panel API unchanged | V-02 | passed | Expanded trigger now retains accent background through menu entry; before it became transparent |

## Family dependency map

| Responsibility | Source | Owner | Decision | Consumers |
| --- | --- | --- | --- | --- |
| Action semantics | Base Button -> useButton | TpButton, NavigationPanelButtonPart extends TpButton | Unchanged | Button, navigation actions and menu triggers |
| Hover paint | Nova direct background colors | variantPresentation | Remove pseudo-element opacity layer; keep one background-color transition | Button, Toggle, actionable Bubble |
| Sidebar row paint | Nova SidebarMenuButton and team-switcher | navigationRow | Include published popup-open marker; disclosure expansion remains separate | Navigation panel action/link/disclosure |

## Presentation source map

| Region | Source | Owner | Adaptation | Scenarios |
| --- | --- | --- | --- | --- |
| Ghost/outline hover | base Button, Nova | variantPresentation | Existing input/background token mix as one opaque color; no new tokens | V-01 V-03 |
| Open sidebar trigger | sidebar-07 team-switcher | navigationRow | Existing accent pair and popup marker; no demo CSS | V-02 |

## Implementation and composition reuse map

| Composition | Role | Owner | Integration | Native exception |
| --- | --- | --- | --- | --- |
| Workspace selector | Menu trigger | Menu + NavigationPanelAction + Button | Existing popup state on native button | Existing native semantic Button |
| User action | Sidebar action | NavigationPanelAction + Button | Same hover recipe, no demo overrides | None |

## Verification scenarios

| ID | Capabilities | Setup | Expected | Actual | Tool | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V-01 | C-01 | User button pointer entry/leave, dark/light | One paint target; no overlay animation or restart | User exit reaches transparent with no canceled transition; pseudo content none in light/dark | Chrome MCP hover and animation/style trace | passed | Only color/background transitions remain |
| V-02 | C-02 | Click team selector; hover menu; Escape; repeat | Open trigger retains highlight; closing restores ordinary hover/rest | Dark background constant rgb(76,29,149); light constant rgb(237,233,254); no exit transition events while popup stays open. Escape clears expanded, restores focus and resting transparency. | Chrome MCP click/hover/keyboard | passed | Actual supplied sequence repeated after reload |
| V-03 | C-01 | Outline/ghost Button and Toggle shared recipe; theme token override | Theme endpoint and disabled behavior retained | Outline and ghost have one background transition, no overlay. Scoped input/background overrides change hover color. Disabled stays transparent. Toggle retains 200ms themed transitions after fresh reload and real click sets pressed=true. | Chrome MCP fixture + focused resolver tests | passed | Bubble ordinary div remains noninteractive through unchanged selector restriction |

## Early integration checkpoint

| ID | Check | Status | Evidence |
| --- | --- | --- | --- |
| I-01 | Shared ownership | passed | Two existing shared recipes changed; no component/demo DOM or state changes |
| I-02 | Sourced presentation | passed | Click then menu hover: accent background constant across exit frames; before content none, no exit transitions |
| I-03 | Independent states | passed | Escape closes menu while pointer outside; popup marker clears and ordinary rest paint returns |

## Gate record

| Gate | Status | Evidence |
| --- | --- | --- |
| 0. Sources | passed | Direct live contracts and local reference code/styles read |
| 1. Capabilities | passed | Two reported paint responsibilities and shared consumers mapped |
| 2. Architecture | passed | Repair existing shared recipes; no state, DOM or demo substitutes |
| 3. Behavior | passed | Supplied click/leave sequence and Escape dismissal verified; Toggle real click retains selection |
| 4. Presentation | passed | One hover background; shared theme/motion roles; light/dark open paint and scoped color override |
| 5. Accessibility | passed | Existing named button/menu tree preserved; Escape restores trigger focus. No semantic changes; no new automated or screen-reader claim |
| 6. Visual | passed | Actual pointer movement into open menu yields constant trigger paint and zero exit transitions. No image capture per user instruction |
| 7. Documentation | passed | No API, tokens, imports or demo changes; existing compositions consume the shared fix |
| 8. Regressions | passed | TypeScript noEmit, focused ESLint/Prettier, resolver 5 tests and git diff --check passed |

No full component or catalog conformance claim. Frame export previously blocked by the browser tool workspace boundary; no frame-capture claim. A transition restart was not observed in the before trace; the confirmed defect is loss of expanded-trigger paint plus simultaneous inherited overlay paint.

Verification: Chrome154, 1316x973 DPR2, light/dark, ordinary motion. CSS-only fix; no library-wide build or completeness claim. Temporary browser fixture removed. Final extra transition declaration preserves the shared Toggle timing; the reported menu-entry sequence was rerun after a full reload.
