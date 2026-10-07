# Component implementation and evidence record

## Delivery and source record

- Component(s) / public identity: Table of contents, `tp-table-of-contents` and `tp-table-of-contents-item`; Foundation scroll spy (`ScrollSpyController`, `collectTargets`).
- Requested work / claim: complete new component plus the structure-free scroll-spy contract.
- Scope source: User, 2026-10-07: "we now need a new component for TOC like to respond with scroll like this [screenshot] Im interested on evaluating how would this work without making assumptions on structure from the content been presented"; plan approved with items "Declared + opt-in collector", active rule "Reading line", spec "Author it directly".
- In-scope changes and existing gaps: spy engine, collector, component pair, presentation, docs, stories, catalog, workspace usage; shared repairs of the scroll-container finder (drag-drop) and indicator geometry (tabs). Vertical writing modes are measured on the physical vertical axis only (see C-20).
- Repository baseline / unrelated changes: `development` at `1a3fb31`; the earlier code-block review edits stay uncommitted and untouched.
- Live project / document IDs and revisions: `prj_c5a403a0-d1d5-4487-ac78-f4e545f46483`; Foundation `doc_cd3c4721-9f9b-4531-abab-a8bfdbac75f1`, Component Library `doc_8077bf7c-0361-48f3-ac87-53b983bd89b3`; base head `8be73e11` (v0.6.1), content `3867326e` (v0.6.2), head `bbdb4dc7` (v0.7.0). See `spec-record.md`.
- Owning contracts / dependencies / vocabulary: `sec-1815-scroll-spy`, `ucl20-table-of-contents`, `scroll-spy-reason`, `ss-b81-scroll`, `ss-b83-scroll-spy`, `audit-cov-table-of-contents`; dependencies `sec-53-changeeventt-and-changereason`, `sec-184-scrollarea`, `audit-sec-126-reduced-motion-policy`, `ucl20-breadcrumb`.
- Local Base UI / Floating UI / shadcn evidence: `../specification/external/` (clean checkouts): videojs-v10 `site/src/components/docs/TableOfContents/{index.tsx,utils.ts,TableOfContents.desktop.tsx,TableOfContents.mobile.tsx}`; shadcn `ui/apps/v4/components/docs-toc.tsx`; mapcn `src/app/(main)/docs/_components/docs-toc.tsx`; Base UI `docs/src/components/QuickNav/*`; Floating UI `website/lib/components/Layout.js`; media-chrome `docs/src/components/RightSidebar/TableOfContents.tsx`. Fumadocs is not cloned locally and is not used as evidence.
- Tool readiness: direct Spec Blocks MCP tools available and used; Chrome DevTools MCP available.
- Browser / server / build under test: Google Chrome via Chrome DevTools MCP; Storybook dev server `http://localhost:6007`.
- Evidence directory: `tmp/component-verification/table-of-contents/run-1/`
- Durable verification fixtures / served URLs: Storybook `components-table-of-contents--docs`, `--default`; workspace Brief page `catalog-project-workspace--default`.
- Evidence availability to the next agent: local only (`tmp/` is not committed).

## Capability and interface mapping

