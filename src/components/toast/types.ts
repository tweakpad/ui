import type { IconDefinition } from '../../icons/types.js';
import type { ElementReference, HostProperties } from '../../foundation/part.js';
import type {
  Alignment,
  CollisionBoundary,
  CollisionPolicy,
  LogicalSide,
  PositioningStrategy,
} from '../../foundation/positioning.js';

export type ToastCause =
  | 'timeout'
  | 'close-action'
  | 'action'
  | 'swipe'
  | 'programmatic'
  | 'anchor-removed'
  | 'provider-destroyed';
export type ToastPriority = 'low' | 'high';
export type ToastSwipeDirection = 'up' | 'down' | 'left' | 'right';
export type ToastPosition =
  `${'block-start' | 'block-end'} ${'inline-start' | 'center' | 'inline-end'}`;

/** Content accepts Lit templates, text, DOM nodes, and ordinary Lit renderable values. */
export interface ToastActionProperties extends HostProperties {
  label?: unknown;
  /** Native content aliases; an explicitly supplied label remains authoritative. */
  children?: unknown;
  content?: unknown;
  elementReference?: ElementReference;
  disabled?: boolean;
  nativeAction?: boolean;
  href?: string;
  ariaLabel?: string;
  onClick?: (event: Event) => void;
  /** Optional dismissal is explicit; an ordinary action does not close its toast. */
  closeOnAction?: boolean;
}
export interface ToastPositionerProperties {
  anchor: Element | null;
  side?: LogicalSide;
  align?: Alignment;
  sideOffset?: number;
  alignOffset?: number;
  positionMethod?: PositioningStrategy;
  collisionBoundary?: CollisionBoundary;
  collisionPadding?: number | Partial<Record<'top' | 'right' | 'bottom' | 'left', number>>;
  collisionAvoidance?: CollisionPolicy;
  arrowPadding?: number;
  showArrow?: boolean;
  sticky?: boolean;
  disableAnchorTracking?: boolean;
}
export interface ToastOptions<Data extends object = Record<string, unknown>> {
  identifier?: string;
  title?: unknown;
  description?: unknown;
  type?: string;
  timeout?: number;
  priority?: ToastPriority;
  onClose?: (cause: ToastCause) => void;
  onRemove?: (cause: ToastCause) => void;
  actionProperties?: ToastActionProperties;
  positionerProperties?: ToastPositionerProperties;
  data?: Data;
  icon?: IconDefinition;
  dismissible?: boolean;
  swipeDirections?: readonly ToastSwipeDirection[];
}
export type ToastUpdateOptions<Data extends object = Record<string, unknown>> = Omit<
  Partial<ToastOptions<Data>>,
  'identifier' | 'data'
> & { data?: Partial<Data> };
export interface ToastObject<Data extends object = Record<string, unknown>> extends Omit<
  ToastOptions<Data>,
  'identifier'
> {
  readonly identifier: string;
  readonly transitionStatus: 'starting' | 'ending' | undefined;
  readonly updateKey: number;
  readonly limited: boolean;
  readonly height: number;
  readonly elementReference: HTMLElement | null;
  readonly cause: ToastCause | undefined;
  /** Lifecycle identity guards asynchronous work when a closed ID is reused. */
  readonly lifecycleKey: number;
}
export type ToastPromiseState<Data extends object> = string | ToastUpdateOptions<Data>;
export interface ToastPromiseStates<Value, Data extends object = Record<string, unknown>> {
  loading: ToastPromiseState<Data>;
  success: ToastPromiseState<Data> | ((result: Value) => ToastPromiseState<Data>);
  error: ToastPromiseState<Data> | ((error: unknown) => ToastPromiseState<Data>);
}
export interface ToastClock {
  now(): number;
  setTimeout(callback: () => void, duration: number): number;
  clearTimeout(handle: number): void;
}
export interface ToastProviderOptions {
  timeout?: number;
  limit?: number;
  clock?: ToastClock;
  diagnostic?: (code: string, message: string) => void;
}
