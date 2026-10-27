/**
 * The node classes the Lexical adapter defines on top of the injected modules (Widgets
 * `uwg-te-req-blocks-6`, `uwg-te-req-inline-1`, `uwg-te-req-engine-1`, `uwg-te-req-parity-1`).
 *
 * `TpImageNode` holds an image block; each custom node definition gets a generated class: an
 * element node for a custom textblock, a decorator node for a custom atom and an inline decorator
 * node for a custom inline node. Their values are flat NodeState, so the engine clones, copies and
 * serializes them, and native JSON holds them as members (`src`, `alt`, `width`, `attrs`). The
 * classes extend the classes of the given `lexical` namespace and are created once per namespace
 * and definition. Views render light DOM into a host that is neither editable nor draggable.
 */
import { customNodeAttributes, definitionAttributes } from '../../content/portable.js';
import type { TextEditorAttributes } from '../../model.js';
import { customNodeClassName, type TextEditorNodeDefinition } from '../../nodes.js';
import { setBlockType } from '../shared/block-edits.js';
import { $commitDocument, editContext } from './blocks.js';
import { $portableDocument } from './document.js';
import { $ownStep } from './history.js';
import { customNodeType, LEXICAL_FORMAT, LEXICAL_NODE_TYPES } from './mapping.js';
import type {
  LexicalCoreLike,
  LexicalDecoratorLike,
  LexicalEditorConfigLike,
  LexicalEditorLike,
  LexicalElementLike,
  LexicalKlassLike,
  LexicalNodeLike,
  LexicalRangeSelectionLike,
  LexicalStateConfigLike,
} from './modules.js';
import { $offsetIn, $textblockAt, $textblockLength } from './points.js';
import type { LexicalRuntime } from './runtime.js';
import { LEXICAL_CLASSES } from './theme.js';

/** The values of an image block. */
export interface LexicalImageValues {
  readonly src: string;
  readonly alt: string;
  readonly width: number | null;
}

/** A custom node class with the attribute state of its definition. */
export interface LexicalCustomBinding {
  readonly definition: TextEditorNodeDefinition;
  readonly klass: LexicalKlassLike;
  readonly attrs: LexicalStateConfigLike<TextEditorAttributes>;
  /** A new node with the attribute values, the definition's defaults filling the others. */
  create(attrs: unknown): LexicalNodeLike;
}

/** The adapter's node classes of one `lexical` namespace. */
export interface LexicalNodeKit {
  readonly image: LexicalKlassLike<LexicalDecoratorLike>;
  readonly imageStates: {
    readonly src: LexicalStateConfigLike<string>;
    readonly alt: LexicalStateConfigLike<string>;
    readonly width: LexicalStateConfigLike<number | null>;
  };
  createImage(values: LexicalImageValues): LexicalNodeLike;
  /** The class of a definition, created once per namespace and definition. */
  custom(definition: TextEditorNodeDefinition): LexicalCustomBinding;
  /**
   * The binding of an application's class that replaces the generated one (the factory's `nodes`
   * option): it is registered in place of the generated class and creates its nodes from their
   * JSON, `tp-block-<name>` or `tp-inline-<name>` with the attributes in `attrs`.
   */
  override(definition: TextEditorNodeDefinition, klass: LexicalKlassLike): LexicalCustomBinding;
}

const sameAttributes = (a: TextEditorAttributes, b: TextEditorAttributes): boolean => {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key) => Object.is(a[key], b[key]));
};

/** Sets the attributes of an element to the given list, removing the `data-` ones it lacks. */
function writeDataAttributes(
  element: HTMLElement,
  attributes: readonly (readonly [string, string])[],
): void {
  const wanted = new Map(attributes);
  for (const name of element.getAttributeNames())
    if (name.startsWith('data-') && !wanted.has(name)) element.removeAttribute(name);
  for (const [name, value] of wanted)
    if (element.getAttribute(name) !== value) element.setAttribute(name, value);
}

/** The cleanups that the views of custom atoms returned, by host element. */
const viewCleanups = new WeakMap<HTMLElement, () => void>();

/** Runs and forgets the cleanup of a host's view. */
export function cleanUpView(host: HTMLElement): void {
  const cleanup = viewCleanups.get(host);
  viewCleanups.delete(host);
  try {
    cleanup?.();
  } catch {
    // A failing cleanup leaves nothing more to undo.
  }
}

/**
 * Renders a definition's view into its host, or its text without a view, after cleaning up the
 * view rendered there before; the cleanup the view returns runs on the next render, when its node
 * leaves the document and when the editor is destroyed.
 */
