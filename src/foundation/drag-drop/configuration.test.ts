import { describe, expect, it } from 'vitest';
import { validateConfiguration, mergeConfiguration } from './configuration.js';
import { Draggable } from './entities.js';
import type { ManagerOptions } from './types.js';

describe('configuration boundaries', () => {
  it.each([
    { sensors: [null] },
    { modifiers: [{}] },
    { feedback: 'unknown' },
    { overlayDisabled: 'yes' },
    { rootElement: {} },
    { overlay: {} },
    { keyboardTransition: { duration: -1 } },
    { dropAnimation: { easing: 3 } },
    { autoScroll: { acceleration: Infinity } },
    { autoScroll: { threshold: -1 } },
    { autoScroll: { threshold: { x: 0.2 } } },
    { accessibility: { debounce: NaN } },
    { accessibility: { id: 'two tokens' } },
    { instructions: {} },
    { announcements: { dragstart: 1 } },
  ])('rejects invalid options before acquisition: %j', (options) => {
    expect(() => validateConfiguration(options as unknown as ManagerOptions)).toThrow();
  });
  it('retains the last valid entity configuration on invalid updates', () => {
    const source = new Draggable({ id: 'a', feedback: 'none', keyboardTransition: null });
    source.update({ feedback: 'invalid' } as never);
    expect(source.feedbackOptions.feedback).toBe('none');
    expect(source.feedbackOptions.keyboardTransition).toBeNull();
    source.destroy();
  });
  it('merges declared partial objects and preserves replacement arrays and explicit disable', () => {
    const sensors: NonNullable<ManagerOptions['sensors']> = [];
    const result = mergeConfiguration(
      {
        autoScroll: { acceleration: 40, threshold: 0.1 },
        accessibility: { id: 'name', idPrefix: { description: 'read', announcement: 'say' } },
        dropAnimation: { duration: 300, easing: 'ease' },
      } as ManagerOptions,
      {
        autoScroll: { threshold: 0.3 },
        accessibility: { idPrefix: { description: 'help' } },
        dropAnimation: null,
        sensors,
      },
    );
    expect(result.autoScroll).toEqual({ acceleration: 40, threshold: 0.3 });
    expect(result.accessibility).toEqual({
      id: 'name',
      idPrefix: { description: 'help', announcement: 'say' },
    });
    expect(result.dropAnimation).toBeNull();
    expect(result.sensors).toBe(sensors);
  });
});
