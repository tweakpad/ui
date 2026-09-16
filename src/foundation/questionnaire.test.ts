import { describe, expect, it } from 'vitest';
import {
  normalizeQuestionnaireAnswer,
  questionnaireAnswered,
  questionnaireDefaultAnswers,
  questionnaireRemovalFallback,
  questionnaireStatus,
  sameQuestionnaireAnswers,
} from './questionnaire.js';

const questions = [
  {
    name: 'role',
    title: 'Role',
    kind: 'single' as const,
    choices: [
      { value: 'design', label: 'Design', defaultChecked: true },
      { value: 'engineering', label: 'Engineering' },
    ],
  },
  {
    name: 'tools',
    title: 'Tools',
    kind: 'multiple' as const,
    choices: [
      { value: 'editor', label: 'Editor', defaultChecked: true },
      { value: 'terminal', label: 'Terminal', defaultChecked: true },
    ],
  },
];

describe('questionnaire state model', () => {
  it('derives defaults from questions and aggregate overrides', () => {
    expect(questionnaireDefaultAnswers(questions, { role: 'engineering' })).toEqual({
      role: 'engineering',
      tools: ['editor', 'terminal'],
    });
  });

  it('normalizes multiple answers to unique declared values', () => {
    expect(
      normalizeQuestionnaireAnswer(questions[1]!, ['terminal', 'unknown', 'terminal']),
    ).toEqual(['terminal']);
  });

  it('keeps answered, validity-independent presence, and skipped status distinct', () => {
    expect(questionnaireAnswered('   ')).toBe(false);
    expect(questionnaireAnswered('invalid but present')).toBe(true);
    expect(questionnaireStatus(undefined, true)).toBe('skipped');
    expect(questionnaireStatus('answer', true)).toBe('answered');
  });

  it('compares array-valued aggregate answers structurally', () => {
    expect(sameQuestionnaireAnswers({ tools: ['editor'] }, { tools: ['editor'] })).toBe(true);
    expect(sameQuestionnaireAnswers({ tools: ['editor'] }, { tools: ['terminal'] })).toBe(false);
  });

  it('selects the next item and then the previous item after active removal', () => {
    expect(questionnaireRemovalFallback(['one', 'two', 'three'], ['one', 'three'], 'two')).toBe(
      'three',
    );
    expect(questionnaireRemovalFallback(['one', 'two'], ['one'], 'two')).toBe('one');
    expect(questionnaireRemovalFallback(['one'], [], 'one')).toBe('');
  });
});
