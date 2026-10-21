import { describe, expect, it } from 'vitest';
import { preReadyState } from '../../../foundation/text-editor/state.js';
import type {
  TextEditorBlockRects,
  TextEditorBlockTree,
  TextEditorEngineState,
} from '../../../foundation/text-editor/model.js';
import { templateMarkup } from '../../../template-markup.test.js';
import {
  OverlayGeometry,
  overlayBox,
  type OverlayInstance,
  type OverlayMeasureContext,
  type OverlaySource,
} from '../geometry.js';
import {
  PLACEHOLDER_COPIED_PROPERTIES,
  placeholderBox,
  placeholderModel,
  previewFirstLine,
  renderPlaceholder,
  TextEditorPlaceholderLayer,
  type TextEditorPlaceholder,
  type TextEditorPlaceholderOptions,
} from './placeholder.js';

const options: TextEditorPlaceholderOptions = {
  placeholder: 'Write the survey notes',
  hint: 'Start writing',
  access: { readOnly: false, disabled: false },
};

const ready = preReadyState({ editable: true, empty: true });

/** A published state: a focused, editable, non-empty document with its caret in empty block `b2`. */
const state = (patch: Partial<TextEditorEngineState> = {}): TextEditorEngineState => ({
  ...ready,
  focused: true,
  empty: false,
  emptyBlock: { id: 'b2', kind: 'paragraph' },
  ...patch,
});

const rect = (left: number, top: number, width: number, height: number): DOMRectReadOnly => ({
  left,
  top,
  width,
  height,
  x: left,
  y: top,
  right: left + width,
  bottom: top + height,
  toJSON: () => ({}),
});

/** Every write throws and every read is logged with the current phase. */
function readOnlyObject<T extends object>(target: T, reads: string[], label: string): T {
  return new Proxy(target, {
    get(object, key, receiver) {
      if (typeof key === 'string') reads.push(`${phase.current} ${label}.${key}`);
      const value: unknown = Reflect.get(object, key, receiver);
      return typeof value === 'function' ? value.bind(object) : value;
    },
    set(_object, key) {
      throw new Error(`write ${label}.${String(key)}`);
    },
    defineProperty(_object, key) {
      throw new Error(`write ${label}.${String(key)}`);
    },
  });
}

const phase = { current: 'idle' };

/** A computed style: the copied properties with block-specific values, borders and paddings. */
function computedStyle(values: Record<string, string>, reads: string[]): CSSStyleDeclaration {
  const all: Record<string, string> = {
    'font-family': 'Inter',
    'font-size': '16px',
    'font-style': 'normal',
    'font-weight': '400',
    'font-stretch': '100%',
    'font-variant': 'normal',
    'font-feature-settings': 'normal',
    'font-variation-settings': 'normal',
    'line-height': '24px',
    'letter-spacing': '0.2px',
    'word-spacing': '0px',
    'text-transform': 'none',
    'text-indent': '4px',
    'padding-inline-start': '8px',
    direction: 'ltr',
    'text-align': 'start',
    ...values,
  };
  const camel = (name: string) => name.replace(/-([a-z])/gu, (_m, c: string) => c.toUpperCase());
  const style = {
    getPropertyValue: (name: string) => all[name] ?? '',
    setProperty: () => {
      throw new Error('write computed style');
    },
    ...Object.fromEntries(Object.entries(all).map(([name, value]) => [camel(name), value])),
  };
  for (const side of ['Top', 'Right', 'Bottom', 'Left'])
    for (const kind of [`border${side}Width`, `padding${side}`])
      (style as Record<string, unknown>)[kind] ??= '0px';
  return readOnlyObject(style as unknown as CSSStyleDeclaration, reads, 'style');
}

