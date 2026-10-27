/**
 * Fakes for the text editor tests (node environment): an engine whose instances keep an in-memory
 * portable document, read and write every format through the shared converters and apply the
 * actions that these tests need, and a recording controller host on manual frames. A `*.test.ts`
 * module stays out of the build; the suite at the end runs the pipeline through the fakes.
 */
import { describe, expect, it } from 'vitest';
import { domError } from '../dom-error.js';
import { ManualFrames, styledDocument } from '../fakes.test.js';
import {
  actionCapabilities,
  combinesHistory,
  isMutatingAction,
  isTextEditorFormat,
  isValidTextEditorAction,
  type TextEditorAction,
  type TextEditorBlockSetTypeAction,
} from './actions.js';
import { textEditorTools } from './builtin-tools/index.js';
import {
  BASE_CAPABILITIES,
  OPTIONAL_CAPABILITIES,
  requirementsMet,
  type TextEditorCapability,
} from './capabilities.js';
import { CORPUS_ENTRIES, corpusFile, corpusGolden, corpusNodes } from './content/corpus.test.js';
import {
  blockInline,
  blockModel,
  blockTree,
  locatedBlocks,
  type TextEditorLocatedBlock,
} from './adapters/shared/blocks.js';
import {
  readTextEditorContent,
  textEditorContentGlue,
  writeTextEditorContent,
  type TextEditorContentGlue,
} from './adapters/shared/content.js';
import { blockKindKeys, caretTextBefore, markState } from './adapters/shared/state.js';
import { htmlSource, type SourceElement } from './content/html-source.test.js';
import {
  canonicalize,
  isEmptyDocument,
  isListItem,
  selectPortableBlocks,
  tableGrid,
  type TextEditorPortableBlock,
  type TextEditorPortableDocument,
  type TextEditorPortableDraft,
  type TextEditorPortableDraftBlock,
  type TextEditorPortableInline,
  type TextEditorPortableMarks,
} from './content/portable.js';
import {
  TextEditorController,
  type TextEditorAccess,
  type TextEditorControllerHost,
  type TextEditorControllerTools,
  type TextEditorRequestDetail,
  type TextEditorRequestFailedDetail,
  type TextEditorValueChange,
  type TextEditorValueCommit,
} from './controller.js';
import type {
  TextEditorContentChange,
  TextEditorContentInput,
  TextEditorContentOptions,
  TextEditorEngine,
  TextEditorEngineContext,
  TextEditorEngineInstance,
  TextEditorExecuteOptions,
  TextEditorFocusPosition,
  TextEditorFormat,
  TextEditorPortableFormat,
  TextEditorRootAttributes,
  TextEditorSetContentOptions,
  TextEditorSnapshot,
} from './engine.js';
import { resolveTextEditorLayout } from './layout.js';
import type {
  TextEditorBlockTree,
  TextEditorEngineState,
  TextEditorHeadingLevel,
  TextEditorMarkState,
  TextEditorSelection,
  TextEditorSelectionInput,
  TextEditorTableModel,
  TextEditorTextPoint,
  TextEditorTextRange,
} from './model.js';
import type { TextEditorNodeDefinition } from './nodes.js';
import { textEditorStrings } from './strings.js';
import {
  blockKindKey,
  resolveTextEditorCapabilities,
  resolveTextEditorTools,
  type TextEditorTool,
} from './tools.js';

/** Settles the microtasks of a mount: its result, its ready notification and pending promises. */
export const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** The `type` of the fake engine's native JSON, which holds the portable blocks. */
export const FAKE_NATIVE_TYPE = 'fake-document';

/** The kinds that the fake's `block.set-type` turns textblocks into. */
const SETTABLE_KINDS: ReadonlySet<string> = new Set(['paragraph', 'heading', 'quote']);

// Portable document helpers

type Inline = TextEditorPortableInline;

const findBlock = (
  document: TextEditorPortableDocument,
  id: string,
): TextEditorLocatedBlock | undefined =>
  locatedBlocks(document.blocks).find((entry) => entry.block.id === id);

/** The blocks with the block `id` replaced, nested list items included. */
function replaceBlock(
  blocks: readonly TextEditorPortableBlock[],
  id: string,
  next: TextEditorPortableBlock,
): TextEditorPortableBlock[] {
  return blocks.map((block) => {
    if (block.id === id) return next;
    return isListItem(block)
      ? ({ ...block, children: replaceBlock(block.children, id, next) } as TextEditorPortableBlock)
      : block;
  });
}

/** The blocks without the blocks of `ids`, a list item with its nested items. */
function removeBlocks(
  blocks: readonly TextEditorPortableBlock[],
  ids: ReadonlySet<string>,
): TextEditorPortableBlock[] {
  return blocks.flatMap((block) => {
    if (block.id !== undefined && ids.has(block.id)) return [];
    return [
      isListItem(block)
        ? ({ ...block, children: removeBlocks(block.children, ids) } as TextEditorPortableBlock)
        : block,
    ];
  });
}

const unitLength = (node: Inline): number => (node.type === 'text' ? node.text.length : 1);
const inlineLength = (content: readonly Inline[]): number =>
  content.reduce((length, node) => length + unitLength(node), 0);

/** Inline content split at a UTF-16 offset, a text run divided where the offset falls in it. */
function splitAt(content: readonly Inline[], offset: number): [Inline[], Inline[]] {
  const before: Inline[] = [];
  const after: Inline[] = [];
  let position = 0;
  for (const node of content) {
    const length = unitLength(node);
    if (position + length <= offset) before.push(node);
    else if (position >= offset || node.type !== 'text') after.push(node);
    else {
      const cut = offset - position;
      before.push({ ...node, text: node.text.slice(0, cut) });
      after.push({ ...node, text: node.text.slice(cut) });
    }
    position += length;
  }
  return [before, after];
}

function sliceInline(
  content: readonly Inline[],
  from: number,
  to: number,
): [Inline[], Inline[], Inline[]] {
  const [head, rest] = splitAt(content, from);
  const [middle, tail] = splitAt(rest, to - from);
  return [head, middle, tail];
}

/** The text before an offset as the state reports it. */
const textBefore = (content: readonly Inline[], offset: number): string =>
  caretTextBefore(splitAt(content, offset)[0]);

/** The marks of the text run before an offset, which typed text takes. */
function marksBefore(content: readonly Inline[], offset: number): TextEditorPortableMarks {
  const before = splitAt(content, offset)[0].filter((node) => node.type === 'text');
  const last = before[before.length - 1];
  return last?.type === 'text' ? (last.marks ?? {}) : {};
}

/** Marks with one mark set to a value, or without it for `null`. */
function withMark(
  marks: TextEditorPortableMarks | undefined,
  mark: keyof TextEditorPortableMarks,
  value: string | true | null,
): TextEditorPortableMarks | undefined {
  const next: Record<string, unknown> = { ...marks };
  if (value === null) delete next[mark];
  else next[mark] = value;
  return Object.keys(next).length > 0 ? (next as TextEditorPortableMarks) : undefined;
}

