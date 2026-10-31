import { describe, expect, it } from 'vitest';
import { nothing } from 'lit';
import {
  applyMarkers,
  markerName,
  markerPresent,
  markerText,
  stateMarkers,
} from './state-markers.js';

describe('markerName', () => {
  it('kebab-cases state keys and keeps the canonical readonly spelling', () => {
    expect(markerName('focusVisible')).toBe('data-focus-visible');
    expect(markerName('readOnly')).toBe('data-readonly');
    expect(markerName('disabled')).toBe('data-disabled');
    expect(markerName('dropTarget')).toBe('data-drop-target');
  });
});

describe('stateMarkers', () => {
  it('emits every requested boolean key so the part owns it, true only for strict true', () => {
    const state = { disabled: true, invalid: false, valid: null, focused: undefined };
    expect(stateMarkers(state, ['disabled', 'invalid', 'valid', 'focused'])).toEqual({
      'data-disabled': true,
      'data-invalid': false,
      'data-valid': false,
      'data-focused': false,
    });
  });
  it('publishes the complement of paired boolean states', () => {
    expect(stateMarkers({ checked: false, open: true }, ['checked', 'open'])).toEqual({
      'data-checked': false,
      'data-unchecked': true,
      'data-open': true,
      'data-closed': false,
    });
    expect(stateMarkers({ selected: true, pressed: false }, ['selected', 'pressed'])).toEqual({
      'data-selected': true,
      'data-unselected': false,
      'data-pressed': false,
      'data-unpressed': true,
    });
  });
  it('omits the complement when the paired state is not a boolean', () => {
    // A non-checkable menu item has neither checked nor unchecked.
    expect(stateMarkers({ checked: undefined }, ['checked'])).toEqual({ 'data-checked': false });
  });
  it('passes enumeration values through unchanged', () => {
    expect(
      stateMarkers(
        { size: 'sm', orientation: 'vertical', index: 0 },
        [],
        ['size', 'orientation', 'index'],
      ),
    ).toEqual({ 'data-size': 'sm', 'data-orientation': 'vertical', 'data-index': 0 });
  });
  it('lets a literal spread after the result override a derived marker', () => {
    const markers: Record<string, unknown> = {
      ...stateMarkers({ checked: false, indeterminate: true }, ['checked', 'indeterminate']),
      'data-unchecked': false,
    };
    expect(markers).toEqual({
      'data-checked': false,
      'data-unchecked': false,
      'data-indeterminate': true,
    });
  });
});

describe('marker values', () => {
  it('treats false, null, undefined and nothing as absent', () => {
    for (const value of [false, null, undefined, nothing]) expect(markerPresent(value)).toBe(false);
    for (const value of [true, '', 'sm', 0]) expect(markerPresent(value)).toBe(true);
  });
  it('writes an empty string for a boolean marker and the text of any other value', () => {
    expect(markerText(true)).toBe('');
    expect(markerText('sm')).toBe('sm');
    expect(markerText(0)).toBe('0');
  });
});

describe('applyMarkers', () => {
  function element() {
    const attributes = new Map<string, string>();
    const writes: string[] = [];
    return {
      attributes,
      writes,
      getAttribute: (name: string) => attributes.get(name) ?? null,
      setAttribute: (name: string, value: string) => {
        writes.push(name);
        attributes.set(name, value);
      },
      removeAttribute: (name: string) => attributes.delete(name),
    } as unknown as Element & { attributes: Map<string, string>; writes: string[] };
  }
  it('writes present markers, removes absent ones and prunes stale names', () => {
    const host = element();
    let previous = applyMarkers(host, { 'data-open': true, 'data-size': 'sm', 'data-index': 0 });
    expect([...host.attributes]).toEqual([
      ['data-open', ''],
      ['data-size', 'sm'],
      ['data-index', '0'],
    ]);
    previous = applyMarkers(host, { 'data-open': false, 'data-size': null }, previous);
    expect([...host.attributes]).toEqual([]);
    expect([...previous]).toEqual(['data-open', 'data-size']);
  });
  it('does not rewrite a marker whose text is unchanged', () => {
    const host = element();
    const previous = applyMarkers(host, { 'data-valid': true, 'data-index': 1 });
    host.writes.length = 0;
    applyMarkers(host, { 'data-valid': true, 'data-index': 2 }, previous);
    expect(host.writes).toEqual(['data-index']);
  });
});
