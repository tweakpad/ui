# Tweakpad UI

LitElement web components implementing the UI Foundation and UI Component Library specifications at source version 0.2.62.

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
- Motion uses shared duration tokens and becomes immediate under `prefers-reduced-motion: reduce`.

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

The Storybook overview renders all 61 public catalog identities. The browser smoke suite checks registration, interaction, native form behavior, keyboard navigation, console errors, and Axe accessibility results.
