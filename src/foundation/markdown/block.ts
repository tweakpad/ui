/**
 * Block structure (CommonMark §4–5) with GitHub Flavored Markdown tables, task list items and
 * footnote definitions. Follows the reference implementation's two phases: lines build a tree of
 * open blocks, then paragraphs, headings and table cells are parsed for inline content.
 */
import { HTML_BLOCK_CLOSE, HTML_BLOCK_OPEN } from './html.js';
import { normalizeLabel, parseInlines, parseReference, unescapeString } from './inline.js';
import type { InlineContext, LinkReference } from './inline.js';
import type {
  MarkdownAlign,
  MarkdownBlock,
  MarkdownListItem,
  MarkdownParser,
  MarkdownRoot,
  MarkdownTableRow,
} from './types.js';

type BlockType =
  | 'document'
  | 'blockquote'
  | 'list'
  | 'item'
  | 'paragraph'
  | 'heading'
  | 'thematicBreak'
  | 'code'
  | 'html'
  | 'table'
  | 'footnote';

interface ListData {
  type: 'bullet' | 'ordered';
  bulletChar: string | null;
  start: number | null;
  delimiter: string | null;
  padding: number;
  markerOffset: number;
}

interface Block {
  type: BlockType;
  parent: Block | null;
  children: Block[];
  open: boolean;
  startLine: number;
  endLine: number;
  content: string;
  level?: number;
  fenced?: boolean;
  fenceChar?: string;
  fenceLength?: number;
  fenceOffset?: number;
  htmlType?: number;
  list?: ListData;
  tight?: boolean;
  label?: string;
  align?: MarkdownAlign[];
  header?: string[];
}

const CODE_INDENT = 4;
const MAYBE_SPECIAL = /^[#`~*+_=<>0-9|:[-]/;
const ATX_HEADING = /^#{1,6}(?:[ \t]+|$)/;
const CODE_FENCE = /^`{3,}(?!.*`)|^~{3,}/;
const CLOSING_CODE_FENCE = /^(?:`{3,}|~{3,})(?=[ \t]*$)/;
const SETEXT_HEADING = /^(?:=+|-+)[ \t]*$/;
const THEMATIC_BREAK = /^(?:\*[ \t]*){3,}$|^(?:_[ \t]*){3,}$|^(?:-[ \t]*){3,}$/;
const BULLET_MARKER = /^[*+-]/;
const ORDERED_MARKER = /^(\d{1,9})([.)])/;
const TASK = /^\[([ xX])\](?=[ \t]|$)/;
const FOOTNOTE = /^\[\^([^\]\s]+)\]:/;
const DELIMITER_ROW = /^\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/;
/** A table row ends where another block structure starts. */
const TABLE_INTERRUPT = /^(?:>|#{1,6}(?:[ \t]|$)|`{3,}|~{3,}|<|[*+-][ \t]|\d{1,9}[.)][ \t])/;

const isSpaceOrTab = (char: string): boolean => char === ' ' || char === '\t';

/** Splits a table row on unescaped pipes; `\|` becomes a literal pipe in the cell. */
function splitRow(line: string): string[] {
  let row = line.trim();
  if (row.startsWith('|')) row = row.slice(1);
  const cells: string[] = [];
  let cell = '';
  for (let index = 0; index < row.length; index++) {
    const char = row[index]!;
    if (char === '\\' && row[index + 1] === '|') {
      cell += '|';
      index++;
    } else if (char === '|') {
      cells.push(cell.trim());
      cell = '';
    } else cell += char;
  }
  if (cell.trim() || !row.endsWith('|')) cells.push(cell.trim());
  return cells;
}

function delimiterAlign(line: string): MarkdownAlign[] {
  return splitRow(line).map((cell) => {
    const left = cell.startsWith(':');
    const right = cell.endsWith(':');
    return left && right ? 'center' : left ? 'left' : right ? 'right' : null;
  });
}

class BlockParser {
  readonly references = new Map<string, LinkReference>();
  readonly footnotes = new Set<string>();
  #doc!: Block;
  #tip!: Block;
  #oldTip!: Block;
  #lastMatched!: Block;
  #line = '';
  #lineNumber = 0;
  #offset = 0;
  #column = 0;
  #nextNonspace = 0;
  #nextNonspaceColumn = 0;
  #indent = 0;
  #indented = false;
  #blank = false;
  #partiallyConsumedTab = false;
  #allClosed = true;
  #context: InlineContext = { references: this.references, footnotes: this.footnotes };

