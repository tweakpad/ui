# Skill behavioral regression cases

Use these when maintaining the skill. They are evaluations of decisions and work
boundaries, not additional component requirements. Do not impose Dialog anatomy or
a particular shadcn preset on unrelated components. Re-read actual sources when
using the real repository; the cases below do not replace live contracts.

Run the deterministic record checks with:

```sh
node --test .agents/skills/tweakpad-component/scripts/check-gates.test.mjs
```

The checker rejects incomplete records and uncleared boundaries. It cannot verify
that cited sources were read, that a dependency map is exhaustive, or that a
claimed visual comparison occurred. Evaluate those decisions separately.

## Independent evaluation procedure

For a substantial skill change, use an independent evaluation agent when delegation
is available and permitted. Give it the revised skill, a realistic request and raw
source files/locators. Do not supply these expected outcomes or the preceding
failure diagnosis. Keep the evaluation read-only unless implementation is
specifically part of the test. Assess the resulting plan/findings against the
cases below and record actual outcomes; a prompt alone is not a passed evaluation.

## Cases and required decisions

| Case                | Request / raw situation                                                                                                           | Required decision                                                                                                                      | Failure                                                                                                                             |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Shared family       | Implement a decision surface; upstream reexports the regular dialog's parts and calls its root owner; local Dialog already exists | Trace the dependency chain, repair/reuse Dialog or migrate both to a common owner; record only decision-specific policy locally        | Build a second modal/state/lifecycle owner while citing shared focus utilities as sufficient reuse                                  |
| External appearance | Component JSX contains `cn-*` classes and flex layout; a registry stylesheet supplies a bordered muted footer also used by a card | Follow the classes to the stylesheet, select/reconcile the preset, map the footer to shared library presentation                       | Copy only flex/gap utilities, approve a plain action row, or claim shadcn imports Card when it does not                             |
| Independent options | Content exposes an optional corner close control; Footer independently exposes a close action                                     | Map and test both options, defaults and placement; reconcile the assigned component's contract separately                              | Treat Cancel in a footer as coverage for every close-control capability or copy Dialog defaults into Alert Dialog without authority |
| Existing bad owner  | A local sibling has focus/cleanup defects that the assigned component also needs fixed                                            | Repair the shared owner or migrate its affected consumers; verify actual adoption                                                      | Add a new supposedly shared controller used only by the new component while leaving duplicate sibling logic                         |
| Lost gates          | A record lists many successful browser checks but omits gate/source tables or retains unresolved required APIs                    | Reject implementation/verification/completion at the appropriate boundary and restore evidence/mapping                                 | Infer completion from test count, relabel the task "core implementation", or replace the gate table with favorable prose            |
| Unrelated family    | Implement a selection component whose upstream shares behavior with another selection control                                     | Trace and preserve that family's actual dependencies and appearance; keep unique policies local                                        | Repeat Dialog-specific rules without investigating the requested family                                                             |
| Bounded task        | Fix only a documented typo; no behavior, anatomy or appearance changes                                                            | Preserve the bounded scope; mark unaffected gates/checkpoints not applicable with concrete evidence                                    | Force a component rewrite or full visual matrix because every skill gate exists                                                     |
| Semantic anatomy    | A part requires native semantic DOM; another component merely looks similar                                                       | Preserve required semantics and reuse the appropriate behavior/presentation owner                                                      | Wrap every surface in Card or replace required native anatomy indiscriminately                                                      |
| Intermittent flash  | User reports controls flickering after selection; computed styles fade smoothly and synthetic clicks look clean                   | Capture painted frames or the user's recording, isolate a plain-HTML repro, search known browser defects, fix through the shared owner | Guess at crossfades or press offsets from computed styles, disable one component's transitions, or add a new background transition  |
| Widget placement    | Implement a color picker or another specialized control                                                                           | Build it under `src/widgets/<widget>/` with the widget catalog, family list, `register/widgets` and `Widgets/` story, governed by the Widgets specification | Add it to `src/components/`, the component catalog, `src/register.ts` or the main index, or skip the widget specification gap  |

Record any source or tool limitation as a limitation of that evaluation. A
read-only plan evaluation does not certify the component or its browser behavior.
