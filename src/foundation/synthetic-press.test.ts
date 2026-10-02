import { describe, expect, it, vi } from 'vitest';
import { SyntheticPress } from './synthetic-press.js';

const key = (value: string) =>
  Object.assign(new Event('keydown', { cancelable: true }), {
    key: value,
    repeat: false,
  }) as KeyboardEvent;

describe('component-managed synthetic activation', () => {
  it('keeps native default prevention separate from the managed Enter and Space action', () => {
    const activate = vi.fn();
    const press = new SyntheticPress(activate, false);
    const enter = key('Enter');
    enter.preventDefault();
    press.keyDown(enter);
    const down = key(' '),
      up = key(' ');
    down.preventDefault();
    up.preventDefault();
    press.keyDown(down);
    press.keyUp(up);
    expect(activate).toHaveBeenCalledTimes(2);
  });

  it('lets an explicitly suppressed initiating handler discard an armed gesture', () => {
    const activate = vi.fn();
    const press = new SyntheticPress(activate, false);
    press.keyDown(key(' '));
    press.reset();
    press.keyUp(key(' '));
    expect(activate).not.toHaveBeenCalled();
  });
});
