---
name: tweakpad-component
description: 'Implement, refactor, fix, or review Tweakpad LitElement components and widgets and their Storybook documentation/compositions against the live specification and local Base UI, Floating UI, shadcn and tweakpane references. Enforce shared architecture, component reuse, API coverage, theming, accessibility, and Chrome DevTools MCP verification. Applies to this library, not generic frontend work.'
---

# Tweakpad component implementation

## Objective and authority

Build the complete Base UI + shadcn component and capability surface as cohesive
LitElement web components, including the applicable Floating UI behavior. Lit is
the runtime dependency; do not add React, upstream component packages, positioning
packages, or another runtime dependency to fill implementation gaps.

Every existing and future component follows this pipeline. Accordion, Field, and
Badge are examples, never limits on coverage. A library component must work with
the rest of the library, share its language and infrastructure, support public
customization, and have complete documentation.

Widgets, the specialized controls under `src/widgets/<widget>/` (color pickers,
curve editors, audio graphs), follow the same pipeline with their own paths: the
UI Widgets Specification as the owning document, tweakpane as an additional
upstream reference, `docs/widgets/`, `src/stories/widgets/`,
`tests/fixtures/widgets/` and `plans/widgets/<widget>/`. They ship only through
`@tweakpad/ui/widgets` and `@tweakpad/ui/register/widgets`; `docs/widgets/README.md`
lists every file a widget adds.

- Read the live Foundation, Component Library and Widgets specifications, managed
  vocabulary, owning contracts, and dependencies through **direct Spec Blocks MCP
  tools**. Those sources govern public behavior, anatomy, naming, and presentation
  boundaries. Local implementation, historical plans, and snapshots are not
  normative substitutes.
- Investigate local upstream code, tests, types, examples, and reusable patterns
  under the sibling `specification/external/` directory. These are implementation
  and parity evidence, not authority to contradict the spec. Do not fetch GitHub
  replacements or update the reference checkouts as part of component work.
- If parity requires a missing or conflicting contract, record the precise gap
  and dependent impact. Resolve it before implementing dependent semantics. Do
  not silently narrow parity, invent an API, or edit the spec to justify existing
  code. Use any existing authorization for spec work; otherwise present the
  concrete needed amendment and only the unresolved decision.
- Discover facts before asking questions. Resolve routine implementation choices
  from source and existing authorization. Preserve unrelated edits and keep work
  within the assigned component and necessary shared changes.

## Readiness and evidence

Read [architecture.md](references/architecture.md) during investigation and design.
Read [verification.md](references/verification.md) when building the acceptance
matrix, then use its applicable sections during each verification gate.

### Required execution boundaries

These are internal work gates, not requests for user approval. Resolve them through
source investigation and authorized shared repairs; ask only for a material
unresolved product/contract decision. Apply them to component internals as well as
stories and examples.

1. **Preserve the requested scope.** An implementation request covers the assigned
   component's applicable contract and dependencies. Do not relabel it a "core",
   "initial", or "bounded" implementation to defer required capabilities. A
   bounded delivery must come from the user's request, not from implementation
   difficulty, elapsed time, or a list of acknowledged gaps. Recording a failure
   does not clear it or authorize stopping work that can still be completed.
2. **Reuse the component family, not just utilities.** Trace upstream imports,
   reexports and shared owners to the corresponding local components. When two
   components share a behavioral implementation upstream, preserve that ownership
   in the Lit binding: reuse/repair the existing component or an actual common
   owner consumed by both. Sharing focus or event helpers while duplicating the
   surrounding state, lifecycle, rendering and coordination is not sufficient.
3. **Trace presentation to its source.** Record the relevant registry base and
   style preset; follow external class names into their stylesheets/recipes. Map
   each visual region to an existing component or shared presentation recipe.
   Ordinary native layout is allowed; independently recreating an existing
   component's appearance is not. Reconcile source variants with the live contract
   and local theme instead of silently mixing them.