function renderView(
  host: HTMLElement,
  definition: TextEditorNodeDefinition,
  attrs: TextEditorAttributes,
): void {
  cleanUpView(host);
  host.replaceChildren();
  try {
    if (definition.view) {
      const cleanup = definition.view(host, attrs);
      if (typeof cleanup === 'function') viewCleanups.set(host, cleanup);
    } else if (definition.kind === 'inline') host.textContent = definition.text(attrs);
  } catch {
    // A failing view leaves the host empty; the node keeps its value.
  }
}

function nonEditableHost(document: Document, tag: string): HTMLElement {
  const host = document.createElement(tag);
  host.setAttribute('contenteditable', 'false');
  host.draggable = false;
  return host;
}

function createKit(lexical: LexicalCoreLike): LexicalNodeKit {
  const src = lexical.createState('src', {
    parse: (value: unknown) => (typeof value === 'string' ? value : ''),
  });
  const alt = lexical.createState('alt', {
    parse: (value: unknown) => (typeof value === 'string' ? value : ''),
  });
  const width = lexical.createState<number | null>('width', {
    parse: (value: unknown) =>
      typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null,
  });
  const imageValues = (node: LexicalNodeLike): LexicalImageValues => ({
    src: lexical.$getState(node, src),
    alt: lexical.$getState(node, alt),
    width: lexical.$getState(node, width),
  });

  const Decorator = lexical.DecoratorNode;
  const Element = lexical.ElementNode;

  class TpImageNode extends Decorator {
    $config(): unknown {
      return this.config(LEXICAL_NODE_TYPES.image, {
        extends: Decorator,
        stateConfigs: [
          { stateConfig: src, flat: true },
          { stateConfig: alt, flat: true },
          { stateConfig: width, flat: true },
        ],
      });
    }

    createDOM(): HTMLElement {
      const host = nonEditableHost(lexical.$getDocument(), 'div');
      host.className = LEXICAL_CLASSES.imageHost;
      // Every block element carries `dir="auto"` (`uwg-te-req-pres-2`).
      host.setAttribute('dir', 'auto');
      const image = host.ownerDocument.createElement('img');
      image.className = LEXICAL_CLASSES.image;
      image.draggable = false;
      host.append(image);
      writeImage(image, imageValues(this));
      return host;
    }

    updateDOM(_prevNode: unknown, dom: HTMLElement): boolean {
      const image = dom.firstElementChild;
      if (image) writeImage(image as HTMLImageElement, imageValues(this));
      return false;
    }

    isInline(): boolean {
      return false;
    }

    getTextContent(): string {
      return '';
    }
  }

  const bindings = new WeakMap<TextEditorNodeDefinition, LexicalCustomBinding>();

  function custom(definition: TextEditorNodeDefinition): LexicalCustomBinding {
    const found = bindings.get(definition);
    if (found) return found;
    const type = customNodeType(definition);
    const attrs = lexical.createState<TextEditorAttributes>('attrs', {
      parse: (value: unknown) => definitionAttributes(definition, value),
      isEqual: sameAttributes,
    });
    const valuesOf = (node: LexicalNodeLike) => lexical.$getState(node, attrs);
    const block = definition.kind === 'block';
    const classes = customNodeClassName(definition);
    const describe = (element: HTMLElement, values: TextEditorAttributes) =>
      writeDataAttributes(element, customNodeAttributes(definition.name, values, block));

    let klass: LexicalKlassLike;
    let construct: () => LexicalNodeLike;
    if (block && definition.content === 'inline') {
      class TpCustomBlock extends Element {
        $config(): unknown {
          return this.config(type, {
            extends: Element,
            stateConfigs: [{ stateConfig: attrs, flat: true }],
          });
        }

        createDOM(): HTMLElement {
          const element = lexical.$getDocument().createElement(definition.element);
          element.className = classes;
          describe(element, valuesOf(this));
          return element;
        }

        updateDOM(_prevNode: unknown, dom: HTMLElement): boolean {
          describe(dom, valuesOf(this));
          return false;
        }

        /**
         * The block that Enter splits off after the caret (`uwg-te-req-parity-1`): one of its kind
         * with its attributes and alignment, whose fresh identifier the identifier repair gives.
         */
        insertNewAfter(_selection: unknown, restoreSelection = true): LexicalElementLike {
          const next = new TpCustomBlock();
          lexical.$setState(next, attrs, valuesOf(this));
          const align = this.getFormatType();
          if (align !== '') next.setFormat(align);
          this.insertAfter(next, restoreSelection);
          return next;
        }
      }
      klass = TpCustomBlock;
      construct = () => new TpCustomBlock();
    } else {
      class TpCustomAtom extends Decorator {
        $config(): unknown {
          return this.config(type, {
            extends: Decorator,
            stateConfigs: [{ stateConfig: attrs, flat: true }],
          });
        }

        createDOM(_config: LexicalEditorConfigLike, editor: LexicalEditorLike): HTMLElement {
          const host = nonEditableHost(lexical.$getDocument(), definition.element);
          host.className = classes;
          // A block atom's host is a block element: `dir="auto"` (`uwg-te-req-pres-2`).
          if (block) host.setAttribute('dir', 'auto');
          const values = valuesOf(this);
          describe(host, values);
          renderView(host, definition, values);
          trackView(editor, this.getKey(), host);
          return host;
        }

        updateDOM(prevNode: LexicalNodeLike, dom: HTMLElement): boolean {
          const values = valuesOf(this);
          describe(dom, values);
          if (!sameAttributes(values, valuesOf(prevNode))) renderView(dom, definition, values);
          return false;
        }

        isInline(): boolean {
          return !block;
        }

        /**
         * An inline node is one character to the caret: the arrow keys step over it as over a letter
         * and Shift with an arrow extends over it, never selecting it as a node, as in the other
         * engine (`uwg-te-req-parity-1`); a block atom stays selectable.
         */
        isKeyboardSelectable(): boolean {
          return block;
        }

        getTextContent(): string {
          if (block || definition.kind !== 'inline') return '';
          try {
            return definition.text(valuesOf(this));
          } catch {
            return '';
          }
        }
      }
      klass = TpCustomAtom;
      construct = () => new TpCustomAtom();
    }
    const binding: LexicalCustomBinding = Object.freeze({
      definition,
      klass,
      attrs,
      create(values: unknown) {
        const node = construct();
        lexical.$setState(node, attrs, definitionAttributes(definition, values));
        return node;
      },
    });
    bindings.set(definition, binding);
    return binding;
  }

  function override(
    definition: TextEditorNodeDefinition,
    klass: LexicalKlassLike,
  ): LexicalCustomBinding {
    const generated = custom(definition);
    const type = customNodeType(definition);
    const textblock = definition.kind === 'block' && definition.content === 'inline';
    return Object.freeze({
      definition,
      klass,
      attrs: generated.attrs,
      create(values: unknown) {
        return lexical.$parseSerializedNode({
          type,
          version: 1,
          attrs: definitionAttributes(definition, values),
          ...(textblock ? { children: [] } : {}),
        });
      },
    });
  }

  return Object.freeze({
    image: TpImageNode,
    imageStates: Object.freeze({ src, alt, width }),
    createImage(values: LexicalImageValues) {
      const node = new TpImageNode();
      lexical.$setState(node, src, values.src);
      lexical.$setState(node, alt, values.alt);
      lexical.$setState(node, width, values.width);
      return node;
    },
    custom,
    override,
  });
}

