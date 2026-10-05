# Component implementation and evidence record

## Delivery and source record

- Component(s) / public identity: Message scroller, headless MessageScrollerProvider and Root/Viewport/Content/Item/Return control.
- Requested work / claim: Full refactor and coverage of Message Scroller and every public constituent.
- Scope source: User requests full coverage against https://ui.shadcn.com/docs/components/base/message-scroller, including subcomponents.
- Repository baseline / unrelated changes: 105c7737da103d69da5f0643bf787942ae4ffae0, clean at start. Earlier Badge work already committed externally.
- Live project / document IDs and revisions: Direct MCP project prj_c5a403a0-d1d5-4487-ac78-f4e545f46483; Foundation doc_cd3c4721-9f9b-4531-abab-a8bfdbac75f1 and Library doc_8077bf7c-0361-48f3-ac87-53b983bd89b3; head 8440bff24a97dbbc5c762ebf4bd6baa958b305e1, state 55b573b760e30b3be64871d072a16f30479bbbaeff0405c00094c9f17a2862ba.
- Owning contracts / dependencies / vocabulary: sec-189-message-scroller; ucl21-message-scroller; shared ComponentPartContract, semantic host, controlled-state, motion, presentation merge and environment lifetime contracts.
- Local reference: ../specification/external/ui at 63c1308d112b6b1205d86244a156cca1abef5087 clean; packages/react/src/message-scroller (components, types, controller, commands, geometry, stores, refs, tests/browser tests); bases/base/ui/message-scroller.tsx -> actual Button; Nova .cn-message-scroller-content. Base UI has no MessageScroller owner; @shadcn/react owns it; Floating UI not used.
- Tool readiness: Direct MCP specifications and Chrome MCP available. Existing localhost:6006/5173 servers; preserve user page 47/reference page 5.
- Evidence directory: tmp/component-verification/message-scroller/refactor/; local artifacts only. Fixture under tests/fixtures/components/message-scroller/.

## Capability and interface mapping

