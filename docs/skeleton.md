# Skeleton

`tp-skeleton` is a decorative placeholder. Its containing layout determines the
space it reserves; changing motion never changes that geometry. Import
`@tweakpad/ui/register` and `@tweakpad/ui/styles.css`.

| Property / attribute             | Values                                     | Default |
| -------------------------------- | ------------------------------------------ | ------- |
| `motion`                         | pulse, sweep, none                         | pulse   |
| `animated`                       | boolean; false suppresses either animation | true    |
| `motionPolicy` / `motion-policy` | inherit, normal, reduce                    | inherit |
| `label`                          | string; not announced                      | Loading |

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
`skeleton` part also supports the part contract/delegate API. Skeleton has no
spacing attributes, interaction events, form value or focus behavior.
Export: `TpSkeleton` and `skeletonMotionRoles`.

Docs include avatar, media preview, card, text, form and table loading layouts.
All use Skeleton with ordinary theme-relative layout. The media preview composes
Aspect Ratio to reserve its two-to-one region; Card supplies the card
composition's sections. Form and table placeholders are decorative layout, not
empty interactive controls or fake table data.
