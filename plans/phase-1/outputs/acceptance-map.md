# Acceptance Evidence Map

Authoritative source: UI Library project `prj_c5a403a0-d1d5-4487-ac78-f4e545f46483`, version **0.2.62**. Every in-scope contract has a primary evidence owner below; cross-cutting evidence supplements those primary mappings.

## Contract evidence

| ID | Contract IDs | Source criteria | Observable evidence | Verification method | Producing phase | Required before | Unresolved decision IDs |
| --- | --- | --- | --- | --- | --- | --- | --- |
| <a id="acc-001"></a>ACC-001 | CON-001, CON-187, CON-346 | MCP project, document roots, and `managed:glossary` | Exact project version, document order, source identities, vocabulary targets, and zero unresolved references | Static MCP contract audit | Phase 1 | Phase 2 | — |
| <a id="acc-002"></a>ACC-002 | CON-002–CON-139, CON-141–CON-154 | UI Foundation §1–§20, excluding UI Foundation §19.10 under DEC-003 | State, lifecycle, accessibility, focus, forms, positioning, interaction, services, component behavior, failures, and conformance behave as specified | Automated behavioral checks plus browser interaction checks | Phase 4 | Dependent Phase 6 controls | DEC-004, DEC-005, DEC-006, DEC-007 |
| <a id="acc-003"></a>ACC-003 | CON-155–CON-186 | UI Foundation §21–§26 | Coverage inventories, marker and geometry manifests, change reasons, exclusions, and retained scope reconcile exactly with implemented evidence | Static manifest and bidirectional coverage audit | Phase 4 and Phase 7 | Complete-library claim | DEC-004, DEC-007 |
| <a id="acc-004"></a>ACC-004 | CON-025–CON-038, CON-072–CON-126, applicable CON-275–CON-343 | UI Foundation §7–§9 and component semantic clauses | Accessible names, roles, focus order, keyboard interaction, disabled and read-only behavior, form participation, announcements, and failure states | Automated accessibility checks plus browser keyboard and assistive-semantic inspection | Phase 4 and Phase 6 | Each applicable control completion | DEC-004, DEC-005, DEC-007 |
| <a id="acc-005"></a>ACC-005 | CON-039–CON-064, CON-128–CON-139, CON-141–CON-148, applicable CON-275–CON-343 | UI Foundation §10, §11, and §19, excluding UI Foundation §19.10 under DEC-003 | Placement, collision, geometry outputs, dismissal, focus management, portals, trees, gestures, and composition remain correct across edge and failure cases | Deterministic geometry tests plus browser interaction checks | Phase 4 and Phase 6 | Anchored and composite control completion | DEC-004, DEC-005, DEC-007 |
| <a id="acc-006"></a>ACC-006 | CON-188–CON-274 | UI Component Library §1–§15 | Token, dictionary, structure, definition, part, variant, state, composition, layout, icon, and motion contracts resolve without violating Foundation behavior | Static contract checks plus rendered component inspection | Phase 5 | Phase 6 catalog rollout | DEC-006, DEC-008, DEC-009 |
| <a id="acc-007"></a>ACC-007 | CON-236–CON-244 and applicable CON-275–CON-343 | UI Component Library §11 | Every specified state has visible, semantically correct presentation, including focus, invalid, disabled, read-only, selection, activity, orientation, loading, and pending states | Storybook state matrix, browser state assertions, and visual review | Phase 5 and Phase 6 | Each presentation claim | DEC-008, DEC-009 |
| <a id="acc-008"></a>ACC-008 | CON-021–CON-024, CON-071, CON-143, CON-267–CON-274 and applicable catalog contracts | UI Foundation §6, §12.6, and §19.13; UI Component Library §15 | Entry, exit, retention, completion, anchored origin, gesture-proportional motion, instant transitions, and reduced-motion behavior are observable and correct | Lifecycle assertions, reduced-motion browser checks, and visible Storybook demonstrations | Phase 5 and Phase 6 | Each animation claim | DEC-008, DEC-009 |
| <a id="acc-009"></a>ACC-009 | CON-275–CON-343 | UI Component Library §16–§23 | All 61 public catalog identities appear exactly once and satisfy their definition, anatomy, properties, behavior, composition, and Foundation bindings | Per-control automated checks, browser interaction, and catalog coverage audit | Phase 6 | Phase 7 integration | DEC-004–DEC-009 |
| <a id="acc-010"></a>ACC-010 | CON-344 | UI Component Library §24 | Extensions preserve public invariance, validation, registration, and authoring constraints | Static definition and extension tests | Phase 6 | Extension support claim | DEC-005, DEC-006, DEC-007 |
| <a id="acc-011"></a>ACC-011 | CON-188–CON-345 | UI Component Library §5–§25 | Every supported control and shared presentation contract has visible Storybook coverage for applicable states, variants, directions, densities, surfaces, and motion conditions | Storybook catalog audit and visual review | Phase 5 and Phase 6 | Each presentation and catalog claim | DEC-008, DEC-009 |
| <a id="acc-012"></a>ACC-012 | CON-149–CON-186, CON-345, and every included contract | UI Foundation §20 and UI Component Library §25 | Complete-library coverage, evidence, optional omissions, supported limitations, and source version reconcile with the assembled library | Integrated conformance audit | Phase 7 | Delivery readiness | DEC-004–DEC-009 |
| <a id="acc-013"></a>ACC-013 | Every implementation-bearing contract | User-established toolchain constraints | Production build, type checking, TypeScript lint, CSS lint, Storybook build, and required test suites pass from a clean checkout | Build and lint checks | Phase 3 and Phase 7 | Implementation work and delivery | DEC-007 |

## Storybook visibility requirements

- ACC-007 exposes every applicable state and interaction condition named by its source contracts.
- ACC-008 shows entering, present, exiting, retained, completed, instant, gesture-driven, and reduced-motion behavior where applicable.
- ACC-011 covers every public catalog identity and the shared presentation rules that cannot be judged from a successful build alone.
- Visual review records the source version, presentation-input revision, viewport, direction, mode, and motion preference used for each baseline.

## Build and lint evidence

ACC-013 records build and lint health separately from behavioral, accessibility, presentation, animation, and coverage evidence. Passing ACC-013 does not satisfy any observable contract by itself.

## Coverage reconciliation

- Primary index mappings cover all 345 included CON records; excluded CON-140 is explicitly not applicable.
- Cross-cutting accessibility, positioning, state, motion, Storybook, conformance, and build evidence supplements the primary mappings.
- Optional exclusions remain explicit under DEC-002 and DEC-003 and do not remove their containing contract records.
