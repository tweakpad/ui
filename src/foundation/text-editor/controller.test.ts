import { describe, expect, it, vi } from 'vitest';
import { imageProtocols, linkProtocols } from '../markdown/url.js';
import type { TextEditorAction, TextEditorBlocksDeleteAction } from './actions.js';
import { BASE_CAPABILITIES } from './capabilities.js';
import {
  blockContextKey,
  TextEditorController,
  textDirectionOf,
  type TextEditorControllerHost,
  type TextEditorRequestDetail,
  type TextEditorRequestFailedDetail,
  type TextEditorRequestProposal,
  type TextEditorValueChange,
  type TextEditorValueCommit,
} from './controller.js';
import type { TextEditorFormat, TextEditorSnapshot } from './engine.js';
import type { TextEditorEngineState, TextEditorTextPoint } from './model.js';
import { defineTextEditorBlock, defineTextEditorInline } from './nodes.js';
import {
  createHost,
  FakeContainer,
  FakeTextEngine,
  type FakeTextInstance,
  fakeTools,
  flush,
  readyEditor,
  selectText,
} from './text-editor-fakes.test.js';
import { defineTextEditorTool, type TextEditorToolContext } from './tools.js';

const HTML = { content: '<p data-id="p1">calm</p>', format: 'html' } as const;

/** A proposal from `run` or `setContent`: surface `api`, reason `imperative-action`. */
const api = (
  target: TextEditorRequestProposal['target'],
  members: Partial<TextEditorRequestProposal> = {},
): TextEditorRequestProposal => ({
  target,
  surface: 'api',
  reason: 'imperative-action',
  ...members,
});

const setContent = (
  content: unknown,
  format: TextEditorFormat = 'html',
): TextEditorRequestProposal => api({ type: 'content.set', content, format, history: 'push' });

const codes = (diagnostics: readonly { readonly code: string }[]) =>
  diagnostics.map((diagnostic) => diagnostic.code);

const note = defineTextEditorBlock({
  name: 'note-box',
  content: 'inline',
  element: 'aside',
  tool: { label: 'Note' },
});
const person = defineTextEditorInline({
  name: 'person',
  element: 'span',
  attrs: { label: { type: 'string', default: '' } },
  text: ({ label }) => `@${label}`,
});