/** The pooled span: logs every write. */
function fakeSpan() {
  const writes: string[] = [];
  const styles = new Map<string, string>();
  let hidden = true;
  let text = '';
  const span = {
    style: {
      setProperty(name: string, value: string): void {
        writes.push(`${phase.current} style ${name}`);
        styles.set(name, value);
      },
    },
    get hidden() {
      return hidden;
    },
    set hidden(value: boolean) {
      writes.push(`${phase.current} hidden ${value}`);
      hidden = value;
    },
    get textContent() {
      return text;
    },
    set textContent(value: string) {
      writes.push(`${phase.current} text ${value}`);
      text = value;
    },
  };
  return { span, writes, styles, element: span as unknown as Element };
}

const blockTree = (roots: string[]): TextEditorBlockTree => ({
  version: 1,
  roots,
  get: () => undefined,
  ordered: () => [],
});

/** An instance whose blocks are read-only elements with their rects and computed styles. */
function fakeInstance(
  blocks: Record<string, { firstLine: DOMRectReadOnly; style: Record<string, string> }>,
  reads: string[],
) {
  const elements = new Map(
    Object.keys(blocks).map((id) => [
      id,
      readOnlyObject({ id } as unknown as HTMLElement, reads, `block ${id}`),
    ]),
  );
  const instance: OverlayInstance = {
    blockAt: () => null,
    getBlocks: () => blockTree(Object.keys(blocks)),
    blockElement: (id) => {
      reads.push(`${phase.current} blockElement ${id}`);
      return elements.get(id) ?? null;
    },
    blockRects: (id): TextEditorBlockRects | null => {
      reads.push(`${phase.current} blockRects ${id}`);
      const block = blocks[id];
      return block
        ? { box: block.firstLine, content: block.firstLine, firstLine: block.firstLine }
        : null;
    },
  };
  const owner = {
    getComputedStyle: (element: { id: string }) => {
      reads.push(`${phase.current} getComputedStyle`);
      return computedStyle(blocks[element.id]?.style ?? {}, reads);
    },
  } as unknown as Window;
  return { instance, owner };
}

/** A preview root whose first block has `box` and `style`; both throw on writes. */
function fakePreview(box: DOMRectReadOnly | null, style: Record<string, string>, reads: string[]) {
  const block = box
    ? readOnlyObject(
        { getBoundingClientRect: () => box } as unknown as HTMLElement,
        reads,
        'preview block',
      )
    : null;
  const root = readOnlyObject(
    { firstElementChild: block } as unknown as HTMLElement,
    reads,
    'preview root',
  );
  const owner = {
    getComputedStyle: () => {
      reads.push(`${phase.current} getComputedStyle`);
      return computedStyle(style, reads);
    },
  } as unknown as Window;
  return { root, owner };
}

const context = (
  source: OverlaySource,
  owner: Window,
  origin = { left: 0, top: 0 },
  scale = { x: 1, y: 1 },
): OverlayMeasureContext => ({
  source,
  owner,
  toOverlay: (box) => overlayBox(box, origin, scale),
});

/** A geometry that is not observing, with a source, so an invalidation neither runs nor hides. */
const geometry = () => {
  const instance: OverlayInstance = {
    getBlocks: () => blockTree([]),
    blockElement: () => null,
    blockRects: () => null,
    blockAt: () => null,
  };
  return new OverlayGeometry({ instance: () => instance, preview: () => null });
};

/** A layer with a bound span and `model`, measured against `measureContext` and applied. */
function place(
  layer: TextEditorPlaceholderLayer,
  measureContext: OverlayMeasureContext,
): ReturnType<TextEditorPlaceholderLayer['measure']> {
  phase.current = 'measure';
  const placement = layer.measure(measureContext);
  phase.current = 'apply';
  layer.apply(placement);
  phase.current = 'idle';
  return placement;
}

const document = (text = options.placeholder): TextEditorPlaceholder => ({
  kind: 'document',
  text,
});

