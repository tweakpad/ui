# Menubar

The base example includes icons, KeyHint shortcuts, grouped commands, a Share
submenu, disabled commands, checkboxes, and radio choices. Menubar reuses Menu's
surface inset, separator rhythm, and item radius; spacing comes from the theme.
Shortcut hints are labels and do not install keyboard shortcuts.

`tp-menubar` coordinates real Menu children using one active-menu value. It is an
application command bar, not a site-navigation container.

| Root property / attribute      | Type                        | Default                       | Behavior                                                           |
| ------------------------------ | --------------------------- | ----------------------------- | ------------------------------------------------------------------ |
| `value`                        | string or undefined         | uncontrolled, effective empty | Controlled active child Menu identifier; empty closes all.         |
| `defaultValue / default-value` | string or undefined         | undefined                     | Uncontrolled initial active identifier.                            |
| `onValueChange`                | string value event callback | none                          | Cancelable active-menu proposal.                                   |
| `orientation`                  | horizontal / vertical       | horizontal                    | Bar keyboard direction, including RTL.                             |
| `loopFocus / loop-focus`       | boolean                     | true                          | Wrap enabled Trigger navigation.                                   |
| `modal`                        | boolean                     | true                          | Effective modality inherited by participating child Menu surfaces. |
| `disabled`                     | boolean                     | false                         | Disable the bar without overwriting authored child state.          |
| `aria-label`                   | string                      | Application menu              | Accessible name of the actual menubar.                             |

Each child Menu uses its nonempty `value`, otherwise its generated/stable `id`.
Later duplicate identifiers are diagnosed and excluded. Configure the bar's
controlled or uncontrolled mode before connection; do not also control a child's
open state. The bar owns the scalar transaction: transfer stages outgoing close,
incoming open, and the bar value proposal before publication. A veto in any lane
leaves the previous menu active. Committed getters never expose two active menus
or an intermediate empty value during transfer. A controlled owner publishes the
accepted value synchronously and may inspect final committed state in a microtask.

`tp-value-change` bubbles with value, previousValue, reason, sourceEvent and
cancelled. `onValueChange` receives the same event first; preventDefault or
`detail.cancelled = true` vetoes. Participating children keep their Menu open callbacks
and completion/presence behavior as coordinated views of the bar. Unknown
controlled values open no child; removal of an uncontrolled active child clears
selection. Nested bars and submenus retain their nearest owner.

One enabled Trigger is tabbable. Directional arrows/Home/End move among triggers;
opening a menu enables deliberate hover transfer. Items, submenus, checks, radios,
Escape and native form/link behavior are the [actual Menu APIs](menu.md).
Configure each child's placement/Arrow/Backdrop/portal through the
[shared anchored API](anchored-surfaces.md). The Root default slot contains Menu
children; it does not create parallel command Items.

Public parts: `menubar`, `menubar-menu`, `menubar-trigger`, `menubar-content`,
`menubar-item`, `menubar-group`, `menubar-sub-trigger`, `menubar-sub-content`,
`menubar-separator`, `menubar-shortcut`. Root partPresentation composes into the
actual child controller; that child's terminal hooks still win. Use child
partContracts for child render delegates and references. The Root's `menubar`
contract controls the semantic bar itself. Replacing a child target updates
registration rather than retaining a detached styling target.

Popup menus derive their default anchor separation from three theme spacing units. Set `side-offset="0"` on the Menu (or participating Menu inside Menubar) for a flush popup, or supply a custom offset through the existing positioning API.

Hovering a closed Menubar does not open it. After opening one menu, hovering another enabled top-level trigger switches the open menu. All sibling triggers remain interactive in modal mode. Clicking outside dismisses the menus; hovering alone then stays inactive until another menu is opened.
