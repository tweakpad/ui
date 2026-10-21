/**
 * Pre-ready preview of the text editor (Widgets `uwg-te-req-pres-2`, `uwg-te-req-pres-5`,
 * `uwg-te-tab-vocabulary`).
 *
 * Before an engine is ready, the content part shows the initial content as inert DOM rendered from
 * the portable model in the engine-neutral class vocabulary, so that the content recipe presents
 * it as it presents the editing root and the swap at ready keeps the block size: an empty
 * textblock holds one `br`, a textblock or code block whose last line is empty holds a second
 * one, the empty paragraph that the engines keep after a final atom block or table is drawn, every
 * block element resolves its own direction, and alignment is logical. Nothing is editable,
 * focusable or listened to: a link carries no destination, the checkbox of a task item is inert
 * and a custom node is its element with its text, without its view. The DOM is built at call time
 * through the target's owner document, inside the target only. Initial content in `json`, which
 * only the mapper of an engine reads, is not previewed.
 */
import type { TextEditorFormat, TextEditorPortableFormat } from '../engine.js';
import type { TextEditorAttributes } from '../model.js';
import { customNodeClassName, NODE_NAME, type TextEditorNodeDefinition } from '../nodes.js';
import {
  blockText,
  customNodeAttributes,
  definitionAttributes,
  inlineText,
  inlineTree,
  isAtomOrTable,
  isListItem,
  nodeLookup,
  tableGrid,
  type TextEditorNodeLookup,
  type TextEditorPortableBlock,
  type TextEditorPortableCodeBlock,
  type TextEditorPortableCustomBlock,
  type TextEditorPortableDocument,
  type TextEditorPortableImage,
  type TextEditorPortableInline,
  type TextEditorPortableInlineNode,
  type TextEditorPortableInlineTree,
  type TextEditorPortableListItem,
  type TextEditorPortableMarkNode,
  type TextEditorPortableTable,
} from './portable.js';

export interface TextEditorPreviewOptions {
  /** The custom node definitions, whose elements and text custom nodes take. */
  readonly nodes?: readonly TextEditorNodeDefinition[] | undefined;
}

/** Whether initial content in a format is previewed before ready: html, markdown and text are. */
export function isPreviewFormat(format: TextEditorFormat): format is TextEditorPortableFormat {
  return format === 'html' || format === 'markdown' || format === 'text';
}

/**
 * Renders the preview of a document into `target`: its children become one root element holding
 * the blocks, as the content part holds the editing root, which is returned. Nothing outside
 * `target` is written, and `target` keeps its attributes.
 */
export function renderPortablePreview(
  document: TextEditorPortableDocument,
  target: Element,
  options: TextEditorPreviewOptions = {},
): HTMLElement {
  const writer = new PreviewWriter(target.ownerDocument, options.nodes);
  const root = writer.element('div');
  writer.blocks(root, document.blocks);
  const last = document.blocks[document.blocks.length - 1];
  if (last && isAtomOrTable(last)) root.append(writer.textblock('p', 'tp-te-paragraph', [], null));
  target.replaceChildren(root);
  return root;
}

const HEADINGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;
/** A plain element name: no custom element, which would construct a live element. */
const PLAIN_TAG = /^[a-z][a-z0-9]*$/u;
/** Elements that run, embed, submit or take focus: a custom node never previews as one of them. */
const ACTIVE_TAGS: ReadonlySet<string> = new Set([
  'a',
  'area',
  'audio',
  'base',
  'body',
  'button',
  'canvas',
  'details',
  'dialog',
  'embed',
  'fieldset',
  'form',
  'frame',
  'frameset',
  'head',
  'html',
  'iframe',
  'img',
  'input',
  'label',
  'legend',
  'link',
  'math',
  'meta',
  'noscript',
  'object',
  'optgroup',
  'option',
  'output',
  'picture',
  'script',
  'select',
  'slot',
  'source',
  'style',
  'summary',
  'svg',
  'template',
  'textarea',
  'title',
  'track',
  'video',
]);

const previewTag = (tag: unknown, fallback: string): string =>
  typeof tag === 'string' && PLAIN_TAG.test(tag) && !ACTIVE_TAGS.has(tag) ? tag : fallback;

/** Builds preview elements through one owner document. */
class PreviewWriter {
  readonly #owner: Document;
  readonly #nodes: readonly TextEditorNodeDefinition[] | undefined;
  readonly #lookup: TextEditorNodeLookup;

  constructor(owner: Document, nodes: readonly TextEditorNodeDefinition[] | undefined) {
    this.#owner = owner;
    this.#nodes = nodes;
    this.#lookup = nodeLookup(nodes);
  }

