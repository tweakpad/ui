/**
 * The action gate of every adapter (Widgets `uwg-te-req-engine-5`, `uwg-te-tab-actions`,
 * `uwg-te-req-evt-1`).
 */
import { describe, expect, it } from 'vitest';
import type { TextEditorAction } from '../../actions.js';
import { BASE_CAPABILITIES, type TextEditorCapability } from '../../capabilities.js';
import { htmlSource } from '../../content/html-source.test.js';
import {
  actionAllowed,
  actionCan,
  actionChange,
  contentChange,
  documentKinds,
  linkAllowed,
  planExecute,
  type TextEditorActionGate,
} from './actions.js';
import { textEditorContentGlue } from './content.js';
import { readHtml, TEST_URLS } from './test-helpers.test.js';

const document = readHtml('<p data-id="p1">a</p><img data-id="i1" src="https://x.example/a.png">');

function gate(overrides: Partial<TextEditorActionGate> = {}): TextEditorActionGate {
  return {
    capabilities: BASE_CAPABILITIES,
    editable: true,
    urls: TEST_URLS,
    kindOf: documentKinds(document),
    canUndo: true,
    canRedo: false,
    ...overrides,
  };
}

const glue = textEditorContentGlue(
  { urls: TEST_URLS, nodes: [], createId: () => 'id00000001' },
  { capabilities: BASE_CAPABILITIES, supportsNode: () => true },
  () => {
    throw new Error('No native JSON in this test.');
  },
  { parseHtml: htmlSource },
);

const typed: TextEditorAction = { type: 'text.insert', text: 'x' };
const select: TextEditorAction = {
  type: 'selection.set',
  selection: { kind: 'text', anchor: { block: 'p1', offset: 0 } },
};
const load: TextEditorAction = {
  type: 'content.set',
  content: 'b',
  format: 'text',
  history: 'reset',
};
const undo: TextEditorAction = { type: 'history.undo' };
const redo: TextEditorAction = { type: 'history.redo' };

describe('uwg-te-req-engine-5: whether an action is allowed', () => {
  it('needs a valid action and the capabilities it requires, a changed block’s kind included', () => {
    expect(actionAllowed({ type: 'text.insert' }, gate())).toBe(false);
    expect(actionAllowed({ type: 'nope' }, gate())).toBe(false);
    expect(actionAllowed(typed, gate())).toBe(true);
    const row: TextEditorAction = { type: 'table.insert-row', table: 't1', index: 0 };
    expect(actionAllowed(row, gate())).toBe(false);
    const tables = new Set<TextEditorCapability>([...BASE_CAPABILITIES, 'block.table']);
    expect(actionAllowed(row, gate({ capabilities: tables }))).toBe(true);
    const alt: TextEditorAction = { type: 'block.set-attrs', id: 'i1', attrs: { alt: 'a' } };
    expect(actionAllowed(alt, gate())).toBe(true);
    const noImages = new Set([...BASE_CAPABILITIES].filter((id) => id !== 'block.image'));
    expect(actionAllowed(alt, gate({ capabilities: noImages }))).toBe(false);
  });

  it('while read-only, refuses every action that changes the document but content.set', () => {
    const readOnly = gate({ editable: false });
    expect(actionAllowed(typed, readOnly)).toBe(false);
    expect(actionAllowed(undo, readOnly)).toBe(false);
    expect(actionAllowed(load, readOnly)).toBe(true);
    expect(actionAllowed(select, readOnly)).toBe(true);
  });

  it('link.set takes only destinations that the link protocols allow', () => {
    const link = (href: string): TextEditorAction => ({ type: 'link.set', href });
    expect(actionAllowed(link('https://a.example/'), gate())).toBe(true);
    expect(actionAllowed(link('tel:+15550100'), gate())).toBe(true);
    expect(actionAllowed(link('javascript:alert(1)'), gate())).toBe(false);
    expect(linkAllowed('mailto:a@b.example', TEST_URLS)).toBe(true);
    expect(linkAllowed('tel:+1', { links: ['https:'], images: [] })).toBe(false);
  });
});

