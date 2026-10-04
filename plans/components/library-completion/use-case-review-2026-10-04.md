# Library-wide use-case corrective review

The active scope is every library control, not the most recent screenshot. This record reports the current integration batch; it does not certify complete component or library parity.

## Sources and ownership

Fresh direct Spec Blocks project/Foundation/Library reads: head `8440bff24a97dbbc5c762ebf4bd6baa958b305e1`, state `5daad6324d67f008ae378650a86e7e961fc91a1025d6107c89be7002caecdfe1`. References remain the pinned local Base UI, Floating UI and shadcn checkouts recorded in `audit.md`. Relevant source paths and contracts are in the owning implementation checklists.

`reference-use-cases.json` now discovers 304 reference files and 674 source cases, including standalone default-export demos previously omitted by the titled-Example scan. Discovery is not parity evidence. Eleven families have concrete implementation pointers; case-level reconciliation remains pending. The rest of the catalog remains in scope.

## Shared corrections

- Docs uses one common Lit composition renderer and shared theme spacing. Authored static markup can be both rendered and copied through `markupExample`; React is confined to Storybook's Docs integration.
- Form examples use the existing `form-actions` container and its shared gap recipe. Buttons remain actual TpButton instances with native form association. No local spacing attributes.
- Table uses public custom constituents around native table regions/cells, preserving legacy native composition. Chrome's verbose accessibility tree exposes table, rowgroup, row, columnheader, rowheader and cell roles. Sticky geometry is still owned by the existing TableGeometry implementation. The copyable sticky example now includes its public width hook and all 36 rows with matching totals.
- Skeleton no longer imposes an icon minimum height on layout-owned placeholder shapes. Host radius reaches its painted region. Card/Text/Form/Table static examples use exactly their copyable markup; the Card header shows both lines. The canonical catalog fixture reuses the same profile example.
- Avatar status badges now have the missing default recipe: semantic primary pair, theme ring/radius, source-backed size bounds. The icon is bounded by its enclosing badge; small badges hide icon artwork while preserving the status name. Existing Avatar viewport sizes and navigation consumers are preserved.
- Spinner examples cover three sizes, Button loading, Badge, Field/InputGroup, and EmptyState. EmptyState adds recovery actions, muted/bordered surfaces, search, icon and Card composition through existing controls/public parts. Avatar adds sizes, image/fallback, badge/icon, groups, text/icon counts and EmptyState composition. These are Docs use cases, not new sidebar variants.
- ScrollArea default has consumer-owned bounds without demo paint overrides; its copied markup contains actual content and uses theme-relative dimensions. Gallery image import survives production asset bundling. Native scroll viewport/controller remains the owner.

## Observed integration evidence

Chrome DevTools MCP audit tab 76 only; existing Storybook at localhost:6006. Screenshots inspected inline, not saved artifacts. Browser screenshots are visual evidence; measured/public-API setup below is distinguished from actual input.

- Table Docs: native semantic tree inspected. Public scroll offset setup 200/100 retained sticky header/footer at viewport top/bottom and first/last cells at logical edges. Separate border model keeps header border painted. Screenshot inspected while scrolled. Native-composition and complete accessibility regression still pending for this new constituent implementation.
- Skeleton Docs: actual Card shows two header lines and square content; Text has three lines; Form has two label/input pairs plus action; Table has three rows. Shared radius reaches all painted placeholders. Local axe on Docs examples: zero violations. Final height check after removing the inherited minimum remains pending.
- Spinner Docs screenshot inspected all five composition cases. Four loading buttons each render the existing TpSpinner internally. Named standalone/search indicators expose status; decorative Badge/Button/EmptyState indicators do not duplicate it. Sizes differ as expected. Complete motion/media verification remains in the owning record.
- Avatar Docs: all eight example sections render. Light and scoped dark screenshots inspected. Badge icon width bounded to 6.3984 at root spacing 3.2; hidden for small, visible for default/large. After root spacing=4, badge/icon measure 8. Named Available and 3 additional participants are present in the accessibility tree, including icon-count compositions. Local axe on examples: zero violations. A local spacing seed alone does not redefine already inherited derived role values; scoped complete themes must include derived roles as documented. This was not represented as a passing scoped-seed-only test.
- EmptyState Docs: all six source compositions inspected; symmetric root padding 19.2, gap12.8/content gap6.4 at spacing3.2, semantic muted colors, optional border and actual InputGroup/KeyHint/Icon/Card/Button. No CSS pixel spacing introduced.
- ScrollArea Docs: real click and PageDown moved native viewport to268; real pointer leave to page heading and return kept the identical viewport at268. Automatic overflow track opacity1 at rest. This check was performed without intervening HMR source edits. Full drag/wheel cases are not claimed here.

