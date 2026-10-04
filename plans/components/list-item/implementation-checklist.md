# List Item implementation and evidence record

## Delivery and source record

- Requested work / claim: complete List Item within the user's whole-library goal; independent execution batches do not reduce that scope. Previous goal turn made progress on Marker compositions and shared List Item layout.
- Scope source: user instruction to finish the whole library and normalize shared implementations.
- Baseline: preserve all existing uncommitted component/docs changes and unrelated drag-drop.md.
- Live direct MCP project prj_c5a403a0-d1d5-4487-ac78-f4e545f46483; Foundation doc_cd3c4721-9f9b-4531-abab-a8bfdbac75f1; Library doc_8077bf7c-0361-48f3-ac87-53b983bd89b3; head8440bff24a97dbbc5c762ebf4bd6baa958b305e1/state5daad6324d67f008ae378650a86e7e961fc91a1025d6107c89be7002caecdfe1.
- Owning ucl22-list-item; Foundation sec-41-componentpartcontract, sec-71-semantic-invariants, audit-sec-1918-composition-coordination. Vocabulary read live.
- Local shadcn clean63c1308d112b6b1205d86244a156cca1abef5087: bases/base/ui/item.tsx imports Base useRender/mergeProps and actual Separator; Nova style-nova.css703–775. Base useRender equivalent is existing renderPart/bindPart, not React runtime. Item has no positioning/focus collection engine; Floating UI not applicable to its presentation-only row.
- Chrome DevTools MCP page76; existing localhost6006/5173. Source and built package checks; screenshots inspected inline. Evidence/logs local under tmp/component-verification/list-item/2026-10-04/.

## Capability and interface mapping

| ID | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Row ghost/outline/subdued; default ghost; size xs/sm/default | ucl22-list-item | item.tsx Item; Nova variants/sizes | Preserve variant/size; current shared density retained; move owner to list-item folder | docs/list-item.md | V-01 | passed | Variants and sizes render, subdued now resolves shared paint; Controls and native state inspected. |
| C-02 | All canonical row parts render/delegate/ref/content and committed state | ucl22-list-item; sec-41 | Item/Media/Content/Title/Description/Actions/Header/Footer | Existing renderPart for each region; no parallel renderer | docs/list-item.md | V-02 | passed | Eight row part refs mount/clear/reconnect; title delegate h3 and public style hook preserve node; group/Separator canonical parts verified. |
| C-03 | Optional independent regions and description fallback | ucl22-list-item | ItemTitle/Description/Header/Footer/Actions | Retain default/leading/trailing/header/footer; add semantic title/description/media/actions slots with legacy fallbacks | docs/list-item.md | V-01 V-02 | passed | Slot-only description removal/restoration hides/shows region; all independent content/actions/header/footer examples rendered. |
| C-04 | Media plain/icon/image; first-line alignment with description | ucl22-list-item | ItemMedia variants; Nova media size10/8/6 | mediaTreatment property, shared icons/spacing/radius; actual Icon/Avatar/native img | docs/list-item.md | V-01 V-03 | passed | Icon region and artwork both24px under scoped token; image extents follow size; first-line alignment inspected narrow/light/dark. |
| C-05 | Group list semantics/order and decorative Separator | ucl22-list-item; sec-71 | ItemGroup; ItemSeparator reexport | TpListItemGroup with existing OwnedAttributes for direct row roles; actual TpSeparator registered to canonical separator key | docs/list-item.md | V-02 V-04 | passed | Named list and ordered listitem AX; owned role released/rejoined and authored article preserved; canonical Separator reuses actual decorative TpSeparator. |
| C-06 | Native delegated whole-row link/action semantics; independent trailing actions | audit-sec-1918 | Item render anchor + Share Button source | Native root delegate supported for standalone actions. Root native delegate and independently rendered Actions are sibling grid regions; native activation stays with each host | docs/list-item.md | V-04 | passed | Native Root and Actions are sibling hosts; actual pointer, Tab/Enter/Space and cancellation verified. |
| C-07 | Public appearance/dictionary; selected/value compatibility | ucl22-list-item; inherited presentation | useRender state; existing local selected/value | All canonical bindings; selected remains aria-current metadata, no selection state machine | docs/list-item.md | V-03 | passed | Scoped spacing/radius, selected/value, native disabled state, alternate dictionary/removal, public hooks and retained focus verified. |
| C-08 | Complete distinct source compositions and copied executable source | skill/user full scope | item-example.tsx24 cases plus standalone examples in parent inventory | One authored Default/API and Docs compositions; verification permutations stay outside curated sidebar | list-item.stories.ts/examples.ts | V-05 | pending | Full case matrix stays pending until individually observed |
| C-09 | Package/cleanup/affected Marker consumer and shared variants | skill/inherited lifecycle | existing primitives export; Marker Drawer | Preserve export/registration; exact shared consumers; no duplicate role leaks after reconnect | docs/list-item.md | V-06 | passed | Marker Drawer retains flex/padding6.4 and optional regions; served built exports/registration match; build and checks pass. |