4. **Inventory constituent options separately.** Defaults, independent visibility
   controls, placement, composition and dismissal/action semantics each need a
   source-backed mapping. A footer action does not implement a corner close
   control. Shared behavior does not transfer every sibling's API or defaults;
   reconcile each option with the assigned component's contract. A rendered
   default does not establish the configurable surface.
5. **Pass design gates before production edits.** Gates 0–2 require a complete
   capability plan, family dependency map, presentation source map and resolved
   dependent design decisions. Pending execution tests are expected at this point;
   missing mappings or unjustified parallel owners are not. Folder extraction
   never authorizes breaking an existing shared implementation.
6. **Check the first integration before expanding verification.** Inspect the
   actual diff for shared ownership and one representative rendered composition
   against the traced presentation source. Exercise independent constituent
   options. If these fail, repair the design and reopen the affected gates before
   spending time on the exhaustive browser matrix.

For implementation work, copy [component-checklist.md](assets/component-checklist.md) to
`plans/components/<component>/implementation-checklist.md` (widgets:
`plans/widgets/<widget>/implementation-checklist.md`), or update the existing
record. Use a stable component slug. Record source revisions, contract references,
capabilities, shared ownership, demo composition reuse, verification scenarios,
actual results, and remaining gaps. Store detailed logs and screenshots under
`tmp/component-verification/<component>/<run>/`; record paths and conclusions in
the checklist. These local artifacts are not automatically available to another
machine; state that boundary in the handoff. For read-only reviews or preflights,
use the same fields in the response or an already authorized report instead of
creating files. Report findings and proposed scenarios without performing repairs
or claiming unexecuted checks passed. Honor the task's restrictions on commands,
servers and browser interactions. A preflight can finish with findings and tool
limitations; do not wait for a connection or imply component conformance to call
the preflight complete.

Preserve the template's capability IDs, scenario IDs, source/reuse maps, early
integration checkpoint and gate table. Do not replace them with a retrospective
summary of the code. Run the record checker at each work boundary:

```sh
node .agents/skills/tweakpad-component/scripts/check-gates.mjs plans/components/<component>/implementation-checklist.md --stage implement
node .agents/skills/tweakpad-component/scripts/check-gates.mjs plans/components/<component>/implementation-checklist.md --stage verify
node .agents/skills/tweakpad-component/scripts/check-gates.mjs plans/components/<component>/implementation-checklist.md --stage complete
```

For a widget, pass `plans/widgets/<widget>/implementation-checklist.md` instead.

`implement` requires gates 0–2; `verify` additionally requires the early integration
checkpoint before exhaustive browser verification; `complete` requires all gates,
capabilities and scenarios to be resolved. A nonzero result blocks that boundary;
correct the work and record, never mark a row passed merely to satisfy the script.
The checker validates record structure and statuses, not the truth or completeness
of source evidence. Read-only reviews use the same criteria without creating files.

Statuses are `pending`, `passed`, `failed`, `blocked`, and `not applicable`.
`not applicable` needs contract/capability evidence; unsupported required tests
are `blocked`. Never convert a missing capability into `not applicable`. A
checkmark requires observable evidence, not an implementation intention.

Discover the registered tools early. If direct Spec Blocks tools are unavailable,
report that they need loading/reconnection and block specification-dependent
implementation. Continue independent local research. If Chrome DevTools MCP is
unavailable, browser gates remain blocked; never substitute another browser tool.

## Ordered gates

### 0. Establish current sources and scope

Read instructions, working-tree changes, live contracts and dependencies, local
upstream references, and relevant shared consumers. Record revision identifiers
and dirty-reference status. Use the source locators in the architecture reference
without treating recorded versions or catalog counts as current authority.

**Exit:** source authority and the assigned delivery boundary are explicit;
unresolved semantics cannot silently enter implementation.

### 1. Account for every capability

