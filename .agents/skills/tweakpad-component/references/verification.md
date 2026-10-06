# Verification procedure

Build the scenario matrix before coding. Read the common sections for every
component, then the capability sections that apply. Enumerate required states,
transitions and interactions from live contracts and upstream tests. Add cases
discovered during implementation. No default-only sample, screenshot count, code
coverage percentage or accessibility score substitutes for requirement coverage.

## Early integration checkpoint

Before production edits, pass gates 0–2 and the `implement` record check described
in SKILL.md. After the first working integration, complete I-01 through I-03 in the
checklist and pass the `verify` record check before expanding into exhaustive
browser scenarios. Focused tests and exploratory browser inspection needed to
reach this checkpoint are appropriate.

- **I-01 — actual shared ownership:** inspect the diff and call/import relationships.
  Verify that both the assigned component and its related existing consumers use
  the chosen owner. Check that old duplicate behavior was removed or delegated.
  A new folder, shared utility imports, an owner table or passing tests do not
  establish this result by themselves.
- **I-02 — sourced default presentation:** inspect a representative composition
  through Chrome DevTools MCP and compare its regions with the recorded source
  selectors and library recipes. Include footer treatment, surface/header spacing,
  optional media and control placement where applicable. Record concrete matches
  and differences; "looks good", token usage and a screenshot path are insufficient.
- **I-03 — independent composition options:** exercise each distinct constituent
  option in the capability map. For Dialog-family work, distinguish a corner close
  control from footer close/actions, including supported hidden/shown combinations,
  accessible names, actual position and dismissal behavior. Confirm/Cancel policy
  is checked separately. Do not invent Alert Dialog options from Dialog defaults;
  reconcile each public binding against its owning live contract.

A failed checkpoint reopens the affected source/design gate. Repair it before
continuing the large verification matrix. Unsupported required inspection is
blocked. A bounded change may mark an unaffected checkpoint not applicable only
with a concrete scope/dependency reason; this cannot excuse missing implementation.

## Tool and environment boundary

1. Discover registered `mcp__chrome_devtools__*` tools and inspect their current
   schemas. Do not assume names or arguments for unsupported capabilities.
2. Reuse an appropriate existing hostname-backed Vite/Storybook server. Inspect
   current configuration and pages for the URL instead of hard-coding historical
   ports. Start the repository's server when necessary; never kill one you did
   not start.
3. Drive Google Chrome only through its DevTools MCP tools: page selection and
   navigation, current snapshots/element identifiers, click/hover/fill/key/drag
   tools, supported emulation, screenshots, console inspection and evaluation.
   Do not use agent-browser, GUI/computer-use automation, Playwright/Puppeteer,
   raw CDP or custom transport bridges, including shell scripts that hide them.
4. Evaluate through MCP to create deterministic fixtures, set public attributes
   and properties, attach event collectors, run local assertions/a11y analysis,
   or read DOM, computed styles, dimensions and active elements. Use tool-driven
   input for user-interaction claims. Dispatching synthetic keyboard/pointer
   events, forcing CSS pseudo-states, or calling a click handler is not equivalent.
5. Wait for actual registration/render/readiness signals. Reload after custom
   element registration/class changes to avoid stale hot-reloaded instances.
   Reset fixtures and emulation between cases; record the browser, URL, viewport,
   theme, direction and relevant environment for evidence.
6. If a required input, media feature, browser condition, or tool cannot be
   exercised, record a blocked scenario. For example, changing a component's
   motion-policy does not verify operating-system reduced-motion handling. Do
   not turn viewport emulation into a claim of actual touch interaction or Chrome
   results into a cross-browser claim.

Inspect commands before running them. At skill creation, the following commands
or scripts launch Playwright and must not be used for this pipeline's browser
verification: `test:browser`, `test:button:browser`, `test:stories`, `test:package`,
and `scripts/repair-browser-smoke.mjs`. Read their assertions as regression leads
and perform applicable checks through Chrome DevTools MCP. Do not delete useful
coverage because its old driver is prohibited.

Non-browser verification remains useful: `npm test`, `npm run lint`,
`npx tsc -p tsconfig.build.json --noEmit`, `npm run build`, `npm run build-storybook`,
and `git diff --check`, as applicable to the change. Check current scripts first.
Build success is separate from browser evidence. For package changes, inspect the
built graph statically and exercise a served built-package fixture through MCP.

## Common contract and behavioral checks

- Reconcile properties and attributes with types, defaults, converters,
  reflection, removal, programmatic updates and inherited public API. Test
  meaningful invalid/boundary values where specified.
