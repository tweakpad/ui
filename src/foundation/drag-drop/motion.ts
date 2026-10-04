import { prepareMotion, type MotionHandle, type MotionValue } from '../motion.js';
import type { Transition } from './types.js';

export function validateTransition(
  transition: Transition | null | undefined,
  owner?: Element,
): void {
  if (
    transition?.duration !== undefined &&
    (!Number.isFinite(transition.duration) || transition.duration < 0)
  )
    throw new RangeError('Drag transition duration must be finite and nonnegative.');
  if (
    transition?.easing !== undefined &&
    (typeof transition.easing !== 'string' ||
      !transition.easing.trim() ||
      (owner?.ownerDocument.defaultView?.CSS &&
        !owner.ownerDocument.defaultView.CSS.supports(
          'animation-timing-function',
          transition.easing,
        )))
  )
    throw new TypeError('Invalid drag transition timing function.');
}
export function dragMotion(
  owner: HTMLElement,
  target: HTMLElement,
  role: 'sort-displacement' | 'keyboard-feedback' | 'drop-settlement',
  keyframes: Keyframe[],
  transition: Transition,
  context: Record<string, MotionValue>,
): MotionHandle {
  validateTransition(transition, owner);
  const handle = prepareMotion(
    owner,
    target,
    {
      name: role,
      kind: 'state',
      phases: ['change'],
      completion: role === 'drop-settlement' ? 'blocking' : 'non-blocking',
    },
    { phase: 'change', context },
    {
      play() {
        const animation = target.animate(keyframes, {
          duration: transition.duration ?? 250,
          easing:
            transition.easing ??
            (role === 'drop-settlement' ? 'ease' : 'cubic-bezier(0.25, 1, 0.5, 1)'),
        });
        return {
          finished: animation.finished.then(() => undefined),
          cancel: () => animation.cancel(),
        };
      },
    },
  );
  handle.start();
  return handle;
}
