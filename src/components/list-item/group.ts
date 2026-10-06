import { css, html, type PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { OwnedAttributes } from '../../foundation/owned-attributes.js';
import { listItemPresentation } from '../../presentation/families/list-item.js';

export class TpListItemGroup extends TpElement {
  static tagName = 'tp-list-item-group';
  static presentationTagName = 'tp-list-item';
  static override presentation = listItemPresentation;
  static override properties = { ...TpElement.properties, ariaLabel: { attribute: 'aria-label' } };
  override ariaLabel: string | null = null;
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
  #members = new Map<HTMLElement, { attributes: OwnedAttributes; release?: () => void }>();
  #sync = (): void => {
    const children = new Set(
      this.shadowRoot
        ?.querySelector('slot')
        ?.assignedElements()
        .filter((element): element is HTMLElement => element.nodeType === Node.ELEMENT_NODE) ?? [],
    );
    for (const [child, owned] of this.#members) {
      if (!children.has(child)) {
        owned.attributes.dispose();
        owned.release?.();
        this.#members.delete(child);
      }
    }
    for (const child of children) {
      if (this.#members.has(child)) continue;
      const attributes = new OwnedAttributes(child);
      if (child.localName === 'tp-list-item') {
        if (!child.hasAttribute('role')) attributes.set('role', 'listitem');
        this.#members.set(child, { attributes });
      } else if (child.localName === 'tp-separator') {
        this.#members.set(child, {
          attributes,
          release: this.presentationController.registerPart('list-item-separator', child),
        });
      }
    }
  };
  override disconnectedCallback(): void {
    for (const owned of this.#members.values()) {
      owned.attributes.dispose();
      owned.release?.();
    }
    this.#members.clear();
    super.disconnectedCallback();
  }
  override connectedCallback(): void {
    super.connectedCallback();
    this.requestUpdate();
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.#sync();
  }
  protected override render() {
    return this.renderPart(
      'list-item',
      {},
      {
        properties: { class: 'group', role: 'list', 'aria-label': this.ariaLabel ?? undefined },
        content: html`<slot @slotchange=${this.#sync}></slot>`,
      },
    );
  }
}
