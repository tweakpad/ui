import { deepActiveElement, focusableElements } from './focus.js';

/** How a surface was opened; empty when no initiating event is known. */
export type SurfaceInteraction = 'mouse' | 'touch' | 'pen' | 'keyboard' | '';

export type SurfaceFocusTarget =
  | HTMLElement
  | { current: HTMLElement | null }
  | ((interaction: SurfaceInteraction) => HTMLElement | boolean | null | void)
  | 'trigger'
  | 'first'
  | 'popup'
  | 'previous'
  | 'none'
  | number
  | boolean;

/** Native keyboard clicks have detail=0 and no pointer type; retain the initiating event. */
export function surfaceInteraction(event?: Event): SurfaceInteraction {
  if (!event) return '';
  if ('pointerType' in event && ['mouse', 'touch', 'pen'].includes(String(event.pointerType)))
    return event.pointerType as 'mouse' | 'touch' | 'pen';
  if (
    event.type.startsWith('key') ||
    (event.type === 'click' && 'detail' in event && event.detail === 0)
  )
    return 'keyboard';
  return 'mouse';
}

/** Resolve the shared target union; each surface supplies its own default focus policy. */
export function resolveSurfaceFocus(
  target: SurfaceFocusTarget,
  options: {
    event?: Event | undefined;
    defaultTarget: () => HTMLElement | null;
    trigger: HTMLElement | null;
    first: HTMLElement | null;
    popup: HTMLElement | null;
    previous: Element | null;
  },
): HTMLElement | null {
  const event = options.event;
  const interaction = surfaceInteraction(event);
  const resolved =
    typeof target === 'function'
      ? target(interaction)
      : target && typeof target === 'object' && 'current' in target
        ? target.current
        : target;
  if (resolved === false || resolved === 'none' || resolved === undefined) return null;
  if (resolved === true || resolved === null) return options.defaultTarget();
  if (resolved === 'trigger') return options.trigger;
  if (resolved === 'first') return options.first;
  if (resolved === 'popup') return options.popup;
  if (resolved === 'previous') return options.previous as HTMLElement | null;
  if (typeof resolved === 'number')
    return options.popup ? (focusableElements(options.popup)[resolved] ?? null) : null;
  return resolved;
}

/**
 * Base UI `restoreFocus` for a modal surface, called from a focusout inside its Popup. Focus that
 * moves to another element (including third-party overlays such as autofill menus) is never
 * pulled back; containment comes from Tab trapping and outside inertness. Only when the focused
 * inside element was removed or hidden and focus fell to the body is it restored: to the Popup
 * (`popup`), or to the last tabbable item and then the Popup (`previous`, for item surfaces).
 */
export function restoreLostFocus(
  event: FocusEvent,
  popup: HTMLElement,
  mode: 'popup' | 'previous',
): void {
  if (event.relatedTarget) return;
  const target = event.composedPath()[0] as Element | undefined;
  queueMicrotask(() => {
    const document = popup.ownerDocument;
    const active = deepActiveElement(document);
    if (!popup.isConnected || (active && active !== document.body)) return;
    if (target?.isConnected && target.getClientRects().length) return;
    const fallback = mode === 'previous' ? focusableElements(popup).at(-1) : undefined;
    (fallback ?? popup).focus({ preventScroll: true });
  });
}
