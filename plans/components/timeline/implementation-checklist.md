# Component implementation and evidence record

## Delivery and source record

- Component(s) / public identity: Timeline, `tp-timeline` with constituent `tp-timeline-item` (CL `ucl21-timeline`, Foundation §18.20 `sec-1820-timeline`)
- Requested work / claim: complete component. A display-only timeline backbone, vertical and horizontal, with start, end and alternating sides. It supports expandable/collapsible items through composition, and has compositions for step trackers, roadmaps, phases, conversations and changelogs.
- Scope source: user message of 2026-10-08 ("Lets plan for a new component called timeline …").
  - Answers: "Root value + item override (Recommended)", "Compose Collapsible in items (Recommended)", "Display only (Recommended)", and "Yes, author and commit (Recommended)" for the spec.
  - Approved plan: `~/.claude/plans/lets-plan-for-a-keen-hollerith.md`.
- In-scope changes and existing gaps:
  - New `src/components/timeline/`, family `presentation/families/timeline.ts` and recipe `presentation/recipes/timeline.ts`.
  - Registration, elements and catalog.
  - Docs `docs/timeline.md`, stories and examples, and fixture `tests/fixtures/components/timeline/`.
  - The reference's circular progress ring needs a circular Progress that the library does not have. It is out of scope; any content can go in the marker slot.
- Repository baseline / unrelated changes: `8db6e86` (development), clean at start
- Live project / document IDs and revisions:
  - Spec Blocks `prj_c5a403a0-d1d5-4487-ac78-f4e545f46483`.
  - Read at head `a3bad05b` (v0.11.1).
  - Timeline committed as `2ac6c59d` (v0.12.0): `sec-1820-timeline` (`tl-*`), `ucl21-timeline` (`tll-*`), `audit-cov-timeline`, `tbl-cl-158-timeline-connector` and managed term Timeline.
- Owning contracts / dependencies / vocabulary:
  - Foundation `tl-anatomy`, `tl-membership`, `tl-status`, `tl-segments`, `tl-sides`, `tl-geometry`, `tl-a11y`, `tl-interaction`, `tl-motion`, `tl-edges`.
  - CL `tll-props`, `tll-api`, `tll-composition`, `tll-presentation`, `tll-public-definition` and `tll-presentation-keys`.
  - Dependencies: Separator `ucl21-separator` / `sec-185-separator`, Collapsible `ucl16-collapsible`, Scroll area `ucl21-scroll-area`, motion requests `sec-64-motion-requests-and-drivers`, reduced motion `audit-sec-126-reduced-motion-policy`.
  - Vocabulary: `align` is the established axis (glossary "Variant axis"; Bubble `align`).
- Local Base UI / Floating UI / shadcn evidence: none of the references (clean checkouts) has a behavioral Timeline or Stepper. The informative sources are:
  - `../specification/external/base-ui/docs/src/components/ReleaseTimeline/ReleaseTimeline.tsx` and `.css`: `ul`/`li`, spine pseudo-element, dot with halo, alternating 2-column grid.
  - `../specification/external/videojs-v10/site/src/components/docs/Step.astro`: `ol`, connector per item hidden on the last, number `aria-hidden`.
  - shadcn `ui/apps/v4/mdx-components.tsx` Steps: CSS counter badges over a border spine.
  - There is no `cn-timeline` or `cn-stepper` anywhere in `ui/apps/v4/registry/styles/`.
- Tool readiness: direct Spec Blocks MCP available; Chrome DevTools MCP available
- Browser / server / build under test: Chrome (MCP), Vite dev server, Storybook
- Evidence directory: `tmp/component-verification/timeline/<run>/`
- Durable verification fixtures / served URLs: `tests/fixtures/components/timeline/index.html`
- Evidence availability to the next agent: local only

## Capability and interface mapping