| ID | Requirement / capability and defaults | Live authority | Local upstream path / symbol | Lit interface / implementation | Docs location | Scenario IDs | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Headless provider, one state owner, external commands/stores | sec-189; ucl21 Provider transparent | components.Provider; stores.ts | Existing provider shared by root and all parts; no Provider DOM host | Provider API | V-01, V-09 | passed | Standalone provider and root.provider commands/stores passed; connect/disconnect and exported package verified. |
| C-02 | Root + optional explicit Viewport/Content; compatibility shorthand | ucl21 exposed anatomy | registry MessageScroller/Viewport/Content | Add tp-message-scroller-viewport/content; shorthand composes same classes; actual native viewport exposed | Anatomy example and APIs | V-01, V-09 | passed | Explicit/shorthand anatomy, plain content, optional return, nested providers and viewport replacement passed. |
| C-03 | Initial start/end/last-anchor once, async/hidden/empty; pending paint | sec-189 first placement | applyDefaultScrollPosition; pendingDefaultScrollStore | Existing initialPosition and preserve alias, pending markers on root/viewport | Opening example | V-02 | passed | Start/end/last-anchor, short fallback, delayed/hidden content and collapse passed. |
| C-04 | Follow/user intent/control lane, streaming handoff and resize | sec-189 modes; ucl21 pinned | reconcileFollowMode, handleResize, userScrollIntent | follow=true compatibility default; pinned/defaultPinned; ControllableState; shared native scrolling | Streaming, controlled API | V-03, V-07 | passed | Streaming handoff, follow toggle, bare scroll and real PageUp/End; controlled accept/reject passed. |
| C-05 | Stable Item, anonymous rows, duplicate diagnostics, new/replaced anchors | sec-189 identity/anchor priority | Item registerMessage; handled anchors | Item messageId/scrollAnchor; data markers; stable internal anonymous identity | Item API / anchors | V-04 | passed | Anonymous, first duplicate target, same-count replacement anchor and batch arrivals passed. |
| C-06 | Prepend/resize preserve native-adjusted coordinate; configurable on viewport | sec-189 preservation | restorePrependedAnchor; Viewport preserveScrollOnPrepend | preserveOnPrepend root inherited or viewport override; native owner keeps anchoring | History example | V-05 | passed | Prepend/above-row resize preserved coordinates; viewport override disabled correction as expected. |
| C-07 | Commands start/end/message, four aligns/margin/motion, known pending and supersession | sec-189 command receipts | commands.ts; geometry.getElementScrollTop | Existing status/finished receipts; knownMessageIds; default readingLine used as command margin; no React hooks | Commands example and API | V-06, V-07 | passed | Four aligns, padding/margin, scaled coordinates, premount queue, smooth supersession and disconnect receipts passed. |
| C-08 | Return control actual Button; direction, behavior, appearance, inactive/cancellation | ucl21 Return control renamed Button.Root | registry MessageScrollerButton -> Button; primitive Button | Add tp-message-scroller-return-control extends TpButton; returnDirection=start/end, behavior=smooth; inherited Button API; implicit control only in shorthand | Return control API/example | V-01, V-07 | passed | Actual TpButton inheritance; active/disabled/inert/start/end; trusted pointer cancellation and Enter activation passed. |
| C-09 | Independent edge flags, common markers; programmatic end indicator | sec-189 edge snapshots; upstream marker parity | writeStateAttributes, getMessageScrollerScrollable | scrollable ObservableStore; root/viewport data-scrollable plus start/end and data-autoscrolling | State example | V-03, V-06, V-08 | passed | Independent edges, no follow end flicker, virtualizer/duplicate extent and autoscrolling cleanup passed. |
| C-10 | Lazy visibility, current anchor persistence, IO/layout fallback | sec-189 visibility | observeVisibility; geometry visibility | subscribeVisibility + immutable snapshot; IO lifecycle; reading line/peek consistent | Outline example | V-08 | passed | Lazy native IO and stable empty snapshot passed; shared no-observer reading geometry covered by unit test. |
| C-11 | Native accessibility, customization and motion; part hooks/content | semantic hosts; merge/motion; ucl21 parts | Content log additions, Viewport region, styled Button/Item | Native input retained; content aria overrides; hooks per constituent and Root projection; actual tokens | Accessibility/styling/animation | V-01, V-07, V-09 | passed | Six Docs transcripts have zero axe violations/incomplete; real keyboard, hooks, semantic overrides, dictionary/tokens, light/dark RTL inspected. |
| C-12 | Cleanup/remount/nesting/performance/package/docs | sec-189 destruction and coalescing | cleanup hooks; browser tests; PERFORMANCE.md | Observer/frame/command cleanup; coalesced membership and geometry reads; public exports/register/elements | Lifecycle, virtualization boundary, all API | V-09, V-10 | passed | 29 built browser scenarios; 1000 rows with no row updates; 517 unit tests; types, changed-file lint, library/Storybook builds passed. Baseline global-format issue recorded below. |

Contract adaptations: Root follow=true, previousItemPeek=0 and label=Conversation retain established Tweakpad defaults (reference false/64/Messages); live spec permits documented implementation geometry defaults and declares initial pin true. Explicit Return control uses returnDirection to avoid the inherited read-only writing-direction getter. Upstream Button maps to live renamed Return control, not a new catalog identity. Provider stays headless; external consumers receive root.provider. Known pending IDs and structured command receipts follow the stronger live contract. No React SSR/hydration API is introduced into Lit; pending paint and client async opening are preserved.

## Architecture and reuse

Keep provider as the only scroll owner; extract typed geometry/command helpers where needed, move public bindings into constituent files. Root shorthand and explicit composition consume identical public constituents. The underlying native viewport element is available for external virtualization; the scroller does not invent a virtualizer.

### Family dependency map