const sameDocument = (a: TextEditorPortableDocument, b: TextEditorPortableDocument): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

const caretAt = (point: TextEditorTextPoint): TextEditorSelection =>
  Object.freeze({ kind: 'text', anchor: point, head: point, empty: true });

/** A caret at the start of the first block with inline content, or no selection without one. */
function startOf(document: TextEditorPortableDocument): TextEditorSelection {
  const first = locatedBlocks(document.blocks).find((entry) => blockInline(entry.block) !== null);
  return first?.block.id !== undefined
    ? caretAt(Object.freeze({ block: first.block.id, offset: 0 }))
    : Object.freeze({ kind: 'none' });
}

/** The text range of a selection within one block, from its start to its end. */
function rangeOf(selection: TextEditorSelection): TextEditorTextRange | null {
  if (selection.kind !== 'text' || selection.anchor.block !== selection.head.block) return null;
  if (selection.anchor.cell || selection.head.cell) return null;
  const from = Math.min(selection.anchor.offset, selection.head.offset);
  const to = Math.max(selection.anchor.offset, selection.head.offset);
  return { block: selection.anchor.block, from, to };
}

/** The fake's mapper of its native JSON, which holds portable blocks; a DataError for other JSON. */
function fromFakeNative(json: unknown): TextEditorPortableDraft {
  const record = json as { readonly type?: unknown; readonly blocks?: unknown } | null;
  if (
    typeof record !== 'object' ||
    record?.type !== FAKE_NATIVE_TYPE ||
    !Array.isArray(record.blocks)
  )
    throw domError('DataError', 'The native JSON is no fake document.');
  return { blocks: record.blocks as TextEditorPortableDraftBlock[] };
}

/** A `beforeinput` as Node builds it: an event carrying the input type. */
function inputEvent(inputType: string, isComposing = false, data: string | null = null): Event {
  return Object.assign(new Event('beforeinput', { cancelable: true }), {
    inputType,
    isComposing,
    data,
  });
}

// Engine

export interface FakeTextEngineOptions {
  /** Default: every base and optional capability. */
  readonly capabilities?: Iterable<TextEditorCapability> | undefined;
  /** `mount` returns a promise. */
  readonly async?: boolean | undefined;
  /** Reports ready a microtask after the mount; default true. */
  readonly autoReady?: boolean | undefined;
  /** `mount` throws it, or rejects with it when `async`. */
  readonly failMount?: unknown;
  readonly reservedKeys?: readonly string[] | undefined;
  /** Whether a custom node definition is supported; default every one. */
  readonly supports?: ((definition: TextEditorNodeDefinition) => boolean) | undefined;
  /** `execute` throws when it reaches an action that this matches. */
  readonly failOn?: ((action: TextEditorAction) => boolean) | undefined;
}

/** An engine that records its calls, every mount context and every instance. */
export class FakeTextEngine implements TextEditorEngine {
  readonly name = 'fake';
  readonly capabilities: ReadonlySet<TextEditorCapability>;
  readonly reservedKeys: readonly string[];
  readonly calls: string[] = [];
  readonly instances: FakeTextInstance[] = [];
  readonly contexts: TextEditorEngineContext[] = [];

  constructor(readonly options: FakeTextEngineOptions = {}) {
    this.capabilities = new Set(
      options.capabilities ?? [...BASE_CAPABILITIES, ...OPTIONAL_CAPABILITIES],
    );
    this.reservedKeys = Object.freeze([...(options.reservedKeys ?? [])]);
  }

  /** The context of the last mount. */
  get context(): TextEditorEngineContext | null {
    return this.contexts.at(-1) ?? null;
  }

  supportsNode(definition: TextEditorNodeDefinition): boolean {
    return this.options.supports?.(definition) ?? true;
  }

  mount(
    container: HTMLElement,
    context: TextEditorEngineContext,
  ): TextEditorEngineInstance | Promise<TextEditorEngineInstance> {
    this.calls.push('mount');
    this.contexts.push(context);
    const { failMount, async = false, autoReady = true } = this.options;
    if (failMount !== undefined) {
      if (async) return Promise.reject(failMount);
      throw failMount;
    }
    const instance = new FakeTextInstance(this, container, context);
    this.instances.push(instance);
    if (autoReady) queueMicrotask(() => context.ready());
    return async ? Promise.resolve(instance) : instance;
  }
}

/** The document, selection and stored marks that a transaction works on. */
interface FakeWork {
  readonly document: TextEditorPortableDocument;
  readonly selection: TextEditorSelection;
  /** The marks typed text takes at a caret, or `null` for those of the text before it. */
  readonly stored: TextEditorPortableMarks | null;
}

/** A snapshot of one revision, which serializes it only when read. */
class FakeSnapshot implements TextEditorSnapshot {
  readonly revision: number;
  readonly empty: boolean;

  constructor(
    readonly instance: FakeTextInstance,
    readonly document: TextEditorPortableDocument,
    revision: number,
    empty: boolean,
  ) {
    this.revision = revision;
    this.empty = empty;
  }

  getContent(format: TextEditorPortableFormat): string;
  getContent(format: 'json'): unknown;
  getContent(format: TextEditorFormat): unknown;
  getContent(format: TextEditorFormat): unknown {
    this.instance.serializations += 1;
    return this.instance.write(this.document, format);
  }
}

/**
 * An instance over an in-memory portable document. It loads and serializes through the shared
 * converters, converting what its capabilities cannot represent, and applies a list of actions
 * atomically on a copy: `selection.set`, `text.insert`, `text.delete`, `mark.toggle`,
 * `mark.color`, `block.set-type` into a paragraph, heading or quote, `blocks.delete`,
 * `history.undo` and `history.redo`. Other actions are refused, which `can` answers as `false`.
 */
export class FakeTextInstance implements TextEditorEngineInstance {
  readonly capabilities: ReadonlySet<TextEditorCapability>;
  readonly native = Object.freeze({ fake: true });
  document: TextEditorPortableDocument;
  selection: TextEditorSelection;
  editable: boolean;
  focused = false;
  composing = false;
  destroyed = false;
  version = 1;
  contentVersion = 1;
  /** Each `execute` call, in order. */
  readonly executed: {
    readonly actions: readonly TextEditorAction[];
    readonly options: TextEditorExecuteOptions;
  }[] = [];
  /** Dry runs of `can`. */
  canCalls = 0;
  /** Serializations that snapshots made. */
  serializations = 0;
  readonly rootAttributes: TextEditorRootAttributes[] = [];
  #stored: TextEditorPortableMarks | null = null;
  #undo: TextEditorPortableDocument[] = [];
  #redo: TextEditorPortableDocument[] = [];
  #state: TextEditorEngineState | null = null;
  readonly #glue: TextEditorContentGlue;
  readonly #available: ReadonlySet<TextEditorCapability>;
  readonly #releaseStyles: () => void;

