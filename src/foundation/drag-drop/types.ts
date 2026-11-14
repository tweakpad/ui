import type { DragDropManager } from './manager.js';
import type { Draggable, Droppable } from './entities.js';
import type { Alignment, Coordinates, Rectangle } from './geometry.js';
import type { Collision, CollisionDetector } from './collision.js';
import type { ModifierConfiguration } from './modifiers.js';
import type { UniqueIdentifier } from './sorting.js';

/** Arbitrary values attached to a draggable item or drop target and read back from drag events. */
export type Data = Record<string, unknown>;
/**
 * A kind assigned to draggable items, which drop targets match against to accept or refuse them.
 */
export type EntityType = string | number | symbol;
/** Where a drag operation is in its lifecycle, from idle through dragging to dropped. */
export type DragStatus =
  'idle' | 'initialization-pending' | 'initializing' | 'dragging' | 'dropped';
/** How a finished drag ended: committed at a drop target, canceled, or rejected by a listener. */
export type DragOutcome = 'committed' | 'canceled' | 'rejected';
/**
 * How the dragged item is shown while it moves: the default treatment, a clone, the element
 * itself, or nothing.
 */
export type FeedbackMode = 'default' | 'clone' | 'move' | 'none';
/** A timed animation given by its duration in milliseconds and a CSS easing function. */
export interface Transition {
  duration?: number;
  easing?: string;
}
/**
 * How a sortable item animates to its new place when the order changes; `idle` also animates
 * changes made outside a drag.
 */
export interface SortTransition extends Transition {
  idle?: boolean;
}
/** The elements and offset a custom drop animation receives when a dragged item is released. */
export interface DropAnimationContext {
  source: Draggable;
  originalElement: Element;
  feedbackElement: Element;
  placeholder: Element | null;
  translate: Coordinates;
  moved: boolean;
}
/**
 * How a dragged item returns to its place on release: a timed transition, a custom animation
 * function, or null for none.
 */
export type DropAnimation =
  Transition | ((context: DropAnimationContext) => void | Promise<void>) | null;
/** Overlay with its own drop configuration, between entity and manager precedence. */
export interface DragOverlayInput {
  element: Element;
  dropAnimation?: DropAnimation;
}
/** How a drag presents the moving item, set on the manager or on each draggable. */
export interface FeedbackOptions {
  feedback?: FeedbackMode | ((source: Draggable, manager: DragDropManager) => FeedbackMode);
  rootElement?: Element | ((source: Draggable) => Element);
  overlay?: Element | DragOverlayInput | null;
  overlayDisabled?: boolean | ((source: Draggable) => boolean);
  dropAnimation?: DropAnimation;
  keyboardTransition?: Transition | null;
}
/**
 * The ids and announcement timing a drag uses for its screen reader instructions and live
 * announcements.
 */
export interface AccessibilityOptions {
  id?: string;
  idPrefix?: { description?: string; announcement?: string };
  debounce?: number;
}
/**
 * Whether a drag scrolls its scroll containers near their edges, with optional speed and edge
 * distance.
 */
export type AutoScroll = boolean | { acceleration?: number; threshold?: number | Coordinates };
/**
 * An input source that starts and drives drags, such as pointer or keyboard input, bound to each
 * draggable item.
 */
export interface Sensor {
  disabled?: boolean;
  /** Options are sensor-specific per-binding overrides of the instance configuration. */
  bind(source: Draggable, options?: object): () => void;
  destroy?(): void;
}
/** Creates a sensor for a drag and drop manager when the manager is set up. */
export type SensorFactory = (manager: DragDropManager) => Sensor;
/** A sensor given either as an instance or as a factory that the manager calls. */
export type SensorInput = Sensor | SensorFactory;
/**
 * The sensors a drag and drop manager uses: a list that replaces the defaults, or a function that
 * derives the list from them.
 */
export type SensorConfiguration =
  readonly SensorInput[] | ((defaults: readonly SensorInput[]) => readonly SensorInput[]);
export interface Renderer {
  readonly rendering: Promise<void>;
}
/** A frozen view of the dragged item or the drop target, carried in each drag event. */
export interface EntitySnapshot {
  readonly id: UniqueIdentifier;
  readonly data: Data;
  readonly type: EntityType | undefined;
  readonly element: Element | null;
  readonly index?: number;
  readonly group?: UniqueIdentifier | undefined;
  readonly initialIndex?: number;
  readonly initialGroup?: UniqueIdentifier | undefined;
  readonly container?: boolean;
  readonly shape?: Rectangle | undefined;
}
/**
 * A frozen view of the current drag, including its source, target, pointer position and shape,
 * carried in each drag event.
 */
