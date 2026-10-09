# Component implementation and evidence record

Copy to `plans/components/<component>/implementation-checklist.md` (widgets:
`plans/widgets/<widget>/implementation-checklist.md`). Replace
bracketed fields and expand the tables for the actual task. Keep this file updated
through the gates; do not check boxes merely because code was written.
Keep the named sections, table columns and IDs below: the skill's record checker
uses them. Add rows and detail, not replacement prose. Keep status cells to the
documented status vocabulary and put reasons/evidence in their own cells. Escape
literal pipes inside table cells. A recorded defect does not clear a gate.
For a read-only review, use these fields in the response or an authorized report;
do not create a checklist file unless writing one is in scope.

## Delivery and source record

- Component(s) / public identity: [identity and tag(s)]
- Requested work / claim: [complete component, bounded fix, review, or docs change]
- Scope source: [user instruction establishing that scope; no self-assigned reduced delivery]
- In-scope changes and existing gaps: [boundary]
- Repository baseline / unrelated changes: [revision and changes to preserve]
- Live project / document IDs and revisions: [fresh direct MCP reads]
- Owning contracts / dependencies / vocabulary: [stable source references]
- Local Base UI / Floating UI / shadcn evidence: [paths, revisions, dirty status]
- Tool readiness: [direct Spec Blocks and Chrome DevTools MCP availability]
- Browser / server / build under test: [version, URL, source or built package]
- Evidence directory: `tmp/component-verification/[component]/[run]/`
- Durable verification fixtures / served URLs: [existing fixture or `tests/fixtures/components/<component>/index.html`; widgets: `tests/fixtures/widgets/<widget>/index.html`]
- Evidence availability to the next agent: [local only or actual shared location]

## Capability and interface mapping

Use one row per capability, not merely one row per component. Include properties,
attributes, defaults, methods, events/cancellation, slots/parts, state hooks,
composition, behavior, accessibility, presentation and customization.
Include the exact constituent and source symbol, its defaults and independently
configurable options. Do not merge placement, visibility and action semantics into
one "actions" row. Every C-ID must link to existing V-IDs. Before implementation,
the mapping must be complete even though implementation/test statuses are pending.

| ID   | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status  | Evidence / gap   |
| ---- | ------------------------------------- | -------------- | ---------------------------- | ------------------------------ | ------------- | ------------ | ------- | ---------------- |
| C-01 | [constituent capability and defaults] | [source]       | [source/test symbol]         | [mapping]                      | [reference]   | V-01         | pending | [remaining work] |

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

### Family dependency map

Trace upstream reexports/imports to implementation owners and inspect corresponding
local components. Name both the old owner and the planned shared owner if extracting
one; list the actual consumers that will use it. Low-level utility reuse alone is
insufficient. For a primitive without family dependencies, record the inspected
sources and concrete reason instead of omitting this map.

| Responsibility | Upstream dependency path / symbol          | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| -------------- | ------------------------------------------ | --------------------------------- | ------------------------------------------------- | ------------------------------------------ |
| [behavior]     | [dependency edge, not only component name] | [path and symbol]                 | [shared owner and policy differences]             | [consumer paths / V-IDs]                   |

### Presentation source map

Follow the selected registry base and preset through external stylesheets, tokens
and responsive selectors. Map every meaningful region to a library component or
recipe. Record contract/theme adaptations and absent optional regions explicitly.
For a change without presentation impact, document the dependency evidence here.

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations        | Scenario IDs |
| -------------------- | ---------------------------- | ----------------------------------------- | ----------------------------------- | -------------------------------------- | ------------ |
| [region]             | [base and preset]            | [paths, selectors and declarations]       | [existing owner]                    | [reuse/repair and allowed differences] | V-01         |

### Implementation and composition reuse map

List nested UI roles in component internals, stories, docs, snippets and fixtures.
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

| ID   | Capability IDs / evidence category | Setup and input     | Expected result     | Actual result | Tool/command and evidence  | Status  | Justification / gap |
| ---- | ---------------------------------- | ------------------- | ------------------- | ------------- | -------------------------- | ------- | ------------------- |
| V-01 | C-01; [category]                   | [steps/environment] | [observable result] | not run       | [planned MCP/command/path] | pending | [remaining work]    |

Record viewport, theme, direction, motion conditions and relevant browser features
for visual/interaction rows. Record what was visually inspected as well as the
screenshot path. Distinguish API evaluation, real input, accessibility tree,
automated analysis and screen-reader evidence. Do not reuse stale passes after
changes that affect them.

## Early integration checkpoint

Complete after the first integration, before exhaustive browser verification.
Inspect the actual diff and first rendered composition; do not infer these passes
from planned architecture, tokens, utility imports or accessibility results.

| ID   | Check                                                                                             | Status  | Evidence / unresolved finding                               |
| ---- | ------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------- |
| I-01 | Shared owners are actually used by related consumers; old duplicate behavior is removed/delegated | pending | [diff paths, call relationships and consumer evidence]      |
| I-02 | Default visual regions match traced source and shared library recipes                             | pending | [MCP comparison, source selectors and observed differences] |
| I-03 | Independent constituent options work, including placement separately from action behavior         | pending | [C/V-IDs and actual results for supported combinations]     |

## Gate record

Keep every gate, including pending later gates. Replace the exit descriptions with
concrete evidence when passing them. Any failed dependency reopens affected gates.
Use `not applicable` only with contract/scope evidence, never for an unimplemented
requirement. Run the checker with `--stage implement`, then `verify`, then `complete`
at the work boundaries specified in SKILL.md.

| Gate                                  | Status  | Required exit evidence / remaining work                                               |
| ------------------------------------- | ------- | ------------------------------------------------------------------------------------- |
| 0. Sources and scope                  | pending | Fresh authority and explicit delivery boundary.                                       |
| 1. Capability mapping                 | pending | Complete applicable matrix; dependent semantic gaps resolved.                         |
| 2. Architecture and composition reuse | pending | Family dependencies, actual local owners, full presentation sources and reuse mapped. |
| 3. Behavior                           | pending | Required state, event, input, lifecycle and composition scenarios pass.               |
| 4. Presentation and customization     | pending | Canonical names and public overrides work without behavioral damage.                  |
| 5. Accessibility                      | pending | Semantic, keyboard/focus and automated results separately evidenced.                  |
| 6. Visual and interaction inspection  | pending | States, themes, layouts, motion and integration inspected.                            |
| 7. Documentation and demo reuse       | pending | Base example, complete API, curated Docs and real component composition verified.     |
| 8. Regression and reconciliation      | pending | Target, affected consumers, build/package boundaries and final records reconcile.     |

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
- Record checker: [stage, command, result; no failed boundary treated as cleared]
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
