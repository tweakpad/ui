# Shared anchored surface API

Menu, Context Menu, Popover and Navigation Menu use the same positioning,
portal, presence and dismissal owners. Their individual references define the
state, focus, modality and trigger policies; sharing these options does not
change those policies. Menubar configures these options on its child Menu.

## Positioner, Portal, Arrow and Backdrop

Properties with a kebab-case attribute are shown as `property / attribute`.
Function, element, ref, record and callback values are JavaScript properties.

| Property / attribute                                     | Type                                               | Menu / Context / Popover / Navigation default | Meaning                                                                                                                              |
| -------------------------------------------------------- | -------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `placement`                                              | string                                             | `bottom center`                               | Compatibility pair of side and alignment.                                                                                            |
| `side`                                                   | physical or logical side                           | `bottom`                                      | top, right, bottom, left, inline-start, inline-end, block-start or block-end. Nested Menu uses inline-end.                           |
| `align`                                                  | start / center / end                               | center                                        | Independent alignment; nested Menu uses start.                                                                                       |
| `sideOffset / side-offset`, `alignOffset / align-offset` | number or geometry resolver                        | 0                                             | Main-axis gap and alignment shift.                                                                                                   |
| `offset`                                                 | number or geometry resolver                        | alias of sideOffset                           | Compatibility alias.                                                                                                                 |
| `anchor`                                                 | Element, VirtualAnchor, ref, resolver or undefined | current Trigger                               | VirtualAnchor exposes getBoundingClientRect and optional contextElement. Popover's anchor slot overrides its default Trigger anchor. |
| `collisionAvoidance`                                     | CollisionPolicy                                    | side flip, align flip                         | Side and alignment correction; perpendicular fallback is opt-in.                                                                     |
| `collisionBoundary`                                      | clipping ancestors, Element(s) or rectangle        | clipping-ancestors                            | Boundary used by the common overflow calculation.                                                                                    |
| `collisionPadding`                                       | number or physical-side record                     | 5                                             | Inner boundary padding.                                                                                                              |
| `sticky`                                                 | boolean                                            | false                                         | Retain attachment near the clipping edge.                                                                                            |
| `disableAnchorTracking / disable-anchor-tracking`        | boolean                                            | false                                         | Stop automatic position tracking; updatePosition still measures explicitly.                                                          |
| `positionMethod / position-method`                       | absolute / fixed                                   | absolute                                      | Positioning strategy.                                                                                                                |
| `portal`                                                 | boolean                                            | true                                          | Render the layer in the shared owner-document portal.                                                                                |
| `container`                                              | Element, ShadowRoot, ref, resolver or null         | null                                          | Null resolves to owner body; an unresolved supplied target stays absent.                                                             |
| `portalIdentifier / portal-identifier`                   | string or undefined                                | undefined                                     | Reuse an existing ID container or create a reference-counted container; user containers are never removed.                           |
| `preserveTabOrder / preserve-tab-order`                  | boolean                                            | true                                          | Preserve the logical nonmodal focus boundary when portaled.                                                                          |
| `keepMounted / keep-mounted`                             | boolean                                            | false                                         | Retain closed popup structure; inactive content is hidden and inert.                                                                 |
| `showArrow / show-arrow`                                 | boolean                                            | false                                         | Independent optional Arrow.                                                                                                          |
| `arrowPadding / arrow-padding`                           | number                                             | 5                                             | Arrow's minimum inset from popup corners.                                                                                            |
| `arrowWidth / arrow-width`, `arrowHeight / arrow-height` | number                                             | 14, 7                                         | Arrow geometry.                                                                                                                      |
| `arrowStaticOffset / arrow-static-offset`                | number, CSS percentage or undefined                | undefined                                     | Explicit static axis offset.                                                                                                         |
| `arrowTipRadius / arrow-tip-radius`                      | number                                             | 0                                             | Rounded generated triangle tip.                                                                                                      |
| `arrowPath / arrow-path`                                 | SVG path string                                    | empty                                         | Empty generates the triangle from dimensions.                                                                                        |
| `arrowBorderColor / arrow-border-color`                  | CSS color                                          | empty                                         | Optional Arrow stroke.                                                                                                               |
| `arrowBorderWidth / arrow-border-width`                  | number                                             | 0                                             | Optional stroke width.                                                                                                               |
| `showBackdrop / show-backdrop`                           | boolean                                            | false                                         | Render the independent Backdrop; does not turn a nonmodal surface modal.                                                             |
| `backdropForceRender / backdrop-force-render`            | boolean                                            | false                                         | Retain the inactive Backdrop; it stays hidden and inert.                                                                             |
| `showViewport / show-viewport`                           | boolean                                            | false; Navigation true                        | Render the payload viewport with retained previous/current entries and measured dimensions.                                          |

