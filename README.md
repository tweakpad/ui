# Tweakpad UI

Accessible web components built with [Lit](https://lit.dev), guided by the Tweakpad UI Foundation and Component Library specifications. They work in any framework, or none.

> Pre-1.0: minor versions may contain breaking changes. See the [changelog](https://github.com/tweakpad/ui/blob/development/CHANGELOG.md).

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
<tp-field label="Email" description="Used for receipts">
  <tp-input name="email" type="email" autocomplete="email" required></tp-input>
</tp-field>

<tp-button type="submit">Continue</tp-button>
```

`@tweakpad/ui/register` defines every component. To ship only what you use, import classes from `@tweakpad/ui` and define them yourself; dependencies a component renders are defined with it:

```ts
import { TpCarousel, defineElement } from '@tweakpad/ui';

// Also defines tp-button, tp-icon, tp-progress and tp-spinner, which the carousel renders.
defineElement(TpCarousel.tagName, TpCarousel);
```

Icons are separate modules: import only the definitions you use from `@tweakpad/ui/icons/<name>`, and `@tweakpad/ui/register/icon` registers `tp-icon` alone.

Widgets, the specialized controls (color pickers, curve editors, audio graphs), are a separate section: `@tweakpad/ui/widgets` exports their classes and `@tweakpad/ui/register/widgets` defines them. Neither the main index nor `/register` includes a widget, so the core stays small unless you opt in. See the [widgets guide](https://github.com/tweakpad/ui/blob/development/docs/widgets/README.md).

## Entry points

| Import                                                                        | Contents                                                                     |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `@tweakpad/ui`                                                                | Component classes, foundation utilities, presentation APIs (no side effects) |
| `@tweakpad/ui/register`                                                       | Defines every component                                                      |
| `@tweakpad/ui/register/icon`                                                  | Defines `tp-icon` only                                                       |
| `@tweakpad/ui/widgets`                                                        | Widget classes, types, the widget catalog and widget presentation aggregates |
| `@tweakpad/ui/register/widgets`                                               | Defines every widget; not included in `/register`                            |
| `@tweakpad/ui/icons/<name>`                                                   | Individual icon definitions                                                  |
| `@tweakpad/ui/styles.css`                                                     | Design tokens and page defaults                                              |
| `@tweakpad/ui/carousel`, `/drag-drop`, `/media`, `/map`, `/code`, `/markdown` | Foundation modules for those feature areas                                   |

The package is ESM, one module per source file, with side effects limited to the `register` entries and the stylesheet, so bundlers keep only what you reach. A [custom elements manifest](https://github.com/webcomponents/custom-elements-manifest) ships as `custom-elements.json` (package `customElements` field) for editor tooling.

## Styling

- `styles.css` defines the `--tp-*` design tokens on `:root` and sets page defaults on `body` (margin, minimum size, background and text color). Override tokens on `:root` or any ancestor; see the [styling guide](https://github.com/tweakpad/ui/blob/development/docs/styling.md).
- The default font stack starts with Inter, which is not bundled: load it yourself, or the system UI font is used.
- Components expose stable `part` names, presentation dictionaries and per-instance `partPresentation` hooks for customization.

## Conventions

- All custom elements use the `tp-` prefix. Property, attribute, state-marker and event naming rules are in the [conventions guide](https://github.com/tweakpad/ui/blob/development/docs/conventions.md).
- Interactive value changes dispatch cancelable `tp-value-change` events with `value`, `previousValue`, `reason` and the source event; open-state controls dispatch cancelable `tp-open-change`.
- Form controls take part in native forms. Text controls render their native editor in your document so browser autofill and password managers work as with any form field.
- Direction follows the nearest `dir` boundary; keyboard navigation accounts for RTL.
- Motion uses CSS defaults, the inherited `motion-policy`, and semantic `tp-motion-request` hooks for optional external drivers.

## Browser support

Current versions of Chrome, Edge, Firefox and Safari (custom elements, shadow DOM, `ElementInternals`, `:has()`, `color-mix()` and container queries).

## Documentation

Component guides live in [`docs/`](https://github.com/tweakpad/ui/tree/development/docs), for example [Accordion](https://github.com/tweakpad/ui/blob/development/docs/accordion.md), [Icon](https://github.com/tweakpad/ui/blob/development/docs/icon.md) and [Motion](https://github.com/tweakpad/ui/blob/development/docs/motion.md). Widget guides live in [`docs/widgets/`](https://github.com/tweakpad/ui/tree/development/docs/widgets).

## License

[MIT](https://github.com/tweakpad/ui/blob/development/LICENSE). Ported portions of Swiper, shadcn/ui and dnd-kit keep their MIT notices (`LICENSE.*` in the package).