| ID | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Targets are declared by item `href` fragments; never scanned | `ssf-targets`, `toc-props` | shadcn `docs-toc.tsx` `toc[].url`; videojs `headings[].slug` | `TpTableOfContentsItem.href`, `fragment`, `resolvedTarget` | docs/table-of-contents.md "No assumptions" | V-01, V-02 | passed | Default story and docs examples resolve href targets (V-01, V-02). |
| C-02 | Element-reference targets (`target`, wins over `href`), id-less targets get a stable generated key | `ssf-targets`, `ssf-edges` | none upstream (all window/id based) | `TpTableOfContentsItem.target`, `key` | docs API | V-08 | passed | Collected example: id-less targets keyed stably per element (WeakMap) across rebuilds (V-08). |
| C-03 | Fragment resolved in the item's tree scope first, then the document | `ssf-targets` | none upstream | `resolvedTarget` via `getRootNode().getElementById` | docs API | V-08 | passed | Workspace Brief (light DOM) and docs examples resolve; programmatic path verified (V-08). |
| C-04 | Unresolved and duplicate targets excluded with one diagnostic each; hidden targets excluded silently and rejoin | `ssf-targets`, `ssf-edges` | videojs `useRenderedHeadings` visibility filter | `#entries`, `#report`; spy filters `getClientRects()` | docs Events | V-09 | passed | Late sections tracked; stale hold released (V-09). |
| C-05 | Scroll root: explicit `scrollRoot` / `scroll-root`, else nearest common overflowing container, else document; component viewports resolve to `viewportElement` | `ssf-root`, `toc-props` | videojs `getScrollParent` (TOC side only) | `commonScrollContainer` (foundation/scroll.ts), `#explicitRoot` | docs "Scroll root" | V-01, V-10 | passed | Scroll-area viewport resolved; Brief re-resolved document → viewport as content grew; explicit scroll-root (V-01, V-10). |
| C-06 | Regions from geometry: start minus scroll margin; to max(own end, next start); last to content end | `ssf-regions` | none upstream | `spyRegions` | docs "Regions" | V-02, V-03, V-19 | passed | Unit V-19; nested example (V-03). |
| C-07 | Nested targets: wrapping target stays active; indicator spans the chain | `ssf-active`, `toc-indicator` | fumadocs (not local) | `activeRegions`, `blockSpanGeometry` | docs example "Nested sections" | V-03 | passed | Guide+Overlays active, bar spans chain (V-03, nested-chain-dark.png). |
| C-08 | Reading line = scroll-padding-block-start + 1px; `activation-offset` px or % | `ssf-line`, `toc-props` | videojs `calculateActiveHeadingOffset` | `readingLine`, `parseActivationOffset` | docs "Reading line" | V-04, V-19 | passed | activation-offset 75% switches current (V-04). |
| C-09 | End reachability: line moves to end edge over the final scroll distance; non-scrolling root → end edge | `ssf-end` | none locally | `readingLine` | docs "End of the page" | V-05, V-19 | passed | Short final sections reachable (V-05, V-19). |
| C-10 | Current = innermost active; nothing before the first target | `ssf-active` | videojs last-heading-above-line | `activeRegions` | docs | V-02, V-19 | passed | Down and up keyboard scroll deterministic (V-02). |
| C-11 | Native fragment navigation when the document resolves the id; otherwise programmatic scroll honoring scroll margin, instant under reduced motion | `ssf-navigation` | videojs `navigateToHeading`; shadcn plain anchors | `#click`, `ScrollSpyController.navigate` | docs "Navigation" | V-06, V-08, V-14 | passed | Native fragment and programmatic paths (V-06, V-08); navigation=scroll keeps URL (V-21). |
| C-12 | Navigation hold: clicked target current until scrolling after settle; no sweep; focus not moved | `ssf-navigation` | none upstream | `#hold`, `#armSettle`, `scrollend` | docs "Navigation" | V-06 | passed | Single link-press change, no sweep; hold keeps target chain (V-06). |
| C-13 | Recompute once per frame on scroll, resize (root and targets), id/hidden mutations, item changes, hashchange; stops on disconnect | `ssf-updates` | videojs throttle + MutationObserver | `ScrollSpyController.schedule`, observers, `#slotChange` | docs | V-09, V-11 | passed | Typing in Brief, Add a section, reconnect (V-09, V-11). |
| C-14 | `value` / `default-value` controllable; `tp-value-change` non-cancelable with `scroll`, `link-press`, `programmatic`; controlled value never rewritten | `ssf-value`, `scroll-spy-reason`, `ss-b83-scroll-spy` | none upstream | `ControllableState`, `#spied`, `navigate()` | docs Events | V-07, V-12 | passed | Reasons scroll/link-press/programmatic, non-cancelable; controlled value kept (V-07, V-12). |
| C-15 | Accessibility: one `nav` named by Title; list/listitem; only current link `aria-current="location"`; rail/indicator hidden; focus order; no announcements | `toc-a11y` | videojs `aria-current="location"`, `nav aria-label` | `render()` nav/role=list; item `role=listitem`; link `aria-current` | docs Accessibility | V-13 | passed | A11y tree nav/list/listitem/link; aria-current on one link (V-13). |
| C-16 | Indicator spans first..last active item, hidden when none, follows layout, inline-start in every direction, glides except first placement/layout/reduced motion | `toc-indicator` | videojs desktop sliding span; tabs indicator | `#placeIndicator`, `data-animate`, motion role `indicator` | docs Customization | V-03, V-14, V-15 | passed | Spans, hides, glides; 0s under reduce (V-03, V-14, V-15). |
| C-17 | Own scroll: current link kept visible in the TOC's own scroll container only | `toc-own-scroll` | videojs `useAutoScroll` | `#revealCurrent` | docs | V-16 | passed | Own-scroll reveal without document scroll (V-16). |
| C-18 | Presentation: text-sm links, muted → foreground active/hover, rail border, indicator primary (overridable), depth indent space-3 per level, title, parts and tokens | `toc-presentation`, `toc-public-definition`, `toc-presentation-keys` | screenshot; shadcn `docs-toc.tsx` classes | families/table-of-contents.ts, recipes/table-of-contents.ts | docs Customization | V-15, V-17 | passed | Screenshots light/dark; token override (V-15, V-17). |
| C-19 | Title: `title` slot, `label`, `messages.title` (default "On this page") | `toc-props` | videojs/mapcn "On this page" | `render()`, `tocMessages` | docs API | V-17 | passed | label, messages, title slot (V-17). |
| C-20 | Text direction has no effect on measurement; block axis only | `ssf-edges` | none | spy measures `top`/`bottom` | docs | V-15 | passed | Vertical writing modes measure the physical vertical axis; recorded as a limitation. RTL rail/indicator on right, tracking unchanged (V-15). |
| C-21 | Opt-in collector: caller root and selector, no default selector, ids or depth | `ssf-collect` | Floating UI `querySelectorAll('h2,h3')` (rejected default) | `collectTargets` | docs "Building items" | V-08, V-20 | passed | Collected example and unit (V-08, V-20). |
| C-23 | `navigation` fragment (default) or scroll; scroll never changes the URL | `ssf-navigation` (amended), `tocp7` (spec v0.7.1 `80079139`) | videojs router navigate (preserves app routing) | `navigation` property, `#click` | docs API, Navigation | V-21 | passed | Workspace Brief (hash-routed) uses scroll; hash unchanged (V-21). |
| C-24 | `scroll-behavior` smooth (default), instant, auto; navigation scrolls only the scroll root; reduced motion instant | `ssf-navigation` (v0.7.2), `tocp8` | videojs navigate; none upstream for behavior | `scrollBehavior`, `ScrollSpyController.navigate` (`scrollTo` on the root) | docs Navigation, API | V-22, V-23 | passed | Heading lands at its 24px scroll margin; document scrollY stays 0 (V-22). |
| C-25 | Anchors both ways: heading anchors and cross-references in the content, history traversal and the fragment at load drive the TOC | `ssf-anchors` (v0.7.2) | Floating UI hashchange; none for content links | document click delegation `#linkKey`, `#hashChange`, `#followFragment`, `history.pushState` | docs "Anchors both ways" | V-22, V-24 | passed | Content link, Back and load-with-fragment verified (V-24). |
| C-26 | Shared observation: one scroll listener per target, one ResizeObserver per window, one MutationObserver per root; per-subscriber timing (immediate, frame, throttle, debounce); spy measures targets only on layout change | `env-shared-observation`, `ssf-updates` (v0.7.3), `tocp9` | dnd-kit scroll utilities (listener per ancestor), Floating UI autoUpdate | `foundation/observation.ts` (`observeScroll`, `observeResize`, `observeSubtree`); adopted by positioning, scroll-area, message-scroller, drawer virtual keyboard, scroll spy | docs Performance | V-25, V-26, V-27 | passed | Unit-tested listener counts and timing; consumers re-verified live. |
| C-27 | Table of contents sticky inside the scroll root it observes (page layout, either side) | `toc-own-scroll` (v0.7.2) | videojs sticky aside (window) | own-scroll reveal excludes the observed root; examples use sticky asides | docs intro, examples | V-22, V-23 | passed | Default story, start-side and nested examples, workspace Brief. |
| C-28 | Both edges always current: first before the first region (top, introduction, overscroll), last at and beyond the maximum scroll | `ssf-active` (v0.7.4 `1cecdbd3`) | fumadocs-style end activation (not local) | `activeRegions` first fallback; content-line clamp in `#update` | docs "Both edges" | V-28 | passed | Unit tests plus live Home/End (V-28). |
| C-22 | `navigate(value)` and `refresh()` methods; `activeValues`, `resolvedScrollRoot` getters | `toc-props` (API), `ssf-navigation` | none | component methods | docs API | V-12 | passed | navigate() programmatic, refresh, getters used (V-12). |

