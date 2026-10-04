# Upstream identity reconciliation

Pinned revisions and source authority are recorded in `audit.md`. This inventory reconciles identities for the active whole-library objective. It does not certify capability parity from matching names. Existing working controls retain their shared owners while their actual contracts and evidence are audited.

| Upstream identity | Source catalogs | Tweakpad owner / disposition | Current authority and implementation evidence |
| --- | --- | --- | --- |
| accordion | Base UI, shadcn | tp-accordion | ucl16-accordion; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| alert | shadcn | tp-alert | ucl22-alert; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| alert-dialog | Base UI, shadcn | tp-alert-dialog | ucl19-alert-dialog; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| aspect-ratio | shadcn | tp-aspect-ratio | ucl22-aspect-ratio; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| attachment | shadcn | tp-attachment | ucl22-attachment; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| autocomplete | Base UI | Not an independent public identity | Select query owner covers searchable selection; free-input-only Autocomplete parity is not established |
| avatar | Base UI, shadcn | tp-avatar | ucl21-avatar; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| badge | shadcn | tp-badge | ucl22-badge; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| breadcrumb | shadcn | tp-breadcrumb | ucl20-breadcrumb; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| bubble | shadcn | tp-bubble | ucl22-bubble; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| button | Base UI, shadcn | tp-button | ucl16-button; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| button-group | shadcn | tp-button-group | ucl22-button-group; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| calendar | shadcn | tp-calendar | ucl17-calendar; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| card | shadcn | tp-card | ucl22-card; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| carousel | shadcn | tp-carousel | ucl21-carousel; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| chart | shadcn | tp-data-visualization | ucl21-data-visualization; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| checkbox | Base UI, shadcn | tp-checkbox | ucl16-checkbox; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| checkbox-group | Base UI | Foundation CheckboxGroupController | src/foundation/checkbox-group.ts; native group + tp-checkbox membership |
| collapsible | Base UI, shadcn | tp-collapsible | ucl16-collapsible; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| combobox | Base UI, shadcn | tp-select | ucl18-select; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls; user-requested identity consolidation, no compatibility tag retained |
| command | shadcn | tp-command-palette | ucl18-command; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| context-menu | Base UI, shadcn | tp-menu | ucl20-menu; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls; user-requested identity consolidation, no compatibility tag retained |
| csp-provider | Base UI | Foundation ContentSecurityService | Implemented shared policy/resource owner; source/built strict CSP, nonce/suppression, lifecycle and CSSOM checks in content-security/execution-evidence.md. No visual catalog identity. |
| dialog | Base UI, shadcn | tp-dialog | ucl19-dialog; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| direction | shadcn | Composed direction service | src/foundation/services.ts and TpElement.direction; inherited native dir |
| direction-provider | Base UI | Composed direction service | src/foundation/services.ts and TpElement.direction; inherited native dir |
| drawer | Base UI, shadcn | tp-drawer | ucl19-drawer; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| dropdown-menu | shadcn | tp-menu | ucl20-menu; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| empty | shadcn | tp-empty-state | ucl22-empty-state; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| field | Base UI, shadcn | tp-field | ucl17-field; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| fieldset | Base UI | Native fieldset + Field grouping | src/components/field/field.ts, docs/field.md; native fieldset semantics preserved |
| form | Base UI, shadcn | tp-form | ucl17-form; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| hover-card | shadcn | tp-preview-card | ucl19-preview-card; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| input | Base UI, shadcn | tp-input | ucl17-input; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| input-group | shadcn | tp-input-group | ucl17-input-group; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| input-otp | shadcn | tp-otp-field | ucl17-one-time-code; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| item | shadcn | tp-list-item | ucl22-list-item; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| kbd | shadcn | tp-key-hint | ucl22-key-hint; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| label | shadcn | tp-label | ucl22-label; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| marker | shadcn | tp-marker | ucl22-marker; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| menu | Base UI | tp-menu | ucl20-menu; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| menubar | Base UI, shadcn | tp-menubar | ucl20-menubar; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| merge-props | Base UI | Foundation mergePartProperties | src/foundation/part.ts; owned properties and cancellation merge |
| message | shadcn | tp-message | ucl22-message; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| message-scroller | shadcn | tp-message-scroller | ucl21-message-scroller; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| meter | Base UI | Foundation MeterController and meterState | sec-182-meter; src/foundation/meter.ts; shared numeric-range.ts consumed by Meter and existing Progress. Implementation and focused evidence in meter/implementation-checklist.md; no standalone catalog identity. |
| native-select | shadcn | tp-native-select | ucl17-native-select; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| navigation-menu | Base UI, shadcn | tp-navigation-menu | ucl20-navigation-menu; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| number-field | Base UI | Foundation controller implemented; native evidence gaps | NumberFieldController binds actual Input/Field/Button/InputGroup with locale parsing, numeric state, repeat/wheel/scrub and cursor lifecycle; source/built Chrome evidence in number-field record; hold/wheel/touch/IME evidence blocked |
| otp-field | Base UI | tp-otp-field | ucl17-one-time-code; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| pagination | shadcn | tp-pagination | ucl20-pagination; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| popover | Base UI, shadcn | tp-popover | ucl19-popover; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| preview-card | Base UI | tp-preview-card | ucl19-preview-card; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| progress | Base UI, shadcn | tp-progress | ucl21-progress; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| questionnaire | shadcn | tp-questionnaire | ucl17-questionnaire; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| radio | Base UI | tp-radio-group | ucl16-radio-group; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| radio-group | Base UI, shadcn | tp-radio-group | ucl16-radio-group; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| resizable | shadcn | tp-resizable-panel-group | ucl21-resizable-panels; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| scroll-area | Base UI, shadcn | tp-scroll-area | ucl21-scroll-area; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| select | Base UI, shadcn | tp-select | ucl18-select; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| separator | Base UI, shadcn | tp-separator | ucl21-separator; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| sheet | shadcn | tp-side-panel | ucl19-side-panel; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| sidebar | shadcn | tp-navigation-panel | ucl23-navigation-panel; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| skeleton | shadcn | tp-skeleton | ucl22-skeleton; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| slider | Base UI, shadcn | tp-slider | ucl17-slider; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| sonner | shadcn | tp-toast | ucl21-toast; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| spinner | shadcn | tp-spinner | ucl21-spinner; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| switch | Base UI, shadcn | tp-switch | ucl16-switch; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| table | shadcn | tp-table | ucl22-table; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| tabs | Base UI, shadcn | tp-tabs | ucl16-tabs; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| textarea | shadcn | tp-text-area | ucl17-textarea; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| toast | Base UI, shadcn | tp-toast | ucl21-toast; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| toggle | Base UI, shadcn | tp-toggle | ucl16-toggle; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| toggle-group | Base UI, shadcn | tp-toggle-group | ucl16-toggle-group; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| toolbar | Base UI | Foundation ToolbarController over actual Button/Input/Separator/Group | sec-176-toolbar; shared CollectionRegistry, composite control context and flattened focus traversal; source/built behavior verified. Shared Button hover contract conflict remains in toolbar/implementation-checklist.md. No new catalog identity. |
| tooltip | Base UI, shadcn | tp-tooltip | ucl19-tooltip; src/catalog.ts, src/register.ts, src/components/index.ts; component checklist/source map for changed controls |
| use-render | Base UI | Foundation renderPart/bindPart | src/foundation/part.ts; delegate/native anatomy/ref composition |

Base helper/provider exports are classified separately from visual controls. Shadcn registry duplicates across bases are deduplicated here without treating identical names as behavioral parity. The explicit remaining Foundation gaps above prevent a claim that the entire upstream union is complete. The active whole-library goal includes resolving those remaining mappings and their full behavior; they are not deferred by the earlier enumerated list.
