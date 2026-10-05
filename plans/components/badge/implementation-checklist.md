# Component implementation and evidence record

## Delivery and source record

- Component(s) / public identity: Badge / tp-badge.
- Requested work / claim: Review Badge, expose main variants and document full usage; repair missing Interactive binding and interactive presentation found during review.
- Scope source: User: “review the badge component, add its main variants and document full usage”.
- In-scope changes and existing gaps: Six existing variants, passive content, icons/counts/loading, native action/link adoption, shared customization and authored Docs. No new variant names, href API or form state owner.
- Repository baseline / unrelated changes: 757a17feb2fedb4ff282e37e30c75b38e61defc6; initially clean.
- Live project / document IDs and revisions: Direct MCP project prj_c5a403a0-d1d5-4487-ac78-f4e545f46483; Foundation doc_cd3c4721-9f9b-4531-abab-a8bfdbac75f1 and Component Library doc_8077bf7c-0361-48f3-ac87-53b983bd89b3; head 8440bff24a97dbbc5c762ebf4bd6baa958b305e1, state 55b573b760e30b3be64871d072a16f30479bbbaeff0405c00094c9f17a2862ba.
- Owning contracts / dependencies / vocabulary: ucl22-badge, sec-44-renderdelegate-and-behaviorbundle, sec-71-semantic-invariants, sec-cl-7-structural-layer-merge, sec-cl-11-state-presentation, sec-cl-137-hit-target; Root, Part and Consumer vocabulary read live.
- Local Base UI / Floating UI / shadcn evidence: ../specification/external/ui 63c1308d112b6b1205d86244a156cca1abef5087 clean; base-ui 5b495488d182c81a8a14a440d7a376517118f8ec clean. Base badge imports useRender/mergeProps (no Badge primitive); read use-render/useRender.ts and useRender.test.tsx. Floating UI has no dependency here.
- Tool readiness: Direct Spec Blocks and Chrome DevTools MCP available.
- Browser / server / build under test: Existing Storybook localhost:6006, source modules, task-owned page 67; preserve user page 47.
- Evidence directory: tmp/component-verification/badge/review/ (local only).
- Durable verification fixtures / served URLs: tests/fixtures/components/badge/index.html on localhost:5173; ?built checks dist registration/exports; authored Docs on localhost:6006; shared Foundation tests.

## Capability and interface mapping

| ID | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Six variants; default=default; dynamic property/attribute | ucl22-badge-props | bases/base/ui/badge.tsx badgeVariants; styles/style-nova.css .cn-badge-variant-* | TpBadge.variant; existing shared variantPresentation | docs/badge.md; variants example | V-01 | passed | Six real variants displayed; dynamic property/attribute paint verified |
| C-02 | Interactive=false; adopted native action/link semantics; hit target and focus | ucl22-badge-q1/q2; semantic invariants | Badge useRender span/render; badge-link.tsx | Add interactive Boolean; partContracts.badge delegates native host; inherited disabled state remains consumer semantic input | Interactive composition and constraints | V-02 | passed | Interactive binding and native-only hover/focus/target expansion verified with real input |
| C-03 | Label/count/optional mark; color is not sole status | ucl22-badge-purpose/q3 | badge-icon.tsx, badge-spinner.tsx | Default slot; actual Icon/Spinner; text and count context | Content and loading examples | V-01, V-03 | passed | Actual Icon, Spinner, text/count and Button compositions verified in Docs and standalone fixture |
| C-04 | Root part and shared customization | ucl22-badge-public-definition; merge contract | useRender props/ref/class merging tests | badge part; partPresentation; partContracts all six hooks; inherited TpElement APIs | API and customization | V-03 | passed | Token, dictionary, contract and terminal hooks verified; reference cleanup and retained focus observed |
| C-05 | Public docs, import/registration and composed consumer compatibility | ucl22-badge-definition-summary | sidebar-menu-badge.tsx; badge-rtl.tsx | Authored story; generator exclusion; NavigationPanelBadge extends actual TpBadge | docs/badge.md; Storybook Docs | V-04 | passed | Built export equals registration; NavigationPanelBadge still inherits class and public parts; authored generator exclusion in place |

