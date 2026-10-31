# Using the elements in a framework

The elements are custom elements, so any framework that renders custom elements can use them.
For React and Vue the package also ships one component per element, typed from the element. For
Preact, Solid, Svelte and Vue templates it ships types for the elements' own tags.

Load the stylesheet once, as in plain HTML:

```ts
import '@tweakpad/ui/styles.css';
```

## React

React 19 is required. Each element has a component named after it without the `tp-` prefix:
`<tp-select>` is `Select` and `<tp-select-option>` is `SelectOption`. Import components from
`@tweakpad/ui/react`, widgets from `@tweakpad/ui/widgets/react`, or one component folder from
`@tweakpad/ui/react/<name>`:

```tsx
import { useState } from 'react';
import { Button, Checkbox, Dialog, Select } from '@tweakpad/ui/react';

export function LayerPanel() {
  const [visible, setVisible] = useState(true);
  const [blend, setBlend] = useState<unknown>('normal');
  const [open, setOpen] = useState(false);
  return (
    <>
      <Checkbox checked={visible} onCheckedChange={(event) => setVisible(event.detail.value)}>
        Visible
      </Checkbox>
      <Select
        label="Blend mode"
        items={[
          { value: 'normal', label: 'Normal' },
          { value: 'multiply', label: 'Multiply' },
        ]}
        value={blend}
        onValueChange={(event) => setBlend(event.detail.value)}
      />
      <Dialog
        open={open}
        onOpenChange={(event) => setOpen(event.detail.value)}
        label="Rename layer"
      >
        <Button slot="trigger">Rename</Button>
        <p>Choose a new name for the layer.</p>
      </Dialog>
    </>
  );
}
```

- **Props.** Every property of the element is a prop with the element's own type, including
  objects, arrays and functions (`items`, `filter`, `renderItem`). A prop you leave out keeps the
  element's default.
- **Changes.** A controllable value has a callback prop named after it: `onValueChange`,
  `onCheckedChange`, `onOpenChange`, `onPressedChange`. It receives the proposal event (the new
  value is `event.detail.value`) for the element's own value only, not for its descendants.
  Write the value back to state to accept it, write nothing to keep the current one, or write
  another value to replace it. Call `event.preventDefault()` to refuse a proposal outright.
- **Events.** Every event is a prop named `onTp` and the rest of the event name:
  `tp-open-change-complete` is `onTpOpenChangeComplete`. Events bubble, so a handler on a group
  also receives its items' events of the same name; the callback props do not.
- **Uncontrolled.** Pass `defaultValue`, `defaultChecked` or `defaultOpen` and leave the value
  out; the element keeps its own state.
- **Slots.** Put `slot="…"` on a child: `<Button slot="trigger">`.
- **Refs.** `ref` is the element, with its methods: `ref.current.focus()`, `ref.current.setOpen(true)`.
- **Registration.** A component defines its element when it first renders, so nothing needs
  registering first, and importing a component bundles only its element.
- **Server rendering.** The components are client components (`'use client'`) and import on the
  server. The server renders the element's tag with its string, number and boolean props as
  attributes; the element renders itself when it loads in the browser.

To write the tags themselves instead (`<tp-select>`), import the tag types once, for example in
a `.d.ts` file, and register the elements before React renders them:

```ts
import type {} from '@tweakpad/ui/react/jsx';
import '@tweakpad/ui/register';
```

React then sets the elements' properties, and listens to an event through a prop with the exact
event name: `ontp-value-change`. React reads any `on…` prop on a tag as a listener, so the callback
properties (`onValueChange`) are not available on tags; use the components for them.

## Vue

Vue 3.4 or later. Components come from `@tweakpad/ui/vue` (widgets from
`@tweakpad/ui/widgets/vue`), named as for React:

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { Button, Checkbox, Dialog, Select } from '@tweakpad/ui/vue';

const visible = ref(true);
const blend = ref<unknown>('normal');
const open = ref(false);
</script>

<template>
  <Checkbox v-model:checked="visible">Visible</Checkbox>
  <Select v-model="blend" label="Blend mode" :items="[{ value: 'normal', label: 'Normal' }]" />
  <Dialog v-model:open="open" label="Rename layer">
    <Button slot="trigger">Rename</Button>
    <p>Choose a new name for the layer.</p>
  </Dialog>
</template>
```

- **`v-model`.** Each controllable value has its own `v-model:<name>` (`v-model:checked`,
  `v-model:open`, `v-model:value`); plain `v-model` binds the element's main value. Give the model
  a value from the start: an element whose value starts as `undefined` stays uncontrolled.
- **Props.** Every element property is a prop, typed by the element, set as a property, so
  objects and arrays work and `<Button disabled />` is disabled. An omitted prop keeps the
  element's default.
- **Events.** Listen with the event name: `@tp-open-change-complete="…"`. The callback props
  (`:on-value-change`, or `@value-change`) receive the element's own proposals, as in React.
- **Slots, refs and registration** work as in React: `slot="…"` on a child, a template ref is the
  element, and a component defines its element when it is set up.

To write the tags themselves, register the elements, tell the compiler they are custom elements
and add the tag types:

```ts
// vite.config.ts
import vue from '@vitejs/plugin-vue';
import { isTweakpadElement } from '@tweakpad/ui/vue';

export default {
  plugins: [vue({ template: { compilerOptions: { isCustomElement: isTweakpadElement } } })],
};
```

```ts
// main.ts
import '@tweakpad/ui/register';
import type {} from '@tweakpad/ui/vue/elements';
```

Use `.prop` for an object property on a tag (`:items.prop="items"`) and `@tp-…` for events.

## Preact, Solid and Svelte

Register the elements and add the tag types for the framework, which declare every element's
properties and events:

```ts
import '@tweakpad/ui/register';
import type {} from '@tweakpad/ui/preact'; // or /solid, /svelte, with /widgets/… for widgets
```

| Framework | Event listener           | Notes                                                  |
| --------- | ------------------------ | ------------------------------------------------------ |
| Preact    | `ontp-value-change={…}`  | Props are set as properties.                           |
| Solid     | `on:tp-value-change={…}` | Props are set as properties.                           |
| Svelte 5  | `ontp-value-change={…}`  | Props are set as properties; `bind:` is not available. |

## Angular

Add `CUSTOM_ELEMENTS_SCHEMA` to the components that use the elements, register them in
`main.ts`, bind properties with `[items]="items"` and events with `(tp-value-change)="…"`.
Angular does not type-check custom element templates.