Independent presentational capabilities C-01–05/C-07 can be implemented without introducing whole-row interaction behavior. C-06 native delegation is existing public Part semantics; independent trailing interaction must use non-nested hosts and remains explicitly required. No href/click proxy API or nested-action workaround is introduced in the presentation batch.

## Architecture and reuse

Component folder owns row/group binding only. Existing TpElement/Part/Presentation/OwnedAttributes remain shared owners. Preserve primitives reexport and catalog identity. Group is constituent, not a new catalog control. Actual Separator retains its behavior and paint; group adds only canonical presentation registration. No spacing attributes, new tokens, or animation.

### Family dependency map

| Responsibility | Upstream dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| --- | --- | --- | --- | --- |
| Rendering/customization | Base useRender/mergeProps through Item | TpElement.renderPart, foundation/part.ts | Render all canonical regions through existing owner | List Item/Marker V-02 V-06 |
| Optional region layout | item.tsx Item/Content/Header/Footer | TpListItem in primitives | Extract owner; preserve recent flex/empty-region repair; slot-derived presence | All row compositions V-01 V-02 |
| Native relationships | ItemGroup rolelist | OwnedAttributes used by Collapsible/Tabs | Temporary direct-child listitem roles, restore on detach; no collection focus model | Group V-04 |
| Separators and controls | ItemSeparator imports Separator; examples Button | TpSeparator, TpButton, TpIcon, TpAvatar | Compose actual owners; no substitute | Group/actions/media V-01 V-04 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| --- | --- | --- | --- | --- | --- |
| Root/group | base/Nova | cn-item/variant/size/group | existing list-item root recipes + variantPresentation; add group recipe | Preserve established density; scoped gap derives from shared theme; variant names map default to ghost, muted to subdued | V-01 V-03 |
| Media/content | base/Nova | cn-item-media-*; cn-item-content/title/description | canonical dictionary parts, actual Icon/Avatar | Shared size/radius/typography; first-line align only with description | V-01 V-03 |
| Actions/header/footer | base/Nova | cn-item-actions/header/footer | existing shared flex/space2 recipes | Full-width header/footer and no empty gaps | V-01 V-02 |
| Separator | base/Nova | ItemSeparator; cn-item-separator | actual TpSeparator plus registered list-item-separator | Existing border role and space2 block margin | V-04 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| --- | --- | --- | --- | --- |
| Rows and media | actions/icons/profile | TpButton/TpIcon/TpAvatar | V-01 V-04 V-05 | Native img is content, not an Avatar substitute |
| Groups | divider | TpSeparator | V-04 | Group native list role; child rows native listitem role |
| Native interoperability | link/root action | renderPart native delegate | V-04 | Explicit native interoperability; Root and Actions are sibling semantic hosts, not nested controls |
| Header/footer | metadata | plain prose; actual Badge/Button as warranted | V-01 V-05 | Plain metadata is not a painted control |

## Verification scenarios

