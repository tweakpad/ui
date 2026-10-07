import { css, html, nothing, unsafeCSS } from 'lit';
import type { PropertyValues } from 'lit';
import { CollectionRegistry } from '../../foundation/collection.js';
import { TpElement } from '../../foundation/element.js';
import { TpValueChangeEvent } from '../../foundation/events.js';
import { createId } from '../../foundation/id.js';
import { composedParent } from '../../foundation/focus.js';
import { TabsSelection } from '../../foundation/tabs-selection.js';
import { SyntheticPress } from '../../foundation/synthetic-press.js';
import type { ChangeReason } from '../../foundation/types.js';
import { OwnedAttributes } from './owned-attributes.js';
import { TabsPanel } from './panel.js';
import { elementGeometry } from '../../foundation/indicator-geometry.js';
import { tabsPresentation } from '../../presentation/families/tabs.js';
import { motionDuration } from '../../presentation/motion.js';
import {
  prepareMotion,
  type MotionHandle,
  type MotionRoleDefinition,
  type MotionValue,
} from '../../foundation/motion.js';

export type TabsActivationDirection = 'left' | 'right' | 'up' | 'down' | 'none';
export type TabsMember = HTMLElement & {
  value?: unknown;
  keepMounted?: boolean;
  nativeAction?: boolean;
  disabled?: boolean;
};
export const tabsMotionRoles = {
  indicator: { name: 'indicator', kind: 'state', phases: ['change'], completion: 'non-blocking' },
} as const satisfies Record<string, MotionRoleDefinition>;

const edges = ['left', 'right', 'top', 'bottom'] as const;
/** Indicator edges glide together; an underline's leading edge outruns the trailing one. */
function indicatorMotion(leading?: (typeof edges)[number]) {
  return unsafeCSS(
    edges
      .map(
        (edge) =>
          `${edge} ${motionDuration(edge === leading ? 'fast' : 'normal')} var(--tp-easing-standard)`,
      )
      .join(', '),
  );
}

const motionState = (value: unknown): MotionValue =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? value
    : null;

const memberValue = (element: TabsMember): unknown =>
  element.value ?? element.getAttribute('value');

export class TpTabs extends TpElement {
  static tagName = 'tp-tabs';
  static override presentation = tabsPresentation;
  static override properties = {
    ...TpElement.properties,
    value: { noAccessor: true },
    defaultValue: { attribute: 'default-value' },
    onValueChange: { attribute: false },
    activation: { type: String, reflect: true },
    activateOnFocus: { type: Boolean, attribute: 'activate-on-focus', noAccessor: true },
    loopFocus: { type: Boolean, attribute: 'loop-focus' },
    renderBeforeActivation: { type: Boolean, attribute: 'render-before-activation' },
    variant: { type: String, reflect: true },
    label: { type: String },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
        min-inline-size: 0;
      }

      .root {
        display: flex;
        flex-direction: column;
        min-inline-size: 0;
      }

      .list {
        position: relative;
        display: flex;
        align-items: center;
        inline-size: fit-content;
        max-inline-size: 100%;
        overflow: auto;
        flex: none;
      }

      .panels {
        flex: 1;
        min-inline-size: 0;
      }

      :host([orientation='vertical']) .root {
        flex-direction: row;
      }

      :host([orientation='vertical']) .list {
        flex-direction: column;
        align-items: stretch;
        max-inline-size: 50%;
      }

      /* Inset edges, so each side of the indicator can move on its own. */
      ::slotted([slot='indicator']),
      .indicator {
        position: absolute;
        pointer-events: none;
        inset: var(--tp-active-tab-top, 0)
          calc(100% - var(--tp-active-tab-left, 0px) - var(--tp-active-tab-width, 0px))
          calc(100% - var(--tp-active-tab-top, 0px) - var(--tp-active-tab-height, 0px))
          var(--tp-active-tab-left, 0);
      }

      :host([variant='underline'][orientation='horizontal']) ::slotted([slot='indicator']),
      :host([variant='underline'][orientation='horizontal']) .indicator {
        top: calc(
          var(--tp-active-tab-top, 0px) +
            var(--tp-active-tab-height, 0px) - var(--tp-border-width-strong)
        );
      }

      :host([variant='underline'][orientation='vertical']) ::slotted([slot='indicator']),
      :host([variant='underline'][orientation='vertical']) .indicator {
        left: calc(
          var(--tp-active-tab-left, 0px) +
            var(--tp-active-tab-width, 0px) - var(--tp-border-width-strong)
        );
      }

