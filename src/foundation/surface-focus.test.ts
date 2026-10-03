import { describe, expect, it } from 'vitest';
import { resolveSurfaceFocus, surfaceInteraction } from './surface-focus.js';

describe('surface focus interaction classification', () => {
  it.each([
    ['keydown', {}, 'keyboard'],
    ['keyup', {}, 'keyboard'],
    ['click', { detail: 0 }, 'keyboard'],
    ['click', { detail: 0, pointerType: '' }, 'keyboard'],
    ['click', { detail: 1 }, 'mouse'],
    ['click', { detail: 0, pointerType: 'mouse' }, 'mouse'],
    ['pointerup', { pointerType: 'touch' }, 'touch'],
    ['click', { detail: 0, pointerType: 'touch' }, 'touch'],
    ['pointerup', { pointerType: 'pen' }, 'pen'],
  ] as const)(
    'classifies %s %j as %s without changing the original event',
    (type, properties, expected) => {
      const event = Object.assign(new Event(type), properties);
      const originalType = event.type;
      expect(surfaceInteraction(event)).toBe(expected);
      expect(event.type).toBe(originalType);
      let actual: unknown;
      resolveSurfaceFocus(
        (interaction) => {
          actual = interaction;
          return false;
        },
        {
          event,
          defaultTarget: () => null,
          trigger: null,
          first: null,
          popup: null,
          previous: null,
        },
      );
      expect(actual).toBe(expected);
    },
  );
  it('reports programmatic focus without an initiating event as empty', () => {
    expect(surfaceInteraction()).toBe('');
  });
});