describe('TextEditorController lifecycle (uwg-te-req-engine-7, uwg-te-req-engine-8)', () => {
  it('reads no host member while it is constructed', () => {
    const host = new Proxy({} as TextEditorControllerHost, {
      get(_target, member) {
        throw new Error(`The host member ${String(member)} was read.`);
      },
    });
    const controller = new TextEditorController(host);
    expect([controller.status, controller.value, controller.native]).toEqual(['idle', null, null]);
  });

  it('V-024: idle, loading and ready for synchronous and asynchronous mounts', async () => {
    for (const async of [false, true]) {
      const { controller, of } = createHost();
      expect(controller.status).toBe('idle');
      controller.connect();
      controller.setEngine(new FakeTextEngine({ async }));
      expect(controller.status).toBe('loading');
      await flush();
      expect(controller.status).toBe('ready');
      expect(of('ready')).toHaveLength(1);
    }
  });

  it('V-024: a mount that throws or rejects gives error; a new engine mounts again', async () => {
    for (const async of [false, true]) {
      const { controller, of } = createHost();
      const error = new Error('The engine module is missing.');
      controller.connect();
      controller.setEngine(new FakeTextEngine({ async, failMount: error }));
      await flush();
      expect(controller.status).toBe('error');
      expect(of('error')).toEqual([error]);
      expect(of('ready')).toEqual([]);
      controller.setEngine(new FakeTextEngine());
      expect(controller.status).toBe('loading');
      await flush();
      expect(controller.status).toBe('ready');
    }
  });

  it('V-024: a fatal engine error gives error and destroys the instance', async () => {
    const { controller, instance, of } = await readyEditor();
    const error = new Error('The engine stopped.');
    instance.context.error(error);
    expect([controller.status, instance.destroyed, controller.value]).toEqual([
      'error',
      true,
      null,
    ]);
    expect(of('error')).toEqual([error]);
  });

  it('V-024: no mount without connection, engine or container', async () => {
    const { controller, host, container, of } = createHost();
    const engine = new FakeTextEngine();
    controller.setEngine(engine);
    await flush();
    expect([engine.calls, controller.status]).toEqual([[], 'idle']);
    host.container = null;
    controller.connect();
    await flush();
    expect([engine.calls, controller.status]).toEqual([[], 'idle']);
    controller.disconnect();
    host.container = container;
    controller.connect();
    expect(engine.calls).toEqual(['mount']);
    await flush();
    expect(controller.status).toBe('ready');
    expect(of('ready')).toHaveLength(1);
  });

  it('V-024: a superseded asynchronous mount is destroyed on arrival; ready is reported once', async () => {
    const { controller, of } = createHost();
    controller.connect();
    const first = new FakeTextEngine({ async: true });
    controller.setEngine(first);
    const second = new FakeTextEngine();
    controller.setEngine(second);
    const superseded = first.instances[0]!;
    expect(first.context!.signal.aborted).toBe(true);
    expect(superseded.destroyed).toBe(false);
    await flush();
    expect(superseded.destroyed).toBe(true);
    expect(second.instances[0]!.destroyed).toBe(false);
    expect(of('ready')).toEqual([second.instances[0]!.native]);
    expect(controller.status).toBe('ready');
  });

  it('V-024: a queued content.set wins last, a superseded one settles unchanged and other requests reject with InvalidStateError', async () => {
    const { controller, of } = createHost();
    const engine = new FakeTextEngine();
    controller.setTools(fakeTools(engine));
    const first = controller.request(setContent('<p data-id="a">first</p>'));
    const second = controller.request(setContent('<p data-id="b">second</p>'));
    const other = controller.request(api([{ type: 'blocks.delete', ids: ['a'] }]));
    await expect(first).resolves.toBe('unchanged');
    await expect(other).rejects.toMatchObject({ name: 'InvalidStateError' });
    controller.connect();
    controller.setEngine(engine);
    expect(engine.context!.initialContent).toEqual({
      content: '<p data-id="b">second</p>',
      format: 'html',
    });
    await expect(second).resolves.toBe('applied');
    expect(controller.getContent('html')).toBe('<p data-id="b">second</p>');
    expect(of<TextEditorRequestDetail>('request')).toHaveLength(3);
    expect(of<TextEditorRequestFailedDetail>('request-failed')).toMatchObject([
      { actions: [{ type: 'blocks.delete' }], error: { name: 'InvalidStateError' } },
    ]);
    expect([of('value-change'), of('value-commit')]).toEqual([[], []]);
  });

  it('V-024: after disconnection one frame keeps and two frames destroy the instance; a reconnection within two frames cancels', async () => {
    const { controller, frames, engine, instance } = await readyEditor();
    controller.disconnect();
    frames.tick();
    controller.connect();
    frames.run(3);
    expect(instance.destroyed).toBe(false);
    expect(engine.calls.filter((call) => call === 'mount')).toHaveLength(1);
    expect(controller.status).toBe('ready');
    controller.disconnect();
    frames.tick();
    expect(instance.destroyed).toBe(false);
    frames.tick();
    expect(instance.destroyed).toBe(true);
    expect(controller.status).toBe('idle');
  });

  it('V-019, V-024: can() computes once per state version and action key', async () => {
    const { controller, instance } = await readyEditor({ content: HTML });
    const start = instance.canCalls;
    const bold: TextEditorAction = { type: 'mark.toggle', mark: 'bold' };
    expect(controller.can(bold)).toBe(true);
    expect(controller.can({ mark: 'bold', type: 'mark.toggle' } as TextEditorAction)).toBe(true);
    expect(instance.canCalls - start).toBe(1);
    expect(controller.can({ type: 'mark.toggle', mark: 'italic' })).toBe(true);
    expect(controller.can({ type: 'blocks.delete', ids: ['missing'] })).toBe(false);
    expect(controller.can({ type: 'blocks.delete', ids: ['missing'] })).toBe(false);
    expect(instance.canCalls - start).toBe(3);
    instance.type('Very ');
    expect(controller.can(bold)).toBe(true);
    expect(instance.canCalls - start).toBe(4);
    controller.setEngine(null);
    expect(controller.can(bold)).toBe(false);
  });

  it('V-587: can() keeps its answers across a focus change, which publishes a new state version only', async () => {
    const { controller, instance } = await readyEditor({ content: HTML });
    const bold: TextEditorAction = { type: 'mark.toggle', mark: 'bold' };
    expect(controller.can(bold)).toBe(true);
    const start = instance.canCalls;
    const version = instance.getState().version;
    instance.blur();
    void instance.focus('restore');
    expect(instance.getState().version).toBeGreaterThan(version);
    expect(controller.can(bold)).toBe(true);
    expect(instance.canCalls - start).toBe(0);
    // A document change asks the engine again.
    instance.type('Very ');
    expect(controller.can(bold)).toBe(true);
    expect(instance.canCalls - start).toBe(1);
  });

  it('V-588: block-type answers stay while typing keeps the selection in one block', async () => {
    const { controller, instance } = await readyEditor({ content: HTML });
    instance.type('Very ');
    const quote: TextEditorAction = { type: 'block.set-type', kind: 'quote' };
    const heading: TextEditorAction = {
      type: 'block.set-type',
      kind: 'heading',
      attrs: { level: 2 },
    };
    const bold: TextEditorAction = { type: 'mark.toggle', mark: 'bold' };
    expect([controller.can(quote), controller.can(heading), controller.can(bold)]).toEqual([
      true,
      true,
      true,
    ]);
    const start = instance.canCalls;
    instance.type('calm ');
    expect([controller.can(quote), controller.can(heading), controller.can(bold)]).toEqual([
      true,
      true,
      true,
    ]);
    // The marks answer per state; the block context is unchanged.
    expect(instance.canCalls - start).toBe(1);
    // Another kind of the block is another context.
    expect(
      instance.execute([{ type: 'block.set-type', kind: 'quote', ids: ['p1'] }], {
        reason: 'imperative-action',
      }),
    ).toBe(true);
    controller.can(quote);
    expect(instance.canCalls - start).toBe(2);
  });

  it('V-587: reports a state publication that waits for its frame', async () => {
    const { controller, frames, instance } = await readyEditor({ content: HTML });
    frames.tick();
    expect(controller.publicationPending).toBe(false);
    instance.type('Very ');
    expect(controller.publicationPending).toBe(true);
    frames.tick();
    expect(controller.publicationPending).toBe(false);
  });

  it('V-588: the block context is that of a text selection in one block outside tables', () => {
    const block = { id: 'p1', kind: 'paragraph', attrs: {}, depth: 0 } as const;
    const caret = (point: Record<string, unknown>) =>
      ({ kind: 'text', anchor: point, head: point, empty: true }) as never;
    const state = { editable: true, selection: caret({ block: 'p1', offset: 2 }), block };
    const quote: TextEditorAction = { type: 'block.set-type', kind: 'quote' };
    expect(blockContextKey(state, quote)).toBe('true|p1|paragraph|0|{}');
    expect(blockContextKey({ ...state, selection: caret({ block: 'p1', offset: 4 }) }, quote)).toBe(
      blockContextKey(state, quote),
    );
    expect(blockContextKey({ ...state, editable: false }, quote)).not.toBe(
      blockContextKey(state, quote),
    );
    expect(blockContextKey(state, { ...quote, ids: ['p1'] })).toBeNull();
    expect(blockContextKey(state, { type: 'mark.toggle', mark: 'bold' })).toBeNull();
    expect(
      blockContextKey(
        {
          ...state,
          selection: {
            kind: 'text',
            anchor: { block: 'p1', offset: 0 },
            head: { block: 'p2', offset: 0 },
            empty: false,
          } as never,
        },
        quote,
      ),
    ).toBeNull();
    expect(
      blockContextKey(
        {
          ...state,
          selection: caret({ block: 't1', cell: { row: 0, column: 0, paragraph: 0 }, offset: 0 }),
          block: { ...block, id: 't1' },
        },
        quote,
      ),
    ).toBeNull();
    expect(blockContextKey({ ...state, block: null }, quote)).toBeNull();
  });

  it('reports the missing engine at the first frame after connection: once per connection and again after engine = null', async () => {
    const { controller, frames, of } = createHost();
    controller.connect();
    expect(of('diagnostic')).toEqual([]);
    frames.run(2);
    expect(of('diagnostic')).toEqual([
      {
        code: 'text-editor-engine-missing',
        message: 'No engine is assigned, so the editor stays idle until one is.',
      },
    ]);
    controller.disconnect();
    controller.connect();
    frames.run(2);
    controller.setEngine(new FakeTextEngine());
    await flush();
    frames.run(2);
    expect(codes(of('diagnostic'))).toHaveLength(2);
    controller.setEngine(null);
    expect(controller.status).toBe('idle');
    frames.run(2);
    expect(codes(of('diagnostic'))).toEqual(Array(3).fill('text-editor-engine-missing'));

    const late = createHost();
    late.controller.connect();
    late.controller.setEngine(new FakeTextEngine());
    late.frames.run(2);
    expect(late.of('diagnostic')).toEqual([]);
  });

  it('a new engine, a nodes change or a task checkbox name change remounts with the document carried over as portable HTML', async () => {
    const { controller, frames, instance, of } = await readyEditor({ content: HTML });
    instance.type('Very ');
    frames.tick();
    const published = of('value-change').length;
    const next = new FakeTextEngine();
    controller.setEngine(next);
    expect(instance.destroyed).toBe(true);
    expect(next.context!.initialContent).toEqual({
      content: '<p data-id="p1">Very calm</p>',
      format: 'html',
    });
    await flush();
    expect(controller.getContent('html')).toBe('<p data-id="p1">Very calm</p>');
    const mounts = () => next.calls.filter((call) => call === 'mount').length;
    controller.setEngine(next);
    expect(mounts()).toBe(1);

    controller.setNodes([note]);
    expect([next.instances[0]!.destroyed, mounts()]).toEqual([true, 2]);
    expect(next.context!.nodes).toEqual([note]);
    controller.setNodes([note]);
    expect(mounts()).toBe(2);
    await flush();

    controller.setViewLabels({ taskCheckbox: 'Finished' });
    expect(mounts()).toBe(3);
    expect(next.context!.labels).toEqual({ taskCheckbox: 'Finished' });
    expect(next.context!.initialContent?.content).toBe('<p data-id="p1">Very calm</p>');
    controller.setViewLabels({ taskCheckbox: 'Finished' });
    expect(mounts()).toBe(3);
    await flush();
    frames.tick();
    expect(controller.status).toBe('ready');
    expect(of('value-change')).toHaveLength(published);
  });

  it('a reconnection after the release mounts anew from the kept HTML; until then the status is idle and the kept document reads in every portable format', async () => {
    const html = '<h2 data-id="h1">Tide</h2>\n<p data-id="p1">Calm <strong>sea</strong></p>';
    const { controller, frames, engine, instance } = await readyEditor({
      content: { content: html, format: 'html' },
    });
    controller.disconnect();
    frames.run(2);
    expect([instance.destroyed, controller.status, controller.value]).toEqual([true, 'idle', null]);
    expect(controller.getContent('html')).toBe(html);
    expect(controller.getContent('markdown')).toBe('## Tide\n\nCalm **sea**\n');
    expect(controller.getContent('text')).toBe('Tide\n\nCalm sea');
    expect(controller.getContent('json')).toBeNull();
    frames.tick();
    expect(controller.state).toMatchObject({
      empty: false,
      editable: true,
      selection: { kind: 'none' },
    });
    controller.connect();
    expect(engine.context!.initialContent).toEqual({ content: html, format: 'html' });
    await flush();
    expect(controller.status).toBe('ready');
    expect(controller.getContent('html')).toBe(html);
  });

  it('disconnection stops the cause tracker and the frames at once; a reconnection within the window resumes them', async () => {
    const { controller, frames, container, instance, of } = await readyEditor({ content: HTML });
    const removed = vi.spyOn(container, 'removeEventListener');
    const added = vi.spyOn(container, 'addEventListener');
    instance.type('Very ');
    controller.disconnect();
    expect(removed.mock.calls.map(([type]) => type).sort()).toEqual([
      'beforeinput',
      'compositionend',
      'compositionstart',
      'cut',
    ]);
    frames.tick();
    expect(of('value-change')).toEqual([]);
    controller.connect();
    expect(added.mock.calls.map(([type]) => type).sort()).toEqual([
      'beforeinput',
      'compositionend',
      'compositionstart',
      'cut',
    ]);
    frames.tick();
    expect(of<TextEditorValueChange>('value-change')).toMatchObject([
      { origin: 'engine', reason: 'input' },
    ]);
    expect(instance.destroyed).toBe(false);
  });

  it('disconnection stops publication at once; the release requests no frame and publishes the state before ready', async () => {
    const { controller, frames, instance } = await readyEditor({ content: HTML });
    const published: TextEditorEngineState[] = [];
    controller.subscribe(
      (state) => state,
      (state) => published.push(state),
    );
    void instance.focus();
    controller.disconnect();
    frames.tick();
    expect(published).toEqual([]);
    frames.tick();
    expect([instance.destroyed, controller.status, frames.pending]).toEqual([true, 'idle', 0]);
    expect(published).toHaveLength(1);
    expect(published[0]).toMatchObject({
      focused: false,
      empty: false,
      selection: { kind: 'none' },
    });
    expect(controller.state).toBe(published[0]);
    // A reconnection resumes publication: the new mount's state publishes at the next frame.
    controller.connect();
    await flush();
    frames.tick();
    expect(controller.status).toBe('ready');
    expect(published).toHaveLength(2);
    expect(controller.state).toBe(published[1]);
  });

  it('an empty document stays empty before ready, carried to a loading mount or kept after a release', async () => {
    const { controller, frames } = await readyEditor();
    expect(controller.state.empty).toBe(true);
    controller.setEngine(new FakeTextEngine({ async: true, autoReady: false }));
    frames.tick();
    expect([controller.status, controller.state.empty]).toEqual(['loading', true]);

    // The kept document is as empty as its instance was, also where no parser reads it.
    const released = await readyEditor();
    released.controller.disconnect();
    released.host.container = null;
    released.frames.run(3);
    expect(released.controller.getContent('html')).toMatch(/^<p data-id="[a-z0-9]{10}"><\/p>$/u);
    expect(released.controller.state).toMatchObject({ empty: true, selection: { kind: 'none' } });
  });

  it('keeps the released document when a later queued content call fails with its mount', async () => {
    const { controller, frames, engine } = await readyEditor({ content: HTML });
    controller.disconnect();
    frames.run(2);
    const error = new Error('The engine module is missing.');
    controller.setEngine(new FakeTextEngine({ failMount: error }));
    const queued = controller.request(setContent('<p data-id="q1">queued</p>'));
    expect(controller.getContent('html')).toBe('<p data-id="q1">queued</p>');
    controller.connect();
    await expect(queued).rejects.toBe(error);
    expect(controller.getContent('html')).toBe(HTML.content);
    controller.setEngine(engine);
    expect(engine.context!.initialContent).toEqual(HTML);
    await flush();
    expect(controller.getContent('html')).toBe(HTML.content);
  });

  it('dispose() destroys the instance, settles queued content as unchanged and publishes nothing more', async () => {
    const { controller, frames, instance, of } = await readyEditor({ content: HTML });
    let publications = 0;
    controller.subscribe(
      (state) => state,
      () => (publications += 1),
    );
    instance.type('Very ');
    controller.dispose();
    frames.run(3);
    expect([instance.destroyed, controller.status, publications]).toEqual([true, 'idle', 0]);
    expect(of('value-change')).toEqual([]);
    const pending = createHost();
    const queued = pending.controller.request(setContent('<p>late</p>'));
    pending.controller.dispose();
    await expect(queued).resolves.toBe('unchanged');
  });

  it('content the engine cannot represent is converted with one diagnostic per load', async () => {
    const table = '<table><tbody><tr><td>knots</td></tr></tbody></table>';
    const { controller, of } = await readyEditor({
      engine: { capabilities: BASE_CAPABILITIES },
      content: { content: `${table}<p data-id="p1">after</p>`, format: 'html' },
    });
    expect(of('diagnostic')).toEqual([
      {
        code: 'text-editor-content-converted',
        message: 'Converted content that the engine cannot represent: table.',
      },
    ]);
    expect(controller.getContent('text')).toBe('knots\n\nafter');
    await controller.request(setContent(`<p data-id="p2">before</p>${table}${table}`));
    expect(codes(of('diagnostic'))).toEqual(Array(2).fill('text-editor-content-converted'));
  });
});