- Map and test constituent options independently: visibility, placement, rendering
  and action semantics are not interchangeable. A default Cancel in Actions does
  not verify a separately configurable corner close control or footer treatment.
- Test initial/default state, controlled state, external updates, repeated
  transitions, cancellation/rejection, reset, and no-op behavior as specified.
  Inspect observable state and event order/details, not only event counts.
- Confirm change reasons/source events, propagation across shadow boundaries,
  cancelability and committed versus proposed values. A canceled action must not
  leave presentation, internal/native value and form state out of sync.
- Exercise pointer and keyboard paths with real MCP input; check disabled and
  read-only differences, activation rules and focusable-disabled behavior where
  supported. Check composition/IME and typeahead where relevant.
- Test multiple independent instances, nesting, dynamic slots/children,
  replacement/removal of members, disconnect/reconnect, listener/observer/timer
  cleanup and in-flight cancellation. Use evidence appropriate to the resource,
  rather than assuming that removal cleaned it up.
- Verify native document/shadow-root relationships, owning window/document,
  event retargeting, actual deep active element and authored attributes that the
  component must preserve. Extend shared utilities instead of bypassing them.

## Accessibility checks

- Inspect the actual accessibility tree for names, roles, states and relationships.
  Check visible label activation, description/error association, required/invalid
  communication and meaningful accessible names for icon-only actions.
- Use Tab/Shift+Tab and applicable arrows, Home/End, Enter, Space and Escape. Check
  order, roving focus, tab stops, focus-visible, no unintended trap, modal trapping,
  restoration and removal of focused items according to the component contract.
- Check hidden/inactive content is excluded appropriately and announcements occur
  at the right semantic transition. Avoid duplicate interactive roles, labels,
  announcements or invalid native structures in composed content.
- Exercise disabled, read-only, invalid, pending and selected states applicable to
  the component. Inspect high-contrast/forced-colors and zoom requirements where
  applicable and tooling supports them; blocked is different from not applicable.
- Run automated accessibility analysis through the MCP-controlled page using the
  local Storybook a11y facilities or locally available axe core. Do not instantiate
  `@axe-core/playwright` as a driver or fetch a remote replacement. Record the
  rules, scope, findings and resolution. If the analyzer cannot run, leave that
  check blocked; an accessibility-tree snapshot is a different check.
- Separate genuine component violations from isolated-fixture page landmarks.
  Record any justified fixture-specific exclusion. Do not globally disable rules
  to pass the component, suppress errors, or remove a failing state from coverage.
- Report keyboard, tree and automated evidence separately from real screen-reader
  testing. Do not infer a successful spoken experience from markup alone.

## Visual, motion and customization checks

1. Establish the intended baseline from the live presentation contract, shared
   library theme, and applicable local upstream examples. Existing screenshots
   can contain defects; they are not unquestionable acceptance baselines.
2. Cover rest, hover, focus-visible, pressed, selected/active, open/closed,
   disabled, read-only, invalid, pending/loading and empty states as applicable.
   Capture and inspect relevant transient states where tooling permits; an
   endpoint screenshot does not verify the transition.
3. Cover supported themes, sizes, orientations, logical positions and RTL; narrow
   and normal layouts; wrapping/long text; optional icons/regions; content growth;
   and multiple/nested instances. Test combinations where features interact, such
   as invalid + focus, disabled + hover, RTL + keyboard, theme + overlay, or
   retained content + interrupted motion. No need to publish this matrix as Docs.
4. Inspect actual screenshots alongside computed styles/geometry. Check typography,
   spacing, alignment, surfaces, borders, focus rings, contrast, hit targets,
   clipping, z-order, text truncation, indicator placement and layout shifts.
   Describe what was inspected; a saved screenshot alone is not a visual review.
5. Verify motion at normal speed, rapid reversals/interruption, cleanup and
   reduced-motion boundaries. Check hidden/inert/presence state throughout, not
   just opacity. Inspect external motion hooks if the contract includes them.
   For a reported flicker or flash, reproduce it before diagnosing it. Computed
   styles, per-frame `getComputedStyle` logs and transition events show what the
   page requested, not what the compositor painted. Get the user's recording or
   capture painted frames (DevTools trace screenshots), reduce the defect to a plain
   HTML page, and search for known browser defects with that signature before
   theorizing. Do not propose fixes for mechanisms that were merely measured.
6. Exercise inherited root and scoped token overrides, all supported theme modes,
   dictionary replacement, public parts and per-instance hooks. Verify actual
   public part names and compound/native registered parts across shadow roots.
   Ensure changing presentation preserves identity, state, focus and behavior.
