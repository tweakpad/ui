# Avatar

`tp-avatar` displays an entity image or a centered fallback. It preloads images by
default and shows fallback while the current image is unavailable. A new source
starts a new loading generation; stale load completions cannot replace it.

```html
<tp-avatar fallback="AM" alt="Alex Morgan"></tp-avatar>
<tp-avatar-group omitted="3">
  <tp-avatar src="alex.jpg" fallback="AM" alt="Alex Morgan"></tp-avatar>
  <tp-avatar fallback="JD" alt="Jordan Doe"></tp-avatar>
</tp-avatar-group>
```

Import `@tweakpad/ui/register` and `@tweakpad/ui/styles.css` before rendering.

| Property / attribute | Type / values | Default |
| --- | --- | --- |
| `src` | image URL | empty |
| `alt` | accessible entity name; empty for decorative images | empty |
| `fallback` | fallback text; default slot overrides content | empty |
| `size` | sm, default, lg | default |
| `fallbackDelay` / `fallback-delay` | milliseconds before first fallback | 0 |
| `keepMounted` / `keep-mounted` | mount image before success | false |
| `loading` | eager, lazy; native image loading with keep-mounted | eager |
| `srcSet` / `srcset` | native responsive image candidates | empty |
| `sizes` | native responsive image sizes | empty |
| `crossOrigin` / `crossorigin` | empty, anonymous, use-credentials | empty |
| `referrerPolicy` / `referrerpolicy` | native image referrer policy | empty |
| `imageLoadingStatus` | read-only idle, loading, loaded, error | idle |
| `onLoadingStatusChange` | optional callback receiving the status | undefined |

`tp-loading-status-change` bubbles across shadow boundaries with `{ status }`.
It reports an observed status change and is not cancelable. Changing the image
source after an error retries loading. Disconnecting cancels fallback timers and
invalidates outstanding callbacks. A fallback already shown is not hidden by a
later delay change. `keep-mounted` preserves the native image for lazy loading;
while unavailable it is visually and accessibility hidden, with fallback active.

Slots: default fallback content and optional `badge` status content. Formatting
whitespace around named content does not suppress the fallback text; meaningful
default-slot text or an element overrides it, including dynamic changes. Supply a
fallback whenever image loading may fail. Give status marks a textual accessible
name; color alone is insufficient. `aria-hidden="true"` on the Avatar makes the
whole composition decorative when an adjacent name already identifies the entity.

Parts: `avatar` (host), `avatar-image`, `avatar-fallback`, `avatar-badge`. The earlier
`image` and `fallback` aliases remain. Shared theme roles provide size, muted
fallback colors and circular shape. Use the presentation dictionary and
`partPresentation` for customization; there are no spacing attributes.

`tp-avatar-group` accepts Avatar children and exposes `avatar-group` and
`avatar-overflow-count`. Its `omitted` number (default 0) renders an existing Avatar
with a named additional-participant count. Group `size` (sm/default/lg; default
`default`) sets that count's size; member sizes remain independently owned.
Negative or nonfinite omitted counts display no counter. Logical overlap supports
RTL. Exports: `TpAvatar`, `TpAvatarGroup`, `AvatarLoadingStatus`.

Canonical rendered regions support the shared `partContracts` interface, including
render delegates, element references, host properties, and class/style hooks. A
render delegate must apply its supplied `bind` directive to the semantic host and
render the supplied `content`; this preserves component state and slot behavior.

The Docs examples cover all three sizes, images and fallbacks, named status badges,
icon badges, groups, numeric and icon overflow counts, and Avatar inside Empty
State. The badge enclosure owns its theme colors, ring and icon bounds; an icon
inside it does not need a separate spacing or size adjustment. Small avatars hide
the icon while retaining the badge's accessible status name.

Image and fallback badge rows use the same named status part. Group examples show
loaded images at each size; overflow icons scale through the shared count recipe,
while their accessible name still communicates the omitted number. The custom
shape example uses the shared radius token on the viewport and the public image
part for grayscale. These are compositions, not extra Avatar variants. Interactive
examples copy their complete markup, registration, imports and setup from the same
source that renders them.
