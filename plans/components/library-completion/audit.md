# Library completion audit

The requested delivery includes every control below. This is an active work record,
not a conformance claim. Preserve working controls and normalize their shared owners;
passing basic checks is not a reason to rewrite them or evidence of full parity.

Baseline: `3a03ac0b1bfc0ce2194eb22f3c1cf7748efff84d`; initial working tree clean.
Sources freshly read through direct Spec Blocks MCP: Foundation
`doc_cd3c4721-9f9b-4531-abab-a8bfdbac75f1` and Component Library
`doc_8077bf7c-0361-48f3-ac87-53b983bd89b3`, project
`prj_c5a403a0-d1d5-4487-ac78-f4e545f46483`.
Local reference checkouts verified clean: Base UI `5b495488d182c81a8a14a440d7a376517118f8ec`,
Floating UI `27629b74ba36ab8ceb2a968051927b9b69511a3b`, shadcn
`63c1308d112b6b1205d86244a156cca1abef5087`.
Presentation reference: shadcn `apps/v4/registry/bases/base/ui/` and
`apps/v4/registry/styles/style-nova.css`; translate through existing Tweakpad recipes
and semantic theme roles. No per-control spacing attributes or parallel paint systems.

## Baseline source findings and repaired ownership

| Control | Baseline source finding | Required implementation / shared owner | State |
| --- | --- | --- | --- |
| Combobox / Select | Separate public identities and implementations; Command Palette inherits Combobox. Deleting registration alone would lose capabilities. | Move editable/search capabilities into Select's public surface; retain one shared selection/collection owner; Native Select remains native. Remove public Combobox catalog, exports and docs only after migration. | implemented; native verification limits recorded |
| Context Menu / Menu | Context Menu already extends Menu, but invocation policy and public identity remain separate. | Menu owns ordinary, context, keyboard and long-press invocation; preserve existing arbitrary-depth menu tree, icon, shortcut and separator behavior. Reconcile affected catalog/spec references. | implemented; native verification limits recorded |
| Pagination | Local native buttons and glyphs, no destination-link/list anatomy or localized previous/next API. Page buttons do not inherit root disabled behavior. | Native navigation/list/link semantics; existing Button appearance, Icon and Key Hint when applicable. Full reference examples. | implemented; native verification limits recorded |
| Questionnaire | Substantial flow/validation owner exists; rendering recreates buttons, inputs, choices and keyboard hints locally. | Preserve `foundation/questionnaire.ts`; compose public controls; verify atomic answer/skip/navigation rejection and focus. | implemented; native verification limits recorded |
| Preview Card | Thin Hover Surface subclass; completeness depends on inherited delay, corridor, focus and anchoring defaults. | Audit/repair the existing hover-surface owner; do not introduce another hover state machine. | implemented; native verification limits recorded |
| One Time Code | Single logical editor exists. Numeric defaults conflict with text/alphanumeric contract; no predicate/group/separator surface. | Preserve editor/IME/autofill ownership; complete character policy, visual slots and atomic controlled rollback. | implemented; native verification limits recorded |
| Input Group | Existing composition contributions remove child borders; empty action region always exists. | Repair joined-control composition and root focus/invalid styling; preserve independent Button variants and action semantics. | implemented; native verification limits recorded |
| Breadcrumb | Mutates children into listitems, including links, and does not restore attributes. | Native ordered-list/item relationships and link/current-page semantics; shared Menu for collapsed ancestors, Icon for indicators. | implemented; native verification limits recorded |
| Resizable Panel Group | Handle positions and ARIA values remain at initial fractions after resize; single shared minimum, no controlled/persistence/collapse model. | One normalized panel-size owner, per-panel constraints, live separators, pointer cleanup, RTL and keyboard interaction. | implemented; native verification limits recorded |
| Scroll Area | Native viewport wrapper only; no scrollbar, thumb, corner or visibility policy. | Preserve native viewport scrolling and add measured proportional scrollbar controls; cleanup, resize, RTL and drag behavior. | implemented; native verification limits recorded |
| Skeleton | Sweep-only animation, while contract defaults to pulse and supports pulse/sweep/none. | Shared motion policy and existing skeleton recipe; decorative semantics and stable layout. | implemented; native verification limits recorded |
| Side Panel | Extends Drawer, which would incorrectly inherit drawer gestures once implemented. | Dialog preset with logical-edge placement, independent close/header/footer; same Dialog modal/focus lifecycle. | implemented; native verification limits recorded |
| Spinner | `sm`, `default`, `lg` already exist in implementation and recipe; generated documentation exposes no size controls. | Preserve size implementation; document it, verify named/decorative semantics and motion policy. | implemented; native verification limits recorded |
| Form | Pending submission policy is ignored; native-validation attributes can become stale; reset event reads currentTarget after dispatch. Fresh Foundation review confirms async validation must remain nonblocking by default. | Existing ValidationRun/Field registry/Form owner; preserve consumer-controlled async blocking, honor cancellation, native policy and pending action state. | implemented; native verification limits recorded |
| Data Visualization | Figure wrapper and a Unicode bar demo, no data/series/renderer/tooltip/legend contract. | Renderer adapter boundary with responsive lifecycle, shared series context, tooltip/legend and accessible table; no new chart runtime dependency. | implemented; native verification limits recorded |
| Empty State | Description slot is omitted unless the string property is set; incomplete media/header/content anatomy. | Complete existing presentational owner and parts; public Button/Icon/Avatar composition for recovery/media. | implemented; native verification limits recorded |
| Table | Native table relationships preserved. No layout/selection/sticky APIs; only one-row example. | Keep native anatomy and registered parts, add sticky header/columns/footer and full distinct examples; application-owned selection. | implemented; native verification limits recorded |
| Avatar | White card fallback on light background; image mounts while loading, no delayed fallback/generation guard; src update resets failure after render without scheduling another render. | Existing Avatar owner and shared semantic muted surface; generation-safe loading, accessible fallback and complete group/status composition. | implemented; native verification limits recorded |
| Attachment | Locally styled remove button; no processing/error text or full media/content/trigger/group composition. | Public Button/Spinner/Icon with application-owned status and independent actions; complete existing attachment anatomy. | implemented; native verification limits recorded |
| Aspect Ratio Box | Missing fit policy; invalid ratio is silently clamped; in-flow content can influence geometry. | One ratio owner with finite positive validation, out-of-flow content and fill/contain/cover/none policy. | implemented; native verification limits recorded |
| Bubble | Fixed 75% limit; empty reactions always present; reaction layout does not match reference; incomplete grouping/composition. | Existing Bubble parts and recipe; logical alignment, content treatments and optional anchored reactions; no chat-state ownership. | implemented; native verification limits recorded |
| Command Palette | Combobox subclass with fixed positioning, no Dialog owner; incomplete command composition. | Dialog owns modal/focus/dismissal, shared collection/filter/selection owns commands; public Input Group and Key Hint. | implemented; native verification limits recorded |
| Drawer | Left/right-only Dialog subclass; no logical block edges, snap/swipe/handle behavior. | Dialog remains owner of modal lifecycle; Drawer-specific gesture/snap owner, independent optional header/footer/close. | implemented; native verification limits recorded |

