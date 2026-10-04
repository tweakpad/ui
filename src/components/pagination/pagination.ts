import { css, html, nothing, type PropertyValues } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { TpElement } from '../../foundation/element.js';
import { TpValueChangeEvent } from '../../foundation/events.js';
import type { ComponentPartContract } from '../../foundation/part.js';
import { componentHandlingPrevented } from '../../foundation/part.js';
import { resolveLocale } from '../../foundation/services.js';
import { eventReason } from '../shared.js';
import { chevronRightIcon } from '../../icons/chevron-right.js';
import { navigationIcons } from '../../icons/navigation.js';

/** Destination navigation composed from the library's actual link Button. */
export class TpPagination extends TpElement {
  static tagName = 'tp-pagination';
  static override properties = {
    ...TpElement.properties,
    page: { type: Number },
    pages: { type: Number },
    label: { type: String },
    pageLinkVariant: { type: String, attribute: 'page-link-variant' },
    previousLabel: { type: String, attribute: 'previous-label' },
    nextLabel: { type: String, attribute: 'next-label' },
    pageLabel: { attribute: false },
    hrefForPage: { attribute: false },
    showPrevious: { type: Boolean, attribute: 'show-previous' },
    showNext: { type: Boolean, attribute: 'show-next' },
    showPageLinks: { type: Boolean, attribute: 'show-page-links' },
    showLabels: { type: Boolean, attribute: 'show-labels' },
    onPageChange: { attribute: false },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
      }

      nav {
        display: flex;
        justify-content: center;
      }

      ul {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
      }

      li {
        display: flex;
        align-items: center;
      }

