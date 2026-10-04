# Message

Message arranges sender identity, content, metadata and optional actions. It does not send messages or infer delivery state.

Use `align="start"` for other participants and `align="end"` for the current sender. Both the avatar and metadata follow the logical side, including RTL. Set the nested Bubble's alignment to the same value. A team chat uses bubbles on both sides; an assistant transcript can use a `ghost` Bubble for full-width assistant content. An activity history may use start-aligned rows throughout. Choose the composition deliberately.

| Property            | Default | Purpose                                                      |
| ------------------- | ------- | ------------------------------------------------------------ |
| `align`             | `start` | Logical sender side: `start` or `end`.                       |
| `author`            | empty   | Sender name in the default header.                           |
| `timestamp`         | empty   | Display timestamp in the default header.                     |
| `pending`, `failed` | false   | Compatibility display flags; the application supplies state. |

Slots: default (content), `avatar`, `header` (replaces default metadata), and `footer` (status, reactions or controls). A missing optional region has no layout footprint. Actions remain ordinary focusable controls.

Presentation parts: `message-root`, `message-avatar`, `message-content`, `message-header`, `message-footer`; previous `root`, `body`, `meta`, `content`, `author`, `timestamp` hooks remain. Shared dictionary recipes own spacing and typography. Wrap chronological rows in `tp-message-scroller-item` when using Message Scroller.
