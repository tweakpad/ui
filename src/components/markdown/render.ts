import { html, nothing, render as renderInto } from 'lit';
import { styleMap } from 'lit/directives/style-map.js';
import { builtinHighlighter, type CodeHighlighter } from '../../foundation/code/index.js';
import { collectTargets } from '../../foundation/collect-targets.js';
import { inlineText } from '../../foundation/markdown/index.js';
import type {
  MarkdownAlertKind,
  MarkdownContent,
  MarkdownElement,
  MarkdownFootnoteDefinition,
  MarkdownListItem,
  MarkdownNode,
  MarkdownTable,
  MarkdownTableRow,
} from '../../foundation/markdown/index.js';
import { fenceOptions } from './fence-meta.js';
import type {
  MarkdownHeadingTarget,
  MarkdownMessages,
  MarkdownRenderer,
  MarkdownRenderers,
} from './types.js';

const SEVERITY: Record<MarkdownAlertKind, string> = {
  note: 'informational',
  important: 'informational',
  tip: 'success',
  warning: 'warning',
  caution: 'danger',
};

let taskSequence = 0;

export interface TreeRendererOptions {
  readonly host: HTMLElement;
  readonly renderers: MarkdownRenderers;
  readonly headingOffset: number;
  readonly idPrefix: string;
  readonly messages: Required<MarkdownMessages>;
  readonly highlighter: CodeHighlighter | null;
  readonly diagnostic: (code: string, message: string) => void;
}

/** Renders a resolved tree as Lit content: native semantic elements and composed controls. */
export class MarkdownTreeRenderer {
  constructor(private readonly options: TreeRendererOptions) {}

  node(node: MarkdownNode, tight = false): unknown {
    const fallback = (): unknown => this.#default(node, tight);
    const renderer = this.options.renderers[node.type] as MarkdownRenderer | undefined;
    if (renderer)
      try {
        const result = renderer(node, {
          markdown: this.options.host,
          children: () => this.#children(node, tight),
          fallback,
        });
        if (result !== undefined) return result;
      } catch (error) {
        this.options.diagnostic(
          'markdown-renderer',
          `The ${node.type} renderer failed; using the default rendering: ${String(error)}`,
        );
      }
    return fallback();
  }

  nodes(nodes: readonly MarkdownNode[], tight = false): unknown[] {
    return nodes.map((node) => this.node(node, tight));
  }

