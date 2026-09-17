# Accordion

Accordion groups related disclosures in a vertical stack. `<tp-accordion>` coordinates selection and presence across direct `<tp-accordion-item>` children. Each Item supplies a semantic Heading, native button Trigger with content-agnostic positional regions, and Content panel.

The normative contracts are UI Foundation §13.2 and UI Component Library §16.1. This page documents the Lit custom-element mapping. The Storybook Controls panel exposes Root properties and independently configurable Item examples.

Each Item renders one internal `<tp-collapsible>`. Collapsible owns the Trigger–Content association, Heading wrapper, Leading and Trailing regions, default disclosure indicator, measured presence lifecycle, motion roles, and cleanup. Accordion remains the single owner of group selection and only drives each internal Collapsible's derived state and composition context.

## Basic use

```html
<tp-accordion variant="outline" content-alignment="label" value="account">
  <tp-accordion-item value="account">
    <span slot="leading" aria-hidden="true">01</span>
    <span slot="label">Account settings</span>
    <p>Update your profile details.</p>
    <p>Review security preferences and recovery options.</p>
  </tp-accordion-item>
  <tp-accordion-item value="billing" indicator-position="leading">
    <span slot="label">Billing</span>
    <span slot="trailing" class="status-badge">Current plan</span>
    <p>Payment methods and invoices.</p>
  </tp-accordion-item>
  <tp-accordion-item value="enterprise" disabled>
    <span slot="label">Enterprise settings</span>
    <p>Available on the Enterprise plan.</p>
  </tp-accordion-item>
</tp-accordion>
```

Use stable, unique item values. The `value` HTML attribute is a whitespace-separated list; in JavaScript, `accordion.value` is an ordered `string[]`. The component derives selected items in registration order. In non-collapsible single mode, it opens the first available item when none is selected.

Set `disabled` on one `<tp-accordion-item>` to prevent that Item from opening or closing without disabling its siblings. The Storybook **Disabled Item** example shows this alongside the separate **Disabled** example for the whole Accordion.

## Root properties

| Property           | Attribute            | Type                                            | Default     | Behavior                                                                                                 |
| ------------------ | -------------------- | ----------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------- |
| `variant`          | `variant`            | `'plain' \| 'line' \| 'outline' \| 'separated'` | `'plain'`   | Selects a predefined visual recipe without changing behavior or structure.                               |
| `selectionMode`    | `selection-mode`     | `'single' \| 'multiple'`                        | `'single'`  | Opens one item at a time or allows several.                                                              |
| `value`            | `value`              | `string[]`                                      | `[]`        | Current ordered list of open item values. The element updates it after an accepted interaction.          |
| `defaultValue`     | `default-value`      | `string[]`                                      | `[]`        | Initial selection when `value` is empty on first registration. Later changes do not reset the selection. |
| `collapsible`      | `collapsible`        | `boolean`                                       | `false`     | In single mode, permits the last open item to close. It has no effect in multiple mode.                  |
| `disabled`         | `disabled`           | `boolean`                                       | `false`     | Prevents activation of every item.                                                                       |
| `keepMounted`      | `keep-mounted`       | `boolean`                                       | `false`     | Ends a closed panel in the retained presence state after its exit transition.                            |
| `hiddenUntilFound` | `hidden-until-found` | `boolean`                                       | `false`     | Retains closed content with `hidden="until-found"` so browser find-in-page can reveal it.                |
| `contentAlignment` | `content-alignment`  | `'edge' \| 'label'`                             | `'edge'`    | Sets the default ContentBody logical inline-start alignment for Items.                                   |
| `motionPolicy`     | `motion-policy`      | `'inherit' \| 'normal' \| 'reduce'`             | `'inherit'` | Resolves motion for the Accordion subtree from this boundary, its ancestors, or the environment.         |
| `onValueChange`    | —                    | `(event: TpValueChangeEvent<string[]>) => void` | `undefined` | Callback after an accepted root value-change proposal. Property only; not an HTML attribute.             |