| ID | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V-01 | C-01 C-03 C-04; visual | Optional slots independently; variants/sizes/media; long title/description | Correct layout and first-line media; no empty gaps | not run | Chrome76 | pending | Light/dark/narrow/RTL |
| V-02 | C-02 C-03 C-05; lifecycle | Public refs/delegates and dynamic membership | No stale refs or roles | All eight refs clear/reconnect, same title native h3 retained, slots and role ownership restore correctly | Chrome76 public APIs | passed | Actual lifecycle, not simulated input |
| V-03 | C-04 C-07; theming | Scoped spacing/radius/icons and dictionary overrides | All canonical parts resolve; same nodes/focus | Token and dictionary changes repaint existing parts; missing keys remove appearance; same anchor/focus | Chrome76 source Docs | passed | Detailed scoped results below |
| V-04 | C-05 C-06; semantics/input | Group/Separator AX; real Tab/Enter link and trailing actions | Native names, independent action semantics and no nested hosts | Share never activates Root; Tab reaches each native action; native button Space and link cancellation work | Chrome76 keyboard/AX/axe | passed | No synthetic click routing or propagation suppression |
| V-05 | C-08; docs | Controls, all distinct source use cases, Show/Copy | Same executable setup, no remount; no permutation sidebar | not run | Chrome/Storybook | pending | Source case inventory in parent record |
| V-06 | C-09; regression/package | Marker Drawer and built exports | Shared owners preserved | Marker rows keep6.4px padding; actual drawer opens/Escape closes; three built classes exported and registered | Chrome76 +35existing tests/lint/build | passed | See execution below |

## Early integration checkpoint

| ID | Check | Status | Evidence / unresolved finding |
| --- | --- | --- | --- |
| I-01 | Shared owners actually consumed | pending | Extracted owner keeps primitives reexport; actual Part/OwnedAttributes/Separator/Button used; no duplicate row class. |
| I-02 | Sourced representative appearance | pending | Chrome rich/image rows match first-line media, supporting text and shared actions; missing subdued repaired through shared variant owner. |
| I-03 | Independent constituent options | pending | Rich row slot-only description, actual Badge/Avatar/Button; empty header/footer hidden; independent regions rendered through canonical parts. |

## Gate record

| Gate | Status | Required exit evidence / remaining work |
| --- | --- | --- |
| 0. Sources and scope | passed | Live contracts and upstream source chain read; complete component remains scope |
| 1. Capability mapping | passed | C-01–09 account for API/regions/source combinations; independent presentation batch does not claim unresolved C-06 composition |
| 2. Architecture and composition reuse | passed | Existing renderPart/OwnedAttributes/Separator/Button ownership mapped; no new interaction engine |
| 3. Behavior | pending | Dynamic regions, refs, group cleanup and independent actions |
| 4. Presentation and customization | pending | Public hooks/theme/dictionary |
| 5. Accessibility | pending | Native AX/real keyboard/axe |
| 6. Visual and interaction inspection | pending | Source/light/dark/RTL/narrow |
| 7. Documentation and demo reuse | pending | API/source/copy coverage |
| 8. Regression and reconciliation | pending | Shared consumers/builds/package and remaining cases |

## Documentation synchronization

- [ ] Default/API/constituent docs reconcile.
- [ ] All slots/parts/state hooks documented.
- [ ] Source cases and copied/live compositions reconciled individually.
- [ ] Generator and catalog tests preserve authored entry.

## Completion / handoff

Implementation and required verification remain pending. This record does not certify List Item or the library. Native forced-colors/OS input media are not available through current Chrome tools; no synthetic substitute claimed.

## First integration — 2026-10-04

Existing primitive now reexports the extracted owner; Marker uses that same class. All eight row parts render through existing renderPart and the new Group through canonical list-item; Separator remains actual TpSeparator with registered group presentation. No alternate controls/state engine. Chrome76 rich row screenshot confirms Avatar/title/actual Badge/slot-only description/actual Button; image treatment renders32px default from space10, shrinking via existing size roles; empty header/footer hidden. Source first-line media alignment and independent optional actions match. Group's three direct rows have listitem roles. Early screenshot caught existing subdued dictionary contribution absent (legacy loop deliberately skipped it); repaired shared variant wiring for List Item while preserving Badge behavior. Group aria-label now reactively forwards to its native list role. C06 whole-row+independent trailing native actions remains required, not claimed by these static examples.

