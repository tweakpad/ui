# Key Hint and parent Group

## Delivery and source record

- Requested work / claim: Review and normalize Key Hint spacing/icon size; expose a parent Group and individual Keys, with reference use cases and full applicable APIs.
- Scope source: User request and https://ui.shadcn.com/docs/components/base/kbd.
- Baseline: clean worktree after prior popup repair was committed by user. Preserve concurrent edits.
- Skill: tweakpad-component. Direct Spec Blocks and Chrome MCP available.
- Authority: fresh project head8440bff24a97dbbc5c762ebf4bd6baa958b305e1/state08b587880bc26c712e91ce523bc63d7b8260102a18f30246f1e66ca7c3953010 matches freshly read Foundation/Library ASTs. Complete ucl22-key-hint requires Key/Group, platform/localizable notation, separators and informative-only behavior. User explicitly requests parent Group; corrected two reversed containment cells by direct MCP. Candidate validates with unchanged47 pre-existing issues; not committed because project canCommit=false. No new semantic scope beyond requested parent structure.
- Reference: local ui63c1308d112b6b1205d86244a156cca1abef5087 base/ui/kbd.tsx and style-nova.css cn-kbd/cn-kbd-group; examples kbd-demo/group/button/tooltip/input-group/rtl. Kbd is native kbd; Group native kbd; no Base UI runtime owner. Reuse actual library Button/Tooltip/InputGroup/Icon.
- Implementation baseline: primitive in primitives.ts, 25px minimum, outlined mono recipe, no Group or normalized slotted icons. Existing menu shortcuts combine multiple symbols in one keycap. Tooltip composition also needs to follow projected content.
- Browser: Chrome MCP102; existing localhost6006 and5173. Evidence local tmp/component-verification/key-hint/2026-10-05 plus inline tool results.

## Capability and interface mapping

| ID | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Individual Key native informative kbd, slotted text/icon, no keyboard registration | ucl22-key-hint | base/ui/kbd.tsx Kbd | TpKeyHint existing tag/export retained, component folder | docs/key-hint.md | V-01 V-03 | passed | Native kbd, AX readable names, real Tab skips keys |
| C-02 | Parent Group owns ordered Key spacing and separators plus/then/none, default plus | ucl22-key-hint corrected containment | KbdGroup | TpKeyHintGroup constituent, key-hint-group part; private child context/cleanup | docs/key-hint.md | V-01 V-02 | passed | 28 source/built API checks; actual child Key components |
| C-03 | Platform auto/explicit notation and localizable names | ucl22-key-hint | Reference slotted explicit glyphs; live additional platform requirement | platform auto/mac/windows/linux; Key key and label; keyLabels inherited from Group, authored slots unchanged | docs/key-hint.md | V-02 | passed | Platform/localization and child overrides verified |
| C-04 | Shared20px key extent,12px default icons, gap token, explicit icon extent preserved | Library presentation/Icon | Nova cn-kbd h5/minw5/gap1/svgsize3 | shared key-hint recipe; scoped existing icon token, no demo styles | docs/key-hint.md | V-01 V-04 | passed | Chrome light/dark375/RTL,12px/16px icons and spacing scaling |
| C-05 | Named part hooks/delegates and group composition | shared PartContract | Library public Key/Group parts | renderPart, shared presentation controller | docs/key-hint.md | V-02 V-04 | passed | Dictionary replacement, Key/Group style hooks and delegate verified |
| C-06 | Button, Tooltip, Input Group and grouped prose uses | reference page | six base/kbd examples | actual library compositions; fix Tooltip projected hint discovery | Storybook Key hint | V-03 V-04 | passed | Authored Docs and seven real compositions inspected |
| C-07 | Existing multi-key consumers adopt groups | public composition reuse | Menu shortcuts/InputGroup/Command examples | migrate authored shortcuts; CommandPalette retains string API with explicit group composition | related docs/stories | V-03 | passed | Menu/Command interactions; Questionnaire24 existing checks passed |