function writeImage(image: HTMLImageElement, values: LexicalImageValues): void {
  if (image.getAttribute('src') !== values.src) image.setAttribute('src', values.src);
  if (image.getAttribute('alt') !== values.alt) image.setAttribute('alt', values.alt);
  if (values.width === null) image.removeAttribute('width');
  else image.setAttribute('width', String(values.width));
}

// View hosts per editor, so that a destroyed node or editor cleans up its views

const hostsByEditor = new WeakMap<object, Map<string, HTMLElement>>();

/** Remembers the host a node's view renders into; a host the key had before is cleaned up. */
function trackView(editor: unknown, key: string, host: HTMLElement): void {
  if (typeof editor !== 'object' || editor === null) return;
  let hosts = hostsByEditor.get(editor);
  if (!hosts) hostsByEditor.set(editor, (hosts = new Map()));
  const previous = hosts.get(key);
  if (previous && previous !== host) cleanUpView(previous);
  hosts.set(key, host);
}

/** Cleans up the views of destroyed nodes, or of every node of an editor without `keys`. */
export function cleanUpViews(editor: object, keys?: Iterable<string>): void {
  const hosts = hostsByEditor.get(editor);
  if (!hosts) return;
  for (const key of keys ?? [...hosts.keys()]) {
    const host = hosts.get(key);
    if (!host) continue;
    hosts.delete(key);
    cleanUpView(host);
  }
}

const kits = new WeakMap<LexicalCoreLike, LexicalNodeKit>();