| Issue | Concrete missing/conflicting contract | Affected dependencies | Proposed resolution | Authority / resolution evidence | Status |
| --- | --- | --- | --- | --- | --- |
| S-01 | No scroll-spy or table-of-contents contract existed | Component, change reason | Author §18.15 and `ucl20-table-of-contents` | User chose "Author it directly"; commits `3867326e`, `bbdb4dc7` | passed |
| S-02 | No change reason fit scroll-derived changes | `tp-value-change` reason | Register `scroll` | `scroll-spy-reason`, `ss-b81-scroll`, `ss-b83-scroll-spy` | passed |

## Architecture and reuse

- Component folder and responsibility boundaries: `src/components/table-of-contents/` (`table-of-contents.ts` root: spy ownership, value lane, indicator, own-scroll reveal; `table-of-contents-item.ts`: target resolution, link rendering; `index.ts`). Behavior lives in Foundation: `scroll-spy.ts` (pure geometry and controller), `scroll.ts` (scroll containers), `indicator-geometry.ts`, `collect-targets.ts`.
- Supported exports / registration / constituent API impact: new elements registered in `register.ts`, `elements.ts`, `components/index.ts`, `catalog.ts` (compound-reexport); foundation exports added; `ChangeReason` gains `scroll`. `tabs/indicator.ts` moved to `foundation/indicator-geometry.ts` (`tabGeometry` → `elementGeometry`; internal, not previously exported).
- Public vocabulary / tokens / parts / presentation review: parts `table-of-contents`, `title`, `list`, `rail`, `indicator`, item `link`; one optional token `--tp-table-of-contents-indicator` falling back to `--tp-primary`; all other values existing roles.

