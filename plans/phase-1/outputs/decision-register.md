# Decision Register

Authoritative source: UI Library project `prj_c5a403a0-d1d5-4487-ac78-f4e545f46483`, version **0.2.62**. Source references use live MCP numbering.

## Fixed project constraints

- TypeScript, Vite, and CSS.
- LitElement for every web component.
- Storybook for documentation and observable review.
- TypeScript and CSS linting.
- Visible styling and animation demonstrations with contract checks.

## Decisions required for Phase 1

<a id="dec-001"></a>
### DEC-001 — Final conformance targets

| Field | Record |
| --- | --- |
| Question | Which final conformance classes should this delivery target? |
| Category | scope |
| Source or user instruction | UI Foundation §1.1; UI Component Library §1.2; user selected complete coverage for both layers. |
| Affected contract IDs | CON-003, CON-190 |
| Decision owner | User |
| Status | decided |
| Decision deadline | Before P1-02 contract selection |
| Work blocked until decided | Final inclusion and exclusion of Foundation and catalog contracts |
| Outcome with rationale | Target Complete library for both specifications while limiting incremental claims to capabilities actually verified. |

<a id="dec-002"></a>
### DEC-002 — Appendix F extensions

| Field | Record |
| --- | --- |
| Question | Should the four retained Appendix F extensions be delivered? |
| Category | scope |
| Source or user instruction | UI Foundation §26.1 permits their omission; user selected exclusion. |
| Affected contract IDs | CON-185 |
| Decision owner | User |
| Status | decided |
| Decision deadline | Before P1-02 contract selection |
| Work blocked until decided | Extension coverage and evidence obligations |
| Outcome with rationale | Exclude the four retained extensions while fulfilling every other obligation in their containing contracts. |

<a id="dec-003"></a>
### DEC-003 — Optional inner-list compatibility

| Field | Record |
| --- | --- |
| Question | Should the separately optional inner-list offset compatibility capability be included? |
| Category | scope |
| Source or user instruction | UI Foundation §19.10 and UI Foundation §22.9; user selected exclusion. |
| Affected contract IDs | CON-140, CON-177 |
| Decision owner | User |
| Status | decided |
| Decision deadline | Before P1-02 contract selection |
| Work blocked until decided | Final scope and ledger reconciliation |
| Outcome with rationale | Exclude the optional compatibility capability and preserve its explicit ledger disposition. |

## Decisions assigned to later phases

<a id="dec-004"></a>
### DEC-004 — Supported host environments

| Field | Record |
| --- | --- |
| Question | Which browser, document, shadow-tree, direction, locale, and form environments will the implementation support? |
| Category | implementation choice |
| Source or user instruction | UI Foundation §4.5; UI Component Library §4.2 |
| Affected contract IDs | CON-013, CON-196 |
| Decision owner | Implementation engineer |
| Status | scheduled |
| Decision deadline | Before Phase 2 architecture completion |
| Work blocked until decided | Host adapters, support matrix, and environment-specific verification |
| Outcome with rationale | No value selected in Phase 1; the specifications define ownership boundaries but do not choose the supported environment set. |

<a id="dec-005"></a>
### DEC-005 — Web-component integration and public API shape

| Field | Record |
| --- | --- |
| Question | How will LitElement hosts expose Foundation state, properties, events, form participation, and custom-element names? |
| Category | implementation choice |
| Source or user instruction | UI Foundation §4 and UI Component Library §8 |
| Affected contract IDs | CON-009–CON-013, CON-219–CON-225 |
| Decision owner | Implementation engineer |
| Status | scheduled |
| Decision deadline | Before Phase 2 architecture completion |
| Work blocked until decided | Public TypeScript interfaces and component host implementation |
| Outcome with rationale | Preserve Foundation behavior and Component definition invariance; choose concrete APIs in Phase 2. |

<a id="dec-006"></a>
### DEC-006 — Rendering and style containment

| Field | Record |
| --- | --- |
| Question | Which render-root, slot, structure, and style-containment strategy will implement the public parts and presentation merge? |
| Category | implementation choice |
| Source or user instruction | UI Foundation §4.4; UI Component Library §7 and UI Component Library §9 |
| Affected contract IDs | CON-012, CON-213–CON-218, CON-226–CON-230 |
| Decision owner | Implementation engineer |
| Status | scheduled |
| Decision deadline | Before Phase 2 architecture completion |
| Work blocked until decided | Part exposure, slot publication, and presentation application |
| Outcome with rationale | The architecture must preserve semantic hosts, delegation, part slots, and consumer-terminal presentation. |

<a id="dec-007"></a>
### DEC-007 — Toolchain and verification packages

| Field | Record |
| --- | --- |
| Question | Which package versions and test, browser, visual-review, and lint tools will implement the required workflow? |
| Category | implementation choice |
| Source or user instruction | User-established Vite, Storybook, TypeScript, CSS, and lint constraints; UI Foundation §20; UI Component Library §25 |
| Affected contract IDs | CON-149–CON-154, CON-345 |
| Decision owner | Implementation engineer |
| Status | scheduled |
| Decision deadline | Before Phase 3 tooling setup |
| Work blocked until decided | Reproducible build, lint, browser, accessibility, and visual checks |
| Outcome with rationale | Phase 1 defines evidence obligations without selecting packages or versions. |

<a id="dec-008"></a>
### DEC-008 — Presentation inputs

| Field | Record |
| --- | --- |
| Question | Who supplies the token set, presentation dictionary, icons, concrete visual values, and motion inputs? |
| Category | consumer input |
| Source or user instruction | UI Component Library §5, UI Component Library §6, UI Component Library §14, and UI Component Library §15 |
| Affected contract IDs | CON-198–CON-212, CON-260–CON-274 |
| Decision owner | User as presentation-input owner, or an explicitly delegated designer |
| Status | scheduled |
| Decision deadline | Before Phase 5 presentation implementation |
| Work blocked until decided | Concrete styling, iconography, motion values, and visible Storybook examples |
| Outcome with rationale | The specification defines contracts and invariants but intentionally does not invent a theme or consumer-owned values. |

<a id="dec-009"></a>
### DEC-009 — Visual-review baselines

| Field | Record |
| --- | --- |
| Question | Which supported viewports, modes, directions, states, and motion conditions form the visible Storybook review baseline? |
| Category | implementation choice |
| Source or user instruction | UI Component Library §11, UI Component Library §15, and UI Component Library §25 |
| Affected contract IDs | CON-236–CON-274, CON-275–CON-345 |
| Decision owner | Implementation engineer with user approval of presentation inputs |
| Status | scheduled |
| Decision deadline | Before the first Phase 5 visible-contract completion claim |
| Work blocked until decided | Repeatable visual review and catalog-wide presentation evidence |
| Outcome with rationale | Cover every supported observable state and lifecycle condition without defining visual values in Phase 1. |