      :host([variant='underline'][orientation='vertical']:dir(rtl)) ::slotted([slot='indicator']),
      :host([variant='underline'][orientation='vertical']:dir(rtl)) .indicator {
        left: var(--tp-active-tab-left, 0);
        right: calc(100% - var(--tp-active-tab-left, 0px) - var(--tp-border-width-strong));
      }

      /* Selection changes move the indicator; first placement and layout changes do not. */
      ::slotted(
        [slot='indicator'][data-activation-direction]:not([data-activation-direction='none'])
      ),
      .indicator[data-activation-direction]:not([data-activation-direction='none']) {
        transition: ${indicatorMotion()};
      }

      :host([variant='underline']) ::slotted([slot='indicator'][data-activation-direction='left']),
      :host([variant='underline']) .indicator[data-activation-direction='left'] {
        transition: ${indicatorMotion('left')};
      }

      :host([variant='underline']) ::slotted([slot='indicator'][data-activation-direction='right']),
      :host([variant='underline']) .indicator[data-activation-direction='right'] {
        transition: ${indicatorMotion('right')};
      }

      :host([variant='underline']) ::slotted([slot='indicator'][data-activation-direction='up']),
      :host([variant='underline']) .indicator[data-activation-direction='up'] {
        transition: ${indicatorMotion('top')};
      }

      :host([variant='underline']) ::slotted([slot='indicator'][data-activation-direction='down']),
      :host([variant='underline']) .indicator[data-activation-direction='down'] {
        transition: ${indicatorMotion('bottom')};
      }

      ::slotted([slot='indicator'][data-tp-motion-driven]),
      .indicator[data-tp-motion-driven] {
        transition: none !important;
      }

