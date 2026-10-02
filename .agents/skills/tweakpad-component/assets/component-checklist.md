# Component implementation and evidence record

Copy to `plans/components/<component>/implementation-checklist.md`. Replace
bracketed fields and expand the tables for the actual task. Keep this file updated
through the gates; do not check boxes merely because code was written.
For a read-only review, use these fields in the response or an authorized report;
do not create a checklist file unless writing one is in scope.

## Delivery and source record

- Component(s) / public identity: [identity and tag(s)]
- Requested work / claim: [complete component, bounded fix, review, or docs change]
- In-scope changes and existing gaps: [boundary]
- Repository baseline / unrelated changes: [revision and changes to preserve]
- Live project / document IDs and revisions: [fresh direct MCP reads]
- Owning contracts / dependencies / vocabulary: [stable source references]
- Local Base UI / Floating UI / shadcn evidence: [paths, revisions, dirty status]
- Tool readiness: [direct Spec Blocks and Chrome DevTools MCP availability]
- Browser / server / build under test: [version, URL, source or built package]
- Evidence directory: `tmp/component-verification/[component]/[run]/`
- Durable verification fixtures / served URLs: [existing fixture or `tests/fixtures/components/<component>/index.html`]
- Evidence availability to the next agent: [local only or actual shared location]

## Capability and interface mapping

Use one row per capability, not merely one row per component. Include properties,
attributes, defaults, methods, events/cancellation, slots/parts, state hooks,
composition, behavior, accessibility, presentation and customization.

| ID   | Requirement / capability | Live authority | Local upstream evidence | Lit interface / implementation | Docs location | Scenario IDs | Status / gap |
| ---- | ------------------------ | -------------- | ----------------------- | ------------------------------ | ------------- | ------------ | ------------ |
| C-01 | [requirement]            | [source]       | [source/test]           | [mapping]                      | [reference]   | [IDs]        | pending      |

Record spec/upstream conflicts here before dependent implementation:

| Issue | Concrete missing/conflicting contract | Affected dependencies | Proposed resolution | Authority / resolution evidence | Status |
| ----- | ------------------------------------- | --------------------- | ------------------- | ------------------------------- | ------ |

For catalog-wide work, also reconcile every upstream identity with a catalog,
composition or Foundation exposure, evidence and any gap. Attach/reference that
inventory; matching names or catalog totals do not prove coverage.

## Architecture and reuse

- Component folder and responsibility boundaries: [design]
- Supported exports / registration / constituent API impact: [changes or none]
- Public vocabulary / tokens / parts / presentation review: [source-backed choices]

| Responsibility           | Existing owner investigated | Reuse / extension / justified local logic | Affected consumers and regression scenarios |
| ------------------------ | --------------------------- | ----------------------------------------- | ------------------------------------------- |
| [behavior or appearance] | [module]                    | [decision]                                | [consumers / IDs]                           |

### Demo and composition reuse map

List nested UI roles in stories, examples, docs, copyable snippets and fixtures.
Use existing library components; record the contract or deliberate test purpose
for native anatomy that could otherwise look like a substitute.

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| ------------------ | ----------- | ------------------------------- | ----------------------------------- | --------------------------------------------- |
| [location]         | [role]      | [component]                     | [scenario IDs]                      | [reason or none]                              |

## Verification scenarios

Plan all applicable requirements/states and interacting combinations before
implementation; add newly discovered cases. Status vocabulary: `pending`,
`passed`, `failed`, `blocked`, `not applicable`. Non-applicability requires
source/capability evidence. Tool limitations are blocked, not passed or N/A.

| ID   | Capability IDs / evidence category                      | Setup and input     | Expected result     | Actual result | Tool/command and evidence | Status / justification |
| ---- | ------------------------------------------------------- | ------------------- | ------------------- | ------------- | ------------------------- | ---------------------- |
| V-01 | [IDs; behavior/a11y/visual/docs/reuse/regression/build] | [steps/environment] | [observable result] | [not run]     | [MCP/command/path]        | pending                |

Record viewport, theme, direction, motion conditions and relevant browser features
for visual/interaction rows. Record what was visually inspected as well as the
screenshot path. Distinguish API evaluation, real input, accessibility tree,
automated analysis and screen-reader evidence. Do not reuse stale passes after
changes that affect them.

## Gate record

| Gate                                  | Status  | Required exit evidence / remaining work                                           |
| ------------------------------------- | ------- | --------------------------------------------------------------------------------- |
| 0. Sources and scope                  | pending | Fresh authority and explicit delivery boundary.                                   |
| 1. Capability mapping                 | pending | Complete applicable matrix; dependent semantic gaps resolved.                     |
| 2. Architecture and composition reuse | pending | Responsibilities, shared owners, nested controls and affected consumers mapped.   |
| 3. Behavior                           | pending | Required state, event, input, lifecycle and composition scenarios pass.           |
| 4. Presentation and customization     | pending | Canonical names and public overrides work without behavioral damage.              |
| 5. Accessibility                      | pending | Semantic, keyboard/focus and automated results separately evidenced.              |
| 6. Visual and interaction inspection  | pending | States, themes, layouts, motion and integration inspected.                        |
| 7. Documentation and demo reuse       | pending | Base example, complete API, curated Docs and real component composition verified. |
| 8. Regression and reconciliation      | pending | Target, affected consumers, build/package boundaries and final records reconcile. |

## Documentation synchronization

- [ ] Base example, actual Controls, constituent APIs and reference agree with code.
- [ ] Added/removed/changed properties, events, methods, slots and hooks are updated.
- [ ] Verification fixtures are separate from curated public examples.
- [ ] Rendered and copyable compositions reuse existing components.
- [ ] Imports and registration work outside Storybook's global setup.
- [ ] Generator handling and changed tests preserve the intended documentation.

## Completion / handoff

- Change summary: [what and why]
- Actual delivery claim: [precise verified scope]
- Non-browser checks: [commands and actual outcomes]
- Behavior: [evidence and outcome]
- Accessibility: [tree, keyboard/focus, automation, and any actual AT evidence]
- Visual/customization/motion inspection: [evidence and outcome]
- Documentation and demo composition reuse: [evidence and outcome]
- Shared-consumer regressions / package boundaries: [evidence and outcome]
- Required failures or blocked checks: [issues or verified none]
- Older out-of-scope gaps: [issues or verified none; do not invent completeness]
- Changed source revisions / reopened gates: [rechecked results]

A complete-component claim requires every applicable required gate to pass. A
bounded fix reports its boundary and older gaps without certifying the component.