/** Moves a fake container into another document, as adopting the widget into an iframe does. */
const moveToAnotherDocument = (container: object) =>
  Object.defineProperty(container, 'ownerDocument', {
    value: new FakeContainer().ownerDocument,
    configurable: true,
  });

describe('TextEditorController reconnection and release (uwg-te-req-engine-8, uwg-req-196)', () => {
  it('V-011 unit part: a move within one document keeps the instance, its document, selection and history', async () => {
    const { controller, frames, engine, instance, of } = await readyEditor({ content: HTML });
    instance.type('Very ');
    frames.tick();
    const selection = controller.state.selection;
    controller.disconnect();
    controller.connect();
    frames.run(3);
    expect(engine.calls.filter((call) => call === 'mount' || call === 'destroy')).toEqual([
      'mount',
    ]);
    expect(controller.state.selection).toEqual(selection);
    expect(controller.getContent('html')).toBe('<p data-id="p1">Very calm</p>');
    expect(instance.getState().history.undo).toBe(true);
    expect(of('ready')).toHaveLength(1);
  });

  it('uwg-te-req-engine-8: a reconnection into another document within the window remounts once with the document carried over and an empty history', async () => {
    const { controller, frames, engine, instance, container, of } = await readyEditor({
      content: HTML,
    });
    instance.type('Very ');
    frames.tick();
    const changes = of('value-change').length;
    controller.disconnect();
    moveToAnotherDocument(container);
    controller.connect();
    expect(instance.destroyed).toBe(true);
    expect(engine.calls.filter((call) => call === 'mount' || call === 'destroy')).toEqual([
      'mount',
      'destroy',
      'mount',
    ]);
    expect(engine.context!.initialContent).toEqual({
      content: '<p data-id="p1">Very calm</p>',
      format: 'html',
    });
    await flush();
    frames.run(3);
    const next = engine.instances.at(-1)!;
    expect([next.destroyed, controller.status]).toEqual([false, 'ready']);
    expect(next.getState().history).toEqual({ undo: false, redo: false });
    expect(of('ready')).toHaveLength(2);
    expect(of('value-change')).toHaveLength(changes);
    // The engine's styles are released with the old instance and adopted for the new one.
    expect(of('release')).toHaveLength(1);
    expect(of('adopt')).toHaveLength(2);
  });

  it('uwg-te-req-engine-8: a later move back into the first document remounts again; one within the new document keeps the instance', async () => {
    const { controller, frames, engine, container } = await readyEditor({ content: HTML });
    const first = container.ownerDocument;
    controller.disconnect();
    moveToAnotherDocument(container);
    controller.connect();
    await flush();
    controller.disconnect();
    controller.connect();
    await flush();
    expect(engine.calls.filter((call) => call === 'mount')).toHaveLength(2);
    controller.disconnect();
    Object.defineProperty(container, 'ownerDocument', { value: first, configurable: true });
    controller.connect();
    await flush();
    frames.run(3);
    expect(engine.calls.filter((call) => call === 'mount')).toHaveLength(3);
    expect(engine.instances.filter((instance) => !instance.destroyed)).toHaveLength(1);
    expect(controller.getContent('html')).toBe(HTML.content);
  });

  it('uwg-te-req-engine-8: a move into another document while the mount loads restarts it with the pending content', async () => {
    const { controller, container, frames } = createHost();
    const engine = new FakeTextEngine({ autoReady: false });
    controller.setDefaultContent(HTML);
    controller.connect();
    controller.setEngine(engine);
    expect(controller.status).toBe('loading');
    controller.disconnect();
    moveToAnotherDocument(container);
    controller.connect();
    await flush();
    expect(engine.instances.map((instance) => instance.destroyed)).toEqual([true, false]);
    expect(engine.context!.initialContent).toEqual(HTML);
    engine.context!.ready();
    frames.tick();
    expect(controller.status).toBe('ready');
  });

  it('V-584 unit part: after the release nothing of the controller or the instance stays registered', async () => {
    const { controller, frames, container, instance, of } = await readyEditor({ content: HTML });
    const added = vi.spyOn(container, 'addEventListener');
    const removed = vi.spyOn(container, 'removeEventListener');
    instance.type('Very ');
    controller.subscribe(
      (state) => state.empty,
      () => undefined,
    );
    controller.disconnect();
    // The controller's own listeners and frames stop at disconnection; the release waits.
    expect(removed).toHaveBeenCalledTimes(4);
    expect([instance.destroyed, frames.pending]).toEqual([false, 1]);
    frames.run(2);
    expect(instance.destroyed).toBe(true);
    expect(of('release')).toEqual(of('adopt'));
    frames.run(3);
    expect(frames.pending).toBe(0);
    expect(added).not.toHaveBeenCalled();
  });

  it('V-584 unit part: dispose before the release ends it at once and leaves no frame pending', async () => {
    const { controller, frames, instance, of } = await readyEditor({ content: HTML });
    controller.disconnect();
    controller.dispose();
    expect([instance.destroyed, frames.pending]).toEqual([true, 0]);
    expect(of('release')).toEqual(of('adopt'));
  });
});

describe('TextEditorController converted nodes (uwg-te-req-engine-8, uwg-te-req-evt-5)', () => {
  const PERSON = '<p data-id="p1">Ask <span data-type="person" data-label="Mira"></span></p>';
  const NOTE = '<aside data-type="note-box" data-id="n1">Kiln at noon</aside>';

  it('V-010 unit part: a node the engine rejects is read with its definition and converted with the diagnostic', async () => {
    const { controller, engine, of } = await readyEditor({
      nodes: [note, person],
      engine: { supports: (definition) => definition.name !== 'person' },
      content: { content: PERSON, format: 'html' },
    });
    expect(engine.context!.nodes).toEqual([note]);
    expect(engine.context!.convertNodes).toEqual([person]);
    expect(Object.isFrozen(engine.context!.convertNodes)).toBe(true);
    expect(controller.getContent('html')).toBe('<p data-id="p1">Ask @Mira</p>');
    expect(of('diagnostic')).toEqual([
      {
        code: 'text-editor-content-converted',
        message: 'Converted content that the engine cannot represent: person.',
      },
    ]);
    await controller.request(setContent(PERSON));
    expect(codes(of('diagnostic'))).toEqual(Array(2).fill('text-editor-content-converted'));
  });

  it('V-010 unit part: a remount after nodes dropped a definition converts its blocks with one diagnostic', async () => {
    const { controller, engine, of } = await readyEditor({
      nodes: [note],
      content: { content: NOTE, format: 'html' },
    });
    expect(of('diagnostic')).toEqual([]);
    controller.setNodes([]);
    expect(engine.context!.nodes).toEqual([]);
    expect(engine.context!.convertNodes).toEqual([note]);
    await flush();
    expect(controller.getContent('html')).toBe('<p data-id="n1">Kiln at noon</p>');
    expect(of('diagnostic')).toEqual([
      {
        code: 'text-editor-content-converted',
        message: 'Converted content that the engine cannot represent: note-box.',
      },
    ]);
    // Listing the definition again takes it out of the converted ones.
    controller.setNodes([note]);
    expect([engine.context!.nodes, engine.context!.convertNodes]).toEqual([[note], []]);
  });

  it('without definitions to convert the context lists none', async () => {
    const { engine } = await readyEditor({ nodes: [note] });
    expect(engine.context!.convertNodes).toEqual([]);
  });
});

