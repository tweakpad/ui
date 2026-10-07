import { css, html, type PropertyValues } from 'lit';
import { guard } from 'lit/directives/guard.js';
import { repeat } from 'lit/directives/repeat.js';
import { TpElement } from '../../foundation/element.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';
import { dedentCode } from '../../foundation/dedent.js';
import type { CodeHighlighter } from '../../foundation/code/index.js';
import {
  completeMarkdown,
  isMarkdownRoot,
  parseMarkdown,
  resolveMarkdown,
  type MarkdownBlock,
  type MarkdownElementPolicy,
  type MarkdownParser,
  type MarkdownRoot,
  type MarkdownUrlPolicy,
} from '../../foundation/markdown/index.js';
import { markdownPresentation } from '../../presentation/families/markdown.js';
import { TpAlert } from '../alert/alert.js';
import { TpCheckbox } from '../checkbox/checkbox.js';
import { TpCodeBlock } from '../code-block/code-block.js';
import { TpKeyHint } from '../key-hint/key-hint.js';
import { TpSeparator } from '../separator/separator.js';
import { TpTable } from '../table/table.js';
import { collectHeadings, MarkdownTreeRenderer } from './render.js';
import {
  DEFAULT_MARKDOWN_MESSAGES,
  type MarkdownHeadingTarget,
  type MarkdownMessages,
  type MarkdownRenderDetail,
  type MarkdownRenderers,
} from './types.js';

/** Link reference and footnote definition lines; a change can restyle earlier blocks. */
const DEFINITION_LINE = /^ {0,3}\[\^?[^\]\n]+\]:.*$/gm;

/**
 * Markdown presentation (`ucl21-markdown`, behavior Foundation §18.16 Markdown).
 *
 * The source comes from `source` or, when unset, the element's text content (or a
 * `<script type="text/markdown">` child), dedented. It renders through the component as native
 * semantic content and composed library controls; raw HTML enters only through `elements`, and
 * `renderers` replace the rendering of individual node types.
 *
 * @csspart markdown - The flow root; `size` selects its typography and spacing scale.
 * @csspart markdown-heading - A heading; `data-level` is the rendered level.
 * @csspart markdown-paragraph - A paragraph.
 * @csspart markdown-list - An ordered or unordered list; `data-task-list` when every item is a task.
 * @csspart markdown-list-item - A list item; `data-task` for a task item.
 * @csspart markdown-blockquote - A quotation.
 * @csspart markdown-code - Inline code.
 * @csspart markdown-link - A link.
 * @csspart markdown-image - An image.
 * @csspart markdown-emphasis - Emphasis.
 * @csspart markdown-strong - Strong importance.
 * @csspart markdown-delete - Strikethrough.
 * @csspart markdown-footnotes - The footnotes section.
 * @csspart markdown-footnote-reference - A footnote reference.
 * @csspart markdown-footnote-back-reference - A link back to a footnote reference.
 * @fires tp-markdown-render - After each committed render; `detail.headings`.
 * @fires tp-diagnostic - Blocked links, images and elements, parser fallback, renderer failures.
 */
