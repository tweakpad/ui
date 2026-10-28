/**
 * Notifications of the Lexical adapter (Widgets `uwg-te-tab-engine` r3, `uwg-te-req-engine-6`):
 * each committed update notifies once, and nothing after the mount's signal aborted.
 */
import * as lexical from 'lexical';
import { describe, expect, it } from 'vitest';
import type { TextEditorAction } from '../../actions.js';
import { headlessLexical, type Headless } from './lexical-stubs.test.js';

const run = (
  headless: Headless,
  actions: readonly TextEditorAction[],
  focus: boolean | undefined = false,
) => headless.instance.execute(actions, { reason: 'imperative-action', focus });

describe('uwg-te-tab-engine r3: nothing is notified after the mount’s signal aborted', () => {
  it('typing, actions, editability and content loads notify nothing after abort', () => {
    const headless = headlessLexical({ html: '<p data-id="p1">calm</p>' });
    run(headless, [
      { type: 'selection.set', selection: { kind: 'text', anchor: { block: 'p1', offset: 4 } } },
    ]);
    headless.recording.controller.abort();
    headless.recording.clear();
    headless.editor.dispatchCommand(lexical.CONTROLLED_TEXT_INSERTION_COMMAND, 'x');
    headless.editor.read(() => undefined);
    run(headless, [{ type: 'text.insert', text: 'y' }]);
    headless.instance.setEditable(false);
    headless.instance.setContent('<p>new</p>', 'html');
    expect(headless.recording.records).toEqual([]);
  });
});

describe('uwg-te-tab-engine r3, uwg-te-req-engine-6: an undo or redo notifies content once', () => {
  /** Types text as the engine's controlled insertion does, one character per update. */
  const type = (headless: Headless, text: string) => {
    for (const character of text) {
      headless.editor.dispatchCommand(lexical.CONTROLLED_TEXT_INSERTION_COMMAND, character);
      headless.editor.read(() => undefined);
    }
  };
  const edits: readonly [string, (headless: Headless) => void][] = [
    ['text.insert', (headless) => void run(headless, [{ type: 'text.insert', text: 'Z' }])],
    ['typing at a caret', (headless) => type(headless, 'Z')],
    [
      'typing over a range',
      (headless) => {
        const anchor = { block: 'p1', offset: 0 };
        run(headless, [
          {
            type: 'selection.set',
            selection: { kind: 'text', anchor, head: { ...anchor, offset: 4 } },
          },
        ]);
        type(headless, 'Z');
      },
    ],
    [
      'Enter',
      (headless) => {
        headless.editor.dispatchCommand(lexical.INSERT_PARAGRAPH_COMMAND, undefined);
        headless.editor.read(() => undefined);
      },
    ],
    [
      'a mark toggled over a range',
      (headless) => {
        const anchor = { block: 'p1', offset: 0 };
        run(headless, [
          {
            type: 'selection.set',
            selection: { kind: 'text', anchor, head: { ...anchor, offset: 4 } },
          },
          { type: 'mark.toggle', mark: 'bold' },
        ]);
      },
    ],
  ];

  it.each(edits)('after %s, reporting the restored document and selection meanwhile', (_, edit) => {
    const headless = headlessLexical({ html: '<p data-id="p1">calm sea</p>' });
    run(headless, [
      { type: 'selection.set', selection: { kind: 'text', anchor: { block: 'p1', offset: 4 } } },
    ]);
    const snapshot = () => ({
      html: headless.instance.getContent('html'),
      state: headless.instance.getState(),
    });
    const before = snapshot().html;
    edit(headless);
    const after = snapshot().html;
    for (const [action, html] of [
      ['history.undo', before],
      ['history.redo', after],
    ] as const) {
      headless.recording.clear();
      // What the state reports while each notification runs.
      const seen: { type: string; at: ReturnType<typeof snapshot> }[] = [];
      const { records } = headless.recording;
      const push = records.push.bind(records);
      records.push = (...items) => {
        for (const item of items) seen.push({ type: item.type, at: snapshot() });
        return push(...items);
      };
      try {
        expect(headless.instance.execute([{ type: action }], { reason: 'hotkey' })).toBe(true);
      } finally {
        records.push = push;
      }
      expect(seen.map(({ type }) => type)).toEqual(['content']);
      expect(seen[0]?.at).toEqual(snapshot());
      expect(seen[0]?.at.html).toBe(html);
    }
  });
});
