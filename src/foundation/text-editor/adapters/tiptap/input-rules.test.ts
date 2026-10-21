import { describe, expect, it } from 'vitest';
import {
  applyAutolink,
  autolinkAtCaret,
  applyTypedRules,
  TIPTAP_INPUT_RULES,
} from './input-rules.js';
import { backspaceKey, enterKey } from './keymap.js';
import type { TiptapCommandsLike } from './modules.js';
import { freshIds } from '../shared/test-helpers.test.js';
import {
  htmlOf,
  keyedTiptap,
  pluginName,
  ruleView,
  selectIn,
  TIPTAP_MODULES,
} from './tiptap-stubs.test.js';
import type { TestView } from './tiptap-stubs.test.js';
import { portableOf, type TiptapDispatchViewLike, type TiptapEnv } from './work.js';

type TextInput = (view: TiptapDispatchViewLike, from: number, to: number, text: string) => boolean;

/** Types text one character at a time through the input-rule plugin, as the engine's view does. */
function type(view: TestView, text: string): void {
  const plugin = view.state.plugins.find((entry) => pluginName(entry) === TIPTAP_INPUT_RULES)!;
  const handle = (plugin.spec as { props: { handleTextInput: TextInput } }).props.handleTextInput;
  for (const character of text) {
    const { from, to } = view.state.selection;
    if (!handle(view, from, to, character))
      view.dispatch(view.state.tr.insertText(character, from, to));
  }
}

const paragraph = (text = '', id = 'p1') => ({
  type: 'paragraph' as const,
  id,
  content: text ? [{ type: 'text' as const, text }] : [],
});

/** The portable blocks of the view's document. */
const blocks = (env: TiptapEnv, view: TestView) => portableOf(view.state.doc, env).blocks;

const undo = (view: TestView) => TIPTAP_MODULES.history.undo(view.state, (tr) => view.dispatch(tr));

