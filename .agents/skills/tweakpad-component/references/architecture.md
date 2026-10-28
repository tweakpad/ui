# Architecture and source investigation

Paths below are relative to the library root, except `../specification/...`.
They are discovery pointers: inspect the current files and live source before
using them. This document does not duplicate normative component contracts.

## Source map

| Concern                | Start here                                                                                        | What to establish                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Live authority         | Direct Spec Blocks MCP; project `prj_c5a403a0-d1d5-4487-ac78-f4e545f46483`                        | Confirm project identity, current revisions, documents, and managed vocabulary.                                                                                                                                                                                                                                                                                                                                                                                            |
| Foundation             | Document `doc_cd3c4721-9f9b-4531-abab-a8bfdbac75f1`                                               | Owning behavior plus state, lifecycle, accessibility, forms, motion, positioning and coverage dependencies.                                                                                                                                                                                                                                                                                                                                                                |
| Component Library      | Document `doc_8077bf7c-0361-48f3-ac87-53b983bd89b3`                                               | Definition, anatomy, properties, shared terminology, presentation, composition and coverage dependencies.                                                                                                                                                                                                                                                                                                                                                                  |
| Widgets                | Document `doc_0d98facc-5a5d-4de2-bccb-7317abea0b9f`                                               | Scope, packaging, shared widget contracts (value model, input, rendering, accessibility, theming, performance) and each widget's definition; widgets only.                                                                                                                                                                                                                                                                                                                 |
| Spec access policy     | `../specification/AGENTS.md`                                                                      | Registered direct tools only; no shell, JSON-RPC, curl or bridge substitutes for server calls. Reading local reference files is separate from server access.                                                                                                                                                                                                                                                                                                               |
| Behavior reference     | `../specification/external/` (headless component library checkout)                                | Public exports, constituent units, internal/shared owners, data attributes, source types, adjacent tests, docs and demos.                                                                                                                                                                                                                                                                                                                                                  |
| Positioning reference  | `../specification/external/` (positioning library checkout)                                       | Positioning stages, overflow/measurement, clipping, owner realms, auto-update and cleanup. Follow relevant interaction references too.                                                                                                                                                                                                                                                                                                                                     |
| Presentation reference | `../specification/external/` (component registry checkout)                                        | Components, compositions and presentation across applicable registry bases.                                                                                                                                                                                                                                                                                                                                                                                                |
| Widget reference       | `../specification/external/` and `../specification/research/` (widget library checkout and notes) | Widget parity evidence: the color input binding view (color picker), the 2D point input binding (2D picker) and the number graph monitor view (graph).                                                                                                                                                                                                                                                                                                                     |
| Public inventory       | `src/catalog.ts`, `src/components/index.ts`, `src/index.ts`, `src/register.ts`, `package.json`    | Catalog identities, class exports, registration and package entrypoints; each component module declares its own `HTMLElementTagNameMap` entry.                                                                                                                                                                                                                                                                                                                             |
| Widget inventory       | `src/widgets/catalog.ts`, `src/widgets/index.ts`, `src/register/widgets.ts`                       | The widgets section: catalog, class exports and registration for `@tweakpad/ui/widgets` and `@tweakpad/ui/register/widgets`; never reached from `src/index.ts` or `src/register.ts` (`src/widgets/catalog.test.ts`).                                                                                                                                                                                                                                                       |
| Shared behavior        | `src/foundation/`, `src/components/shared/`                                                       | Existing abstractions and consumers, including limitations that require shared repair.                                                                                                                                                                                                                                                                                                                                                                                     |
| Shared presentation    | `src/presentation/`, `src/styles.css`, `docs/styling.md`, `docs/motion.md`                        | Definition/part registration, resolution, tokens, recipes, structure, composition, public overrides and motion boundaries.                                                                                                                                                                                                                                                                                                                                                 |
| Docs and fixtures      | `docs/components/`, `docs/widgets/`, `src/docs/`, `scripts/docs/`, `src/stories/`, `.storybook/`, `tests/fixtures/components/`   | One documentation page per component (`docs/components/<slug>.mdx`), read by both renderings; the docs tooling (page reader, manifest API rows, Related, preview runtime, Vite plugin) and the index build; story files with `libraryDocs()`; browser fixtures with per-folder README steps. Components not yet migrated keep `docs/<name>.md` and `src/stories/<name>.examples.ts` (with `*-example.js` sources) until their page is written. Widgets use `src/stories/widgets/`, `docs/widgets/` and `tests/fixtures/widgets/`. |
| Prior coverage         | `plans/phase-1/outputs/`, `plans/phase-1/first-pass-conformance.md`                               | Leads and previous gaps only; source versions and dispositions may be stale.                                                                                                                                                                                                                                                                                                                                                                                               |

