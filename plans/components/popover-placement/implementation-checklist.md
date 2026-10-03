# Popover placement correction evidence

## Delivery and source record

- Component(s) / public identity: TpPopover / tp-popover and necessary existing shared positioning owners.
- Requested work / claim: Fix the three placement findings from the preceding review; bounded correction, not full component conformance.
- Scope source: User: "fix them", referring to ignored placement controls, absolute positioning after document scroll, and the physical default side.
- Repository baseline: clean HEAD 9b747fa50fb52edff695635a8186f24961f91b20. Preserve the older full-component record at ../popover/implementation-checklist.md and its unresolved rows.
- Authority: fresh direct MCP project and complete Foundation/Library ASTs, 2026-10-03; project prj_c5a403a0-d1d5-4487-ac78-f4e545f46483, version 0.3.15, head 8440bff24a97dbbc5c762ebf4bd6baa958b305e1, state 07b68b0c8a1512b44d72d2a300784ea7b1b19e0b8e59e3d850c29eb5237885d3.
- Source pins: clean Base UI 5b495488d182c81a8a14a440d7a376517118f8ec, Floating UI 27629b74ba36ab8ceb2a968051927b9b69511a3b, shadcn 63c1308d112b6b1205d86244a156cca1abef5087 (verified during preceding review).
- Evidence: tmp/component-verification/popover/placement-fix/; local workspace artifacts, not automatically available on another machine.
- Tools: registered direct Spec Blocks and Chrome DevTools MCP available; existing localhost:6006 Storybook and localhost:5173 Vite, no server replacement.

## Capability and interface mapping

| ID | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Accept documented space-separated placement and preserve existing hyphenated input; logical side/alignment and canonical getter | Foundation 10.1, 10.4; Library ucl19-popover | Base internals/useAnchorPositioning side/align; existing story compatibility values | TpAnchoredSurface placement setter, side and align | docs/anchored-surfaces.md | V-01, V-04 | passed | Existing setter accepts spaces and hyphens; 192 source and 192 built input/geometry cases passed. |
| C-02 | Absolute coordinates use strategy coordinate context; fixed coordinates remain viewport-relative | Foundation sec-103-measurement-adapter, sec-104-positioningrequest-and-result, 10.9 | Floating DOM getOffsetParent, getRectRelativeToOffsetParent, getHTMLOffset | Existing positionSurface coordinate conversion; handle top-layer window offset parent and document scroll | docs/anchored-surfaces.md | V-02, V-04 | passed | Shared conversion repaired; 14 source and 14 built scroll/strategy cases have zero attachment error; actual Select/Combobox/Toast checks also passed. |
| C-03 | Popover default is block-end, center; physical sides remain explicitly available | Library ucl19-popover; Foundation 15.1 logical-side mapping | Base PopoverPositioner delegates useAnchorPositioning; governed Library override | TpPopover side default and story args; existing resolveSide | docs/popover.md | V-03, V-05 | passed | Six source and six built writing-mode/direction defaults passed; explicit bottom remained physical. |

## Architecture and reuse

### Family dependency map

