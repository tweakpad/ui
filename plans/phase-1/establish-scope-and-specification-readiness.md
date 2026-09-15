# Phase 1 — Establish Scope and Specification Readiness

**Status:** Complete. P1-01 through P1-07 passed against source version 0.2.62; the Phase 2 readiness verdict is ready.

## 1. Outcome and boundaries

Produce an MCP-referenced baseline that Phase 2 can use to design the implementation: an explicit scope, a complete index of applicable contracts, a disposition for specification issues, and a verification plan.

The only specification input is the live Spec Blocks project `prj_c5a403a0-d1d5-4487-ac78-f4e545f46483` (UI Library), version 0.2.62 at completion. Its authoritative resources are `doc_cd3c4721-9f9b-4531-abab-a8bfdbac75f1` (UI Foundation Specification), `doc_8077bf7c-0361-48f3-ac87-53b983bd89b3` (UI Component Library Specification), and `managed:glossary`. Read them through registered direct Spec Blocks MCP tools. Do not use a Markdown snapshot, upstream implementation, other repository document, external documentation, or existing application to fill gaps.

This phase creates planning records only. Source layout, public TypeScript APIs, custom-element naming, rendering strategy, dependency versions, tooling configuration, and component implementation order belong to later phases. Record any decisions those phases must make, with an explicit deadline.

The user-established constraints are TypeScript, Vite, CSS, LitElement for all web components, Storybook, linting for TypeScript and CSS, and visible styling and animation contracts. Record these once in the scope baseline as project constraints, separately from specification-derived requirements.

## 2. Files and directory structure

All paths below are relative to the repository root.

```text
plans/
└── phase-1/
    ├── establish-scope-and-specification-readiness.md  # This execution plan
    └── outputs/
        ├── scope-baseline.md       # Source version, scope, conformance target
        ├── contract-index.md      # Contract coverage and dependency references
        ├── issue-register.md      # Specification gaps and their resolutions
        ├── decision-register.md   # Project choices and decision deadlines
        ├── acceptance-map.md      # Required evidence and phase gates
        └── readiness-report.md    # Validation results and Phase 2 handoff
```

The six output files were created by their owning tasks. ISS-001 was resolved by checking the authoritative AST, and ISS-002 was resolved by the committed source correction at `27364546`. All recorded completion results come from performed reviews and checks. Keep all Phase 1 findings in these files; do not create separate documents for individual components.

### Record conventions

- Use stable IDs: `SCOPE-001`, `CON-001`, `ISS-001`, `DEC-001`, and `ACC-001`. Never renumber an existing record.
- Preserve each record's matching explicit anchor, such as `<a id="con-001"></a>`, as a stable marker.
- Do not use Markdown links, file paths, source URLs, or snapshot anchors in output records.
- Cite numbered clauses as `UI Foundation §N` or `UI Component Library §N`, using the section number returned by MCP and omitting the section title. Cite unnumbered roots by the stable document ID above and the managed vocabulary as `managed:glossary`.
- Cite relationships between Phase 1 records as plain stable IDs such as `CON-001`, `ISS-001`, or `DEC-001`.
- Use the source version recorded in `scope-baseline.md` for every review. If it changes during execution, identify and recheck affected records before continuing.
- A source reference is evidence for a requirement. It is not evidence that implementation or verification has passed.

## 3. Task sequence

| Task | Work | Depends on | Files created or updated |
| --- | --- | --- | --- |
| P1-01 | Establish the source and scope baseline | None | `outputs/scope-baseline.md` |
| P1-02 | Index contracts and dependencies | P1-01 | `outputs/contract-index.md` |
| P1-03 | Audit specification readiness | P1-02 | `outputs/issue-register.md`; update contract index |
| P1-04 | Resolve scope questions and classify later decisions | P1-03 | `outputs/decision-register.md`; update scope, issues, and index |
| P1-05 | Map contracts to acceptance evidence | P1-04 | `outputs/acceptance-map.md`; update contract index |
| P1-06 | Validate the planning artifacts | P1-05 | `outputs/readiness-report.md`; correct affected artifacts |
| P1-07 | Apply the readiness gate and hand off | P1-06 | Finalize `outputs/readiness-report.md` |

