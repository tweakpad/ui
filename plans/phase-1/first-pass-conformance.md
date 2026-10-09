# First-pass conformance repair record

Status: implementation in progress, not a completed 62-control conformance audit.

Authority: live Foundation and Component Library project `prj_c5a403a0-d1d5-4487-ac78-f4e545f46483`.
Specification vocabulary corrections committed as `8440bff2`, version `0.3.14`.
The authoring skill constrained those changes to the agreed framework-neutral contracts.
No specification requirement is waived by an implementation limitation below.

## Shared implementation

- `src/presentation/components.ts` records the 62 catalog identities, ordered axes/defaults, public part keys, and source nodes. Toast Manager/Provider are non-rendered services, not duplicate parts named “none”.
- `resolveComponentPresentation` is pure and retains declaration order. Missing keys are reported and do not resolve from a fallback dictionary.
- `setPresentationDictionary` updates connected instances in place. `partPresentation` applies terminal class/style hooks; compounds use `setPartComposition` before those hooks.
- Default paint is migrated for Button, Card, Toggle, and parts of Collapsible, Badge, Bubble, ListItem and Table. **This is not a complete presentation migration.** Other controls still retain component CSS. Category coverage and cross-shadow registered-part styling remain incomplete.
- No new treatment was invented for Bubble subdued/tinted or ListItem subdued. Those dictionary keys intentionally remain missing.

## Per-control ledger

“Catalog only” means its live definition was read and recorded; it does not claim implementation conformance. R1–R7 are the approved repair groups; P is the shared-presentation task.

