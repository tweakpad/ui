import { css, html, nothing, type PropertyValues } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { styleMap } from 'lit/directives/style-map.js';
import { TpElement } from '../../foundation/element.js';
import { ControllableState } from '../../foundation/controllable-state.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';
import type { ChangeReason } from '../../foundation/types.js';
import type { TpValueChangeEvent } from '../../foundation/events.js';
import { LiveAnnouncer } from '../../foundation/announcer.js';
import {
  builtinHighlighter,
  copyText,
  parseLineRanges,
  plainTokens,
  type CodeHighlighter,
  type CodeToken,
  type CodeTokens,
} from '../../foundation/code/index.js';
import { copyIcon } from '../../icons/copy.js';
import { checkIcon } from '../../icons/check.js';
import { chevronDownIcon } from '../../icons/chevron-down.js';
import { codeBlockPresentation } from '../../presentation/families/code-block.js';
import { dedentCode } from './dedent.js';
import { TpButton } from '../button.js';
import { TpTooltip } from '../tooltip/tooltip.js';

export interface CodeBlockMessages {
  readonly code?: string;
  readonly copy?: string;
  readonly copied?: string;
  readonly copyFailed?: string;
  readonly expand?: string;
  readonly collapse?: string;
  readonly added?: string;
  readonly removed?: string;
}
export const DEFAULT_CODE_BLOCK_MESSAGES: Required<CodeBlockMessages> = {
  code: 'Code',
  copy: 'Copy code',
  copied: 'Copied',
  copyFailed: 'Copy failed',
  expand: 'Expand',
  collapse: 'Collapse',
  added: 'added',
  removed: 'removed',
};

export interface CodeCopyDetail {
  readonly text: string;
}

/** `copyable` defaults to true; only the text `false` turns it off. */
const defaultTrueConverter = {
  fromAttribute: (value: string | null) => value !== 'false',
  toAttribute: (value: boolean) => (value ? null : 'false'),
};
const COPIED_DURATION = 2000;

let sequence = 0;

/**
 * Highlighted source code (`ucl22-code-block`, behavior Foundation §18.13 Code highlighting).
 *
 * The source comes from `code` or, when unset, the element's text content (dedented). Tokens come
 * from `highlighter` (the built-in tokenizer by default, or an adapter such as
 * `createShikiHighlighter` from `@tweakpad/ui/code`); plain text renders until they arrive.
 *
 * @slot title - Title content; replaces `label`.
 * @csspart code-block - The figure.
 * @csspart header - Title row with the language and the copy action.
 * @csspart viewport - The scrollable `pre`.
 * @csspart line - One source line; `data-highlighted`, `data-inserted` or `data-deleted`.
 * @csspart line-number - The line number gutter cell.
 * @csspart token - A token span with `data-scope`.
 * @fires tp-code-copy - Cancelable, before copying; `detail.text`.
 * @fires tp-value-change - Cancelable `expanded` proposal (`trigger-press`, `imperative-action`).
 * @fires tp-diagnostic - Highlighting failures and unknown languages.
 */