An offset resolver receives `{side, align, anchor: {width, height}, positioner:
{width, height}}`. Side is resolved to a physical side for the current candidate;
collision flips re-evaluate the callback with the new side. Return a finite
number. Direction, writing mode, locale and document resources follow the
nearest composed environment, including after adoption.

## State, focus and methods

For Menu, Context Menu and Popover, `open` is optional controlled Boolean state;
`defaultOpen / default-open` is false for uncontrolled initialization.
Configure one ownership mode before connection. Do not supply both modes.
Navigation Menu uses its `value` instead. A Menubar child derives open state from
the bar's value and must not also be independently controlled.

`onOpenChange(event)` and the bubbling, composed, cancelable `tp-open-change`
share one event. Details include `value`, `previousValue`, `reason`, `sourceEvent`,
`cancelled`, and the associated `trigger` where available. Current association
identity/payload are exposed by the Root getters. A controlled callback publishes `owner.open = event.detail.value`
synchronously; the committed getter remains stable until the proposal is accepted.
`preventDefault()` or `detail.cancelled = true` vetoes the proposal. On closing,
`event.detail.preventUnmountOnClose()` requests retention for an externally completed
transition; call `actions.unmount()` after that transition. A later DOM veto also
discards an earlier callback's provisional publication.

`onOpenChangeComplete(open)` and `tp-open-change-complete` (`{open}`) report an
actually completed transition. Reversal cancels the superseded completion.
`tp-diagnostic` reports an actionable configuration/lifecycle problem.

| Property / method                                                  | Default / result                                                | Meaning                                                                           |
| ------------------------------------------------------------------ | --------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `label`                                                            | empty string                                                    | Popup's accessible fallback name. Prefer visible Title or labelled group content. |
| `disabled`                                                         | false                                                           | Suppress invocation and component actions without rewriting authored child flags. |
| `dismissible`                                                      | true                                                            | Allow outside dismissal; Escape still follows the owning component policy.        |
| `initialFocus`                                                     | none; Menu chooses according to input                           | Opening focus target.                                                             |
| `finalFocus`                                                       | trigger                                                         | Return target, subject to the component's restoration rules.                      |
| `setOpen(open, reason?, sourceEvent?)`                             | boolean                                                         | Request state through the normal proposal owner.                                  |
| `close()` / `actions.close()`                                      | void                                                            | Request close; cancellation is respected.                                         |
| `unmount()` / `actions.unmount()`                                  | void                                                            | Request close and release retained content only after an accepted close.          |
| `updatePosition()`                                                 | Promise of result or null                                       | Explicitly measure and apply position.                                            |
| `popupElement`, `triggerElement`, `portalElement`                  | HTMLElement or null                                             | Current actual rendered targets; outgoing references clear when replaced.         |
| `positioned`, `positioningResult`, `resolvedSide`, `resolvedAlign` | current positioning outputs                                     | Observe geometry without owning another state model.                              |
| `presenceState`                                                    | absent / starting / open / ending / retained                    | Shared lifecycle state.                                                           |
| `payload`, `activeTriggerIdentifier`                               | current association                                             | Payload and identity retained through closing.                                    |
| `viewportState`                                                    | current/previous/transitioning/activationDirection/width/height | Read-only shared viewport snapshot.                                               |

Focus options accept an element, `{current: element}`, resolver, `'trigger'`,
`'first'`, `'popup'`, `'previous'`, `'none'`, tabbable index or Boolean. The resolver
receives `'mouse'`, `'touch'`, `'pen'`, `'keyboard'` or `''` for a programmatic
change. Returning false/undefined suppresses focus; true/null chooses the
component default. Final focus uses the closing interaction and does not steal
focus already moved outside the surface. Context Menu restores its target only
for a keyboard opening that moved focus into content. Navigation remains nonmodal
and preserves ordinary native-link Tab behavior.