Execution stops whenever a task encounters a specification ambiguity needed to complete that task. Record the issue and obtain its resolution before continuing; the sequence does not authorize carrying a known ambiguity into later tasks.

## 4. Task definitions

### P1-01 — Establish the source and scope baseline

**Create:** `plans/phase-1/outputs/scope-baseline.md`.

**Read through MCP:** UI Foundation §1 and UI Foundation §1.1; UI Component Library §1, UI Component Library §1.2, UI Component Library §1.3, and UI Component Library §2.

**Procedure:**

1. Record the project and document IDs, version, HEAD, state version, and review date.
2. Record the user-established stack and visible-contract constraints under `Project constraints`.
3. Define the intended delivery boundary and target conformance class for each specification. Distinguish the final target from the narrower claims available during incremental implementation.
4. Classify scope entries using the specification's coverage categories. Give each inclusion or exclusion a document-qualified MCP section number; use a plain decision ID for any project-selected optional scope.
5. Record any unresolved scope selection as pending. Do not infer an optional-feature selection or conformance class merely from the title “UI Library.” Resolve a pending scope selection before P1-02 depends on it.

**Required structure:**

```text
# Scope Baseline
## Source baseline
## Project constraints
## Conformance targets
## Scope dispositions
## Decisions required before architecture
```

`Scope dispositions` table columns: `ID | Coverage category | Source | Disposition | Rationale or decision`.

Allowed dispositions: `included`, `excluded`, `pending`. A pending entry identifies the exact question requiring resolution.

**Done when:** The source version is recorded, both conformance targets are explicit, every scope exclusion has authority, and no pending scope selection prevents building the contract index.

### P1-02 — Index applicable contracts and their dependencies

**Create:** `plans/phase-1/outputs/contract-index.md`.

**Read through MCP:** The normative sections of both documents, UI Foundation §20.5, UI Foundation §22.9, UI Component Library §8.1, UI Component Library §25, and `managed:glossary`.

**Procedure:**

1. Index every shared normative contract applicable to the selected scope. Use independently reviewable MCP sections as units; split a unit when its dependencies or verification ownership differ.
2. Include one coverage row per public catalog identity, citing its canonical section and behavioral authorities by document-qualified MCP number. These are coverage records, not implementation tasks.
3. Reference the source inventories for parts, properties, reasons, markers, and geometry outputs. Do not copy their entries into a second authoritative catalog.
4. Add plain dependency IDs between contract records. Distinguish shared Foundation dependencies from component-layer dependencies and presentation-only authority.
5. Reconcile the index with both coverage inventories. Check actual identities and MCP references as well as declared counts; if they disagree, open an issue instead of silently choosing one.

**Required structure:**

```text
# Contract Index
## Shared Foundation contracts
## Shared presentation and composition contracts
## Catalog coverage
## Supporting source inventories
## Coverage reconciliation
```

Contract table columns: `ID | MCP source | Coverage category | Scope ID | Depends on | Review status | Issue IDs | Acceptance IDs`.

Review statuses: `unreviewed`, `clear`, `blocked`. Acceptance IDs remain pending until P1-05; a pending evidence mapping is not a completed record.

**Done when:** Every in-scope contract unit and catalog identity is accounted for, dependencies have targets, and omissions or inconsistent source references have been explicitly identified.

### P1-03 — Audit the specification for implementation readiness

**Create:** `plans/phase-1/outputs/issue-register.md`.

**Update:** `plans/phase-1/outputs/contract-index.md`.

**Read through MCP:** Each indexed contract and its dependencies, using UI Foundation §1.2, UI Component Library §1.3, UI Component Library §4.2, and UI Component Library §8.7 as review references.

**Procedure:**