Use source IDs as locators, not frozen contracts. Read related owning nodes and
dependencies, not just search-result excerpts. Do not copy old section numbers,
catalog counts, exclusions, or default values into new acceptance records without
live verification. If spec editing is authorized, use fresh direct-tool reads,
current concurrency fields, small edits, project validation, and dependency review.

## Catalog and capability reconciliation

For a whole-library review or completeness claim:

1. Enumerate the behavior reference's public component exports from its source index. Classify
   providers, helpers and constituent units separately; do not count every module
   as a standalone visual component.
2. Enumerate the presentation reference's component entries across the applicable
   local registry bases, and inspect the registry indexes and other bases for unique
   capabilities. Dedupe repeated identities without
   losing distinct functionality or composition.
3. Map each reference identity/capability to a Tweakpad catalog control,
   constituent/composition, or Foundation capability. Every mapping needs
   behavior/anatomy evidence and a current spec reference. Similar names or similar
   screenshots do not establish equivalence.
4. Record gaps, specification conflicts, and permitted adaptations explicitly.
   Do not create new public identities merely because names differ. Conversely,
   a historical composition-only classification cannot silently reduce the
   user's complete-coverage objective; reconcile it with the current contracts.
5. Compare implemented APIs and observable capabilities, then doc/test coverage.
   Registration and a default story alone do not establish parity.

For a full assigned-component implementation, perform the same mapping for its
whole capability surface and dependencies. For an explicitly bounded fix, map the
affected capabilities and dependency impact, keeping older unrelated gaps separate.
Do not turn every component task into a new full-library audit; maintain any
existing inventory and verify changed mappings. Do not claim full-library coverage
from representative trials.

## Component folders and behavioral layers

### Establish family ownership before choosing files

Start at the reference's public exports and follow reexports, imports, root hooks,
controllers and constituent implementations until the shared owners are explicit.
Then inspect the related local component implementations, not only `foundation/`.
Populate the checklist's family dependency map with source path/symbol, existing
local owner, proposed reuse/repair, variant-specific policy, actual consumers and
regression scenarios. A module name or a claim that code is "shared" is not evidence
that those consumers use it.

If the sibling owner is deficient, improve that owner or extract a common owner
and migrate the affected siblings together. Keep public identities and differences
in policy/presentation intact. Do not improve only the new component behind a new
parallel state/focus/modal implementation. Do not blindly inherit an unsuitable
class: select composition, a shared controller or inheritance according to the
actual responsibility. The dependency map must account for the old implementation
that would otherwise remain duplicated.

If required generic infrastructure is missing, record the smallest shared owner and
affected consumers needed to deliver the assigned component. Implement those
prerequisites within the task; do not expand into every unrelated Foundation or
catalog gap. A cross-cutting dependency is a design item to resolve, not permission
to omit the capability or silently turn the task into a whole-library rewrite.

For Dialog-family work, inspect the behavior reference's alert-dialog parts index,
its alert-dialog root, the dialog root renderer it delegates to, and the
corresponding local Dialog implementation. These are locators, not frozen
contracts. Alert Dialog's family behavior must use the same owner as Dialog;
required modal policy, safe decision focus and action semantics remain distinct.
Do not interpret reuse as merely importing a Button or a focus utility. Apply this
dependency-tracing procedure to every component family, not just Dialog.

New and substantially implemented components belong in
`src/components/<component>/`; widgets belong in `src/widgets/<widget>/` under the
same folder rules, with their catalog tuple, `src/widgets/index.ts` export,
`src/register/widgets.ts` definition and `src/presentation/families/widgets.ts`
entry (the checklist in `CONTRIBUTING.md`, Adding a widget). Migrate the assigned
implementation out of grouped files when implementing it; preserve unrelated
implementations and supported exports. Update importers, registration, types,
stories and tests together.
This is a file-organization rule, not permission to sever the family ownership
established above. A component folder can contain a thin policy binding to a shared
owner; the shared owner need not be copied into each component folder.

Organize by real ownership: an entrypoint, host/root coordination, constituent
units, state/controllers, structural styles, local types and tests as needed.
Simple primitives need fewer files. Do not split every method into a file or add
empty layers to imitate reference directory counts.

The behavioral layer owns reusable semantics and interaction. Lit elements bind
that behavior to web-component lifecycle and native DOM. The presentation layer
supplies appearance through the established definitions/dictionary system. Shared
controllers may be Lit-aware; there is no requirement to add a second framework
or parallel unstyled package.