  constructor(
    readonly engine: FakeTextEngine,
    readonly container: HTMLElement,
    readonly context: TextEditorEngineContext,
  ) {
    this.capabilities = engine.capabilities;
    this.#glue = textEditorContentGlue(context, engine, fromFakeNative, { parseHtml: htmlSource });
    this.#available = this.#glue.capabilities;
    this.editable = context.editable;
    const initial = context.initialContent;
    this.document = initial
      ? this.#read(initial.content, initial.format)
      : canonicalize({ blocks: [] }, { createId: context.createId }).document;
    this.selection = startOf(this.document);
    this.#releaseStyles = context.adoptStyles('.fake-editing-root { white-space: pre-wrap; }');
  }

  // Reading and writing (uwg-te-req-content-1)

  /** Content in a format as the canonical document, converted to what the engine represents. */
  #read(content: unknown, format: TextEditorFormat): TextEditorPortableDocument {
    const { document, diagnostics } = readTextEditorContent(content, format, this.#glue);
    for (const { code, message } of diagnostics) this.context.diagnostic(code, message);
    return document;
  }

  /** A revision of the document in a format, through the shared content glue. */
  write(
    document: TextEditorPortableDocument,
    format: TextEditorFormat,
    options?: TextEditorContentOptions,
  ): unknown {
    if (format !== 'json') return writeTextEditorContent(document, format, this.#glue, options);
    const { blocks } = options?.blocks ? selectPortableBlocks(document, options.blocks) : document;
    return { type: FAKE_NATIVE_TYPE, blocks: structuredClone(blocks) };
  }

  getContent(format: TextEditorPortableFormat, options?: TextEditorContentOptions): string;
  getContent(format: 'json', options?: TextEditorContentOptions): unknown;
  getContent(format: TextEditorFormat, options?: TextEditorContentOptions): unknown;
  getContent(format: TextEditorFormat, options?: TextEditorContentOptions): unknown {
    return this.write(this.document, format, options);
  }

  setContent(
    content: unknown,
    format: TextEditorFormat,
    options: TextEditorSetContentOptions = {},
  ) {
    if (!isTextEditorFormat(format))
      throw domError('NotSupportedError', `"${String(format)}" is not a content format.`);
    const document = this.#read(content, format);
    const changed = !sameDocument(document, this.document);
    if (options.history === 'push') {
      if (changed) this.#push();
    } else {
      this.#undo = [];
      this.#redo = [];
    }
    this.document = document;
    this.selection = startOf(document);
    this.#stored = null;
    this.version += 1;
    if (!changed) return this.context.state();
    this.contentVersion += 1;
    this.context.content({ cause: 'content', reason: options.reason ?? 'engine' });
  }

  snapshot(): TextEditorSnapshot {
    return new FakeSnapshot(this, this.document, this.contentVersion, this.#empty());
  }

  // State (uwg-te-req-engine-4)

  getState(): TextEditorEngineState {
    if (this.#state?.version !== this.version) this.#state = this.#buildState();
    return this.#state;
  }

  #empty(): boolean {
    return isEmptyDocument(this.document);
  }

  #buildState(): TextEditorEngineState {
    const { document, selection } = this;
    const headId =
      selection.kind === 'text'
        ? selection.head.block
        : selection.kind === 'blocks'
          ? selection.ids.at(-1)
          : undefined;
    const head = headId === undefined ? undefined : findBlock(document, headId);
    const model = head ? blockModel(head.block) : null;
    const range = rangeOf(selection);
    const content = head ? blockInline(head.block) : null;
    const caret =
      range && range.from === range.to && content
        ? Object.freeze({
            point: Object.freeze({ block: range.block, offset: range.from }),
            textBefore: textBefore(content, range.from),
            inCode: head?.block.type === 'code',
          })
        : null;
    return Object.freeze({
      version: this.version,
      contentVersion: this.contentVersion,
      editable: this.editable,
      focused: this.focused,
      composing: this.composing,
      empty: this.#empty(),
      selection,
      marks: this.#marks(),
      block:
        head && model
          ? Object.freeze({
              id: head.block.id!,
              kind: model.kind,
              attrs: model.attrs,
              depth: head.depth,
            })
          : null,
      blockKinds: blockKindKeys(model ? [model] : []),
      align: null,
      link: null,
      table: null,
      caret,
      emptyBlock:
        caret && content?.length === 0 && model
          ? Object.freeze({ id: caret.point.block, kind: model.kind })
          : null,
      history: Object.freeze({ undo: this.#undo.length > 0, redo: this.#redo.length > 0 }),
    });
  }

  /** The marks over the selected text, or at a caret the marks typed text takes. */
  #marks(): TextEditorMarkState {
    return markState(this.#markRuns(this.#work()) ?? []);
  }

  // Actions (uwg-te-req-engine-5)

  can(action: TextEditorAction): boolean {
    this.canCalls += 1;
    try {
      if (!this.#allowed(action)) return false;
      if (!this.editable && isMutatingAction(action)) return false;
      if (action.type === 'history.undo') return this.#undo.length > 0;
      if (action.type === 'history.redo') return this.#redo.length > 0;
      return this.#apply(this.#work(), action) !== null;
    } catch {
      return false;
    }
  }

  execute(actions: readonly TextEditorAction[], options: TextEditorExecuteOptions): boolean {
    this.executed.push(Object.freeze({ actions, options }));
    if (actions.length === 0 || combinesHistory(actions)) return false;
    if (!this.editable && actions.some(isMutatingAction)) return false;
    const first = actions[0]!;
    const change: TextEditorContentChange = {
      cause: 'action',
      reason: options.reason,
      sourceEvent: options.sourceEvent,
      action: actions.find(isMutatingAction)?.type,
    };
    if (first.type === 'history.undo' || first.type === 'history.redo')
      return this.#travel(first.type === 'history.undo', change);
    let work = this.#work();
    for (const action of actions) {
      if (this.engine.options.failOn?.(action))
        throw new Error(`The fake engine failed on ${action.type}.`);
      if (!this.#allowed(action)) return false;
      const next = this.#apply(work, action);
      if (!next) return false;
      work = next;
    }
    this.#commit(work, change);
    return true;
  }

  #allowed(action: TextEditorAction): boolean {
    if (!isValidTextEditorAction(action)) return false;
    const kindOf = (id: string) => {
      const found = findBlock(this.document, id);
      return found ? blockModel(found.block).kind : null;
    };
    return requirementsMet(actionCapabilities(action, kindOf), this.#available);
  }

  #work(): FakeWork {
    return { document: this.document, selection: this.selection, stored: this.#stored };
  }

  #canonical(blocks: readonly TextEditorPortableBlock[]): TextEditorPortableDocument {
    const { nodes, createId } = this.context;
    return canonicalize({ blocks }, { nodes, createId }).document;
  }

  /** The transaction's result, or `null` when the action cannot apply here. */
  #apply(work: FakeWork, action: TextEditorAction): FakeWork | null {
    switch (action.type) {
      case 'selection.set': {
        if (action.selection.kind === 'none')
          return { ...work, selection: { kind: 'none' }, stored: null };
        const selection = this.#select(work.document, action.selection);
        return selection ? { ...work, selection, stored: null } : null;
      }
      case 'text.insert': {
        const range = action.range ?? rangeOf(work.selection);
        if (!range) return null;
        const found = findBlock(work.document, range.block);
        const content = found ? blockInline(found.block) : null;
        const marks =
          content && range.from === range.to
            ? (work.stored ?? marksBefore(content, range.from))
            : {};
        const text: Inline = {
          type: 'text',
          text: action.text,
          ...(Object.keys(marks).length > 0 ? { marks } : {}),
        };
        return this.#replaceText(work, range, [text]);
      }
      case 'text.delete':
        return this.#replaceText(work, action.range, []);
      case 'mark.toggle': {
        const { mark } = action;
        // The mark turns off when it covers all of the selection, and on otherwise.
        const covered = this.#markValues(work, mark)?.every((value) => value === true) ?? false;
        return this.#markText(work, (marks) => withMark(marks, mark, covered ? null : true));
      }
      case 'mark.color': {
        const mark = action.mark === 'text-color' ? 'textColor' : 'highlight';
        return this.#markText(work, (marks) => withMark(marks, mark, action.color));
      }
      case 'block.set-type':
        return this.#setType(work, action);
      case 'blocks.delete': {
        if (!action.ids.every((id) => findBlock(work.document, id))) return null;
        const document = this.#canonical(removeBlocks(work.document.blocks, new Set(action.ids)));
        return { document, selection: startOf(document), stored: null };
      }
      default:
        return null;
    }
  }

  #select(
    document: TextEditorPortableDocument,
    input: TextEditorSelectionInput,
  ): TextEditorSelection | null {
    const point = (value: TextEditorTextPoint): TextEditorTextPoint | null => {
      const found = findBlock(document, value.block);
      const content = found ? blockInline(found.block) : null;
      if (!content || value.cell || value.offset > inlineLength(content)) return null;
      return Object.freeze({ block: value.block, offset: value.offset });
    };
    switch (input.kind) {
      case 'text': {
        const anchor = point(input.anchor);
        const head = point(input.head ?? input.anchor);
        if (!anchor || !head) return null;
        const empty = anchor.block === head.block && anchor.offset === head.offset;
        return Object.freeze({ kind: 'text', anchor, head, empty });
      }
      case 'caret': {
        const found = findBlock(document, input.block);
        const content = found ? blockInline(found.block) : null;
        if (!content || input.cell) return null;
        const offset = input.position === 'start' ? 0 : inlineLength(content);
        return caretAt(Object.freeze({ block: input.block, offset }));
      }
      case 'blocks':
        return input.ids.every((id) => findBlock(document, id))
          ? Object.freeze({ kind: 'blocks', ids: Object.freeze([...input.ids]) })
          : null;
      case 'cells':
        return findBlock(document, input.table)?.block.type === 'table'
          ? Object.freeze({ kind: 'cells', table: input.table, range: input.range })
          : null;
    }
  }

  #replaceText(
    work: FakeWork,
    range: TextEditorTextRange,
    inserted: readonly Inline[],
  ): FakeWork | null {
    const found = findBlock(work.document, range.block);
    const content = found ? blockInline(found.block) : null;
    if (!found || !content || range.cell || range.to > inlineLength(content)) return null;
    const [head, , tail] = sliceInline(content, range.from, range.to);
    const block = {
      ...found.block,
      content: [...head, ...inserted, ...tail],
    } as TextEditorPortableBlock;
    const document = this.#canonical(replaceBlock(work.document.blocks, range.block, block));
    const offset = range.from + inlineLength(inserted);
    return {
      document,
      selection: caretAt(Object.freeze({ block: range.block, offset })),
      stored: null,
    };
  }

  /** The selected text: its range within one block, the block and its inline content. */
  #selected(work: FakeWork) {
    const range = rangeOf(work.selection);
    const found = range ? findBlock(work.document, range.block) : undefined;
    const content = found ? blockInline(found.block) : null;
    return range && found && content ? { range, block: found.block, content } : null;
  }