describe('TextEditorController mount context (uwg-te-par-engine-1)', () => {
  it('V-023: initialContent equals the queued or default content and format', async () => {
    const { controller, engine } = await readyEditor({
      content: { content: '# Tide', format: 'markdown' },
    });
    expect(engine.context!.initialContent).toEqual({ content: '# Tide', format: 'markdown' });
    expect(controller.getContent('html')).toMatch(/^<h1 data-id="[a-z0-9]{10}">Tide<\/h1>$/u);

    const queued = createHost();
    const next = new FakeTextEngine();
    queued.controller.setDefaultContent({ content: 'default', format: 'text' });
    void queued.controller.request(setContent('queued', 'text'));
    queued.controller.connect();
    queued.controller.setEngine(next);
    expect(next.context!.initialContent).toEqual({ content: 'queued', format: 'text' });

    const empty = createHost();
    const blank = new FakeTextEngine();
    empty.controller.connect();
    empty.controller.setEngine(blank);
    expect(blank.context!.initialContent).toBeNull();
  });

  it('V-023: editable is false for read-only and disabled, and follows later changes', async () => {
    for (const access of [
      { readOnly: true, disabled: false },
      { readOnly: false, disabled: true },
    ]) {
      const { controller, engine, instance } = await readyEditor({ access });
      expect(engine.context!.editable).toBe(false);
      expect(controller.state.editable).toBe(false);
      controller.setAccess({ readOnly: false, disabled: false });
      expect(engine.calls.at(-1)).toBe('editable:true');
      expect(instance.editable).toBe(true);
    }
    const { engine } = await readyEditor();
    expect(engine.context!.editable).toBe(true);
  });

  it('V-023: nodes holds only the definitions the engine supports', async () => {
    const { engine } = await readyEditor({
      nodes: [note, person],
      engine: { supports: (definition) => definition.name !== 'person' },
    });
    expect(engine.context!.nodes).toEqual([note]);
    expect(Object.isFrozen(engine.context!.nodes)).toBe(true);
  });

  it('V-023: urls default to the protocol lists of the Markdown policy', async () => {
    const { engine } = await readyEditor();
    expect(engine.context!.urls).toEqual({
      links: linkProtocols(null),
      images: imageProtocols(null),
    });
    expect(engine.context!.urls).toEqual({
      links: ['http:', 'https:', 'mailto:', 'tel:'],
      images: ['http:', 'https:'],
    });
  });

  it('V-023: createId() matches /^[a-z0-9]{10}$/ with no repeat in 10,000 calls', async () => {
    const { engine } = await readyEditor();
    const ids = new Set<string>();
    for (let index = 0; index < 10_000; index++) {
      const id = engine.context!.createId();
      expect(id).toMatch(/^[a-z0-9]{10}$/u);
      ids.add(id);
    }
    expect(ids.size).toBe(10_000);
  });

  it('V-023: the signal aborts on teardown and supersession', async () => {
    const { controller, engine } = await readyEditor();
    const first = engine.context!;
    expect(first.signal.aborted).toBe(false);
    controller.setViewLabels({ taskCheckbox: 'Finished' });
    expect(first.signal.aborted).toBe(true);
    const second = engine.context!;
    controller.setEngine(null);
    expect(second.signal.aborted).toBe(true);
    // A mount still pending is superseded by the next one.
    const pending = new FakeTextEngine({ async: true });
    controller.setEngine(pending);
    controller.setEngine(new FakeTextEngine());
    expect(pending.context!.signal.aborted).toBe(true);
  });

  it('V-023: the label of the task checkbox is present and a change reaches the next mount', async () => {
    const { controller, engine } = await readyEditor();
    expect(engine.context!.labels).toEqual({ taskCheckbox: 'Done' });
    controller.setViewLabels({ taskCheckbox: 'Finished' });
    expect(engine.context!.labels).toEqual({ taskCheckbox: 'Finished' });
  });

  it('V-023: the styles adopt through the host and release with the instance', async () => {
    const { controller, of } = await readyEditor();
    expect(of('adopt')).toEqual(['.fake-editing-root { white-space: pre-wrap; }']);
    controller.setEngine(null);
    expect(of('release')).toEqual(['.fake-editing-root { white-space: pre-wrap; }']);
  });

  it('V-023, V-032: callbacks after the signal aborted are ignored', async () => {
    const { controller, frames, engine, instance, of } = await readyEditor({ content: HTML });
    const stale = engine.context!;
    controller.setEngine(new FakeTextEngine());
    await flush();
    const records = of('ready').length;
    stale.ready();
    stale.state();
    stale.content({ cause: 'input', reason: 'input' });
    stale.diagnostic('text-editor-engine-warning', 'Late.');
    stale.error(new Error('Late.'));
    frames.tick();
    expect(of('ready')).toHaveLength(records);
    expect([of('diagnostic'), of('error'), of('value-change')]).toEqual([[], [], []]);
    expect(controller.status).toBe('ready');
    expect(instance.destroyed).toBe(true);
  });
});