| Responsibility | Upstream dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| --- | --- | --- | --- | --- |
| Placement binding | Base PopoverPositioner -> internals/useAnchorPositioning; Menu/Tooltip/Preview bindings | TpAnchoredSurface inherited by TpHoverSurface | Repair current setter accepting spaces and hyphens; Popover overrides logical default | Popover, Menu/Context/Menubar menu roots, NavigationMenu, Tooltip, PreviewCard; V-01, V-04 |
| Coordinate conversion | Floating DOM getOffsetParent and getRectRelativeToOffsetParent | foundation/positioning.ts positionSurface | Correct window/initial-containing-block absolute coordinates; fixed path untouched | Anchored family, Select, Combobox, Toast configurable absolute/fixed caller; V-02, V-04 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| --- | --- | --- | --- | --- | --- |
| Content, header, title, description | shadcn bases/base / Nova | ui/popover.tsx and styles/style-nova.css cn-popover-content/header/title/description | recipes/popover.ts and anchoredPresenceAppearance | Retain recipes and component composition; only geometry/default args change | V-05 |
| Positioner and portal | Base PopoverPositioner, Floating DOM platform | useAnchorPositioning positionerStyles; getOffsetParent top-layer/window handling | TpAnchoredSurface startPosition and positionSurface | Repair geometry at shared structural owner; no paint override | V-02, V-05 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| --- | --- | --- | --- | --- |
| Canonical Storybook Popover | Trigger/close and labelled field | tp-button, tp-field, tp-input from register | V-05 real opening/closing, AX naming and unchanged node identity | Native spans are title/description text, not substitutes |
| Placement fixture | Interactive trigger/content action | tp-button; existing actual anchored-family components | V-01 through V-04 source/built public APIs | Native div supplies independent Anchor geometry and scroll layout only |

## Verification scenarios

| ID | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V-01 | C-01; API/attributes | All eight physical/logical sides and three alignments, spaced/hyphenated syntax, programmatic and attribute updates; LTR/RTL | Accepted side/align and correct resolved geometry, invalid input preserves state | 192 cases each on source and built; maximum side attachment rounding error 0.421875px | Chrome MCP durable placement fixture | passed | Space/hyphen, property/attribute, all 24 combinations in LTR/RTL passed; whitespace and invalid-input preservation also checked. |
| V-02 | C-02; geometry/lifecycle | Scroll document on both axes; absolute/fixed, portal on/off; change strategy while open; nested scroller and transformed layout | Popup edges stay attached within device rounding; tracking updates automatically; fixed does not add scroll | 14 cases each on source and built, attachment error 0px | Chrome MCP durable placement fixture | passed | Both document axes, portal on/off, absolute-fixed-absolute changes, automatic tracking, transformed ancestor and nested scroller passed. |
| V-03 | C-03; default/writing mode | Fresh Popover without placement override; horizontal-tb, vertical-rl, vertical-lr and RTL | Defaults block-end/center; resolves bottom/left/right, explicit physical bottom remains bottom | Six defaults plus explicit physical-bottom checks each on source and built passed | Chrome MCP durable placement fixture | passed | Horizontal bottom, vertical-rl left, vertical-lr right in LTR/RTL; fresh instances verify the class default. |
| V-04 | C-01, C-02; shared regressions | Menu, Context, Navigation, Tooltip, Preview, Select, Combobox actual components; Toast fixed positioning owner via unchanged fixed unit/built graph | Shared consumers retain accepted placement/coordinate behavior; own defaults unchanged | 10 family cases plus six Select/Combobox/Toast cases each on source and built passed | Chrome MCP, focused and full Vitest, typecheck/build | passed | Menu, Context, Navigation, Tooltip, Preview real components; Select/Combobox after 1000px scroll absolute/fixed have zero error; Toast errors <=0.203125px. Menubar inherits the unchanged actual Menu binding. |
| V-05 | C-01, C-03; docs/visual/accessibility | Real Storybook trigger click, placements Controls, close click/Escape; inspect screenshot/AX; standalone source remains actual components | Controls/default agree with API, labelled dialog/field and close action work; correct attachment | Live Controls top start moved panel; real click/Done/Escape and AX naming passed; axe: zero violations, 18 passes | Chrome MCP Storybook and screenshots | passed | Canonical dark source composition inspected in early-top-start.png and final-bottom-center.png; documented default and 24 Controls options updated. AX labelled dialog/Name field, real close/focus restore; axe WCAG2A/2AA/2.1AA on standalone fixture. No screen-reader or whole-component claim. |
| V-06 | C-01, C-02, C-03; regression/reconciliation | Scoped lint, full unit tests, typecheck, library and Storybook builds, diff check; record checker | Checks pass and evidence matches actual diff | 262/262 tests, typecheck, scoped ESLint, formatting, library build, Storybook build and diff check passed | npm/npx and checker logs | passed | Command logs in evidence directory. Builds exited zero; Storybook emits existing large-chunk advisory. Gates implement and verify passed; complete checker passed at handoff. |

