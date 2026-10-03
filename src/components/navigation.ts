import { css, html } from 'lit';
import { TpElement } from '../foundation/element.js';
import { TpValueChangeEvent } from '../foundation/events.js';
import { assignedElements, controlStyles, eventReason } from './shared.js';

export class TpBreadcrumb extends TpElement {
  static tagName = 'tp-breadcrumb';
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

      .list {
        display: flex;
        align-items: center;
      }

      ::slotted(*) {
        display: inline-flex;
        align-items: center;
      }

      ::slotted(*:not(:last-child))::after {
        content: var(--tp-breadcrumb-separator, '/');
        margin-inline-start: var(--tp-space-2);
        color: var(--tp-muted-foreground);
      }
    `,
  ];
  label = 'Breadcrumb';
  separator = '/';
  protected override render() {
    return html`<nav
      part="root"
      aria-label=${this.label}
      style=${`--tp-breadcrumb-separator:'${this.separator}'`}
    >
      <div class="list" part="list" role="list"><slot @slotchange=${this.#sync}></slot></div>
    </nav>`;
  }
  #sync(event: Event): void {
    const items = assignedElements(event.currentTarget as HTMLSlotElement);
    items.forEach((item, index) => {
      item.setAttribute('role', 'listitem');
      if (index === items.length - 1) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });
  }
}

export * from './menu.js';

export class TpPagination extends TpElement {
  static tagName = 'tp-pagination';
  static override properties = {
    ...TpElement.properties,
    page: { type: Number, reflect: true },
    pages: { type: Number },
    label: { type: String },
  };
  static override styles = [
    TpElement.styles,
    controlStyles,
    css`
      :host {
        display: inline-block;
      }

      .root {
        display: flex;
        align-items: center;
      }

      button[aria-current='page'] {
        color: var(--tp-accent-foreground);
        background: var(--tp-accent);
      }
    `,
  ];
  page = 1;
  pages = 1;
  label = 'Pagination';
  protected override render() {
    const values = pageWindow(this.page, this.pages);
    return html`<nav class="root" part="root" aria-label=${this.label}>
      <button
        class="control"
        part="previous focusable"
        type="button"
        ?disabled=${this.disabled || this.page <= 1}
        @click=${(e: Event) => this.#set(this.page - 1, e)}
      >
        ‹
      </button>
      ${values.map((value) => this.#renderPage(value))}
      <button
        class="control"
        part="next focusable"
        type="button"
        ?disabled=${this.disabled || this.page >= this.pages}
        @click=${(e: Event) => this.#set(this.page + 1, e)}
      >
        ›
      </button>
    </nav>`;
  }
  #renderPage(value: number | null) {
    if (value === null) return html`<span part="ellipsis">…</span>`;
    return html`
      <button
        class="control"
        part="page focusable"
        type="button"
        aria-current=${value === this.page ? 'page' : undefined}
        @click=${(event: Event) => this.#set(value, event)}
      >
        ${value}
      </button>
    `;
  }
  #set(page: number, event: Event): void {
    const next = Math.max(1, Math.min(this.pages, page)),
      previous = this.page;
    if (
      next !== previous &&
      this.dispatchEvent(new TpValueChangeEvent(next, previous, eventReason(event), event))
    )
      this.page = next;
  }
}

function pageWindow(current: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: Math.max(0, total) }, (_, i) => i + 1);
  const result: (number | null)[] = [1];
  if (current > 4) result.push(null);
  for (let page = Math.max(2, current - 1); page <= Math.min(total - 1, current + 1); page++)
    result.push(page);
  if (current < total - 3) result.push(null);
  result.push(total);
  return result;
}

export * from './navigation-panel/index.js';
