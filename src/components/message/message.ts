import { css, html, nothing } from 'lit';
import { TpElement } from '../../foundation/element.js';

/** Sender-relative layout only. Transport and conversation state belong to the app. */
export class TpMessage extends TpElement {
  static tagName = 'tp-message';
  static override properties = {
    ...TpElement.properties,
    align: { type: String, reflect: true },
    author: { type: String },
    timestamp: { type: String },
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
        display: flex;
        inline-size: 100%;
        min-inline-size: 0;
      }

      :host([align='end']) .message {
        flex-direction: row-reverse;
      }

      .avatar {
        display: flex;
        flex: none;
        align-self: flex-end;
      }

      .body {
        display: flex;
        flex: 1;
        flex-direction: column;
        min-inline-size: 0;
      }

      .content {
        min-inline-size: 0;
        overflow-wrap: anywhere;
      }

      .meta,
      .footer {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
      }

      :host([align='end']) :is(.meta, .footer) {
        justify-content: flex-end;
      }

      [hidden] {
        display: none !important;
      }
    `,
  ];
  align: 'start' | 'end' = 'start';
  author = '';
  timestamp = '';
  pending = false;
  failed = false;
  protected override render() {
    const state = Object.freeze({ align: this.align });
    const has = (slot: string) => [...this.children].some((child) => child.slot === slot);
    const changed = () => this.requestUpdate();
    return this.renderPart('message-root', state, {
      tag: 'article',
      properties: { class: 'message', part: 'root message-root', 'data-align': this.align },
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
              hidden: !this.author && !this.timestamp && !has('header'),
            },
            content: html`<slot name="header" @slotchange=${changed}
              >${this.author ? html`<strong part="author">${this.author}</strong>` : nothing}${this.timestamp ? html`<time part="timestamp">${this.timestamp}</time>` : nothing}</slot
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