## Architecture and reuse

- Extract Badge to src/components/badge/index.ts; preserve primitives.ts re-export and registration/class identity. Retain TpElement/renderPart and PresentationController as owners.
- Names and presentation: existing six variant keys; Interactive from live contract. No size, severity, href, selected, dismissible or loading API invented.

### Family dependency map

| Responsibility | Upstream dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| --- | --- | --- | --- | --- |
| Adopted host / hooks / lifecycle | Badge -> useRender -> useRenderElement; mergeProps | foundation/part.ts, TpElement | Retain shared renderPart and binding; native host owns activation/navigation, Badge owns presentation and Interactive flag | Badge, NavigationPanelBadge, shared part tests / V-02, V-03, V-04 |
| Paint | badgeVariants -> cn-badge and Nova variants | presentation/default.ts variantPresentation; recipes.ts badge | Reuse existing variant palette; condition hover rules on Interactive native hosts; no changes to other variant consumers | Button/Bubble/ListItem use unchanged helper; NavigationPanelBadge inherits passive rules / V-01, V-04 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| --- | --- | --- | --- | --- | --- |
| Root / badge | base / Nova | bases/base/ui/badge.tsx; styles/style-nova.css .cn-badge and .cn-badge-variant-* | recipes.ts badge, variantPresentation | Keep library pill, semantic palette and padding; add inherited font/line-height for native delegation, focus ring and interactive hover; retain library destructive fill rather than Nova tint | V-01, V-02 |
| Optional content | base / Nova | badge-icon/spinner.tsx; inline-start/end in natural flow | tp-icon, tp-spinner | Default slot, source order mirrored by dir; explicit icon size through public API; text status | V-01, V-03 |
| Hit area | live contract adaptation | sec-cl-137-hit-target (source is small visual pill) | Badge structural CSS; --tp-target-size-min | Invisible expansion on native interactive part; examples reserve sufficient spacing; no layout enlargement | V-02 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| --- | --- | --- | --- | --- |
| Variants / counts | Classification/status | tp-badge variants; tp-button for notification composition | @tweakpad/ui/register + styles.css; V-01, V-04 | Text/layout wrappers are native |
| Icons/loading | Mark/activity | tp-icon with imported checkIcon; tp-spinner size=sm label empty | Same registration; V-03 | No inline icon substitutes |
| Actions/links | Adopted semantic Badge root | partContracts.badge.renderDelegate with supplied bind/content | Lit import plus registration; V-02 | Native button/a required by source render contract, not a parallel Button component |

## Verification scenarios

| ID | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V-01 | C-01, C-03; visual and updates | All six variants; narrow/wide, light/dark, RTL; long content; update/remove variant | Correct shared palette, content alignment and no demo overflow | Light/dark, 390/1024/1624 widths and RTL screenshots inspected; all six paints; 160px long label wraps; no Badge preview overflow | Chrome MCP pages 67/68; results.md | passed | Shared Docs shell overflow recorded separately below |
| V-02 | C-02; real input and a11y | Native button/link delegates; Tab, Enter/Space/click/hover; passive skip; disabled action; target geometry | Native semantics, visible focus, independent Interactive/variant, no passive tab stop | Click/Space/Enter = 3 activations; Tab skips passive and disabled; native link navigates; 44px target; focus ring; axe 0 violations | Chrome MCP input, tree, axe; results.md | passed | No AT or cross-browser claim; disabled click tool refused as expected |
| V-03 | C-03, C-04; API/customization | Icons/spinner; tokens, part hooks/dictionary; content updates, ref disconnect/reconnect | Real child components, terminal customization, reference cleanup | Hooks and token/dictionary paints applied; same node/focus retained; reference SPAN/null/SPAN; reduced policy transition 0s | Chrome MCP evaluation/screenshots; results.md | passed | OS reduced-motion not claimed; Badge has no autonomous motion |
| V-04 | C-05; docs/regression | Docs base/Controls/examples/source; standalone imports, NavigationPanelBadge, builds | Authored page persists generator; registration and consumer badge work | Controls update variant and native host; built registration/export equality; NavigationPanelBadge inheritance retained; 22 tests/builds pass | Chrome MCP; TypeScript; targeted lint; package/Storybook builds; results.md | passed | Copied examples include registration and icon imports; no Storybook globals needed |