7. Test a meaningful alternate theme/dictionary, not just one changed color.
   Check that missing dictionary contributions follow the live resolver contract
   and do not secretly retain old local appearance. Use existing token roles and
   public customization surfaces. Test removal/reset of overrides as supported.
8. Check nested reused components keep their own public behavior and consistent
   visual language. Inspect surrounding layouts without replacing their controls
   or using private selectors to conceal an integration defect.

## Capability-specific scenarios

Select every applicable row; a component can belong to several families. These
are investigation prompts, not a replacement for its complete source-derived
matrix. Cite live requirements before treating a feature as supported or omitted.

| Capability                             | Required scenario investigation                                                                                                                                                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Actions and toggles                    | Native button/link semantics, submission prevention, keyboard activation, pressed state, label/icon-only naming, loading and independent group membership.                                                                           |
| Fields and forms                       | Labels across shadow boundaries, multiple associations where supported, disabled fieldsets, native validity, reset/restore, submitter data, FormData, validation timing, stale async results, error/pending announcements and focus. |
| Selection and collections              | Single/multiple selection, controlled updates, disabled members, filtering/typeahead, IME, empty/loading results, identity/order changes, RTL, range/virtualized behavior if required, focus after removal.                          |
| Disclosures and navigation             | Keyboard model, relationships, single/multiple expansion, native link behavior, nested activation, dynamic membership, retained/hidden content, interrupted presence and find-in-page where required.                                |
| Menus and overlays                     | Correct menu versus navigation semantics, opening by pointer/keyboard/public API, nested ownership, outside/Escape dismissal, return focus, modal/inert/scroll policy, trigger replacement and disconnection.                        |
| Positioning                            | Each supported side/alignment, viewport/clipping collisions, offset/arrow geometry, nested scrollers, resize/content changes, transformed ancestors, owner window, auto-update lifetime and portal boundaries.                       |
| Continuous/date controls               | Boundaries, step/rounding, locale/direction, pointer capture/drag cancellation, multiple-thumb/range relationships, keyboard equivalents, disabled dates/values, validation and native form output.                                  |
| Presentational/composed controls       | Public anatomy, optional/empty regions, native semantics, content sizing, responsive layout, theming and real nested component reuse.                                                                                                |
| Notifications and asynchronous content | Announcement policy, queues/lifetimes, dismissal, pause/resume where supported, focus, concurrent updates, timers, cleanup and reconnect behavior.                                                                                   |

## Documentation and demo reuse acceptance

- The base example renders the actual component using its intended default
  presentation. Props needed for meaningful content are distinct from demo-only
  fixture knobs; document differences between example args and API defaults.
- Reconcile all public APIs, including constituents and inherited capabilities,
  against actual docs. Cover types/defaults, reflection/attribute spelling,
  events and payloads, methods, slots, parts, markers, customization and relevant
  behavior constraints. API removal must remove stale docs as well as Controls.
- Check that changing a public Control updates the rendered element. Keep fixture
  setup out of the component API table. A generated Docs title/default story is
  insufficient evidence for full documentation.
- Review the Docs page and index through MCP. Confirm base-first presentation,
  complete API references, and curated examples. Verification matrices must not
  reappear as public attribute-permutation galleries through automatic inclusion.
- Inspect every nested UI role in rendered demos and copyable code against the
  composition reuse map. Confirm the actual custom-element registration and
  instance, then exercise representative public behavior and theming in context.
  Plain HTML content or contract-required anatomy must have a meaningful reason
  when it resembles a substitute. Badge is one example; audit all component roles.
- Ensure documented imports/registration are sufficient outside Storybook, and
  that generators and changed tests preserve authored docs and this policy.

## Regression selection and completion

Map changed shared modules, base classes, recipes, tokens and composed components
to actual consumers using imports and usage searches. Test all consumers whose
contract or presentation can change; choose scenarios by dependency impact, not
just one convenient demo. Changes to global tokens or shared base behavior can
require a catalog-wide visual/interaction pass. Record the inclusion/exclusion
reason for each affected consumer group.

Check assertions and package scripts for hidden browser launches before execution.
Run focused non-browser checks first, then required integration/build checks.
Repeat gates when fixes affect their results. Keep earlier unrelated defects
explicit; a narrowly scoped fix may finish without claiming full component or
library conformance. A complete-component delivery cannot have required rows
failed, pending or blocked.

At handoff, reconcile the checklist with the actual diff, current source revisions,
evidence and generated artifacts. State command outcomes, observed browser
results, local evidence availability, and unresolved limitations independently.
Preserve capability/scenario IDs and the gate record. Run the `complete` record
check; do not rewrite failed requirements as an unrequested reduced delivery.