| ID   | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status  | Evidence / gap   |
| ---- | ------------------------------------- | -------------- | ---------------------------- | ------------------------------ | ------------- | ------------ | ------- | ---------------- |
| C-01 | Root list semantics, accessible name (aria-label / aria-labelledby) | `tl-a11y` | ReleaseTimeline `ul[aria-label]` | `TpTimeline` part `timeline` role=list; name forwarded | API: Accessibility | V-01, V-14 | passed | see scenario rows; run-1 evidence |
| C-02 | Membership: element children that are Items, document order, dynamic insert/remove/reorder; nested timelines independent | `tl-membership`, `tl-edges` | n/a | `#sync` on slotchange and item notification | API: Items | V-02, V-03 | passed | see scenario rows; run-1 evidence |
| C-03 | Item index, first, last exposed and reflected (`data-index`, `data-first`, `data-last`) | `tl-membership`, `tll-api` | n/a | `index` getter; host attributes | API: Item state | V-02 | passed | see scenario rows; run-1 evidence |
| C-04 | `value` (null) derives complete/current/upcoming; null/empty/no match gives none | `tl-status`, `tll-props` | n/a | `timelineState()` in `state.ts` | API: Status | V-04, V-05 | passed | see scenario rows; run-1 evidence |
| C-05 | Item `status` override without affecting others; duplicate values warn via `tp-diagnostic` | `tl-status` | n/a | `status` property; `#diagnose` | API: Status | V-05, V-06 | passed | see scenario rows; run-1 evidence |
| C-06 | Segment status: complete if earlier item complete, none if both none, otherwise upcoming; first before and last after hidden | `tl-segments` | videojs `last:before:hidden` | connector `data-status`, `hidden` | API: Connectors | V-04, V-07 | passed | see scenario rows; run-1 evidence |
| C-07 | `align` start/end/alternate/alternate-reverse (default end) | `tl-sides`, `tll-props` | ReleaseTimeline odd/even | root `align`; item `side` | API: Sides | V-08 | passed | see scenario rows; run-1 evidence |
| C-08 | Item `align` start/end overrides the side | `tl-sides` | n/a | item `align` | API: Sides | V-08, V-20 | passed | see scenario rows; run-1 evidence |
| C-09 | Logical sides; horizontal start above, end below; RTL mirrors the inline flow | `tl-sides` | n/a | grid named tracks with logical properties | API: Direction | V-13 | passed | see scenario rows; run-1 evidence |
| C-10 | `orientation` vertical (default) / horizontal / responsive at 40rem; vertical alternate falls back to end below 40rem | `tl-geometry`, `tll-props` | Field `orientation=responsive` container query | root container query; generated horizontal rules | API: Orientation | V-09, V-10 | passed | see scenario rows; run-1 evidence |
| C-11 | Continuous axis: markers on one track, connectors meet markers, size changes lengthen connectors (subgrid) | `tl-geometry` | ReleaseTimeline spine | root grid with three tracks; item subgrid | Geometry | V-07, V-11 | passed | see scenario rows; run-1 evidence |
| C-12 | Vertical marker on the first line of content (`--tp-timeline-marker-offset`); horizontal marker centered | `tl-geometry`, `tll-presentation` | n/a | rail flex; before segment block size | Customization | V-11, V-12 | passed | see scenario rows; run-1 evidence |
| C-13 | Slots: `marker` (Dot fallback), default Content, `opposite` | `tl-anatomy`, `tll-anatomy` | MUI-like anatomy | item slots | API: Slots | V-12, V-19 | passed | see scenario rows; run-1 evidence |
| C-14 | Parts: `timeline`, `timeline-item`, `-marker`, `-dot`, `-connector-before`, `-connector-after`, `-connector-fill`, `-content`, `-opposite` | `tll-public-definition` | n/a | `renderPart` | API: Parts | V-15 | passed | see scenario rows; run-1 evidence |
| C-15 | Connector tracks are decorative `tp-separator` instances in the axis orientation | `tll-composition` | n/a | `renderPart({tag:'tp-separator'})`, `elementDependencies` | Composition | V-07, I-01 | passed | see scenario rows; run-1 evidence |
| C-16 | `aria-current=step` on the first current item only | `tl-a11y` | none upstream | `OwnedAttributes` | Accessibility | V-14 | passed | see scenario rows; run-1 evidence |
| C-17 | Status text before the content from `messages` (Completed / Current / Not started); Dot and connectors `aria-hidden` | `tl-a11y`, `tll-props` | code-block `messages` pattern | `TimelineMessages`, `.visually-hidden` | Accessibility | V-14, V-16 | passed | see scenario rows; run-1 evidence |
| C-18 | Display-only: no focus, tab stop or keys; interactive descendants keep their behavior | `tl-interaction` | n/a | no tabindex or listeners | Accessibility | V-17 | passed | see scenario rows; run-1 evidence |
| C-19 | Collapsible composition keeps the marker aligned and the rail continuous while the panel opens | `tll-composition`, `tl-geometry` | Accordion composes Collapsible | composition only | Example: Phases | V-18 | passed | see scenario rows; run-1 evidence |
| C-20 | Connector motion role `connector` (state: change, context status, index); reduced motion final immediately; no background transition | `tl-motion`, `tbl-cl-158-timeline-connector` | Progress `value` role | `prepareMotion`, transform fill | Motion | V-21 | passed | see scenario rows; run-1 evidence |
| C-21 | Height-neutral changes of value, status, side and membership | `tl-motion` | memory: no layout shift | fixed dot geometry; hidden status text | Motion | V-22 | passed | see scenario rows; run-1 evidence |
| C-22 | Presentation: no surface; Dot complete filled, current ring with halo, upcoming/none muted outline; complete fill foreground, tracks border color | `tll-presentation` | ReleaseTimeline dot halo | `recipes/timeline.ts` | Customization | V-15, V-23 | passed | see scenario rows; run-1 evidence |
| C-23 | Geometry tokens `--tp-timeline-gap`, `--tp-timeline-rail-gap`, `--tp-timeline-item-min-size`, `--tp-timeline-dot-size`, `--tp-timeline-marker-offset` | `tll-presentation` | n/a | structural CSS custom properties | Customization | V-23 | passed | see scenario rows; run-1 evidence |
| C-24 | Read-only API: root `items`; item `index`, `resolvedStatus`, `side`; no change events | `tll-api` | n/a | getters | API | V-02, V-04 | passed | see scenario rows; run-1 evidence |
| C-25 | Disconnection/reconnection releases and restores attributes set by the root | `tl-edges` | List item group `OwnedAttributes` | `dispose` / resync | Lifecycle | V-03 | passed | see scenario rows; run-1 evidence |
| C-26 | Horizontal overflow composes Scroll area | `tll-basis` | n/a | composition | Example: Roadmap | V-19 | passed | see scenario rows; run-1 evidence |

