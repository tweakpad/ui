// Type tests of the elements' own tags in React 19 JSX, through `@tweakpad/ui/react/jsx`.
import type {} from '../../../src/react/jsx.js';
import type {} from '../../../src/react/widgets/jsx.js';
import type { ReactElement } from 'react';

export const tags: ReactElement[] = [
  <tp-checkbox
    defaultChecked
    ontp-value-change={(event) => {
      const checked: boolean = event.detail.value;
      return checked;
    }}
  />,
  <tp-select items={[{ value: 'a', label: 'A' }]} ontp-open-change-complete={(event) => event.detail.open} />,
  <tp-flow ontp-history-change={(event) => event.detail.canUndo} />,
  // @ts-expect-error `variant` is one of the Button variants.
  <tp-button variant="huge" />,
  // @ts-expect-error React reads `on…` props as listeners: callbacks are not part of a tag's props.
  <tp-checkbox onCheckedChange={() => undefined} />,
];
