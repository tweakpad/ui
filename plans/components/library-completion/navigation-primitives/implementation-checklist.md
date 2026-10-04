# Pagination and Breadcrumb implementation record

## Delivery and source record

- Requested work / claim: complete Pagination and Breadcrumb within the user-requested library completion; preserve existing working Button/Menu owners.
- Scope source: user explicitly requests all shadcn Pagination capabilities and complete Breadcrumb within library audit.
- Live direct Library ucl20-pagination/ucl20-breadcrumb read fully; cited Foundation semantic invariants and composition coordination apply. Source pins/project IDs in ../audit.md. Context invocation consolidation has since updated Library candidate through direct MCP, preserving unrelated changes.
- Local references: shadcn bases/base/ui/{pagination,breadcrumb}.tsx, corresponding examples, Nova cn-pagination-* and cn-breadcrumb-*; PaginationLink delegates to actual Button, collapsed Breadcrumb uses actual Menu/Button. No Base UI standalone Pagination/Breadcrumb owner; native navigation/list/link semantics bind through existing Button and Menu. Floating behavior belongs to Menu, not either trail/paging wrapper.
- Contract adaptation: Breadcrumb current page is plain current-page text, never disabled link, per live contract (upstream role=link aria-disabled is deliberately not copied). Pagination remains destination-bearing navigation. Automatic numeric paging keeps page/pages convenience; hrefForPage supplies application URLs, default current URL with page query; consumer can prevent native navigation in accepted value-change callback for client routing.
- State source correction: Pagination is destination navigation, not a selected-value control. page is an application-owned current-page input. Emit the existing TpValueChangeEvent as cancelable navigation intent; explicit cancellation prevents native navigation, while lack of a synchronous page write must not disable an otherwise valid href. No internal page state machine or defaultPage lane is introduced. Breadcrumb collapse is consumer composition, not a new collapse state machine.

## Capability and interface mapping

| ID | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Pagination native nav/list/items; current page relationship and real href | ucl20-pagination | pagination.tsx Pagination/Content/Item/Link | nav/ul/li; public Button href; real native anchor current marker | docs/pagination.md; docs/breadcrumb.md | V-01 | passed | Implementation and documented API reconciled; observed results in V-01. |
| C-02 | Pagination application-owned current page; navigation intent cancellation and disabled links | shared state; ucl20-pagination | PaginationLink consumer-owned active/destination | page input and shared TpValueChangeEvent intent/onPageChange; preserve modified clicks and authored destination | docs/pagination.md; docs/breadcrumb.md | V-01 | passed | Implementation and documented API reconciled; observed results in V-01. |
| C-03 | Numeric page window and decorative omitted range; finite bounds | ucl20-pagination | PaginationEllipsis; existing numeric convenience | preserve bounded pageWindow convenience, shared Icon, aria-hidden ellipsis | docs/pagination.md; docs/breadcrumb.md | V-01 | passed | Implementation and documented API reconciled; observed results in V-01. |
| C-04 | Localized visible Previous/Next/page labels and numbers; logical RTL arrows | ucl20-pagination | PaginationPrevious/Next text; cn-rtl-flip | previousLabel/nextLabel/pageLabel, locale service, actual Icon and Button | docs/pagination.md; docs/breadcrumb.md | V-02 | passed | Implementation and documented API reconciled; observed results in V-02. |
| C-05 | Independent previous/next/page links visibility, icon/text variants, compact directional controls | ucl20-pagination; user all source examples | PaginationBasic/Simple/IconsOnly | showPrevious/showNext/showPageLinks/showLabels; pageLinkVariant; existing Button sizes/variants | docs/pagination.md; docs/breadcrumb.md | V-02 | passed | Implementation and documented API reconciled; observed results in V-02. |
| C-06 | Complete parts, themed geometry, dictionary/delegate hooks without style attrs | ucl20-pagination | Nova cn-pagination-content/link/previous/next | existing PresentationController binds actual Button anchor; list/ellipsis use shared tokens; remove incorrect fieldAppearance mapping | docs/pagination.md; docs/breadcrumb.md | V-02 | passed | Implementation and documented API reconciled; observed results in V-02. |
| C-07 | Breadcrumb native ordered trail and retained real ancestor links | ucl20-breadcrumb | Breadcrumb/List/Item/Link | native nav/ol/li shadow slots preserve caller nodes and link semantics; reversible slot assignments | docs/pagination.md; docs/breadcrumb.md | V-03 | passed | Implementation and documented API reconciled; observed results in V-03. |
| C-08 | Current plain page, no disabled navigation; caller aria-current preserved | ucl20-breadcrumb | BreadcrumbPage adapted to live contract | plain terminal noninteractive item receives current-page marker; restore only component-owned attributes | docs/pagination.md; docs/breadcrumb.md | V-03 | passed | Implementation and documented API reconciled; observed results in V-03. |
| C-09 | Decorative configurable separators and ellipsis; logical RTL indicator | ucl20-breadcrumb | BreadcrumbSeparator/Ellipsis | separator legacy text or default chevron Icon; separator/ellipsis hidden; existing Icon for composition | docs/pagination.md; docs/breadcrumb.md | V-03 | passed | Implementation and documented API reconciled; observed results in V-03. |
| C-10 | Collapsed ancestor reveal, custom links and independent composition | ucl20-breadcrumb | BreadcrumbWithDropdown/WithLink | caller supplies actual Menu/Button/native links; no second popup state; custom part/delegate hooks retained | docs/pagination.md; docs/breadcrumb.md | V-04 | passed | Implementation and documented API reconciled; observed results in V-04. |
| C-11 | Dynamic insertion/removal, reconnect and caller-owned property restoration | shared lifecycle/composition contracts | native list ownership; render composition | stable per-item slots, detach observer/release parts/restore authored slot/current attributes | docs/pagination.md; docs/breadcrumb.md | V-03 | passed | Implementation and documented API reconciled; observed results in V-03. |
| C-12 | Authored docs/Controls and source examples, exported folders, regressions | user complete source requirement | both example files and real shared owners | Default, Simple and WithSelect Pagination; Default and Collapsed Breadcrumb; no styled substitutes | docs/pagination.md; docs/breadcrumb.md | V-04 | passed | Implementation and documented API reconciled; observed results in V-04. |
| C-99 | Native browser media/accessibility and applicable native-input or SSR verification | Shared Foundation accessibility/motion/lifecycle contract; skill verification procedure | Shared native platform and component source tests recorded above | Existing shared owners; no simulated platform substitute | Component docs and ../verification-results.md | V-98 | blocked | Implementation remains in scope; verification requires capabilities not exposed by registered tools. |

