import type { Direction, ChangeReason } from '../types.js';
import type { ScrollbarVisibility } from '../scrollbar.js';

export type CarouselId = string | number;
export type CarouselOrientation = 'horizontal' | 'vertical';
export type CarouselTarget = string | HTMLElement | (() => HTMLElement | null);
export interface CarouselMeasurement {
  width: number;
  height: number;
}
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
export interface CarouselIndicatorContext {
  index: number;
  count: number;
  current: boolean;
  sourceIndex: number;
}
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
export interface CarouselScrollbarOptions {
  enabled?: boolean;
  draggable?: boolean;
  thumbSize?: 'auto' | number;
  visibility?: ScrollbarVisibility;
  element?: CarouselTarget | null;
  thumbElement?: CarouselTarget | null;
}
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
export interface CarouselKeyboardOptions {
  enabled?: boolean;
  pageKeys?: boolean;
  homeEnd?: boolean;
}
export interface CarouselVirtualOptions {
  enabled?: boolean;
  cache?: boolean;
  before?: number;
  after?: number;
  itemSize?: number;
}
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
export interface CarouselLoopOptions {
  additionalItems?: number;
  fillGroups?: boolean;
  preventDuringTransition?: boolean;
}
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
export interface CarouselRootOptions {
  orientation: CarouselOrientation;
  loop: boolean;
  itemsPerMovement: number;
  autoplay: number;
}
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
export interface CarouselItemOptions {
  disabled?: boolean;
  autoplayDelay?: number;
  label?: string;
}
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
export interface CarouselRenderContext {
  readonly id: CarouselId;
  readonly index: number;
  readonly selected: boolean;
  readonly visible: boolean;
  readonly preview: boolean;
}
export interface CarouselVirtualRange {
  readonly from: number;
  readonly to: number;
  readonly offset: number;
  readonly visibleIds: readonly CarouselId[];
  readonly mountedIds: readonly CarouselId[];
  readonly pinnedId: CarouselId | null;
}
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
