import { bindPart } from '../../foundation/part.js';
import { GeneratedStyleResource } from '../../foundation/generated-style.js';
import { html, nothing, render } from 'lit';
import type { PropertyValues, RootPart } from 'lit';
import { ref } from 'lit/directives/ref.js';
import { TpElement } from '../../foundation/element.js';
import { TpButton } from '../button.js';
import type { NavigationPanelDrawer } from './drawer.js';
import { componentHandlingPrevented } from '../../foundation/part.js';
import { ComposedEnvironmentObserver } from '../../foundation/composed-environment.js';
import { composedContains, deepActiveElement, restoreFocus } from '../../foundation/focus.js';
import { prepareMotion, type MotionHandle } from '../../foundation/motion.js';
import { setPartComposition } from '../../presentation/controller.js';
import { navigationPanelMotionRoles } from './motion.js';
import { createId } from '../../foundation/id.js';
import { navigationPanelContext } from './context.js';
import { NavigationPanelProvider } from './provider.js';
import { navigationPanelStyles, navigationViewStyles } from './styles.js';
import type {
  NavigationPanelCollapseMode,
  NavigationPanelCompactOpenChangeCallback,
  NavigationPanelExpandedChangeCallback,
  NavigationPanelPersistenceAdapter,
  NavigationPanelResponsiveAdapter,
  NavigationPanelShortcut,
  NavigationPanelShortcutAdapter,
  NavigationPanelSide,
  NavigationPanelVariant,
} from './types.js';
interface ControlRecord {
  part: string;
  element: HTMLElement;
  member: TpElement | undefined;
  unregister: () => void;
  activationCleanup: (() => void) | undefined;
  compact: boolean | undefined;
  relationshipSync: (() => void) | undefined;
}
const optionalBoolean = {
  fromAttribute: (value: string | null): boolean | undefined =>
    value === null ? undefined : value !== 'false',
  toAttribute: (value: boolean | undefined): string | null =>
    value === undefined ? null : String(value),
};
/** Responsive navigation composition. Modal/focus/dismissal ownership belongs to the actual Drawer. */
export class TpNavigationPanel extends TpElement {
  static tagName = 'tp-navigation-panel';
  static override properties = {
    ...TpElement.properties,
    expanded: { type: Boolean, noAccessor: true },
    defaultExpanded: { type: Boolean, attribute: 'default-expanded' },
    compact: { converter: optionalBoolean },
    compactOpen: { type: Boolean, attribute: 'compact-open', noAccessor: true },
    open: { type: Boolean, noAccessor: true },
    collapsed: { type: Boolean, noAccessor: true },
    side: { type: String, reflect: true },
    collapseMode: { type: String, attribute: 'collapse-mode', reflect: true },
    variant: { type: String, reflect: true },
    wideWidth: { attribute: 'wide-width' },
    compactWidth: { attribute: 'compact-width' },
    label: { type: String },
    responsiveAdapter: { attribute: false },
    shortcutAdapter: { attribute: false },
    shortcut: { attribute: false },
    persistenceAdapter: { attribute: false },
    persistenceKey: { attribute: 'persistence-key' },
    onExpandedChange: { attribute: false },
    onCompactOpenChange: { attribute: false },
  };
  static override styles = [TpElement.styles, navigationPanelStyles];
  readonly [navigationPanelContext] = true as const;
  defaultExpanded = true;
  compact: boolean | undefined;
  side: NavigationPanelSide = 'inline-start';
  collapseMode: NavigationPanelCollapseMode = 'off-canvas';
  variant: NavigationPanelVariant = 'integrated';
  wideWidth: string | number = 'calc(var(--tp-spacing) * 64)';
  compactWidth: string | number = 'calc(var(--tp-spacing) * 72)';
  label = 'Primary';
  responsiveAdapter: NavigationPanelResponsiveAdapter | undefined;
  shortcutAdapter: NavigationPanelShortcutAdapter | undefined;
  shortcut: NavigationPanelShortcut | undefined;
  persistenceAdapter: NavigationPanelPersistenceAdapter | undefined;
  persistenceKey: string | undefined;
  onExpandedChange: NavigationPanelExpandedChangeCallback | undefined;
  onCompactOpenChange: NavigationPanelCompactOpenChangeCallback | undefined;
  #providedExpanded: boolean | undefined;
  #compactRequested = false;
  readonly provider = new NavigationPanelProvider(this);
  readonly #environment = new ComposedEnvironmentObserver(this, () => this.requestUpdate());
  readonly #navigationId = createId('tp-navigation-panel');
  #view: HTMLDivElement | undefined;
  #viewStyle?: GeneratedStyleResource;
  #projection: HTMLSlotElement | undefined;
  #wideMount: HTMLDivElement | undefined;
  #drawer: NavigationPanelDrawer | undefined;
  #viewPart: RootPart | undefined;
  #mountedCompact = false;
  #observer: MutationObserver | undefined;
  #headerResize: ResizeObserver | undefined;
  #toolbarHeader: HTMLElement | null = null;
  #controls = new Map<HTMLElement, ControlRecord>();
  #partReferences = new Map<string, (element: HTMLElement | null) => void>();
  #partRegistrations = new Map<string, () => void>();
  #slotRegistrations = new Map<HTMLElement, () => void>();
  #slotTargets = new Map<HTMLElement, HTMLElement>();
  #slotObservers = new Map<HTMLElement, MutationObserver>();
  #diagnosed = new Set<string>();
  #members = new Map<TpElement, string>();
  #compositionSignatures = new WeakMap<TpElement, string>();
  #lastExpanded: boolean | undefined;
  #collapseMotion: MotionHandle | undefined;
  get controlledExpanded(): boolean | undefined {
    return this.#providedExpanded;
  }
  get hasExpandedDefault(): boolean {
    return this.authoredAttributes.has('default-expanded') || this.defaultExpanded !== true;
  }
  get expanded(): boolean {
    return this.provider.expanded;
  }
  set expanded(value: boolean | undefined) {
    this.#providedExpanded = value === undefined ? undefined : Boolean(value);
    if (this.isConnected || this.hasUpdated) this.provider.publishExpanded();
    this.requestUpdate();
  }
  get compactOpen(): boolean {
    return this.provider.compactOpen;
  }
  set compactOpen(value: boolean) {
    if (!this.hasUpdated) this.#compactRequested = Boolean(value);
    else this.provider.setCompactOpen(Boolean(value));
    this.requestUpdate();
  }
  get open(): boolean {
    return this.compactOpen;
  }
  set open(value: boolean) {
    this.compactOpen = value;
  }
  get collapsed(): boolean {
    return !this.expanded;
  }
  set collapsed(value: boolean) {
    if (this.hasUpdated) this.provider.setExpanded(!value);
    else this.expanded = !value;
  }
  setExpanded(
    value: boolean,
    reason: Parameters<NavigationPanelProvider['setExpanded']>[1] = 'programmatic',
    source?: Event,
  ): boolean {
    return this.provider.setExpanded(value, reason, source);
  }
  setCompactOpen(
    value: boolean,
    reason: Parameters<NavigationPanelProvider['setCompactOpen']>[1] = 'programmatic',
    source?: Event,
  ): boolean {
    return this.provider.setCompactOpen(value, reason, source);
  }
  toggle(source?: Event): boolean {
    return this.provider.toggle(source?.type === 'keydown' ? 'keyboard' : 'trigger-press', source);
  }
  reportProviderDiagnostic(code: string, message: string): void {
    if (this.#diagnosed.has(code)) return;
    this.#diagnosed.add(code);
    queueMicrotask(() =>
      this.emit('tp-diagnostic', { code, message, severity: 'warning' as const }),
    );
  }
  override connectedCallback(): void {
    super.connectedCallback();
    this.#ensureView();
    this.#viewStyle?.connect();
    this.#viewPart?.setConnected(true);
    this.#collectAuthoredContent();
    this.#environment.connect();
    const Observer = this.ownerDocument.defaultView?.MutationObserver;
    if (Observer) {
      this.#observer = new Observer((records) => {
        if (
          this.#collectAuthoredContent() ||
          records.some((record) => record.target === this.#view)
        )
          this.requestUpdate();
      });
      this.#observer.observe(this, { childList: true });
      if (this.#view) this.#observer.observe(this.#view, { childList: true });
    }
  }
  override disconnectedCallback(): void {
    this.#viewPart?.setConnected(false);
    this.#viewStyle?.disconnect();
    this.#observer?.disconnect();
    this.#observer = undefined;
    this.#headerResize?.disconnect();
    this.#headerResize = undefined;
    this.#toolbarHeader = null;
    this.#environment.disconnect();
    for (const record of this.#controls.values()) record.activationCleanup?.();
    for (const unregister of this.#partRegistrations.values()) unregister();
    this.#partRegistrations.clear();
    for (const unregister of this.#slotRegistrations.values()) unregister();
    this.#slotRegistrations.clear();
    for (const observer of this.#slotObservers.values()) observer.disconnect();
    this.#slotObservers.clear();
    this.#slotTargets.clear();
    super.disconnectedCallback();
  }
  #ensureView(): void {
    if (this.#view) return;
    const view = this.ownerDocument.createElement('div');
    view.dataset.tpNavigationView = '';
    view.id = this.#navigationId;
    view.slot = '__navigation-view';
    const root = view.attachShadow({ mode: 'open' });
    this.#viewStyle = new GeneratedStyleResource(this, root);
    this.#viewStyle.setText(navigationViewStyles.cssText);
    this.#view = view;
    this.append(view);
  }
  #collectAuthoredContent(): boolean {
    if (!this.#view) return false;
    let moved = false;
    for (const child of [...this.childNodes]) {
      if (child === this.#view) continue;
      if (child.nodeType === 1) {
        const element = child as HTMLElement;
        const named = {
          'tp-navigation-panel-trigger': 'trigger',
          'tp-navigation-panel-resize-rail': 'resize-rail',
          'tp-navigation-panel-inset': 'inset',
          'tp-navigation-panel-header': 'header',
          'tp-navigation-panel-footer': 'footer',
        }[element.localName as 'tp-navigation-panel-trigger'];
        if (named && !element.slot) element.slot = named;
      }
      const slot = child.nodeType === 1 ? (child as Element).getAttribute('slot') : null;
      if (slot && ['trigger', 'resize-rail', 'inset'].includes(slot)) continue;
      this.#view.append(child);
      moved = true;
    }
    return moved;
  }
  readonly #projectionReference = (element: Element | undefined): void => {
    this.#projection = element as HTMLSlotElement | undefined;
  };
  readonly #wideReference = (element: Element | undefined): void => {
    this.#wideMount = element as HTMLDivElement | undefined;
  };
  readonly #drawerReference = (element: Element | undefined): void => {
    this.#drawer = element as NavigationPanelDrawer | undefined;
  };
  protected override render() {
    const state = this.provider.state;
    return html`<div
      class="frame"
      ${bindPart({ style: { '--navigation-wide-extent': this.#extent(this.wideWidth, 64) } })}
    >
      <div
        class="wide"
        ${ref(this.#wideReference)}
        ?hidden=${state.compact}
        ?data-collapsed=${state.collapsed}
        data-collapse-mode=${state.collapseMode}
        data-side=${state.side}
        data-variant=${state.variant}
      >
        <slot class="projection" name="__navigation-view" ${ref(this.#projectionReference)}></slot>
      </div>
      <div
        class="rail-mount"
        ?hidden=${state.compact || !this.querySelector('[slot="resize-rail"]')}
        ?data-collapsed=${state.collapsed}
        data-collapse-mode=${state.collapseMode}
        data-side=${state.side}
      >
        ${
          state.compact
            ? nothing
            : html`<slot name="resize-rail" @slotchange=${this.#syncSlottedControls}></slot>`
        }
      </div>
      <div class="primary">
        <div class="toolbar">
          <slot name="trigger" @slotchange=${this.#syncSlottedControls}></slot>
          ${
            state.compact
              ? html`<slot name="resize-rail" @slotchange=${this.#syncSlottedControls}></slot>`
              : nothing
          }
        </div>
        <slot name="inset"></slot>
      </div>
      <tp-navigation-panel-drawer
        ${ref(this.#drawerReference)}
        .controlsTarget=${this.#view}
        .open=${state.compactOpen}
        .keepMounted=${true}
        .label=${this.label}
        .side=${this.#physicalSide()}
        .motionPolicy=${this.motionPolicy}
        .partPresentation=${{ 'drawer-content': { styleHook: { 'inline-size': `min(${this.#extent(this.compactWidth, 72)}, 100dvw)`, 'max-inline-size': '100dvw', padding: '0' } }, 'drawer-header': { classHook: 'visually-hidden' } }}
        .onOpenChange=${this.#drawerProposal}
        .onOpenChangeComplete=${this.#drawerComplete}
        @tp-open-change=${this.#stopDrawerProposal}
      ></tp-navigation-panel-drawer>
    </div>`;
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.#renderView();
    this.#syncMode();
    this.#syncSlottedControls();
    this.#syncToolbarHeader();
    for (const record of this.#controls.values()) this.#syncControl(record);
    const state = this.provider.state;
    if (this.#view) {
      const hidden = !state.compact && state.collapsed && state.collapseMode === 'off-canvas';
      if (
        hidden &&
        !this.#view.inert &&
        composedContains(this.#view, deepActiveElement(this.ownerDocument))
      )
        this.#restoreControlFocus();
      this.#view.inert = hidden;
      if (hidden) this.#view.setAttribute('aria-hidden', 'true');
      else this.#view.removeAttribute('aria-hidden');
    }
    for (const [member, part] of this.#members) {
      this.#syncComposition(member, part);
      if (changed.has('partContracts')) member.requestUpdate();
    }
    if (
      !state.compact &&
      this.#lastExpanded !== undefined &&
      this.#lastExpanded !== state.expanded
    ) {
      this.#collapseMotion?.cancel();
      this.#collapseMotion = prepareMotion(
        this,
        this.#wideMount ?? null,
        navigationPanelMotionRoles.collapse,
        { phase: 'change', fromState: this.#lastExpanded, toState: state.expanded },
      );
      this.#collapseMotion.start();
    }
    this.#lastExpanded = state.expanded;
    this.toggleAttribute('data-expanded', state.expanded);
    this.toggleAttribute('data-collapsed', state.collapsed);
    this.toggleAttribute('data-compact', state.compact);
    this.setAttribute('data-side', state.side);
    this.setAttribute('data-collapse-mode', state.collapseMode);
    if (this.#compactRequested) {
      this.#compactRequested = false;
      this.provider.setCompactOpen(true);
    }
  }
  #renderView(): void {
    const view = this.#view;
    if (!view?.shadowRoot) return;
    const state = this.provider.state;
    const named = (name: string) =>
      [...view.children].some((child) => child.getAttribute('slot') === name);
    const authored = (tag: string) =>
      [...view.children].some((child) => child.localName === `tp-navigation-panel-${tag}`);
    const hasContract = (name: string) =>
      Boolean(
        this.partContracts[`navigation-panel-${name}`]?.renderDelegate ||
        'content' in (this.partContracts[`navigation-panel-${name}`] ?? {}),
      );
    const region = (name: 'header' | 'footer') =>
      (named(name) && !authored(name)) || (hasContract(name) && !authored(name))
        ? this.renderPart(`navigation-panel-${name}`, state, {
            tag: name,
            reference: this.#partReference(`navigation-panel-${name}`),
            properties: this.#markers(`navigation-panel-${name}`),
            content: html`<slot name=${name}></slot>`,
          })
        : html`<slot name=${name}></slot>`;
    const content = authored('content')
      ? html`<slot></slot>`
      : this.renderPart('navigation-panel-content', state, {
          tag: 'div',
          reference: this.#partReference('navigation-panel-content'),
          properties: this.#markers('navigation-panel-content'),
          content: html`<slot></slot>`,
        });
    const hidden = !state.compact && state.collapsed && state.collapseMode === 'off-canvas';
    this.#viewPart = render(
      html`${this.renderPart('navigation-panel', state, {
        tag: 'nav',
        reference: this.#partReference('navigation-panel'),
        properties: {
          ...this.#markers('navigation-panel'),
          role: 'navigation',
          id: this.#navigationId,
          'aria-label': this.label,
          hidden,
          '.inert': hidden,
        },
        protectedProperties: ['hidden', 'inert', 'id'],
        content: html`${region('header')}${content}${region('footer')}`,
      })}`,
      view.shadowRoot,
    );
    if (hidden && composedContains(view, deepActiveElement(this.ownerDocument)))
      this.#restoreControlFocus();
  }
  #syncToolbarHeader(): void {
    const header = this.provider.compact
      ? null
      : (this.#view?.shadowRoot?.querySelector<HTMLElement>('[part~="navigation-panel-header"]') ??
        this.#view?.querySelector<HTMLElement>(':scope > tp-navigation-panel-header') ??
        null);
    if (header !== this.#toolbarHeader || !this.#headerResize) {
      this.#headerResize?.disconnect();
      this.#toolbarHeader = header;
      const Observer = this.ownerDocument.defaultView?.ResizeObserver;
      this.#headerResize = header && Observer ? new Observer(this.#alignToolbar) : undefined;
      if (header) this.#headerResize?.observe(header);
      if (this.#wideMount) this.#headerResize?.observe(this.#wideMount);
    }
    this.#alignToolbar();
  }
  readonly #alignToolbar = (): void => {
    const toolbar = this.shadowRoot?.querySelector<HTMLElement>('.toolbar');
    const frame = this.shadowRoot?.querySelector<HTMLElement>('.frame');
    const header = this.#toolbarHeader;
    if (!toolbar || !frame || !this.isConnected) return;
    if (!header?.isConnected || this.provider.compact || !header.getBoundingClientRect().width) {
      toolbar.style.removeProperty('min-block-size');
      return;
    }
    const box = header.getBoundingClientRect();
    toolbar.style.minBlockSize = `${Math.max(0, box.height + 2 * (box.top - frame.getBoundingClientRect().top))}px`;
  };
  #markers(part: string): Record<string, unknown> {
    const state = this.provider.state;
    return {
      part: `${part} ${part}-variant-${state.variant}`,
      'data-expanded': state.expanded,
      'data-collapsed': state.collapsed,
      'data-compact': state.compact,
      'data-side': state.side,
      'data-collapse-mode': state.collapseMode,
    };
  }
  #partReference(part: string): (element: HTMLElement | null) => void {
    let reference = this.#partReferences.get(part);
    if (!reference) {
      reference = (element) => {
        this.#partRegistrations.get(part)?.();
        this.#partRegistrations.delete(part);
        if (element)
          this.#partRegistrations.set(
            part,
            this.presentationController.registerPart(part, element),
          );
      };
      this.#partReferences.set(part, reference);
    }
    return reference;
  }
  #syncMode(): void {
    if (!this.#projection || !this.#drawer || !this.#wideMount) return;
    const compact = this.provider.compact;
    if (
      !compact &&
      this.#mountedCompact &&
      ['starting', 'open', 'ending'].includes(this.#drawer.presenceState)
    ) {
      this.#drawer.open = false;
      return;
    }
    const target = compact ? this.#drawer : this.#wideMount;
    if (this.#projection.parentNode !== target) {
      if (compact && composedContains(this.#view!, deepActiveElement(this.ownerDocument)))
        this.#restoreControlFocus();
      const moveBefore = target.moveBefore;
      if (typeof moveBefore === 'function') moveBefore.call(target, this.#projection, null);
      else target.append(this.#projection);
    }
    this.#mountedCompact = compact;
  }
  readonly #drawerComplete = (open: boolean): void => {
    this.#syncMode();
    if (!open) for (const record of this.#controls.values()) this.#syncControl(record);
  };
  readonly #stopDrawerProposal = (event: Event): void => {
    event.stopPropagation();
  };
  readonly #drawerProposal = (
    event: Parameters<NavigationPanelProvider['requestFromDrawer']>[0],
  ): void => {
    if (event.defaultPrevented || event.detail.cancelled || !this.#drawer) return;
    this.provider.requestFromDrawer(event);
    this.#drawer.open = this.provider.compactOpen;
    if (this.provider.compactOpen !== event.detail.value) event.preventDefault();
  };
  #restoreControlFocus(): void {
    const control = [...this.#controls.values()].find(
      (record) => record.part === 'navigation-panel-trigger',
    )?.element;
    if (control) restoreFocus(control);
  }
  readonly #syncSlottedControls = (): void => {
    const members = new Set<HTMLElement>();
    for (const name of ['trigger', 'resize-rail'])
      for (const member of this.querySelectorAll<HTMLElement>(`:scope > [slot="${name}"]`)) {
        members.add(member);
        if (member instanceof TpButton) {
          const current = member.renderRoot.querySelector<HTMLElement>('[part~="button"]');
          if (this.#slotTargets.get(member) === current && this.#slotRegistrations.has(member))
            continue;
          this.#slotRegistrations.get(member)?.();
          this.#slotRegistrations.delete(member);
          this.#slotTargets.delete(member);
          void member.updateComplete.then(() => {
            if (!member.isConnected || !this.isConnected || this.#slotRegistrations.has(member))
              return;
            const target = member.renderRoot.querySelector<HTMLElement>('[part~="button"]');
            if (target && !this.#controls.has(target)) {
              this.#slotRegistrations.set(
                member,
                this.registerNavigationPart(`navigation-panel-${name}`, target, member),
              );
              this.#slotTargets.set(member, target);
              const Observer = this.ownerDocument.defaultView?.MutationObserver;
              if (Observer && !this.#slotObservers.has(member)) {
                const observer = new Observer(() => {
                  if (
                    member.renderRoot.querySelector('[part~="button"]') !==
                    this.#slotTargets.get(member)
                  )
                    this.requestUpdate();
                });
                observer.observe(member.renderRoot, { childList: true, subtree: true });
                this.#slotObservers.set(member, observer);
              }
            }
          });
        } else
          this.reportProviderDiagnostic(
            'navigation-panel-native-control-required',
            'Trigger and resize-rail slots require an actual Button component.',
          );
      }
    for (const [member, cleanup] of this.#slotRegistrations)
      if (!members.has(member)) {
        cleanup();
        this.#slotRegistrations.delete(member);
        this.#slotTargets.delete(member);
        this.#slotObservers.get(member)?.disconnect();
        this.#slotObservers.delete(member);
      }
  };
  registerNavigationPart(part: string, element: HTMLElement, member?: TpElement): () => void {
    const existing = this.#controls.get(element);
    if (existing?.part === part && existing.member === member) {
      this.#syncControl(existing);
      return () => {};
    }
    const unregister = this.presentationController.registerPart(part, element);
    element.part.add(part);
    if (member) {
      this.#members.set(member, part);
      this.#syncComposition(member, part);
    }
    const release = () => {
      unregister();
      if (member && this.#members.get(member) === part) {
        this.#members.delete(member);
        this.#compositionSignatures.delete(member);
        setPartComposition(member, this);
      }
    };
    if (['navigation-panel-trigger', 'navigation-panel-resize-rail'].includes(part)) {
      const record: ControlRecord = {
        part,
        element,
        member,
        unregister,
        activationCleanup: undefined,
        compact: undefined,
        relationshipSync: undefined,
      };
      this.#controls.set(element, record);
      this.#syncControl(record);
      return () => {
        record.activationCleanup?.();
        release();
        this.#controls.delete(element);
      };
    }
    return release;
  }
  #syncComposition(member: TpElement, part: string): void {
    const state = this.provider.state;
    const iconOnly =
      !state.compact &&
      state.collapsed &&
      state.collapseMode === 'compact' &&
      ['navigation-panel-link', 'navigation-panel-action', 'navigation-panel-sublink'].includes(
        part,
      );
    const signature = `${part}:${iconOnly}`;
    if (this.#compositionSignatures.get(member) === signature) return;
    this.#compositionSignatures.set(member, signature);
    setPartComposition(
      member,
      this,
      iconOnly ? { 'button-label': { classHook: 'visually-hidden' } } : {},
    );
  }
  #syncControl(record: ControlRecord): void {
    const compact = this.provider.compact;
    // Keep the actual Drawer trigger registered through its focus-restoration cleanup.
    const drawerActivation = Boolean(
      this.#drawer &&
      (compact || (this.#mountedCompact && this.#drawer.presenceState !== 'absent')),
    );
    if (record.compact !== drawerActivation) {
      record.activationCleanup?.();
      record.relationshipSync = undefined;
      record.compact = drawerActivation;
      if (drawerActivation && this.#drawer)
        record.activationCleanup = this.#drawer.registerTrigger(record.member ?? record.element);
      else {
        const click = (event: Event) => {
          if (event.defaultPrevented || componentHandlingPrevented(event)) return;
          this.provider.toggle('trigger-press', event, record.element);
        };
        record.element.addEventListener('click', click);
        const restoreRelationship = this.#wideRelationship(record.element);
        record.relationshipSync = restoreRelationship.sync;
        record.activationCleanup = () => {
          record.element.removeEventListener('click', click);
          restoreRelationship.cleanup();
        };
      }
    }
    record.relationshipSync?.();
    if (record.part === 'navigation-panel-resize-rail') record.element.tabIndex = -1;
  }
  #wideRelationship(element: HTMLElement): { sync: () => void; cleanup: () => void } {
    const original = new Map(
      ['aria-expanded', 'aria-haspopup'].map((name) => [name, element.getAttribute(name)]),
    );
    const applied = new Map<string, string | null>();
    const controls = element.ariaControlsElements;
    const controlsAttribute = element.getAttribute('aria-controls');
    let appliedControls: readonly Element[] = [];
    return {
      sync: () => {
        const expanded = String(this.expanded);
        element.setAttribute('aria-expanded', expanded);
        element.removeAttribute('aria-haspopup');
        applied.set('aria-expanded', expanded);
        applied.set('aria-haspopup', null);
        element.ariaControlsElements = [...new Set([...(controls ?? []), this.#view!])];
        appliedControls = element.ariaControlsElements ?? [];
      },
      cleanup: () => {
        for (const [name, value] of original) {
          if (element.getAttribute(name) !== applied.get(name)) continue;
          if (value === null) element.removeAttribute(name);
          else element.setAttribute(name, value);
        }
        const current = element.ariaControlsElements ?? [];
        if (
          element.getAttribute('aria-controls') !== '' ||
          current.length !== appliedControls.length ||
          current.some((value, index) => value !== appliedControls[index])
        )
          return;
        if (controlsAttribute) element.setAttribute('aria-controls', controlsAttribute);
        else {
          element.ariaControlsElements = controls;
          if (controlsAttribute === null && !controls?.length)
            element.removeAttribute('aria-controls');
        }
      },
    };
  }
  #physicalSide(): 'left' | 'right' {
    return (this.side === 'inline-start') === (this.direction === 'ltr') ? 'left' : 'right';
  }
  #extent(value: string | number, multiplier: number): string {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) return `${value}px`;
    if (
      typeof value === 'string' &&
      !/^-|^0(?:px|rem|em|%)?$/.test(value.trim()) &&
      this.ownerDocument.defaultView?.CSS.supports('inline-size', value)
    )
      return value;
    this.reportProviderDiagnostic(
      'navigation-panel-width',
      'Panel widths must be positive CSS extents; using the token-derived default.',
    );
    return `calc(var(--tp-spacing) * ${multiplier})`;
  }
}