## Commands

- Targeted ESLint: passed on changed example/story/recipe files.
- Storybook catalog unit checks: 9 passed. The first run caught a demo border override in ScrollArea's default; it was removed rather than weakening the assertion.
- Stylelint on changed component/recipe/Docs styles: passed after correcting two rule-spacing errors in Table parts.
- TypeScript: passed after the component/example edits.
- Production build: passed.
- Storybook build: passed; log `tmp/component-verification/library-completion/use-cases-storybook-build.log`.
- `git diff --check`: passed.

## Remaining work

This batch is not the full delivery. Continue actual source-case reconciliation across the catalog, interaction/API parity and shared-family adoption. Existing records contain specific unresolved evidence and contract questions; do not replace them with a blanket pass or infer completeness from 674 discovered cases. Finish Table native/axe integration and remaining revised Form/Bubble/OTP/Skeleton checks, then update affected gates with evidence. Preserve working consumers and avoid repeated broad tests when no relevant change has occurred.


## Integration findings resolved after the first batch

- Form's actions wrapper initially still computed block/normal: the CSP resource migration had stopped emitting light-DOM automatic part rules. The shared PresentationController now registers light-DOM bindings through its existing native-part/resource owner. It releases owned registrations/part names on slot changes, removal and disconnect; authored part names survive. Shadow-root rules and explicit native registrations retain their existing path. Form's existing observer now notices slot changes.
- Chrome76 Form after repair: root flex/gap16, actions flex/gap6.4; actual Save produces `Saved preferences for Alex.` with values `{name:Alex}`, Reset restores empty values/output. Public slot removal/restoration and disconnect/reconnect release/reapply the registration and keep the identical editor. Correct live module CSP service yields nonce `usecase-audit`; suppression removes styles and restores block/normal, disposal restores flex/6.4 with the same input. The initial CSP trial imported an unversioned duplicate of Vite's HMR module, so it did not affect the active module's policy; it was discarded and repeated with the actual loaded module URL. No pass was inferred from that failed setup.
- Table legacy native composition: table layout, sticky header, existing native-part registration and padding6.4 remain intact; local axe zero violations. Custom Table axe caught an unnecessary explicit caption role; removing it lets the native caption carry semantics. Unique example-region names remove the repeated-landmark violation. Full custom-example axe rerun is recorded in the current tool results; no suppressions were used.
- Shared presentation/catalog unit checks: 21 passed (resolver, structural styles, stories). TypeScript and ESLint passed after the light-DOM repair. Production and Storybook builds passed after that repair; the subsequent caption-role correction also passes TypeScript and is pending the next final build batch.
- Bubble Docs now exposes the actual `Read the full review` disclosure trigger, replacing the erroneous Toggle fallback caused by the old slot name.

Outstanding cases above remain active. New build/test evidence does not clear unrelated component coverage or unsupported browser/media requirements.

## Shared explorer and validation correction

The new usage renderer incorrectly introduced details/Source UI separate from the existing explorer. It now renders the actual Storybook Canvas with a scoped supported MDX Story override for the Lit composition. Canvas owns source expansion, copy action, syntax display and preview spacing; the redundant preview border/padding and details control are removed. Applies to all docs.examples consumers without publishing sidebar variants. Chrome76 OTP: actual123456 input survives Show/Hide with identical control; actual Copy shows Copied; screenshot reviewed. Skeleton's four usage cases also have the same Canvas and source actions. Storybook build succeeds (`docs-explorer-build.log`); focused stories/Field-state checks13passed. Skeleton's previously pending line-height check now measures host and painted region12.796875 at spacing3.2, matching space4 without icon minimum clamping.

TpFormElement now respects Field's published computed-invalid state while retaining native ElementInternals constraints and explicit control invalid. Field.validate now reads registered control validity before inner-editor validity, preserving aggregate constraints such as complete OTP length. Real Form Save/correct/submit/reset and OTP partial12/Verify/error→complete123456/auto-submit→Reset/pristine/output cleared verified in Chrome76. Required Input/TextArea/Select/NativeSelect/Checkbox/OTP public-API fixture confirms initial invalid=false with native invalidity retained, then validated invalid=true with correct host messages. TypeScript/ESLint passed; shared Field-state checks passed. Full library audit and remaining Input Group compositions continue; this is not a library completion claim.

## Input Group compositions and shared floating repair

