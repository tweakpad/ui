# Breadcrumb

Breadcrumb preserves native ancestor links inside an ordered navigation list.
Supply each trail item as a direct child. A terminal plain item is marked as the
current page; it is not turned into a disabled link.

```html
<script type="module">
  import '@tweakpad/ui/register';
  import '@tweakpad/ui/styles.css';
</script>
<tp-breadcrumb>
  <a href="/">Home</a>
  <a href="/components">Components</a>
  <span>Breadcrumb</span>
</tp-breadcrumb>
```

| Property / attribute | Type | Default | Purpose |
| --- | --- | --- | --- |
| `label` | string | Breadcrumb | Navigation landmark name. |
| `separator` | string | empty | Decorative separator text; empty uses the shared logical chevron Icon. |

The default slot accepts links, plain current-page content and compositions such
as Menu. Original nodes, destinations, listeners and authored roles are preserved.
Each child is projected through a stable internal slot inside a native list item;
those implementation slot assignments are restored when it is removed or the
Breadcrumb disconnects. Keep caller content in the default slot. Changes to trail
membership update ordering and the component-owned current-page marker. An authored
`aria-current` is preserved. An actionable terminal item remains actionable and is
not automatically relabeled as current-page text.

Collapse is application-owned: replace omitted ancestors with a named real Button
opening Menu, and put the ancestor links in that Menu. A decorative omission can
instead be an `aria-hidden="true"` Icon marked `data-breadcrumb-ellipsis`. An
interactive omission must have an accessible name and must not be aria-hidden.
The Collapsed example uses the same Menu component and focus behavior as the rest
of the library, including nested menus if required.

Public parts: `breadcrumb`, `breadcrumb-ordered-list`, `breadcrumb-item`,
`breadcrumb-link`, `breadcrumb-current-page`, `breadcrumb-separator`,
`breadcrumb-ellipsis`. Public `partContracts` customize rendered anatomy;
`partPresentation` reaches the original native ancestor links and current item.
Decorative separators are hidden from assistive technology and mirror in RTL.
The list wraps at constrained widths. Typography, link treatment, gaps and icon
size use shared theme variables. Breadcrumb has no value, change event or form
ownership; native links and nested controls retain their own events.

The Docs examples cover a collapsed ancestor Menu, a named ancestor Menu with a
chevron, decorative ellipsis with consumer-owned links, custom separator text
and responsive ancestor navigation.
Each uses the shared code explorer with the same markup and setup as its live
preview. Native anchors are intentional: they retain destinations, modified-click
behavior and caller listeners without requiring a router dependency.

Responsive collapse is an application composition, not an implicit Breadcrumb
breakpoint. The example follows the reference's 48rem policy: Menu on wide screens,
Drawer on small screens, with the same ancestor destinations. It closes and removes
the inactive surface and moves focus to the replacement trigger when the previous
surface was open. Menu and Drawer continue to own their modal, keyboard, dismissal
and focus behavior. The media listener is released when the example is removed.