| Responsibility | Upstream dependency path / symbol | Existing local owner investigated | Reuse / repair and component-specific differences | Actual consumers / regression scenario IDs |
| --- | --- | --- | --- | --- |
| Scrolling | primitive Provider -> controller/commands/geometry/stores | existing MessageScrollerProvider; ObservableStore; ControllableState | Repair existing owner, share across explicit/implicit roots and external controls | workspace conversation, generic catalog, authored demos / V-01,V-10 |
| Return control | registry Button render -> actual Button | TpButton; part contracts; navigation constituent inheritance pattern | Inherit native action, disability, focus, rendering; add only edge subscription/command policy | regular Button unchanged; return constituent / V-07 |
| Composition | useRender / context / refs | TpElement, renderPart, PresentationController, setPartComposition | Shared owner discovery/member projection; no duplicated rendering framework | all constituents / V-01,V-09 |

### Presentation source map

| Region / public part | Registry base / style preset | Source component + stylesheet / selectors | Existing library component / recipe | Decision / contract adaptations | Scenario IDs |
| --- | --- | --- | --- | --- | --- |
| Root/Viewport | base/Nova | registry relative flex frame; native overflow viewport, pending invisible, scrollbar treatment | existing structural CSS + message-scroller recipes | Finite default height retained; explicit parts fill constrained root; native scroll ownership | V-01,V-09 |
| Content/Item | base/Nova | .cn-message-scroller-content gap-6; Item content-visibility auto/contain-intrinsic-size | shared content gap/padding recipe; Item structural containment | Preserve real DOM, stable identity, selection; containment tested with geometry | V-04,V-10 |
| Return control | base/Nova | registry Button secondary/icon-sm, background/border, active fade/translate | actual TpButton + message-scroller-return-control recipe + motion roles | Circular compact native button; actual Icon, direction/active markers; logical placement | V-07,V-09 |

### Implementation and composition reuse map

| Demo / composition | Nested role | Existing component / public API | Registration and integration checks | Native exception / missing capability, if any |
| --- | --- | --- | --- | --- |
| Transcript | message, bubble, marker, icon, spinner | tp-message, tp-bubble, tp-marker, tp-icon, tp-spinner | source and built register / V-01,V-10 | Native prose/layout only |
| External controls/composer | actions/fields/selection | tp-button, tp-field, tp-text-area, tp-form, tp-native-select or Toggle | real keyboard/actions / V-07 | No local UI substitutes |
| Scroll constituent | return action | TpMessageScrollerReturnControl extends TpButton | native root and shared recipe checked / V-07 | Native scroll viewport and log are required anatomy |

## Verification scenarios