| Issue | Concrete missing/conflicting contract | Affected dependencies | Proposed resolution | Authority / resolution evidence | Status |
| ----- | ------------------------------------- | --------------------- | ------------------- | ------------------------------- | ------ |
| G-01 | No Timeline contract existed in the live spec | whole component | Authored Foundation §18.20, CL §21.19, the coverage row, the motion role row and the managed term | Spec commit `2ac6c59d` (v0.12.0), authorized by the user | passed |
| G-02 | Circular progress marker (reference screenshot) has no library owner | Phases example | Out of scope; the marker slot accepts content; use a `tp-icon` or text marker | Recorded gap | not applicable |

## Architecture and reuse

- Component folder and responsibility boundaries:
  - `src/components/timeline/`: `index.ts`; `state.ts` (pure status/segment/side derivation) with `state.test.ts`; `messages.ts`; `timeline.ts` (root: membership, derivation, owned attributes, diagnostics); `timeline-item.ts` (rail, slots, connectors, status text, motion); `layout.ts` (structural CSS shared by root and item for the generated horizontal rules).
- Supported exports / registration / constituent API impact: new exports `TpTimeline`, `TpTimelineItem` and types. New catalog row `['Timeline', 'tp-timeline', 'compound-reexport']`, registration of both tags, and `HTMLElementTagNameMap` entries.
- Public vocabulary / tokens / parts / presentation review: `orientation` (TpElement) and `align` (glossary axis, as in Bubble); `value` and `status` match Progress/Accordion terms; `messages` follows the code-block pattern; parts and tokens follow `tll-public-definition` and `tll-presentation`.

### Family dependency map