  /** The marks of each selected text run, or at a caret the marks typed text takes. */
  #markRuns(work: FakeWork): (TextEditorPortableMarks | undefined)[] | null {
    const selected = this.#selected(work);
    if (!selected) return null;
    const { range, content } = selected;
    if (range.from === range.to) return [work.stored ?? marksBefore(content, range.from)];
    const runs = sliceInline(content, range.from, range.to)[1];
    return runs.flatMap((node) => (node.type === 'text' ? [node.marks] : []));
  }

  /** The values of a mark over the selected text, or at a caret the one typed text takes. */
  #markValues(work: FakeWork, mark: keyof TextEditorPortableMarks): unknown[] | null {
    return this.#markRuns(work)?.map((marks) => marks?.[mark]) ?? null;
  }

  /** Changes the marks of the selected text, or at a caret those that typed text takes. */
  #markText(
    work: FakeWork,
    change: (marks: TextEditorPortableMarks | undefined) => TextEditorPortableMarks | undefined,
  ): FakeWork | null {
    const selected = this.#selected(work);
    if (!selected) return null;
    const { range, block, content } = selected;
    // At a caret the marks apply to the text typed next: the document stays as it is.
    if (range.from === range.to)
      return { ...work, stored: change(work.stored ?? marksBefore(content, range.from)) ?? {} };
    const [head, middle, tail] = sliceInline(content, range.from, range.to);
    const marked = middle.map((node) =>
      node.type === 'text' ? { ...node, marks: change(node.marks) } : node,
    );
    const next = { ...block, content: [...head, ...marked, ...tail] } as TextEditorPortableBlock;
    return {
      ...work,
      document: this.#canonical(replaceBlock(work.document.blocks, range.block, next)),
      stored: null,
    };
  }

  #setType(work: FakeWork, action: TextEditorBlockSetTypeAction): FakeWork | null {
    if (!SETTABLE_KINDS.has(action.kind)) return null;
    const selection = work.selection;
    const ids =
      action.ids ??
      (selection.kind === 'blocks'
        ? selection.ids
        : selection.kind === 'text' && selection.anchor.block === selection.head.block
          ? [selection.anchor.block]
          : null);
    if (!ids) return null;
    const targets = ids.map((id) => findBlock(work.document, id)?.block);
    if (targets.some((block) => !block || !SETTABLE_KINDS.has(block.type))) return null;
    const level = action.attrs?.level as TextEditorHeadingLevel | undefined;
    const key = action.kind === 'heading' ? `heading:${String(level)}` : action.kind;
    const toParagraph =
      action.toggle === true &&
      targets.every((block) => block && blockKindKey(blockModel(block)) === key);
    let blocks: readonly TextEditorPortableBlock[] = work.document.blocks;
    for (const block of targets) {
      if (!block?.id) continue;
      const { id } = block;
      const content = blockInline(block) ?? [];
      const align =
        block.type === 'paragraph' || block.type === 'heading' || block.type === 'quote'
          ? block.align
          : undefined;
      const aligned = align ? { align } : {};
      const next: TextEditorPortableBlock =
        toParagraph || action.kind === 'paragraph'
          ? { type: 'paragraph', id, ...aligned, content }
          : action.kind === 'heading'
            ? { type: 'heading', id, level: level ?? 1, ...aligned, content }
            : { type: 'quote', id, ...aligned, content };
      blocks = replaceBlock(blocks, id, next);
    }
    return { ...work, document: this.#canonical(blocks) };
  }

  /** Applies a finished transaction: one content notification for a document change, else `state`. */
  #commit(work: FakeWork, change: TextEditorContentChange): void {
    const changed = !sameDocument(work.document, this.document);
    if (changed) this.#push();
    this.document = work.document;
    this.selection = work.selection;
    this.#stored = work.stored;
    this.version += 1;
    if (!changed) return this.context.state();
    this.contentVersion += 1;
    this.context.content(change);
  }

  #push(): void {
    this.#undo.push(this.document);
    this.#redo = [];
  }

  /** One step back or forward through the history. */
  #travel(back: boolean, change: TextEditorContentChange): boolean {
    const from = back ? this.#undo : this.#redo;
    const previous = from.pop();
    if (!previous) return false;
    (back ? this.#redo : this.#undo).push(this.document);
    this.document = previous;
    this.selection = startOf(previous);
    this.#stored = null;
    this.version += 1;
    this.contentVersion += 1;
    this.context.content(change);
    return true;
  }

  // Changes the engine originates

  /** Typing at the caret: a `beforeinput` on the container, then the engine's change. */
  type(text: string): void {
    const event = inputEvent('insertText', false, text);
    this.container.dispatchEvent(event);
    const range = rangeOf(this.selection);
    const work = range && this.#apply(this.#work(), { type: 'text.insert', text, range });
    if (!work) throw new Error('The fake engine cannot type without a caret in a textblock.');
    this.#commit(work, { cause: 'input', reason: 'input', sourceEvent: event });
  }

  /** Composed text inside a composition that the container's composition events delimit. */
  compose(text: string): void {
    const event = inputEvent('insertCompositionText', true, text);
    this.container.dispatchEvent(event);
    const range = rangeOf(this.selection);
    const work = range && this.#apply(this.#work(), { type: 'text.insert', text, range });
    if (!work) throw new Error('The fake engine cannot compose without a caret in a textblock.');
    this.#commit(work, { cause: 'composition', reason: 'input', sourceEvent: event });
  }

  /** Starts or ends a composition: the event on the container, then the state. */
  composition(type: 'compositionstart' | 'compositionend'): void {
    this.container.dispatchEvent(new Event(type));
    this.composing = type === 'compositionstart';
    this.version += 1;
    this.context.state();
  }

  /** An undo that a command of the host environment triggers: `beforeinput` `historyUndo`. */
  nativeUndo(): void {
    const event = inputEvent('historyUndo');
    this.container.dispatchEvent(event);
    if (!this.#travel(true, { cause: 'history', reason: 'engine', sourceEvent: event }))
      throw new Error('The fake engine has nothing to undo.');
  }

  // Block model, lookups and geometry (uwg-te-tab-engine r6–r8)

  getBlocks(): TextEditorBlockTree {
    return blockTree(this.document, this.contentVersion);
  }

  getTable(id: string): TextEditorTableModel | null {
    const table = findBlock(this.document, id)?.block;
    if (table?.type !== 'table') return null;
    const grid = tableGrid(table);
    const cells = grid.cells.map(({ row, column, rowSpan, colSpan, cell }) =>
      Object.freeze({
        row,
        column,
        rowSpan,
        colSpan,
        header: (table.headerRow && row === 0) || (table.headerColumn && column === 0),
        background: cell.background ?? null,
        align: cell.align ?? null,
        empty: cell.paragraphs.every((paragraph) => paragraph.content.length === 0),
      }),
    );
    return Object.freeze({
      id,
      rows: grid.rows,
      columns: grid.columns,
      cells: Object.freeze(cells),
      grid: grid.grid,
      headerRow: table.headerRow,
      headerColumn: table.headerColumn,
      widths: table.widths ?? null,
      merged: cells.some((cell) => cell.rowSpan > 1 || cell.colSpan > 1),
    });
  }

  blockElement(): HTMLElement | null {
    return null;
  }
  blockAt(): string | null {
    return null;
  }
  cellElement(): HTMLElement | null {
    return null;
  }
  cellAt(): null {
    return null;
  }
  tableElements(): null {
    return null;
  }
  pointAt(): TextEditorTextPoint | null {
    return null;
  }
  blockRects(): null {
    return null;
  }
  rangeRects(): readonly DOMRectReadOnly[] {
    return [];
  }
  selectionRects(): readonly DOMRectReadOnly[] {
    return [];
  }
  caretRect(): DOMRectReadOnly | null {
    return null;
  }

  setRootAttributes(attributes: TextEditorRootAttributes): void {
    this.rootAttributes.push(attributes);
  }

  focus(position: TextEditorFocusPosition = 'restore'): Promise<void> {
    this.engine.calls.push(`focus:${position}`);
    this.focused = true;
    this.version += 1;
    this.context.state();
    return Promise.resolve();
  }

  blur(): void {
    this.focused = false;
    this.version += 1;
    this.context.state();
  }

  setEditable(editable: boolean): void {
    this.engine.calls.push(`editable:${String(editable)}`);
    if (editable === this.editable) return;
    this.editable = editable;
    this.version += 1;
    this.context.state();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.engine.calls.push('destroy');
    this.#releaseStyles();
  }
}

