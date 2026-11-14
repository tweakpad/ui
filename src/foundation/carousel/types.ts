import type { Direction, ChangeReason } from '../types.js';
import type { ScrollbarVisibility } from '../scrollbar.js';

/** The stable identity of a carousel slide, from `getItemId` or the item itself. */
export type CarouselId = string | number;
/** The axis along which a carousel's slides move. */
export type CarouselOrientation = 'horizontal' | 'vertical';
/**
 * An element given to a carousel option as a selector, the element itself or a function that
 * returns it once the carousel renders.
 */
export type CarouselTarget = string | HTMLElement | (() => HTMLElement | null);
/**
 * A carousel viewport size in CSS pixels, passed to measured layout offsets and used to override
 * the observed size.
 */
export interface CarouselMeasurement {
  width: number;
  height: number;
}
/** How a carousel sizes, spaces, groups and aligns its slides, set under `options.layout`. */
export interface CarouselLayoutOptions {
  itemsPerView?: number | 'auto';
  gap?: number | `${number}%`;
  groupSkip?: number;
  groupAuto?: boolean;
  centered?: boolean;
  centeredBounds?: boolean;
  centerInsufficient?: boolean;
  offsetBefore?: number | ((measurement: CarouselMeasurement) => number);
  offsetAfter?: number | ((measurement: CarouselMeasurement) => number);
  snapToItemEdge?: boolean;
  roundLengths?: boolean;
  autoHeight?: boolean;
  watchOverflow?: boolean;
  measurementOverride?: Partial<CarouselMeasurement>;
}
/** How a carousel responds to swipes and drags, set under `options.interaction`. */
export interface CarouselInteractionOptions {
  enabled?: boolean;
  target?: 'track' | 'root' | CarouselTarget;
  simulateMouse?: boolean;
  threshold?: number;
  angle?: number;
  ratio?: number;
  followPointer?: boolean;
  shortSwipes?: boolean;
  longSwipes?: boolean;
  longSwipeRatio?: number;
  longSwipeMs?: number;
  allowPrevious?: boolean;
  allowNext?: boolean;
  oneWay?: boolean;
  resistance?: boolean;
  resistanceRatio?: number;
  releaseOnEdges?: boolean;
  handle?: CarouselTarget | null;
  noSwipe?: boolean;
  noSwipeSelector?: string;
  preventActivation?: (event: Event, context: CarouselSnapshot) => boolean;
  edgeSwipeDetection?: false | true | 'prevent';
  edgeSwipeThreshold?: number;
  preventStartDefault?: boolean;
  forcePreventStartDefault?: boolean;
  stopMovePropagation?: boolean;
  preventClicks?: boolean;
  preventClickPropagation?: boolean;
  navigateOnItemClick?: boolean;
  grabCursor?: boolean;
  preventInteractionOnTransition?: boolean;
}
/**
 * Whether a carousel shows its previous and next buttons and where they sit, set under
 * `options.navigation`.
 */
export interface CarouselNavigationOptions {
  enabled?: boolean;
  previous?: boolean;
  next?: boolean;
  previousElement?: CarouselTarget | null;
  nextElement?: CarouselTarget | null;
  icons?: boolean;
  placement?: 'footer' | 'inside' | 'outside';
  hideOnClick?: boolean;
}
/**
 * The indicator a `renderIndicator` callback draws: its position, the total and whether it marks
 * the current slide.
 */
export interface CarouselIndicatorContext {
  index: number;
  count: number;
  current: boolean;
  sourceIndex: number;
}
/** The style and behavior of a carousel's position indicators, set under `options.indicators`. */
export interface CarouselIndicatorOptions {
  type?: 'bullets' | 'fraction' | 'progress' | 'custom';
  clickable?: boolean;
  dynamic?: boolean;
  dynamicCount?: number;
  hideOnClick?: boolean;
  opposite?: boolean;
  formatCurrent?: (current: number) => string;
  formatTotal?: (total: number) => string;
  renderIndicator?: (context: CarouselIndicatorContext) => unknown;
  renderCustom?: (snapshot: CarouselSnapshot) => unknown;
}
/**
 * Whether a carousel shows a scrollbar and how its thumb sizes and drags, set under
 * `options.scrollbar`.
 */
export interface CarouselScrollbarOptions {
  enabled?: boolean;
  draggable?: boolean;
  thumbSize?: 'auto' | number;
  visibility?: ScrollbarVisibility;
  element?: CarouselTarget | null;
  thumbElement?: CarouselTarget | null;
}
/**
 * How a carousel responds to the mouse wheel and trackpad scrolling, set under
 * `options.mousewheel`.
 */
export interface CarouselWheelOptions {
  enabled?: boolean;
  forceToAxis?: boolean;
  releaseOnEdges?: boolean;
  invert?: boolean;
  sensitivity?: number;
  target?: 'root' | CarouselTarget;
  thresholdDelta?: number | null;
  thresholdTime?: number | null;
  ignoreSelector?: string;
}
/** Which keys navigate a carousel, set under `options.keyboard`. */
export interface CarouselKeyboardOptions {
  enabled?: boolean;
  pageKeys?: boolean;
  homeEnd?: boolean;
}
/**
 * How a data carousel limits the slides it mounts to those near the viewport, set under
 * `options.virtual`.
 */
export interface CarouselVirtualOptions {
  enabled?: boolean;
  cache?: boolean;
  before?: number;
  after?: number;
  itemSize?: number;
}
/**
 * The labels and announcements a carousel speaks and shows, set under `options.messages` to
 * localize them.
 */
