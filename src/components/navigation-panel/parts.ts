import { bindPart } from '../../foundation/part.js';
import { css, html, nothing } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { renderPart } from '../../foundation/part.js';
import { ref } from 'lit/directives/ref.js';
import type { PropertyValues } from 'lit';

import { TpButton } from '../button.js';
import { TpInput } from '../input/input.js';
import { TpBadge } from '../badge/index.js';
import { TpSeparator } from '../separator/index.js';
import { NavigationPanelMember } from './member.js';
import type { ComponentPartContract, PartRenderOptions, PartState } from '../../foundation/part.js';
import {
  navigationPanelOwner,
  navigationPartContract,
  type NavigationPanelOwner,
} from './context.js';
import { buttonPresentation } from '../../presentation/families/button.js';
import { inputPresentation } from '../../presentation/families/input.js';
import { badgePresentation } from '../../presentation/families/badge.js';
import { separatorPresentation } from '../../presentation/families/separator.js';
import { TpTooltip } from '../tooltip/tooltip.js';
import { TpSkeleton } from '../skeleton/skeleton.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';
const contextStyles = css`
  :host {
    display: block;
    min-inline-size: 0;
  }

  *,
  *::before,
  *::after {
    box-sizing: border-box;
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
    if (element && this.isConnected && this.#owner)
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
    this.requestUpdate();
  }
  override disconnectedCallback(): void {
    this.#unsubscribe?.();
    this.#unregister?.();
    this.#unsubscribe = this.#unregister = undefined;
    this.#owner = undefined;
    super.disconnectedCallback();
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (!this.#owner) return;
    if (!this.#unregister)
      this.#reference(
        this.renderRoot.querySelector<HTMLElement>(`[part~="${definition(this).partName}"]`),
      );
    const state = this.#owner.provider.state;
    this.toggleAttribute('data-collapsed', state.collapsed);
    this.toggleAttribute('data-compact', state.compact);
    this.setAttribute('data-collapse-mode', state.collapseMode);
  }
  protected defaultPartContent(): unknown {
    return html`<slot></slot>`;
  }
  protected layoutProperties(): Record<string, unknown> {
    return {};
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
          ...this.layoutProperties(),
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
  static override styles = [
    NavigationPanelLayoutPart.styles,
    css`
      :host {
        flex: 1;
        display: flex;
        flex-direction: column;
      }

      [part~='navigation-panel-inset'] {
        flex: 1;
      }
    `,
  ];
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
  static override styles = [
    NavigationPanelLayoutPart.styles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-block-size: 0;
        overflow: auto;
      }

      [part~='navigation-panel-content'] {
        flex: 1;
      }
    `,
  ];
  static override tagName = 'tp-navigation-panel-content';
  static override partName = 'navigation-panel-content';
}
export class TpNavigationPanelFooter extends NavigationPanelLayoutPart {
  static override tagName = 'tp-navigation-panel-footer';
  static override partName = 'navigation-panel-footer';
  static override nativeTag = 'footer';
}
export class TpNavigationPanelGroup extends NavigationPanelLayoutPart {
  static override styles = [
    NavigationPanelLayoutPart.styles,
    css`
      :host {
        position: relative;
      }
    `,
  ];
  static override tagName = 'tp-navigation-panel-group';
  static override partName = 'navigation-panel-group';
}
export class TpNavigationPanelGroupLabel extends NavigationPanelLayoutPart {
  static override styles = [
    NavigationPanelLayoutPart.styles,
    css`
      :host([data-collapsed]:not([data-compact])[data-collapse-mode='compact']) {
        margin-block-start: calc(
          -1 * max(var(--tp-control-height-sm), var(--_tp-coarse-target, 0px))
        );
        pointer-events: none;
      }
    `,
  ];
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
  static override styles = [
    NavigationPanelLayoutPart.styles,
    css`
      :host {
        position: relative;
      }

      [part~='navigation-panel-item'] {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto auto;
        align-items: center;
      }

      slot {
        display: contents;
      }

      ::slotted(tp-navigation-panel-link),
      ::slotted(tp-navigation-panel-action:not([data-navigation-trailing])) {
        grid-area: 1 / 1 / 2 / -1;
        min-inline-size: 0;
      }

      ::slotted(tp-navigation-panel-badge) {
        grid-area: 1 / 2;
        justify-self: end;
        margin-inline-end: var(--tp-space-2);
      }

      ::slotted(tp-navigation-panel-action[data-navigation-trailing]) {
        --navigation-panel-trailing-space: var(--tp-space-2);

        grid-area: 1 / 3;
        inline-size: var(--tp-target-size-min);
        margin-inline-end: var(--tp-space-2);
      }

      ::slotted(tp-navigation-panel-submenu) {
        grid-column: 1 / -1;
      }

      ::slotted(tp-collapsible) {
        grid-column: 1 / -1;
        min-inline-size: 0;
      }

      ::slotted(tp-menu) {
        grid-area: 1 / 3;
        display: block;
        inline-size: var(--tp-target-size-min);
        margin-inline-end: var(--tp-space-2);
      }

      ::slotted(tp-menu[data-navigation-menu-primary]) {
        grid-area: 1 / 1 / 2 / -1;
        inline-size: 100%;
        margin-inline-end: 0;
      }

      :host([data-collapsed]:not([data-compact])[data-collapse-mode='compact'])
        ::slotted(tp-navigation-panel-action[data-navigation-trailing]),
      :host([data-collapsed]:not([data-compact])[data-collapse-mode='compact'])
        ::slotted(tp-navigation-panel-badge) {
        display: none;
      }

      :host([data-collapsed]:not([data-compact])[data-collapse-mode='compact'])
        ::slotted(tp-menu:not([data-navigation-menu-primary])) {
        display: none;
      }
    `,
  ];
  static override tagName = 'tp-navigation-panel-item';
  static override partName = 'navigation-panel-item';
  static override nativeTag = 'li';
  readonly #syncRow = (): void => {
    const primary = [...this.children].find((child) =>
      child.matches('tp-navigation-panel-link,tp-navigation-panel-action'),
    );
    for (const child of this.children)
      if (child.matches('tp-navigation-panel-action'))
        child.toggleAttribute('data-navigation-trailing', child !== primary);
      else if (child.matches('tp-menu'))
        child.toggleAttribute('data-navigation-menu-primary', !primary);
    this.requestUpdate();
  };
  protected override defaultPartContent(): unknown {
    return html`<slot @slotchange=${this.#syncRow}></slot>`;
  }
  protected override layoutProperties(): Record<string, unknown> {
    const state = navigationPanelOwner(this)?.provider.state;
    const primary = [...this.children].find((child) =>
      child.matches('tp-navigation-panel-link,tp-navigation-panel-action'),
    );
    const accessories = [...this.children].filter(
      (child) =>
        child.matches('tp-navigation-panel-badge') ||
        (child.matches('tp-menu') && !!primary) ||
        (child.matches('tp-navigation-panel-action') && child !== primary),
    ).length;
    const collapsed = state?.collapsed && !state.compact && state.collapseMode === 'compact';
    return {
      style: {
        '--navigation-panel-trailing-space':
          accessories && !collapsed
            ? `calc(var(--tp-target-size-min) * ${accessories} + var(--tp-space-2))`
            : 'var(--tp-space-2)',
      },
    };
  }
}
export class TpNavigationPanelSubmenu extends NavigationPanelLayoutPart {
  static override tagName = 'tp-navigation-panel-submenu';
  static override partName = 'navigation-panel-submenu';
  static override nativeTag = 'ul';
}
export class TpNavigationPanelSubitem extends NavigationPanelLayoutPart {
  static override tagName = 'tp-navigation-panel-subitem';
  /** Library elements this element renders; defining it defines them too. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpTooltip];
  }
  static override partName = 'navigation-panel-subitem';
  static override nativeTag = 'li';
}
/** Inherited Button owns all action/link/press/form behavior; navigation contributes context and presentation. */
export class NavigationPanelButtonPart extends TpButton {
  static presentationTagName = 'tp-button';
  static override presentation = buttonPresentation;
  static partName = '';
  static override styles = [
    TpButton.styles,
    css`
      [part~='button-label'] {
        flex: 1;
        min-inline-size: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      [part~='button'][data-collapsed]:not([data-compact])[data-collapse-mode='compact']:has(
          > [part~='button-leading-mark']:not([hidden])
        )
        > [part~='button-trailing-mark'] {
        display: none;
      }

      :host([show-on-hover]) :where([part~='button']:not([data-compact])) {
        opacity: 0;
      }

      :host([active]) [part~='button'],
      [part~='button'][aria-expanded='true'],
      :host-context(tp-navigation-panel-item:hover) [part~='button'],
      :host-context(tp-navigation-panel-item:focus-within) [part~='button'],
      :host([show-on-hover]):hover [part~='button'],
      :host([show-on-hover]):focus-within [part~='button'] {
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
    return html`${super.render()}${this.tooltip === undefined || this.tooltip === null ? nothing : html`<tp-tooltip ${ref(this.#tooltipReference)} side="inline-end" align="center" .content=${() => this.tooltip} .disabled=${!state || state.compact || state.expanded || state.collapseMode !== 'compact'}></tp-tooltip>`}`;
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
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.renderRoot.querySelector('[part~="button-label"]')?.classList.add('visually-hidden');
  }
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
  static override styles = [
    NavigationPanelButtonPart.styles,
    css`
      :host {
        display: block;
        inline-size: 100%;
      }
    `,
  ];
  static override tagName = 'tp-navigation-panel-link';
  static override partName = 'navigation-panel-link';
  constructor() {
    super();
    this.variant = 'ghost';
  }
}
export class TpNavigationPanelAction extends NavigationPanelButtonPart {
  static override styles = [
    NavigationPanelButtonPart.styles,
    css`
      :host {
        display: block;
        inline-size: 100%;
      }
    `,
  ];
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
  static override presentation = inputPresentation;
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
        position: relative;
        pointer-events: none;
      }
    `,
  ];
  static presentationTagName = 'tp-badge';
  static override presentation = badgePresentation;
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
  // The panel projects its recipe onto Separator's root, not a second host rule.
  static presentationTagName = 'tp-separator';
  static override presentation = separatorPresentation;
  static override styles = [
    TpSeparator.styles,
    css`
      :host {
        display: flow-root;
        height: auto;
      }
    `,
  ];
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
  /** Library elements this element renders; defining it defines them too. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpSkeleton];
  }
  static override partName = 'navigation-panel-loading-placeholder';
  static override properties = {
    ...NavigationPanelLayoutPart.properties,
    showIcon: { type: Boolean, attribute: 'show-icon' },
  };
  showIcon = false;
  readonly textWidth = `${50 + Math.floor(Math.random() * 41)}%`;
  protected override defaultPartContent(): unknown {
    return html`${this.showIcon ? html`<tp-skeleton aria-hidden="true" ${bindPart({ style: { inlineSize: 'var(--tp-icon-size-sm)', blockSize: 'var(--tp-icon-size-sm)' } })}></tp-skeleton>` : ''}<tp-skeleton
        label="Loading navigation"
        ${bindPart({ style: { inlineSize: this.textWidth, blockSize: 'var(--tp-icon-size-sm)' } })}
      ></tp-skeleton>`;
  }
}