Input Group now has eight Docs composition sections using existing Field/Input/TextArea/Button/Icon/KeyHint/Spinner/Menu/Popover/Tooltip/Card/Form owners and the shared Canvas explorer. Canonical Default stays the single sidebar story. The existing Input Group host now fills allocated inline space; its slotted flex rule also supports deliberate native editor interoperability. Button Group's mixed-controls/text/separator dependency remains missing and is explicitly pending rather than replaced by local presentation.

Chrome76 actual interactions: Clear empties and focuses the existing editor using public clear(event); Copy reports successful clipboard write. Comment typing updates18/280, Post produces submitted comment JSON, Cancel restores empty value/output and0/280. Card Save/Reset and Phone+44 Menu selection preserve expected values as recorded in the Input Group checklist. Public validity and disabled-editor/independent-action paths retain the original owners. Local axe of all example previews returned zero violations; light screenshot inspected. Dark/narrow composition review and remaining shared consumers are pending.

The composed Menu exposed a shared positioning defect on scrolled Docs: modal root overflow caused the document's scrolled client rectangle to be treated as a clipping ancestor, hiding a visible anchor. Foundation now stops at documentElement, excludes inline/contents overflow boxes and excludes body from automatic element clipping, matching the local Floating UI source. Viewport owns root clipping. Actual scrolled Menu now opens, selects+44 and preserves phone5550123; independent nonmodal/top/arrow/keepMounted options and Escape also verified. A public positioning fixture still reports a nested overflow anchor hidden after scrolling it out, then visible after restoration. Broader affected-family regression remains pending.

Anchored surfaces now reserve label-as-visible-content fallback for Tooltip. Popover's accessible label no longer duplicates authored header/description; real Done closes and Tooltip text fallback remains rendered. Existing owners and presentation recipes remain shared.

Focused tests23passed (positioning-offset, tooltip-positioning, stories); focused ESLint/stylelint and diff check passed. Production and Storybook builds passed: tmp/component-verification/library-completion/input-group-build.log and input-group-storybook-build.log. These are local artifacts, not attached files or blanket component conformance.

The exact OTP Simple example was rechecked after the builds: actual123456 entry survives shared Show/Hide code with the same editor; actual Copy reports Copied. Screenshot confirms the common explorer, no details disclosure. An additional duplicate Usage examples heading remains in authored Docs prose plus the shared examples section and needs normalization during Docs reconciliation. No whole-library completion claim.

## Button Group dependency and shared field defaults

The direct-Button-only implementation has been replaced by the same ButtonGroup owner extracted into its own folder, composing existing Button/Input/TextArea/Select/NativeSelect/InputGroup/Toggle boundaries and popup triggers. New governed Text constituent uses the family dictionary; Separator remains existing TpSeparator. Nested group gap and member cleanup are centralized. The shared seam helper preserves member outer radii for ButtonGroup while keeping ToggleGroup's existing default.

Integration exposed and repaired shared defaults: Button radius now uses radius-lg, Select/NativeSelect default heights use control-height-md (NativeSelect small uses sm), and InputGroup's single-line editor subtracts its parent's boundary widths. These are source-backed common roles, not story attributes or new per-control spacing tokens. Ten ButtonGroup Docs composition sections reuse real controls/shared Canvas, and InputGroup's missing ButtonGroup composition is added. Detailed actual interactions, lifecycle, theme/RTL/narrow/axe evidence and passing builds are in plans/components/button-group/implementation-checklist.md. Joined pagination/text-alignment source cases and complete capability reconciliation remain open.


## Button Group Pagination and Text Alignment continuation

Added the three remaining base-reference composition entries using actual Pagination and ToggleGroup. ButtonGroup reaches Pagination's public list/control parts through its existing presentation controller, retaining nav/ul/li and actual Button links; container/member contributions release on removal. Pagination owns destinations, page windows and events; ToggleGroup owns selection/keyboard behavior. Fixed vertical numbered-link stretching during early integration. Chrome actual page activation/split synchronization, selection via pointer+keyboard, lifecycle/ellipsis windows, light/dark/RTL and token roles verified; axe0 across examples, focused11tests and both builds pass. Exact evidence and pending cases remain in ../button-group/implementation-checklist.md. All-outline active-page visual distinction, narrow pagination and scoped spacing seed propagation remain explicit follow-ups, not cleared by the example count.


## Pagination source cases reconciled