| ID | Capability IDs / evidence category | Setup and input | Expected result | Actual result | Tool/command and evidence | Status | Justification / gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V-01 | C-01,C-02,C-08,C-11 | Explicit and shorthand anatomy, optional return, local hooks/semantic attributes | One provider/viewport/log; no duplicated owner; hooks and aria forwarded | Explicit/shorthand/native getters, optional control, root/local hooks and semantic overrides passed; delegated Content remained a named log. | Chrome DevTools MCP; local evidence report and fixture; unit tests where specified | passed | No unresolved in-scope failure |
| V-02 | C-03 | Opening modes, no anchor/short/long turn, hidden and delayed content | Correct once-only placement; no initial flash | All opening/empty/hidden/short/long/collapse cases passed; placement runs once. | Chrome DevTools MCP; local evidence report and fixture; unit tests where specified | passed | No unresolved in-scope failure |
| V-03 | C-04,C-09 | Stream/grow/collapse, scroll away/rearm, single/batch anchors | Correct modes and spacer handoff; no false end button | Streaming reserve-space handoff and long-anchor hold passed; real PageUp releases and End rearms; follow toggle covered. | Chrome DevTools MCP; local evidence report and fixture; unit tests where specified | passed | No unresolved in-scope failure |
| V-04 | C-05 | Anonymous/stable/duplicate/replaced rows, marker anchor | Deterministic addressability and turn placement | Stable/anonymous/duplicate/replacement cases passed; duplicate physical extent retained without duplicate addressing. | Chrome DevTools MCP; local evidence report and fixture; unit tests where specified | passed | No unresolved in-scope failure |
| V-05 | C-06 | Prepend and preceding resize while reading; toggle preservation | Stable viewport-relative coordinate; disabled preservation native behavior documented | Prepend and preceding resize preserved reading coordinate; explicit opt-out retained native ownership. | Chrome DevTools MCP; local evidence report and fixture; unit tests where specified | passed | No unresolved in-scope failure |
| V-06 | C-07,C-09 | Four aligns, padding/margin, queued known target, supersession | Correct receipts and position; smooth cancellation and markers | All four aligns, 20px margin, scaled coordinates, pending-before-mount and rejection/supersession passed; 180ms marker cleanup. | Chrome DevTools MCP; local evidence report and fixture; unit tests where specified | passed | No unresolved in-scope failure |
| V-07 | C-04,C-07,C-08,C-11 | Keyboard scroll/return, consumer cancellation, controlled pin accept/reject, reduced motion | Native semantics, accessible names/focus, accepted state restored | Trusted click preventDefault leaves top=0; Enter reaches end and makes control inert; Tab/PageUp/End work; keyboard reason/source verified. Six transcript axe scopes: zero violations/incomplete. | Chrome DevTools MCP; local evidence report and fixture; unit tests where specified | passed | No unresolved in-scope failure |
| V-08 | C-09,C-10 | Edge and visibility subscriptions; last unsubscribe; IO fallback geometry helper | Independent flags; ordered ids/current anchor; stable empty inactive | Native IO produced ordered IDs and prior current anchor; last unsubscribe restores stable empty snapshot; fallback geometry unit case excludes peek band. | Chrome DevTools MCP; local evidence report and fixture; unit tests where specified | passed | No unresolved in-scope failure |
| V-09 | C-01,C-11,C-12 | Theme/RTL/narrow, dictionaries/tokens/contracts, removal/reconnect/nesting | Correct paint, isolated providers, lifecycle cleanup | 1024/1200 light and 390px dark RTL inspected. 390px clientWidth=scrollWidth, centered 32px control, start inset=12.8px. Dictionary removal, scoped tokens, focus/identity, nesting/reconnect passed. | Chrome DevTools MCP; local evidence report and fixture; unit tests where specified | passed | No unresolved in-scope failure |
| V-10 | C-12,C-02 | 1000 real rows, shared workspace/catalog, complete Docs/built import | Coalesced update/no row rerender; complete APIs and integration | Built registration/exports and 29-case fixture passed. 100 schedules => 1 reconcile; 1000 rows => 0 row updates. Workspace history 4->7 rows and local send 7->8. Docs Controls and external navigation passed. | Chrome DevTools MCP; local evidence report and fixture; unit tests where specified | passed | No unresolved in-scope failure |

## Early integration checkpoint

| ID | Check | Status | Evidence / unresolved finding |
| --- | --- | --- | --- |
| I-01 | Actual shared ownership | passed | Root composes actual public Viewport/Content/Return control in shorthand; explicit tree verified with no implicit viewport; Return control extends TpButton; provider shared. |
| I-02 | Sourced presentation | passed | Chrome page 67 screenshot: bounded transcript, native scrollbar, gap/padding recipe, actual Message/Bubble and centered circular Button. Reference base/Nova arrangement retained; library typography/tokens. |
| I-03 | Independent options | passed | Explicit 220px viewport/Content mounts separately, start opening and start-directed control; shorthand still opens at end and shows end-directed control only after scrollToStart. |

## Gate record

