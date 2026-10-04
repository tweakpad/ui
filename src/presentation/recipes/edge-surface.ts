import type { PresentationRule } from '../resolver.js';

type Edge = 'left' | 'right' | 'top' | 'bottom' | 'inline-start' | 'inline-end';
const freeEdges = {
  left: { border: 'right', corners: ['top-right', 'bottom-right'] },
  right: { border: 'left', corners: ['top-left', 'bottom-left'] },
  top: { border: 'bottom', corners: ['bottom-left', 'bottom-right'] },
  bottom: { border: 'top', corners: ['top-left', 'top-right'] },
  'inline-start': { border: 'inline-end', corners: ['start-end', 'end-end'] },
  'inline-end': { border: 'inline-start', corners: ['start-start', 'end-start'] },
} as const;

/** Docked edges stay flush; every exposed corner uses the common surface radius. */
export function edgeSurfaceAppearance(
  selectors: Partial<Record<Edge, string>>,
): PresentationRule[] {
  return [
    { declarations: { border: '0', 'border-radius': '0' } },
    ...Object.entries(selectors).map(([edge, selector]) => {
      const { border, corners } = freeEdges[edge as Edge];
      return {
        selector,
        declarations: {
          [`border-${border}`]: 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
          ...Object.fromEntries(
            corners.map((corner) => [`border-${corner}-radius`, 'var(--tp-radius-lg)']),
          ),
        },
      };
    }),
  ];
}