  #children(node: MarkdownNode, tight: boolean): unknown {
    return 'children' in node ? this.nodes(node.children as MarkdownNode[], tight) : nothing;
  }

  #default(node: MarkdownNode, tight: boolean): unknown {
    switch (node.type) {
      case 'root':
        return this.nodes(node.children);
      case 'paragraph':
        return tight
          ? this.nodes(node.children)
          : html`<p part="markdown-paragraph">${this.nodes(node.children)}</p>`;
      case 'heading':
        return this.#heading(node.depth, node.identifier, this.nodes(node.children));
      case 'thematicBreak':
        return html`<tp-separator .decorative=${false}></tp-separator>`;
      case 'blockquote':
        return html`<blockquote part="markdown-blockquote" data-flow>
          ${this.nodes(node.children)}
        </blockquote>`;
      case 'list': {
        const items = node.children.map((item) => this.node(item, !node.spread));
        // A list of only task items drops its markers and indent; mixed lists keep them.
        const task = node.children.every((item) => item.checked !== null);
        return node.ordered
          ? html`<ol
              part="markdown-list"
              start=${node.start !== null && node.start !== 1 ? node.start : nothing}
              ?data-task-list=${task}
            >
              ${items}
            </ol>`
          : html`<ul part="markdown-list" ?data-task-list=${task}>
              ${items}
            </ul>`;
      }
      case 'listItem':
        return this.#listItem(node, tight);
      case 'code': {
        const options = fenceOptions(node.meta);
        return html`<tp-code-block
          .code=${node.value}
          language=${node.lang ?? 'plaintext'}
          .label=${options.title}
          highlight-lines=${options.highlightLines || nothing}
          ?line-numbers=${options.lineNumbers}
          .highlighter=${this.options.highlighter ?? builtinHighlighter}
        ></tp-code-block>`;
      }
      case 'table':
        return this.#table(node);
      case 'alert':
        return html`<tp-alert
          severity=${SEVERITY[node.kind]}
          .title=${this.options.messages[node.kind]}
          data-flow
          >${this.nodes(node.children)}</tp-alert
        >`;
      case 'footnotes':
        return html`<section
          part="markdown-footnotes"
          aria-label=${this.options.messages.footnotes}
        >
          <ol>
            ${node.children.map((definition) => this.#footnote(definition))}
          </ol>
        </section>`;
      case 'text':
        return node.value;
      case 'emphasis':
        return html`<em part="markdown-emphasis">${this.nodes(node.children)}</em>`;
      case 'strong':
        return html`<strong part="markdown-strong">${this.nodes(node.children)}</strong>`;
      case 'delete':
        return html`<del part="markdown-delete">${this.nodes(node.children)}</del>`;
      case 'inlineCode':
        return html`<code part="markdown-code">${node.value}</code>`;
      case 'break':
        return html`<br />`;
      case 'link':
        return html`<a part="markdown-link" href=${node.url} title=${node.title ?? nothing}
          >${this.nodes(node.children)}</a
        >`;
      case 'image':
        return html`<img
          part="markdown-image"
          src=${node.url}
          alt=${node.alt}
          title=${node.title ?? nothing}
          loading="lazy"
        />`;
      case 'footnoteReference': {
        if (node.index === undefined) return `[^${node.label}]`;
        const id = this.#footnoteId(node.index);
        return html`<sup
          ><a
            part="markdown-footnote-reference"
            id=${this.#referenceId(node.index, node.occurrence ?? 1)}
            href="#${id}"
            >${node.index}</a
          ></sup
        >`;
      }
      case 'element':
        return this.#element(node);
      case 'html':
        return node.value;
      default: {
        const unknown = node as { children?: MarkdownNode[]; value?: unknown };
        if (Array.isArray(unknown.children)) return this.nodes(unknown.children, tight);
        return typeof unknown.value === 'string' ? unknown.value : nothing;
      }
    }
  }

  #heading(depth: number, id: string | undefined, content: unknown): unknown {
    const level = Math.min(6, depth + this.options.headingOffset);
    const identifier = id ?? nothing;
    switch (level) {
      case 1:
        return html`<h1 part="markdown-heading" id=${identifier} data-level="1">${content}</h1>`;
      case 2:
        return html`<h2 part="markdown-heading" id=${identifier} data-level="2">${content}</h2>`;
      case 3:
        return html`<h3 part="markdown-heading" id=${identifier} data-level="3">${content}</h3>`;
      case 4:
        return html`<h4 part="markdown-heading" id=${identifier} data-level="4">${content}</h4>`;
      case 5:
        return html`<h5 part="markdown-heading" id=${identifier} data-level="5">${content}</h5>`;
      default:
        return html`<h6 part="markdown-heading" id=${identifier} data-level="6">${content}</h6>`;
    }
  }

  #listItem(item: MarkdownListItem, tight: boolean): unknown {
    if (item.checked === null)
      return html`<li part="markdown-list-item" ?data-flow=${!tight}>
        ${this.nodes(item.children, tight)}
      </li>`;
    // A task item pairs a read-only checkbox with a native label of its first paragraph, so
    // links in the item text stay outside the checkbox.
    const id = `${this.options.idPrefix}task-${++taskSequence}`;
    const [first, ...rest] = item.children;
    const lead = first?.type === 'paragraph' ? first : null;
    return html`<li part="markdown-list-item" data-task ?data-flow=${!tight}>
      <tp-checkbox id=${id} readonly .checked=${item.checked}></tp-checkbox
      ><label for=${id}>${lead ? this.nodes(lead.children) : nothing}</label>
      ${this.nodes(lead ? rest : item.children, tight)}
    </li>`;
  }

  #table(table: MarkdownTable): unknown {
    const [head, ...body] = table.children;
    const rows = body.map(
      (row) =>
        html`<tr>
          ${this.#cells(table, row, false)}
        </tr>`,
    );
    // Column headers keep several tables on one page distinguishable.
    const columns = (head?.children ?? [])
      .map((cell) => inlineText(cell.children).trim())
      .filter(Boolean);
    const label = columns.length
      ? `${this.options.messages.table}: ${columns.join(', ')}`
      : this.options.messages.table;
    return html`<tp-table .label=${label}
      ><table>
        <thead>
          <tr>
            ${head ? this.#cells(table, head, true) : nothing}
          </tr>
        </thead>
        ${
          body.length
            ? html`<tbody>
                ${rows}
              </tbody>`
            : nothing
        }
      </table></tp-table
    >`;
  }

  #cells(table: MarkdownTable, row: MarkdownTableRow, header: boolean): unknown[] {
    return row.children.map((cell, index) => {
      const style = styleMap({ textAlign: table.align[index] ?? undefined });
      const content = this.nodes(cell.children);
      return header
        ? html`<th scope="col" style=${style}>${content}</th>`
        : html`<td style=${style}>${content}</td>`;
    });
  }

  #footnote(definition: MarkdownFootnoteDefinition): unknown {
    const index = definition.index ?? 0;
    const references = Array.from({ length: definition.references ?? 1 }, (_, occurrence) => {
      const label = `${this.options.messages.backReference} ${index}${occurrence ? `-${occurrence + 1}` : ''}`;
      return html` <a
        part="markdown-footnote-back-reference"
        href="#${this.#referenceId(index, occurrence + 1)}"
        aria-label=${label}
        >↩${occurrence ? html`<sup>${occurrence + 1}</sup>` : nothing}</a
      >`;
    });
    const children = definition.children;
    const last = children.at(-1);
    // Back-references join the last paragraph, as GitHub renders them.
    const content =
      last?.type === 'paragraph' && !this.options.renderers.paragraph
        ? [
            ...this.nodes(children.slice(0, -1)),
            html`<p part="markdown-paragraph">${this.nodes(last.children)}${references}</p>`,
          ]
        : [...this.nodes(children), references];
    return html`<li id=${this.#footnoteId(index)} data-flow>${content}</li>`;
  }

  #footnoteId(index: number): string {
    return `${this.options.idPrefix}fn-${index}`;
  }

  #referenceId(index: number, occurrence: number): string {
    return `${this.options.idPrefix}fnref-${index}${occurrence > 1 ? `-${occurrence}` : ''}`;
  }

  /** Elements admitted by the element policy; `kbd` composes Key hint. */
  #element(node: MarkdownElement): unknown {
    const children = this.nodes(node.children as MarkdownContent[]);
    if (node.tagName === 'kbd') return html`<tp-key-hint>${children}</tp-key-hint>`;
    const element = this.options.host.ownerDocument.createElement(node.tagName);
    for (const [name, value] of Object.entries(node.attributes)) element.setAttribute(name, value);
    if (node.children.some((child) => isBlock(child))) element.setAttribute('data-flow', '');
    renderInto(children, element);
    return element;
  }
}

function isBlock(node: MarkdownContent): boolean {
  return [
    'paragraph',
    'heading',
    'thematicBreak',
    'blockquote',
    'list',
    'code',
    'table',
    'alert',
  ].includes(node.type);
}

/** Heading records for scroll spy (Foundation §18.15 collected targets) from rendered headings. */
export function collectHeadings(root: ParentNode): MarkdownHeadingTarget[] {
  return collectTargets(root, '[part~="markdown-heading"]', {
    depth: (element) => Number((element as HTMLElement).dataset.level),
  }).map((target) => ({ ...target, depth: target.depth ?? 1 }));
}
