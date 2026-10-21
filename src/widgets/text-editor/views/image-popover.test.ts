import { describe, expect, it, vi } from 'vitest';
import type { TextEditorRequestProposal } from '../../../foundation/text-editor/controller.js';
import {
  imageInsertActions,
  imageSourceAllowed,
  initialInsertionPoint,
  insertedBlock,
  insertImageFiles,
} from './image-popover.js';

const caret = {
  kind: 'text' as const,
  anchor: { block: 'a', offset: 2 },
  head: { block: 'a', offset: 2 },
  empty: true,
};

describe('image popover (uwg-te-req-surfaces-4)', () => {
  it('keeps image sources to the image policy', () => {
    expect(imageSourceAllowed('https://cdn.example.test/a.png')).toBe(true);
    expect(imageSourceAllowed('/images/a.png')).toBe(true);
    expect(imageSourceAllowed('data:image/png;base64,AAAA')).toBe(false);
    expect(imageSourceAllowed('blob:https://example.test/1')).toBe(false);
    expect(imageSourceAllowed('  ')).toBe(false);
  });

  it('remembers the selection at opening, else the end of the document', () => {
    expect(initialInsertionPoint(caret, 'z')).toEqual({
      kind: 'selection',
      selection: { kind: 'text', anchor: caret.anchor, head: caret.head },
    });
    expect(initialInsertionPoint({ kind: 'none' }, 'z')).toEqual({ kind: 'after', id: 'z' });
    expect(initialInsertionPoint({ kind: 'none' }, null)).toEqual({ kind: 'document' });
  });

  it('inserts the first image at the remembered selection and each later one after the last', () => {
    const first = imageInsertActions(initialInsertionPoint(caret, null), ' /a.png ', 'Alt');
    expect(first).toEqual([
      {
        type: 'selection.set',
        selection: { kind: 'text', anchor: caret.anchor, head: caret.head },
      },
      { type: 'blocks.insert', kind: 'image', attrs: { src: '/a.png', alt: 'Alt' } },
    ]);
    expect(imageInsertActions({ kind: 'after', id: 'img1' }, '/b.png', '')).toEqual([
      {
        type: 'blocks.insert',
        kind: 'image',
        attrs: { src: '/b.png', alt: '' },
        at: { after: 'img1' },
      },
    ]);
    expect(insertedBlock(['a', 'b'], ['a', 'n', 'b'])).toBe('n');
    expect(insertedBlock(['a'], ['a'])).toBeNull();
  });
});

describe('pasted and dropped image files (uwg-te-req-content-6)', () => {
  const file = (name: string) => ({ name, type: 'image/png' }) as File;

  function harness(sources: Record<string, string | Error>) {
    let ids = ['a'];
    let next = 0;
    const requests: TextEditorRequestProposal[] = [];
    const resolvers = new Map<string, (value: string) => void>();
    const upload = vi.fn(
      (target: File, options: { signal: AbortSignal }) =>
        new Promise<string>((resolve, reject) => {
          const source = sources[target.name]!;
          if (source instanceof Error) return reject(source);
          options.signal.addEventListener('abort', () => reject(options.signal.reason));
          resolvers.set(target.name, () => resolve(source));
        }),
    );
    const diagnose = vi.fn();
    return {
      upload,
      diagnose,
      requests,
      resolve: (name: string) => resolvers.get(name)!(''),
      input: (files: File[], signal = new AbortController().signal) => ({
        upload,
        files,
        at: { kind: 'text' as const, anchor: { block: 'a', offset: 1 } },
        surface: 'paste' as const,
        reason: 'input-paste' as const,
        sourceEvent: undefined,
        signal,
        blockIds: () => ids,
        request: (proposal: TextEditorRequestProposal) => {
          requests.push(proposal);
          ids = [...ids, `img${++next}`];
          return Promise.resolve('applied' as const);
        },
        diagnose,
      }),
    };
  }

  it('uploads at once and inserts in completion order, each after the image inserted last', async () => {
    const h = harness({ 'one.png': '/one.png', 'two.png': '/two.png' });
    const done = insertImageFiles(h.input([file('one.png'), file('two.png')]));
    expect(h.upload).toHaveBeenCalledTimes(2);
    h.resolve('two.png');
    await Promise.resolve();
    h.resolve('one.png');
    await done;
    expect(h.requests.map((request) => request.reason)).toEqual(['input-paste', 'input-paste']);
    expect(h.requests[0]!.target).toEqual([
      { type: 'selection.set', selection: { kind: 'text', anchor: { block: 'a', offset: 1 } } },
      { type: 'blocks.insert', kind: 'image', attrs: { src: '/two.png', alt: '' } },
    ]);
    expect(h.requests[1]!.target).toEqual([
      {
        type: 'blocks.insert',
        kind: 'image',
        attrs: { src: '/one.png', alt: '' },
        at: { after: 'img1' },
      },
    ]);
  });

  it('reports a source that fails the policy and inserts nothing for it, a failure or an abort', async () => {
    const h = harness({
      'bad.png': 'data:image/png;base64,AA',
      'err.png': new Error('x'),
      'slow.png': '/s.png',
    });
    const controller = new AbortController();
    const done = insertImageFiles(
      h.input([file('bad.png'), file('err.png'), file('slow.png')], controller.signal),
    );
    h.resolve('bad.png');
    await new Promise((resolve) => setTimeout(resolve, 0));
    controller.abort();
    await done;
    expect(h.requests).toEqual([]);
    expect(h.diagnose).toHaveBeenCalledTimes(1);
  });
});
