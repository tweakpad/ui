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
