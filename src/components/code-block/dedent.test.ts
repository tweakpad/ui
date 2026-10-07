import { describe, expect, it } from 'vitest';
import { dedentCode } from './dedent.js';

describe('code block source text', () => {
  it('drops surrounding blank lines and the indentation every line shares', () => {
    expect(dedentCode('\n    const a = 1;\n      if (a) {}\n    \n')).toBe(
      'const a = 1;\n  if (a) {}',
    );
  });

  it('keeps blank lines inside the code and normalizes line endings', () => {
    expect(dedentCode('  a\r\n\r\n  b')).toBe('a\n\nb');
  });

  it('returns an empty string for blank input', () => {
    expect(dedentCode('   \n  ')).toBe('');
  });
});