Separator public-contract audit: registering a consumer-owned TpSeparator exposes presentation but cannot provide the group's renderDelegate contract for that node. Add canonical TpListItemSeparator constituent as a thin TpElement/renderPart binding that renders actual TpSeparator; it adds no separator semantics/paint implementation. Preserve ordinary TpSeparator support in Group. Canonical constituent exposes list-item-separator part/ref/delegate and inherits the List Item definition; update registration/types/docs/examples. This resolves the missing public rendering channel through the existing Separator owner rather than claiming registerPart alone supplies it. Recheck anatomy and group AX after integration.

## Execution results — 2026-10-04

Extracted TpListItem from primitives; preserved grouped/public exports. Added actual constituent Group and Separator, mediaTreatment, semantic slots with leading/trailing/default compatibility, slot-only description and canonical renderPart support. Group owns only temporary default listitem roles through shared OwnedAttributes. Separator is a thin composition of actual TpSeparator, not a duplicated horizontal line. List Item appearance extracted into its existing dictionary owner; no per-component token. The shared passive variant builder now includes List Item subdued, preserving existing Badge/Bubble branches. No action state machine or event proxy added.

Chrome76 source Docs: eight curated compositions plus Default/API. All eight previews fit248px at390viewport, including multiple Actions, long description and media. Light/default and dark/RTL screenshots inspected; no empty optional regions and first-line media alignment. Public icon-size-sm24 and space3=15 yield actual icon24/media24/gap15. Image default32/sm25.6/xs19.2 follows shared space10/8/6. Subdued resolves muted rgb244/244/245 light and rgb39/39/42 dark. Group label ghost items reaches native list; group gap12.8 follows space4. Canonical Separator wraps actual horizontal/decorative TpSeparator, role none, margin6.4 each block side, public ref equals actual composed element.

Native part/lifecycle: all eight row refs received live hosts, then null on removal, then live hosts after reconnect. Title native h3 delegate retained identity across variant/size/style updates and reconnect; public primary-color hook applies. Slot-only description removal -> hiddentrue; restoration -> hiddenfalse. Group row removal releases role to null; rejoin restores listitem; authored article survives group disconnection/reconnection. Test role restored to listitem before final AX/axe. No new controls or state normalization were emulated.

Real pointer/keyboard: actual Action click and Enter show shared Toast. Native root anchor click navigates to #list-item-destination. Tab after fragment navigation moved to the code explorer, so that attempt is not link-keyboard evidence; separate public-focus setup followed by actual Enter produces one native link click. Group/listitem roles inspected in verbose AX; images decorative where text names the row, Icons hidden, actions named. Axe after canonical Separator addition:0violations/22passingrules over usage previews. No real screen-reader/forced-colors claim.

Show/Copy on separator example reports Copied, includes the exact common setup and TpListItemSeparator markup, and preserves the same Group instance. Existing generated List Item entry removed in favor of authored Default/API; generator protection and catalog test inventory updated,60-entry invariant retained.

Affected Marker Drawer: actual open/Escape, all three rows use extracted TpListItem with flex, padding6.4, mediahidden/actionsvisible. Source and built variants preserve names/registration. Built probe served from existing localhost5173/tests/fixtures/components/dialogs/package.html imports dist/index.js: TpListItem, TpListItemGroup, TpListItemSeparator exported and equal registered classes; named list, two listitem roles, subdued paint and actual decorative Separator checked. An initial probe erroneously inspected window globals; corrected module import is the export evidence.

Production TypeScript, ESLint, Stylelint, Prettier and git diff --check pass. Existing presentation/resolver/structure/Part/stories suites35tests pass. Production and Storybook builds pass; local logs tmp/component-verification/list-item/2026-10-04/{build,storybook-build}.log. Source revision remains clean63c1308d112b6b1205d86244a156cca1abef5087. Screenshots inspected inline.

