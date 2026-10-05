# Shared menu dots artwork

## Delivery and source record

- Requested work / claim: bounded visual adjustment to make the dots icon bigger.
- Scope source: user asks for larger menu dots and clarifies icon.
- Baseline: d6740ee; preserve pending Questionnaire evidence updates. No unrelated code changes.
- Live authority: same fresh project head8440bff24a97dbbc5c762ebf4bd6baa958b305e1/state08b587880bc26c712e91ce523bc63d7b8260102a18f30246f1e66ca7c3953010 verified through direct MCP. Foundation sec135 Button; Library ucl16-button and ucl22-icon full contracts read. Icon accepts supplied vector artwork, inherits color and preserves explicit extent; no state/API change.
- Local source: ui63c1308d112b6b1205d86244a156cca1abef5087 table-actions.tsx imports MoreHorizontalIcon inside real Button/Menu. Existing local ButtonGroup dots already use3-unit stroke; shared navigationIcons.more uses1.75. Reuse the shared offered definition and eliminate the local ButtonGroup duplicate. First integration at3 units still looked too fine in14px Table icons, so use4 units for the shared dots.
- Browser: Chrome MCP102, existing localhost6006 Storybook Table Docs. Direct MCP is available.
- Evidence: inline Chrome screenshots/geometry; no additional fixture or test is warranted for this small artwork change.

## Capability and interface mapping

| ID | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Larger three dots at unchanged icon/control extent; preserve names, events, theming | ucl22-icon, ucl16-button | base/table-actions.tsx MoreHorizontalIcon; existing ButtonGroup3-unit artwork | navigationIcons.more strokeWidth4, shared TpIcon renderer; ButtonGroup consumes offered definition | docs/icon.md existing supplied-path contract unchanged | V-01 V-02 | pending | Inspect rendered dots and menu action. |

## Architecture and reuse

### Family dependency map

| Responsibility | Upstream dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| --- | --- | --- | --- | --- |
| Dots artwork | Table actions MoreHorizontalIcon | icons/navigation.ts, Icon and Button | Increase shared path stroke; remove duplicate ButtonGroup moreIcon | Table, Breadcrumb, NavigationPanel, workspace, ButtonGroup V-01 V-02 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| --- | --- | --- | --- | --- | --- |
| Three-dot mark | base/Nova | MoreHorizontalIcon artwork inside Button | navigationIcons.more rendered by TpIcon, Button size recipe | Increase dot diameter from1.75 to4 viewBox units; preserve24-unit viewBox and center positions | V-01 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| --- | --- | --- | --- | --- |
| Table actions, ButtonGroup | Menu trigger icon | actual TpButton.icon, navigationIcons.more | V-01 V-02 | None |

## Verification scenarios

| ID | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V-01 | C-01 visual | Table actions light/dark, shared icon geometry | Bigger visible dots; same14px icon and button dimensions | pending | Chrome MCP102 | pending | Visual check |
| V-02 | C-01 regression | Open actual Table Menu; ButtonGroup shared import; type/build/lint | Menu opens normally; shared definition adopted | pending | Chrome MCP and focused checks | pending | No API change |

## Early integration checkpoint

| ID | Check | Status | Evidence / unresolved finding |
| --- | --- | --- | --- |
| I-01 | Shared owner adopted | passed | Diff confirms navigationIcons.more consumed by existing callers and ButtonGroup |
| I-02 | Sourced visual region | passed | Chrome rendered shared dots inside Table Button; first inspection led to4-unit stroke |
| I-03 | Independent extent and action | passed | Chrome measured14px icon and32px Button; accessible trigger remains Actions for INV001 |

## Gate record

| Gate | Status | Required exit evidence / remaining work |
| --- | --- | --- |
| 0. Sources and scope | passed | Bounded artwork request, current contracts and references read |
| 1. Capability mapping | passed | One visual capability; existing APIs/semantics unchanged |
| 2. Architecture and composition reuse | passed | Shared offered definition, no duplicate renderer or demo override |
| 3. Behavior | pending | Real menu open |
| 4. Presentation and customization | pending | Extent/color retained and dots bigger |
| 5. Accessibility | pending | Trigger name and native semantics remain |
| 6. Visual and interaction inspection | pending | Light/dark screenshot and actual menu |
| 7. Documentation and demo reuse | pending | No public API changes; ButtonGroup imports shared artwork |
| 8. Regression and reconciliation | pending | Focused lint/type/build/diff checks |

## Completion / handoff

Pending implementation and visual verification. This bounded change does not certify Menu/Icon families.
