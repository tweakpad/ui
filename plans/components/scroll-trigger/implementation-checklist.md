# Component implementation and evidence record

## Delivery and source record

- Component(s) / public identity: Scroll trigger, `tp-scroll-trigger` (CL `ucl21-scroll-trigger`, Foundation §18.18 `sec-1818-viewport-reveal`); shared owners `foundation/reveal-coordination.ts`, `viewport-trigger.ts`, `reveal-playback.ts`
- Requested work / claim: complete component. A viewport trigger works like the existing observers and coordinates descendant images and texts. Image viewport logic is refactored onto one shared owner, keeping identical behaviour.
- Scope source: user messages of 2026-10-08:
  - "…one for the viewport and another for the text animation itself. Viewport trigger should work pretty much as our existing observers …"
  - Answers: "Coordinate descendants (Recommended)" and "Yes, one shared owner (Recommended)".
  - Approved plan: `~/.claude/plans/create-a-new-image-breezy-curry.md`.
- In-scope changes and existing gaps:
  - New: `src/components/scroll-trigger/`, family `presentation/families/scroll-trigger.ts`, registration, elements and catalog.
  - Docs `docs/scroll-trigger.md`; stories and examples.
  - The image refactor (see the image record).
  - Gaps are listed under Completion.
- Repository baseline / unrelated changes: `9e16b4a` (development), clean at start
- Live project / document IDs and revisions: Spec Blocks `prj_c5a403a0-…`; commits `dc3ac91` (v0.9.0), `e3c96ec` (v0.9.1) and `b74e9d5` (v0.10.0: `vr-scrub`, `vr-pin`, `tm-scrub`, `img-scrub`, the Stage part and the scrub/pin properties) and `a3e2ef1` (v0.10.1: pinning sized from the visible extent)
- Owning contracts / dependencies / vocabulary: Foundation §18.18 `vr-*`; CL `ucl21-scroll-trigger`, `audit-cov-scroll-trigger`; managed term Scroll trigger (new), Trigger (amended to distinguish it)
- Local Base UI / Floating UI / shadcn evidence:
  - No upstream equivalent in `../specification/external/` (clean checkouts).
  - External reference: the documentation of a text animation library's viewport-entry helper (once/repeat, margin, amount; stagger from first/last/center).
- Tool readiness: direct Spec Blocks MCP available; Chrome DevTools MCP available
- Browser / server / build under test: Chrome (MCP), Vite `http://localhost:5191`, Storybook `http://localhost:6006`
- Evidence directory: `tmp/component-verification/text-motion/` (shared fixture runs)
- Durable verification fixtures / served URLs: `tests/fixtures/components/text-motion/index.html` (`#case-trigger`), `tests/fixtures/components/image/index.html` (groups)
- Evidence availability to the next agent: local only

## Capability and interface mapping

| ID   | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status  | Evidence / gap   |
| ---- | ------------------------------------- | -------------- | ---------------------------- | ------------------------------ | ------------- | ------------ | ------- | ---------------- |
| C-01 | Entry signals: near 25%, in view, out; repeat inset −10%; release after reveal | `vr-signals` | inView margin/amount | `ViewportTrigger` | Entry | V-01, V-04 | passed | shared observers per option set |
| C-02 | Membership: nearest coordinator across shadow roots; pending before definition; nested coordinator is a member | `vr-membership` | n/a | `RevealMembership`, `nearestRevealCoordinator`, composite `#member` | Members | V-02, V-05 | passed | unit tests and image nested group |
| C-03 | Readiness and status idle/loading/ready with ready/failed/total; prepare when near | `vr-readiness` | n/a | `coordinatorStatus`, `prepare()` | Events | V-01, V-03 | passed | images loaded before entry |
| C-04 | Sequence: document order, stagger, stagger-from; late joiners reveal at once; repeat reset | `vr-sequence` | stagger `from` | `#play`, `staggerPositions` | Properties | V-02, V-04 | passed | unit tests and image fixture repeat group |
| C-05 | Hold and events with sequence guard; delays scaled by motion policy | `vr-events` | n/a | `revealHold`; events | Events | V-02, V-03 | passed | event timings in the trigger log |
| C-06 | Layout stability: block before and after definition; no box changes | `vr-layout` | n/a | `:host { display: block }`, `styles.css` pre-definition rule | Members | V-06 | passed | 0 diffs on late definition |
| C-07 | Reduced motion and no observer: immediate once ready, no stagger | `vr-motion-policy` | n/a | `revealsImmediately` | Entry | V-07 | passed | motion-policy reduce verified on a member |
| C-08 | Public API: status, members, revealed; data-status, data-in-view, data-revealed | `stl-api` | n/a | getters; `marker: true` | Properties, Events | V-01 | passed | getters and markers read in the fixture |
| C-09 | Scroll-linked progress over contain/cover/entry/exit through the shared scroll field; smoothing | `vr-scrub` | scroll-driven view-timeline ranges | `scroll-progress.ts` `observeScrollProgress`, `rangeProgress`; `scrub`, `scrub-range`, `scrub-smoothing` | Scroll-linked reveals | V-09, V-10 | passed | progress follows the scroll linearly; smoothing trails then settles |
| C-10 | Forward-only by default; `reveal-repeat` reverses | `vr-scrub` | n/a (user decision) | `#scrolled` highest-progress rule | Scroll-linked reveals | V-09, V-10 | passed | stays at 1 when scrolling back; reverses with repeat |
| C-11 | Timed choreography mapped onto scroll; hold; reduced motion; events, including `tp-scroll-progress` | `vr-scrub` | n/a | `#measureTimeline`, `#presentTime`; member `duration`/`scrub` | Scroll-linked reveals, Events | V-09, V-11 | passed | unit tests plus fixture choreography |
| C-12 | Pin: track of 100svh + pin length, sticky Stage, identical before definition | `vr-pin` | n/a | `pin`, `stage` part, `styles.css` | Pinning | V-12, V-13 | passed | stage sticks; 0 shifts on late definition |

