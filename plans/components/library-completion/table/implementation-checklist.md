# Table implementation record

## Delivery and source record

- Requested work / claim: complete native Table presentation and all reference examples, plus user-requested sticky headers, logical columns and totals footer.
- Scope source: user complete-controls request; preserve working native semantics and actual controls.
- Fresh direct MCP Foundation/Library 2026-10-04, ucl22-table and Semantic invariants/parts/composition. Authorized sticky option rows added to live Table props, zero validation issues and canCommit true; unrelated candidate changes preserved, no commit.
- Pinned reference revisions in ../audit.md. base/ui/table.tsx reexports native table regions (no table behavior package); all seven base/examples/table-example.tsx scenarios inspected; Nova style-nova.css1266–1310 traced. Existing local native table and presentation registration retained. Base UI supplies nested controls through their existing owners; Floating only for nested Menu/Select, never a Table runtime dependency.

## Capability and interface mapping

| ID | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Native Table/Caption/Header/Body/Footer/Rows/Headers/Cells; nested controls remain native Tab | ucl22-table semantic invariants | base/ui/table.tsx all constituents | Authored native table slot retained and canonical parts registered; overflow container role region, never grid/table | docs/table.md | V-01 | passed | Implementation and documented API reconciled; observed results in V-01. |
| C-02 | Layout automatic/fixed default automatic; application selection none/row default none | ucl22-table props | native Table + Nova cn-table-row data-state selected | layout/selectionPresentation; explicit data-selected or data-state=selected, no selection machine | docs/table.md | V-01 V-02 | passed | Implementation and documented API reconciled; observed results in V-01, V-02. |
| C-03 | Sticky header/footer independently false; start/end counts default0 | user request; live sticky props rows | Native CSS sticky on existing table anatomy | Same native viewport; measured logical offsets/rowspans/colspans, unpinned boundary-crossing cells | docs/table.md | V-02 | passed | Implementation and documented API reconciled; observed results in V-02. |
| C-04 | Dynamic rows/columns/source/removal/resize/RTL and cleanup | Foundation lifecycle; ucl22-table | Native table geometry | Mutation/ResizeObserver; restore owned geometry/styles on disconnect or source removal; no scroll reset | docs/table.md | V-02 | passed | Implementation and documented API reconciled; observed results in V-02. |
| C-05 | Caption/body/footer/row/selection paint; shared theme sizes/spacing/radii and customization | Library presentation | Nova cn-table-*1266–1310 | Canonical registered native parts use presentation dictionary; generated container renderPart contract; authored cells remain authored native DOM | docs/table.md | V-03 | passed | Implementation and documented API reconciled; observed results in V-03. |
| C-06 | Seven reference use cases: Basic, Footer, Simple, Badges, Actions, Select, Input | user all examples; Library documentation | table-example.tsx seven functions | Authored stories reuse Button/Menu/Badge/Select/Input/Icon; copyable real compositions | docs/table.md | V-04 | passed | Implementation and documented API reconciled; observed results in V-04. |
| C-07 | Sticky totals/columns demonstration and package exports | user request | existing Table wrapper, native CSS | Dedicated distinct scrolling data use case; complete public API | docs/table.md | V-04 | passed | Implementation and documented API reconciled; observed results in V-04. |
| C-99 | Native browser media/accessibility and applicable native-input or SSR verification | Shared Foundation accessibility/motion/lifecycle contract; skill verification procedure | Shared native platform and component source tests recorded above | Existing shared owners; no simulated platform substitute | Component docs and ../verification-results.md | V-98 | blocked | Implementation remains in scope; verification requires capabilities not exposed by registered tools. |

## Architecture and reuse

### Family dependency map

