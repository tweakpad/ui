# Accordion

Accordion groups related disclosures in a vertical stack. `<tp-accordion>` coordinates selection and presence across direct `<tp-accordion-item>` children. Each Item supplies a semantic Heading, native button Trigger, replaceable Indicator, and Content panel.

The normative contracts are UI Foundation §13.2 and UI Component Library §16.1. This page documents the Lit custom-element mapping. The Storybook Controls panel exposes Root properties and independently configurable Item examples.

## Basic use

```html
<tp-accordion value="account">
  <tp-accordion-item value="account">
    <span slot="label">Account settings</span>
    <p>Update your profile details.</p>
    <p>Review security preferences and recovery options.</p>
  </tp-accordion-item>
  <tp-accordion-item value="billing" indicator-position="leading">
    <span slot="label">Billing</span>
    <tp-icon slot="indicator" id="billing-indicator"></tp-icon>
    <p>Payment methods and invoices.</p>
  </tp-accordion-item>
  <tp-accordion-item value="enterprise" disabled>
    <span slot="label">Enterprise settings</span>
    <p>Available on the Enterprise plan.</p>
  </tp-accordion-item>
</tp-accordion>

<script type="module">
  import { plusIcon } from '@tweakpad/ui/icons/plus';
  document.querySelector('#billing-indicator').icon = plusIcon;
</script>
```

Use stable, unique item values. The `value` HTML attribute is a whitespace-separated list; in JavaScript, `accordion.value` is an ordered `string[]`. The component derives selected items in registration order. In non-collapsible single mode, it opens the first available item when none is selected.

Set `disabled` on one `<tp-accordion-item>` to prevent that Item from opening or closing without disabling its siblings. The Storybook **Disabled Item** example shows this alongside the separate **Disabled** example for the whole Accordion.

## Root properties

| Property           | Attribute            | Type                                            | Default     | Behavior                                                                                                 |
| ------------------ | -------------------- | ----------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------- |
| `selectionMode`    | `selection-mode`     | `'single' \| 'multiple'`                        | `'single'`  | Opens one item at a time or allows several.                                                              |
| `value`            | `value`              | `string[]`                                      | `[]`        | Current ordered list of open item values. The element updates it after an accepted interaction.          |
| `defaultValue`     | `default-value`      | `string[]`                                      | `[]`        | Initial selection when `value` is empty on first registration. Later changes do not reset the selection. |
| `collapsible`      | `collapsible`        | `boolean`                                       | `false`     | In single mode, permits the last open item to close. It has no effect in multiple mode.                  |
| `disabled`         | `disabled`           | `boolean`                                       | `false`     | Prevents activation of every item.                                                                       |
| `keepMounted`      | `keep-mounted`       | `boolean`                                       | `false`     | Ends a closed panel in the retained presence state after its exit transition.                            |
| `hiddenUntilFound` | `hidden-until-found` | `boolean`                                       | `false`     | Retains closed content with `hidden="until-found"` so browser find-in-page can reveal it.                |
| `motionPolicy`     | `motion-policy`      | `'inherit' \| 'normal' \| 'reduce'`            | `'inherit'` | Resolves motion for the Accordion subtree from this boundary, its ancestors, or the environment.          |
| `onValueChange`    | —                    | `(event: TpValueChangeEvent<string[]>) => void` | `undefined` | Callback after an accepted root value-change proposal. Property only; not an HTML attribute.             |

`orientation` is fixed to vertical for Accordion. In this custom-element API, `selectionMode="multiple"` corresponds to the Foundation's `multiple` behavior.

## Item properties and slots

| Property            | Attribute            | Type                                 | Default      | Behavior                                                                                     |
| ------------------- | -------------------- | ------------------------------------ | ------------ | -------------------------------------------------------------------------------------------- |
| `value`             | `value`              | `string`                             | `''`         | Stable selection identity. If empty, the Item's `id` is used, then a generated stable value. |
| `indicatorPosition` | `indicator-position` | `'leading' \| 'trailing'`            | `'trailing'` | Moves **only this Item's** decorative Indicator to the logical inline edge.                  |
| `headingLevel`      | `heading-level`      | `1`–`6`                              | `2`          | Semantic level of the Item's Heading. Set it to fit the surrounding document.                |
| `disabled`          | `disabled`           | `boolean`                            | `false`      | Prevents this Item from activating.                                                          |
| `onOpenChange`      | —                    | `(event: TpOpenChangeEvent) => void` | `undefined`  | Property-only callback after the Root accepts an Item open/close proposal.                   |

`keep-mounted` and `hidden-until-found` can be set on an Item to override the corresponding Root policy; the literal attribute value `"false"` disables an inherited policy. Repeating a `value` excludes the later Item and emits `tp-diagnostic`.

