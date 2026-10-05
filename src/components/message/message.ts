import { css, html, nothing } from 'lit';
import { TpElement } from '../../foundation/element.js';
import type { TimeInput } from '../../foundation/time/parse.js';

/** Sender-relative layout only. Transport and conversation state belong to the app. */
export class TpMessage extends TpElement {
  static tagName = 'tp-message';
  static override properties = {
    ...TpElement.properties,
    align: { type: String, reflect: true },
    author: { type: String },
    timestamp: {},
    pending: { type: Boolean, reflect: true },
    failed: { type: Boolean, reflect: true },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
        min-inline-size: 0;
      }

      .message {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        inline-size: 100%;
        min-inline-size: 0;
      }

      .message[data-avatar] {
        grid-template-columns: auto minmax(0, 1fr);
      }

      :host([align='end']) .message[data-avatar] {
        grid-template-columns: minmax(0, 1fr) auto;
      }

      .avatar {
        display: flex;
        grid-column: 1;
        grid-row: 2;
        align-self: flex-end;
      }

      .body {
        display: contents;
      }

      .meta,
      .content,
      .footer {
        grid-column: 1;
      }

      .message[data-avatar] :is(.meta, .content, .footer) {
        grid-column: 2;
      }

      :host([align='end']) .message[data-avatar] :is(.meta, .content, .footer) {
        grid-column: 1;
      }

      :host([align='end']) .avatar {
        grid-column: 2;
      }

      .content {
        display: flex;
        flex-direction: column;
        align-self: end;
        grid-row: 2;
        min-inline-size: 0;
        overflow-wrap: anywhere;
      }

      .content > slot {
        display: contents;
      }

      .content ::slotted(*) {
        max-inline-size: 100%;
      }

      .content ::slotted(tp-attachment) {
        align-self: flex-start;
      }

      :host([align='end']) .content ::slotted(tp-attachment) {
        align-self: flex-end;
      }

      .meta,
      .footer {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        min-inline-size: 0;
      }

      .meta {
        grid-row: 1;
      }

      .footer {
        grid-row: 3;
      }

      :host([align='end']) .footer {
        justify-content: flex-end;
      }

      [hidden] {
        display: none !important;
      }
    `,
  ];
  align: 'start' | 'end' = 'start';
  author = '';
  /** Time input presented through Time; unresolvable text is shown unchanged. */
  timestamp: TimeInput = '';
  pending = false;
  failed = false;
  get #hasTimestamp(): boolean {
    return this.timestamp !== '' && this.timestamp !== null && this.timestamp !== undefined;
  }
  protected override render() {
    const state = Object.freeze({ align: this.align });
    const has = (slot: string) => [...this.children].some((child) => child.slot === slot);
    const changed = () => this.requestUpdate();
    return this.renderPart('message-root', state, {
      tag: 'article',
      properties: {
        class: 'message',
        part: 'root message-root',
        'data-align': this.align,
        'data-avatar': has('avatar') ? '' : undefined,
        'aria-label': this.getAttribute('aria-label') ?? undefined,
      },
      content: html`${this.renderPart('message-avatar', state, {
          properties: { class: 'avatar', part: 'message-avatar', hidden: !has('avatar') },
          content: html`<slot name="avatar" @slotchange=${changed}></slot>`,
        })}
        <div class="body" part="body">
          ${this.renderPart('message-header', state, {
            tag: 'header',
            properties: {
              class: 'meta',
              part: 'meta message-header',
              hidden: !this.author && !this.#hasTimestamp && !has('header'),
            },
            content: html`<slot name="header" @slotchange=${changed}
              >${this.author ? html`<strong part="author">${this.author}</strong>` : nothing}${this.#hasTimestamp ? html`<tp-time part="timestamp" exportparts="time-value" .datetime=${this.timestamp}>${typeof this.timestamp === 'string' ? this.timestamp : nothing}</tp-time>` : nothing}</slot
            >`,
          })}
          ${this.renderPart('message-content', state, { properties: { class: 'content', part: 'content message-content' }, content: html`<slot></slot>` })}
          ${this.renderPart('message-footer', state, {
            tag: 'footer',
            properties: {
              class: 'footer',
              part: 'message-footer',
              hidden: !has('footer') && !this.pending && !this.failed,
            },
            content: html`<slot name="footer" @slotchange=${changed}
              >${this.pending || this.failed ? html`<span part="status" role=${this.failed ? 'alert' : 'status'}>${this.failed ? 'Failed to send' : 'Sending'}</span>` : nothing}</slot
            >`,
          })}
        </div>`,
    });
  }
}