| Responsibility | Upstream dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| --- | --- | --- | --- | --- |
| Tabular semantics | base Table native regions | TpTable | Preserve authored native nodes and registration, extract folder; no interactive grid state | Existing Table V-01 |
| Nested interactions | examples import Button/DropdownMenu/Select/Input | Existing Button/Menu/Select/Input | Real components in cells; their existing owners handle behavior | Table V-04, Menu/Select keyboard |
| Sticky geometry | native Table/layout | existing native overflow | Component-specific measured geometry; no hard-coded column offsets or spacing attributes | Table V-02 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| --- | --- | --- | --- | --- | --- |
| Native table regions | base/Nova | table.tsx; style-nova.css1266–1310 | Existing canonical parts and theme paint | Shared typography/padding; explicit application selection only | V-03 |
| Sticky surfaces | user requested composition | native sticky Table | Same table/header/footer/cell tokens | Measured geometry only; opaque shared background prevents text overlap | V-02 V-03 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| --- | --- | --- | --- | --- |
| Badges/actions/Select/Input | status/actions/editors | Badge/Button/Menu/Select/Input/Icon | Actual controls and native cell Tab/labels | Native table and text are required anatomy |
| Sticky totals | pinned rows/columns | same Table | Scroll both axes, resize, RTL and footer intersections | No local visual stand-ins |

## Verification scenarios

| ID | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V-01 | C-01 C-02 | Caption/native roles/scope and cell keyboard; explicit selection | Native relationships, application selection independent of hover | Actual native table/caption/columnheader/rowheader/cell AX inspected, no synthetic grid. Real Menu/Select/Input in cells retain keyboard behavior; selection is authored row presentation. | Chrome MCP AX/keys | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-02 | C-03 C-04 | Scroll both axes, multirow headers/footer/columns, spans, RTL/resize/remove | Stable measured sticky geometry; no scroll reset; cleanup | Both-axis sticky header/footer/start/end geometries checked, including RTL, row/column spans and boundary crossing. Column resize225.47 to300 updates following offset without resetting scroll100; removal restores owned styles. | Chrome MCP geometry/screenshot | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-03 | C-05 | Light/dark/base spacing/dictionary/parts/narrow | Shared source presentation, no magic spacing | Light/dark/base5 screenshot inspected; removed duplicate core recipe so cell padding is symmetric10px. Native part/dictionary updates preserve focus; component axe0. | Chrome MCP screenshot/axe | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-04 | C-06 C-07 | All docs examples/copy source/catalog/export | Complete reference examples and actual nested controls | All seven source examples plus sticky totals rendered. Real Menu Escape, Select ArrowDown/Enter and Input fill3/Tab pass. Complete docs and source use actual nested public controls; build/export pass. | build/static/Chrome | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-98 | C-99; native media/accessibility | OS forced-colors and applicable OS reduced-motion policy | Correct native high-contrast and media behavior | Registered Chrome MCP has no forced-colors or OS reduced-motion control. Explicit component reduce policy was tested separately where applicable. | Registered tool schema inspection | blocked | No CSS pseudo-state or matchMedia mock is accepted as native media evidence. |

## Early integration checkpoint

| ID | Check | Status | Evidence / unresolved finding |
| --- | --- | --- | --- |
| I-01 | Shared owners actually adopted, duplicate removed | passed | Existing native table slot/registration retained in component folder; examples compose actual Badge/Menu/Button/Select/Input. Diff inspected; no grid owner. |
| I-02 | Sourced representative render and shared recipe | passed | Chrome61/55 screenshots inspect native rows, header, footer and opaque pinned cells. Nova row/caption/cell recipe uses common spacing/type/theme. |
| I-03 | Independent constituents and placement | passed | Chrome55 live API: header/footer both viewport-aligned at scroll420; start/end pinned at both edges; RTL swaps logical edges. Disabling removes geometry; native table removal restores styles and reinsert registers76 pinned cells. |

## Gate record

| Gate | Status | Required exit evidence / remaining work |
| --- | --- | --- |
| 0. Sources and scope | passed | Fresh live Table/semantic/parts plus authorized sticky amendment; local source/Nova chain |
| 1. Capability mapping | passed | Native anatomy, layout, selection, sticky geometry/lifecycle and all seven reference use cases mapped |
| 2. Architecture and composition reuse | passed | Native Table owner retained; nested controls retain their owners; geometry local only |
| 3. Behavior | passed | Observed behavior in V rows and execution appendices. Focused state/lifecycle and real input paths pass. |
| 4. Presentation and customization | passed | Shared recipes, theme overrides and applicable actual part/ref/delegate/dictionary checks pass; source and visual evidence in V rows. |
| 5. Accessibility | blocked | Native AX, real keyboard and local axe checks recorded; forced-colors browser inspection V-98 cannot be emulated with registered tools. |
| 6. Visual and interaction inspection | blocked | Light/dark/RTL/density and relevant optional states inspected; OS media/forced-colors V-98 remains blocked. |
| 7. Documentation and demo reuse | passed | Authored API documentation, copyable source and actual public nested controls reconciled; full Storybook build passes. |
| 8. Regression and reconciliation | blocked | Focused regressions, lint/type/build, served built package and documentation pass. Complete-component certification remains blocked by explicit V-98/V-99 evidence boundaries. |

