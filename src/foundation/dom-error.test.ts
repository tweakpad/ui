import { afterEach, describe, expect, it, vi } from 'vitest';
import { domError } from './dom-error.js';

afterEach(() => vi.unstubAllGlobals());

describe('domError (NR-4)', () => {
  it('V-838: returns a DOMException with the name and message', () => {
    const error = domError('NotFoundError', 'No pin has the value "missing".');
    expect(error).toBeInstanceOf(DOMException);
    expect(error).toMatchObject({
      name: 'NotFoundError',
      message: 'No pin has the value "missing".',
    });
  });

  it('V-838: falls back to an Error with that name when DOMException throws', () => {
    const Native = globalThis.DOMException;
    vi.stubGlobal(
      'DOMException',
      class {
        constructor() {
          throw new TypeError('DOMException is not constructible here.');
        }
      },
    );
    const error = domError('InvalidStateError', 'The editor is not ready.');
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(Native);
    expect(error).toMatchObject({ name: 'InvalidStateError', message: 'The editor is not ready.' });
  });

  it('V-838: falls back to an Error with that name when DOMException is missing', () => {
    vi.stubGlobal('DOMException', undefined);
    const error = domError('NotSupportedError', 'The map is disabled.');
    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({ name: 'NotSupportedError', message: 'The map is disabled.' });
  });
});