export class TpCodeBlock extends TpElement {
  static tagName = 'tp-code-block';
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpButton, TpTooltip];
  }
  static override presentation = codeBlockPresentation;
  static override properties = {
    ...TpElement.properties,
    code: { type: String },
    language: { type: String, reflect: true },
    label: { type: String },
    highlighter: { attribute: false },
    lineNumbers: { type: Boolean, attribute: 'line-numbers', reflect: true },
    highlightLines: { type: String, attribute: 'highlight-lines' },
    addedLines: { type: String, attribute: 'added-lines' },
    removedLines: { type: String, attribute: 'removed-lines' },
    collapsible: { type: Boolean, reflect: true },
    defaultExpanded: { type: Boolean, attribute: 'default-expanded' },
    collapsedLines: { type: Number, attribute: 'collapsed-lines' },
    copyable: { converter: defaultTrueConverter, reflect: true },
    wrap: { type: Boolean, reflect: true },
    messages: { attribute: false },
    _tokens: { state: true },
    _copied: { state: true },
    _overflowing: { state: true },
    _hasTitle: { state: true },
    _lightCode: { state: true },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
        min-inline-size: 0;
      }

      .figure {
        position: relative;
        display: grid;
        margin: 0;
        min-inline-size: 0;
      }

      .header {
        display: flex;
        align-items: center;
        min-inline-size: 0;
      }

      .title {
        flex: 1;
        min-inline-size: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .floating {
        position: absolute;
        z-index: 1;
      }

      pre {
        margin: 0;
        overflow: auto hidden;
      }

      code {
        display: grid;
        min-inline-size: 100%;
        inline-size: max-content;
        font: inherit;
      }

      :host([wrap]) code {
        inline-size: auto;
      }

      .line {
        display: block;
      }

      .line-number {
        position: sticky;
        inset-inline-start: 0;
        display: inline-block;
      }

      .expand {
        display: flex;
        justify-content: center;
      }

      [hidden] {
        display: none !important;
      }
    `,
  ];

  code: string | undefined = undefined;
  language = 'plaintext';
  label = '';
  highlighter: CodeHighlighter | null = builtinHighlighter;
  lineNumbers = false;
  highlightLines = '';
  addedLines = '';
  removedLines = '';
  collapsible = false;
  defaultExpanded = false;
  collapsedLines = 12;
  copyable = true;
  wrap = false;
  messages: CodeBlockMessages = {};
  /** Called with each accepted or vetoed `expanded` proposal. */
  onExpandedChange: ((event: TpValueChangeEvent<boolean>) => void) | undefined;

  declare _tokens: CodeTokens;
  declare _copied: boolean;
  declare _overflowing: boolean;
  declare _hasTitle: boolean;
  declare _lightCode: string;

  readonly #id = `tp-code-block-${++sequence}`;
  readonly #expanded: ControllableState<boolean>;
  #provided: boolean | undefined;
  #request: AbortController | undefined;
  #copiedTimer: ReturnType<typeof setTimeout> | undefined;
  #announcer: LiveAnnouncer | undefined;
  #resize: ResizeObserver | undefined;
  #mutations: MutationObserver | undefined;

  constructor() {
    super();
    this._tokens = plainTokens('');
    this._copied = false;
    this._overflowing = false;
    this._hasTitle = false;
    this._lightCode = '';
    this.#expanded = new ControllableState<boolean>({
      host: this,
      initialValue: false,
      readControlledValue: () => this.#provided,
      readDefaultValue: () => this.defaultExpanded,
      hasDefaultValue: () => this.hasAttribute('default-expanded') || this.defaultExpanded,
      onChange: (event) => this.onExpandedChange?.(event),
      diagnostic: (message) => this.#diagnostic('code-block-expanded', message),
    });
  }

  /** Controlled expansion of a collapsible block; `undefined` makes it uncontrolled. */
  get expanded(): boolean {
    return this.#expanded.value;
  }
  set expanded(value: boolean | undefined) {
    const previous = this.expanded;
    this.#provided = value === undefined ? undefined : Boolean(value);
    if (this.hasUpdated) this.#expanded.sync();
    this.requestUpdate('expanded', previous);
  }

  /** The source text the block shows and copies. */
  get source(): string {
    return this.code ?? this._lightCode;
  }

  get codeMessages(): Required<CodeBlockMessages> {
    return { ...DEFAULT_CODE_BLOCK_MESSAGES, ...this.messages };
  }

  /** Proposes expanding or collapsing; resolves to whether it was accepted. */
  setExpanded(value: boolean, reason: ChangeReason = 'imperative-action', event?: Event): boolean {
    return this.#expanded.set(value, reason, event);
  }

  /** Copies the source text, as the copy action does. */
  async copy(sourceEvent?: Event): Promise<boolean> {
    const text = this.source;
    if (!this.emit<CodeCopyDetail>('tp-code-copy', { text }, { cancelable: true })) return false;
    void sourceEvent;
    const copied = await copyText(this.ownerDocument, text);
    const messages = this.codeMessages;
    this.#announcer ??= new LiveAnnouncer({ document: () => this.ownerDocument });
    this.#announcer.announce(copied ? messages.copied : messages.copyFailed);
    if (copied) {
      this._copied = true;
      clearTimeout(this.#copiedTimer);
      this.#copiedTimer = setTimeout(() => (this._copied = false), COPIED_DURATION);
    }
    return copied;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#readLightCode();
    this.#mutations = new MutationObserver(() => this.#readLightCode());
    this.#mutations.observe(this, { childList: true, characterData: true, subtree: true });
  }

  override disconnectedCallback(): void {
    this.#mutations?.disconnect();
    this.#resize?.disconnect();
    this.#resize = undefined;
    this.#request?.abort();
    this.#request = undefined;
    clearTimeout(this.#copiedTimer);
    this.#announcer?.dispose();
    this.#announcer = undefined;
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    if (
      !this.hasUpdated ||
      changed.has('code') ||
      changed.has('language') ||
      changed.has('highlighter') ||
      changed.has('_lightCode')
    )
      this.#highlight();
  }

  protected override firstUpdated(): void {
    const viewport = this.renderRoot.querySelector('pre');
    const view = this.ownerDocument.defaultView;
    if (viewport && view?.ResizeObserver) {
      this.#resize = new view.ResizeObserver(() => this.#measure());
      this.#resize.observe(viewport);
      const code = viewport.querySelector('code');
      if (code) this.#resize.observe(code);
    }
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.toggleAttribute('data-expanded', this.expanded);
    this.toggleAttribute('data-collapsed', this.collapsible && !this.expanded);
    this.#measure();
    this.#syncExpandButton();
  }

  #readLightCode(): void {
    const text = [...this.childNodes]
      .filter((node) => !(node instanceof Element && node.getAttribute('slot') === 'title'))
      .map((node) => node.textContent ?? '')
      .join('');
    this._lightCode = dedentCode(text);
    this._hasTitle = !!this.querySelector(':scope > [slot="title"]');
  }

  #highlight(): void {
    this.#request?.abort();
    const request = new AbortController();
    this.#request = request;
    const code = this.source;
    const language = (this.language || 'plaintext').toLowerCase();
    this._tokens = plainTokens(code, language);
    const highlighter = this.highlighter;
    if (!highlighter || language === 'plaintext' || language === 'text') return;
    if (highlighter.languages && !highlighter.languages.includes(language))
      this.#diagnostic(
        'code-block-language',
        `Highlighter "${highlighter.name ?? 'custom'}" has no "${language}" language; showing plain text.`,
      );
    const apply = (tokens: CodeTokens): void => {
      if (request.signal.aborted) return;
      if (tokens.language === 'plaintext' && language !== 'plaintext')
        this.#diagnostic(
          'code-block-language',
          `Unknown language "${language}"; showing plain text.`,
        );
      this._tokens = tokens;
    };
    try {
      const result = highlighter.highlight(code, language, { signal: request.signal });
      if (result instanceof Promise)
        result.then(apply, (error: unknown) => {
          if (!request.signal.aborted)
            this.#diagnostic('code-block-highlight', `Highlighting failed: ${String(error)}`);
        });
      else apply(result);
    } catch (error) {
      this.#diagnostic('code-block-highlight', `Highlighting failed: ${String(error)}`);
    }
  }

  #measure(): void {
    const viewport = this.renderRoot.querySelector('pre');
    if (!viewport) return;
    const overflowing = viewport.scrollWidth > viewport.clientWidth + 1;
    if (overflowing !== this._overflowing) this._overflowing = overflowing;
  }

  #syncExpandButton(): void {
    const button = this.renderRoot.querySelector<TpButton>('.expand tp-button');
    const viewport = this.renderRoot.querySelector<HTMLElement>('pre');
    if (!button || !viewport) return;
    void button.updateComplete.then(() => {
      const target = button.shadowRoot?.querySelector<HTMLElement>('button');
      if (!target) return;
      target.setAttribute('aria-expanded', String(this.expanded));
      target.ariaControlsElements = [viewport];
    });
  }

  #diagnostic(code: string, message: string): void {
    this.emit('tp-diagnostic', { code, message });
  }

  #toggle = (event: Event): void => {
    this.#expanded.set(!this.expanded, 'trigger-press', event);
  };

  #copy = (event: Event): void => {
    void this.copy(event);
  };

  #renderToken(token: CodeToken) {
    const colored = token.light || token.dark;
    return html`<span
      part="token"
      class="token"
      data-scope=${token.scope ?? nothing}
      data-colored=${colored ? '' : nothing}
      data-font-style=${token.fontStyle ?? nothing}
      style=${
        colored
          ? styleMap({
              '--_tp-code-light': token.light ?? token.dark ?? '',
              '--_tp-code-dark': token.dark ?? token.light ?? '',
            })
          : nothing
      }
      >${token.text}</span
    >`;
  }

  protected override render() {
    const messages = this.codeMessages;
    const highlighted = parseLineRanges(this.highlightLines);
    const added = parseLineRanges(this.addedLines);
    const removed = parseLineRanges(this.removedLines);
    const diff = added.size > 0 || removed.size > 0;
    const titled = !!this.label || this._hasTitle;
    const titleId = `${this.#id}-title`;
    const languageName = this.language && this.language !== 'plaintext' ? this.language : '';
    const collapsed = this.collapsible && !this.expanded;
    const copy = this.copyable
      ? html`<tp-tooltip class=${titled ? 'copy' : 'copy floating'}
          ><tp-button
            slot="trigger"
            part="copy"
            variant="ghost"
            size="icon-sm"
            .icon=${this._copied ? checkIcon : copyIcon}
            aria-label=${this._copied ? messages.copied : messages.copy}
            @click=${this.#copy}
          ></tp-button
          >${this._copied ? messages.copied : messages.copy}</tp-tooltip
        >`
      : nothing;
    const lines = this._tokens.lines.map((tokens, index) => ({ tokens, number: index + 1 }));
    return html`<figure
      part="code-block"
      class="figure"
      aria-labelledby=${titled ? titleId : nothing}
      aria-label=${titled ? nothing : [languageName, messages.code].filter(Boolean).join(' ')}
    >
      <div part="header" class="header" ?hidden=${!titled}>
        <span part="title" class="title" id=${titleId}
          ><slot name="title" @slotchange=${() => this.#readLightCode()}>${this.label}</slot></span
        >
        ${
          languageName
            ? html`<span part="language" class="language" aria-hidden="true">${languageName}</span>`
            : nothing
        }
        ${titled ? copy : nothing}
      </div>
      ${titled ? nothing : copy}
      <pre
        part="viewport"
        class="viewport"
        tabindex=${this._overflowing ? '0' : nothing}
        role=${this._overflowing ? 'region' : nothing}
        aria-label=${
          this._overflowing
            ? this.label || [languageName, messages.code].filter(Boolean).join(' ')
            : nothing
        }
        style=${styleMap({ '--_tp-code-collapsed-lines': String(this.collapsedLines || 12) })}
      ><code dir="ltr">${repeat(
        lines,
        (line) => line.number,
        (line) =>
          html`<span
            part="line"
            class="line"
            data-line=${line.number}
            data-highlighted=${highlighted.has(line.number) ? '' : nothing}
            data-inserted=${added.has(line.number) ? '' : nothing}
            data-deleted=${removed.has(line.number) ? '' : nothing}
            >${
              this.lineNumbers
                ? html`<span part="line-number" class="line-number" aria-hidden="true"
                    >${line.number}</span
                  >`
                : nothing
            }${
              diff
                ? html`<span part="line-marker" class="line-marker" aria-hidden="true"
                    >${added.has(line.number) ? '+' : removed.has(line.number) ? '−' : ' '}</span
                  >`
                : nothing
            }${
              added.has(line.number)
                ? html`<span class="visually-hidden">${messages.added} </span>`
                : removed.has(line.number)
                  ? html`<span class="visually-hidden">${messages.removed} </span>`
                  : nothing
            }${line.tokens.map((token) => this.#renderToken(token))}</span
          >`,
      )}</code></pre>
      ${
        this.collapsible
          ? html`<div part="expand" class="expand">
              <tp-button
                variant="ghost"
                size="sm"
                .icon=${chevronDownIcon}
                icon-position="end"
                data-expanded=${collapsed ? nothing : ''}
                @click=${this.#toggle}
                >${collapsed ? messages.expand : messages.collapse}</tp-button
              >
            </div>`
          : nothing
      }
    </figure>`;
  }
}
