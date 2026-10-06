import type { PresentationDictionary } from '../resolver.js';

/** Marks size their content (`tp-icon size="1em"`, spinners, SVG) to the step's icon extent. */
const mark = [
  {
    selector: '&',
    declarations: { 'font-size': 'var(--_tp-icon-extent, var(--tp-icon-size-md))' },
  },
];

export const buttonAppearance: PresentationDictionary = {
  button: [],
  'button-leading-mark': mark,
  'button-trailing-mark': mark,
};