Use `slot="label"` for the Trigger's accessible name. Unslotted children go into ContentBody; put meaningful panel content there. The default chevron is rendered by `tp-icon`. `slot="indicator"` replaces it with consumer-owned content such as another `tp-icon`; an unlabeled `tp-icon` is decorative by default. The Indicator wrapper is non-interactive and non-shrinking. See the [Icon guide](icon.md) for supplying artwork and selective imports.

`indicatorPosition` is presentational. `leading` and `trailing` follow writing direction, so a leading indicator is on the right in RTL. The Item publishes `data-icon-edge` on its host and Indicator wrapper. Changing it does not alter selection, activation, focus, or the Trigger–Content accessibility relationship. The default icon is replaceable in this Lit mapping through the `indicator` slot; the Foundation describes the host-independent replacement capability through delegation.

The Foundation's Item is a generic public part, not necessarily this custom tag. A bare `<div>` directly inside this Lit Root is not registered as an Item. This implementation registers direct `<tp-accordion-item>` children; it does not yet implement arbitrary delegated Item hosts.

## Events and interaction

Click, Enter, and Space activate an Item's native button Trigger. Arrow, Home, and End do not change the open item. The Trigger stays in normal tab order and publishes `aria-expanded`, `aria-controls`, and the panel's `aria-labelledby` relationship.

An item dispatches a cancellable `tp-open-change` for an open/close proposal. The root dispatches a cancellable `tp-value-change` with `detail.value`, `detail.previousValue`, `detail.reason`, and `detail.sourceEvent`. Cancel either proposal with `preventDefault()` to leave the current value unchanged. After a transition reaches a stable state, the item dispatches `tp-open-change-complete` with `{ value, open }`. Duplicate values emit `tp-diagnostic`.

```js
const accordion = document.querySelector('tp-accordion');

accordion.addEventListener('tp-value-change', (event) => {
  console.log(event.detail.value);
});
```

## Styling and motion

The public parts are `accordion` on the Root, `accordion-item` on the Item host, and `accordion-heading`, `accordion-trigger`, `accordion-indicator`, `accordion-content`, and `accordion-content-body` inside the Item's shadow root. Style inner Item parts with `tp-accordion-item::part(...)`. The measured content panel publishes `--accordion-panel-height` and `--accordion-panel-width`; its presence state is available through `data-state`, `data-starting-style`, and `data-ending-style`. The ContentBody separates content from the animated panel extent.

The default `disclosure` role animates the outer Content panel's measured height. The `indicator` role rotates the Indicator. The `content` role targets ContentBody but deliberately has no default visual motion: a fade is one possible presentation, not part of Accordion behavior.

Each role is requested from its `<tp-accordion-item>`, so a listener on one Item can claim motion for that Item only. A listener on the Accordion or document can provide a broader policy through event bubbling. The first synchronous claim wins.

```js
item.addEventListener('tp-motion-request', (event) => {
  if (event.request.role !== 'content') return;
  event.respondWith({
    play(request) {
      const lines = [...request.owner.querySelectorAll('p')];
      const animations = lines.map((line, index) =>
        line.animate(
          request.phase === 'enter'
            ? [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }]
            : [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-4px)' }],
          { duration: 180, delay: index * 45, fill: 'both' },
        ),
      );
      const finished = Promise.all(animations.map((animation) => animation.finished)).then(() => {
        animations.forEach((animation) => animation.cancel());
      });
      return {
        finished,
        cancel: () => animations.forEach((animation) => animation.cancel()),
      };
    },
  });
});
```

The **External line-by-line motion** story uses this pattern with paragraphs of different lengths. Accordion continues to own selection, measurement, presence, and final hiding. See the [Motion guide](motion.md) for the full driver lifecycle, reduced-motion policy, and tween-library adapters.

Entry and exit follow the shared presence lifecycle. With reduced motion, starting and ending are still published, but finite motion completes at the next scheduling checkpoint. A normally closed panel reaches `absent`; `keepMounted` or `hiddenUntilFound` produces `retained`.

## Current implementation limits

- There is no distinct controlled-value mode: an accepted trigger interaction updates `value` even when the host set it externally.
- On item registration or rebuild in non-collapsible single mode, an empty or unknown `value` is replaced by the first available item instead of preserving the request with a diagnostic. A programmatic multi-value list in single mode presents only its first available item, but the property can retain extra values until rebuild.
- When the open item is removed or disabled, fallback selection uses the first enabled item rather than the nearest successor, then predecessor.
- An `absent` panel is hidden but remains in the DOM; presence-state unmounting is not yet implemented.
- The Foundation's Trigger `nativeAction` property and arbitrary delegated Item hosts are not exposed by this Lit mapping. Consumers can use the Item's `tp-open-change` event to observe or cancel change proposals.