## Architecture and reuse

### Family dependency map

| Responsibility | Upstream dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| --- | --- | --- | --- | --- |
| Destination action | PaginationLink -> Button render anchor | TpButton href/disabled/partContracts; TpValueChangeEvent | Actual Button for all paging destinations, same hover/focus/activation and theme; no native button clone | Pagination; Button/navigation consumers V-01 V-02 |
| Ancestor reveal | BreadcrumbWithDropdown -> DropdownMenu | TpMenu context/trigger owner and TpButton | Real Menu composition, no Breadcrumb-owned overlay | Breadcrumb collapsed V-04 |
| Navigation structure | native nav/ul/ol/li/a | TpElement renderPart and PresentationController | Structure only; preserve original caller nodes and links | Both, V-01 V-03 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| --- | --- | --- | --- | --- | --- |
| Paging links | base / Nova | PaginationLink -> Button ghost/outline | actual TpButton, registered canonical paging parts | Size geometry derives from shared height; active outline; no field appearance | V-02 |
| Lists and spacing | base / Nova | cn-pagination-content gap-0.5; cn-breadcrumb-list gap-1.5 | existing recipes.ts and structural styles | Theme spacing, typography, no independent seed or spacing attribute | V-02 V-03 |
| Direction/separator/ellipsis | base / Nova | IconPlaceholder chevrons/dots | TpIcon with existing chevron/navigation definitions | Logical flip; decorative semantics; current page follows live contract | V-02 V-03 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| --- | --- | --- | --- | --- |
| Pagination with page size | Field and Select | actual TpField/TpSelect plus paging Button/Icon | real select changes page count; native href retained | Native list/nav are required anatomy |
| Breadcrumb collapsed | ancestor popup and links | TpMenu/TpButton/TpIcon/native a | real reveal/focus/link semantics and named action | Native links remain native per contract |

## Verification scenarios

