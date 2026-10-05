# Input Group spacing and alignment repair

## Delivery and source record

- Requested work / claim: Bounded shared-component alignment and spacing fix.
- Scope source: User's four screenshots and Input Group Docs URL; explicitly fix library components, not demos.
- Baseline: clean library 059f371b2d7f46a9cfba7de30de357948f255a80.
- Live sources: direct MCP project read 2026-10-05, head 8440bff24a97dbbc5c762ebf4bd6baa958b305e1, version 0.3.15; complete Foundation doc_cd3c4721-9f9b-4531-abab-a8bfdbac75f1 and Library doc_8077bf7c-0361-48f3-ac87-53b983bd89b3 ASTs fetched. Read ucl17-input-group, ucl17-input, sec-cl-71-what-structure-is, sec-142-input and audit-req-1918-addon-focus. Existing project candidate issues are not changed by this task.
- Upstream: clean shadcn 63c1308d112b6b1205d86244a156cca1abef5087; bases/base/ui/input-group.tsx imports Button/Input/Textarea; registry/styles/style-nova.css lines 1397–1446. No new Base UI/Floating behavior: existing editor and surface owners retained.
- Browser: Chrome DevTools MCP page 37, supplied localhost:6006 Docs page, source build. Before measurements: composed groups 43.594px high, native input 34px top-aligned; prefix gap 14.398px; input font 15px versus addon 14px.
- Evidence: screenshots inspected through MCP; local record only. Screenshot export to tmp/component-verification/input-group/2026-10-05/composed-after.png was rejected by the browser tool's workspace-root policy, so no saved screenshot is claimed. Older full-component gaps remain in ../library-completion/input-group/implementation-checklist.md.

## Capability and interface mapping

| ID | Requirement / defaults | Live authority | Upstream symbol | Implementation | Docs | Scenario IDs | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Inline icons/text, prefix/suffix spacing and centering | ucl17-input-group | InputGroupAddon/Text; Nova inline edge padding | TpInputGroup structure and text-controls recipe; one internal gap, centered text marks | docs/input-group.md unchanged API | V-01 V-03 | passed | Centers match; $ and search mark both 16px; join gap 8px |
| C-02 | Wrapped Tooltip/Menu/Popover and actions center with editor | ucl17-input-group; sec-cl-71 | InputGroup items-center; existing Button | Center editor in its row; retain existing nested control ownership | Existing examples unchanged | V-01 V-02 | passed | All four supplied composed fields have zero center delta |
| C-03 | Optional logical edges, multiline, states and customization | ucl17-input-group; sec-142-input | InputGroupInput/Textarea | Existing slots/parts, theme tokens and group boundary | Existing docs and examples | V-02 V-03 V-04 | passed | Regression cases below |

## Architecture and reuse

No new exports, API, tokens, state or component owners. Bounded fix does not require folder migration.

### Family dependency map

| Responsibility | Source | Existing owner | Repair decision | Consumers |
| --- | --- | --- | --- | --- |
| Editor semantics | base/ui/input-group imports Input/Textarea | TpTextControl | Keep value/focus/forms unchanged; group centers editor | InputGroup, Select query, ButtonGroup; V-02 V-04 |
| Addon controls | base/ui/input-group imports Button; examples compose surfaces | TpButton, TpMenu, TpTooltip, TpPopover, TpIcon | Keep independent behavior; repair group layout | Existing Docs compositions; V-01 V-02 |

### Presentation source map

| Region | Registry/preset | Source selectors | Local owner | Decision | Scenarios |
| --- | --- | --- | --- | --- | --- |
| Root/editor | base/Nova | InputGroup items-center, cn-input-group-input | TpInputGroup .editor, input-group-control recipe | Center row, preserve single boundary; consistent sm type | V-01 V-03 |
| Inline addon/text | base/Nova | addon items-center justify-center; inline-start pl-2/end pr-2; text flex items-center | .addon, input-group-addon/text | Outer inset only; text mark minimum icon extent; existing spacing tokens | V-01 V-03 |
| Block regions | base/Nova | block-start/end px-2.5 | Existing group grid and addon recipe | Preserve block layout; no inline centering rule on multiline text | V-03 |

### Implementation and composition reuse map

| Composition | Role | Owner | Check | Native exception |
| --- | --- | --- | --- | --- |
| Supplied examples | editor, icon, actions, popup triggers | Input, Icon, Button, Menu, Tooltip, Popover | V-01 V-02 | Plain span is noninteractive addon text |
| Multiline and joined groups | editor and boundary | TextArea, ButtonGroup, InputGroup | V-03 V-04 | Existing native editor interoperability is intentional |