### Gaps and conflicts

| Issue | Concrete missing/conflicting contract | Affected dependencies | Proposed resolution | Authority / resolution evidence | Status |
| ----- | ------------------------------------- | --------------------- | ------------------- | ------------------------------- | ------ |
| G-01 | Managed term Trigger meant only a floating-surface opener | Vocabulary | New term Scroll trigger; Trigger's definition distinguishes it | Spec commit `dc3ac91` | passed |
| G-02 | Nested image groups were independent before (`img-group`); now a nested coordinator is a member | Image group nesting | Generic membership rule (`vr-membership`); image docs updated | Spec commit `dc3ac91`; image V-29 | passed |

## Architecture and reuse

### Family dependency map

| Responsibility | Upstream dependency path / symbol          | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| -------------- | ------------------------------------------ | --------------------------------- | ------------------------------------------------- | ------------------------------------------ |
| Coordination | n/a | `components/image/group-protocol.ts`, `image-group.ts` | One `RevealCoordinator`; Image group keeps only its `loaded` wording and image counts | `tp-image-group`, `tp-scroll-trigger`; V-02, image V-27 |
| Viewport entry | inView | image and group duplicated observers | `ViewportTrigger` | trigger, group, image, text motion; V-01 |
| Shared intersection service | n/a | `observeIntersection` | Reused unchanged | all |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations        | Scenario IDs |
| -------------------- | ---------------------------- | ----------------------------------------- | ----------------------------------- | -------------------------------------- | ------------ |
| Root | none | n/a | none; paints no surface | `stl-presentation` | V-06 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| ------------------ | ----------- | ------------------------------- | ----------------------------------- | --------------------------------------------- |
| Stories default | heading, images, caption | `tp-text-motion`, `tp-image-group`, `tp-image` | V-03 | Grid wrapper div for layout |
| Image docs coordinated example | sequencing | `tp-scroll-trigger` replaces the former scripted hold | V-03 | none |

## Verification scenarios

