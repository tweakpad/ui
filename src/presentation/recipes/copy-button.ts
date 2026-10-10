import type { PresentationDictionary } from '../resolver.js';

// Copy button composes an actual Button and Icon: their recipes own every paint rule, so the
// composition contributes keys without a second copy of that appearance.
export const copyButtonAppearance: PresentationDictionary = {
  'copy-button': [],
  ...Object.fromEntries(
    ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'].map((value) => [
      `copy-button-variant-${value}`,
      [],
    ]),
  ),
  ...Object.fromEntries(
    ['xs', 'sm', 'default', 'lg'].map((value) => [`copy-button-size-${value}`, []]),
  ),
  'copy-button-button': [],
  'copy-button-icon': [],
  'copy-button-label': [],
};
