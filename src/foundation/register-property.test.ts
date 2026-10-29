import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerProperty } from './register-property.js';

const definition = { name: '--_tp-test', syntax: '<number>', inherits: false, initialValue: '0' };

describe('registerProperty', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('registers the property in the running document', () => {
    const register = vi.fn();
    vi.stubGlobal('CSS', { registerProperty: register });
    registerProperty(definition);
    expect(register).toHaveBeenCalledWith(definition);
  });

  it('keeps the first registration of a name instead of throwing', () => {
    vi.stubGlobal('CSS', {
      registerProperty: () => {
        throw new DOMException('already registered', 'InvalidModificationError');
      },
    });
    expect(() => registerProperty(definition)).not.toThrow();
  });

  it('does nothing where the engine cannot register properties', () => {
    vi.stubGlobal('CSS', {});
    expect(() => registerProperty(definition)).not.toThrow();
    vi.stubGlobal('CSS', undefined);
    expect(() => registerProperty(definition)).not.toThrow();
  });
});
