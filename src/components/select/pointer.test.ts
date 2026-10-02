import { describe, expect, it } from 'vitest';
import { SelectPointer } from './pointer.js';
describe('Select aligned popup pointer gestures', () => {
  it('suppresses opening release over either selected or neighboring items', () => {
    let now = 100;
    const gesture = new SelectPointer<string>(() => now);
    gesture.opened();
    expect(gesture.release('selected', true)).toBe(false);
    expect(gesture.release('neighbor', false)).toBe(false);
    expect(gesture.click('neighbor', { detail: 1 }, false)).toBe(false);
    now += 400;
    expect(gesture.release('selected', true)).toBe(true);
    expect(gesture.click('selected', { detail: 1 }, true)).toBe(false);
  });
  it('accepts item-origin clicks and intentional drag releases once', () => {
    const gesture = new SelectPointer<string>(() => 0);
    gesture.opened();
    gesture.down('a', 'mouse');
    expect(gesture.release('a', false)).toBe(false);
    expect(gesture.click('a', { detail: 1 }, true)).toBe(true);
    gesture.opened();
    gesture.move('mouse', 1, 9);
    expect(gesture.release('b', false)).toBe(true);
    expect(gesture.click('b', { detail: 1 }, true)).toBe(false);
  });
  it('keeps touch clicks and explicit virtual activation while cancellation clears the arm', () => {
    const gesture = new SelectPointer<string>(() => 0);
    gesture.opened();
    gesture.down('a', 'touch');
    expect(gesture.release('a', false)).toBe(false);
    expect(gesture.click('a', { detail: 1, pointerType: 'touch' }, false)).toBe(true);
    gesture.down('a', 'mouse');
    gesture.reset();
    expect(gesture.click('a', { detail: 1 }, true)).toBe(false);
    expect(gesture.click('a', { detail: 0 }, false)).toBe(false);
    expect(gesture.click('a', { detail: 0 }, true)).toBe(true);
    expect(gesture.click('a', { detail: 0, pointerType: '' }, false)).toBe(true);
  });
});
