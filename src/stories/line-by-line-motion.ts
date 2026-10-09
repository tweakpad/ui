import type { MotionPlayback, MotionRequest } from '../foundation/motion.js';

/**
 * An external driver for the Accordion and Collapsible `content` motion role: staggers the
 * paragraphs of the disclosed content while the component keeps measurement, presence and
 * selection.
 */
export function playLineByLine(request: MotionRequest): MotionPlayback {
  const lines = [...request.owner.querySelectorAll<HTMLElement>('p')];
  const exiting = request.phase === 'exit';
  const ordered = exiting ? [...lines].reverse() : lines;
  const easing = getComputedStyle(request.owner).getPropertyValue('--tp-easing-standard').trim();
  const animations = ordered.map((line, index) =>
    line.animate(
      exiting
        ? [
            { opacity: 1, transform: 'translateY(0)' },
            { opacity: 0, transform: 'translateY(calc(var(--tp-space-2) * -1))' },
          ]
        : [
            { opacity: 0, transform: 'translateY(var(--tp-space-3))' },
            { opacity: 1, transform: 'translateY(0)' },
          ],
      { duration: 380, delay: index * 100, easing, fill: 'both' },
    ),
  );
  const finished = Promise.all(animations.map((animation) => animation.finished)).then(() => {
    animations.forEach((animation) => animation.cancel());
  });
  return {
    finished,
    cancel: () => animations.forEach((animation) => animation.cancel()),
  };
}
