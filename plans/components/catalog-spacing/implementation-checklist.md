# Catalog spacing and Slider usage evidence

## Delivery and source record

- Requested work / claim: Catalog-wide spacing normalization and complete Slider usage documentation.
- Scope source: User explicitly requested full catalog spacing review and all Slider usages.
- User scope: review the complete catalog's use cases; normalize spacing in controls and shared presentation, not local demo patches. Latest steering: expose all Slider usages.
- Preserve staged Message Scroller/Bubble work and other uncommitted changes; no index changes.
- Fresh direct Spec Blocks reads: Foundation doc_cd3c4721-9f9b-4531-abab-a8bfdbac75f1 and Library doc_8077bf7c-0361-48f3-ac87-53b983bd89b3; head 8440bff24a97dbbc5c762ebf4bd6baa958b305e1. Presentation §§5.3,5.3a,5.5,6.5 distinguish dictionary spacing from structural arrangement. Slider sec-148-slider/ucl17-slider; public Label/Output already exist.
- Local source: external/ui base Slider and examples/slider-{range,multiple,vertical,controlled,disabled,rtl}; Base/Nova slider recipe; MessageScroller Base/Rhea composition. Existing local catalog, presentation definitions, recipes and all story spacing declarations audited.
- Chrome MCP page67 source fixture; existing localhost:5173 and localhost:6006. No alternate browser driver. Evidence is local under tmp/component-verification/catalog-spacing.
- This spacing/docs review does not certify all unrelated component behaviors; previous Slider checklist has older unresolved conformance rows.

## Capability and interface mapping

| ID | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Catalog spacing ownership: all controls, constituent regions and use cases | Library 5.3a,6.5 | registry/bases/base/ui; style-nova/rhea | Existing dictionary and structural owners; no new spacing API | styling.md; catalog inventory | V-01,V-03 | pending | Source inventory then full rendered catalog |
| C-02 | Slider optional Label/Output, safe separation, wrapping and both orientations | ucl17-slider; sec148 | Slider Label/Value; base slider-controlled | Existing slider-output slot/contract; output-only inline arrangement with dictionary gap | slider.md | V-02,V-03 | passed | Shared spacing, default/explicit vertical extent, RTL and replacement gap verified |
| C-03 | Slider usages: scalar/range/multiple, controlled, precision/format, disabled/readOnly/Thumb disabled, collision, alignment, RTL, forms, customization | sec148; existing public contracts | Slider Root/Control/Thumb and local base docs/examples | Actual Slider/Thumb/Field/Form and public contracts | slider.examples.ts; slider.md | V-02,V-04 | passed | 23 copyable live examples and complete existing API reference |
| C-04 | No spacing patches in demos for component-owned relationships | Library composition and presentation | Card/InputGroup/Bubble/Empty/Slider constituents | Existing slots and part recipes; retain only application geometry | styling.md | V-01,V-03 | pending | Audit every story declaration and nested role |

## Architecture and reuse

Keep numeric behavior in Slider Root and thin Thumb. Value text belongs to slider-output, not a sibling output. Structural rules choose arrangement; dictionary rules select gaps/padding. Slot flattening must preserve native semantics and component identity. Component-owned prose/action regions establish their own spacing; page/gallery spacing remains application geometry and is documented separately.

### Family dependency map

| Responsibility | Upstream dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| --- | --- | --- | --- | --- |
| Slider anatomy/value | Base Slider Root, Label, Value, Control, Thumb | slider.ts/styles.ts; recipes/slider.ts | Existing optional Output used for inline readout; no new property | Slider docs, MessageScroller context / V-02,V-03 |
| Section/action spacing | base Card/InputGroup/Empty/Bubble -> styles | presentation/default.ts and recipes; real slots | Remove local padding/gap substitutes; repair actual layout owners | Catalog cases / V-01,V-03 |
| Density ownership | style-nova/rhea gap/padding tokens | dictionary/resolver/controller | Move remaining visual spacing out of component CSS into corresponding recipes | Catalog/custom dictionary / V-03 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| --- | --- | --- | --- | --- | --- |
| Slider label/value/control | base/Nova | slider and controlled example, cn-slider | sliderAppearance, sliderStyles | Optional output uses same owner; output-only inline, label+output header, token gap with endpoint clearance | V-02,V-03 |
| Container regions/actions | base/Nova and MessageScroller Rhea | Card, InputGroup, Empty, Bubble composition | Actual public parts and recipes | Shared density, no theme-specific demo padding; logical layout/wrapping | V-01,V-03 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| --- | --- | --- | --- | --- |
| Slider usages | field, action, values and thumbs | tp-field, tp-form, tp-button, tp-slider, tp-slider-thumb | V-02,V-04 | Output is actual Slider public part; form results native output |
| Context peek | formatted readout | slider-output part contract | V-02,V-03 | No separate control recreation |
| Catalog | all 61 catalog identities | existing examples and actual public controls | V-01,V-03 | Native page layouts remain application-owned |

## Verification scenarios