### Family dependency map

| Responsibility | Upstream dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| --- | --- | --- | --- | --- |
| Scroll-container discovery | dnd-kit utilities/scroll (via drag-drop); videojs `getScrollParent` | `foundation/drag-drop/scrolling.ts` `scrollableAncestors` | Moved to `foundation/scroll.ts`; drag-drop imports it; added `commonScrollContainer` | drag-drop `scrolling.ts`, scroll spy, TOC own-scroll / V-10, V-18 |
| Sliding indicator geometry | videojs `TableOfContents.desktop.tsx` measured offsets; Base UI Tabs indicator | `components/tabs/indicator.ts` `tabGeometry` | Moved to `foundation/indicator-geometry.ts` `elementGeometry`; added `blockSpanGeometry`; tabs imports it | `tabs.ts`, `table-of-contents.ts` / V-15, V-18 |
| Indicator motion | tabs `prepareMotion` role pattern | `foundation/motion.ts` `prepareMotion`, presentation `motionTransition` | Same role shape (`indicator`, phase `change`), `data-tp-motion-driven` opt-out | TOC / V-14 |
| Value lane | ControllableState | `foundation/controllable-state.ts` | Reused, non-cancelable proposals | TOC / V-07, V-12 |
| Reading-line rule | videojs last-heading-above-line | `message-scroller/geometry.ts` `readingVisibility` | Not merged: message scroller uses line-plus-peek over rows; spy uses regions with end reachability. Different rule, recorded. | none |
| Current-location semantics | Breadcrumb / navigation-menu `aria-current` | `breadcrumb.ts`, `navigation-menu-item.ts` | Link renders in the item's own shadow, so no borrowed attribute restore is needed | TOC / V-13 |
| Scroll root components | Scroll area `viewportElement` | `scroll-area.ts` `viewportElement` | Explicit roots resolve through `viewportElement` | V-10 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| --- | --- | --- | --- | --- | --- |
| Root / Title | shadcn v4 docs (Nova) | `docs-toc.tsx`: `text-sm`, title `font-medium` | presentation tokens | Title `text-sm` medium, inline-start padding aligned with links | V-15, V-17 |
| Link | shadcn v4 docs (Nova) | `docs-toc.tsx`: `text-muted-foreground hover:text-foreground data-[active=true]:text-foreground`, `data-[depth=3]:pl-4` | breadcrumb-link color recipe | Muted, foreground when active/hover; depth × space-3 indent; global focus ring | V-15 |
| Rail / Indicator | videojs desktop TOC (`border-l`, sliding `w-px` span); user screenshot | `TableOfContents.desktop.tsx` | tabs indicator geometry | Rail 1 border width `--tp-border`; indicator 2 border widths, `--tp-primary`, logical inset | V-14, V-15 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| --- | --- | --- | --- | --- |
| Stories / docs examples | Scroll container | `tp-scroll-area` | V-01, V-10 | none |
| Collected example | Add-section action | `tp-button` | V-08 | none |
| Workspace Brief page | Sticky page navigation | `tp-table-of-contents` over existing Brief cards | V-18 | none |
| Item | Link | native `<a>` | V-13 | Contract-required native link (CL "Link: Native link to the target") |