      .ellipsis {
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      tp-icon[slot='icon-start'],
      tp-icon[slot='icon-end']:dir(rtl) {
        rotate: 180deg;
      }

      tp-icon[slot='icon-start']:dir(rtl) {
        rotate: 0deg;
      }
    `,
  ];
  page = 1;
  pages = 1;
  label = 'Pagination';
  pageLinkVariant: 'text' | 'icon' = 'icon';
  previousLabel = 'Previous';
  nextLabel = 'Next';
  showPrevious = true;
  showNext = true;
  showPageLinks = true;
  showLabels = true;
  hrefForPage: ((page: number) => string) | undefined;
  pageLabel: ((page: number) => string) | undefined;
  onPageChange: ((event: TpValueChangeEvent<number>) => void) | undefined;
  #references = new Map<
    string,
    {
      element: HTMLElement | null;
      release?: (() => void) | undefined;
      ref: (element: HTMLElement | null) => void;
    }
  >();
  #href(page: number): string {
    if (this.hrefForPage) return this.hrefForPage(page);
    const url = new URL(this.ownerDocument.URL);
    url.searchParams.set('page', String(page));
    return url.href;
  }
  #activate(page: number, event: MouseEvent): void {
    if (event.defaultPrevented || componentHandlingPrevented(event)) return;
    if (this.disabled || page === this.page || page < 1 || page > this.pages) {
      event.preventDefault();
      return;
    }
    // Modified links retain native new-tab/window behavior and do not change this page.
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
      return;
    const proposal = new TpValueChangeEvent(page, this.page, eventReason(event), event);
    this.onPageChange?.(proposal);
    if (!this.dispatchEvent(proposal) || proposal.detail.cancelled) event.preventDefault();
  }
  #contract(key: string, part: string, current: boolean): Record<string, ComponentPartContract> {
    let record = this.#references.get(key);
    if (!record) {
      record = {
        element: null,
        ref: (element) => {
          const entry = this.#references.get(key)!;
          if (entry.element === element) return;
          entry.release?.();
          entry.element = element;
          entry.release = element
            ? this.presentationController.registerPart(part, element)
            : undefined;
        },
      };
      this.#references.set(key, record);
    }
    return {
      button: {
        elementReference: record.ref,
        hostProperties: {
          'aria-current': current ? 'page' : undefined,
          'data-active': current ? '' : undefined,
        },
      },
    };
  }
  #link(page: number, kind: 'previous' | 'next' | 'page') {
    const current = kind === 'page' && page === this.page;
    const disabled = this.disabled || page < 1 || page > this.pages;
    const number = new Intl.NumberFormat(resolveLocale(this)).format(page);
    const label =
      kind === 'page'
        ? (this.pageLabel?.(page) ?? `Page ${number}`)
        : kind === 'previous'
          ? this.previousLabel
          : this.nextLabel;
    const part = kind === 'page' ? 'pagination-page-link' : `pagination-${kind}`;
    const key = kind === 'page' ? `page-${page}` : kind;
    const icon =
      kind === 'page'
        ? nothing
        : html`<tp-icon
            slot=${kind === 'previous' ? 'icon-start' : 'icon-end'}
            .icon=${chevronRightIcon}
          ></tp-icon>`;
    return this.renderPart(
      'pagination-page-item',
      { page, current, disabled },
      {
        tag: 'li',
        content: this.renderPart(
          part,
          { page, current, disabled },
          {
            tag: 'tp-button',
            properties: {
              '.href': this.#href(Math.min(this.pages, Math.max(1, page))),
              '.variant': current ? 'outline' : 'ghost',
              '.size': kind !== 'page' && !this.showLabels ? 'icon' : 'default',
              '.disabled': disabled,
              '.ariaLabel': label,
              '.partContracts': this.#contract(key, part, current),
              '@click': (event: MouseEvent) => this.#activate(page, event),
            },
            content: html`${icon}${kind === 'page' ? number : this.showLabels ? label : nothing}`,
          },
        ),
      },
    );
  }
  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    if (!Number.isInteger(this.pages) || this.pages < 1)
      throw new RangeError('pages must be a positive integer.');
    if (!Number.isInteger(this.page) || this.page < 1)
      throw new RangeError('page must be a positive integer.');
  }
  protected override render() {
    const values = pageWindow(this.page, this.pages);
    return this.renderPart(
      'pagination',
      { page: this.page, disabled: this.disabled },
      {
        tag: 'nav',
        properties: { 'aria-label': this.label },
        content: this.renderPart(
          'pagination-list',
          {},
          {
            tag: 'ul',
            content: html`
              ${this.showPrevious ? this.#link(this.page - 1, 'previous') : nothing}
              ${
                this.showPageLinks
                  ? repeat(
                      values,
                      (value, index) => value ?? `gap-${index}`,
                      (value) =>
                        value === null
                          ? this.renderPart(
                              'pagination-page-item',
                              {},
                              {
                                tag: 'li',
                                properties: { 'aria-hidden': 'true' },
                                content: this.renderPart(
                                  'pagination-ellipsis',
                                  {},
                                  {
                                    tag: 'span',
                                    properties: { class: 'ellipsis', 'aria-hidden': 'true' },
                                    content: html`<tp-icon
                                      .icon=${navigationIcons.more}
                                    ></tp-icon>`,
                                  },
                                ),
                              },
                            )
                          : this.#link(value, 'page'),
                    )
                  : nothing
              }
              ${this.showNext ? this.#link(this.page + 1, 'next') : nothing}
            `,
          },
        ),
      },
    );
  }
  override disconnectedCallback(): void {
    for (const record of this.#references.values()) {
      record.release?.();
      record.release = undefined;
      record.element = null;
    }
    super.disconnectedCallback();
  }
  override connectedCallback(): void {
    super.connectedCallback();
    this.requestUpdate();
  }
}

export function pageWindow(current: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const center = Math.min(total - 3, Math.max(4, current));
  const start = center === 4 ? 2 : center - 1;
  const end = center === total - 3 ? total - 1 : center + 1;
  const result: (number | null)[] = [1];
  if (start > 2) result.push(null);
  for (let page = start; page <= end; page++) result.push(page);
  if (end < total - 1) result.push(null);
  result.push(total);
  return result;
}