describe('Tiptap input rules (uwg-te-req-key-7, uwg-te-tab-input-rules)', () => {
  it('V-279: the block rules of the table turn a top-level paragraph into their block', () => {
    const cases: [string, unknown][] = [
      ['# ', { type: 'heading', level: 1 }],
      ['###### ', { type: 'heading', level: 6 }],
      ['- ', { type: 'list-bullet' }],
      ['* ', { type: 'list-bullet' }],
      ['+ ', { type: 'list-bullet' }],
      ['3. ', { type: 'list-ordered', start: 3 }],
      ['[ ] ', { type: 'list-task', checked: false }],
      ['[x] ', { type: 'list-task', checked: true }],
      ['> ', { type: 'quote' }],
      ['```js ', { type: 'code', language: 'js', text: '' }],
      ['``` ', { type: 'code', text: '' }],
    ];
    for (const [typed, expected] of cases) {
      const { view, env } = ruleView({ blocks: [paragraph()] });
      type(view, typed);
      const [first] = blocks(env, view);
      expect(first, typed).toMatchObject({ ...(expected as object), id: 'p1' });
      expect(first, typed).not.toHaveProperty('content', [{ type: 'text', text: typed }]);
    }
  });

  it('V-279: `---` completes on its third hyphen in an empty paragraph, as a divider', () => {
    const { view, env } = ruleView({ blocks: [paragraph(), paragraph('after', 'p2')] });
    type(view, '---');
    expect(blocks(env, view).map((block) => [block.type, block.id])).toEqual([
      ['divider', 'p1'],
      ['paragraph', 'p2'],
    ]);
    expect(view.state.selection.$head.parent.textContent).toBe('after');
  });

  it('V-279: no rule outside the table: no `~~~` fence, `***` or `___` divider, `[]` task or `***x***`', () => {
    for (const typed of [
      '~~~ ',
      '*** ',
      '___ ',
      '[] ',
      '[X] ',
      '```Python ',
      '####### ',
      '***x***',
    ]) {
      const { view, env } = ruleView({ blocks: [paragraph()] });
      type(view, typed);
      expect(blocks(env, view), typed).toEqual([paragraph(typed)]);
    }
  });

  it('V-279: block rules apply only at the start of a top-level paragraph, never in code or cells', () => {
    const heading = { type: 'heading' as const, id: 'h1', level: 2 as const, content: [] };
    const item = { type: 'list-bullet' as const, id: 'i1', content: [], children: [] };
    const code = { type: 'code' as const, id: 'c1', text: '' };
    for (const block of [heading, item, code]) {
      const { view, env } = ruleView({ blocks: [block] }, block === item ? 3 : 1);
      type(view, '# ');
      expect(blocks(env, view)[0], block.type).toMatchObject({ type: block.type, id: block.id });
    }
    const table = {
      type: 'table' as const,
      id: 't1',
      headerRow: false,
      headerColumn: false,
      rows: [{ cells: [{ paragraphs: [{ content: [] }] }] }],
    };
    const { view, env } = ruleView({ blocks: [table] }, 4);
    type(view, '> ');
    expect(blocks(env, view)[0]).toMatchObject({
      type: 'table',
      rows: [{ cells: [{ paragraphs: [{ content: [{ type: 'text', text: '> ' }] }] }] }],
    });
    // Not after other text either.
    const after = ruleView({ blocks: [paragraph('x')] }, 2);
    type(after.view, '# ');
    expect(blocks(after.env, after.view)).toEqual([paragraph('x# ')]);
  });

  it('V-279: inline rules mark their text and drop the delimiters, outside code only', () => {
    const cases: [string, Record<string, unknown>][] = [
      ['**bold**', { bold: true }],
      ['__bold__', { bold: true }],
      ['*it*', { italic: true }],
      ['_it_', { italic: true }],
      ['`code`', { code: true }],
      ['~~gone~~', { strike: true }],
      ['==lit==', { highlight: 'yellow' }],
      ['[pier](https://harbor.example/)', { link: 'https://harbor.example/' }],
    ];
    for (const [typed, marks] of cases) {
      const { view, env } = ruleView({ blocks: [paragraph('see ')] }, 5);
      type(view, typed);
      const [first] = blocks(env, view);
      expect(first, typed).toMatchObject({ type: 'paragraph', id: 'p1' });
      const content = (first as unknown as { content: { text: string; marks?: object }[] }).content;
      expect(content[0], typed).toEqual({ type: 'text', text: 'see ' });
      expect(content[1], typed).toMatchObject({ type: 'text', marks });
      expect(content.map((node) => node.text).join(''), typed).not.toMatch(/[*_`~=[\]]/u);
    }
  });

  it('V-279: inline rules need an opening delimiter after whitespace, no inner whitespace and a link within the policy', () => {
    for (const typed of ['a**x**', '** x**', '**x **', '[t](javascript:alert(1))']) {
      const { view, env } = ruleView({ blocks: [paragraph()] });
      type(view, typed);
      expect(blocks(env, view), typed).toEqual([paragraph(typed)]);
    }
    // Inline code may follow any character but a backtick.
    const { view, env } = ruleView({ blocks: [paragraph()] });
    type(view, 'a`x`');
    expect(blocks(env, view)[0]).toMatchObject({
      content: [{ text: 'a' }, { text: 'x', marks: { code: true } }],
    });
    // Nothing in a code block.
    const code = ruleView({ blocks: [{ type: 'code', id: 'c1', text: '' }] });
    type(code.view, '**x** ');
    expect(blocks(code.env, code.view)).toEqual([{ type: 'code', id: 'c1', text: '**x** ' }]);
  });

  it('V-279: text typed after an inline rule continues without its mark', () => {
    const { view, env } = ruleView({ blocks: [paragraph()] });
    type(view, '**x**y');
    expect(blocks(env, view)[0]).toMatchObject({
      content: [{ text: 'x', marks: { bold: true } }, { text: 'y' }],
    });
  });

  it('V-279: a URL then a space links the URL to itself within the link policy, outside code and links', () => {
    const cases: [string, string][] = [
      ['https://harbor.example/tides', 'https://harbor.example/tides'],
      ['www.harbor.example', 'http://www.harbor.example'],
      ['pilot@harbor.example', 'mailto:pilot@harbor.example'],
    ];
    for (const [url, href] of cases) {
      const { view, env } = ruleView({ blocks: [paragraph('see ')] }, 5);
      type(view, `${url} `);
      expect(blocks(env, view)[0], url).toMatchObject({
        content: [{ text: 'see ' }, { text: url, marks: { link: href } }, { text: ' ' }],
      });
    }
    const code = ruleView({ blocks: [{ type: 'code', id: 'c1', text: '' }] });
    type(code.view, 'https://harbor.example ');
    expect(blocks(code.env, code.view)).toEqual([
      { type: 'code', id: 'c1', text: 'https://harbor.example ' },
    ]);
  });

  it('V-279: Enter and Shift+Enter link a URL before the caret once the key applied', () => {
    const { view, env } = ruleView({ blocks: [paragraph('see https://harbor.example')] }, 27);
    const commands = {
      splitBlock: () => {
        view.dispatch(view.state.tr.split(view.state.selection.from));
        return true;
      },
      createParagraphNear: () => false,
      liftEmptyBlock: () => false,
    } as unknown as TiptapCommandsLike;
    expect(autolinkAtCaret(env, view.state)).toMatchObject({ href: 'https://harbor.example' });
    expect(enterKey(env, view, commands, false)).toBe(true);
    const [first, second] = blocks(env, view);
    expect(first).toMatchObject({
      content: [
        { text: 'see ' },
        { text: 'https://harbor.example', marks: { link: 'https://harbor.example' } },
      ],
    });
    expect(second).toMatchObject({ type: 'paragraph', content: [] });
    // Undo right after removes the link and keeps the line break, as typed.
    undo(view);
    expect(blocks(env, view).map((block) => (block as { content: unknown }).content)).toEqual([
      [{ type: 'text', text: 'see https://harbor.example' }],
      [],
    ]);
  });

  it('V-279: an applied rule is its own undo step; undo restores the text as typed', () => {
    const { view, env } = ruleView({ blocks: [paragraph()] });
    type(view, '# ');
    expect(blocks(env, view)[0]).toMatchObject({ type: 'heading', id: 'p1' });
    undo(view);
    expect(blocks(env, view)).toEqual([paragraph('# ')]);
    const inline = ruleView({ blocks: [paragraph()] });
    type(inline.view, '**x**');
    undo(inline.view);
    expect(blocks(inline.env, inline.view)).toEqual([paragraph('**x**')]);
  });

  it('V-279: the Backspace chain never reverts an input rule (no undoInputRule)', () => {
    const { view, env } = ruleView({ blocks: [paragraph()] });
    type(view, '**x**');
    const calls: string[] = [];
    const commands = new Proxy({} as TiptapCommandsLike, {
      get: (_target, name: string) => () => {
        calls.push(name);
        return false;
      },
    });
    const before = view.state.doc;
    expect(backspaceKey(env, view, commands)).toBe(false);
    expect(calls).toEqual(['deleteSelection', 'joinBackward', 'selectNodeBackward']);
    expect(view.state.doc).toBe(before);
    expect(blocks(env, view)[0]).toMatchObject({ content: [{ text: 'x', marks: { bold: true } }] });
  });

  it('applies no rule to the text that the engine reads once a composition has ended', () => {
    const cases: [string, number, string, string][] = [
      ['a **calm*', 10, '*', 'a **calm**'],
      ['#', 2, ' ', '# '],
      ['see www.calm.example', 21, ' ', 'see www.calm.example '],
    ];
    for (const [text, caret, typed, expected] of cases) {
      const { view, env } = ruleView({ blocks: [paragraph(text)] }, caret);
      // The view reads the composed text after its compositionend handler cleared `composing`,
      // and marks the transaction that inserts it as the composition's.
      const insert = () => view.state.tr.insertText(typed, caret, caret).setMeta('composition', 1);
      expect(applyTypedRules(env, view, caret, caret, typed, insert), text).toBe(false);
      view.dispatch(insert());
      expect(blocks(env, view), text).toEqual([paragraph(expected)]);
    }
  });

  it('applies no rule while composing and leaves autolinks to the space, Enter and Shift+Enter', () => {
    const { view, env } = ruleView({ blocks: [paragraph()] });
    view.composing = true;
    expect(applyTypedRules(env, view, 1, 1, '#')).toBe(false);
    view.composing = false;
    type(view, 'https://harbor.example,');
    expect(blocks(env, view)).toEqual([paragraph('https://harbor.example,')]);
    // A link that no longer holds its text is left alone.
    const link = autolinkAtCaret(
      env,
      ruleView({ blocks: [paragraph('www.a.example ')] }, 14).view.state,
    );
    expect(link).not.toBeNull();
    applyAutolink(env, view, link!);
    expect(blocks(env, view)).toEqual([paragraph('https://harbor.example,')]);
  });
});

describe('uwg-te-req-engine-4: a character key over the whole-document selection', () => {
  const SOURCE = '<h2 data-id="h1"><em>ab</em></h2>';
  const press = (charCode: number, init: Partial<KeyboardEvent> = {}) =>
    ({ charCode, ctrlKey: false, altKey: false, metaKey: false, ...init }) as KeyboardEvent;
  /** The engine's key press handler of the rules plugin. */
  function keyPress(view: unknown) {
    const plugin = (view as TestView).state.plugins.find(
      (candidate) => pluginName(candidate) === TIPTAP_INPUT_RULES,
    ) as unknown as { props: { handleKeyPress: (view: unknown, event: KeyboardEvent) => boolean } };
    return (event: KeyboardEvent) => plugin.props.handleKeyPress(view, event);
  }

  it('types the character at the caret of one empty paragraph with a fresh identifier, without marks', () => {
    const { instance, view } = keyedTiptap(SOURCE);
    selectIn(instance, {
      kind: 'text',
      anchor: { block: 'h1', offset: 0 },
      head: { block: 'h1', offset: 2 },
    });
    expect(keyPress(view)(press('x'.charCodeAt(0)))).toBe(true);
    expect(freshIds(htmlOf(instance))).toBe('<p data-id="NEW">x</p>');
    expect(instance.getState().marks.italic).toBe('off');
  });

  it('a line break, a chord with Ctrl or Meta, or another selection is left to the engine', () => {
    const { instance, view } = keyedTiptap(SOURCE);
    selectIn(instance, {
      kind: 'text',
      anchor: { block: 'h1', offset: 0 },
      head: { block: 'h1', offset: 2 },
    });
    const handle = keyPress(view);
    expect(handle(press(13))).toBe(false);
    expect(handle(press('x'.charCodeAt(0), { ctrlKey: true }))).toBe(false);
    expect(handle(press('x'.charCodeAt(0), { metaKey: true }))).toBe(false);
    selectIn(instance, {
      kind: 'text',
      anchor: { block: 'h1', offset: 1 },
      head: { block: 'h1', offset: 2 },
    });
    expect(handle(press('x'.charCodeAt(0)))).toBe(false);
    expect(htmlOf(instance)).toBe(`<h2 data-id="h1"><em>ab</em></h2>`);
  });
});