| Responsibility | Upstream dependency path / symbol          | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| -------------- | ------------------------------------------ | --------------------------------- | ------------------------------------------------- | ------------------------------------------ |
| Connector track | none (ReleaseTimeline pseudo-element spine) | `src/components/separator/separator.ts` `TpSeparator`; precedent `list-item/separator.ts` | Reuse `tp-separator` as a decorative track in the axis orientation; only the Fill overlay is local | `tp-timeline-item`, `tp-list-item-separator`; V-07, I-01 |
| List membership and child attributes | none | `src/components/list-item/group.ts` `TpListItemGroup` (`OwnedAttributes`, role listitem) | Same pattern: `OwnedAttributes` for role and aria-current; ordering by element children | `tp-timeline`; V-02, V-03 |
| Disclosure | Base UI Collapsible | `src/components/collapsible.ts` `TpCollapsible` | Composition inside item content; no timeline disclosure | Phases example; V-18 |
| Motion request | `foundation/motion.ts` `prepareMotion` | Progress `value` role (`progress/motion.ts`) | Same request API with a `connector` role definition | `tp-timeline-item`; V-21 |
| Localized strings | n/a | code-block `messages` + `DEFAULT_CODE_BLOCK_MESSAGES` | Same pattern: `TimelineMessages` + `DEFAULT_TIMELINE_MESSAGES` | V-16 |
| Diagnostics | n/a | Accordion `#diagnose` (`tp-diagnostic`) | Same event and shape, severity warning | V-06 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations        | Scenario IDs |
| -------------------- | ---------------------------- | ----------------------------------------- | ----------------------------------- | -------------------------------------- | ------------ |
| Root / Item | none (no shadcn source) | n/a | none; paints no surface (`tll-presentation`) | Structure only | V-15 |
| Connector track | none | ReleaseTimeline `.ReleaseTimeline::before` 1px | `tp-separator` recipe `separator` (`--tp-border`) | Reused as is | V-07 |
| Connector fill | none | n/a | timeline recipe: `--tp-foreground` | Contract `tll-presentation` | V-21 |
| Dot | none | ReleaseTimeline `.TimelineItem::before` (dot + halo box-shadow) | timeline recipe with tokens `--tp-foreground`, `--tp-border`, `--tp-background`, `--tp-ring` | Contract states | V-23 |
| Content / Opposite | none | n/a | none; inherit typography; opposite muted (`--tp-muted-foreground`, `--tp-text-sm`) | Item content comes from composed components | V-12 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| ------------------ | ----------- | ------------------------------- | ----------------------------------- | --------------------------------------------- |
| Internals | connector track | `tp-separator` | V-07 | Fill is a decorative span (no library owner for a connector fill) |
| Base example | dates | `tp-time` | V-19 | Native headings/paragraphs for text |
| Order status | surface, meta | `tp-card`, `tp-time` | V-19 | none |
| Deployment pipeline | check / number markers, progress footer | `tp-icon` (check), `tp-progress`, `tp-card` | V-19 | Number text in the marker slot is plain text |
| Roadmap | horizontal overflow | `tp-scroll-area`, `tp-card` | V-19 | none |
| Phases | expandable rows, status badge, markers | `tp-collapsible`, `tp-badge`, `tp-icon`, `tp-card` | V-18 | Circular progress ring: gap G-02 |
| Conversation | avatars, bubbles, times | `tp-avatar`, `tp-bubble`, `tp-time` | V-20 | none |
| Changelog | version label, entry markers | `tp-badge`, `tp-marker`, `tp-time` | V-19 | Version text in `opposite` is plain text |

## Verification scenarios

