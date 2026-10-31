// Type tests of the elements' tags in Preact, through `@tweakpad/ui/preact`.
import type {} from '../../../src/preact/index.js';
import type {} from '../../../src/preact/widgets/index.js';

export const tags = [
  <tp-checkbox
    defaultChecked
    ontp-value-change={(event) => {
      const checked: boolean = event.detail.value;
      return checked;
    }}
  />,
  <tp-dialog open label="Rename" ontp-open-change={(event) => event.detail.value} />,
  <tp-color-picker ontp-value-change={(event) => event.detail.value.toUpperCase()} />,
  // @ts-expect-error `variant` is one of the Button variants.
  <tp-button variant="huge" />,
];
