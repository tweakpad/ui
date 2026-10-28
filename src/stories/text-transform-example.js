import { defineTextPreset } from '../foundation/text-transform/presets.js';

/** Define app-wide presets once, then give one value its own formatter. */
export function setupTextTransformExample(root) {
  const releases = [
    // A preset built on another one, with its own options.
    defineTextPreset('fare', { preset: 'currency', format: { currency: 'EUR' } }),
    // A formatter preset: berth numbers read as codes such as "B-007".
    defineTextPreset('berth', ({ value }) => ({
      text: `B-${String(value).padStart(3, '0')}`,
      accessibleText: `Berth ${value}`,
    })),
  ];
  const seats = root.querySelector('#seats-left');
  if (seats) seats.formatter = (context) => `${context.apply('percent')} of seats left`;
  return () => {
    for (const release of releases) release();
  };
}
