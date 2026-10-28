import { describe, expect, it } from 'vitest';
import { FOLLOW_RANGE, PointerFollow } from './feedback.js';

/** An element whose `animate` records paused, cancelable animations. */
function animated() {
  const animations: {
    keyframes: Keyframe[];
    options: KeyframeAnimationOptions;
    paused: boolean;
    canceled: boolean;
    currentTime: number | null;
  }[] = [];
  const element = {
    animate(keyframes: Keyframe[], options: KeyframeAnimationOptions) {
      const animation = {
        keyframes,
        options,
        paused: false,
        canceled: false,
        currentTime: 0 as number | null,
        pause() {
          animation.paused = true;
        },
        cancel() {
          animation.canceled = true;
        },
      };
      animations.push(animation);
      return animation as unknown as Animation;
    },
  };
  return { element, animations };
}

describe('PointerFollow (C-449, V-587)', () => {
  it('places an overlay through two paused animations of its transform and translate, writing no style', () => {
    const { element, animations } = animated();
    const follow = new PointerFollow(element);
    expect(follow.active).toBe(false);
    follow.move({ x: 12, y: -40 });
    expect(follow.active).toBe(true);
    expect(animations.map(({ keyframes }) => keyframes)).toEqual([
      [
        { transform: `translateX(${-FOLLOW_RANGE}px)` },
        { transform: `translateX(${FOLLOW_RANGE}px)` },
      ],
      [{ translate: `0px ${-FOLLOW_RANGE}px` }, { translate: `0px ${FOLLOW_RANGE}px` }],
    ]);
    for (const animation of animations) {
      expect(animation.options).toEqual({
        duration: 2 * FOLLOW_RANGE,
        fill: 'both',
        easing: 'linear',
      });
      expect(animation.paused).toBe(true);
    }
    expect(animations.map(({ currentTime }) => currentTime)).toEqual([
      FOLLOW_RANGE + 12,
      FOLLOW_RANGE - 40,
    ]);
    // Later moves only set the current times.
    follow.move({ x: 0, y: 300 });
    expect(animations).toHaveLength(2);
    expect(animations.map(({ currentTime }) => currentTime)).toEqual([
      FOLLOW_RANGE,
      FOLLOW_RANGE + 300,
    ]);
    follow.stop();
    expect(follow.active).toBe(false);
    expect(animations.every(({ canceled }) => canceled)).toBe(true);
    // A new move after a stop starts again.
    follow.move({ x: 1, y: 1 });
    expect(animations).toHaveLength(4);
  });
});
