import { css, html, nothing } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { renderPart } from '../../foundation/part.js';
import { ref } from 'lit/directives/ref.js';
import type { PropertyValues } from 'lit';
import type { TpTooltip } from '../tooltip/tooltip.js';
import { TpButton } from '../button.js';
import { TpInput } from '../input/input.js';
import { TpBadge } from '../primitives.js';
import { TpSeparator } from '../display.js';
import { NavigationPanelMember } from './member.js';
import type { ComponentPartContract, PartRenderOptions, PartState } from '../../foundation/part.js';
import {
  navigationPanelOwner,
  navigationPartContract,
  type NavigationPanelOwner,
} from './context.js';
const contextStyles = css`
  :host {
    display: block;
    min-inline-size: 0;
  }
  :host([hidden]) {
    display: none;
  }
`;
interface NavigationPartDefinition {
  partName: string;
  nativeTag?: string;
}
function definition(element: TpElement): NavigationPartDefinition {
  return element.constructor as unknown as NavigationPartDefinition;
}
/** Native grouping anatomy only; each actual target uses the one Provider and part/presentation owners. */
export class NavigationPanelLayoutPart extends TpElement {
  static tagName = 'tp-navigation-panel-part';
  static partName = '';
  static nativeTag = 'div';
  static override styles = [TpElement.styles, contextStyles];
  #owner: NavigationPanelOwner | undefined;
  #unsubscribe: (() => void) | undefined;
  #unregister: (() => void) | undefined;
  readonly #reference = (element: HTMLElement | null): void => {
    this.#unregister?.();
    this.#unregister = undefined;
    if (element && this.#owner)
      this.#unregister = this.#owner.registerNavigationPart(
        definition(this).partName,
        element,
        this,
      );
  };
  override connectedCallback(): void {
    super.connectedCallback();
    this.#owner = navigationPanelOwner(this);
    if (!this.#owner) {
      this.emit('tp-diagnostic', {
        code: 'navigation-panel-provider-missing',
        message: 'Place Navigation Panel constituents under a tp-navigation-panel Provider.',
        severity: 'error' as const,
      });
      return;
    }
    this.#unsubscribe = this.#owner.provider.subscribe(() => this.requestUpdate());
  }
  override disconnectedCallback(): void {
    this.#unsubscribe?.();
    this.#unregister?.();
    this.#unsubscribe = this.#unregister = undefined;
    super.disconnectedCallback();
  }
  protected defaultPartContent(): unknown {
    return html`<slot></slot>`;
  }
  protected override render() {
    if (!this.#owner) return html`<slot></slot>`;
    const { partName, nativeTag } = definition(this);
    const role = ({ main: 'main', ul: 'list', li: 'listitem' } as Record<string, string>)[
      nativeTag ?? 'div'
    ];
    const state = this.#owner.provider.state;
    return renderPart(
      partName,
      state,
      navigationPartContract(this.#owner, partName, this.partContracts[partName]),
      {
        tag: nativeTag ?? 'div',
        reference: this.#reference,
        properties: {
          part: `${partName} ${partName}-variant-${state.variant}`,
          ...(role ? { role } : {}),
          ...markers(this.#owner),
        },
        content: this.defaultPartContent(),
      },
    );
  }
}
function markers(owner: NavigationPanelOwner): Record<string, unknown> {
  const state = owner.provider.state;
  return {
    'data-expanded': state.expanded,
    'data-collapsed': state.collapsed,
    'data-compact': state.compact,
    'data-side': state.side,
    'data-collapse-mode': state.collapseMode,
  };
}
export class TpNavigationPanelInset extends NavigationPanelLayoutPart {
  static override tagName = 'tp-navigation-panel-inset';
  static override partName = 'navigation-panel-inset';
  static override nativeTag = 'main';
}
export class TpNavigationPanelHeader extends NavigationPanelLayoutPart {
  static override tagName = 'tp-navigation-panel-header';
  static override partName = 'navigation-panel-header';
  static override nativeTag = 'header';
}
export class TpNavigationPanelContent extends NavigationPanelLayoutPart {
  static override tagName = 'tp-navigation-panel-content';
  static override partName = 'navigation-panel-content';
}
export class TpNavigationPanelFooter extends NavigationPanelLayoutPart {
  static override tagName = 'tp-navigation-panel-footer';
  static override partName = 'navigation-panel-footer';
  static override nativeTag = 'footer';
}
export class TpNavigationPanelGroup extends NavigationPanelLayoutPart {
  static override tagName = 'tp-navigation-panel-group';
  static override partName = 'navigation-panel-group';
}
export class TpNavigationPanelGroupLabel extends NavigationPanelLayoutPart {
  static override tagName = 'tp-navigation-panel-group-label';
  static override partName = 'navigation-panel-group-label';
  static override nativeTag = 'span';
}
export class TpNavigationPanelGroupContent extends NavigationPanelLayoutPart {
  static override tagName = 'tp-navigation-panel-group-content';
  static override partName = 'navigation-panel-group-content';
}
export class TpNavigationPanelMenu extends NavigationPanelLayoutPart {
  static override tagName = 'tp-navigation-panel-menu';
  static override partName = 'navigation-panel-menu';
  static override nativeTag = 'ul';
}
export class TpNavigationPanelItem extends NavigationPanelLayoutPart {
  static override tagName = 'tp-navigation-panel-item';
  static override partName = 'navigation-panel-item';
  static override nativeTag = 'li';
}
export class TpNavigationPanelSubmenu extends NavigationPanelLayoutPart {
  static override tagName = 'tp-navigation-panel-submenu';
  static override partName = 'navigation-panel-submenu';
  static override nativeTag = 'ul';
}
export class TpNavigationPanelSubitem extends NavigationPanelLayoutPart {
  static override tagName = 'tp-navigation-panel-subitem';
  static override partName = 'navigation-panel-subitem';
  static override nativeTag = 'li';
}
/** Inherited Button owns all action/link/press/form behavior; navigation contributes context and presentation. */
export class NavigationPanelButtonPart extends TpButton {
  static presentationTagName = 'tp-button';
  static partName = '';
  static override styles = [
    TpButton.styles,
    css`
      :host([show-on-hover]) {
        position: absolute;
        inset-block-start: var(--tp-space-1);
        inset-inline-end: var(--tp-space-1);
      }
      :host([show-on-hover]) [part~='button']:not([data-compact]) {
        opacity: 0;
      }
      :host([show-on-hover]):hover [part~='button'],
      :host([show-on-hover]):focus-within [part~='button'],
      :host-context(tp-navigation-panel-item:hover) [part~='button'],
      :host-context(tp-navigation-panel-item:focus-within) [part~='button'],
      :host([active]) [part~='button'] {
        opacity: 1;
      }
    `,
  ];
  static override properties = {
    ...TpButton.properties,
    active: { type: Boolean, reflect: true },
    showOnHover: { type: Boolean, attribute: 'show-on-hover', reflect: true },
    tooltip: {},
  };
  active = false;
  showOnHover = false;
  tooltip: unknown;
  #tooltip: TpTooltip | undefined;
  #tooltipTarget: HTMLElement | undefined;
  #tooltipCleanup: (() => void) | undefined;
  readonly #tooltipReference = (element: Element | undefined): void => {
    this.#tooltip = element as TpTooltip | undefined;
  };
  readonly #member = new NavigationPanelMember(this, definition(this).partName, 'button');
  protected override buttonPartContract(): ComponentPartContract | undefined {
    const contract = this.#member.contract(this.partContracts.button);
    return {
      ...contract,
      hostProperties: {
        ...contract.hostProperties,
        'data-active': this.active,
        'data-show-on-hover': this.showOnHover,
        ...(this.href !== null && this.active ? { 'aria-current': 'page' } : {}),
      },
    };
  }
  protected override render() {
    const state = this.#member.owner?.provider.state;
    return html`${super.render()}${this.tooltip === undefined || this.tooltip === null ? nothing : html`<tp-tooltip ${ref(this.#tooltipReference)} side="inline-end" align="center" .content=${this.tooltip} .disabled=${!state || state.compact || state.expanded || state.collapseMode !== 'compact'}></tp-tooltip>`}`;
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    const target = this.renderRoot.querySelector<HTMLElement>('[part~="button"]') ?? undefined;
    if (!this.#tooltip || target !== this.#tooltipTarget) {
      this.#tooltipCleanup?.();
      this.#tooltipCleanup = undefined;
      this.#tooltipTarget = target;
      if (this.#tooltip && target) this.#tooltipCleanup = this.#tooltip.registerTrigger(target);
    } else if (!this.#tooltipCleanup && target)
      this.#tooltipCleanup = this.#tooltip.registerTrigger(target);
  }
  override disconnectedCallback(): void {
    this.#tooltipCleanup?.();
    this.#tooltipCleanup = undefined;
    this.#tooltipTarget = undefined;
    super.disconnectedCallback();
  }
}
export class TpNavigationPanelTrigger extends NavigationPanelButtonPart {
  static override tagName = 'tp-navigation-panel-trigger';
  static override partName = 'navigation-panel-trigger';
  constructor() {
    super();
    this.variant = 'ghost';
    this.size = 'icon-sm';
    this.ariaLabel = 'Toggle navigation';
  }
}
export class TpNavigationPanelResizeRail extends NavigationPanelButtonPart {
  protected override buttonTabIndex(): string | null {
    return '-1';
  }
  static override tagName = 'tp-navigation-panel-resize-rail';
  static override partName = 'navigation-panel-resize-rail';
  constructor() {
    super();
    this.variant = 'ghost';
    this.ariaLabel = 'Toggle navigation';
  }
}
export class TpNavigationPanelGroupAction extends NavigationPanelButtonPart {
  static override styles = [
    NavigationPanelButtonPart.styles,
    css`
      :host {
        position: absolute;
        inset-block-start: var(--tp-space-2);
        inset-inline-end: var(--tp-space-2);
      }
    `,
  ];
  static override tagName = 'tp-navigation-panel-group-action';
  static override partName = 'navigation-panel-group-action';
  constructor() {
    super();
    this.variant = 'ghost';
    this.size = 'icon-sm';
  }
}
export class TpNavigationPanelLink extends NavigationPanelButtonPart {
  static override tagName = 'tp-navigation-panel-link';
  static override partName = 'navigation-panel-link';
  constructor() {
    super();
    this.variant = 'ghost';
  }
}
export class TpNavigationPanelAction extends NavigationPanelButtonPart {
  static override tagName = 'tp-navigation-panel-action';
  static override partName = 'navigation-panel-action';
  constructor() {
    super();
    this.variant = 'ghost';
  }
}
export class TpNavigationPanelSublink extends TpNavigationPanelLink {
  static override tagName = 'tp-navigation-panel-sublink';
  static override partName = 'navigation-panel-sublink';
  constructor() {
    super();
    this.size = 'sm';
  }
}
// Reusable visual/field constituents retain their actual family implementation.
export class TpNavigationPanelInput extends TpInput {
  static presentationTagName = 'tp-input';
  static override tagName = 'tp-navigation-panel-input';
  readonly #member = new NavigationPanelMember(this, 'navigation-panel-input', 'input');
  protected override controlPartContract(part: string): ComponentPartContract {
    const contract = super.controlPartContract(part);
    return part === 'input' ? this.#member.contract(contract) : contract;
  }
}
export class TpNavigationPanelBadge extends TpBadge {
  static override styles = [
    TpBadge.styles,
    css`
      :host {
        position: absolute;
        inset-block-start: var(--tp-space-2);
        inset-inline-end: var(--tp-space-1);
        pointer-events: none;
      }
    `,
  ];
  static presentationTagName = 'tp-badge';
  static override tagName = 'tp-navigation-panel-badge';
  readonly #member = new NavigationPanelMember(this, 'navigation-panel-badge', 'badge');
  constructor() {
    super();
    this.variant = 'ghost';
  }
  override renderPart(name: string, state: PartState, options: PartRenderOptions = {}): unknown {
    return name === 'badge'
      ? renderPart(name, state, this.#member.contract(this.partContracts[name]), options)
      : super.renderPart(name, state, options);
  }
}
export class TpNavigationPanelSeparator extends TpSeparator {
  static presentationTagName = 'tp-separator';
  static override tagName = 'tp-navigation-panel-separator';
  readonly #member = new NavigationPanelMember(this, 'navigation-panel-separator', 'root');
  override renderPart(name: string, state: PartState, options: PartRenderOptions = {}): unknown {
    return name === 'root'
      ? renderPart(name, state, this.#member.contract(this.partContracts[name]), options)
      : super.renderPart(name, state, options);
  }
}
export class TpNavigationPanelLoadingPlaceholder extends NavigationPanelLayoutPart {
  static override tagName = 'tp-navigation-panel-loading-placeholder';
  static override partName = 'navigation-panel-loading-placeholder';
  static override properties = {
    ...NavigationPanelLayoutPart.properties,
    showIcon: { type: Boolean, attribute: 'show-icon' },
  };
  showIcon = false;
  readonly textWidth = `${50 + Math.floor(Math.random() * 41)}%`;
  protected override defaultPartContent(): unknown {
    return html`${this.showIcon ? html`<tp-skeleton aria-hidden="true" style="inline-size:var(--tp-icon-size-sm);block-size:var(--tp-icon-size-sm)"></tp-skeleton>` : ''}<tp-skeleton
        label="Loading navigation"
        style=${`inline-size:${this.textWidth};block-size:var(--tp-icon-size-sm)`}
      ></tp-skeleton>`;
  }
}
