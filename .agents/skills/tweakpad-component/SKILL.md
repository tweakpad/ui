---
name: tweakpad-component
description: 'Implement, refactor, fix, or review Tweakpad LitElement components and their Storybook documentation/compositions against the live specification and local Base UI, Floating UI, and shadcn references. Enforce shared architecture, component reuse, API coverage, theming, accessibility, and Chrome DevTools MCP verification. Applies to this library, not generic frontend work.'
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

- Read the live Foundation and Component Library specifications, managed
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

For implementation work, copy [component-checklist.md](assets/component-checklist.md) to
`plans/components/<component>/implementation-checklist.md`, or update the existing
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

Map each capability to its live authority, local reference evidence, Lit/public
interface, implementation, documentation, and test scenario. Translate React
mechanisms into equivalent web-platform capabilities; do not reproduce React
APIs mechanically or silently discard them. For catalog-wide work or a complete
library claim, reconcile the upstream union with Tweakpad identities and
composition/Foundation exposure as described in the architecture reference.

**Exit:** all applicable requirements have a disposition and verification plan;
material spec/parity conflicts are resolved before dependent implementation.

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

**Mandatory demo/composition reuse:** for every nested UI role in stories,
documentation, examples, and fixtures, find and use the existing library
component. A custom badge-looking span, demo-local Button, or recreated input,
switch, spinner, icon, or menu is an antipattern when the library provides the
role. Compose public APIs and supported styling hooks. Native content, layout,
contract-required native anatomy, and deliberate interoperability tests remain
valid; record the reason when they could be confused with a component substitute.
Do not hide a deficient existing component behind a local replacement.

**Exit:** module responsibilities, shared owners, affected consumers, and a
composition reuse map are recorded. No unjustified parallel implementation exists.

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

## Browser tool boundary and final report

Use registered **Google Chrome DevTools MCP** tools for all browser navigation,
interaction, page evaluation, screenshots, and accessibility inspection. Do not
use agent-browser, computer-use/GUI automation, standalone Playwright/Puppeteer,
raw CDP, custom browser bridges, or a different browser automation integration.
Inspect repository scripts before running them: several current smoke/package
commands launch Playwright. Do their browser checks through MCP instead.

MCP evaluation may set up a fixture, exercise public property/method APIs, collect
events, and inspect results. It must not simulate user input and present that as
real keyboard/pointer verification. Never mock a required browser capability and
claim it was verified. Missing tool support leaves the affected gate blocked.

Report what changed, the scope of the claim, source revisions, separately stated
behavior/accessibility/visual/docs results, shared-consumer regressions, evidence
locations, and unresolved gaps. Neither story counts nor clean builds establish
component completeness.