describe('TextEditorController requests (uwg-te-req-evt-1, uwg-te-req-evt-2)', () => {
  it('rejects in the order of the pipeline: unknown tool, value domain, availability, read-only; a tool that is not enabled is unchanged', async () => {
    const { controller, of } = await readyEditor({
      engine: { capabilities: BASE_CAPABILITIES },
      access: { readOnly: true, disabled: false },
      content: HTML,
    });
    await expect(controller.request(api('no-such-tool', { value: 3 }))).rejects.toMatchObject({
      name: 'NotSupportedError',
    });
    // The value domain comes first, also for an unavailable tool or a read-only editor.
    await expect(
      controller.request(api('table', { value: { rows: 0, columns: 2 } })),
    ).rejects.toBeInstanceOf(RangeError);
    await expect(controller.request(api('bold', { value: 1 }))).rejects.toBeInstanceOf(TypeError);
    await expect(
      controller.request(api('table', { value: { rows: 2, columns: 2 } })),
    ).rejects.toMatchObject({ name: 'NotSupportedError' });
    await expect(controller.request(api('bold'))).rejects.toMatchObject({
      name: 'NotSupportedError',
    });
    expect(
      of<TextEditorRequestFailedDetail>('request-failed').map(({ actions }) => actions),
    ).toEqual([[], [], [], [], [{ type: 'mark.toggle', mark: 'bold' }]]);
    controller.setAccess({ readOnly: false, disabled: false });
    // Nothing to undo: the tool is not enabled while the editor is ready.
    await expect(controller.request(api('undo'))).resolves.toBe('unchanged');
    expect(of('request')).toEqual([]);
    await selectText(controller, 'p1', 0, 4);
    await expect(controller.request(api('bold'))).resolves.toBe('applied');
    expect(of<TextEditorRequestDetail>('request')).toMatchObject([
      { actions: [{ type: 'mark.toggle', mark: 'bold' }], tool: 'bold' },
    ]);
  });

  it('a value given to a button, toggle or menu tool rejects with a TypeError; a custom tool receives its value', async () => {
    const stamp = defineTextEditorTool({
      id: 'stamp',
      kind: 'custom',
      label: 'Stamp',
      action: ({ value }) => [{ type: 'text.insert', text: String(value) }],
    });
    const { controller, of } = await readyEditor({ content: HTML, tools: [stamp] });
    for (const tool of ['undo', 'bold', 'more'])
      await expect(controller.request(api(tool, { value: 'x' }))).rejects.toBeInstanceOf(TypeError);
    expect(of('request')).toEqual([]);
    await expect(controller.request(api('stamp', { value: 'Ahoy ' }))).resolves.toBe('applied');
    expect(of<TextEditorRequestDetail>('request')).toMatchObject([
      { tool: 'stamp', value: 'Ahoy ', actions: [{ type: 'text.insert', text: 'Ahoy ' }] },
    ]);
    expect(controller.getContent('text')).toBe('Ahoy calm');
  });

  it('a request rejected before its actions resolve carries empty actions and the members it would have carried', async () => {
    const { controller, of } = await readyEditor({ access: { readOnly: true, disabled: false } });
    const sourceEvent = new Event('keydown');
    const trigger = {} as Element;
    await expect(
      controller.request({
        target: 'link',
        value: { href: 'javascript:alert(1)' },
        surface: 'keyboard',
        reason: 'hotkey',
        sourceEvent,
        trigger,
      }),
    ).rejects.toBeInstanceOf(TypeError);
    expect(of<TextEditorRequestFailedDetail>('request-failed')).toEqual([
      {
        actions: [],
        tool: 'link',
        surface: 'keyboard',
        value: { href: 'javascript:alert(1)' },
        reason: 'hotkey',
        sourceEvent,
        trigger,
        error: expect.any(TypeError),
      },
    ]);
  });

  it('a document request before ready is dispatched, then rejects with InvalidStateError and request-failed', async () => {
    const { controller, of } = createHost();
    controller.setTools(fakeTools(null));
    await expect(controller.request(api('bold'))).rejects.toMatchObject({
      name: 'InvalidStateError',
    });
    expect(of<TextEditorRequestDetail>('request')).toMatchObject([
      { tool: 'bold', actions: [{ type: 'mark.toggle', mark: 'bold' }] },
    ]);
    expect(of<TextEditorRequestFailedDetail>('request-failed')).toMatchObject([
      { tool: 'bold', actions: [{ type: 'mark.toggle' }], error: { name: 'InvalidStateError' } },
    ]);
  });

  it('applies a selection-only run directly when ready; before ready it rejects without a request', async () => {
    const select: TextEditorAction = {
      type: 'selection.set',
      selection: { kind: 'caret', block: 'p1', position: 'end' },
    };
    const early = createHost();
    await expect(early.controller.request(api(select))).rejects.toMatchObject({
      name: 'InvalidStateError',
    });
    expect(early.of('request')).toEqual([]);
    expect(early.of<TextEditorRequestFailedDetail>('request-failed')).toMatchObject([
      { actions: [select], tool: null, surface: 'api', error: { name: 'InvalidStateError' } },
    ]);

    const { controller, frames, of } = await readyEditor({ content: HTML });
    await expect(controller.request(api(select))).resolves.toBe('applied');
    frames.tick();
    expect(controller.state.caret?.point).toEqual({ block: 'p1', offset: 4 });
    expect([of('request'), of('value-change'), of('value-commit')]).toEqual([[], [], []]);
  });

  it('the detail is frozen, its actions too, with a placeholder source event made at call time and the trigger', async () => {
    const { controller, of } = await readyEditor({ content: HTML });
    await selectText(controller, 'p1', 0, 4);
    await controller.request(api('bold'));
    await controller.request(api('italic'));
    const trigger = {} as Element;
    const click = new Event('click');
    await controller.request({
      target: 'underline',
      surface: 'toolbar',
      reason: 'trigger-press',
      sourceEvent: click,
      trigger,
    });
    const [bold, italic, underline] = of<TextEditorRequestDetail>('request');
    expect(Object.isFrozen(bold)).toBe(true);
    expect(Object.isFrozen(bold!.actions)).toBe(true);
    expect(bold).toMatchObject({
      tool: 'bold',
      surface: 'api',
      reason: 'imperative-action',
      trigger: null,
    });
    expect(bold!.value).toBeUndefined();
    expect([bold!.sourceEvent.type, italic!.sourceEvent.type]).toEqual([
      'tp-programmatic-source',
      'tp-programmatic-source',
    ]);
    expect(bold!.sourceEvent).not.toBe(italic!.sourceEvent);
    expect(underline).toMatchObject({ sourceEvent: click, trigger, surface: 'toolbar' });
  });

  it('a request listener cannot change the actions that the request executes', async () => {
    const writes: boolean[] = [];
    const { controller, frames } = createHost({
      dispatchRequest: (detail) => {
        const action = detail.actions[0] as TextEditorBlocksDeleteAction;
        writes.push(Reflect.set(action, 'ids', ['p1']), Reflect.set(action.ids, 0, 'p1'));
        return true;
      },
    });
    const engine = new FakeTextEngine();
    controller.setDefaultContent({
      content: '<p data-id="p1">keep</p>\n<p data-id="p2">drop</p>',
      format: 'html',
    });
    controller.setTools(fakeTools(engine));
    controller.connect();
    controller.setEngine(engine);
    await flush();
    frames.tick();
    const proposed: TextEditorAction[] = [{ type: 'blocks.delete', ids: ['p2'] }];
    await expect(controller.request(api(proposed))).resolves.toBe('applied');
    expect(writes).toEqual([false, false]);
    expect(controller.getContent('html')).toBe('<p data-id="p1">keep</p>');
    // The request holds a frozen copy: the caller's actions stay as they were.
    expect(Object.isFrozen(proposed[0])).toBe(false);
  });

  it('a value tool whose actions can() refuses while ready settles unchanged without a request', async () => {
    const { controller, of } = await readyEditor({ content: HTML });
    // The fake inserts no blocks, so can() refuses the insertions of the table and image tools.
    await expect(
      controller.request(api('table', { value: { rows: 2, columns: 3 } })),
    ).resolves.toBe('unchanged');
    await expect(
      controller.request(api('image', { value: { src: 'https://example.com/tide.png', alt: '' } })),
    ).resolves.toBe('unchanged');
    expect([of('request'), of('request-failed')]).toEqual([[], []]);
    expect(controller.getContent('html')).toBe(HTML.content);
  });

  it('a cancelled request leaves the document unchanged and resolves cancelled', async () => {
    const { controller, host, instance, of } = await readyEditor({ content: HTML });
    await selectText(controller, 'p1', 0, 4);
    host.cancel = true;
    await expect(controller.request(api('bold'))).resolves.toBe('cancelled');
    expect(of('request')).toHaveLength(1);
    expect(instance.executed.filter(({ actions }) => actions[0]?.type === 'mark.toggle')).toEqual(
      [],
    );
    expect(controller.getContent('html')).toBe(HTML.content);
    expect([of('value-change'), of('value-commit'), of('request-failed')]).toEqual([[], [], []]);
  });

  it('an executed request resolves applied even when it leaves the document unchanged', async () => {
    const { controller, of } = await readyEditor({ content: HTML });
    await expect(controller.request(api('bold'))).resolves.toBe('applied');
    await expect(controller.request(setContent(controller.getContent('html')))).resolves.toBe(
      'applied',
    );
    expect(of('request')).toHaveLength(2);
    expect([of('value-change'), of('value-commit')]).toEqual([[], []]);
  });

  it('while read-only or disabled only selection.set and content.set apply', async () => {
    for (const access of [
      { readOnly: true, disabled: false },
      { readOnly: false, disabled: true },
    ]) {
      const { controller, of } = await readyEditor({ content: HTML, access });
      await expect(
        controller.request(api([{ type: 'blocks.delete', ids: ['p1'] }])),
      ).rejects.toMatchObject({ name: 'NotSupportedError' });
      await expect(controller.request(api('bold'))).rejects.toMatchObject({
        name: 'NotSupportedError',
      });
      await expect(selectText(controller, 'p1', 2)).resolves.toBe('applied');
      expect(controller.getContent('html')).toBe(HTML.content);
      await expect(controller.request(setContent('<p data-id="p1">new</p>'))).resolves.toBe(
        'applied',
      );
      expect(controller.getContent('html')).toBe('<p data-id="p1">new</p>');
      expect(of('request-failed')).toHaveLength(2);
      expect(of('request')).toHaveLength(1);
      expect(of('value-change')).toHaveLength(1);
    }
  });

  it('setContent after ready adds one undo step; form reset clears the history', async () => {
    const { controller, frames } = await readyEditor({ content: HTML });
    await controller.request(setContent('<p data-id="p1">one</p>'));
    frames.tick();
    expect(controller.state.history.undo).toBe(true);
    await controller.request({
      target: { type: 'content.set', content: HTML.content, format: 'html', history: 'reset' },
      surface: 'api',
      reason: 'form-reset',
    });
    frames.tick();
    expect(controller.state.history).toEqual({ undo: false, redo: false });
    expect(controller.getContent('html')).toBe(HTML.content);
  });

  it('content.set with an unknown format rejects with NotSupportedError, the content unchanged', async () => {
    const pending = createHost();
    await expect(
      pending.controller.request(setContent('x', 'rtf' as TextEditorFormat)),
    ).rejects.toMatchObject({ name: 'NotSupportedError' });
    expect(pending.controller.getContent('html')).toBeNull();
    const { controller, of } = await readyEditor({ content: HTML });
    await expect(
      controller.request(setContent('x', 'rtf' as TextEditorFormat)),
    ).rejects.toMatchObject({ name: 'NotSupportedError' });
    expect(controller.getContent('html')).toBe(HTML.content);
    expect(of('value-change')).toEqual([]);
    let thrown: unknown;
    try {
      controller.getContent('rtf' as TextEditorFormat);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toMatchObject({ name: 'NotSupportedError' });
  });

  it('rejects a malformed action and a content.set among other actions before dispatch', async () => {
    const { controller, of } = await readyEditor({ content: HTML });
    await expect(
      controller.request(api({ type: 'mark.blink' } as unknown as TextEditorAction)),
    ).rejects.toMatchObject({ name: 'NotSupportedError' });
    await expect(
      controller.request(
        api([
          { type: 'content.set', content: 'x', format: 'text', history: 'push' },
          { type: 'mark.toggle', mark: 'bold' },
        ]),
      ),
    ).rejects.toMatchObject({ name: 'NotSupportedError' });
    await expect(controller.request(api([]))).resolves.toBe('unchanged');
    expect(of('request')).toEqual([]);
  });

  it('fails a request whose list the engine refuses, after dispatch, with the document unchanged', async () => {
    const { controller, of } = await readyEditor({ content: HTML });
    await expect(
      controller.request(api([{ type: 'history.undo' }, { type: 'mark.toggle', mark: 'bold' }])),
    ).rejects.toMatchObject({ name: 'NotSupportedError' });
    expect(of('request')).toHaveLength(1);
    expect(of<TextEditorRequestFailedDetail>('request-failed')).toMatchObject([
      { actions: [{ type: 'history.undo' }, { type: 'mark.toggle' }] },
    ]);
    expect(controller.getContent('html')).toBe(HTML.content);
  });

  it('opens the surface of a link, image or table-size tool run without a value; color, radio-menu, menu and suggestion runs are unchanged', async () => {
    const { controller, host, of } = await readyEditor({ content: HTML });
    await expect(controller.request(api('link'))).resolves.toBe('opened');
    expect(of('open-surface')).toMatchObject([
      { tool: 'link', detail: { actions: [], tool: 'link', surface: 'api' } },
    ]);
    // The image tool opens no surface: without an upload hook it is not enabled, so its run
    // without a value changes nothing (`uwg-te-req-surfaces-4`).
    host.opens = false;
    await expect(controller.request(api('image'))).resolves.toBe('unchanged');
    for (const tool of ['highlight', 'align', 'more', 'slash'])
      await expect(controller.request(api(tool))).resolves.toBe('unchanged');
    expect(of('request')).toEqual([]);
    // The shortcut of the highlight applies yellow.
    await selectText(controller, 'p1', 0, 4);
    await expect(
      controller.request({ target: 'highlight', surface: 'keyboard', reason: 'hotkey' }),
    ).resolves.toBe('applied');
    expect(controller.getContent('html')).toBe(
      '<p data-id="p1"><mark data-color="yellow">calm</mark></p>',
    );
    // A tool that is not enabled opens nothing.
    host.opens = true;
    controller.setAccess({ readOnly: true, disabled: false });
    await expect(controller.request(api('table'))).resolves.toBe('unchanged');
    expect(of('open-surface')).toHaveLength(1);
  });

  it('a slash entry requests with the tool it executes, surface slash and no value; a run names slash', async () => {
    const { controller, of } = await readyEditor({
      content: { content: '<p data-id="p1">/hea</p><p data-id="p2">/hea</p>', format: 'html' },
    });
    await selectText(controller, 'p1', 4);
    await expect(
      controller.request({
        target: 'slash',
        value: 'heading-1',
        surface: 'slash',
        reason: 'item-press',
      }),
    ).resolves.toBe('applied');
    const [entry] = of<TextEditorRequestDetail>('request');
    expect(entry).toMatchObject({
      tool: 'heading-1',
      surface: 'slash',
      value: undefined,
      reason: 'item-press',
    });
    expect(entry!.actions[0]).toEqual({
      type: 'text.delete',
      range: { block: 'p1', from: 0, to: 4 },
    });
    expect(of<TextEditorValueChange>('value-change')[0]).toMatchObject({ tool: 'heading-1' });
    // The same entry run through the API names the slash tool with the entry as its value.
    await selectText(controller, 'p2', 4);
    await controller.request(api('slash', { value: 'heading-2' }));
    expect(of<TextEditorRequestDetail>('request')[1]).toMatchObject({
      tool: 'slash',
      surface: 'api',
      value: 'heading-2',
    });
    // An entry outside the menu fails as the slash tool's value.
    await selectText(controller, 'p1', 0);
    await expect(
      controller.request({
        target: 'slash',
        value: 'bold',
        surface: 'slash',
        reason: 'item-press',
      }),
    ).rejects.toBeInstanceOf(TypeError);
    expect(of<TextEditorRequestFailedDetail>('request-failed').at(-1)).toMatchObject({
      tool: 'slash',
      value: 'bold',
    });
  });

  it('the queued content call rejects with the error of the failed mount', async () => {
    const { controller, records, of } = createHost();
    const error = new Error('The engine module is missing.');
    const queued = controller.request(setContent('<p>queued</p>'));
    controller.connect();
    controller.setEngine(new FakeTextEngine({ async: true, failMount: error }));
    await expect(queued).rejects.toBe(error);
    expect(of('error')).toEqual([error]);
    expect(of<TextEditorRequestFailedDetail>('request-failed')).toMatchObject([
      { actions: [{ type: 'content.set' }], error },
    ]);
    expect(records.map(({ type }) => type)).toEqual(['request', 'error', 'request-failed']);
  });

  it('applies content set while the mount loads at ready, without history or a value change', async () => {
    const { controller, frames, of } = createHost();
    const engine = new FakeTextEngine({ async: true, autoReady: false });
    controller.setDefaultContent(HTML);
    controller.connect();
    controller.setEngine(engine);
    await flush();
    const queued = controller.request(setContent('<p data-id="q1">queued</p>'));
    engine.context!.ready();
    await expect(queued).resolves.toBe('applied');
    frames.tick();
    expect(controller.getContent('html')).toBe('<p data-id="q1">queued</p>');
    expect(controller.state.history.undo).toBe(false);
    expect([of('value-change'), of('value-commit')]).toEqual([[], []]);
  });

  it('uwg-te-req-tools-3: toolContext and isToolEnabled answer as requests do', async () => {
    const contexts: TextEditorToolContext[] = [];
    const stamp = defineTextEditorTool({
      id: 'stamp',
      kind: 'custom',
      label: 'Stamp',
      action: (context) => {
        contexts.push(context);
        return [{ type: 'text.insert', text: String(context.value) }];
      },
    });
    const { controller, frames, host, of } = createHost();
    const engine = new FakeTextEngine();
    const tools = fakeTools(engine, [stamp]);
    const tool = (id: string) => tools.registry.tools.get(id)!;
    controller.setDefaultContent(HTML);
    controller.setTools(tools);
    // No tool is enabled before ready.
    expect(controller.isToolEnabled(tool('bold'), controller.toolContext('toolbar'))).toBe(false);
    controller.connect();
    controller.setEngine(engine);
    await flush();
    frames.tick();
    host.direction = 'rtl';
    // Nothing to undo: not enabled, and a request of it settles unchanged.
    expect(controller.isToolEnabled(tool('undo'), controller.toolContext('toolbar'))).toBe(false);
    await expect(
      controller.request({ target: 'undo', surface: 'toolbar', reason: 'trigger-press' }),
    ).resolves.toBe('unchanged');
    // The context of a surface is the one that a request from that surface resolves its tool with.
    await selectText(controller, 'p1', 4);
    const context = controller.toolContext('keyboard', 'Ahoy ');
    expect(context).toMatchObject({
      surface: 'keyboard',
      value: 'Ahoy ',
      target: { kind: 'selection' },
      direction: 'rtl',
      layout: tools.layout,
      strings: tools.strings,
      table: null,
    });
    expect(controller.isToolEnabled(tool('stamp'), context)).toBe(true);
    contexts.length = 0;
    await expect(
      controller.request({
        target: 'stamp',
        value: 'Ahoy ',
        surface: 'keyboard',
        reason: 'hotkey',
      }),
    ).resolves.toBe('applied');
    expect(contexts.length).toBeGreaterThan(0);
    for (const seen of contexts) expect(seen).toEqual(context);
    expect(of<TextEditorRequestDetail>('request')).toMatchObject([{ tool: 'stamp' }]);
    // Read-only and disabled editors enable no tool that changes the document.
    for (const access of [
      { readOnly: true, disabled: false },
      { readOnly: false, disabled: true },
    ]) {
      controller.setAccess(access);
      expect(controller.isToolEnabled(tool('stamp'), controller.toolContext('toolbar', 'x'))).toBe(
        false,
      );
      expect(controller.isToolEnabled(tool('bold'), controller.toolContext('toolbar'))).toBe(false);
    }
  });
});

describe('TextEditorController publication (uwg-te-req-evt-3, uwg-te-req-evt-4, uwg-te-req-perf-1)', () => {
  it('an applied request that changes the document publishes one value change with origin request, then its commit', async () => {
    const { controller, records: log, of } = await readyEditor({ content: HTML });
    const before = controller.value!;
    await selectText(controller, 'p1', 0, 4);
    const click = new Event('click');
    await controller.request({
      target: 'bold',
      surface: 'toolbar',
      reason: 'trigger-press',
      sourceEvent: click,
    });
    const [change] = of<TextEditorValueChange>('value-change');
    const [commit] = of<TextEditorValueCommit>('value-commit');
    expect(change).toEqual({
      value: controller.value,
      previousValue: before,
      reason: 'trigger-press',
      sourceEvent: click,
      origin: 'request',
      tool: 'bold',
      actions: [{ type: 'mark.toggle', mark: 'bold' }],
    });
    expect(commit).toEqual({
      value: controller.value,
      previousValue: before,
      reason: 'trigger-press',
      sourceEvent: click,
    });
    expect(log.map(({ type }) => type).filter((type) => type.startsWith('value-'))).toEqual([
      'value-change',
      'value-commit',
    ]);
  });

  it('engine changes publish at most once per frame, with the latest revision and the cause of the latest change', async () => {
    const { controller, frames, instance, container, of } = await readyEditor({ content: HTML });
    const before = controller.value!;
    let publications = 0;
    controller.subscribe(
      (state) => state.contentVersion,
      () => (publications += 1),
    );
    const inputs: Event[] = [];
    container.addEventListener('beforeinput', (event) => inputs.push(event));
    instance.type('V');
    instance.type('ery ');
    expect(of('value-change')).toEqual([]);
    frames.tick();
    expect(publications).toBe(1);
    expect(of<TextEditorValueChange>('value-change')).toEqual([
      {
        value: controller.value,
        previousValue: before,
        reason: 'input',
        sourceEvent: inputs[1],
        origin: 'engine',
        tool: null,
        actions: [],
      },
    ]);
    expect(controller.value!.revision).toBe(instance.contentVersion);
    instance.nativeUndo();
    frames.tick();
    const changes = of<TextEditorValueChange>('value-change');
    expect(changes.map(({ reason }) => reason)).toEqual(['input', 'engine']);
    expect(changes[1]!.sourceEvent).toMatchObject({
      type: 'beforeinput',
      inputType: 'historyUndo',
    });
    expect(of('value-commit')).toEqual([]);
  });

  it('publishes a pending engine change before the change of a request', async () => {
    const { controller, instance, of } = await readyEditor({ content: HTML });
    instance.type('Very ');
    await selectText(controller, 'p1', 0, 4);
    await controller.request(api('bold'));
    expect(of<TextEditorValueChange>('value-change').map(({ origin }) => origin)).toEqual([
      'engine',
      'request',
    ]);
  });

  it('holds an engine change while a composition is in progress and publishes it once it ends', async () => {
    const { frames, instance, of } = await readyEditor({ content: HTML });
    instance.composition('compositionstart');
    instance.compose('k');
    instance.compose('a');
    frames.run(2);
    expect(of('value-change')).toEqual([]);
    instance.composition('compositionend');
    frames.tick();
    expect(of<TextEditorValueChange>('value-change')).toMatchObject([
      { origin: 'engine', reason: 'input', sourceEvent: { type: 'compositionstart' } },
    ]);
    expect(instance.getContent('text')).toBe('kacalm');
  });

  it('nothing is published for the mount content or a form-state restore', async () => {
    const { controller, frames, of } = await readyEditor({ content: HTML });
    await controller.request(setContent('<p data-id="p1">one</p>'));
    frames.tick();
    const value = controller.value!;
    controller.restoreContent({ content: '<p data-id="r1">restored</p>', format: 'html' });
    frames.tick();
    expect(controller.getContent('html')).toBe('<p data-id="r1">restored</p>');
    expect(controller.state.history.undo).toBe(false);
    expect(controller.value).not.toBe(value);
    expect(of('value-change')).toHaveLength(1);
    expect(of('value-commit')).toHaveLength(1);
    expect(of('request')).toHaveLength(1);
    // Content that cannot be read is reported, and the document stays.
    controller.restoreContent({ content: '{bad', format: 'json' });
    expect(codes(of('diagnostic'))).toEqual(['text-editor-content-invalid']);
    expect(controller.getContent('html')).toBe('<p data-id="r1">restored</p>');
  });

  it('a form-state restore before ready becomes the content of the mount, superseding content set before', async () => {
    const { controller, of } = createHost();
    const queued = controller.request(setContent('<p data-id="q1">queued</p>'));
    controller.restoreContent({ content: 'restored', format: 'text' });
    await expect(queued).resolves.toBe('unchanged');
    expect([controller.getContent('text'), controller.getContent('html')]).toEqual([
      'restored',
      null,
    ]);
    const engine = new FakeTextEngine();
    controller.connect();
    controller.setEngine(engine);
    expect(engine.context!.initialContent).toEqual({ content: 'restored', format: 'text' });
    await flush();
    expect(controller.getContent('text')).toBe('restored');
    expect([of('value-change'), of('value-commit')]).toEqual([[], []]);
  });

  it('a form-state restore while the mount loads becomes its content at ready, superseding content set before', async () => {
    const { controller, frames, of } = createHost();
    const engine = new FakeTextEngine({ async: true, autoReady: false });
    controller.setDefaultContent({ content: '<p data-id="p1">default</p>', format: 'html' });
    const queued = controller.request(setContent('<p data-id="q1">queued</p>'));
    controller.connect();
    controller.setEngine(engine);
    await flush();
    expect(engine.context!.initialContent?.content).toBe('<p data-id="q1">queued</p>');
    controller.restoreContent({ content: '<p data-id="r1">restored</p>', format: 'html' });
    await expect(queued).resolves.toBe('unchanged');
    expect(controller.getContent('html')).toBe('<p data-id="r1">restored</p>');
    engine.context!.ready();
    frames.tick();
    expect(controller.status).toBe('ready');
    expect(controller.getContent('html')).toBe('<p data-id="r1">restored</p>');
    expect(controller.state.history.undo).toBe(false);
    expect([of('value-change'), of('value-commit'), of('diagnostic')]).toEqual([[], [], []]);
  });

  it('a restore while the mount loads that the engine cannot read is reported, and the content of the mount stays', async () => {
    const { controller, of } = createHost();
    const engine = new FakeTextEngine({ async: true, autoReady: false });
    controller.setDefaultContent(HTML);
    controller.connect();
    controller.setEngine(engine);
    await flush();
    controller.restoreContent({ content: '{bad', format: 'json' });
    engine.context!.ready();
    expect(controller.status).toBe('ready');
    expect(codes(of('diagnostic'))).toEqual(['text-editor-content-invalid']);
    expect(controller.getContent('html')).toBe(HTML.content);
  });

  it('before ready the state reports the mount and getContent the pending content', async () => {
    const { controller, frames } = createHost();
    expect(controller.state).toMatchObject({
      version: 0,
      editable: true,
      focused: false,
      composing: false,
      empty: true,
      selection: { kind: 'none' },
      block: null,
      caret: null,
      history: { undo: false, redo: false },
    });
    expect(Object.isFrozen(controller.state.marks)).toBe(true);
    controller.setAccess({ readOnly: true, disabled: false });
    controller.setDefaultContent({ content: '# Tide', format: 'markdown' });
    frames.tick();
    expect(controller.state).toMatchObject({ editable: false, empty: false });
    expect(controller.getContent('markdown')).toBe('# Tide');
    expect(controller.getContent('html')).toBeNull();
    controller.setDefaultContent({ content: ' \n ', format: 'html' });
    frames.tick();
    expect(controller.state.empty).toBe(true);
    const json = { type: 'fake-document', blocks: [] };
    void controller.request(setContent(json, 'json'));
    frames.tick();
    expect(controller.state.empty).toBe(false);
    // The pending content is the request's frozen copy of the action's content.
    const pending = controller.getContent('json');
    expect(pending).toEqual(json);
    expect([pending === json, Object.isFrozen(pending)]).toEqual([false, true]);
    expect(controller.getContent('markdown')).toBeNull();
    expect([controller.value, controller.native]).toEqual([null, null]);
  });

  it('pending HTML or Markdown that reads as one empty paragraph is an empty document', () => {
    const { controller, frames, host } = createHost();
    const empty = (content: string, format: 'html' | 'markdown') => {
      controller.setDefaultContent({ content, format });
      frames.tick();
      return controller.state.empty;
    };
    expect(empty('<p></p>', 'html')).toBe(true);
    expect(empty('<p data-id="p1"></p>\n', 'html')).toBe(true);
    expect(empty('<p data-id="p1">Tide</p>', 'html')).toBe(false);
    expect(empty('<hr>', 'html')).toBe(false);
    expect(empty('[tide]: https://example.com/tide', 'markdown')).toBe(true);
    expect(empty('# Tide', 'markdown')).toBe(false);
    // The definitions decide what reads as a custom node.
    expect(empty('<aside data-type="note-box"></aside>', 'html')).toBe(true);
    controller.setNodes([note]);
    frames.tick();
    expect(controller.state.empty).toBe(false);
    controller.setNodes([]);
    // Without an HTML parser, HTML that holds more than whitespace counts as content.
    host.container = null;
    expect(empty('<p></p>', 'html')).toBe(false);
    expect(empty(' \n', 'html')).toBe(true);
  });

  it('publishing never serializes; a handle serializes once per format', async () => {
    const { controller, frames, instance } = await readyEditor({ content: HTML });
    instance.type('Very ');
    frames.tick();
    await selectText(controller, 'p1', 0, 4);
    await controller.request(api('bold'));
    frames.tick();
    expect(instance.serializations).toBe(0);
    const value = controller.value!;
    expect(value.getContent('html')).toBe('<p data-id="p1"><strong>Very</strong> calm</p>');
    expect(value.getContent('html')).toBe(value.getContent('html'));
    expect(instance.serializations).toBe(1);
    expect(value.getContent('text')).toBe('Very calm');
    expect(instance.serializations).toBe(2);
    expect(Object.isFrozen(value)).toBe(true);
  });
});

describe('TextEditorController latest change reason (uwg-te-tab-reasons r12, r13)', () => {
  it('reports the reason of an engine change before its frame and of an applied request', async () => {
    const { controller, frames, instance } = await readyEditor({ content: HTML });
    expect(controller.lastChangeReason).toBeNull();
    instance.type('Very ');
    expect(controller.lastChangeReason).toBe('input');
    frames.tick();
    await controller.request({
      ...setContent('<p data-id="p2">pasted</p>'),
      reason: 'input-paste',
    });
    expect(controller.lastChangeReason).toBe('input-paste');
  });
});

describe('TextEditorController notifications (uwg-te-req-engine-6)', () => {
  it('V-032: ready is honored once per mount', async () => {
    const { engine, of } = await readyEditor();
    engine.context!.ready();
    engine.context!.ready();
    await flush();
    expect(of('ready')).toHaveLength(1);
  });

  it('V-032: content() implies a state refresh', async () => {
    const { controller, frames, instance } = await readyEditor({ content: HTML });
    instance.type('Very ');
    frames.tick();
    expect(controller.state.contentVersion).toBe(instance.contentVersion);
    expect(controller.state.caret?.textBefore).toBe('Very ');
  });

  it('V-032: snapshot() serializes only when getContent is called, and an older snapshot returns its own revision', async () => {
    const { controller, frames, instance } = await readyEditor({ content: HTML });
    const first: TextEditorSnapshot = controller.value!;
    instance.type('Very ');
    frames.tick();
    const second = controller.value!;
    expect(instance.serializations).toBe(0);
    expect([first.revision, second.revision]).toEqual([1, 2]);
    expect(second.getContent('text')).toBe('Very calm');
    expect(first.getContent('text')).toBe('calm');
    expect(instance.serializations).toBe(2);
  });

  it('the diagnostics of the engine reach the host', async () => {
    const { instance, of } = await readyEditor();
    instance.context.diagnostic('text-editor-engine-version', 'Not verified with this version.');
    expect(of('diagnostic')).toEqual([
      { code: 'text-editor-engine-version', message: 'Not verified with this version.' },
    ]);
  });
});

describe('TextEditorController companion seams (uwg-te-req-evt-4, uwg-te-req-pres-5, uwg-te-tab-keymap-host-r13)', () => {
  it('announces the instance of each mount before ready and null before it is destroyed', async () => {
    const seen: [unknown, string, boolean][] = [];
    const { controller } = createHost({
      attached: (instance) =>
        seen.push([
          instance,
          controller.status,
          (instance as FakeTextInstance | null)?.destroyed ?? false,
        ]),
    });
    const engine = new FakeTextEngine();
    controller.connect();
    controller.setEngine(engine);
    await flush();
    const first = engine.instances[0]!;
    expect(seen).toEqual([[first, 'loading', false]]);
    controller.setEngine(new FakeTextEngine());
    expect(seen[1]).toEqual([null, 'ready', false]);
    expect(first.destroyed).toBe(true);
    await flush();
    expect(seen).toHaveLength(3);
    expect(seen[2]![0]).not.toBe(first);
  });

  it('commitPending commits a published engine change once with reason input-blur', async () => {
    const { controller, frames, instance, of } = await readyEditor({ content: HTML });
    const blur = new Event('focusout');
    expect(controller.commitPending(blur)).toBe(false);
    const before = controller.value;
    instance.type('Very ');
    frames.tick();
    expect(controller.commitPending(blur)).toBe(true);
    expect(of<TextEditorValueCommit>('value-commit')).toEqual([
      { value: controller.value, previousValue: before, reason: 'input-blur', sourceEvent: blur },
    ]);
    expect(controller.commitPending(blur)).toBe(false);
    expect(of('value-commit')).toHaveLength(1);
  });

  it('commitPending publishes the waiting engine change first, even during a composition', async () => {
    const { controller, instance, of, records } = await readyEditor({ content: HTML });
    instance.composition('compositionstart');
    instance.compose('k');
    expect(controller.commitPending(new Event('focusout'))).toBe(true);
    expect(records.map(({ type }) => type).filter((type) => type.startsWith('value'))).toEqual([
      'value-change',
      'value-commit',
    ]);
    expect(of<TextEditorValueCommit>('value-commit')[0]!.value).toBe(controller.value);
  });

  it('commitPending commits nothing after a request commit without a later engine change', async () => {
    const { controller, instance, of } = await readyEditor({ content: HTML });
    instance.type('Very ');
    await selectText(controller, 'p1', 0, 4);
    await controller.request(api('bold'));
    expect(of('value-commit')).toHaveLength(1);
    expect(controller.commitPending(new Event('focusout'))).toBe(false);
    expect(of('value-commit')).toHaveLength(1);
  });

  it('commitPending does nothing before ready', () => {
    const { controller, of } = createHost();
    expect(controller.commitPending(new Event('focusout'))).toBe(false);
    expect(of('value-commit')).toEqual([]);
  });

  it('previewDocument reads the pending content in every previewed format', async () => {
    const { controller } = createHost();
    const empty = controller.previewDocument();
    expect(empty?.blocks).toMatchObject([{ type: 'paragraph', content: [] }]);
    expect(controller.previewDocument()).toBe(empty);
    controller.setDefaultContent(HTML);
    const html = controller.previewDocument();
    expect(html?.blocks).toMatchObject([
      { type: 'paragraph', id: 'p1', content: [{ text: 'calm' }] },
    ]);
    expect(controller.previewDocument()).toBe(html);
    controller.setDefaultContent({ content: '# Tide', format: 'markdown' });
    expect(controller.previewDocument()?.blocks).toMatchObject([
      { type: 'heading', content: [{ text: 'Tide' }] },
    ]);
    controller.setDefaultContent({ content: 'one\n\ntwo', format: 'text' });
    expect(controller.previewDocument()?.blocks).toMatchObject([
      { type: 'paragraph', content: [{ text: 'one' }] },
      { type: 'paragraph', content: [{ text: 'two' }] },
    ]);
    controller.setDefaultContent({ content: { native: true }, format: 'json' });
    expect(controller.previewDocument()).toBeNull();
    controller.setDefaultContent(HTML);
    controller.connect();
    controller.setEngine(new FakeTextEngine());
    await flush();
    expect(controller.previewDocument()).toBeNull();
  });

  it('uwg-te-tab-keymap-host-r13: selectContent selects from the first to the last text point while read-only', async () => {
    const content = {
      content:
        '<hr data-id="d1"><p data-id="a">one</p><p data-id="b">two words</p><hr data-id="d2">',
      format: 'html',
    } as const;
    const { controller, instance, of } = await readyEditor({
      content,
      access: { readOnly: true, disabled: false },
    });
    const execute = vi.spyOn(instance, 'execute');
    const press = new Event('keydown');
    controller.selectContent(press);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute.mock.calls[0]![0]).toEqual([
      {
        type: 'selection.set',
        selection: {
          kind: 'text',
          anchor: { block: 'a', offset: 0 },
          head: { block: 'b', offset: 9 },
        },
      },
    ]);
    expect(execute.mock.calls[0]![1]).toMatchObject({
      reason: 'hotkey',
      sourceEvent: press,
      focus: false,
    });
    expect([of('request'), of('value-change'), of('value-commit')]).toEqual([[], [], []]);
  });

  it('V-738: holdsWholeDocument answers for a text selection from the first to the last text point, either way round', async () => {
    const content = {
      content:
        '<hr data-id="d1"><p data-id="a">one</p><p data-id="b">two words</p><hr data-id="d2">',
      format: 'html',
    } as const;
    const { controller, instance } = await readyEditor({ content });
    const state = vi.spyOn(instance, 'getState');
    const select = (selection: unknown) =>
      state.mockReturnValue({ ...instance.getState(), selection } as never);
    const point = (block: string, offset: number) => ({ block, offset });
    const range = (anchor: object, head: object, empty = false) => ({
      kind: 'text',
      anchor,
      head,
      empty,
    });
    select(range(point('a', 0), point('b', 9)));
    expect(controller.holdsWholeDocument()).toBe(true);
    select(range(point('b', 9), point('a', 0)));
    expect(controller.holdsWholeDocument()).toBe(true);
    select(range(point('a', 0), point('b', 8)));
    expect(controller.holdsWholeDocument()).toBe(false);
    select(range(point('a', 0), point('a', 0), true));
    expect(controller.holdsWholeDocument()).toBe(false);
    select({ kind: 'blocks', ids: ['d1', 'a', 'b', 'd2'] });
    expect(controller.holdsWholeDocument()).toBe(false);
  });

  it('selectContent does nothing while editable or disabled, or without text', async () => {
    for (const access of [
      { readOnly: false, disabled: false },
      { readOnly: true, disabled: true },
    ]) {
      const { controller, instance } = await readyEditor({ content: HTML, access });
      const execute = vi.spyOn(instance, 'execute');
      controller.selectContent(new Event('keydown'));
      expect(execute).not.toHaveBeenCalled();
    }
    const { controller, instance } = await readyEditor({
      content: { content: '<hr data-id="d1">', format: 'html' },
      access: { readOnly: true, disabled: false },
    });
    const execute = vi.spyOn(instance, 'execute');
    controller.selectContent(new Event('keydown'));
    expect(execute).not.toHaveBeenCalled();
  });

  it('uwg-te-req-a11y-1: extendSelection selects one character from a caret while read-only', async () => {
    const { controller, instance, of } = await readyEditor({
      content: {
        content: '<p data-id="a">one</p><hr data-id="d1"><p data-id="b">t😀</p>',
        format: 'html',
      },
      access: { readOnly: true, disabled: false },
    });
    const execute = vi.spyOn(instance, 'execute');
    const press = new Event('keydown');
    const extend = (from: TextEditorTextPoint, direction: 'forward' | 'backward') => {
      void controller.request(
        api({ type: 'selection.set', selection: { kind: 'text', anchor: from } }),
      );
      return controller.extendSelection(direction, press) ? instance.getState().selection : null;
    };
    const text = (anchor: TextEditorTextPoint, head: TextEditorTextPoint) => ({
      kind: 'text',
      anchor,
      head,
      empty: false,
    });
    expect(extend({ block: 'a', offset: 0 }, 'forward')).toEqual(
      text({ block: 'a', offset: 0 }, { block: 'a', offset: 1 }),
    );
    expect(execute.mock.calls.at(-1)).toEqual([
      [
        {
          type: 'selection.set',
          selection: {
            kind: 'text',
            anchor: { block: 'a', offset: 0 },
            head: { block: 'a', offset: 1 },
          },
        },
      ],
      { reason: 'hotkey', sourceEvent: press, focus: false },
    ]);
    expect(extend({ block: 'a', offset: 2 }, 'backward')).toEqual(
      text({ block: 'a', offset: 2 }, { block: 'a', offset: 1 }),
    );
    // Past a textblock's edge to the nearest block that holds text, an atom skipped.
    expect(extend({ block: 'a', offset: 3 }, 'forward')).toEqual(
      text({ block: 'a', offset: 3 }, { block: 'b', offset: 0 }),
    );
    expect(extend({ block: 'b', offset: 0 }, 'backward')).toEqual(
      text({ block: 'b', offset: 0 }, { block: 'a', offset: 3 }),
    );
    // A surrogate pair is one character.
    expect(extend({ block: 'b', offset: 1 }, 'forward')).toEqual(
      text({ block: 'b', offset: 1 }, { block: 'b', offset: 3 }),
    );
    // The document's edges extend nothing.
    expect(extend({ block: 'b', offset: 3 }, 'forward')).toBeNull();
    expect(extend({ block: 'a', offset: 0 }, 'backward')).toBeNull();
    expect([of('request'), of('value-change'), of('value-commit')]).toEqual([[], [], []]);
  });

  it('extendSelection starts from the document’s first or last text point without a selection', async () => {
    const { controller, instance } = await readyEditor({
      content: {
        content: '<hr data-id="d1"><p data-id="a"></p><p data-id="b">two</p><hr data-id="d2">',
        format: 'html',
      },
      access: { readOnly: true, disabled: false },
    });
    const none = () =>
      controller.request(api({ type: 'selection.set', selection: { kind: 'none' } }));
    await none();
    expect(controller.extendSelection('forward', new Event('keydown'))).toBe(true);
    // An empty first textblock: its only point to the next block's start.
    expect(instance.getState().selection).toEqual({
      kind: 'text',
      anchor: { block: 'a', offset: 0 },
      head: { block: 'b', offset: 0 },
      empty: false,
    });
    await none();
    expect(controller.extendSelection('backward', new Event('keydown'))).toBe(true);
    expect(instance.getState().selection).toEqual({
      kind: 'text',
      anchor: { block: 'b', offset: 3 },
      head: { block: 'b', offset: 2 },
      empty: false,
    });
  });

  it('extendSelection sets nothing while editable or disabled, over a selection, or without text', async () => {
    for (const access of [
      { readOnly: false, disabled: false },
      { readOnly: true, disabled: true },
    ]) {
      const { controller, instance } = await readyEditor({ content: HTML, access });
      const execute = vi.spyOn(instance, 'execute');
      expect(controller.extendSelection('forward', new Event('keydown'))).toBe(false);
      expect(execute).not.toHaveBeenCalled();
    }
    const { controller, instance } = await readyEditor({
      content: HTML,
      access: { readOnly: true, disabled: false },
    });
    // The browser extends a non-empty selection itself; a block selection is no caret.
    for (const selection of [
      { kind: 'text', anchor: { block: 'p1', offset: 0 }, head: { block: 'p1', offset: 2 } },
      { kind: 'blocks', ids: ['p1'] },
    ] as const) {
      await controller.request(api({ type: 'selection.set', selection }));
      const execute = vi.spyOn(instance, 'execute');
      expect(controller.extendSelection('forward', new Event('keydown'))).toBe(false);
      expect(execute).not.toHaveBeenCalled();
      execute.mockRestore();
    }
    const empty = await readyEditor({
      content: { content: '<hr data-id="d1">', format: 'html' },
      access: { readOnly: true, disabled: false },
    });
    expect(empty.controller.extendSelection('forward', new Event('keydown'))).toBe(false);
  });
});

