# Workspace icons, header and conversation repair

- Requested work / claim: Shared smaller icons, aligned sidebar/header, two-sided messages and reference-based Message Scroller.
- Scope source: User screenshot and explicit Message Scroller reference in latest follow-up.

## Sources

Fresh direct Foundation and Library reads: doc_cd3c4721-9f9b-4531-abab-a8bfdbac75f1 / doc_8077bf7c-0361-48f3-ac87-53b983bd89b3; project prj_c5a403a0-d1d5-4487-ac78-f4e545f46483; head 8440bff24a97dbbc5c762ebf4bd6baa958b305e1; state 5daad6324d67f008ae378650a86e7e961fc91a1025d6107c89be7002caecdfe1. Local Base UI, Floating UI and shadcn revisions unchanged from Complete catalog record. User-linked live shadcn Message Scroller page read. Preserve staged dashboard and unrelated Tooltip record.

## Capability and interface mapping

| ID | Capability | Authority | Reference | Local owner / mapping | Documentation | Scenarios | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Shared icon scale | Theme tokens; ucl22-icon | src/styles.css; base/ui button size-4 | Existing sm/md/lg roles: .875/1/1.25 rem at default spacing | Authored stories, component docs and workspace source | V-01 | pending | Source mapped; implementation and browser checks next |
| C-02 | Header alignment | ucl23-navigation-panel | base dashboard-01 site-header; local toolbar slot | Place application header in existing trigger slot; toolbar owns measured alignment | Authored stories, component docs and workspace source | V-01 | pending | Source mapped; implementation and browser checks next |
| C-03 | Message sides and regions | ucl22-message | base/ui/message.tsx; Nova cn-message-* | TpMessage align, avatar/header/content/footer using shared part recipes; no chat state | Authored stories, component docs and workspace source | V-02 | pending | Source mapped; implementation and browser checks next |
| C-04 | Scroller opening and follow | sec-189-message-scroller; ucl21-message-scroller | packages/react/src/message-scroller/types.ts and controller | Headless provider; native viewport; one mode; initial placement and controlled pin | Authored stories, component docs and workspace source | V-03 | pending | Source mapped; implementation and browser checks next |
| C-05 | Stable rows and preservation | sec-189-message-scroller | message-scroller geometry/controller and browser tests | Item messageId/scrollAnchor; resize and prepend preserve stable reading coordinates | Authored stories, component docs and workspace source | V-03 | pending | Source mapped; implementation and browser checks next |
| C-06 | Commands and return control | sec-189-message-scroller | use-message-scroller-commands; MessageScrollerButton | start/end/message commands; accepted/pending/rejected and completion; TpButton reuse | Authored stories, component docs and workspace source | V-03 | pending | Source mapped; implementation and browser checks next |
| C-07 | Visibility and cleanup | sec-189-message-scroller | stores.ts; use-message-scroller-controller | Lazy ordered visibility subscription; shared frame scheduler; observers/listeners teardown and reconnect | Authored stories, component docs and workspace source | V-03 | pending | Source mapped; implementation and browser checks next |
| C-08 | Chat composition and docs | ucl24; user request | base message examples and message-scroller documentation | Two-sided team chat, stable items, load history and newest control; authored stories and public source | Authored stories, component docs and workspace source | V-04 | pending | Source mapped; implementation and browser checks next |

| C-09 | Dashboard composition repairs | ucl22-card, attachment, preview-card; existing SidePanel, Select, TextArea contracts | base/ui/card.tsx action grid; attachment.tsx block root; Nova styles | Repair shared Card action grid and Attachment shrinkwrap; reuse icon Button, media, Select, native layout and SidePanel body scrolling | Copyable workspace source | V-05 | pending | Latest screenshots: files, editor, refresh, activity panel, teammates, profile, settings, metric badges, duplicate sidebar separator and dialog close feedback |

## Family dependency map

| Responsibility | Source | Existing owner | Decision | Consumers |
| --- | --- | --- | --- | --- |
| Icon sizing | Base size-4 and size-3.5 | shared icon tokens / TpIcon | Change shared scale; keep theme overrides | All icons / V-01 |
| Header | shadcn SiteHeader / SidebarInset | NavigationPanel measured toolbar | Use existing trigger slot, no parallel measurement | Dashboard and default sidebar / V-01 |
| Message | base Message/Bubble/Avatar | primitives TpMessage, TpBubble, Avatar | Move Message into own folder; repair missing alignment and named parts | Chat and message stories / V-02 |
| Scrolling | shadcn Provider/Viewport/Item/Button | display TpMessageScroller, ControllableState, ObservableStore, TpButton | Replace deficient wrapper with headless provider and composed public parts; one scroll owner | Dashboard and scroller stories / V-03 |

| Dashboard regions | Base Card/Attachment and HoverCard compositions | TpCard, TpAttachment, TpPreviewCard, TpSidePanel, TpSelect | Fix shared structural grid/width; app owns layout and file complete state; remove nested fixed-height activity scroll; project Separator presentation only onto its inherited root, avoiding two painted elements; share fading for dialog content and backdrop so closure starts immediately | Dashboard and Card/Attachment stories / V-05 |

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
| V-01 | C-01 C-02 | Header desktop/mobile, light/dark and token override | 16px default icon, 14px small; centers align; existing sidebar intact | not run | Chrome MCP geometry/screenshots | pending | Compare selector chevron and trigger center |
| V-02 | C-03 | Start/end messages, RTL and named regions | Complete row reverses logically; header/footer reachable | not run | Chrome MCP screenshots/axe | pending | Verify shared Message, not demo CSS |
| V-03 | C-04 C-05 C-06 C-07 | Initial/open, append, prepend, resize, user scroll, commands and reconnect | Reader position preserved; latest affordance; controlled cancellation; stable visibility | not run | Chrome MCP actual keyboard + provider APIs | pending | Browser input separate from API setup |
| V-04 | C-08 | Workspace send/history; docs/source; build/lint | Consistent team chat and usable documented scroller | not run | Chrome MCP + focused checks/build | pending | No transport invented |

| V-05 | C-09 | Files, brief, overview, activity side panel, teammate preview and settings | Aligned controls, consistent selection, single activity scroll owner, no artificial whitespace | not run | Chrome MCP screenshots/geometry and focused checks | pending | Latest user screenshots |

## Early integration checkpoint

| ID | Check | Status | Evidence |
| --- | --- | --- | --- |
| I-01 | Shared ownership | passed | Message and scroller now own their implementations in dedicated folders; display/primitives reexport the same identities. Shared state and Button reused. |
| I-02 | Reference presentation | passed | Chrome light screenshot shows full outgoing row on right, incoming on left. Header center 34.99px versus trigger 34.49px (border rounding); no former 12.6px offset. |
| I-03 | Interaction composition | passed | Actual message submit renders outgoing row; earlier history loads stable item IDs in existing scroll owner. No startup errors. |

## Gate record

| Gate | Status | Evidence |
| --- | --- | --- |
| 0. Sources | passed | Fresh direct ASTs and linked page; source chain read |
| 1. Capabilities | passed | Eight independently mapped responsibilities; prior scroller wrapper deficiency documented |
| 2. Architecture | passed | Repair shared Message and MessageScroller; reuse state, buttons, Bubble and tokens; existing toolbar slot |
| 3. Behavior | pending | Implement then inspect |
| 4. Presentation | pending | Shared tokens and recipes |
| 5. Accessibility | pending | Names, keyboard and axe |
| 6. Visual | pending | Screenshot and geometry |
| 7. Documentation | pending | Authored public usage and source explorer |
| 8. Regressions | pending | Focused checks and builds |