export class TpMarkdown extends TpElement {
  static tagName = 'tp-markdown';
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpCodeBlock, TpTable, TpSeparator, TpCheckbox, TpAlert, TpKeyHint];
  }
  static override presentation = markdownPresentation;
  static override properties = {
    ...TpElement.properties,
    source: { type: String },
    streaming: { type: Boolean, reflect: true },
    size: { type: String, reflect: true },
    headingOffset: { type: Number, attribute: 'heading-offset' },
    idPrefix: { type: String, attribute: 'id-prefix' },
    elements: { attribute: false },
    renderers: { attribute: false },
    urlPolicy: { attribute: false },
    parser: { attribute: false },
    highlighter: { attribute: false },
    messages: { attribute: false },
    _lightSource: { state: true },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
        min-inline-size: 0;
      }

      .root {
        display: flow-root;
        min-inline-size: 0;
      }

      img {
        max-inline-size: 100%;
      }

      [hidden] {
        display: none !important;
      }
    `,
  ];

  source: string | undefined = undefined;
  streaming = false;
  size: 'default' | 'sm' = 'default';
  headingOffset = 0;
  idPrefix = '';
  elements: MarkdownElementPolicy | null = null;
  renderers: MarkdownRenderers = {};
  urlPolicy: MarkdownUrlPolicy | null = null;
  parser: MarkdownParser | null = null;
  highlighter: CodeHighlighter | null = null;
  messages: MarkdownMessages = {};

  declare _lightSource: string;

  #tree: MarkdownRoot = { type: 'root', children: [] };
  #parsed = '';
  #version = 0;
  #signature = '';
  #reported = new Set<string>();
  #mutations: MutationObserver | undefined;
  #fragmentPending = true;

  constructor() {
    super();
    this._lightSource = '';
  }

  /** The resolved tree of the current source. */
  get ast(): MarkdownRoot {
    return this.#tree;
  }

  /** Rendered headings in the collected-target shape of scroll spy. */
  get headings(): MarkdownHeadingTarget[] {
    return collectHeadings(this.renderRoot);
  }

  get markdownMessages(): Required<MarkdownMessages> {
    return { ...DEFAULT_MARKDOWN_MESSAGES, ...this.messages };
  }

  /** Adds text to the end of the source, as a stream of chunks does. */
  append(text: string): void {
    this.source = (this.source ?? this._lightSource) + text;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#readLightSource();
    this.#mutations = new MutationObserver(() => this.#readLightSource());
    this.#mutations.observe(this, { childList: true, characterData: true, subtree: true });
    this.renderRoot.addEventListener('click', this.#click as EventListener);
    this.ownerDocument.defaultView?.addEventListener('hashchange', this.#hashChange);
  }

  override disconnectedCallback(): void {
    this.#mutations?.disconnect();
    this.renderRoot.removeEventListener('click', this.#click as EventListener);
    this.ownerDocument.defaultView?.removeEventListener('hashchange', this.#hashChange);
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    const parse = [
      'source',
      '_lightSource',
      'streaming',
      'parser',
      'elements',
      'urlPolicy',
      'idPrefix',
    ];
    if (!this.hasUpdated || parse.some((key) => changed.has(key as keyof TpMarkdown)))
      this.#parse();
    const render = [
      'renderers',
      'headingOffset',
      'messages',
      'highlighter',
      'elements',
      'urlPolicy',
      'idPrefix',
    ];
    if (render.some((key) => changed.has(key as keyof TpMarkdown))) this.#version++;
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.toggleAttribute('data-streaming', this.streaming);
    if (this.#fragmentPending && this.#tree.children.length) {
      this.#fragmentPending = false;
      // Composed controls render after this element; scroll once their layout has settled.
      void this.#settled().then(() => this.#scrollToFragment(this.ownerDocument.location.hash));
    }
    this.emit<MarkdownRenderDetail>('tp-markdown-render', { headings: this.headings });
  }

  #readLightSource(): void {
    const script = this.querySelector(':scope > script[type="text/markdown"]');
    const text = script
      ? (script.textContent ?? '')
      : [...this.childNodes]
          .filter((node) => node.nodeType === 3)
          .map((node) => node.textContent ?? '')
          .join('');
    this._lightSource = dedentCode(text);
  }

  #diagnostic(code: string, message: string): void {
    this.emit('tp-diagnostic', { code, message });
  }

  #parse(): void {
    const source = (this.source ?? this._lightSource).replace(/\r\n?/g, '\n');
    const text = this.streaming ? completeMarkdown(source) : source;
    const reported = new Set<string>();
    const report = (code: string, message: string): void => {
      const key = `${code}\n${message}`;
      reported.add(key);
      // A growing source would otherwise repeat the same diagnostic for every chunk.
      if (!this.#reported.has(key)) this.#diagnostic(code, message);
    };
    let root: MarkdownRoot | null = null;
    if (this.parser)
      try {
        const result: unknown = this.parser.parse(text);
        if (!isMarkdownRoot(result)) throw new Error('the result is not a root node');
        root = result;
      } catch (error) {
        report(
          'markdown-parser',
          `Parser "${this.parser.name ?? 'custom'}" failed; using the built-in parser: ${String(error)}`,
        );
      }
    root ??= parseMarkdown(text);
    const resolved = resolveMarkdown(root, {
      elements: this.elements,
      urls: this.urlPolicy,
      idPrefix: this.idPrefix,
    });
    for (const { code, message } of resolved.diagnostics) report(code, message);
    this.#reported = reported;
    this.#tree = resolved.root;
    this.#parsed = text;
    const footnotes = resolved.root.children.at(-1);
    // Definitions, footnote order and heading identifiers can change blocks whose text did not.
    const signature = [
      ...(text.match(DEFINITION_LINE) ?? []),
      footnotes?.type === 'footnotes' ? footnotes.children.map((note) => note.label).join(' ') : '',
      resolved.root.children
        .map((block) => (block.type === 'heading' ? block.identifier : ''))
        .join(' '),
    ].join('\n');
    if (signature !== this.#signature) {
      this.#signature = signature;
      this.#version++;
    }
  }

  #click = (event: MouseEvent): void => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = event
      .composedPath()
      .find((node): node is HTMLAnchorElement => node instanceof HTMLAnchorElement);
    const href = anchor?.getAttribute('href');
    if (!anchor || anchor.getRootNode() !== this.renderRoot || !href?.startsWith('#')) return;
    const target = this.#target(href);
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ block: 'start' });
    // Native fragment navigation moves the focus starting point; inside a shadow root it cannot,
    // so focus the target (focusable only while focused) for keyboard continuity.
    if (!target.hasAttribute('tabindex')) {
      target.setAttribute('tabindex', '-1');
      target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
    }
    target.focus({ preventScroll: true });
    const view = this.ownerDocument.defaultView;
    if (view && view.location.hash !== href) view.history.pushState(view.history.state, '', href);
  };

  #hashChange = (): void => this.#scrollToFragment(this.ownerDocument.location.hash);

  #target(hash: string): HTMLElement | null {
    if (hash.length < 2) return null;
    let id = hash.slice(1);
    try {
      id = decodeURIComponent(id);
    } catch {
      // Keep the raw fragment.
    }
    return (this.renderRoot as ShadowRoot).getElementById?.(id) ?? null;
  }

  async #settled(): Promise<void> {
    const pending = [...this.renderRoot.querySelectorAll('*')]
      .map((element) => (element as Partial<TpElement>).updateComplete)
      .filter((promise): promise is Promise<boolean> => promise instanceof Promise);
    await Promise.all(pending);
    const view = this.ownerDocument.defaultView;
    if (view) await new Promise((resolve) => view.requestAnimationFrame(resolve));
  }

  #scrollToFragment(hash: string): void {
    this.#target(hash)?.scrollIntoView({ block: 'start' });
  }

  protected override render() {
    const renderer = new MarkdownTreeRenderer({
      host: this,
      renderers: this.renderers ?? {},
      headingOffset: Math.max(0, Math.min(5, Math.trunc(Number(this.headingOffset) || 0))),
      idPrefix: this.idPrefix ?? '',
      messages: this.markdownMessages,
      highlighter: this.highlighter,
      diagnostic: (code, message) => this.#diagnostic(code, message),
    });
    const blocks = this.#tree.children;
    const text = this.#parsed;
    const version = this.#version;
    // Unchanged top-level blocks keep their rendered nodes while a source grows.
    return html`<div part="markdown" class="root">
      ${repeat(
        blocks,
        (block, index) => blockKey(block, index),
        (block) => {
          const position = block.position;
          if (!position) return renderer.node(block);
          return guard([text.slice(position.start.offset, position.end.offset), version], () =>
            renderer.node(block),
          );
        },
      )}
    </div>`;
  }
}

function blockKey(block: MarkdownBlock, index: number): string {
  return block.position ? `${block.position.start.offset}:${block.type}` : `${index}:${block.type}`;
}