/** The adapter's node classes of a `lexical` namespace, created once per namespace. */
export function lexicalNodeKit(lexical: LexicalCoreLike): LexicalNodeKit {
  let kit = kits.get(lexical);
  if (!kit) {
    kit = createKit(lexical);
    kits.set(lexical, kit);
  }
  return kit;
}

// Normalization (`uwg-te-req-blocks-1`, `uwg-te-req-parity-1`)

/**
 * Code text keeps no other format: text in a code block keeps no format, color or style (a link
 * around it stays), and text with the inline code format keeps only that format, no color and no
 * style (inline code excludes every mark but a link). A text node transform, so every path, typing
 * and paste included, ends in the same form.
 */
export function $normalizeCodeText(rt: LexicalRuntime, node: LexicalNodeLike): void {
  const { lexical, states } = rt;
  if (!lexical.$isTextNode(node)) return;
  const format = node.getFormat();
  const block = $inCodeBlock(rt, node);
  if (!block && (format & LEXICAL_FORMAT.code) === 0) return;
  const wanted = block ? 0 : LEXICAL_FORMAT.code;
  if (format !== wanted) node.setFormat(wanted);
  if (lexical.$getState(node, states.color) !== '') lexical.$setState(node, states.color, '');
  if (lexical.$getState(node, states.highlight) !== '')
    lexical.$setState(node, states.highlight, '');
  if (node.getStyle() !== '') node.setStyle('');
}

/** Whether a node lies in a code block, links around it aside. */
export function $inCodeBlock(rt: LexicalRuntime, node: LexicalNodeLike): boolean {
  let parent: LexicalNodeLike | null = node.getParent();
  while (parent && rt.isLink(parent)) parent = parent.getParent();
  return rt.isCode(parent);
}

/**
 * A code block holds text and line breaks only: an inline node that a path other than a join moves
 * into a code block leaves it, as on every engine; a join into a code block writes each inline
 * node as its text first (`codeJoinEdit`). The engine then keeps no content the document does not
 * report, which a later Delete at the block's end would remove instead of joining the textblock
 * after it (`uwg-te-req-engine-11`, `uwg-te-req-content-7`).
 */
export function $normalizeCodeInline(rt: LexicalRuntime, node: LexicalNodeLike): void {
  if ($inCodeBlock(rt, node)) node.remove();
}

/** Whether a block needs an empty paragraph after it when it ends the document. */
function needsTrailingParagraph(rt: LexicalRuntime, node: LexicalNodeLike): boolean {
  return rt.isTable(node) || (rt.lexical.$isDecoratorNode(node) && !node.isInline());
}

/**
 * The root keeps an empty paragraph after a final atom block or table, never adds one after any
 * other final block, and is never left without a block (the paragraph it gets takes a fresh
 * identifier). It reads only the last child, so a keystroke costs nothing here.
 */
export function $normalizeRoot(rt: LexicalRuntime, root: LexicalNodeLike): void {
  const element = root as LexicalElementLike;
  const last = element.getLastChild();
  if (!last || needsTrailingParagraph(rt, last)) element.append(rt.lexical.$createParagraphNode());
}

/** The textblock holding a collapsed caret outside tables, with the caret's offset and length. */
function $caretBlock(rt: LexicalRuntime) {
  const selection = rt.lexical.$getSelection();
  if (!rt.lexical.$isRangeSelection(selection) || !selection.isCollapsed()) return null;
  const range = selection as LexicalRangeSelectionLike;
  const found = $textblockAt(rt, range.anchor);
  if (!found || found.address.cell) return null;
  const offset = $offsetIn(rt, found.block, range.anchor);
  if (offset === null) return null;
  return {
    selection: range,
    block: found.block,
    id: found.address.block,
    offset,
    length: $textblockLength(rt, found.block),
  };
}

/** Whether a block is a custom textblock: a block of a custom definition that holds text. */
const isCustomTextblock = (rt: LexicalRuntime, block: LexicalNodeLike): boolean =>
  [...rt.customBlocks.values()].some(
    ({ definition, klass }) =>
      definition.kind === 'block' && definition.content === 'inline' && block instanceof klass,
  );

/**
 * Enter in a quote or a custom textblock, which are textblocks (`uwg-te-req-parity-1`): in the
 * middle it splits the block into two of its kind (the second with a fresh identifier, the
 * block's alignment and, for a custom textblock, its attributes), at the end (or in an empty
 * block) it inserts a paragraph after it; at the start of a non-empty one it is the split rule of
 * `ids.ts`. Enter at the end of a heading, an empty one included, inserts a paragraph after it
 * too, the heading keeping its identifier (`uwg-te-req-content-7`). The new block takes the
 * alignment of the block it was split from, as on every engine (`uwg-te-req-engine-12`).
 */
