# Collapsible

Collapsible is the library's standalone disclosure element and the disclosure primitive used by Accordion Item. `<tp-collapsible>` owns its Trigger–Content relationship, Indicator and icon placement, measured presence transition, motion-role requests, disabled handling, and cleanup. Accordion adds group selection by driving the `open` state of a Collapsible inside each Item; it does not reproduce those behaviors.

The normative contract is UI Foundation §13.3 and UI Component Library §16.4.

## Basic use

```html
<tp-collapsible open indicator-position="trailing">
  <span slot="trigger">Project details</span>
  <p>Created today and shared with three collaborators.</p>
</tp-collapsible>
```

The Trigger is a native button. Its `aria-expanded` and `aria-controls` values are synchronized with the Content region, which is labelled by the Trigger. Enter, Space, and pointer activation all use the button's native interaction behavior.

## Properties

| Property            | Attribute            | Type                                 | Default      | Behavior                                                                                  |
| ------------------- | -------------------- | ------------------------------------ | ------------ | ----------------------------------------------------------------------------------------- |
| `open`              | `open`               | `boolean`                            | `false`      | Current disclosure state. Accepted Trigger interactions update this property.             |
| `defaultOpen`       | `default-open`       | `boolean`                            | `false`      | Initial open state when the `open` attribute is absent. Later changes do not reset state. |
| `disabled`          | `disabled`           | `boolean`                            | `false`      | Prevents Trigger activation without changing the current open state.                      |
| `keepMounted`       | `keep-mounted`       | `boolean`                            | `false`      | Ends closed Content in the retained presence state.                                       |
| `hiddenUntilFound`  | `hidden-until-found` | `boolean`                            | `false`      | Retains closed Content with `hidden="until-found"` for browser search and reveal.         |
| `indicatorPosition` | `indicator-position` | `'leading' \| 'trailing'`           | `'trailing'` | Places this Collapsible's Indicator at a logical inline edge.                             |
| `headingLevel`      | `heading-level`      | `0`–`6`                              | `0`          | Gives the Trigger wrapper heading semantics; `0` omits them.                              |
| `motionPolicy`      | `motion-policy`      | `'inherit' \| 'normal' \| 'reduce'` | `'inherit'`  | Resolves motion policy for the Collapsible subtree.                                       |
| `onOpenChange`      | —                    | `(event: TpOpenChangeEvent) => void` | `undefined`  | Property-only callback after an open-change proposal is accepted.                         |

`hiddenUntilFound` implies retained presence even when `keepMounted` is false. A matching `beforematch` request proposes opening the disclosure before the browser reveals its Content.

`indicatorPosition` affects only presentation. `leading` and `trailing` follow writing direction, and the resolved edge is published as `data-icon-edge`. The default chevron is rendered by `tp-icon`; replace it per Collapsible through the `indicator` slot without changing activation or accessibility:

```html
<tp-collapsible indicator-position="leading">
  <span slot="trigger">Advanced options</span>
  <tp-icon id="advanced-indicator" slot="indicator"></tp-icon>
  <p>Additional settings.</p>
</tp-collapsible>

<script type="module">
  import { plusIcon } from '@tweakpad/ui/icons/plus';
  document.querySelector('#advanced-indicator').icon = plusIcon;
</script>
```

## Events

The component dispatches a cancellable `tp-open-change` before it changes `open`. Its detail includes `value`, `previousValue`, `reason`, and `sourceEvent`. Call `preventDefault()` to reject the proposal.

After presence reaches its stable open or closed state, `tp-open-change-complete` is dispatched with `{ open }`.

```js
const collapsible = document.querySelector('tp-collapsible');

collapsible.addEventListener('tp-open-change', (event) => {
  if (!canRevealDetails && event.detail.value) event.preventDefault();
});
```

## Styling

The public parts are `collapsible`, `collapsible-heading`, `collapsible-trigger`, `collapsible-indicator`, `collapsible-content`, and `collapsible-content-body`. Root, Trigger, Indicator, and Content publish the applicable `data-open`, `data-closed`, `data-disabled`, and `data-icon-edge` markers. Content also publishes `data-state`, `data-starting-style`, and `data-ending-style` from the shared presence lifecycle.

The measured panel exposes `--collapsible-panel-height` and `--collapsible-panel-width`. Put content padding on ContentBody, not Content, so padding is included in the measured animated extent.

```css
tp-collapsible::part(collapsible-trigger) {
  width: 100%;
  padding: var(--tp-space-3) var(--tp-space-4);
  border: 0;
  color: var(--tp-foreground);
  background: transparent;
  font: inherit;
  text-align: start;
}

tp-collapsible::part(collapsible-content-body) {
  padding: 0 var(--tp-space-4) var(--tp-space-4);
}
```

## Motion

Collapsible publishes three standard roles from its public host:

| Role         | Target      | Phases          | Completion   | Default presentation                                  |
| ------------ | ----------- | --------------- | ------------ | ----------------------------------------------------- |
| `disclosure` | Content     | `enter`, `exit` | blocking     | Transitions the measured block size.                  |
| `content`    | ContentBody | `enter`, `exit` | blocking     | None; available for consumer choreography.            |
| `indicator`  | Indicator   | `change`        | non-blocking | Rotates the default or consumer-supplied presentation. |

Claim a role synchronously from `tp-motion-request` to replace only that role's CSS presentation. Semantic state, measurement, presence, hiding, and cancellation remain owned by Collapsible. This allows application-specific choreography without requiring private selectors:

```js
collapsible.addEventListener('tp-motion-request', (event) => {
  if (event.request.role !== 'content') return;
  event.respondWith({
    play(request) {
      const lines = [...request.owner.querySelectorAll('p')];
      const animations = lines.map((line, index) =>
        line.animate(
          request.phase === 'enter'
            ? [{ opacity: 0 }, { opacity: 1 }]
            : [{ opacity: 1 }, { opacity: 0 }],
          { duration: 180, delay: index * 45, fill: 'both' },
        ),
      );
      return {
        finished: Promise.all(animations.map((animation) => animation.finished)),
        cancel: () => animations.forEach((animation) => animation.cancel()),
      };
    },
  });
});
```

See the **External line-by-line motion** story and the [Motion guide](motion.md) for lifecycle, reduced-motion, and driver details.

## Composition with Accordion

Each `<tp-accordion-item>` renders one internal `<tp-collapsible>`. The Item maps Collapsible's Heading, Trigger, Indicator, Content, and ContentBody through its Accordion part names and forwards the label, indicator, and content slots. The Accordion Root supplies derived `open`, `disabled`, retention policies, and stable `value`/`index` motion context. Collapsible remains the only disclosure and motion implementation, while Accordion remains the only selection owner.

Use `<tp-collapsible>` for one independent disclosure. Use `<tp-accordion>` with `<tp-accordion-item>` when several disclosures need coordinated single or multiple selection.
