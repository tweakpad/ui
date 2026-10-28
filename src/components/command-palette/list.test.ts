import { describe, expect, it } from 'vitest';
import type { TemplateResult } from 'lit';
import type { ChoiceModelRecord } from '../../foundation/choice-model.js';
import { projectCommandItem } from './item.js';
import { TpCommandList } from './list.js';

/** The static strings of a template and its nested templates, with string values, joined. */
function markup(value: unknown): string {
  if (Array.isArray(value)) return value.map(markup).join('');
  if (typeof value === 'string') return value;
  const template = value as TemplateResult | null;
  if (!template || typeof template !== 'object' || !('strings' in template)) return '';
  return template.strings.join('§') + template.values.map(markup).join('');
}

type OptionContent = (
  record: ChoiceModelRecord,
  ranges: readonly (readonly [number, number])[] | undefined,
) => unknown;

describe('command list options', () => {
  const content = TpCommandList.prototype[
    'optionContent' as keyof TpCommandList
  ] as unknown as OptionContent;
  const item = projectCommandItem({
    value: 'heading-1',
    label: 'Heading 1',
    description: 'Largest title, for the main parts',
    shortcut: '⌥⌘1',
  });
  const record = {
    value: item.value,
    label: item.label,
    text: 'Heading 1',
    option: item,
  } as unknown as ChoiceModelRecord;

  it('marks the matched ranges in the label of a command item, never in its description', () => {
    const marked = markup(content.call({}, record, [[0, 3]]));
    expect(marked).toContain('command-palette-match');
    expect(marked).toContain('Hea');
    expect(marked).toContain('command-palette-item-description');
    expect(marked.indexOf('command-palette-match')).toBeLessThan(
      marked.indexOf('command-palette-item-description'),
    );
  });

  it('renders the row as it is without ranges', () => {
    expect(content.call({}, record, [])).toBe(item.label);
    expect(content.call({}, record, undefined)).toBe(item.label);
  });
});