// Host

/** A parser over the test-only HTML source builder, as a window's `DOMParser` would parse. */
class SourceParser {
  parseFromString(html: string): { readonly body: SourceElement } {
    return { body: htmlSource(html) };
  }
}

/** The element the engine mounts into: an event target in a document whose window parses HTML. */
export class FakeContainer extends EventTarget {
  readonly ownerDocument: Document;

  constructor() {
    super();
    const document = styledDocument();
    this.ownerDocument = {
      ...document,
      defaultView: { ...document.defaultView, DOMParser: SourceParser },
    } as unknown as Document;
  }
}

export type HostRecordType =
  | 'request'
  | 'request-failed'
  | 'open-surface'
  | 'ready'
  | 'error'
  | 'value-change'
  | 'value-commit'
  | 'diagnostic'
  | 'adopt'
  | 'release';

export interface HostRecord {
  readonly type: HostRecordType;
  readonly detail?: unknown;
}

/**
 * A controller on a recording host: manual frames, a fake container, requests accepted unless
 * `host.cancel`, surfaces opening unless `host.opens` is false.
 */
export function createHost(overrides: Partial<TextEditorControllerHost> = {}) {
  const frames = new ManualFrames();
  const records: HostRecord[] = [];
  const container = new FakeContainer();
  const host = {
    cancel: false,
    opens: true,
    direction: 'ltr' as 'ltr' | 'rtl',
    container: container as FakeContainer | null,
  };
  const record = (type: HostRecordType, detail?: unknown) => void records.push({ type, detail });
  const controllerHost: TextEditorControllerHost = {
    container: () => host.container as unknown as HTMLElement | null,
    frames: () => frames,
    direction: () => host.direction,
    adoptStyles: (cssText) => {
      record('adopt', cssText);
      return () => record('release', cssText);
    },
    dispatchRequest: (detail) => {
      record('request', detail);
      return !host.cancel;
    },
    requestFailed: (detail) => record('request-failed', detail),
    openSurface: (tool, detail) => {
      record('open-surface', { tool: tool.id, detail });
      return host.opens;
    },
    ready: (native) => record('ready', native),
    failed: (error) => record('error', error),
    valueChanged: (change) => record('value-change', change),
    valueCommitted: (commit) => record('value-commit', commit),
    diagnostic: (code, message) => record('diagnostic', { code, message }),
    ...overrides,
  };
  const controller = new TextEditorController(controllerHost);
  return {
    controller,
    frames,
    records,
    host,
    container,
    /** The details of the records of a type, in order. */
    of: <T = unknown>(type: HostRecordType): T[] =>
      records.filter((entry) => entry.type === type).map((entry) => entry.detail as T),
  };
}

