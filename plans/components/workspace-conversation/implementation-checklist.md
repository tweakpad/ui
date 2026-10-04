# Workspace icons, header and conversation repair

- Requested work / claim: Shared smaller icons, aligned sidebar/header, two-sided messages and reference-based Message Scroller.
- Scope source: User screenshot and explicit Message Scroller reference in latest follow-up.

## Sources

Fresh direct Foundation and Library reads: doc_cd3c4721-9f9b-4531-abab-a8bfdbac75f1 / doc_8077bf7c-0361-48f3-ac87-53b983bd89b3; project prj_c5a403a0-d1d5-4487-ac78-f4e545f46483; head 8440bff24a97dbbc5c762ebf4bd6baa958b305e1; state 5daad6324d67f008ae378650a86e7e961fc91a1025d6107c89be7002caecdfe1. Local Base UI, Floating UI and shadcn revisions unchanged from Complete catalog record. User-linked live shadcn Message Scroller page read. Preserve staged dashboard and unrelated Tooltip record.

## Capability and interface mapping

| ID | Capability | Authority | Reference | Local owner / mapping | Documentation | Scenarios | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Shared icon scale | Theme tokens; ucl22-icon | src/styles.css; base/ui button size-4 | Existing sm/md/lg roles: .875/1/1.25 rem at default spacing | Authored stories, component docs and workspace source | V-01 | passed | Implemented; see corresponding V row and execution evidence below |
| C-02 | Header alignment | ucl23-navigation-panel | base dashboard-01 site-header; local toolbar slot | Place application header in existing trigger slot; toolbar owns measured alignment | Authored stories, component docs and workspace source | V-01 | passed | Implemented; see corresponding V row and execution evidence below |
| C-03 | Message sides and regions | ucl22-message | base/ui/message.tsx; Nova cn-message-* | TpMessage align, avatar/header/content/footer using shared part recipes; no chat state | Authored stories, component docs and workspace source | V-02 | passed | Implemented; see corresponding V row and execution evidence below |
| C-04 | Scroller opening and follow | sec-189-message-scroller; ucl21-message-scroller | packages/react/src/message-scroller/types.ts and controller | Headless provider; native viewport; one mode; initial placement and controlled pin | Authored stories, component docs and workspace source | V-03 | passed | Implemented; see corresponding V row and execution evidence below |
| C-05 | Stable rows and preservation | sec-189-message-scroller | message-scroller geometry/controller and browser tests | Item messageId/scrollAnchor; resize and prepend preserve stable reading coordinates | Authored stories, component docs and workspace source | V-03 | passed | Implemented; see corresponding V row and execution evidence below |
| C-06 | Commands and return control | sec-189-message-scroller | use-message-scroller-commands; MessageScrollerButton | start/end/message commands; accepted/pending/rejected and completion; TpButton reuse | Authored stories, component docs and workspace source | V-03 | passed | Implemented; see corresponding V row and execution evidence below |
| C-07 | Visibility and cleanup | sec-189-message-scroller | stores.ts; use-message-scroller-controller | Lazy ordered visibility subscription; shared frame scheduler; observers/listeners teardown and reconnect | Authored stories, component docs and workspace source | V-03 | passed | Implemented; see corresponding V row and execution evidence below |
| C-08 | Chat composition and docs | ucl24; user request | base message examples and message-scroller documentation | Two-sided team chat, stable items, load history and newest control; authored stories and public source | Authored stories, component docs and workspace source | V-04 | passed | Implemented; see corresponding V row and execution evidence below |
| C-09 | Dashboard composition repairs | ucl22-card, attachment, preview-card; existing SidePanel, Select, TextArea contracts | base/ui/card.tsx action grid; attachment.tsx block root; Nova styles | Repair shared Card action grid and Attachment shrinkwrap; reuse icon Button, media, Select, native layout and SidePanel body scrolling | Copyable workspace source | V-05 | passed | Latest screenshots: files, editor, refresh, activity panel, teammates, profile, settings, metric badges, duplicate sidebar separator dialog close feedback and doubled content padding |

## Family dependency map