## Trigger association and hover

Menu and Popover support a slotted real Button or native action host, multiple
registered triggers, and an optional `SurfaceHandle` (`createSurfaceHandle()`).
`registerTrigger(element, options)` returns cleanup. Options include optional
`identifier`, `payload`, `nativeAction=true`, `disabled=false`, `openOnHover`,
`openDelay`, `closeDelay`, and `closeOnClick`. `handle` attaches the Root;
`triggerIdentifier` constrains a controlled association and
`defaultTriggerIdentifier` initializes an uncontrolled association. `content` is
an optional payload-to-Lit-content resolver. Unknown explicit identifiers do not
silently choose another trigger. A handle operates its most recently attached
live Root and keeps detached triggers inert while no Root is attached.

Context Menu owns a single context target, and Navigation associates each trigger
with its Item. Do not use detached trigger registration or a surface handle for
those component policies.

Menu and Popover expose `openOnHover / open-on-hover=false`, `openDelay /
open-delay` (Menu 100ms; Popover 300ms), `closeDelay / close-delay=0`, and the `delay`
compatibility alias for openDelay. Navigation uses hover with 50ms open/close.
Hover respects pointer type, safe travel to interactive content and focus inside
that content. Pressing a hover-open interactive surface can pin it open.
`disableHoverablePopup / disable-hoverable-popup=false`, `closeOnClick /
close-on-click=false`, `trackCursorAxis / track-cursor-axis='none'` (horizontal,
vertical, both) and `provider` (DelayGroup) are shared compatibility controls;
only use them where the owning component's trigger policy applies. They do not
turn Context Menu into Tooltip or change Navigation's link semantics.

## Parts, rendering and theming

Each component reference lists its public part names. Root `partContracts`
configures parts rendered by that Root. A child MenuItem, RadioGroup or
NavigationMenuItem owns its own `partContracts`; configure that constituent's
contract on the constituent. Root `partPresentation` contributions flow to their
current semantic targets, before each constituent's terminal hooks.

A contract supports `renderDelegate({state, properties, content, bind})`,
`hostProperties`, `classHook`, `styleHook`, `elementReference` callback/ref, and
`content`, including state resolvers. A delegate must spread the supplied Lit
`bind` directive onto exactly one semantic host. Consumer event handlers run
first. `preventComponentHandling(event)` stops component handling independently
of `event.preventDefault()`, which retains its native browser meaning.

Hidden flattened constituents use `portal`, `positioner`, `arrow`, `backdrop`,
`viewport` keys when no same-named public part exists. An Item's Indicator uses
its `indicator` key. The logical Root is the existing custom element; configure
its ordinary host attributes and presentation rather than replacing its identity.
Authored Button/Separator/native-link roles retain their own API and rendering
owners. Do not clone a control to customize a projected part.

Use shared semantic tokens, scoped theme attributes, `setPresentationDictionary`
and `partPresentation`. Portaled content follows the current owner theme and
removes stale copied token overrides. Observable hooks include `data-open`,
`data-closed`, `data-disabled`, `data-presence`, `data-starting-style`,
`data-ending-style`, resolved `data-side`/`data-align`, `data-positioned`,
`data-anchor-hidden`, and Arrow visibility. Positioning publishes
`--tp-available-width`, `--tp-available-height`, `--tp-anchor-width`,
`--tp-anchor-height`, `--tp-transform-origin`, and Arrow coordinates. Viewport
publishes `--tp-popup-width` and `--tp-popup-height`.

Popover participates in the shared `surface` motion role with enter/exit phases.
Menu, Context Menu, Menubar and Navigation Menu use the shared presence lifecycle
and sourced presentation transitions; they do not publish additional motion
roles. `motionPolicy` is inherit/normal/reduce. The bubbling `tp-motion-request` event
allows a consumer to supply an external driver; see [Motion](motion.md).
These command/navigation containers are not form controls. Composed Button,
Input and Field children retain their own form behavior.
