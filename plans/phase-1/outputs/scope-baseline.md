# Scope Baseline

## Source baseline

- Authoritative source: UI Library project `prj_c5a403a0-d1d5-4487-ac78-f4e545f46483`, read through registered direct Spec Blocks MCP tools.
- UI Foundation Specification: `doc_cd3c4721-9f9b-4531-abab-a8bfdbac75f1`.
- UI Component Library Specification: `doc_8077bf7c-0361-48f3-ac87-53b983bd89b3`.
- Managed vocabulary: `managed:glossary`.
- Source version: **0.2.62**.
- Review date: **2026-09-15**.
- Execution authority: the Phase 1 execution plan in `library`, applied as requested by the user.
- Deliverable: MCP-referenced Phase 1 planning records for the engineers designing and implementing the library in later phases. This baseline makes no implementation-conformance claim.
- Requirements come from the two MCP documents and their managed vocabulary. No snapshot, upstream implementation, unrelated document, external documentation, or application supplies missing contracts.
- Live source verified through MCP: version **0.2.62**, HEAD `2736454610cbc099cc6d35a6c885a8a98cb9ea8e`, stateVersion `a1b84d73cefd236fa4c98749e590f9d3e98fe8bebfde010a380de1f1dcdf61a0`, clean candidate, zero diagnostics. ISS-001 was resolved by live-source verification; ISS-002 was corrected and committed in the authoritative source.
- Recheck project identity, version, document outlines, and concurrency values through MCP before any source mutation. After a committed correction, reopen affected coverage and reviews.
- P1-01 status: **complete**; all Phase 1 scope selections below are settled and the full Phase 1 readiness gate has passed.

## Project constraints

These are user-established constraints, recorded separately from specification-derived requirements:

- TypeScript for implementation; Vite; CSS.
- LitElement for every web component.
- Storybook.
- Linting for both TypeScript and CSS.
- Visible styling and animation contracts, including visible demonstrations and contract checks in later phases.

## Conformance targets

| Specification | Final target | Authority | Incremental claims |
| --- | --- | --- | --- |
| UI Foundation | Complete library, including Foundation, Positioning, and all required named and advanced contracts; subject only to source-permitted exclusions below | UI Foundation §1.1, UI Foundation §20.5 | Name only the class and complete capabilities actually verified, together with source version, optional omissions, and permitted host limitations. |
| UI Component Library | Complete library: shared Presentation contracts, all 61 public controls, the extension and authoring contract, and complete-library verification | UI Component Library §1.2, UI Component Library §25 | Presentation or named Control claims require their complete applicable contracts and verified dependencies; planned coverage alone establishes neither. |

The settled scope choices are recorded once in DEC-001 through DEC-003. They select complete conformance for both layers, exclude the four retained Appendix F extensions, and exclude the separately optional inner-list compatibility capability.

## Scope dispositions

| ID | Coverage category | Source | Disposition | Rationale or decision |
| --- | --- | --- | --- | --- |
| <a id="scope-001"></a>SCOPE-001 | foundation capability | UI Foundation §2, UI Foundation §1.1 | included | Shared architecture, behavior, state, accessibility, forms, positioning, interaction, and services required by DEC-001. |
| <a id="scope-002"></a>SCOPE-002 | foundation capability | UI Foundation §1.1, UI Foundation §20.5 | included | Required named contracts and advanced capabilities, including capabilities beyond the informative 38-entry evidence inventory; separately optional features have their own dispositions. |
| <a id="scope-003"></a>SCOPE-003 | catalog control | UI Component Library §25, UI Component Library §8.1 | included | All 61 public catalog identities, each exactly once, under DEC-001. |
| <a id="scope-004"></a>SCOPE-004 | composition-only exposure | UI Foundation §20.5 | included | Preserve Radio, Autocomplete, and Toolbar exposure through their catalog compositions; do not add standalone catalog identities or count these again as catalog controls. |
| <a id="scope-005"></a>SCOPE-005 | foundation-only optional capability | UI Foundation §20.5, UI Foundation §1.1 | included | NumberField and Meter remain included in the complete Foundation target under DEC-001, with no standalone Component Library catalog identity. |
| <a id="scope-006"></a>SCOPE-006 | shared presentation and composition contract | UI Component Library §1.2, UI Component Library §4.2 | included | Include shared token, dictionary, structure, definition, anatomy, variant, state, composition, layout, icon, and motion obligations. |
| <a id="scope-007"></a>SCOPE-007 | component-layer extension and authoring contract | UI Component Library §24, UI Component Library §1.2 | included | Required authoring and extension rules are distinct from the excluded Foundation Appendix F additions. |
| <a id="scope-008"></a>SCOPE-008 | optional higher layer | UI Component Library §2 | excluded | UI Reactive Panel is explicitly outside this deliverable and cannot be used to fill missing contracts. |
| <a id="scope-009"></a>SCOPE-009 | optional Foundation extension | UI Foundation §26.1 | excluded | The previousValue extension only; DEC-002. |
| <a id="scope-010"></a>SCOPE-010 | optional Foundation extension | UI Foundation §26.1 | excluded | The DismissPolicy focusOutside extension only; DEC-002. |
| <a id="scope-011"></a>SCOPE-011 | optional Foundation extension | UI Foundation §26.1 | excluded | The automatic-placement main-axis option only; DEC-002. |
| <a id="scope-012"></a>SCOPE-012 | optional Foundation extension | UI Foundation §26.1 | excluded | The diagnostic on exhausting the reset budget only; DEC-002. |
| <a id="scope-013"></a>SCOPE-013 | optional Foundation compatibility capability | UI Foundation §19.10, UI Foundation §22.9 | excluded | User-selected exclusion under DEC-003; do not silently drop its ledger disposition. |
| <a id="scope-014"></a>SCOPE-014 | supporting source inventory | UI Foundation §20.5, UI Foundation §22.9 | included | Use embedded inventories to reconcile coverage and interpretation, preserving their informative status and normative targets. Reference their entries rather than copying a second authoritative catalog. |

## Decisions required before architecture

There are no pending Phase 1 scope selections. DEC-004 through DEC-006 assign the architecture choices that must be settled before Phase 2 architecture completion. DEC-007 assigns toolchain choices before Phase 3 tooling setup. DEC-008 and DEC-009 assign presentation inputs and visual-review baselines before dependent Phase 5 work.

The implementation engineer owns the scheduled technical decisions. The user, or an explicitly delegated designer, owns presentation inputs. These choices must preserve the source contracts and cannot supply or override normative behavior.