| ID | Control / live node | Task | Implemented or inspected | Outstanding / deferred |
| --- | --- | --- | --- | --- |
| FP-01 | Accordion (`ucl16-accordion`) | R1 | Contract now records existing four variants and plain default; behavior unchanged. | Remaining: migrate boundary recipes and cross-shadow dictionary overrides. |
| FP-02 | Button (`ucl16-button`) | R1 | Shared base/variant/size dictionary; existing activation preserved. | Remaining: move mark geometry and focus paint out of component styles. |
| FP-03 | Checkbox (`ucl16-checkbox`) | R2 | Consumer-owned indeterminate preserved; visible focus/invalid affordance. | Remaining: presentation migration and full form-state browser matrix. |
| FP-04 | Collapsible (`ucl16-collapsible`) | R1 | Trigger/content paint and padding now dictionary-backed; layout and motion preserved. | Remaining: spacing and cross-shadow override completion. |
| FP-05 | Radio group (`ucl16-radio-group`) | P | Catalog only; existing implementation retained. | Shared migration, actual API/default/parts/state/override/docs review remain. |
| FP-06 | Switch (`ucl16-switch`) | R2 | Size geometry and logical thumb travel repaired. | Remaining: move geometry/paint recipes to dictionary. |
| FP-07 | Tabs (`ucl16-tabs`) | R2 | Underline vocabulary, orientation layouts, value-based panel pairing, non-overwriting click listener. | Remaining: part registration, dictionary migration, dynamic/duplicate-value audit. |
| FP-08 | Toggle (`ucl16-toggle`) | R2 | Ghost/outline and size dictionary recipes; compound selection ownership seam. | Remaining: form default and composed focus matrix. |
| FP-09 | Toggle group (`ucl16-toggle-group`) | R2 | Actual Toggle members, group style precedence, zero-spacing seams. | Remaining: explicit member-property restoration and removal-focus tests. |
| FP-10 | Calendar (`ucl17-calendar`) | P | Catalog only; existing implementation retained. | Deep behavior rebuild deferred by plan; shared migration and conformance review remain. |
| FP-11 | Field (`ucl17-field`) | P | Catalog only; existing implementation retained. | Shared migration, actual API/default/parts/state/override/docs review remain. |
| FP-12 | Form (`ucl17-form`) | P | Catalog only; existing implementation retained. | Shared migration, actual API/default/parts/state/override/docs review remain. |
| FP-13 | Input (`ucl17-input`) | P | Catalog only; existing implementation retained. | Shared migration, actual API/default/parts/state/override/docs review remain. |
| FP-14 | Input group (`ucl17-input-group`) | R3 | Single editor diagnostic; boundary/focus; four addon placements; inherited action updates. | Remaining: native/action property-only ownership and reconnect matrix. |
| FP-15 | One-time code field (`ucl17-one-time-code`) | P | Catalog only; existing implementation retained. | Shared migration, actual API/default/parts/state/override/docs review remain. |
| FP-16 | Native select (`ucl17-native-select`) | R7 | Small field size and logical indicator alignment; existing chevron. | Remaining: dictionary migration. |
| FP-17 | Questionnaire (`ucl17-questionnaire`) | P | Catalog only; existing implementation retained. | Deep behavior rebuild deferred by plan; shared migration and conformance review remain. |
| FP-18 | Slider (`ucl17-slider`) | P | Catalog only; existing implementation retained. | Deep behavior rebuild deferred by plan; shared migration and conformance review remain. |
| FP-19 | Text area (`ucl17-textarea`) | P | Catalog only; existing implementation retained. | Shared migration, actual API/default/parts/state/override/docs review remain. |
| FP-20 | Select (`ucl18-select`) | R4 | Native button trigger, aligned icon, positioning/presence/outside dismissal, disabled-index fix, readonly inspection. | Remaining: typeahead, nested overlay and pointer-mode matrix; multiple/chips/virtualization deferred. |
| FP-21 | Combobox (`ucl18-combobox`) | R4 | Editable input retained; shared popup lifecycle and filtered index fixes. | Remaining: composition/IME and nested overlay matrix; advanced modes deferred. |
| FP-22 | Command palette (`ucl18-command`) | R4 | Inherits popup/index repairs; command execution retained. | Remaining: complete behavior audit; no advanced command redesign. |
| FP-23 | Alert dialog (`ucl19-alert-dialog`) | P | Catalog only; existing implementation retained. | Shared migration, actual API/default/parts/state/override/docs review remain. |
| FP-24 | Dialog (`ucl19-dialog`) | P | Catalog only; existing implementation retained. | Shared migration, actual API/default/parts/state/override/docs review remain. |
| FP-25 | Drawer (`ucl19-drawer`) | P | Catalog only; existing implementation retained. | Shared migration, actual API/default/parts/state/override/docs review remain. |
| FP-26 | Preview card (`ucl19-preview-card`) | R6 | Listener ownership and delayed-open cleanup. | Remaining: owner-window timers, target replacement, safe-corridor coverage. |
| FP-27 | Popover (`ucl19-popover`) | R6 | Property-driven dismissal lifetime, non-overwriting trigger handler, positioning cleanup. | Remaining: complete portal/modal/tree and reconnect coverage. |
| FP-28 | Side panel (`ucl19-side-panel`) | P | Catalog only; existing implementation retained. | Shared migration, actual API/default/parts/state/override/docs review remain. |
| FP-29 | Tooltip (`ucl19-tooltip`) | R6 | Description tracks presence; Escape does not restore focus. | Remaining: description cleanup on trigger replacement/disconnect. |
| FP-30 | Breadcrumb (`ucl20-breadcrumb`) | P | Catalog only; existing implementation retained. | Shared migration, actual API/default/parts/state/override/docs review remain. |
| FP-31 | Context menu (`ucl20-context-menu`) | R5 | Uses Menu behavior with point/keyboard anchors; target semantics preserved. | Remaining: touch hold, target reassociation, native context event keyboard geometry. |
| FP-32 | Menu (`ucl20-menu`) | R5 | Real trigger/closed popup; command/check/radio/link policies; hover and keyboard highlight. | Remaining: submenu safe corridors, full modal/tree policy, native part styling and detached triggers. |
| FP-33 | Menubar (`ucl20-menubar`) | R5 | Coordinates actual Menus; atomic proposal rejection preserves prior active menu. | Remaining: dynamic removal, explicit property ownership, hover transfer and teardown restoration. |
| FP-34 | Navigation menu (`ucl20-navigation-menu`) | R5 | Separated from command-menu inheritance; native links and normal Tab. | Remaining: list anatomy, disclosure value owner, hover delays, positioned content. |
| FP-35 | Pagination (`ucl20-pagination`) | P | Catalog only; existing implementation retained. | Shared migration, actual API/default/parts/state/override/docs review remain. |
| FP-36 | Avatar (`ucl21-avatar`) | R7 | Default size vocabulary normalized without extent change. | Remaining: dictionary/part migration and image-failure audit. |
| FP-37 | Carousel (`ucl21-carousel`) | P | Catalog only; existing implementation retained. | Deep behavior rebuild deferred by plan; shared migration and conformance review remain. |
| FP-38 | Data visualization (`ucl21-data-visualization`) | P | Catalog only; existing implementation retained. | Shared migration, actual API/default/parts/state/override/docs review remain. |
| FP-39 | Message scroller (`ucl21-message-scroller`) | P | Catalog only; existing implementation retained. | Deep behavior rebuild deferred by plan; shared migration and conformance review remain. |
| FP-40 | Progress (`ucl21-progress`) | P | Catalog only; existing implementation retained. | Shared migration, actual API/default/parts/state/override/docs review remain. |
| FP-41 | Resizable panel group (`ucl21-resizable-panels`) | P | Catalog only; existing implementation retained. | Deep behavior rebuild deferred by plan; shared migration and conformance review remain. |
| FP-42 | Scroll area (`ucl21-scroll-area`) | P | Catalog only; existing implementation retained. | Deep behavior rebuild deferred by plan; shared migration and conformance review remain. |
| FP-43 | Separator (`ucl21-separator`) | R7 | Decorative defaults true. | Remaining: dictionary/part migration. |
| FP-44 | Spinner (`ucl21-spinner`) | R7 | Token sizes functional; currentColor inheritance. | Remaining: dictionary/part migration. |
| FP-45 | Toast (`ucl21-toast`) | P | Catalog only; existing implementation retained. | Deep behavior rebuild deferred by plan; shared migration and conformance review remain. |
| FP-46 | Alert (`ucl22-alert`) | R7 | Removed side-accent border and floating shadow; announcement independent of severity; composed actions. | Remaining: canonical part and dictionary migration. |
| FP-47 | Aspect-ratio box (`ucl22-aspect-ratio`) | P | Catalog only; existing implementation retained. | Shared migration, actual API/default/parts/state/override/docs review remain. |
| FP-48 | Attachment (`ucl22-attachment`) | R7 | fileSize separated from visual size; emoji fallback removed; composed actions. | Remaining: canonical parts, dictionary migration and status semantics audit. |
| FP-49 | Badge (`ucl22-badge`) | R7 | Shared passive variant paints; default is primary; removed neutral/accent aliases. | Remaining: geometry migration and full declared anatomy. |
| FP-50 | Bubble (`ucl22-bubble`) | R7 | Alignment separated from fill; secondary baseline. | Remaining: reactions anatomy and dictionary geometry; subdued/tinted unresolved. |
| FP-51 | Button group (`ucl22-button-group`) | R1 | Public part-composition seams replace private inherited variables. | Remaining: member removal/reconnect and mixed-size cross-engine matrix. |
| FP-52 | Card (`ucl22-card`) | R1 | Shadow-only elevation, size spacing, canonical parts and dictionary paint; interactive shortcut removed. | Remaining: empty individual header-region geometry audit; whole-card activation unsupported. |
| FP-53 | Empty state (`ucl22-empty-state`) | P | Catalog only; existing implementation retained. | Shared migration, actual API/default/parts/state/override/docs review remain. |
| FP-54 | Icon (`ucl22-icon`) | P | Connected shared part adapter; canonical icon-graphic part. | Remaining: move host presentation into dictionary without changing standalone registration. |
| FP-55 | List item (`ucl22-list-item`) | R7 | Ghost/outline paints and densities; selected state no inferred activation. | Remaining: full declared anatomy/dictionary geometry; subdued unresolved. |
| FP-56 | Key hint (`ucl22-key-hint`) | P | Catalog only; existing implementation retained. | Shared migration, actual API/default/parts/state/override/docs review remain. |
| FP-57 | Label (`ucl22-label`) | P | Catalog only; existing implementation retained. | Shared migration, actual API/default/parts/state/override/docs review remain. |
| FP-58 | Marker (`ucl22-marker`) | P | Catalog only; existing implementation retained. | Shared migration, actual API/default/parts/state/override/docs review remain. |
| FP-59 | Message (`ucl22-message`) | P | Catalog only; existing implementation retained. | Shared migration, actual API/default/parts/state/override/docs review remain. |
| FP-60 | Skeleton (`ucl22-skeleton`) | P | Catalog only; existing implementation retained. | Shared migration, actual API/default/parts/state/override/docs review remain. |
| FP-61 | Table (`ucl22-table`) | R7 | Registered native parts replace ineffective shadow descendant selector. | Remaining: dynamic native-part override and registration cleanup matrix. |
| FP-62 | Navigation panel (`ucl23-navigation-panel`) | P | Catalog only; existing implementation retained. | Deep behavior rebuild deferred by plan; shared migration and conformance review remain. |

## Verification evidence

- Unit suite: 54 passing tests, including five new resolver/catalog checks.
- Focused browser script: `scripts/repair-browser-smoke.mjs`; 23 assertions passed in Chromium, Firefox and WebKit (dictionary identity/focus, shadow-only elevation, partial padding override, forms, choice indexes, menu policies/cancellation, Menubar rollback, InputGroup inheritance, native table cells).
- Existing Button browser contract passed in Chromium during migration; final cross-engine rerun pending.
- Full browser suite, package/stories checks and final lint/build are recorded at handoff; passing focused checks does not establish full conformance.
- Light/dark, narrow viewport, nested menus, portal branches, cleanup/reconnect, and complete public documentation still require their planned acceptance matrix.

## Scope guard

Do not use this ledger as authorization to add decoration, new convenience props, default icons, effects, or substitute controls. Complete the outstanding approved work from its live contracts and the reference components. Keep advanced-control rebuilds deferred. Do not label all 62 controls migrated or conformant while the entries above remain open.

