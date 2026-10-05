# Badge

Badge is a compact label for status, classification, metadata or counts. Its default
host is a non-focusable `span`. Keep visible text meaningful: “Failed” communicates
more than a red badge alone.

```js
import '@tweakpad/ui/register';
import '@tweakpad/ui/styles.css';
```

```html
<tp-badge>New</tp-badge>
<tp-badge variant="secondary">12 unread</tp-badge>
<tp-badge variant="destructive">Failed</tp-badge>
<tp-badge variant="outline">Draft</tp-badge>
<tp-badge variant="ghost">Optional</tp-badge>
<tp-badge variant="link">Reference</tp-badge>
```

The exported class is `TpBadge` from `@tweakpad/ui`. Registering elements is a
separate side-effect import as shown above.

## Properties and attributes

| Property / attribute | Type / values                                                     | Default   | Behavior                                                                                                                                                           |
| -------------------- | ----------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `variant`            | `default`, `secondary`, `destructive`, `outline`, `ghost`, `link` | `default` | Reflected string; visual treatment only. Use a supported value.                                                                                                    |
| `interactive`        | boolean                                                           | `false`   | Reflected Boolean attribute. Declares an action or link supplied through `partContracts.badge`; does not create an action, link, click handler or tab stop itself. |
| `partContracts`      | `Record<string, ComponentPartContract>`                           | `{}`      | Property only; rendering, content, neutral properties, class/style hooks and references for `badge`.                                                               |
| `partPresentation`   | `PartPresentation`                                                | `{}`      | Property only; terminal instance presentation for `badge`.                                                                                                         |

Boolean attributes use presence: `interactive="false"` is still true. Remove the
attribute or assign `.interactive = false` in JavaScript/Lit. Property and attribute
updates rerender the existing instance. Assign a new object when updating a
contract or presentation map.

Inherited `TpElement` properties remain available: `disabled`, `readOnly`
(`readonly`), `invalid` and `required` are booleans defaulting to false;
`orientation` is `horizontal` (or `vertical`); `motionPolicy` (`motion-policy`) is
`inherit` (or `normal`, `reduce`). Badge is not a field or selection control: these
properties do not introduce validation, a value, selection, loading or form
participation. `disabled` supplies shared disabled appearance and contract state;
a delegated action must bind it to the native button's `disabled` property.
A disabled link must remove its `href` and tab stop and expose `aria-disabled`, or
use the existing Button component's link API when those behaviors are needed.
`direction` is an inherited read-only `ltr`/`rtl` getter; use native `dir` to set it.

There is no Badge-specific size, icon, loading, href, dismissal or selected API.
Use slotted content, composition, or the documented presentation hooks.

## Content, counts, icons and loading

The **default slot** accepts text and non-interactive inline content in consumer
order. There are no named slots. Add marks with the existing Icon and Spinner
components. A badge inside a Button or link must remain passive, giving the
composition one interactive target.

```js
import { html, render } from 'lit';
import { checkIcon } from '@tweakpad/ui/icons/check';
import '@tweakpad/ui/register';
import '@tweakpad/ui/styles.css';

render(
  html`
    <tp-badge variant="secondary">
      <tp-icon .icon=${checkIcon} size="var(--tp-icon-size-xs)"></tp-icon>
      Verified
    </tp-badge>
    <tp-badge variant="outline">
      <tp-spinner size="sm" label=""></tp-spinner>
      Processing
    </tp-badge>
  `,
  document.getElementById('app'),
);
```

An Icon without a label is decorative. Give icon-only information an accessible
name; prefer readable badge text. `label=""` keeps the Spinner decorative when
adjacent text already describes the operation. Badge itself does not announce
changes or control the spinner. For important asynchronous updates, put the
badge in an application-owned `role="status"` region. Do not repeatedly announce
animation frames or redundant spinner labels.

