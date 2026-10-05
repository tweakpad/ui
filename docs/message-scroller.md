# Message Scroller

A native transcript viewport with turn anchoring, streaming follow, stable history loading and explicit scroll commands. The application owns messages and transport; Message and Bubble supply their presentation. The implementation follows the local [shadcn Message Scroller](https://ui.shadcn.com/docs/components/base/message-scroller) source through Tweakpad’s headless provider and Lit constituents.

```ts
import '@tweakpad/ui/register';
import '@tweakpad/ui/styles.css';
// Optional types/classes, without automatic registration:
import { TpMessageScroller, MessageScrollerProvider } from '@tweakpad/ui';
```

## Anatomy

```html
<tp-message-scroller label="Project conversation">
  <tp-message-scroller-viewport>
    <tp-message-scroller-content>
      <tp-message-scroller-item message-id="prompt-1" scroll-anchor>
        <tp-message author="You" align="end">
          <tp-bubble variant="secondary" align="end">What should we review?</tp-bubble>
        </tp-message>
      </tp-message-scroller-item>
      <tp-message-scroller-item message-id="reply-1">
        <tp-message author="Assistant">
          <tp-bubble>Start with the keyboard navigation.</tp-bubble>
        </tp-message>
      </tp-message-scroller-item>
    </tp-message-scroller-content>
  </tp-message-scroller-viewport>
  <tp-message-scroller-return-control></tp-message-scroller-return-control>
</tp-message-scroller>
```

Root owns one provider. Explicit composition has one Viewport containing one Content, zero or more Items and an optional Return control alongside the Viewport. Native wrappers around rows are allowed. Nested scrollers discover their nearest Root and remain independent. Provider has no element or visual wrapper.

For shorthand, put Items directly inside Root. It supplies the same public Viewport, Content and Return control. Use explicit composition to omit the control or configure constituent APIs. Root’s `returnDirection` configures only its implicit control. Do not mix an explicit viewport with direct Root rows.

## Root API

`TpMessageScroller` / `<tp-message-scroller>`:

| Property / attribute                        | Type / default                                   | Behavior                                                                                                                                            |
| ------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `label`                                     | string, `Conversation`                           | Accessible viewport and log name; constituents can override it.                                                                                     |
| `initialPosition` / `initial-position`      | `start \| end \| last-anchor \| preserve`, `end` | Once-only first nonempty visible placement. `preserve` is the compatibility spelling for `last-anchor`. Changing it later does not move the reader. |
| `follow`                                    | boolean, `true`                                  | Follow content growth while pinned; reaching the live end re-arms it. Set `.follow = false` to disable.                                             |
| `pinned`                                    | boolean, uncontrolled until supplied             | Controlled pin state. Initialize before connection and accept proposals synchronously. Keep the same controlled/uncontrolled mode for the lifetime. |
| `defaultPinned` / `default-pinned`          | boolean, `true`                                  | Initial uncontrolled state, not a reset command.                                                                                                    |
| `threshold`                                 | number, `8`                                      | Edge tolerance in viewport CSS pixels.                                                                                                              |
| `readingLine` / `reading-line`              | number, `0`                                      | Reading offset below content padding; also the default command scroll margin.                                                                       |
| `previousItemPeek` / `previous-item-peek`   | number, `0`                                      | Additional context above an anchored turn.                                                                                                          |
| `returnControlPeek` / `return-control-peek` | number, `0`                                      | Extra tail space. This space alone does not set the end edge flag.                                                                                  |
| `preserveOnPrepend` / `preserve-on-prepend` | boolean, `true`                                  | Preserve the first visible stable row when earlier content is inserted or resized.                                                                  |
| `knownMessageIds`                           | readonly string[], `[]`; property only           | Application-known IDs that may not be mounted yet; permits pending commands.                                                                        |
| `returnDirection` / `return-direction`      | `start \| end`, `end`                            | Direction of the shorthand return control.                                                                                                          |
| `provider`                                  | readonly `MessageScrollerProvider`               | Commands, native viewport and subscriptions for external controls.                                                                                  |

Geometry values are nonnegative CSS pixels; negative or nonfinite input is normalized to zero. Boolean attributes express true by presence: `follow="false"` is still true. Assign properties to disable defaults (`root.follow = false`, `root.defaultPinned = false`, `root.preserveOnPrepend = false`). Tweakpad retains follow enabled and peek zero as compatibility defaults; the upstream primitive defaults differ.

Opening waits for measurable content; confirmed empty content clears pending paint, and later first content still receives the opening position. `last-anchor` opens at the latest anchor when that turn exceeds the viewport; short turns or no anchors fall back to the end. Following, free scrolling, anchored reading and settling a jump are distinct modes. A single new anchored turn holds its reading line while its reply consumes reserved space, then hands off to following. A batch of anchors while following retains the live end. Deliberate native scrolling releases automatic control.

## Viewport API

`TpMessageScrollerViewport` / `<tp-message-scroller-viewport>`:

| Property / attribute                        | Type / default                    | Behavior                                                                                                                     |
| ------------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `label`                                     | string, `''`                      | Empty inherits Root’s label.                                                                                                 |
| `preserveOnPrepend` / `preserve-on-prepend` | boolean or undefined, `undefined` | Inherits Root when undefined. An explicit false disables provider correction while retaining the browser’s native anchoring. |
| `viewportElement`                           | readonly `HTMLElement \| null`    | Actual native scrolling region after render. Root also exposes it as `provider.viewport`.                                    |

The default slot contains Content. Its native region has `tabindex="0"` and owns scrolling. Wheel, touch, keyboard, momentum, text selection and focused descendants retain their native behavior. Use this element when integrating an external virtualizer, observing size or reading scroll position. Do not add a second scroll container around Content.

## Content API

`TpMessageScrollerContent` / `<tp-message-scroller-content>`:

| Property / attribute | Type / default                 | Behavior                                                                       |
| -------------------- | ------------------------------ | ------------------------------------------------------------------------------ |
| `label`              | string, `''`                   | Empty inherits Root’s label.                                                   |
| `contentElement`     | readonly `HTMLElement \| null` | Native content layout/log after render.                                        |
| `spacerElement`      | readonly `HTMLElement \| null` | Provider-owned, aria-hidden tail spacer; inspect but do not move or resize it. |

The default slot contains Items and transcript content. Defaults are `role="log"`, `aria-live="polite"`, `aria-relevant="additions"`, `aria-atomic="false"`. Override log semantics through the `message-scroller-content` part contract when the surrounding application owns announcements:

```js
content.partContracts = {
  'message-scroller-content': {
    hostProperties: { role: 'list', 'aria-live': 'off', 'aria-busy': 'false' },
  },
};
// If using role=list, give each Item's semantic part role=listitem as well.
```

During a reply, set `aria-busy` through this contract and clear it when the reply ends. Avoid a second live region repeating the entire transcript or announcing every token. Viewport remains the named, focusable region even when Content’s semantics change.

## Item API

`TpMessageScrollerItem` / `<tp-message-scroller-item>`:

| Property / attribute             | Type / default              | Behavior                                                      |
| -------------------------------- | --------------------------- | ------------------------------------------------------------- |
| `messageId` / `message-id`       | string, `''`, reflected     | Stable unique ID for commands and visibility.                 |
| `scrollAnchor` / `scroll-anchor` | boolean, `false`, reflected | Marks a new turn; independent of author or message alignment. |

The default slot accepts Message/Bubble, Marker, attachments, native prose or other public components. A user prompt often starts a turn; ordinary chat messages need no anchors. Preserve ID and element identity when updating streamed text. Anonymous Items still participate in layout but are excluded from addressable visibility. Duplicate IDs report a diagnostic and retain the first target. Legacy direct children receive stable per-element identities; Items are preferred for explicit addressing.

Items expose `data-message-id` when nonempty and `data-scroll-anchor="true|false"`. They use content visibility and intrinsic-size estimation for long transcripts. This is not built-in virtualization: application virtualizers own their rendered window and spacers. Supply `knownMessageIds` before commanding an unmounted target, mount the requested row, then await the command receipt. Keep the same native viewport and stable visible row IDs when prepending history.

For entrance animation, animate a message’s inner presentation with opacity/transform after mounting it. Keep the Item’s layout height stable, honor inherited `motion-policy`/`resolvesReducedMotion(element)`, and cancel application-owned animations on removal. There is no separate Item animation property or React motion dependency.

## Return control API

`TpMessageScrollerReturnControl` / `<tp-message-scroller-return-control>` is the actual [Button](?path=/docs/components-button--docs) implementation with edge-based activation. It is the live specification’s renamed Button constituent, not a second button owner.

| Property / attribute                   | Type / default                         | Behavior                                                                           |
| -------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------- |
| `returnDirection` / `return-direction` | `start \| end`, `end`, reflected       | Edge to jump to; also determines logical top/bottom placement and arrow direction. |
| `behavior`                             | `auto \| instant \| smooth`, `smooth`  | Native scroll behavior; reduced motion resolves to instant.                        |
| `active`                               | readonly boolean                       | Whether content exists beyond the selected edge.                                   |
| `variant`, `size`                      | inherited; `secondary`, `icon-sm` here | Standard Button presentation, with the shared circular return recipe.              |
| `icon`                                 | inherited; chevron-down                | Real Icon binding. Set `null` to remove; use Button icon slots for custom marks.   |
| `aria-label`                           | `Scroll to end` / `Scroll to start`    | Override with a task-specific accessible name.                                     |

All other Button properties, slots, part contracts, loading, disabled/focusable-disabled, render delegates and native action behavior remain inherited; see Button’s complete API. Keep `type="button"` (default) for transcript commands. A navigation `href` retains Button link semantics and should only be supplied when navigation is intended too. A text label can use `size="sm"`; set `icon = null` if no arrow is wanted.

An inactive control is inert, unavailable to pointer/keyboard input and visually hidden. An active control can independently be disabled. `data-active="true|false"` and `data-direction="start|end"` appear on host and button. Cancel its bubbling `click` with `event.preventDefault()` or the shared `preventComponentHandling()` mechanism before the queued scroll command runs. Omitting the constituent in explicit composition removes it entirely.

## Commands and controlled pinning

Root and Provider expose `scrollToStart(options?)`, `scrollToEnd(options?)` and `scrollToMessage(id, options?)`. No command returns a bare Promise:

```js
const receipt = scroller.scrollToMessage('prompt-1', {
  align: 'start',
  behavior: 'smooth',
  scrollMargin: 24,
});
console.log(receipt.status); // accepted, pending, or rejected
const result = await receipt.finished; // completed, superseded, or rejected
```

| Option         | Default            | Meaning                                                                                                          |
| -------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `align`        | `start`            | `start`, `center`, `end`, `nearest`; applies to message commands. Nearest leaves fully visible rows in place.    |
| `behavior`     | `instant`          | Native `instant`, `smooth` or `auto`. Component/environment reduced motion overrides animation.                  |
| `scrollMargin` | Root `readingLine` | Offset inside content padding. Start/center place the row lower by this amount; end leaves this amount below it. |

Known unmounted targets and commands awaiting a measurable viewport return `pending`. Unknown IDs and rejected controlled proposals return `rejected`. Pending is not a loading operation: the application must mount its known row. Later accepted commands, user intent or disconnect resolve unfinished work as `superseded`. Message/start commands release following; a completed end command resumes it when enabled. Commands preserve native focus except the return control blurs itself before becoming inactive.

`tp-value-change` bubbles and is composed/cancelable. Its Boolean `detail.value` proposes pinned state; `previousValue`, `reason`, `sourceEvent`, optional `trigger`, `cancelled` and `allowPropagation` follow the shared state contract. Keyboard intent reports `keyboard`, pointer/wheel/touch intent reports `pointer`, and commands or detected scroll changes report `programmatic`. There is no additional Message Scroller commit event.

```js
scroller.pinned = true; // initialize before connection for controlled ownership
scroller.addEventListener('tp-value-change', (event) => {
  if (event.target !== scroller) return;
  // Accept synchronously. Omit this assignment or preventDefault() to reject.
  scroller.pinned = event.detail.value;
});
```

Rejected proposals retain the accepted state/mode and restore its position. In uncontrolled mode, optional cancellation works through the same event. Do not switch an already mounted uncontrolled instance to controlled ownership.

## Provider and subscriptions

The exported `MessageScrollerProvider` is headless and has no DOM wrapper. Most applications use `scroller.provider`:

```js
const stopEdges = scroller.provider.scrollable.subscribe(({ value }) => {
  firstButton.disabled = !value.start;
  latestButton.disabled = !value.end;
}, true); // emit the current snapshot too
const stopVisibility = scroller.provider.subscribeVisibility((value) => {
  updateOutline(value.visibleMessageIds, value.currentAnchorId);
});
// On removing your external UI:
stopEdges();
stopVisibility();
```

Edges are independent, use real content rather than tail spacer overflow, and avoid transient end indicators while following. Visibility snapshots are immutable and ordered by transcript position. `currentAnchorId` is the last anchor that reached the reading line, even after it scrolls above the viewport. The peek band is excluded from reading visibility. The first visibility subscriber starts observation; the last unsubscribe stops it and restores a stable empty snapshot. IntersectionObserver is used when available, with layout-based fallback. Subscribing does not synchronously call the listener; read `provider.visibility` if an immediate snapshot is needed.

| Provider member                              | Contract                                                                                                       |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `viewport`                                   | Connected native element or undefined.                                                                         |
| `mode`                                       | `following-bottom`, `free-scrolling`, `anchored-to-message`, `settling-jump`; observe, do not assign.          |
| `pendingScroll`, `autoscrolling`             | Opening/temporary programmatic-end indicators.                                                                 |
| `scrollable.value`                           | `{ start: boolean, end: boolean }`; subscribe for changes, do not mutate the store.                            |
| `visibility`                                 | `{ visibleMessageIds: readonly string[], currentAnchorId: string \| null }`.                                   |
| `subscribeVisibility(callback)`              | Returns cleanup; no per-row scroll rendering.                                                                  |
| `schedule()`                                 | Coalesces a reconciliation frame after external layout/data work.                                              |
| `connect(viewport, content, spacer, source)` | Bind a headless instance to native anatomy; source contains row mutations. Root manages this automatically.    |
| `disconnect()`                               | Remove observers/listeners/frames/timers, supersede pending work and reset opening state; reconnect supported. |
| Three scroll methods                         | Same receipts/options as Root.                                                                                 |

For a standalone provider, `new MessageScrollerProvider(options)` takes these required live getter/callback functions (Root already supplies them): `rows(): TranscriptRow[]`, `knownIds(): readonly string[]`, `pinned(): boolean`, `pin(value, sourceEvent?): boolean` (return whether accepted), `follow(): boolean`, `initialPosition()`, `threshold()`, `readingLine()`, `previousItemPeek()`, `returnControlPeek()`, `preserveOnPrepend()`, `reducedMotion(): boolean`, and `changed(): void`. Geometry getters use the Root types above. `TranscriptRow` is `{ id, element: HTMLElement, anchor: boolean, addressable?: boolean }`; setting addressable false excludes an anonymous row from visibility. Provider does not supply semantic DOM, presentation or application data; standalone integrations own those contracts and cleanup. Exported types also include `MessageScrollerOptions`, `ScrollMode`, `ScrollOptions`, `ScrollCommand` and `ScrollVisibility`.

## Parts, state and customization

All constituents inherit TpElement’s `partContracts`, `partPresentation`, theme/dictionary and motion policy APIs. Appearance comes from shared recipes; structural scrolling and spacer geometry remain with the provider.

| Part                                           | Owner / state passed to contract hooks                                                                                            |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `message-scroller`                             | Root; `{ pinned }`                                                                                                                |
| `message-scroller-viewport` (`viewport` alias) | Viewport; `{ pendingScroll, start, end }`                                                                                         |
| `message-scroller-content`                     | Content; empty state                                                                                                              |
| `message-scroller-item`                        | Item; `{ messageId, scrollAnchor }`                                                                                               |
| `message-scroller-return-control`              | Actual Button root; inherited Button state (`disabled`, variant, size, etc.). Additional active/direction markers on its element. |

Contracts support `hostProperties`, state-aware `classHook`/`styleHook`, `content` and `renderDelegate` with shared binding rules. Root contracts for constituent names project across the composition. An explicitly supplied constituent contract replaces that whole inherited contract; it does not recursively merge. Return control accepts its canonical key or `button` (the latter takes precedence); its internal Button label/mark parts keep their Button names. Preserve mandatory native scrolling/log anatomy and bound semantic state when delegating rendering; content replacement replaces the slot, so supply the intended transcript yourself.

```js
scroller.partPresentation = {
  'message-scroller-content': {
    styleHook: { padding: 'var(--tp-space-5)', gap: 'var(--tp-space-4)' },
  },
};
scroller.partContracts = {
  'message-scroller-viewport': {
    hostProperties: { 'aria-describedby': 'conversation-help' },
  },
};
```

Each constituent exposes its native part through its own `::part(...)`; Root also registers native constituent parts for `partPresentation`. Shorthand exports viewport, content and return-control parts. Items expose their part on the Item host. Use constituent selectors in explicit composition and Root’s projection API when crossing multiple shadows.

Root and its native viewport expose presence markers `data-pending-scroll`, `data-scrollable-start`, `data-scrollable-end`, `data-autoscrolling`, a `data-scrollable` token list (`start end`) and `data-scroll-mode`. Root host also exposes `data-pinned`. Pending paint is hidden until opening placement completes; this is client-side placement, not a React SSR/hydration API.

The default frame height is `120 × --tp-spacing`. Set `--tp-message-scroller-height: 24rem` for a different bound, or `100%` inside a height-constrained parent. Content padding/gaps, return-control appearance, colors and motion timings use shared tokens/dictionaries. The viewport recipe includes the reference’s native scroll-timeline bottom fade, which clears at the end; override `mask-image` through its presentation hook to remove it. RTL uses logical control placement. Keep motion policy inherited or set `motion-policy="reduce"` to make scroll commands immediate and remove decorative timed motion.

## Reference chat demo

The main demo follows the shadcn base/Rhea chat composition: a bounded Card with
header Reset action, an Empty state, Message/Bubble rows, and an Input group
composer with a plus Menu and icon-only Send button. Press Send to submit each
queued prompt; replies stream locally. Reset clears the conversation. Menu choices
are illustrative and do not upload files or invoke external services.

The base demo sets `follow=false` and `previousItemPeek=64` to match the reference
provider settings; the component defaults remain `true` and `0`. The Streaming
messages example enables following. Story Controls apply when messages are mounted;
changing opening controls remounts the demo.

The reference uses static text for its read-only prompt. Tweakpad Input group
requires one Control, so this composition uses an accessible read-only Text area
with two visible lines and resizing disabled. Its accessible label is “Queued
message”; no visible Field label or separate action row is added. All nested
controls are public library components, and sizing uses their public parts.
