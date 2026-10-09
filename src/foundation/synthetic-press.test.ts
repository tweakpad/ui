import { keyEvent } from './fakes.test.js';
import { describe, expect, it, vi } from 'vitest';
import { SyntheticPress } from './synthetic-press.js';

describe('component-managed synthetic activation', () => {
  it('keeps native default prevention separate from the managed Enter and Space action', () => {
    const activate = vi.fn();
    const press = new SyntheticPress(activate, false);
    const enter = keyEvent('Enter');
    enter.preventDefault();
    press.keyDown(enter);
    const down = keyEvent(' '),
      up = keyEvent(' ');
    down.preventDefault();
    up.preventDefault();
    press.keyDown(down);
    press.keyUp(up);
    expect(activate).toHaveBeenCalledTimes(2);
  });

  it('lets an explicitly suppressed initiating handler discard an armed gesture', () => {
    const activate = vi.fn();
    const press = new SyntheticPress(activate, false);
    press.keyDown(keyEvent(' '));
    press.reset();
    press.keyUp(keyEvent(' '));
    expect(activate).not.toHaveBeenCalled();
  });
});