| ID   | Capability IDs / evidence category | Setup and input     | Expected result     | Actual result | Tool/command and evidence  | Status  | Justification / gap |
| ---- | ---------------------------------- | ------------------- | ------------------- | ------------- | -------------------------- | ------- | ------------------- |
| V-01 | C-01; a11y tree | Fixture, aria-label and aria-labelledby | list with name; items listitem | `list "Order status"` and `list "Deploy started"` (aria-labelledby); five listitems. Host role attribute, so axe sees it too | MCP snapshot tmp/component-verification/timeline/run-1/a11y-verbose-2.txt | passed | No remaining gap; observed result recorded in Actual result (2026-10-09, Chrome DevTools MCP / local commands) |
| V-02 | C-02, C-03, C-24; behavior | Read items, index and data attributes | ordered; first/last flags | index 0..4, data-first on 0, data-last on 4 | MCP evaluate | passed | No remaining gap; observed result recorded in Actual result (2026-10-09, Chrome DevTools MCP / local commands) |
| V-03 | C-02, C-25; dynamic | Add, remove and reverse with real clicks; detach/reattach an item and the root | recomputed; attributes released and restored | reversed order re-derived (extra-1:0:complete:first … confirmed:4:upcoming:last); a detached item lost role, aria-current and data-index; the root role was removed on disconnect and restored on reconnect | MCP click + evaluate | passed | No remaining gap; observed result recorded in Actual result (2026-10-09, Chrome DevTools MCP / local commands) |
| V-04 | C-04, C-06, C-24; behavior | Next click: value=transit | 1–3 complete, 4 current, 5 upcoming; segments | statuses and before/after segments exactly as specified; aria-current=step only on transit | MCP click + evaluate; unit `state.test.ts` | passed | No remaining gap; observed result recorded in Actual result (2026-10-09, Chrome DevTools MCP / local commands) |
| V-05 | C-04, C-05; behavior | Clear value; status overrides without value | none everywhere; override only on that item | cleared: all none and no status text; markers case: complete/current/upcoming overrides | MCP evaluate; unit | passed | No remaining gap; observed result recorded in Actual result (2026-10-09, Chrome DevTools MCP / local commands) |
| V-06 | C-05; diagnostics | Duplicate value appended | one tp-diagnostic warning | `timeline-duplicate-value`, severity warning, once | MCP evaluate | passed | No remaining gap; observed result recorded in Actual result (2026-10-09, Chrome DevTools MCP / local commands) |
| V-07 | C-06, C-11, C-15; visual | Vertical and horizontal with value | continuous line; complete segments filled; ends hidden | continuous Separator track; fill up to current; first before and last after hidden | MCP screenshot tmp/component-verification/timeline/run-1/fixture-full.png | passed | No remaining gap; observed result recorded in Actual result (2026-10-09, Chrome DevTools MCP / local commands) |
| V-08 | C-07, C-08; visual | start, end, alternate (alternate-reverse in unit tests) | sides as specified | end/start/alternate sides correct; alternate-reverse sides verified in unit tests only | tmp/component-verification/timeline/run-1/fixture-full.png; unit | passed | No remaining gap; observed result recorded in Actual result (2026-10-09, Chrome DevTools MCP / local commands) |
| V-09 | C-10; visual | orientation horizontal | columns; rail row aligned | rail row aligned across uneven content (horizontal alternate) | tmp/component-verification/timeline/run-1/fixture-full.png | passed | No remaining gap; observed result recorded in Actual result (2026-10-09, Chrome DevTools MCP / local commands) |
| V-10 | C-10; responsive | Containers at 720px and 420px | horizontal ≥40rem, vertical below; alternate collapses to end | 720px horizontal; 420px vertical; alternate at 420px all on end side with one marker track | MCP evaluate rects + tmp/component-verification/timeline/run-1/narrow-alternate-responsive.png | passed | No remaining gap; observed result recorded in Actual result (2026-10-09, Chrome DevTools MCP / local commands) |
| V-11 | C-11, C-12; geometry | Long content in alternate/opposite layouts | markers on one track; connectors stretch | dot left equal for every item (419px); connectors span item height | MCP evaluate rects | passed | No remaining gap; observed result recorded in Actual result (2026-10-09, Chrome DevTools MCP / local commands) |
| V-12 | C-12, C-13; visual | Dot, icon, avatar and number markers; opposite slot | markers centered on the first line; avatar at the start | dot/icon/number centered on the first line; avatar at the content start; opposite times aligned toward the axis | tmp/component-verification/timeline/run-1/fixture-full.png, light-collapsible-open.png | passed | No remaining gap; observed result recorded in Actual result (2026-10-09, Chrome DevTools MCP / local commands) |
| V-13 | C-09; RTL | dir=rtl horizontal and vertical | mirrored flow and sides | horizontal runs right to left with the fill from the right; vertical content and opposite mirrored | tmp/component-verification/timeline/run-1/light-collapsible-open.png | passed | No remaining gap; observed result recorded in Actual result (2026-10-09, Chrome DevTools MCP / local commands) |
| V-14 | C-01, C-16, C-17; a11y | Accessibility tree with value | aria-current once; status text before content; dot/connectors hidden | status StaticText precedes each item; dot and connectors absent from the tree; aria-current attribute verified (the snapshot tool omits the property) | tmp/component-verification/timeline/run-1/a11y-verbose-2.txt; MCP evaluate | passed | No remaining gap; observed result recorded in Actual result (2026-10-09, Chrome DevTools MCP / local commands) |
| V-15 | C-14, C-22; parts | ::part() override on all nine parts | applied | dot border, fill background, content text-align, and outline on timeline, item, marker, both connectors and opposite all applied | MCP evaluate computed style | passed | No remaining gap; observed result recorded in Actual result (2026-10-09, Chrome DevTools MCP / local commands) |
| V-16 | C-17; messages | messages = Spanish strings | new status text | Hecho / Actual / Pendiente rendered | MCP evaluate | passed | No remaining gap; observed result recorded in Actual result (2026-10-09, Chrome DevTools MCP / local commands) |
| V-17 | C-18; keyboard | Real Tab from the last control button | timeline adds no stops; links focusable | focus moved from Reverse order straight to the "View run" link inside the next timeline | MCP press_key Tab | passed | No remaining gap; observed result recorded in Actual result (2026-10-09, Chrome DevTools MCP / local commands) |
| V-18 | C-19; composition | Real click opening a Collapsible item | marker on the trigger row; rail continuous | marker center vs label center within 1px for all three items; the after connector stretched to 71px while open | MCP click + tmp/component-verification/timeline/run-1/light-collapsible-open.png, docs-phases.png | passed | No remaining gap; observed result recorded in Actual result (2026-10-09, Chrome DevTools MCP / local commands) |
| V-19 | C-13, C-26; docs examples | All seven Docs examples | render with library components | Default, Order status, Pipeline, Roadmap (Scroll area), Phases, Conversation and Changelog render; roadmap scrolls horizontally | MCP screenshots tmp/component-verification/timeline/run-1/docs-*.png | passed | No remaining gap; observed result recorded in Actual result (2026-10-09, Chrome DevTools MCP / local commands) |
| V-20 | C-08; conversation | Per-item align by author | sides follow authors | You on the end side, Sarah Chen on the start side, avatars on the axis | tmp/component-verification/timeline/run-1/docs-conversation.png | passed | No remaining gap; observed result recorded in Actual result (2026-10-09, Chrome DevTools MCP / local commands) |
| V-21 | C-20; motion | Advance value; motion-policy=reduce | transform transition; request dispatched; reduce instant | transition on transform (scaleY 0 → 1); 2 connector motion requests per step; reduce: data-reduced-motion and 0s transition | MCP evaluate | passed | No remaining gap; observed result recorded in Actual result (2026-10-09, Chrome DevTools MCP / local commands) |
| V-22 | C-21; stability | Clear value; compare item heights | no size change | heights identical; recorded layout shifts came only from fixture resizes and add/remove | MCP evaluate + PerformanceObserver | passed | No remaining gap; observed result recorded in Actual result (2026-10-09, Chrome DevTools MCP / local commands) |
| V-23 | C-22, C-23; customization + themes | Dark and light; dot size, gap and rail gap overridden | tokens followed | dot 16px, content padding 40px/24px; dark and light both legible | tmp/component-verification/timeline/run-1/overrides.png, light-collapsible-open.png | passed | No remaining gap; observed result recorded in Actual result (2026-10-09, Chrome DevTools MCP / local commands) |
| V-24 | C-02, C-14, C-22; regression | npm test, typecheck, build, Storybook build, eslint on timeline files | pass | 1368 tests pass; tsc clean; build and cem OK; Storybook build OK; timeline files lint clean. Repo lint has errors in select.ts, radix-tree.ts, select/styles.ts and segment.ts from commit b593813 (not timeline) | npm scripts | passed | No remaining gap; observed result recorded in Actual result (2026-10-09, Chrome DevTools MCP / local commands) |
| V-25 | C-15; tree-shaking | ?standalone&built: defineElement(TpTimeline) from dist | timeline, item and separator only | tp-timeline, tp-timeline-item and tp-separator defined; button, collapsible, icon and time not defined; statuses derived | MCP evaluate | passed | No remaining gap; observed result recorded in Actual result (2026-10-09, Chrome DevTools MCP / local commands) |

