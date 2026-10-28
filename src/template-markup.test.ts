/**
 * Shared reader of the markup that a Lit template stands for (node environment), so that the
 * render tests of components and widgets flatten their templates by one rule. A `*.test.ts`
 * module stays out of the build; the suite at the end keeps the file from counting as an empty one.
 */
import { html, nothing } from 'lit';
import { describe, expect, it } from 'vitest';

/**
 * A template as markup: values in place, arrays joined, `nothing`, `undefined` and `null` empty,
 * a function (an event listener) as `[function]`, and whitespace inside tags collapsed.
 */
export const templateMarkup = (value: unknown): string => {
  const flat = (part: unknown): string => {
    if (part === nothing || part === undefined || part === null) return '';
    if (Array.isArray(part)) return part.map(flat).join('');
    if (typeof part === 'function') return '[function]';
    if (typeof part === 'object' && 'strings' in part && 'values' in part) {
      const { strings, values } = part as { strings: readonly string[]; values: unknown[] };
      return strings.reduce(
        (out, text, index) => out + text + (index < values.length ? flat(values[index]) : ''),
        '',
      );
    }
    return String(part);
  };
  return flat(value).replace(/<([^>]*)>/g, (_tag, inner: string) => {
    return `<${inner.replace(/\s+/g, ' ').trim()}>`;
  });
};

describe('template markup', () => {
  it('puts values in place, joins arrays and leaves empty values out', () => {
    const items = ['a', 'b'].map((item) => html`<b>${item}</b>`);
    const line = html`<span data-count=${2}>${items}${nothing}${undefined}${null}</span>`;
    expect(templateMarkup(line)).toBe('<span data-count=2><b>a</b><b>b</b></span>');
    expect([templateMarkup(nothing), templateMarkup('text'), templateMarkup(3)]).toEqual([
      '',
      'text',
      '3',
    ]);
  });

  it('collapses whitespace inside tags and keeps it between them', () => {
    // The authored line breaks and spaces are the case under test.
    // prettier-ignore
    const toggle = html`<tp-toggle
      class="presets-toggle"
      size=${'icon-sm'}
    >  On  </tp-toggle>`;
    expect(templateMarkup(toggle)).toBe(
      '<tp-toggle class="presets-toggle" size=icon-sm>  On  </tp-toggle>',
    );
  });

  it('prints a function value as a marker, not as its source', () => {
    const press = () => 'pressed';
    expect(templateMarkup(html`<button @click=${press}>Go</button>`)).toBe(
      '<button @click=[function]>Go</button>',
    );
  });
});