| ID | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V-01 | C-01,C-04; source coverage | Every catalog identity, recipe and story declaration | Explicit spacing owner/classification for every use case | 61 identities and all authored example sources inventoried; shared fixes and retained application geometry recorded | catalog-inventory.md | passed | No new spacing API |
| V-02 | C-02,C-03; behavior | Real keys/pointer in Slider examples; optional parts and forms | Correct values/labels/outputs/serialization, no local gaps | Trusted keys across 18 use cases; form save/reset, dynamic membership and canceled proposals passed. Fine-step trusted drag 40→95.7, then ArrowRight→95.8; Output agrees | Chrome MCP pages71/74; details below | passed | Finite tool drag is not sustained manual-drag profiling |
| V-03 | C-01,C-02,C-04; presentation | Full catalog, light/dark,narrow/RTL, alternate spacing/dictionary | Spacing scales through owning recipes; no overlap/overflow | All230 cases passed document-overflow checks in both environments; changed owners inspected separately | local desktop-audit.json/narrow-audit.json; Chrome geometry/screenshots | pending | Full catalog visual/interaction inspection is not implied by overflow results |
| V-04 | C-03; docs/regression | Docs renders examples, source compile, targeted/full tests/build | Actual/copyable code agrees and checks pass | 23 actual-component usage examples, shared copyable setup, tsc and changed-file lint passed; library/Storybook builds passed; 517 unit tests passed | local tests.log/build.log/storybook.log; Chrome fixture | passed | Tests are independent of browser evidence |

## Early integration checkpoint

| ID | Check | Status | Evidence / unresolved finding |
| --- | --- | --- | --- |
| I-01 | Shared owners actually used | passed | Slider recipes select gap; structural CSS only arranges actual Label/Output/Control; demo peek wrapper removed |
| I-02 | Source and shared presentation match | passed | Chrome page67 shared Output reads 64px, visible endpoint clearance 8px vs previous 1.6px. Page71 screenshot reviewed label/output and range examples in dark theme |
| I-03 | Independent constituent options work | passed | Page71 AX/native DOM show optional Label/Output and vertical/range/explicit Thumb variants; Field resolver corrected to preserve owning Field name |

## Gate record

| Gate | Status | Required exit evidence / remaining work |
| --- | --- | --- |
| 0. Sources and scope | passed | Fresh direct specifications, local source and complete requested boundary recorded |
| 1. Capability mapping | passed | Catalog spacing and full supported Slider usage mapped; no API additions |
| 2. Architecture and composition reuse | passed | Existing dictionary/structure/constituent owners mapped above |
| 3. Behavior | pending | Live interaction checks |
| 4. Presentation and customization | pending | Shared spacing and alternate dictionary checks |
| 5. Accessibility | pending | Native keys/tree/axe |
| 6. Visual and interaction inspection | pending | Complete catalog and Slider usage matrix |
| 7. Documentation and demo reuse | passed | Existing API reconciled, 23 distinct usages, shared setup and real library components |
| 8. Regression and reconciliation | pending | Checks/build and final inventory |

## Documentation synchronization

Slider docs reconcile existing Root/Thumb APIs, properties/attributes, events, parts, forms and 23 usage examples. Added explicit precision/drag guidance and a fine-step example after the user identified coarse snapping on wide tracks. Styling docs explain ownership of composition spacing. All setup is shared with copyable source and uses actual library controls.

## Completion / handoff

Work in progress. No full-library conformance claim.

### Slider defects reported during the usage review

User screenshot shows vertical track/range absent with positioned thumbs. Chrome page71 confirms Control height128px but Track and Range height0: percentage height inside an auto-sized flex column cannot resolve from min-height. Repair Track's structural fill against Control, leaving thickness in the dictionary; no demo height. Pointer lag remains under investigation: trusted drag on the plain usage fixture painted accepted value98 in the next frame (~3ms). This does not reproduce the user's sustained manual drag or clear the interaction requirement. Ask which example and inspect Storybook controlled synchronization separately.

Resolution: the vertical Track now fills Control using absolute block insets. Both vertical usages have128px Track height and correctly aligned Range/Thumbs with no consumer sizing. The existing geometry fixture gained a meaningful auto-height regression; all16 geometry assertions pass, including explicit240px height, RTL, scaled geometry, measured edge alignment and custom Thumb dimensions.

The user subsequently identified coarse step snapping as the likely delay. Actual Docs travel is938px for0–100/step1: approximately9.38px per interval; the step5 range spans46.9px per interval. Added step0.1/largeStep1 example and documented the tradeoff without changing core value semantics. A trusted drag on that example accepted95.7 at the next measured animation frame (0.1ms in that finite tool gesture); ArrowRight produced95.8 in both value and Output. No timing debounce, animation or speculative core interaction change was introduced. Sustained manual timing has not been reproduced.

Additional Slider verification: existing fixture suites passed Core8, Controlled7, Constraints10, Composition5, Forms7, Parts16, Constituents6, Field12, Environment6 and copied snippet2 assertions. Trusted form Save serialized budget41 and Reset restored40; dynamic Thumb add/remove produced[25,75] then[25]; rejected End retained60 without a false commit. Axe across all23 usage examples found0 violations and one incomplete color-contrast check on the nested Field Label. Manual computed-color check found rgb(24,24,27) on white; no contrast defect. This is not a screen-reader test.

Slider spacing customization: changing the root spacing seed scales shared gap12.8px→19.2px; public part gap override reaches25.6px without replacing the component. Output-only endpoint clearance is8px instead of1.6px. Broader catalog gates remain pending; this record does not certify unrelated component conformance.