Still required: non-nested whole-row action plus trailing independent actions (C-06), complete alternate dictionary/selected/disabled/native-action matrix (C-07), detailed remaining upstream permutation/standalone use-case reconciliation (C-08), and applicable unavailable platform evidence. Native root delegates currently require caller-supplied semantics; do not insert trailing controls inside delegated anchors/buttons or claim source link-with-actions parity. Continue these requirements before a complete-component claim; whole-library goal remains active.

## C-06 design refinement — 2026-10-04

Fresh direct MCP Foundation/Library remain head8440bff24a97dbbc5c762ebf4bd6baa958b305e1. The live Root requirement rules out stretching a Title link while leaving Root generic. Source item-example.tsx1175–1371 provides five link combinations per treatment, including trailing Share. Its nested anchor/Button arrangement must be adapted to Foundation non-nested semantic hosts.

Render canonical Root and Actions as sibling regions in one structural grid. Root spans the grid and preserves its native delegate, media/content and full-width supporting rows; Actions occupies the main-content row above Root's otherwise empty trailing grid cell. CSS subgrid supplies intrinsic shared sizing, with no measurement, synthetic activation, propagation suppression or new public property. Existing canonical dictionary owns padding/gaps/borders; Actions' edge inset uses the same existing density roles. Empty regions must not leave tracks/gaps. Header/footer content inside a native Root must remain noninteractive; separate controls belong in Actions. Native delegate owns native disabled semantics.

Existing Part binding/native anchor and actual TpButton remain the only action owners. Verify actual pointer on content and trailing Share, real Tab/Enter/Space, native modified-link affordances, callback cancellation/propagation, optional header/footer/empty actions, native button delegate, theme/size/RTL/narrow geometry, public hooks and node retention. Reopen early integration until the sibling layout is inspected. No title-action overlay or new interaction engine is introduced.

C-06 early integration: inspected actual Root/Actions siblings and native a delegate; existing Button and Part owners unchanged. Chrome76 actual Share click bubbles to application, opens existing Toast, and leaves hash unchanged; native link click navigates and bubbles once. Adding header/footer retains the same anchor, keeps Share aligned to body center, and gives both supporting rows full width. Screenshot inspected. Shared gap9.6px and symmetric inline edge10.6px confirmed. The grid wrapper receives the canonical Root dictionary column gap, and the subgrid inherits it; no fractional visual correction. No per-row spacing attribute or token introduced. TypeScript and focused Stylelint pass. Early checkpoint reopened and passed for this design.

## Native action execution — 2026-10-04

Root remains the canonical native semantic host, with Actions outside it in the same grid. Native button-compatible wrappers use span; no interactive descendants are added. Shared recipes retain existing density/radius/variant roles. Internal row wrapper receives the canonical Root column-gap rule, avoiding CSS subgrid's half-gap mismatch; Actions uses existing inline padding and border roles. Screenshot confirms full-width supporting rows and a main-row-aligned trailing control.

Chrome76 actual pointer Share opens Toast, bubbles to the application and leaves hash unchanged; actual Root click follows its href and bubbles once. Public focus setup followed by real Tab reaches Share, Enter activates only Share, Shift+Tab returns to Root, Enter activates the native link. A separate native button Root follows Space; Tab/Space activates only its independent Details button. Updating inherited disabled through delegate state updates that same native button's disabled property. Native preventDefault on the link cancels navigation while the click still bubbles. No synthetic input claim.

All three link treatments render all five source combinations. Actions removal hides its region and restores full-width body; reinsertion/reconnection retains the Root anchor. Actions references record live/null/live. Public class/style hooks reach the real Actions/Root; focus survives. Scoped RTL space3=18/space2=10/radius16 yields body/action gap18, edge inset19 including border, padding10/18 and radius16 with the same focused anchor. Selected reflects aria-current=true and application value stays intact.