The reference Field's `root`, `control`, `label`, `description`, `error`, `validity`
and `item` units illustrate responsibility boundaries. Follow the selected component's
actual source dependencies instead of applying that tree to every control.
Framework context/hooks/render props map to appropriate controllers, registration,
slots, properties, events or methods under the live contract. Preserve the
capability rather than framework syntax.

## Reuse investigation

| Responsibility            | Existing places to inspect                                                                                                                                 |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lit lifecycle and forms   | `foundation/element.ts`: `TpElement`, `TpFormElement`; check inherited API exposure as well as behavior.                                                   |
| State and notifications   | `foundation/controllable-state.ts`, `store.ts`, `events.ts`, `types.ts`.                                                                                   |
| Collections and focus     | `foundation/collection.ts`, `focus.ts`, `typeahead.ts`, `id.ts`.                                                                                           |
| Environment and cleanup   | `foundation/services.ts`: `EnvironmentService`, `Scheduler`, `CleanupScope`.                                                                               |
| Positioning and dismissal | `foundation/positioning.ts`, `floating-dismiss.ts`, `floating-tree.ts`, `safe-corridor.ts`.                                                                |
| Presence and motion       | `foundation/presence.ts`, `motion.ts`, `collapsible.ts`.                                                                                                   |
| Domain behavior           | `foundation/validation.ts`, `calendar.ts`, `slider.ts`, `questionnaire.ts`.                                                                                |
| Component helpers         | `components/shared/`: `events.ts` (assignment, label activation, event reasons), `elevation.ts`, `control-styles.ts`, `anchored-arrow.ts`, `scrollbar.ts`. |
| Related components        | The actual local components corresponding to reference imported/reexported owners; follow their consumers.                                                 |

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

### Trace the complete presentation source

1. Record the applicable presentation registry base(s) and style preset(s). Start with
   the current library theme and live presentation contract. When variants differ,
   record which behavior and appearance are adopted and why; do not silently choose
   whichever source is easiest to copy. Ask only if the remaining choice materially
   changes an unspecified product requirement.
2. Read the component and composition source. Follow its style classes into the
   registry stylesheets, then inspect the relevant tokens, selectors, variants and
   responsive rules. Markup class names and inline layout utilities alone are not
   the complete visual source.
3. For each meaningful region (surface, header, body, footer/actions, media and
   controls), map source selectors/declarations to the existing library component
   or dictionary recipe. Record intentional contract/theme adaptations. Reuse or
   extract the actual recipe where presentation is shared; using the same spacing
   tokens while independently restyling the region does not establish reuse.
4. Treat interactive roles, visual regions and layout as separate decisions.
   Compose the existing component when it owns the role. Share a presentation
   recipe when only the appearance is common. Native semantic/layout elements are
   legitimate, but their paint must use the mapped presentation owner. Do not wrap
   every panel in Card simply because it has a similar footer.

The following is an investigation example, not a mandated preset or an instruction
to add Dialog-only APIs to Alert Dialog. The presentation reference's Dialog Content has
an independent `showCloseButton` option; its Footer has another optional close button.
Inspect both defaults and the styles that position the corner control. In the reference
style preset, the dialog, alert-dialog and card footer classes share muted, bordered
footer presentation. Trace and reconcile that relationship with Tweakpad's Card recipe.
This does not prescribe that preset for every component or imply that the reference
imports Card into Dialog. It does prohibit omitting the stylesheet or
conflating Cancel semantics with footer-only placement.

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
exists. Motion timing comes from the `duration-*` and `easing-*` token roles:
`motionTransition`/`presenceMotion` in `src/presentation/motion.ts` for CSS and
`resolveMotionTiming` in `src/foundation/motion.ts` for scripted motion. A justified
extension requires contract/naming review and documentation.

### State fill motion