export function $quoteEnter(rt: LexicalRuntime): boolean {
  const caret = $caretBlock(rt);
  if (!caret) return false;
  const { block, offset, length } = caret;
  const isQuote = block instanceof rt.modules.richText.QuoteNode;
  const isHeading = block instanceof rt.modules.richText.HeadingNode;
  if (isHeading && offset === length) {
    $paragraphAfter(rt, block);
    return true;
  }
  const isCustom = !isQuote && isCustomTextblock(rt, block);
  if (!isQuote && !isCustom) return false;
  if (offset === 0 && length > 0) return false;
  if (offset === length) {
    $paragraphAfter(rt, block);
    return true;
  }
  // A custom textblock's class splits off one of its kind (its `insertNewAfter`).
  const created = caret.selection.insertParagraph();
  if (!created) return false;
  if (isCustom) return true;
  const quote = rt.modules.richText.$createQuoteNode();
  const align = block.getFormatType();
  if (align !== '') quote.setFormat(align);
  created.replace(quote, true);
  quote.selectStart();
  return true;
}

/** A paragraph after a block, with its alignment, holding the caret. */
function $paragraphAfter(rt: LexicalRuntime, block: LexicalElementLike): void {
  const paragraph = rt.lexical.$createParagraphNode();
  const align = block.getFormatType();
  if (align !== '') paragraph.setFormat(align);
  block.insertAfter(paragraph);
  paragraph.select(0, 0);
}

/**
 * Backspace at the start of a heading, quote or code block turns it into a paragraph keeping its
 * identifier and alignment, a code block's line breaks becoming hard breaks (a list item is the
 * list boundary rule of `lists.ts`). Answers whether it applied.
 */
export function $collapseAtStart(rt: LexicalRuntime): boolean {
  const caret = $caretBlock(rt);
  if (!caret || caret.offset !== 0) return false;
  const { block, id } = caret;
  const { richText, code } = rt.modules;
  if (
    ![richText.HeadingNode, richText.QuoteNode, code.CodeNode].some(
      (klass) => block instanceof klass,
    )
  )
    return false;
  const next = setBlockType($portableDocument(rt), [id], { kind: 'paragraph' }, editContext(rt));
  if (!next) return false;
  $ownStep(rt);
  return $commitDocument(rt, next, { kind: 'caret', block: id, position: 'start' });
}

/** Registers the normalization transforms and the Enter and Backspace normalizations. */
export function registerNodeNormalization(rt: LexicalRuntime): () => void {
  const { lexical } = rt;
  const editor = rt.engine;
  const HIGH = lexical.COMMAND_PRIORITY_HIGH;
  const editable = () => editor.isEditable();
  const atoms = [...rt.customBlocks.values(), ...rt.customInlines.values()]
    .filter(({ definition }) => definition.kind === 'inline' || definition.content !== 'inline')
    .map(({ klass }) => klass);
  const inlines = [...rt.customInlines.values()].map(({ klass }) => klass);
  return lexical.mergeRegister(
    editor.registerNodeTransform(lexical.TextNode, (node) => $normalizeCodeText(rt, node)),
    ...inlines.map((klass) =>
      editor.registerNodeTransform(klass, (node) => $normalizeCodeInline(rt, node)),
    ),
    editor.registerNodeTransform(lexical.RootNode, (root) => $normalizeRoot(rt, root)),
    editor.registerCommand(
      lexical.INSERT_PARAGRAPH_COMMAND,
      () => editable() && $quoteEnter(rt),
      HIGH,
    ),
    editor.registerCommand(
      lexical.KEY_BACKSPACE_COMMAND,
      (event) => {
        if (!editable() || !$collapseAtStart(rt)) return false;
        event.preventDefault();
        return true;
      },
      HIGH,
    ),
    editor.registerCommand(
      lexical.DELETE_CHARACTER_COMMAND,
      (backward) => backward === true && editable() && $collapseAtStart(rt),
      HIGH,
    ),
    // The views of custom atoms that leave the document clean up.
    ...atoms.map((klass) =>
      editor.registerMutationListener(
        klass,
        (mutations) =>
          cleanUpViews(
            editor,
            [...mutations].filter(([, mutation]) => mutation === 'destroyed').map(([key]) => key),
          ),
        { skipInitialization: true },
      ),
    ),
  );
}
