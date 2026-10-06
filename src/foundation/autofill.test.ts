import { nothing } from 'lit';
import { describe, expect, it } from 'vitest';
import { autofillHint, autofillProperties } from './autofill.js';

describe('autofill opt-out', () => {
  it('passes the consumer autofill hint through when not opted out', () => {
    expect(autofillProperties(false, 'email')).toEqual({ autocomplete: 'email' });
    expect(autofillProperties(false, '', '.autocomplete')).toEqual({ '.autocomplete': '' });
  });

  it('turns autocomplete off and adds every autofiller hint when opted out', () => {
    expect(autofillProperties(true, 'email', '.autocomplete')).toEqual({
      '.autocomplete': 'off',
      'data-bwignore': 'true',
      'data-1p-ignore': '',
      'data-lpignore': 'true',
      'data-form-type': 'other',
    });
  });

  it('omits template hints unless opted out', () => {
    expect(autofillHint(false, 'data-bwignore')).toBe(nothing);
    expect(autofillHint(true, 'data-lpignore')).toBe('true');
  });
});