## Verification scenarios

| ID | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V-19 | C-06, C-08, C-09, C-10; unit | Pure geometry tests | Regions, nesting, ordering, end reachability, offsets | 8 geometry tests pass | `npx vitest run src/foundation/scroll-spy.test.ts`: 9 passed | passed | Unit evidence only; browser rows cover real layout. |
| V-20 | C-21; unit | `collectTargets` with stub root | No default ids/depth; caller depth | collector test passes | `npx vitest run src/foundation/scroll-spy.test.ts` (collectTargets case) | passed | Unit evidence only. |
| V-01 | C-01, C-05; behavior | Default story; click article, real ArrowDown keys | Spy resolves the scroll-area viewport; current follows headings | root = viewport; Features → Playground → Bundle size | Chrome DevTools MCP, real keys | passed | Observed live in Chrome; evidence in the actual-result and tool cells. |
| V-02 | C-06, C-10; behavior | Default story; real End, ArrowUp, Home | Deterministic both directions | down: playground@76, bundle@132; up: playground@128, features@53 | MCP real keys, event log | passed | Observed live in Chrome; evidence in the actual-result and tool cells. |
| V-03 | C-07, C-16; behavior/visual | Nested example, real click Overlays | Guide stays active with Overlays; bar spans | active [guide, overlays], Forms inactive; indicator top -76 h 91 = Guide..Overlays | MCP click; `run-1/nested-chain-dark.png` (light docs) | passed | Observed live in Chrome; evidence in the actual-result and tool cells. |
| V-04 | C-08; behavior | `activationOffset = '75%'` at scrollTop 40 | Current advances to Playground | default Features; 75% Playground | MCP evaluate (API) | passed | API setup; geometry measured live. |
| V-05 | C-09; behavior | Default story with 120px and 160px overflow | Every target becomes current in order, last at bottom | Bundle size current at max scroll; order kept | MCP real keys | passed | Observed live in Chrome; evidence in the actual-result and tool cells. |
| V-06 | C-11, C-12; real input | Real click on Bundle size / Overlays / Enter on Playground | Jump, clicked item current immediately, no sweep, hash updated | one link-press event; hash set; held target stays current at max scroll | MCP click and Enter | passed | Native fragment navigation itself resets focus to body (browser behavior); the component moves no focus. |
| V-07 | C-14; events | Listener during keyboard scroll and click | scroll and link-press, not cancelable | `cancelable: false`, reasons as expected | MCP evaluate log | passed | Observed live in Chrome; evidence in the actual-result and tool cells. |
| V-08 | C-02, C-03, C-11, C-21; behavior | Collected example; real click Upgrade steps | Programmatic scroll, hash unchanged | current Upgrade steps, scrollTop 168, hash unchanged | MCP click | passed | Observed live in Chrome; evidence in the actual-result and tool cells. |
| V-09 | C-04, C-13; dynamic | Real click Add a section; typing in workspace Brief | New targets tracked; stale keys/holds recover | Appendix 1 tracked; Brief added Risks/Open questions and re-resolved root | MCP click, type_text, fill | passed | Found and fixed: generated keys per item (now per target element) and holds on removed targets (now released). |
| V-10 | C-05; behavior | `scroll-root` id on the scroll area | Resolves to its viewport | `resolvedScrollRoot === viewportElement` | MCP evaluate (API) | passed | Observed live in Chrome; evidence in the actual-result and tool cells. |
| V-11 | C-13; lifecycle | Detach, scroll to end, reattach | No updates while detached; resumes | detached value unchanged; reconnected Bundle size | MCP evaluate (API) | passed | Observed live in Chrome; evidence in the actual-result and tool cells. |
| V-12 | C-14, C-22; controlled | Fresh element with `value` preset; `navigate()` | Controlled value kept; proposals emitted; programmatic reason | value stays Features while scroll proposes Bundle size; navigate → programmatic | MCP evaluate (API) | passed | Switching modes after init is diagnosed (ControllableState policy). |
| V-13 | C-15; accessibility | Verbose a11y tree; Tab, Enter; axe | Named nav, list, listitems, links; focus ring; aria-current single | tree matches; Tab reaches links with `:focus-visible` outline; Enter navigates; one `aria-current="location"`; axe: only page-level fixture rules (landmark-one-main, page-has-heading-one, region on story content) | MCP snapshot, real keys, axe-core 4.x | passed | No screen-reader testing performed. |
| V-14 | C-11, C-16; motion | `motion-policy` normal vs reduce, navigate | Transition 0.28s vs 0s | 0.28s / 0s | MCP evaluate | passed | Programmatic scroll uses `instant` when reduced (code path; resolvesReducedMotion). |
| V-15 | C-16, C-18, C-20; visual | Dark story, light docs, RTL | Reference look; inline-start rail in RTL | Screenshots match the requested style; RTL rail right edge, indicator centered | `run-1/default-dark-bundle.png`, `nested-chain-dark.png`, `rtl-dark.png` | passed | Observed live in Chrome; evidence in the actual-result and tool cells. |
| V-16 | C-17; behavior | TOC block-size 60px overflow auto, scroll to end | Current link revealed inside TOC only | TOC scrollTop 0 → 60, document scrollY 0 | MCP evaluate | passed | Observed live in Chrome; evidence in the actual-result and tool cells. |
| V-17 | C-18, C-19; customization | label, messages.title, title slot, indicator token | Overrides apply; nav stays named | Contents / En esta página / Slotted title; rgb(255,0,0) | MCP evaluate | passed | Observed live in Chrome; evidence in the actual-result and tool cells. |
| V-18 | C-05, C-16; regression | Tabs default story real click; vitest drag-drop suites | Tabs indicator follows tab; drag-drop scrolling intact | indicator 87/78 vs tab 88/78; vitest 1149 passed | MCP click; `npx vitest run` | passed | Observed live in Chrome; evidence in the actual-result and tool cells. |
| V-21 | C-23; integration | Workspace Brief (hash-routed), navigation=scroll, real click Risks | Scrolls, URL untouched, Risks current | hash '' unchanged, Risks current, root viewport | MCP click; `run-1/workspace-brief-risks.png` | passed | Observed live in Chrome; evidence in the actual-result and tool cells. |
| V-22 | C-24, C-25, C-27; real input | Default story (generated page, 3020px scroll, sticky TOC): real clicks on TOC Performance and content link Composition | Only the root scrolls; heading at scroll margin; URL entry; link-press | heading offset 24px, scrollY 0, history +1, events performance/link-press, composition/link-press | MCP click; `run-2/default-page.png`, `run-2/default-mid.png` | passed | Observed live in Chrome. |
| V-23 | C-24, C-26, C-27; timing | Docs example with `scroll-behavior="instant" scroll-debounce="120" navigation="scroll"` | No updates while scrolling faster than 120ms; one after the pause | 0 during 8 steps; 1 update at 413ms | MCP evaluate (API scroll steps) | passed | Timing measured with programmatic scroll steps. |
| V-24 | C-25; history and load | Browser Back after two navigations; load with `#story-toc-release-notes` | Back returns to Performance (programmatic); load holds the last section at max scroll | as expected; scrollTop 3020 = max | MCP navigate back / url | passed | Observed live in Chrome. |
| V-25 | C-26; unit | `observation.test.ts` | 50 subscribers → 3 native listeners; frame batching; immediate; throttle; debounce; release | 6 tests pass | `npx vitest run src/foundation/observation.test.ts` | passed | Unit evidence. |
| V-26 | C-26; regression | Popover open, page scrolled 120px | Popup stays anchored (positioning via shared source) | gap 12px before and after | MCP click + evaluate | passed | Observed live in Chrome. |
| V-27 | C-26; regression | Scroll area scrolled to end; Message scroller with 3 exchanges scrolled up | Thumb moves and scrolling state set; scroller unpins and updates scrollable edges | thumb +250px, data-scrolling; data-pinned removed, scrollable-start cleared | MCP evaluate | passed | Message scroller wheel intent dispatched synthetically; scroll itself is real layout. |
| V-28 | C-28; real input and unit | Default story with a 400px introduction above the first heading; real End and Home keys; unit overscroll cases | First current at top and inside the introduction; last at max scroll | installation at 0 and 200; release-notes at 3420 = max; installation after Home; unit -40 and +60 overscroll pass | MCP keys + `npx vitest run src/foundation/scroll-spy.test.ts` | passed | Rubber-band overscroll is not producible in desktop Chrome; covered by unit cases. |