/** The built-in tools and the given ones, resolved against an engine and its nodes. */
export function fakeTools(
  engine: Pick<TextEditorEngine, 'capabilities' | 'supportsNode'> | null,
  tools?: readonly TextEditorTool[],
  nodes?: readonly TextEditorNodeDefinition[],
): TextEditorControllerTools {
  const registry = resolveTextEditorTools({
    builtins: textEditorTools,
    tools,
    nodes,
    capabilities: resolveTextEditorCapabilities(engine, nodes),
  });
  return Object.freeze({
    registry,
    layout: resolveTextEditorLayout(null, registry).layout,
    strings: textEditorStrings,
  });
}

export interface ReadyEditorOptions {
  readonly engine?: FakeTextEngineOptions;
  readonly content?: TextEditorContentInput;
  readonly nodes?: readonly TextEditorNodeDefinition[];
  readonly access?: TextEditorAccess;
  readonly tools?: readonly TextEditorTool[];
}

/** A connected controller with tools on a ready fake engine, its first state published. */
export async function readyEditor(options: ReadyEditorOptions = {}) {
  const setup = createHost();
  const engine = new FakeTextEngine(options.engine);
  const { controller } = setup;
  if (options.nodes) controller.setNodes(options.nodes);
  if (options.access) controller.setAccess(options.access);
  if (options.content) controller.setDefaultContent(options.content);
  controller.setTools(fakeTools(engine, options.tools, options.nodes));
  controller.connect();
  controller.setEngine(engine);
  await flush();
  setup.frames.tick();
  return { ...setup, engine, instance: engine.instances.at(-1)! };
}

/** A text selection of `from` to `to` in a block, which `run` applies directly. */
export function selectText(
  controller: TextEditorController,
  block: string,
  from: number,
  to = from,
): Promise<unknown> {
  return controller.request({
    target: {
      type: 'selection.set',
      selection: { kind: 'text', anchor: { block, offset: from }, head: { block, offset: to } },
    },
    surface: 'api',
    reason: 'imperative-action',
  });
}

