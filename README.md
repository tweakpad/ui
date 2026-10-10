# Tweakpad UI

Accessible web components built with [Lit](https://lit.dev). They implement the Tweakpad UI Foundation and Component Library specifications and work in any framework, or none.

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

## Browser support

Current versions of Chrome, Edge, Firefox and Safari.

## License

MIT. Ported portions of Swiper, shadcn/ui and dnd-kit keep their MIT notices in the package's `LICENSE.*` files.