| ID | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V-01 | C-01 C-02 C-03 | Real paging click/key, explicit navigation veto and owner updates, disabled and boundaries | Native link destinations/list/current; one navigation intent, no unwanted navigation when explicitly canceled | Real Next click and keyboard Enter propose page5 from4. Cancelled intent preserves current4 and URL; real destination links and native lists inspected. Root disabled disables all page Buttons; source bounded window verified. | Chrome MCP | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-02 | C-04 C-05 C-06 | Default/simple/directional-only, custom labels, RTL and theme spacing, custom parts | Shared Button presentation, proportional insets, readable labels and optional anatomy | Independent directional/page/text options and localized labels inspected; theme parts/dictionary/ref cleanup verified. Dynamic ancestor RTL/LTR flips actual shared Icon without rerender. | Chrome MCP screenshots/computed styles | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-03 | C-07 C-08 C-09 C-11 | Trail links/current/separators, dynamic membership, reconnect, RTL/theme | Ordered list, true links and current text; no leftover mutations or duplicate nodes | Native ordered trail, links/current and decorative separators inspected. Removing current child restores slot/current; detach restores owned attributes; reconnect reassigns current. Dynamic RTL chevron fixes verified. | Chrome MCP API/tree/screenshot | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-04 | C-10 C-12 | Collapsed reveal and page-size Select examples, docs and exports | Real shared owners work, copyable source and public API complete | Actual collapsed Menu opens named ancestor commands and Escape returns trigger. Public Select page-size example, copyable source, catalog and builds verified. | Chrome MCP and build | passed | See execution appendices and ../verification-results.md. Observed through the tool/command column; synthetic protocol evidence is explicitly identified. |
| V-98 | C-99; native media/accessibility | OS forced-colors and applicable OS reduced-motion policy | Correct native high-contrast and media behavior | Registered Chrome MCP has no forced-colors or OS reduced-motion control. Explicit component reduce policy was tested separately where applicable. | Registered tool schema inspection | blocked | No CSS pseudo-state or matchMedia mock is accepted as native media evidence. |

## Early integration checkpoint

| ID | Check | Status | Evidence / unresolved finding |
| --- | --- | --- | --- |
| I-01 | Shared owners are actually used by related consumers; old duplicate behavior is removed/delegated | passed | Native anchor targets come from actual TpButton; legacy button/glyph paint and field recipe removed. Collapsed trail mounts actual TpMenu. |
| I-02 | Default visual regions match traced source and shared library recipes | passed | Chrome dark screenshot inspected: outlined current page, native numbers and shared chevrons, bounded ellipsis, muted ancestor links and plain current text. Verbose AX has lists/listitems and native destination links. |
| I-03 | Independent constituent options work, including placement separately from action behavior | passed | Actual Next click updates caller-owned page 4 to 5 with route default prevented by consumer; links remain real hrefs. Direction-only produces two named icon links. Collapsed trail opens real Menu; disconnect/reconnect retains original nodes and restores slot/current attributes. |

## Gate record

| Gate | Status | Required exit evidence / remaining work |
| --- | --- | --- |
| 0. Sources and scope | passed | Full live sections and upstream units/examples/stylesheet traced; explicit contract adaptation recorded. |
| 1. Capability mapping | passed | Complete navigation, item, current, direction/ellipsis and optional composition surface mapped individually. |
| 2. Architecture and composition reuse | passed | Actual Button/Menu and shared intent event, native lists, canonical recipe/parts; no alternate painted controls. |
| 3. Behavior | passed | Observed behavior in V rows and execution appendices. Focused state/lifecycle and real input paths pass. |
| 4. Presentation and customization | passed | Shared recipes, theme overrides and applicable actual part/ref/delegate/dictionary checks pass; source and visual evidence in V rows. |
| 5. Accessibility | blocked | Native AX, real keyboard and local axe checks recorded; forced-colors browser inspection V-98 cannot be emulated with registered tools. |
| 6. Visual and interaction inspection | blocked | Light/dark/RTL/density and relevant optional states inspected; OS media/forced-colors V-98 remains blocked. |
| 7. Documentation and demo reuse | failed | User corrective review pending.  Authored API documentation, copyable source and actual public nested controls reconciled; full Storybook build passes. |
| 8. Regression and reconciliation | blocked | Focused regressions, lint/type/build, served built package and documentation pass. Complete-component certification remains blocked by explicit V-98/V-99 evidence boundaries. |

## Completion / handoff

Active workstream; no completed-component claim. Parent full library scope remains active.

Design review correction before integration: source PaginationLink does not own a selection state. Removed the proposed extra defaultPage/ControllableState layer; a static current page must not veto valid native links merely because a consumer did not synchronously publish another page. Existing shared event cancellation and Button behavior are reused. Gates 1/2 re-reviewed with this source-backed design.

## Reconciled execution status — 2026-10-04

Implementation and documentation for this workstream are delivered. The scenario table above supersedes earlier prospective statements below/above that say implementation or final checks are pending. Required unavailable browser/runtime evidence remains explicitly blocked; no full conformance claim is made. See [final verification results](../verification-results.md) for shared fixes, commands, package evidence and tool boundaries.

## User corrective review — 2026-10-04

Pagination source composes outline/ghost Buttons. Inspect inherited semantic theme in Docs and native anchors before changing paint; no alternate Pagination color recipe. Move composed examples into shared Docs renderer.
Earlier visual/docs passes are reopened by the reported defects. Fresh direct MCP head8440bff/state5daad632. Existing scoped tests are regression leads, not proof of visual completeness.
