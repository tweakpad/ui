import { html, type PropertyValues } from 'lit';
import { stackGroupStyles } from '../shared/stack-group.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';
import { TpElement } from '../../foundation/element.js';
import { OwnedAttributes } from '../../foundation/owned-attributes.js';
import { listPresentation } from '../../presentation/families/list.js';
import { TpListItem } from './list-item.js';
import { TpListSeparator } from './separator.js';

/**
 * A named list of List item rows. The host is the list; each direct List item becomes a list item
 * unless it has a role of its own. It adds no selection, focus management or keyboard handling.
 *
 * @slot - The List items, with List separators between them where rows need a divider.
 */
export class TpList extends TpElement {
  static tagName = 'tp-list';
  static override presentation = listPresentation;
  /** Library elements this element contains; defining it defines them too. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpListItem, TpListSeparator];
  }
  static override properties = { ...TpElement.properties, ariaLabel: { attribute: 'aria-label' } };
  /** The name of the list, which assistive technology reads before its rows. */
  override ariaLabel: string | null = null;
  static override styles = [TpElement.styles, stackGroupStyles];
  #ownRole = new OwnedAttributes(this);
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
          release: this.presentationController.registerPart('list-separator', child),
        });
      }
    }
  };
  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.#ownRole.original('role')) this.#ownRole.set('role', 'list');
    this.requestUpdate();
  }
  override disconnectedCallback(): void {
    this.#ownRole.dispose();
    for (const owned of this.#members.values()) {
      owned.attributes.dispose();
      owned.release?.();
    }
    this.#members.clear();
    super.disconnectedCallback();
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.#sync();
  }
  protected override render() {
    return this.renderPart(
      'list',
      {},
      {
        properties: { class: 'group' },
        content: html`<slot @slotchange=${this.#sync}></slot>`,
      },
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-list': TpList;
  }
}
