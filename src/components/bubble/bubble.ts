import { css, html } from 'lit';
import { hiddenStyles } from '../shared/control-styles.js';
import { renderStackGroup, stackGroupStyles } from '../shared/stack-group.js';
import { TpElement } from '../../foundation/element.js';
import { bubblePresentation } from '../../presentation/families/bubble.js';
import { fillLayerStyles } from '../../presentation/motion.js';

/**
 * A stack of consecutive Bubbles from the same sender, so spacing follows who is speaking.
 *
 * @slot - The sender's Bubbles, in order.
 */
export class TpBubbleGroup extends TpElement {
  static tagName = 'tp-bubble-group';
  static override presentation = bubblePresentation;
  static override styles = [TpElement.styles, stackGroupStyles];
  protected override render() {
    return renderStackGroup(this, 'bubble');
  }
}

/**
 * One chat message: content in a framed treatment, aligned to its sender's side, with an optional
 * row of reactions on its edge. The application owns delivery, senders and reaction counts.
 *
 * @slot - The message content: text, paragraphs, links or a Collapsible for a long reply.
 * @slot reactions - Reaction counts or reaction controls, each with an accessible name.
 */
export class TpBubble extends TpElement {
  static tagName = 'tp-bubble';
  static override presentation = bubblePresentation;
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
        display: flex;
        flex-direction: column;
        position: relative;
        inline-size: fit-content;
        max-inline-size: 100%;
        min-inline-size: 0;
        overflow: hidden;
        overflow-wrap: anywhere;
      }

      ${fillLayerStyles('.content:is(button, a)')}

      slot {
        display: contents;
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

      ${hiddenStyles}
    `,
  ];
  /** The sender's side, in writing direction: `end` for the current user's own messages. */
  align: 'start' | 'end' = 'start';
  /** The edge, top or bottom, that the reactions sit on. */
  reactionSide: 'block-start' | 'block-end' = 'block-end';
  /** The inline edge the reactions line up with, independent of the message's alignment. */
  reactionsAlign: 'start' | 'end' = 'end';
  /** The message's treatment: one per sender, `ghost` for unframed full-width text, `destructive` for a failed delivery. */
  variant: 'default' | 'secondary' | 'subdued' | 'tinted' | 'outline' | 'ghost' | 'destructive' =
    'secondary';
  /** The name of the message's group for assistive technology; empty removes the group role. */
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
      properties: {
        class: 'bubble',
        part: 'bubble-root',
        role: this.label ? 'group' : null,
        'aria-label': this.label || null,
      },
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

declare global {
  interface HTMLElementTagNameMap {
    'tp-bubble': TpBubble;
    'tp-bubble-group': TpBubbleGroup;
  }
}