Basic, Simple and With Select now map to the canonical Default and two Docs compositions with passing actual pointer/keyboard, current-page, page-size, narrow-label and copied-source evidence. Corrected missing Simple copied handler by sharing setup code. Added the source40rem visible-label treatment without replacing native links. Repaired duplicate Docs landmark names. Joined ButtonGroup examples now distinguish current pages using existing secondary Buttons and use existing ScrollArea for narrow intrinsic groups; no parallel state, paint or scroll behavior. Exact results are in navigation-primitives/implementation-checklist.md and button-group/implementation-checklist.md. Earlier notes listing these specific current-page/narrow follow-ups as pending are superseded by this observed evidence; unrelated catalog and native-media gaps remain open.

## Breadcrumb source cases and shared native menu geometry

Reconciled the nine inventoried Breadcrumb cases against Default plus five Docs compositions: collapsed ancestors, named ancestor Menu, consumer links/decorative ellipsis, custom separator, responsive Menu/Drawer. Existing shared components own interactions and presentation, and Canvas owns live/copy examples. Source start alignment is explicit; responsive48rem choice belongs to the application. Exact source adaptations and pointer/keyboard/modal/RTL/axe evidence are in navigation-primitives/implementation-checklist.md.

Rendered comparison found native Menu links were56.78125px tall while custom MenuItems were44px: projected native nodes missed the shadow box-sizing reset. Added border-box to the existing shared registered Menu/Menubar item structure, retaining all spacing and separator recipes. Native/custom/submenu items now measure equal44px, removal releases styles/roles, actual native link navigation/dismissal and Select selection pass. Focused16tests, type/lint/format checks and both builds pass. Other catalog cases and unavailable platform checks remain open.

## One-time Code reference cases and narrow form geometry

Twelve inventoried reference cases now map to Default and11 Docs compositions. Added controlled feedback and the Card/login/resend/support flow; restored source2/2/2 grouping, initialized/disabled groups and Field error content. Automatic submission/reset remains available. Interactive copied source uses the same scoped setup as the live preview and the shared Canvas explorer.

The narrow audit exposed fixed visual OTP slot overflow and the Form light-DOM wrapper's automatic grid minimum. Existing OTP flex geometry now shrinks within available width while retaining the44px editor height and wide slot extent; registered Form structure allows its wrapper to shrink. All11 examples fit248px, including Card content214px. Actual editing/filtering/masking/submission/reset, source identity, dark RTL screenshot, axe0, Form default regression, focused20tests and both builds pass. Details and native-platform evidence limits remain in one-time-code/implementation-checklist.md.

## Skeleton reference-case reconciliation

Seven inventoried source cases now map to Default and five Docs compositions. Added the missing two-to-one media/captions layout using actual AspectRatio and Skeleton; copied profile flex behavior now matches the live composition. Existing Card/Text/Form/Table layouts remain shared-component/decorative compositions. No runtime Skeleton behavior or theme recipe changed. Chrome76 inspected host/paint extents, narrow geometry, dark RTL scoped spacing/radius, motion pulse/sweep/none/animatedfalse/explicitreduce and decorative AX; usage axe0 and shared Show/Copy pass. Type/lint/format and existing stories9tests pass; Storybook log: tmp/component-verification/skeleton/2026-10-04/storybook-build.log. OS-media/native-platform gaps remain distinct from these passing use-case rows.

## Scroll Area source-case reconciliation

Four inventoried reference cases now map to canonical vertical Default and horizontal gallery, with both-axis composition retained. Gallery matches reference portrait artwork/captions through actual AspectRatio; shared markupExample supplies live/copy HTML. Docs frames use existing theme border/radius roles; canonical Default preserves the primitive's default presentation. No runtime scroll behavior changed.

Actual PageDown/ArrowRight, source expansion/copy, hover enter/leave and public visibility/corner/RTL changes preserve the native viewport and appropriate offsets. Two narrow previews fit248px; axe0; type/lint/format, corrected existing stories9tests and Storybook build pass. Exact measurements/adaptations and unavailable native-input boundaries are in scroll-area/implementation-checklist.md. Broader catalog work remains active.

## Bubble and shared Marker continuation

Bubble's live/copy compositions now cover the missing message lengths, sender groups, reaction placements/actions, native bodies and quick replies. Seven source cases have scoped Chrome/visual/AX evidence. Expandable content remains pending the shared Collapsible rendering-hook repair. Marker was a dot-only placeholder despite its live contract; repaired existing owner/recipes to text/icon/default/separator/border and public native delegates, reused from Bubble and five Marker Docs compositions. Full Marker source cases remain pending (including shimmer), not certified from the new examples. Details, builds and actual interactions: presentation-primitives/implementation-checklist.md, Bubble and Marker continuation results.

## Shared Collapsible composition repair