## Verification scenarios

| ID | Capabilities | Setup and input | Expected | Actual | Tool | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V-01 | C-01 C-02 | Supplied Docs examples, normal light; viewport 1624x728 CSS px | Centered editor and marks, single join gap | Inline group 36px; composed group 43.594px; editor/addon center delta 0px; font 14px; 8px join | Chrome MCP page37 geometry/screenshots | passed | Inspected Addons, Tooltip/Menu/Popover and ButtonGroup screenshots |
| V-02 | C-02 C-03 | Real addon click, typing, menu and keyboard focus | Existing focus/editing/independent triggers retained | Clicking $ focuses editor with 2px group ring; filled 42.00; +1 opens Country code menu with three named items; Tab from Project identifier reaches Identifier help and reveals tooltip | Chrome MCP click/fill/key/tree; local axe-core via existing server | passed | Axe: zero violations for composed controls (17 passing rules) and addons/actions; no screen-reader claim |
| V-03 | C-01 C-03 | Dark, RTL, spacing 4px, width260px, all four edges, multiline, disabled/invalid, part override | Centering and spacing remain coherent, no overlap | All composed center deltas0; spacing override group46px; width260 has no overflow, editors126–220px; multiline72px and separate block rows; invalid/disabled markers retained | Chrome MCP public API setup/geometry/screenshots | passed | Dark, RTL, constrained and multiline screenshots inspected; border styleHook applied rgb(220,30,90) without replacing editor; reset temporary changes by reload |
| V-04 | C-03 | Standalone Input, ButtonGroup, Select query consumers and static checks | Unrelated controls retain owner/appearance | Standalone Input14px/1px border, group14px/0px; ButtonGroup36px center delta0; searchable Select43.594px center delta0 with original native input and Clear | Chrome MCP pages37/41; vitest, TSC, ESLint, Stylelint, Prettier, diff check | passed | 24 tests in three focused suites passed; all static checks passed; no new behavioral API or full-build claim |

## Early integration checkpoint

| ID | Check | Status | Evidence |
| --- | --- | --- | --- |
| I-01 | Shared ownership | passed | Diff touches only TpInputGroup structure and shared text-controls recipe; all demo markup and nested control behavior unchanged |
| I-02 | Sourced default presentation | passed | Chrome screenshot inspected: project/phone/search/connection editor and button centers now equal exactly; join gap 8px versus 14.398px; both editor/addon fonts 14px |
| I-03 | Independent composition | passed | Both inline edges and wrapped controls centered; block-start/end retain separate rows; $ now occupies same 16px mark width as Search icon |

## Gate record

| Gate | Status | Evidence |
| --- | --- | --- |
| 0. Sources and scope | passed | Fresh direct contracts, clean baseline, upstream source and supplied cases inspected |
| 1. Capability mapping | passed | Three affected capabilities and four scenarios mapped; no new semantics |
| 2. Architecture and composition reuse | passed | Repair existing structure/recipe owners; all existing nested controls retained |
| 3. Behavior | passed | V-02 actual click, fill and keyboard behavior retained |
| 4. Presentation and customization | passed | V-01 V-03 logical spacing, centers, density and public border override |
| 5. Accessibility | passed | V-02 accessible names, real Tab, local axe; bounded presentation fix, no full-component AT claim |
| 6. Visual and interaction inspection | passed | V-01 V-03 inspected light/dark, RTL, narrow, multiline and states |
| 7. Documentation and demo reuse | passed | Existing Docs examples and copyable source unchanged; consume repaired shared components |
| 8. Regression and reconciliation | passed | V-04 static checks and affected standalone/joined/query consumers verified |

## Completion / handoff

Implemented only the existing group structure and shared presentation recipe. No demo overrides, new API, global token changes, or editor/action behavior changes. Scope is this spacing/alignment repair; older full-component certification gaps remain unchanged. The extra Select verification tab uses temporary public properties only; the user's Docs page was reloaded to remove all test overrides and edits.

Commands: implement and verify gate checkers passed; 24 tests passed from presentation.test.ts, structural-styles.test.ts and stories.test.ts; tsc -p tsconfig.build.json --noEmit, targeted ESLint/Stylelint, targeted Prettier and git diff --check passed. Complete record check performed at handoff. No build was needed for these CSS-only production changes, and no whole-component conformance is claimed.