Inventory all properties/attributes, types/defaults, methods, events and
cancellation, slots/parts, states/markers, composition, lifecycle, forms,
accessibility, interaction, motion, and presentation/customization requirements.
Read upstream tests and constituent units, not just the showcase component.
Include related components and independently configured regions. Record exact
upstream paths/symbols and defaults; a whole-family prose row cannot replace
individual capabilities. Follow the presentation source chain defined in the
architecture reference before choosing the visual baseline.

Map each capability to its live authority, local reference evidence, Lit/public
interface, implementation, documentation, and test scenario. Translate React
mechanisms into equivalent web-platform capabilities; do not reproduce React
APIs mechanically or silently discard them. For catalog-wide work or a complete
library claim, reconcile the upstream union with Tweakpad identities and
composition/Foundation exposure as described in the architecture reference.

**Exit:** all applicable requirements have a disposition and verification plan;
material spec/parity conflicts are resolved before dependent implementation.
"Pending implementation" is valid in a complete plan; "not mapped" is not.

### 2. Design composition and shared ownership

For new or substantially implemented components, use one folder per component,
with an entrypoint and files for meaningful responsibilities and composable
units. Keep shared behavior in its existing
Foundation owner and appearance in the presentation system. Search before adding
utilities; reuse, extend, or repair an existing owner where it fits. Record why
remaining local logic is specific. Preserve supported exports and registration
during migration; internal modules do not automatically become public elements.
A bounded fix or documentation-only task assesses the same architecture but does
not force unrelated folder migration; record existing structural gaps and the
limited delivery claim.

Complete the family dependency and presentation source maps before editing. Name
the upstream relationship, existing local owner, reuse/repair decision, component-
specific differences and actual consumers. A new "shared" module used only by the
new component does not prove reuse when an existing sibling retains the duplicate
implementation. Composition, inheritance and controllers are possible mechanisms;
the required result is one coherent owner for the shared responsibility.

**Mandatory implementation/composition reuse:** for every nested UI role in
component internals, stories, documentation, examples, and fixtures, use the existing library
component. A custom badge-looking span, demo-local Button, or recreated input,
switch, spinner, icon, or menu is an antipattern when the library provides the
role. Compose public APIs and supported styling hooks. Native content, layout,
contract-required native anatomy, and deliberate interoperability tests remain
valid; record the reason when they could be confused with a component substitute.
Do not hide a deficient existing component behind a local replacement.

**Exit:** module responsibilities, shared owners, affected consumers, and a
composition reuse map are recorded. The proposed design has no unjustified parallel
owner. If existing code violates this, pass the design gate only after specifying
the concrete shared repair and affected consumers; implement that repair next.
The early integration checkpoint then checks actual adoption in the code. This
distinction permits repairing bad existing code without treating it as conforming.
Run the `implement` record check. If a design changes during coding, reopen this gate
rather than carrying forward its old pass.

### 3. Implement and verify behavior

Implement reusable behavioral units, then bind them to Lit. Verify initial,
controlled/default and updated state, event details/cancellation, keyboard and
pointer paths, forms/validation, disabled/read-only semantics, dynamic membership,
asynchronous work, cleanup, and reconnection where applicable. Check actual
integration of reused components, including focus, event and form boundaries.

**Exit:** required behavioral rows have passing evidence; a rendered control or
one successful click is insufficient.

### 4. Implement shared appearance and customization

Keep structure/interaction geometry separate from replaceable appearance. Audit
names against live vocabulary and peer contracts before adding properties,
attributes, slots, parts, classes, markers, dictionary keys, or CSS variables.
Reuse semantic tokens and shared recipes. Prove token overrides, scoped themes,
dictionary replacement, and applicable public part/per-instance hooks work,
including compound and shadow-boundary cases, without resetting state or focus.
Compare the first rendered result to the selected source and sibling presentation
recipes, including optional regions and independently placed controls. Record the
early integration checkpoint and run the `verify` record check before the full
browser matrix. Token usage or successful overrides alone do not prove the correct
default appearance or reuse.