describe('uwg-te-req-engine-5, uwg-te-tab-actions: how execute applies a list', () => {
  it('refuses an empty list, a history action with another action and any action not allowed', () => {
    expect(planExecute([], gate())).toEqual({ kind: 'refused' });
    expect(planExecute([undo, typed], gate())).toEqual({ kind: 'refused' });
    expect(planExecute([typed, { type: 'text.insert' }], gate())).toEqual({ kind: 'refused' });
    expect(planExecute([typed], gate({ editable: false }))).toEqual({ kind: 'refused' });
  });

  it('routes a sole content.set to setContent, also while read-only, and refuses it in a list', () => {
    expect(planExecute([load], gate())).toEqual({ kind: 'content', action: load });
    expect(planExecute([load], gate({ editable: false }))).toEqual({
      kind: 'content',
      action: load,
    });
    expect(planExecute([load, typed], gate())).toEqual({ kind: 'refused' });
    expect(planExecute([typed, load], gate())).toEqual({ kind: 'refused' });
  });

  it('routes undo and redo to the history when a step is available', () => {
    expect(planExecute([undo], gate())).toEqual({ kind: 'history', action: undo });
    expect(planExecute([redo], gate())).toEqual({ kind: 'refused' });
    expect(planExecute([redo], gate({ canRedo: true }))).toEqual({ kind: 'history', action: redo });
  });

  it('passes every other list to the engine as it is', () => {
    const list = [select, typed];
    const plan = planExecute(list, gate());
    expect(plan).toEqual({ kind: 'actions', actions: list });
  });

  it('records the change: cause action, the request’s reason and source, the first changing type', () => {
    const sourceEvent = new Event('keydown');
    expect(actionChange([select, typed], { reason: 'input', sourceEvent })).toEqual({
      cause: 'action',
      reason: 'input',
      sourceEvent,
      action: 'text.insert',
    });
    expect(actionChange([select], { reason: 'keyboard' })).toEqual({
      cause: 'action',
      reason: 'keyboard',
      sourceEvent: undefined,
      action: undefined,
    });
  });

  it('records a content load: cause content with the request’s reason, else engine', () => {
    expect(contentChange({ reason: 'imperative-action' })).toEqual({
      cause: 'content',
      reason: 'imperative-action',
    });
    expect(contentChange({})).toEqual({ cause: 'content', reason: 'engine' });
    expect(contentChange({ reason: undefined })).toEqual({ cause: 'content', reason: 'engine' });
  });
});

describe('uwg-te-req-engine-5: can', () => {
  it('equals execute: the gate, the history, a content read for content.set, else the engine’s dry run', () => {
    const asked: TextEditorAction[] = [];
    const dryRun = (action: TextEditorAction) => (asked.push(action), true);
    expect(actionCan(typed, gate(), glue, dryRun)).toBe(true);
    expect(actionCan(undo, gate(), glue, dryRun)).toBe(true);
    expect(actionCan(redo, gate(), glue, dryRun)).toBe(false);
    expect(actionCan(load, gate({ editable: false }), glue, dryRun)).toBe(true);
    const unreadable: TextEditorAction = {
      type: 'content.set',
      content: '{',
      format: 'json',
      history: 'reset',
    };
    expect(actionCan(unreadable, gate(), glue, dryRun)).toBe(false);
    expect(actionCan({ type: 'text.insert' }, gate(), glue, dryRun)).toBe(false);
    expect(asked).toEqual([typed]);
  });

  it('answers false when the dry run throws', () => {
    expect(
      actionCan(typed, gate(), glue, () => {
        throw new Error('engine failure');
      }),
    ).toBe(false);
  });
});

describe('uwg-te-tab-actions: block kinds of a portable document', () => {
  it('answer the kind of any block by identifier, or null', () => {
    const kinds = documentKinds(
      readHtml('<ul><li data-id="a"><p>a</p><ul><li data-id="b"><p>b</p></li></ul></li></ul>'),
    );
    expect(kinds('b')).toBe('list-bullet');
    expect(kinds('missing')).toBeNull();
  });
});
