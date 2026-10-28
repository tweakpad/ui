# Toolbar fixture

Served by the Vite dev server, driven only through Chrome DevTools MCP. Append `?package` to load
the built package (`npm run build` first). `window.toolbarFixture` exposes the controllers, their
registrations and the logs.

## Sections

- `#toolbar` (Document tools): Save, the History Button group (Undo, disabled Redo), the
  unregistered Page view Toggle group (single selection), the Ruler and disabled Grid Toggles
  registered as `button` items, a separator, the Find Input and the Help link.
  `toolbarFixture.actions()` counts Button and Toggle activations inside it.
- `#dialog-case`: Open review opens a Dialog whose Review tools host its own controller with
  Comment, the disabled Approve Button and the disabled Pin Toggle. Initial focus is Comment.
  `toolbarFixture.dialog.openLog` records each `tp-open-change` (`open`, `reason`, `cancelled`).
- `#press`: an editable paragraph and the Text marks controller, constructed with
  `preserveFocusOnPress: true`; Note opts out per item. `toolbarFixture.press.select()` focuses
  the paragraph and selects the words "slate water"; `press.activations()` counts presses per
  Button.
- `#contextual-case` (source mode only): an editable paragraph and a `ContextualToolbarController`
  over the Selection tools (Bold, the disabled Link, Note) in the top layer, anchored to the
  paragraph's selection. It shows while the selection in the paragraph is not collapsed and hides
  when it collapses, stays out of the Tab sequence, keeps focus in the paragraph on presses, and
  `Alt+F10` in the paragraph calls `focus()`; Escape, Tab and Shift+Tab return focus to the
  paragraph with its selection. `toolbarFixture.contextual` exposes `controller()`, `text`,
  `surface`, `presses()` (per Button), `log` (`show`, `hide`, `alt-f10:<result>`, `final-focus`)
  and `range()`.

## Logs

- `toolbarFixture.keyLog`: every `keydown` that reaches `document` in the bubble phase, with the
  innermost id on its path and `defaultPrevented`.
- `toolbarFixture.valueLog`: every `tp-value-change` that reaches `document`.
- `toolbarFixture.clearLogs()` empties the key, value and open logs.

## Steps

1. Press `Tab` from `#before` into the toolbar, then `ArrowRight` through every item, `Home`,
   `End` and `Tab` out; read the deep active element after each key.
2. On the disabled Grid Toggle press `Space` and `Enter`, then `click` it; its `aria-pressed` and
   `actions()` stay unchanged.
3. Open review, press `ArrowRight` to Approve, `Enter`, then `Escape`; read `keyLog` and
   `dialog.openLog`, whether the Dialog is open and where focus is. `Enter` is logged prevented
   and does nothing; `Escape` is logged unprevented, the Dialog closes with reason `escape-key`
   and focus returns to Open review. Repeat on the disabled Pin Toggle.
4. Call `press.select()`, `click` Highlight, then read the active element, the selection, the
   Button's `:focus-visible` match and `press.activations()`: focus and the selection stay in the
   paragraph, the Button activates once and does not match `:focus-visible`. Repeat with Strike.
   Repeat with Note, which opts out: focus moves to it. Then call `press.select()` and `click` the
   gap between Highlight and Strike: focus and the selection stay in the paragraph and no Button
   activates.
5. `Tab` into Text marks and press `Enter` on Highlight: it activates with focus on it. With
   keyboard focus on Highlight, `click` Strike: focus moves to Strike.
6. Reach Ruler with the arrow keys, then move it with `moveBefore()` into the Standalone
   regression section, before the Standalone input. Focus stays on Ruler and the toolbar's tab
   stop moves to Grid. Repeat with Continuous by moving the whole Page view group: focus stays on
   Continuous, the group has its own tab stop again and the toolbar's stop moves to Ruler. Moving
   with `insertBefore()` instead drops focus, and the toolbar repairs it to its new stop.
7. In the Contextual toolbar section, `click` the paragraph and press `Shift+ArrowRight`: the
   toolbar shows above the selection with focus still in the paragraph; more `Shift+ArrowRight`
   presses move it with the selection. `click` Bold: it activates once, focus and the selection
   stay in the paragraph and Bold does not match `:focus-visible`. Press `Alt+F10` (focus on
   Bold), `ArrowRight`, then `Escape`; repeat with `Tab` and `Shift+Tab` in place of `Escape`:
   each returns focus to the paragraph with the same selection. Collapsing the selection hides
   the toolbar and returns focus to the paragraph.
