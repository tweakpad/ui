import { GeneratedStyleResource } from '../../foundation/generated-style.js';
import { setLogicalPortalOwner } from '../../foundation/portal-ownership.js';
import { css, html, nothing } from 'lit';
import type { PropertyValues } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { TpElement } from '../../foundation/element.js';
import { CleanupScope } from '../../foundation/services.js';
import {
  composedContains,
  deepActiveElement,
  focusableElements,
  restoreFocus,
} from '../../foundation/focus.js';
import { createId } from '../../foundation/id.js';
import { mergePartProperties, renderPart } from '../../foundation/part.js';
import { resolvesReducedMotion } from '../../foundation/motion.js';
import {
  positionSurface,
  themeSpacing,
  resolveSide,
  type PositioningResult,
  type Placement,
} from '../../foundation/positioning.js';
import { xIcon } from '../../icons/x.js';
import { ToastManager } from './manager.js';
import { ToastProvider } from './provider.js';
import { ToastView } from './view.js';
import { ToastGesture, type ToastGestureOutput } from './gesture.js';
import { toastTypeIcons } from './type-icons.js';
import type {
  ToastCause,
  ToastObject,
  ToastOptions,
  ToastPosition,
  ToastSwipeDirection,
} from './types.js';
import { toastPresentation } from '../../presentation/families/toast.js';
import { TpSpinner } from '../spinner/spinner.js';
import { TpIcon } from '../icon.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';
import { TpButton } from '../button.js';

