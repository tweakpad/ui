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
| C-02 | Slider optional Label/Output, safe separation, wrapping and both orientations | ucl17-slider; sec148 | Slider Label/Value; base slider-controlled | Existing slider-output slot/contract; output-only inline arrangement with dictionary gap | slider.md | V-02,V-03 | pending | No external value wrapper |
| C-03 | Slider usages: scalar/range/multiple, controlled, precision/format, disabled/readOnly/Thumb disabled, collision, alignment, RTL, forms, customization | sec148; existing public contracts | Slider Root/Control/Thumb and local base docs/examples | Actual Slider/Thumb/Field/Form and public contracts | slider.examples.ts; slider.md | V-02,V-04 | pending | Copyable live examples and API inventory |
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
| V-01 | C-01,C-04; source coverage | Every catalog identity, recipe and story declaration | Explicit spacing owner/classification for every use case | not run | inventory + source review | pending | Audit in progress |
| V-02 | C-02,C-03; behavior | Real keys/pointer in all Slider examples; optional parts and forms | Correct values/labels/outputs/serialization, no local gaps | not run | Chrome MCP | pending | Pending implementation |
| V-03 | C-01,C-02,C-04; presentation | Full catalog, light/dark,narrow/RTL, alternate spacing/dictionary | Spacing scales through owning recipes; no overlap/overflow | not run | Chrome MCP geometry/screenshots | pending | Pending implementation |
| V-04 | C-03; docs/regression | Docs renders examples, source compile, targeted/full tests/build | Actual/copyable code agrees and checks pass | not run | Chrome MCP/tsc/vitest/build | pending | Pending implementation |

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
| 7. Documentation and demo reuse | pending | API and curated examples/source |
| 8. Regression and reconciliation | pending | Checks/build and final inventory |

## Documentation synchronization

Pending Slider usage and catalog spacing documentation.

## Completion / handoff

Work in progress. No full-library conformance claim.