## Early integration checkpoint

| ID | Check | Status | Evidence / unresolved finding |
| --- | --- | --- | --- |
| I-01 | Shared owners actually used | passed | Actual diff modifies only existing TpAnchoredSurface setter and positionSurface conversion; all named consumers still import/inherit these owners. |
| I-02 | Representative source presentation retained | passed | Chrome Storybook screenshot early-top-start: surface/header/text/rounded bordered panel and actual Field/Input/Button use unchanged Nova recipes; top/start panel aligned to Trigger left edge. No paint diff. |
| I-03 | Independent placement and action behavior | passed | Real Chrome click opened dialog; spaced top start resolves top-start, Arrow independently appears, real Done action closes. Labelled dialog and Name field remain in AX tree. |

## Gate record

| Gate | Status | Required exit evidence / remaining work |
| --- | --- | --- |
| 0. Sources and scope | passed | Fresh direct AST/project reads and preceding local reference/browser review; three findings explicitly authorized. |
| 1. Capability mapping | passed | Three affected capabilities fully mapped above, six scenarios; compatibility spelling is local binding, no contract change. |
| 2. Architecture and composition reuse | passed | Existing shared owners repaired; Popover-only default override; no new owner/recipe/runtime dependency. |
| 3. Behavior | passed | V-01 through V-04 all source/built API, geometry, writing-mode and tracking cases passed. |
| 4. Presentation and customization | passed | Unchanged shared Nova recipes retained; independent Arrow and placement checked, screenshot review confirms attachment and source controls. |
| 5. Accessibility | passed | V-05 real open/Done/Escape, AX labelled dialog/field and focus restoration; local axe zero violations. Geometry-only scope, no broader conformance claim. |
| 6. Visual and interaction inspection | passed | V-02 geometry and V-05 dark canonical screenshot inspection passed; all attachments within device rounding, no recipe changes. |
| 7. Documentation and demo reuse | passed | Docs syntax/default and 24 live placement Controls agree with API; actual Button/Field/Input and standalone fixture imports verified. |
| 8. Regression and reconciliation | passed | V-06 checks passed; source/built consumer results recorded and actual diff reviewed. Original complete-component pending rows preserved. |

## Documentation synchronization

- [x] Shared placement syntax and Popover default documented.
- [x] Storybook args/Controls agree with implementation.
- [x] Verification fixture remains outside stories and package exports.

## Completion / handoff

- Delivery boundary: these three placement fixes only; older full-component gaps remain in the original record.
- Checks and results: all six scoped scenarios passed. Record checker passed implement and verify; complete passed after final record synchronization.
- Browser: Chrome 154, 1680x1067 fixture viewport, dark canonical screenshot, LTR/RTL; source and built-package URLs at localhost:5173/tests/fixtures/components/popover-placement/ and ?package.
- Non-browser: npm test 262/262 (42 files), tsc noEmit, scoped ESLint, changed-file Prettier, npm run build, npm run build-storybook, git diff --check all exited zero.
- Evidence files: source-browser.json, built-browser.json, source-consumers.json, built-consumers.json, early-top-start.png, final-bottom-center.png and command logs under the evidence directory. Local only.
- Earlier fixture setup errors were corrected: use uncontrolled setOpen(), keep an Anchor in its named slot, reopen after intentional reparent, bind Context target and actual Navigation Item before opening. Final scenarios use real implementations; no browser mocks/drivers.
- Remaining in-scope gaps: none. Older complete-component gaps in ../popover/implementation-checklist.md are not certified by this fix.
- Dev server: started npm run dev -- --host localhost because port 5173 was unavailable; left running for fixture review. Existing Storybook server preserved.