## Architecture and reuse

### Family dependency map

| Responsibility | Upstream dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| --- | --- | --- | --- | --- |
| Key and sequence composition | KbdGroup contains Kbd | existing TpKeyHint in primitives.ts; TpElement/renderPart | extract Key into folder, add parent constituent and common noninteractive context | Menu/CommandPalette/Questionnaire/InputGroup V-01 V-02 V-03 |
| Icon rendering | cn-kbd SVG size default | actual TpIcon | inherited existing default icon-size token; explicit size continues to win | icon examples V-01 |
| Tooltip palette | cn-kbd in tooltip-content | TpTooltip/setPartComposition | discover hints through owned projected content; keep shared recipe/hook ownership | Tooltip and nested Group V-03 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| --- | --- | --- | --- | --- | --- |
| Key keycap | Base/Nova | cn-kbd | key-hint recipe | muted/sans/medium20px, min20px, default12px Icon; gap/insets tokens | V-01 V-04 |
| Parent sequence | Base/Nova | cn-kbd-group gap1 | key-hint-group recipe | inline-flex gap; separator default plus from live contract, reference no-separator examples explicit none | V-01 V-02 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| --- | --- | --- | --- | --- |
| Reference examples | Key, Group, Button, Tooltip, InputGroup, Input, Icon | public components | source/built fixtures and authored Storybook | Native prose and semantic kbd only |

## Verification scenarios

| ID | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V-01 | C-01 C-02 C-04 visual | standalone/groups, glyphs and icons, explicit icon size, RTL/light/dark | key and icon geometry consistent; spacing owned by controls | passed | Chrome102; results.md | passed | First integration |
| V-02 | C-02 C-03 C-05 API/lifecycle | separators, platforms/localization, nested groups, dynamic members, reconnect, custom hooks | correct text/order/cleanup, preserved consumer overrides | passed | 28 source +28 built Chrome API assertions; unit | passed | No global shortcuts |
| V-03 | C-01 C-06 C-07 composition/accessibility | six reference use cases and Menu/Command/Questionnaire | real shared controls, legible contextual palette, informative keyboard semantics | passed | Chrome real pointer/keyboard, axe0, Questionnaire24; results.md | passed | Defaults/public docs reconciled |
| V-04 | C-04 C-05 C-06 regression | theme tokens, style hooks, docs/source/built, type/lint/build | consistent geometry and customization | passed | Chrome Docs/source/built;521 tests; checks in results.md | passed | No full unrelated component claim |

## Early integration checkpoint

| ID | Check | Status | Evidence / unresolved finding |
| --- | --- | --- | --- |
| I-01 | Shared ownership | passed | Diff and Chrome102: actual Key/Group/Icon, shared part binding and recipe |
| I-02 | Sourced first render | passed | Chrome102 dark screenshot:20px keys,12px icons,3.2px group gap; transparent Group |
| I-03 | Independent options | passed | Chrome102: plus/then/none; mac Command/windows Ctrl; explicit16px icon retained |

## Gate record

| Gate | Status | Required exit evidence / remaining work |
| --- | --- | --- |
| 0. Sources and scope | passed | Live contracts/reference and user hierarchy resolved |
| 1. Capability mapping | passed | Full Key/Group applicable surface mapped |
| 2. Architecture and composition reuse | passed | One Key and parent Group, existing nested controls |
| 3. Behavior | passed | Lifecycle/context and notation |
| 4. Presentation and customization | passed | Shared geometry/palette/hooks |
| 5. Accessibility | passed | Native semantics and meaningful notation |
| 6. Visual and interaction inspection | passed | Real uses light/dark/RTL |
| 7. Documentation and demo reuse | passed | All reference uses and constituent API |
| 8. Regression and reconciliation | passed | Unit/type/lint/build/source+built |

Detailed execution, external lint/format failures, spec candidate status and local artifact boundaries: [results.md](results.md). No in-scope implementation gaps remain.