      .indicator[hidden],
      ::slotted([hidden]) {
        display: none !important;
      }
    `,
  ];

  #input: unknown = undefined;
  #selection: TabsSelection | undefined;
  defaultValue: unknown = undefined;
  onValueChange: ((event: TpValueChangeEvent<unknown>) => void) | undefined;
  activation: 'automatic' | 'manual' = 'manual';
  loopFocus = true;
  renderBeforeActivation = false;
  variant: 'enclosed' | 'underline' = 'enclosed';
  label = '';
  activationDirection: TabsActivationDirection = 'none';
  get value(): unknown {
    return this.#selection ? this.#selection.value : this.#input;
  }
  set value(value: unknown) {
    const previous = this.value;
    this.#input = value;
    if (this.#selection) {
      if (!this.#selection.controlled || value === undefined)
        this.#diagnose(
          'mode',
          'Keep the initial controlled mode; use setValue() for uncontrolled Tabs.',
        );
      else {
        this.#selection.external(value);
        if (!Object.is(previous, this.value)) {
          this.activationDirection = this.#direction(previous, this.value);
          this.#prepareIndicatorMotion(previous);
        }
      }
    }
    this.requestUpdate('value', previous);
    if (this.hasUpdated) this.#sync();
  }
  get activateOnFocus(): boolean {
    return this.activation === 'automatic';
  }
  set activateOnFocus(value: boolean) {
    this.activation = value ? 'automatic' : 'manual';
  }

  #tabs: TabsMember[] = [];
  #panels = new Map<HTMLElement, TabsPanel>();
  #attributes = new Map<HTMLElement, OwnedAttributes>();
  #parts = new Map<HTMLElement, () => void>();
  #presses = new WeakMap<HTMLElement, SyntheticPress>();
  #observer: MutationObserver | undefined;
  #environmentObserver: MutationObserver | undefined;
  #resize: ResizeObserver | undefined;
  #frame = 0;
  #indicatorMotion: MotionHandle | null = null;
  #syncing = false;
  #focused: HTMLElement | null = null;
  #pointerButton: number | null = null;
  #diagnostics = new Set<string>();
  #duplicates = new Set<HTMLElement>();
  #ids = new WeakMap<HTMLElement, string>();

  get panels(): readonly HTMLElement[] {
    return [...this.#panels.keys()];
  }
  /** Re-read non-reactive member properties after assigning comparable values or retention. */
  refresh(): void {
    this.#sync();
  }
  setValue(value: unknown): boolean {
    this.#initialize();
    return this.#request(value, 'programmatic');
  }

  #initialize(): void {
    if (this.#selection) return;
    if (this.#input !== undefined && this.defaultValue !== undefined)
      this.#diagnose('value-default', 'Supply value or defaultValue, not both.');
    this.#selection = new TabsSelection(
      this.#input,
      this.defaultValue,
      (value, previous, reason) => {
        // Reconciliation runs inside #sync, which applies the fallback selection itself.
        this.activationDirection = 'none';
        this.#notify(
          new TpValueChangeEvent(value, previous, reason, undefined, {
            cancelable: false,
            metadata: { activationDirection: 'none' },
          }),
        );
      },
    );
  }

  override connectedCallback(): void {
    super.connectedCallback();
    const view = this.ownerDocument.defaultView!;
    this.#observer = new view.MutationObserver(() => this.#sync());
    this.#observe();
    this.#resize = new view.ResizeObserver(() => this.#scheduleGeometry());
    this.#environmentObserver = new view.MutationObserver(this.#scheduleGeometry);
    for (let ancestor = composedParent(this); ancestor; ancestor = composedParent(ancestor)) {
      if (ancestor.nodeType === Node.ELEMENT_NODE)
        this.#environmentObserver.observe(ancestor, {
          attributes: true,
          attributeFilter: ['dir', 'style', 'class', 'hidden'],
        });
    }
    view.addEventListener('resize', this.#scheduleGeometry);
    this.ownerDocument.addEventListener('pointerup', this.#pointerEnd);
    this.ownerDocument.addEventListener('pointercancel', this.#pointerEnd);
    if (this.hasUpdated) {
      this.#sync();
      this.requestUpdate();
    }
  }
  override disconnectedCallback(): void {
    this.#observer?.disconnect();
    this.#environmentObserver?.disconnect();
    this.#resize?.disconnect();
    this.ownerDocument.defaultView!.removeEventListener('resize', this.#scheduleGeometry);
    this.ownerDocument.defaultView!.cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    this.#indicatorMotion?.cancel();
    this.#indicatorMotion = null;
    this.ownerDocument.removeEventListener('pointerup', this.#pointerEnd);
    this.ownerDocument.removeEventListener('pointercancel', this.#pointerEnd);
    for (const release of this.#parts.values()) release();
    this.#parts.clear();
    for (const panel of this.#panels.values()) panel.destroy();
    this.#panels.clear();
    for (const attributes of this.#attributes.values()) attributes.restore();
    this.#attributes.clear();
    this.#tabs = [];
    this.#focused = null;
    this.#pointerButton = null;
    this.removeAttribute('data-has-indicator');
    super.disconnectedCallback();
  }
  /** The consumer's indicator, or the default one rendered when none is slotted. */
  #indicator(): HTMLElement | null {
    return (
      this.querySelector<HTMLElement>(':scope > [slot="indicator"]') ??
      this.renderRoot.querySelector<HTMLElement>('.indicator')
    );
  }
  #observe(): void {
    this.#observer?.observe(this, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [
        'value',
        'disabled',
        'aria-disabled',
        'slot',
        'id',
        'dir',
        'keep-mounted',
        'native-action',
        'class',
        'style',
        'hidden',
      ],
    });
    for (const panel of this.#panels.values())
      this.#observer?.observe(panel.storage, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['value', 'id', 'keep-mounted'],
      });
  }
  #own(element: HTMLElement): OwnedAttributes {
    let owner = this.#attributes.get(element);
    if (!owner) {
      owner = new OwnedAttributes(element);
      this.#attributes.set(element, owner);
    }
    return owner;
  }
  #isDisabled = (element: HTMLElement): boolean =>
    (element as TabsMember).disabled === true ||
    element.hasAttribute('disabled') ||
    this.#own(element).authored('aria-disabled') === 'true';
  #register(element: HTMLElement, part: string, current: Set<HTMLElement>): void {
    current.add(element);
    if (!this.#parts.has(element))
      this.#parts.set(element, this.presentationController.registerPart(part, element));
    this.#own(element).set('part', [...new Set([...element.part, part])].join(' '));
  }
  #id(element: HTMLElement, prefix: string): string {
    if (element.id) return element.id;
    let id = this.#ids.get(element);
    if (!id) {
      id = createId(prefix);
      this.#ids.set(element, id);
    }
    this.#own(element).set('id', id);
    return id;
  }
  #sync = (): void => {
    if (!this.isConnected || !this.hasUpdated || this.#syncing) return;
    this.#syncing = true;
    this.#observer?.disconnect();
    try {
      this.#initialize();
      const list = this.renderRoot.querySelector<HTMLElement>('.list')!;
      const currentParts = new Set<HTMLElement>();
      const seen = new Set<unknown>();
      const tabs: TabsMember[] = [];
      for (const tab of this.querySelectorAll<TabsMember>(':scope > [slot="tab"]')) {
        const value = memberValue(tab);
        const a = this.#own(tab);
        if (value == null || seen.has(value)) {
          this.#duplicates.add(tab);
          a.set('tabindex', '-1');
          a.set('aria-disabled', 'true');
          a.set('aria-selected', 'false');
          a.set('aria-controls', null);
          a.set('role', 'presentation');
          this.#diagnose(
            'duplicate-tab',
            'Tabs require unique non-null values; later duplicates are excluded.',
          );
          continue;
        }
        if (this.#duplicates.delete(tab)) a.restore();
        seen.add(value);
        tabs.push(tab);
        this.#register(tab, 'tabs-trigger', currentParts);
        a.set('role', 'tab');
        if (tab.localName === 'button') a.set('type', 'button');
      }
      this.#tabs = tabs;
      for (const panel of this.querySelectorAll<HTMLElement>(':scope > [slot="panel"]'))
        if (!this.#panels.has(panel))
          this.#panels.set(panel, new TabsPanel(panel, this, () => this.#scheduleSync()));
      for (const [element, panel] of this.#panels) {
        if (
          panel.anchor.parentNode !== this ||
          (element.parentNode !== this && element.parentNode !== panel.storage) ||
          element.getAttribute('slot') !== 'panel'
        ) {
          panel.destroy(false);
          this.#panels.delete(element);
        }
      }
      this.#selection!.reconcile(
        tabs.map((tab) => ({ value: memberValue(tab), disabled: this.#isDisabled(tab) })),
      );
      const selected = tabs.find((tab) => Object.is(memberValue(tab), this.value));
      const focused = this.ownerDocument.activeElement;
      const focusInside = tabs.includes(focused as TabsMember);
      if (focusInside) this.#focused = focused as HTMLElement;
      else if (!this.#focused || !tabs.includes(this.#focused) || this.#isDisabled(this.#focused))
        this.#focused = null;
      const entry =
        this.#focused && !this.#isDisabled(this.#focused) && focusInside
          ? this.#focused
          : selected && !this.#isDisabled(selected)
            ? selected
            : tabs.find((tab) => !this.#isDisabled(tab));
      const panelByValue = new Map<unknown, TabsPanel>();
      for (const panel of [...this.#panels.values()].sort((a, b) =>
        a.anchor.compareDocumentPosition(b.anchor) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
      )) {
        const value = memberValue(panel.element);
        const tab = tabs.find((tab) => Object.is(memberValue(tab), value));
        const duplicate = panelByValue.has(value);
        if (!tab || duplicate)
          this.#diagnose(
            'unpaired-panel',
            'Each panel must have exactly one unique matching tab value.',
          );
        else panelByValue.set(value, panel);
        this.#register(panel.element, 'tabs-content', currentParts);
        panel.attributes.set('role', 'tabpanel');
        panel.attributes.set('aria-labelledby', tab ? this.#id(tab, 'tp-tab') : null);
        panel.attributes.set('data-index', String(tabs.indexOf(tab!)));
        this.#id(panel.element, 'tp-tab-panel');
        this.#markers(panel.element);
        panel.update(
          Boolean(tab && !duplicate && tab === selected),
          (panel.element as TabsMember).keepMounted ?? panel.element.hasAttribute('keep-mounted'),
        );
      }
      for (const tab of tabs) {
        const active = tab === selected,
          disabled = this.#isDisabled(tab) || this.disabled;
        const a = this.#own(tab),
          panel = panelByValue.get(memberValue(tab));
        a.set('aria-selected', String(active));
        a.set('aria-disabled', disabled ? 'true' : a.authored('aria-disabled'));
        a.set('data-disabled', disabled ? '' : null);
        a.set('data-selected', active ? '' : null);
        a.set('data-active', active ? '' : null);
        a.set('tabindex', !this.disabled && tab === entry ? '0' : '-1');
        a.set('aria-controls', panel?.element.isConnected ? panel.element.id : null);
        this.#markers(tab);
      }
      this.#markers(list);
      this.#markers(this.renderRoot.querySelector<HTMLElement>('.root')!);
      const indicator = this.#indicator();
      this.toggleAttribute('data-has-indicator', Boolean(indicator));
      if (indicator) {
        if (indicator.slot === 'indicator') {
          this.#register(indicator, 'tabs-indicator', currentParts);
          this.#own(indicator).set('role', 'presentation');
        }
        this.#markers(indicator);
      }
      for (const [element, release] of this.#parts)
        if (!currentParts.has(element)) {
          release();
          this.#parts.delete(element);
        }
      for (const [element, owner] of this.#attributes) {
        if (
          element.parentNode !== this &&
          !this.#panels.has(element) &&
          !this.renderRoot.contains(element)
        ) {
          owner.restore();
          this.#attributes.delete(element);
        }
      }
      this.#resize?.disconnect();
      this.#resize?.observe(list);
      for (const tab of tabs) this.#resize?.observe(tab);
      this.presentationController.refresh();
      this.#scheduleGeometry();
    } finally {
      this.#syncing = false;
      this.#observe();
    }
  };
  #markers(element: HTMLElement): void {
    const a = this.#own(element);
    a.set('data-orientation', this.orientation);
    a.set('data-activation-direction', this.activationDirection);
  }
  #scheduleSync(): void {
    queueMicrotask(() => this.#sync());
  }
  #scheduleGeometry = (): void => {
    if (this.#frame || !this.isConnected) return;
    this.#frame = this.ownerDocument.defaultView!.requestAnimationFrame(() => {
      this.#frame = 0;
      const list = this.renderRoot.querySelector<HTMLElement>('.list');
      if (!list) return;
      const indicator = this.#indicator();
      if (!indicator) return;
      const selected = this.#tabs.find((tab) => Object.is(memberValue(tab), this.value));
      const geometry = selected
        ? elementGeometry(selected, list)
        : { left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 };
      this.#observer?.disconnect();
      for (const target of [list, indicator])
        for (const [key, value] of Object.entries(geometry))
          this.#own(target).style(
            '--tp-active-tab-' + key,
            Number.isFinite(value) ? value + 'px' : '0px',
          );
      const active = Boolean(
        selected && geometry.width && geometry.height && list.getClientRects().length,
      );
      this.#own(indicator).set('hidden', active || this.renderBeforeActivation ? null : '');
      this.#own(indicator).set('data-active', active ? '' : null);
      this.#indicatorMotion?.start();
      this.#indicatorMotion = null;
      this.#observe();
    });
  };
  #direction(previous: unknown, next: unknown): TabsActivationDirection {
    const before = this.#tabs.find((tab) => Object.is(memberValue(tab), previous));
    const after = this.#tabs.find((tab) => Object.is(memberValue(tab), next));
    if (!before || !after || before === after) return 'none';
    const a = before.getBoundingClientRect(),
      b = after.getBoundingClientRect();
    return this.orientation === 'vertical'
      ? b.top < a.top
        ? 'up'
        : 'down'
      : b.left < a.left
        ? 'left'
        : 'right';
  }
  #notify(event: TpValueChangeEvent<unknown>): boolean {
    this.onValueChange?.(event);
    return this.dispatchEvent(event) && !event.detail.cancelled;
  }
  #request(
    value: unknown,
    reason: ChangeReason,
    sourceEvent?: Event,
    trigger?: HTMLElement,
  ): boolean {
    const previous = this.value;
    const accepted = this.#selection!.request(value, () => {
      const direction = this.#direction(this.value, value);
      const accepted = this.#notify(
        new TpValueChangeEvent(value, this.value, reason, sourceEvent, {
          ...(trigger ? { trigger } : {}),
          metadata: { activationDirection: direction },
        }),
      );
      return accepted;
    });
    if (!Object.is(previous, this.value)) {
      this.activationDirection = this.#direction(previous, this.value);
      this.#prepareIndicatorMotion(previous);
    }
    this.#sync();
    this.requestUpdate();
    return accepted;
  }
  /** Publishes the indicator role; its default motion starts with the next geometry write. */
  #prepareIndicatorMotion(previous: unknown): void {
    this.#indicatorMotion?.cancel();
    const indicator = this.#indicator();
    this.#indicatorMotion = indicator
      ? prepareMotion(this, indicator, tabsMotionRoles.indicator, {
          phase: 'change',
          fromState: motionState(previous),
          toState: motionState(this.value),
          context: { activationDirection: this.activationDirection },
        })
      : null;
  }
  #eventTab(event: Event): TabsMember | undefined {
    return event
      .composedPath()
      .find((node): node is TabsMember => this.#tabs.includes(node as TabsMember));
  }
  #click = (event: MouseEvent): void => {
    const tab = this.#eventTab(event);
    if (!tab || event.defaultPrevented) return;
    if (this.disabled || this.#isDisabled(tab)) {
      event.preventDefault();
      return;
    }
    this.#request(memberValue(tab), event.detail === 0 ? 'keyboard' : 'pointer', event, tab);
  };
  #focus = (event: FocusEvent): void => {
    const tab = this.#eventTab(event);
    if (!tab) return;
    this.#focused = tab;
    if (
      this.activateOnFocus &&
      !this.disabled &&
      !this.#isDisabled(tab) &&
      (this.#pointerButton === null || this.#pointerButton === 0)
    )
      this.#request(
        memberValue(tab),
        this.#pointerButton === 0 ? 'pointer' : 'keyboard',
        event,
        tab,
      );
    else this.#sync();
  };
  #pointer = (event: PointerEvent): void => {
    this.#pointerButton = event.button;
  };
  #pointerEnd = (): void => {
    this.#pointerButton = null;
  };
  #key = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || this.disabled || event.altKey || event.ctrlKey || event.metaKey)
      return;
    const tab = this.#eventTab(event);
    if (!tab) return;
    const registry = new CollectionRegistry();
    this.#tabs
      .filter((tab) => !tab.hidden)
      .forEach((tab) => registry.register({ element: tab, disabled: this.#isDisabled(tab) }));
    const next = registry.handleArrowKey(event, tab, this.orientation, this.direction, {
      loop: this.loopFocus,
      includeDisabled: true,
    });
    if (next) {
      this.#focused = next;
      next.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      this.#sync();
      return;
    }
    if (this.#isDisabled(tab)) {
      if (event.key === ' ' || event.key === 'Enter') event.preventDefault();
      return;
    }
    if (tab.nativeAction === false || tab.getAttribute('native-action') === 'false')
      this.#press(tab).keyDown(event);
  };
  #press(tab: HTMLElement): SyntheticPress {
    let press = this.#presses.get(tab);
    if (!press) {
      press = new SyntheticPress((event) => {
        if (!this.disabled && !this.#isDisabled(tab))
          this.#request(memberValue(tab), 'keyboard', event, tab);
      });
      this.#presses.set(tab, press);
    }
    return press;
  }
  #keyUp = (event: KeyboardEvent): void => {
    const tab = this.#eventTab(event);
    if (tab) this.#presses.get(tab)?.keyUp(event);
  };
  #blur = (event: FocusEvent): void => {
    const tab = this.#eventTab(event);
    if (tab) this.#presses.get(tab)?.reset();
  };
  #diagnose(code: string, message: string): void {
    if (this.#diagnostics.has(code)) return;
    this.#diagnostics.add(code);
    this.emit('tp-diagnostic', { code: 'tabs-' + code, message, severity: 'warning' });
  }
  #firstSync = false;
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.#initialize();
    if (this.#firstSync) {
      this.#sync();
      return;
    }
    // Members are adopted once the first render committed: mounting the selected panel starts
    // its presence, which renders again.
    queueMicrotask(() => {
      this.#firstSync = true;
      this.#sync();
    });
  }
  protected override render() {
    return html`<div class="root" part="tabs">
      <div
        class="list"
        part="tabs-list"
        role="tablist"
        aria-label=${this.label || nothing}
        aria-orientation=${this.orientation}
        aria-disabled=${this.disabled ? 'true' : nothing}
        @click=${this.#click}
        @focusin=${this.#focus}
        @focusout=${this.#blur}
        @pointerdown=${this.#pointer}
        @keydown=${this.#key}
        @keyup=${this.#keyUp}
        @scroll=${this.#scheduleGeometry}
      >
        <slot name="tab" @slotchange=${this.#sync}></slot>
        <slot name="indicator" @slotchange=${this.#sync}
          ><span class="indicator" part="tabs-indicator" aria-hidden="true"></span
        ></slot>
      </div>
      <div class="panels"><slot name="panel" @slotchange=${this.#sync}></slot></div>
    </div>`;
  }
}
