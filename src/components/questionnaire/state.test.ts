import { describe, it, expect, vi } from 'vitest';
import type { ReactiveController } from 'lit';
import type {
  QuestionnaireQuestion,
  QuestionnaireAnswers,
} from '../../foundation/questionnaire.js';
import type { TpValueChangeEvent } from '../../foundation/events.js';
import { QuestionnaireState } from './state.js';
function fixture(questions: QuestionnaireQuestion[], aggregate?: QuestionnaireAnswers) {
  let value = aggregate,
    item: string | undefined;
  const controllers = new Set<ReactiveController>();
  const host = Object.assign(new EventTarget(), {
    questions,
    choiceMode: 'single' as const,
    defaultValue: {},
    defaultItem: '',
    onValueChange: undefined as ((e: TpValueChangeEvent<QuestionnaireAnswers>) => void) | undefined,
    onItemChange: undefined as ((e: TpValueChangeEvent<string>) => void) | undefined,
    addController: (c: ReactiveController) => controllers.add(c),
    removeController: (c: ReactiveController) => controllers.delete(c),
    requestUpdate: vi.fn(),
    updateComplete: Promise.resolve(true),
  });
  const state = new QuestionnaireState(
    host,
    () => value,
    () => item,
    vi.fn(),
    vi.fn(),
  );
  return {
    host,
    state,
    controllers,
    setValue: (next: QuestionnaireAnswers) => {
      value = next;
      state.syncValue();
    },
    setItem: (next: string) => {
      item = next;
      state.syncItem();
    },
  };
}
describe('Questionnaire atomic ownership', () => {
  it('does not resurrect discarded choices when cardinality is narrowed then widened', () => {
    const q: QuestionnaireQuestion = {
      name: 'q',
      title: 'Q',
      kind: 'multiple',
      choices: [
        { value: 'a', label: 'A', defaultChecked: true },
        { value: 'b', label: 'B', defaultChecked: true },
      ],
    };
    const f = fixture([q]);
    f.state.initialize();
    expect(f.state.answers).toEqual({ q: ['a', 'b'] });
    q.kind = 'single';
    f.state.reconcile();
    expect(f.state.answers).toEqual({ q: 'a' });
    q.kind = 'multiple';
    f.state.reconcile();
    expect(f.state.answers).toEqual({ q: ['a'] });
  });
  it('rejects all skip lanes when one controlled answer rejects, then commits the acknowledged retry', () => {
    const q: QuestionnaireQuestion = {
      name: 'one',
      title: 'One',
      choices: [{ value: 'a', label: 'A', checked: true }],
    };
    const f = fixture([q, { name: 'two', title: 'Two' }]);
    f.setItem('one');
    f.state.initialize();
    const snapshots: unknown[] = [];
    f.host.onItemChange = (e) => {
      snapshots.push([f.state.item.value, f.state.answers, [...f.state.metadata.skipped]]);
      f.setItem(e.detail.value);
    };
    const meta = f.state.metadataCopy();
    meta.skipped.add('one');
    meta.reached = 1;
    expect(f.state.change({}, 'two', meta, 'click')).toBe(false);
    f.controllers.forEach((c) => c.hostUpdate?.());
    expect([f.state.item.value, f.state.answers, [...f.state.metadata.skipped]]).toEqual([
      'one',
      { one: 'a' },
      [],
    ]);
    q.choices![0]!.onCheckedChange = (e) => {
      q.choices![0]!.checked = e.detail.value;
    };
    expect(f.state.change({}, 'two', meta, 'click')).toBe(true);
    expect([f.state.item.value, f.state.answers, [...f.state.metadata.skipped]]).toEqual([
      'two',
      {},
      ['one'],
    ]);
    expect(snapshots).toEqual([
      ['one', { one: 'a' }, []],
      ['one', { one: 'a' }, []],
    ]);
  });
  it('consumes a controlled aggregate write when its proposal is vetoed', () => {
    const f = fixture([{ name: 'q', title: 'Q' }], { q: 'before' });
    f.state.initialize();
    f.host.onValueChange = (e) => {
      f.setValue(e.detail.value);
      e.preventDefault();
    };
    expect(f.state.change({ q: 'after' }, 'q', f.state.metadataCopy(), 'input')).toBe(false);
    f.state.reconcile();
    f.controllers.forEach((c) => c.hostUpdate?.());
    expect(f.state.answers).toEqual({ q: 'before' });
  });
  it('preserves an unselected freeform draft without serializing it as an answer', () => {
    const question: QuestionnaireQuestion = {
      name: 'q',
      title: 'Q',
      choices: [{ value: 'a', label: 'A' }],
      input: { label: 'Other' },
    };
    const f = fixture([question]);
    f.state.initialize();
    f.state.change({ q: 'draft' }, 'q', f.state.metadataCopy(), 'input', undefined, {
      input: { name: 'q', value: 'draft' },
    });
    f.state.change({ q: 'a' }, 'q', f.state.metadataCopy(), 'selection', undefined, {
      preserveDraft: true,
    });
    expect(f.state.answers).toEqual({ q: 'a' });
    expect(f.state.inputValue(question)).toBe('draft');
  });
});