describe('text editor placeholder model', () => {
  it('uwg-te-tab-props-r4: the document placeholder shows while the document is empty, editable, focused, read-only or disabled', () => {
    const expected = { kind: 'document', text: options.placeholder };
    expect(placeholderModel(state({ empty: true }), options)).toEqual(expected);
    expect(placeholderModel(state({ empty: true, focused: false }), options)).toEqual(expected);
    expect(placeholderModel(state({ empty: true, editable: false }), options)).toEqual(expected);
    for (const access of [
      { readOnly: true, disabled: false },
      { readOnly: false, disabled: true },
    ])
      expect(placeholderModel(state({ empty: true }), { ...options, access })).toEqual(expected);
  });

  it('uwg-te-tab-props-r4: no document placeholder while placeholder is empty or the document holds content', () => {
    expect(placeholderModel(state({ empty: true }), options)).toEqual(document());
    expect(placeholderModel(state({ empty: true }), { ...options, placeholder: '' })).toBeNull();
    expect(placeholderModel(state({ empty: false, emptyBlock: null }), options)).toBeNull();
  });

  it('uwg-te-req-pres-5: the hint shows only while the editing root is focused and editable, its caret block empty and the document not empty', () => {
    expect(placeholderModel(state(), options)).toEqual({
      kind: 'hint',
      text: 'Start writing',
      block: 'b2',
    });
    expect(placeholderModel(state({ focused: false }), options)).toBeNull();
    expect(placeholderModel(state({ editable: false }), options)).toBeNull();
    expect(placeholderModel(state({ emptyBlock: null }), options)).toBeNull();
    expect(placeholderModel(state({ empty: true }), options)?.kind).toBe('document');
  });

  it('uwg-te-req-prop-3: no hint while read-only or disabled, whichever of the state and the access reports it', () => {
    expect(placeholderModel(state(), options)?.kind).toBe('hint');
    expect(placeholderModel(state({ editable: false }), options)).toBeNull();
    expect(
      placeholderModel(state(), { ...options, access: { readOnly: true, disabled: false } }),
    ).toBeNull();
    // An effective disabled state (a disabled fieldset or Field) arrives as access.disabled.
    expect(
      placeholderModel(state(), { ...options, access: { readOnly: false, disabled: true } }),
    ).toBeNull();
  });

  it('uwg-te-req-pres-5: the placeholder and the hint hide while composing', () => {
    expect(placeholderModel(state({ empty: true }), options)?.kind).toBe('document');
    expect(placeholderModel(state({ empty: true, composing: true }), options)).toBeNull();
    expect(placeholderModel(state(), options)?.kind).toBe('hint');
    expect(placeholderModel(state({ composing: true }), options)).toBeNull();
  });

  it('uwg-te-tab-anatomy-r6: no hint while the caret is in a table cell', () => {
    expect(placeholderModel(state(), options)?.kind).toBe('hint');
    const caret = {
      point: { block: 't1', offset: 0, cell: { row: 0, column: 0 } },
      textBefore: '',
      inCode: false,
    } as unknown as TextEditorEngineState['caret'];
    expect(placeholderModel(state({ caret, emptyBlock: null }), options)).toBeNull();
  });

  it('uwg-te-req-pres-5: no hint while the hint string is empty', () => {
    expect(placeholderModel(state(), options)?.kind).toBe('hint');
    expect(placeholderModel(state(), { ...options, hint: '' })).toBeNull();
  });

  it('uwg-te-tab-props-r4: the document placeholder shows before ready while the pending document is empty', () => {
    expect(placeholderModel(preReadyState({ editable: true, empty: true }), options)).toEqual(
      document(),
    );
    expect(placeholderModel(preReadyState({ editable: false, empty: true }), options)).toEqual(
      document(),
    );
    expect(
      placeholderModel(preReadyState({ editable: true, empty: true }), {
        ...options,
        access: { readOnly: false, disabled: true },
      }),
    ).toEqual(document());
    expect(placeholderModel(preReadyState({ editable: true, empty: false }), options)).toBeNull();
  });
});

