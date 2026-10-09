# Pagination

Pagination is destination navigation. Every page and directional target is a real
link rendered by the existing Button component. `page` describes the application's
current page; following a link does not create a second page-state owner.

```html
<script type="module">
  import '@tweakpad/ui/register';
  import '@tweakpad/ui/styles.css';
</script>
<tp-pagination label="Search results" page="4" pages="12"></tp-pagination>
```

By default each destination preserves the current URL and replaces its `page`
query parameter. Set `hrefForPage` to use your application's routes. For a client
router, handle `onPageChange` or `tp-value-change`, update the page input after
accepting navigation, and prevent the original source event's default action.
Canceling the proposal prevents navigation. Ctrl/Meta/Shift/Alt clicks retain
native link behavior without changing the current page. Activating the current
page does not reload the same destination.

| Property / attribute                  | Type                       | Default                           | Purpose                                                                                       |
| ------------------------------------- | -------------------------- | --------------------------------- | --------------------------------------------------------------------------------------------- |
| `page`                                | positive integer           | 1                                 | Application-owned current page; supply a page within the result set.                          |
| `pages`                               | positive integer           | 1                                 | Total page count.                                                                             |
| `label`                               | string                     | Pagination                        | Navigation landmark name.                                                                     |
| `hrefForPage`                         | `(page: number) => string` | current URL with page query       | Real destination for every link.                                                              |
| `pageLabel`                           | `(page: number) => string` | Page plus locale-formatted number | Accessible page-link name.                                                                    |
| `previousLabel / previous-label`      | string                     | Previous                          | Localized visible and accessible previous name.                                               |
| `nextLabel / next-label`              | string                     | Next                              | Localized visible and accessible next name.                                                   |
| `pageLinkVariant / page-link-variant` | icon / text                | icon                              | Square or content-width numbered links.                                                       |
| `showPrevious / show-previous`        | boolean                    | true                              | Render the previous link.                                                                     |
| `showNext / show-next`                | boolean                    | true                              | Render the next link.                                                                         |
| `showPageLinks / show-page-links`     | boolean                    | true                              | Render numeric links and omitted ranges.                                                      |
| `showLabels / show-labels`            | boolean                    | true                              | Include direction text, compacted below 40rem; false retains named icon links at every width. |
| `disabled`                            | boolean                    | false                             | Disable all links through Button's shared native-link policy.                                 |
| `onPageChange`                        | value-change callback      | undefined                         | Same cancelable navigation intent as `tp-value-change`.                                       |

Set true-default boolean properties to `false` in JavaScript/Lit; an HTML attribute
with the string `false` is still present and therefore true. Direction and locale
come from the shared environment. Arrows mirror in RTL. Native lists retain item
semantics, the current link has `aria-current="page"`, and decorative omitted
ranges are hidden from assistive technology. The numeric window keeps boundary
pages and nearby pages; no omitted range becomes a fake action.

`tp-value-change` details are `{value, previousValue, reason, sourceEvent, cancelled}`.
`preventDefault()` or `detail.cancelled = true` vetoes navigation. There is no
uncontrolled/default-page state or form value. This component does not fetch data.
Nonpositive/noninteger `page` or `pages` is invalid configuration.

Public parts: `pagination`, `pagination-list`, `pagination-page-item`,
`pagination-page-link`, `pagination-previous`, `pagination-next`,
`pagination-ellipsis`. Numbered links expose `data-active` and the actual Button's
hover, focus and disabled state. `partPresentation` reaches the actual native link;
`partContracts` customizes the root/list/item/link compositions. Destination
semantics must remain intact when delegating. Spacing, size, radius and active
outline use the shared theme and Button recipes; there is no spacing attribute.

The Simple example omits both direction links. With Select composes actual Field
and Select controls for page size; the application updates `pages` and `page`.
Both examples use the same setup code in the live preview and code explorer,
including accepting navigation, canceling the browser's default route and updating
the current page. Below the reference's 40rem breakpoint, Previous and Next retain
their accessible names and icons while their visible labels are hidden. Resizing
does not replace links or reset the current page.
