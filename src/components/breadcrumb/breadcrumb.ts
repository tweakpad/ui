import { css, html, nothing, type PropertyValues } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { TpElement } from '../../foundation/element.js';
import { createId } from '../../foundation/id.js';
import { chevronRightIcon } from '../../icons/chevron-right.js';
import { breadcrumbPresentation } from '../../presentation/families/breadcrumb.js';
import { TpIcon } from '../icon.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';

interface Item {
  element: HTMLElement;
  slot: string;
  originalSlot: string | null;
  currentOwned: boolean;
}
/** Native ordered-list wrappers project original caller nodes without changing link roles. */
export class TpBreadcrumb extends TpElement {
  static tagName = 'tp-breadcrumb';
  /** Library elements this element renders; defining it defines them too. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpIcon];
  }
  static override presentation = breadcrumbPresentation;
  static override properties = {
    ...TpElement.properties,
    label: { type: String },
    separator: { type: String },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
      }

      ol {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        overflow-wrap: anywhere;
      }

      li {
        display: inline-flex;
        align-items: center;
      }

      .separator {
        pointer-events: none;
      }

      .separator tp-icon:dir(rtl) {
        rotate: 180deg;
      }
    `,
  ];
  label = 'Breadcrumb';
  /** Empty uses the shared logical chevron; nonempty supplies decorative text. */
  separator = '';
  #items: Item[] = [];
  #observer: MutationObserver | undefined;
  #parts: Array<() => void> = [];
  #sync = (): void => {
    const previous = new Map(this.#items.map((item) => [item.element, item]));
    const items = [...this.children].filter(
      (child): child is HTMLElement =>
        child.namespaceURI === 'http://www.w3.org/1999/xhtml' &&
        (!child.hasAttribute('slot') ||
          child.getAttribute('slot') === '' ||
          child.getAttribute('slot') === previous.get(child as HTMLElement)?.slot),
    );
    for (const item of this.#items) if (!items.includes(item.element)) this.#release(item);
    this.#items = items.map((element) => {
      const prior = previous.get(element);
      if (prior) return prior;
      const item = {
        element,
        slot: createId('tp-crumb'),
        originalSlot: element.getAttribute('slot'),
        currentOwned: false,
      };
      element.slot = item.slot;
      return item;
    });
    this.requestUpdate();
  };
  #release(item: Item): void {
    if (item.element.slot === item.slot) {
      if (item.originalSlot === null) item.element.removeAttribute('slot');
      else item.element.setAttribute('slot', item.originalSlot);
    }
    if (item.currentOwned && item.element.getAttribute('aria-current') === 'page')
      item.element.removeAttribute('aria-current');
    item.currentOwned = false;
  }
  override connectedCallback(): void {
    super.connectedCallback();
    this.#sync();
    this.#observer = new this.ownerDocument.defaultView!.MutationObserver(this.#sync);
    this.#observer.observe(this, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['slot', 'href'],
    });
  }
  protected override render() {
    return this.renderPart(
      'breadcrumb',
      {},
      {
        tag: 'nav',
        properties: { 'aria-label': this.label },
        content: this.renderPart(
          'breadcrumb-ordered-list',
          {},
          {
            tag: 'ol',
            content: html`
              ${repeat(
                this.#items,
                (item) => item.element,
                (item, index) => html`
                  ${index ? this.renderPart('breadcrumb-separator', {}, { tag: 'li', properties: { class: 'separator', 'aria-hidden': 'true', role: 'presentation' }, content: this.separator || html`<tp-icon .icon=${chevronRightIcon} size="var(--tp-icon-size-sm)"></tp-icon>` }) : nothing}
                  ${this.renderPart('breadcrumb-item', {}, { tag: 'li', content: html`<slot name=${item.slot}></slot>` })}
                `,
              )}
            `,
          },
        ),
      },
    );
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.#parts.splice(0).forEach((release) => release());
    this.#items.forEach((item, index) => {
      const element = item.element;
      const interactive =
        element.matches('a[href],button,tp-button,tp-menu') ||
        !!element.querySelector('a[href],button,tp-button,tp-menu');
      const current =
        index === this.#items.length - 1 &&
        !interactive &&
        !element.matches('[aria-hidden="true"],[data-breadcrumb-ellipsis]');
      if (!current && item.currentOwned) {
        if (element.getAttribute('aria-current') === 'page')
          element.removeAttribute('aria-current');
        item.currentOwned = false;
      }
      if (current && !element.hasAttribute('aria-current')) {
        element.setAttribute('aria-current', 'page');
        item.currentOwned = true;
      }
      if (current || element.getAttribute('aria-current') === 'page')
        this.#parts.push(
          this.presentationController.registerPart('breadcrumb-current-page', element),
        );
      for (const link of [element, ...element.querySelectorAll<HTMLElement>('a[href]')].filter(
        (node) => node.matches('a[href]'),
      )) {
        // Links inside a composed Menu belong to that Menu, not the trail's link recipe.
        if (link.closest('tp-menu')) continue;
        this.#parts.push(this.presentationController.registerPart('breadcrumb-link', link));
      }
      if (element.hasAttribute('data-breadcrumb-ellipsis'))
        this.#parts.push(this.presentationController.registerPart('breadcrumb-ellipsis', element));
    });
  }
  override disconnectedCallback(): void {
    this.#observer?.disconnect();
    this.#observer = undefined;
    this.#parts.splice(0).forEach((release) => release());
    this.#items.forEach((item) => this.#release(item));
    this.#items = [];
    super.disconnectedCallback();
  }
}
