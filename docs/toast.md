Toast presents transient notifications through one logical Provider and one manager. Creating a notification keeps focus on the current task. The manager owns identity, queue order, lifetime, promises and close/removal causes; every rendering and compatibility adapter uses that same owner.

```ts
import { createToastManager } from '@tweakpad/ui';
import '@tweakpad/ui/register';
import '@tweakpad/ui/styles.css';

const notifications = createToastManager();
const viewport = document.querySelector('tp-toast');
viewport.toastManager = notifications;

notifications.add({
  title: 'Event created',
  description: 'Sunday, December 3 at 9:00 AM',
  type: 'success',
});
```

```html
<tp-toast label="Notifications"></tp-toast>
```

The public element is the Portal/Viewport binding. Manager and Provider are elementless services; individual notification roots and their constituent parts are produced by the manager queue. Independent queues use independent `<tp-toast>` hosts and managers. Connect a manager to one Provider host at a time.

The manager service object may be retained across Provider lifetimes. Disconnecting its host destroys that queue lifetime, clears its notifications, and reports `provider-destroyed` through close/removal callbacks. Reconnecting the same host reuses the same service with a fresh queue. Pending operations from the discarded lifetime cannot recreate notifications. This follows the live Provider-owned queue contract; Base UI's external manager broadcasts commands to Provider-local stores, while this adapter exposes the required read-only queue through one shared owner.

| Host property / attribute              | Type                                                           | Default                | Contract                                                                                                                                           |
| -------------------------------------- | -------------------------------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `toastManager`                         | `ToastManager`, property only                                  | Host-owned manager     | External manager; replacement destroys the previous Provider lifetime.                                                                             |
| `manager`                              | Read-only `ToastManager`                                       | Current manager        | The same owner used by the host, imperative operations and legacy adapter.                                                                         |
| `provider`                             | Read-only `ToastProvider \| null`                              | Connected Provider     | Logical queue/environment binding.                                                                                                                 |
| `timeout`                              | Number, milliseconds                                           | `5000`                 | Provider default for future timed notifications; zero is persistent. Existing explicit notification timeouts stay authoritative.                   |
| `duration`                             | Number or `persistent`                                         | Provider timeout       | Alias of `timeout`; `persistent` maps to zero, without independent duration state.                                                                 |
| `limit`                                | Nonnegative integer                                            | `3`                    | Newest active notifications receive visible slots. Ending items do not consume slots.                                                              |
| `maximumVisible` / `maximum-visible`   | Nonnegative integer                                            | Provider limit         | Alias of `limit`; zero keeps the queue without visible notifications.                                                                              |
| `priority`                             | `polite` or `assertive`                                        | `polite`               | Legacy content adapter alias: maps to the ToastObject priority `low` or `high`. Manager entries specify their own priority.                        |
| `position`                             | Logical block position plus inline alignment                   | `block-end inline-end` | Six combinations: block-start/block-end with inline-start/center/inline-end.                                                                       |
| `swipeDirections` / `swipe-directions` | Array of `up`, `down`, `left`, `right`                         | `['down', 'right']`    | Physical allowed directions. Attribute accepts space/comma-separated values; empty property array disables swiping. A ToastObject may override it. |
| `container`                            | Connected `HTMLElement`, `ShadowRoot` or `null`, property only | Native top layer       | Optional explicit layer target for the viewport.                                                                                                   |
| `label`                                | Text                                                           | `Notifications`        | Accessible name of the landmark region.                                                                                                            |
| `dismissible`                          | Boolean                                                        | `true`                 | Shows the independent Close control. Notification `dismissible:false` hides its Close; keyboard dismissal remains independent.                     |
| `showIcon` / `show-icon`               | Boolean                                                        | `true`                 | Independently shows generated status icons/loading indicator.                                                                                      |
| `open`                                 | Boolean                                                        | `false`                | Compatibility adapter for one stable notification representing the host's default slot.                                                            |
| `title`                                | Text                                                           | Empty                  | Optional title of the compatibility notification.                                                                                                  |
| `partContracts`                        | Constituent contract map, property only                        | `{}`                   | Shared Foundation rendering/content/property/reference customization.                                                                              |
| `partPresentation`                     | Presentation hook map, property only                           | `{}`                   | Dictionary-terminal per-part class/style contributions.                                                                                            |
| `motionPolicy` / `motion-policy`       | `inherit`, `normal`, `reduce`                                  | `inherit`              | Shared explicit or host reduced-motion policy.                                                                                                     |

