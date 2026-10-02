import { css, html } from 'lit';
import type { PropertyValues } from 'lit';
import { TpElement } from '../foundation/element.js';
import { TpValueChangeEvent } from '../foundation/events.js';
import {
  prepareMotion,
  type MotionHandle,
  type MotionRoleDefinition,
} from '../foundation/motion.js';
import { assignedElements, controlStyles, eventReason } from './shared.js';

export const navigationPanelMotionRoles = {
  collapse: {
    name: 'collapse',
    kind: 'state',
    phases: ['change'],
    completion: 'non-blocking',
  },
  compactSurface: {
    name: 'compact-surface',
    kind: 'state',
    phases: ['change'],
    completion: 'non-blocking',
  },
} as const satisfies Record<string, MotionRoleDefinition>;

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

export { TpMenu, TpContextMenu, TpMenubar, TpNavigationMenu } from './menu.js';

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

export class TpNavigationPanel extends TpElement {
  static tagName = 'tp-navigation-panel';
  static override properties = {
    ...TpElement.properties,
    open: { type: Boolean, reflect: true },
    collapsed: { type: Boolean, reflect: true },
    label: { type: String },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
      }

      .panel {
        display: grid;
        grid-template-rows: auto 1fr auto;
        width: var(--tp-navigation-width, 17rem);
        height: 100%;
        transition:
          width
            calc(
              var(--tp-duration-normal) *
                var(--tp-navigation-collapse-motion-scale, var(--tp-motion-scale))
            )
            var(--tp-easing-standard),
          transform
            calc(
              var(--tp-duration-normal) *
                var(--tp-navigation-compact-motion-scale, var(--tp-motion-scale))
            )
            var(--tp-easing-standard);
      }

      :host([collapsed]) .panel {
        width: var(--tp-navigation-collapsed-width, 4rem);
      }

      @media (width <= 48rem) {
        :host {
          position: fixed;
          z-index: 1050;
          inset: 0 auto 0 0;
        }

        .panel {
          transform: translateX(-100%);
        }

        :host([open]) .panel {
          transform: translateX(0);
        }
      }

      .panel[data-tp-motion-driven~='collapse'] {
        --tp-navigation-collapse-motion-scale: 0;
      }

      .panel[data-tp-motion-driven~='compact-surface'] {
        --tp-navigation-compact-motion-scale: 0;
      }
    `,
  ];
  open = false;
  collapsed = false;
  label = 'Primary';
  #motion: MotionHandle[] = [];
  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    this.#motion = [];
    const previousCollapsed = changed.get('collapsed');
    if (previousCollapsed !== undefined && previousCollapsed !== this.collapsed) {
      this.#motion.push(
        prepareMotion(
          this,
          this.renderRoot.querySelector<HTMLElement>('.panel'),
          navigationPanelMotionRoles.collapse,
          {
            phase: 'change',
            fromState: Boolean(previousCollapsed),
            toState: this.collapsed,
          },
        ),
      );
    }
    const previousOpen = changed.get('open');
    if (previousOpen !== undefined && previousOpen !== this.open) {
      this.#motion.push(
        prepareMotion(
          this,
          this.renderRoot.querySelector<HTMLElement>('.panel'),
          navigationPanelMotionRoles.compactSurface,
          {
            phase: 'change',
            fromState: Boolean(previousOpen),
            toState: this.open,
          },
        ),
      );
    }
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (changed.has('collapsed') || changed.has('open')) {
      for (const handle of this.#motion) handle.start();
      this.#motion = [];
    }
  }
  protected override render() {
    return html`<nav class="panel" part="root" aria-label=${this.label}>
      <header part="header"><slot name="header"></slot></header>
      <div part="content"><slot></slot></div>
      <footer part="footer"><slot name="footer"></slot></footer>
    </nav>`;
  }
}