`orientation` is fixed to vertical for Accordion. In this custom-element API, `selectionMode="multiple"` corresponds to the Foundation's `multiple` behavior.

## Visual variants

Variants are closed, predefined recipes assembled from the foundational border, radius, color, and spacing tokens. `plain` adds no container chrome. `line` adds only horizontal separators between adjacent Items. `outline` draws one rounded outer container with separators between Items. `separated` renders each Item as an independent rounded, bordered surface with token-scaled gaps.

```html
<tp-accordion variant="plain">…</tp-accordion>
<tp-accordion variant="line">…</tp-accordion>
<tp-accordion variant="outline">…</tp-accordion>
<tp-accordion variant="separated">…</tp-accordion>
```

The variant belongs to the Root because it describes the visual relationship among Items. It does not alter selection, presence, focus, indicator placement, or motion. Use the public parts for changes that do not fit one of the predefined recipes.

## Item properties and slots

| Property            | Attribute            | Type                                 | Default      | Behavior                                                                                     |
| ------------------- | -------------------- | ------------------------------------ | ------------ | -------------------------------------------------------------------------------------------- |
| `value`             | `value`              | `string`                             | `''`         | Stable selection identity. If empty, the Item's `id` is used, then a generated stable value. |
| `indicatorPosition` | `indicator-position` | `'leading' \| 'trailing'`            | `'trailing'` | Selects the empty position that renders this Item's default disclosure indicator.            |
| `contentAlignment`  | `content-alignment`  | `'edge' \| 'label' \| undefined`     | `undefined`  | Overrides the Root content alignment; omission inherits the Root value.                      |
| `headingLevel`      | `heading-level`      | `1`–`6`                              | `2`          | Semantic level of the Item's Heading. Set it to fit the surrounding document.                |
| `disabled`          | `disabled`           | `boolean`                            | `false`      | Prevents this Item from activating.                                                          |
| `onOpenChange`      | —                    | `(event: TpOpenChangeEvent) => void` | `undefined`  | Property-only callback after the Root accepts an Item open/close proposal.                   |

`keep-mounted` and `hidden-until-found` can be set on an Item to override the corresponding Root policy; the literal attribute value `"false"` disables an inherited policy. Repeating a `value` excludes the later Item and emits `tp-diagnostic`.

Use `slot="label"` for the Trigger's primary naming content. `slot="leading"` and `slot="trailing"` accept arbitrary non-interactive presentational nodes such as numbers, icons, badges, or status text; either slot can receive several nodes. Unslotted children go into ContentBody. See the [Icon guide](icon.md) for supplying selectively imported artwork.

`indicatorPosition` is presentational. `leading` and `trailing` follow writing direction, so Leading is on the right in RTL. The selected position renders Collapsible's default chevron only while its slot is empty. Assigning any content to that position suppresses the fallback without granting indicator semantics or motion to the supplied content. The Item publishes the resolved selection as `data-indicator-position`. Changing it does not alter selection, activation, focus, or the Trigger–Content accessibility relationship.

Positional content lives inside the native button Trigger and must not contain interactive descendants. Decorative content should be `aria-hidden="true"`; meaningful status text may remain in the accessibility tree when it should augment the Trigger's name.

## Content alignment

The Root's `contentAlignment` supplies the default for every Item. `edge` starts ContentBody at the Item's logical inline edge. `label` starts ContentBody at the Label position, accounting for the actual Leading layout without assuming that it contains an icon, number, badge, or any fixed width. An Item can override the Root independently:

```html
<tp-accordion content-alignment="label">
  <tp-accordion-item value="account">…</tp-accordion-item>
  <tp-accordion-item value="billing" content-alignment="edge">…</tp-accordion-item>
</tp-accordion>
```

Alignment follows writing direction and live layout changes. Each Item publishes its resolved value as `data-content-alignment`. In `edge` mode the baseline inline inset aligns content text with the Trigger label; in `label` mode Collapsible moves the ContentBody to the Label column and removes the redundant start inset. Padding overrides applied through `accordion-content-body` remain additive to the alignment model. Changing alignment does not affect selection, activation, focus, presence, motion, or accessibility relationships.

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