describe('text editor placeholder layer', () => {
  it("uwg-te-req-pres-5: the span box starts the text where the block's text starts", () => {
    const line = { left: 40, top: 12, width: 300, height: 24 };
    expect(placeholderBox(line, 8, false)).toEqual({ left: 32, top: 12, width: 308 });
    expect(placeholderBox(line, 8, true)).toEqual({ left: 40, top: 12, width: 308 });
  });

  it('uwg-te-req-pres-5: the span copies the font, line height, letter spacing, indentation and inline-start padding of the block', () => {
    const reads: string[] = [];
    const blockStyle = {
      'font-family': 'Lora',
      'font-size': '20px',
      'line-height': '30px',
      'letter-spacing': '0.5px',
      'text-indent': '12px',
      'padding-inline-start': '24px',
      direction: 'rtl',
      'text-align': 'right',
    };
    const { instance, owner } = fakeInstance(
      { b1: { firstLine: rect(100, 50, 200, 30), style: blockStyle } },
      reads,
    );
    const layer = new TextEditorPlaceholderLayer(geometry());
    const { element, styles, span } = fakeSpan();
    layer.bind(element);
    layer.update(document());
    place(layer, context({ kind: 'instance', instance }, owner, { left: 10, top: 20 }));
    for (const [name, value] of Object.entries(blockStyle)) expect(styles.get(name)).toBe(value);
    for (const name of PLACEHOLDER_COPIED_PROPERTIES) expect(styles.has(name)).toBe(true);
    expect(styles.get('width')).toBe('224px');
    expect(styles.get('translate')).toBe('90px 30px');
    expect(span.hidden).toBe(false);
    expect(span.textContent).toBe(options.placeholder);
  });

  it('uwg-te-req-pres-5: the document placeholder measures the first block of the block tree; the hint measures the empty caret block', () => {
    const reads: string[] = [];
    const { instance, owner } = fakeInstance(
      {
        b1: { firstLine: rect(10, 10, 100, 20), style: { 'padding-inline-start': '0px' } },
        b2: { firstLine: rect(10, 60, 100, 20), style: { 'padding-inline-start': '0px' } },
      },
      reads,
    );
    const layer = new TextEditorPlaceholderLayer(geometry());
    const { element, styles } = fakeSpan();
    layer.bind(element);
    layer.update(document());
    expect(place(layer, context({ kind: 'instance', instance }, owner))?.box.top).toBe(10);
    expect(styles.get('translate')).toBe('10px 10px');
    layer.update({ kind: 'hint', text: 'Start writing', block: 'b2' });
    expect(place(layer, context({ kind: 'instance', instance }, owner))?.box.top).toBe(60);
    expect(styles.get('translate')).toBe('10px 60px');
    expect(reads).toContain('measure blockRects b1');
    expect(reads).toContain('measure blockRects b2');
  });

  it('uwg-te-req-engine-10: an unmeasurable block leaves the span hidden', () => {
    const reads: string[] = [];
    const { instance, owner } = fakeInstance(
      { b1: { firstLine: rect(10, 10, 100, 20), style: {} } },
      reads,
    );
    const layer = new TextEditorPlaceholderLayer(geometry());
    const { element, span } = fakeSpan();
    layer.bind(element);
    layer.update(document());
    expect(place(layer, context({ kind: 'instance', instance }, owner))).not.toBeNull();
    expect(span.hidden).toBe(false);
    layer.update({ kind: 'hint', text: 'Start writing', block: 'gone' });
    expect(place(layer, context({ kind: 'instance', instance }, owner))).toBeNull();
    expect(span.hidden).toBe(true);
    expect(span.textContent).toBe('');
  });

  it('uwg-te-req-pres-5: a new target hides the span at once and the next pass shows it placed; a text-only change keeps it shown', () => {
    const reads: string[] = [];
    const { instance, owner } = fakeInstance(
      {
        b1: { firstLine: rect(10, 10, 100, 20), style: {} },
        b2: { firstLine: rect(10, 60, 100, 20), style: {} },
      },
      reads,
    );
    const layer = new TextEditorPlaceholderLayer(geometry());
    const { element, span } = fakeSpan();
    layer.bind(element);
    layer.update({ kind: 'hint', text: 'Start writing', block: 'b1' });
    place(layer, context({ kind: 'instance', instance }, owner));
    expect(span.hidden).toBe(false);
    layer.update({ kind: 'hint', text: 'Keep going', block: 'b1' });
    expect(span.hidden).toBe(false);
    expect(span.textContent).toBe('Keep going');
    layer.update({ kind: 'hint', text: 'Keep going', block: 'b2' });
    expect(span.hidden).toBe(true);
    expect(span.textContent).toBe('');
    // A placement measured for the earlier model is stale and stays unapplied.
    phase.current = 'measure';
    const stale = layer.measure(context({ kind: 'instance', instance }, owner));
    layer.update({ kind: 'hint', text: 'Keep going', block: 'b1' });
    layer.apply(stale);
    phase.current = 'idle';
    expect(span.hidden).toBe(true);
    place(layer, context({ kind: 'instance', instance }, owner));
    expect(span.hidden).toBe(false);
    layer.update(null);
    expect(span.hidden).toBe(true);
    expect(layer.wanted()).toBe(false);
  });

  it('uwg-te-tab-anatomy-r6: one aria-hidden span with the placeholder part, hidden while nothing is placed, its text cleared', () => {
    const layer = new TextEditorPlaceholderLayer(geometry());
    const markup = templateMarkup(renderPlaceholder(layer));
    expect(markup).toMatch(
      /^<span part="text-editor-placeholder" aria-hidden="true" hidden [^>]*><\/span>$/u,
    );
    expect(markup.match(/<span/gu)).toHaveLength(1);
    const reads: string[] = [];
    const { instance, owner } = fakeInstance(
      { b1: { firstLine: rect(0, 0, 10, 10), style: {} } },
      reads,
    );
    const { element, span } = fakeSpan();
    layer.update(document());
    expect(layer.wanted()).toBe(false);
    layer.bind(element);
    expect(layer.wanted()).toBe(true);
    place(layer, context({ kind: 'instance', instance }, owner));
    expect(span.hidden).toBe(false);
    layer.hide();
    expect(span.hidden).toBe(true);
    expect(span.textContent).toBe('');
  });

  it('uwg-te-req-engine-9: the layer writes only its own span', () => {
    const reads: string[] = [];
    const { instance, owner } = fakeInstance(
      { b1: { firstLine: rect(10, 10, 100, 20), style: {} } },
      reads,
    );
    const preview = fakePreview(rect(10, 10, 100, 40), {}, reads);
    const layer = new TextEditorPlaceholderLayer(geometry());
    const { element, writes } = fakeSpan();
    layer.bind(element);
    layer.update(document());
    expect(() => place(layer, context({ kind: 'instance', instance }, owner))).not.toThrow();
    expect(() =>
      place(
        layer,
        context({ kind: 'preview', root: preview.root }, preview.owner, { left: 5, top: 5 }),
      ),
    ).not.toThrow();
    expect(writes.some((write) => write.startsWith('apply style translate'))).toBe(true);
    expect(reads.length).toBeGreaterThan(0);
  });

  it('uwg-te-req-engine-10: the layer reads layout only while measuring', () => {
    const reads: string[] = [];
    const { instance, owner } = fakeInstance(
      { b1: { firstLine: rect(10, 10, 100, 20), style: {} } },
      reads,
    );
    const preview = fakePreview(rect(10, 10, 100, 40), {}, reads);
    const layer = new TextEditorPlaceholderLayer(geometry());
    const { element, writes } = fakeSpan();
    layer.bind(element);
    layer.update(document());
    place(layer, context({ kind: 'instance', instance }, owner));
    place(
      layer,
      context({ kind: 'preview', root: preview.root }, preview.owner, { left: 5, top: 5 }),
    );
    expect(reads.filter((read) => read.startsWith('measure ')).length).toBeGreaterThan(0);
    expect(reads.filter((read) => !read.startsWith('measure '))).toEqual([]);
    expect(writes.filter((write) => write.startsWith('measure '))).toEqual([]);
  });

  it('uwg-te-tab-anatomy-r6: before ready the document placeholder measures the first block of the preview root', () => {
    const insets = { top: 6, right: 4, bottom: 6, left: 10 };
    expect(previewFirstLine({ left: 20, top: 30, width: 200, height: 36 }, insets)).toEqual({
      left: 30,
      top: 36,
      width: 186,
      height: 24,
    });
    expect(previewFirstLine({ left: 0, top: 0, width: 8, height: 8 }, insets)).toEqual({
      left: 10,
      top: 6,
      width: 0,
      height: 0,
    });
    // Border plus padding: 2 + 4 at the top and the bottom, 0 + 3 at the right, 1 + 12 at the left.
    const boxStyle = {
      'border-top-width': '2px',
      'border-bottom-width': '2px',
      'border-left-width': '1px',
      'padding-top': '4px',
      'padding-right': '3px',
      'padding-bottom': '4px',
      'padding-left': '12px',
      'padding-inline-start': '12px',
      'font-size': '18px',
    };
    const blockInsets = { top: 6, right: 3, bottom: 6, left: 13 };
    for (const [rtl, scale] of [
      [false, 1],
      [true, 1],
      [false, 0.5],
    ] as const) {
      const reads: string[] = [];
      const blockStyle = { ...boxStyle, direction: rtl ? 'rtl' : 'ltr' };
      const box = rect(40, 60, 200 * scale, 36 * scale);
      const { root, owner } = fakePreview(box, blockStyle, reads);
      const layer = new TextEditorPlaceholderLayer(geometry());
      const { element, styles } = fakeSpan();
      layer.bind(element);
      layer.update(document());
      const measureContext = context(
        { kind: 'preview', root },
        owner,
        { left: 20, top: 30 },
        { x: scale, y: scale },
      );
      const placement = place(layer, measureContext);
      const border = overlayBox(box, { left: 20, top: 30 }, { x: scale, y: scale });
      const expected = placeholderBox(previewFirstLine(border, blockInsets), 12, rtl);
      expect(placement?.box).toEqual(expected);
      expect(styles.get('translate')).toBe(`${expected.left}px ${expected.top}px`);
      expect(styles.get('font-size')).toBe('18px');
      expect(styles.get('direction')).toBe(rtl ? 'rtl' : 'ltr');
    }
  });

  it('uwg-te-req-engine-10: a preview root without a first block or a layout box leaves the span hidden; a hint is never placed against the preview', () => {
    const reads: string[] = [];
    const shown = fakePreview(rect(10, 10, 100, 40), {}, reads);
    const layer = new TextEditorPlaceholderLayer(geometry());
    const { element, span } = fakeSpan();
    layer.bind(element);
    layer.update(document());
    expect(
      place(layer, context({ kind: 'preview', root: shown.root }, shown.owner)),
    ).not.toBeNull();
    expect(span.hidden).toBe(false);
    const empty = fakePreview(null, {}, reads);
    expect(place(layer, context({ kind: 'preview', root: empty.root }, empty.owner))).toBeNull();
    expect(span.hidden).toBe(true);
    const unboxed = fakePreview(rect(10, 10, 0, 0), {}, reads);
    expect(
      place(layer, context({ kind: 'preview', root: unboxed.root }, unboxed.owner)),
    ).toBeNull();
    expect(span.hidden).toBe(true);
    layer.update({ kind: 'hint', text: 'Start writing', block: 'b1' });
    expect(place(layer, context({ kind: 'preview', root: shown.root }, shown.owner))).toBeNull();
    expect(span.hidden).toBe(true);
  });
});