## Early integration checkpoint

| ID | Check | Status | Evidence / unresolved finding |
| --- | --- | --- | --- |
| I-01 | Shared owners are actually used by related consumers; old duplicate behavior is removed/delegated | passed | `git diff`: `tabs/indicator.ts` moved to `foundation/indicator-geometry.ts` (tabs imports `elementGeometry`); `scrollableAncestors` moved to `foundation/scroll.ts`, drag-drop imports it; no duplicates remain (grep). |
| I-02 | Default visual regions match traced source and shared library recipes | passed | Default story vs user screenshot: muted links, foreground current, rail and bar on inline-start; recipes use breadcrumb-link color policy and global focus ring. |
| I-03 | Independent constituent options work, including placement separately from action behavior | passed | href vs target references, depth, label/slot/messages, scroll-root, activation-offset, navigation exercised separately (V-04, V-08, V-10, V-17, V-21). |

## Gate record

| Gate | Status | Required exit evidence / remaining work |
| --- | --- | --- |
| 0. Sources and scope | passed | Spec v0.7.0 (`bbdb4dc7`) read and authored through direct MCP; local references surveyed (see source record); scope from user instruction. |
| 1. Capability mapping | passed | C-01..C-22 mapped to spec nodes, references, implementation, docs and scenarios; S-01/S-02 resolved. |
| 2. Architecture and composition reuse | passed | Scroll containers and indicator geometry extracted to Foundation and adopted by drag-drop and tabs; reuse map recorded. |
| 3. Behavior | passed | V-01..V-12, V-19..V-21 passed with real keyboard/pointer input where applicable. |
| 4. Presentation and customization | passed | V-15, V-17 passed. |
| 5. Accessibility | passed | V-13: tree, keyboard/focus and axe separately recorded. |
| 6. Visual and interaction inspection | passed | Screenshots inspected for dark, light, RTL, nested chain, workspace; motion checked (V-14). |
| 7. Documentation and demo reuse | passed | docs/table-of-contents.md, Default story with Controls, three docs examples, catalog entry, workspace Brief page; all compose library components. |
| 8. Regression and reconciliation | passed | tsc, vitest 1149, lint, build and CEM pass; tabs and drag-drop regressions checked; spec v0.7.1 reconciled. |

