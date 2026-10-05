# Navigation menu

`tp-navigation-menu` combines real navigation links with optional content panels.
It preserves normal link activation, targets/modifiers and Tab order; command
menu roles and menu-item selection semantics do not apply.

```html
<script type="module">
  import '@tweakpad/ui/register';
  import '@tweakpad/ui/styles.css';
</script>
<tp-navigation-menu aria-label="Resources">
  <tp-navigation-menu-item value="learn">
    <tp-button slot="trigger" variant="ghost">Learn</tp-button>
    <div slot="content">
      <a href="/overview" active>Overview</a>
      <a href="/guides">Guides</a>
      <a href="/examples" close-on-click>Examples</a>
    </div>
  </tp-navigation-menu-item>
  <tp-navigation-menu-item value="tools">
    <tp-button slot="trigger" variant="ghost">Tools</tp-button>
    <div slot="content"><a href="/editor">Editor</a><a href="/inspector">Inspector</a></div>
  </tp-navigation-menu-item>
  <tp-navigation-menu-item><a href="/documentation">Documentation</a></tp-navigation-menu-item>
</tp-navigation-menu>
```

| Root property / attribute                            | Type                        | Default                       | Behavior                                                                                             |
| ---------------------------------------------------- | --------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| `value`                                              | string or undefined         | uncontrolled, effective empty | Sole controlled active Item identifier.                                                              |
| `defaultValue / default-value`                       | string or undefined         | undefined                     | Uncontrolled initial identifier.                                                                     |
| `onValueChange`                                      | string value event callback | none                          | Cancelable value proposal.                                                                           |
| `orientation`                                        | horizontal / vertical       | horizontal                    | List arrangement and optional arrow navigation.                                                      |
| `openDelay / open-delay`, `closeDelay / close-delay` | number                      | 50, 50                        | Hover intent timings.                                                                                |
| `showViewport / show-viewport`                       | boolean                     | true                          | Shared measured current/previous viewport; false keeps the same active content without the viewport. |
| `disabled`                                           | boolean                     | false                         | Suppress component activation without rewriting links.                                               |
| `aria-label`                                         | string                      | Navigation                    | Name of the semantic nav.                                                                            |
| `onOpenChangeComplete`                               | `(open: boolean) => void`   | none                          | Actual shared presence completion.                                                                   |
| `actions.unmount()`                                  | method                      | void                          | Close through the scalar owner and then release retained content.                                    |

Ownership is fixed before connection. The controlled callback synchronously
publishes `navigation.value = event.detail.value`; `tp-value-change` is the same
bubbling/cancelable event with previousValue, reason, sourceEvent and cancellation.
A later veto discards provisional callback publication. Unknown controlled values
render no active content; later duplicate Item values are diagnosed and excluded.

Navigation uses the [shared positioning, portal, Arrow, Backdrop, focus and
customization API](anchored-surfaces.md), with bottom/center, a three-theme-unit side offset, zero alignment offset and
absolute positioning. It remains nonmodal, and open is derived from value rather
than an independent Boolean ownership lane. Trigger focus does not copy Tooltip's
focus-open policy. Hover/press can open; ArrowDown enters an active horizontal
panel; the logical forward arrow enters a vertical panel (Right in LTR, Left in RTL).
Escape returns focus only when focus was in content. Native links continue
to use ordinary Tab navigation. Outside focus/press closes without a focus trap.

## Item, Trigger, Content and Link

| Binding                                           | Type / default                 | Behavior                                                                                          |
| ------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------- |
| `tp-navigation-menu-item.value`                   | string, generated              | Stable Item identity; assign meaningful values for controlled use.                                |
| Item `disabled`                                   | boolean, false                 | Exclude its Trigger from activation.                                                              |
| Item `keepMounted / keep-mounted`                 | boolean, false                 | Retain inactive Content hidden/inert after exit.                                                  |
| Item `showIndicator / show-indicator`             | boolean, true                  | Independently show the decorative Trigger indicator.                                              |
| Item `slot="trigger"`                             | real Button/native action host | Trigger belongs to this Item; disabled/native-action behavior comes from the actual action owner. |
| Item `slot="content"`                             | authored content               | Actual nodes are projected and restored, never cloned.                                            |
| Item `slot="indicator"`                           | decorative content             | Optional replacement inside the Indicator part. Use the actual Icon API.                          |
| Item default slot                                 | native links/content           | A direct link-only Item requires no popup.                                                        |
| Native link `active`                              | Boolean attribute, false       | Supplies aria-current=page while active, preserving authored semantics.                           |
| Native link `close-on-click`                      | Boolean attribute, false       | Explicitly request panel closure after an accepted native link activation.                        |
| Item `active`, `triggerElement`, `contentElement` | read-only state/references     | Current Item state and actual targets.                                                            |

Content from the prior value remains inert through its exit while the new content
enters. The common viewport measures current dimensions and tracks previous,
current, transitioning and activation direction; reversing reuses the original
nodes. `viewportState` is the current read-only snapshot and CSS uses
`--tp-popup-width`/`--tp-popup-height`. Geometry follows RTL/writing mode and owner
changes. Links do not become commands because they are inside a popup.

Triggers and direct links use the same box model, padding and minimum target height. Vertical Lists stretch their top-level controls to a shared width; popup links retain their authored layout, including grids. Orientation chooses the List arrangement independently of placement. For a vertical navigation list, use `placement="inline-end start"` and a positive `side-offset` to open beside the remaining destinations, as shown in the Vertical story. The default placement remains bottom/center with an 8px trigger gap and zero alignment offset. Set `side-offset="0"` for a flush popup or supply a custom offset.

Public parts: `navigation-menu`, `navigation-menu-list`, `navigation-menu-item`,
`navigation-menu-trigger`, `navigation-menu-content`, `navigation-menu-link`,
`navigation-menu-indicator`, `navigation-menu-viewport`,
`navigation-menu-positioner`. Root renders Root/List/Positioner/Viewport. Each
Item owns its Content/Indicator/Item and Link targets; configure those Item
partContracts on that Item. The flattened root Popup uses hidden contract key
`content`; it is distinct from the public per-Item Content. Root partPresentation
flows through the Item controller before terminal instance overrides. All nine
public parts support horizontal/vertical dictionary contributions.

The viewport measures each active panel at its intrinsic size, independently of the animated viewport. Its width and height variables describe the content box; padding and borders are added outside those dimensions. Repeated switching, opening, or resizing content does not progressively reduce panel width. Trigger and content associations forward through shadow hosts to the actual named semantic targets.

Hovering a top-level direct link closes the active panel without activating the link. Links inside an open panel keep it open on hover. Direct-link dismissal uses the normal cancelable value-change event; native link navigation and `closeOnClick` remain unchanged.