export interface OperationSnapshot {
  readonly id: number;
  readonly status: DragStatus;
  readonly source: EntitySnapshot | null;
  readonly target: EntitySnapshot | null;
  readonly position: {
    readonly initial: Coordinates;
    readonly current: Coordinates;
    readonly previous: Coordinates | undefined;
    readonly delta: Coordinates;
    readonly direction: 'left' | 'right' | 'up' | 'down' | null;
    readonly velocity: Coordinates;
  };
  readonly transform: Coordinates;
  readonly shape: {
    initial: Rectangle;
    current: Rectangle;
    previous: Rectangle | undefined;
  } | null;
  readonly activatorEvent: Event | null;
  readonly input: 'pointer' | 'keyboard' | 'imperative';
  readonly canceled: boolean;
}
/**
 * A paused drag, returned by a drag event's `suspend()`: resume it to continue or abort it to
 * cancel.
 */
export interface Suspension {
  resume(): void;
  abort(): void;
}
/**
 * The event a drag listener receives at each stage of a drag, which some stages let it cancel or
 * suspend.
 */
export interface DragEvent {
  readonly operation: OperationSnapshot;
  readonly cancelable: boolean;
  readonly defaultPrevented: boolean;
  preventDefault(): void;
  readonly nativeEvent: Event;
  readonly to?: Coordinates;
  readonly by?: Coordinates;
  readonly collisions?: readonly Collision[];
  readonly canceled?: boolean;
  readonly outcome?: DragOutcome;
  suspend(): Suspension;
}
export type DragEventName =
  'beforedragstart' | 'dragstart' | 'dragmove' | 'collision' | 'dragover' | 'dragend' | 'settled';
export type DragListener = (event: DragEvent, manager: DragDropManager) => void;
/**
 * Functions that return the screen reader announcement for each drag stage, replacing the
 * defaults.
 */
export type Announcements = Partial<
  Record<
    'dragstart' | 'dragend' | 'dragmove' | 'dragover',
    (event: DragEvent, manager: DragDropManager) => string | undefined
  >
>;
export interface ManagerOptions extends FeedbackOptions {
  sensors?: SensorConfiguration;
  modifiers?: ModifierConfiguration;
  renderer?: Renderer;
  autoScroll?: AutoScroll;
  accessibility?: AccessibilityOptions | false;
  instructions?: { draggable: string };
  announcements?: Announcements;
}
export interface StartInput {
  source: Draggable | UniqueIdentifier;
  coordinates: Coordinates;
  event?: Event;
  input?: 'pointer' | 'keyboard' | 'imperative';
}
export interface MoveInput {
  to?: Coordinates;
  by?: Coordinates;
  event?: Event;
  cancelable?: boolean;
  propagate?: boolean;
}
export interface StopInput {
  event?: Event;
  canceled?: boolean;
}
/**
 * The identity and registration settings shared by draggable items and drop targets when they are
 * created.
 */
export interface EntityInput {
  id: UniqueIdentifier;
  data?: Data;
  type?: EntityType;
  disabled?: boolean;
  element?: Element | null;
  register?: boolean;
  effects?: () => Array<() => void | (() => void)>;
}
/** The settings a draggable item is created with. */
export interface DraggableInput extends EntityInput, FeedbackOptions {
  handle?: Element | null;
  sensors?: SensorConfiguration;
  modifiers?: ModifierConfiguration;
  alignment?: Alignment;
  autoScroll?: AutoScroll;
  accessibility?: AccessibilityOptions | false;
  instructions?: { draggable: string };
  announcements?: Announcements;
}
/**
 * The settings a drop target is created with, including which items it accepts and how it detects
 * collisions.
 */
export interface DroppableInput extends EntityInput {
  accept?: EntityType | readonly EntityType[] | ((source: Draggable) => boolean);
  collisionDetector?: CollisionDetector;
  collisionPriority?: number;
}
export type Accept = DroppableInput['accept'];
export type RegisteredEntity = Draggable | Droppable;
