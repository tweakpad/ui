Visually hidden keeps text in the accessibility tree while hiding it on screen. Screen readers and other assistive technology read it like any other content; sighted users never see it, and it takes no space in the layout.

```html
<tp-toggle value="campsites">
  <tp-icon></tp-icon>
  <tp-visually-hidden>Campsites</tp-visually-hidden>
</tp-toggle>
```

## Uses

- **Names for icon-only controls.** Put the name beside the icon, inside the control. It becomes the control's accessible name, just as visible text would. An icon-only [Button](button.md) needs no Visually hidden element: in an icon size its label is already hidden, so write the name as the label.
- **Announcements.** Give the element `role="status"` (or `aria-live="polite"`) and change its text when something happens that sighted users notice from the layout, such as a list shrinking as they type. Keep the element in the page from the start and change only its content: a region that appears together with its message is often not announced.
- **Context.** Complete text that is clear on screen but not when read alone. Repeated "Renew" buttons in a table become "Renew Pole saw" with the item name hidden inside each button, and an actions column gets a heading without printing one.

## Rules

- Never put focusable or interactive content inside. A focused element that cannot be seen leaves keyboard users lost. When assigned content contains a focusable element, the element emits a `tp-diagnostic` warning with the code `visually-hidden-focusable-content`. Visually hidden never appears on focus; it is not a skip link.
- The `hidden` attribute removes the element and its content from the accessibility tree as well. Use it to withdraw text, not to hide it visually.
- Content inside an element with `aria-hidden="true"` is never read, hidden or not.
- `aria-labelledby` and `aria-describedby` find an `id` only within the same document or shadow root.
- Hide whole words. Hidden text is read as a separate run, apart from the words around it, so it cannot complete a visible word: `Tool<tp-visually-hidden>s</tp-visually-hidden>` is read as "Tool s".

## Styling

Visually hidden has no appearance to customize. Its hiding declarations take precedence over page, theme and presentation styles, so nothing can give it size or reveal its content. The library stylesheet hides the content before the element is defined and when generated styles are turned off.

## API — `tp-visually-hidden`

Visually hidden has no properties, parts or custom properties of its own, and its only slot is its content. Its only event is the `tp-diagnostic` warning below. Attributes you set on it apply unchanged, for example `id`, `lang`, `role`, `aria-live`, `aria-atomic` and `hidden`; it adds no role, name or live region by itself.

| Diagnostic code                     | When                                           |
| ----------------------------------- | ---------------------------------------------- |
| `visually-hidden-focusable-content` | Assigned content contains a focusable element. |

The host is the `visually-hidden` presentation part.

Exported class: `TpVisuallyHidden`. Import `@tweakpad/ui/register` and `@tweakpad/ui/styles.css`.
