import { describe, expect, it } from 'vitest';
import {
  bindPart,
  componentHandlingPrevented,
  mergePartProperties,
  preventComponentHandling,
  renderPart,
} from './part.js';
import { nothing } from 'lit';
import { getDirectiveClass } from 'lit/directive-helpers.js';
import { PartType, type ElementPart } from 'lit/directive.js';

describe('ComponentPartContract behavior bundle', () => {
  it('binds a native host without an optional reference list and reconciles later writes', () => {
    const result = bindPart({ '.value': 'first' });
    const Directive = getDirectiveClass(result)!;
    const instance = new Directive({ type: PartType.ELEMENT });
    const element = { value: '' };
    const part = { element } as unknown as ElementPart;
    expect(instance.update(part, [{ '.value': 'first' }])).toBe(nothing);
    expect(element.value).toBe('first');
    expect(instance.update(part, [{ '.value': 'second' }])).toBe(nothing);
    expect(element.value).toBe('second');
  });
  it('protects owned semantics across attribute, property and boolean aliases', () => {
    const internal = {
      role: 'button',
      '.type': 'number',
      '.disabled': true,
      '.readOnly': true,
      tabIndex: 0,
      'aria-expanded': 'true',
      'aria-controls': 'owned-target',
      id: 'owned',
    };
    const merged = mergePartProperties(
      internal,
      {
        '.role': 'checkbox',
        type: 'text',
        disabled: false,
        '?disabled': false,
        readonly: false,
        tabindex: -1,
        '.ariaExpanded': false,
        '.ariaControlsElements': [],
        '.id': 'replacement',
        '.title': 'consumer',
        'aria-label': 'Unowned accessible name',
      },
      ['id'],
    );
    expect(merged).toEqual({
      ...internal,
      '.title': 'consumer',
      'aria-label': 'Unowned accessible name',
    });
  });
  it('protects semantic state while merging neutral properties, class and style', () => {
    const merged = mergePartProperties(
      {
        role: 'checkbox',
        'aria-checked': 'true',
        '.checked': true,
        title: 'internal',
        class: 'base',
        style: { color: 'red', padding: '2px' },
      },
      {
        role: 'button',
        'aria-checked': 'false',
        '.checked': false,
        title: 'consumer',
        class: 'custom',
        style: { color: 'blue' },
      },
    );
    expect(merged).toEqual({
      role: 'checkbox',
      'aria-checked': 'true',
      '.checked': true,
      title: 'consumer',
      class: 'base custom',
      style: { color: 'blue', padding: '2px' },
    });
  });
  it('runs consumer first and keeps component cancellation distinct from native default', () => {
    const calls: string[] = [];
    const merged = mergePartProperties(
      { '@click': () => calls.push('component') },
      {
        '@click': (event: Event) => {
          calls.push('consumer');
          event.preventDefault();
        },
      },
    );
    const event = new Event('click', { cancelable: true });
    (merged['@click'] as (event: Event) => void)(event);
    expect(calls).toEqual(['consumer', 'component']);
    expect(event.defaultPrevented).toBe(true);
    expect(componentHandlingPrevented(event)).toBe(false);
    const cancelled = mergePartProperties(
      { '@click': () => calls.push('unexpected') },
      { '@click': preventComponentHandling },
    );
    (cancelled['@click'] as (event: Event) => void)(new Event('click'));
    expect(calls).not.toContain('unexpected');
  });
  it('runs required native reconciliation when an initiating handler is suppressed', () => {
    let value = 'owner';
    let native = 'edited';
    const merged = mergePartProperties(
      {
        '@input': () => {
          value = native;
        },
      },
      { '@input': preventComponentHandling },
      [],
      {
        '@input': () => {
          native = value;
        },
      },
    );
    (merged['@input'] as (event: Event) => void)(new Event('input'));
    expect(value).toBe('owner');
    expect(native).toBe('owner');
  });
  it('does not resolve a disabled render channel and sends one state snapshot to delegates', () => {
    let calls = 0;
    expect(
      renderPart(
        'control',
        {},
        {
          renderDelegate: () => {
            calls++;
          },
        },
        { enabled: false },
      ),
    ).toBe(nothing);
    expect(calls).toBe(0);
    const state = { checked: true };
    const result = renderPart('control', state, {
      classHook: (s) => (s.checked ? 'checked' : ''),
      content: (s: typeof state) => (s.checked ? 'yes' : 'no'),
      renderDelegate: (context) => context,
    });
    expect(result).toMatchObject({
      state,
      properties: { part: 'control', class: 'checked' },
      content: 'yes',
    });
    expect((result as { state: unknown }).state).toBe(state);
  });
});