| Gate | Status | Required exit evidence / remaining work |
| --- | --- | --- |
| 0. Sources and scope | passed | Fresh live specs and complete local source chain above; URL docs also read |
| 1. Capability mapping | passed | C-01–C-12 map all six parts and hooks; compatibility adaptations grounded in live spec |
| 2. Architecture and composition reuse | passed | One provider, explicit/implicit same constituents, actual TpButton, shared presentation |
| 3. Behavior | passed | V-02–V-08 |
| 4. Presentation and customization | passed | V-01,V-09 |
| 5. Accessibility | passed | V-07 |
| 6. Visual and interaction inspection | passed | V-01,V-09 |
| 7. Documentation and demo reuse | passed | V-10 |
| 8. Regression and reconciliation | passed | V-10 |

## Documentation synchronization

- [x] Every constituent API/properties/defaults/events/methods/hooks and import documented.
- [x] Curated examples cover distinct concepts; fixture contains exhaustive combinations.
- [x] Generated-story exclusion and complete-catalog/shared consumers preserved.

## Completion / handoff

Implementation and the declared Chrome verification matrix are complete. Older workspace-conversation evidence was supplemented with current native input checks. This is not a cross-browser or screen-reader certification.

### Dependency repair discovered during V-07

Axe found Bubble's existing default `aria-label="Message"` on a generic div, requiring manual review for aria-prohibited-attr in every transcript composition. Fresh direct Library `ucl22-bubble` and Foundation `sec-71-semantic-invariants` were read at the same revision. Local registry `bases/base/ui/bubble.tsx` uses a native div with consumer semantics. The bounded shared repair is to give the existing named container a noninteractive group role (and omit both when label is empty), retaining the public label default, layout, reactions and component ownership. This resolves semantic naming in the reused owner, not a demo override. Reuse/design mapping extends C-11/V-07/V-10 to the Bubble root; no full Bubble conformance claim. Planned regression: named/unnamed Bubble tree and axe, transcript Docs and existing workspace. Gates 0–2 and I-01 remain passed with this explicit existing-owner repair; visual geometry unchanged.

## Final evidence and boundaries

- Local detailed evidence: `tmp/component-verification/message-scroller/refactor/report.md`, `built-behavior.json`, `docs-light.png`, `build.log`, `storybook.log`, `repository-lint.log`. These files are local/ignored and not automatically included on another machine; the tracked fixture and this matrix remain reproducible.
- Local source refinement: `packages/shadcn/src/tailwind.css` scroll-fade-b, typed interpolation property, native scroll timeline and end reveal. Shared viewport recipe and shadow-scoped keyframes port this behavior; spacing derives from Tweakpad tokens. Chrome measured one native animation, 32px maximum depth and effectively zero depth at the end. Dictionary replacement removes the recipe. This is scroll-driven geometry, not a timed entrance effect.
- Shared Bubble dependency repair verified in source Docs and built package: named root is group/Message; empty label removes name/role; reaction control remains actual Button. All six transcript Docs scopes now have no axe violations or incomplete findings. Composer-label color contrast was manually inspected (foreground on light neutral surface) after axe reported an analyzer error in the outer Form scope; transcript scopes were clean without suppressions.
- `npm test`: 72 files / 517 tests passed. Focused TypeScript/ESLint/Stylelint/Prettier and `git diff --check` passed; library and Storybook builds passed. Existing dynamic-import build warnings are unrelated.
- Repository-wide `npm run lint` is not green: it stops at unchanged `src/components/field/field.ts` formatting. Confirmed the HEAD version also fails Prettier with `--ignore-path /dev/null`; no Field change is included. This is an existing repository issue outside this component and does not represent a failed Message Scroller capability.
- Chrome 154, real pointer and keyboard inputs; CSS-pixel geometry and native API fixtures. No claim of real touch-device, other-engine, OS reduced-motion preference, forced-colors or screen-reader testing. The component reduced-motion policy and shared motion resolver/unit coverage were exercised. No browser capabilities were mocked; no alternative browser driver used.
- No runtime dependencies added; shadcn MIT notice emitted as `dist/LICENSE.message-scroller`. Existing registration/catalog identity remains compatible; three new public constituents exported/registered.