describe('TextEditorController tool targets (uwg-te-req-tables-3)', () => {
  it('resolves a tool for the target of its surface, such as the line of a table menu', async () => {
    const contexts: TextEditorToolContext[] = [];
    const probe = defineTextEditorTool({
      id: 'probe',
      kind: 'custom',
      label: 'Probe',
      action: (context) => {
        contexts.push(context);
        return null;
      },
    });
    const { controller, instance } = await readyEditor({ tools: [probe] });
    const model = { id: 't9', rows: 2, columns: 2 } as never;
    const getTable = vi.spyOn(instance, 'getTable').mockImplementation(() => model);
    const target = { kind: 'table', table: 't9', axis: 'row', index: 1 } as const;
    expect(controller.toolContext('table-row', undefined, target)).toMatchObject({
      surface: 'table-row',
      target,
      table: model,
    });
    expect(getTable).toHaveBeenCalledWith('t9');
    await controller.request({
      target: 'probe',
      surface: 'table-row',
      reason: 'item-press',
      toolTarget: target,
    });
    expect(contexts.at(-1)?.target).toEqual(target);
    await controller.request({ target: 'probe', surface: 'toolbar', reason: 'trigger-press' });
    expect(contexts.at(-1)?.target).toEqual({ kind: 'selection' });
  });
});