Use “12 unread” or a surrounding label for counts rather than an unexplained
number. Content follows `dir`, and long labels can wrap within the available
width. Prefer short labels; there is no automatic truncation or tooltip.

## Interactive composition

Set `interactive` and supply the semantic host with the shared render contract.
Keep `${bind}` on that host and render `${content}` to retain the Badge part,
classes, consumer hooks and slot. The `link` variant alone never navigates.

```js
import { html, render } from 'lit';
import '@tweakpad/ui/register';
import '@tweakpad/ui/styles.css';

const action = {
  badge: {
    renderDelegate: ({ state, bind, content }) =>
      html` <button type="button" ?disabled=${state.disabled} ${bind}>${content}</button>`,
  },
};
const link = {
  badge: {
    renderDelegate: ({ bind, content }) => html` <a href="/releases" ${bind}>${content}</a>`,
  },
};
render(
  html`
    <div style="display:flex;flex-wrap:wrap;gap:var(--tp-space-6);padding-block:var(--tp-space-3)">
      <tp-badge interactive .partContracts=${action} @click=${() => console.log('Apply filter')}
        >Apply filter</tp-badge
      >
      <tp-badge interactive variant="outline" .partContracts=${link}> Releases </tp-badge>
    </div>
  `,
  document.getElementById('app'),
);
```

Native buttons retain Enter/Space activation, anchors retain navigation and
modifier-click behavior, and the delegate owns their disabled policy. Use native
semantic hosts; an arbitrary focusable `div` is not an equivalent action.
Badge expands a small native interactive root's pointer target to
`--tp-target-size-min` without enlarging the visible pill. Reserve enough space
between controls and around containers so expanded targets do not overlap or clip.
Do not nest other interactive controls inside an interactive badge.

Badge emits **no custom events** and provides **no Badge-specific imperative
methods**. Native `click` bubbles through the shadow boundary; prevent its default
when the application needs to cancel navigation. Badge does not submit form data.
Use Button for full action, form, disabled-link or loading-action behavior.

## Public anatomy and customization

`badge` is the single public Root part: `tp-badge::part(badge)`. It is also the key
for `partContracts` and `partPresentation`. Presentation dictionary keys are
`badge`, `badge-variant-default`, `badge-variant-secondary`,
`badge-variant-destructive`, `badge-variant-outline`, `badge-variant-ghost` and
`badge-variant-link`. No additional Badge constituents require registration.

The `partContracts.badge` hooks are `renderDelegate`, `hostProperties`, `classHook`,
`styleHook`, `content` and `elementReference`. State supplied to hooks is the
read-only `{ variant, interactive, disabled }` snapshot. `elementReference`
receives the rendered root and `null` on removal/disconnection. Replacing `content`
also replaces the default slot, so supply the content you want displayed.

```js
badge.partPresentation = {
  badge: {
    styleHook: {
      'border-radius': 'var(--tp-radius-md)',
      'font-weight': 'var(--tp-font-medium)',
    },
  },
};
badge.partContracts = {
  badge: {
    hostProperties: { title: 'Available on the Pro plan' },
    classHook: ({ variant }) => `plan-${variant}`,
    elementReference: (element) => {
      /* actual root, or null */
    },
  },
};
```

Shared color, radius, typography, spacing and ring tokens follow root or scoped
themes; per-instance presentation is terminal. See [Styling](./styling.md) for
scoped theme tokens, dictionary replacement and the shared hook types. The six
variants use the library's shared semantic palette, including its solid
destructive treatment. Badge-specific paint is not embedded in demo CSS.

Reflected host attributes include `variant` and `interactive`; shared host markers
include `data-disabled`, `data-readonly`, `data-invalid` and `data-orientation`.
Native `:hover` and `:focus-visible` drive interactive paint. There is no checked,
selected or loading state. Passive badges have no hover/action behavior or tab
stop. Native attributes such as `id`, `title`, `dir` and `hidden` retain their usual
meaning; place semantic attributes for a delegated control on its actual root.
