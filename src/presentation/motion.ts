export interface MotionDefinition {
  duration: number;
  easing: string;
  enter?: readonly Keyframe[];
  exit?: readonly Keyframe[];
  reducedMotion?: 'instant' | 'preserve-essential';
}

export function runMotion(
  element: Element,
  phase: 'enter' | 'exit',
  definition: MotionDefinition,
  signal?: AbortSignal,
): Animation | null {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const keyframes = phase === 'enter' ? definition.enter : definition.exit;
  if (!keyframes?.length) return null;
  const animation = element.animate([...keyframes], {
    duration:
      reduced && definition.reducedMotion !== 'preserve-essential'
        ? 0
        : Math.max(0, definition.duration),
    easing: definition.easing,
    fill: 'both',
  });
  signal?.addEventListener('abort', () => animation.cancel(), { once: true });
  return animation;
}

export function transitionOrigin(x: number, y: number): string {
  return `${Math.round(x * 1000) / 1000}px ${Math.round(y * 1000) / 1000}px`;
}
