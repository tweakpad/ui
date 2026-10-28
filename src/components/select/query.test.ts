import { describe, expect, it } from 'vitest';
import type { ChoiceModelRecord } from '../../foundation/choice-model.js';
import { applyForwardedNavigation, type ForwardedNavigationCollection } from './query.js';

function collection(records: Partial<ChoiceModelRecord>[], highlighted = -1) {
  const calls: string[] = [];
  const visible = records as ChoiceModelRecord[];
  const fake: ForwardedNavigationCollection = {
    visible,
    get highlighted() {
      return highlighted < 0 ? undefined : visible[highlighted];
    },
    move: (delta: number, loop?: boolean) => {
      calls.push(`move ${delta} ${String(loop)}`);
      return undefined;
    },
    boundary: (last?: boolean) => {
      calls.push(`boundary ${String(last)}`);
      return undefined;
    },
  };
  return { fake, calls };
}

describe('forwarded navigation keys (external query owner)', () => {
  it('moves the highlight with the arrows and jumps with Home and End', () => {
    const { fake, calls } = collection([{}, {}], 0);
    expect(applyForwardedNavigation(fake, 'ArrowDown', true)).toBe(true);
    expect(applyForwardedNavigation(fake, 'ArrowUp', false)).toBe(true);
    expect(applyForwardedNavigation(fake, 'Home', true)).toBe(true);
    expect(applyForwardedNavigation(fake, 'End', true)).toBe(true);
    expect(calls).toEqual(['move 1 true', 'move -1 false', 'boundary false', 'boundary true']);
  });

  it('starts at the first or the last item without a highlight', () => {
    const { fake, calls } = collection([{}, {}]);
    applyForwardedNavigation(fake, 'ArrowDown', true);
    applyForwardedNavigation(fake, 'ArrowUp', true);
    expect(calls).toEqual(['boundary false', 'boundary true']);
  });

  it('consumes nothing with no enabled item or for another key', () => {
    expect(applyForwardedNavigation(collection([]).fake, 'ArrowDown', true)).toBe(false);
    expect(applyForwardedNavigation(collection([{ disabled: true }]).fake, 'End', true)).toBe(
      false,
    );
    const { fake, calls } = collection([{}], 0);
    expect(applyForwardedNavigation(fake, 'Enter', true)).toBe(false);
    expect(applyForwardedNavigation(fake, 'a', true)).toBe(false);
    expect(calls).toEqual([]);
  });
});