/** Portal/viewport binding to the single logical Provider and notification manager. */
export class TpToast extends TpElement {
  static tagName = 'tp-toast';
  /** Library elements this element renders; defining it defines them too. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpSpinner, TpIcon, TpButton];
  }
  static override presentation = toastPresentation;
  static override properties = {
    ...TpElement.properties,
    toastManager: { attribute: false },
    timeout: { type: Number },
    limit: { type: Number },
    maximumVisible: { type: Number, attribute: 'maximum-visible', noAccessor: true },
    duration: {
      attribute: 'duration',
      noAccessor: true,
      converter: {
        fromAttribute: (value: string | null) =>
          value === 'persistent' ? 'persistent' : value === null ? undefined : Number(value),
      },
    },
    priority: { type: String, reflect: true },
    position: { type: String, reflect: true },
    swipeDirections: {
      attribute: 'swipe-directions',
      converter: {
        fromAttribute: (value: string | null) =>
          value === null
            ? ['down', 'right']
            : value
                .trim()
                .split(/[\s,]+/)
                .filter(Boolean),
      },
    },
    container: { attribute: false },
    label: { type: String },
    dismissible: { type: Boolean },
    showIcon: { type: Boolean, attribute: 'show-icon' },
    open: { type: Boolean, reflect: true },
    title: { type: String },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host,
      .portal {
        display: contents;
      }

      .viewport {
        position: fixed;
        inset: auto;
        margin: 0;
        padding: 0;
        border: 0;
        background: transparent;
        color: inherit;
        overflow: visible;
        inline-size: min(calc(var(--tp-spacing) * 120), calc(100vw - var(--tp-space-4) * 2));
        max-block-size: calc(100dvh - var(--tp-space-4) * 2);
        block-size: var(--tp-toast-frontmost-height, 0);
        pointer-events: none;
      }

      .viewport[data-block='end'] {
        inset-block-end: var(--tp-space-4);
      }

      .viewport[data-block='start'] {
        inset-block-start: var(--tp-space-4);
      }

      .viewport[data-inline='end'] {
        inset-inline-end: var(--tp-space-4);
      }

      .viewport[data-inline='start'] {
        inset-inline-start: var(--tp-space-4);
      }

      .viewport[data-inline='center'] {
        inset-inline-start: 50%;
        translate: -50% 0;
      }

      .toast {
        position: absolute;
        inset-inline: 0;
        inline-size: 100%;
        pointer-events: auto;
        touch-action: pan-y;
        overflow-wrap: anywhere;
        z-index: calc(1000 - var(--tp-toast-index));
      }

      .viewport[data-block='end'] .toast {
        inset-block-end: 0;
        transform-origin: center bottom;
      }

      .viewport[data-block='start'] .toast {
        inset-block-start: 0;
        transform-origin: center top;
      }

      .toast::after {
        position: absolute;
        inset-inline: 0;
        block-size: var(--tp-space-3);
        content: '';
      }

      .viewport[data-block='end'] .toast::after {
        inset-block-start: 100%;
      }

      .viewport[data-block='start'] .toast::after {
        inset-block-end: 100%;
      }

      .toast[data-limited],
      .toast[data-ending-style] {
        pointer-events: none;
      }

      .toast[data-swiping] {
        transition: none !important;
      }

      .content {
        display: flex;
        align-items: center;
        min-inline-size: 0;
      }

      .message {
        display: flex;
        flex-direction: column;
        flex: 1 1 auto;
        min-inline-size: 0;
      }

      .action,
      .close,
      .icon {
        flex: none;
      }

      .anchored {
        position: fixed;
        inset: auto;
        inline-size: max-content;
        max-inline-size: var(--tp-available-width);
      }

      .anchored:not([data-positioned]),
      .anchored[data-anchor-hidden] {
        visibility: hidden;
      }

      .viewport .anchored > .toast {
        position: relative;
        inset: auto;
        inline-size: min(calc(var(--tp-spacing) * 120), calc(100vw - var(--tp-space-4) * 2));
        block-size: auto;
      }

      .arrow {
        position: absolute;
        inline-size: var(--tp-space-3);
        block-size: var(--tp-space-3);
        pointer-events: none;
        rotate: 45deg;
        background: inherit;
        border: inherit;
        z-index: -1;
      }

      .arrow[data-side='top'] {
        top: calc(100% - var(--tp-space-3) / 2);
      }

      .arrow[data-side='bottom'] {
        bottom: calc(100% - var(--tp-space-3) / 2);
      }

      .arrow[data-side='left'] {
        left: calc(100% - var(--tp-space-3) / 2);
      }

      .arrow[data-side='right'] {
        right: calc(100% - var(--tp-space-3) / 2);
      }

      [hidden] {
        display: none !important;
      }
    `,
  ];
  toastManager: ToastManager | undefined;
  timeout = 5000;
  limit = 3;
  priority: 'polite' | 'assertive' = 'polite';
  position: ToastPosition = 'block-end inline-end';
  swipeDirections: readonly ToastSwipeDirection[] = ['down', 'right'];
  container: HTMLElement | ShadowRoot | null = null;
  label = 'Notifications';
  dismissible = true;
  showIcon = true;
  open = false;
  title = '';
  readonly #legacyIdentifier = createId('tp-toast-content');
  #provider: ToastProvider | null = null;
  #ownedManager = new ToastManager();
  #unsubscribe: (() => void) | null = null;
  #scope: CleanupScope | null = null;
  #views = new Map<string, ToastView>();
  #gestures = new Map<string, ToastGesture>();
  #outputs = new Map<string, ToastGestureOutput>();
  #parts = new Map<HTMLElement, () => void>();
  #viewport: HTMLElement | null = null;
  #portalParent: HTMLElement | null = null;
  #portalStyles: GeneratedStyleResource | null = null;
  #portalTheme: HTMLDivElement | null = null;
  #observer: MutationObserver | null = null;
  #themeObserver: MutationObserver | null = null;
  #returnFocus: Element | null = null;
  #hovered = false;
  #focused = false;
  #lastAnnouncements = new Map<string, string>();
  #announcements: { identifier: string; priority: 'low' | 'high'; text: string }[] = [];
  #announcementClear: number | undefined;
  #legacyCreated = false;
  #warnings = new Set<string>();
  get duration(): number | 'persistent' {
    return this.timeout === 0 ? 'persistent' : this.timeout;
  }
  set duration(value: number | 'persistent' | undefined) {
    this.timeout = value === 'persistent' ? 0 : (value ?? 5000);
  }
  get maximumVisible(): number {
    return this.limit;
  }
  set maximumVisible(value: number) {
    this.limit = value;
  }
  get manager(): ToastManager {
    return this.#provider?.manager ?? this.toastManager ?? this.#ownedManager;
  }
  get provider(): ToastProvider | null {
    return this.#provider;
  }
  /** Notification creation convenience; identical service model and lifecycle. */
  add(options: ToastOptions): string {
    return this.manager.add(options);
  }
  close(identifier?: string, cause: ToastCause = 'programmatic'): void {
    this.manager.close(identifier, cause);
  }
  setOpen(open: boolean): void {
    this.open = open;
  }
  override connectedCallback(): void {
    super.connectedCallback();
    this.#connectProvider();
    const scope = (this.#scope = new CleanupScope());
    scope.listen(this.ownerDocument.defaultView ?? this.ownerDocument, 'keydown', this.#shortcut);
    const media = this.ownerDocument.defaultView?.matchMedia('(prefers-reduced-motion: reduce)');
    if (media)
      scope.listen(media, 'change', () => {
        this.#inheritPortalTheme();
        this.requestUpdate();
      });
    this.#observer = new MutationObserver(() => {
      for (const [identifier, view] of this.#views) {
        if (
          view.element &&
          !view.element.isConnected &&
          this.manager.toasts.some((toast) => toast.identifier === identifier)
        )
          this.manager.remove(identifier, view.toast.lifecycleKey);
      }
    });
    this.#themeObserver = new MutationObserver((records) => {
      if (
        records.some((record) => record.target instanceof Element && record.target.contains(this))
      )
        this.#inheritPortalTheme();
    });
    this.#themeObserver.observe(this.ownerDocument.documentElement, {
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'data-theme', 'dir', 'motion-policy'],
    });
  }
  override disconnectedCallback(): void {
    this.#scope?.dispose();
    this.#scope = null;
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    this.#observer?.disconnect();
    this.#themeObserver?.disconnect();
    for (const gesture of this.#gestures.values()) gesture.reset();
    this.#gestures.clear();
    this.#outputs.clear();
    for (const view of this.#views.values()) view.destroy();
    this.#views.clear();
    for (const cleanup of this.#parts.values()) cleanup();
    this.#parts.clear();
    if (this.#announcementClear !== undefined)
      this.ownerDocument.defaultView?.clearTimeout(this.#announcementClear);
    this.#announcements = [];
    this.#lastAnnouncements.clear();
    this.#restorePortal();
    this.#provider?.destroy();
    this.#provider = null;
    this.#legacyCreated = false;
    this.#hovered = this.#focused = false;
    this.#returnFocus = null;
    super.disconnectedCallback();
  }
  #connectProvider(): void {
    const manager = this.toastManager ?? this.#ownedManager;
    if (this.#provider?.manager === manager) return;
    this.#unsubscribe?.();
    this.#provider?.destroy();
    for (const view of this.#views.values()) view.destroy();
    this.#views.clear();
    this.#legacyCreated = false;
    this.#provider = new ToastProvider({
      toastManager: manager,
      timeout: this.timeout,
      limit: this.limit,
      diagnostic: this.#diagnostic,
    });
    this.#provider.connect(this.ownerDocument);
    this.#unsubscribe = manager.subscribe(this.#queueChanged);
  }
  #queueChanged = (toasts: readonly ToastObject[]): void => {
    const previouslyFocused = deepActiveElement(this.ownerDocument);
    const closingFocused = [...this.#views.values()].some(
      (view) =>
        view.element &&
        composedContains(view.element, previouslyFocused) &&
        toasts.find((toast) => toast.identifier === view.toast.identifier)?.transitionStatus ===
          'ending',
    );
    for (const toast of toasts) {
      const view = this.#views.get(toast.identifier);
      if (view) view.sync(toast);
      else
        this.#views.set(
          toast.identifier,
          new ToastView(this, toast, this.manager, () => this.requestUpdate()),
        );
      if (toast.transitionStatus !== 'ending') this.#announce(toast);
    }
    for (const [identifier, view] of this.#views) {
      if (!toasts.some((toast) => toast.identifier === identifier)) {
        view.destroy();
        this.#views.delete(identifier);
        this.#gestures.get(identifier)?.reset();
        this.#gestures.delete(identifier);
        this.#outputs.delete(identifier);
        this.#lastAnnouncements.delete(identifier);
      }
    }
    if (closingFocused) {
      const next = toasts.find((toast) => toast.transitionStatus !== 'ending' && !toast.limited);
      if (!next || !restoreFocus(next.elementReference)) restoreFocus(this.#returnFocus);
    }
    if (
      this.#legacyCreated &&
      !toasts.some(
        (toast) =>
          toast.identifier === this.#legacyIdentifier && toast.transitionStatus !== 'ending',
      )
    )
      this.open = false;
    this.requestUpdate();
    this.emit('tp-toast-queue-change', { toasts });
  };
  #announce(toast: ToastObject): void {
    const text = [this.#messageText(toast.title), this.#messageText(toast.description)]
      .filter(Boolean)
      .join('. ');
    if (!text || this.#lastAnnouncements.get(toast.identifier) === text) return;
    this.#lastAnnouncements.set(toast.identifier, text);
    this.#announcements = [
      ...this.#announcements.filter((item) => item.identifier !== toast.identifier),
      { identifier: toast.identifier, priority: toast.priority ?? 'low', text },
    ];
    if (this.#announcementClear !== undefined)
      this.ownerDocument.defaultView?.clearTimeout(this.#announcementClear);
    this.#announcementClear = this.ownerDocument.defaultView?.setTimeout(() => {
      this.#announcements = [];
      this.requestUpdate();
    }, 2000);
    this.requestUpdate();
  }
  #messageText(content: unknown): string {
    if (typeof content === 'string' || typeof content === 'number') return String(content).trim();
    if (content instanceof Node) return content.textContent?.trim() ?? '';
    if (Array.isArray(content))
      return content
        .map((value) => this.#messageText(value))
        .filter(Boolean)
        .join(' ');
    return '';
  }
  #shortcut = (event: KeyboardEvent): void => {
    if (
      event.defaultPrevented ||
      event.key !== 'F6' ||
      !this.manager.toasts.some((toast) => !toast.limited && toast.transitionStatus !== 'ending') ||
      !this.#viewport
    )
      return;
    if (composedContains(this.#viewport, deepActiveElement(this.ownerDocument))) return;
    event.preventDefault();
    this.#returnFocus = deepActiveElement(this.ownerDocument);
    this.#viewport.focus({ preventScroll: true });
  };
  #focusIn = (): void => {
    if (!this.#focused && !this.#returnFocus)
      this.#returnFocus = deepActiveElement(this.ownerDocument);
    this.#focused = true;
    this.manager.pause('focus');
    this.requestUpdate();
  };
  #focusOut = (event: FocusEvent): void => {
    if (this.#viewport && composedContains(this.#viewport, event.relatedTarget as Node | null))
      return;
    this.#focused = false;
    this.manager.resume('focus');
    this.requestUpdate();
  };
  #pointerEnter = (event: PointerEvent): void => {
    if (event.pointerType === 'touch') return;
    this.#hovered = true;
    this.manager.pause('hover');
    this.requestUpdate();
  };
  #pointerLeave = (event: PointerEvent): void => {
    if (event.pointerType === 'touch') return;
    this.#hovered = false;
    if (![...this.#outputs.values()].some((output) => output.swiping)) this.manager.resume('hover');
    this.requestUpdate();
  };
  #keyDown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || !this.#viewport) return;
    const active = deepActiveElement(this.ownerDocument);
    if (event.key === 'Tab') {
      const items = focusableElements(this.#viewport);
      const index = items.indexOf(active as HTMLElement);
      if (
        (active === this.#viewport && event.shiftKey) ||
        (event.shiftKey && index === 0) ||
        (!event.shiftKey && index === items.length - 1)
      ) {
        if (restoreFocus(this.#returnFocus)) event.preventDefault();
      }
    }
    if (event.key === 'Escape') {
      // A nested floating owner can consume Escape; only direct Toast contents close here.
      const path = event.composedPath();
      if (
        path.some(
          (node) =>
            node instanceof Element &&
            node !== this &&
            ((node.matches('tp-dialog,tp-alert-dialog,tp-popover,tp-menu,tp-select') &&
              Boolean((node as HTMLElement & { open?: boolean }).open)) ||
              node.matches(':popover-open')) &&
            node !== this.#viewport,
        )
      )
        return;
      const element = path.find(
        (node) => node instanceof HTMLElement && node.dataset.toastIdentifier,
      ) as HTMLElement | undefined;
      if (element) {
        event.preventDefault();
        this.manager.close(element.dataset.toastIdentifier, 'close-action');
      }
    }
  };
  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    if (!this.isConnected) return;
    if (changed.has('toastManager')) this.#connectProvider();
    this.#provider?.configure({ timeout: this.timeout, limit: this.limit });
    if (this.open && (!this.#legacyCreated || changed.has('open'))) {
      this.#legacyCreated = true;
      this.manager.add({
        identifier: this.#legacyIdentifier,
        title: this.title || undefined,
        timeout: this.timeout,
        priority: this.priority === 'assertive' ? 'high' : 'low',
        dismissible: this.dismissible,
      });
    } else if (!this.open && changed.has('open') && this.#legacyCreated)
      this.manager.close(this.#legacyIdentifier);
    else if (
      this.open &&
      (changed.has('title') || changed.has('priority') || changed.has('timeout'))
    )
      this.manager.update(this.#legacyIdentifier, {
        title: this.title || undefined,
        timeout: this.timeout,
        priority: this.priority === 'assertive' ? 'high' : 'low',
      });
  }
  protected override render() {
    const expanded =
      this.#hovered ||
      this.#focused ||
      [...this.#outputs.values()].some((output) => output.swiping);
    const toasts = this.manager.toasts;
    const frontmost = toasts.find((toast) => !toast.limited && toast.transitionStatus !== 'ending');
    const [block, inline] = this.position.split(' ');
    const state = {
      expanded,
      toasts,
      frontmostHeight: frontmost?.height ?? 0,
      position: this.position,
    };
    const announcements = html` <div
        class="visually-hidden"
        aria-live="polite"
        aria-atomic="false"
        aria-relevant="additions text"
      >
        ${repeat(
          this.#announcements.filter((item) => item.priority === 'low'),
          (item) => item.identifier,
          (item) => html`<div>${item.text}</div>`,
        )}
      </div>
      <div
        class="visually-hidden"
        aria-live="assertive"
        aria-atomic="false"
        aria-relevant="additions text"
      >
        ${repeat(
          this.#announcements.filter((item) => item.priority === 'high'),
          (item) => item.identifier,
          (item) => html`<div>${item.text}</div>`,
        )}
      </div>`;
    return this.renderPart('toast', state, {
      properties: { class: 'portal', part: 'toast' },
      content: this.renderPart('toast-viewport', state, {
        tag: 'section',
        properties: {
          class: 'viewport',
          part: 'toast-viewport',
          popover: this.container?.isConnected ? null : 'manual',
          tabindex: '-1',
          role: 'region',
          'aria-label': this.label || 'Notifications',
          'data-block': block === 'block-start' ? 'start' : 'end',
          'data-inline':
            inline === 'inline-start' ? 'start' : inline === 'center' ? 'center' : 'end',
          'data-expanded': expanded,
          style: {
            '--tp-toast-frontmost-height': `${frontmost?.height ?? 0}px`,
            '--tp-toast-stack-sign': block === 'block-start' ? '1' : '-1',
          },
          '@focusin': this.#focusIn,
          '@focusout': this.#focusOut,
          '@keydown': this.#keyDown,
          '@pointerenter': this.#pointerEnter,
          '@pointerleave': this.#pointerLeave,
        },
        protectedProperties: ['popover'],
        content: html`${repeat(
          toasts,
          (toast) => toast.identifier,
          (toast) => this.#renderToast(toast, expanded),
        )}${announcements}`,
      }),
    });
  }
  #renderToast(toast: ToastObject, expanded: boolean) {
    const active = this.manager.toasts.filter(
      (item) => item.transitionStatus !== 'ending' && !item.positionerProperties?.anchor,
    );
    const index = Math.max(0, active.indexOf(toast));
    const offset = active.slice(0, index).reduce((height, item) => height + item.height, 0);
    const output = this.#outputs.get(toast.identifier);
    const presence = this.#views.get(toast.identifier)?.presence.state;
    const ending = toast.transitionStatus === 'ending';
    const anchored = !!toast.positionerProperties?.anchor;
    const labelId = this.#views.get(toast.identifier)!.labelId;
    const titleId = `${labelId}-title`;
    const descriptionId = `${labelId}-description`;
    const action = toast.actionProperties;
    const hasTitle = toast.title !== undefined && toast.title !== null && toast.title !== '';
    const hasDescription =
      toast.description !== undefined && toast.description !== null && toast.description !== '';
    const state = {
      toast,
      identifier: toast.identifier,
      type: toast.type,
      expanded,
      limited: toast.limited,
      transitionStatus: toast.transitionStatus,
      index,
      offset,
      height: toast.height,
      swiping: output?.swiping ?? false,
      swipeDirection: output?.direction,
      movementX: output?.x ?? 0,
      movementY: output?.y ?? 0,
      progress: output?.progress ?? 0,
      strength: output?.strength ?? 0,
    };
    const icon = toast.icon ?? toastTypeIcons[toast.type ?? ''];
    const actionContent =
      action && Object.hasOwn(action, 'label')
        ? action.label
        : (action?.children ?? action?.content);
    const actionAliases = new Set([
      'label',
      'children',
      'content',
      'elementReference',
      'disabled',
      'nativeAction',
      'href',
      'ariaLabel',
      'onClick',
      'closeOnAction',
    ]);
    const actionHostProperties = Object.fromEntries(
      Object.entries(action ?? {}).filter(([key]) => !actionAliases.has(key)),
    );
    const actionContract = this.partContracts['toast-action'];
    const iconContent =
      toast.type === 'loading'
        ? html`<tp-spinner aria-hidden="true" label=""></tp-spinner>`
        : icon
          ? html`<tp-icon .icon=${icon} size="calc(var(--tp-spacing) * 5)"></tp-icon>`
          : nothing;
    const content = this.renderPart(
      'toast-content',
      { ...state, behind: index > 0 },
      {
        properties: {
          class: 'content',
          part: 'toast-content',
          'data-expanded': expanded,
          'data-behind': index > 0,
        },
        content: html`
          ${this.renderPart('toast-icon', state, {
            enabled: this.showIcon && (toast.type === 'loading' || !!icon),
            properties: {
              class: 'icon',
              part: 'toast-icon',
              'aria-hidden': 'true',
              'data-type': toast.type ?? '',
            },
            content: iconContent,
          })}
          <div class="message">
            ${this.renderPart('toast-title', state, { enabled: hasTitle, properties: { part: 'toast-title', id: titleId, 'data-type': toast.type ?? '' }, protectedProperties: ['id'], content: toast.title })}
            ${this.renderPart('toast-description', state, { enabled: hasDescription, properties: { part: 'toast-description', id: descriptionId, 'data-type': toast.type ?? '' }, protectedProperties: ['id'], content: toast.description })}
            ${toast.identifier === this.#legacyIdentifier ? html`<div part="toast-description" id=${`${descriptionId}-content`}><slot @slotchange=${this.#legacySlotChanged}></slot></div>` : nothing}
          </div>
          ${renderPart(
            'toast-action',
            state,
            {
              ...actionContract,
              hostProperties: mergePartProperties(
                actionHostProperties,
                actionContract?.hostProperties,
              ),
            },
            {
              enabled:
                actionContent !== undefined && actionContent !== null && actionContent !== '',
              tag: 'tp-button',
              properties: {
                class: 'action',
                part: 'toast-action',
                role: undefined,
                variant: 'outline',
                size: 'sm',
                type: 'button',
                'data-type': toast.type ?? '',
                '.disabled': action?.disabled ?? false,
                '.nativeAction': action?.nativeAction ?? true,
                '.href': action?.href ?? null,
                '.ariaLabel': action?.ariaLabel ?? '',
                '@click': (event: Event) => {
                  if (action?.disabled) return;
                  action?.onClick?.(event);
                  if (!event.defaultPrevented && action?.closeOnAction)
                    this.manager.close(toast.identifier, 'action');
                },
              },
              ...(action?.elementReference ? { reference: action.elementReference } : {}),
              content: actionContent,
            },
          )}
          ${this.renderPart('toast-close', state, {
            enabled: this.dismissible && toast.dismissible !== false,
            tag: 'tp-button',
            properties: {
              class: 'close',
              part: 'toast-close',
              variant: 'ghost',
              size: 'icon-sm',
              type: 'button',
              'aria-label': 'Close toast',
              '.icon': xIcon,
              'data-type': toast.type ?? '',
              '@click': () => this.manager.close(toast.identifier, 'close-action'),
            },
          })}
        `,
      },
    );
    const root = this.renderPart('toast-toast', state, {
      properties: {
        class: 'toast',
        part: 'toast-toast',
        'data-toast-identifier': toast.identifier,
        role: toast.priority === 'high' ? 'alertdialog' : 'dialog',
        'aria-modal': 'false',
        'aria-label': hasTitle || hasDescription ? undefined : 'Notification',
        'aria-labelledby': hasTitle ? titleId : hasDescription ? descriptionId : undefined,
        'aria-describedby': hasTitle && hasDescription ? descriptionId : undefined,
        tabindex: toast.limited || ending ? '-1' : '0',
        '.inert': toast.limited || ending,
        'data-limited': toast.limited,
        'data-expanded': expanded,
        'data-starting-style': presence === 'starting',
        'data-ending-style': ending,
        'data-type': toast.type ?? '',
        'data-swiping': output?.swiping ?? false,
        'data-swipe-direction': output?.direction,
        style: {
          '--tp-toast-index': String(index),
          '--tp-toast-offset-y': `${offset}px`,
          '--tp-toast-height': `${toast.height}px`,
          '--tp-toast-swipe-movement-x': `${output?.x ?? 0}px`,
          '--tp-toast-swipe-movement-y': `${output?.y ?? 0}px`,
          '--tp-swipe-movement-x': `${output?.x ?? 0}px`,
          '--tp-swipe-movement-y': `${output?.y ?? 0}px`,
          '--tp-swipe-progress': String(output?.progress ?? 0),
          '--tp-swipe-strength': String(output?.strength ?? 0),
        },
        '@pointerdown': (event: PointerEvent) =>
          this.#gesture(toast).start(
            event,
            event.currentTarget as HTMLElement,
            toast.swipeDirections ?? this.swipeDirections,
          ),
        '@pointermove': (event: PointerEvent) => this.#gesture(toast).move(event),
        '@pointerup': (event: PointerEvent) => this.#gesture(toast).end(event),
        '@pointercancel': (event: PointerEvent) => this.#gesture(toast).end(event),
        '@lostpointercapture': (event: PointerEvent) => this.#gesture(toast).lostCapture(event),
      },
      content: html`${content}${this.renderPart('arrow', state, { enabled: anchored && !!toast.positionerProperties?.showArrow, properties: { class: 'arrow', 'aria-hidden': 'true' } })}`,
    });
    return this.renderPart('positioner', state, {
      properties: {
        class: anchored ? 'anchored' : 'stacked',
        'data-toast-positioner': toast.identifier,
      },
      content: root,
    });
  }
  #gesture(toast: ToastObject): ToastGesture {
    let gesture = this.#gestures.get(toast.identifier);
    if (!gesture) {
      gesture = new ToastGesture(
        (output) => {
          this.#outputs.set(toast.identifier, output);
          if (output.swiping) this.manager.pause(`swipe:${toast.identifier}`);
          else this.manager.resume(`swipe:${toast.identifier}`);
          if (!output.swiping && !this.#hovered) this.manager.resume('hover');
          this.requestUpdate();
        },
        () => this.manager.close(toast.identifier, 'swipe'),
      );
      this.#gestures.set(toast.identifier, gesture);
    }
    return gesture;
  }
  #legacySlotChanged = (): void => {
    const slot = this.renderRoot.querySelector<HTMLSlotElement>('slot');
    const text = slot
      ?.assignedNodes({ flatten: true })
      .map((node) => node.textContent ?? '')
      .join(' ')
      .trim();
    const toast = this.manager.toasts.find(
      (toast) => toast.identifier === this.#legacyIdentifier && toast.transitionStatus !== 'ending',
    );
    if (text && toast) this.#announce({ ...toast, description: text });
  };
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (!this.isConnected) return;
    this.#observer?.disconnect();
    const viewport =
      this.renderRoot.querySelector<HTMLElement>('.viewport') ??
      this.#portalTheme?.shadowRoot?.querySelector<HTMLElement>('.viewport') ??
      null;
    if (viewport !== this.#viewport) {
      const previous = this.#viewport;
      this.#restorePortal();
      if (previous && previous !== viewport) previous.remove();
      this.#viewport = viewport;
      this.#portalParent = viewport?.parentElement ?? null;
    }
    if (!this.#viewport) return;
    this.#portalParent ??= this.#viewport.parentElement;
    if (changed.has('container') || (this.container && !this.#portalTheme)) this.#mountPortal();
    this.#inheritPortalTheme();
    if (!this.container && this.manager.toasts.length && !this.#viewport.matches(':popover-open'))
      this.#viewport.showPopover();
    if (!this.manager.toasts.length && this.#viewport.matches(':popover-open'))
      this.#viewport.hidePopover();
    for (const toast of this.manager.toasts) {
      const element = [
        ...this.#viewport.querySelectorAll<HTMLElement>('[data-toast-identifier]'),
      ].find((element) => element.dataset.toastIdentifier === toast.identifier);
      const view = this.#views.get(toast.identifier);
      if (!element || !view) continue;
      view.rendered(element);
      const content = element.querySelector<HTMLElement>('.content');
      if (content && !view.observer) {
        const Resize = this.ownerDocument.defaultView?.ResizeObserver;
        if (Resize) {
          view.observer = new Resize(() =>
            this.manager.measure(toast.identifier, content.offsetHeight, element),
          );
          view.observer.observe(content);
        }
      }
      // The observer's first callback measures after layout; measuring here would publish
      // a height that repaints within this update.
      if (content && !view.observer)
        this.manager.measure(toast.identifier, content.offsetHeight, element);
      if (toast.positionerProperties?.anchor) this.#position(view, element);
      else if (view.positioner) {
        view.positioner.destroy();
        view.positioner = null;
        view.positioningKey = undefined;
      }
      // Templates announce their rendered text through the same deduplicated channel.
      if (toast.identifier !== this.#legacyIdentifier && toast.transitionStatus !== 'ending') {
        const title = element.querySelector('[part~="toast-title"]')?.textContent ?? '';
        const description = element.querySelector('[part~="toast-description"]')?.textContent ?? '';
        this.#announce({ ...toast, title, description });
      }
    }
    this.#registerParts();
    this.#observer?.observe(this.#viewport, { subtree: true, childList: true });
  }
  #position(view: ToastView, element: HTMLElement): void {
    const properties = view.toast.positionerProperties!;
    const anchor = properties.anchor;
    if (!anchor?.isConnected) {
      this.manager.close(view.toast.identifier, 'anchor-removed');
      return;
    }
    const wrapper = element.parentElement!;
    if (view.positioningKey === properties && view.positioner) {
      void view.positioner.update();
      return;
    }
    view.positioner?.destroy();
    view.positioningKey = properties;
    view.positioner = positionSurface(anchor, wrapper, {
      placement:
        `${resolveSide(properties.side ?? 'top', anchor)}${properties.align && properties.align !== 'center' ? `-${properties.align}` : ''}` as Placement,
      strategy: properties.positionMethod ?? 'absolute',
      offset: () => ({
        mainAxis: properties.sideOffset ?? themeSpacing(this, 3),
        crossAxis: properties.alignOffset ?? 0,
      }),
      boundary: properties.collisionBoundary ?? 'clipping-ancestors',
      padding: properties.collisionPadding ?? themeSpacing(this, 3),
      collision: properties.collisionAvoidance ?? { side: 'flip', align: 'shift' },
      arrow: element.querySelector('.arrow'),
      arrowPadding: properties.arrowPadding ?? themeSpacing(this, 2),
      sticky: properties.sticky ?? false,
      tracking: properties.disableAnchorTracking
        ? false
        : {
            ancestorScroll: true,
            ancestorResize: true,
            elementResize: true,
            anchorLayoutShift: true,
          },
      constrainSize: true,
      onInvalid: () => this.manager.close(view.toast.identifier, 'anchor-removed'),
      onPosition: (result: PositioningResult) => {
        const [side, alignment = 'center'] = result.placement.split('-');
        wrapper.dataset.side = side!;
        wrapper.dataset.align = alignment;
        const arrow = element.querySelector<HTMLElement>('.arrow');
        if (arrow) {
          arrow.dataset.side = side!;
          arrow.toggleAttribute('data-uncentered', !!result.stageData.arrow?.centerOffset);
        }
      },
    });
  }
  #registerParts(): void {
    if (!this.#viewport) return;
    const parts = new Set<HTMLElement>([
      this.#viewport,
      ...this.#viewport.querySelectorAll<HTMLElement>('[part]'),
    ]);
    for (const [element, cleanup] of this.#parts)
      if (!parts.has(element)) {
        cleanup();
        this.#parts.delete(element);
      }
    for (const element of parts) {
      if (this.#parts.has(element)) continue;
      const name = [...element.part].find((part) => part.startsWith('toast-'));
      if (name) this.#parts.set(element, this.presentationController.registerPart(name, element));
    }
  }
  #mountPortal(): void {
    if (!this.#viewport || !this.#portalParent) return;
    this.#restorePortal();
    if (!this.container) return;
    if (this.container instanceof HTMLElement && !this.container.isConnected) {
      this.#diagnostic(
        'disconnected-container',
        'Toast container must be connected. The default native layer is retained.',
      );
      return;
    }
    if (this.#viewport.matches(':popover-open')) this.#viewport.hidePopover();
    this.#viewport.removeAttribute('popover');
    this.#portalTheme = this.ownerDocument.createElement('div');
    this.#portalTheme.style.display = 'contents';
    setLogicalPortalOwner(this.#portalTheme, this);
    const layerRoot = this.#portalTheme.attachShadow({ mode: 'open' });
    layerRoot.append(this.#viewport);
    this.container.append(this.#portalTheme);
    this.#portalStyles = new GeneratedStyleResource(this, layerRoot);
    this.#portalStyles.setText(
      TpToast.elementStyles
        .map((style) =>
          'cssText' in style
            ? style.cssText
            : [...style.cssRules].map((rule) => rule.cssText).join('\n'),
        )
        .join('\n'),
    );
    this.#inheritPortalTheme();
  }
  #inheritPortalTheme(): void {
    if (!this.container || !this.#portalTheme) return;
    const computed = this.ownerDocument.defaultView?.getComputedStyle(this);
    if (!computed) return;
    for (let index = 0; index < computed.length; index++) {
      const property = computed[index]!;
      if (property.startsWith('--tp-'))
        this.#portalTheme.style.setProperty(property, computed.getPropertyValue(property));
    }
    this.#portalTheme.style.color = computed.color;
    this.#portalTheme.style.fontFamily = computed.fontFamily;
    this.#portalTheme.style.direction = computed.direction;
    this.#portalTheme.setAttribute(
      'motion-policy',
      resolvesReducedMotion(this) ? 'reduce' : 'normal',
    );
  }
  #restorePortal(): void {
    if (this.#viewport && this.#portalParent && this.#viewport.parentElement !== this.#portalParent)
      this.#portalParent.append(this.#viewport);
    this.#viewport?.setAttribute('popover', 'manual');
    this.#portalStyles?.dispose();
    this.#portalStyles = null;
    if (this.#portalTheme) setLogicalPortalOwner(this.#portalTheme, null);
    this.#portalTheme?.remove();
    this.#portalTheme = null;
  }
  #diagnostic = (code: string, message: string): void => {
    if (this.#warnings.has(code)) return;
    this.#warnings.add(code);
    this.emit('tp-diagnostic', { code: `toast-${code}`, message, severity: 'warning' });
  };
}