describe('text editor fakes (uwg-te-par-engine-1)', () => {
  it('V-022: synchronous and asynchronous mounts reach ready', async () => {
    for (const async of [false, true]) {
      const { controller, engine, instance, of } = await readyEditor({ engine: { async } });
      expect(controller.status).toBe('ready');
      expect(of('ready')).toEqual([instance.native]);
      expect(instance.capabilities).toBe(engine.capabilities);
      expect(controller.native).toBe(instance.native);
    }
  });

  it('V-085: the queue keeps the last content.set, which applies at ready; the superseded one is unchanged and mark.toggle rejects', async () => {
    const { controller, frames, of } = createHost();
    const engine = new FakeTextEngine({ async: true, autoReady: false });
    controller.setTools(fakeTools(engine));
    controller.connect();
    controller.setEngine(engine);
    const set = (content: string) =>
      controller.request({
        target: { type: 'content.set', content, format: 'html', history: 'push' },
        surface: 'api',
        reason: 'imperative-action',
      });
    const first = set('<p data-id="one">one</p>');
    const second = set('<p data-id="two">two</p>');
    const bold = controller.request({
      target: { type: 'mark.toggle', mark: 'bold' },
      surface: 'api',
      reason: 'imperative-action',
    });
    await expect(first).resolves.toBe('unchanged');
    await expect(bold).rejects.toMatchObject({ name: 'InvalidStateError' });
    // Each request is dispatched before it is queued or rejected.
    expect(of<TextEditorRequestDetail>('request').map((detail) => detail.actions[0]!.type)).toEqual(
      ['content.set', 'content.set', 'mark.toggle'],
    );
    expect(of<TextEditorRequestFailedDetail>('request-failed')).toMatchObject([
      { actions: [{ type: 'mark.toggle' }], error: { name: 'InvalidStateError' } },
    ]);
    await flush();
    engine.context!.ready();
    await expect(second).resolves.toBe('applied');
    frames.tick();
    expect(controller.getContent('html')).toBe('<p data-id="two">two</p>');
    expect(controller.state.history.undo).toBe(false);
    expect([of('value-change'), of('value-commit')]).toEqual([[], []]);
  });

  it('V-085: a list whose second action throws leaves the document unchanged with one request-failed', async () => {
    const { controller, instance, of } = await readyEditor({
      engine: { failOn: (action) => action.type === 'mark.toggle' },
      content: { content: '<p data-id="p1">calm</p>', format: 'html' },
    });
    await selectText(controller, 'p1', 0, 4);
    const before = controller.getContent('html');
    const failing = controller.request({
      target: [
        { type: 'text.insert', text: 'storm' },
        { type: 'mark.toggle', mark: 'bold' },
      ],
      surface: 'api',
      reason: 'imperative-action',
    });
    await expect(failing).rejects.toThrow('The fake engine failed on mark.toggle.');
    expect(controller.getContent('html')).toBe(before);
    expect(instance.contentVersion).toBe(1);
    expect(of('request')).toHaveLength(1);
    expect(of<TextEditorRequestFailedDetail>('request-failed')).toMatchObject([
      { actions: [{ type: 'text.insert' }, { type: 'mark.toggle' }], tool: null },
    ]);
    expect(of('value-change')).toEqual([]);
  });

  it('V-085: each diagnostic surfaces through the host with a text-editor- code', async () => {
    const { of, instance } = await readyEditor({
      engine: { capabilities: BASE_CAPABILITIES },
      content: {
        content:
          '<p data-id="same">a</p><p data-id="same">b</p><table><tbody><tr><td>c</td></tr></tbody></table>',
        format: 'html',
      },
    });
    instance.context.diagnostic('text-editor-engine-warning', 'The engine warned.');
    const codes = of<{ code: string }>('diagnostic').map((diagnostic) => diagnostic.code);
    expect(codes).toEqual([
      'text-editor-block-id',
      'text-editor-content-converted',
      'text-editor-engine-warning',
    ]);
    expect(codes.every((code) => code.startsWith('text-editor-'))).toBe(true);
  });

  it('V-085: a run of an unavailable tool and a value outside its domain each fail with empty actions', async () => {
    const { controller, of } = await readyEditor({ engine: { capabilities: BASE_CAPABILITIES } });
    const click = new Event('click');
    const trigger = {} as Element;
    await expect(
      controller.request({
        target: 'table',
        value: { rows: 2, columns: 2 },
        surface: 'api',
        reason: 'imperative-action',
        sourceEvent: click,
        trigger,
      }),
    ).rejects.toMatchObject({ name: 'NotSupportedError' });
    await expect(
      controller.request({
        target: 'bold',
        value: true,
        surface: 'api',
        reason: 'imperative-action',
        sourceEvent: click,
        trigger,
      }),
    ).rejects.toBeInstanceOf(TypeError);
    expect(of('request')).toEqual([]);
    expect(of<TextEditorRequestFailedDetail>('request-failed')).toEqual([
      {
        actions: [],
        tool: 'table',
        surface: 'api',
        value: { rows: 2, columns: 2 },
        reason: 'imperative-action',
        sourceEvent: click,
        trigger,
        error: expect.objectContaining({ name: 'NotSupportedError' }),
      },
      {
        actions: [],
        tool: 'bold',
        surface: 'api',
        value: true,
        reason: 'imperative-action',
        sourceEvent: click,
        trigger,
        error: expect.any(TypeError),
      },
    ]);
  });

  it('V-189: each activation passes one request with the reason of its source', async () => {
    const { controller, of } = await readyEditor({
      content: { content: '<p data-id="p1">calm</p><p data-id="p2">sea</p>', format: 'html' },
    });
    await selectText(controller, 'p1', 0, 4);
    const activations = [
      { target: 'bold', surface: 'toolbar', reason: 'trigger-press' },
      { target: 'heading-1', surface: 'turn-into', reason: 'item-press' },
      { target: 'italic', surface: 'keyboard', reason: 'hotkey' },
      { target: 'underline', surface: 'api', reason: 'imperative-action' },
      { target: [{ type: 'blocks.delete', ids: ['p2'] }], surface: 'keyboard', reason: 'keyboard' },
    ] as const;
    for (const activation of activations)
      await expect(
        controller.request({ ...activation, sourceEvent: new Event('activation') }),
      ).resolves.toBe('applied');
    const reasons = activations.map((activation) => activation.reason);
    expect(of<TextEditorRequestDetail>('request').map((detail) => detail.reason)).toEqual(reasons);
    expect(of<TextEditorValueChange>('value-change').map((change) => change.reason)).toEqual(
      reasons,
    );
    expect(of<TextEditorValueCommit>('value-commit').map((commit) => commit.reason)).toEqual(
      reasons,
    );
    expect(controller.getContent('html')).toBe(
      '<h1 data-id="p1"><strong><em><u>calm</u></em></strong></h1>',
    );
  });

  it('V-189: copy-block-link dispatches a request without actions and acts only once accepted', async () => {
    const { controller, host, of } = await readyEditor({
      content: { content: '<p data-id="p1">calm</p>', format: 'html' },
    });
    const run = () =>
      controller.request({
        target: 'copy-block-link',
        surface: 'block-menu',
        reason: 'item-press',
      });
    host.cancel = true;
    await expect(run()).resolves.toBe('cancelled');
    host.cancel = false;
    await expect(run()).resolves.toBe('applied');
    expect(of<TextEditorRequestDetail>('request')).toMatchObject([
      { actions: [], tool: 'copy-block-link', surface: 'block-menu', reason: 'item-press' },
      { actions: [], tool: 'copy-block-link', surface: 'block-menu', reason: 'item-press' },
    ]);
    expect([of('value-change'), of('value-commit'), of('request-failed')]).toEqual([[], [], []]);
  });

  it('V-038: can answers false for unknown and malformed actions', async () => {
    const { controller, instance } = await readyEditor({
      content: { content: '<p data-id="p1">calm</p>', format: 'html' },
    });
    const malformed = [
      { type: 'mark.blink' },
      { type: 'mark.toggle', mark: 'blink' },
      { type: 'blocks.delete', ids: [] },
      { type: 'text.delete', range: { block: 'p1', from: 3, to: 1 } },
      { type: 'content.set', content: '<p>x</p>', format: 'rtf', history: 'push' },
      null,
      'mark.toggle',
    ] as unknown as TextEditorAction[];
    for (const action of malformed) {
      expect(instance.can(action)).toBe(false);
      expect(controller.can(action)).toBe(false);
    }
    expect(instance.can({ type: 'blocks.delete', ids: ['missing'] })).toBe(false);
    expect(instance.can({ type: 'blocks.delete', ids: ['p1'] })).toBe(true);
    expect(instance.getContent('html')).toBe('<p data-id="p1">calm</p>');
  });

  it.each(CORPUS_ENTRIES)(
    "V-111: $name: the corpus round trip through the fake equals the converters'",
    async (entry) => {
      const html = corpusGolden(`${entry.name}.html`);
      const { controller } = await readyEditor({
        nodes: entry.nodes ?? [],
        content: { content: html, format: 'html' },
      });
      expect(controller.getContent('html')).toBe(html);
      expect(controller.getContent('markdown')).toBe(corpusFile(`${entry.name}.md`));
      expect(controller.getContent('text')).toBe(corpusGolden(`${entry.name}.txt`));
      // export(import(export(D))) equals export(D).
      await controller.request({
        target: {
          type: 'content.set',
          content: controller.getContent('html'),
          format: 'html',
          history: 'push',
        },
        surface: 'api',
        reason: 'imperative-action',
      });
      expect(controller.getContent('html')).toBe(html);
    },
  );

  it('V-365: native JSON maps every block kind both ways and is normalized as the schema states', async () => {
    const text = (value: string, marks?: TextEditorPortableMarks): Inline =>
      marks ? { type: 'text', text: value, marks } : { type: 'text', text: value };
    const blocks: TextEditorPortableBlock[] = [
      {
        type: 'paragraph',
        id: 'p1',
        content: [text('lead', { link: 'https://harbor.example/', code: true })],
      },
      { type: 'heading', id: 'h3', level: 3, align: 'center', content: [text('Tides')] },
      { type: 'quote', id: 'q1', content: [text('Fair winds')] },
      { type: 'code', id: 'c1', language: 'ts', text: 'const knots = 12;' },
      {
        type: 'list-ordered',
        id: 'o1',
        start: 3,
        content: [text('Moor')],
        children: [
          {
            type: 'list-task',
            id: 't1',
            checked: true,
            content: [text('Check lines')],
            children: [],
          },
          { type: 'list-bullet', id: 'b1', content: [text('Coil rope')], children: [] },
        ],
      },
      { type: 'divider', id: 'd1' },
      { type: 'image', id: 'i1', src: 'https://harbor.example/buoy.png', alt: 'Buoy', width: 120 },
      {
        type: 'table',
        id: 'tb1',
        headerRow: true,
        headerColumn: false,
        rows: [
          {
            cells: [
              { paragraphs: [{ content: [text('Pier')] }] },
              { paragraphs: [{ content: [text('Depth')] }] },
            ],
          },
          {
            cells: [
              { paragraphs: [{ content: [text('North')] }, { content: [text('old')] }] },
              { paragraphs: [{ content: [text('4 m')] }] },
            ],
          },
        ],
      },
      {
        type: 'custom',
        id: 'e1',
        name: 'embed',
        attrs: { url: 'https://harbor.example/cam', caption: 'Cam' },
      },
      {
        type: 'paragraph',
        id: 'p2',
        content: [
          text('Ask '),
          { type: 'custom', name: 'mention', attrs: { person: 'ana', label: 'Ana' } },
        ],
      },
    ];
    const native = { type: FAKE_NATIVE_TYPE, blocks };
    expect(canonicalize({ blocks }, { nodes: corpusNodes }).document.blocks).toEqual(blocks);
    const { controller, instance, of } = await readyEditor({
      nodes: corpusNodes,
      content: { content: native, format: 'json' },
    });
    expect(controller.getContent('json')).toEqual(native);
    expect(of('diagnostic')).toEqual([]);
    // The shared block tree: a code block is a textblock, the image, table and embed are not.
    const tree = instance.getBlocks();
    expect(tree.get('c1')).toMatchObject({ kind: 'code', textblock: true, empty: false });
    expect(
      ['i1', 'tb1', 'e1'].map((id) => tree.get(id)?.textblock),
      'atoms and tables',
    ).toEqual([false, false, false]);

    // A paragraph under a list item, a list in a cell and a mark other than a link on inline code.
    const draft = {
      type: FAKE_NATIVE_TYPE,
      blocks: [
        {
          type: 'list-bullet',
          id: 'l1',
          content: [text('Stow')],
          children: [{ type: 'paragraph', content: [text('sails')] }],
        },
        {
          type: 'table',
          id: 'tb2',
          headerRow: false,
          headerColumn: false,
          rows: [
            {
              cells: [{ blocks: [{ type: 'list-bullet', content: [text('Oars')], children: [] }] }],
            },
          ],
        },
        {
          type: 'paragraph',
          id: 'p3',
          content: [text('knot', { code: true, bold: true, link: 'https://harbor.example/' })],
        },
      ],
    };
    await controller.request({
      target: {
        type: 'content.set',
        content: JSON.stringify(draft),
        format: 'json',
        history: 'push',
      },
      surface: 'api',
      reason: 'imperative-action',
    });
    expect(controller.getContent('json')).toEqual({
      type: FAKE_NATIVE_TYPE,
      blocks: [
        {
          type: 'list-bullet',
          id: 'l1',
          content: [text('Stow'), { type: 'hard-break' }, text('sails')],
          children: [],
        },
        {
          type: 'table',
          id: 'tb2',
          headerRow: false,
          headerColumn: false,
          rows: [{ cells: [{ paragraphs: [{ content: [text('Oars')] }] }] }],
        },
        {
          type: 'paragraph',
          id: 'p3',
          content: [text('knot', { link: 'https://harbor.example/', code: true })],
        },
      ],
    });

    // Native JSON that is no fake document fails the request; the content stays.
    const before = controller.getContent('json');
    await expect(
      controller.request({
        target: { type: 'content.set', content: '{bad', format: 'json', history: 'push' },
        surface: 'api',
        reason: 'imperative-action',
      }),
    ).rejects.toMatchObject({ name: 'DataError' });
    expect(controller.getContent('json')).toEqual(before);
  });

  it('native JSON passes the URL policy as HTML import does, with no diagnostic', async () => {
    const text = (value: string, marks?: TextEditorPortableMarks): Inline =>
      marks ? { type: 'text', text: value, marks } : { type: 'text', text: value };
    const { controller, of } = await readyEditor();
    const load = async (content: unknown, format: 'json' | 'html') => {
      await controller.request({
        target: { type: 'content.set', content, format, history: 'push' },
        surface: 'api',
        reason: 'imperative-action',
      });
      return controller.getContent('json');
    };
    const fromJson = await load(
      {
        type: FAKE_NATIVE_TYPE,
        blocks: [
          {
            type: 'paragraph',
            id: 'p1',
            content: [
              text('Call '),
              text('the pilot', { link: 'javascript:alert(1)' }),
              text(' or '),
              text('the harbor', { link: 'https://harbor.example/' }),
            ],
          },
          { type: 'image', id: 'i1', src: 'javascript:alert(2)', alt: 'Buoy chart' },
          { type: 'image', id: 'i2', src: 'JavaScript:alert(3)', alt: '' },
          { type: 'image', id: 'i3', src: 'https://harbor.example/buoy.png', alt: 'Buoy' },
        ],
      },
      'json',
    );
    expect(fromJson).toEqual({
      type: FAKE_NATIVE_TYPE,
      blocks: [
        {
          type: 'paragraph',
          id: 'p1',
          content: [
            text('Call the pilot or '),
            text('the harbor', { link: 'https://harbor.example/' }),
          ],
        },
        { type: 'paragraph', id: 'i1', content: [text('Buoy chart')] },
        { type: 'image', id: 'i3', src: 'https://harbor.example/buoy.png', alt: 'Buoy' },
      ],
    });
    const fromHtml = await load(
      '<p data-id="p1">Call <a href="javascript:alert(1)">the pilot</a> or ' +
        '<a href="https://harbor.example/">the harbor</a></p>' +
        '<p data-id="i1"><img src="javascript:alert(2)" alt="Buoy chart"></p>' +
        '<img data-id="i2" src="JavaScript:alert(3)" alt="">' +
        '<img data-id="i3" src="https://harbor.example/buoy.png" alt="Buoy">',
      'html',
    );
    expect(fromHtml).toEqual(fromJson);
    expect(of('diagnostic')).toEqual([]);
  });
});
