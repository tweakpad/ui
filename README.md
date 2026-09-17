# Tweakpad UI

LitElement web components guided by the UI Foundation and UI Component Library specifications.

## Install and register

```ts
import '@tweakpad/ui/styles.css';
import '@tweakpad/ui/register';
```

```html
<tp-field label="Email" description="Used for receipts">
  <tp-input name="email" type="email" required></tp-input>
</tp-field>

<tp-button type="submit">Continue</tp-button>
```

Import named classes and Foundation utilities from `@tweakpad/ui` when registration is managed by the host:

```ts
import { TpButton, defineElement } from '@tweakpad/ui';

defineElement(TpButton.tagName, TpButton);
```

## Public conventions

- All custom elements use the `tp-` prefix.
- Components expose stable `part` names for presentation and named slots for composition.
- Interactive value changes dispatch cancellable `tp-value-change` events with `value`, `previousValue`, `reason`, and the source event.
- Open-state controls dispatch cancellable `tp-open-change` events.
- Form controls participate in native forms through `ElementInternals`.
- Direction follows the nearest `dir` boundary. Keyboard navigation accounts for RTL where horizontal direction matters.
- Motion uses CSS defaults, inherited `motion-policy`, and semantic `tp-motion-request` hooks for optional external drivers.

## Commands

```sh
npm run dev
npm run storybook
npm run format
npm test
npm run test:browser
npm run test:stories
npm run test:package
npm run verify:phase-1
npm run lint
npm run build
npm run build-storybook
```

`npm run lint` checks Prettier formatting, TypeScript and Lit templates, Lit accessibility,
standalone CSS, and CSS embedded in Lit `css` templates.

The Storybook overview renders all 62 public catalog identities. The browser smoke suite checks registration, interaction, native form behavior, keyboard navigation, console errors, and Axe accessibility results.

Accordion has a maintained [component guide](docs/accordion.md) and a Storybook Docs page with property controls, examples, events, styling hooks, and current implementation limits.

The [motion guide](docs/motion.md) documents CSS defaults, reduced-motion boundaries, role inventories, and adapters for Web Animations or third-party tween libraries.

Icon has a maintained [component guide](docs/icon.md). Import only the definitions you use from `@tweakpad/ui/icons/<name>`; the optional `@tweakpad/ui/register/icon` entry registers `tp-icon` without registering the whole library.

The [styling guide](docs/styling.md) documents the foundational token families, the default typography tuple, mode replacement rules, and the supported override boundary.
