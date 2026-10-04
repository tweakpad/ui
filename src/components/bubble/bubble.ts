import { css, html } from 'lit';
import { TpElement } from '../../foundation/element.js';

export class TpBubbleGroup extends TpElement {
  static tagName = 'tp-bubble-group';
  static presentationTagName = 'tp-bubble';
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
        min-inline-size: 0;
      }

      .group {
        display: flex;
        flex-direction: column;
        min-inline-size: 0;
      }
    `,
  ];
  protected override render() {
    return this.renderPart('bubble', Object.freeze({}), {
      properties: { class: 'group', part: 'bubble' },
      content: html`<slot></slot>`,
    });
  }
}

export class TpBubble extends TpElement {
  static tagName = 'tp-bubble';
  static override properties = {
    ...TpElement.properties,
    align: { type: String, reflect: true },
    variant: { type: String, reflect: true },
    reactionSide: { type: String, attribute: 'reaction-side', reflect: true },
    reactionsAlign: { type: String, attribute: 'reactions-align', reflect: true },
    label: { type: String },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
        min-inline-size: 0;
      }

      .bubble {
        position: relative;
        display: flex;
        flex-direction: column;
        inline-size: fit-content;
        min-inline-size: 0;
        max-inline-size: 80%;
      }

      :host([align='end']) .bubble {
        margin-inline-start: auto;
      }

      :host([variant='ghost']) .bubble {
        max-inline-size: 100%;
      }

      .content {
        position: relative;
        inline-size: fit-content;
        max-inline-size: 100%;
        min-inline-size: 0;
        overflow: hidden;
        overflow-wrap: anywhere;
      }

      .reactions {
        position: absolute;
        z-index: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        inline-size: max-content;
        max-inline-size: 100%;
        inset-block-end: 0;
        inset-inline-end: var(--tp-space-3);
        translate: 0 75%;
      }

      :host([reactions-align='start']) .reactions {
        inset-inline: var(--tp-space-3) auto;
      }

      :host([reaction-side='block-start']) .reactions {
        inset-block: 0 auto;
        translate: 0 -75%;
      }

      [hidden] {
        display: none !important;
      }
    `,
  ];
  align: 'start' | 'end' = 'start';
  reactionSide: 'block-start' | 'block-end' = 'block-end';
  reactionsAlign: 'start' | 'end' = 'end';
  variant: 'default' | 'secondary' | 'subdued' | 'tinted' | 'outline' | 'ghost' | 'destructive' =
    'secondary';
  label = 'Message';
  readonly #slotsChanged = (): void => {
    this.requestUpdate();
  };
  protected override render() {
    const reactionContent = Array.from(this.children).filter((child) => child.slot === 'reactions');
    const reactions = reactionContent.length > 0;
    const controls = reactionContent.some(
      (child) => child.matches('tp-button,button,a') || child.querySelector('tp-button,button,a'),
    );
    const state = Object.freeze({
      variant: this.variant,
      align: this.align,
      reactionSide: this.reactionSide,
      reactionsAlign: this.reactionsAlign,
      reactions,
    });
    return this.renderPart('bubble-root', state, {
      properties: { class: 'bubble', part: 'bubble-root', 'aria-label': this.label },
      content: html`${this.renderPart('bubble-content', state, {
        tag: 'div',
        properties: { class: 'content', part: 'bubble-content' },
        content: html`<slot></slot>`,
      })}
      ${this.renderPart('bubble-reactions', state, {
        properties: {
          class: 'reactions',
          part: 'bubble-reactions',
          'data-controls': controls,
          hidden: !reactions,
        },
        content: html`<slot name="reactions" @slotchange=${this.#slotsChanged}></slot>`,
      })}`,
    });
  }
}
