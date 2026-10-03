Tooltip adds a brief description to a focusable trigger. Hover opens after 600 ms; keyboard focus opens immediately. Escape closes without moving focus. Pointer movement from the trigger into the content keeps it open. Touch does not create a persistent tooltip.

Disabling a Tooltip suppresses its description and opening behavior; it does not disable or change the hover appearance of the control it describes.

```ts
import { html } from 'lit';
import '@tweakpad/ui/register';
import '@tweakpad/ui/styles.css';
import { plusIcon } from '@tweakpad/ui/icons/plus';
// In a Lit template:
html`<tp-tooltip side="right" align="center">
  <tp-button slot="trigger" variant="outline">Add item</tp-button>
  <tp-icon .icon=${plusIcon}></tp-icon> Add item <tp-key-hint>⌘ K</tp-key-hint>
</tp-tooltip>`;
```

Supply meaningful text. Icons and keyboard hints are supported; links, inputs and buttons inside the description are not. Use Popover for interactive content. A tooltip does not replace a button's accessible name or required instructions. Its description is associated with the actual focusable native control, including a Button's shadow root.

### Root and trigger properties

| Property / attribute                                      | Type; default                                                | Behavior                                                                                                                                              |
| --------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `open`                                                    | boolean; uncontrolled unless supplied initially              | Controlled when initially supplied. Accept `tp-open-change` proposals by assigning their value; otherwise use `setOpen()` for uncontrolled instances. |
| `defaultOpen` / `default-open`                            | boolean; false                                               | Initial uncontrolled state.                                                                                                                           |
| `disabled`                                                | boolean; false                                               | Cancels pending work, closes and removes the description. Trigger-level disabled state also prevents opening.                                         |
| `label`                                                   | string; empty                                                | Default-slot text fallback.                                                                                                                           |
| `openDelay` / `open-delay`                                | number; 600                                                  | Pointer delay in ms; explicit trigger options override the root, which overrides Provider. Focus has no delay.                                        |
| `closeDelay` / `close-delay`                              | number; 0                                                    | Delay after leaving the trigger/content.                                                                                                              |
| `delay`                                                   | number                                                       | Compatibility alias of `openDelay`.                                                                                                                   |
| `closeOnClick` / `close-on-click`                         | boolean; true                                                | Close after accepted trigger activation. Set the property to false to disable.                                                                        |
| `disableHoverablePopup` / `disable-hoverable-popup`       | boolean; false                                               | Disable popup hit testing and the safe hover corridor.                                                                                                |
| `trackCursorAxis` / `track-cursor-axis`                   | none, horizontal, vertical, both; none                       | Use pointer coordinates on selected axes. Focus opening uses the trigger rectangle. Both-axis tracking disables popup hit testing.                    |
| `keepMounted` / `keep-mounted`                            | boolean; false                                               | Retain closed DOM hidden and inert after the exit completes.                                                                                          |
| `provider`                                                | `TooltipProvider`; private service by default                | Shared delay and sibling coordination, with no wrapper element.                                                                                       |
| `handle`                                                  | `TooltipHandle`; undefined                                   | Detached trigger association.                                                                                                                         |
| `triggerIdentifier` / `trigger-identifier`                | string; undefined                                            | Controlled trigger association.                                                                                                                       |
| `defaultTriggerIdentifier` / `default-trigger-identifier` | string; undefined                                            | Initial uncontrolled trigger association.                                                                                                             |
| `content`                                                 | `(payload: unknown) => TemplateResult \| unknown`; undefined | Rich content resolver for the active accepted trigger payload. Alternative to default slot.                                                           |
| `onOpenChange`                                            | callback; undefined                                          | Receives the same cancelable proposal event as the DOM listener.                                                                                      |
| `onOpenChangeComplete`                                    | `(open: boolean) => void`; undefined                         | Runs after each completed entry/exit.                                                                                                                 |

### Positioner and arrow

| Property / attribute                                | Type; default                                                                           | Behavior                                                                                                                                                       |
| --------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `side`                                              | top, right, bottom, left, inline-start, inline-end, block-start, block-end; block-start | Requested side. Logical values follow the anchor's writing mode and direction. Collisions may change the resolved side.                                        |
| `align`                                             | start, center, end; center                                                              | Requested alignment; horizontal start/end follow direction.                                                                                                    |
| `sideOffset` / `side-offset`                        | number; three theme spacing units                                                       | Gap from the anchor in CSS pixels. The default arrow protrudes 1.5 theme spacing units into the three-unit gap.                                                |
| `alignOffset` / `align-offset`                      | number; 0                                                                               | Alignment-axis spacing.                                                                                                                                        |
| `placement`                                         | string                                                                                  | Compatibility alias combining side and alignment, e.g. `bottom-start`.                                                                                         |
| `offset`                                            | number                                                                                  | Compatibility alias of `sideOffset`.                                                                                                                           |
| `collisionPadding`                                  | number or `{top,right,bottom,left}`; three theme spacing units                          | Minimum viewport/boundary inset. Property only.                                                                                                                |
| `collisionBoundary`                                 | Element, Element[], rectangle or `clipping-ancestors`; clipping-ancestors               | Boundary intersected with the visual viewport. Native top-layer positioning escapes ancestor clipping; hidden-anchor detection still respects anchor clipping. |
| `collisionAvoidance`                                | `{side, align, fallbackAxisSide?}`; `{side:'flip',align:'shift'}`                       | Side/align accept flip, shift or none. Fallback axis accepts start/end/none. None preserves requested overflow. Property only.                                 |
| `sticky`                                            | boolean; false                                                                          | Allow side-axis shifting to stay in the boundary. False keeps shifted alignment attached to the anchor. Explicit collision none still disables shifting.       |
| `disableAnchorTracking` / `disable-anchor-tracking` | boolean; false                                                                          | Disable scroll/resize/layout tracking; call `updatePosition()` manually.                                                                                       |
| `anchor`                                            | Element or virtual anchor; active trigger                                               | Virtual anchor has `getBoundingRectangle()` and optional `contextElement`. A context element supplies clipping and owner-environment tracking. Property only.  |
| `showArrow` / `show-arrow`                          | boolean; true                                                                           | Render the source-pointing arrow. Set property false to hide.                                                                                                  |
| `arrowPadding` / `arrow-padding`                    | number; two theme spacing units                                                         | Keep the arrow away from rounded corners.                                                                                                                      |
| `arrowStaticOffset` / `arrow-static-offset`         | number or CSS px/% string; undefined                                                    | Override arrow alignment unless collision shifting moved the popup.                                                                                            |
| `arrowWidth` / `arrow-width`                        | number; three theme spacing units                                                       | Arrow cross-axis extent.                                                                                                                                       |
| `arrowHeight` / `arrow-height`                      | number; 1.5 theme spacing units                                                         | Arrow protrusion. Adjust sideOffset when changing this.                                                                                                        |
| `arrowTipRadius` / `arrow-tip-radius`               | number; 0                                                                               | Rounded arrow tip.                                                                                                                                             |
| `arrowPath` / `arrow-path`                          | SVG path string; generated triangle                                                     | Custom path within a square viewBox of arrowWidth.                                                                                                             |
| `arrowBorderColor` / `arrow-border-color`           | CSS color; empty                                                                        | Optional SVG stroke.                                                                                                                                           |
| `arrowBorderWidth` / `arrow-border-width`           | number; 0                                                                               | Optional stroke width.                                                                                                                                         |

