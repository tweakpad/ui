/**
 * Tests of the mark and link actions of the Tiptap adapter and of the marks that text typed at a
 * caret takes, on a mount whose keys run the adapter's bindings over the engine's own commands.
 */
import { describe, expect, it } from 'vitest';
import {
  caretAt,
  htmlOf,
  keyedTiptap,
  runActions,
  selectIn,
  html,
  mountTiptap,
  undoOnce,
} from './tiptap-stubs.test.js';
import { type TextEditorSelectionInput } from '../../model.js';

describe('uwg-te-req-engine-11, uwg-te-lis-up-i2: the marks text typed at a caret takes', () => {
  it('at a block start the caret takes no marks or colors, even before a marked run', () => {
    for (const run of [
      '<strong><span data-color="blue">ab</span></strong>',
      '<a href="https://a.example/"><strong>ab</strong></a>',
    ]) {
      const { instance, keys } = keyedTiptap(`<p data-id="p1">${run}</p>`);
      const before = htmlOf(instance);
      selectIn(instance, caretAt('p1', 0));
      expect(instance.getState().marks, run).toMatchObject({ bold: 'off', textColor: null });
      keys.type('Q');
      expect(htmlOf(instance), run).toBe(before.replace('<p data-id="p1">', '<p data-id="p1">Q'));
    }
  });

  it('after a hard break the caret takes none, also after Shift+Enter inside a marked run', () => {
    const { instance, keys } = keyedTiptap('<p data-id="p1"><strong>abcd</strong></p>');
    selectIn(instance, caretAt('p1', 2));
    expect(keys.press('Shift-Enter')).toBe(true);
    expect(instance.getState().marks.bold).toBe('off');
    keys.type('Q');
    expect(htmlOf(instance)).toBe(
      '<p data-id="p1"><strong>ab</strong><br>Q<strong>cd</strong></p>',
    );
  });

  it('at the start of the block that Enter leaves after a marked run, the caret takes none', () => {
    for (const source of [
      '<p data-id="p1"><span data-color="red"><strong>ab</strong></span></p>',
      '<ul><li data-id="p1"><p><strong>ab</strong></p></li></ul>',
    ]) {
      const { instance, keys } = keyedTiptap(source);
      selectIn(instance, caretAt('p1', 2));
      expect(keys.press('Enter'), source).toBe(true);
      expect(instance.getState().marks, source).toMatchObject({ bold: 'off', textColor: null });
      keys.type('Q');
      expect(htmlOf(instance), source).toMatch(/<p(?: data-id="[^"]+")?>Q<\/p>/u);
    }
  });

  it('a caret takes the marks and colors of the text before it; a link carries over at neither edge', () => {
    const source =
      '<p data-id="p1">x<span data-color="blue"><strong>ab</strong></span><a href="https://a.example/">cd</a></p>';
    const cases: [number, string, string][] = [
      [1, 'xQ<span data-color="blue"><strong>ab</strong></span>', 'plain after plain text'],
      [3, '<span data-color="blue"><strong>abQ</strong></span><a', 'bold and blue at the run end'],
      [5, '<a href="https://a.example/">cd</a>Q</p>', 'outside the link at its end'],
    ];
    for (const [offset, expected, label] of cases) {
      const { instance, keys } = keyedTiptap(source);
      selectIn(instance, caretAt('p1', offset));
      keys.type('Q');
      expect(htmlOf(instance), label).toContain(expected);
    }
  });

  it('after setContent, text typed at the waiting caret before a marked run is plain', () => {
    const { instance, keys } = keyedTiptap('<p data-id="p0">calm</p>');
    instance.setContent('<p data-id="p1"><strong>ab</strong></p>', 'html');
    keys.type('Q');
    expect(htmlOf(instance)).toBe('<p data-id="p1">Q<strong>ab</strong></p>');
  });

  it('a mark set at the caret is what text typed there takes, at a block start too', () => {
    const { instance, keys } = keyedTiptap('<p data-id="p1"><em>ab</em></p>');
    selectIn(instance, caretAt('p1', 0));
    expect(runActions(instance, { type: 'mark.toggle', mark: 'bold' })).toBe(true);
    expect(instance.getState().marks.bold).toBe('on');
    keys.type('Q');
    expect(htmlOf(instance)).toBe('<p data-id="p1"><strong>Q</strong><em>ab</em></p>');
  });
});

describe('uwg-te-req-engine-11: text typed after a hard break', () => {
  it('text typed after a hard break before a marked run is plain', () => {
    const { instance, keys } = keyedTiptap('<p data-id="p1">ab<br><code>cd</code></p>');
    selectIn(instance, { kind: 'text', anchor: { block: 'p1', offset: 3 } });
    expect(instance.getState().caret?.inCode).toBe(false);
    keys.type('Q');
    expect(htmlOf(instance)).toBe('<p data-id="p1">ab<br>Q<code>cd</code></p>');
  });
});

describe('uwg-te-tab-actions r1: marks and links over a selection', () => {
  const MERGED =
    '<table data-id="t1"><tbody><tr><td><p>A</p></td><td><p>B</p></td></tr><tr><td colspan="2"><p>wide</p></td></tr><tr><td><p>x</p></td><td><p>y</p></td></tr></tbody></table><p data-id="p9">end</p>';
  const RANGE = { anchor: { row: 0, column: 1 }, head: { row: 2, column: 1 } };

  it('marks over a range into a code block act on the text outside it', () => {
    const { instance } = mountTiptap({
      content: html('<p data-id="p1">calm sea</p><pre data-id="k1"><code>let x = 1;</code></pre>'),
    });
    selectIn(instance, {
      kind: 'text',
      anchor: { block: 'p1', offset: 0 },
      head: { block: 'k1', offset: 3 },
    });
    expect(instance.can({ type: 'mark.toggle', mark: 'bold' })).toBe(true);
    expect(runActions(instance, { type: 'mark.toggle', mark: 'bold' })).toBe(true);
    expect(htmlOf(instance)).toBe(
      '<p data-id="p1"><strong>calm sea</strong></p>\n<pre data-id="k1"><code>let x = 1;</code></pre>',
    );
    selectIn(instance, {
      kind: 'text',
      anchor: { block: 'k1', offset: 0 },
      head: { block: 'k1', offset: 3 },
    });
    expect(instance.can({ type: 'mark.toggle', mark: 'bold' })).toBe(false);
  });

  it('a mark over a cell range acts on every cell of the range grown over merged cells', () => {
    const { instance } = mountTiptap({ content: html(MERGED) });
    selectIn(instance, { kind: 'cells', table: 't1', range: RANGE });
    expect(runActions(instance, { type: 'mark.toggle', mark: 'bold' })).toBe(true);
    const written = htmlOf(instance);
    for (const text of ['A', 'B', 'wide', 'x', 'y'])
      expect(written, text).toContain(`<strong>${text}</strong>`);
  });

  it('link.set and link.unset act on the link at a caret at its edge; text replaces its text', () => {
    const source = '<p data-id="p1">see <a href="https://old.example/">docs</a> now</p>';
    for (const offset of [4, 8]) {
      const unset = mountTiptap({ content: html(source) });
      selectIn(unset.instance, caretAt('p1', offset));
      expect(unset.instance.getState().link?.href, String(offset)).toBe('https://old.example/');
      expect(unset.instance.can({ type: 'link.unset' }), String(offset)).toBe(true);
      expect(runActions(unset.instance, { type: 'link.unset' })).toBe(true);
      expect(htmlOf(unset.instance)).toBe('<p data-id="p1">see docs now</p>');
      const set = mountTiptap({ content: html(source) });
      selectIn(set.instance, caretAt('p1', offset));
      expect(
        runActions(set.instance, { type: 'link.set', href: 'https://new.example/', text: 'guide' }),
      ).toBe(true);
      expect(htmlOf(set.instance)).toBe(
        '<p data-id="p1">see <a href="https://new.example/">guide</a> now</p>',
      );
    }
  });

  it('link.set over a cell range has no text to link, as over a block selection; link.unset acts on every cell of the range', () => {
    const LINKED =
      '<table data-id="t1"><tbody><tr><td><p><a href="https://a.example/">aa</a></p></td><td><p>bb</p></td></tr><tr><td><p>cc</p></td><td><p><a href="https://d.example/">dd</a></p></td></tr></tbody></table><p data-id="p1">x</p>';
    const ranges = [
      { anchor: { row: 0, column: 0 }, head: { row: 1, column: 1 } },
      { anchor: { row: 1, column: 1 }, head: { row: 0, column: 0 } },
      { anchor: { row: 0, column: 1 }, head: { row: 1, column: 0 } },
      { anchor: { row: 1, column: 0 }, head: { row: 1, column: 0 } },
    ];
    for (const range of ranges) {
      const label = JSON.stringify(range);
      for (const action of [
        { type: 'link.set', href: 'https://new.example/' },
        { type: 'link.set', href: 'https://new.example/', text: 'L' },
      ] as const) {
        const { instance } = mountTiptap({ content: html(LINKED) });
        selectIn(instance, { kind: 'cells', table: 't1', range });
        const before = htmlOf(instance);
        expect(instance.can(action), label).toBe(false);
        expect(runActions(instance, action), label).toBe(false);
        expect(htmlOf(instance), label).toBe(before);
      }
      const { instance } = mountTiptap({ content: html(LINKED) });
      selectIn(instance, { kind: 'cells', table: 't1', range });
      // The single cell (1,0) holds no link: nothing to remove there.
      const linked = range.anchor.row !== range.head.row;
      expect(instance.can({ type: 'link.unset' }), label).toBe(linked);
      expect(runActions(instance, { type: 'link.unset' }), label).toBe(linked);
      if (linked) expect(htmlOf(instance), label).not.toContain('<a ');
      expect(instance.getState().selection, label).toEqual({ kind: 'cells', table: 't1', range });
    }
  });

  it('link.set over a range keeps the range selected', () => {
    const { instance } = mountTiptap({ content: html('<p data-id="p1">see docs now</p>') });
    const range: TextEditorSelectionInput = {
      kind: 'text',
      anchor: { block: 'p1', offset: 4 },
      head: { block: 'p1', offset: 8 },
    };
    selectIn(instance, range);
    expect(runActions(instance, { type: 'link.set', href: 'https://new.example/' })).toBe(true);
    expect(instance.getState().selection).toMatchObject({
      kind: 'text',
      anchor: { block: 'p1', offset: 4 },
      head: { block: 'p1', offset: 8 },
    });
  });
});

describe('uwg-te-tab-actions r1, uwg-te-req-engine-5: link actions with an explicit range', () => {
  const SOURCE =
    '<p data-id="p1">see docs now</p><pre data-id="k1"><code>let x</code></pre><hr data-id="d1"><table data-id="t1"><tbody><tr><td><p></p></td><td><p></p></td></tr></tbody></table><p data-id="p9">end</p>';
  const LINKED = SOURCE.replace('see docs now', 'see <a href="https://old.example/">docs</a> now');
  const DOCS = { block: 'p1', from: 4, to: 8 };
  const SELECTIONS: [string, TextEditorSelectionInput][] = [
    ['a caret in a code block', caretAt('k1', 2)],
    ['a block selection of an atom', { kind: 'blocks', ids: ['d1'] }],
    ['a block selection of a code block', { kind: 'blocks', ids: ['k1'] }],
    [
      'an empty cell range',
      {
        kind: 'cells',
        table: 't1',
        range: { anchor: { row: 0, column: 0 }, head: { row: 0, column: 1 } },
      },
    ],
  ];

  it('the range decides where they apply, whatever the current selection holds', () => {
    const outcomes: Record<string, unknown> = {};
    const expected: Record<string, unknown> = {};
    for (const [label, selection] of SELECTIONS) {
      const set = mountTiptap({ content: html(SOURCE) });
      selectIn(set.instance, selection);
      const before = set.instance.getState().selection;
      const action = { type: 'link.set', href: 'https://new.example/', range: DOCS } as const;
      const unset = mountTiptap({ content: html(LINKED) });
      selectIn(unset.instance, selection);
      const remove = { type: 'link.unset', range: DOCS } as const;
      outcomes[label] = {
        set: [set.instance.can(action), runActions(set.instance, action)],
        linked: htmlOf(set.instance).includes(
          '<p data-id="p1">see <a href="https://new.example/">docs</a> now</p>',
        ),
        kept: set.instance.getState().selection,
        unset: [unset.instance.can(remove), runActions(unset.instance, remove)],
        unlinked: htmlOf(unset.instance).includes('<p data-id="p1">see docs now</p>'),
      };
      expected[label] = {
        set: [true, true],
        linked: true,
        kept: before,
        unset: [true, true],
        unlinked: true,
      };
    }
    expect(outcomes).toEqual(expected);
  });

  it('a range holding no text outside code blocks is refused, whatever the current selection holds', () => {
    const code = { block: 'k1', from: 0, to: 3 };
    for (const [label, selection] of [
      ['a caret in a paragraph', caretAt('p1', 2)],
      [
        'a text selection in a paragraph',
        { kind: 'text', anchor: { block: 'p1', offset: 0 }, head: { block: 'p1', offset: 3 } },
      ],
      ...SELECTIONS,
    ] as [string, TextEditorSelectionInput][]) {
      const { instance } = mountTiptap({ content: html(SOURCE) });
      selectIn(instance, selection);
      const before = htmlOf(instance);
      for (const action of [
        { type: 'link.set', href: 'https://new.example/', range: code },
        { type: 'link.set', href: 'https://new.example/', text: 'L', range: { ...code, to: 0 } },
        { type: 'link.unset', range: code },
      ] as const) {
        expect(instance.can(action), `${label} ${JSON.stringify(action)}`).toBe(false);
        expect(runActions(instance, action), label).toBe(false);
      }
      expect(htmlOf(instance), label).toBe(before);
    }
  });

  it('a collapsed range in a paragraph inserts linked text there, whatever the current selection holds', () => {
    const outcomes: Record<string, unknown> = {};
    for (const [label, selection] of SELECTIONS) {
      const { instance } = mountTiptap({ content: html(SOURCE) });
      selectIn(instance, selection);
      const action = {
        type: 'link.set',
        href: 'https://new.example/',
        text: 'guide ',
        range: { block: 'p1', from: 4, to: 4 },
      } as const;
      outcomes[label] = [
        instance.can(action),
        runActions(instance, action),
        htmlOf(instance).includes(
          '<p data-id="p1">see <a href="https://new.example/">guide </a>docs now</p>',
        ),
      ];
    }
    expect(outcomes).toEqual(
      Object.fromEntries(SELECTIONS.map(([label]) => [label, [true, true, true]])),
    );
  });

  it('text inserted at a collapsed range takes the marks a caret there takes, never those stored at the current caret', () => {
    const { instance } = mountTiptap({
      content: html('<p data-id="p1"><em>see</em> docs</p><p data-id="p9">end</p>'),
    });
    selectIn(instance, caretAt('p9', 3));
    expect(runActions(instance, { type: 'mark.toggle', mark: 'bold' })).toBe(true);
    const action = {
      type: 'link.set',
      href: 'https://new.example/',
      text: 'X',
      range: { block: 'p1', from: 3, to: 3 },
    } as const;
    expect(runActions(instance, action)).toBe(true);
    expect(htmlOf(instance)).toContain(
      '<p data-id="p1"><em>see</em><a href="https://new.example/"><em>X</em></a> docs</p>',
    );
  });
});

describe('uwg-te-req-engine-5: a link.set that changes nothing', () => {
  const SOURCE =
    '<p data-id="p1">pre <a href="https://a.example/">link</a> post</p><p data-id="p2">x</p>';
  const NO_OPS: [string, TextEditorSelectionInput | null, Record<string, unknown>][] = [
    ['at a caret in the link', caretAt('p1', 6), {}],
    [
      'over a selection in the link',
      { kind: 'text', anchor: { block: 'p1', offset: 5 }, head: { block: 'p1', offset: 7 } },
      {},
    ],
    ['over a range in the link', null, { range: { block: 'p1', from: 5, to: 7 } }],
    ['over the link’s whole range', null, { range: { block: 'p1', from: 4, to: 8 } }],
  ];

  it('adds no undo step, notifies state only and keeps the redo step', () => {
    for (const [label, selection, extra] of NO_OPS) {
      const { instance, context } = mountTiptap({ content: html(SOURCE) });
      // A redo step to keep: an edit, undone.
      expect(
        runActions(instance, {
          type: 'text.insert',
          text: 'Z',
          range: { block: 'p2', from: 1, to: 1 },
        }),
      ).toBe(true);
      expect(undoOnce(instance)).toBe(true);
      if (selection) selectIn(instance, selection);
      const before = htmlOf(instance);
      const version = instance.getState().contentVersion;
      context.calls.splice(0);
      const action = { type: 'link.set', href: 'https://a.example/', ...extra } as never;
      expect(instance.can(action), label).toBe(true);
      expect(runActions(instance, action), label).toBe(true);
      expect(context.calls, label).toEqual(['state']);
      expect(htmlOf(instance), label).toBe(before);
      expect(instance.getState().contentVersion, label).toBe(version);
      expect(instance.getState().history, label).toEqual({ undo: false, redo: true });
    }
  });

  it('keeps the selection it left, as an applied selection does', () => {
    const { instance } = mountTiptap({ content: html(SOURCE) });
    selectIn(instance, {
      kind: 'text',
      anchor: { block: 'p1', offset: 7 },
      head: { block: 'p1', offset: 5 },
    });
    expect(runActions(instance, { type: 'link.set', href: 'https://a.example/' })).toBe(true);
    expect(instance.getState().selection).toEqual({
      kind: 'text',
      anchor: { block: 'p1', offset: 7 },
      head: { block: 'p1', offset: 5 },
      empty: false,
    });
  });
});

describe('uwg-te-tab-actions r1, uwg-te-req-engine-5: link.set over text that a link partly holds', () => {
  const SOURCE =
    '<p data-id="p1">pre <a href="https://a.example/">link</a> post</p><p data-id="p2">x</p>';
  const A = 'https://a.example/';
  const B = 'https://b.example/';
  const at = (from: number, to: number) => ({ block: 'p1', from, to });
  const select = (anchor: number, head: number): TextEditorSelectionInput => ({
    kind: 'text',
    anchor: { block: 'p1', offset: anchor },
    head: { block: 'p1', offset: head },
  });
  const first = (source: string) => source.split('</p>')[0] + '</p>';

  it('a range links exactly its text: the parts of the link outside it keep their destination', () => {
    const cases: [ReturnType<typeof at>, string, string][] = [
      [at(5, 7), B, `pre <a href="${A}">l</a><a href="${B}">in</a><a href="${A}">k</a> post`],
      [at(2, 6), B, `pr<a href="${B}">e li</a><a href="${A}">nk</a> post`],
      [at(6, 10), B, `pre <a href="${A}">li</a><a href="${B}">nk p</a>ost`],
      [at(2, 10), B, `pr<a href="${B}">e link p</a>ost`],
      [at(4, 8), B, `pre <a href="${B}">link</a> post`],
      // Text linked to the same destination joins the link beside it.
      [at(2, 6), A, `pr<a href="${A}">e link</a> post`],
      [at(6, 10), A, `pre <a href="${A}">link p</a>ost`],
    ];
    for (const [range, href, expected] of cases) {
      const { instance } = mountTiptap({ content: html(SOURCE) });
      const action = { type: 'link.set', href, range } as const;
      expect(instance.can(action)).toBe(true);
      expect(runActions(instance, action)).toBe(true);
      expect(first(htmlOf(instance)), JSON.stringify(range)).toBe(
        `<p data-id="p1">${expected}</p>`,
      );
    }
  });

  it('a selection that reaches into a link links the selected text; inside one link, the whole link', () => {
    const cases: [TextEditorSelectionInput, string][] = [
      [select(2, 6), `pr<a href="${B}">e li</a><a href="${A}">nk</a> post`],
      [select(10, 6), `pre <a href="${A}">li</a><a href="${B}">nk p</a>ost`],
      [select(5, 7), `pre <a href="${B}">link</a> post`],
    ];
    for (const [selection, expected] of cases) {
      const { instance } = mountTiptap({ content: html(SOURCE) });
      selectIn(instance, selection);
      expect(runActions(instance, { type: 'link.set', href: B })).toBe(true);
      expect(first(htmlOf(instance))).toBe(`<p data-id="p1">${expected}</p>`);
    }
  });

  it('a range strictly inside a link is one undo step, which restores the link', () => {
    for (const range of [at(5, 7), at(4, 7), at(5, 8)]) {
      const { instance } = mountTiptap({ content: html(SOURCE) });
      expect(instance.getState().history.undo).toBe(false);
      expect(runActions(instance, { type: 'link.set', href: B, range })).toBe(true);
      expect(instance.getState().history.undo, JSON.stringify(range)).toBe(true);
      expect(undoOnce(instance)).toBe(true);
      expect(first(htmlOf(instance))).toBe(`<p data-id="p1">pre <a href="${A}">link</a> post</p>`);
      expect(instance.getState().history).toEqual({ undo: false, redo: true });
    }
  });
});