| Responsibility | Source | Existing owner | Decision | Consumers |
| --- | --- | --- | --- | --- |
| Icon sizing | Base size-4 and size-3.5 | shared icon tokens / TpIcon | Change shared scale; keep theme overrides | All icons / V-01 |
| Header | shadcn SiteHeader / SidebarInset | NavigationPanel measured toolbar | Use existing trigger slot, no parallel measurement | Dashboard and default sidebar / V-01 |
| Message | base Message/Bubble/Avatar | primitives TpMessage, TpBubble, Avatar | Move Message into own folder; repair missing alignment and named parts | Chat and message stories / V-02 |
| Scrolling | shadcn Provider/Viewport/Item/Button | display TpMessageScroller, ControllableState, ObservableStore, TpButton | Replace deficient wrapper with headless provider and composed public parts; one scroll owner | Dashboard and scroller stories / V-03 |

| Dashboard regions | Base Card/Attachment and HoverCard compositions | TpCard, TpAttachment, TpPreviewCard, TpSidePanel, TpSelect | Fix shared structural grid/width; app owns layout and file complete state; remove nested fixed-height activity scroll; project Separator presentation only onto its inherited root, avoiding two painted elements; NavigationPanel inset owns page spacing once, removes nested dashboard padding, block inset matches sidebar group inset; share fading for dialog content and backdrop so closure starts immediately | Dashboard and Card/Attachment stories / V-05 |

## Presentation source map

| Region | Registry | Source recipe | Existing recipe | Adaptation | Scenarios |
| --- | --- | --- | --- | --- | --- |
| Icons | base / Nova | size-4 / size-3.5 | tp-icon-size-sm/md/lg | .875rem / 1rem / 1.25rem from spacing seed | V-01 |
| Transcript | base / Nova | cn-message*, cn-message-scroller-content | message-root/header and Bubble recipes | shared message part spacing; logical sides; viewport bounded by parent | V-02 V-03 |

| Dashboard cards and files | base / Nova | CardAction grid position; Attachment flex root/media/actions | Existing Card and Attachment recipes | Structural grid and natural block width; theme gaps retained | V-05 |

## Implementation and composition reuse map

| Composition | Role | Owner | Integration | Native exception |
| --- | --- | --- | --- | --- |
| Workspace | sender/body | Message, Avatar, Bubble | align on Message and Bubble | Text content is authored HTML |
| Scroller | edge action | TpButton | cancellable click then provider command | Native div is required scroll viewport |
| Provider | state | ControllableState / ObservableStore | one geometry and lifecycle owner | Layout measurement uses CSS pixel coordinate space, not styling literals |

## Verification scenarios

| ID | Capabilities | Setup/input | Expected | Actual | Tool | Status | Evidence/gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V-01 | C-01 C-02 | Header desktop/mobile, light/dark and token override | 16px default icon, 14px small; centers align; existing sidebar intact | Icons 16px; root seed override 20px; scoped icon role 18px. Header delta zero, toolbar stable after scroll. | Chrome MCP geometry/screenshots | passed | Existing NavigationPanel default also inspected; inset and workspace group start at y76.38 after removing double padding |
| V-02 | C-03 | Start/end messages, RTL and named regions | Complete row reverses logically; header/footer reachable | Start/end and RTL rows inspected; named avatar/header/footer; axe zero violations | Chrome MCP screenshots/axe | passed | Desktop dark/light and 390px narrow transcript inspected |
| V-03 | C-04 C-05 C-06 C-07 | Initial/open, append, prepend, resize, user scroll, commands and reconnect | Reader position preserved; latest affordance; controlled cancellation; stable visibility | Actual Home releases follow, return action reaches end, send and history work; API opening/append/resize/pending/controlled/visibility/reconnect checks pass | Chrome MCP actual keyboard + provider APIs | passed | Earlier-row resize drift 0.094px; unknown rejected, known future pending then completed; no native touch gesture claim |
| V-04 | C-08 | Workspace send/history; docs/source; build/lint | Consistent team chat and usable documented scroller | Workspace send and history verified; source explorer inspected, authored docs reconcile; package and Storybook builds passed | Chrome MCP + focused checks/build | passed | Scripted assistant demo remains explicitly local |
| V-05 | C-09 | Files, brief, overview, activity side panel, teammate preview and settings | Aligned controls, consistent selection, single activity scroll owner, no artificial whitespace | File rows equal width with complete state/media/icon actions; actual remove works. Editor edges delta zero and actual edit equals preview exactly. Refresh center delta zero. Single separator; profile/teammates left aligned; matching custom selects; activity body owns scroll. | Chrome MCP screenshots/geometry and focused checks | passed | Escape content/backdrop opacity equal at every sampled frame, removed at217ms; actual Cancel closes. History action now inside transcript. Mobile has no horizontal overflow. |

