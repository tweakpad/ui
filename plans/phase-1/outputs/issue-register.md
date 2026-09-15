# Specification Issue Register

Authoritative source: UI Library project `prj_c5a403a0-d1d5-4487-ac78-f4e545f46483`, version **0.2.62**. Live verification performed **2026-09-15** through registered direct Spec Blocks MCP tools.

## Review coverage

**Execution status: complete.** Every indexed Foundation, presentation, catalog, inventory, and vocabulary record was reviewed against the full live MCP source. Both identified issues are resolved, no specification blocker remains open, and the committed project validates with zero diagnostics.

| Task | Actual status | Evidence |
| --- | --- | --- |
| P1-01 | complete | Scope baseline; both conformance targets and all optional scope choices are settled. |
| P1-02 | complete | 346 contract records cover both document roots, all 343 numbered sections, and `managed:glossary`; dependencies resolve. |
| P1-03 | complete | 933 requirement nodes, 513 anchor references, 1,419 managed-term references, and 448 tables were audited; ISS-001 and ISS-002 are resolved. |
| P1-04 | complete | DEC-001 through DEC-003 are decided; DEC-004 through DEC-009 have owners and precise later gates. |
| P1-05 | complete | ACC-001 through ACC-013 provide primary ownership for every included CON record and cross-cutting observable evidence; excluded CON-140 is explicitly not applicable. |
| P1-06 | complete | Saved-record, coverage, source-reference, and live-project integrity checks pass. |
| P1-07 | complete | Phase 2 readiness verdict is ready at source version 0.2.62. |

Review order was Foundation contracts, shared presentation contracts, then catalog bindings. Every contract-index record is marked clear after its owning section and dependencies were read. Public behavior, presentation, consumer-input boundaries, LitElement compatibility questions, coverage inventories, exclusions, and conformance claims are sufficiently defined for architecture work.

## Open issues

None.

## Resolved issues

<a id="iss-001"></a>
### ISS-001 — Snapshot rendering mistaken for missing source references

| Field | Record |
| --- | --- |
| ID | ISS-001 |
| Contract IDs | CON-189, CON-275–CON-343, CON-345 |
| MCP sources | UI Component Library §1.1; UI Component Library §25 |
| Classification | broken reference — original allegation withdrawn after live verification |
| Conflicting or missing information | An ephemeral rendering displayed table references as plain section-number text. The authoritative MCP AST already contained stable anchor-reference nodes for every questioned reference. |
| Blocked work | None |
| Resolution question | Did the live AST lack the requested references, or did only the rendering omit their structure? |
| Status | resolved |
| Resolution evidence | Direct document reads found 13 valid authority references in UI Component Library §1.1 and 134 valid catalog-map references in UI Component Library §25. All 147 targets resolve. No source edit was required. |

<a id="iss-002"></a>
### ISS-002 — Requirement nodes lacked explicit normative-keyword marks

| Field | Record |
| --- | --- |
| ID | ISS-002 |
| Contract IDs | CON-170, CON-215, CON-216, CON-319 |
| MCP sources | UI Foundation §22.7; UI Component Library §7.2; UI Component Library §7.3; UI Component Library §21.4 |
| Classification | ambiguity |
| Conflicting or missing information | Four requirement nodes expressed required behavior without an explicit normative-keyword mark, leaving their normative force structurally ambiguous. |
| Blocked work | Completion of the semantic readiness audit and its acceptance handoff |
| Resolution question | Should the marker-domain, presentation merge-order, conflict-group replacement, and message-scroller behaviors be explicit requirements? |
| Status | resolved |
| Resolution evidence | The authoritative source now expresses each behavior with an explicit `MUST`, preserving the existing requirement IDs and behavior. Commit `27364546` produced version 0.2.62. Fresh validation reports zero diagnostics, and all 933 requirement nodes now contain at least one normative keyword. |

### Live verification evidence

- Project: `prj_c5a403a0-d1d5-4487-ac78-f4e545f46483`.
- Foundation document: `doc_cd3c4721-9f9b-4531-abab-a8bfdbac75f1`.
- Component Library document: `doc_8077bf7c-0361-48f3-ac87-53b983bd89b3`.
- Version: **0.2.62**.
- HEAD: `2736454610cbc099cc6d35a6c885a8a98cb9ea8e`.
- State version: `a1b84d73cefd236fa4c98749e590f9d3e98fe8bebfde010a380de1f1dcdf61a0`.
- Candidate: **clean**, zero diagnostics, with no uncommitted source change.
- Source integrity: 513 anchor references and 1,419 managed-term references resolve; 448 tables are rectangular.
- Editing boundary: specification edits use direct MCP operations; ephemeral renderings are not editing surfaces.
