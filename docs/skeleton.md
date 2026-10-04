# Skeleton

`tp-skeleton` is a decorative placeholder. Its containing layout determines the
space it reserves; changing motion never changes that geometry. Import
`@tweakpad/ui/register` and `@tweakpad/ui/styles.css`.

| Property / attribute | Values | Default |
| --- | --- | --- |
| `motion` | pulse, sweep, none | pulse |
| `animated` | boolean; false suppresses either animation | true |
| `motionPolicy` / `motion-policy` | inherit, normal, reduce | inherit |
| `label` | legacy string; deliberately not announced | Loading |

The shared reduced-motion policy and `tp-motion-request` loading role apply to both
motion treatments. Shared duration tokens govern timing. The `skeleton` part is
always `aria-hidden`; provide one loading status on the surrounding region when
needed. Skeleton does not own or announce the eventual content.

```html
<div aria-busy="true" aria-label="Loading profile">
  <tp-skeleton></tp-skeleton>
  <tp-skeleton motion="sweep"></tp-skeleton>
</div>
```

Use normal layout to set width and height. Set the host border radius with a shared radius token for circular or other shapes.
For example, `border-radius:var(--tp-radius-full)` inherits into the placeholder.
Alternatively use `partPresentation.skeleton.styleHook` with shared radius tokens. The
`skeleton` part also supports the existing part contract/delegate API. No local
spacing attributes, interaction events, form value or focus behavior are added.
Export: `TpSkeleton`. `primitiveMotionRoles.skeletonLoading` remains exported.

Docs include the reference avatar, card, text, form and table loading layouts.
All use the same Skeleton primitive with ordinary theme-relative layout; no new
shape or spacing attributes are introduced.
