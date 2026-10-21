import { describe, expect, it, vi } from 'vitest';
import { preserveFocusOnPress } from './press.js';

function press(button: number, cancelable = true): PointerEvent {
  return Object.assign(new Event('pointerdown', { cancelable }), {
    button,
    pointerType: 'mouse',
  }) as unknown as PointerEvent;
}

describe('preserveFocusOnPress', () => {
  it('prevents a primary-button press and reports it without stopping it (`uwg-te-tb-req-press`)', () => {
    const event = press(0);
    const stop = vi.spyOn(event, 'stopPropagation');
    const stopImmediate = vi.spyOn(event, 'stopImmediatePropagation');
    expect(preserveFocusOnPress(event)).toBe(true);
    expect(event.defaultPrevented).toBe(true);
    expect(stop).not.toHaveBeenCalled();
    expect(stopImmediate).not.toHaveBeenCalled();
  });

  it('ignores secondary and middle presses, one already prevented and one that cannot be cancelled (`uwg-te-tb-req-press`)', () => {
    for (const button of [1, 2]) {
      const event = press(button);
      expect(preserveFocusOnPress(event), `button ${button}`).toBe(false);
      expect(event.defaultPrevented).toBe(false);
    }
    const prevented = press(0);
    prevented.preventDefault();
    expect(preserveFocusOnPress(prevented)).toBe(false);
    const fixed = press(0, false);
    expect(preserveFocusOnPress(fixed)).toBe(false);
    expect(fixed.defaultPrevented).toBe(false);
  });
});
