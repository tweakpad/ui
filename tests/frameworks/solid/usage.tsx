// Type tests of the elements' tags in Solid, through `@tweakpad/ui/solid`.
import type {} from '../../../src/solid/index.js';
import type {} from '../../../src/solid/widgets/index.js';

export const tags = [
  <tp-checkbox
    defaultChecked
    on:tp-value-change={(event) => {
      const checked: boolean = event.detail.value;
      return checked;
    }}
  />,
  <tp-select items={[{ value: 'a', label: 'A' }]} on:tp-open-change-complete={(event) => event.detail.open} />,
  <tp-emoji-picker on:tp-value-change={(event) => event.detail.value.length} />,
  // @ts-expect-error `variant` is one of the Button variants.
  <tp-button variant="huge" />,
];