## Early integration checkpoint

| ID   | Check                                                                                             | Status  | Evidence / unresolved finding                               |
| ---- | ------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------- |
| I-01 | Shared owners are actually used by related consumers; old duplicate behavior is removed/delegated | passed | The diff renders `<tp-separator>` tracks (`timeline-item.ts`) with no local line drawing besides the Fill; OwnedAttributes is reused from `foundation/owned-attributes.ts`; prepareMotion from `foundation/motion.ts`; no new shared module was added; Collapsible is used only by composition |
| I-02 | Default visual regions match traced source and shared library recipes                             | passed | The track uses the Separator recipe (`--tp-border`); dot and fill use tokens in `recipes/timeline.ts`; compared in MCP screenshots against the ReleaseTimeline dot/spine evidence and the contract states |
| I-03 | Independent constituent options work, including placement separately from action behavior         | passed | orientation, root align, item align, value, status, marker slot and opposite slot each exercised independently (V-04, V-05, V-08, V-10, V-12, V-20) |

## Gate record

| Gate                                  | Status  | Required exit evidence / remaining work                                               |
| ------------------------------------- | ------- | ------------------------------------------------------------------------------------- |
| 0. Sources and scope                  | passed  | Live spec read at `a3bad05b`; Timeline committed `2ac6c59d` (v0.12.0); local references inspected (no upstream component); scope from the user's answers. |
| 1. Capability mapping                 | passed  | C-01..C-26 mapped to `tl-*`/`tll-*` with scenarios; G-01 resolved by the spec commit; G-02 recorded. |
| 2. Architecture and composition reuse | passed  | Separator, OwnedAttributes/list-group, Collapsible, motion and messages owners mapped; no parallel owner; reuse map for every demo role. |
| 3. Behavior                           | passed  | Membership, derivation, overrides, segments, dynamic changes, lifecycle, diagnostics, Collapsible composition (V-02..V-06, V-18, V-22). |
| 4. Presentation and customization     | passed  | Recipes and tokens; all nine parts overridable; geometry tokens; messages (V-15, V-16, V-23). The `align` presentational hint was neutralized on both hosts. |
| 5. Accessibility                      | passed  | Tree: list/listitem, names, status text (V-01, V-14); keyboard: no stops, links reachable (V-17); axe wcag2a/aa and best-practice: 0 violations, 34 passes. No screen-reader testing was done. |
| 6. Visual and interaction inspection  | passed  | Every orientation and align, narrow fallbacks, RTL, dark/light, custom markers, Collapsible open, motion and reduced motion (V-07..V-13, V-18, V-21). |
| 7. Documentation and demo reuse       | passed  | `docs/timeline.md` complete API; Default story with controls; six use-case examples composed from Card, Time, Icon, Progress, Scroll area, Collapsible, Badge, Avatar and Bubble (V-19, V-20). |
| 8. Regression and reconciliation      | passed  | Tests, typecheck, build, Storybook build and standalone package check pass (V-24, V-25); spec v0.12.0 reconciled with the code; unrelated lint errors from commit b593813 reported. |