## Early integration checkpoint

| ID | Check | Status | Evidence / unresolved finding |
| --- | --- | --- | --- |
| I-01 | Shared owners are actually used by related consumers; old duplicate behavior removed/delegated | passed | primitives.ts re-exports the extracted class; NavigationPanelBadge still extends it. Badge shares renderPart, variantPresentation, Icon and Spinner owners. |
| I-02 | Default visual regions match traced source and shared library recipes | passed | Chrome page 67: six pills use shared primary/secondary/destructive/outline/transparent paints; rounded compact geometry, icon alignment and real count Button match the sourced arrangement. Library padding and solid destructive palette are retained adaptations. |
| I-03 | Independent constituent options work | passed | Page 67: passive spans, native button and anchor delegates, disabled native button; Interactive false removes target expansion, variant changes independently; real Icon and Spinner instances render. |

## Gate record

| Gate | Status | Required exit evidence / remaining work |
| --- | --- | --- |
| 0. Sources and scope | passed | Fresh live contracts and local references recorded above; initially clean tree |
| 1. Capability mapping | passed | C-01 through C-05 cover public surface and constraints; missing Interactive mapped to existing render contract |
| 2. Architecture and composition reuse | passed | Shared renderPart, palette and child components; no new action implementation; native semantic delegation follows source |
| 3. Behavior | passed | V-02, V-03 |
| 4. Presentation and customization | passed | V-01, V-03 |
| 5. Accessibility | passed | V-02 tree, real input, axe |
| 6. Visual and interaction inspection | passed | V-01 through V-03 |
| 7. Documentation and demo reuse | passed | V-04 |
| 8. Regression and reconciliation | passed | V-04 plus checks |

## Documentation synchronization

- [x] Base/Controls/API match implementation, including inherited capability limits.
- [x] Slots, hooks, semantic delegation and examples are copyable.
- [x] Imports/registration and generator handling verified.

## Completion / handoff

- Change summary: Authored Badge Docs with all six variants and full usage; added specified Interactive binding, native interactive paint and target expansion; extracted class with compatible re-export.
- Actual delivery claim: Requested Badge review, variant demos, usage reference and discovered Interactive repairs. No unrelated library conformance claim.
- Record checker: implement and verify passed before their execution boundaries; complete run after reconciliation below.
- Non-browser checks: TypeScript, targeted ESLint/Stylelint/Prettier, 22 focused tests, package and Storybook builds, git diff --check passed. Existing bundle warnings only.
- Behavior: Native action/link input, dynamic API/Controls, disabled semantics, passive tab skip, reference lifecycle and built imports passed.
- Accessibility: Independent tree + real keyboard + axe (light/dark standalone 23 passes each, 0 violations); no screen-reader testing claim.
- Visual/customization/motion inspection: Shared palettes, real icons/spinners, long text, RTL, narrow/wide and Navigation Panel inheritance inspected. Overrides preserve node/focus. motion-policy=reduce makes transition durations 0s; no OS setting claim.
- Documentation and demo composition reuse: Default first, five distinct example groups, complete API/constraints/hook reference; actual Badge/Icon/Spinner/Button; native hosts justified by render contract.
- Evidence: tmp/component-verification/badge/review/results.md; inline MCP screenshots in conversation; local evidence does not transfer automatically.
- Required failures or blocked checks: No outstanding Badge-specific failures.
- Older out-of-scope gaps: Shared Storybook Controls and Markdown code/table shell overflow at 390px; Badge previews and standalone fixture fit without overflow. No shared Docs shell changes made. Inherited readOnly/invalid/required are not Badge field semantics and are documented explicitly.
- Changed source revisions / reopened gates: Source refs unchanged. Existing shared palette helper semantics unchanged for Button/Bubble/ListItem. Final source and built Badge plus actual NavigationPanelBadge checked.
