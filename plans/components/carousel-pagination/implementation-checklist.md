# Component implementation and evidence record

## Delivery and source record
- Requested work / claim: repair Carousel pagination overlapping the slide border; bounded shared-layout fix.
- Scope source: user screenshot and request during Drawer merge.
- Live authority: fresh direct MCP Library ucl21-carousel at current candidate; Foundation sec-187-carousel read this session. Navigation footer default, inside/outside choices, public controls/indicator hooks and shared Button/Progress owners retained.
- Sources: local external/ui Base carousel.tsx -> Button -> style-vega.css; local Carousel owned indicators extend that reference under its live contract. No upstream pagination markup is substituted.
- Baseline: current Drawer merge working tree preserved. Historical Carousel drag and complete-component gaps remain in its original checklist.
- Reproduction: Chrome87 default story with indicators:bullets. viewport bottom384px, dot region top377.60/bottom384: dots sit on the card border. Shared styles absolute-inset controls and align-self:end cause this.
- Evidence: tmp/component-verification/carousel/pagination/; own Chrome Storybook page87.

## Capability and interface mapping
| ID | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Outside pagination has separate flow space; arrows remain centered on viewport | ucl21-carousel | base/ui/carousel.tsx Previous/Next; styles/style-vega.css | Carousel styles root/controls grid with shared rows; indicator gap in recipe | docs/carousel.md navigation | V-01 | passed | Chrome geometry and screenshot verified |
| C-02 | Both axes, RTL, absent arrows, optional/custom indicators and inside/footer unchanged | ucl21-carousel | local indicator renderer and reference orientation arrows | Preserve nodes, slots, handlers and parts | docs/carousel.md | V-02 | passed | Verified below |
| C-03 | Bullets/fraction/progress, keyboard actions and customization | ucl21-carousel; Button/Progress | Existing public controls | No replacement controls or new API | existing docs | V-03 | passed | Verified below |

## Architecture and reuse
- Existing Carousel owns all layout; shared recipe owns spacing. No demo edits.
### Family dependency map
| Responsibility | Upstream dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| --- | --- | --- | --- | --- |
| navigation | CarouselPrevious/Next -> Button | tp-carousel -> tp-button | Same owners/handlers; only control layout | Carousel docs and both axes V-01,V-02 |
### Presentation source map
| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| --- | --- | --- | --- | --- | --- |
| previous/next | Base/Vega | cn-carousel-previous/next absolute outside viewport | Carousel styles, real Button | Keep edge-centered positions | V-01,V-02 |
| indicators | Library Carousel extension | existing .indicators | carousel-indicator and placement-outside recipe | Separate row below horizontal viewport / column beside vertical viewport, space-3 gap | V-01,V-03 |
### Implementation and composition reuse map
| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| --- | --- | --- | --- | --- |
| existing numbered examples | cards/actions/progress | tp-card/tp-button/tp-progress | V-01,V-03 | Decorative nonclickable dots remain native spans |

## Verification scenarios
| ID | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V-01 | C-01 visual | Horizontal outside bullets, source screenshot then fixed geometry | Indicators below card with positive gap, arrows at viewport center | Dot gap9.59px, arrows unchanged; dark screenshot inspected | Chrome87 | passed | Verified below |
| V-02 | C-02 layout | Both axes/RTL/narrow, each placement, missing navigation | No border overlap or placement regressions; no empty gap without indicators | 12 combinations: both axes, LTR/RTL, outside/inside/footer at390x844. Outside gap9.59px; arrows centered; no pagination adds no row. Dark desktop and light narrow screenshots inspected | MCP | passed | Verified below |
| V-03 | C-03 behavior/customization | All indicator types, custom slot, click/keyboard, spacing override | Stable centered region and working public controls | Bullet/fraction/progress in both axes; custom slot gap9.59px; missing arrows stays centered; token override20px. Trusted click on3 and Tab/Enter on4 commits index3. Axe0 violations/0 incomplete for clickable and nonclickable dots. 43 focused tests; tsc/lint/stylelint/build/Storybook pass | MCP + focused tests/lint/typecheck/build | passed | Verified below |

## Early integration checkpoint
| ID | Check | Status | Evidence / unresolved finding |
| --- | --- | --- | --- |
| I-01 | Existing owners retained | passed | Only existing structural styles and recipe changed; same Button/Progress rendering. |
| I-02 | Default source placement | passed | Chrome87 fixed dot top393.59 versus viewport bottom384; 9.59px shared gap, arrows still centered y224. |
| I-03 | Optional regions | passed | Public indicators off/bullets/fraction/progress toggle inspected through actual component. |

## Gate record
| Gate | Status | Required exit evidence / remaining work |
| --- | --- | --- |
| 0. Sources and scope | passed | Source and supplied screenshot reproduced |
| 1. Capability mapping | passed | Placement/axis/optional regions mapped |
| 2. Architecture and composition reuse | passed | Existing control styles and recipe; unchanged behavior owners |
| 3. Behavior | passed | V-03 |
| 4. Presentation and customization | passed | V-01,V-03 |
| 5. Accessibility | passed | Existing controls keyboard/tree regression |
| 6. Visual and interaction inspection | passed | V-01,V-02 |
| 7. Documentation and demo reuse | passed | Clarify placement; unchanged real controls |
| 8. Regression and reconciliation | passed | Checks and record |

## Documentation synchronization
- Existing API unchanged; navigation placement description to clarify outside row.
## Completion / handoff
- Shared outside layout now reserves pagination space on the cross-axis; arrows retain viewport alignment and RTL direction. No demo layout fix.
- Axe exposed pre-existing invalid aria-label on noninteractive dot spans. Added image semantics to retain their position names; clickable Button semantics unchanged. Both dot modes now axe0/0.
- Local evidence: tmp/component-verification/carousel/pagination/{tests,build,storybook}.log; Chrome87 source Storybook screenshots and geometry. No screenshots saved to disk; MCP images inspected inline.
- Scoped pagination fix only; earlier Carousel drag/conformance gaps remain in the original Carousel record.
