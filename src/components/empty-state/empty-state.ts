import { css, html } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { emptyStatePresentation } from '../../presentation/families/empty-state.js';

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

      [hidden] {
        display: none !important;
      }
    `,
  ];
  title = 'Nothing here';
  description = '';
  mediaTreatment: 'plain' | 'icon' = 'plain';
  #hasSlot(name: string): boolean {
    return Array.from(this.childNodes).some((node) =>
      node instanceof Element
        ? (node.getAttribute('slot') ?? '') === name
        : !name && Boolean(node.textContent?.trim()),
    );
  }
  readonly #slotsChanged = (): void => {
    this.requestUpdate();
  };
  protected override render() {
    const media = this.#hasSlot('media') || this.#hasSlot('icon');
    const title = Boolean(this.title) || this.#hasSlot('title');
    const description = Boolean(this.description) || this.#hasSlot('description');
    const content = this.#hasSlot('') || this.#hasSlot('content') || this.#hasSlot('actions');
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