The public parts are `accordion` on the Root, `accordion-item` on the Item host, and `accordion-heading`, `accordion-trigger`, `accordion-leading`, `accordion-label`, `accordion-trailing`, `accordion-content`, and `accordion-content-body` forwarded from the internal Collapsible. Collapsible supplies the token-based Trigger, Label, positional-content, focus-ring, and ContentBody baseline, so Accordion inherits the same complete default without Storybook or consumer CSS. Style the forwarded parts with `tp-accordion-item::part(...)`; no private nested selector is required. The Item host publishes `data-open`, `data-closed`, `data-disabled`, `data-indicator-position`, and `data-content-alignment`, so expanded, disabled, and alignment styling needs no private selector. Native `:hover` and `:focus-within` remain available for transient interaction styling.

```css
tp-accordion-item {
  transition-property: background-color, border-color;
  transition-duration: calc(var(--tp-duration-normal) * var(--tp-motion-scale));
  transition-timing-function: var(--tp-easing-standard);
}

tp-accordion-item:hover:not([data-open]) {
  background: var(--tp-muted);
}

tp-accordion-item[data-open] {
  background: var(--tp-card);
}

tp-accordion-item::part(accordion-content-body) {
  padding-block-end: var(--tp-space-6);
}
```

The measured content panel publishes `--collapsible-panel-height` and `--collapsible-panel-width`, and its presence state is available through `data-state`, `data-starting-style`, and `data-ending-style`. The ContentBody separates content padding from the animated panel extent.

The internal Collapsible publishes the standard `disclosure`, `content`, and `indicator` roles. The default `disclosure` role animates the outer Content panel's measured height. The `indicator` role targets only the built-in disclosure indicator while that fallback is rendered; positional consumer content never inherits it. The `content` role targets ContentBody but deliberately has no default visual motion: a fade is one possible presentation, not part of disclosure behavior.

For Accordion composition, Collapsible scopes each request to its public `<tp-accordion-item>` owner and adds that Item's stable `value` and `index` context. A listener on one Item can therefore claim motion for that Item only, while a listener on the Accordion or document can provide a broader policy through event bubbling. The first synchronous claim wins.

```js
item.addEventListener('tp-motion-request', (event) => {
  if (event.request.role !== 'content') return;
  event.respondWith({
    play(request) {
      const lines = [...request.owner.querySelectorAll('p')];
      const animations = lines.map((line, index) =>
        line.animate(
          request.phase === 'enter'
            ? [
                { opacity: 0, transform: 'translateY(6px)' },
                { opacity: 1, transform: 'none' },
              ]
            : [
                { opacity: 1, transform: 'none' },
                { opacity: 0, transform: 'translateY(-4px)' },
              ],
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

The **External line-by-line motion** story uses this pattern with paragraphs of different lengths. Accordion continues to own selection; its internal Collapsible owns measurement, presence, motion completion, and final hiding. See the [Motion guide](motion.md) for the full driver lifecycle, reduced-motion policy, and tween-library adapters.

Entry and exit follow the shared presence lifecycle. With reduced motion, starting and ending are still published, but finite motion completes at the next scheduling checkpoint. A normally closed panel reaches `absent`; `keepMounted` or `hiddenUntilFound` produces `retained`.

## Current implementation limits

- There is no distinct controlled-value mode: an accepted trigger interaction updates `value` even when the host set it externally.
- On item registration or rebuild in non-collapsible single mode, an empty or unknown `value` is replaced by the first available item instead of preserving the request with a diagnostic. A programmatic multi-value list in single mode presents only its first available item, but the property can retain extra values until rebuild.
- When the open item is removed or disabled, fallback selection uses the first enabled item rather than the nearest successor, then predecessor.
- An `absent` panel is hidden but remains in the DOM; presence-state unmounting is not yet implemented.
- The Foundation's Trigger `nativeAction` property and arbitrary delegated Item hosts are not exposed by this Lit mapping. Consumers can use the Item's `tp-open-change` event to observe or cancel change proposals.
