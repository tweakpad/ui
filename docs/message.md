# Message

Message arranges sender identity, content, metadata and optional actions. It does not send messages or infer delivery state.

Use `align="start"` for other participants and `align="end"` for the current sender. Avatar and Footer follow the logical side, including RTL; Header stays start aligned. Set the nested Bubble's alignment to the same value. A team chat uses bubbles on both sides; an assistant transcript can use a `ghost` Bubble for full-width assistant content. An activity history may use start-aligned rows throughout. Choose the composition deliberately.

| Property            | Default | Purpose                                                      |
| ------------------- | ------- | ------------------------------------------------------------ |
| `align`             | `start` | Logical sender side: `start` or `end`.                       |
| `author`            | empty   | Sender name in the default header.                           |
| `timestamp`         | empty   | Display timestamp in the default header.                     |
| `pending`, `failed` | false   | Compatibility display flags; the application supplies state. |

Slots: default (content), `avatar`, `header` (replaces default metadata), and `footer` (status, reactions or controls). A missing optional region has no layout footprint. Actions remain ordinary focusable controls.

Presentation parts: `message-root`, `message-avatar`, `message-content`, `message-header`, `message-footer`; previous `root`, `body`, `meta`, `content`, `author`, `timestamp` hooks remain. Shared dictionary recipes own spacing and typography. Wrap chronological rows in `tp-message-scroller-item` when using Message Scroller.

## Composition

```html
<script type="module">
  import '@tweakpad/ui/register';
  import '@tweakpad/ui/styles.css';
</script>
<tp-message aria-label="Sam Rivera">
  <tp-avatar slot="avatar" fallback="SR" alt="Sam Rivera"></tp-avatar>
  <span slot="header">Sam Rivera</span>
  <tp-bubble>The review notes are ready.</tp-bubble>
  <span slot="footer">Delivered</span>
</tp-message>
```

Message supplies the row, avatar column, Header, Content and Footer. Put the actual visible surface in `tp-bubble`; place multiple surfaces in `tp-bubble-group`. Put images/files in `tp-attachment`. Content owns the gap between these blocks. The avatar aligns with Content's lower edge even when the Footer grows or wraps; no fixed footer-height offset is needed.

`tp-message-group` stacks consecutive messages from one sender using the existing `message` presentation part. It has no selection, transport state, events or special keyboard behavior. Its default slot accepts Message rows; inherited `partContracts` and `partPresentation` customize the Group. It is exported as `TpMessageGroup` and registered by `@tweakpad/ui/register`.

```html
<tp-message-group>
  <tp-message aria-label="Sam Rivera">
    <span slot="avatar" aria-hidden="true"></span>
    <tp-bubble>I checked the release checklist.</tp-bubble>
  </tp-message>
  <tp-message aria-label="Sam Rivera">
    <tp-avatar slot="avatar" fallback="SR" alt="Sam Rivera"></tp-avatar>
    <tp-bubble>The remaining items are assigned to the team.</tp-bubble>
  </tp-message>
</tp-message-group>
```

An empty avatar slot preserves the column for earlier rows. Omitting the slot removes the column entirely. The default column follows the default Avatar size; a custom avatar size can use the `message-avatar` part hook consistently across the group. Spacing within rows and groups belongs to the shared dictionary; application layout chooses distance between independent turns.

## Reference use cases

The Docs match the six compositions on the [shadcn Message reference](https://ui.shadcn.com/docs/components/base/message), using original conversation text and the library theme:

| Use case          | Public composition                                                                                 |
| ----------------- | -------------------------------------------------------------------------------------------------- |
| Conversation      | Alternating Message rows, Avatar, BubbleGroup, delivery Footer, reaction summary and typing Marker |
| Avatar            | Start/end identities and one avatar beside multiple bubbles                                        |
| Group             | MessageGroup with an empty avatar placeholder before the final sender avatar                       |
| Header and Footer | Optional sender Header and delivery/read metadata Footer                                           |
| Actions           | Named copy Button, feedback Toggles and retry Button in Footer                                     |
| Attachment        | Image Attachment before a Bubble; reply Bubble before a downloadable file Attachment               |

Every example includes the complete setup in its copyable source. The actions example writes to the clipboard when permitted, toggles local feedback, and simulates a successful retry locally. The attachment example downloads a real generated Markdown checklist; replacing it with a server URL is application work. Message owns none of these operations. Cleanup removes listeners and revokes generated download URLs.

## Accessibility and state

Rows are presentational articles, not implicit buttons or live regions. Give senders visible identity or an accessible name (`aria-label`, avatar `alt`, or Header); alignment alone is insufficient. Use named `tp-button` and `tp-toggle` controls for actions. Feedback toggles expose pressed state; retry status remains application-owned. Use `tp-marker role="status"` for typing or action feedback, instead of making the whole transcript live.

`pending` and `failed` only supply fallback Footer status when no footer slot is authored. They do not send or retry anything. `align`, `pending` and `failed` reflect to attributes; `author` and `timestamp` accept their same-named attributes. Message has no component-specific events or methods. Part state supplies `align`; Root exposes `data-align`. All parts retain the inherited rendering, class/style, element-reference and theme hooks described in [Styling](./styling.md).
