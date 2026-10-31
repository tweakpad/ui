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

/** An element double that logs every DOM write a binding makes. */
function recordingElement() {
  const writes: string[] = [];
  const attributes = new Map<string, string>();
  const listeners = new Map<string, EventListener>();
  const tokenList = (name: string) => {
    const read = () => (attributes.get(name) ?? '').split(/\s+/).filter(Boolean);
    const write = (list: string[]) => attributes.set(name, list.join(' '));
    return {
      get length() {
        return read().length;
      },
      contains: (token: string) => read().includes(token),
      add: (token: string) => {
        writes.push(`${name}+${token}`);
        write([...new Set([...read(), token])]);
      },
      remove: (token: string) => {
        writes.push(`${name}-${token}`);
        write(read().filter((value) => value !== token));
      },
    };
  };
  const styles = new Map<string, string>();
  const element = {
    part: tokenList('part'),
    classList: tokenList('class'),
    style: {
      getPropertyValue: (name: string) => styles.get(name) ?? '',
      setProperty: (name: string, value: string) => {
        writes.push(`style ${name}`);
        styles.set(name, value);
      },
      removeProperty: (name: string) => {
        writes.push(`style -${name}`);
        styles.delete(name);
      },
    },
    getAttribute: (name: string) => attributes.get(name) ?? null,
    hasAttribute: (name: string) => attributes.has(name),
    setAttribute: (name: string, value: string) => {
      writes.push(`set ${name}`);
      attributes.set(name, value);
    },
    removeAttribute: (name: string) => {
      writes.push(`remove ${name}`);
      attributes.delete(name);
    },
    addEventListener: (name: string, listener: EventListener) => {
      writes.push(`listen ${name}`);
      listeners.set(name, listener);
    },
    removeEventListener: (name: string) => {
      writes.push(`unlisten ${name}`);
      listeners.delete(name);
    },
    dispatch: (name: string) => listeners.get(name)?.(new Event(name)),
  };
  return { element, writes, attributes };
}
function binding(element: object) {
  const Directive = getDirectiveClass(bindPart({}))!;
  const instance = new Directive({ type: PartType.ELEMENT });
  const part = { element } as unknown as ElementPart;
  return (properties: Record<string, unknown>) => instance.update(part, [properties]);
}

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
  it('writes nothing when a render repeats its values', () => {
    const { element, writes } = recordingElement();
    const render = binding(element);
    const properties = (handler: () => void) => ({
      part: 'slider-range slider-range-orientation-horizontal',
      class: 'range',
      role: 'presentation',
      'aria-hidden': true,
      'data-valid': undefined,
      style: { insetInlineStart: '20%', '--fill': '0.2' },
      '@click': handler,
    });
    render(properties(() => {}));
    writes.length = 0;
    render(properties(() => {}));
    expect(writes).toEqual([]);
  });
  it('keeps tokens added by others across renders and reconciles its own', () => {
    const { element, attributes } = recordingElement();
    const render = binding(element);
    render({ part: 'slider-range', class: 'range' });
    // The presentation layer binds another part name and applies a class hook.
    element.part.add('bound');
    element.classList.add('hook');
    render({ part: 'slider-range', class: 'range wide' });
    expect(attributes.get('part')).toBe('slider-range bound');
    expect(attributes.get('class')).toBe('range hook wide');
    render({ part: 'slider-range', class: 'range' });
    expect(attributes.get('class')).toBe('range hook');
    render({});
    expect(attributes.get('part')).toBe('bound');
    expect(attributes.get('class')).toBe('hook');
  });
  it('removes an emptied token attribute and attributes set to nothing', () => {
    const { element, attributes } = recordingElement();
    const render = binding(element);
    render({ class: 'range', title: 'Gain', hidden: true });
    expect(attributes.get('hidden')).toBe('');
    render({ class: '', title: nothing, hidden: false });
    expect([...attributes.keys()]).toEqual([]);
  });
  it('does not reassign an array property whose items are unchanged', () => {
    let assignments = 0;
    let controls: unknown[] | null = null;
    const element = {
      get ariaControlsElements() {
        return controls;
      },
      set ariaControlsElements(value: unknown[] | null) {
        assignments++;
        controls = value && [...value];
      },
    };
    const render = binding(element);
    const target = {};
    render({ '.ariaControlsElements': [] });
    render({ '.ariaControlsElements': [] });
    expect(assignments).toBe(1);
    render({ '.ariaControlsElements': [target] });
    render({ '.ariaControlsElements': [target] });
    expect(assignments).toBe(2);
  });
  it('calls the latest handler through one listener', () => {
    const { element, writes } = recordingElement();
    const render = binding(element);
    const calls: string[] = [];
    render({ '@click': () => calls.push('first') });
    element.dispatch('click');
    render({ '@click': () => calls.push('second') });
    element.dispatch('click');
    expect(calls).toEqual(['first', 'second']);
    expect(writes.filter((write) => write.includes('listen'))).toEqual(['listen click']);
    render({});
    expect(writes.at(-1)).toBe('unlisten click');
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