| ID   | Capability IDs / evidence category | Setup and input     | Expected result     | Actual result | Tool/command and evidence  | Status  | Justification / gap |
| ---- | ---------------------------------- | ------------------- | ------------------- | ------------- | -------------------------- | ------- | ------------------- |
| V-01 | C-01, C-03, C-08; behavior | Scroll to `#case-trigger` | Status ready, members in order, data markers | status ready; members heading, group, caption | MCP evaluate | passed | Observed in Chrome DevTools MCP on 2026-10-08 against `tests/fixtures/components/text-motion/index.html` |
| V-02 | C-02, C-04, C-05; unit | Fake members and observers | Order, hold, stagger, late joiner, repeat reset, nested | 8 tests pass | vitest `src/foundation/reveal-coordination.test.ts` | passed | vitest run 2026-10-08 |
| V-03 | C-03, C-05; timing | Trigger log | heading, then images at 200ms + 120ms steps, then caption at 400ms | completes at 623, 764, 885, 1004 and 1175ms | MCP event log | passed | Observed in Chrome DevTools MCP on 2026-10-08 against `tests/fixtures/components/text-motion/index.html` |
| V-04 | C-01, C-04; repeat | Image fixture repeat group: leave and re-enter | Reset on out, replay on entry | group and members reset | MCP evaluate | passed | Observed in Chrome DevTools MCP on 2026-10-08 against `tests/fixtures/components/image/index.html` |
| V-05 | C-02; nesting | Image fixture outer and inner groups | Inner is a member and plays its stagger after its delay | inner delays 0/100/200ms | MCP evaluate | passed | Observed in Chrome DevTools MCP on 2026-10-08 against `tests/fixtures/components/image/index.html` |
| V-06 | C-06; layout stability | `?defer=1500` | No movement | all diffs 0, 0 shifts | MCP evaluate | passed | Observed in Chrome DevTools MCP on 2026-10-08 against `tests/fixtures/components/text-motion/index.html` |
| V-07 | C-07; reduced motion | `motion-policy="reduce"` member | Immediate | text motion at rest immediately | MCP evaluate | passed | Observed in Chrome DevTools MCP on 2026-10-08 (shared reveal playback); OS toggle not emulated |
| V-08 | C-08; docs | Storybook Docs default and examples | Composition reveals; second trigger waits off screen | first revealed; second pending | MCP evaluate and screenshot | passed | Observed in Chrome DevTools MCP on 2026-10-08 in Storybook `components-scroll-trigger--docs` |
| V-09 | C-09 to C-11; scrub | Pinned forward-only section at 0, 0.15, 0.35, 0.6, 1, then back to 0.5 and 0 | Progress linear; words, images and caption in choreography order; stays revealed going back | progress 0→1; word 0 then word 3; image then caption; stayed at 1 | MCP evaluate | passed | Observed in Chrome DevTools MCP on 2026-10-08 against `tests/fixtures/components/scroll-trigger/index.html` |
| V-10 | C-09, C-10; reversing | `reveal-repeat` with `scrub-smoothing="0.8"`, center stagger | Trails then settles; follows the scroll back to 0; un-reveal event | 0.486 after 30ms, then 1; back to 0; `reveal-change:false` fired | MCP evaluate | passed | Observed in Chrome DevTools MCP on 2026-10-08 against `tests/fixtures/components/scroll-trigger/index.html` |
| V-11 | C-11; unit | Nested coordinator timeline, hold, return to timed | Member times = time − offset; hold → 0; null → timed | 10 coordination tests pass | vitest `reveal-coordination.test.ts`, `scroll-progress.test.ts` | passed | vitest run 2026-10-08 |
| V-12 | C-12; pinning | Late definition `?defer=1500` | Same page height and positions; 0 shifts | height 8184 = 8184; all diffs 0; 0 shifts | MCP evaluate | passed | Observed in Chrome DevTools MCP on 2026-10-08 against `tests/fixtures/components/scroll-trigger/index.html` |
| V-13 | C-12; Storybook | Pinned scene and reversing band demos, each in its own scroll container (`container-type: size`) with intro and outro content | Stage fills the container and sticks; progress 0→1 within the container; no blank areas | scroller 416px, track 1040px (416 + 150cqb), stage 416px stuck throughout; band 0→1 and back; screenshots show no gaps | MCP evaluate and screenshots | passed | Observed in Chrome DevTools MCP on 2026-10-08 in Storybook `components-scroll-trigger--docs`; page-level pinning falls back to the viewport (fixture: stage 900px, track 2700px) |
| V-14 | C-09; performance | 808-character split text scrubbed with a pin | No layout per frame | trace: 16 style recalculations totalling 8ms, a few ms of script, no Layout from the scrub; Lighthouse a11y 90 only from contrast flagged on pieces mid-reveal (transient, aria-hidden) | MCP trace `tmp/component-verification/scroll-trigger/scrub-trace.json` | passed | Observed in Chrome DevTools MCP on 2026-10-08 against `tests/fixtures/components/scroll-trigger/index.html` |

## Early integration checkpoint

| ID   | Check                                                                                             | Status  | Evidence / unresolved finding                               |
| ---- | ------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------- |
| I-01 | Shared owners are actually used by related consumers; old duplicate behavior is removed/delegated | passed | `image-group.ts` delegates to `RevealCoordinator`; `group-protocol.ts` removed |
| I-02 | Default visual regions match traced source and shared library recipes                             | passed | No surface (Storybook screenshot) |
| I-03 | Independent constituent options work, including placement separately from action behavior         | passed | stagger, stagger-from, repeat, hold (V-02 to V-05) |

## Gate record

| Gate                                  | Status  | Required exit evidence / remaining work                                               |
| ------------------------------------- | ------- | ------------------------------------------------------------------------------------- |
| 0. Sources and scope                  | passed | Spec v0.9.x and user scope |
| 1. Capability mapping                 | passed | C-01 to C-08 |
| 2. Architecture and composition reuse | passed | One coordinator owner |
| 3. Behavior                           | passed | V-01 to V-05 |
| 4. Presentation and customization     | passed | No surface; markers |
| 5. Accessibility                      | passed | Generic container without semantics; members keep theirs (V-01 AX snapshot of the fixture) |
| 6. Visual and interaction inspection  | passed | V-06, V-08 |
| 7. Documentation and demo reuse       | passed | `docs/scroll-trigger.md`, stories, image docs example |
| 8. Regression and reconciliation      | passed | vitest, lint, build, image regression |

## Documentation synchronization

- `docs/scroll-trigger.md` (new); `docs/image.md` (groups and coordination); `docs/motion.md`.
- Stories: `scroll-trigger.stories.ts`, `scroll-trigger.examples.ts`. The image coordinated example now uses the trigger, and `src/stories/image-example.js` was removed.

## Completion / handoff

- Delivered and verified as recorded, including the scroll-linked reveals and pinning (v0.10.0). Evidence is local.
- Behaviour change: nested Image groups are now members of the outer coordinator, not independent (G-02).
- The OS-level reduced-motion toggle was not emulated.

- A pinned trigger needs no clipping ancestor between it and its scroller, as for any sticky element. Inside a scroll container, give the container `container-type: size` so the stage fills it.