  element(tag: string, classes?: string): HTMLElement {
    const element = this.#owner.createElement(tag);
    if (classes) element.setAttribute('class', classes);
    return element;
  }

  /** The element of a block: it resolves its own direction and takes its logical alignment. */
  #block(tag: string, classes: string, align: string | null | undefined): HTMLElement {
    const element = this.element(tag, classes);
    element.setAttribute('dir', 'auto');
    if (align) element.style.setProperty('text-align', align);
    return element;
  }

  /** Renders blocks into `parent`; consecutive list items of one kind form one list. */
  blocks(parent: Element, blocks: readonly TextEditorPortableBlock[]): void {
    let index = 0;
    while (index < blocks.length) {
      const block = blocks[index]!;
      if (!isListItem(block)) {
        parent.append(this.#render(block));
        index += 1;
        continue;
      }
      let end = index + 1;
      while (end < blocks.length && blocks[end]!.type === block.type) end += 1;
      parent.append(this.#list(blocks.slice(index, end) as TextEditorPortableListItem[]));
      index = end;
    }
  }

  /** A textblock: its inline content, with the line box an empty last line needs. */
  textblock(
    tag: string,
    classes: string,
    content: readonly TextEditorPortableInline[],
    align: string | null | undefined,
  ): HTMLElement {
    const element = this.#block(tag, classes, align);
    this.#inline(element, content);
    if (content.length === 0 || content[content.length - 1]!.type === 'hard-break')
      element.append(this.element('br'));
    return element;
  }

  #render(block: TextEditorPortableBlock): HTMLElement {
    switch (block.type) {
      case 'paragraph':
        return this.textblock('p', 'tp-te-paragraph', block.content, block.align);
      case 'heading':
        return this.textblock(
          HEADINGS[block.level - 1] ?? 'h1',
          'tp-te-heading',
          block.content,
          block.align,
        );
      case 'quote':
        return this.textblock('blockquote', 'tp-te-quote', block.content, block.align);
      case 'code':
        return this.#code(block);
      case 'divider':
        return this.#block('hr', 'tp-te-divider', null);
      case 'image':
        return this.#image(block);
      case 'table':
        return this.#table(block);
      case 'custom':
        return this.#custom(block);
      default:
        return this.#list([block]);
    }
  }

  #list(items: readonly TextEditorPortableListItem[]): HTMLElement {
    const first = items[0]!;
    const list = this.element(
      first.type === 'list-ordered' ? 'ol' : 'ul',
      `tp-te-list tp-te-${first.type}`,
    );
    if (first.type === 'list-ordered' && first.start !== undefined)
      list.setAttribute('start', String(first.start));
    for (const item of items) list.append(this.#item(item));
    return list;
  }

  #item(item: TextEditorPortableListItem): HTMLElement {
    const task = item.type === 'list-task';
    const classes = ['tp-te-item'];
    if (task) classes.push('tp-te-task-item');
    if (task && item.checked) classes.push('tp-te-checked');
    const element = this.element('li', classes.join(' '));
    element.setAttribute('dir', 'auto');
    if (task) element.append(this.#taskMarker(item.checked));
    // The alignment stays on the item's paragraph, so nested items do not inherit it.
    element.append(this.textblock('p', 'tp-te-paragraph', item.content, item.align));
    this.blocks(element, item.children);
    return element;
  }

  /** The non-editable holder of a task item's native checkbox, inert so it takes no input. */
  #taskMarker(checked: boolean): HTMLElement {
    const marker = this.element('span', 'tp-te-task-marker');
    marker.setAttribute('inert', '');
    const box = this.element('input');
    box.setAttribute('type', 'checkbox');
    box.setAttribute('tabindex', '-1');
    if (checked) box.setAttribute('checked', '');
    marker.append(box);
    return marker;
  }

  #code(block: TextEditorPortableCodeBlock): HTMLElement {
    const pre = this.#block('pre', 'tp-te-code-block', null);
    const code = this.element('code');
    if (block.text !== '') code.append(this.#owner.createTextNode(block.text));
    if (block.text === '' || block.text.endsWith('\n')) code.append(this.element('br'));
    pre.append(code);
    return pre;
  }

  #image(block: TextEditorPortableImage): HTMLElement {
    const host = this.#block('div', 'tp-te-image-host', null);
    const image = this.element('img', 'tp-te-image');
    image.setAttribute('src', block.src);
    image.setAttribute('alt', block.alt);
    if (block.width !== undefined) image.setAttribute('width', String(block.width));
    image.setAttribute('draggable', 'false');
    host.append(image);
    return host;
  }

  /** A table in its scroll wrapper, laid out in the direction of the widget. */
  #table(block: TextEditorPortableTable): HTMLElement {
    const wrapper = this.element('div', 'tp-te-table-wrapper');
    const table = this.element('table', 'tp-te-table');
    if (block.widths) {
      const columns = this.element('colgroup');
      for (const width of block.widths) {
        const column = this.element('col');
        column.style.setProperty('width', `${width}px`);
        columns.append(column);
      }
      table.append(columns);
    }
    const body = this.element('tbody');
    const grid = tableGrid(block);
    const rows = block.rows.map(() => this.element('tr'));
    for (const placed of grid.cells) {
      const header =
        (block.headerRow && placed.row === 0) || (block.headerColumn && placed.column === 0);
      const cell = this.element(
        header ? 'th' : 'td',
        header ? 'tp-te-cell tp-te-header-cell' : 'tp-te-cell',
      );
      if (placed.rowSpan > 1) cell.setAttribute('rowspan', String(placed.rowSpan));
      if (placed.colSpan > 1) cell.setAttribute('colspan', String(placed.colSpan));
      if (placed.cell.background) cell.setAttribute('data-background', placed.cell.background);
      if (placed.cell.align) cell.style.setProperty('text-align', placed.cell.align);
      for (const paragraph of placed.cell.paragraphs)
        cell.append(this.textblock('p', 'tp-te-paragraph', paragraph.content, null));
      rows[placed.row]?.append(cell);
    }
    body.append(...rows);
    table.append(body);
    wrapper.append(table);
    return wrapper;
  }

  #custom(block: TextEditorPortableCustomBlock): HTMLElement {
    const definition = this.#lookup.blocks.get(block.name);
    const tag = previewTag(definition?.element, 'div');
    const classes = !NODE_NAME.test(block.name)
      ? ''
      : definition
        ? customNodeClassName(definition)
        : `tp-te-block-${block.name}`;
    const textblock = definition ? definition.content === 'inline' : block.content !== undefined;
    const element = textblock
      ? this.textblock(tag, classes, block.content ?? [], null)
      : this.#block(tag, classes, null);
    this.#describe(
      element,
      block.name,
      definition ? definitionAttributes(definition, block.attrs) : block.attrs,
      true,
    );
    if (!textblock) {
      const text = blockText(block, this.#nodes);
      if (text) element.append(this.#owner.createTextNode(text));
    }
    return element;
  }

  #inlineNode(node: TextEditorPortableInlineNode): HTMLElement {
    const definition = this.#lookup.inlines.get(node.name);
    const element = this.element(
      previewTag(definition?.element, 'span'),
      NODE_NAME.test(node.name) ? `tp-te-inline-${node.name}` : '',
    );
    this.#describe(
      element,
      node.name,
      definition ? definitionAttributes(definition, node.attrs) : node.attrs,
      false,
    );
    const text = inlineText([node], this.#nodes);
    if (text) element.append(this.#owner.createTextNode(text));
    return element;
  }

  /** The node name in `data-type` and its attributes as `data-` attributes, as HTML writes them. */
  #describe(element: HTMLElement, name: string, attrs: TextEditorAttributes, block: boolean): void {
    for (const [attribute, value] of customNodeAttributes(name, attrs, block))
      element.setAttribute(attribute, value);
  }

  #inline(parent: HTMLElement, content: readonly TextEditorPortableInline[]): void {
    for (const node of inlineTree(content)) parent.append(this.#tree(node));
  }

  #tree(node: TextEditorPortableInlineTree): Node {
    switch (node.type) {
      case 'text':
        return this.#owner.createTextNode(node.text);
      case 'hard-break':
        return this.element('br');
      case 'custom':
        return this.#inlineNode(node);
      default: {
        const element = this.#mark(node);
        for (const child of node.children) element.append(this.#tree(child));
        return element;
      }
    }
  }

  #mark(node: TextEditorPortableMarkNode): HTMLElement {
    switch (node.mark) {
      case 'link':
        // No destination: the preview neither navigates nor takes focus.
        return this.element('a', 'tp-te-link');
      case 'textColor':
      case 'highlight': {
        const element = this.element(
          node.mark === 'textColor' ? 'span' : 'mark',
          node.mark === 'textColor' ? 'tp-te-color' : 'tp-te-highlight',
        );
        element.setAttribute('data-color', String(node.value));
        return element;
      }
      case 'bold':
        return this.element('strong', 'tp-te-bold');
      case 'italic':
        return this.element('em', 'tp-te-italic');
      case 'underline':
        return this.element('u', 'tp-te-underline');
      case 'strike':
        return this.element('s', 'tp-te-strike');
      case 'superscript':
        return this.element('sup', 'tp-te-sup');
      case 'subscript':
        return this.element('sub', 'tp-te-sub');
      default:
        return this.element('code', 'tp-te-code');
    }
  }
}