## Documentation synchronization

- [x] Base example, actual Controls, constituent APIs and reference agree with code.
- [x] Added/removed/changed properties, events, methods, slots and hooks are updated.
- [x] Verification fixtures are separate from curated public examples.
- [x] Rendered and copyable compositions reuse existing components.
- [x] Imports and registration work outside Storybook's global setup.
- [x] Generator handling and changed tests preserve the intended documentation.

## Completion / handoff

- Change summary:
  - New Timeline (`tp-timeline`, `tp-timeline-item`) in `src/components/timeline/`, with family and recipe, registration and catalog.
  - Docs, stories and six use-case examples; fixture.
  - Spec Foundation §18.20 and CL §21.19 committed (`2ac6c59d`, v0.12.0).
- Actual delivery claim: complete component against the committed contract, with all gates passed through Chrome DevTools MCP and local checks.
- Record checker: implement, verify and complete stages run.
- Non-browser checks: 1368 unit tests (8 new in `state.test.ts`), tsc, `npm run build` (+cem) and Storybook build pass. Eslint is clean on the timeline files.
- Behavior: V-02..V-06, V-18, V-21, V-22 passed.
- Accessibility: tree V-01/V-14, keyboard V-17, axe 0 violations. No screen-reader testing.
- Visual/customization/motion inspection: V-07..V-13, V-15, V-23, V-21 passed.
- Documentation and demo composition reuse: V-19/V-20 passed; every nested role uses a library component (see the reuse map).
- Shared-consumer regressions / package boundaries: the Separator is unchanged; standalone defineElement from `dist` V-25 passed.
- Required failures or blocked checks: none for the timeline. The repository lint fails on files from commit b593813 (Autocomplete/Select/search) and the pre-existing `segment.ts` format; these were left untouched.
- Older out-of-scope gaps:
  - G-02 circular progress marker.
  - Bubble and Message reflect `align`, so browsers apply `text-align` to their hosts, the same hint fixed here for the timeline. Reported, not changed.
- Changed source revisions / reopened gates: the root list role moved from ElementInternals to an owned host attribute after axe; V-01/V-03/V-14 were rerun.
