import { describe, expect, it } from 'vitest';
import type { TemplateResult } from 'lit';
import { commandItemText, projectCommandItem, renderCommandItemContent } from './item.js';

/** The static strings of a template and its nested templates, joined. */
function markup(value: unknown): string {
  if (Array.isArray(value)) return value.map(markup).join('');
  const template = value as TemplateResult | null;
  if (!template || typeof template !== 'object' || !('strings' in template)) return '';
  return template.strings.join('§') + template.values.map(markup).join('');
}

describe('command item projection', () => {
  it('takes the text from the item, a string label or the value', () => {
    expect(commandItemText({ value: 'a', text: 'Alpha', label: 'x' })).toBe('Alpha');
    expect(commandItemText({ value: 'a', label: 'Alpha' })).toBe('Alpha');
    expect(commandItemText({ value: 7 })).toBe('7');
  });

  it('renders the description as a part after the label', () => {
    const content = markup(
      renderCommandItemContent({ value: 'h1', description: 'Large section heading' }, 'Heading'),
    );
    expect(content).toContain('part="command-palette-item-description"');
    expect(content.indexOf('command-palette-item-description')).toBeGreaterThan(
      content.indexOf('<span'),
    );
    expect(markup(renderCommandItemContent({ value: 'h1' }, 'Heading'))).not.toContain(
      'item-description',
    );
  });

  it('makes the description the accessible description, keeping the label the name', () => {
    const projected = projectCommandItem({
      value: 'h1',
      label: 'Heading',
      description: 'Large section heading',
      partContract: { hostProperties: { 'data-kind': 'block' } },
    });
    expect(projected.text).toBe('Heading');
    expect(projected.partContract?.hostProperties).toEqual({
      'data-kind': 'block',
      'aria-description': 'Large section heading',
    });
  });

  it('projects in place and drops members the item no longer has', () => {
    const target = projectCommandItem({ value: 'a', label: 'A', description: 'First' });
    const again = projectCommandItem({ value: 'a', label: 'A' }, 'A', target);
    expect(again).toBe(target);
    expect('description' in again).toBe(false);
    expect(again.partContract).toBeUndefined();
  });
});
