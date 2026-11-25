import { LitElement } from 'lit';
import { describe, expect, it } from 'vitest';
import { attributeValue, propertyAttributes } from '../../../src/foundation/property-attributes.js';

class Sample extends LitElement {
  static override properties = {
    label: { type: String },
    defaultOpen: { type: Boolean, attribute: 'default-open' },
    items: { attribute: false },
    pending: { state: true },
  };
}

describe('property attributes', () => {
  it('names the attribute each reactive property reads, apart from internal state', () => {
    const attributes = propertyAttributes(Sample);
    expect(attributes.get('label')).toBe('label');
    expect(attributes.get('defaultOpen')).toBe('default-open');
    expect(attributes.get('items')).toBeNull();
    expect(attributes.has('pending')).toBe(false);
    expect(propertyAttributes(Sample)).toBe(attributes);
  });

  it('writes text, numbers and true, and leaves everything else to properties', () => {
    expect(attributeValue('Fruit')).toBe('Fruit');
    expect(attributeValue(3)).toBe('3');
    expect(attributeValue(true)).toBe('');
    for (const value of [false, null, undefined, Number.NaN, {}, [], () => {}])
      expect(attributeValue(value)).toBeUndefined();
  });
});
