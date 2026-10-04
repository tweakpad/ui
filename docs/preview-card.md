# Preview Card

`tp-preview-card` adds a supplementary preview to a link or other subject. Hover or keyboard focus opens it without activating the trigger. Use Popover when the content contains actions needed to finish a task.

Preview Card uses the same hover-intent, safe-corridor, positioning, portal, presence and event owners as the other anchored controls. It never traps focus or makes outside content inert. Its optional backdrop is decorative and does not intercept input. Trigger activation keeps its normal link or button action.

The [shared anchored surface API](anchored-surfaces.md) documents all inherited properties and methods: controlled/default open state and cancellation, completion events, trigger handles/identifiers/payloads, positioning and collision options, portal/container, Arrow, Viewport, retention and public part contracts.

| Property / attribute                                | Type                                     | Default             | Meaning                                                                                                       |
| --------------------------------------------------- | ---------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------- |
| `openDelay` / `open-delay`                          | number, milliseconds                     | 600                 | Sustained hover or keyboard focus delay when the provider supplies none. Per-trigger options can override it. |
| `closeDelay` / `close-delay`                        | number, milliseconds                     | 300                 | Time after leaving both trigger and popup, with safe-corridor travel preserved.                               |
| `delay`                                             | number                                   | same as `openDelay` | Compatibility alias.                                                                                          |
| `provider`                                          | `DelayGroup`                             | private group       | Shared delay and recent-preview coordination.                                                                 |
| `openOnHover` / `open-on-hover`                     | boolean                                  | true                | Enable hover opening; keyboard focus remains supported.                                                       |
| `disableHoverablePopup` / `disable-hoverable-popup` | boolean                                  | false               | Disable pointer entry into supplementary content.                                                             |
| `closeOnClick` / `close-on-click`                   | boolean                                  | false               | Optional dismissal following trigger activation; never consumes the trigger's action.                         |
| `trackCursorAxis` / `track-cursor-axis`             | `none`, `horizontal`, `vertical`, `both` | `none`              | Optional cursor anchoring; both axes disable popup pointer entry.                                             |
| `placement`                                         | logical/physical side and alignment      | `block-end center`  | Preferred placement, subject to shared collision handling.                                                    |
| `initialFocus`                                      | shared focus target                      | `none`              | Normally leave focus on the subject; explicit policies may move it.                                           |
| `finalFocus`                                        | shared focus target                      | `trigger`           | Applied only when an explicit opening policy moved focus.                                                     |

`modal` is inherited for compatibility but cannot make a Preview Card modal. A disabled preview leaves its subject's normal action available. `showBackdrop` cannot block outside interaction. Default `showArrow` is false; arrow geometry and surface separation derive from shared theme spacing.

The `trigger` slot accepts real Button/link/native subjects. The default slot supplies preview content; an optional `anchor` separates geometry from the trigger. Public parts are `preview-card`, `preview-card-trigger`, `preview-card-content`, `preview-card-positioner`, and `preview-card-portal`; flattened Arrow/Backdrop/Viewport use the shared contracts. Content has group semantics and contributes an accessible description to the active subject without replacing its name or adding menu/dialog expanded semantics.

Multiple triggers can use `registerTrigger` or `SurfaceHandle` with identifiers and payloads. Their optional `openDelay`/`closeDelay` override the corresponding group delay. `content(payload)` and `showViewport` render a shared preview as its subject changes. Removing the active trigger closes the preview and releases its timers, description association and positioning observation.

Keep preview text nonessential. Content may be selected or scrolled; optional links must remain keyboard reachable through the shared preserved tab order. Escape dismisses without activating the subject. Default width, padding, type and radius use theme variables, and dictionary/`partPresentation` overrides preserve state and focus.