Never transition `background`, `background-color` or `all`. Chrome runs
background-color transitions on the compositor and can repaint the start color for
one frame when one ends (Chrome 154, `CompositeBGColorAnimation`; see
qtoggle/qui PR #52). The flash is intermittent and invisible to computed styles.
Fade a state fill through the shared fill layer instead:

- Structure: `fillLayerStyles(selector)` (or `fillLayerHost` / `fillLayer()` in a
  family `structure` dictionary for registered native parts) from
  `src/presentation/motion.ts` adds an isolated `::before` layer under the content
  that fades by opacity.
- Presentation: `fillColor`, `fillShown` and `fillHidden` from
  `src/presentation/recipes/shared/fill.ts`. Give the layer one color per element so
  it can fade out after its state ends; states only show or hide it. A state with a
  different color is the part's own fill and changes instantly. Primitive layer
  colors use `:where(&)` so a composed role's layer color wins.
- `::before` is reserved for the fill layer on controls; put hit-target extensions on
  `::after`. A composition that unpaints a reused Button from outside must also
  remove its layer (`::part(button)::before { content: none }`).

`src/presentation/fill-layer.test.ts` fails on any background transition in
component or presentation source.

### Tree-shakeable ownership

Using one component must bundle only that component, the components it renders and
the shared code they reach. `src/presentation/families.test.ts` enforces these rules:

- **Presentation family.** Each component owns `src/presentation/families/<name>.ts`.
  It holds `definePresentation({ definition, bindings, structure, sources })`. The element
  class sets `static presentation` to that family, and `static presentationFamilies` to
  any member families it presents. Families import only recipe modules,
  `../family.js` and `../definition.js`.
- **Recipes.** Component appearance goes in `recipes/<name>.ts`. Appearance shared by
  several families goes in `recipes/shared/` or `recipes/core/`. Recipes never import
  `componentDefinitions`, `defaultPresentationDictionary`, `families/index.ts` or another
  component's family. Use `complete: true` instead of reading the catalog.
- **Aggregates.** Components, widgets and Foundation never import the aggregates
  (`presentation/components.ts`, `default.ts`, `families/index.ts`, and the widget
  counterparts `presentation/widgets.ts`, `families/widgets.ts`). They exist only for
  tooling and full-library themes. Widget families are listed in `families/widgets.ts`,
  never in `families/index.ts`, so `@tweakpad/ui` and `/register` never reach a widget
  (`src/widgets/catalog.test.ts`).
- **Rendered elements.** Every library element a class renders, through a `<tp-*>`
  template, `renderPart({ tag })` or `createElement`, is listed in
  `static get elementDependencies()`. `defineElement` defines them recursively.
- **Imports.** Import component classes from their own modules, never through the
  `primitives.ts`, `display.ts` or `shared.ts` compatibility barrels. Import
  framework-free helpers from `src/foundation/`, not from another component's folder.

Verify with a standalone fixture that calls `defineElement` for the one component
only, without `register`. Measure a single-component bundle built from `dist/index.js`
when shared code changes.

## Implementation and composition reuse

This applies to component internals, stories, Docs, example renderers, copyable
snippets, test fixtures and composed content, regardless of the enclosing component.

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
   implementation-local substitute, demo-local substitute or private-selector workaround.

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

Each component is documented once, in `docs/components/<slug>.mdx` (widgets:
`docs/widgets/<slug>.mdx`), and both renderings read that page: Storybook through
`parameters: { docs: libraryDocs('components/<slug>') }` in the story file, the website from
the installed package. The [tweakpad-docs skill](../../tweakpad-docs/SKILL.md) is the guide;
`src/docs/` is the tooling (page reader, API rows from the manifest, Related from
`elementDependencies`, preview runtime, Vite plugin), `scripts/docs/build.mjs` writes `dist/docs.json` and checks the manifest
descriptions of every documented element, and `scripts/docs/pending.json` lists the tags whose
pages are not written yet.

The API and Related sections are generated: the presence of a Docs page does not establish
complete documentation; JSDoc on the element and part descriptions in the family do. Keep
fixture configuration out of Controls; use render-level setup instead.

Separate the page from test matrices. State combinations may be fixtures outside the page
(`tests/fixtures/`, or a story tagged `!autodocs`), without becoming separate catalog
components. The hero preview is the first demonstration and the Default story; further
previews show the features and configurations the docs skill asks for.

Reuse suitable existing verification fixtures. When a durable fixture is missing,
place it at `tests/fixtures/components/<component>/index.html` with adjacent
support files, served through the existing Vite project server. Keep it outside
`src/`, Storybook story discovery, and package exports so verification code does
not become public documentation or ship in the library. Record the actual served
URL and setup in the checklist; snapshots/logs still belong under `tmp/`. Use
source imports for development checks and built-package imports for package
checks. This location does not authorize adding a second browser driver.

Every component story file is authored in `src/stories/<name>.stories.ts`;
`.storybook/preview.ts` supplies the `autodocs` tag and padded layout once, so a
story file declares only what differs. `src/stories/stories.test.ts` and
`src/docs/docs.test.ts` verify one Default story per catalog entry, the pairing of each page
with its story, and the page skeleton; a component not yet migrated keeps its reference
markdown and `*.examples.ts` until its page is written. Update the affected expectations to
verify API/documentation behavior rather than preserving an unwanted gallery to satisfy a
string assertion. Avoid running the whole formatter just to modify one component.