The positioner uses the browser top layer without moving authored content out of its theme or slot context. Flip, shift, available-size constraints, arrow placement and anchor visibility are recomputed on scroll, resize, content changes and layout movement. Hidden or disconnected anchors cannot leave a visible stale popup.

### Provider and detached triggers

```ts
import { TooltipProvider, createTooltipHandle } from '@tweakpad/ui';
const provider = new TooltipProvider({ openDelay: 600, closeDelay: 0, restTimeout: 400 });
firstTooltip.provider = provider;
secondTooltip.provider = provider;
// Moving between participants uses instant opening until restTimeout expires.

const handle = createTooltipHandle();
tooltip.handle = handle;
const unregister = handle.registerTrigger(button, {
  identifier: 'save',
  payload: 'Save this document',
  openDelay: 200,
  closeDelay: 0,
  closeOnClick: true,
  disabled: false,
});
tooltip.content = (payload) => html`${payload}`;
handle.open('save');
handle.close();
unregister();
```

Provider options are optional; `restTimeout` defaults to 400 ms. Explicit zero delays are preserved. Provider cancels competing pending work and closes the previous active tooltip. `destroy()` cancels pending work and closes its participant. Each tooltip has exactly one effective provider.

Detached triggers follow the latest connected root attached to the handle. Without a root they are inert; detaching restores the prior root. An unknown trigger identifier is rejected with a diagnostic. Registration options are `identifier`, `payload`, `openDelay`, `closeDelay`, `closeOnClick`, and `disabled`. The same options are available through `tooltip.registerTrigger(element, options)`, which returns cleanup. `nativeAction` is a shared-handle option relevant to Dialog and has no additional Tooltip behavior.

### Methods, events and state

- `setOpen(boolean, reason?, sourceEvent?)`, `close()` and `actions.close()` request a change. A rejected proposal changes neither visibility nor active payload/trigger.
- `unmount()` / `actions.unmount()` release retained closed content; an open surface first requests closing.
- `updatePosition()` returns a Promise of the resolved positioning result or null.
- `tp-open-change` is bubbling, composed and cancelable. `detail` includes `value`, `previousValue`, `reason`, `sourceEvent`, `trigger`, `cancelled`, and `preventUnmountOnClose()`. Call `event.preventDefault()` to reject. Retention takes effect only on an accepted close.
- `tp-open-change-complete` carries `{open}`; `tp-diagnostic` reports invalid mode, unknown identifiers and interactive content.
- Read-only: `payload`, `activeTriggerIdentifier`, `presenceState`, `positioned`, `positioningResult`, `resolvedSide`, `resolvedAlign`. Resolved geometry can differ from the requested side/alignment.

### Slots, parts and customization

`slot="trigger"` supplies the default focusable anchor. The default slot supplies descriptive children. Additional triggers use registration; there is one logical popup and provider per root.

Public parts are `tooltip`, `tooltip-trigger`, `tooltip-portal`, `tooltip-positioner`, `tooltip-content`, and optional `tooltip-arrow`. The positioner exposes `data-side`, `data-align`, `data-anchor-hidden`, and `data-positioned`. Content exposes open/closed, starting/ending, side/align, and instant-transition markers. Arrow exposes side/align and `data-uncentered`. Only the active native trigger receives the temporary description; authored descriptions are restored on close/cleanup.

Use semantic tokens, the presentation dictionary, `::part()` or `partPresentation` hooks. Tooltip has no variant axis. Icon and KeyHint remain real library components; KeyHint receives a Tooltip composition contribution before its own consumer overrides. Geometry variables include `--tp-anchor-width`, `--tp-anchor-height`, `--tp-available-width`, `--tp-available-height`, and `--tp-transform-origin`.

The `surface` motion role targets content, includes placement context and completes entry/exit. Default motion combines opacity, scale and a short slide toward the anchor. Focus, instant sibling switching and click dismissal suppress default motion. `motion-policy="reduce"`, inherited reduced-motion tokens and external motion drivers use the common library pipeline. Tooltip never traps or transfers focus.
