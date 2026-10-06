import {
  restoreLostFocus,
  surfaceInteraction,
  type SurfaceInteraction,
} from '../../foundation/surface-focus.js';
import { CloseWatcherController } from '../../foundation/close-watcher.js';
import { html, nothing } from 'lit';
import type { CSSResultGroup, PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import {
  composedContains,
  composedParent,
  composedScopeContains,
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
import { acquireOutsideInert } from '../../foundation/outside-inert.js';
import type { HostProperties } from '../../foundation/part.js';
import { acquireScrollLock } from '../../foundation/scroll-lock.js';
import { FloatingDismissController } from '../../foundation/floating-dismiss.js';
import { globalFloatingTree } from '../../foundation/floating-tree.js';
import type { ChangeReason, PresenceState } from '../../foundation/types.js';
import type { DialogHandle, DialogTriggerOptions } from './handle.js';
import { dialogStyles } from './styles.js';
import type { PartRenderOptions } from '../../foundation/part.js';
import {
  OwnedPortal,
  logicalPortalOwner,
  type OwnedPortalContainer,
} from '../../foundation/owned-portal.js';
import { ComposedEnvironmentObserver } from '../../foundation/composed-environment.js';
import {
  dialogModalities,
  isolatingModality,
  normalizeDialogModality,
  resolveDialogModality,
  type DialogModality,
  type ResolvedDialogModality,
} from './modality.js';
import type { OutsideInertScope } from '../../foundation/outside-inert.js';
import { dialogPresentation } from '../../presentation/families/dialog.js';
import { TpButton } from '../button.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';

export type { DialogModality } from './modality.js';

type DialogFocusTarget = 'first' | 'cancel' | 'confirm' | 'popup' | string | HTMLElement;

/**
 * A resolver receives how the Dialog was opened, as the shared surface focus targets do, and
 * returns any other target; `null` uses the first available control.
 */
export type DialogInitialFocus =
  DialogFocusTarget | ((interaction: SurfaceInteraction) => DialogFocusTarget | null);
export type DialogFinalFocus =
  HTMLElement | (() => HTMLElement | null) | 'trigger' | 'previous' | false;
const triggerIdentifiers = new WeakMap<HTMLElement, string>();
/** Hide a native popover only when it is showing; container-modal layers have no popover. */
function hidePopover(element: HTMLElement | null | undefined): void {
  if (element?.matches(':popover-open')) element.hidePopover();
}

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
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpButton];
  }
  static override presentation = dialogPresentation;
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
    portal: { type: Boolean },
    container: { attribute: false },
    portalIdentifier: { type: String, attribute: 'portal-identifier' },
    showHeader: { type: Boolean, attribute: 'show-header' },
    showFooter: { type: Boolean, attribute: 'show-footer' },
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
  portal = false;
  container: OwnedPortalContainer = null;
  portalIdentifier: string | undefined;
  showHeader = true;
  showFooter = true;
  #modality: DialogModality = 'modal';
  #resolved: ResolvedDialogModality = { modality: 'modal', scope: null };
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
  /** The event that opened the Dialog; its interaction type selects initial focus. */
  #openingEvent: Event | undefined;
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
  #inertCleanup: (() => void) | undefined;
  #parent: TpDialog | null = null;
  #children = new Set<TpDialog>();
  #active = false;
  #focusPending = false;
  #forceUnmount = false;
  #phase: PresenceState = 'absent';
  #motion: MotionHandle[] = [];
  #activeModality: DialogModality | undefined;
  #activeScope: OutsideInertScope | null = null;
  #restoreOnClose = true;
  #diagnosed = new Set<string>();
  #observer: MutationObserver | undefined;
  #portal = new OwnedPortal(this, (this.constructor as typeof TpDialog).styles);
  #portalFallback = false;
  readonly #environment = new ComposedEnvironmentObserver(this, () => this.requestUpdate());
  protected get surfaceRoot(): ParentNode {
    return this.#portal.root ?? this.renderRoot;
  }
  protected get ownedChildren(): readonly Node[] {
    return this.#portal.ownedChildren;
  }
  get #usesPortal(): boolean {
    return !this.#portalFallback && Boolean(this.portal || this.container || this.portalIdentifier);
  }
  #partRefs = new Map<string, (element: HTMLElement | null) => void>();
  #partElements = new Map<string, HTMLElement>();
  #partReleases = new Map<string, () => void>();
  protected dialogPart(suffix: string, options: PartRenderOptions = {}): unknown {
    const name = this.partName(suffix);
    let reference = this.#partRefs.get(suffix);
    if (!reference) {
      reference = (element) => {
        if (element === this.#partElements.get(suffix)) return;
        this.#partReleases.get(suffix)?.();
        this.#partReleases.delete(suffix);
        if (element) {
          this.#partElements.set(suffix, element);
          this.#partReleases.set(suffix, this.presentationController.registerPart(name, element));
        } else this.#partElements.delete(suffix);
      };
      this.#partRefs.set(suffix, reference);
    }
    return this.renderPart(
      name,
      { open: this.open, presence: this.presenceState, payload: this.payload },
      { ...options, reference },
    );
  }
  protected get surfaceState(): SurfaceState {
    return this.#state;
  }
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
    surface: () => this.surfaceRoot.querySelector('.portal'),
    keepMounted: () =>
      this.previewPresent || (!this.#forceUnmount && (this.keepMounted || this.#state.retained)),
    onStateChange: () => this.requestUpdate(),
    onComplete: (open) => {
      if (!this.isConnected) return;
      if (!open) {
        hidePopover(this.surfaceRoot.querySelector<HTMLElement>('.overlay'));
        hidePopover(this.#layer);
        this.#layer?.removeAttribute('open');
        this.#activeTrigger = null;
        this.#payload = undefined;
        this.#openingEvent = undefined;
      }
      this.emit('tp-open-change-complete', { open });
      this.onOpenChangeComplete?.(open);
    },
  });
  readonly dismissController = new FloatingDismissController(this, {
    open: () => this.open,
    anchor: () => this.#activeTrigger,
    insideElements: () => (this.#content ? [this.#content] : []),
    outside: () => !isolatingModality(this.#resolved.modality) && this.closeOnOutsideInteraction,
    escape: (event) => this.closeOnEscape && this.#withinScope(event),
    topmostOnly: true,
    dismiss: (event) =>
      this.setOpen(false, event.type === 'keydown' ? 'escape-key' : 'outside-press', event),
  });
  readonly #closeWatcher = new CloseWatcherController(this, {
    enabled: () => this.open && this.dismissController.isTopmost,
    allowed: () => this.allowSystemDismissal && this.#withinScope(),
    close: (event) => this.setOpen(false, 'close-watcher', event),
  });
  protected get allowSystemDismissal(): boolean {
    return this.closeOnEscape;
  }
  get open(): boolean {
    return this.#state.open;
  }
  set open(value: boolean | undefined) {
    const previous = this.#providedOpen;
    this.#providedOpen = value === undefined ? undefined : Boolean(value);
    this.requestUpdate('open', previous);
    this.requestUpdate();
    if (this.hasUpdated) this.#state.sync(true);
  }
  /**
   * Requested modality. `container` scopes modality to `container`; when that cannot apply, the
   * document modality is used with a diagnostic. Values a family member does not support
   * normalize to `modal`.
   */
  get modality(): DialogModality {
    return this.#modality;
  }
  set modality(value: DialogModality) {
    const previous = this.#modality;
    const { modality, unsupported } = normalizeDialogModality(value, this.supportedModalities);
    this.#modality = modality;
    if (unsupported)
      this.#diagnostic(
        'modality-unsupported',
        `${this.localName} does not support modality ${String(value)}; using modal.`,
      );
    this.requestUpdate('modality', previous);
  }
  /** Modality values this family member supports. */
  protected get supportedModalities(): readonly DialogModality[] {
    return dialogModalities;
  }
  /** The modality currently applied after resolving `container` (see `modality`). */
  get effectiveModality(): DialogModality {
    return this.#resolved.modality;
  }
  get #contained(): boolean {
    return this.#resolved.modality === 'container';
  }
  /** Container modality ignores system dismissal and Escape from outside its container. */
  #withinScope(event?: Event): boolean {
    const scope = this.#activeScope;
    if (!this.#contained || !scope) return true;
    const target = (event?.composedPath()[0] as Node | undefined) ?? null;
    const active = deepActiveElement(this.ownerDocument);
    return composedScopeContains(scope, target ?? active);
  }
  get #overlayHidden(): boolean {
    return (
      (Boolean(this.#parent) && !this.forceRender) ||
      !isolatingModality(this.#resolved.modality) ||
      // An in-place overlay has no popover state; hide it once the exit completes.
      (this.#contained && !this.open && this.#presence.state !== 'ending')
    );
  }
  get closeOnOutsideInteraction(): boolean {
    return this.#outsideDismissal;
  }
  set closeOnOutsideInteraction(value: boolean) {
    const previous = this.#outsideDismissal;
    this.#outsideDismissal = Boolean(value);
    this.requestUpdate('closeOnOutsideInteraction', previous);
  }
  protected get overlayProperties(): HostProperties {
    return {};
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
  protected get contentElement(): HTMLElement | null {
    return this.#content;
  }
  protected motionTargets(): Array<{ target: HTMLElement | null; role: MotionRoleDefinition }> {
    return [
      { target: this.surfaceRoot.querySelector('.overlay'), role: dialogMotionRoles.backdrop },
    ];
  }
  #hasCloseAlternative(): boolean {
    return [...this.#closeActions.keys(), this.#assigned('close')].some((element) => {
      if (!element || !this.#content || !composedContains(this.#content, element)) return false;
      for (let node = composedParent(element); node && node !== this; node = composedParent(node))
        if (node instanceof TpDialog) return false;
      if (
        !this.showFooter &&
        ['actions', 'footer', 'cancel', 'confirm', 'close'].some((name) => {
          const region = this.#assigned(name);
          return region && composedContains(region, element);
        })
      )
        return false;
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
  get #layer(): HTMLElement | null {
    return this.surfaceRoot.querySelector('[data-dialog-layer]');
  }
  get #content(): HTMLElement | null {
    return this.surfaceRoot.querySelector('.content');
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#environment.connect();
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
    this.#closeWatcher.hostDisconnected();
    this.#environment.disconnect();
    this.#deactivate(false);
    hidePopover(this.surfaceRoot.querySelector<HTMLElement>('.overlay'));
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
    this.#portal.clear();
    super.disconnectedCallback();
  }
  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    if (changed.has('portal') || changed.has('container') || changed.has('portalIdentifier'))
      this.#portalFallback = false;
    this.#resolved = resolveDialogModality({
      requested: this.modality,
      container: this.container,
      ownerDocument: this.ownerDocument,
      portalFallback: this.#portalFallback,
    });
    if (this.#resolved.diagnostic && this.open)
      this.#diagnostic('modality-container', this.#resolved.diagnostic);
    this.#state.sync();
    this.#presence.setPresent(this.isConnected && this.open);
  }
  protected override render() {
    return html`<slot name="trigger" @slotchange=${this.#syncParts}></slot
      >${this.#usesPortal ? nothing : this.renderLayer()}`;
  }
  protected get previewPresent(): boolean {
    return false;
  }
  protected get surfacePartName(): string {
    return 'content';
  }
  protected renderSurfaceChildren(content: unknown): unknown {
    return content;
  }
  protected renderSurface(properties: HostProperties, content: unknown): unknown {
    return this.dialogPart(this.surfacePartName, {
      tag: 'dialog',
      protectedProperties: ['id', 'data-dialog-layer'],
      properties: {
        ...properties,
        'data-dialog-layer': '',
        popover: this.#contained ? undefined : 'manual',
      },
      content,
    });
  }
  protected renderLayer(): unknown {
    if (!this.#presence.mounted) return nothing;
    const open = this.open,
      state = this.#presence.state;
    const described = Boolean(
      this.description || this.#assigned('description')?.textContent?.trim(),
    );
    const markers = {
      'data-state': state,
      'data-open': open,
      'data-closed': !open,
      'data-starting-style': state === 'starting',
      'data-ending-style': state === 'ending',
    };
    const header = this.dialogPart('header', {
      properties: { class: 'header', hidden: !this.showHeader },
      content: html`${this.isAlertDialog ? this.dialogPart('media', { properties: { class: 'media', hidden: !this.#assigned('media') }, content: html`<slot name="media" @slotchange=${this.#syncParts}></slot>` }) : nothing}
      ${this.dialogPart('title', { tag: 'h2', protectedProperties: ['id'], properties: { class: 'title', id: this.#titleId }, content: html`<slot name="title" @slotchange=${this.#syncParts}>${this.label}</slot>` })}
      ${this.dialogPart('description', { protectedProperties: ['id'], properties: { class: 'description', id: this.#descriptionId, hidden: !described }, content: html`<slot name="description" @slotchange=${this.#syncParts}>${this.description}</slot>` })}`,
    });
    const footer = this.dialogPart(this.isAlertDialog ? 'actions' : 'footer', {
      properties: {
        class: 'footer',
        hidden:
          (!this.showFooter && !this.isAlertDialog) ||
          !['actions', 'footer', 'cancel', 'confirm', 'close'].some((name) => this.#assigned(name)),
      },
      content: html`<slot name="actions" @slotchange=${this.#syncParts}></slot
        ><slot name="footer" @slotchange=${this.#syncParts}></slot
        ><slot name="cancel" @slotchange=${this.#syncParts}></slot
        ><slot name="confirm" @slotchange=${this.#syncParts}></slot
        ><slot name="close" @slotchange=${this.#syncParts}></slot>`,
    });
    const close = this.#showCornerClose
      ? this.dialogPart('close', {
          tag: 'tp-button',
          properties: {
            class: 'corner-close',
            variant: 'ghost',
            size: 'icon-sm',
            'aria-label': 'Close',
            '.icon': xIcon,
            '@click': this.#cornerClose,
          },
        })
      : nothing;
    return this.dialogPart('portal', {
      properties: { class: this.#contained ? 'portal contained' : 'portal', 'data-state': state },
      content: html` ${this.dialogPart('overlay', { properties: { ...this.overlayProperties, class: 'overlay', popover: this.#contained ? undefined : 'manual', 'aria-hidden': 'true', hidden: this.#overlayHidden, '@pointerdown': this.#outside, ...markers } })}
      ${this.renderSurface(
        {
          class: 'content',
          role: this.isAlertDialog ? 'alertdialog' : 'dialog',
          // Container modality leaves the rest of the document available, so it is not
          // announced as document-modal; its container siblings are inert instead.
          'aria-modal': String(this.#resolved.modality === 'modal'),
          'aria-labelledby': this.#titleId,
          'aria-describedby': described ? this.#descriptionId : undefined,
          'aria-hidden': open ? undefined : 'true',
          '.inert': !open,
          '@cancel': this.#cancelNative,
          '@pointerdown': this.#outside,
          '@keydown': this.#key,
          id: this.#contentId,
          tabindex: -1,
          ...markers,
          'data-nested': Boolean(this.#parent),
          'data-nested-dialog-open': this.#children.size > 0,
          'data-header-hidden': !this.showHeader,
        },
        this.renderSurfaceChildren(
          html`${header}
            <div class="body" ?hidden=${!this.hasBodyContent()}>${this.renderBody()}</div>
            ${footer}${close}`,
        ),
      )}`,
    });
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (!this.isConnected) return;
    const previousRoot = this.#portal.root;
    const previousFocus = deepActiveElement(this.ownerDocument);
    if (this.#usesPortal && this.#presence.mounted) {
      const mounted = this.#portal.update(
        this.container ?? this.ownerDocument.body,
        this.renderLayer(),
        {
          projectedNodes: this.ownedChildren.filter((node) => this.projectSurfaceNode(node)),
          ...(this.portalIdentifier ? { identifier: this.portalIdentifier } : {}),
        },
      );
      if (!mounted) {
        this.#portalFallback = true;
        this.#diagnostic(
          'portal-container',
          'Portal container must belong to the owner document; using the native top layer.',
        );
        this.requestUpdate();
      }
      if (this.#portal.root && 'referenceTarget' in this.#portal.root)
        (this.#portal.root as ShadowRoot & { referenceTarget: string }).referenceTarget =
          this.#contentId;
      if (this.#portal.host) {
        this.#portal.host.addEventListener('click', this.#cancelAction);
        this.#observer?.observe(this.#portal.host, {
          childList: true,
          subtree: true,
          characterData: true,
          attributes: true,
          attributeFilter: [
            'slot',
            'disabled',
            'aria-disabled',
            'aria-label',
            'hidden',
            'inert',
            'id',
          ],
        });
      }
    } else this.#portal.clear();
    const relocated = previousRoot !== this.#portal.root;
    if (relocated && this.#active) this.#deactivate(false, false);
    if (changed.has('handle')) {
      this.#handleCleanup?.();
      this.#handleCleanup = this.handle?.attach(this);
    }
    this.#syncParts();
    if (this.open && !this.#active) this.#activate();
    else if (!this.open && this.#active) this.#deactivate(this.#restoreOnClose);
    else if (
      this.open &&
      (this.#activeModality !== this.#resolved.modality ||
        this.#activeScope !== this.#resolved.scope)
    )
      this.#applyModality();
    if (!this.open && this.previewPresent && this.#layer) {
      const overlay = this.surfaceRoot.querySelector<HTMLElement>('.overlay');
      this.#layer.setAttribute('open', '');
      if (!this.#contained) {
        if (this.#resolved.modality === 'modal' && overlay && !overlay.matches(':popover-open'))
          overlay.showPopover();
        if (!this.#layer.matches(':popover-open')) this.#layer.showPopover();
      }
    } else if (!this.open && this.#presence.state !== 'ending') {
      hidePopover(this.surfaceRoot.querySelector<HTMLElement>('.overlay'));
      hidePopover(this.#layer);
      this.#layer?.removeAttribute('open');
    }
    this.#syncMotion();
    this.#markers();
    if (this.#focusPending && this.open) {
      this.#focusPending = false;
      if (!(
        relocated &&
        previousFocus &&
        this.#content &&
        composedContains(this.#content, previousFocus) &&
        restoreFocus(previousFocus)
      )) {
        this.#initialFocus();
        // A newly connected composed control may not have rendered its native
        // focus target yet. Retry only while focus remains on our fallback.
        const content = this.#content;
        void Promise.all(
          this.ownedChildren.map((node) =>
            'updateComplete' in node ? node.updateComplete : undefined,
          ),
        ).then(() => {
          if (
            this.isConnected &&
            this.open &&
            this.dismissController.isTopmost &&
            content === this.#content &&
            deepActiveElement(this.ownerDocument) === content
          )
            this.#initialFocus();
        });
      }
    }
    if (this.open && this.#resolved.modality !== 'non-modal' && this.#content) {
      const active = deepActiveElement(this.ownerDocument);
      if (
        active &&
        composedContains(this.#content, active) &&
        active instanceof HTMLElement &&
        !isAvailable(active)
      )
        this.#initialFocus();
    }
  }
  #assigned(name: string): HTMLElement | null {
    return (
      (this.ownedChildren.find(
        (element) => element instanceof HTMLElement && element.getAttribute('slot') === name,
      ) as HTMLElement | undefined) ?? null
    );
  }
  protected projectSurfaceNode(node: Node): boolean {
    return !(node instanceof Element) || node.getAttribute('slot') !== 'trigger';
  }
  protected renderBody(): unknown {
    return html`<slot @slotchange=${this.#syncParts}></slot>`;
  }
  protected hasBodyContent(): boolean {
    return this.ownedChildren.some((node) =>
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
    const corner = this.surfaceRoot.querySelector<HTMLElement>('.corner-close');
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
  protected triggerControlsTarget(): HTMLElement {
    return this.#portal.host ?? this;
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
    let appliedControls: readonly Element[] = [];
    const restore = (): void => {
      if (!target) return;
      for (const [name, value] of original)
        if (target.getAttribute(name) === applied.get(name)) {
          if (value === null) target.removeAttribute(name);
          else target.setAttribute(name, value);
        }
      if (
        target.getAttribute('aria-controls') === '' &&
        (target.ariaControlsElements ?? []).length === appliedControls.length &&
        (target.ariaControlsElements ?? []).every(
          (element, index) => element === appliedControls[index],
        )
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
      target.ariaControlsElements = [
        ...new Set([...(controls ?? []), this.triggerControlsTarget()]),
      ];
      appliedControls = target.ariaControlsElements ?? [];
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
      'close-watcher',
      ...(this.partPrefix === 'drawer' ? ['swipe'] : []),
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
      this.requestSurfaceChange(false, 'imperative-action', undefined, undefined, () => {
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
  protected requestSurfaceChange(
    open: boolean,
    reason: ChangeReason,
    sourceEvent?: Event,
    trigger?: HTMLElement,
    accept?: () => void,
  ): void {
    this.#state.request(open, reason, sourceEvent, trigger, accept);
  }
  #request(
    open: boolean,
    reason: ChangeReason,
    event?: Event,
    trigger?: HTMLElement,
    payload?: unknown,
  ): void {
    const previous = deepActiveElement(this.ownerDocument);
    this.requestSurfaceChange(
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
            this.#openingEvent = event;
            if (!this.#active) this.#previousFocus = previous;
            this.requestUpdate();
          }
        : () => {
            this.#restoreOnClose =
              reason !== 'focus-outside' &&
              (reason !== 'outside-press' || isolatingModality(this.#resolved.modality));
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
      if (node instanceof TpDialog || logicalPortalOwner(node) instanceof TpDialog) {
        this.#parent = node instanceof TpDialog ? node : (logicalPortalOwner(node) as TpDialog);
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
    this.ownerDocument.addEventListener('focusout', this.#focusOut);
    this.addEventListener('click', this.#cancelAction);
  }
  #applyModality(): void {
    const layer = this.#layer;
    if (!layer) return;
    const active = deepActiveElement(this.ownerDocument);
    this.#scrollCleanup?.();
    this.#scrollCleanup = undefined;
    this.#inertCleanup?.();
    this.#inertCleanup = undefined;
    const overlay = this.surfaceRoot.querySelector<HTMLElement>('.overlay');
    hidePopover(layer);
    hidePopover(overlay);
    const { modality, scope } = this.#resolved;
    this.#activeModality = modality;
    this.#activeScope = scope;
    if (modality === 'modal') {
      if ((!this.#parent || this.forceRender) && overlay) overlay.showPopover();
      this.#scrollCleanup = acquireScrollLock(this.ownerDocument);
    }
    layer.setAttribute('open', '');
    // Container modality keeps the layer in the container's flat tree: it stays clipped to and
    // visible within the container, including while the container is fullscreen.
    if (modality !== 'container') {
      layer.setAttribute('popover', 'manual');
      layer.showPopover();
    }
    if (isolatingModality(modality))
      this.#inertCleanup = acquireOutsideInert(
        this.ownerDocument,
        () => [
          layer,
          ...(overlay ? [overlay] : []),
          ...this.dismissController.branchElements.filter(
            (element): element is HTMLElement =>
              element instanceof HTMLElement && element !== this && element !== this.#activeTrigger,
          ),
        ],
        { scope },
      );
    if (active && this.#content && composedContains(this.#content, active)) restoreFocus(active);
  }
  #deactivate(restore: boolean, closeChildren = true): void {
    if (!this.#active) return;
    this.#active = false;
    this.ownerDocument.removeEventListener('focusin', this.#focusIn);
    this.ownerDocument.removeEventListener('focusout', this.#focusOut);
    this.removeEventListener('click', this.#cancelAction);
    if (closeChildren) {
      for (const child of this.#children) child.close();
      this.#children.clear();
    }
    this.#treeCleanup?.();
    this.#treeCleanup = undefined;
    this.#scrollCleanup?.();
    this.#scrollCleanup = undefined;
    this.#inertCleanup?.();
    this.#inertCleanup = undefined;
    // Keep the common top layer alive only for an actual exit animation.
    if (this.#layer?.matches(':popover-open') && this.#presence.state !== 'ending')
      this.#layer.hidePopover();
    // Container modality: focus the user already moved outside the container stays there.
    // Focus that fell back to the body (removed content) is still restored.
    const scope = this.#activeModality === 'container' ? this.#activeScope : null;
    const current = deepActiveElement(this.ownerDocument);
    const focusLeftScope = Boolean(
      scope &&
      current &&
      current !== this.ownerDocument.body &&
      !composedScopeContains(scope, current),
    );
    this.#activeModality = undefined;
    this.#activeScope = null;
    const restoring = restore && !focusLeftScope;
    if (restoring && this.finalFocus === false) {
      const body = this.ownerDocument.body;
      const tabIndex = body.getAttribute('tabindex');
      body.tabIndex = -1;
      body.focus({ preventScroll: true });
      if (tabIndex === null) body.removeAttribute('tabindex');
      else body.setAttribute('tabindex', tabIndex);
    }
    if (restoring && this.finalFocus !== false) {
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
    const interaction = surfaceInteraction(this.#openingEvent);
    const resolved =
      typeof this.initialFocus === 'function' ? this.initialFocus(interaction) : this.initialFocus;
    // Touch opening focuses the Popup rather than its first control, so the on-screen
    // keyboard and autofill suggestions do not open unasked (Foundation Dialog default).
    const policy =
      resolved === 'first' && typeof this.initialFocus !== 'function' && interaction === 'touch'
        ? 'popup'
        : resolved;
    const named =
      policy instanceof HTMLElement
        ? policy
        : policy === 'popup'
          ? content
          : policy === 'cancel' || policy === 'confirm'
            ? this.#assigned(policy)
            : [
                ...this.querySelectorAll<HTMLElement>('[id]'),
                ...(this.#portal.host?.querySelectorAll<HTMLElement>('[id]') ?? []),
              ].find((element) => element.id === policy);
    const target = named ? this.#actionTarget(named) : null;
    if (target && composedContains(content, target) && isAvailable(target))
      target.focus({ preventScroll: true });
    else (focusableElements(content)[0] ?? content).focus({ preventScroll: true });
  }
  #key = (event: KeyboardEvent): void => {
    if (
      !this.open ||
      !this.dismissController.isTopmost ||
      this.#resolved.modality === 'non-modal' ||
      event.defaultPrevented
    )
      return;
    if (event.key === 'Tab' && this.#content) trapTabKey(event, this.#content);
  };
  // Modal and container modes never pull focus back from an outside element (Base UI parity):
  // Tab trapping and outside inertness contain focus, so an overlay another owner adds, such as
  // an autofill menu, stays usable. Only non-modal mode reacts, by closing.
  #focusIn = (event: FocusEvent): void => {
    if (
      !this.open ||
      !this.dismissController.isTopmost ||
      !this.#content ||
      this.#activeModality !== 'non-modal' ||
      this.#activeModality !== this.#resolved.modality
    )
      return;
    const active = deepActiveElement(this.ownerDocument);
    if (composedContains(this.#content, active)) return;
    if (!composedContains(this.#activeTrigger ?? this, active) && this.closeOnOutsideInteraction)
      this.setOpen(false, 'focus-outside', event);
  };
  #focusOut = (event: FocusEvent): void => {
    const content = this.#content;
    if (!this.open || !content || this.#activeModality === 'non-modal') return;
    if (!composedContains(content, event.composedPath()[0] as Node)) return;
    restoreLostFocus(event, content, 'popup');
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
    if (!this.#content || !this.dismissController.isTopmost) return;
    const bounds = this.#content.getBoundingClientRect();
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
    const overlay = this.surfaceRoot.querySelector<HTMLElement>('.overlay');
    if (overlay) overlay.hidden = this.#overlayHidden;
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
