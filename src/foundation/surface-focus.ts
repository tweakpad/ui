import { focusableElements } from './focus.js';

export type SurfaceFocusTarget =
  | HTMLElement
  | { current: HTMLElement | null }
  | ((
      interaction: 'mouse' | 'touch' | 'pen' | 'keyboard' | '',
    ) => HTMLElement | boolean | null | void)
  | 'trigger'
  | 'first'
  | 'popup'
  | 'previous'
  | 'none'
  | number
  | boolean;

/** Native keyboard clicks have detail=0 and no pointer type; retain the initiating event. */
export function surfaceInteraction(event?: Event): 'mouse' | 'touch' | 'pen' | 'keyboard' | '' {
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