describe('TextEditorController text direction (uwg-te-req-pres-2)', () => {
  /** An element whose `:dir()` is `direction`, with child elements. */
  const element = (direction: 'ltr' | 'rtl', children: Element[] = []) =>
    ({
      matches: (selector: string) => selector === `:dir(${direction})`,
      children,
      firstElementChild: children[0] ?? null,
    }) as unknown as HTMLElement;
  const paragraph = element('ltr');
  const cell = element('rtl', [element('rtl'), paragraph]);
  const instance = {
    blockElement: (id: string) =>
      id === 'p' ? element('ltr') : id === 'q' ? element('rtl') : null,
    cellElement: () => cell,
  };

  it('reads the direction of the first block of a selection, or of the paragraph of a cell', () => {
    expect(
      textDirectionOf(instance, {
        kind: 'text',
        anchor: { block: 'p', offset: 0 },
        head: { block: 'q', offset: 1 },
        empty: false,
      }),
    ).toBe('ltr');
    expect(textDirectionOf(instance, { kind: 'blocks', ids: ['q', 'p'] })).toBe('rtl');
    expect(
      textDirectionOf(instance, {
        kind: 'text',
        anchor: { block: 't', cell: { row: 0, column: 0, paragraph: 1 }, offset: 0 },
        head: { block: 't', cell: { row: 0, column: 0, paragraph: 1 }, offset: 0 },
        empty: true,
      }),
    ).toBe('ltr');
    expect(
      textDirectionOf(instance, {
        kind: 'cells',
        table: 't',
        range: { anchor: { row: 0, column: 0 }, head: { row: 0, column: 0 } },
      }),
    ).toBe('rtl');
    // Without an element, the widget's direction applies.
    expect(textDirectionOf(instance, { kind: 'blocks', ids: ['gone'] })).toBeUndefined();
    expect(textDirectionOf(instance, { kind: 'none' })).toBeUndefined();
  });
});