## Cross-control regression boundaries

- Keep the working shared Menu/Select popup geometry and scroll preservation fixes.
- Preserve Button, Field, Dialog and selection-family state/cancellation behavior.
- Shared recipe changes require visual inspection in their actual consumers, in
  light and dark themes and with changed base spacing; build success is insufficient.
- Initial hover, pointer activation, dismissal and returned hover must resolve the
  same state. Focus styling must not masquerade as sticky hover state.
- Controls and demos must use the public nested components, not painted substitutes.
- Browser evidence uses Chrome DevTools MCP only. Keep executable acceptance checks
  focused on state/lifecycle defects; use actual visual inspection for spacing.

## Delivery tracking

No complete-component claim is made by this audit. Implementation, documentation,
reference reconciliation and required browser evidence remain active for all rows.

2026-10-04: first full Storybook build passed after Select/Command/Attachment/Table migration. Build is import/bundle evidence only; interaction/visual matrices remain separately tracked.

Historical Questionnaire source review before repair on 2026-10-04: current
manual proposal path accepts a controlled owner that publishes no new value,
then clears skipped state or advances reached-index metadata anyway. Skip/reset
also publish separate answer/item events and do not reject absent controlled
acknowledgment. These must use the existing ControllableState transaction owner.
Local shadcn packages/react/src/questionnaire tests additionally cover mixed fixed
and freeform answers, per-answer controlled ownership, disabled answer exclusion,
SSR metadata and dynamic reconciliation; map these before replacing presentation.
Foundation explicitly requires native radio/checkbox/input anatomy, so reuse must
preserve that semantic requirement rather than swapping in nonnative radio roles.
Button/KeyHint and text/selection recipes remain shared; no local action/shortcut
paint. Those source/design gates were resolved before the Questionnaire repair; see its implementation record for the current evidence.

### Scroll area implementation and early review

Completed custom tracks around the preserved native viewport, shared both-axis controller, independent visibility/retention, RTL, proportional geometry, corner, threshold markers, pointer capture and snap cleanup, canonical shared-theme recipe and authored docs/stories. Early integration gate passed. Real Chrome keyboard, midpoint track click and thumb drag pass; native wheel/touch/cancellation tooling unavailable, remaining matrix active.

### Resizable panel group implementation

Replaced fixed equal-position handles with actual Group/Panel/Handle constituents, shared constraint solver and atomic ControllableState lane. Added mixed units/bounds/collapse/disabled policies, identity persistence, correct keyboard/RTL/ARIA, capture/cursor cleanup, optional source handle decoration and authored nested/controlled/collapsible examples. Native legacy direct-child panels reuse that same owner. Early integration passed; browser evidence and remaining gates in resizable-panel-group record.

### Data visualization and Questionnaire integration

