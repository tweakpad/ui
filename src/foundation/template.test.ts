import { describe, expect, it } from 'vitest';
import { fillTemplate } from './template.js';

describe('fillTemplate (NR-3)', () => {
  it('V-837: fills known placeholders and leaves unknown ones as written', () => {
    expect(fillTemplate('Remove {name} ({size})', { name: 'report.pdf', size: '2 MB' })).toBe(
      'Remove report.pdf (2 MB)',
    );
    expect(fillTemplate('{count} of {max} files {unknown}', { count: 3, max: 5 })).toBe(
      '3 of 5 files {unknown}',
    );
    expect(fillTemplate('No placeholders.', { count: 1 })).toBe('No placeholders.');
  });

  it('V-837: fills a repeated placeholder everywhere', () => {
    expect(fillTemplate('{name}: {name} again', { name: 'Ticket' })).toBe('Ticket: Ticket again');
  });

  it('V-837: writes numbers as text', () => {
    expect(
      fillTemplate('Zoom {percent}%, {count} items, {nothing}', {
        percent: 0,
        count: -2.5,
        nothing: Number.NaN,
      }),
    ).toBe('Zoom 0%, -2.5 items, NaN');
  });

  it('V-837: keeps the placeholder for an absent key or an undefined value', () => {
    expect(fillTemplate('File is larger than {maxSize}.', {})).toBe(
      'File is larger than {maxSize}.',
    );
    expect(fillTemplate('{name} added', { name: undefined })).toBe('{name} added');
    expect(fillTemplate('{empty}|{name}', { empty: '', name: 'a' })).toBe('|a');
  });

  it('keeps placeholders that only the prototype chain names', () => {
    expect(fillTemplate('{toString} {constructor} {__proto__}', {})).toBe(
      '{toString} {constructor} {__proto__}',
    );
    const inherited = Object.create({ name: 'inherited' }) as Record<string, string>;
    expect(fillTemplate('{name}', inherited)).toBe('{name}');
  });

  it('inserts values literally and reads only word-character names', () => {
    expect(fillTemplate('{name} selected.', { name: '$& and $1' })).toBe('$& and $1 selected.');
    expect(fillTemplate('{ name } {na-me} {} {{name}}', { name: 'x' })).toBe(
      '{ name } {na-me} {} {x}',
    );
  });
});