export interface CarouselMessages {
  previous?: string;
  next?: string;
  first?: string;
  last?: string;
  slide?: string;
  position?: (index: number, count: number) => string;
  scrollbar?: string;
  pause?: string;
  resume?: string;
  announce?: (snapshot: CarouselSnapshot) => string;
  status?: (snapshot: CarouselSnapshot) => string;
}
/**
 * How a continuously looping carousel fills and wraps its slides, set under `options.loopOptions`.
 */
export interface CarouselLoopOptions {
  additionalItems?: number;
  fillGroups?: boolean;
  preventDuringTransition?: boolean;
}
/**
 * The advanced settings a carousel takes through its `options` property, merged over the defaults.
 */
export interface CarouselOptions {
  layout?: CarouselLayoutOptions;
  interaction?: CarouselInteractionOptions;
  transport?: 'transform' | 'scroll';
  loopMode?: 'continuous' | 'rewind';
  loopOptions?: CarouselLoopOptions;
  breakpoints?: Readonly<Record<string, CarouselBreakpoint>>;
  breakpointsBase?: 'window' | 'container' | CarouselTarget;
  navigation?: false | CarouselNavigationOptions;
  indicators?: false | CarouselIndicatorOptions;
  scrollbar?: false | CarouselScrollbarOptions;
  mousewheel?: false | CarouselWheelOptions;
  keyboard?: false | CarouselKeyboardOptions;
  autoplayOptions?: { reverse?: boolean; stopAfterInteraction?: boolean };
  virtual?: false | CarouselVirtualOptions;
  messages?: CarouselMessages;
  observation?: {
    resizeObserver?: boolean;
    windowResize?: boolean;
    observeItemSubtree?: boolean;
    observeParents?: boolean;
  };
  loading?: { preload?: boolean; adjacent?: number };
}
/**
 * The carousel settings that are element properties rather than `options`: orientation, loop, step
 * size and autoplay interval.
 */
export interface CarouselRootOptions {
  orientation: CarouselOrientation;
  loop: boolean;
  itemsPerMovement: number;
  autoplay: number;
}
/**
 * Settings that override a carousel's options from a minimum width, keyed by a pixel width or by
 * `@` and a ratio of the height.
 */
export type CarouselBreakpoint = Pick<
  CarouselOptions,
  | 'layout'
  | 'loopMode'
  | 'loopOptions'
  | 'navigation'
  | 'indicators'
  | 'scrollbar'
  | 'mousewheel'
  | 'keyboard'
  | 'interaction'
> &
  Partial<Omit<CarouselRootOptions, 'autoplay'>>;
/** The per-slide settings a `getItemOptions` callback returns for a data item. */
export interface CarouselItemOptions {
  disabled?: boolean;
  autoplayDelay?: number;
  label?: string;
}
/** A slide record the carousel builds from a child element or a data item. */
export interface CarouselItem<T = unknown> {
  readonly id: CarouselId;
  readonly index: number;
  readonly value: T;
  readonly label: string;
  readonly disabled: boolean;
  readonly hidden: boolean;
  readonly autoplayDelay?: number;
  readonly element?: HTMLElement;
}
/** The slide state a `renderItem` callback receives with each data item. */
export interface CarouselRenderContext {
  readonly id: CarouselId;
  readonly index: number;
  readonly selected: boolean;
  readonly visible: boolean;
  readonly preview: boolean;
}
/**
 * The window of slides a virtualized carousel currently mounts and shows, reported in its
 * snapshot.
 */
export interface CarouselVirtualRange {
  readonly from: number;
  readonly to: number;
  readonly offset: number;
  readonly visibleIds: readonly CarouselId[];
  readonly mountedIds: readonly CarouselId[];
  readonly pinnedId: CarouselId | null;
}
/**
 * The carousel's current published state, such as the selection, progress, scroll limits and
 * autoplay, read from its controller and passed to message and indicator callbacks.
 */
export interface CarouselSnapshot {
  readonly initialized: boolean;
  readonly measured: boolean;
  readonly measurementSource: 'unmeasured' | 'observed' | 'override';
  readonly selectedIndex: number | null;
  readonly selectedId: CarouselId | null;
  readonly snapIndex: number | null;
  readonly snapCount: number;
  readonly itemCount: number;
  readonly visibleIds: readonly CarouselId[];
  readonly progress: number;
  readonly previewProgress: number;
  readonly canScrollPrevious: boolean;
  readonly canScrollNext: boolean;
  readonly locked: boolean;
  readonly animating: boolean;
  readonly orientation: CarouselOrientation;
  readonly direction: Direction;
  readonly loopMode: 'finite' | 'continuous' | 'rewind';
  readonly virtual: CarouselVirtualRange | null;
  readonly autoplayRunning: boolean;
  readonly autoplayPaused: boolean;
}
export interface CarouselNavigationRequest {
  reason?: ChangeReason;
  sourceEvent?: Event;
  speed?: number;
}
export interface CarouselNavigationResult {
  readonly status: 'accepted' | 'unchanged' | 'rejected' | 'cancelled';
  readonly index: number | null;
  readonly id: CarouselId | null;
  readonly reason: string;
}
export type CarouselEventName =
  | 'initialized'
  | 'reinitialized'
  | 'progress'
  | 'settled'
  | 'lock-change'
  | 'breakpoint-change'
  | 'virtual-update'
  | 'autoplay-state-change';