Data Visualization now uses an external renderer adapter, one series metadata resolver, actual Tooltip inspection, responsive dimensions and complete native Table composition. Chrome63 confirmed pointer/keyboard payload parity, symmetric popup inset, theme-only paint changes retaining data/payload/legend/mark identity, one mount across resize, and destruction/reconnection cleanup. Questionnaire now shares atomic ControllableState ownership, native answer semantics, Button/KeyHint and shared text/selection recipes. Cardinality changes clear discarded owned choices; submission waits for native serialization. Component matrices retain specific remaining gaps.

2026-10-04 regression batch: TypeScript passed. Full unit run279/281; remaining two were stale arrow fixture dataset and a Storybook source guard that rejected necessary viewport dimensions. Fixed those and reran their20 assertions successfully. ESLint found one now-unused grouped-file import, removed. This is static/state evidence, not a visual completeness claim. Removed residual malformed Combobox tags in catalog/fixtures, renamed query verification fixture to `tests/fixtures/components/select-query/`, and updated shared anchored-surface docs to Menu context invocation.

Shared regression2026-10-04: actualChrome58 Learn click→Tools hover switches toTools/Editor+Inspector; popupcenter701.289 equalsToolscenter701.625 withinrounding,9.5px separation. Chrome60 largeSelect actualEnd focusesCountry100 atscrollTop3008.5; pointerhoverCountry98 retains scrollTop3008.5. Chrome63 firstTeamhover and returnedhover afterclick/Escape match; visibleAvatars center onrailx28.898, matching4collapsibleiconcenters.

## Current delivery status

All requested control workstreams have implementation and authored documentation, with shared-owner regression evidence. The historical findings above describe the starting defects. [Verification results](verification-results.md) and the reconciled per-workstream scenario tables supersede earlier pending-execution notes. Native input, OS media and SSR/runtime limitations remain explicit blocked verification; no universal conformance claim is made.

## Whole-library continuation

The active objective requires the entire library, including remaining Foundation/composition exposure. Earlier implementation-delivered statements apply to the listed-control batch, not completion of that objective. Current source review confirms Meter, NumberField, Toolbar and free-text Autocomplete need independent coverage; CSP provider applicability also requires resolution. Meter now shares numerical normalization with Progress and exposes an unstyled Foundation controller. Remaining gaps and complete catalog/constituent evidence remain active. The live audit map still references the stale61 catalog count and Autocomplete-to-Combobox destination; reconcile these against the authorized identity removals rather than using either stale count as completeness proof.

The current manifest at coverage-manifest.json enumerates38 Foundation entries and268 rendered parts from the freshly read AppendixA.3, plus60 current catalog controls parsed from src/catalog.ts. Entries remain pending until each part/capability has implementation and current evidence; enumeration is not a pass. Meter has its own completed Foundation record, while the overall goal remains active.


Toolbar continuation2026-10-04: Foundation ToolbarController now coordinates actual Button/Input/Separator/Group through existing CollectionRegistry and one shared composite context; no new catalog control, paint or child value owner. Source/built real keyboard, caret boundaries, disabled editing/forms, removal/disposal, shadow slot order and Menu trigger composition pass.62 focused shared-consumer assertions, types/lint and both builds pass. A real hover audit found the existing mandated dark default Button formula yields3.8:1 contrast. The formula is explicitly required by ucl16-button; exact shared correction is proposed in toolbar/hover-contract-gap.md and awaits the user decision. Toolbar presentation/accessibility completion remains blocked on that conflict; NumberField and other whole-library work remain active.

NumberField continuation2026-10-04: Foundation numeric composition now binds the existing Input/Field lifecycle, actual InputGroup/Button/Icon, shared LocaleService/ControllableState, press-and-hold policy and captured scrub/cursor lifecycle. Source/built Chrome verifies locale entry/canonical forms, cancellation (including no replay after unrelated option updates), keyboard/step clicks, reset/restore, disabled fieldsets, external form/reference cleanup, horizontal/vertical scrub and removal during drag.65 focused tests passed; the final numerical cancellation regression reran16 tests. Types, focused lint, production and Storybook builds pass; axe0 in inspected light/dark states. NumberField record remains blocked on unsupported native hold/wheel/touch/IME/media evidence, without reducing implementation. Whole-library goal remains active: free-text Autocomplete, CSP applicability and remaining catalog capability coverage still require work.

Content-security continuation2026-10-04: Foundation ContentSecurityService now owns nearest scoped nonce/suppression policy. Every existing runtime style generator consumes GeneratedStyleResource, preserving CSS declarations, Lit boundaries and consumer sheets. Initial geometry now uses existing bindPart CSSOM transport across affected controls. Strict built Chrome passes nonce/suppression, native typing/selection/forms, portaled Select, Toast, NavigationView, actual resize drag, adoption and cleanup; focused26 tests/types/lint/builds pass. Complete service gate record passes. Source Vite injection and axe temporary-style behavior are documented separately. Free-text Autocomplete and remaining catalog capability audits remain active.
