# Tweakpad UI

Accessible web components built with [Lit](https://lit.dev). They work in any framework, or none.

> Pre-1.0: minor versions may contain breaking changes.

## Install

```sh
npm install @tweakpad/ui lit
```

`lit` is a peer dependency, so your app shares one copy with the components.

## Quick start

```ts
import '@tweakpad/ui/styles.css';
import '@tweakpad/ui/register';
```

```html
<tp-field label="Email">
  <tp-input name="email" type="email" required></tp-input>
</tp-field>

<tp-button type="submit">Continue</tp-button>
```

## Entry points

| Import                          | Contents                                              |
| ------------------------------- | ----------------------------------------------------- |
| `@tweakpad/ui`                  | Component classes and utilities, without side effects |
| `@tweakpad/ui/register`         | Defines every component                               |
| `@tweakpad/ui/widgets`          | Widget classes, such as the color picker              |
| `@tweakpad/ui/register/widgets` | Defines every widget                                  |
| `@tweakpad/ui/icons/<name>`     | Individual icons                                      |
| `@tweakpad/ui/styles.css`       | Design tokens and page defaults                       |

Widgets are opt-in: neither `@tweakpad/ui` nor `@tweakpad/ui/register` includes them.

## Frameworks

The elements work in any framework that renders custom elements. For React and Vue the package
also ships components that wrap them, typed from each element, and for Preact, Solid, Svelte and
Vue templates, types for the elements' own tags.

| Import                                                        | Contents                                         |
| ------------------------------------------------------------- | ------------------------------------------------ |
| `@tweakpad/ui/react`, `@tweakpad/ui/widgets/react`            | React 19 components, one per element             |
| `@tweakpad/ui/vue`, `@tweakpad/ui/widgets/vue`                | Vue 3 components with `v-model`, one per element |
| `@tweakpad/ui/react/jsx`                                      | Types for `<tp-…>` tags in React                 |
| `@tweakpad/ui/vue/elements`                                   | Types for `<tp-…>` tags in Vue templates         |
| `@tweakpad/ui/preact`, `/solid`, `/svelte` (and `/widgets/…`) | Types for `<tp-…>` tags in those frameworks      |

```tsx
import '@tweakpad/ui/styles.css';
import { Checkbox, Dialog, Button } from '@tweakpad/ui/react';

<Checkbox checked={checked} onCheckedChange={(event) => setChecked(event.detail.value)}>
  Snap to grid
</Checkbox>;
```

A component defines its element when it first renders, and importing one bundles only that
element. [docs/frameworks.md](docs/frameworks.md) covers events, controlled values, slots and
server rendering in each framework.

## Browser support

Current versions of Chrome, Edge, Firefox and Safari. The text editor needs Chrome or Edge 137 or
later, Firefox 142 or later, or Safari 17.5 or later.

## License

MIT. Third-party portions keep their original notices (MIT or ISC) in the package's `LICENSE.*` files.
