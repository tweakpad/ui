import { html, nothing } from 'lit';
import type { CSSResultGroup, PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import {
  composedContains,
  composedParent,
  deepActiveElement,
  focusableElements,
  isAvailable,
  restoreFocus,
  trapTabKey,
} from '../../foundation/focus.js';
import { createId } from '../../foundation/id.js';
import { PresenceController } from '../../foundation/presence.js';
import { prepareMotion, type MotionHandle } from '../../foundation/motion.js';
import type { MotionRoleDefinition } from '../../foundation/motion.js';
import { xIcon } from '../../icons/x.js';
import { SurfaceState, type TpSurfaceOpenChangeEvent } from '../../foundation/surface-state.js';
import { acquireScrollLock } from '../../foundation/scroll-lock.js';
import { FloatingDismissController } from '../../foundation/floating-dismiss.js';
import { globalFloatingTree } from '../../foundation/floating-tree.js';
import type { ChangeReason, PresenceState } from '../../foundation/types.js';
import type { DialogHandle, DialogTriggerOptions } from './handle.js';
import { dialogStyles } from './styles.js';

export type DialogInitialFocus =
  'first' | 'cancel' | 'confirm' | 'popup' | string | HTMLElement | (() => HTMLElement | null);
export type DialogFinalFocus =
  HTMLElement | (() => HTMLElement | null) | 'trigger' | 'previous' | false;
const triggerIdentifiers = new WeakMap<HTMLElement, string>();

export const dialogMotionRoles = {
  backdrop: {
    name: 'backdrop',
    kind: 'presence',
    phases: ['enter', 'exit'],
    completion: 'blocking',
  },
  surface: { name: 'surface', kind: 'presence', phases: ['enter', 'exit'], completion: 'blocking' },
} as const satisfies Record<string, MotionRoleDefinition>;

interface TriggerRecord {
  identifier: string;
  payload: unknown;
  sync: () => void;
  cleanup: () => void;
}

/** Shared Dialog-family owner. Subclasses supply policy and public part names. */
export class TpDialog extends TpElement {
  static tagName = 'tp-dialog';
  static override properties = {
    ...TpElement.properties,
    open: { type: Boolean, noAccessor: true },
    defaultOpen: { type: Boolean, attribute: 'default-open' },
    keepMounted: { type: Boolean, attribute: 'keep-mounted' },
    closeOnEscape: { type: Boolean, attribute: 'close-on-escape' },
    modality: { type: String, reflect: true, noAccessor: true },
    closeOnOutsideInteraction: {
      type: Boolean,
      attribute: 'close-on-outside-interaction',
      noAccessor: true,
    },
    showCloseControl: { type: Boolean, attribute: 'show-close-control' },
    initialFocus: { attribute: 'initial-focus' },
    finalFocus: { attribute: false },
    label: { type: String },
    description: { type: String },
    forceRender: { type: Boolean, attribute: 'force-render' },
    onOpenChange: { attribute: false },
    onOpenChangeComplete: { attribute: false },
    handle: { attribute: false },
    triggerIdentifier: { attribute: 'trigger-identifier' },
    defaultTriggerIdentifier: { attribute: 'default-trigger-identifier' },
  };
  static override styles: CSSResultGroup = [TpElement.styles, dialogStyles];
  defaultOpen = false;
  keepMounted = false;
  closeOnEscape = true;
  initialFocus: DialogInitialFocus = 'first';
  finalFocus: DialogFinalFocus = 'trigger';
  label = '';
  description = '';
  forceRender = false;
  showCloseControl = true;
  #modality: 'modal' | 'non-modal' | 'trap-focus-only' = 'modal';
  #outsideDismissal = true;
  onOpenChange: ((event: TpSurfaceOpenChangeEvent) => void) | undefined;
  onOpenChangeComplete: ((open: boolean) => void) | undefined;
  handle: DialogHandle | undefined;
  triggerIdentifier: string | undefined;
  defaultTriggerIdentifier: string | undefined;
  readonly actions = { close: () => this.close(), unmount: () => this.unmount() };
  readonly #contentId = createId('tp-dialog-content');
  readonly #titleId = createId('tp-dialog-title');
  readonly #descriptionId = createId('tp-dialog-description');
  readonly #nodeId = createId('tp-dialog');
  #providedOpen: boolean | undefined;
  #previousFocus: Element | null = null;
  #activeTrigger: HTMLElement | null = null;
  #payload: unknown;
  #triggers = new Map<HTMLElement, TriggerRecord>();
  #slotTrigger: HTMLElement | null = null;
  #slotTriggerCleanup: (() => void) | undefined;
  #actionCleanups: Array<() => void> = [];
  #closeActions = new Map<HTMLElement, { attach: () => void; detach: () => void }>();
  #slotCloseCleanup: (() => void) | undefined;
  #slotClose: HTMLElement | null = null;
  #handleCleanup: (() => void) | undefined;
  #treeCleanup: (() => void) | undefined;
  #scrollCleanup: (() => void) | undefined;
  #parent: TpDialog | null = null;
  #children = new Set<TpDialog>();
  #active = false;
  #focusPending = false;
  #forceUnmount = false;
  #phase: PresenceState = 'absent';
  #motion: MotionHandle[] = [];
  #activeModality: string | undefined;
  #restoreOnClose = true;
  #diagnosed = new Set<string>();
  #observer: MutationObserver | undefined;
  #state = new SurfaceState({
    read: () => this.#providedOpen,
    defaultOpen: () => this.defaultOpen,
    dispatch: (event) => {
      this.dispatchEvent(event);
      this.onOpenChange?.(event);
    },
    commit: () => this.requestUpdate(),
    diagnostic: (message) => this.#diagnostic('state-mode', message),
  });
  #presence = new PresenceController(this, {
    surface: () => this.renderRoot.querySelector('.portal'),
    keepMounted: () => !this.#forceUnmount && (this.keepMounted || this.#state.retained),
    onStateChange: () => this.requestUpdate(),
    onComplete: (open) => {
      if (!this.isConnected) return;
      if (!open) {
        this.renderRoot.querySelector<HTMLElement>('.overlay')?.hidePopover();
        if (this.#layer?.matches(':popover-open')) this.#layer.hidePopover();
        this.#layer?.removeAttribute('open');
        this.#activeTrigger = null;
        this.#payload = undefined;
      }
      this.emit('tp-open-change-complete', { open });
      this.onOpenChangeComplete?.(open);
    },
  });
  readonly dismissController = new FloatingDismissController(this, {
    open: () => this.open,
    anchor: () => this.#activeTrigger,
    outside: () => this.modality !== 'modal' && this.closeOnOutsideInteraction,
    escape: () => this.closeOnEscape,
    topmostOnly: true,
    dismiss: (event) =>
      this.setOpen(false, event.type === 'keydown' ? 'escape-key' : 'outside-press', event),
  });
  get open(): boolean {
    return this.#state.open;
  }
  set open(value: boolean | undefined) {
    const previous = this.#providedOpen;
    this.#providedOpen = value === undefined ? undefined : Boolean(value);
    this.requestUpdate('open', previous);
    this.requestUpdate();
  }
  get modality(): 'modal' | 'non-modal' | 'trap-focus-only' {
    return this.#modality;
  }
  set modality(value: 'modal' | 'non-modal' | 'trap-focus-only') {
    const previous = this.#modality;
    this.#modality = ['modal', 'non-modal', 'trap-focus-only'].includes(value) ? value : 'modal';
    this.requestUpdate('modality', previous);
  }
  get closeOnOutsideInteraction(): boolean {
    return this.#outsideDismissal;
  }
  set closeOnOutsideInteraction(value: boolean) {
    const previous = this.#outsideDismissal;
    this.#outsideDismissal = Boolean(value);
    this.requestUpdate('closeOnOutsideInteraction', previous);
  }
  protected get partPrefix(): string {
    return 'dialog';
  }
  protected get isAlertDialog(): boolean {
    return false;
  }
  protected partName(name: string): string {
    return `${this.partPrefix}-${name}`;
  }
  protected get contentElement(): HTMLDialogElement | null {
    return this.#layer;
  }
  protected motionTargets(): Array<{ target: HTMLElement | null; role: MotionRoleDefinition }> {
    return [
      { target: this.renderRoot.querySelector('.overlay'), role: dialogMotionRoles.backdrop },
    ];
  }
  #hasCloseAlternative(): boolean {
    return [...this.#closeActions.keys(), this.#assigned('close')].some((element) => {
      if (!element || !this.#content || !composedContains(this.#content, element)) return false;
      for (let node = composedParent(element); node && node !== this; node = composedParent(node))
        if (node instanceof TpDialog) return false;
      const target = this.#actionTarget(element);
      return (
        target.tabIndex >= 0 &&
        Boolean(target.getAttribute('aria-label') || element.textContent?.trim()) &&
        isAvailable(target)
      );
    });
  }
  get #showCornerClose(): boolean {
    return !this.isAlertDialog && (this.showCloseControl || !this.#hasCloseAlternative());
  }
  get payload(): unknown {
    return this.#payload;
  }
  get activeTriggerIdentifier(): string | undefined {
    return this.#activeTrigger ? this.#triggers.get(this.#activeTrigger)?.identifier : undefined;
  }
  get presenceState(): PresenceState {
    return this.#presence.state;
  }
  get #layer(): HTMLDialogElement | null {
    return this.renderRoot.querySelector('dialog');
  }
  get #content(): HTMLElement | null {
    return this.renderRoot.querySelector('.content');
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.part.add(this.partPrefix);
    if (!this.id) this.id = this.#nodeId;
    if (this.shadowRoot && 'referenceTarget' in this.shadowRoot)
      (this.shadowRoot as ShadowRoot & { referenceTarget: string }).referenceTarget =
        this.#contentId;
    this.#observer = new MutationObserver(() => {
      this.#syncParts();
      this.requestUpdate();
    });
    this.#observer.observe(this, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['slot', 'disabled', 'aria-disabled', 'aria-label', 'hidden', 'inert', 'id'],
    });
    for (const action of this.#closeActions.values()) action.attach();
    this.#handleCleanup = this.handle?.attach(this);
    this.requestUpdate();
  }
  override disconnectedCallback(): void {
    this.#observer?.disconnect();
    this.#deactivate(false);
    this.renderRoot.querySelector<HTMLElement>('.overlay')?.hidePopover();
    this.#slotTriggerCleanup?.();
    this.#slotTriggerCleanup = undefined;
    this.#slotTrigger = null;
    this.#actionCleanups.splice(0).forEach((cleanup) => cleanup());
    this.#slotCloseCleanup?.();
    this.#slotCloseCleanup = undefined;
    this.#slotClose = null;
    for (const action of this.#closeActions.values()) action.detach();
    this.#handleCleanup?.();
    this.#handleCleanup = undefined;
    for (const record of this.#triggers.values()) record.cleanup();
    this.#triggers.clear();
    this.#motion.forEach((motion) => motion.cancel());
    this.#motion = [];
    this.#phase = 'absent';
    super.disconnectedCallback();
  }
  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    this.#state.sync();
    this.#presence.setPresent(this.isConnected && this.open);
  }
  protected override render() {
    const present = this.#presence.mounted;
    const open = this.open;
    const state = this.#presence.state;
    const described = Boolean(
      this.description || this.#assigned('description')?.textContent?.trim(),
    );
    return html` <slot name="trigger" @slotchange=${this.#syncParts}></slot>
      ${
        present
          ? html` <div class="portal" part=${this.partName('portal')} data-state=${state}>
              <div
                class="overlay"
                popover="manual"
                part=${this.partName('overlay')}
                aria-hidden="true"
                ?hidden=${Boolean(this.#parent) && !this.forceRender}
                data-state=${state}
                ?data-open=${open}
                ?data-closed=${!open}
                ?data-starting-style=${state === 'starting'}
                ?data-ending-style=${state === 'ending'}
              ></div>
              <dialog
                class="content"
                role=${this.isAlertDialog ? 'alertdialog' : 'dialog'}
                aria-modal=${this.modality === 'modal' ? 'true' : 'false'}
                aria-labelledby=${this.#titleId}
                aria-describedby=${described ? this.#descriptionId : nothing}
                aria-hidden=${open ? nothing : 'true'}
                .inert=${!open}
                @cancel=${this.#cancelNative}
                @pointerdown=${this.#outside}
                part=${this.partName('content')}
                id=${this.#contentId}
                tabindex="-1"
                data-state=${state}
                ?data-open=${open}
                ?data-closed=${!open}
                ?data-starting-style=${state === 'starting'}
                ?data-ending-style=${state === 'ending'}
                ?data-nested=${Boolean(this.#parent)}
                ?data-nested-dialog-open=${this.#children.size > 0}
                @keydown=${this.#key}
              >
                <div class="header" part=${this.partName('header')}>
                  ${
                    this.isAlertDialog
                      ? html`<div
                          class="media"
                          part=${this.partName('media')}
                          ?hidden=${!this.#assigned('media')}
                        >
                          <slot name="media" @slotchange=${this.#syncParts}></slot>
                        </div>`
                      : nothing
                  }
                  <h2 class="title" part=${this.partName('title')} id=${this.#titleId}>
                    <slot name="title" @slotchange=${this.#syncParts}>${this.label}</slot>
                  </h2>
                  <div
                    class="description"
                    part=${this.partName('description')}
                    id=${this.#descriptionId}
                    ?hidden=${!described}
                  >
                    <slot name="description" @slotchange=${this.#syncParts}
                      >${this.description}</slot
                    >
                  </div>
                </div>
                <div class="body" ?hidden=${!this.#hasBody()}>
                  <slot @slotchange=${this.#syncParts}></slot>
                </div>
                <div
                  class="footer"
                  part=${this.partName(this.isAlertDialog ? 'actions' : 'footer')}
                  ?hidden=${!['actions', 'footer', 'cancel', 'confirm', 'close'].some((name) => this.#assigned(name))}
                >
                  <slot name="actions" @slotchange=${this.#syncParts}></slot>
                  <slot name="footer" @slotchange=${this.#syncParts}></slot>
                  <slot name="cancel" @slotchange=${this.#syncParts}></slot>
                  <slot name="confirm" @slotchange=${this.#syncParts}></slot>
                  <slot name="close" @slotchange=${this.#syncParts}></slot>
                </div>
                ${
                  this.#showCornerClose
                    ? html`<tp-button
                        class="corner-close"
                        part=${this.partName('close')}
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Close"
                        .icon=${xIcon}
                        @click=${this.#cornerClose}
                      ></tp-button>`
                    : nothing
                }
              </dialog>
            </div>`
          : nothing
      }`;
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (!this.isConnected) return;
    if (changed.has('handle')) {
      this.#handleCleanup?.();
      this.#handleCleanup = this.handle?.attach(this);
    }
    this.#syncParts();
    if (this.open && !this.#active) this.#activate();
    else if (!this.open && this.#active) this.#deactivate(this.#restoreOnClose);
    else if (this.open && this.#activeModality !== this.modality) this.#applyModality();
    if (!this.open && this.#layer && this.#presence.state === 'ending' && !this.#layer.open)
      this.#layer.setAttribute('open', '');
    this.#syncMotion();
    this.#markers();
    if (this.#focusPending && this.open) {
      this.#focusPending = false;
      this.#initialFocus();
    }
  }
  #assigned(name: string): HTMLElement | null {
    return (
      ([...this.children].find((element) => element.getAttribute('slot') === name) as
        HTMLElement | undefined) ?? null
    );
  }
  #hasBody(): boolean {
    return [...this.childNodes].some((node) =>
      node instanceof Element ? !node.hasAttribute('slot') : Boolean(node.textContent?.trim()),
    );
  }
  #syncParts = (): void => {
    if (!this.isConnected) return;
    const trigger = this.#assigned('trigger');
    if (trigger !== this.#slotTrigger) {
      this.#slotTriggerCleanup?.();
      this.#slotTrigger = trigger;
      this.#slotTriggerCleanup = trigger ? this.registerTrigger(trigger) : undefined;
    }
    for (const record of this.#triggers.values()) record.sync();
    this.#actionCleanups.splice(0).forEach((cleanup) => cleanup());
    const close = this.#assigned('close');
    if (close !== this.#slotClose) {
      this.#slotCloseCleanup?.();
      this.#slotClose = close;
      this.#slotCloseCleanup = close ? this.registerCloseAction(close) : undefined;
    }
    const corner = this.renderRoot.querySelector<HTMLElement>('.corner-close');
    if (corner)
      this.#actionCleanups.push(
        this.presentationController.registerPart(
          this.partName('close'),
          this.#actionTarget(corner),
        ),
      );
    for (const name of this.isAlertDialog ? ['cancel', 'confirm'] : []) {
      const element = this.#assigned(name);
      if (!element) continue;
      const part = this.partName(name);
      const hadPart = element.part.contains(part);
      element.part.add(part);
      const target = this.#actionTarget(element);
      const unregister = this.presentationController.registerPart(part, target);
      this.#actionCleanups.push(() => {
        unregister();
        if (!hadPart) element.part.remove(part);
      });
    }
    if (this.open) {
      if (!(this.#assigned('title')?.textContent?.trim() || this.label.trim()))
        this.#diagnostic('title-missing', 'Dialog requires a non-empty title slot or label.');
      if (this.#content && focusableElements(this.#content).length === 0)
        this.#diagnostic(
          'decision-missing',
          'Dialog requires a clearly labelled, enabled decision action.',
        );
    }
  };
  #actionTarget(element: HTMLElement): HTMLElement {
    return (
      element.shadowRoot?.querySelector<HTMLElement>('button, a[href], [role="button"]') ?? element
    );
  }
  registerTrigger(element: HTMLElement, options: DialogTriggerOptions = {}): () => void {
    if (this.#triggers.has(element)) return () => {};
    if (element.ownerDocument !== this.ownerDocument) {
      this.#diagnostic(
        'trigger-environment',
        'Trigger and Dialog must belong to the same document.',
      );
      return () => {};
    }
    const identifier =
      options.identifier ??
      (element.id || triggerIdentifiers.get(element) || createId('tp-dialog-trigger'));
    triggerIdentifiers.set(element, identifier);
    const part = this.partName('trigger');
    const hadPart = element.part.contains(part);
    element.part.add(part);
    let target: HTMLElement | undefined;
    let unregister: (() => void) | undefined;
    const original = new Map<string, string | null>();
    const applied = new Map<string, string | null>();
    let controls: readonly Element[] | null = null;
    let controlsAttribute: string | null = null;
    const restore = (): void => {
      if (!target) return;
      for (const [name, value] of original)
        if (target.getAttribute(name) === applied.get(name)) {
          if (value === null) target.removeAttribute(name);
          else target.setAttribute(name, value);
        }
      if (
        target.ariaControlsElements?.includes(this) ||
        (target.getAttribute('aria-controls') === '' && !target.ariaControlsElements?.length)
      ) {
        if (controlsAttribute) target.setAttribute('aria-controls', controlsAttribute);
        else {
          target.ariaControlsElements = controls;
          if (controlsAttribute === null && !controls?.length)
            target.removeAttribute('aria-controls');
        }
      }
      original.clear();
      applied.clear();
      unregister?.();
    };
    const sync = (): void => {
      const next = this.#actionTarget(element);
      if (target !== next) {
        restore();
        target = next;
        controls = target.ariaControlsElements;
        controlsAttribute = target.getAttribute('aria-controls');
        unregister = this.presentationController.registerPart(part, target);
      }
      const write = (name: string, value: string | null): void => {
        if (!original.has(name)) original.set(name, target!.getAttribute(name));
        applied.set(name, value);
        if (value === null) target!.removeAttribute(name);
        else target!.setAttribute(name, value);
      };
      write('aria-haspopup', 'dialog');
      write('aria-expanded', String(this.open));
      target.ariaControlsElements = [...(controls ?? []), this];
      write('data-popup-open', this.open ? '' : null);
      write(
        'data-disabled',
        element.matches('[disabled], [aria-disabled="true"]') ||
          target.matches('[disabled], [aria-disabled="true"]')
          ? ''
          : null,
      );
      if (options.nativeAction === false && target === element) {
        write('role', 'button');
        write('tabindex', element.hasAttribute('disabled') ? '-1' : '0');
      }
    };
    const click = (event: Event): void => {
      queueMicrotask(() => {
        if (
          !this.isConnected ||
          !element.isConnected ||
          !this.#triggers.has(element) ||
          event.defaultPrevented ||
          element.matches('[disabled], [aria-disabled="true"]')
        )
          return;
        this.#request(
          this.isAlertDialog || !this.open,
          'trigger-press',
          event,
          element,
          options.payload,
        );
      });
    };
    const key = (event: KeyboardEvent): void => {
      if (
        options.nativeAction !== false ||
        event.defaultPrevented ||
        !['Enter', ' '].includes(event.key)
      )
        return;
      event.preventDefault();
      if (!event.repeat && !element.matches('[disabled], [aria-disabled="true"]'))
        this.#request(
          this.isAlertDialog || !this.open,
          'trigger-press',
          event,
          element,
          options.payload,
        );
    };
    element.addEventListener('click', click);
    element.addEventListener('keydown', key);
    const cleanup = (): void => {
      element.removeEventListener('click', click);
      element.removeEventListener('keydown', key);
      restore();
      if (!hadPart) element.part.remove(part);
    };
    this.#triggers.set(element, { identifier, payload: options.payload, sync, cleanup });
    sync();
    return () => {
      cleanup();
      this.#triggers.delete(element);
    };
  }
  setOpen(open: boolean, reason: ChangeReason = 'programmatic', sourceEvent?: Event): void {
    const allowed = [
      'programmatic',
      'imperative-action',
      'trigger-press',
      'close-action',
      'escape-key',
      'focus-outside',
      'outside-press',
    ];
    if (!allowed.includes(reason)) {
      this.#diagnostic('change-reason', `Dialog does not accept the reason ${reason}.`);
      return;
    }
    if (['outside-press', 'focus-outside'].includes(reason) && !this.closeOnOutsideInteraction)
      return;
    this.#request(open, reason, sourceEvent);
  }
  close(): void {
    this.setOpen(false, 'imperative-action');
  }
  unmount(): void {
    if (this.open) {
      this.#state.request(false, 'imperative-action', undefined, undefined, () => {
        this.#forceUnmount = true;
        this.#state.retained = false;
      });
      return;
    }
    this.#forceUnmount = true;
    this.#state.retained = false;
    this.#presence.releaseRetained();
    this.requestUpdate();
  }
  openFromHandle(identifier?: string, payload?: unknown): void {
    const trigger = [...this.#triggers].find(([, record]) => record.identifier === identifier);
    this.#request(
      true,
      'imperative-action',
      undefined,
      trigger?.[0],
      trigger?.[1].payload ?? payload,
    );
  }
  #request(
    open: boolean,
    reason: ChangeReason,
    event?: Event,
    trigger?: HTMLElement,
    payload?: unknown,
  ): void {
    const previous = deepActiveElement(this.ownerDocument);
    this.#state.request(
      open,
      reason,
      event,
      trigger,
      open
        ? () => {
            if (
              this.triggerIdentifier !== undefined &&
              this.#triggers.get(trigger!)?.identifier !== this.triggerIdentifier
            )
              return;
            this.#activeTrigger = trigger ?? null;
            this.#payload = payload;
            if (!this.#active) this.#previousFocus = previous;
            this.requestUpdate();
          }
        : () => {
            this.#restoreOnClose =
              reason !== 'focus-outside' &&
              (reason !== 'outside-press' || this.modality === 'modal');
          },
    );
  }
  #activate(): void {
    const layer = this.#layer;
    if (!layer) return;
    this.#active = true;
    this.#restoreOnClose = true;
    this.#forceUnmount = false;
    this.#previousFocus ??= deepActiveElement(this.ownerDocument);
    if (!this.#activeTrigger) {
      const id = this.triggerIdentifier ?? this.defaultTriggerIdentifier;
      this.#activeTrigger =
        [...this.#triggers].find(([, record]) => record.identifier === id)?.[0] ??
        this.#slotTrigger;
    }
    for (let node = composedParent(this); node; node = composedParent(node))
      if (node instanceof TpDialog) {
        this.#parent = node;
        break;
      }
    if (this.#parent) {
      this.#parent.#children.add(this);
      this.#parent.requestUpdate();
    }
    this.#treeCleanup = globalFloatingTree.register({
      id: this.#nodeId,
      ...(this.#parent ? { parentId: this.#parent.#nodeId } : {}),
      element: layer,
      dismiss: () => this.close(),
    });
    this.#applyModality();
    this.#focusPending = true;
    this.ownerDocument.addEventListener('focusin', this.#focusIn);
    this.addEventListener('click', this.#cancelAction);
  }
  #applyModality(): void {
    const layer = this.#layer;
    if (!layer) return;
    const active = deepActiveElement(this.ownerDocument);
    this.#scrollCleanup?.();
    this.#scrollCleanup = undefined;
    if (layer.matches(':popover-open')) layer.hidePopover();
    if (layer.open) layer.close();
    const overlay = this.renderRoot.querySelector<HTMLElement>('.overlay');
    overlay?.hidePopover();
    this.#activeModality = this.modality;
    if (this.modality === 'modal') {
      if ((!this.#parent || this.forceRender) && overlay) overlay.showPopover();
      layer.removeAttribute('popover');
      layer.showModal();
      this.#scrollCleanup = acquireScrollLock(this.ownerDocument);
    } else {
      layer.setAttribute('popover', 'manual');
      layer.setAttribute('open', '');
      layer.showPopover();
    }
    if (active && composedContains(layer, active)) restoreFocus(active);
  }
  #deactivate(restore: boolean): void {
    if (!this.#active) return;
    this.#active = false;
    this.ownerDocument.removeEventListener('focusin', this.#focusIn);
    this.removeEventListener('click', this.#cancelAction);
    for (const child of this.#children) child.close();
    this.#children.clear();
    this.#treeCleanup?.();
    this.#treeCleanup = undefined;
    this.#scrollCleanup?.();
    this.#scrollCleanup = undefined;
    if (this.#activeModality === 'modal') this.#layer?.close();
    this.#activeModality = undefined;
    if (restore && this.finalFocus === false) {
      const body = this.ownerDocument.body;
      const tabIndex = body.getAttribute('tabindex');
      body.tabIndex = -1;
      body.focus({ preventScroll: true });
      if (tabIndex === null) body.removeAttribute('tabindex');
      else body.setAttribute('tabindex', tabIndex);
    }
    if (restore && this.finalFocus !== false) {
      const chosen = typeof this.finalFocus === 'function' ? this.finalFocus() : this.finalFocus;
      const target =
        chosen instanceof HTMLElement
          ? chosen
          : chosen === 'previous'
            ? this.#previousFocus
            : this.#activeTrigger;
      if (!restoreFocus(target) && !restoreFocus(this.#previousFocus)) {
        const fallback = this.#parent ? this.#parent.#content : null;
        if (fallback) fallback.focus({ preventScroll: true });
        else {
          const body = this.ownerDocument.body;
          const previous = body.getAttribute('tabindex');
          body.tabIndex = -1;
          body.focus({ preventScroll: true });
          if (previous === null) body.removeAttribute('tabindex');
          else body.setAttribute('tabindex', previous);
        }
      }
    }
    if (this.#parent) this.#parent.#children.delete(this);
    this.#parent?.requestUpdate();
    this.#parent = null;
    this.#previousFocus = null;
  }
  #initialFocus(): void {
    const content = this.#content;
    if (!content) return;
    const policy =
      typeof this.initialFocus === 'function' ? this.initialFocus() : this.initialFocus;
    const named =
      policy instanceof HTMLElement
        ? policy
        : policy === 'popup'
          ? content
          : policy === 'cancel' || policy === 'confirm'
            ? this.#assigned(policy)
            : [...this.querySelectorAll<HTMLElement>('[id]')].find(
                (element) => element.id === policy,
              );
    const target = named ? this.#actionTarget(named) : null;
    if (target && composedContains(content, target) && isAvailable(target))
      target.focus({ preventScroll: true });
    else (focusableElements(content)[0] ?? content).focus({ preventScroll: true });
  }
  #key = (event: KeyboardEvent): void => {
    if (
      !this.open ||
      !this.dismissController.isTopmost ||
      this.modality === 'non-modal' ||
      event.defaultPrevented
    )
      return;
    if (event.key === 'Tab' && this.#content) trapTabKey(event, this.#content);
  };
  #focusIn = (event: FocusEvent): void => {
    if (!this.open || !this.dismissController.isTopmost || !this.#content) return;
    const active = deepActiveElement(this.ownerDocument);
    if (composedContains(this.#content, active)) return;
    if (this.modality === 'non-modal') {
      if (!composedContains(this.#activeTrigger ?? this, active) && this.closeOnOutsideInteraction)
        this.setOpen(false, 'focus-outside', event);
    } else this.#initialFocus();
  };
  #cornerClose = (event: MouseEvent): void => {
    queueMicrotask(() => {
      if (!event.defaultPrevented) this.setOpen(false, 'close-action', event);
    });
  };
  /** Bind a consumer-owned, named action wherever it is composed in this surface. */
  registerCloseAction(element: HTMLElement): () => void {
    if (this.#closeActions.has(element)) return () => {};
    const click = (event: Event): void => {
      queueMicrotask(() => {
        if (
          this.isConnected &&
          this.open &&
          !event.defaultPrevented &&
          this.#content &&
          composedContains(this.#content, element) &&
          isAvailable(this.#actionTarget(element))
        )
          this.setOpen(false, 'close-action', event);
      });
    };
    const record = {
      attach: () => element.addEventListener('click', click),
      detach: () => element.removeEventListener('click', click),
    };
    this.#closeActions.set(element, record);
    if (this.isConnected) record.attach();
    this.requestUpdate();
    return () => {
      record.detach();
      this.#closeActions.delete(element);
      this.requestUpdate();
    };
  }
  #cancelAction = (event: MouseEvent): void => {
    const cancel = this.isAlertDialog ? this.#assigned('cancel') : null;
    if (!cancel || !event.composedPath().includes(cancel)) return;
    queueMicrotask(() => {
      if (
        !event.defaultPrevented &&
        this.open &&
        !cancel.matches('[disabled], [aria-disabled="true"]')
      )
        this.setOpen(false, 'close-action', event);
    });
  };
  #cancelNative = (event: Event): void => {
    event.preventDefault();
  };
  #outside = (event: PointerEvent): void => {
    if (event.target !== this.#layer || !this.dismissController.isTopmost) return;
    const bounds = this.#layer!.getBoundingClientRect();
    if (
      event.clientX >= bounds.left &&
      event.clientX <= bounds.right &&
      event.clientY >= bounds.top &&
      event.clientY <= bounds.bottom
    )
      return;
    event.preventDefault();
    if (this.closeOnOutsideInteraction) this.setOpen(false, 'outside-press', event);
  };
  #syncMotion(): void {
    const state = this.#presence.state;
    if (state === this.#phase) return;
    this.#phase = state;
    if (state === 'starting' || state === 'ending') {
      this.#motion.forEach((motion) => motion.cancel());
      this.#motion = this.motionTargets().map(({ target, role }) =>
        prepareMotion(this, target, role, {
          phase: state === 'starting' ? 'enter' : 'exit',
          fromState: state === 'starting' ? 'closed' : 'open',
          toState: this.open ? 'open' : 'closed',
        }),
      );
    }
    if (state === 'open' || state === 'ending') {
      for (const motion of this.#motion) {
        motion.start();
        this.#presence.trackCompletion(motion.finished);
      }
    }
  }
  #markers(): void {
    this.#content?.toggleAttribute('data-nested', Boolean(this.#parent));
    this.#content?.toggleAttribute('data-nested-dialog-open', this.#children.size > 0);
    const overlay = this.renderRoot.querySelector<HTMLElement>('.overlay');
    if (overlay)
      overlay.hidden = this.modality !== 'modal' || (Boolean(this.#parent) && !this.forceRender);
    this.#content?.style.setProperty('--nested-dialogs', String(this.#children.size));
    this.toggleAttribute('data-open', this.open);
    this.toggleAttribute('data-closed', !this.open);
    this.toggleAttribute('data-starting-style', this.#presence.state === 'starting');
    this.toggleAttribute('data-ending-style', this.#presence.state === 'ending');
  }
  #diagnostic(code: string, message: string): void {
    if (this.#diagnosed.has(code)) return;
    this.#diagnosed.add(code);
    this.emit('tp-diagnostic', {
      code: `${this.partPrefix}-${code}`,
      severity: 'warning',
      message,
    });
  }
}