Completed Bubble's remaining expansion case through the existing Collapsible, Button and Bubble owners: public part contracts, full/preview replacement, Show more/less and chevron, current Body measurement, shadow-scoped ARIA relationships and delegate cleanup. Default Collapsible and Accordion Tab/Enter/indicator regressions verified. Eight Bubble source cases now have scoped evidence; Marker and the broader library remain active. See presentation-primitives/implementation-checklist.md, Collapsible composition results, and tmp/component-verification/collapsible-composition/2026-10-04 build logs.

## Marker detail reconciliation and List Item shared layout

Restored reference clock/branch/file icons, trailing native-action chevron, icon-bearing Accordion/Drawer/Button compositions and three framed file/status rows through actual ListItem. The rendered composition exposed empty ListItem media/action grid tracks and unspaced trailing content; repaired its existing owner to source wrapping flex, full-width header/footer, optional-region hiding and shared Actions gap. Marker icons now match their theme-sized canonical region at both default16 and scoped24. No component-specific spacing attributes or local painted rows.

Chrome76 verifies actions, drawer closure/focus, dynamic row regions, dark narrow RTL, source/copy identity, axe0 and served built-package geometry. Existing29tests, lint/type/style/format and builds pass. MarkerBorder/Accordion/Drawer source rows now reconciled. MarkerExample/Separator still lack source shimmer: traced to shadcn shared tailwind.css and AttachmentTitle, but missing from live closed motion roles. Shared contract/presentation design remains required; no local animation inserted. Full catalog objective remains active.

## List Item public composition repair

List Item now uses its own preserved owner folder with canonical public part rendering, optional semantic slots, media treatments, named list Group and a Separator constituent composing the existing Separator. Corrected missing subdued paint through the shared variant builder. Authored Default/API plus eight Docs compositions replace the generated placeholder, using the same executable setup for preview/copy. Legacy leading/trailing/default slots and Marker Drawer retain the shared layout.

Chrome verifies optional content, part references/delegation/reconnect, owned role release, native link/action, dark narrow RTL, token-scaled media, copy identity and axe0/22rules. Existing35tests and both builds pass; built classes exported/registered. Eight static source cases have scoped evidence. Whole-row action with independent trailing controls, remaining complete source combinations and full customization matrix remain open in plans/components/list-item/implementation-checklist.md. No complete List Item/library claim.

## List Item native row actions

Canonical native Root and trailing Actions now occupy sibling grid regions; actual Share click/Enter never activates the link, and native button Root supports independent Space activation. No click forwarding, event suppression, new spacing attribute or component token. All three source link treatments include their fifth Share composition. Existing theme/dictionary/part hooks retain nodes and focus; missing dictionary keys remove appearance. Marker Drawer consumer and served built package verified;35 existing focused tests and both builds pass. Standalone source compositions and full source-case reconciliation remain pending in the List Item record.

## List Item reference reconciliation

All24base and10standalone Item source cases map to Default/API and14curated shared-explorer compositions. Added actual AvatarGroup/invite rows, Menu/MenuItem people commands, square AspectRatio image headers, media-link metadata, native external/navigation links and security actions. Shared MenuItem owns the outer inset and releases/reapplies its inner ListItem composition correctly; CSS preserves decorative Icon pass-through while trailing controls remain independent. Source treatment/density matrix and actual pointer/keyboard/AX/copy/package checks are recorded in plans/components/list-item/implementation-checklist.md. Existing25focused tests and both builds pass; whole-library completion remains unproven and active.

## Aspect Ratio source cases

Reconciled all four base ratios and legacy16:9 demo against real Docs geometry, narrow layouts, shared-theme overrides and actual explorer/Controls interaction. Three proportional container sizes are present. Source photos remain solid muted fills per the user. Corrected Default fit from cover to fill and unified copy/live markup through existing markupExample. Evidence and separate API/platform concerns remain in presentation-primitives/implementation-checklist.md.

## Avatar source cases and fallback repair

All seven base examples and legacy shape demo are now accounted for through the shared explorer. Added missing image/status combinations, full image groups, custom shape/grayscale and complete copied setup. Shared count recipe scales icons through existing theme roles. Visual verification found a runtime defect: formatting whitespace around named badge content suppressed initials. Avatar now distinguishes meaningful default content, observes dynamic changes and disconnects its observer; authored content and image lifecycle retain their owners. Verified light/darkRTL/narrow layouts, image recovery, copied code, AX/axe and built package. Detailed boundaries and remaining platform gaps stay in presentation-primitives/implementation-checklist.md.
