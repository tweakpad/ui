Alert presents a persistent message in the document flow. It never opens a modal, traps focus, or dismisses itself. Use Alert Dialog for a decision that must interrupt the current task.

```ts
import { html } from 'lit';
import '@tweakpad/ui/register';
import '@tweakpad/ui/styles.css';
import { plusIcon } from '@tweakpad/ui/icons/plus';

html`<tp-alert severity="success" announcement="polite">
  <tp-icon slot="icon" .icon=${plusIcon} size="1rem"></tp-icon>
  <span slot="title">Changes saved <tp-badge variant="secondary">Synced</tp-badge></span>
  Your changes are safely stored. You can continue editing.
  <tp-button slot="actions" variant="outline" size="sm" href="/history">View history</tp-button>
</tp-alert>`;
```

### Properties and attributes

| Property / attribute | Type; default | Behavior |
| --- | --- | --- |
| `severity` | informational, success, warning, danger; informational | Reflected. Selects visual emphasis using semantic theme colors. It does not select the announcement policy. |
| `announcement` | off, polite, assertive; off | Reflected. Off has no live role; polite uses `status`; assertive uses `alert`. All modes set the corresponding `aria-live` value. |
| `title` | string; empty | Optional text fallback for the title slot. Attribute input is supported; property updates do not reflect. The story supplies “Update available”; the component default is empty. |
| `partPresentation` | object; `{}` | Inherited per-instance public part hooks. Property only. |

**Communicate severity in the words, not only the color or icon.** For example, use “Changes saved”, “Warning: storage almost full”, or “Could not save your changes”. Alert does not insert an English severity prefix into authored content. Supply the appropriate message in the application's language.

Keep announcement off for static page content. Use polite for routine updates to an existing live region and assertive only for urgent conditions. Changing severity does not move focus, open a popup, or change the live policy. Actual announcement timing depends on assistive technology; rendering an accessibility role is not a guarantee of spoken output.

### Slots and composition

| Slot | Content |
| --- | --- |
| Default | Optional description; text, paragraphs, lists, links and library components are supported. |
| `title` | Optional rich title, including emphasis, links or Badge. Assigned content replaces the `title` text fallback. Removing it restores the fallback. |
| `icon` | Optional mark, normally a decorative Icon. Do not rely on it alone to explain severity. |
| `actions` | Optional action controls. Use Button with a label describing the result; the application owns their behavior. |

Empty regions consume no spacing. Content wraps inside constrained containers; icon and actions occupy their intrinsic inline tracks. Native block content retains its own authored structure; direct description paragraphs have their outer margin reset. Apply typography to nested authored content as needed.

There are no Alert-specific methods, events, variant axes, motion roles, timers, close buttons, or `dismissible` property. Composed controls keep their own APIs. Removing an Alert after an action is application behavior. Inherited `TpElement` form-state flags do not propagate to action controls; configure each Button's disabled state directly. Native `hidden`, `dir` and `lang` work normally. The inherited orientation and motion-policy properties do not introduce an alternate Alert layout or animation.

### Parts and customization

Public parts and presentation keys are `alert`, `alert-title`, `alert-description`, `alert-mark`, and `alert-action`. Optional parts remain mounted but hidden when empty so dynamic slot updates retain child identity. Style them through `::part()`, `partPresentation`, or a scoped presentation dictionary.

The default presentation follows shadcn base/nova: card surface, rounded border, small type, medium title and muted informational description. Success, warning and danger use the corresponding semantic color with a foreground blend for readable text. The layout uses logical inline tracks instead of an absolute action with a fixed reserved width. Severity has no separate variant axis or dictionary keys.

Use existing tokens such as `--tp-card`, `--tp-card-foreground`, `--tp-muted-foreground`, `--tp-success`, `--tp-warning`, `--tp-destructive`, spacing and typography. For example:

```ts
alert.partPresentation = {
  'alert': { styleHook: { 'border-radius': 'var(--tp-radius-sm)' } },
  'alert-title': { styleHook: { 'font-weight': 'var(--tp-font-semibold)' } },
};
```

Replacing a dictionary preserves content, semantics and child focus. Include all five keys; missing contributions supply structure only, without falling back to another surface.
