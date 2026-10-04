# Side panel

`tp-side-panel` is an edge-attached Dialog. It uses the same state, focus, dismissal, portal, motion, parts and section presentation as Dialog. Drawer alone provides swipe and snap behavior.

```html
<tp-side-panel label="Workspace settings" description="Update your profile and preferences.">
  <tp-button slot="trigger" variant="outline">Open settings</tp-button>
  <tp-field label="Display name"><tp-input value="Alex Morgan"></tp-input></tp-field>
  <tp-button slot="close" variant="outline">Done</tp-button>
</tp-side-panel>
```

Import `@tweakpad/ui/styles.css` and `@tweakpad/ui/register` once in the application.

| Property / attribute                      | Type / default                                               | Behavior                                                               |
| ----------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `edge`                                    | block-start, block-end, inline-start, inline-end; inline-end | Logical viewport edge, resolved against direction and writing mode.    |
| `side`                                    | left, right, top, bottom; resolved edge                      | Compatibility input: normalized to a logical edge when connected.      |
| `showHeader` / `show-header`              | boolean, true                                                | Visible title/description region; hidden titles still name the dialog. |
| `showFooter` / `show-footer`              | boolean, true                                                | Visible authored footer content.                                       |
| `showCloseControl` / `show-close-control` | boolean, true                                                | Corner Close. A reachable, named alternative is required to hide it.   |

The full [Dialog API](./dialog.md) is inherited: controlled `open`, `defaultOpen`, `setOpen`, `close`, `unmount`, `actions`, `handle`, `registerTrigger`, `registerCloseAction`, payload and trigger identifiers, modality, initial/final focus, Escape/outside policy, retention, portal target, open-change cancellation and completion. Boolean false values require property binding. Changing layout or presentation does not reset open state.

Slots: trigger, title, description, default body, footer and close. The close slot binds dismissal; arbitrary footer content does not. Header and footer are independent, and the body scrolls between them. Use library Field, Input, Button and other components within these sections.

Public parts/dictionary keys: side-panel, side-panel-trigger, side-panel-portal, side-panel-overlay, side-panel-content, side-panel-header, side-panel-title, side-panel-description, side-panel-footer and side-panel-close. Generated parts support the shared `partContracts` and `partPresentation` channels; Content delegates must preserve a native dialog. The viewport-attached edge is flush; the exposed corners share `--tp-radius-lg` with Drawer and Navigation Panel. It slides its full edge extent with the shared surface timing and shares Dialog's palette, section padding, typography, footer and action spacing. There are no per-instance spacing attributes.

Root/Content/Overlay expose open, closed, starting and ending markers; Content exposes resolved `data-side`, nested and nested-dialog-open markers. Surface and backdrop support the inherited Foundation motion channel. Edge entry/exit uses the shared duration, spacing and easing tokens and respects reduced motion. Events and accessibility/focus behavior are exactly the Dialog contract.
