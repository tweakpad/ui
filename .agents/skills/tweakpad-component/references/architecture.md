# Architecture and source investigation

Paths below are relative to the library root, except `../specification/...`.
They are discovery pointers: inspect the current files and live source before
using them. This document does not duplicate normative component contracts.

## Source map

| Concern             | Start here                                                                                                        | What to establish                                                                                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Live authority      | Direct Spec Blocks MCP; project `prj_c5a403a0-d1d5-4487-ac78-f4e545f46483`                                        | Confirm project identity, current revisions, documents, and managed vocabulary.                                                                                       |
| Foundation          | Document `doc_cd3c4721-9f9b-4531-abab-a8bfdbac75f1`                                                               | Owning behavior plus state, lifecycle, accessibility, forms, motion, positioning and coverage dependencies.                                                           |
| Component Library   | Document `doc_8077bf7c-0361-48f3-ac87-53b983bd89b3`                                                               | Definition, anatomy, properties, shared terminology, presentation, composition and coverage dependencies.                                                             |
| Spec access policy  | `../specification/AGENTS.md`                                                                                      | Registered direct tools only; no shell, JSON-RPC, curl or bridge substitutes for server calls. Reading local upstream reference files is separate from server access. |
| Base UI             | `../specification/external/base-ui/packages/react/src/` and `packages/utils/src/`                                 | Public exports, constituent units, internal/shared owners, data attributes, source types, adjacent tests, docs and demos.                                             |
| Floating UI         | `../specification/external/floating-ui/packages/{core,dom,utils}/src/`                                            | Positioning stages, overflow/measurement, clipping, owner realms, auto-update and cleanup. Follow relevant interaction references too.                                |
| shadcn              | `../specification/external/ui/apps/v4/registry/`                                                                  | Components, compositions and presentation across applicable registry bases; `ui` is the local shadcn checkout.                                                        |
| Public inventory    | `src/catalog.ts`, `src/components/index.ts`, `src/index.ts`, `src/register.ts`, `src/elements.ts`, `package.json` | Catalog identities, class exports, custom-element types/registration and package entrypoints.                                                                         |
| Shared behavior     | `src/foundation/`, `src/components/shared.ts`                                                                     | Existing abstractions and consumers, including limitations that require shared repair.                                                                                |
| Shared presentation | `src/presentation/`, `src/styles.css`, `docs/styling.md`, `docs/motion.md`                                        | Definition/part registration, resolution, tokens, recipes, structure, composition, public overrides and motion boundaries.                                            |
| Docs and fixtures   | `src/stories/`, `src/stories/examples.ts`, `.storybook/`, `docs/`                                                 | Authored/generated stories, base examples, actual API tables, nested-component usage and published example code.                                                      |
| Prior coverage      | `plans/phase-1/outputs/`, `docs/first-pass-conformance.md`                                                        | Leads and previous gaps only; source versions and dispositions may be stale.                                                                                          |

Use source IDs as locators, not frozen contracts. Read related owning nodes and
dependencies, not just search-result excerpts. Do not copy old section numbers,
catalog counts, exclusions, or default values into new acceptance records without
live verification. If spec editing is authorized, use fresh direct-tool reads,
current concurrency fields, small edits, project validation, and dependency review.

## Catalog and capability reconciliation

For a whole-library review or completeness claim:

1. Enumerate Base UI's public component exports from its source index. Classify
   providers, helpers and constituent units separately; do not count every module
   as a standalone visual component.
2. Enumerate shadcn component entries across the applicable local registry bases.
   Start with `bases/base/ui` and `new-york-v4/ui`, and inspect the registry indexes
   and other bases for unique capabilities. Dedupe repeated identities without
   losing distinct functionality or composition.
3. Map each upstream identity/capability to a Tweakpad catalog control,
   constituent/composition, or Foundation capability. Every mapping needs
   behavior/anatomy evidence and a current spec reference. Similar names or similar
   screenshots do not establish equivalence.
4. Record gaps, specification conflicts, and permitted adaptations explicitly.
   Do not create new public identities merely because names differ. Conversely,
   a historical composition-only classification cannot silently reduce the
   user's complete-coverage objective; reconcile it with the current contracts.
5. Compare implemented APIs and observable capabilities, then doc/test coverage.
   Registration and a default story alone do not establish parity.

For an assigned component, perform the same mapping for its whole capability
surface and dependencies. Do not turn every component task into a new full-library
audit; maintain any existing inventory and verify changed mappings. Do not claim
full-library coverage from representative trials.

## Component folders and behavioral layers

New and substantially implemented components belong in
`src/components/<component>/`. Migrate the assigned implementation out of grouped
files when implementing it; preserve unrelated implementations and supported
exports. Update importers, registration, types, stories and tests together.

Organize by real ownership: an entrypoint, host/root coordination, constituent
units, state/controllers, structural styles, local types and tests as needed.
Simple primitives need fewer files. Do not split every method into a file or add
empty layers to imitate upstream directory counts.

The behavioral layer owns reusable semantics and interaction. Lit elements bind
that behavior to web-component lifecycle and native DOM. The presentation layer
supplies appearance through the established definitions/dictionary system. Shared
controllers may be Lit-aware; there is no requirement to add a second framework
or parallel unstyled package.

Base UI Field's `root`, `control`, `label`, `description`, `error`, `validity` and
`item` units illustrate responsibility boundaries. Follow the selected component's
actual source dependencies instead of applying that tree to every control.
React context/hooks/render props map to appropriate controllers, registration,
slots, properties, events or methods under the live contract. Preserve the
capability rather than React syntax.

## Reuse investigation