Boolean false defaults that are true must be set as properties, for example `.dismissible=${false}` in Lit. Removing a Boolean attribute cannot encode false for a true default.

`add(options)` and `close(identifier?, cause?)` on the host delegate directly to its manager. `setOpen(open)` changes the compatibility adapter. Standard DOM focus/blur and inherited Foundation diagnostics/presentation apply. Toast exposes no value/open change-request lane or cancelable lifecycle event.

| Manager / Provider API                                        | Contract                                                                                                                                                                      |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createToastManager(options?)` / `new ToastManager(options?)` | Creates the single queue owner; policy options include timeout and limit.                                                                                                     |
| `manager.toasts`                                              | Read-only, newest-first ordered immutable ToastObject snapshots.                                                                                                              |
| `manager.add(options)`                                        | Returns a stable identifier. Existing active identifier updates in place and restarts its timer. Existing ending identifier begins a new lifecycle and cancels stale removal. |
| `manager.update(identifier, partialOptions)`                  | Merges mutable fields and partial custom data. Missing identifier is a diagnostic/no-op. Ending entries remain closing.                                                       |
| `manager.close(identifier?, cause='programmatic')`            | Begins ending for one or all notifications. The cause is lifecycle metadata.                                                                                                  |
| `manager.promise(pending, states)`                            | Creates loading content, applies success/error settlement, and returns a promise preserving the original result or failure.                                                   |
| `manager.subscribe(listener, emitCurrent=true)`               | Observes coherent snapshots and returns an unsubscribe operation. Reentrant mutations publish after the current notification.                                                 |
| `manager.pause(reason='manual')`, `resume(reason='manual')`   | Composed lifetime pause leases; exact remaining time survives repeated cycles. Provider owns hover/focus/window leases.                                                       |
| `manager.configure(options)`                                  | Updates provider policy and every limited marker. Clock/diagnostic options support owner-environment integration and deterministic testing.                                   |
| `manager.destroy()`                                           | Cancels timers/pending settlement publication and removes every item with lifecycle callbacks.                                                                                |
| `new ToastProvider({toastManager?,timeout?,limit?})`          | Elementless policy binding to the same manager. `connect(document)` installs owner-window lifetime listeners; `configure(options)` and `destroy()` manage its lifetime.       |

`measure`, `completeEntrance`, `remove` and `reconnect` are rendering/lifecycle integration methods on the manager. `measure(identifier,height,element)` publishes derived measurement; `completeEntrance(identifier,lifecycleKey)` settles entry; `remove(identifier,lifecycleKey?)` guards stale completion and reports removal once; `reconnect()` starts a fresh Provider lifetime after destruction. Ordinary application dismissal uses `close`.

| ToastObject / add option                | Type and default                                                                                                                                                       |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `identifier`                            | Immutable text; generated by add when omitted.                                                                                                                         |
| `title`, `description`                  | Optional Lit renderable content: text, template, DOM node or arrays.                                                                                                   |
| `type`                                  | Optional text; success/info/warning/error choose decorative icons, loading chooses the actual Spinner component and disables auto-dismiss.                             |
| `timeout`                               | Optional milliseconds; Provider default when omitted; zero disables auto-dismiss.                                                                                      |
| `priority`                              | `low` (polite) or `high` (urgent), default low.                                                                                                                        |
| `onClose(cause)`, `onRemove(cause)`     | Optional callbacks. Close fires when ending begins; remove fires exactly once after actual removal. Both receive the same cause.                                       |
| `actionProperties`                      | Optional native host-property record with label/children/content, disabled, nativeAction (true), href, ariaLabel, onClick, closeOnAction (false) and elementReference. |
| `positionerProperties`                  | Optional connected host anchor and positioning profile.                                                                                                                |
| `data`                                  | Optional application record; updates merge it partially.                                                                                                               |
| `icon`                                  | Optional shared IconDefinition, overriding a generated type icon.                                                                                                      |
| `dismissible`                           | Optional per-notification Close visibility; false hides Close.                                                                                                         |
| `swipeDirections`                       | Optional per-notification allowed physical direction array.                                                                                                            |
| `transitionStatus`                      | Manager-owned starting/ending/undefined.                                                                                                                               |
| `updateKey`                             | Manager-owned nonnegative count incremented on update/upsert.                                                                                                          |
| `limited`, `height`, `elementReference` | Manager-owned capacity, natural-height measurement and semantic host reference.                                                                                        |
| `cause`, `lifecycleKey`                 | Manager-owned close metadata and asynchronous lifecycle identity.                                                                                                      |

Close/removal causes are exactly `timeout`, `close-action`, `action`, `swipe`, `programmatic`, `anchor-removed`, and `provider-destroyed`. They are independent from the Foundation ChangeReason vocabulary. Calling `close(id,'action')` or configuring `closeOnAction:true` preserves action dismissal as a distinct cause. An ordinary related action keeps its toast open. Application handlers run before optional action dismissal; preventing that action cancels its default dismissal.

`actionProperties` also accepts neutral host attributes such as `title`, `data-*`, `class` and `style`, property bindings (`.property`), and event handlers (`@event`). They use the same shared constituent binding as `partContracts`; behavior-owned semantics remain protected, and global class/style hooks remain terminal. `label` takes precedence over the `children` and `content` aliases. `elementReference` accepts a callback or `{ current }` object and clears on actual disconnect. Call `preventComponentHandling(event)` from an initiating handler to cancel Toast handling while preserving the native event's default behavior.

```ts
const id = notifications.add({
  title: 'Event created',
  description: 'You can undo this action.',
  actionProperties: {
    label: 'Undo',
    title: 'Undo this event',
    'data-command': 'undo',
    onClick() {
      notifications.close(id, 'action');
    },
  },
  onClose(cause) {
    console.log('Closing', cause);
  },
  onRemove(cause) {
    console.log('Removed', cause);
  },
});
```

Promise loading/success/error each accept text or update options. Success may derive content from the result; error may derive it from the failure. Loading is persistent even with an explicit timeout; settlement starts the settled timeout or Provider default. Settlement after close/removal or Provider destruction cannot recreate a notification.

```ts
const result = await notifications.promise(saveChanges(), {
  loading: 'Saving changes…',
  success: (value) => ({ title: 'Changes saved', description: value.summary }),
  error: (error) => ({ title: 'Could not save', description: String(error) }),
});
```

Anchored notifications use the shared floating engine through `positionerProperties`. `anchor` accepts a connected host Element or null, never a virtual anchor. Side defaults to top, alignment center, offsets zero, position method absolute, collision boundary clipping ancestors, collision and arrow padding five, sticky false, tracking enabled. `side` accepts physical and logical sides; `align` accepts start/center/end. `sideOffset`, `alignOffset`, `positionMethod`, `collisionBoundary`, `collisionPadding`, `collisionAvoidance`, `arrowPadding`, `sticky`, `disableAnchorTracking`, and independent `showArrow` configure the profile. Anchor removal begins close with `anchor-removed`. Use independent providers when anchored and stacked notification policies differ.

```ts
notifications.add({
  title: 'Copied',
  timeout: 1500,
  positionerProperties: {
    anchor: copyButton,
    side: 'top',
    showArrow: true,
  },
});
```

The default native layer retains scoped tokens and shadow public parts. An explicit external container relocates the viewport, carries structural styles and owner tokens, registers its presentation parts in the actual root, and restores/removes owned work on teardown. In that mode use `partPresentation`, the dictionary or constituent contracts for overrides; the originating host's `::part()` selector cannot reach an independently mounted external container.

| Public constituent / part          | Role and state                                                                                                  |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `toast`                            | Portal owner; current toasts, position, expanded and frontmostHeight.                                           |
| `toast-viewport`                   | Named landmark, keyboard access; expanded and frontmost height.                                                 |
| `toast-toast`                      | One nonmodal notification; type, transitionStatus, limited, index, height, offset, expanded and swipe geometry. |
| `toast-content`                    | Content layout; expanded and behind-frontmost.                                                                  |
| `toast-title`, `toast-description` | Same-tree name/description; type. Optional independently.                                                       |
| `toast-action`                     | Actual Button, type and notification state. Optional; does not implicitly close.                                |
| `toast-close`                      | Actual Button plus Icon; independently optional close action.                                                   |
| `toast-icon`                       | Shared Icon/Spinner decoration. Optional independently.                                                         |
| `positioner`, `arrow` contracts    | Transparent Foundation positioning constituents; no additional catalog presentation key.                        |

Every constituent supports shared `partContracts[name]`: renderDelegate, hostProperties, content, classHook, styleHook and elementReference. Dynamic hooks receive the same committed state as the markers. A renderDelegate must put the supplied `bind` directive on its semantic host; this preserves behavior-owned attributes, event handlers and reference cleanup. Interactive custom content must still compose the existing Button/Icon/etc. library components.

```ts
viewport.partContracts = {
  'toast-title': {
    classHook: ({ type }) => (type === 'error' ? 'urgent-title' : ''),
    elementReference: (element) => {
      /* current host or null on actual replacement */
    },
  },
};
```

Consumer constituent event handlers precede component handling. Use the shared `preventComponentHandling(event)` channel to suppress component processing; native `preventDefault()` remains the browser default channel. Behavior-owned role/ARIA/state/native values stay protected. Changing presentation or contracts keeps the manager identity and committed queue state.

State hooks include `data-expanded`, `data-limited`, `data-type`, `data-swiping`, `data-swipe-direction`, `data-starting-style`, `data-ending-style` on notifications, and `data-behind`/expanded on content. Geometry uses `--tp-toast-frontmost-height`, `--tp-toast-height`, `--tp-toast-index`, `--tp-toast-offset-y`, `--tp-toast-swipe-movement-x/y`. Shared gesture outputs are `--tp-swipe-movement-x/y`, `--tp-swipe-progress`, `--tp-swipe-strength`; release values remain until rest/removal. Anchored constituents publish the shared floating side/alignment, anchor-hidden and available/anchor-size/transform-origin outputs.

The default presentation follows shadcn Base Toast with the Nova rounded surface, shared popover color pair/border/shadow, small title/body typography, and actual outline/ghost Buttons. Appearance remains in the presentation dictionary. Scoped semantic tokens, dictionary replacement, `partPresentation` and public parts are supported. `toast.presence` is a blocking presence motion role with enter/exit phases; context includes identifier, type and cause. Requests originate at the individual semantic Toast host and bubble through the Portal. Drivers customize presentation while the shared PresenceController detects real completion and cancels reversals/teardown.

F6 reaches the notification landmark without creating a focus trap. Tab traverses active notification roots and related controls; leaving the region returns to the previous task when entered through the shortcut. Creation never steals focus. Focus, pointer interaction and owner-window blur pause auto-dismiss; resuming preserves exact remaining duration. A limited or ending toast is inert. Low and high announcements use separate polite/urgent channels, and unchanged text is deduplicated. Accessibility-tree and automated inspection cannot establish a spoken screen-reader experience.

The compatibility example uses the same manager and a stable identity:

```html
<tp-toast open duration="persistent" title="Changes saved"> Your work is stored. </tp-toast>
```

Provider destruction cleans timers, subscriptions, measurements, gesture capture, positioning, announcements, motion and portal work. It calls onRemove once even if a notification is removed before ending completes. Reconnection starts a new logical Provider lifetime; discarded pending operations cannot recreate old notifications.