## Early integration checkpoint

| ID | Check | Status | Evidence |
| --- | --- | --- | --- |
| I-01 | Shared ownership | passed | Message and scroller now own their implementations in dedicated folders; display/primitives reexport the same identities. Shared state and Button reused. |
| I-02 | Reference presentation | passed | Chrome light screenshot shows full outgoing row on right, incoming on left. Header and toggle centers have zero delta after removing the extra border; toolbar remains 69.98px after scrolling. |
| I-03 | Interaction composition | passed | Actual message submit renders outgoing row; earlier history loads stable item IDs in existing scroll owner. No startup errors. |

## Gate record

| Gate | Status | Evidence |
| --- | --- | --- |
| 0. Sources | passed | Fresh direct ASTs and linked page; source chain read |
| 1. Capabilities | passed | Nine mapped responsibilities including subsequent screenshot repairs; prior scroller wrapper deficiency documented |
| 2. Architecture | passed | Repair shared Message and MessageScroller; reuse state, buttons, Bubble and tokens; existing toolbar slot |
| 3. Behavior | passed | Provider API checks plus actual keyboard, send/history, remove, edit and Cancel/Escape |
| 4. Presentation | passed | Theme icon overrides; shared Card, Attachment, Separator and NavigationPanel inset repairs; no duplicate demo padding |
| 5. Accessibility | passed | Message and scroller stories plus dashboard Activity axe zero; named icon actions and actual keyboard verified |
| 6. Visual | passed | Chrome screenshots reviewed for desktop light/dark, RTL and narrow layouts; latest composition screenshots and geometry inspected |
| 7. Documentation | passed | Authored Message and Scroller docs, public source explorer and shared motion docs updated |
| 8. Regressions | passed | TSC, focused ESLint/Stylelint, formatting/diff check, package and Storybook builds passed; default NavigationPanel inspected |

## Execution evidence and claim boundary

2026-10-04: Chrome DevTools MCP page90; user pages were not used for mutations. Source revisions: Base UI5b495488d, Floating UI27629b74, shadcn63c1308d1. This record covers the requested icons, header, message/scroller work and subsequent dashboard screenshot defects; it does not certify the whole catalog.

Provider API checks: all four opening positions; append follow and free reading; stable prepend and earlier resize (0.094px); anchored new turn (0.17px); unknown rejection; known future row pending to completed; controlled pin refusal and synchronous acceptance; lazy ordered visibility/unsubscribe; disconnect/reconnect. Actual user input separately covered Home, jump-to-latest, send and history. Native wheel/touch gestures were not synthesized or claimed. Reduced-motion policy shares the existing Foundation resolver.

Later screenshots: file rows each395.05px with zero overflow; actual removal verified. Brief actual input exactly matches preview text (no template indentation), top/bottom deltas0. Refresh icon-only accessible action center delta0. Metric actions occupy first row. Sidebar paints one separator, body and main title share y76.38 start; content padding0, shared inset6.4px block/12.8px inline. Teammates and profile left-aligned. Activity uses SidePanel body scrolling, with no nested ScrollArea. Timezone and cadence both Select. History action is a stable first transcript item, actual load yields seven rows. Mobile390px document width390px.

Escape closing samples: state closed on first sampled frame; popup/backdrop opacity1 at28ms, .594 at49ms, .122 at116ms, .010 at182ms, both unmounted217ms. Cancel actual click also closes the app-owned state. The previous dialog content stayed opaque while only its backdrop faded280ms.

Local logs: tmp/component-verification/workspace-conversation/build.log and storybook.log. Screenshots were viewed inline in this conversation; file export was rejected by Chrome MCP workspace-root validation, so no saved screenshot artifact is claimed. These local logs are not portable handoff artifacts. Existing file upload tool limitation from the Complete catalog record remains outside this repair's verified boundary.
