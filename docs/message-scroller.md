# Message Scroller

A native transcript viewport with stable rows, history preservation, opening positions, turn anchors and explicit scroll commands. Message and Bubble provide presentation; the application owns data and transport. The example's streamed response is a local script.

```html
<tp-message-scroller label="Project conversation" initial-position="end">
  <tp-message-scroller-item message-id="sam-1">
    <tp-message author="Sam"
      ><tp-bubble variant="secondary">Ready to review?</tp-bubble></tp-message
    >
  </tp-message-scroller-item>
  <tp-message-scroller-item message-id="alex-2">
    <tp-message author="Alex" align="end"
      ><tp-bubble align="end">Yes, let’s begin.</tp-bubble></tp-message
    >
  </tp-message-scroller-item>
</tp-message-scroller>
```

Keep one stable `message-id` per row. Legacy direct children remain supported with stable per-element identities; use explicit Items for addressable messages and turn anchors. Rows can contain messages, markers, attachments or history controls. Duplicate IDs retain their first target and report a diagnostic. Native wheel, touch, keyboard and selection behavior remains available. The viewport is focusable and the content is a polite log announcing additions rather than every streaming token.

| Property / attribute                        | Default      | Behavior                                                                                                                               |
| ------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `returnDirection` / `return-direction`      | end          | Direction of the standard return control: `start` or `end`. The default only shows Jump to latest when newer content is out of view.   |
| `label`                                     | Conversation | Accessible viewport and log name.                                                                                                      |
| `initialPosition` / `initial-position`      | end          | `start`, `end`, `last-anchor`, or `preserve` (last-anchor compatibility spelling). Applied to the first nonempty, visible render.      |
| `follow`                                    | true         | Re-arm following at the live end. Scrolling away releases it. Set the property to false to disable automatic following.                |
| `pinned`                                    | uncontrolled | Optional controlled Boolean. Accept `tp-value-change` proposals synchronously; rejected changes retain the accepted mode and position. |
| `defaultPinned` / `default-pinned`          | true         | Initial uncontrolled pin state.                                                                                                        |
| `threshold`                                 | 8            | Edge tolerance in viewport CSS pixels.                                                                                                 |
| `readingLine` / `reading-line`              | 0            | Logical block-start reading offset in viewport CSS pixels.                                                                             |
| `previousItemPeek` / `previous-item-peek`   | 0            | Extra previous-row context above an anchored turn, in viewport CSS pixels.                                                             |
| `returnControlPeek` / `return-control-peek` | 0            | Reserved tail space for the return control, in viewport CSS pixels.                                                                    |
| `preserveOnPrepend` / `preserve-on-prepend` | true         | Preserve the first visible stable row when history or preceding content changes.                                                       |
| `knownMessageIds`                           | []           | IDs known to the application but not yet mounted; commands may wait for these rows.                                                    |

`tp-message-scroller-item` accepts `messageId` / `message-id` and `scrollAnchor` / `scroll-anchor` (false). An anchor marks a turn, not a participant role. In a team chat ordinary messages need no anchor; in an assistant transcript the user prompt often starts a turn. One appended anchored turn holds its reading line as the reply grows. A batch of anchors while following retains the live end.

`scrollToStart(options?)`, `scrollToEnd(options?)`, and `scrollToMessage(id, options?)` return `{ status, finished }`. Status is `accepted`, `pending` for a known unmounted row, or `rejected`. `finished` resolves to `completed`, `superseded`, or `rejected`. Options are `align: start | center | end | nearest`, `behavior: instant | smooth | auto`, and `scrollMargin` in viewport CSS pixels. Smooth commands honor reduced motion. User intent and later commands supersede in-flight work. A consumer can cancel the edge button's click before its command runs.

The exported headless `MessageScrollerProvider` backs the element's `provider`. `provider.scrollable` is an ObservableStore of independent `start` and `end` flags. `provider.subscribeVisibility(callback)` reports ordered `visibleMessageIds` and `currentAnchorId`; unsubscribe to stop measurement. The inactive visibility snapshot is stable and empty. Geometry is measured only in scheduled frames; observers and listeners are removed on disconnect and restored on reconnection.

Parts: `message-scroller`, `message-scroller-viewport` (`viewport` alias), `message-scroller-content`, `message-scroller-item`, and `message-scroller-return-control`. The host and viewport expose `data-pending-scroll`, `data-scrollable-start`, `data-scrollable-end`, and `data-scroll-mode`. The host also exposes `data-pinned`. Buttons publish `data-direction` and `data-active`.

The shared theme owns padding and row gaps. The existing `--tp-message-scroller-height` hook bounds the viewport (default `120 × --tp-spacing`); the frame can also fill a height-constrained parent. Geometry properties are behavioral measurements, not per-control spacing themes.
