# Alert dialog

Use `tp-alert-dialog` for a consequential decision that needs explicit acknowledgement or cancellation. It always traps focus and blocks background interaction: the whole document by default, or only one container with `modality="container"`. Outside presses never dismiss or confirm it. Use Dialog for general workflows. Alert Dialog extends the shared Dialog owner for state, native surface, focus, triggers, handles, nesting and presence; only its decision policy and public part names differ.

```ts
import '@tweakpad/ui/styles.css';
import '@tweakpad/ui/register';
```

```html
<tp-alert-dialog
  label="Delete project?"
  description="This permanently deletes the project and its files."
>
  <tp-button slot="trigger" variant="outline">Delete project</tp-button>
  <tp-button slot="cancel" variant="outline">Cancel</tp-button>
  <tp-button slot="confirm" variant="destructive">Delete project</tp-button>
</tp-alert-dialog>
```

Cancel proposes closing automatically. Confirm supplies appearance and identity; the consumer owns its effect. Attach a click handler that performs the operation and then calls `dialog.setOpen(false, 'close-action', event)`. For asynchronous work, explicitly disable the appropriate Buttons, render a library Spinner if needed, keep the dialog open until success, and display any error in the content. Merely clicking Confirm never deletes anything.

## State and properties

| Property / attribute                                            | Type and default                                                            | Behavior                                                                                                                                                                                                                                                                                                                                            |
| --------------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `open` / `open`                                                 | Optional boolean; omitted                                                   | Supplying a value before first render selects controlled mode. Proposals do not change the committed state until the owner supplies the value. The getter reports committed state.                                                                                                                                                                  |
| `defaultOpen` / `default-open`                                  | boolean, false                                                              | Initial state in uncontrolled mode. Later changes do not reset state. Do not combine with controlled open.                                                                                                                                                                                                                                          |
| `label` / `label`                                               | string, empty                                                               | Visible Title fallback. Supply a nonempty label or title slot.                                                                                                                                                                                                                                                                                      |
| `description` / `description`                                   | string, empty                                                               | Description fallback. Slot-only descriptions work and update their accessible relationship.                                                                                                                                                                                                                                                         |
| `modality` / `modality`                                         | `modal` (default) or `container`                                            | `modal` isolates the whole document. `container` isolates only `container`: the dialog renders inside it, its other content is inert, focus is trapped, page scroll is not locked and the rest of the page stays interactive. Other values normalize to `modal` with a diagnostic. See [Dialog container modality](./dialog.md#container-modality). |
| `portal`, `container`, `portalIdentifier` / `portal-identifier` | inherited from Dialog                                                       | Portal destination. `container` is also the boundary for container modality. Property-only except `portal-identifier`.                                                                                                                                                                                                                              |
| `initialFocus` / `initial-focus`                                | `cancel` (default), `confirm`, descendant ID, `popup`, element, or resolver | Focuses the chosen available descendant, falling back to the first available control or Content. Element/resolver values are property-only. Prefer Cancel for destructive actions.                                                                                                                                                                  |
| `finalFocus`                                                    | `trigger` (default), `previous`, element, resolver, or false                | Restoration after deactivation, with connected previous-focus and logical-parent fallback. Property-only.                                                                                                                                                                                                                                           |
| `closeOnEscape` / `close-on-escape`                             | boolean, true                                                               | Allows only the topmost surface to propose closing. Set the property to false to disable; a Boolean attribute's presence means true.                                                                                                                                                                                                                |
| `keepMounted` / `keep-mounted`                                  | boolean, false                                                              | Retains inactive content after exit, hidden from focus and accessibility.                                                                                                                                                                                                                                                                           |
| `forceRender` / `force-render`                                  | boolean, false                                                              | Shows a nested Overlay instead of suppressing its duplicate backdrop.                                                                                                                                                                                                                                                                               |
| `handle`                                                        | `AlertDialogHandle`, undefined                                              | Connects detached triggers and imperative opening. Property-only.                                                                                                                                                                                                                                                                                   |
| `triggerIdentifier` / `trigger-identifier`                      | optional string                                                             | Consumer-owned trigger association.                                                                                                                                                                                                                                                                                                                 |
| `defaultTriggerIdentifier` / `default-trigger-identifier`       | optional string                                                             | Initial associated trigger for a default-open dialog.                                                                                                                                                                                                                                                                                               |
| `onOpenChange`                                                  | `(event: TpSurfaceOpenChangeEvent) => void`                                 | Latest callback receives the cancelable proposal.                                                                                                                                                                                                                                                                                                   |
| `onOpenChangeComplete`                                          | `(open: boolean) => void`                                                   | Runs once on stable entry/exit, after rendered motion completes. Superseded and disconnected cycles do not complete.                                                                                                                                                                                                                                |

State mode is fixed at first render. Use `setOpen()` for programmatic changes in uncontrolled mode. In controlled mode, accept `tp-open-change` by assigning `dialog.open = event.detail.value`. A rejected proposal leaves semantics and markers unchanged. `modality` accepts only `modal` and `container`; `closeOnOutsideInteraction` is fixed to false.

The inherited `motionPolicy` (`motion-policy`: inherit, normal, reduce) and `partPresentation` customize motion and public parts. Inherited validation/orientation fields do not define Alert Dialog behavior; disable individual actions through their Button API.

## Methods, handles, and events

- `setOpen(open, reason = 'programmatic', sourceEvent?)`: cancellable proposal. Accepted reasons: programmatic, imperative-action, trigger-press, close-action, escape-key, focus-outside, outside-press. Outside-press and focus-outside are consumed without closing.
- `close()` / `actions.close()`: close with imperative-action.
- `unmount()` / `actions.unmount()`: release retained content; while open, request accessible closing first.
- `registerTrigger(element, { identifier?, payload?, nativeAction? })`: associate a detached action without replacing its handlers or authored part tokens; returns cleanup. A non-native action explicitly sets nativeAction to false. Library Button and native button use their own activation behavior.
- `createAlertDialogHandle()`: exported factory. The handle exposes `open(identifier?, payload?)`, `close()`, `isOpen`, and `registerTrigger()`. The last attached live Root is active; detaching it restores the previous Root. Calls without a Root are safe no-ops with a diagnostic.
- `payload`, `activeTriggerIdentifier`, `presenceState`: read-only committed association/lifecycle observations.

`tp-open-change` bubbles, is composed and cancelable. Detail includes `value`, `previousValue`, `reason`, `sourceEvent`, optional `trigger`, `cancelled`, `allowPropagation`, and `preventUnmountOnClose()`. Call `event.preventDefault()` to veto. For externally animated exit, call `event.detail.preventUnmountOnClose()` synchronously, then `dialog.unmount()` after your animation. A canceled close does not retain the next close.

`tp-open-change-complete` bubbles and is composed; detail is `{ open }`. `tp-diagnostic` identifies invalid state mode, missing required title/action, an unusable container for container modality (`alert-dialog-modality-container`) and unsupported modality values (`alert-dialog-modality-unsupported`). `tp-motion-request` is the Foundation motion customization channel.

## Content, parts, and presentation

Slots: `trigger` (one action), `title`, `description`, `media`, default body content, `cancel`, `confirm`, and `actions`. The legacy `footer` slot also flows into Actions; it adds no implicit close behavior. Use native text/structure for content and existing library components for controls, icons and status marks. Cancel and Confirm should remain clearly labelled even when their appearance is symmetric.

Actions use the same full-width section background, top border and padding treatment as Card footer. Alert Dialog has no generic corner Close: its named Cancel and Confirm actions communicate the decision.

Public parts: `alert-dialog`, `alert-dialog-trigger`, `alert-dialog-portal`, `alert-dialog-overlay`, `alert-dialog-content`, `alert-dialog-header`, `alert-dialog-media`, `alert-dialog-title`, `alert-dialog-description`, `alert-dialog-actions`, `alert-dialog-confirm`, and `alert-dialog-cancel`. Each has the same presentation dictionary key; there are no variant axes. `partPresentation` applies to these names, including registered native action hosts inside Button shadow roots. Token overrides, scoped theme modes and dictionary replacement preserve state and focus.

Root/Content/Overlay publish open/closed and starting/ending markers (`data-open`, `data-closed`, `data-starting-style`, `data-ending-style`). Content additionally publishes `data-nested` and `data-nested-dialog-open`; triggers publish `data-popup-open`. `presenceState` is absent, starting, open, ending or retained.

The `backdrop` motion role targets Overlay, supports enter/exit, and participates in Presence completion. It has no extra context fields. Claimed motion replaces that role's default opacity transition; it does not take ownership of focus, state or mounting.

The current Lit binding uses a native dialog in the browser top layer to preserve slot ownership and inherited tokens while escaping clipping and transformed ancestors. The inherited Dialog portal properties move it to another destination; with container modality it renders in place inside the container. Generic renderDelegate/hostProperties/elementReference channels are not yet exposed by this binding; slotted action association preserves the supplied control and its native semantics. These remain parity gaps against the complete Foundation surface contract.

Default motion runs on opening only. Accepted closing removes the surface and
backdrop immediately, without waiting for an exit transition. A consumer may
explicitly claim the backdrop exit through `tp-motion-request` to provide its
own animation and completion. The portal wrapper contributes no layout box
beside the trigger.
