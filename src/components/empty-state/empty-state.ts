import { css, html } from 'lit';
import { hiddenStyles } from '../shared/control-styles.js';
import { slotOccupied } from '../shared/slots.js';
import { TpElement } from '../../foundation/element.js';
import { emptyStatePresentation } from '../../presentation/families/empty-state.js';

/**
 * The message a view shows when it has nothing to show yet: an optional picture, a title, a
 * description and the actions that fill the view. It paints no surface of its own, so it takes on
 * the container it sits in.
 *
 * @slot media - An Icon, an illustration or an Avatar group above the title.
 * @slot icon - The former name of `media`, used when `media` is empty.
 * @slot title - A title with markup; it replaces `title`.
 * @slot description - A description with markup, such as a link; it replaces `description`.
 * @slot - Recovery that is more than a button, such as a search field, between the text and the actions.
 * @slot content - Content placed with the default slot.
 * @slot actions - The Buttons that fill the view; group several in one element.
 */
export class TpEmptyState extends TpElement {
  static tagName = 'tp-empty-state';
  static override presentation = emptyStatePresentation;
  static override properties = {
    ...TpElement.properties,
    title: { type: String },
    description: { type: String },
    mediaTreatment: { type: String, attribute: 'media-treatment', reflect: true },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
        min-inline-size: 0;
      }

      .root,
      .header,
      .content {
        display: flex;
        flex-direction: column;
        align-items: center;
        min-inline-size: 0;
      }

      .root {
        justify-content: center;
        text-align: center;
        text-wrap: balance;
      }

      .header,
      .content {
        inline-size: 100%;
        max-inline-size: calc(var(--tp-spacing) * 96);
      }

      .media {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      ${hiddenStyles}
    `,
  ];
  /** What is missing, as a heading, when the `title` slot is empty. */
  override title = 'Nothing here';
  /** Why the view is empty or what to do next, when the `description` slot is empty. */
  description = '';
  /** `icon` sizes a single Icon in the media slot to the icon role; `plain` shows illustrations and avatars as authored. */
  mediaTreatment: 'plain' | 'icon' = 'plain';
  readonly #slotsChanged = (): void => {
    this.requestUpdate();
  };
  protected override render() {
    const media =
      slotOccupied(this, 'media', { text: true }) || slotOccupied(this, 'icon', { text: true });
    const title = Boolean(this.title) || slotOccupied(this, 'title', { text: true });
    const description =
      Boolean(this.description) || slotOccupied(this, 'description', { text: true });
    const content =
      slotOccupied(this, '', { text: true }) ||
      slotOccupied(this, 'content', { text: true }) ||
      slotOccupied(this, 'actions', { text: true });
    const state = Object.freeze({
      media,
      title,
      description,
      content,
      mediaTreatment: this.mediaTreatment,
    });
    const part = (name: string, options: Parameters<TpElement['renderPart']>[2]) =>
      this.renderPart(name, state, options);
    return part('empty-state', {
      tag: 'section',
      properties: { class: 'root', part: 'root empty-state' },
      content: html`${part('empty-state-header', {
        tag: 'header',
        properties: {
          class: 'header',
          part: 'empty-state-header',
          hidden: !media && !title && !description,
        },
        content: html`${part('empty-state-media', {
          properties: { class: 'media', part: 'empty-state-media', hidden: !media },
          content: html`<slot name="media" @slotchange=${this.#slotsChanged}
            ><slot name="icon" @slotchange=${this.#slotsChanged}></slot
          ></slot>`,
        })}${part('empty-state-title', {
          tag: 'h2',
          properties: { part: 'title empty-state-title', hidden: !title },
          content: html`<slot name="title" @slotchange=${this.#slotsChanged}>${this.title}</slot>`,
        })}${part('empty-state-description', {
          properties: {
            class: 'description',
            part: 'description empty-state-description',
            hidden: !description,
          },
          content: html`<slot name="description" @slotchange=${this.#slotsChanged}
            >${this.description}</slot
          >`,
        })}`,
      })}${part('empty-state-content', {
        properties: { class: 'content', part: 'actions empty-state-content', hidden: !content },
        content: html`<slot @slotchange=${this.#slotsChanged}></slot
          ><slot name="content" @slotchange=${this.#slotsChanged}></slot
          ><slot name="actions" @slotchange=${this.#slotsChanged}></slot>`,
      })}`,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-empty-state': TpEmptyState;
  }
}