Alternate dictionary through the currently loaded module changes ghost Root to the primary pair/radius-xl and Description to text-xs=12; node/focus preserved. Removing every list-item dictionary contribution removes padding/radius/gap without remount; restoring the dictionary restores appearance. An initial import without Vite's current module URL targeted a separate controller instance and is not evidence; rerun used the page's actual loaded module. Default variant rules intentionally supersede base paint, so the alternate paint overrides the variant key.

At390px, all eight Docs preview widths/scroll widths are248px, including multiple actions. Light/RTL and explicitly scoped dark/RTL screenshots reviewed. Storybook fixes .sbdocs to light; OS color-scheme emulation alone did not change control theme and was not counted. Dark preview scope did change actual computed color-scheme to dark. Automated axe over usage previews:0violations/22passing rules. No real screen-reader/forced-colors verification claimed.

Changed Links Show code/Copy code uses shared Canvas, includes executable setup and trailing Share, reports Copied and retains the same row instance. Native source and built package sibling hosts verified. Built TpListItem export equals registered class, all eight canonical parts exist, and actual Share click emits only the share action. Marker Drawer actual open/Escape remains functional; three rows retain6.4px padding/gap,274.2px width and no overflow. Earlier stale-UID attempts while builds triggered HMR were discarded; successful check occurred after both builds completed.

Existing five presentation/resolver/structural/Part/stories suites:35tests pass. Focused ESLint/Stylelint, production TypeScript and diff check pass. Production and Storybook builds pass: tmp/component-verification/list-item-actions/2026-10-04/{build,storybook-build}.log. Screenshots inspected inline.

C-08 remains required: finish the standalone references (avatar group, menu composition, image header grid, media-link metadata, external links/decorative indicators) and the remaining base case matrix. In particular, decorative trailing indicators must preserve the row link's pointer target; separate Actions host hit-testing needs explicit coverage before those source cases are claimed. This is not a complete-component or complete-library claim.

## Remaining reference compositions design — 2026-10-04

Previous goal turn made implementation and browser-evidence progress on native row actions. Fresh live project/Foundation/Library head remains8440bff24a97dbbc5c762ebf4bd6baa958b305e1. Read new-york-v4/examples/item-{avatar,demo,dropdown,group,header,icon,image,link,size,variant}.tsx and their actual ui/item.tsx imports (Radix Slot, shared Separator); preserve canonical Base/Nova presentation rather than mixing New York paint. Capabilities combine public slots/parts with existing Avatar/AvatarGroup/Button/Menu/MenuItem/AspectRatio/Icon/Separator. Native images, metadata and anchors are content/interoperability, not painted substitutes.

Add Docs compositions for people/invites, grouped people, person-command Menu, square image-header grid, music/media links with metadata, and native navigation/external links. Reuse shared interactiveMarkupExample and Canvas, same live/copy setup. Existing density/treatment/content compositions already own overlapping static source cases; no variant sidebar entries. Grid layout belongs to the application; group partPresentation uses theme-derived gaps and responsive intrinsic columns. AspectRatio owns square geometry. AvatarGroup owns overlap; actual Button and shared Icon own invite action.

Menu composition: actual TpMenuItem owns all command selection/focus/highlight. Its direct TpListItem child is presentational. Adopt the existing setPartComposition owner to eliminate nested row padding: outer MenuItem keeps shared popupItemSpacingAppearance; inner ListItem Root uses zero padding, and release this contribution on removal/disconnection. No story-specific spacing attribute/override. MenuItem is already shared by Menu/Menubar/context invocation; do not add another command engine.

Trailing decorative Icon currently sits above Root in Actions' grid cell. Keep Actions container transparent to hit testing; restore pointer targets for its slotted content except the actual decorative Icon, and preserve native/semantic delegated Actions hosts. This uses CSS hit testing, not forwarding clicks. Native Icon remains noninteractive. Explicit action controls keep their targets and tab behavior. Verify actual pointer on an indicator as well as Share. Source metadata belongs within canonical Content, not an extra unsupported Content constituent.

Early integration reopens for native indicator/Share, actual person Menu and header geometry before broad reference reconciliation.