1. Review shared Foundation contracts first, shared presentation contracts second, and catalog bindings third.
2. For each index record, check that referenced contracts exist and that the observable obligations can be determined from the source alone. Check for incompatible requirements across dependency boundaries.
3. Check that the public behavior, presentation, and consumer-input boundaries are sufficiently defined to support implementation. Evaluate LitElement compatibility as a question to resolve in architecture; do not select a rendering mechanism here.
4. Mark a record `clear` only after reading its owning contract and applicable dependencies. Record the review coverage even if no issue is found.
5. On a blocker, document the exact uncertainty, its source locations, and the smallest question needed to resolve it. Stop and present that question to the user.

**Required structure:**

```text
# Specification Issue Register
## Review coverage
## Open issues
## Resolved issues
```

Each issue has: `ID`, `Contract IDs`, `MCP sources`, `Classification`, `Conflicting or missing information`, `Blocked work`, `Resolution question`, `Status`, and `Resolution evidence`.

Classifications: `missing contract`, `ambiguity`, `contradiction`, `broken reference`, `coverage mismatch`. Statuses: `open`, `awaiting resolution`, `resolved`.

**Resolution rule:** A project preference cannot override a normative clause. If resolution requires a specification correction, keep the issue open until the correction is reflected in the authoritative source and the affected records are rechecked. Editing the specification is outside this task's file scope.

**Done when:** Every indexed record has been reviewed, no specification blocker remains open, and each resolved issue cites evidence rather than an assumed interpretation.

### P1-04 — Record project decisions and their deadlines

**Create:** `plans/phase-1/outputs/decision-register.md`.

**Update as needed:** `scope-baseline.md`, `issue-register.md`, and `contract-index.md` in the same output directory.

**Read through MCP:** UI Component Library §4.3, UI Component Library §6.3, and UI Component Library §6.5, plus the clauses supporting each proposed choice.

**Procedure:**

1. Separate fixed user constraints, choices explicitly permitted by the specification, and consumer-owned inputs.
2. Consolidate the already decided `DEC-001` through `DEC-003` from the scope baseline into the decision register without duplicating or renumbering them, then record and resolve any additional decisions necessary to establish Phase 1 scope.
3. Record later decisions with a named owner and a precise gate: for example, before architecture completion, tooling setup, or presentation implementation. A phase number alone is insufficient if earlier work within that phase depends on the answer.
4. Record applicable decision topics without choosing their values: supported host environments, web-component integration, tooling and validation choices, and the provision of presentation dictionaries and consumer-owned visual inputs.
5. For styling and animation, identify who must supply the inputs needed for visible Storybook examples and when. Do not invent a theme, token values, or motion settings.

**Required structure:**

```text
# Decision Register
## Fixed project constraints
## Decisions required for Phase 1
## Decisions assigned to later phases
```

Each decision has: `ID`, `Question`, `Category`, `Source or user instruction`, `Affected contract IDs`, `Decision owner`, `Status`, `Decision deadline`, `Work blocked until decided`, and `Outcome with rationale`.

Categories: `scope`, `implementation choice`, `consumer input`. Statuses: `open`, `decided`, `scheduled`.

**Done when:** Phase 1 decisions are settled, later choices are demonstrably permitted by the source, and every scheduled choice has an owner and a gate before dependent work. A specification ambiguity cannot be relabeled as a scheduled implementation choice.

### P1-05 — Define the acceptance evidence map

**Create:** `plans/phase-1/outputs/acceptance-map.md`.

**Update:** Acceptance references in `plans/phase-1/outputs/contract-index.md`.

**Read through MCP:** UI Foundation §6, UI Foundation §12.6, and UI Foundation §20; UI Component Library §11, UI Component Library §15, and UI Component Library §25.

**Procedure:**

