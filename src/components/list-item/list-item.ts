import { css, html } from 'lit';
import { TpElement } from '../../foundation/element.js';

/** Presentational row. Native actions are supplied through the public part contract. */
export class TpListItem extends TpElement {
  static tagName = 'tp-list-item';
  static override properties = {
    ...TpElement.properties,
    selected: { type: Boolean, reflect: true },
    value: { type: String },
    description: { type: String },
    variant: { type: String, reflect: true },
    size: { type: String, reflect: true },
    mediaTreatment: { type: String, attribute: 'media-treatment', reflect: true },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
        min-inline-size: 0;
      }

      .row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        grid-template-rows: auto auto auto;
        min-inline-size: 0;
      }

      .item {
        display: grid;
        grid-template-columns: subgrid;
        grid-template-rows: subgrid;
        grid-area: 1 / 1 / 4 / -1;
        column-gap: inherit;
        min-inline-size: 0;
      }

      .body {
        display: flex;
        align-items: center;
        grid-area: 2 / 1 / 3 / -1;
        min-inline-size: 0;
        gap: inherit;
      }

      .item[data-actions] .body {
        grid-column-end: 2;
      }

      .content {
        display: flex;
        flex: 1;
        flex-direction: column;
        min-inline-size: 0;
        overflow-wrap: anywhere;
      }

      .title,
      .description {
        display: block;
        min-inline-size: 0;
      }

      .header,
      .footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        grid-column: 1 / -1;
        min-inline-size: 0;
      }

      .header {
        grid-row: 1;
      }

      .footer {
        grid-row: 3;
      }

      .media {
        display: flex;
        align-items: center;
        justify-content: center;
        flex: none;
      }

      .item[data-description] .media {
        align-self: start;
      }

      .media[data-treatment='image'] {
        overflow: hidden;
      }

      .actions {
        position: relative;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        align-self: center;
        grid-area: 2 / 2;
        flex: none;
        max-inline-size: 100%;
        pointer-events: none;
      }

      .actions:is(a, button, [role], [tabindex], tp-button),
      .actions ::slotted(:not(tp-icon)) {
        pointer-events: auto;
      }

      [hidden] {
        display: none !important;
      }
    `,
  ];
  selected = false;
  value = '';
  description = '';
  variant: 'ghost' | 'outline' | 'subdued' = 'ghost';
  size: 'xs' | 'sm' | 'default' = 'default';
  mediaTreatment: 'plain' | 'icon' | 'image' = 'plain';
  #observer: MutationObserver | undefined;
  #sync = (): void => {
    this.requestUpdate();
  };
  #has(names: string[]): boolean {
    return [...this.childNodes].some((node) => {
      const slot =
        node.nodeType === Node.ELEMENT_NODE ? ((node as Element).getAttribute('slot') ?? '') : '';
      return (
        names.includes(slot) &&
        (node.nodeType === Node.ELEMENT_NODE ||
          (node.nodeType === Node.TEXT_NODE && !!node.textContent?.trim()))
      );
    });
  }
  override connectedCallback(): void {
    super.connectedCallback();
    this.#observer = new this.ownerDocument.defaultView!.MutationObserver(this.#sync);
    this.#observer.observe(this, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['slot'],
    });
    this.requestUpdate();
  }
  override disconnectedCallback(): void {
    this.#observer?.disconnect();
    this.#observer = undefined;
    super.disconnectedCallback();
  }
  protected override render() {
    const state = Object.freeze({
      variant: this.variant,
      size: this.size,
      mediaTreatment: this.mediaTreatment,
      selected: this.selected,
      value: this.value,
      disabled: this.disabled,
    });
    const supplied = (part: string) => this.partContracts[part]?.content !== undefined;
    const description =
      !!this.description || this.#has(['description']) || supplied('list-item-description');
    const actions = this.#has(['actions', 'trailing']) || supplied('list-item-actions');
    const part = (name: string, options: Parameters<TpElement['renderPart']>[2]) =>
      this.renderPart(name, state, options);
    const region = (
      name: string,
      content: unknown,
      present: boolean,
      properties: Record<string, unknown> = {},
    ) =>
      part(`list-item-${name}`, {
        tag: 'span',
        properties: {
          class: name,
          hidden: !present && !supplied(`list-item-${name}`),
          ...properties,
        },
        content,
      });
    return html`<div class="row">
      ${part('list-item-root', {
        properties: {
          class: 'item',
          'data-variant': this.variant,
          'data-size': this.size,
          'data-selected': this.selected,
          'data-description': description,
          'data-actions': actions,
          'aria-current': this.selected ? 'true' : undefined,
        },
        content: html`
          ${region('header', html`<slot name="header" @slotchange=${this.#sync}></slot>`, this.#has(['header']))}
          <span class="body">
            ${region('media', html`<slot name="media" @slotchange=${this.#sync}><slot name="leading" @slotchange=${this.#sync}></slot></slot>`, this.#has(['media', 'leading']), { 'data-treatment': this.mediaTreatment })}
            ${part('list-item-content', {
              tag: 'span',
              properties: { class: 'content' },
              content: html`
                ${part('list-item-title', { tag: 'span', properties: { class: 'title' }, content: html`<slot name="title" @slotchange=${this.#sync}><slot @slotchange=${this.#sync}></slot></slot>` })}
                ${region('description', html`<slot name="description" @slotchange=${this.#sync}>${this.description}</slot>`, description)}
              `,
            })}
          </span>
          ${region('footer', html`<slot name="footer" @slotchange=${this.#sync}></slot>`, this.#has(['footer']))}
        `,
      })}${region('actions', html`<slot name="actions" @slotchange=${this.#sync}><slot name="trailing" @slotchange=${this.#sync}></slot></slot>`, actions)}
    </div>`;
  }
}