  parse(source: string): MarkdownRoot {
    this.#doc = this.#block('document', 0);
    this.#tip = this.#doc;
    this.#oldTip = this.#doc;
    this.#lastMatched = this.#doc;
    const lines = source.split('\n');
    if (source.endsWith('\n')) lines.pop();
    const starts: number[] = [];
    let offset = 0;
    for (const line of lines) {
      starts.push(offset);
      offset += line.length + 1;
    }
    for (const line of lines) this.#incorporate(line);
    while (this.#tip) this.#finalize(this.#tip, lines.length);
    const position = (block: Block) => ({
      start: { offset: starts[block.startLine - 1] ?? 0 },
      end: {
        offset: Math.min(
          source.length,
          (starts[block.endLine - 1] ?? 0) + (lines[block.endLine - 1]?.length ?? 0),
        ),
      },
    });
    return { type: 'root', children: this.#convertChildren(this.#doc, position) };
  }

  #block(type: BlockType, line: number): Block {
    return {
      type,
      parent: null,
      children: [],
      open: true,
      startLine: line,
      endLine: line,
      content: '',
    };
  }

  // Line scanning (tabs advance to the next multiple of four columns).
  #findNextNonspace(): void {
    let index = this.#offset;
    let columns = this.#column;
    let char: string;
    while ((char = this.#line.charAt(index)) !== '') {
      if (char === ' ') {
        index++;
        columns++;
      } else if (char === '\t') {
        index++;
        columns += 4 - (columns % 4);
      } else break;
    }
    this.#blank = char === '';
    this.#nextNonspace = index;
    this.#nextNonspaceColumn = columns;
    this.#indent = columns - this.#column;
    this.#indented = this.#indent >= CODE_INDENT;
  }
  #advanceNextNonspace(): void {
    this.#offset = this.#nextNonspace;
    this.#column = this.#nextNonspaceColumn;
    this.#partiallyConsumedTab = false;
  }
  #advanceOffset(count: number, columns: boolean): void {
    let remaining = count;
    let char: string | undefined;
    while (remaining > 0 && (char = this.#line[this.#offset]) !== undefined) {
      if (char === '\t') {
        const toTab = 4 - (this.#column % 4);
        if (columns) {
          this.#partiallyConsumedTab = toTab > remaining;
          const advance = toTab > remaining ? remaining : toTab;
          this.#column += advance;
          this.#offset += this.#partiallyConsumedTab ? 0 : 1;
          remaining -= advance;
        } else {
          this.#partiallyConsumedTab = false;
          this.#column += toTab;
          this.#offset++;
          remaining--;
        }
      } else {
        this.#partiallyConsumedTab = false;
        this.#offset++;
        this.#column++;
        remaining--;
      }
    }
  }
  #addLine(): void {
    if (this.#partiallyConsumedTab) {
      this.#offset++;
      this.#tip.content += ' '.repeat(4 - (this.#column % 4));
    }
    this.#tip.content += `${this.#line.slice(this.#offset)}\n`;
  }
  #addChild(type: BlockType): Block {
    while (!this.#canContain(this.#tip.type, type)) this.#finalize(this.#tip, this.#lineNumber - 1);
    const block = this.#block(type, this.#lineNumber);
    block.parent = this.#tip;
    this.#tip.children.push(block);
    this.#tip = block;
    return block;
  }
  #closeUnmatched(): void {
    if (this.#allClosed) return;
    while (this.#oldTip !== this.#lastMatched) {
      const parent = this.#oldTip.parent!;
      this.#finalize(this.#oldTip, this.#lineNumber - 1);
      this.#oldTip = parent;
    }
    this.#allClosed = true;
  }
  #canContain(parent: BlockType, child: BlockType): boolean {
    switch (parent) {
      case 'document':
      case 'blockquote':
      case 'item':
      case 'footnote':
        return child !== 'item';
      case 'list':
        return child === 'item';
      default:
        return false;
    }
  }
  #acceptsLines(type: BlockType): boolean {
    return type === 'paragraph' || type === 'code' || type === 'html' || type === 'table';
  }

  /** 0: matched, 1: not matched, 2: the line was consumed (closing fence). */
  #continue(block: Block): 0 | 1 | 2 {
    const line = this.#line;
    switch (block.type) {
      case 'document':
      case 'list':
        return 0;
      case 'blockquote':
        if (!this.#indented && line.charAt(this.#nextNonspace) === '>') {
          this.#advanceNextNonspace();
          this.#advanceOffset(1, false);
          if (isSpaceOrTab(line.charAt(this.#offset))) this.#advanceOffset(1, true);
          return 0;
        }
        return 1;
      case 'item': {
        const data = block.list!;
        if (this.#blank) {
          if (!block.children.length) return 1;
          this.#advanceNextNonspace();
        } else if (this.#indent >= data.markerOffset + data.padding)
          this.#advanceOffset(data.markerOffset + data.padding, true);
        else return 1;
        return 0;
      }
      case 'footnote':
        if (this.#blank) this.#advanceNextNonspace();
        else if (this.#indent >= CODE_INDENT) this.#advanceOffset(CODE_INDENT, true);
        else return 1;
        return 0;
      case 'heading':
      case 'thematicBreak':
        return 1;
      case 'code':
        if (block.fenced) {
          const match =
            this.#indent <= 3 && line.charAt(this.#nextNonspace) === block.fenceChar
              ? CLOSING_CODE_FENCE.exec(line.slice(this.#nextNonspace))
              : null;
          if (match && match[0].length >= block.fenceLength!) {
            this.#finalize(block, this.#lineNumber);
            return 2;
          }
          let skip = block.fenceOffset!;
          while (skip > 0 && isSpaceOrTab(line.charAt(this.#offset))) {
            this.#advanceOffset(1, true);
            skip--;
          }
        } else if (this.#indent >= CODE_INDENT) this.#advanceOffset(CODE_INDENT, true);
        else if (this.#blank) this.#advanceNextNonspace();
        else return 1;
        return 0;
      case 'html':
        return this.#blank && (block.htmlType === 6 || block.htmlType === 7) ? 1 : 0;
      case 'paragraph':
        return this.#blank ? 1 : 0;
      case 'table':
        if (this.#blank) return 1;
        if (
          !this.#indented &&
          (TABLE_INTERRUPT.test(line.slice(this.#nextNonspace)) ||
            THEMATIC_BREAK.test(line.slice(this.#nextNonspace)))
        )
          return 1;
        return 0;
    }
  }

  /** 0: no match, 1: container started, 2: leaf started. */
  #tryStarts(container: Block): 0 | 1 | 2 {
    const line = this.#line;
    const rest = line.slice(this.#nextNonspace);
    const lazyParagraph = !this.#allClosed && !this.#blank && this.#tip.type === 'paragraph';
    // Block quote.
    if (!this.#indented && rest.startsWith('>')) {
      this.#advanceNextNonspace();
      this.#advanceOffset(1, false);
      if (isSpaceOrTab(line.charAt(this.#offset))) this.#advanceOffset(1, true);
      this.#closeUnmatched();
      this.#addChild('blockquote');
      return 1;
    }
    // ATX heading.
    let match: RegExpExecArray | null;
    if (!this.#indented && (match = ATX_HEADING.exec(rest))) {
      this.#advanceNextNonspace();
      this.#advanceOffset(match[0].length, false);
      this.#closeUnmatched();
      const heading = this.#addChild('heading');
      heading.level = match[0].trim().length;
      heading.content = line
        .slice(this.#offset)
        .replace(/^[ \t]*#+[ \t]*$/, '')
        .replace(/[ \t]+#+[ \t]*$/, '');
      this.#advanceOffset(line.length - this.#offset, false);
      return 2;
    }
    // Fenced code.
    if (!this.#indented && (match = CODE_FENCE.exec(rest))) {
      const length = match[0].length;
      this.#closeUnmatched();
      const code = this.#addChild('code');
      code.fenced = true;
      code.fenceLength = length;
      code.fenceChar = match[0][0]!;
      code.fenceOffset = this.#indent;
      this.#advanceNextNonspace();
      this.#advanceOffset(length, false);
      return 2;
    }
    // HTML block.
    if (!this.#indented && rest.startsWith('<')) {
      for (let type = 1; type <= 7; type++)
        if (
          HTML_BLOCK_OPEN[type]!.test(rest) &&
          (type < 7 || (container.type !== 'paragraph' && !lazyParagraph))
        ) {
          this.#closeUnmatched();
          const html = this.#addChild('html');
          html.htmlType = type;
          return 2;
        }
    }
    // Table delimiter row under a one-line header.
    if (
      !this.#indented &&
      container.type === 'paragraph' &&
      rest.includes('|') &&
      DELIMITER_ROW.test(rest)
    ) {
      const lines = container.content.replace(/\n$/, '').split('\n');
      const header = splitRow(lines.at(-1)!);
      const align = delimiterAlign(rest);
      if (header.length === align.length) {
        this.#closeUnmatched();
        const parent = container.parent!;
        const table = this.#block('table', this.#lineNumber - 1);
        table.parent = parent;
        table.header = header;
        table.align = align;
        if (lines.length > 1) {
          container.content = `${lines.slice(0, -1).join('\n')}\n`;
          this.#finalize(container, this.#lineNumber - 2);
        } else {
          parent.children.splice(parent.children.indexOf(container), 1);
        }
        parent.children.push(table);
        this.#tip = table;
        this.#advanceOffset(line.length - this.#offset, false);
        return 2;
      }
    }
    // Setext heading.
    if (!this.#indented && container.type === 'paragraph' && (match = SETEXT_HEADING.exec(rest))) {
      this.#closeUnmatched();
      this.#extractReferences(container);
      if (container.content.length > 0) {
        container.type = 'heading';
        container.level = match[0][0] === '=' ? 1 : 2;
        container.content = container.content.replace(/\n$/, '');
        this.#tip = container;
        this.#advanceOffset(line.length - this.#offset, false);
        return 2;
      }
    }
    // Thematic break.
    if (!this.#indented && THEMATIC_BREAK.test(rest)) {
      this.#closeUnmatched();
      this.#addChild('thematicBreak');
      this.#advanceOffset(line.length - this.#offset, false);
      return 2;
    }
    // Footnote definition: ends a lazy paragraph but does not interrupt a matched one.
    if (!this.#indented && container.type !== 'paragraph' && (match = FOOTNOTE.exec(rest))) {
      this.#advanceNextNonspace();
      this.#advanceOffset(match[0].length, true);
      if (isSpaceOrTab(line.charAt(this.#offset))) this.#advanceOffset(1, true);
      this.#closeUnmatched();
      const footnote = this.#addChild('footnote');
      footnote.label = match[1]!;
      this.footnotes.add(normalizeLabel(match[1]!));
      return 1;
    }
    // List item.
    if (!this.#indented || container.type === 'list') {
      const data = this.#parseListMarker(container);
      if (data) {
        this.#closeUnmatched();
        if (this.#tip.type !== 'list' || !listsMatch(this.#tip.list!, data)) {
          const list = this.#addChild('list');
          list.list = data;
        }
        const item = this.#addChild('item');
        item.list = data;
        return 1;
      }
    }
    // Indented code.
    if (this.#indented && this.#tip.type !== 'paragraph' && !this.#blank) {
      this.#advanceOffset(CODE_INDENT, true);
      this.#closeUnmatched();
      this.#addChild('code');
      return 2;
    }
    return 0;
  }

  #parseListMarker(container: Block): ListData | null {
    if (this.#indent >= 4) return null;
    const rest = this.#line.slice(this.#nextNonspace);
    const data: ListData = {
      type: 'bullet',
      bulletChar: null,
      start: null,
      delimiter: null,
      padding: 0,
      markerOffset: this.#indent,
    };
    let match: RegExpExecArray | null;
    if ((match = BULLET_MARKER.exec(rest))) data.bulletChar = match[0][0]!;
    else if (
      (match = ORDERED_MARKER.exec(rest)) &&
      (container.type !== 'paragraph' || match[1] === '1')
    ) {
      data.type = 'ordered';
      data.start = Number.parseInt(match[1]!, 10);
      data.delimiter = match[2]!;
    } else return null;
    const next = this.#line.charAt(this.#nextNonspace + match[0].length);
    if (!(next === '' || next === '\t' || next === ' ')) return null;
    if (
      container.type === 'paragraph' &&
      !/[^ \t]/.test(this.#line.slice(this.#nextNonspace + match[0].length))
    )
      return null;
    this.#advanceNextNonspace();
    this.#advanceOffset(match[0].length, true);
    const spacesStartColumn = this.#column;
    const spacesStartOffset = this.#offset;
    do this.#advanceOffset(1, true);
    while (this.#column - spacesStartColumn < 5 && isSpaceOrTab(this.#line.charAt(this.#offset)));
    const blankItem = this.#line.charAt(this.#offset) === '';
    const spaces = this.#column - spacesStartColumn;
    if (spaces >= 5 || spaces < 1 || blankItem) {
      data.padding = match[0].length + 1;
      this.#column = spacesStartColumn;
      this.#offset = spacesStartOffset;
      if (isSpaceOrTab(this.#line.charAt(this.#offset))) this.#advanceOffset(1, true);
    } else data.padding = match[0].length + spaces;
    return data;
  }

  #incorporate(rawLine: string): void {
    this.#lineNumber++;
    this.#line = rawLine.includes('\0') ? rawLine.replace(/\0/g, '�') : rawLine;
    this.#offset = 0;
    this.#column = 0;
    this.#blank = false;
    this.#partiallyConsumedTab = false;
    this.#oldTip = this.#tip;
    let container = this.#doc;
    for (;;) {
      const last = container.children.at(-1);
      if (!last?.open) break;
      container = last;
      this.#findNextNonspace();
      const result = this.#continue(container);
      if (result === 1) {
        container = container.parent!;
        break;
      }
      if (result === 2) return;
    }
    this.#allClosed = container === this.#oldTip;
    this.#lastMatched = container;
    let matchedLeaf = container.type !== 'paragraph' && this.#acceptsLines(container.type);
    while (!matchedLeaf) {
      this.#findNextNonspace();
      if (!this.#indented && !MAYBE_SPECIAL.test(this.#line.slice(this.#nextNonspace))) {
        this.#advanceNextNonspace();
        break;
      }
      const result = this.#tryStarts(container);
      if (result === 0) {
        this.#advanceNextNonspace();
        break;
      }
      container = this.#tip;
      if (result === 2) matchedLeaf = true;
    }
    if (!this.#allClosed && !this.#blank && this.#tip.type === 'paragraph') {
      this.#addLine();
      return;
    }
    this.#closeUnmatched();
    if (this.#acceptsLines(container.type)) {
      this.#addLine();
      if (
        container.type === 'html' &&
        container.htmlType! <= 5 &&
        HTML_BLOCK_CLOSE[container.htmlType!]!.test(this.#line.slice(this.#offset))
      )
        this.#finalize(container, this.#lineNumber);
    } else if (this.#offset < this.#line.length && !this.#blank) {
      this.#addChild('paragraph');
      this.#advanceNextNonspace();
      this.#addLine();
    }
  }

  #extractReferences(block: Block): void {
    let consumed: number;
    while (
      block.content.startsWith('[') &&
      (consumed = parseReference(block.content, this.#context))
    )
      block.content = block.content.slice(consumed);
  }

  #finalize(block: Block, line: number): void {
    const parent = block.parent;
    block.open = false;
    block.endLine = Math.max(block.startLine, line);
    switch (block.type) {
      case 'paragraph':
        this.#extractReferences(block);
        if (!/[^ \t\n]/.test(block.content) && parent)
          parent.children.splice(parent.children.indexOf(block), 1);
        break;
      case 'code':
        if (block.fenced) {
          const newline = block.content.indexOf('\n');
          block.label = unescapeString(block.content.slice(0, newline).trim());
          block.content = block.content.slice(newline + 1);
        } else block.content = block.content.replace(/(\n *)+$/, '\n');
        break;
      case 'html':
        block.content = block.content.replace(/(\n *)+$/, '');
        break;
      case 'item':
        if (block.children.length) block.endLine = block.children.at(-1)!.endLine;
        else block.endLine = block.startLine;
        break;
      case 'list': {
        block.tight = true;
        const endsWithBlank = (item: Block, next: Block | undefined) =>
          next !== undefined && item.endLine !== next.startLine - 1;
        block.children.forEach((item, index) => {
          if (endsWithBlank(item, block.children[index + 1])) block.tight = false;
          item.children.forEach((child, childIndex) => {
            if (endsWithBlank(child, item.children[childIndex + 1])) block.tight = false;
          });
        });
        if (block.children.length) block.endLine = block.children.at(-1)!.endLine;
        break;
      }
    }
    this.#tip = parent!;
  }

  #convertChildren(
    block: Block,
    position: (block: Block) => { start: { offset: number }; end: { offset: number } },
  ): MarkdownBlock[] {
    return block.children.flatMap((child) => {
      const node = this.#convert(child, position);
      if (node) node.position = position(child);
      return node ? [node] : [];
    });
  }

  #inlines(content: string) {
    return parseInlines(content.trim(), this.#context);
  }

  #convert(
    block: Block,
    position: (block: Block) => { start: { offset: number }; end: { offset: number } },
  ): MarkdownBlock | null {
    switch (block.type) {
      case 'paragraph':
        return { type: 'paragraph', children: this.#inlines(block.content) };
      case 'heading':
        return {
          type: 'heading',
          depth: block.level as 1 | 2 | 3 | 4 | 5 | 6,
          children: this.#inlines(block.content),
        };
      case 'thematicBreak':
        return { type: 'thematicBreak' };
      case 'blockquote':
        return { type: 'blockquote', children: this.#convertChildren(block, position) };
      case 'code': {
        const info = block.fenced ? (block.label ?? '') : '';
        const space = info.search(/\s/);
        const lang = space < 0 ? info : info.slice(0, space);
        const meta = space < 0 ? '' : info.slice(space + 1).trim();
        return {
          type: 'code',
          lang: lang || null,
          meta: meta || null,
          value: block.content.replace(/\n$/, ''),
        };
      }
      case 'html':
        return { type: 'html', value: block.content };
      case 'list': {
        const tight = block.tight ?? true;
        const data = block.list!;
        return {
          type: 'list',
          ordered: data.type === 'ordered',
          start: data.start,
          spread: !tight,
          children: block.children.map((item) => {
            const node = this.#convertItem(item, position);
            node.position = position(item);
            return node;
          }),
        };
      }
      case 'table': {
        const width = block.align!.length;
        const row = (cells: string[]): MarkdownTableRow => ({
          type: 'tableRow',
          children: Array.from({ length: width }, (_, index) => ({
            type: 'tableCell' as const,
            children: this.#inlines(cells[index] ?? ''),
          })),
        });
        const body = block.content
          .split('\n')
          .filter((line) => line.trim())
          .map((line) => row(splitRow(line)));
        return { type: 'table', align: block.align!, children: [row(block.header!), ...body] };
      }
      case 'footnote':
        return {
          type: 'footnoteDefinition',
          identifier: block.label!.toLowerCase(),
          label: block.label!,
          children: this.#convertChildren(block, position),
        };
      default:
        return null;
    }
  }

  #convertItem(
    item: Block,
    position: (block: Block) => { start: { offset: number }; end: { offset: number } },
  ): MarkdownListItem {
    let checked: boolean | null = null;
    const first = item.children[0];
    if (first?.type === 'paragraph') {
      const task = TASK.exec(first.content);
      if (task) {
        checked = task[1] !== ' ';
        first.content = first.content.slice(task[0].length).replace(/^[ \t]+/, '');
      }
    }
    const spread = item.children.some(
      (child, index) =>
        index < item.children.length - 1 &&
        child.endLine !== item.children[index + 1]!.startLine - 1,
    );
    return { type: 'listItem', checked, spread, children: this.#convertChildren(item, position) };
  }
}

function listsMatch(list: ListData, item: ListData): boolean {
  return (
    list.type === item.type &&
    list.delimiter === item.delimiter &&
    list.bulletChar === item.bulletChar
  );
}

/** Parses markdown with the built-in CommonMark and GitHub Flavored Markdown parser. */
export function parseMarkdown(source: string): MarkdownRoot {
  return new BlockParser().parse(source.replace(/\r\n?/g, '\n'));
}

/** The built-in parser as a `MarkdownParser`. */
export const builtinMarkdownParser: MarkdownParser = { name: 'builtin', parse: parseMarkdown };