1. Assign each in-scope contract to one or more evidence records. Group contracts only when they genuinely share a verification method and completion gate.
2. State what must be observed, which source clauses determine success, and which implementation phase must produce the evidence.
3. Include distinct evidence categories for behavior, accessibility, composition, presentation, animation, and contract coverage.
4. For styling and animation, require both visible Storybook demonstrations and checks against the referenced contracts. Identify the states or lifecycle conditions to expose by source reference, without reproducing their normative definitions.
5. Record build and lint evidence separately from contract evidence. Do not select testing packages, story filenames, test filenames, or source APIs in this phase.

**Required structure:**

```text
# Acceptance Evidence Map
## Contract evidence
## Storybook visibility requirements
## Build and lint evidence
## Coverage reconciliation
```

Evidence table columns: `ID | Contract IDs | Source criteria | Observable evidence | Verification method | Producing phase | Required before | Unresolved decision IDs`.

Verification methods may include automated behavioral checks, browser interaction checks, visual review, static contract audits, and build/lint checks. Select methods according to the obligation; do not imply that one method proves every category.

**Done when:** Every in-scope contract has evidence ownership, styling and animation have explicit visible-review obligations, and the map leaves no requirement covered solely by a successful build or lint run when observable verification is required.

### P1-06 — Validate the Phase 1 artifacts

**Create:** `plans/phase-1/outputs/readiness-report.md`.

**Inputs:** The five generated artifacts and the live MCP project resources identified in section 1. Generated artifacts may be checked against one another; no additional source documents are introduced.

**Checks:**

1. Verify every document-qualified section number exists in the recorded MCP source version and every unnumbered resource ID identifies the intended source.
2. Verify every record ID is unique and all plain cross-record references resolve.
3. Reconcile contract coverage with the selected scope and the source inventories; record totals separately by coverage category.
4. Verify each included contract has a completed readiness review and at least one acceptance mapping.
5. Verify all exclusions have a source or explicit project decision, and none contradict the selected conformance target.
6. Verify there are no open specification blockers or pending Phase 1 decisions.
7. Verify scheduled decisions have owners, deadlines, and blocked-work descriptions.
8. Verify styling and animation are represented in both contract coverage and observable evidence.
9. Verify no output silently adds public defaults, rewrites source requirements, or presents planned checks as completed implementation evidence.

**Required structure:**

```text
# Phase 1 Readiness Report
## Source and artifacts reviewed
## Check results
## Coverage summary
## Unresolved blockers
## Decisions handed to Phase 2 and later phases
## Readiness verdict
```

Check table columns: `Check | Result | Evidence references | Required correction`.

Results: `pass`, `fail`, `not run`. Record the check date and source version. Counts or summaries alone do not replace plain references to the reviewed records.

**Done when:** Every check has an actual result and evidence. Correct failed checks in the owning file and repeat the affected checks; unresolved failures prevent P1-07 from declaring readiness.

### P1-07 — Apply the readiness gate and hand off

**Update:** `plans/phase-1/outputs/readiness-report.md`.

**Procedure:**

1. Set the verdict to `ready` only when all P1-06 checks pass and P1-01 through P1-05 meet their completion criteria.
2. Otherwise set it to `blocked`, cite the blocking record IDs, and state the exact resolution needed. Do not add a conditional approval that lets dependent implementation proceed.
3. In a ready report, cite the scope baseline, contract index, acceptance map, and each decision ID that Phase 2 must address.
4. Identify the source version that Phase 2 inherits. If that version changes, reopen affected reviews before relying on the verdict.

**Done when:** The report provides an evidence-backed verdict and an actionable Phase 2 handoff. Phase 1 completion establishes planning readiness, not implementation conformance.

## 5. Completion checklist

- [x] P1-01 — Source and scope baseline completed.
- [x] P1-02 — Contract coverage and dependencies indexed.
- [x] P1-03 — Specification readiness audit completed; blockers resolved.
- [x] P1-04 — Required decisions settled; later decisions assigned.
- [x] P1-05 — Acceptance evidence mapped, including visible styling and animation.
- [x] P1-06 — Artifact validation passed with cited evidence.
- [x] P1-07 — Readiness report finalized and Phase 2 handoff recorded.