| Responsibility            | Existing places to inspect                                                                               |
| ------------------------- | -------------------------------------------------------------------------------------------------------- |
| Lit lifecycle and forms   | `foundation/element.ts`: `TpElement`, `TpFormElement`; check inherited API exposure as well as behavior. |
| State and notifications   | `foundation/controllable-state.ts`, `store.ts`, `events.ts`, `types.ts`.                                 |
| Collections and focus     | `foundation/collection.ts`, `focus.ts`, `typeahead.ts`, `id.ts`.                                         |
| Environment and cleanup   | `foundation/services.ts`: `EnvironmentService`, `Scheduler`, `CleanupScope`.                             |
| Positioning and dismissal | `foundation/positioning.ts`, `floating-dismiss.ts`, `floating-tree.ts`, `safe-corridor.ts`.              |
| Presence and motion       | `foundation/presence.ts`, `motion.ts`, `collapsible.ts`.                                                 |
| Domain behavior           | `foundation/validation.ts`, `calendar.ts`, `slider.ts`, `questionnaire.ts`.                              |
| Component helpers         | `components/shared.ts`: assignment, label activation, event reasons and shared styles.                   |

Paths in this table are under `src/`. Search consumers before changing a shared
module. Existing helpers must still meet the current contract: reuse does not
excuse a shallow focus traversal, unsafe global document access, or missed cleanup.
Repair the shared owner and test affected consumers rather than copying a patched
version into the new component.

Keep specific behavior local until a concrete shared responsibility warrants
extraction. Provide composition/extension boundaries so individual implementations
remain possible without duplicated generic code. Avoid hidden class coupling,
circular component imports, and shared mutable state leaking between instances.

## Names and presentation

Resolve public language from live shared vocabulary and owning contracts, then
check peer components for implementation consistency. Do not introduce synonyms
for existing meanings, component-specific token aliases for shared roles, or
undocumented inherited properties. Reconcile conflicts rather than choosing the
most convenient precedent.

Inspect definitions, axes/defaults, part bindings, dictionary keys, recipes, token
roles, composition contributions, state markers, and actual rendered parts
together. Use token-aware selectors such as `[part~="..."]` for part token lists.
Check public parts exist and reach the intended element, including nested shadow
roots and registered native parts. Keep generated appearance keys distinct from
stable consumer part names.

Structure owns layout, containment, geometry, hit targets and relationships;
replaceable presentation owns appearance according to the live boundary. Preserve
supported public geometry hooks without moving mandatory interaction structure
into a replaceable theme. Reuse color pairs, typography, spacing and motion roles;
avoid ad hoc colors, dimensions or animation values for which a role already
exists. A justified extension requires contract/naming review and documentation.

## Demo and composition reuse

This applies to all stories, Docs, example renderers, copyable snippets, test
fixtures and composed component content, regardless of the enclosing component.

1. List nested UI roles before writing markup. Search the catalog and existing
   public component APIs for each role.
2. Use the existing component for the role: Badge for a badge, Button for a button,
   Input for a library input, and the existing icon definitions/renderer. Compose
   properties and slots; use supported theming boundaries.
3. Record registration/import requirements, inherited styling, events, focus and
   form interactions. Verify standalone fixtures do not accidentally depend on
   Storybook's global registration to work as documented.
4. If the component lacks needed behavior, fix the appropriate shared component
   within the authorized scope or record the blocking gap. Do not create a
   demo-local substitute or private-selector workaround.

For example, content that calls for a library status badge should render
`<tp-badge>New</tp-badge>`, not a styled `<span class="demo-badge">New</span>` or a
new demo-only badge class. Do not assume a particular Badge variant is supported;
read its current contract. The same prohibition covers every available component.

Ordinary text and layout containers are native HTML. Native links, form elements,
and other constituent nodes can be required by a component's contract or by an
explicit native-interoperability test. Explain such cases in the reuse map. Do
not blindly replace contract-required native menu items or semantic table nodes
with a custom element that changes their required relationship. Native semantic
DOM inside a component implementation is also legitimate. These cases do not
authorize styling an element to impersonate an existing library control.

Do not test reuse solely by searching source strings. Inspect the registered
element actually rendered and exercise its public behavior/theming in context.

## Documentation integration

Maintain an authored base example and complete API reference for each implemented
component, including public constituents. The presence of an autogenerated Docs
page does not establish complete properties, events, methods or styling docs.
Keep fixture configuration out of Controls; use render-level setup instead.

Separate curated Docs from test matrices. State combinations may be fixtures
outside the public Docs sequence, without becoming separate catalog components.
The base example remains the first public demonstration. Publish additional
examples only for distinct use cases warranted by the task.

Reuse suitable existing verification fixtures. When a durable fixture is missing,
place it at `tests/fixtures/components/<component>/index.html` with adjacent
support files, served through the existing Vite project server. Keep it outside
`src/`, Storybook story discovery, and package exports so verification code does
not become public documentation or ship in the library. Record the actual served
URL and setup in the checklist; snapshots/logs still belong under `tmp/`. Use
source imports for development checks and built-package imports for package
checks. This location does not authorize adding a second browser driver.

Inspect `scripts/generate-component-stories.mjs` before changing generated stories:
it currently rebuilds the generated directory and tracks authored exceptions.
Preserve new authored docs through the generator's current mechanism. Inspect
`src/stories/stories.test.ts` and `.storybook/docs-page.mdx`: existing expectations
may require obsolete configuration stories or include every story in Docs. Update
the affected expectations to verify API/documentation behavior, rather than
preserving an unwanted gallery to satisfy a string assertion. Avoid running the
whole generator or formatter just to modify one component.
