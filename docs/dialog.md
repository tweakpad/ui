# Dialog

Use `tp-dialog` for an interrupting workflow. Alert Dialog reuses this implementation with mandatory modality, safe decision focus and no outside dismissal. Use Alert Dialog for consequential confirmation.

```ts
import '@tweakpad/ui/styles.css';
import '@tweakpad/ui/register';
```

```html
<tp-dialog label="Edit profile" description="Make changes to your profile.">
  <tp-button slot="trigger" variant="outline">Edit profile</tp-button>
  <p>Your profile is visible to other members.</p>
  <tp-button slot="close" variant="outline">Close editor</tp-button>
</tp-dialog>
```

The corner Close is a library Button with an accessible name. It is independent of the footer. `showCloseControl = false` hides it only while another named, enabled, visible close action is reachable inside this dialog. The `close` slot binds a footer action automatically. For other placement, call `dialog.registerCloseAction(button)` and retain the returned cleanup function. Ordinary `footer` content has no implicit close behavior. Empty footers are hidden. Footer paint and spacing follow Card's section treatment.

## Properties

| Property / attribute | Type / default | Behavior |
| --- | --- | --- |
| `open` / `open` | optional boolean, omitted | A value supplied before first render selects controlled mode; accept proposals by setting `open`. Getter returns committed state. |
| `defaultOpen` / `default-open` | boolean, false | Initial uncontrolled state; later changes do not reset it. |
| `modality` / `modality` | modal, non-modal, trap-focus-only; modal | Modal blocks background, traps focus and locks scrolling. Non-modal permits outside interaction. Trap-focus-only traps focus without blocking pointers or scrolling. Reflected. |
| `showCloseControl` / `show-close-control` | boolean, true | Corner control visibility, subject to the reachable alternative rule above. |
| `closeOnOutsideInteraction` / `close-on-outside-interaction` | boolean, true | Outside pointer dismissal; non-modal focus leaving also proposes close. |
| `closeOnEscape` / `close-on-escape` | boolean, true | Only topmost surface proposes Escape close. |
| `label` / `label` | string, empty | Visible title fallback; a nonempty title is required. |
| `description` / `description` | string, empty | Description fallback, with accessible association. Slot text takes precedence. |
| `initialFocus` / `initial-focus` | first, popup, descendant ID, element, resolver; first | First available control by default; explicit target must be available inside Content. Element/resolver is property-only. |
| `finalFocus` | trigger, previous, element, resolver, false; trigger | Focus restoration after close. An outside interaction in non-modal modes keeps the outside focus target. |
| `keepMounted` / `keep-mounted` | boolean, false | Retain closed content, inert and hidden from accessibility. |
| `forceRender` / `force-render` | boolean, false | Render a nested modal backdrop otherwise suppressed to avoid duplicate paint. |
| `handle` | DialogHandle, undefined | Connect detached triggers and imperative actions. |
| `triggerIdentifier` / `trigger-identifier` | optional string | Consumer-owned trigger association. |
| `defaultTriggerIdentifier` / `default-trigger-identifier` | optional string | Initial trigger association. |
| `onOpenChange` | callback(event), undefined | Cancelable state proposal. |
| `onOpenChangeComplete` | callback(open), undefined | Stable entry/exit completion. |

Boolean attributes mean true when present; use properties for false. State mode is fixed at first render. `setOpen()` changes uncontrolled state; a controlled owner must accept proposals. Rejection preserves the native modal, focus and scroll lock. Inherited `motionPolicy`, `partPresentation` and theme tokens apply without resetting state. Other inherited validation/orientation fields do not define Dialog behavior.

## Methods and events

- `setOpen(open, reason = 'programmatic', sourceEvent?)` proposes a change. Reasons: programmatic, imperative-action, trigger-press, close-action, escape-key, outside-press, focus-outside.
- `close()` / `actions.close()` proposes imperative closing.
- `unmount()` / `actions.unmount()` releases retained closed content; while open it requests closing first.
- `registerTrigger(element, { identifier?, payload?, nativeAction? })` returns cleanup and preserves authored handlers/attributes. Set nativeAction false for a non-native action. Trigger activation toggles Dialog.
- `registerCloseAction(element)` returns cleanup. Consumer click handlers run before the close proposal and may prevent default.
- `createDialogHandle()` returns a handle with `open(identifier?, payload?)`, `close()`, `isOpen` and `registerTrigger()`. The most recently attached live Root owns it; without a Root registered triggers are inert and imperative calls warn without opening.
- `payload`, `activeTriggerIdentifier`, `presenceState` expose committed association and lifecycle state.

`tp-open-change` bubbles, is composed and cancelable. Detail includes `value`, `previousValue`, `reason`, `sourceEvent`, optional `trigger`, `cancelled`, `allowPropagation`, and `preventUnmountOnClose()`. Prevent default to veto. A synchronous `preventUnmountOnClose()` retains content after exit until `unmount()`; cancellation does not leak retention. `tp-open-change-complete` has `{ open }` and runs once per completed transition; superseded/disconnected cycles do not complete. `tp-diagnostic` reports missing titles and invalid state mode. `tp-motion-request` exposes Foundation motion customization.

## Anatomy and presentation

Slots: trigger, title, description, default body, footer and close. The shared renderer accepts legacy actions/cancel/confirm footer content, but only Alert Dialog gives Cancel its decision behavior. Prefer `close` for a Dialog dismissal action.

Public parts and dictionary keys: dialog, dialog-trigger, dialog-portal, dialog-overlay, dialog-content, dialog-header, dialog-title, dialog-description, dialog-footer and dialog-close. Slotted trigger and synthesized Close register their actual native Button host for `partPresentation`. Consumer actions keep their own Button customization. No size or variant axis is added.

Root/Content/Overlay expose data-open, data-closed, data-starting-style and data-ending-style. Content exposes data-nested/data-nested-dialog-open; triggers expose data-popup-open. Presence states: absent, starting, open, ending, retained. The backdrop motion role targets Overlay with enter/exit phases and blocking completion. Drawer and Side Panel reuse this owner and retain their additional surface motion.

The native top layer escapes clipping while preserving slots and inherited themes. Dialog and Alert Dialog currently do not expose the complete Foundation custom portal-target, renderDelegate, hostProperties and elementReference channels. These existing parity gaps remain tracked separately; this shared-owner correction does not establish complete library conformance.
