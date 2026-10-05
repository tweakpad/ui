# Component implementation and evidence record
## Delivery and source record
- Requested work / claim: close Navigation Menu panel when hovering a top-level direct link.
- Scope source: user Documentation screenshot and explicit hover dismissal request.
- Preserve staged Menubar work. Direct MCP reread Foundation doc_cd3c4721-9f9b-4531-abab-a8bfdbac75f1 sec-175-navigationmenu and Library doc_8077bf7c-0361-48f3-ac87-53b983bd89b3 ucl20-navigation-menu.
- Reference: external/base-ui/packages/react/src/navigation-menu/link/NavigationMenuLink.tsx; hover close is explicit user policy, native link and optional click closure remain separate. Shared Base/Nova recipes unchanged.
- Chrome102 reproduced Tools hover then Documentation: value=tools, open=true. Existing localhost:6006/5173; direct Spec Blocks and Chrome MCP ready. Logs local tmp/component-verification/navigation-menu/link-hover/.
## Capability and interface mapping
| ID | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Direct top-level link hover closes active panel; no link activation | User request; sec-175-navigationmenu; ucl20-navigation-menu | NavigationMenuLink native Link; root owns value | List pointerover closes via existing select; cancel hover timer | docs/navigation-menu.md | V-01 | passed | Chrome102 Tools/Editor/Documentation sequence passes |
| C-02 | Preserve cancellation, disabled/touch handling, content links, isolation and native links | sec-175-navigationmenu | NavigationMenuLink closeOnClick=false; native href retained | Existing owner and component event guards, no new API | docs/navigation-menu.md | V-02 | passed | A30 source/built event policy and trusted input below |
## Architecture and reuse
- TpNavigationMenu keeps scalar state, membership and shared hover timer ownership. Only its List handles direct-link pointerover; no demo overrides or constituent duplicate state.
### Family dependency map
| Responsibility | Upstream dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| --- | --- | --- | --- | --- |
| Link/hover/value | NavigationMenuLink/Root | TpNavigationMenu + TpHoverSurface | Reuse select and cancelPending; distinguish triggerless member links from panel links | V-01,V-02 |
### Presentation source map
| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| --- | --- | --- | --- | --- | --- |
| Link and panel | Base/Nova | NavigationMenuLink and navigation-menu recipe | Existing recipes | No visual edits | V-01 |
### Implementation and composition reuse map
| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| --- | --- | --- | --- | --- |
| Existing Navigation story | Item, Trigger and link | NavigationMenuItem/Button/native anchor | V-01 | Anchor is contract-required link anatomy |
## Verification scenarios
| ID | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V-01 | C-01 real pointer/visual | Tools hover, panel Editor hover, then Documentation; repeat click-open | Panel link keeps open, direct link closes; link href and focus unchanged | Tools to Editor stays open, Documentation closes without URL change; click-opened panel also closes; native click navigates to #documentation; ArrowLeft/ArrowDown reaches Editor. | Chrome102 source Storybook and package fixture, AX snapshots | passed | No demo edits |
| V-02 | C-02 behavior/regressions | Veto, disabled, native composition, source/built; native click and keyboard | Cancellable, scoped to owner, navigation intact; build/type/lint/tests pass | A30 source/package passes content-link preservation, touch exclusion, disabled item, veto, native Item and native li/anchor composition; scoped navigation axe zero violations/incomplete. TypeScript, lint, build and 517 unit tests pass. | Chrome102 + tests/fixtures/components/menu/api.ts A30 | passed | Synthetic event-policy assertions are separate from trusted hover tests |
## Early integration checkpoint
| ID | Check | Status | Evidence / unresolved finding |
| --- | --- | --- | --- |
| I-01 | Reuse owner | passed | List event calls existing cancelPending and scalar select. |
| I-02 | Same appearance | passed | Default panel and direct link unchanged, existing recipes. |
| I-03 | Hover versus link activation independent | passed | Chrome Tools to Editor stays open; Documentation closes without URL change. |
## Gate record
| Gate | Status | Required exit evidence / remaining work |
| --- | --- | --- |
| 0. Sources and scope | passed | Fresh live sources and actual reproduction |
| 1. Capability mapping | passed | C-01,C-02 |
| 2. Architecture and composition reuse | passed | Existing List, scalar and hover cancellation owners |
| 3. Behavior | passed | V-01,V-02 |
| 4. Presentation and customization | passed | Existing recipes unchanged |
| 5. Accessibility | passed | AX, native links and focus |
| 6. Visual and interaction inspection | passed | Actual hover path |
| 7. Documentation and demo reuse | passed | Document direct link behavior |
| 8. Regression and reconciliation | passed | Checks |
## Completion / handoff
- Completed direct-link hover repair, using the existing List/member/value/hover owners. docs/navigation-menu.md documents hover separately from click behavior. No changed recipe or demo composition. Source/package A30 and real hover/click/keyboard pass; scoped axe has zero violations and incomplete checks. No whole-family conformance claim. Logs are local under tmp/component-verification/navigation-menu/link-hover/.