## Completion / handoff

Active full scope; no completion claim.


2026-10-04 source TypeScript including authored stories, focused ESLint and git diff --check pass. Chrome55 geometry confirms scrolling in both axes and RTL; screenshot inspected. Sticky values are actual measured coordinates, not fixed spacing. Source all seven examples plus sticky totals authored. Additional span/resize/selection/customization and interactive-cell matrix remains active.

Presentation checkpoint reopened and repaired: theme check found corePresentationDictionary table-cell/header fallback appended after componentAppearance. Removed obsolete duplicate core Table entries so tableAppearance is sole owner. Fresh Chrome reload confirms 5px root theme seed yields symmetric 10px padding (previous duplicate yielded 10px/15px); light screenshot inspected. Source remains unchanged for sibling components. Table Menu opens and Escape restores Button focus; cell Select ArrowDown/Enter commits Morgan and restores trigger focus. Native AX table/columnheader/rowheader/cell verified in verbose snapshot.

Final Table execution evidence 2026-10-04: all seven reference examples plus sticky rendered through Chrome. Basic/footer/simple/badges screenshot inspected; totals750.00 and six actual Badge components. Combined fixture initially reused region labels (landmark-unique), corrected fixture names without rule suppression; component scope axe previously0. Menu click/Escape and Select ArrowDown/Enter pass. Quantity Input filled3, Tab moved to next labeled quantity and native validity passed. Rowspan2 + crossing colspan2/4: only complete pinned cells attach; after first-column resize225.47→300, second-column offset follows300, scrollLeft stays100; disconnect restores position. Table native partPresentation color hook applies; canonical live dictionary override changes cell padding in place and preserves focus. Source TypeScript, focused ESLint, diff check,27 selection/catalog/story tests, production build and first Storybook build pass. Latest Table duplicate-paint cleanup is covered by subsequent production build; Storybook build output precedes only that shared recipe deletion, with source live evidence afterward.

## Reconciled execution status — 2026-10-04

Implementation and documentation for this workstream are delivered. The scenario table above supersedes earlier prospective statements below/above that say implementation or final checks are pending. Required unavailable browser/runtime evidence remains explicitly blocked; no full conformance claim is made. See [final verification results](../verification-results.md) for shared fixes, commands, package evidence and tool boundaries.

## User corrective review — 2026-10-04

User explicitly requires custom constituents and Docs-only compositions. Reopened existing visual/docs completion claims. Fresh ucl22-table retains native relationships and excludes interactive-grid semantics. Source base/ui/table.tsx wraps native table/thead/tbody/tfoot/tr/th/td/caption. Implement matching public TpTableHeader/Body/Footer/Row/Head/Cell/Caption elements, each rendering its native semantic element, with display-contents hosts and explicit native roles to preserve the composed accessibility tree. Root owns the native table and existing overflow/sticky controller; preserve native-table input for existing DataVisualization consumers. No data model or alternate grid behavior. Extend existing geometry traversal to composed rows/cells, retain colspan/rowspan support, and measure the same native cells. All constituents reuse Table presentation. Root theme overrides must reach cells; native schema/render hooks preserved. Chrome probe established column layout and AX table/rowgroup/row/columnheader/cell relationships across shadow boundaries; implementation must verify the actual Lit render and sticky layout, not rely on probe alone.

Documentation maps all existing examples to one shared Docs example renderer; remove WithBadges/WithSelect etc. from sidebar story exports. Verify copyable custom composition, real nested public controls, totals, row/column spanning, sticky regions, keyboard access and RTL. Existing native consumers remain regression targets.


Current corrective integration and shared-regression evidence: [library-wide use-case review](../use-case-review-2026-10-04.md). Parent scope remains active; this record does not certify unreconciled source cases.
