# Collapsible

Collapsible is the library's standalone disclosure element and the disclosure primitive used by Accordion Item. `<tp-collapsible>` owns its Trigger–Content relationship, positional presentation regions, default disclosure indicator, measured presence transition, motion-role requests, disabled handling, and cleanup. Accordion adds group selection by driving the `open` state of a Collapsible inside each Item; it does not reproduce those behaviors.

The normative contract is UI Foundation §13.3 and UI Component Library §16.4.

## Basic use

```html
<tp-collapsible open indicator-position="trailing" content-alignment="label">
  <span slot="leading" aria-hidden="true">01</span>
  <span slot="label">Project details</span>
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
| `indicatorPosition` | `indicator-position` | `'leading' \| 'trailing'`            | `'trailing'` | Selects the empty positional slot that renders the default disclosure indicator.          |
| `contentAlignment`  | `content-alignment`  | `'edge' \| 'label'`                  | `'edge'`     | Aligns ContentBody's logical inline start to the component edge or Label.                 |
| `headingLevel`      | `heading-level`      | `0`–`6`                              | `0`          | Gives the Trigger wrapper heading semantics; `0` omits them.                              |
| `motionPolicy`      | `motion-policy`      | `'inherit' \| 'normal' \| 'reduce'`  | `'inherit'`  | Resolves motion policy for the Collapsible subtree.                                       |
| `onOpenChange`      | —                    | `(event: TpOpenChangeEvent) => void` | `undefined`  | Property-only callback after an open-change proposal is accepted.                         |

`hiddenUntilFound` implies retained presence even when `keepMounted` is false. A matching `beforematch` request proposes opening the disclosure before the browser reveals its Content.

## Positional slots

The Trigger exposes content-agnostic `leading` and `trailing` slots around its `label`. Both positions accept zero or more consumer-supplied, non-interactive nodes in consumer order. They do not infer icon, indicator, badge, status, or motion behavior from their contents.

```html
<tp-collapsible indicator-position="trailing">
  <tp-icon slot="leading" id="settings-icon" aria-hidden="true"></tp-icon>
  <tp-badge slot="leading" variant="accent">New</tp-badge>
  <span slot="label">Advanced options</span>
  <p>Additional settings.</p>
</tp-collapsible>

<script type="module">
  import { plusIcon } from '@tweakpad/ui/icons/plus';
  document.querySelector('#settings-icon').icon = plusIcon;
</script>
```

`indicatorPosition` affects only presentation. `leading` and `trailing` follow writing direction, and the resolved selection is published as `data-indicator-position`. The selected position renders the built-in `tp-icon` chevron as fallback content only while that slot is empty. Assigning any content to the selected position suppresses the fallback; the assigned nodes retain their own semantics and never acquire disclosure-indicator state or motion automatically.

Positional content is inside the native button Trigger, so it must not contain links, buttons, inputs, or other interactive descendants. Mark decorative text and graphics with `aria-hidden="true"`; leave meaningful status text exposed when it should contribute to the Trigger's accessible name.

## Content alignment

`contentAlignment="edge"` starts ContentBody at the component's logical inline edge and applies the standard inline content inset. `contentAlignment="label"` starts it at the Label position and removes the redundant logical inline-start inset. Both modes therefore align content text with the default Trigger label. Label alignment follows writing direction and the actual Leading layout, so arbitrary icons, badges, text, or multiple nodes do not require a hard-coded indent.

The alignment applies to the ContentBody box. Consumer padding applied through that part overrides or extends the baseline token-based inset without changing the alignment contract.

The resolved value is available as `data-content-alignment`. Changing alignment does not change disclosure state, activation, focus, presence, motion, or accessibility relationships.

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

The public parts are `collapsible`, `collapsible-heading`, `collapsible-trigger`, `collapsible-leading`, `collapsible-label`, `collapsible-trailing`, `collapsible-content`, and `collapsible-content-body`. Root, Trigger, Leading, Label, Trailing, and Content publish the applicable `data-open`, `data-closed`, and `data-disabled` markers. The host publishes `data-indicator-position` and `data-content-alignment`; each positional part publishes its fixed `data-position`. Content also publishes `data-state`, `data-starting-style`, and `data-ending-style` from the shared presence lifecycle.

The measured panel exposes `--collapsible-panel-height` and `--collapsible-panel-width`. Its default Trigger, Label, positional content, focus ring, and ContentBody inset are token-based baseline presentation shared by standalone Collapsible and Accordion Item. Override those public parts when a product needs a different treatment. Put content padding on ContentBody, not Content, so padding is included in the measured animated extent.

```css
tp-collapsible::part(collapsible-content-body) {
  padding-block-end: var(--tp-space-6);
}
```

## Motion

Collapsible publishes three standard roles from its public host:

| Role         | Target                                      | Phases          | Completion   | Default presentation                       |
| ------------ | ------------------------------------------- | --------------- | ------------ | ------------------------------------------ |
| `disclosure` | Content                                     | `enter`, `exit` | blocking     | Transitions the measured block size.       |
| `content`    | ContentBody                                 | `enter`, `exit` | blocking     | None; available for consumer choreography. |
| `indicator`  | Default disclosure indicator, when rendered | `change`        | non-blocking | Rotates only the built-in fallback.        |

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

Each `<tp-accordion-item>` renders one internal `<tp-collapsible>`. The Item maps Collapsible's Heading, Trigger, Leading, Label, Trailing, Content, and ContentBody through its Accordion part names and forwards the `leading`, `label`, `trailing`, and content slots. The Accordion Root supplies derived `open`, `disabled`, retention and content-alignment policies, and stable `value`/`index` motion context. An Item may override `contentAlignment`; Collapsible remains the only disclosure, layout-alignment, and motion implementation, while Accordion remains the only selection owner.

Use `<tp-collapsible>` for one independent disclosure. Use `<tp-accordion>` with `<tp-accordion-item>` when several disclosures need coordinated single or multiple selection.

### Public rendering contracts

All eight parts accept the inherited `partContracts` interface, including content,
host properties, render delegates and element references. A delegate must retain
its supplied `bind` and `content`. The default Trigger is a native button; it may
also delegate to the existing `tp-button`. Collapsible resolves that component's
registered native action for disabled state, focus and Trigger–Panel relationships.
Consumer trigger event hooks run before disclosure handling and may call
`preventComponentHandling()`; the cancellable `tp-open-change` proposal remains
available independently.

Changing a delegate releases the former trigger's listeners and composed control
policy. Content measurement follows the current ContentBody. Disconnecting removes
trigger listeners and measurement observation; reconnecting restores current state.
Layout hooks may rearrange regions, but cannot make a normally hidden closed Panel
visible by overriding its display. `hidden-until-found` retains its native reveal
semantics.

Bubble's expandable-message Docs example demonstrates a root rendered as Bubble,
a link Button trigger, preview replacement and the existing measured panel. It
keeps all disclosure state in Collapsible and derives its label from that state.