**Exit:** supported customization works through public boundaries; local CSS and
demo substitutes do not conceal missing presentation integration.

### 5. Verify accessibility independently

Use Chrome DevTools MCP to inspect the accessibility tree and exercise real
keyboard and focus behavior. Check names, roles, relationships, label activation,
errors, announcements, hidden content, disabled behavior, forms, and composed
controls as applicable. Run local automated accessibility analysis through the
MCP-controlled page and resolve component issues without broad rule suppression.

**Exit:** semantic, keyboard/focus, and automated evidence are recorded separately.
Do not claim screen-reader testing from an accessibility-tree snapshot alone.

### 6. Verify visual and interaction quality

Use the predeclared scenario matrix to inspect screenshots and live interactions
for every applicable state and meaningful interacting combination. Cover
themes/customization, sizes/orientations, RTL, constrained layouts, long content,
optional regions, and motion. Apply capability-specific checks from the
verification reference. Inspect reused controls in their actual compositions.

**Exit:** intended visuals and UX are inspected, defects fixed, and affected
scenarios rerun. An accessibility pass does not satisfy this gate.

### 7. Complete documentation and its compositions

Default to one canonical base example plus the complete public API reference,
including constituent APIs where public. Controls expose real APIs, with fixture
setup kept separate. Document properties/attributes, types/defaults, methods,
events/details, slots/parts, state hooks, customization, and usage constraints.

Do not create documentation stories merely to enumerate attribute combinations.
Keep exhaustive verification fixtures outside curated Docs. Add further published
examples only for distinct use cases warranted by the task. Audit both rendered
examples and copyable source for library-component reuse. Update docs, generator
handling, and relevant tests with API additions, removals, and behavior changes.

**Exit:** documented and implemented APIs reconcile, the base example works, and
compositions demonstrate the real library without local substitutes.

### 8. Regress and reconcile the delivery

Run applicable unit tests, lint, type/build and Storybook build checks, plus MCP
browser checks for the target and affected shared consumers. Check built exports
and registration when changed. Reconcile the matrix, code, definitions, catalog,
docs, reuse map, and evidence. Reopen gates affected by subsequent changes; do not
carry an earlier pass across a change that invalidates its evidence.

**Exit:** all required gates pass for a complete-component claim. A narrowly
scoped fix must report its exact verified boundary and any older outstanding
gaps; it does not certify the entire component. Never expand a fix into an
unrequested library rewrite just to clear unrelated gaps.
Run the `complete` record check. Keep unresolved in-scope work active when progress
is possible; explain genuine blockers without redefining the requested delivery.

When maintaining this skill, use the behavioral cases in
[skill-regressions.md](references/skill-regressions.md) and run the checker tests.
Those cases test decisions and rejected work boundaries, not wording compliance.

## Browser tool boundary and final report

Use registered **Google Chrome DevTools MCP** tools for all browser navigation,
interaction, page evaluation, screenshots, and accessibility inspection. Do not
use agent-browser, computer-use/GUI automation, standalone Playwright/Puppeteer,
raw CDP, custom browser bridges, or a different browser automation integration.
Browser regression checks live in `tests/fixtures/components/<component>/` and
`tests/fixtures/widgets/<widget>/` with README steps; run them through MCP.
Repository scripts are Node-only.

MCP evaluation may set up a fixture, exercise public property/method APIs, collect
events, and inspect results. It must not simulate user input and present that as
real keyboard/pointer verification. Never mock a required browser capability and
claim it was verified. Missing tool support leaves the affected gate blocked.

Report what changed, the scope of the claim, source revisions, separately stated
behavior/accessibility/visual/docs results, shared-consumer regressions, evidence
locations, and unresolved gaps. Neither story counts nor clean builds establish
component completeness.