## Documentation synchronization

- [x] Base example, actual Controls, constituent APIs and reference agree with code.
- [x] Added/removed/changed properties, events, methods, slots and hooks are updated.
- [x] Verification fixtures are separate from curated public examples.
- [x] Rendered and copyable compositions reuse existing components.
- [x] Imports and registration work outside Storybook's global setup.
- [x] Generator handling and changed tests preserve the intended documentation.

## Completion / handoff

- Change summary: Foundation scroll spy (geometry regions, reading line, end reachability, navigation hold, root resolution), opt-in `collectTargets`, `tp-table-of-contents` + item, presentation, docs, stories, catalog, workspace Brief usage; shared repairs for scroll-container discovery and indicator geometry.
- Actual delivery claim: complete component against `ucl20-table-of-contents` and §18.15 (spec v0.7.1).
- Record checker: implement, verify and complete stages run (see below).
- Non-browser checks: `npx tsc --noEmit` clean; `npx vitest run` 131 files / 1149 tests passed; `npm run lint` clean; `npm run build` ok with CEM manifest.
- Behavior: V-01..V-12, V-19..V-21 passed.
- Accessibility: V-13 (tree, keyboard/focus, axe); no screen-reader session.
- Visual/customization/motion inspection: V-14..V-17 passed; screenshots under `tmp/component-verification/table-of-contents/run-1/`.
- Documentation and demo composition reuse: docs, Default story, three examples, catalog fixture, workspace Brief.
- Shared-consumer regressions / package boundaries: tabs indicator and drag-drop verified (V-18); dist exports `collectTargets`, registers both elements.
- Required failures or blocked checks: none open. Fixed during verification: unstable generated keys, stale holds, chain dropped during holds, URL changes in fragment-routed apps (added `navigation="scroll"`).
- Older out-of-scope gaps: vertical writing modes measure the physical vertical axis (C-20 note).
- Changed source revisions / reopened gates: spec amended to v0.7.1 (`80079139`) for `navigation`, v0.7.2 (`f415e20c`) for scroll behavior, content anchors and placement inside the scroll root, and v0.7.3 for shared observation and timing; gates 1–3 reopened and rechecked with C-23..C-27 and V-22..V-27 (run-2). Default story and examples were rebuilt as generated pages; run-1 screenshots show the earlier layout.
